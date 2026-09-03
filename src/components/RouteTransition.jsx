import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const BLADE_COUNT = 10
const CLOSE_MS = 300
const OPEN_MS = 340

function blades(openAmount) {
  const items = []
  for (let i = 0; i < BLADE_COUNT; i++) {
    const angle = (360 / BLADE_COUNT) * i
    items.push(
      <div
        key={i}
        className="route-shutter-blade"
        style={{ transform: `rotate(${angle}deg) translateY(${-openAmount * 75}%)` }}
      />
    )
  }
  return items
}

/**
 * MERGE (Studio-Verse merge, Phase 16 — new design system, MERGE_PLAN.md
 * D4): the app-wide page-transition effect — on every route change, the
 * screen closes to black behind a camera-iris shutter, then the shutter
 * opens to reveal the new page underneath (which React Router has
 * already swapped in by then, just hidden under the overlay). Mounted
 * once at the top of App.jsx so it fires for every navigation in the
 * whole product, not just one page. Distinct from CameraShutter.jsx's
 * `reveal` mode, which is a one-time first-paint effect for a single
 * page (GuestEvent.jsx) — this one re-fires on every route change and
 * drives its own compressed timing (closing 300ms, opening 340ms) rather
 * than that component's slower one-shot reveal.
 */
export default function RouteTransition() {
  const location = useLocation()
  const isFirstRender = useRef(true)
  const prevKey = useRef(location.key)
  const timeouts = useRef([])
  const [phase, setPhase] = useState('idle') // idle | closing | opening
  const [openAmount, setOpenAmount] = useState(1)

  useEffect(() => {
    // Never play on initial page load — only on an actual navigation
    // between two already-loaded routes.
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevKey.current = location.key
      return
    }
    if (location.key === prevKey.current) return
    prevKey.current = location.key

    timeouts.current.forEach(clearTimeout)
    timeouts.current = []

    setPhase('closing')
    setOpenAmount(1)
    // Next frame so the transition from 1 actually animates instead of
    // starting already-closed.
    const closeRaf = requestAnimationFrame(() => setOpenAmount(0))

    timeouts.current.push(
      setTimeout(() => {
        setPhase('opening')
        setOpenAmount(1)
      }, CLOSE_MS)
    )
    timeouts.current.push(setTimeout(() => setPhase('idle'), CLOSE_MS + OPEN_MS))

    return () => cancelAnimationFrame(closeRaf)
  }, [location.key])

  useEffect(() => () => timeouts.current.forEach(clearTimeout), [])

  if (phase === 'idle') return null

  return (
    <div className={`route-shutter-overlay route-shutter-${phase}`} aria-hidden="true">
      <div className="route-shutter-ring">{blades(openAmount)}</div>
    </div>
  )
}
