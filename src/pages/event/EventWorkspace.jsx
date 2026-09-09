import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import EventContext from './EventContext.jsx'
import EventShell from './EventShell.jsx'
import {
  addStudioPick,
  approvePhoto,
  archiveEvent,
  archivePhoto,
  backupExistingPhotosToDrive,
  bulkSetMembership,
  clearExportFolder,
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
  createClientAccount,
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
  saveExportFolder,
  setAlbumClient,
  setDriveAutoSync,
  setEventAllowDownload,
  setEventDriveBackup,
  setGuestUploadWindow,
  setPhotoHighlight,
  startEvent,
  startPhotoUpload,
  startPhotoUploadWithProgress,
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
} from '../../api.js'
import { getToken } from '../../authToken.js'
import { useAuth } from '../../auth.jsx'
import { useConfirm } from '../../confirm.jsx'
import { useToast } from '../../toast.jsx'
import { uploadLargeFile } from '../../lib/largeUpload.js'
import { BLURRY_BELOW } from '../../components/PhotoToolsCard.jsx'
import PhotoMetaModal from '../../components/PhotoMetaModal.jsx'
import PhotoFaceViewer from '../../components/PhotoFaceViewer.jsx'
import StartEventConfirm from './StartEventConfirm.jsx'
import FileProgressList from '../../components/FileProgressList.jsx'
import { saveActiveJob, getActiveJob, clearActiveJob } from '../../jobPersistence.js'
import { pop } from '../../lib/confetti.js'
import { runInline, runInWorker } from '../../lib/workerTask.js'

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

// Human sentence for a Drive folder permission probe — shared by the
// connection-test toast and the inline result in Photos.jsx.
export function drivePermissionLabel(permission) {
  return permission === 'writer'
    ? 'Editor access given to anyone with the link'
    : permission === 'commenter'
      ? 'Commenter access given to anyone with the link'
      : permission === 'reader'
        ? 'Viewer access given to anyone with the link'
        : "Accessible, but the exact permission level couldn't be read"
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

// Manager gallery filter — pure + self-contained so it can run in a Web
// Worker (see workerTask.js). Mirrors the gallery's approval/source/tool
// rules exactly. NOTE: keep closure-free — the worker serializes this
// function's source.
function filterManagerPhotos({ photos, sourceFilter, toolsFilter, dupIdList, blurryBelow }) {
  const dup = dupIdList ? new Set(dupIdList) : null
  const f = toolsFilter || {}
  return (Array.isArray(photos) ? photos : []).filter((p) => {
    if (!p || p.approval_status === 'pending') return false
    if (sourceFilter !== 'all' && (p.source || 'upload') !== sourceFilter) return false
    if (f.faces === '0' && (p.face_count || 0) !== 0) return false
    if (f.faces === '1' && (p.face_count || 0) !== 1) return false
    if (f.faces === '2+' && (p.face_count || 0) < 2) return false
    if (f.blur === 'sharp' && !(p.sharpness != null && p.sharpness >= blurryBelow)) return false
    if (f.blur === 'blurry' && !(p.sharpness != null && p.sharpness < blurryBelow)) return false
    if (f.blur === 'unmeasured' && p.sharpness != null) return false
    if (f.dupOnly && !(dup && dup.has(p.photo_id))) return false
    if ((p.rating || 0) < (f.minRating || 0)) return false
    if (f.tag && f.tag !== 'all' && (p.color_tag || '') !== f.tag) return false
    return true
  })
}

export default function EventWorkspace() {
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
  const [acceptedInvites, setAcceptedInvites] = useState([])
  const [declinedInvites, setDeclinedInvites] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [teamError, setTeamError] = useState('')
  const [clients, setClients] = useState([])
  const [pendingClientInvites, setPendingClientInvites] = useState([])
  const [clientInviteEmail, setClientInviteEmail] = useState('')
  const [clientInviteCap, setClientInviteCap] = useState('')
  const [clientInviteExpiry, setClientInviteExpiry] = useState('')
  const [invitingClient, setInvitingClient] = useState(false)
  const [clientInviteMessage, setClientInviteMessage] = useState('')
  const [clientError, setClientError] = useState('')
  // Studio-provisioned login: the studio picks email + password directly
  // (no invite email round-trip) and relays the credentials itself.
  const [createEmail, setCreateEmail] = useState('')
  const [createName, setCreateName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createCap, setCreateCap] = useState('')
  const [createExpiry, setCreateExpiry] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [createClientMessage, setCreateClientMessage] = useState('')
  const [createdClientPassword, setCreatedClientPassword] = useState('')
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
  // Per-file upload state: one entry per file the photographer has
  // selected for upload, keyed by a stable id so progress updates can
  // find the right row even if React reorders. Lives alongside the
  // existing single-bar `progress` state which is still used for the
  // overall percent (e.g. "5 of 12 done") and the bottom-line status.
  const [uploadFiles, setUploadFiles] = useState([])
  // Counter so SSE-driven file updates (which only carry a filename) can
  // be matched to the right entry even when two files share a name.
  const fileIdRef = useRef(0)
  // Upload queue: picking more files while a batch is in flight appends
  // rows and enqueues the File objects instead of clobbering the running
  // batch's state (previously a second selection replaced uploadFiles,
  // overwrote cleanupRef's SSE subscription, and hid the first batch).
  const uploadQueueRef = useRef([])
  const uploadBusyRef = useRef(false)
  // Mirror of the `uploading` flag for async pump code (state reads go
  // stale inside long-lived awaits; the ref is always current).
  const uploadingRef = useRef(false)
  useEffect(() => { uploadingRef.current = uploading }, [uploading])
  // One multipart POST carries at most this many small files. The server
  // itself accepts unlimited files, but a single giant POST risks timeouts
  // and an all-or-nothing failure — sequential 100-file batches are safer
  // and each gets its own job/progress.
  const MAX_FILES_PER_BATCH = 100
  // Per-file row updaters for the FileProgressList. Defined inside the
  // component (they close over setUploadFiles). SSE callbacks only carry
  // a filename, so markFileByName targets the earliest non-terminal row
  // with that name — with sequential batches that is always the right
  // one, even when two selections share a filename.
  const markFileById = (id, patch) => {
    setUploadFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }
  const markFileByName = (name, patch) => {
    setUploadFiles((prev) => {
      const idx = prev.findIndex(
        (f) => f.name === name && f.status !== 'done' && f.status !== 'error' && f.status !== 'skipped'
      )
      if (idx === -1) return prev
      const next = prev.slice()
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }
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
  // Shared start-event confirmation: every Start button across the event
  // pages opens the same modal (StartEventConfirm) instead of starting
  // immediately — starting is irreversible and starts the retention clock.
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const requestStartEvent = useCallback(() => setShowStartConfirm(true), [])
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
  // Phase 2 — Face Search privacy settings draft (saved by Overview).
  const [privacyDraft, setPrivacyDraft] = useState(null)
  // Phase 3 — Gallery access settings draft (saved by Overview).
  const [accessDraft, setAccessDraft] = useState(null)

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
  // Phase 9 (photo tools): inspector photo, tool filters, duplicate set.
  const [metaPhotoId, setMetaPhotoId] = useState(null)
  const [dupIds, setDupIds] = useState(null)
  const [toolsFilter, setToolsFilter] = useState({ blur: 'all', faces: 'all', dupOnly: false, minRating: 0, tag: 'all' })
  // Manager gallery visible list, crunched in a Web Worker so big photo
  // lists never freeze the UI. Same pure function runs inline as fallback.
  const [managerVisible, setManagerVisible] = useState(null)
  useEffect(() => {
    const input = {
      photos,
      sourceFilter,
      toolsFilter,
      dupIdList: dupIds ? [...dupIds] : null,
      blurryBelow: BLURRY_BELOW,
    }
    let stale = false
    runInWorker(filterManagerPhotos, input)
      .then((rows) => { if (!stale) setManagerVisible(rows) })
      .catch(() => { if (!stale) setManagerVisible(runInline(filterManagerPhotos, input)) })
    return () => { stale = true }
  }, [photos, sourceFilter, toolsFilter, dupIds])
  // Phase 22 — face viewer modal state for the AI member grid.
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [viewingList, setViewingList] = useState([])
  const [viewingIndex, setViewingIndex] = useState(0)
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

  // Assigns (or clears) an album's review client — assigned albums are
  // visible only to that client, unassigned to every event client.
  const [assigningAlbumId, setAssigningAlbumId] = useState(null)
  const handleAssignAlbumClient = async (albumId, clientId) => {
    setAssigningAlbumId(albumId)
    try {
      await setAlbumClient(eventId, clientId)
      showToast(clientId ? 'Album client updated.' : 'Album opened to all event clients.')
      loadAlbums()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setAssigningAlbumId(null)
    }
  }
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
        setAcceptedInvites(data.accepted_invites || [])
        setDeclinedInvites(data.declined_invites || [])
      })
      .catch(() => {
        setCollaborators([])
        setPendingInvites([])
        setAcceptedInvites([])
        setDeclinedInvites([])
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
        if (ev.photo_selection_enabled || ev.albums_enabled) {
          loadClients()
        }
        if (ev.photo_selection_enabled) {
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
        if (data.current_file) markFileByName(data.current_file, { status: 'processing' })
        if (data.photo) {
          markFileByName(data.photo.filename, {
            status: 'done',
            facesFound: data.photo.face_count ?? 0,
          })
        }
      },
      onDone: (data) => {
        setUploading(false)
        setProgress(null)
        // Anything still in flight when the server says it's done is
        // either done or skipped — the server's `skipped` list is the
        // source of truth for which one, applied below.
        setUploadFiles((prev) => {
          const skippedSet = new Set(data.skipped || [])
          return prev.map((f) => {
            if (skippedSet.has(f.name)) return { ...f, status: 'skipped', reason: f.reason || 'Server skipped' }
            if (f.status === 'processing' || f.status === 'uploading') return { ...f, status: 'done' }
            return f
          })
        })
        let summary = `Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`
        if (data.removed_count > 0) summary += ` ${data.removed_count} photo(s) removed (no longer in Drive).`
        appendLog(summary)
        setSkippedFiles(data.skipped || [])
        clearActiveJob(eventId)
        showToast(`${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
        pop()
        load()
      },
      onError: (data) => {
        setUploading(false)
        setProgress(null)
        const message = data.message || failedLabel
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.status === 'processing' || f.status === 'uploading'
              ? { ...f, status: 'error', reason: message }
              : f
          )
        )
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
      const expiresAt = clientInviteExpiry.trim() || undefined
      const res = await inviteClient(eventId, clientInviteEmail.trim(), cap, expiresAt)
      setClientInviteMessage(
        res.status === 'added'
          ? 'Added — they can view this event immediately.'
          : "Invite sent — they'll get access once they set a password."
      )
      setClientInviteEmail('')
      setClientInviteCap('')
      setClientInviteExpiry('')
      loadClients()
    } catch (e) {
      setClientError(e.message)
    } finally {
      setInvitingClient(false)
    }
  }

  const handleCreateClientAccount = async (e) => {
    e.preventDefault()
    if (!createEmail.trim()) return
    setCreatingClient(true)
    setClientError('')
    setCreateClientMessage('')
    setCreatedClientPassword('')
    try {
      const res = await createClientAccount(eventId, {
        email: createEmail.trim(),
        name: createName.trim() || undefined,
        password: createPassword || undefined,
        favouriteCap: createCap.trim() ? parseInt(createCap, 10) : undefined,
        expiresAt: createExpiry.trim() || undefined,
      })
      if (res.status === 'created' && res.generated_password) {
        setCreatedClientPassword(res.generated_password)
        setCreateClientMessage(`Login created for ${res.email} — copy the one-time password now, it won't be shown again.`)
      } else {
        setCreateClientMessage(
          res.status === 'added'
            ? `Added ${res.email} to this event with the given cap and expiry.`
            : `Login created for ${res.email} — share the password you set.`
        )
      }
      setCreateEmail('')
      setCreateName('')
      setCreatePassword('')
      setCreateCap('')
      setCreateExpiry('')
      loadClients()
    } catch (e) {
      setClientError(e.message)
    } finally {
      setCreatingClient(false)
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
      const result = await uploadEventCover(eventId, blob)
      setShowCoverModal(false)
      setCoverSrc('')
      // Patch the local event with the new cover URL immediately so the
      // <img> tag re-fetches the bytes right away (otherwise a 60s
      // browser cache window keeps the old cover visible even after
      // the server has the new file). Falls back to reloading if the
      // server response didn't include the URL.
      if (result && result.cover_url) {
        const separator = result.cover_url.includes('?') ? '&' : '?'
        const versioned = `${result.cover_url}${separator}v=${Date.now()}`
        setEvent((prev) => (prev ? { ...prev, cover_url: versioned } : prev))
      } else {
        load()
      }
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
      setEvent((prev) => (prev ? { ...prev, cover_url: null } : prev))
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
    `${(event?.name || 'event').replace(/[^\w-]+/g, '-').slice(0, 60)}${suffix}.zip`

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

  const openFaceViewer = async (photo, list) => {
    const items = Array.isArray(list) && list.length > 0 ? list : [photo]
    const at = Math.max(0, items.findIndex((p) => p.photo_id === photo.photo_id))
    const current = items[at] || photo
    setViewingList(items)
    setViewingIndex(at)
    setViewingPhoto(current)
    setViewingFaces([])
    setFacesLoading(true)
    try {
      const data = await getPhotoFaces(eventId, current.photo_id)
      setViewingFaces(data.faces || [])
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setFacesLoading(false)
    }
  }

  const stepFaceViewer = (dir) => {
    const items = Array.isArray(viewingList) && viewingList.length > 0 ? viewingList : []
    if (items.length === 0) return
    const next = Math.min(Math.max(viewingIndex + dir, 0), items.length - 1)
    if (next !== viewingIndex) openFaceViewer(items[next], items)
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
      // Membership changed — drop cached face groups so the Faces sub-tab
      // refetches fresh instead of showing removed photos' clusters.
      setFaceGroupsState((prev) => (prev.data ? { loading: false, error: '', data: null } : prev))
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
      // Membership flags apply synchronously server-side — reload right
      // away so the AI/Selection pages show the photos instantly instead
      // of waiting for the background index job (or a manual refresh).
      load()
      if (res.job_id) {
        appendLog(`Indexing ${ids.length} photo(s) for Face Search in the background…`)
        watchJob(res.job_id, { failedLabel: 'Face indexing failed' })
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
      // Same instant-reload as handleBulkMembership above — flags are
      // already applied, the job only fills in face data.
      load()
      if (res.job_id) {
        appendLog(`Indexing photos for Face Search in the background…`)
        watchJob(res.job_id, { failedLabel: 'Face indexing failed' })
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

  const [togglingHighlightId, setTogglingHighlightId] = useState(null)

  const handleToggleHighlight = async (photoId, highlighted) => {
    setTogglingHighlightId(photoId)
    try {
      await setPhotoHighlight(eventId, photoId, !highlighted)
      setPhotos((prev) => prev.map((p) => (p.photo_id === photoId ? { ...p, highlighted: !highlighted } : p)))
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setTogglingHighlightId(null)
    }
  }

  const handleRejectPhoto = async (photoId, filename) => {    const confirmed = await confirm(`Reject and delete "${filename}"? This can't be undone.`, { title: 'Reject photo?', confirmLabel: 'Reject' })
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

  // Entry point from the Dropzone: append rows + enqueue, then pump.
  // Safe to call while another batch is running — the pump serializes.
  const handleFiles = (files) => {
    if (!files || files.length === 0) return
    // Build the per-file rows up front. Each row has a stable id so the
    // FileProgressList can key on it across re-renders. Appended (never
    // replaced) so a second selection while uploading keeps the first
    // batch's rows visible.
    const entries = files.map((f) => {
      fileIdRef.current += 1
      return {
        id: `f${fileIdRef.current}`,
        name: f.name,
        size: f.size,
        status: 'queued',
        percent: 0,
        facesFound: null,
        reason: null,
      }
    })
    setUploadFiles((prev) => [...prev, ...entries])
    // Fresh run (nothing in flight): reset the log + skips so the new
    // selection starts clean. While busy, just append — the running
    // batch's state must not be wiped.
    const wasIdle = uploadQueueRef.current.length === 0 && !uploadBusyRef.current
    if (wasIdle) {
      setLogLines([])
      setSkippedFiles([])
    }
    uploadQueueRef.current.push({ files: [...files], entryIds: entries.map((e) => e.id) })
    appendLog(`Queued ${files.length} file(s)`)
    pumpUploadQueue().catch((e) => showToast(e.message, { type: 'error' }))
  }

  // Serializes queued selections: one batch at a time, large files first
  // (chunked, one by one), then small files in <=100-file multipart POSTs.
  const pumpUploadQueue = async () => {
    if (uploadBusyRef.current) return
    uploadBusyRef.current = true
    setUploading(true)
    setError('')
    try {
      while (uploadQueueRef.current.length > 0) {
        const { files, entryIds } = uploadQueueRef.current.shift()
        // eslint-disable-next-line no-await-in-loop
        await runUploadBatch(files, entryIds)
      }
    } finally {
      uploadBusyRef.current = false
      setUploading(false)
      setProgress(null)
      load()
    }
  }

  // Runs one queued selection to completion (all of its batches).
  const runUploadBatch = async (files, entryIds) => {
    // Files too big for one multipart POST go through the resumable
    // chunked uploader first (8MB chunks, retried, resumable); each one
    // still lands in the regular async processing job afterwards, so
    // progress/result UI below is identical either way.
    const LARGE_FILE_BYTES = 20 * 1024 * 1024
    // Pair files with their row ids by index (never by name — two files
    // in one selection can share a name).
    const pairs = files.map((file, i) => ({ file, id: entryIds[i] })).filter((p) => p.id)
    const small = pairs.filter((p) => p.file.size <= LARGE_FILE_BYTES)
    const large = pairs.filter((p) => p.file.size > LARGE_FILE_BYTES)
    appendLog(`Starting upload — ${files.length} file(s)`)
    for (const { file, id } of small) markFileById(id, { status: 'uploading', percent: 0 })
    for (const { file, id } of large) {
      markFileById(id, { status: 'uploading', percent: 0 })
      appendLog(`Large file — uploading "${file.name}" in chunks…`)
      try {
        const { job_id: jobId } = await uploadLargeFile(eventId, file, {
          onProgress: ({ loaded, total }) => {
            const pct = total ? (loaded / total) * 100 : 0
            markFileById(id, { status: 'uploading', percent: pct })
            setProgress({
              completed: 0,
              total: 1,
              current_file: `${file.name} (${Math.round(pct)}% uploaded)`,
              eta_seconds: null,
              faces_found_so_far: 0,
              skipped_so_far: [],
            })
          },
        })
        markFileById(id, { status: 'processing', percent: 100 })
        appendLog(`"${file.name}" uploaded — processing…`)
        saveActiveJob(eventId, jobId)
        await watchJobOnce(jobId)
      } catch (e) {
        markFileById(id, { status: 'error', reason: e.message })
        appendLog(`"${file.name}" failed — ${e.message}`)
      }
    }
    // Small files go out in <=100-file multipart POSTs so one giant
    // request can't time out and nuke the whole selection.
    for (let i = 0; i < small.length; i += MAX_FILES_PER_BATCH) {
      const chunk = small.slice(i, i + MAX_FILES_PER_BATCH)
      const chunkFiles = chunk.map((p) => p.file)
      const chunkTotalBytes = chunk.reduce((s, p) => s + p.file.size, 0) || 1
      const batchNo = Math.floor(i / MAX_FILES_PER_BATCH) + 1
      const batchCount = Math.ceil(small.length / MAX_FILES_PER_BATCH)
      if (batchCount > 1) appendLog(`Uploading batch ${batchNo} of ${batchCount} (${chunk.length} files)…`)
      try {
        const { job_id: jobId } = await startPhotoUploadWithProgress(
          eventId,
          chunkFiles,
          ({ loaded, total }) => {
            const overallPct = total ? (loaded / total) * 100 : 0
            // Distribute the overall percent by each file's share of the
            // batch bytes — gives a smooth per-file fill that mirrors
            // the actual upload bytes going out.
            let cumulativeBytes = 0
            for (const { file, id: rowId } of chunk) {
              const fileStartPct = (cumulativeBytes / chunkTotalBytes) * 100
              const fileEndPct = ((cumulativeBytes + file.size) / chunkTotalBytes) * 100
              const filePct =
                overallPct <= fileStartPct
                  ? 0
                  : overallPct >= fileEndPct
                  ? 100
                  : ((overallPct - fileStartPct) / (fileEndPct - fileStartPct)) * 100
              cumulativeBytes += file.size
              markFileById(rowId, { percent: filePct })
            }
          },
        )
        // Mark this chunk's files as 'processing' — the bytes are on the
        // server, now face detection / thumbnail is happening.
        for (const { id: rowId } of chunk) markFileById(rowId, { status: 'processing', percent: 100 })
        saveActiveJob(eventId, jobId)
        await watchJobOnce(jobId)
      } catch (e) {
        for (const { id: rowId } of chunk) {
          markFileById(rowId, { status: 'error', reason: e.message })
        }
        appendLog(`Batch failed — ${e.message}`)
        showToast(e.message, { type: 'error' })
      }
    }
  }

  // One-shot promise wrapper around the SSE progress subscription, used
  // for every sequential upload batch (large files one by one, small
  // files in <=100-file multipart POSTs). Awaited by the upload-queue
  // pump, so batches never overlap and per-file rows stay accurate.
  function watchJobOnce(jobId) {
    return new Promise((resolve) => {
      const cleanup = subscribeToUploadProgress(eventId, jobId, {
        onProgress: (data) => {
          setProgress(data)
          appendLog(progressLine(data))
          addPhotoFromProgress(data)
          if (data.current_file) markFileByName(data.current_file, { status: 'processing' })
          if (data.photo) {
            markFileByName(data.photo.filename, {
              status: 'done',
              facesFound: data.photo.face_count ?? 0,
            })
          }
        },
        onDone: (data) => {
          setProgress(null)
          // Any rows still 'processing' or 'uploading' should be marked
          // done — the server finished the job, so every queued file
          // landed (skipped or accepted). Skips are reported separately.
          setUploadFiles((prev) => prev.map((f) => (f.status === 'processing' || f.status === 'uploading' ? { ...f, status: 'done' } : f)))
          appendLog(`Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
          // Accumulate (don't replace): the pump runs several batches
          // per queued selection and each batch reports its own skips.
          // Non-upload callers reset the list before starting their job.
          setSkippedFiles((prev) => [...prev, ...(data.skipped || [])])
          clearActiveJob(eventId)
          showToast(`${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
          pop()
          cleanup()
          resolve()
        },
        onError: (data) => {
          setProgress(null)
          // Only flip per-file rows that we still own — the rest are
          // owned by other in-flight watchJobOnce calls and should keep
          // their state.
          setUploadFiles((prev) => prev.map((f) => (f.status === 'processing' || f.status === 'uploading' ? { ...f, status: 'error', reason: data.message || 'Upload failed' } : f)))
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
      const label = drivePermissionLabel(result.permission)
      setConnectionTest({ ok: true, folderName: result.folder_name, permission: result.permission })
      setTestedUrl(url)
      showToast(`Reachable — "${result.folder_name}" · ${label}`)
    } catch (e) {
      setConnectionTest({ ok: false, message: e.message })
      setTestedUrl(url)
      showToast(e.message, { type: 'error' })
    } finally {
      setTestingConnection(false)
    }
  }

  // Back out of a passed test to try a different folder URL.
  const handleDriveTestReset = () => {
    setConnectionTest(null)
    setTestedUrl('')
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
      showToast(`Reachable — "${result.folder_name}" · ${drivePermissionLabel(result.permission)}`)
    } catch (e) {
      setExportConnectionTest({ ok: false, message: e.message })
      setExportTestedUrl(url)
      showToast(e.message, { type: 'error' })
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
    // Export folders are verified + stored only — never imported from.
    // (The old flow called connectDriveFolder here, which also imported.)
    setConnectingDrive(true)
    try {
      const res = await saveExportFolder(eventId, exportUrl.trim())
      setExportUrl('')
      setExportConnectionTest(null)
      setExportTestedUrl('')
      showToast(`Export folder set — "${res.folder_name || 'Drive folder'}"`)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setConnectingDrive(false)
    }
  }

  const handleClearExportFolder = async () => {
    try {
      await clearExportFolder(eventId)
      showToast('Export folder cleared — exports go to the import folder.')
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
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

  // Worker result lands a tick after the inputs change — fall back to the
  // same pure function inline so the grid never flashes empty.
  const managerInput = {
    photos,
    sourceFilter,
    toolsFilter,
    dupIdList: dupIds ? [...dupIds] : null,
    blurryBelow: BLURRY_BELOW,
  }
  const visiblePhotos = managerVisible ?? runInline(filterManagerPhotos, managerInput)

  const value = {
    eventId, user, event, photos, analytics,
    uploading, progress, error, copied, showGuestCard, setShowGuestCard,
    collaborators, pendingInvites, acceptedInvites, declinedInvites, inviteEmail, setInviteEmail, inviting,
    inviteMessage, teamError, clients, pendingClientInvites,
    clientInviteEmail, setClientInviteEmail, clientInviteCap,
    setClientInviteCap, clientInviteExpiry, setClientInviteExpiry,
    invitingClient, clientInviteMessage, clientError,
    createEmail, setCreateEmail, createName, setCreateName,
    createPassword, setCreatePassword, createCap, setCreateCap,
    createExpiry, setCreateExpiry, creatingClient,
    createClientMessage, createdClientPassword,
    deletingPhotoId, savingPhotoFeatures, deletingEvent,
    showEditDetails, setShowEditDetails, editName, setEditName,
    editDate, setEditDate, editVenue, setEditVenue, editDesc, setEditDesc,
    savingDetails, publishing, archiving, togglingDownload,
    showCoverModal, setShowCoverModal, coverSrc, setCoverSrc,
    coverCrop, setCoverCrop, coverZoom, setCoverZoom,
    coverPixels, setCoverPixels, uploadingCover,
    zipping, zipProgress, zippingPicks, picksZipProgress,
    favView, setFavView, eventFavourites, studioPicks, togglingPickId,
    expandedClient, grantCap, setGrantCap, grantExpiry, setGrantExpiry, savingGrant,
    uploadTab, setUploadTab, logLines, skippedFiles, uploadFiles, setUploadFiles,
    driveUrl, connectingDrive, testingConnection, connectionTest, testedUrl,
    showExportModal, setShowExportModal, exportUrl, exportTesting,
    exportConnectionTest, exportTestedUrl, exportSource, setExportSource,
    togglingGuestUploads, togglingFeature,
    showGuestUploadCard, setShowGuestUploadCard,
    showSlideshowCard, setShowSlideshowCard,
    approvingId, windowDaysInput, setWindowDaysInput, savingWindow,
    subGalleryName, setSubGalleryName, creatingSubGallery,
    showSubGalleryCard, setShowSubGalleryCard,
    syncingDrive, backingUpExisting, togglingAutoSync, togglingDriveBackup,
    reclaimingDriveBackup, driveBackupMessage,
    shoots, settingUpShoots, regeneratingShoots, disconnectingShoots,
    liveNotice, startingEvent, sourceFilter, setSourceFilter,
    photoStatusFilter, setPhotoStatusFilter, activeTab, setActiveTab,
    albums, albumsError, newAlbumName, setNewAlbumName, creatingAlbum, setCreatingAlbum,
    assigningAlbumId, handleAssignAlbumClient,
    exportClient, setExportClient, exportFormat, setExportFormat, exporting,
    privacyDraft, setPrivacyDraft,
    accessDraft, setAccessDraft,
    managerSelected, setManagerSelected, bulking,
    metaPhotoId, setMetaPhotoId, dupIds, setDupIds,
    toolsFilter, setToolsFilter, managerVisible,
    viewingPhoto, viewingFaces, facesLoading,
    aiView, setAiView, faceGroupsState, openGroupId, setOpenGroupId,
    togglingHighlightId, visibleManageablePhotos, selectedCount, visiblePhotos,
    load, loadAlbums, loadTeam, loadClients, loadFavourites, loadPicks,
    handleStartEvent, requestStartEvent, showStartConfirm, setShowStartConfirm,
    handleToggleGuestUploads, handleToggleFeature,
    handleInviteClient, handleCreateClientAccount, handleRemoveClient, openEditDetails, handleSaveDetails,
    handlePublish, handleArchive, handleRestore, handleAllowDownload,
    handleCoverFile, handleSaveCover, handleRemoveCover,
    handleStudioZip, handlePicksZip, handleArchivePhoto, handleRestorePhoto,
    toggleManagerSelect, toggleManagerSelectAllVisible,
    selectionMembers, aiMembers, openFaceViewer,
    handleBulkRemoveVisible, handleBulkMembership, handleBulkAddAllVisible,
    handleTogglePick, openGrantPanel, handleSaveGrant,
    handleSubmitBehalf, handleUnsubmit, handleRevoke, handleRestoreAccess,
    handleApprovePhoto, handleToggleHighlight, handleRejectPhoto,
    handleSaveWindowDays, handleCreateSubGallery, handleFiles,
    handleDriveUrlChange, handleTestConnection, handleDriveTestReset, handleDriveConnect, handleDriveSync,
    handleBackupExisting, handleExportUrlChange, handleExportTestConnection,
    handleExportConnect, handleClearExportFolder, handleToggleAutoSync,
    handleSetupShoots, handleShowShootsCredentials, handleRegenerateShoots,
    handleDisconnectShoots, handleToggleDriveBackup, handleReclaimDriveBackupNow,
    handleCopy, handleInvite, handleRemoveCollaborator, handleCancelInvite,
    handleDeletePhoto, handlePhotoFeatureMembership, handleDeleteEvent,
    handleSelectionExport, guestLink, formatBytes,
  }

  return (
    <EventContext.Provider value={value}>
      <EventShell>
        <Outlet />
      </EventShell>
      <StartEventConfirm />
      <PhotoFaceViewer
        photo={viewingPhoto}
        faces={viewingFaces}
        loading={facesLoading}
        items={viewingList}
        index={viewingIndex}
        onIndexChange={(dir) => stepFaceViewer(typeof dir === 'function' ? dir(0) : dir)}
        onClose={() => { setViewingPhoto(null); setViewingFaces([]); setViewingList([]); setViewingIndex(0) }}
        onRemove={viewingPhoto ? () => {
          handlePhotoFeatureMembership(viewingPhoto.photo_id, { face_search_visible: false })
          setViewingPhoto(null)
          setViewingFaces([])
          setViewingList([])
          setViewingIndex(0)
        } : undefined}
      />
      {metaPhotoId && (
        <PhotoMetaModal
          eventId={eventId}
          photo={photos.find((p) => p.photo_id === metaPhotoId) || null}
          onClose={() => setMetaPhotoId(null)}
          onChanged={load}
        />
      )}
    </EventContext.Provider>
  )
}
