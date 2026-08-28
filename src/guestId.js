// Persists a per-browser guest client id so repeat visits to a guest event
// page can be recognized by the API (e.g. for feedback/threshold tuning)
// without any account or auth.
const STORAGE_KEY = 'pandaspot_guest_id'

export function getGuestClientId() {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

// Remembers the display name a guest types when leaving a comment, so they
// don't have to re-type it on every comment within the same browser.
const NAME_STORAGE_KEY = 'pandaspot_guest_name'

export function getGuestName() {
  return localStorage.getItem(NAME_STORAGE_KEY) || ''
}

export function setGuestName(name) {
  if (name) localStorage.setItem(NAME_STORAGE_KEY, name)
}
