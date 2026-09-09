import { useCallback, useEffect, useRef, useState } from 'react'
import AnimatedLogo from './AnimatedLogo.jsx'

// Module flag — survives SPA navigation, resets on full page load.
// That is exactly "once per page load": opening the landing plays the
// splash, going Events → Gallery → back does not replay it.
let splashPlayed = false

function reduceMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/**
 * Full-screen opening splash for the landing page only: blank
 * background, logo choreography at center, then fade out into the
 * already-rendered page underneath. The page itself never waits — hero
 * and content mount and paint immediately behind the overlay.
 */
export default function LogoSplash() {
  const [show, setShow] = useState(() => {
    if (splashPlayed || reduceMotion()) {
      splashPlayed = true
      return false
    }
    return true
  })
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])

  useEffect(() => {
    if (!show) return undefined
    splashPlayed = true
    // Absolute fallback so a stalled asset can never trap the visitor.
    const fallback = setTimeout(() => {
      setLeaving(true)
      timers.current.push(setTimeout(() => setShow(false), 450))
    }, 4000)
    timers.current.push(fallback)
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [show])

  // Dismiss relative to the logo being ready: ~1.9s of choreography
  // visible, then a 0.45s fade into the page.
  const handleReady = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    timers.current.push(setTimeout(() => setLeaving(true), 1900))
    timers.current.push(setTimeout(() => setShow(false), 2350))
  }, [])

  if (!show) return null

  return (
    <div className={`logo-splash${leaving ? ' is-leaving' : ''}`} aria-hidden="true">
      <div className="logo-splash-logo">
        <AnimatedLogo variant="full" height="100%" onReady={handleReady} />
      </div>
    </div>
  )
}
