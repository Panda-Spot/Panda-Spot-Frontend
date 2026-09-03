import { useEffect, useState } from 'react'

/**
 * MERGE (Studio-Verse merge, Phase 16 — new design system, MERGE_PLAN.md
 * D4): the product's signature motif — an animated camera-iris shutter
 * (a ring of trapezoidal blades around a center circle, like a real
 * aperture diaphragm) that opens and closes. Deliberately NOT Studio-
 * Verse's top-to-bottom/side blade transition — the user explicitly
 * asked for "the original camera circle and center shutter thing"
 * instead.
 *
 * Three uses:
 *  - default (`spin`) — a lightweight loading-spinner replacement: the
 *    blades stay in a continuous slow rotation.
 *  - `reveal` — plays the iris opening exactly once (closed -> fully
 *    open) then stays open, calling `onOpened` when done. Meant for a
 *    page's first paint (see GuestEvent.jsx) — "the shutter opens,
 *    welcome" — not a spinner.
 *  - `mark` — static, half-open, no animation at all. The brand mark
 *    itself (see AuthLayout in App.jsx) — a perpetually-spinning icon
 *    next to a static wordmark reads as broken, not as a logo.
 */
const BLADE_COUNT = 8

function blades(openAmount) {
  // Each blade is a triangle from the center out to the rim, rotated
  // evenly around the circle. `openAmount` (0..1) scales how far each
  // blade retracts toward the rim — 0 fully closed (blades meet at the
  // center, hiding it), 1 fully open (blades pulled back to the edge).
  const items = []
  for (let i = 0; i < BLADE_COUNT; i++) {
    const angle = (360 / BLADE_COUNT) * i
    items.push(
      <div
        key={i}
        className="camera-shutter-blade"
        style={{ transform: `rotate(${angle}deg) translateY(${-4 - openAmount * 46}%)` }}
      />
    )
  }
  return items
}

export default function CameraShutter({ size = 'sm', reveal = false, mark = false, onOpened, className = '' }) {
  // Spinner mode: blades sit at a fixed half-open position and the whole
  // ring slowly rotates via CSS animation. Reveal mode: React drives
  // openAmount from 0 -> 1 once, then holds. Mark mode: fixed half-open,
  // no animation class at all (see this component's own doc comment).
  const [openAmount, setOpenAmount] = useState(reveal ? 0 : 0.5)

  useEffect(() => {
    if (!reveal) return
    const raf = requestAnimationFrame(() => setOpenAmount(1))
    const timeout = setTimeout(() => onOpened?.(), 620)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
  }, [reveal, onOpened])

  const mode = reveal ? 'camera-shutter-reveal' : mark ? 'camera-shutter-mark' : 'camera-shutter-spin'

  return (
    <div className={`camera-shutter camera-shutter-${size} ${mode} ${className}`}>
      <div className="camera-shutter-ring">{blades(openAmount)}</div>
      <div className="camera-shutter-lens" />
    </div>
  )
}
