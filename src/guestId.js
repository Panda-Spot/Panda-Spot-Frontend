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
