import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, MapPin, Undo2 } from 'lucide-react'
import {
  approveAlbum,
  deleteClientAlbumComment,
  getClientAlbum,
  postClientAlbumComment,
  requestAlbumChanges,
} from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import { useAuth } from '../auth.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import AlbumFlipbook from '../components/AlbumFlipbook.jsx'
import AlbumComments from '../components/AlbumComments.jsx'
import { ALBUM_STATUS_META } from '../components/albumMeta.js'

// Client album review (Phase 23): flip through sent versions, drop pins /
// reply in threads, then request changes (optional note) or approve —
// approval locks the album. Drafts never appear here (API 404s them).
export default function ClientAlbum() {
  const { eventId, albumId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [album, setAlbum] = useState(null)
  const [error, setError] = useState('')
  const [versionId, setVersionId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [pendingPin, setPendingPin] = useState(null)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const [changeNote, setChangeNote] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const a = await getClientAlbum(eventId, albumId)
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

  if (error && !album) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <h2 className="font-display text-2xl mb-2">Album unavailable</h2>
        <p className="max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <Link className="btn secondary" to={`/client/${eventId}`}>Back to gallery</Link>
      </div>
    )
  }
  if (!album) return <p className="hint">Loading album…</p>

  const locked = album.status === 'APPROVED'
  const version = album.versions.find((v) => v.id === versionId) || null
  const versionComments = (album.comments || []).filter((c) => !version || c.version_id === version.id)
  const pageNumberOf = (pid) => version?.pages.find((p) => p.page_id === pid)?.page_number
  const meta = ALBUM_STATUS_META[album.status] || ALBUM_STATUS_META.DRAFT

  const postComment = async (payload) => {
    setBusy(true)
    try {
      await postClientAlbumComment(eventId, albumId, { versionId: version.id, ...payload })
      setPendingPin(null)
      setPlacing(false)
      await load()
    } catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const handleRequestChanges = async () => {
    setBusy(true)
    try {
      await requestAlbumChanges(eventId, albumId, changeNote.trim())
      setChangeNote('')
      setChangeOpen(false)
      await load()
      showToast('Changes requested — the studio has been notified')
    } catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  const handleApprove = async () => {
    const openPins = versionComments.filter((c) => c.pin_number != null && !c.resolved_at).length
    const ok = await confirm(
      openPins > 0
        ? `Approve this album with ${openPins} unresolved pin${openPins === 1 ? '' : 's'}? Approval locks the album.`
        : 'Approve this album? Approval locks it — no further changes.',
      { title: 'Approve album?', confirmLabel: 'Approve' }
    )
    if (!ok) return
    setBusy(true)
    try {
      await approveAlbum(eventId, albumId)
      await load()
      showToast('Album approved!')
    } catch (e) { showToast(e.message, { type: 'error' }) } finally { setBusy(false) }
  }

  return (
    <div>
      <Link className="back-link" to={`/client/${eventId}`}><ArrowLeft size={13} style={{ display: 'inline' }} /> Back to gallery</Link>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0 }}>{album.name}</h1>
          <span className="hint" style={{ border: `1px solid ${meta.color}`, color: meta.color, borderRadius: 999, padding: '2px 10px', fontWeight: 700 }}>
            {meta.label}
          </span>
        </div>
        {!locked && album.status === 'SENT' && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => setChangeOpen((v) => !v)}>
              <Undo2 size={13} /> Request changes
            </button>
            <GoldButton size="sm" icon={<CheckCircle2 size={13} />} loading={busy} onClick={handleApprove}>
              Approve album
            </GoldButton>
          </div>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {locked && (
        <div className="px-4 py-2.5 flex items-center gap-3 rounded-lg mb-4" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginTop: 10 }}>
          <CheckCircle2 size={14} style={{ color: '#34D399', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#34D399' }}>You approved this album — it&apos;s locked for print.</p>
        </div>
      )}

      {changeOpen && !locked && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="guest-link-label">What should the studio change?</div>
          <div className="row" style={{ gap: 6 }}>
            <input
              className="text-input" style={{ flex: 1 }}
              placeholder="e.g. swap spread 2, warmer tones… (optional)"
              value={changeNote} onChange={(e) => setChangeNote(e.target.value)} maxLength={500}
            />
            <button type="button" className="btn" disabled={busy} onClick={handleRequestChanges}>
              Send request
            </button>
          </div>
        </div>
      )}

      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 12, marginBottom: 10 }}>
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
        {version?.note && <span className="hint">Studio note: {version.note}</span>}
      </div>

      {version && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 4fr)', gap: 12, alignItems: 'start' }} className="album-workspace-grid">
          <div>
            {!locked && !version.print_pdf_url && (
              <div className="row" style={{ marginBottom: 8 }}>
                <button
                  type="button" className={placing ? 'btn' : 'btn secondary'}
                  onClick={() => { setPlacing((p) => !p); setPendingPin(null) }}
                >
                  <MapPin size={13} /> {placing ? 'Placing… (click spread)' : 'Drop a pin'}
                </button>
              </div>
            )}
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
              busy={busy}
              currentUserId={user?.id || null}
              onDeleteComment={async (id) => {
                try { await deleteClientAlbumComment(eventId, albumId, id); await load() } catch (e) { showToast(e.message, { type: 'error' }) }
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
    </div>
  )
}
