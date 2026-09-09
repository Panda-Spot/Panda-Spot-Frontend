// Auth token storage, split by session class:
//
// - Remember-me sessions (7-day): token + metadata in localStorage, so the
//   login survives browser/tab restarts.
// - Default sessions (30-min idle logout): token + metadata in
//   sessionStorage, so closing the tab already ends the session.
//
// The auth token used to live unconditionally in localStorage; that legacy
// entry is still honoured (treated as remember-me, expiry read from the
// JWT itself) and normalises itself on the next login/refresh.
//
// The Bearer-token mechanism itself is unchanged — the frontend (Vercel)
// and API (VPS) are on entirely different domains, so an explicitly-sent
// Authorization header sidesteps third-party-cookie blocking that broke
// cookie sessions in Safari/Chrome.

const TOKEN_KEY = "pandaspot_token"
const SESSION_KEY = "pandaspot_session"

function storages() {
  const out = []
  try {
    out.push(sessionStorage)
  } catch {
    // storage unavailable (SSR/private mode) — callers degrade gracefully
  }
  try {
    out.push(localStorage)
  } catch {
    // ignore
  }
  return out
}

function readKey(key) {
  for (const s of storages()) {
    try {
      const v = s.getItem(key)
      if (v) return v
    } catch {
      // try the next storage
    }
  }
  return null
}

/// Best-effort expiry read straight from the JWT payload (no verification
/// — the server is the authority; this only drives client-side timers).
function decodeExpiryMs(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export const getToken = () => readKey(TOKEN_KEY)

/// { remember: boolean, expiresAt: ms epoch } | null. Falls back to the
/// JWT's own exp claim (legacy tokens stored before session metadata
/// existed), treating those as remember-me so old sessions aren't cut.
export function getSession() {
  const raw = readKey(SESSION_KEY)
  if (raw) {
    try {
      const s = JSON.parse(raw)
      if (s && typeof s.expiresAt === "number") {
        return { remember: s.remember === true, expiresAt: s.expiresAt }
      }
    } catch {
      // corrupt entry — fall through to the JWT-decode fallback
    }
  }
  const token = getToken()
  if (!token) return null
  const expiresAt = decodeExpiryMs(token)
  if (!expiresAt) return null
  return { remember: true, expiresAt }
}

function writeSession(storage, remember, expiresAt) {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify({ remember, expiresAt }))
  } catch {
    // private mode — timers degrade to server-side 401 handling
  }
}

function writeSessionToAll(remember, expiresAt) {
  for (const s of storages()) writeSession(s, remember, expiresAt)
}

function clearFromAll(key) {
  for (const s of storages()) {
    try {
      s.removeItem(key)
    } catch {
      // ignore
    }
  }
}

// Listen once per tab: when another tab logs out, this tab's storages
// are already cleared by clearFromAll(), and auth.jsx's idle watchdog
// will bounce the user — but for same-origin tabs that still have the
// token in localStorage while sessionStorage is empty, mirror it so the
// new tab's boot can read the current session without forcing re-login.
// (Without this, a non-remembered "default" session that lives in
// sessionStorage in tab A would be invisible to a fresh tab B.)
function mirrorTokenForNewTab(token, remember, expiresAt) {
  // Token is already in `target` above; also ensure it's in whichever of
  // the two storages isn't `target`, so a new tab's readKey(storages())
  // can find it before it has ever gotten its own copy.
  for (const s of storages()) {
    try {
      if (!s.getItem(TOKEN_KEY)) s.setItem(TOKEN_KEY, token)
    } catch {
      // storage unavailable — nothing to mirror
    }
  }
  // If this is the short-lived (non-remember) session class, also plant
  // its session metadata in localStorage so the new tab's getSession()
  // doesn't fall through to the legacy-JWT fallback and mis-store the
  // next refresh in a different bucket, breaking the trim loop.
  if (!remember) {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ remember, expiresAt }))
      }
    } catch {
      // storage unavailable
    }
  }
}

export function setToken(token, { remember = false, expiresIn = null } = {}) {
  if (!token) return
  clearFromAll(TOKEN_KEY)
  clearFromAll(SESSION_KEY)
  let target = null
  try {
    target = remember ? localStorage : sessionStorage
  } catch {
    target = null
  }
  if (!target) {
    try {
      target = localStorage
    } catch {
      return
    }
  }
  try {
    target.setItem(TOKEN_KEY, token)
  } catch {
    return
  }
  const expiresAt =
    typeof expiresIn === "number"
      ? Date.now() + expiresIn * 1000
      : decodeExpiryMs(token) || Date.now() + 30 * 60 * 1000
  writeSession(target, remember, expiresAt)
  mirrorTokenForNewTab(token, remember, expiresAt)
}

/// Applies a POST /auth/refresh response: swaps the token and pushes the
/// absolute-expiry timer out, keeping the original session class. The
/// same mirroring as setToken applies — refresh happens in the active
/// tab but the new token must be visible to sibling tabs too.
export function updateTokenFromRefresh(token, expiresIn) {
  const prev = getSession()
  setToken(token, { remember: prev?.remember === true, expiresIn })
  // New tabs that boot off the stale localStorage copy would 401 and
  // bounce — proactively align both storages here.
  writeSessionToAll(prev?.remember === true, typeof expiresIn === "number" ? Date.now() + expiresIn * 1000 : decodeExpiryMs(token) || Date.now() + 30 * 60 * 1000)
  // Token itself is already in both (setToken's mirroring) — keep them
  // in lockstep in case a race overwrote the other tab's localStorage
  // between the two writes above.
  for (const s of storages()) {
    try {
      s.setItem(TOKEN_KEY, token)
    } catch {
      // storage unavailable
    }
  }
}

export const clearToken = () => {
  clearFromAll(TOKEN_KEY)
  clearFromAll(SESSION_KEY)
}
