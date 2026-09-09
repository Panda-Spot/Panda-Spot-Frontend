import { useEffect, useState } from 'react'
import '../styles/logo-reveal.css'

const PLAYED_KEY = 'ps-logo-reveal'

/**
 * PandaSpot opening logo reveal, built on the real brand asset
 * (`public/pandaspot-logo.svg`).
 *
 * The artwork itself is raster, so the choreography lives in the frame
 * around it — plain HTML + transform/opacity-only CSS (compositor
 * thread, no layout work):
 *   logo rises in → focus brackets converge and lock ("spotted" pulse)
 *   → tiny settle. ~1.7s, then fully static.
 *
 * - Space is reserved up front (fixed height) so nothing shifts.
 * - Plays once per tab session (sessionStorage flag); later mounts
 *   render the final state instantly.
 * - `prefers-reduced-motion` renders the final state instantly.
 * - Hover gives a tiny 150ms lift, nothing more.
 */
export default function AnimatedLogo({ variant = 'full', height = 52, className = '' }) {
  const [instant, setInstant] = useState(() => {
    try {
      return sessionStorage.getItem(PLAYED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(PLAYED_KEY, '1')
    } catch {
      /* storage unavailable — animation just replays next visit */
    }
  }, [])

  return (
    <span
      className={`animated-logo${instant ? ' lr-instant' : ' lr-play'}${className ? ` ${className}` : ''}`}
      style={{ height }}
      role="img"
      aria-label="PandaSpot — Spot yourself. Get your photos."
    >
      <img
        className="lr-photo"
        src="/pandaspot-logo.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <span className="lr-frame" aria-hidden="true">
        <i className="lr-c lr-tl" />
        <i className="lr-c lr-tr" />
        <i className="lr-c lr-bl" />
        <i className="lr-c lr-br" />
      </span>
      <span className="lr-pulse" aria-hidden="true" />
    </span>
  )
}
