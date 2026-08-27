import { useEffect, useRef } from 'react'

// A scrolling step log for a background job (upload / Drive import / Drive
// sync) plus a percentage bar — reused across every job kind on the event
// page since they all emit the same progress event shape. Renders nothing
// once there's neither an active job nor any lines left to show, so it
// naturally disappears after a completed job's lines are cleared.
export default function JobProgressLog({ lines, progress }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  if (lines.length === 0) return null

  const pct = progress?.total ? Math.round((progress.completed / progress.total) * 100) : null

  return (
    <div className="card job-progress-card">
      {pct != null && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="job-log" ref={scrollRef}>
        {lines.map((line, i) => (
          <div key={i} className="job-log-line">{line}</div>
        ))}
      </div>
    </div>
  )
}
