import { AlertTriangle, Camera, Clock, Lock } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import Modal from '../../components/Modal.jsx'

// Shared start-event confirmation, mounted once in EventWorkspace so every
// Start button across the event pages opens this same popup. Starting is
// irreversible and starts the retention / data-deletion countdown from that
// moment — the modal says so explicitly, and advises starting only when
// photos are actually ready to upload, import, or capture.
export default function StartEventConfirm() {
  const { showStartConfirm, setShowStartConfirm, handleStartEvent, startingEvent } = useEvent()

  return (
    <Modal open={showStartConfirm} onClose={() => setShowStartConfirm(false)} title="Start event">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '14px', borderRadius: 10,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Once started, the event cannot be stopped</span>
          </div>
          <p className="hint" style={{ margin: 0, lineHeight: 1.5 }}>
            Starting unlocks uploads, imports, and live features. There is no way to pause or reverse this.
          </p>
        </div>
        <div style={{
          padding: '14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Clock size={16} style={{ color: '#EF4444' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Retention period begins now</span>
          </div>
          <p className="hint" style={{ margin: 0, lineHeight: 1.5 }}>
            The event&apos;s 90-day guest access window and photo retention countdown start from this moment —
            guest data-deletion eligibility is counted from the start time too. After expiry, guest search and
            downloads are automatically closed.
          </p>
        </div>
        <div style={{
          padding: '14px', borderRadius: 10,
          background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Camera size={16} style={{ color: '#22C55E' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Start only when your photos are ready</span>
          </div>
          <p className="hint" style={{ margin: 0, lineHeight: 1.5 }}>
            Start the event only when photos are ready to upload, import from Google Drive, or capture with
            PandaShoots.
          </p>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button className="btn secondary" type="button" onClick={() => setShowStartConfirm(false)}>
            Cancel
          </button>
          <button
            className="btn"
            type="button"
            disabled={startingEvent}
            onClick={() => { setShowStartConfirm(false); handleStartEvent() }}
          >
            <Lock size={14} /> {startingEvent ? 'Starting…' : 'Start event'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
