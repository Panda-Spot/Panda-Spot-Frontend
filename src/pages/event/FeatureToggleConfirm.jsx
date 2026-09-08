import { useEffect, useState } from 'react'
import { AlertTriangle, Lock, Power } from 'lucide-react'
import Modal from '../../components/Modal.jsx'

// Consequences copy per feature key, per direction.
const COPY = {
  faceSearch: {
    on: 'Guests will be able to find their own photos with a selfie. Photos become searchable only after you add them to AI Search.',
    off: 'The AI Face Search workspace hides immediately and guests lose selfie search. Indexed face data is kept (nothing is deleted) and returns if you turn it back on.',
  },
  photoSelection: {
    on: 'Clients can be invited to log in, browse, favourite, and submit picks.',
    off: 'Photo Selection hides immediately and clients lose access. Picks, favourites, and client accounts are kept (nothing is deleted).',
  },
  pandashoots: {
    on: 'Camera-to-cloud capture becomes available in Photos & Imports — set up FTP credentials to start.',
    off: 'PandaShoots setup hides and connected cameras stop ingesting. Photos already captured stay in the gallery.',
  },
  advancedTools: {
    on: 'Sharpness, Faces, Min rating, Color tag, and Duplicates filters appear on Photos & Imports (needs analyzed photos to match anything).',
    off: 'The tool filters hide from Photos & Imports. Analysis data is kept.',
  },
  subGalleries: {
    on: 'You can split this event into sub-galleries like Ceremony / Reception, with a picker on the guest link.',
    off: 'The sub-galleries section and the guest picker hide everywhere. Existing sub-galleries and their photos are kept.',
  },
}

// Confirmation for feature toggles. Turning ON is a plain confirm.
// Turning OFF is owner-only (server enforces too) and additionally requires
// typing the event name. Collaborators attempting an OFF get a locked
// explanation instead of an action.
export default function FeatureToggleConfirm({ pending, eventName, isOwner, busy, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (pending) setTyped('')
  }, [pending])

  if (!pending) return null
  const { key, title, enable } = pending
  const copy = (COPY[key] || { on: '', off: '' })[enable ? 'on' : 'off']

  if (!enable && !isOwner) {
    return (
      <Modal open onClose={onCancel} title={`Turn off ${title}`}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Lock size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
          <p className="hint" style={{ margin: 0, lineHeight: 1.6 }}>
            Only the event owner can turn this feature off. Your workspace access stays exactly as it is —
            ask the owner if this needs to change.
          </p>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </Modal>
    )
  }

  const matches = typed.trim() === (eventName || '').trim() && eventName

  return (
    <Modal open onClose={onCancel} title={`${enable ? 'Turn on' : 'Turn off'} ${title}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '14px', borderRadius: 10,
          background: enable ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.04)',
          border: `1px solid ${enable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {enable
              ? <Power size={16} style={{ color: '#22C55E' }} />
              : <AlertTriangle size={16} style={{ color: '#EF4444' }} />}
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {enable ? 'This will go live immediately' : 'This cannot be undone by collaborators'}
            </span>
          </div>
          <p className="hint" style={{ margin: 0, lineHeight: 1.5 }}>{copy}</p>
        </div>
        {!enable && (
          <div>
            <label className="field-label" htmlFor="feature-off-confirm">
              Type <strong>{eventName}</strong> to confirm
            </label>
            <input
              id="feature-off-confirm"
              className="text-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={eventName}
              autoComplete="off"
            />
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn"
            type="button"
            disabled={busy || (!enable && !matches)}
            onClick={onConfirm}
          >
            {busy ? 'Saving…' : enable ? `Turn on ${title}` : `Turn off ${title}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
