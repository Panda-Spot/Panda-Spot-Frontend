import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, CheckCircle2, AlertCircle, Loader2, Clock, MinusCircle } from 'lucide-react'

// One row per file the photographer selected, beneath the overall bar —
// lets them see exactly which photo is being uploaded vs. processed vs.
// done, instead of trusting a single combined percentage. Rows are
// stable across re-renders (keyed by id) so progress bar fills animate
// smoothly without re-mounting.
//
// `files` shape: [{ id, name, size, status, percent, facesFound, reason }]
//   status: 'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'skipped'
//   percent: 0-100 — the fill width for this row
//
// Scroll contract (the important part): the list NEVER yanks the user's
// scroll position on progress ticks. Live rows are partitioned to the
// top so uploading photos stay visible, and the tail is followed only
// while the user is deliberately parked at the bottom (chat-log
// behaviour). A "jump to active" pill appears when live work is above
// the viewport.
export default function FileProgressList({ files }) {
  const scrollRef = useRef(null)
  const stickRef = useRef(false)
  const [showJump, setShowJump] = useState(false)

  // Stable partition: live rows first, then queued, then finished.
  // Within a group the insertion order is preserved, so a row moves at
  // most twice in its lifetime (queued → live → finished) instead of
  // jittering on every tick.
  const ordered = useMemo(() => {
    const rank = (s) => (s === 'uploading' || s === 'processing' ? 0 : s === 'queued' ? 1 : 2)
    return [...(files || [])].sort((a, b) => rank(a.status) - rank(b.status))
  }, [files])

  const activeCount = useMemo(
    () => (files || []).filter((f) => f.status === 'uploading' || f.status === 'processing').length,
    [files]
  )

  // Follow the tail only while the user is parked at the bottom. The
  // `files` array is a new identity on every progress tick, but this is
  // a no-op unless sticky-follow is engaged — scrolling stays put.
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [files])

  const onListScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    stickRef.current = nearBottom
    setShowJump(activeCount > 0 && el.scrollTop > 120)
  }

  // Re-evaluate the pill when live work starts/stops even if the user
  // isn't scrolling (progress ticks don't fire scroll events).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setShowJump(activeCount > 0 && el.scrollTop > 120)
  }, [activeCount])

  const jumpToActive = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = 0
    setShowJump(false)
  }

  if (!files || files.length === 0) return null

  const done = files.filter((f) => f.status === 'done').length
  const errors = files.filter((f) => f.status === 'error' || f.status === 'skipped').length
  const total = files.length
  const summary =
    done === total && total > 0
      ? `All ${total} file${total === 1 ? '' : 's'} processed`
      : `${done} of ${total} done${errors > 0 ? ` · ${errors} skipped/failed` : ''}`

  return (
    <div className="card file-progress-card">
      <div className="file-progress-summary">{summary}</div>
      {showJump && (
        <button type="button" className="file-progress-jump" onClick={jumpToActive}>
          <ArrowUp size={13} />
          <span>{activeCount} uploading — back to top</span>
        </button>
      )}
      <div className="file-progress-list" ref={scrollRef} onScroll={onListScroll}>
        {ordered.map((f) => (
          <FileRow key={f.id} file={f} />
        ))}
      </div>
    </div>
  )
}

function FileRow({ file }) {
  const { name, size, status, percent = 0, facesFound, reason } = file
  const StatusIcon = (() => {
    switch (status) {
      case 'done':
        return CheckCircle2
      case 'error':
      case 'skipped':
        return status === 'skipped' ? MinusCircle : AlertCircle
      case 'uploading':
      case 'processing':
        return Loader2
      default:
        return Clock
    }
  })()
  const fillPercent = Math.max(0, Math.min(100, Math.round(percent)))
  // For the 'uploading' phase, the backend hasn't taken over yet, so we
  // show a smooth percentage of bytes sent. For 'processing' (server
  // face-indexing) the progress is binary — show a moving indeterminate
  // stripe by mapping a 0..100 range that pulses. For 'done' it's 100.
  return (
    <div className={`file-progress-row file-progress-row-${status}`}>
      <div className="file-progress-row-head">
        <StatusIcon
          size={14}
          className={
            status === 'uploading' || status === 'processing' ? 'file-progress-icon-spin' : ''
          }
        />
        <span className="file-progress-name" title={name}>
          {name}
        </span>
        <span className="file-progress-size">{formatSize(size)}</span>
        <span className="file-progress-status">
          {statusLabel(status, percent, facesFound, reason)}
        </span>
      </div>
      <div className="file-progress-bar">
        <div
          className="file-progress-bar-fill"
          style={{
            width:
              status === 'done'
                ? '100%'
                : status === 'error' || status === 'skipped'
                ? '0%'
                : status === 'processing'
                ? '100%'
                : `${fillPercent}%`,
          }}
        />
      </div>
    </div>
  )
}

function statusLabel(status, percent, facesFound, reason) {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'uploading':
      return `Uploading ${Math.round(percent)}%`
    case 'processing':
      return 'Processing…'
    case 'done':
      return facesFound != null
        ? `Done · ${facesFound} face${facesFound === 1 ? '' : 's'}`
        : 'Done'
    case 'error':
      return reason ? `Failed — ${reason}` : 'Failed'
    case 'skipped':
      return reason ? `Skipped — ${reason}` : 'Skipped'
    default:
      return ''
  }
}

function formatSize(bytes) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
