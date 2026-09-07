import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Star, Upload, XCircle } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import { fileUrl } from '../../api.js'
import Dropzone from '../../components/Dropzone.jsx'
import GalleryMedia from '../../components/GalleryMedia.jsx'
import JobProgressLog from '../../components/JobProgressLog.jsx'
import Modal from '../../components/Modal.jsx'
import { BLURRY_BELOW } from '../../components/PhotoToolsCard.jsx'
import { isVideoFile } from '../../utils/media.js'

export default function Photos() {
  const {
    event, photos,
    uploading, progress, error, logLines, skippedFiles,
    liveNotice, uploadTab, setUploadTab,
    driveUrl, connectingDrive, testingConnection, connectionTest, testedUrl,
    handleDriveUrlChange, handleTestConnection, handleDriveConnect, handleDriveSync,
    syncingDrive, handleToggleAutoSync, togglingAutoSync,
    shoots, settingUpShoots, handleSetupShoots, handleShowShootsCredentials,
    regeneratingShoots, handleRegenerateShoots, disconnectingShoots, handleDisconnectShoots,
    handleFiles, handleStartEvent, startingEvent,
    showExportModal, setShowExportModal, exportUrl, handleExportUrlChange,
    exportTesting, handleExportTestConnection, exportConnectionTest, exportTestedUrl,
    handleExportConnect, exportSource, setExportSource,
    handleToggleDriveBackup, togglingDriveBackup, handleBackupExisting, backingUpExisting,
    handleReclaimDriveBackupNow, reclaimingDriveBackup, driveBackupMessage,
    photoStatusFilter, setPhotoStatusFilter, sourceFilter, setSourceFilter,
    toolsFilter, setToolsFilter, dupIds, visibleManageablePhotos, selectedCount,
    managerSelected, setManagerSelected, toggleManagerSelect, toggleManagerSelectAllVisible,
    bulking, handleBulkMembership, handleBulkAddAllVisible,
    visiblePhotos, handleArchivePhoto, handleRestorePhoto,
    handleToggleHighlight, togglingHighlightId, handleDeletePhoto, deletingPhotoId,
    setMetaPhotoId, subGalleryName, setSubGalleryName, creatingSubGallery,
    handleCreateSubGallery, setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  const [showUploadModal, setShowUploadModal] = useState(false)

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
              <button className="btn" type="button" onClick={handleStartEvent} disabled={startingEvent}>
                {startingEvent ? 'Starting…' : 'Start event'}
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
                    <div className="hint">{progress?.percent ?? 0}% complete — click to view details</div>
                  </div>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${progress?.percent ?? 0}%`, height: '100%', background: '#22C55E', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="card upload-section"
                type="button"
                onClick={() => setShowUploadModal(true)}
                style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Upload size={18} style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Upload photos</div>
                    <div className="hint">Drag & drop, import from Google Drive, or set up PandaShoots</div>
                  </div>
                </div>
              </button>
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
                    <li>Imported photos and videos aren&apos;t stored on PandaSpot&apos;s server — only thumbnails (photos) and face-search data are kept.</li>
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
                          <CheckCircle2 size={14} /> Reachable — &quot;{connectionTest.folderName}&quot;
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
                  <option key={n} value={n}>{n === 0 ? 'Any' : `${n}★+`}</option>
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
        {visiblePhotos.length === 0 ? (
          <p className="hint" style={{ padding: '24px 12px', textAlign: 'center', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            No photos found under the &quot;{
              {
                all: 'All',
                upload: 'Uploaded',
                shoots: 'PandaShoots',
                drive_import: 'Drive import',
                guest: 'Guest uploads',
              }[sourceFilter] || sourceFilter
            }&quot; filter.
          </p>
        ) : (
          <div className="photo-grid">
            {visiblePhotos.map((p) => (
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
                    {(p.rating || 0) > 0 && <span title={`${p.rating} stars`}> · {'★'.repeat(p.rating)}</span>}
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
            ))}
          </div>
        )}
      </div>

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
              <p className="hint">No Drive folder is connected to this event yet — paste one below to enable export.</p>
              <ul className="notice-list">
                <li>The folder must be shared as &quot;Anyone with the link can view&quot; (or better) so PandaSpot can write to it.</li>
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
                      <CheckCircle2 size={14} /> Reachable — &quot;{exportConnectionTest.folderName}&quot;
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
    </div>
  )
}
