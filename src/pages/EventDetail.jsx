import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { Archive, ArchiveRestore, CalendarDays, Download, MapPin, Pencil, Search, Star, Users, Target, Flag, CheckCircle2, XCircle } from 'lucide-react'
import {
  addStudioPick,
  approvePhoto,
  archiveEvent,
  archivePhoto,
  backupExistingPhotosToDrive,
  bulkSetMembership,
  createAlbum,
  downloadSelectionCsv,
  downloadSelectionPdf,
  downloadSelectionTxt,
  downloadSelectionZip,
  getEventFaceGroups,
  getPhotoFaces,
  cancelInvite,
  connectDriveFolder,
  createSubGallery,
  deleteEvent,
  deleteEventCover,
  deletePhoto,
  disconnectShoots,
  fileUrl,
  generateShootsCredentials,
  getEvent,
  getEventAnalytics,
  getShootsCredentials,
  inviteClient,
  inviteCollaborator,
  listAlbums,
  listClients,
  listCollaborators,
  listEventFavourites,
  listPhotos,
  listStudioPicks,
  publishEvent,
  reclaimDriveBackupNow,
  removeClient,
  removeCollaborator,
  removeStudioPick,
  restoreClient,
  restoreEvent,
  restorePhoto,
  revokeClient,
  setDriveAutoSync,
  setEventAllowDownload,
  setEventDriveBackup,
  setGuestUploadWindow,
  startEvent,
  startPhotoUpload,
  submitClientOnBehalf,
  subscribeToLiveEvents,
  subscribeToUploadProgress,
  syncDriveFolder,
  testDriveFolderConnection,
  toggleEventFeature,
  toggleGuestUploads,
  unsubmitClientOnBehalf,
  updateClientGrant,
  updateEvent,
  updatePhotoFeatureMembership,
  uploadEventCover,
} from '../api.js'
import { getToken } from '../authToken.js'
import { useAuth } from '../auth.jsx'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import { uploadLargeFile } from '../lib/largeUpload.js'
import GalleryMedia from '../components/GalleryMedia.jsx'
import PrivacySettingsCard from '../components/PrivacySettingsCard.jsx'
import PhotoFaceViewer from '../components/PhotoFaceViewer.jsx'
import FaceGroupsView from '../components/FaceGroupsView.jsx'
import { isVideoFile } from '../utils/media.js'
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

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

// Renders the react-easy-crop pixel area to a JPEG blob for the cover upload.
function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(pixelCrop.width)
      canvas.height = Math.round(pixelCrop.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, canvas.width, canvas.height
      )
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not crop the cover image'))
      }, 'image/jpeg', 0.9)
    }
    image.onerror = () => reject(new Error('Could not read the cover image'))
    image.src = imageSrc
  })
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
  // MERGE (Studio-Verse EventDetail depth, Phase 18E): event settings state
  // — details edit, publish, archive/restore, allow-download, cover crop.
  const [showEditDetails, setShowEditDetails] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editVenue, setEditVenue] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [togglingDownload, setTogglingDownload] = useState(false)
  const [showCoverModal, setShowCoverModal] = useState(false)
  const [coverSrc, setCoverSrc] = useState('')
  const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 })
  const [coverZoom, setCoverZoom] = useState(1)
  const [coverPixels, setCoverPixels] = useState(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(null) // { loaded, total|null, speed }
  const [zippingPicks, setZippingPicks] = useState(false)
  const [picksZipProgress, setPicksZipProgress] = useState(null)
  // Studio read-side of Photo Selection: grouped/merged favourites + picks.
  const [favView, setFavView] = useState('grouped') // grouped | merged
  const [eventFavourites, setEventFavourites] = useState(null)
  const [studioPicks, setStudioPicks] = useState([])
  const [togglingPickId, setTogglingPickId] = useState(null)
  // Per-client access panel state (cap/expiry edit, submit/unlock, revoke).
  const [expandedClient, setExpandedClient] = useState(null)
  const [grantCap, setGrantCap] = useState('')
  const [grantExpiry, setGrantExpiry] = useState('')
  const [savingGrant, setSavingGrant] = useState(false)
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
  const [photoStatusFilter, setPhotoStatusFilter] = useState('active') // active | archived | all
  // Phase 21 — three workspace tabs: manager (files in/out), selection
  // (Photo Selection members + clients), ai (Face Search members + guests).
  const [activeTab, setActiveTab] = useState('manager') // manager | selection | ai | albums
  // Phase 23 — Albums tab: album proofing projects for this event.
  const [albums, setAlbums] = useState(null)
  const [albumsError, setAlbumsError] = useState('')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  // Phase 1 — Selection export: per-client or merged, CSV/TXT/PDF/ZIP.
  const [exportClient, setExportClient] = useState('merged')
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)
  // Phase 2 — Face Search privacy settings draft + save.
  const [privacyDraft, setPrivacyDraft] = useState(null)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  const handleSelectionExport = async () => {
    setExporting(true)
    try {
      const scope = exportClient === 'merged' ? { merged: true } : { clientId: exportClient }
      if (exportFormat === 'csv') await downloadSelectionCsv(eventId, scope)
      else if (exportFormat === 'txt') await downloadSelectionTxt(eventId, scope)
      else if (exportFormat === 'pdf') await downloadSelectionPdf(eventId, scope)
      else await downloadSelectionZip(eventId, scope)
      showToast('Export downloaded')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setExporting(false)
    }
  }
  const [managerSelected, setManagerSelected] = useState({}) // photo_id -> true
  const [bulking, setBulking] = useState(null)
  // Phase 22 — face viewer modal state for the AI member grid.
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [viewingFaces, setViewingFaces] = useState([])
  const [facesLoading, setFacesLoading] = useState(false)
  // Phase 22 — AI Faces sub-tab (auto face groups).
  const [aiView, setAiView] = useState('members') // members | faces
  const [faceGroupsState, setFaceGroupsState] = useState({ loading: false, error: '', data: null })
  const [openGroupId, setOpenGroupId] = useState(null)

  // Phase 23 — load albums when the Albums tab opens (independent of the
  // Face Search / Photo Selection feature toggles).
  const loadAlbums = useCallback(() => {
    setAlbumsError('')
    listAlbums(eventId)
      .then(setAlbums)
      .catch((e) => setAlbumsError(e.message))
  }, [eventId])
  useEffect(() => {
    if (activeTab !== 'albums' || albums !== null) return
    loadAlbums()
  }, [activeTab, albums, loadAlbums])
  // Load face groups on first opening the Faces sub-tab (and refresh
  // whenever the photo list changes, since new faces alter clusters).
  useEffect(() => {
    if (aiView !== 'faces' || activeTab !== 'ai' || !event?.face_search_enabled) return
    if (faceGroupsState.data || faceGroupsState.loading) return
    setFaceGroupsState({ loading: true, error: '', data: null })
    getEventFaceGroups(eventId)
      .then((data) => setFaceGroupsState({ loading: false, error: '', data }))
      .catch((e) => setFaceGroupsState({ loading: false, error: e.message, data: null }))
  }, [aiView, activeTab, event?.face_search_enabled, eventId]) // eslint-disable-line react-hooks/exhaustive-deps
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

  const loadFavourites = useCallback(() => {
    listEventFavourites(eventId)
      .then(setEventFavourites)
      .catch(() => setEventFavourites(null))
  }, [eventId])

  const loadPicks = useCallback(() => {
    listStudioPicks(eventId)
      .then((data) => setStudioPicks(data.photo_ids || []))
      .catch(() => setStudioPicks([]))
  }, [eventId])

  const load = useCallback(() => {
    getEvent(eventId)
      .then((ev) => {
        setEvent(ev)
        if (ev.role === 'owner') loadTeam()
        if (ev.photo_selection_enabled) {
          loadClients()
          loadFavourites()
          loadPicks()
        }
      })
      .catch((e) => setError(e.message))
    listPhotos(eventId, photoStatusFilter).then(setPhotos).catch((e) => setError(e.message))
    getEventAnalytics(eventId).then(setAnalytics).catch(() => setAnalytics(null))
  }, [eventId, photoStatusFilter, loadTeam, loadClients, loadFavourites, loadPicks])

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

  // MERGE (Studio-Verse EventDetail depth, Phase 18E) handlers — details
  // edit, publish (one-way), archive/restore, allow-download, cover crop,
  // studio zip with live byte/speed progress, picks, and per-client grants.

  const openEditDetails = () => {
    if (!event) return
    setEditName(event.name || '')
    setEditDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 10) : '')
    setEditVenue(event.event_venue || '')
    setEditDesc(event.description || '')
    setShowEditDetails(true)
  }

  const handleSaveDetails = async (e) => {
    e.preventDefault()
    if (!editName.trim()) {
      showToast('Event name is required', { type: 'error' })
      return
    }
    setSavingDetails(true)
    try {
      await updateEvent(eventId, {
        name: editName.trim(),
        event_date: editDate || null,
        event_venue: editVenue.trim() || null,
        description: editDesc.trim() || null,
      })
      setShowEditDetails(false)
      load()
      showToast('Event details saved.')
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setSavingDetails(false)
    }
  }

  const handlePublish = async () => {
    const confirmed = await confirm(
      'Publish this event? This marks uploads as finished for Photo Selection clients. Publishing is one-way.',
      { title: 'Publish event?', confirmLabel: 'Publish', danger: false }
    )
    if (!confirmed) return
    setPublishing(true)
    try {
      await publishEvent(eventId)
      load()
      showToast('Event published.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setPublishing(false)
    }
  }

  const handleArchive = async () => {
    const confirmed = await confirm(
      `Archive "${event?.name}"? Guests immediately lose access and clients can't open the gallery — nothing is deleted, and you can restore it any time.`,
      { title: 'Archive event?', confirmLabel: 'Archive', danger: false }
    )
    if (!confirmed) return
    setArchiving(true)
    try {
      await archiveEvent(eventId)
      load()
      showToast('Event archived.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setArchiving(false)
    }
  }

  const handleRestore = async () => {
    const confirmed = await confirm(
      `Restore "${event?.name}"? Guests and clients regain access immediately.`,
      { title: 'Restore event?', confirmLabel: 'Restore', danger: false }
    )
    if (!confirmed) return
    setArchiving(true)
    try {
      await restoreEvent(eventId)
      load()
      showToast('Event restored.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setArchiving(false)
    }
  }

  const handleAllowDownload = async (enabled) => {
    setTogglingDownload(true)
    try {
      await setEventAllowDownload(eventId, enabled)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setTogglingDownload(false)
    }
  }

  const handleCoverFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCoverSrc(url)
    setCoverCrop({ x: 0, y: 0 })
    setCoverZoom(1)
    setCoverPixels(null)
    setShowCoverModal(true)
    e.target.value = ''
  }

  const handleSaveCover = async () => {
    if (!coverSrc || !coverPixels) {
      showToast('Adjust the crop first', { type: 'error' })
      return
    }
    setUploadingCover(true)
    try {
      const blob = await getCroppedImg(coverSrc, coverPixels)
      await uploadEventCover(eventId, blob)
      setShowCoverModal(false)
      setCoverSrc('')
      load()
      showToast('Cover photo updated.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setUploadingCover(false)
    }
  }

  const handleRemoveCover = async () => {
    const confirmed = await confirm('Remove the cover photo?', { title: 'Remove cover?', confirmLabel: 'Remove' })
    if (!confirmed) return
    try {
      await deleteEventCover(eventId)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  // Shared streaming download: fetches a zip path with auth, reports
  // byte/speed progress, and saves the finished blob. Used by both the
  // full-gallery zip and the studio-picks zip below.
  const streamZipToDisk = async (zipPath, filename, setBusy, setProg) => {
    if (!event) return
    setBusy(true)
    setProg({ loaded: 0, total: null, speed: 0 })
    try {
      const token = getToken()
      const res = await fetch(fileUrl(zipPath), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        let message = `Download failed (${res.status})`
        try {
          const body = await res.json()
          message = body.error || body.message || message
        } catch {
          // non-JSON error — keep generic
        }
        throw new Error(message)
      }
      const total = Number(res.headers.get('content-length')) || null
      const reader = res.body.getReader()
      const chunks = []
      let loaded = 0
      const startedAt = Date.now()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        const elapsed = Math.max(0.1, (Date.now() - startedAt) / 1000)
        setProg({ loaded, total, speed: loaded / elapsed })
      }
      const blob = new Blob(chunks, { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(false)
      setProg(null)
    }
  }

  const zipFilename = (suffix) =>
    `${(event?.name || 'event').replace(/[^\w\-]+/g, '-').slice(0, 60)}${suffix}.zip`

  const handleStudioZip = async () => {
    if (zipping) return
    await streamZipToDisk(`/events/${eventId}/download-zip`, zipFilename(''), setZipping, setZipProgress)
  }

  const handlePicksZip = async () => {
    if (zippingPicks) return
    await streamZipToDisk(`/events/${eventId}/studio-picks/download-zip`, zipFilename('-picks'), setZippingPicks, setPicksZipProgress)
  }

  const handleArchivePhoto = async (photoId, filename) => {
    try {
      await archivePhoto(eventId, photoId)
      setPhotos((prev) => prev.map((p) => (p.photo_id === photoId ? { ...p, archived_at: new Date().toISOString() } : p)))
      setFaceGroupsState((prev) => (prev.data ? { loading: false, error: '', data: null } : prev))
      showToast(`"${filename}" archived — hidden from guests and clients.`)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const handleRestorePhoto = async (photoId, filename) => {
    try {
      await restorePhoto(eventId, photoId)
      setPhotos((prev) => prev.map((p) => (p.photo_id === photoId ? { ...p, archived_at: null } : p)))
      setFaceGroupsState((prev) => (prev.data ? { loading: false, error: '', data: null } : prev))
      showToast(`"${filename}" restored.`)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  // Phase 21 — manager multi/all/particular selection into the two
  // feature memberships (zero-copy: only DB flags change, files stay
  // put). Visible-grid ids for "select all", explicit ids otherwise.
  const visibleManageablePhotos = (photos || []).filter(
    (p) => p.approval_status !== 'pending'
      && (sourceFilter === 'all' || (p.source || 'upload') === sourceFilter)
  )

  const toggleManagerSelect = (photoId) => {
    setManagerSelected((prev) => {
      const next = { ...prev }
      if (next[photoId]) delete next[photoId]
      else next[photoId] = true
      return next
    })
  }

  const toggleManagerSelectAllVisible = () => {
    const ids = visibleManageablePhotos.map((p) => p.photo_id)
    const allSelected = ids.length > 0 && ids.every((id) => managerSelected[id])
    if (allSelected) {
      setManagerSelected({})
    } else {
      const next = {}
      for (const id of ids) next[id] = true
      setManagerSelected(next)
    }
  }

  const selectedCount = Object.keys(managerSelected).length

  // Phase 21 — per-tab member views, derived from the same photo list the
  // manager shows (so the current status filter applies in every tab).
  const selectionMembers = () => (photos || []).filter(
    (p) => p.approval_status !== 'pending' && p.photo_selection_visible !== false
  )
  const aiMembers = () => (photos || []).filter(
    (p) => p.approval_status !== 'pending' && p.face_search_visible !== false
  )

  const openFaceViewer = async (photo) => {
    setViewingPhoto(photo)
    setViewingFaces([])
    setFacesLoading(true)
    try {
      const data = await getPhotoFaces(eventId, photo.photo_id)
      setViewingFaces(data.faces || [])
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setFacesLoading(false)
    }
  }

  const handleBulkRemoveVisible = async (feature) => {    const members = feature === 'selection' ? selectionMembers() : aiMembers()
    if (members.length === 0) return
    const patch = feature === 'selection' ? { photo_selection_visible: false } : { face_search_visible: false }
    const confirmed = await confirm(
      `Remove ${members.length} visible photo(s) from ${feature === 'selection' ? 'Photo Selection' : 'AI Search'}? Files stay in the manager — only membership flags change.`,
      { title: 'Remove from feature?', confirmLabel: 'Remove', danger: false }
    )
    if (!confirmed) return
    setBulking('remove')
    try {
      const res = await bulkSetMembership(eventId, {
        photoIds: members.map((p) => p.photo_id),
        ...patch,
      })
      showToast(`${res.updated} photo(s) removed.`)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBulking(null)
    }
  }

  const handleBulkMembership = async (patch, label) => {
    const ids = Object.keys(managerSelected)
    if (ids.length === 0) {
      showToast('Select photos in the manager grid first', { type: 'error' })
      return
    }
    setBulking(label)
    try {
      const res = await bulkSetMembership(eventId, { photoIds: ids, ...patch })
      if (res.job_id) {
        appendLog(`Indexing ${ids.length} photo(s) for Face Search in the background…`)
        watchJob(res.job_id, { failedLabel: 'Face indexing failed' })
      } else {
        load()
      }
      // Newly indexed faces alter clusters — drop cached groups so the
      // Faces sub-tab refetches fresh on next open.
      setFaceGroupsState((prev) => (prev.data ? { loading: false, error: '', data: null } : prev))
      if (res.skipped?.length > 0) {
        showToast(`${res.updated} updated, ${res.skipped.length} skipped`, { type: 'error' })
      } else {
        showToast(`${res.updated} photo(s) updated.`)
      }
      setManagerSelected({})
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBulking(null)
    }
  }

  const handleBulkAddAllVisible = async (patch, label) => {
    if (visibleManageablePhotos.length === 0) {
      showToast('No visible photos to update', { type: 'error' })
      return
    }
    const confirmed = await confirm(
      `Apply to all ${visibleManageablePhotos.length} visible photo(s) (current source/status filters)?`,
      { title: label, confirmLabel: 'Apply', danger: false }
    )
    if (!confirmed) return
    setBulking(label)
    try {
      const res = await bulkSetMembership(eventId, {
        all: { source: sourceFilter === 'all' ? undefined : sourceFilter, status: photoStatusFilter },
        ...patch,
      })
      if (res.job_id) {
        appendLog(`Indexing photos for Face Search in the background…`)
        watchJob(res.job_id, { failedLabel: 'Face indexing failed' })
      } else {
        load()
      }
      setFaceGroupsState((prev) => (prev.data ? { loading: false, error: '', data: null } : prev))
      showToast(`${res.updated} photo(s) updated.`)
      setManagerSelected({})
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBulking(null)
    }
  }

  const handleTogglePick = async (photoId, isPick) => {
    setTogglingPickId(photoId)
    try {
      if (isPick) {
        await removeStudioPick(eventId, photoId)
        setStudioPicks((prev) => prev.filter((id) => id !== photoId))
      } else {
        await addStudioPick(eventId, photoId)
        setStudioPicks((prev) => (prev.includes(photoId) ? prev : [...prev, photoId]))
      }
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setTogglingPickId(null)
    }
  }

  const openGrantPanel = (client) => {
    if (expandedClient === client.user_id) {
      setExpandedClient(null)
      return
    }
    setExpandedClient(client.user_id)
    setGrantCap(client.favourite_cap != null ? String(client.favourite_cap) : '')
    setGrantExpiry(client.access_expires ? new Date(client.access_expires).toISOString().slice(0, 10) : '')
  }

  const handleSaveGrant = async (userId) => {
    setSavingGrant(true)
    setClientError('')
    try {
      await updateClientGrant(eventId, userId, {
        favourite_cap: grantCap.trim() === '' ? null : parseInt(grantCap, 10),
        access_expires: grantExpiry === '' ? null : grantExpiry,
      })
      showToast('Client access updated.')
      loadClients()
      loadFavourites()
    } catch (e) {
      setClientError(e.message)
    } finally {
      setSavingGrant(false)
    }
  }

  const handleSubmitBehalf = async (userId, name) => {
    const confirmed = await confirm(
      `Submit ${name || 'this client'}'s selection on their behalf? Their favourites lock immediately.`,
      { title: 'Submit on behalf?', confirmLabel: 'Submit', danger: false }
    )
    if (!confirmed) return
    try {
      await submitClientOnBehalf(eventId, userId)
      loadClients()
      loadFavourites()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const handleUnsubmit = async (userId, name) => {
    const confirmed = await confirm(
      `Re-open ${name || 'this client'}'s selection? They'll be able to change their favourites again.`,
      { title: 'Unlock selection?', confirmLabel: 'Unlock', danger: false }
    )
    if (!confirmed) return
    try {
      await unsubmitClientOnBehalf(eventId, userId)
      loadClients()
      loadFavourites()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const handleRevoke = async (userId, name) => {
    const confirmed = await confirm(
      `Revoke ${name || 'this client'}'s access? They lose the gallery immediately, but you can restore them later without re-inviting.`,
      { title: 'Revoke access?', confirmLabel: 'Revoke' }
    )
    if (!confirmed) return
    try {
      await revokeClient(eventId, userId)
      loadClients()
      loadFavourites()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const handleRestoreAccess = async (userId) => {
    try {
      await restoreClient(eventId, userId)
      loadClients()
      loadFavourites()
    } catch (e) {
      showToast(e.message, { type: 'error' })
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
      // Files too big for one multipart POST go through the resumable
      // chunked uploader first (8MB chunks, retried, resumable); each one
      // still lands in the regular async processing job afterwards, so
      // progress/result UI below is identical either way.
      const LARGE_FILE_BYTES = 20 * 1024 * 1024
      const small = files.filter((f) => f.size <= LARGE_FILE_BYTES)
      const large = files.filter((f) => f.size > LARGE_FILE_BYTES)
      for (const file of large) {
        appendLog(`Large file — uploading "${file.name}" in chunks…`)
        try {
          const { job_id: jobId } = await uploadLargeFile(eventId, file, {
            onProgress: ({ loaded, total }) =>
              setProgress({
                completed: 0,
                total: 1,
                current_file: `${file.name} (${Math.round((loaded / total) * 100)}% uploaded)`,
                eta_seconds: null,
                faces_found_so_far: 0,
                skipped_so_far: [],
              }),
          })
          appendLog(`"${file.name}" uploaded — processing…`)
          await watchJobOnce(jobId)
        } catch (e) {
          appendLog(`"${file.name}" failed — ${e.message}`)
        }
      }
      if (small.length > 0) {
        const { job_id: jobId } = await startPhotoUpload(eventId, small)
        watchJob(jobId, { failedLabel: 'Upload failed' })
      } else {
        setUploading(false)
        setProgress(null)
        load()
      }
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    }
  }

  // One-shot promise wrapper around the SSE progress subscription, for the
  // sequential large-file path above (the shared watchJob handles the
  // single interactive batch instead).
  function watchJobOnce(jobId) {
    return new Promise((resolve) => {
      const cleanup = subscribeToUploadProgress(eventId, jobId, {
        onProgress: (data) => {
          setProgress(data)
          appendLog(progressLine(data))
          addPhotoFromProgress(data)
        },
        onDone: (data) => {
          setProgress(null)
          appendLog(`Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
          setSkippedFiles(data.skipped || [])
          clearActiveJob(eventId)
          showToast(`${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
          cleanup()
          resolve()
        },
        onError: (data) => {
          setProgress(null)
          appendLog(`Failed — ${data.message || 'Upload failed'}`)
          clearActiveJob(eventId)
          showToast(data.message || 'Upload failed', { type: 'error' })
          cleanup()
          resolve()
        },
      })
    })
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
      // Membership flags feed face-group clustering — bust the cache so
      // the Faces sub-tab refetches fresh on next open.
      if (patch.face_search_visible !== undefined) {
        setFaceGroupsState((prev) => (prev.data ? { loading: false, error: '', data: null } : prev))
      }
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
      {event?.cover_url && (
        <img
          src={fileUrl(event.cover_url)}
          alt=""
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 16, marginTop: 8 }}
        />
      )}
      <h1 className="section-title">{event?.name || 'Event'}</h1>
      <p className="subtle">Bulk-upload the event photos here. Face indexing runs only when Face Search is enabled for this event.</p>

      {event?.archived_at && (
        <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
          <div className="guest-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Archive size={14} /> Archived — hidden from guests and clients
          </div>
          <p className="hint">
            Archived {new Date(event.archived_at).toLocaleDateString()}. Nothing is deleted; restore to bring guests and clients back.
          </p>
          <button className="btn secondary" type="button" onClick={handleRestore} disabled={archiving}>
            <ArchiveRestore size={14} /> {archiving ? 'Restoring…' : 'Restore event'}
          </button>
        </div>
      )}

      {event && (
        <div className="card">
          <div className="guest-link-label">Event settings</div>
          {(event.event_date || event.event_venue || event.description) && (
            <p className="hint" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {event.event_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CalendarDays size={13} /> {new Date(event.event_date).toLocaleDateString()}
                </span>
              )}
              {event.event_venue && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {event.event_venue}
                </span>
              )}
              {event.description && <span>{event.description}</span>}
            </p>
          )}
          {event.archived_at && (
            <p className="hint">Archived — hidden from guests and clients until restored.</p>
          )}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn secondary" type="button" onClick={openEditDetails}>
              <Pencil size={14} /> Edit details
            </button>
            {!event.archived_at && (
              <button className="btn secondary" type="button" onClick={handleArchive} disabled={archiving}>
                <Archive size={14} /> {archiving ? 'Archiving…' : 'Archive'}
              </button>
            )}
          </div>
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
            <label className="btn secondary" style={{ cursor: 'pointer' }}>
              {event.cover_url ? 'Change cover' : 'Add cover (16:9)'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverFile} style={{ display: 'none' }} />
            </label>
            {event.cover_url && (
              <button className="btn secondary" type="button" onClick={handleRemoveCover}>
                Remove cover
              </button>
            )}
          </div>
        </div>
      )}

      {event && (
        <div className="card guest-link-card" style={{ display: activeTab === 'ai' ? undefined : 'none' }}>
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
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn secondary" type="button" onClick={() => setShowGuestCard((v) => !v)}>
              {showGuestCard ? 'Hide guest card' : 'Generate guest card'}
            </button>
          </div>
          {showGuestCard && (
            <GuestCard eventName={event.name} guestSlug={event.guestSlug} />
          )}
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

      {/* Phase 2 — Face Search privacy: consent gate, notice text,
          selfie handling, retention, and guest delete requests. */}
      {event && (event.role === 'owner' || event.role === 'collaborator') && (
        <PrivacySettingsCard
          event={event}
          draft={privacyDraft}
          setDraft={setPrivacyDraft}
          saving={savingPrivacy}
          onSave={async () => {
            if (!privacyDraft) return
            setSavingPrivacy(true)
            try {
              const days = privacyDraft.guest_data_retention_days
              await updateEvent(eventId, {
                require_face_search_consent: !!privacyDraft.require_face_search_consent,
                privacy_notice_text: privacyDraft.privacy_notice_text?.trim() ? privacyDraft.privacy_notice_text.trim() : null,
                selfie_retention_mode: privacyDraft.selfie_retention_mode,
                guest_data_retention_days: days === '' || days == null ? null : Number(days),
                allow_guest_data_delete_request: !!privacyDraft.allow_guest_data_delete_request,
              })
              setPrivacyDraft(null)
              showToast('Privacy settings saved')
              load()
            } catch (e) {
              showToast(e.message, { type: 'error' })
            } finally {
              setSavingPrivacy(false)
            }
          }}
        />
      )}

      {/* Phase 21 — workspace tabs. Manager holds every file movement
          (upload/import/export); Photo Selection and AI Selection each
          show only their own members + related tools. Same photos,
          zero-copy — only membership flags change, via the bulk bar in
          the manager or per-photo Remove in each tab. */}
      {event && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="row source-filter-row" style={{ margin: 0 }}>
            {[
              { key: 'manager', label: 'Manager — files in & out' },
              ...(event.photo_selection_enabled ? [{ key: 'selection', label: 'Photo Selection' }] : []),
              ...(event.face_search_enabled ? [{ key: 'ai', label: 'AI Selection' }] : []),
              { key: 'albums', label: 'Albums' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={activeTab === opt.key ? 'upload-tab active' : 'upload-tab'}
                onClick={() => setActiveTab(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!event.face_search_enabled && !event.photo_selection_enabled && (
            <p className="hint" style={{ marginTop: 8 }}>
              Turn on Face Search and/or Photo Selection above — each unlocks its own workspace tab here.
            </p>
          )}
        </div>
      )}

      {analytics && (
        <div className="card analytics-card" style={{ display: activeTab === 'ai' ? undefined : 'none' }}>
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

      {/* Phase 21 — AI tab member grid: only face-searchable photos, with
          their index state. Add more from the Manager tab. Phase 22 —
          Members | Faces sub-tabs; click any photo for fullscreen +
          face closeups. */}
      {activeTab === 'ai' && event?.face_search_enabled && (
        <div className="card">
          <div className="guest-link-label">
            AI members ({aiMembers().length})
          </div>
          <p className="hint">
            Only these photos are selfie-searchable by guests. Photos without face data index in the background once added.
          </p>
          <div className="row source-filter-row" style={{ marginBottom: 8 }}>
            {[
              { key: 'members', label: `Members` },
              { key: 'faces', label: `Faces${faceGroups ? ` (${faceGroups.group_count})` : ''}` },
            ].map((opt) => (
              <button
                key={`ai-${opt.key}`}
                type="button"
                className={aiView === opt.key ? 'upload-tab active' : 'upload-tab'}
                onClick={() => setAiView(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {aiView === 'faces' ? (
            <FaceGroupsView
              eventId={eventId}
              groupsState={faceGroupsState}
              onOpenGroup={setOpenGroupId}
              openGroupId={openGroupId}
              onOpenPhoto={openFaceViewer}
            />
          ) : (
          <>
          <div className="row" style={{ marginBottom: 8 }}>
            <button
              className="btn secondary"
              type="button"
              disabled={bulking || aiMembers().length === 0}
              onClick={() => handleBulkRemoveVisible('ai')}
            >
              Remove all visible from AI Search
            </button>
          </div>
          {aiMembers().length === 0 ? (
            <p className="hint">Nothing in AI Search yet — select photos in the Manager tab and add them.</p>
          ) : (
            <div className="photo-grid">
              {aiMembers().map((p) => (
                <div className="photo-card" key={p.photo_id}>
                  <div style={{ cursor: 'zoom-in' }} onClick={() => openFaceViewer(p)} title="Open fullscreen + face closeups">
                    <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                  </div>
                  <div className="meta">
                    <span className="hint">
                      {p.face_indexed_at
                        ? `${p.face_count} face${p.face_count === 1 ? '' : 's'} indexed`
                        : 'Indexing…'}
                    </span>
                    <button
                      className="dismiss-btn"
                      type="button"
                      onClick={() => handlePhotoFeatureMembership(p.photo_id, { face_search_visible: false })}
                      disabled={!!savingPhotoFeatures[p.photo_id]}
                    >
                      Remove
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

      <PhotoFaceViewer
        photo={viewingPhoto}
        faces={viewingFaces}
        loading={facesLoading}
        onClose={() => { setViewingPhoto(null); setViewingFaces([]) }}
        onRemove={viewingPhoto ? () => {
          handlePhotoFeatureMembership(viewingPhoto.photo_id, { face_search_visible: false })
          setViewingPhoto(null)
          setViewingFaces([])
        } : undefined}
      />

      {event && (
        <div className="card guest-card-section" style={{ display: activeTab === 'manager' ? undefined : 'none' }}>
          <div className="guest-link-label">File tools</div>
          <div className="row">
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
        </div>
      )}

      {event?.started && showGuestUploadCard && (
        <div className="card" style={{ display: activeTab === 'manager' ? undefined : 'none' }}>
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
                      <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                      <div className="meta">
                        <span>{isVideoFile(p.filename) ? 'Video' : <>{p.face_count} face{p.face_count === 1 ? '' : 's'}</>}</span>
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
        <div className="card" style={{ display: activeTab === 'manager' ? undefined : 'none' }}>
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
        <div className="card" style={{ display: activeTab === 'manager' ? undefined : 'none' }}>
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

      {/* Phase 21 — Selection tab: everything client-facing for Photo
          Selection lives here and only here: publish state, download
          permission, member photos, clients, favourites, picks. */}
      {activeTab === 'selection' && event?.photo_selection_enabled && (event?.role === 'owner' || event?.role === 'collaborator') && (
        <div className="card">
          <div className="guest-link-label">Client gallery</div>
          <p className="hint">
            {event.published_at
              ? `Published ${new Date(event.published_at).toLocaleDateString()} — Photo Selection clients see the gallery as ready.`
              : 'Not published yet — publishing marks uploads as finished for Photo Selection clients.'}
            {' '}Guest downloads are {event.allow_download ? 'allowed' : 'turned off (view-only)'}.
          </p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {!event.published_at && (
              <button className="btn secondary" type="button" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish event'}
              </button>
            )}
            <label className="checkbox-row" title="When off, guests and clients can view and favourite but can't download originals">
              <input
                type="checkbox"
                checked={!!event.allow_download}
                disabled={togglingDownload}
                onChange={(e) => handleAllowDownload(e.target.checked)}
              />
              Allow downloads
            </label>
          </div>
        </div>
      )}

      {activeTab === 'selection' && event?.photo_selection_enabled && (event?.role === 'owner' || event?.role === 'collaborator') && (
        <div className="card">
          <div className="guest-link-label">
            Selection members ({selectionMembers().length})
          </div>
          <p className="hint">
            Only these photos appear in client galleries. Add more from the Manager tab — remove here, one by one or all visible at once.
          </p>
          <div className="row" style={{ marginBottom: 8 }}>
            <button
              className="btn secondary"
              type="button"
              disabled={bulking || selectionMembers().length === 0}
              onClick={() => handleBulkRemoveVisible('selection')}
            >
              Remove all visible from Photo Selection
            </button>
          </div>
          {selectionMembers().length === 0 ? (
            <p className="hint">Nothing in Photo Selection yet — select photos in the Manager tab and add them.</p>
          ) : (
            <div className="photo-grid">
              {selectionMembers().map((p) => (
                <div className="photo-card" key={p.photo_id}>
                  <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                  <div className="meta">
                    <span className="hint">{p.filename}</span>
                    <button
                      className="dismiss-btn"
                      type="button"
                      title={studioPicks.includes(p.photo_id) ? 'Remove studio pick' : 'Mark as studio pick'}
                      onClick={() => handleTogglePick(p.photo_id, studioPicks.includes(p.photo_id))}
                      disabled={togglingPickId === p.photo_id}
                      style={{ color: studioPicks.includes(p.photo_id) ? '#F59E0B' : undefined }}
                    >
                      <Star size={15} fill={studioPicks.includes(p.photo_id) ? '#F59E0B' : 'none'} />
                    </button>
                    <button
                      className="dismiss-btn"
                      type="button"
                      onClick={() => handlePhotoFeatureMembership(p.photo_id, { photo_selection_visible: false })}
                      disabled={!!savingPhotoFeatures[p.photo_id]}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MERGE (Studio-Verse Photo Selection): only shown once the studio
          has turned this feature on for the event (see the Features card
          above) — inviting clients to a feature that isn't active would
          just be confusing. Lives on the Selection tab with everything
          else client-facing. */}
      {activeTab === 'selection' && event?.photo_selection_enabled && (event?.role === 'owner' || event?.role === 'collaborator') && (
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
            {clients.map((c) => {
              const expanded = expandedClient === c.user_id
              const expired = c.access_expires && new Date(c.access_expires) < new Date()
              return (
                <li key={c.user_id} className="team-list-item" style={{ display: 'block' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}
                    onClick={() => openGrantPanel(c)}
                  >
                    <span style={{ flex: 1 }}>
                      {c.name} <span className="hint">({c.email})</span>
                      {c.favourite_cap != null && <span className="hint"> · cap {c.favourite_cap}</span>}
                      <span className="hint"> · {c.favourite_count || 0} favourite{(c.favourite_count || 0) === 1 ? '' : 's'}</span>
                      {c.submitted_at && <span className="hint"> · submitted</span>}
                      {c.revoked_at && <span className="hint"> · revoked</span>}
                      {expired && !c.revoked_at && <span className="hint"> · expired</span>}
                    </span>
                    <button className="btn secondary" type="button" onClick={(e) => { e.stopPropagation(); handleRemoveClient(c.user_id) }}>
                      Remove
                    </button>
                  </div>
                  {expanded && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ alignItems: 'flex-end' }}>
                        <div>
                          <label className="field-label" htmlFor={`cap-${c.user_id}`}>Favourite cap</label>
                          <input
                            id={`cap-${c.user_id}`}
                            className="text-input"
                            type="number"
                            min="1"
                            placeholder="Unlimited"
                            style={{ maxWidth: 130 }}
                            value={grantCap}
                            onChange={(e) => setGrantCap(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`exp-${c.user_id}`}>Access expires</label>
                          <input
                            id={`exp-${c.user_id}`}
                            className="text-input"
                            type="date"
                            value={grantExpiry}
                            onChange={(e) => setGrantExpiry(e.target.value)}
                          />
                        </div>
                        <button className="btn secondary" type="button" onClick={() => handleSaveGrant(c.user_id)} disabled={savingGrant}>
                          {savingGrant ? 'Saving…' : 'Save access'}
                        </button>
                      </div>
                      <div className="row" style={{ flexWrap: 'wrap' }}>
                        {c.submitted_at ? (
                          <button className="btn secondary" type="button" onClick={() => handleUnsubmit(c.user_id, c.name)}>
                            Unlock selection
                          </button>
                        ) : (
                          <button className="btn secondary" type="button" onClick={() => handleSubmitBehalf(c.user_id, c.name)}>
                            Submit on their behalf
                          </button>
                        )}
                        {c.revoked_at ? (
                          <button className="btn secondary" type="button" onClick={() => handleRestoreAccess(c.user_id)}>
                            Restore access
                          </button>
                        ) : (
                          <button className="btn secondary" type="button" onClick={() => handleRevoke(c.user_id, c.name)}>
                            Revoke access
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
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

      {/* MERGE (Studio-Verse Favourites tab, Phase 18E): the studio's read
          side of Photo Selection — per-client groups or a deduplicated
          merged view with who-favourited-this attribution, plus the
          studio's own separate picks (star). Lives on the Selection tab. */}
      {activeTab === 'selection' && event?.photo_selection_enabled && (event?.role === 'owner' || event?.role === 'collaborator') && (
        <div className="card team-card">
          <div className="guest-link-label">Favourites</div>
          <p className="hint">What each client picked — and your own separate studio picks (star) over the same photos.</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn secondary"
              type="button"
              onClick={handlePicksZip}
              disabled={zippingPicks || studioPicks.length === 0}
              title={studioPicks.length === 0 ? 'Star some photos as studio picks first' : 'Download your studio picks as a zip'}
            >
              <Download size={14} /> {zippingPicks ? 'Preparing picks zip…' : `Download picks (${studioPicks.length})`}
            </button>
          </div>
          {/* Phase 1 — Selection export: per-client or merged record for
              album design / editing / printing / client confirmation. */}
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
            <div>
              <label className="field-label" htmlFor="export-client">Client</label>
              <select
                id="export-client"
                className="text-input"
                value={exportClient}
                onChange={(e) => setExportClient(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="merged">All clients (merged)</option>
                {clients
                  .filter((c) => (c.favourite_count || 0) > 0)
                  .map((c) => (
                    <option key={c.user_id} value={c.user_id}>
                      {c.name || c.email} ({c.favourite_count})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="export-format">Format</label>
              <select
                id="export-format"
                className="text-input"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="csv">CSV filenames</option>
                <option value="txt">TXT filenames</option>
                <option value="pdf">PDF proofing report</option>
                <option value="zip">ZIP selected photos</option>
              </select>
            </div>
            <button
              className="btn secondary"
              type="button"
              onClick={handleSelectionExport}
              disabled={exporting || (exportClient !== 'merged' && !clients.some((c) => c.user_id === exportClient && (c.favourite_count || 0) > 0))}
              title="Download the selection record — filenames, proofing report, or photos"
            >
              <Download size={14} /> {exporting ? 'Preparing…' : 'Export selection'}
            </button>
          </div>
          {zippingPicks && picksZipProgress && (
            <p className="hint">
              {formatBytes(picksZipProgress.loaded)}
              {picksZipProgress.total ? ` of ${formatBytes(picksZipProgress.total)}` : ' downloaded'}
              {' · '}{formatBytes(Math.round(picksZipProgress.speed))}/s
            </p>
          )}
          <div className="row source-filter-row">
            {[
              { key: 'grouped', label: 'By client' },
              { key: 'merged', label: 'Merged' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={favView === opt.key ? 'upload-tab active' : 'upload-tab'}
                onClick={() => setFavView(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!eventFavourites ? (
            <p className="hint">Loading favourites…</p>
          ) : favView === 'grouped' ? (
            eventFavourites.groups.length === 0 ? (
              <p className="hint">No clients yet — favourites appear here once clients pick.</p>
            ) : (
              eventFavourites.groups.map((g) => (
                <div key={g.user_id} style={{ marginTop: 12 }}>
                  <p className="subtle">
                    <strong>{g.name || g.email}</strong>{' '}
                    <span className="hint">
                      {g.photos.length} favourite{g.photos.length === 1 ? '' : 's'}
                      {g.favourite_cap != null && ` · cap ${g.favourite_cap}`}
                      {g.submitted_at && ' · submitted'}
                      {g.revoked_at && ' · revoked'}
                    </span>
                  </p>
                  {g.photos.length === 0 ? (
                    <p className="hint">No picks yet.</p>
                  ) : (
                    <div className="photo-grid">
                      {g.photos.map((p) => (
                        <div className="photo-card" key={p.photo_id}>
                          <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                          <div className="meta">
                            <span className="hint">{p.filename}</span>
                            <button
                              className="dismiss-btn"
                              type="button"
                              title={studioPicks.includes(p.photo_id) ? 'Remove studio pick' : 'Mark as studio pick'}
                              onClick={() => handleTogglePick(p.photo_id, studioPicks.includes(p.photo_id))}
                              disabled={togglingPickId === p.photo_id}
                              style={{ color: studioPicks.includes(p.photo_id) ? '#F59E0B' : undefined }}
                            >
                              <Star size={15} fill={studioPicks.includes(p.photo_id) ? '#F59E0B' : 'none'} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          ) : eventFavourites.merged.length === 0 ? (
            <p className="hint">No favourites yet — the merged view fills in once clients pick.</p>
          ) : (
            <div className="photo-grid">
              {eventFavourites.merged.map((p) => (
                <div className="photo-card" key={p.photo_id}>
                  <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                  <div className="meta">
                    <span className="hint">
                      {p.favourited_by.map((u) => u.name || u.email).join(', ')}
                    </span>
                    <button
                      className="dismiss-btn"
                      type="button"
                      title={studioPicks.includes(p.photo_id) ? 'Remove studio pick' : 'Mark as studio pick'}
                      onClick={() => handleTogglePick(p.photo_id, studioPicks.includes(p.photo_id))}
                      disabled={togglingPickId === p.photo_id}
                      style={{ color: studioPicks.includes(p.photo_id) ? '#F59E0B' : undefined }}
                    >
                      <Star size={15} fill={studioPicks.includes(p.photo_id) ? '#F59E0B' : 'none'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 23 — Albums tab: album proofing projects. Always available
          (independent of the feature toggles) for owners + collaborators. */}
      {activeTab === 'albums' && (event?.role === 'owner' || event?.role === 'collaborator') && (
        <div className="card">
          <div className="guest-link-label">Albums ({albums ? albums.length : '…'})</div>
          <p className="hint">
            Stage client favourites as zero-cost sources, upload designed spreads or a print PDF,
            then send the album for pinned client review and approval.
          </p>
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newAlbumName.trim()) return
              setCreatingAlbum(true)
              try {
                const created = await createAlbum(eventId, { name: newAlbumName.trim(), fromFavourites: true })
                setNewAlbumName('')
                showToast(`Album created${created.source_count ? ` — ${created.source_count} favourite${created.source_count === 1 ? '' : 's'} staged` : ''}`)
                loadAlbums()
              } catch (err) {
                showToast(err.message, { type: 'error' })
              } finally {
                setCreatingAlbum(false)
              }
            }}
          >
            <input
              className="text-input"
              placeholder="New album name (e.g. Wedding Album)"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              maxLength={120}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button className="btn" type="submit" disabled={creatingAlbum || !newAlbumName.trim()}>
              {creatingAlbum ? 'Creating…' : 'Create + stage favourites'}
            </button>
          </form>
          {albumsError && <p className="error">{albumsError}</p>}
          {!albums ? (
            <p className="hint">Loading albums…</p>
          ) : albums.length === 0 ? (
            <p className="hint">No albums yet — create one above.</p>
          ) : (
            <ul className="team-list">
              {albums.map((a) => (
                <li key={a.id} className="team-list-item">
                  <span style={{ flex: 1 }}>
                    <Link to={`/events/${eventId}/albums/${a.id}`} style={{ fontWeight: 700 }}>{a.name}</Link>
                    <span className="hint">
                      {' '}· {a.status.replace(/_/g, ' ').toLowerCase()}
                      {' '}· {a.version_count} version{a.version_count === 1 ? '' : 's'}
                      {a.latest_version != null && ` (latest v${a.latest_version})`}
                      {' '}· {a.source_count} source{a.source_count === 1 ? '' : 's'}
                      {a.open_pins > 0 && ` · ${a.open_pins} open pin${a.open_pins === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  <Link className="btn secondary" to={`/events/${eventId}/albums/${a.id}`}>Open</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'manager' && (<>
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
            accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mkv,.mov,.m4v,.avi"
            disabled={uploading}
            hint="Photos (JPG/PNG/WebP, face-indexed) or video (MP4/MOV/WebM/MKV/AVI, gallery only) — files over 20MB upload in resumable chunks"
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
              <li>Imported photos and videos aren&apos;t stored on PandaSpot&apos;s server — only thumbnails (photos) and face-search data are kept.</li>
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

      {event?.started && (
        <div className="card">
          <div className="guest-link-label">Export</div>
          <p className="hint">Download every approved photo as one zip — your own copy, regardless of guest download settings.</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn secondary" type="button" onClick={handleStudioZip} disabled={zipping}>
              <Download size={14} /> {zipping ? 'Preparing zip…' : 'Download all photos (zip)'}
            </button>
          </div>
          {zipping && zipProgress && (
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar">
                {zipProgress.total
                  ? <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((zipProgress.loaded / zipProgress.total) * 100))}%` }} />
                  : <div className="progress-bar-fill" style={{ width: '100%', opacity: 0.5 }} />}
              </div>
              <p className="hint">
                {formatBytes(zipProgress.loaded)}
                {zipProgress.total ? ` of ${formatBytes(zipProgress.total)}` : ' downloaded'}
                {' · '}{formatBytes(Math.round(zipProgress.speed))}/s
              </p>
            </div>
          )}
        </div>
      )}
      </>)}

      {error && <p className="error">{error}</p>}

      {liveNotice && <p className="live-notice">{liveNotice}</p>}

      {activeTab === 'manager' && (<>
      {photos.filter((p) => p.approval_status !== 'pending').length === 0 ? (
        <p className="hint">
          {photoStatusFilter === 'archived'
            ? 'No archived photos — archiving hides a photo from guests and clients without deleting it.'
            : 'No photos uploaded yet.'}
        </p>
      ) : (
        <>
        <div className="row source-filter-row">
          {[
            { key: 'active', label: 'Active' },
            { key: 'archived', label: 'Archived' },
            { key: 'all', label: 'All' },
          ].map((opt) => (
            <button
              key={`status-${opt.key}`}
              type="button"
              className={photoStatusFilter === opt.key ? 'upload-tab active' : 'upload-tab'}
              onClick={() => setPhotoStatusFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(event?.photo_selection_enabled || event?.face_search_enabled) && visibleManageablePhotos.length > 0 && (
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="checkbox-row" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={visibleManageablePhotos.length > 0 && visibleManageablePhotos.every((p) => managerSelected[p.photo_id])}
                  onChange={toggleManagerSelectAllVisible}
                />
                Select all visible ({visibleManageablePhotos.length})
              </label>
              <span className="hint">{selectedCount} selected</span>
              {event?.photo_selection_enabled && (
                <>
                  <button className="btn secondary" type="button" disabled={bulking || selectedCount === 0} onClick={() => handleBulkMembership({ photo_selection_visible: true }, 'Add to Photo Selection')}>
                    {bulking === 'Add to Photo Selection' ? 'Adding…' : `Add ${selectedCount} to Photo Selection`}
                  </button>
                  <button className="btn secondary" type="button" disabled={bulking || visibleManageablePhotos.length === 0} onClick={() => handleBulkAddAllVisible({ photo_selection_visible: true }, 'Add all visible to Photo Selection')}>
                    Add all visible
                  </button>
                </>
              )}
              {event?.face_search_enabled && (
                <>
                  <button className="btn secondary" type="button" disabled={bulking || selectedCount === 0} onClick={() => handleBulkMembership({ face_search_visible: true }, 'Add to AI Search')}>
                    {bulking === 'Add to AI Search' ? 'Adding…' : `Add ${selectedCount} to AI Search`}
                  </button>
                  <button className="btn secondary" type="button" disabled={bulking || visibleManageablePhotos.length === 0} onClick={() => handleBulkAddAllVisible({ face_search_visible: true }, 'Add all visible to AI Search')}>
                    Add all visible
                  </button>
                </>
              )}
              {selectedCount > 0 && (
                <button className="dismiss-btn" type="button" onClick={() => setManagerSelected({})}>
                  Clear
                </button>
              )}
            </div>
            <p className="hint" style={{ marginTop: 6 }}>
              Zero-copy — files stay where they are, only membership flags change. Adding to AI Search face-indexes new photos in the background.
            </p>
          </div>
        )}
        <div className="row source-filter-row">
          {[
            { key: 'all', label: 'All' },
            { key: 'upload', label: 'Uploaded' },
            { key: 'shoots', label: 'PandaShoots' },
            { key: 'drive_import', label: 'Drive import' },
            { key: 'guest', label: 'Guest uploads' },
          ].map((opt) => {
            const count = opt.key === 'all'
              ? photos.filter((p) => p.approval_status !== 'pending').length
              : photos.filter((p) => p.approval_status !== 'pending' && (p.source || 'upload') === opt.key).length
            return (
              <button
                key={opt.key}
                type="button"
                className={sourceFilter === opt.key ? 'upload-tab active' : 'upload-tab'}
                onClick={() => setSourceFilter(opt.key)}
              >
                {opt.label} ({count})
              </button>
            )
          })}
        </div>
        {photos
          .filter((p) => p.approval_status !== 'pending')
          .filter((p) => sourceFilter === 'all' || (p.source || 'upload') === sourceFilter)
          .length === 0 ? (
            <p className="hint" style={{ padding: '24px 12px', textAlign: 'center', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              No photos found under the "{
                {
                  all: 'All',
                  upload: 'Uploaded',
                  shoots: 'PandaShoots',
                  drive_import: 'Drive import',
                  guest: 'Guest uploads',
                }[sourceFilter] || sourceFilter
              }" filter.
            </p>
          ) : (
            <div className="photo-grid">
              {photos
                .filter((p) => p.approval_status !== 'pending')
                .filter((p) => sourceFilter === 'all' || (p.source || 'upload') === sourceFilter)
                .map((p) => (
            <div className="photo-card" key={p.photo_id}>
              <div style={{ position: 'relative' }}>
                <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                {(event?.photo_selection_enabled || event?.face_search_enabled) && (
                  <input
                    type="checkbox"
                    title="Select for bulk add to Photo Selection / AI Search"
                    checked={!!managerSelected[p.photo_id]}
                    onChange={() => toggleManagerSelect(p.photo_id)}
                    style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, cursor: 'pointer', accentColor: '#F59E0B' }}
                  />
                )}
              </div>
              <div className="meta">
                <span>
                  {isVideoFile(p.filename) ? (
                    <>Video{p.archived_at && <span className="hint"> · archived</span>}</>
                  ) : (
                    <>{p.face_count} face{p.face_count === 1 ? '' : 's'}{p.archived_at && <span className="hint"> · archived</span>}</>
                  )}
                </span>
                {p.archived_at ? (
                  <button
                    className="dismiss-btn"
                    type="button"
                    onClick={() => handleRestorePhoto(p.photo_id, p.filename)}
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    className="dismiss-btn"
                    type="button"
                    title="Hide from guests and clients without deleting"
                    onClick={() => handleArchivePhoto(p.photo_id, p.filename)}
                  >
                    Archive
                  </button>
                )}
                <button
                  className="dismiss-btn"
                  type="button"
                  onClick={() => handleDeletePhoto(p.photo_id, p.filename)}
                  disabled={deletingPhotoId === p.photo_id}
                >
                  {deletingPhotoId === p.photo_id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}
      </>)}

      {event && (
        <Modal open={showEditDetails} onClose={() => setShowEditDetails(false)} title="Edit event details">
          <form onSubmit={handleSaveDetails}>
            <label className="field-label" htmlFor="ev-name">Event name</label>
            <input
              id="ev-name"
              className="text-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <label className="field-label" htmlFor="ev-date">Event date</label>
            <input
              id="ev-date"
              className="text-input"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
            <label className="field-label" htmlFor="ev-venue">Venue</label>
            <input
              id="ev-venue"
              className="text-input"
              placeholder="e.g. Grand Palace Hall"
              value={editVenue}
              onChange={(e) => setEditVenue(e.target.value)}
            />
            <label className="field-label" htmlFor="ev-desc">Description</label>
            <input
              id="ev-desc"
              className="text-input"
              placeholder="Short note for your own reference"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={() => setShowEditDetails(false)}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={savingDetails || !editName.trim()}>
                {savingDetails ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {event && (
        <Modal open={showCoverModal} onClose={() => { setShowCoverModal(false); setCoverSrc('') }} title="Cover photo (16:9)">
          {coverSrc ? (
            <>
              <div style={{ position: 'relative', width: '100%', height: 320, background: '#111' }}>
                <Cropper
                  image={coverSrc}
                  crop={coverCrop}
                  zoom={coverZoom}
                  aspect={16 / 9}
                  onCropChange={setCoverCrop}
                  onZoomChange={setCoverZoom}
                  onCropComplete={(_, pixels) => setCoverPixels(pixels)}
                />
              </div>
              <label className="field-label" htmlFor="cover-zoom">Zoom</label>
              <input
                id="cover-zoom"
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={coverZoom}
                onChange={(e) => setCoverZoom(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn secondary" type="button" onClick={() => { setShowCoverModal(false); setCoverSrc('') }}>
                  Cancel
                </button>
                <button className="btn" type="button" onClick={handleSaveCover} disabled={uploadingCover || !coverPixels}>
                  {uploadingCover ? 'Uploading…' : 'Set cover'}
                </button>
              </div>
            </>
          ) : (
            <p className="hint">Pick an image file to crop it to 16:9 for this event&apos;s cover.</p>
          )}
        </Modal>
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
