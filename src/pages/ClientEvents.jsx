import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { listClientEvents } from '../api.js'
import EventFolderGrid from '../components/gallery/EventFolderGrid.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'

// A USER-role client's landing page — every event a studio granted them.
// Exactly one accessible event auto-opens; otherwise a folder-grid picker
// (with lock overlays for revoked/expired/archived grants) chooses first.
export default function ClientEvents() {
  const navigate = useNavigate()
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listClientEvents().then(setEvents).catch((e) => setError(e.message))
  }, [])

  const accessible = (events || []).filter((e) => e.accessible !== false)

  useEffect(() => {
    if (events && accessible.length === 1) {
      navigate(`/client/${accessible[0].event_id}`, { replace: true })
    }
  }, [events]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="error">{error}</p>
  if (!events) {
    return (
      <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MiniLoader size={22} /> Loading your events…
      </p>
    )
  }

  if (events.length === 0) {
    return (
      <div className="py-24 text-center">
        <Camera size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] animate-float" />
        <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No events assigned</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Your studio hasn&apos;t added you to any events yet.</p>
      </div>
    )
  }

  if (accessible.length === 1) {
    return (
      <div className="space-y-4">
        <SkeletonLoader type="card" count={1} />
      </div>
    )
  }

  return (
    <EventFolderGrid events={events} onOpen={(id) => navigate(`/client/${id}`)} />
  )
}
