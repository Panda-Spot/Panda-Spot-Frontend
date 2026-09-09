import { useEffect, useState } from 'react'
import '../styles/logo-reveal.css'

const PLAYED_KEY = 'ps-logo-reveal'
const GREEN = '#4ADE80'
const INK = '#101318'

/**
 * PandaSpot layered logo reveal.
 *
 * Original vector artwork split into animatable layers so the reveal can
 * run as transform/opacity-only CSS (compositor thread, no layout work):
 *   panda → camera → lens (+glow) → focus brackets lock ("spotted" pulse)
 *   → PANDA → SPOT → tagline → tiny settle. ~2.3s, then fully static.
 *
 * - Plays once per tab session (sessionStorage flag); later mounts render
 *   the final state instantly.
 * - `prefers-reduced-motion` renders the final state instantly.
 * - Hover gives the lens a tiny 150ms green response, nothing more.
 * - `variant="nav"` drops the tagline for tight spaces (nav bar).
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

  const showTagline = variant !== 'nav'
  const viewBox = showTagline ? '0 0 440 352' : '0 0 440 312'

  return (
    <span
      className={`animated-logo${instant ? ' lr-instant' : ' lr-play'}${className ? ` ${className}` : ''}`}
      style={{ height }}
      role="img"
      aria-label="PandaSpot — Spot yourself. Get your photos."
    >
      <svg viewBox={viewBox} height={height} aria-hidden="true">
        <defs>
          <radialGradient id="lrLens" cx="38%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#BBF7D0" />
            <stop offset="45%" stopColor={GREEN} />
            <stop offset="100%" stopColor="#15803D" />
          </radialGradient>
          <linearGradient id="lrBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A2F3A" />
            <stop offset="100%" stopColor="#14171E" />
          </linearGradient>
        </defs>

        {/* Focus brackets — converge from outside, then lock */}
        <g className="lr-layer lr-bracket" style={{ '--dx': '-14px', '--dy': '-14px' }}>
          <path d="M136 14 H100 V50" fill="none" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
        </g>
        <g className="lr-layer lr-bracket" style={{ '--dx': '14px', '--dy': '-14px' }}>
          <path d="M304 14 H340 V50" fill="none" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
        </g>
        <g className="lr-layer lr-bracket" style={{ '--dx': '-14px', '--dy': '14px' }}>
          <path d="M136 248 H100 V212" fill="none" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
        </g>
        <g className="lr-layer lr-bracket" style={{ '--dx': '14px', '--dy': '14px' }}>
          <path d="M304 248 H340 V212" fill="none" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
        </g>

        {/* Panda — one settled group */}
        <g className="lr-layer lr-panda">
          <circle cx="152" cy="54" r="30" fill={INK} />
          <circle cx="288" cy="54" r="30" fill={INK} />
          <ellipse cx="220" cy="120" rx="78" ry="70" fill="#FFFFFF" />
          {/* left patch + wink */}
          <ellipse cx="188" cy="120" rx="24" ry="30" fill={INK} transform="rotate(-18 188 120)" />
          <path d="M176 122 Q188 132 200 122" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          {/* right patch + open eye */}
          <ellipse cx="252" cy="120" rx="24" ry="30" fill={INK} transform="rotate(18 252 120)" />
          <circle cx="252" cy="122" r="9" fill="#FFFFFF" />
          <circle cx="255" cy="119" r="3" fill={INK} />
          {/* nose + mouth */}
          <ellipse cx="220" cy="152" rx="9" ry="7" fill={INK} />
          <path d="M220 159 Q220 167 211 168 M220 159 Q220 167 229 168" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Camera */}
        <g className="lr-layer lr-camera">
          <rect x="200" y="156" width="40" height="18" rx="6" fill="#1F242E" />
          <rect x="148" y="168" width="144" height="66" rx="14" fill="url(#lrBody)" />
          <rect x="148" y="168" width="144" height="10" rx="5" fill="#FFFFFF" opacity="0.06" />
        </g>

        {/* Lens */}
        <g className="lr-layer lr-lens">
          <circle cx="220" cy="201" r="27" fill="#0B0E13" stroke="#343B48" strokeWidth="5" />
          <circle cx="220" cy="201" r="19" fill="#10151D" />
          <circle className="lr-lens-glass" cx="220" cy="201" r="12" fill="url(#lrLens)" />
          <circle className="lr-shine" cx="216" cy="196" r="3.4" fill="#FFFFFF" />
        </g>
        {/* one-shot glow, then gone */}
        <circle className="lr-layer lr-glow" cx="220" cy="201" r="12" fill="none" stroke={GREEN} strokeWidth="3" />

        {/* Wordmark — PANDA then SPOT, staggered but overlapping */}
        <text
          x="220"
          y="292"
          textAnchor="middle"
          fontFamily="'Space Grotesk', 'Inter', system-ui, sans-serif"
          fontWeight="800"
          fontSize="46"
          letterSpacing="2"
        >
          <tspan className="lr-layer lr-word-panda" fill="#FFFFFF">PANDA</tspan>
          <tspan className="lr-layer lr-word-spot" fill={GREEN} dx="6">SPOT</tspan>
        </text>

        {showTagline && (
          <text
            className="lr-layer lr-tagline"
            x="220"
            y="334"
            textAnchor="middle"
            fontFamily="'Inter', system-ui, sans-serif"
            fontWeight="500"
            fontSize="16"
            letterSpacing="0.5"
            fill="#9AA3B2"
          >
            Spot yourself. Get your photos.
          </text>
        )}
      </svg>
    </span>
  )
}
