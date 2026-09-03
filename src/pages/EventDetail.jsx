import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, Users, Target, Flag, CheckCircle2, XCircle } from 'lucide-react'
import {
  approvePhoto,
  backupExistingPhotosToDrive,
  cancelInvite,
  connectDriveFolder,
  deleteEvent,
  deletePhoto,
  disconnectShoots,
  fileUrl,
  generateShootsCredentials,
  getShootsCredentials,
  getEvent,
  getEventAnalytics,
  inviteCollaborator,
  listCollaborators,
  listPhotos,
  removeCollaborator,
  setDriveAutoSync,
  startEvent,
  startPhotoUpload,
  subscribeToLiveEvents,
  reclaimDriveBackupNow,
  setEventDriveBackup,
  subscribeToUploadProgress,
  syncDriveFolder,
  testDriveFolderConnection,
  toggleGuestUploads,
  toggleEventFeature,
  updatePhotoFeatureMembership,
  inviteClient,
  listClients,
  removeClient,
  setGuestUploadWindow,
  createSubGallery,
} from '../api.js'
import { useAuth } from '../auth.jsx'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import { saveActiveJob, getActiveJob, clearActiveJob } from '../jobPersistence.js'
import GuestCard from '../GuestCard.jsx'
import Modal from '../components/Modal.jsx'
import Dropzone from '../components/Dropzone.jsx'
import StatTile from '../components/StatTile.jsx'
import TrendChart from '../components/TrendChart.jsx'
import JobProgressLog from '../components/JobProgressLog.jsx'

function guestLink(slug) {
  return `${window.location.origin}/e/${slug}`
}

function progressLine(data) {
  let line = `Processed ${data.completed} of ${data.total}`
  if (data.current_file) line += ` — ${data.current_file}`
  const eta = formatEta(data.eta_seconds)
  if (eta) line += ` (${eta})`
  return line
}

function formatEta(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return null
  const rounded = Math.round(seconds)
  if (rounded < 60) return `~${rounded}s remaining`
  const minutes = Math.round(rounded / 60)
  return `~${minutes}m remaining`
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showGuestCard, setShowGuestCard] = useState(false)
  const [collaborators, setCollaborators] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [teamError, setTeamError] = useState('')
  const [clients, setClients] = useState([])
  const [pendingClientInvites, setPendingClientInvites] = useState([])
  const [clientInviteEmail, setClientInviteEmail] = useState('')
  const [clientInviteCap, setClientInviteCap] = useState('')
  const [invitingClient, setInvitingClient] = useState(false)
  const [clientInviteMessage, setClientInviteMessage] = useState('')
  const [clientError, setClientError] = useState('')
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
  const [savingPhotoFeatures, setSavingPhotoFeatures] = useState({})
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [uploadTab, setUploadTab] = useState('files')
  const [logLines, setLogLines] = useState([])
  const [skippedFiles, setSkippedFiles] = useState([])
  const [driveUrl, setDriveUrl] = useState('')
  const [connectingDrive, setConnectingDrive] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTest, setConnectionTest] = useState(null)
  const [testedUrl, setTestedUrl] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportUrl, setExportUrl] = useState('')
  const [exportTesting, setExportTesting] = useState(false)
  const [exportConnectionTest, setExportConnectionTest] = useState(null)
  const [exportTestedUrl, setExportTestedUrl] = useState('')
  const [exportSource, setExportSource] = useState('')
  const [togglingGuestUploads, setTogglingGuestUploads] = useState(false)
  const [togglingFeature, setTogglingFeature] = useState(null) // "faceSearch" | "photoSelection" | null
  const [showGuestUploadCard, setShowGuestUploadCard] = useState(false)
  const [showSlideshowCard, setShowSlideshowCard] = useState(false)
  const [approvingId, setApprovingId] = useState(null)
  const [windowDaysInput, setWindowDaysInput] = useState('')
  const [savingWindow, setSavingWindow] = useState(false)
  const [subGalleryName, setSubGalleryName] = useState('')
  const [creatingSubGallery, setCreatingSubGallery] = useState(false)
  const [showSubGalleryCard, setShowSubGalleryCard] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [backingUpExisting, setBackingUpExisting] = useState(false)
  const [togglingAutoSync, setTogglingAutoSync] = useState(false)
  const [togglingDriveBackup, setTogglingDriveBackup] = useState(false)
  const [reclaimingDriveBackup, setReclaimingDriveBackup] = useState(false)
  const [driveBackupMessage, setDriveBackupMessage] = useState('')
  const [shoots, setShoots] = useState(null)
  const [settingUpShoots, setSettingUpShoots] = useState(false)
  const [regeneratingShoots, setRegeneratingShoots] = useState(false)
  const [disconnectingShoots, setDisconnectingShoots] = useState(false)
  const [liveNotice, setLiveNotice] = useState('')
  const [startingEvent, setStartingEvent] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('all')
  const cleanupRef = useRef(null)
  const liveStreamCleanupRef = useRef(null)
  const initialTabAppliedRef = useRef(false)
  const confirm = useConfirm()
  const { showToast } = useToast()

  const appendLog = useCallback((line) => {
    setLogLines((prev) => [...prev, line])
  }, [])

  const loadTeam = useCallback(() => {
    listCollaborators(eventId)
      .then((data) => {
        setCollaborators(data.collaborators)
        setPendingInvites(data.pending_invites)
      })
      .catch(() => {
        setCollaborators([])
        setPendingInvites([])
      })
  }, [eventId])

  const loadClients = useCallback(() => {
    listClients(eventId)
      .then((data) => {
        setClients(data.clients)
        setPendingClientInvites(data.pending_invites)
      })
      .catch(() => {
        setClients([])
        setPendingClientInvites([])
      })
  }, [eventId])

  const load = useCallback(() => {
    getEvent(eventId)
      .then((ev) => {
        setEvent(ev)
        if (ev.role === 'owner') loadTeam()
        if (ev.photo_selection_enabled) loadClients()
      })
      .catch((e) => setError(e.message))
    listPhotos(eventId).then(setPhotos).catch((e) => setError(e.message))
    getEventAnalytics(eventId).then(setAnalytics).catch(() => setAnalytics(null))
  }, [eventId, loadTeam, loadClients])

  useEffect(load, [load])

  // If this event already has a Drive folder connected, open straight to
  // that tab instead of always defaulting to "Upload files" — otherwise
  // the Drive-backup checkbox (which only renders on this tab) is easy to
  // miss on every page load. Only applied once, so manually switching
  // tabs afterward isn't fought.
  useEffect(() => {
    if (!event || initialTabAppliedRef.current) return
    initialTabAppliedRef.current = true
    if (event.drive_folder_url) setUploadTab('drive')
  }, [event])

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  // A job (upload / Drive import / Drive sync) keeps running server-side
  // regardless of whether anyone's watching — see server's lib/jobQueue.js.
  // If one was left running when this page was last closed/reloaded,
  // reconnect to it now instead of showing a blank upload section.
  useEffect(() => {
    const jobId = getActiveJob(eventId)
    if (!jobId) return undefined

    setUploading(true)
    setLogLines(['Reconnected — checking status…'])
    cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
      onProgress: (data) => {
        setProgress(data)
        appendLog(progressLine(data))
        addPhotoFromProgress(data)
      },
      onDone: (data) => {
        setUploading(false)
        setProgress(null)
        appendLog(`Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
        setSkippedFiles(data.skipped || [])
        clearActiveJob(eventId)
        load()
      },
      onError: (data) => {
        setUploading(false)
        setProgress(null)
        appendLog(`Failed — ${data.message || 'unknown error'}`)
        clearActiveJob(eventId)
      },
    })
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // Keeps the gallery updating live while a camera is streaming photos in
  // via Shoots — independent of whether the upload modal is open.
  useEffect(() => {
    if (liveStreamCleanupRef.current) {
      liveStreamCleanupRef.current()
      liveStreamCleanupRef.current = null
    }
    if (!event?.shoots_connected) return undefined

    liveStreamCleanupRef.current = subscribeToLiveEvents(eventId, {
      onPhotoAdded: (data) => {
        setPhotos((prev) => (prev.some((p) => p.photo_id === data.photo_id) ? prev : [data, ...prev]))
        setLiveNotice(`New photo from your camera: ${data.filename}`)
        setTimeout(() => setLiveNotice(''), 4000)
      },
      onPhotoSkipped: (data) => {
        setLiveNotice(`Skipped a camera photo (${data.reason})`)
        setTimeout(() => setLiveNotice(''), 4000)
      },
    })
    return () => {
      if (liveStreamCleanupRef.current) {
        liveStreamCleanupRef.current()
        liveStreamCleanupRef.current = null
      }
    }
  }, [eventId, event?.shoots_connected])

  // Each progress event may carry the photo that was just processed (see
  // server's emitProgress) — added to the gallery immediately so a laymen
  // user watching the page can see it's actually working file by file, not
  // just trust a progress bar.
  const addPhotoFromProgress = useCallback((data) => {
    if (!data.photo) return
    setPhotos((prev) => (prev.some((p) => p.photo_id === data.photo.photo_id) ? prev : [data.photo, ...prev]))
  }, [])

  function watchJob(jobId, { failedLabel }) {
    saveActiveJob(eventId, jobId)
    cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
      onProgress: (data) => {
        setProgress(data)
        appendLog(progressLine(data))
        addPhotoFromProgress(data)
      },
      onDone: (data) => {
        setUploading(false)
        setProgress(null)
        let summary = `Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`
        if (data.removed_count > 0) summary += ` ${data.removed_count} photo(s) removed (no longer in Drive).`
        appendLog(summary)
        setSkippedFiles(data.skipped || [])
        clearActiveJob(eventId)
        showToast(`${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
        load()
      },
      onError: (data) => {
        setUploading(false)
        setProgress(null)
        const message = data.message || failedLabel
        appendLog(`Failed — ${message}`)
        clearActiveJob(eventId)
        showToast(message, { type: 'error' })
      },
    })
  }

  const handleStartEvent = async () => {
    setStartingEvent(true)
    setError('')
    try {
      await startEvent(eventId)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setStartingEvent(false)
    }
  }

  const handleToggleGuestUploads = async (enabled) => {
    setTogglingGuestUploads(true)
    setError('')
    try {
      await toggleGuestUploads(eventId, enabled)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setTogglingGuestUploads(false)
    }
  }

  const handleToggleFeature = async (feature, enabled) => {
    setTogglingFeature(feature)
    setError('')
    try {
      await toggleEventFeature(eventId, feature, enabled)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setTogglingFeature(null)
    }
  }

  const handleInviteClient = async (e) => {
    e.preventDefault()
    if (!clientInviteEmail.trim()) return
    setInvitingClient(true)
    setClientError('')
    setClientInviteMessage('')
    try {
      const cap = clientInviteCap.trim() ? parseInt(clientInviteCap, 10) : undefined
      const res = await inviteClient(eventId, clientInviteEmail.trim(), cap)
      setClientInviteMessage(
        res.status === 'added'
          ? 'Added — they can view this event immediately.'
          : "Invite sent — they'll get access once they set a password."
      )
      setClientInviteEmail('')
      setClientInviteCap('')
      loadClients()
    } catch (e) {
      setClientError(e.message)
    } finally {
      setInvitingClient(false)
    }
  }

  const handleRemoveClient = async (userId) => {
    setClientError('')
    try {
      await removeClient(eventId, userId)
      loadClients()
    } catch (e) {
      setClientError(e.message)
    }
  }

  const handleApprovePhoto = async (photoId) => {
    setApprovingId(photoId)
    try {
      await approvePhoto(eventId, photoId)
      setPhotos((prev) => prev.map((p) => (p.photo_id === photoId ? { ...p, approval_status: 'approved' } : p)))
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setApprovingId(null)
    }
  }

  const handleRejectPhoto = async (photoId, filename) => {
    const confirmed = await confirm(`Reject and delete "${filename}"? This can't be undone.`, { title: 'Reject photo?', confirmLabel: 'Reject' })
    if (!confirmed) return
    setApprovingId(photoId)
    try {
      await deletePhoto(eventId, photoId)
      setPhotos((prev) => prev.filter((p) => p.photo_id !== photoId))
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setApprovingId(null)
    }
  }

  const handleSaveWindowDays = async (e) => {
    e.preventDefault()
    setSavingWindow(true)
    try {
      await setGuestUploadWindow(eventId, windowDaysInput.trim() === '' ? null : parseInt(windowDaysInput, 10))
      load()
      showToast('Guest upload window updated.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setSavingWindow(false)
    }
  }

  const handleCreateSubGallery = async (e) => {
    e.preventDefault()
    if (!subGalleryName.trim()) return
    setCreatingSubGallery(true)
    try {
      await createSubGallery(eventId, subGalleryName.trim())
      setSubGalleryName('')
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setCreatingSubGallery(false)
    }
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines([`Starting upload — ${files.length} file(s)`])
    setSkippedFiles([])
    try {
      const { job_id: jobId } = await startPhotoUpload(eventId, files)
      watchJob(jobId, { failedLabel: 'Upload failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    }
  }

  const handleDriveUrlChange = (value) => {
    setDriveUrl(value)
    // Any edit invalidates a prior test result — it was only ever a
    // statement about the exact link that was tested.
    if (value.trim() !== testedUrl) {
      setConnectionTest(null)
    }
  }

  const handleTestConnection = async () => {
    const url = driveUrl.trim()
    if (!url) return
    setTestingConnection(true)
    setConnectionTest(null)
    try {
      const result = await testDriveFolderConnection(eventId, url)
      setConnectionTest({ ok: true, folderName: result.folder_name, permission: result.permission })
      setTestedUrl(url)
    } catch (e) {
      setConnectionTest({ ok: false, message: e.message })
      setTestedUrl(url)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleDriveConnect = async () => {
    if (!driveUrl.trim()) return
    if (!(connectionTest?.ok && testedUrl === driveUrl.trim())) return
    const confirmed = await confirm(
      "This scans the folder now and imports every photo currently inside it — could take a while for a large folder. " +
      "PandaSpot only keeps a thumbnail and face data for each photo; the originals stay in Drive and are fetched " +
      "live when a guest downloads or shares one.",
      { title: 'Connect this Drive folder?', confirmLabel: 'Connect', danger: false }
    )
    if (!confirmed) return

    setConnectingDrive(true)
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines([])
    setSkippedFiles([])
    try {
      const { job_id: jobId, files_found: filesFound } = await connectDriveFolder(eventId, driveUrl.trim())
      setDriveUrl('')
      setConnectionTest(null)
      setTestedUrl('')
      setLogLines([`Connected — found ${filesFound} file(s) in the folder`])
      watchJob(jobId, { failedLabel: 'Import failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    } finally {
      setConnectingDrive(false)
    }
  }

  const handleDriveSync = async () => {
    setSyncingDrive(true)
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines(['Checking the Drive folder for changes…'])
    setSkippedFiles([])
    try {
      const { job_id: jobId } = await syncDriveFolder(eventId)
      watchJob(jobId, { failedLabel: 'Sync failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    } finally {
      setSyncingDrive(false)
    }
  }

  const handleBackupExisting = async () => {
    setBackingUpExisting(true)
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines([])
    setSkippedFiles([])
    try {
      const { job_id: jobId, files_found: filesFound } = await backupExistingPhotosToDrive(eventId, exportSource || undefined)
      setLogLines([`Found ${filesFound} photo(s) not yet backed up`])
      watchJob(jobId, { failedLabel: 'Backup failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    } finally {
      setBackingUpExisting(false)
    }
  }

  const handleExportUrlChange = (value) => {
    setExportUrl(value)
    if (value.trim() !== exportTestedUrl) {
      setExportConnectionTest(null)
    }
  }

  const handleExportTestConnection = async () => {
    const url = exportUrl.trim()
    if (!url) return
    setExportTesting(true)
    setExportConnectionTest(null)
    try {
      const result = await testDriveFolderConnection(eventId, url)
      setExportConnectionTest({ ok: true, folderName: result.folder_name, permission: result.permission })
      setExportTestedUrl(url)
    } catch (e) {
      setExportConnectionTest({ ok: false, message: e.message })
      setExportTestedUrl(url)
    } finally {
      setExportTesting(false)
    }
  }

  const handleExportConnect = async () => {
    if (!(exportConnectionTest?.ok && exportTestedUrl === exportUrl.trim())) return
    if (exportConnectionTest.permission && exportConnectionTest.permission !== 'writer') {
      showToast('Export needs the folder shared as Editor, not Viewer or Commenter.', { type: 'error' })
      return
    }
    const confirmed = await confirm(
      "This scans the folder now and imports every photo currently inside it — could take a while for a large folder. " +
      "Once connected, you can back up your existing PandaSpot photos into this same folder.",
      { title: 'Connect this Drive folder?', confirmLabel: 'Connect', danger: false }
    )
    if (!confirmed) return

    setConnectingDrive(true)
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines([])
    setSkippedFiles([])
    try {
      const { job_id: jobId, files_found: filesFound } = await connectDriveFolder(eventId, exportUrl.trim())
      if (event?.drive_backup_available) {
        await setEventDriveBackup(eventId, true)
      }
      setExportUrl('')
      setExportConnectionTest(null)
      setExportTestedUrl('')
      setLogLines([
        event?.drive_backup_available
          ? `Connected and export enabled — found ${filesFound} file(s) in the folder`
          : `Connected — found ${filesFound} file(s) in the folder. Drive backup is not configured on this PandaSpot instance yet.`,
      ])
      watchJob(jobId, { failedLabel: 'Import failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    } finally {
      setConnectingDrive(false)
    }
  }

  const handleToggleAutoSync = async (enabled) => {
    setTogglingAutoSync(true)
    setError('')
    try {
      await setDriveAutoSync(eventId, enabled)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingAutoSync(false)
    }
  }

  const handleSetupShoots = async () => {
    const confirmed = await confirm(
      "Any photo your camera sends will be scanned for faces and added to the gallery automatically, the same as " +
      "a regular upload. You'll get a host/username/password to enter into your camera's FTP transfer settings next.",
      { title: 'Turn on camera upload?', confirmLabel: 'Turn on', danger: false }
    )
    if (!confirmed) return
    setSettingUpShoots(true)
    setError('')
    try {
      const creds = await generateShootsCredentials(eventId)
      setShoots(creds)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setSettingUpShoots(false)
    }
  }

  const handleShowShootsCredentials = async () => {
    setError('')
    try {
      const creds = await getShootsCredentials(eventId)
      setShoots(creds)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRegenerateShoots = async () => {
    const confirmed = await confirm(
      "This invalidates the current username/password — you'll need to re-enter the new ones into your camera.",
      { title: 'Regenerate camera credentials?', confirmLabel: 'Regenerate' }
    )
    if (!confirmed) return
    setRegeneratingShoots(true)
    setError('')
    try {
      const creds = await generateShootsCredentials(eventId)
      setShoots(creds)
      showToast('New credentials generated.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setRegeneratingShoots(false)
    }
  }

  const handleDisconnectShoots = async () => {
    const confirmed = await confirm(
      "Your camera's saved FTP settings will stop working.",
      { title: 'Turn off camera upload?', confirmLabel: 'Turn off' }
    )
    if (!confirmed) return
    setDisconnectingShoots(true)
    setError('')
    try {
      await disconnectShoots(eventId)
      setShoots(null)
      load()
      showToast('Camera upload turned off.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setDisconnectingShoots(false)
    }
  }

  const handleToggleDriveBackup = async (enabled) => {
    setTogglingDriveBackup(true)
    setError('')
    try {
      await setEventDriveBackup(eventId, enabled)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingDriveBackup(false)
    }
  }

  const handleReclaimDriveBackupNow = async () => {
    setReclaimingDriveBackup(true)
    setError('')
    setDriveBackupMessage('')
    try {
      const result = await reclaimDriveBackupNow(eventId)
      setDriveBackupMessage(`Reclaimed ${result.reclaimed_count} photo(s) from Drive.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setReclaimingDriveBackup(false)
    }
  }

  const handleCopy = async () => {
    if (!event) return
    try {
      await navigator.clipboard.writeText(guestLink(event.guestSlug))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — ignore
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setTeamError('')
    setInviteMessage('')
    try {
      const res = await inviteCollaborator(eventId, inviteEmail.trim())
      setInviteMessage(
        res.status === 'added'
          ? 'Added — they can access this event immediately.'
          : "Invite sent — they'll get access once they sign up."
      )
      setInviteEmail('')
      loadTeam()
    } catch (e) {
      setTeamError(e.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveCollaborator = async (userId) => {
    setTeamError('')
    try {
      await removeCollaborator(eventId, userId)
      loadTeam()
    } catch (e) {
      setTeamError(e.message)
    }
  }

  const handleCancelInvite = async (inviteId) => {
    setTeamError('')
    try {
      await cancelInvite(eventId, inviteId)
      loadTeam()
    } catch (e) {
      setTeamError(e.message)
    }
  }

  const handleDeletePhoto = async (photoId, filename) => {
    const confirmed = await confirm(`Delete "${filename}"? This can't be undone.`, { title: 'Delete photo?', confirmLabel: 'Delete' })
    if (!confirmed) return
    setDeletingPhotoId(photoId)
    setError('')
    try {
      await deletePhoto(eventId, photoId)
      setPhotos((prev) => prev.filter((p) => p.photo_id !== photoId))
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setDeletingPhotoId(null)
    }
  }

  const handlePhotoFeatureMembership = async (photoId, patch) => {
    setSavingPhotoFeatures((prev) => ({ ...prev, [photoId]: true }))
    const previous = photos
    setPhotos((prev) => prev.map((p) => (
      p.photo_id === photoId
        ? {
            ...p,
            face_search_visible: patch.face_search_visible ?? p.face_search_visible,
            photo_selection_visible: patch.photo_selection_visible ?? p.photo_selection_visible,
          }
        : p
    )))
    try {
      const updated = await updatePhotoFeatureMembership(eventId, photoId, patch)
      setPhotos((prev) => prev.map((p) => (
        p.photo_id === photoId
          ? {
              ...p,
              face_count: updated.face_count ?? p.face_count,
              face_indexed_at: updated.face_indexed_at ?? p.face_indexed_at,
              face_search_visible: updated.face_search_visible,
              photo_selection_visible: updated.photo_selection_visible,
            }
          : p
      )))
    } catch (e) {
      setPhotos(previous)
      showToast(e.message, { type: 'error' })
    } finally {
      setSavingPhotoFeatures((prev) => ({ ...prev, [photoId]: false }))
    }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    const confirmed = await confirm(
      `Delete "${event.name}"? This permanently deletes every photo and the guest link. This can't be undone.`,
      { title: 'Delete event?', confirmLabel: 'Delete' }
    )
    if (!confirmed) return
    setDeletingEvent(true)
    setError('')
    try {
      await deleteEvent(eventId)
      navigate('/events')
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setDeletingEvent(false)
    }
  }

  return (
    <div>
      <Link className="back-link" to="/events">&larr; All events</Link>
      <h1 className="section-title">{event?.name || 'Event'}</h1>
      <p className="subtle">Bulk-upload the event photos here. Face indexing runs only when Face Search is enabled for this event.</p>

      {event && (
        <div className="card guest-link-card">
          <div className="guest-link-label">Guest link — share this so guests can find their photos</div>
          <div className="row">
            <input className="text-input" readOnly value={guestLink(event.guestSlug)} onFocus={(e) => e.target.select()} />
            <button className="btn secondary" type="button" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <p className="hint">
            Guest access {new Date(event.expires_at) < new Date() ? 'closed' : 'closes'} on {new Date(event.expires_at).toLocaleDateString()}
          </p>
          <div className="storage-usage">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, Math.round((event.storage_used_bytes / event.storage_limit_bytes) * 100))}%` }}
              />
            </div>
            <p className="hint">
              {(event.storage_used_bytes / 1e9).toFixed(2)}GB / {(event.storage_limit_bytes / 1e9).toFixed(0)}GB storage used
            </p>
          </div>
        </div>
      )}

      {event && (
        <div className="card">
          <div className="guest-link-label">Features</div>
          <p className="hint">
            Turn on either or both — they run independently on this same event and gallery.
          </p>
          <p className="hint">
            AI indexed photos: {event.ai_indexed_photo_count ?? 0}. Currently searchable: {event.face_search_searchable_photo_count ?? 0}.
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!event.face_search_enabled}
              disabled={togglingFeature === 'faceSearch'}
              onChange={(e) => handleToggleFeature('faceSearch', e.target.checked)}
            />
            Face Search — guests find their own photos with a selfie
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!event.photo_selection_enabled}
              disabled={togglingFeature === 'photoSelection'}
              onChange={(e) => handleToggleFeature('photoSelection', e.target.checked)}
            />
            Photo Selection — clients log in to browse, favourite, and submit picks
          </label>
        </div>
      )}

      {analytics && (
        <div className="card analytics-card">
          <div className="guest-link-label">Analytics</div>
          <div className="stat-grid">
            <StatTile icon={Search} value={analytics.total_searches} label="searches" />
            <StatTile icon={Users} value={analytics.unique_guests} label="unique guests" />
            <StatTile icon={Target} value={`${Math.round(analytics.match_rate * 100)}%`} label="match rate" />
            <StatTile icon={Flag} value={analytics.feedback_count} label="flagged as wrong" />
          </div>
          {analytics.daily_searches && (
            <TrendChart
              series={[
                { key: 'searches', name: 'Searches', data: analytics.daily_searches },
                { key: 'matches', name: 'Matches', data: analytics.daily_matches },
              ]}
            />
          )}
        </div>
      )}

      {event && (
        <div className="card guest-card-section">
          <div className="row">
            <button className="btn secondary" type="button" onClick={() => setShowGuestCard((v) => !v)}>
              {showGuestCard ? 'Hide guest card' : 'Generate guest card'}
            </button>
            {user?.drive_backup_beta && event.started && (
              <button className="btn secondary" type="button" onClick={() => setShowExportModal(true)}>
                Export to Google Drive
              </button>
            )}
            {event.started && (
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setShowGuestUploadCard((v) => !v)
                  setWindowDaysInput(event.guest_upload_window_days != null ? String(event.guest_upload_window_days) : '')
                }}
              >
                Guest uploads
                {event.pending_guest_upload_count > 0 && (
                  <span className="pending-badge">{event.pending_guest_upload_count}</span>
                )}
              </button>
            )}
            {event.started && (
              <button className="btn secondary" type="button" onClick={() => setShowSlideshowCard((v) => !v)}>
                Live slideshow
              </button>
            )}
            {event.started && !event.is_sub_gallery && (
              <button className="btn secondary" type="button" onClick={() => setShowSubGalleryCard((v) => !v)}>
                Sub-galleries
              </button>
            )}
          </div>
          {showGuestCard && (
            <GuestCard eventName={event.name} guestSlug={event.guestSlug} />
          )}
        </div>
      )}

      {event?.started && showGuestUploadCard && (
        <div className="card">
          <div className="guest-link-label">Guest uploads</div>
          <p className="hint">
            Let guests add their own shots to the gallery via a separate link/QR. Face indexing runs after approval
            only when Face Search is enabled for this event.
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!event.guest_upload_enabled}
              disabled={togglingGuestUploads}
              onChange={(e) => handleToggleGuestUploads(e.target.checked)}
            />
            Allow guests to upload photos
          </label>

          {event.guest_upload_enabled && (
            <>
              <form className="row" onSubmit={handleSaveWindowDays} style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <div>
                  <label className="field-label" htmlFor="guest-upload-window">Upload window (days)</label>
                  <input
                    id="guest-upload-window"
                    className="text-input"
                    type="number"
                    min="1"
                    placeholder="Same as guest access (90 days)"
                    value={windowDaysInput}
                    onChange={(e) => setWindowDaysInput(e.target.value)}
                  />
                </div>
                <button className="btn secondary" type="submit" disabled={savingWindow}>
                  {savingWindow ? 'Saving…' : 'Save'}
                </button>
              </form>
              <p className="hint">
                How many days guests can keep uploading, separate from the event's main guest-access window. Leave
                blank to use the same window as everything else.
              </p>

              <GuestCard
                eventName={event.name}
                guestSlug={event.guestSlug}
                urlPath="/upload"
                instruction="Scan to share your photos"
                filenameSuffix="upload-card"
              />

              <div className="guest-link-label" style={{ marginTop: 20 }}>
                Pending approval ({photos.filter((p) => p.approval_status === 'pending').length})
              </div>
              {photos.filter((p) => p.approval_status === 'pending').length === 0 ? (
                <p className="hint">No guest uploads waiting for review.</p>
              ) : (
                <div className="photo-grid">
                  {photos
                    .filter((p) => p.approval_status === 'pending')
                    .sort((a, b) => (b.moderation_flagged ? 1 : 0) - (a.moderation_flagged ? 1 : 0))
                    .map((p) => (
                    <div className={p.moderation_flagged ? 'photo-card flagged-card' : 'photo-card'} key={p.photo_id}>
                      <img src={fileUrl(p.thumbnail_url || p.url)} alt={p.filename} />
                      <div className="meta">
                        <span>{p.face_count} face{p.face_count === 1 ? '' : 's'}</span>
                        {p.moderation_flagged && <span className="flagged-label">Flagged — review first</span>}
                      </div>
                      <div className="match-card-actions">
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => handleApprovePhoto(p.photo_id)}
                          disabled={approvingId === p.photo_id}
                        >
                          Approve
                        </button>
                        <button
                          className="dismiss-btn"
                          type="button"
                          onClick={() => handleRejectPhoto(p.photo_id, p.filename)}
                          disabled={approvingId === p.photo_id}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {event?.started && showSlideshowCard && (
        <div className="card">
          <div className="guest-link-label">Live slideshow</div>
          <p className="hint">
            A full-screen, auto-advancing carousel for a venue TV/screen — updates live as photos land from any
            source. No login needed to view it.
          </p>
          <GuestCard
            eventName={event.name}
            guestSlug={event.guestSlug}
            urlPath="/slideshow"
            instruction="Scan to open the live slideshow"
            filenameSuffix="slideshow-card"
          />
        </div>
      )}

      {event?.started && !event.is_sub_gallery && showSubGalleryCard && (
        <div className="card">
          <div className="guest-link-label">Sub-galleries</div>
          <p className="hint">
            Split this event into separate galleries (e.g. "Ceremony" / "Reception") — guests scan the one shared
            link above, then pick a sub-gallery before searching or uploading.
          </p>

          {event.sub_galleries?.length > 0 && (
            <ul className="team-list">
              {event.sub_galleries.map((g) => (
                <li key={g.id} className="team-list-item">
                  <span>{g.name} <span className="hint">({g.photo_count} photos)</span></span>
                  <Link className="btn secondary" to={`/events/${g.id}`}>Open</Link>
                </li>
              ))}
            </ul>
          )}

          <form className="row" onSubmit={handleCreateSubGallery} style={{ marginTop: 10 }}>
            <input
              className="text-input"
              type="text"
              placeholder="e.g. Ceremony"
              value={subGalleryName}
              onChange={(e) => setSubGalleryName(e.target.value)}
            />
            <button className="btn" type="submit" disabled={creatingSubGallery || !subGalleryName.trim()}>
              {creatingSubGallery ? 'Adding…' : 'Add sub-gallery'}
            </button>
          </form>
        </div>
      )}

      {event && (
        <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export to Google Drive">
          {event.drive_folder_url ? (
            <div className="export-modal-body">
              <p className="hint">
                Connected to{' '}
                <a href={event.drive_folder_url} target="_blank" rel="noreferrer">this Drive folder</a>.
              </p>
              <label
                className="checkbox-row"
                title={!event.drive_backup_available ? 'Drive backup is not set up on this PandaSpot instance yet' : undefined}
              >
                <input
                  type="checkbox"
                  checked={!!event.drive_backup_enabled}
                  disabled={togglingDriveBackup || !event.drive_backup_available}
                  onChange={(e) => handleToggleDriveBackup(e.target.checked)}
                />
                Back up photos to this Drive folder <span className="hint">(advanced, beta)</span>
              </label>

              {event.drive_backup_enabled && (
                <>
                  <label className="field-label" htmlFor="export-source-filter">Which photos to export</label>
                  <select
                    id="export-source-filter"
                    className="text-input"
                    value={exportSource}
                    onChange={(e) => setExportSource(e.target.value)}
                  >
                    <option value="">All local photos (uploaded + PandaShoots)</option>
                    <option value="upload">Uploaded only</option>
                    <option value="shoots">PandaShoots only</option>
                  </select>

                  <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                    <button className="btn secondary" type="button" onClick={handleBackupExisting} disabled={backingUpExisting || uploading}>
                      {backingUpExisting ? 'Starting…' : 'Start export'}
                    </button>
                    <button className="btn secondary" type="button" onClick={handleReclaimDriveBackupNow} disabled={reclaimingDriveBackup}>
                      {reclaimingDriveBackup ? 'Reclaiming…' : "I've made my copies — free up space"}
                    </button>
                  </div>

                  <ul className="notice-list">
                    <li>Applies to any photo exported this way — new PandaShoots captures, and any existing photo (direct uploads included) you export above.</li>
                    <li>Exported photos live in this Drive folder for only 2 days before being pulled back to PandaSpot's server and removed from Drive.</li>
                    <li>7 days total before permanent deletion everywhere — including the PandaSpot copy, even for a photo you originally uploaded directly.</li>
                    <li>Make your own copy in Drive (select all, "Make a copy") well before then.</li>
                  </ul>

                  <JobProgressLog lines={logLines} progress={progress} />
                  {skippedFiles.length > 0 && (
                    <div className="skipped-files-box">
                      <p className="hint">Skipped {skippedFiles.length} file(s) — not exported:</p>
                      <ul className="notice-list">
                        {skippedFiles.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {driveBackupMessage && <p className="hint">{driveBackupMessage}</p>}
                </>
              )}
            </div>
          ) : (
            <div className="export-modal-body">
              <p className="hint">No Drive folder is connected to this event yet — paste one below to enable export.</p>
              <ul className="notice-list">
                <li>The folder must be shared as "Anyone with the link can view" (or better) so PandaSpot can write to it.</li>
                <li>Connecting also scans and imports every photo already in the folder, so it can take a while for a large one.</li>
              </ul>
              <div className="row">
                <input
                  className="text-input"
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={exportUrl}
                  onChange={(e) => handleExportUrlChange(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleExportTestConnection}
                  disabled={uploading || exportTesting || !exportUrl.trim()}
                >
                  {exportTesting ? 'Testing…' : 'Test connection'}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={handleExportConnect}
                  disabled={
                    uploading ||
                    !(exportConnectionTest?.ok && exportTestedUrl === exportUrl.trim()) ||
                    (exportConnectionTest?.permission && exportConnectionTest.permission !== 'writer')
                  }
                  title={
                    !(exportConnectionTest?.ok && exportTestedUrl === exportUrl.trim())
                      ? 'Test the connection first'
                      : exportConnectionTest?.permission && exportConnectionTest.permission !== 'writer'
                        ? 'Export requires Editor access on the folder'
                        : undefined
                  }
                >
                  {connectingDrive ? 'Connecting…' : 'Connect & enable export'}
                </button>
              </div>
              {exportConnectionTest && (
                <p className={exportConnectionTest.ok ? 'hint connection-test-ok' : 'error connection-test-fail'}>
                  {exportConnectionTest.ok ? (
                    <>
                      <CheckCircle2 size={14} /> Reachable — "{exportConnectionTest.folderName}"
                      {' · '}
                      {exportConnectionTest.permission === 'writer'
                        ? 'Editor access given to anyone with the link'
                        : exportConnectionTest.permission === 'commenter'
                          ? 'Commenter access given to anyone with the link'
                          : exportConnectionTest.permission === 'reader'
                            ? 'Viewer access given to anyone with the link'
                            : "Accessible, but the exact permission level couldn't be read"}
                    </>
                  ) : (
                    <>
                      <XCircle size={14} /> {exportConnectionTest.message}
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {event?.role === 'owner' && (
        <div className="card team-card">
          <div className="guest-link-label">Team</div>
          <p className="hint">Invite a second shooter to help with this event — they'll get their own login, scoped to this event only.</p>

          <form className="row" onSubmit={handleInvite}>
            <input
              className="text-input"
              type="email"
              placeholder="assistant@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className="btn" type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Inviting…' : 'Invite'}
            </button>
          </form>

          {inviteMessage && <p className="hint">{inviteMessage}</p>}
          {teamError && <p className="error">{teamError}</p>}

          <ul className="team-list">
            {collaborators.map((c) => (
              <li key={c.user_id} className="team-list-item">
                <span>{c.name} <span className="hint">({c.email})</span></span>
                <button className="btn secondary" type="button" onClick={() => handleRemoveCollaborator(c.user_id)}>
                  Remove
                </button>
              </li>
            ))}
            {pendingInvites.map((inv) => (
              <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                <span>{inv.email} <span className="hint">(pending)</span></span>
                <button className="btn secondary" type="button" onClick={() => handleCancelInvite(inv.invite_id)}>
                  Cancel
                </button>
              </li>
            ))}
            {collaborators.length === 0 && pendingInvites.length === 0 && (
              <li className="hint">No collaborators yet — invite someone above.</li>
            )}
          </ul>
        </div>
      )}

      {/* MERGE (Studio-Verse Photo Selection): only shown once the studio
          has turned this feature on for the event (see the Features card
          above) — inviting clients to a feature that isn't active would
          just be confusing. */}
      {event?.photo_selection_enabled && (event?.role === 'owner' || event?.role === 'collaborator') && (
        <div className="card team-card">
          <div className="guest-link-label">Clients</div>
          <p className="hint">Invite a client to log in and favourite their photos from this event.</p>

          <form className="row" onSubmit={handleInviteClient}>
            <input
              className="text-input"
              type="email"
              placeholder="client@example.com"
              value={clientInviteEmail}
              onChange={(e) => setClientInviteEmail(e.target.value)}
            />
            <input
              className="text-input"
              type="number"
              min="1"
              placeholder="Favourite cap (optional)"
              style={{ maxWidth: 180 }}
              value={clientInviteCap}
              onChange={(e) => setClientInviteCap(e.target.value)}
            />
            <button className="btn" type="submit" disabled={invitingClient || !clientInviteEmail.trim()}>
              {invitingClient ? 'Inviting…' : 'Invite'}
            </button>
          </form>

          {clientInviteMessage && <p className="hint">{clientInviteMessage}</p>}
          {clientError && <p className="error">{clientError}</p>}

          <ul className="team-list">
            {clients.map((c) => (
              <li key={c.user_id} className="team-list-item">
                <span>
                  {c.name} <span className="hint">({c.email})</span>
                  {c.favourite_cap != null && <span className="hint"> · cap {c.favourite_cap}</span>}
                  {c.submitted_at && <span className="hint"> · submitted</span>}
                </span>
                <button className="btn secondary" type="button" onClick={() => handleRemoveClient(c.user_id)}>
                  Remove
                </button>
              </li>
            ))}
            {pendingClientInvites.map((inv) => (
              <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                <span>{inv.email} <span className="hint">(pending)</span></span>
              </li>
            ))}
            {clients.length === 0 && pendingClientInvites.length === 0 && (
              <li className="hint">No clients yet — invite one above.</li>
            )}
          </ul>
        </div>
      )}

      {event && !event.started ? (
        <div className="card upload-section">
          <div className="guest-link-label">Start this event</div>
          <p className="hint">
            Uploading, Google Drive import, and PandaShoots camera upload all unlock once you start the event.
            Everything else — the guest link, analytics, and team — is ready already.
          </p>
          <button className="btn" type="button" onClick={handleStartEvent} disabled={startingEvent}>
            {startingEvent ? 'Starting…' : 'Start event'}
          </button>
        </div>
      ) : (
      <div className="card upload-section">
        <div className="guest-link-label">Upload photos</div>
        <div className="upload-tabs">
          <button
            type="button"
            className={uploadTab === 'files' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('files')}
          >
            Upload files
          </button>
          <button
            type="button"
            className={uploadTab === 'drive' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('drive')}
          >
            Import from Google Drive
          </button>
          <button
            type="button"
            className={uploadTab === 'shoots' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('shoots')}
          >
            PandaShoots
          </button>
        </div>

        {uploadTab === 'files' ? (
          <Dropzone
            onFiles={handleFiles}
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            hint="JPG, PNG, or WebP — drop multiple photos at once"
          />
        ) : uploadTab === 'shoots' ? (
          <div className="drive-import">
            {!event?.shoots_connected ? (
              <>
                <ul className="notice-list">
                  <li>Photos land in this gallery — scanned for faces and thumbnailed — while the shoot is still happening.</li>
                  <li>Needs a camera with built-in FTP transfer (most professional mirrorless/DSLR bodies have it), or an add-on WiFi transmitter grip.</li>
                </ul>
                <button className="btn" type="button" onClick={handleSetupShoots} disabled={settingUpShoots}>
                  {settingUpShoots ? 'Setting up…' : 'Set up camera upload'}
                </button>
              </>
            ) : (
              <>
                <p className="hint">Camera upload is on for this event.</p>
                {!shoots ? (
                  <button className="btn" type="button" onClick={handleShowShootsCredentials}>
                    Show camera setup details
                  </button>
                ) : (
                  <div className="shoots-credentials">
                    <div className="shoots-field"><span>Host</span><code>{shoots.ftp_host}</code></div>
                    <div className="shoots-field"><span>Port</span><code>{shoots.ftp_port}</code></div>
                    <div className="shoots-field"><span>Username</span><code>{shoots.ftp_username}</code></div>
                    <div className="shoots-field"><span>Password</span><code>{shoots.ftp_password}</code></div>
                    <p className="hint">
                      Enter these into your camera's FTP transfer settings menu, and set it to upload on capture.
                    </p>
                  </div>
                )}
                <div className="row">
                  <button className="btn secondary" type="button" onClick={handleRegenerateShoots} disabled={regeneratingShoots}>
                    {regeneratingShoots ? 'Regenerating…' : 'Regenerate credentials'}
                  </button>
                  <button className="btn danger-btn" type="button" onClick={handleDisconnectShoots} disabled={disconnectingShoots}>
                    {disconnectingShoots ? 'Turning off…' : 'Turn off camera upload'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : event?.drive_folder_url ? (
          <div className="drive-import">
            <p className="hint">
              Connected to{' '}
              <a href={event.drive_folder_url} target="_blank" rel="noreferrer">this Drive folder</a>.
              {' '}
              {event.last_drive_sync_at
                ? `Last synced ${new Date(event.last_drive_sync_at).toLocaleString()}.`
                : 'Not synced yet.'}
            </p>
            <ul className="notice-list">
              <li>Syncing checks for photos added or removed in the folder since the last sync.</li>
              <li>New photos are imported; ones deleted from Drive are removed from PandaSpot too.</li>
            </ul>
            <div className="row">
              <button className="btn" type="button" onClick={handleDriveSync} disabled={uploading}>
                {syncingDrive ? 'Syncing…' : 'Sync now'}
              </button>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!event.drive_sync_enabled}
                  disabled={togglingAutoSync}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                />
                Auto-sync once a day
              </label>
            </div>
          </div>
        ) : (
          <div className="drive-import">
            <ul className="notice-list">
              <li>Imported photos aren't stored on PandaSpot's server — only thumbnails and face-search data are kept.</li>
              <li>Downloads and shares fetch the original from your Drive folder live.</li>
              <li>Keep the folder shared as "Anyone with the link can view" — if you later restrict or delete files there, those specific photos can no longer be downloaded through PandaSpot (search still works fine).</li>
              <li>Connecting scans and imports every photo currently in the folder, so it can take a while for a large one.</li>
            </ul>
            <div className="row">
              <input
                className="text-input"
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveUrl}
                onChange={(e) => handleDriveUrlChange(e.target.value)}
                disabled={uploading}
              />
              <button
                className="btn secondary"
                type="button"
                onClick={handleTestConnection}
                disabled={uploading || testingConnection || !driveUrl.trim()}
              >
                {testingConnection ? 'Testing…' : 'Test connection'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleDriveConnect}
                disabled={uploading || !(connectionTest?.ok && testedUrl === driveUrl.trim())}
                title={!(connectionTest?.ok && testedUrl === driveUrl.trim()) ? 'Test the connection first' : undefined}
              >
                {connectingDrive ? 'Connecting…' : 'Connect folder'}
              </button>
            </div>
            {connectionTest && (
              <p className={connectionTest.ok ? 'hint connection-test-ok' : 'error connection-test-fail'}>
                {connectionTest.ok ? (
                  <>
                    <CheckCircle2 size={14} /> Reachable — "{connectionTest.folderName}"
                    {' · '}
                    {connectionTest.permission === 'writer'
                      ? 'Editor access given to anyone with the link'
                      : connectionTest.permission === 'commenter'
                        ? 'Commenter access given to anyone with the link'
                        : connectionTest.permission === 'reader'
                          ? 'Viewer access given to anyone with the link'
                          : "Accessible, but the exact permission level couldn't be read"}
                  </>
                ) : (
                  <>
                    <XCircle size={14} /> {connectionTest.message}
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <JobProgressLog lines={logLines} progress={progress} />
        {skippedFiles.length > 0 && (
          <div className="skipped-files-box">
            <p className="hint">Skipped {skippedFiles.length} file(s) — not imported/uploaded:</p>
            <ul className="notice-list">
              {skippedFiles.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
      </div>
      )}

      {error && <p className="error">{error}</p>}

      {liveNotice && <p className="live-notice">{liveNotice}</p>}

      {photos.filter((p) => p.approval_status !== 'pending').length === 0 ? (
        <p className="hint">No photos uploaded yet.</p>
      ) : (
        <>
        <div className="row source-filter-row">
          {[
            { key: 'all', label: 'All' },
            { key: 'upload', label: 'Uploaded' },
            { key: 'shoots', label: 'PandaShoots' },
            { key: 'drive_import', label: 'Drive import' },
            { key: 'guest', label: 'Guest uploads' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={sourceFilter === opt.key ? 'upload-tab active' : 'upload-tab'}
              onClick={() => setSourceFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="photo-grid">
          {photos
            .filter((p) => p.approval_status !== 'pending')
            .filter((p) => sourceFilter === 'all' || p.source === sourceFilter)
            .map((p) => (
            <div className="photo-card" key={p.photo_id}>
              <img src={fileUrl(p.thumbnail_url || p.url)} alt={p.filename} />
              <div className="meta">
                <span>{p.face_count} face{p.face_count === 1 ? '' : 's'}</span>
                <button
                  className="dismiss-btn"
                  type="button"
                  onClick={() => handleDeletePhoto(p.photo_id, p.filename)}
                  disabled={deletingPhotoId === p.photo_id}
                >
                  {deletingPhotoId === p.photo_id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
              <div className="photo-feature-membership">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={p.face_search_visible !== false}
                    disabled={!!savingPhotoFeatures[p.photo_id]}
                    onChange={(e) => handlePhotoFeatureMembership(p.photo_id, { face_search_visible: e.target.checked })}
                  />
                  Face Search
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={p.photo_selection_visible !== false}
                    disabled={!!savingPhotoFeatures[p.photo_id]}
                    onChange={(e) => handlePhotoFeatureMembership(p.photo_id, { photo_selection_visible: e.target.checked })}
                  />
                  Photo Selection
                </label>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {event?.role === 'owner' && (
        <div className="card danger-zone">
          <div className="guest-link-label">Danger zone</div>
          <p className="hint">Permanently deletes this event, every photo, and the guest link. Guests will no longer be able to search this event.</p>
          <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
            {deletingEvent ? 'Deleting…' : 'Delete event'}
          </button>
        </div>
      )}
    </div>
  )
}
