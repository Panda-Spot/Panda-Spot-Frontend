import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Columns3, ImageOff, LayoutGrid, List, Search, Star, Upload, XCircle } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import { drivePermissionLabel } from './EventWorkspace.jsx'
import { GALLERY_SORTS, useGalleryItems } from '../../components/gallery/galleryTools.js'
import PhotoTiles from '../../components/gallery/PhotoTiles.jsx'
import GalleryEmpty from '../../components/gallery/GalleryEmpty.jsx'
import { fileUrl } from '../../api.js'
import Dropzone from '../../components/Dropzone.jsx'
import GalleryMedia from '../../components/GalleryMedia.jsx'
import JobProgressLog from '../../components/JobProgressLog.jsx'
import Modal from '../../components/Modal.jsx'
import StudioLightbox from '../../components/StudioLightbox.jsx'
import { BLURRY_BELOW } from '../../components/PhotoToolsCard.jsx'
import { isVideoFile } from '../../utils/media.js'

function formatListDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString()
}

export default function Photos() {
  const {
    event, photos,
    uploading, progress, error, logLines, skippedFiles,
    liveNotice, uploadTab, setUploadTab,
    driveUrl, connectingDrive, testingConnection, connectionTest, testedUrl,
    handleDriveUrlChange, handleTestConnection, handleDriveTestReset, handleDriveConnect, handleDriveSync,
    syncingDrive, handleToggleAutoSync, togglingAutoSync,
    shoots, settingUpShoots, handleSetupShoots, handleShowShootsCredentials,
    regeneratingShoots, handleRegenerateShoots, disconnectingShoots, handleDisconnectShoots,
    handleFiles, requestStartEvent,
    showExportModal, setShowExportModal, exportUrl, handleExportUrlChange,
    exportTesting, handleExportTestConnection, exportConnectionTest, exportTestedUrl,
    handleExportConnect, handleClearExportFolder, exportSource, setExportSource,
    handleToggleDriveBackup, togglingDriveBackup, handleBackupExisting, backingUpExisting,
    handleReclaimDriveBackupNow, reclaimingDriveBackup, driveBackupMessage,
    photoStatusFilter, setPhotoStatusFilter, sourceFilter, setSourceFilter,
    toolsFilter, setToolsFilter, dupIds, visibleManageablePhotos, selectedCount,
    managerSelected, setManagerSelected, toggleManagerSelect, toggleManagerSelectAllVisible,
    bulking, handleBulkMembership, handleBulkAddAllVisible,
    visiblePhotos, handleArchivePhoto, handleRestorePhoto,
    handleToggleHighlight, togglingHighlightId, handleDeletePhoto, deletingPhotoId,
    setMetaPhotoId, subGalleryName, setSubGalleryName, creatingSubGallery,
    handleCreateSubGallery, setActiveTab, formatBytes,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [teaserDragOver, setTeaserDragOver] = useState(false)
  // Fullscreen preview: { items, index } — navigable with arrows/swipe.
  const [preview, setPreview] = useState(null)
  const [editingExportFolder, setEditingExportFolder] = useState(false)

  // Whatever the server reports as the export target (explicit export
  // folder, else the import folder) decides which modal body shows.
  const importFolderUrl = event?.drive_folder_url || null
  const customExportFolderUrl = event?.export_drive_folder_url || null
  const hasExportTarget = !!(customExportFolderUrl || importFolderUrl)

  // A freshly saved custom folder collapses the inline editor on its own.
  useEffect(() => {
    if (customExportFolderUrl) setEditingExportFolder(false)
  }, [customExportFolderUrl])

  // SSE progress carries { completed, total } but no percent — derive it.
  const uploadPct = progress && progress.total > 0
    ? Math.round((Math.min(progress.completed ?? 0, progress.total) / progress.total) * 100)
    : 0

  // Gallery presentation: layout views, per-row density, select mode (bulk
  // checkboxes stay hidden until Select is tapped), name search, sort and
  // client-side pagination over the worker-filtered visiblePhotos.
  const [galleryView, setGalleryView] = useState('grid')
  const [perRow, setPerRow] = useState(4)
  const [selectMode, setSelectMode] = useState(false)
  const [photoQuery, setPhotoQuery] = useState('')
  const [photoSort, setPhotoSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(48)

  const searchedPhotos = useGalleryItems(visiblePhotos, { query: photoQuery, sort: photoSort })
  const pageCount = Math.max(1, Math.ceil(searchedPhotos.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedPhotos = searchedPhotos.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => { setPage(1) }, [visiblePhotos, photoQuery, photoSort, pageSize])

  const toolFiltersActive = toolsFilter.blur !== 'all' || toolsFilter.faces !== 'all'
    || toolsFilter.dupOnly || (toolsFilter.minRating || 0) > 0 || (toolsFilter.tag && toolsFilter.tag !== 'all')

  const clearSearchAndFilters = () => {
    setPhotoQuery('')
    setToolsFilter({ blur: 'all', faces: 'all', dupOnly: false, minRating: 0, tag: 'all' })
  }

  return (
    <div>
      <div className="event-stack">
        {event && !event.started ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Upload size={28} style={{ color: '#F59E0B' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Event not started</h3>
            <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
              Start the event to unlock uploads, Google Drive import, and PandaShoots.
            </p>
            {event.role === 'owner' ? (
              <button className="btn" type="button" onClick={requestStartEvent}>
                Start event
              </button>
            ) : (
              <p className="hint">Only the event owner can start the event.</p>
            )}
          </div>
        ) : (
          <>
            {uploading ? (
              <div className="card upload-section" style={{ cursor: 'pointer' }} onClick={() => setShowUploadModal(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Upload size={18} style={{ color: '#22C55E' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Uploading photos…</div>
                    <div className="hint">{uploadPct}% complete — click to view details</div>
                  </div>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadPct}%`, height: '100%', background: '#22C55E', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`card upload-teaser${teaserDragOver ? ' drag-over' : ''}`}
                role="button"
                tabIndex={0}
                title="Open the upload dialog"
                onClick={() => setShowUploadModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowUploadModal(true) }
                }}
                onDragOver={(e) => { e.preventDefault(); setTeaserDragOver(true) }}
                onDragLeave={() => setTeaserDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setTeaserDragOver(false)
                  const files = Array.from(e.dataTransfer?.files || [])
                  if (files.length === 0) return
                  setShowUploadModal(true)
                  handleFiles(files)
                }}
              >
                <div className="upload-teaser-icon">
                  <Upload size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="upload-teaser-title">
                    {teaserDragOver ? 'Drop to upload' : 'Upload photos'}
                  </div>
                  <div className="hint">
                    Drop files here or click to browse — JPG, PNG, WebP and video
                    {event?.pandashoots_enabled ? ' · Drive import & PandaShoots inside' : ' · Drive import inside'}
                  </div>
                </div>
                <div className="upload-teaser-hint">Click or drop files</div>
              </div>
            )}

            <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload photos" size="lg">
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
                {event?.pandashoots_enabled && (
                  <button
                    type="button"
                    className={uploadTab === 'shoots' ? 'upload-tab active' : 'upload-tab'}
                    onClick={() => setUploadTab('shoots')}
                  >
                    PandaShoots
                  </button>
                )}
              </div>

              {uploadTab === 'files' ? (
                <Dropzone
                  onFiles={handleFiles}
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mkv,.mov,.m4v,.avi"
                  disabled={uploading}
                  hint="Photos (JPG/PNG/WebP) or video (MP4/MOV/WebM/MKV/AVI, gallery only) — files over 20MB upload in resumable chunks. Faces are indexed only after you add photos to AI Search."
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
                            Enter these into your camera&apos;s FTP transfer settings menu, and set it to upload on capture.
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
                    <li>Imported originals aren&apos;t stored on PandaSpot&apos;s server — only thumbnails (photos) are kept at import.</li>
                    <li>Faces are indexed only after you add photos to AI Search — PandaShoots captures are the exception, indexed live.</li>
                    <li>Downloads and shares fetch the original from your Drive folder live.</li>
                    <li>Keep the folder shared as &quot;Anyone with the link can view&quot; — if you later restrict or delete files there, those specific photos can no longer be downloaded through PandaSpot (search still works fine).</li>
                    <li>Connecting scans and imports every photo currently in the folder, so it can take a while for a large one.</li>
                  </ul>
                  <div className="row">
                    <input
                      className="text-input"
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={driveUrl}
                      onChange={(e) => handleDriveUrlChange(e.target.value)}
                      disabled={uploading || connectingDrive}
                    />
                    {connectionTest?.ok && testedUrl === driveUrl.trim() ? (
                      <>
                        <button
                          className="btn"
                          type="button"
                          onClick={handleDriveConnect}
                          disabled={uploading || connectingDrive}
                        >
                          {connectingDrive ? 'Connecting…' : 'Import from this folder'}
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={handleDriveTestReset}
                          disabled={uploading || connectingDrive}
                        >
                          Use a different folder
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn"
                        type="button"
                        onClick={handleTestConnection}
                        disabled={uploading || testingConnection || !driveUrl.trim()}
                      >
                        {testingConnection ? 'Testing…' : 'Test & continue'}
                      </button>
                    )}
                  </div>
                  {connectionTest && (
                    <p className={connectionTest.ok ? 'hint connection-test-ok' : 'error connection-test-fail'}>
                      {connectionTest.ok ? (
                        <>
                          <CheckCircle2 size={14} /> Reachable — &quot;{connectionTest.folderName}&quot;
                          {' · '}
                          {drivePermissionLabel(connectionTest.permission)}
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
            </Modal>
          </>
        )}

        {error && <p className="error">{error}</p>}

        {liveNotice && <p className="live-notice">{liveNotice}</p>}

        {event && !event.is_sub_gallery && (
          <div className="card">
            <div className="guest-link-label">Sub-galleries</div>
            <p className="hint">
              Split this event into separate galleries (e.g. &quot;Ceremony&quot; / &quot;Reception&quot;) — guests scan the one shared
              link, then pick a sub-gallery before searching or uploading.
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

        {/* Filters, tabs and the grid only make sense once photos can exist —
            i.e. after the event is started. Pre-start the page shows the
            start hero plus sub-gallery management above. */}
        {event?.started && (
        <>
        <div className="card filter-bar">
          <div className="filter-group">
            <span className="filter-label">Status</span>
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
          </div>

        {(selectMode && (event?.photo_selection_enabled || event?.face_search_enabled)) && visibleManageablePhotos.length > 0 && (
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

        {/* Tool filters appear only after the studio enables Advanced
            photographic tools on the Tools page (post full analysis). */}
        {event?.advanced_tools_enabled && (
        <div className="card" style={{ padding: '10px 14px' }}>
          <div className="guest-link-label">Tool filters</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <label className="field-label" htmlFor="tf-blur">Sharpness</label>
              <select id="tf-blur" className="text-input" value={toolsFilter.blur} onChange={(e) => setToolsFilter((f) => ({ ...f, blur: e.target.value }))}>
                <option value="all">Any</option>
                <option value="sharp">Sharp (≥ {BLURRY_BELOW})</option>
                <option value="blurry">Blurry (&lt; {BLURRY_BELOW})</option>
                <option value="unmeasured">Not measured</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tf-faces">Faces</label>
              <select id="tf-faces" className="text-input" value={toolsFilter.faces} onChange={(e) => setToolsFilter((f) => ({ ...f, faces: e.target.value }))}>
                <option value="all">Any</option>
                <option value="0">0 faces</option>
                <option value="1">1 face</option>
                <option value="2+">2+ faces</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tf-rating">Min rating</label>
              <select id="tf-rating" className="text-input" value={toolsFilter.minRating} onChange={(e) => setToolsFilter((f) => ({ ...f, minRating: Number(e.target.value) }))}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n === 0 ? 'Any' : `${n}+ stars`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tf-tag">Color tag</label>
              <select id="tf-tag" className="text-input" value={toolsFilter.tag} onChange={(e) => setToolsFilter((f) => ({ ...f, tag: e.target.value }))}>
                <option value="all">Any</option>
                <option value="">None</option>
                {['red', 'orange', 'yellow', 'green', 'blue', 'purple'].map((c) => (
                  <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <label className="checkbox-row" style={{ margin: 0 }}>
              <input
                type="checkbox" checked={toolsFilter.dupOnly}
                disabled={!dupIds}
                title={dupIds ? 'Show only exact duplicates' : 'Run “Find duplicates” first'}
                onChange={(e) => setToolsFilter((f) => ({ ...f, dupOnly: e.target.checked }))}
              />
              Duplicates only
            </label>
            <button className="btn secondary" type="button" onClick={() => setToolsFilter({ blur: 'all', faces: 'all', dupOnly: false, minRating: 0, tag: 'all' })}>
              Clear
            </button>
          </div>
        </div>
        )}
        <div className="filter-group">
          <span className="filter-label">Source</span>
          <div className="row source-filter-row">
          {[
            { key: 'all', label: 'All' },
            { key: 'upload', label: 'Uploaded' },
            // PandaShoots source tab only makes sense while the feature is
            // enabled — unless shoots photos already exist, which keeps the
            // tab reachable for reviewing them.
            ...((event?.pandashoots_enabled || photos.some((p) => p.approval_status !== 'pending' && (p.source || 'upload') === 'shoots'))
              ? [{ key: 'shoots', label: 'PandaShoots' }]
              : []),
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
        </div>
        <div className="filter-group">
          <span className="filter-label">Layout</span>
          <div className="view-switcher" aria-label="Gallery layout">
            {[
              { key: 'grid', icon: LayoutGrid, label: 'Grid' },
              { key: 'masonry', icon: Columns3, label: 'Masonry' },
              { key: 'list', icon: List, label: 'List' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                className={galleryView === key ? 'active' : ''}
                onClick={() => setGalleryView(key)}
                title={`${label} view`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          {galleryView !== 'list' && (
            <label className="per-row-slider" title="Photos per row">
              {perRow} per row
              <input
                type="range" min={2} max={10} step={1} value={perRow}
                onChange={(e) => setPerRow(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        <div className="filter-group">
          <span className="filter-label">Find</span>
          <input
            className="text-input gallery-search"
            type="search"
            placeholder="Search by image name…"
            value={photoQuery}
            onChange={(e) => setPhotoQuery(e.target.value)}
          />
          <select
            className="text-input" value={photoSort}
            onChange={(e) => setPhotoSort(e.target.value)}
            title="Sort photos"
            style={{ width: 'auto' }}
          >
            {GALLERY_SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <select
            className="text-input" value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Photos per page"
            style={{ width: 'auto' }}
          >
            {[24, 48, 96].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          {(event?.photo_selection_enabled || event?.face_search_enabled) && (
            <button
              className={selectMode ? 'btn' : 'btn secondary'}
              type="button"
              onClick={() => setSelectMode((v) => !v)}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>
        </div>
        {searchedPhotos.length === 0 ? (
          <GalleryEmpty
            icon={photoQuery ? Search : ImageOff}
            title={photos.length === 0
              ? `No photos under “${{ all: 'All', upload: 'Uploaded', shoots: 'PandaShoots', drive_import: 'Drive import', guest: 'Guest uploads' }[sourceFilter] || sourceFilter}” yet`
              : 'No photos match'}
            hint={photos.length === 0
              ? 'Upload files, import from Google Drive, or set up PandaShoots to get started.'
              : toolFiltersActive
                ? 'Try clearing the tool filters or search. Sharpness, tags, ratings and duplicates appear after running Analyze on the Tools page.'
                : 'Try a different search.'}
            action={(photos.length > 0 && (toolFiltersActive || photoQuery)) ? { label: 'Clear search & filters', onClick: clearSearchAndFilters } : undefined}
          />
        ) : (
          <>
            <PhotoTiles
              items={pagedPhotos}
              view={galleryView}
              perRow={perRow}
              renderCard={(p, i) => (
              <div className="photo-card" key={p.photo_id}>
                <div
                  style={{ position: 'relative', cursor: 'zoom-in' }}
                  onClick={() => setPreview({ items: pagedPhotos, index: i })}
                  title="Open fullscreen preview"
                >
                  <GalleryMedia
                    src={fileUrl(p.thumbnail_url || p.url)}
                    filename={p.filename}
                    style={galleryView === 'masonry' ? { height: 'auto' } : undefined}
                  />
                  {selectMode && (event?.photo_selection_enabled || event?.face_search_enabled) && (
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
                    {galleryView === 'list' && (
                      <span className="list-file">
                        <span className="list-file-name" title={p.filename}>{p.filename}</span>
                        <span className="hint">
                          {[p.file_size != null && formatBytes(p.file_size), formatListDate(p.exif_captured_at || p.createdAt)]
                            .filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    )}
                    {isVideoFile(p.filename) ? (
                      <>Video{p.archived_at && <span className="hint"> · archived</span>}</>
                    ) : (
                      <>{p.face_indexed_at && (<>{p.face_count} face{p.face_count === 1 ? '' : 's'}</>)}{p.archived_at && <span className="hint"> · archived</span>}</>
                    )}
                    {(p.rating || 0) > 0 && (
                      <span title={`${p.rating} stars`} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                        {' · '}
                        {Array.from({ length: p.rating }).map((_, i) => (
                          <Star key={i} size={11} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                        ))}
                      </span>
                    )}
                    {p.color_tag && <span title={`Tagged ${p.color_tag}`} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: p.color_tag, marginLeft: 4, verticalAlign: 'baseline' }} />}
                    {p.sharpness != null && <span className="hint" title="Sharpness score"> · {Math.round(p.sharpness)}</span>}
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
                    title={p.highlighted ? 'Remove TV highlight' : 'Star for TV highlights wall'}
                    onClick={() => handleToggleHighlight(p.photo_id, p.highlighted)}
                    disabled={togglingHighlightId === p.photo_id}
                    style={{ color: p.highlighted ? '#F59E0B' : undefined }}
                  >
                    <Star size={15} fill={p.highlighted ? '#F59E0B' : 'none'} />
                  </button>
                  <button
                    className="dismiss-btn"
                    type="button"
                    onClick={() => handleDeletePhoto(p.photo_id, p.filename)}
                    disabled={deletingPhotoId === p.photo_id}
                  >
                    {deletingPhotoId === p.photo_id ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    className="dismiss-btn"
                    type="button"
                    title="Metadata, rating, downloads, cover"
                    onClick={() => setMetaPhotoId(p.photo_id)}
                  >
                    Info
                  </button>
                </div>
              </div>
            )}
            />
            <div className="gallery-pagination">
              <span>
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, searchedPhotos.length)} of {searchedPhotos.length}
              </span>
              {pageCount > 1 && (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn secondary" type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    Prev
                  </button>
                  <span>Page {safePage} of {pageCount}</span>
                  <button
                    className="btn secondary" type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        </>)}
      </div>

      {preview && (
        <StudioLightbox
          items={preview.items}
          index={preview.index}
          onClose={() => setPreview(null)}
          onIndexChange={(fn) => setPreview((p) => (p ? { ...p, index: typeof fn === 'function' ? fn(p.index) : fn } : p))}
        />
      )}

      {event && (
        <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export to Google Drive">
          {hasExportTarget ? (
            <div className="export-modal-body">
              <div className="card" style={{ padding: '10px 14px', marginBottom: 12 }}>
                <div className="guest-link-label">Export folder</div>
                {customExportFolderUrl ? (
                  <p className="hint" style={{ margin: '0 0 8px' }}>
                    Using a separate export folder:{' '}
                    <a href={customExportFolderUrl} target="_blank" rel="noreferrer">open in Drive</a>
                    {' · '}
                    <button type="button" className="dismiss-btn" onClick={handleClearExportFolder}>
                      Use the import folder instead
                    </button>
                  </p>
                ) : (
                  <p className="hint" style={{ margin: '0 0 8px' }}>
                    Using the import folder:{' '}
                    <a href={importFolderUrl} target="_blank" rel="noreferrer">open in Drive</a>
                  </p>
                )}
                {!customExportFolderUrl && !editingExportFolder && (
                  <button className="btn secondary" type="button" onClick={() => setEditingExportFolder(true)}>
                    Use a different folder
                  </button>
                )}
                {editingExportFolder && !customExportFolderUrl && (
                  <ExportFolderForm
                    uploading={uploading}
                    exportUrl={exportUrl}
                    onUrlChange={handleExportUrlChange}
                    exportTesting={exportTesting}
                    onTest={handleExportTestConnection}
                    connectionTest={exportConnectionTest}
                    testedUrl={exportTestedUrl}
                    connectingDrive={connectingDrive}
                    onSave={handleExportConnect}
                    saveLabel="Save export folder"
                  />
                )}
              </div>
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
                    <li>Exported photos live in this Drive folder for only 2 days before being pulled back to PandaSpot&apos;s server and removed from Drive.</li>
                    <li>7 days total before permanent deletion everywhere — including the PandaSpot copy, even for a photo you originally uploaded directly.</li>
                    <li>Make your own copy in Drive (select all, &quot;Make a copy&quot;) well before then.</li>
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
              <p className="hint">No export folder yet — paste a Drive folder below. It is only used for export; nothing is ever imported from it.</p>
              <ul className="notice-list">
                <li>The folder must be shared as &quot;Anyone with the link&quot; with Editor access so PandaSpot can write to it.</li>
              </ul>
              <ExportFolderForm
                uploading={uploading}
                exportUrl={exportUrl}
                onUrlChange={handleExportUrlChange}
                exportTesting={exportTesting}
                onTest={handleExportTestConnection}
                connectionTest={exportConnectionTest}
                testedUrl={exportTestedUrl}
                connectingDrive={connectingDrive}
                onSave={handleExportConnect}
                saveLabel="Save export folder"
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// Export-folder connect form (also reused for a custom folder): one
// "Test & continue" button, and only after the test passes does the save
// button appear — never two competing actions at once.
function ExportFolderForm({
  uploading, exportUrl, onUrlChange,
  exportTesting, onTest, connectionTest, testedUrl,
  connectingDrive, onSave, saveLabel,
}) {
  const tested = connectionTest?.ok && testedUrl === exportUrl.trim()
  return (
    <div>
      <div className="row">
        <input
          className="text-input"
          type="url"
          placeholder="https://drive.google.com/drive/folders/..."
          value={exportUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={uploading || connectingDrive}
        />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {tested ? (
          <button
            className="btn"
            type="button"
            onClick={onSave}
            disabled={uploading || connectingDrive}
          >
            {connectingDrive ? 'Saving…' : saveLabel}
          </button>
        ) : (
          <button
            className="btn"
            type="button"
            onClick={onTest}
            disabled={uploading || exportTesting || !exportUrl.trim()}
          >
            {exportTesting ? 'Testing…' : 'Test & continue'}
          </button>
        )}
      </div>
      {connectionTest && (
        <p className={connectionTest.ok ? 'hint connection-test-ok' : 'error connection-test-fail'}>
          {connectionTest.ok ? (
            <>
              <CheckCircle2 size={14} /> Reachable — &quot;{connectionTest.folderName}&quot;
              {' · '}
              {drivePermissionLabel(connectionTest.permission)}
            </>
          ) : (
            <>
              <XCircle size={14} /> {connectionTest.message}
            </>
          )}
        </p>
      )}
    </div>
  )
}
