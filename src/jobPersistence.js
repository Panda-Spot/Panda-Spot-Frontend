// Remembers the currently-running upload/import job for an event so that
// closing the browser or reloading the page doesn't lose track of it — the
// job itself keeps running server-side regardless (see server's
// lib/jobQueue.js), reopening the event page just needs to know which
// job id to reconnect its SSE stream to. Best-effort: storage being
// unavailable (private browsing, etc.) just means the job isn't resumable
// after a reload, not a hard failure.

const keyFor = (eventId) => `pandaspot_active_job_${eventId}`

export function saveActiveJob(eventId, jobId) {
  try {
    localStorage.setItem(keyFor(eventId), jobId)
  } catch {
    // ignore — resuming after reload just won't work this time
  }
}

export function getActiveJob(eventId) {
  try {
    return localStorage.getItem(keyFor(eventId))
  } catch {
    return null
  }
}

export function clearActiveJob(eventId) {
  try {
    localStorage.removeItem(keyFor(eventId))
  } catch {
    // ignore
  }
}
