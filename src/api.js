const BASE_URL = import.meta.env.VITE_API_URL || "https://git-pipeline.metatronhost.in/panda-spot"

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.detail || body.message || body.error || message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

export const fileUrl = (path) => `${BASE_URL}${path}`

// --- Auth ---

export const register = (email, password, name) =>
  request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  })

export const login = (email, password) =>
  request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

export const logout = () => request("/auth/logout", { method: "POST" })

export const getMe = () => request("/auth/me")

export const requestEmailVerification = () =>
  request("/auth/email-verification/request", { method: "POST" })

export const confirmEmailVerification = (token) =>
  request(`/auth/email-verification/${token}/confirm`, { method: "POST" })

export const requestPasswordReset = (email) =>
  request("/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

export const confirmPasswordReset = (token, password) =>
  request(`/auth/password-reset/${token}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })

export const loginWithGoogle = (idToken) =>
  request("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  })

// --- Events (photographer, authenticated) ---

export const createEvent = (name) =>
  request("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })

export const listEvents = () => request("/events")

export const getEvent = (eventId) => request(`/events/${eventId}`)

export const listPhotos = (eventId) => request(`/events/${eventId}/photos`)

export const deletePhoto = (eventId, photoId) =>
  request(`/events/${eventId}/photos/${photoId}`, { method: "DELETE" })

export const deleteEvent = (eventId) =>
  request(`/events/${eventId}`, { method: "DELETE" })

// Starts an async upload job — responds immediately with { job_id }.
// Subscribe to subscribeToUploadProgress() for progress and the final result.
export const startPhotoUpload = (eventId, files) => {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  return request(`/events/${eventId}/photos`, { method: "POST", body: form })
}

// Subscribes to live upload progress via Server-Sent Events. Returns a
// cleanup function the caller can invoke to unsubscribe/close the connection.
export const subscribeToUploadProgress = (eventId, jobId, { onProgress, onDone, onError }) => {
  const url = `${BASE_URL}/events/${eventId}/uploads/${jobId}/stream`
  const source = new EventSource(url, { withCredentials: true })
  source.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'progress') onProgress(data)
    else if (data.type === 'done') { onDone(data); source.close() }
    else if (data.type === 'error') { onError(data); source.close() }
  }
  source.onerror = () => { onError({ message: 'Connection to upload progress stream lost' }); source.close() }
  return () => source.close()
}

// --- Branding (photographer, authenticated) ---

export const getBranding = () => request("/branding")

export const saveBranding = (studioName, brandColor, logoFile) => {
  const form = new FormData()
  form.append("studio_name", studioName || "")
  form.append("brand_color", brandColor || "")
  if (logoFile) form.append("logo", logoFile)
  return request("/branding", { method: "POST", body: form })
}

// --- Analytics (photographer, authenticated) ---

export const getEventAnalytics = (eventId) => request(`/events/${eventId}/analytics`)

// --- Platform admin (authenticated, server-side admin allowlist only) ---

export const getAdminOverview = () => request("/admin/overview")

// --- Guest (public, no auth) ---

export const getPublicEvent = (slug) => request(`/e/${slug}`)

export const searchBySelfies = (slug, selfieFiles, guestClientId) => {
  const form = new FormData()
  for (const file of selfieFiles) form.append("selfies", file)
  if (guestClientId) form.append("guest_client_id", guestClientId)
  return request(`/e/${slug}/search`, { method: "POST", body: form })
}

export const sendMatchFeedback = (slug, searchId, photoId) =>
  request(`/e/${slug}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search_id: searchId, photo_id: photoId }),
  })

// --- Collaborators / invites (photographer, authenticated) ---

export const listCollaborators = (eventId) => request(`/events/${eventId}/collaborators`)

export const inviteCollaborator = (eventId, email) =>
  request(`/events/${eventId}/collaborators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

export const removeCollaborator = (eventId, userId) =>
  request(`/events/${eventId}/collaborators/${userId}`, { method: "DELETE" })

export const cancelInvite = (eventId, inviteId) =>
  request(`/events/${eventId}/invites/${inviteId}`, { method: "DELETE" })

export const getInvite = (token) => request(`/invites/${token}`)

export const acceptInvite = (token) =>
  request(`/invites/${token}/accept`, { method: "POST" })

// Downloads a zip of the given matched photos and triggers a browser save —
// a blob response, so it can't go through the JSON request() helper above.
export const downloadMatches = async (slug, photoIds) => {
  const res = await fetch(`${BASE_URL}/e/${slug}/download`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo_ids: photoIds }),
  })
  if (!res.ok) {
    let message = `Download failed (${res.status})`
    try {
      const body = await res.json()
      message = body.detail || body.message || body.error || message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "pandaspot-photos.zip"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
