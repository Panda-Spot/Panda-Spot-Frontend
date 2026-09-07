import confetti from 'canvas-confetti'

// Brand palette for celebration pops — teal primary, gold secondary.
const BRAND_COLORS = ['#0e8a8a', '#F59E0B', '#FDE68A', '#14b8a6', '#ffffff']

let lastBlastAt = 0
const MIN_GAP_MS = 900 // never stack blasts — keeps it smooth, one at a time

function allowed() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  const now = Date.now()
  if (now - lastBlastAt < MIN_GAP_MS) return false
  lastBlastAt = now
  return true
}

// Big moment: trial welcome, selection submitted, album approved, contract signed.
export function celebrate(options = {}) {
  if (!allowed()) return
  confetti({
    particleCount: 130,
    spread: 80,
    startVelocity: 42,
    ticks: 220,
    gravity: 0.9,
    scalar: 1,
    origin: { y: 0.25 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
    ...options,
  })
}

// Small moment: event created, upload finished, invite accepted, form sent.
export function pop(options = {}) {
  if (!allowed()) return
  confetti({
    particleCount: 55,
    spread: 60,
    startVelocity: 32,
    ticks: 160,
    gravity: 1,
    scalar: 0.85,
    origin: { y: 0.35 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
    ...options,
  })
}
