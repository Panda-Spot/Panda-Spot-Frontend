import { useEffect, useState } from 'react'
import '../styles/logo-reveal.css'

// Module flag — survives SPA navigation, resets on full page load.
// That is exactly "once per page load": opening the landing plays the
// reveal, going Events → Gallery → back does not replay it.
let played = false

const GREEN = '#4ADE80'
const INK = '#101318'

/**
 * PandaSpot hero logo reveal — one visual sentence:
 *   focus → panda found → lens focuses → capture → PANDASPOT → tagline.
 *
 * Layered inline SVG + HTML wordmark, transform/opacity-only CSS
 * (translate3d, compositor thread — no layout properties animated).
 * ~2.1s, then fully static. The page underneath renders immediately;
 * this never blocks content.
 */
export default function LogoReveal({ className = '' }) {
  const [play, setPlay] = useState(() => {
    if (played) return false
    try {
      return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    } catch {
      return true
    }
  })

  // Mark played once the timeline has had time to finish. StrictMode
  // double-mount is safe: the timer is cleared on unmount before it can
  // fire, so dev remounts still play.
  useEffect(() => {
    if (!play) return undefined
    const t = setTimeout(() => {
      played = true
    }, 2200)
    return () => clearTimeout(t)
  }, [play])

  return (
    <div
      className={`logo-reveal${play ? ' lr-play' : ' lr-done'}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="PandaSpot — Spot yourself. Get your photos."
    >
      <svg className="lr-mark" viewBox="0 0 360 250" aria-hidden="true">
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

        {/* LAYER 1 — focus brackets */}
        <g className="lr-brackets" fill="none" stroke={GREEN} strokeWidth="9" strokeLinecap="round">
          <path d="M92 14 H62 V44" />
          <path d="M268 14 H298 V44" />
          <path d="M92 196 H62 V166" />
          <path d="M268 196 H298 V166" />
        </g>

        {/* LAYER 2 — panda + camera, one settled group */}
        <g className="lr-panda">
          <circle cx="132" cy="52" r="24" fill={INK} />
          <circle cx="228" cy="52" r="24" fill={INK} />
          <ellipse cx="180" cy="112" rx="68" ry="60" fill="#FFFFFF" />
          <ellipse cx="152" cy="110" rx="18" ry="24" fill={INK} transform="rotate(-15 152 110)" />
          <ellipse cx="208" cy="110" rx="18" ry="24" fill={INK} transform="rotate(15 208 110)" />
          <circle cx="152" cy="112" r="7.5" fill="#FFFFFF" />
          <circle cx="208" cy="112" r="7.5" fill="#FFFFFF" />
          <circle cx="154" cy="110" r="2.6" fill={INK} />
          <circle cx="210" cy="110" r="2.6" fill={INK} />
          <circle cx="211" cy="108" r="1.2" fill="#FFFFFF" />
          <ellipse cx="180" cy="142" rx="8" ry="6.5" fill={INK} />
          <path
            d="M180 148 Q180 156 172 156 M180 148 Q180 156 188 156"
            fill="none"
            stroke={INK}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <ellipse cx="128" cy="178" rx="16" ry="20" fill={INK} transform="rotate(20 128 178)" />
          <ellipse cx="232" cy="178" rx="16" ry="20" fill={INK} transform="rotate(-20 232 178)" />
          <rect x="162" y="150" width="36" height="14" rx="5" fill="#232936" />
          <rect x="118" y="160" width="124" height="58" rx="13" fill="url(#lrBody)" />
          <rect x="118" y="160" width="124" height="9" rx="4.5" fill="#FFFFFF" opacity="0.06" />
        </g>

        {/* LAYER 3 — lens: dark state cross-fades to green, ring expands */}
        <g className="lr-lens">
          <circle cx="180" cy="189" r="24" fill="#0B0E13" stroke="#343B48" strokeWidth="4.5" />
          <circle cx="180" cy="189" r="17" fill="#10151D" />
          <circle className="lr-lens-off" cx="180" cy="189" r="11" fill="#171B22" />
          <circle className="lr-lens-on" cx="180" cy="189" r="11" fill="url(#lrLens)" />
          <circle className="lr-ring" cx="180" cy="189" r="11" fill="none" stroke={GREEN} strokeWidth="2.5" />
          <rect className="lr-glint" x="171" y="182" width="18" height="4" rx="2" fill="#FFFFFF" transform="rotate(-24 180 184)" />
        </g>

        {/* capture flash — 60-80ms, then gone */}
        <circle className="lr-flash" cx="180" cy="120" r="110" fill="#FFFFFF" />
      </svg>

      {/* LAYER 4 — wordmark, mask reveal (outer clips, inner rises) */}
      <div className="lr-wordmark" aria-hidden="true">
        <div className="lr-wordmark-in">
          <span className="lr-wp">PANDA</span>
          <span className="lr-ws">SPOT</span>
        </div>
      </div>

      {/* LAYER 5 — tagline, calm fade */}
      <div className="lr-tagline" aria-hidden="true">
        Spot yourself. Get your photos.
      </div>
    </div>
  )
}
