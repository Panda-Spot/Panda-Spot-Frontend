import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Images, MapPin, Plus, Send, Trash2, Undo2, Upload } from 'lucide-react'
import {
  addAlbumSources,
  deleteAlbum,
  deleteAlbumPage,
  deleteAlbumVersion,
  downloadAlbumSourcesZip,
  downloadAlbumProofPdf,
  duplicateAlbumVersion,
  fileUrl,
  getAlbum,
  listEventFavourites,
  listPhotos,
  postAlbumComment,
  removeAlbumSource,
  renameAlbum,
  reopenAlbum,
  reorderAlbumPages,
  resolveAlbumComment,
  sendAlbum,
  deleteAlbumComment,
  unresolveAlbumComment,
  uploadAlbumVersion,
} from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import AlbumFlipbook from '../components/AlbumFlipbook.jsx'
import AlbumComments from '../components/AlbumComments.jsx'
import { ALBUM_STATUS_META } from '../components/albumMeta.js'

// Studio album workspace (Phase 23): stage sources (favourites picker or
// any event photos), upload spread versions or a print PDF, send/reopen,
// and review pinned client feedback with resolve. One album per page;
// the event's Albums tab links here.
export default function StudioAlbum() {
  const { eventId, albumId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [album, setAlbum] = useState(null)
  const [error, setError] = useState('')
  const [versionId, setVersionId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [pendingPin, setPendingPin] = useState(null)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [note, setNote] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPhotos, setPickerPhotos] = useState(null)
  const [picked, setPicked] = useState(new Set())
  const fileRef = useRef(null)
  const pdfRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const a = await getAlbum(eventId, albumId)
      setAlbum(a)
      setError('')
      setVersionId((prev) => {
        if (prev && a.versions.some((v) => v.id === prev)) return prev
        const latest = [...a.versions].sort((x, y) => y.version_number - x.version_number)[0]
        return latest ? latest.id : null
      })
    } catch (e) {
      setError(e.message)
    }
  }, [eventId, albumId])

  useEffect(() => { load() }, [load])

  if (error && !album) return <p className="error">{error}</p>
  if (!album) return <p className="hint">Loading album…</p>

  const locked = album.status === 'APPROVED'
  const version = album.versions.find((v) => v.id === versionId) || null
  const versionComments = (album.comments || []).filter((c) => !version || c.version_id === version.id)
  const pageNumberOf = (pid) => version?.pages.find((p) => p.page_id === pid)?.page_number
    || album.versions.flatMap((v) => v.pages).find((p) => p.page_id === pid)?.page_number

  const refresh = (msg) => load().then(() => { if (msg) showToast(msg) })

  const handleSend = async () => {
    const ok = await confirm('Send this album to the client for review? They will see the latest version.', { title: 'Send album?', confirmLabel: 'Send' })
    if (!ok) return
    setBusy(true)
    try { await sendAlbum(eventId, albumId); await refresh('Album sent for review') }
    catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const handleReopen = async () => {
    const ok = await confirm('Reopen this approved album? It returns to Draft and the client loses access until you send again.', { title: 'Reopen album?', confirmLabel: 'Reopen' })
    if (!ok) return
    setBusy(true)
    try { await reopenAlbum(eventId, albumId); await refresh('Album reopened as draft') }
    catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const handleDelete = async () => {
    const ok = await confirm(`Delete "${album.name}" and all its versions, spreads and comments? This can't be undone.`, { title: 'Delete album?', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try { await deleteAlbum(eventId, albumId); navigate(`/events/${eventId}`) }
    catch (e) { showToast(e.message, { type: 'error' }) }
  }

  const handleUpload = async (files, isPdf) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      await uploadAlbumVersion(eventId, albumId, isPdf ? { printPdf: files[0], note } : { files: [...files], note })
      setNote('')
      await refresh(isPdf ? 'Print PDF uploaded' : 'New version uploaded')
    } catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const handleDeleteVersion = async () => {
    if (!version) return
    const ok = await confirm(`Delete version ${version.version_number}? Only the latest version can be deleted.`, { title: 'Delete version?', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    setBusy(true)
    try { await deleteAlbumVersion(eventId, albumId, version.id); setVersionId(null); await refresh('Version deleted') }
    catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  // Phase 4: spread reorder (move one step) + single-spread delete.
  // Pins ride along on reorder; deleting a spread deletes its pins too.
  const handleMovePage = async (pageId, dir) => {
    if (!version || locked) return
    const ids = [...version.pages].sort((a, b) => a.page_number - b.page_number).map((p) => p.page_id)
    const i = ids.indexOf(pageId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    const next = [...ids]
    next[i] = ids[j]
    next[j] = ids[i]
    setBusy(true)
    try { await reorderAlbumPages(eventId, albumId, version.id, next); await load() }
    catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const handleDeletePage = async (page) => {
    if (!version || locked) return
    const ok = await confirm(`Delete spread ${page.page_number} (“${page.filename}”) and its pins? The rest renumber.`, { title: 'Delete spread?', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    setBusy(true)
    try { await deleteAlbumPage(eventId, albumId, version.id, page.page_id); await refresh('Spread deleted') }
    catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const openPicker = async () => {
    setPickerOpen(true)
    setPickerPhotos(null)
    setPicked(new Set())
    try {
      const favs = await listEventFavourites(eventId)
      const merged = favs.merged || []
      if (merged.length > 0) {
        setPickerPhotos(merged.map((p) => ({ ...p, from: `favourited by ${(p.favourited_by || []).map((u) => u.name).join(', ') || 'client'}` })))
      } else {
        const all = await listPhotos(eventId, 'all')
        setPickerPhotos(all.map((p) => ({ photo_id: p.photo_id, filename: p.filename, thumbnail_url: p.thumbnail_url, url: p.url, from: 'event photos' })))
      }
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setPickerPhotos([])
    }
  }

  const handleStagePicked = async () => {
    if (picked.size === 0) return
    setBusy(true)
    try {
      const res = await addAlbumSources(eventId, albumId, [...picked])
      setPickerOpen(false)
      await refresh(`Staged ${res.added} photo${res.added === 1 ? '' : 's'}${res.skipped?.length ? ` (${res.skipped.length} skipped)` : ''}`)
    } catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const postComment = async (payload) => {
    setBusy(true)
    try {
      await postAlbumComment(eventId, albumId, { versionId: version.id, ...payload })
      setPendingPin(null)
      setPlacing(false)
      await load()
    } catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const meta = ALBUM_STATUS_META[album.status] || ALBUM_STATUS_META.DRAFT
  const stagedIds = new Set((album.sources || []).map((s) => s.photo_id))

  return (
    <div>
      <Link className="back-link" to={`/events/${eventId}`}><ArrowLeft size={13} style={{ display: 'inline' }} /> Back to event</Link>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {renaming ? (
            <span className="row" style={{ gap: 6 }}>
              <input className="text-input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={120} />
              <button
                type="button" className="btn" disabled={busy || !nameDraft.trim()}
                onClick={async () => { try { await renameAlbum(eventId, albumId, nameDraft.trim()); setRenaming(false); await refresh('Renamed') } catch (e) { showToast(e.message, { type: 'error' }) } }}
              >
                Save
              </button>
              <button type="button" className="btn secondary" onClick={() => setRenaming(false)}>Cancel</button>
            </span>
          ) : (
            <h1 style={{ margin: 0, cursor: locked ? undefined : 'pointer' }} title={locked ? '' : 'Click to rename'} onClick={() => { if (!locked) { setNameDraft(album.name); setRenaming(true) } }}>
              {album.name}
            </h1>
          )}
          <span className="hint" style={{ border: `1px solid ${meta.color}`, color: meta.color, borderRadius: 999, padding: '2px 10px', fontWeight: 700 }}>
            {meta.label}
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {(album.status === 'DRAFT' || album.status === 'CHANGES_REQUESTED') && (
            <GoldButton size="sm" icon={<Send size={13} />} loading={busy} onClick={handleSend}>Send for review</GoldButton>
          )}
          {locked && (
            <button type="button" className="btn secondary" disabled={busy} onClick={handleReopen}>
              <Undo2 size={13} /> Reopen
            </button>
          )}
          {!locked && (
            <button type="button" className="btn danger-btn" onClick={handleDelete}>
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>
      {(album.created_by || album.sent_at) && (
        <p className="hint" style={{ marginTop: 8 }}>
          {album.created_by && <>Created by {album.created_by.name || album.created_by.email}</>}
          {album.created_by && album.sent_at && ' · '}
          {album.sent_at && <>Last sent {new Date(album.sent_at).toLocaleString()}</>}
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="guest-link-label">Staged sources ({album.sources.length}) — zero-cost refs, no copies</div>
        <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {!locked && (
            <button type="button" className="btn secondary" onClick={openPicker}>
              <Plus size={13} /> Stage photos
            </button>
          )}
          {album.sources.length > 0 && (
            <button
              type="button" className="btn secondary"
              onClick={() => downloadAlbumSourcesZip(eventId, albumId, `${album.name}-sources.zip`).catch((e) => showToast(e.message, { type: 'error' }))}
            >
              <Download size={13} /> Full-res sources zip
            </button>
          )}
        </div>
        {album.sources.length === 0 ? (
          <p className="hint">Nothing staged yet — pull the client&apos;s favourites (or any event photos) in to design from.</p>
        ) : (
          <div className="photo-grid">
            {album.sources.map((s) => (
              <div className="photo-card" key={s.photo_id}>
                <img src={fileUrl(s.thumbnail_url)} alt={s.filename} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.filename}</span>
                  {!locked && (
                    <button
                      type="button" className="dismiss-btn" title="Remove source"
                      onClick={async () => { try { await removeAlbumSource(eventId, albumId, s.photo_id); await load() } catch (e) { showToast(e.message, { type: 'error' }) } }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="guest-link-label">Versions ({album.versions.length})</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[...album.versions].sort((a, b) => a.version_number - b.version_number).map((v) => (
            <button
              key={v.id}
              type="button"
              className={v.id === versionId ? 'upload-tab active' : 'upload-tab'}
              onClick={() => { setVersionId(v.id); setSelectedPinId(null) }}
            >
              v{v.version_number}{v.print_pdf_url ? ' · PDF' : ` · ${v.pages.length}p`}
            </button>
          ))}
          {album.versions.length === 0 && <span className="hint">No versions yet — upload spreads or a print PDF.</span>}
        </div>
        {!locked && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={(e) => { handleUpload(e.target.files, false); e.target.value = '' }}
            />
            <input
              ref={pdfRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
              onChange={(e) => { handleUpload(e.target.files, true); e.target.value = '' }}
            />
            <input
              className="text-input" placeholder="Version note (optional)" value={note}
              onChange={(e) => setNote(e.target.value)} maxLength={500} style={{ maxWidth: 260 }}
            />
            <button type="button" className="btn secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Images size={13} /> Upload spreads
            </button>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => pdfRef.current?.click()}>
              <Upload size={13} /> Upload print PDF
            </button>
            {version && (
              <button type="button" className="btn danger-btn" disabled={busy} onClick={handleDeleteVersion}>
                Delete latest
              </button>
            )}
            {version && (
              <button type="button" className="btn danger-btn" disabled={busy} onClick={handleDeleteVersion}>
                Delete latest
              </button>
            )}
            {version?.note && <span className="hint">Note: {version.note}</span>}
          </div>
        )}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {!locked && version && !version.print_pdf_url && version.pages.length > 0 && (
            <button
              type="button" className="btn secondary" disabled={busy}
              title="Start a new revision from this version's spreads — the old revision is preserved"
              onClick={async () => {
                const nextNum = Math.max(...album.versions.map((v) => v.version_number)) + 1
                const okDup = await confirm(`Start V${nextNum} from V${version.version_number}'s spreads? The current revision stays preserved.`, { title: 'New revision from current spreads?', confirmLabel: 'Duplicate' })
                if (!okDup) return
                setBusy(true)
                try { await duplicateAlbumVersion(eventId, albumId, version.id); await refresh('New revision started') }
                catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
              }}
            >
              <Images size={13} /> New revision from current
            </button>
          )}
          {album.versions.length > 0 && (
            <button
              type="button" className="btn secondary" disabled={busy}
              title="Lifecycle record: title, revisions, comments with status, approval timestamp"
              onClick={() => downloadAlbumProofPdf(eventId, albumId).then(() => showToast('Proof PDF downloaded')).catch((e) => showToast(e.message, { type: 'error' }))}
            >
              <Download size={13} /> Proof PDF
            </button>
          )}
        </div>
      </div>

      {/* Phase 4: spread manager — reorder + delete per spread. */}
      {version && !version.print_pdf_url && version.pages.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="guest-link-label">Spreads — v{version.version_number} order ({version.pages.length})</div>
          {!locked && <p className="hint">Reorder with the arrows; pins move with their spread. Deleting a spread deletes its pins too.</p>}
          <div className="photo-grid">
            {[...version.pages].sort((a, b) => a.page_number - b.page_number).map((p, i, arr) => (
              <div className="photo-card" key={p.page_id}>
                <img src={fileUrl(p.thumbnail_url || p.file_url)} alt={`Spread ${p.page_number}`} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <span className="hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.page_number}. {p.filename}{p.width && p.height ? ` · ${p.width}×${p.height}` : ''}
                  </span>
                  {!locked && (
                    <span className="row" style={{ gap: 2, flexShrink: 0 }}>
                      <button type="button" className="dismiss-btn" title="Move earlier" disabled={busy || i === 0} onClick={() => handleMovePage(p.page_id, -1)}>
                        <ChevronLeft size={14} />
                      </button>
                      <button type="button" className="dismiss-btn" title="Move later" disabled={busy || i === arr.length - 1} onClick={() => handleMovePage(p.page_id, 1)}>
                        <ChevronRight size={14} />
                      </button>
                      <button type="button" className="dismiss-btn" title="Delete spread" disabled={busy || arr.length <= 1} onClick={() => handleDeletePage(p)}>
                        <Trash2 size={13} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {version && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 4fr)', gap: 12, marginTop: 12, alignItems: 'start' }} className="album-workspace-grid">
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="hint">Version {version.version_number} preview</span>
              {!locked && !version.print_pdf_url && (
                <button
                  type="button" className={placing ? 'btn' : 'btn secondary'}
                  onClick={() => { setPlacing((p) => !p); setPendingPin(null) }}
                >
                  <MapPin size={13} /> {placing ? 'Placing… (click spread)' : 'Drop a pin'}
                </button>
              )}
            </div>
            <AlbumFlipbook
              pages={version.pages}
              pdfUrl={version.print_pdf_url}
              pins={versionComments.filter((c) => c.pin_number != null)}
              placing={placing}
              onPlace={(pin) => { setPendingPin(pin); setPlacing(false) }}
              selectedPinId={selectedPinId}
              onPinClick={(pin) => setSelectedPinId(pin.id)}
            />
          </div>
          <div className="card">
            <div className="guest-link-label">Feedback ({versionComments.length})</div>
            <AlbumComments
              comments={versionComments}
              pageNumberOf={pageNumberOf}
              locked={locked}
              canResolve
              busy={busy}
              onResolve={async (id) => { try { await resolveAlbumComment(eventId, albumId, id); await load() } catch (e) { showToast(e.message, { type: 'error' }) } }}
              onUnresolve={async (id) => { try { await unresolveAlbumComment(eventId, albumId, id); await load() } catch (e) { showToast(e.message, { type: 'error' }) } }}
              canDeleteAny
              onDeleteComment={async (id) => {
                const okDel = await confirm('Delete this comment and its replies? This can’t be undone.', { title: 'Delete comment?', confirmLabel: 'Delete', danger: true })
                if (!okDel) return
                try { await deleteAlbumComment(eventId, albumId, id); await load() } catch (e) { showToast(e.message, { type: 'error' }) }
              }}
              pendingPin={pendingPin}
              onCancelPin={() => setPendingPin(null)}
              onPostPin={(message) => postComment({ ...pendingPin, pageId: pendingPin.pageId, message })}
              onPostReply={(parentId, message) => postComment({ parentId, message })}
              onPostNote={(message) => postComment({ message })}
              selectedPinId={selectedPinId}
              onSelectPin={(pin) => setSelectedPinId(pin.id)}
            />
          </div>
        </div>
      )}

      {pickerOpen && (
        <div className="modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <h3>Stage source photos</h3>
            <p className="hint">Client favourites first — or the whole event pool when nobody has picked yet. Already-staged photos are ticked.</p>
            {!pickerPhotos ? (
              <p className="hint">Loading…</p>
            ) : pickerPhotos.length === 0 ? (
              <p className="hint">No photos available to stage.</p>
            ) : (
              <div className="photo-grid" style={{ maxHeight: '50vh', overflow: 'auto' }}>
                {pickerPhotos.map((p) => {
                  const staged = stagedIds.has(p.photo_id)
                  const checked = staged || picked.has(p.photo_id)
                  return (
                    <div
                      key={p.photo_id} className="photo-card"
                      style={{ opacity: staged ? 0.55 : 1, cursor: staged ? undefined : 'pointer' }}
                      onClick={() => {
                        if (staged) return
                        setPicked((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.photo_id)) next.delete(p.photo_id)
                          else next.add(p.photo_id)
                          return next
                        })
                      }}
                    >
                      <img src={fileUrl(p.thumbnail_url)} alt={p.filename} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                      <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span className="hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.from}</span>
                        <input type="checkbox" checked={checked} disabled={staged} readOnly />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" className="btn secondary" onClick={() => setPickerOpen(false)}>Close</button>
              <GoldButton size="sm" loading={busy} disabled={picked.size === 0} onClick={handleStagePicked}>
                Stage {picked.size} photo{picked.size === 1 ? '' : 's'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
