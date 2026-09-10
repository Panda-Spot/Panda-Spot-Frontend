// Session activity tracking for the idle auto-logout feature.
//
// Default (non-remember-me) sessions die after 24 hours with no user
// interaction. Only genuine DOM interaction counts as activity — background
// API polling (notifications, analytics) deliberately does NOT reset the
// timer, otherwise idle logout would never fire.
//
// The last-active timestamp is mirrored to localStorage so multiple open
// tabs share one idle clock: working in tab A keeps tab B logged in too.
// (Only a timestamp is shared — never the token itself.)

export const IDLE_TIMEOUT_MS = (() => {
  // QA override: set VITE_IDLE_TIMEOUT_MINUTES=1 in .env to verify the
  // idle logout in a minute instead of waiting 24 hours. Production default: 24h.
  const override = Number(import.meta.env?.VITE_IDLE_TIMEOUT_MINUTES)
  return Number.isFinite(override) && override > 0 ? override * 60 * 1000 : 24 * 60 * 60 * 1000
})()
export const SESSION_CHECK_INTERVAL_MS = 30 * 1000 // re-evaluate every 30s
export const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000 // renew token when <10 min left
export const ACTIVITY_WRITE_THROTTLE_MS = 5 * 1000 // persist at most every 5s

const LAST_ACTIVE_KEY = "pandaspot_last_active"

let memoryLastActive = 0
let lastPersistedAt = 0

function readSharedLastActive() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY)
    const n = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

/// Call on genuine user interaction (pointer, keys, scroll, touch).
export function recordActivity() {
  const now = Date.now()
  memoryLastActive = now
  // Throttle the cross-tab write — interaction handlers fire constantly.
  if (now - lastPersistedAt < ACTIVITY_WRITE_THROTTLE_MS) return
  lastPersistedAt = now
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(now))
  } catch {
    // private mode — in-memory value still covers this tab
  }
}

/// Most recent activity across this tab and every other open tab.
/// Returns 0 when nothing has been recorded yet (caller treats as "now").
export function getLastActivity() {
  return Math.max(memoryLastActive, readSharedLastActive())
}

/// Seed the clock (login, boot with a live session) without waiting for
/// the first interaction event.
export function seedActivity() {
  memoryLastActive = Date.now()
  lastPersistedAt = 0
  recordActivity()
}
