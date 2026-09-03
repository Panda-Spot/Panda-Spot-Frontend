import { getToken, setToken, clearToken } from "./authToken.js"

const BASE_URL = import.meta.env.VITE_API_URL || "https://git-pipeline.metatronhost.in/panda-spot"

async function request(path, options) {
  const token = getToken()
  const headers = { ...(options?.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
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

export const register = async (email, password, name) => {
  const data = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  })
  setToken(data.token)
  return data
}

export const login = async (email, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

export const logout = () => {
  clearToken()
  return request("/auth/logout", { method: "POST" }).catch(() => null)
}

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

export const loginWithGoogle = async (idToken) => {
  const data = await request("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  })
  setToken(data.token)
  return data
}

// --- Events (photographer, authenticated) ---

export const createEvent = (name) =>
  request("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })

export const listEvents = () => request("/events")

export const getEvent = (eventId) => request(`/events/${eventId}`)

// Required before any upload/import/Shoots activity can happen on this
// event — see the "started" field on getEvent()'s response.
export const startEvent = (eventId) =>
  request(`/events/${eventId}/start`, { method: "POST" })

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

// Connects a public Google Drive folder to an event and starts the initial
// import job — responds immediately with { job_id, files_found }. Subscribe
// to subscribeToUploadProgress() for progress and the final result, same as
// startPhotoUpload(). `confirm: true` is required — the server rejects the
// request without it, since this scans and imports every photo currently in
// the folder; the UI must warn the photographer before calling this.
// Read-only pre-check — verifies the folder link resolves and is
// reachable, and reports the "anyone with the link" access level, before
// committing to connectDriveFolder()'s full scan/import.
export const testDriveFolderConnection = (eventId, folderUrl) =>
  request(`/events/${eventId}/drive/test-connection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_url: folderUrl }),
  })

export const connectDriveFolder = (eventId, folderUrl) =>
  request(`/events/${eventId}/drive/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_url: folderUrl, confirm: true }),
  })

// Manually re-syncs an already-connected Drive folder: imports any photos
// added since the last sync and removes any whose Drive file was deleted.
// Same job/progress shape as connectDriveFolder.
export const syncDriveFolder = (eventId) =>
  request(`/events/${eventId}/drive/sync`, { method: "POST" })

// Turns the daily automatic sync on/off for an already-connected folder.
export const setDriveAutoSync = (eventId, enabled) =>
  request(`/events/${eventId}/drive/auto-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  })

// --- Shoots (camera-to-cloud live upload) ---

// Fetches the event's current Shoots FTP credentials, or { connected: false }
// if none have been generated yet.
export const getShootsCredentials = (eventId) => request(`/events/${eventId}/shoots/credentials`)

// Generates fresh credentials (first setup, or "Regenerate" — the previous
// username/password stop working immediately).
export const generateShootsCredentials = (eventId) =>
  request(`/events/${eventId}/shoots/credentials`, { method: "POST" })

// Revokes Shoots access — the camera's saved credentials stop working.
export const disconnectShoots = (eventId) =>
  request(`/events/${eventId}/shoots/credentials`, { method: "DELETE" })

// Subscribes to "a new photo just arrived via Shoots" over Server-Sent Events.
// Returns a cleanup function. Unlike subscribeToUploadProgress, this has no
// fixed end — it just keeps streaming for as long as the event page is open.
export const subscribeToLiveEvents = (eventId, { onPhotoAdded, onPhotoSkipped }) => {
  const token = getToken()
  const url = `${BASE_URL}/events/${eventId}/live/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`
  const source = new EventSource(url, { withCredentials: true })
  source.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === "photo_added") onPhotoAdded(data)
    else if (data.type === "photo_skipped") onPhotoSkipped(data)
  }
  return () => source.close()
}

// Subscribes to live upload progress via Server-Sent Events. Returns a
// cleanup function the caller can invoke to unsubscribe/close the connection.
export const subscribeToUploadProgress = (eventId, jobId, { onProgress, onDone, onError }) => {
  // EventSource can't set an Authorization header, so the token goes as a
  // query param here specifically — see middleware/auth.js's extractToken.
  const token = getToken()
  const url = `${BASE_URL}/events/${eventId}/uploads/${jobId}/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`
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

// --- Drive backup (advanced/beta — see server README's "Drive backup") ---

// Not a fetch — a full-page navigation, since this hands off to Google's own
// consent screen. requireAuth on the server accepts the token as a query
// param for exactly this reason (same trick the SSE streams use).
export const driveBackupConnectUrl = () => {
  const token = getToken()
  return `${BASE_URL}/auth/google/drive-backup/connect${token ? `?token=${encodeURIComponent(token)}` : ""}`
}

export const setEventDriveBackup = (eventId, enabled) =>
  request(`/events/${eventId}/drive-backup/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  })

// "I've made my copies — free up space": reclaims this event's Drive-backed
// photos right now instead of waiting for the automatic 2-day sweep.
export const reclaimDriveBackupNow = (eventId) =>
  request(`/events/${eventId}/drive-backup/reclaim-now`, { method: "POST" })

// Backs up every already-local photo not yet backed up (direct uploads, or
// PandaShoots captures from before Drive backup was turned on) — same
// job/progress shape as startPhotoUpload/connectDriveFolder/syncDriveFolder.
// `source` filters which already-local photos get backed up — 'upload',
// 'shoots', or omitted/undefined for every eligible source.
export const backupExistingPhotosToDrive = (eventId, source) =>
  request(`/events/${eventId}/drive-backup/backup-existing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: source || undefined }),
  })

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

export const listAdminUsers = (search, page = 1) =>
  request(`/admin/users?search=${encodeURIComponent(search || "")}&page=${page}`)

export const getAdminUser = (userId) => request(`/admin/users/${userId}`)

export const suspendAdminUser = (userId) => request(`/admin/users/${userId}/suspend`, { method: "POST" })

export const unsuspendAdminUser = (userId) => request(`/admin/users/${userId}/unsuspend`, { method: "POST" })

export const setAdminUserLimits = (userId, eventLimit, storageLimitBytes, photoRetentionDays) =>
  request(`/admin/users/${userId}/limits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_limit: eventLimit,
      storage_limit_bytes: storageLimitBytes,
      photo_retention_days: photoRetentionDays,
    }),
  })

export const deleteAdminUser = (userId, confirmEmail) =>
  request(`/admin/users/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_email: confirmEmail }),
  })

export const listAdminEvents = (search, page = 1) =>
  request(`/admin/events?search=${encodeURIComponent(search || "")}&page=${page}`)

export const getAdminEvent = (eventId) => request(`/admin/events/${eventId}`)

export const deleteAdminEvent = (eventId) => request(`/admin/events/${eventId}`, { method: "DELETE" })

export const setAdminEventExpiry = (eventId, expiresAt) =>
  request(`/admin/events/${eventId}/expiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expires_at: expiresAt }),
  })

export const disableAdminEventShoots = (eventId) =>
  request(`/admin/events/${eventId}/disable-shoots`, { method: "POST" })

export const disableAdminEventDriveBackup = (eventId) =>
  request(`/admin/events/${eventId}/disable-drive-backup`, { method: "POST" })

export const resendAdminUserVerification = (userId) =>
  request(`/admin/users/${userId}/resend-verification`, { method: "POST" })

export const verifyAdminUser = (userId) => request(`/admin/users/${userId}/verify`, { method: "POST" })

export const getAdminMetrics = (sort) => request(`/admin/metrics?sort=${encodeURIComponent(sort || "storage")}`)

// --- Admin: subscription plan catalog + platform settings (MERGE: Studio-Verse, Phase 14) ---

export const listAdminPlans = () => request(`/admin/plans`)

export const createAdminPlan = (plan) =>
  request(`/admin/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })

export const updateAdminPlan = (planId, patch) =>
  request(`/admin/plans/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })

export const getAdminPlatformSettings = () => request(`/admin/platform-settings`)

export const updateAdminPlatformSettings = (patch) =>
  request(`/admin/platform-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })

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

// Opts this guest in to being notified (email or WhatsApp) if more photos of
// them show up later in this event. Re-subscribing (e.g. searching again)
// just updates the existing subscription.
export const subscribeToMatchAlerts = (slug, guestClientId, channel, contact) =>
  request(`/e/${slug}/alerts/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_client_id: guestClientId, channel, contact }),
  })

export const unsubscribeFromMatchAlerts = (slug, guestClientId) =>
  request(`/e/${slug}/alerts/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_client_id: guestClientId }),
  })

// One-off "text me this gallery link" — sends once, no ongoing subscription.
export const sendGalleryLinkViaWhatsApp = (slug, phone) =>
  request(`/e/${slug}/whatsapp/send-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })

// Guest-contributed photo upload — lands as pending until the owner
// approves it (see toggleGuestUploads/approvePhoto below).
export const uploadGuestPhotos = (slug, files, guestClientId) => {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  if (guestClientId) form.append("guest_client_id", guestClientId)
  return request(`/e/${slug}/upload`, { method: "POST", body: form })
}

// Public gallery of approved photos — powers the live slideshow view.
export const getPublicGallery = (slug) => request(`/e/${slug}/gallery`)

// Public SSE feed of new approved photos landing — same event shape as
// subscribeToLiveEvents above, just unauthenticated and scoped by
// guestSlug instead of a token. Powers the live slideshow view.
export const subscribeToPublicLiveEvents = (slug, { onPhotoAdded }) => {
  const source = new EventSource(`${BASE_URL}/e/${slug}/live/stream`)
  source.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === "photo_added") onPhotoAdded(data)
  }
  return () => source.close()
}

// Sets/switches/removes a guest's reaction — reaction is one of
// REACTION_TYPES (heart/laugh/wow/clap/fire); tapping the same one again
// removes it, tapping a different one switches to it.
export const reactToPhoto = (slug, photoId, guestClientId, reaction) =>
  request(`/e/${slug}/photos/${photoId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_client_id: guestClientId, reaction }),
  })

// A guest's own reaction history within this event.
export const getMyReactions = (slug, guestClientId) =>
  request(`/e/${slug}/my-reactions?guest_client_id=${encodeURIComponent(guestClientId)}`)

// Group search — one selfie per person, returns photos matching ANY of
// them (not the same person from multiple angles, see searchBySelfies).
export const searchGroupBySelfies = (slug, selfieFiles, guestClientId) => {
  const form = new FormData()
  for (const file of selfieFiles) form.append("selfies", file)
  if (guestClientId) form.append("guest_client_id", guestClientId)
  return request(`/e/${slug}/search/group`, { method: "POST", body: form })
}

export const getPhotoComments = (slug, photoId) => request(`/e/${slug}/photos/${photoId}/comments`)

export const addPhotoComment = (slug, photoId, guestClientId, guestName, text) =>
  request(`/e/${slug}/photos/${photoId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_client_id: guestClientId, guest_name: guestName, text }),
  })

// --- Guest uploads / moderation (photographer, authenticated) ---

export const toggleGuestUploads = (eventId, enabled) =>
  request(`/events/${eventId}/guest-uploads/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  })

// MERGE (Studio-Verse): independent Face Search / Photo Selection toggles
// on the same event — see MERGE_PLAN.md D6. feature is "faceSearch" or
// "photoSelection".
export const toggleEventFeature = (eventId, feature, enabled) =>
  request(`/events/${eventId}/features/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature, enabled }),
  })

// --- Photo Selection: studio-side client management ---

export const inviteClient = (eventId, email, favouriteCap) =>
  request(`/events/${eventId}/clients/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, favourite_cap: favouriteCap || undefined }),
  })

export const listClients = (eventId) => request(`/events/${eventId}/clients`)

export const removeClient = (eventId, userId) =>
  request(`/events/${eventId}/clients/${userId}`, { method: "DELETE" })

// --- Photo Selection: client-invite acceptance (public, no auth yet) ---

export const getClientInvite = (token) => request(`/client-invites/${token}`)

export const acceptClientInvite = async (token, password, name) => {
  const data = await request(`/client-invites/${token}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, name }),
  })
  setToken(data.token)
  return data
}

// --- Photo Selection: client-facing gallery (logged in as a USER-role client) ---

export const listClientEvents = () => request(`/client/events`)

export const getClientEvent = (eventId) => request(`/client/events/${eventId}`)

export const listClientPhotos = (eventId) => request(`/client/events/${eventId}/photos`)

export const toggleClientFavourite = (eventId, photoId, favourite) =>
  request(`/client/events/${eventId}/photos/${photoId}/favourite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favourite }),
  })

export const submitClientSelection = (eventId) =>
  request(`/client/events/${eventId}/submit`, { method: "POST" })

// --- Billing & Subscriptions (MERGE: Studio-Verse, Phase 12) ---

export const listSubscriptionPlans = () => request(`/subscriptions/plans`)

export const getMySubscription = () => request(`/subscriptions/me`)

export const activateTrial = () => request(`/subscriptions/trial`, { method: "POST" })

export const subscribeToPlan = (planId) =>
  request(`/subscriptions/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  })

export const upgradeSubscription = (planId) =>
  request(`/subscriptions/upgrade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  })

export const downgradeSubscription = (planId) =>
  request(`/subscriptions/downgrade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  })

export const rechargeWallet = (planId) =>
  request(`/subscriptions/wallet/recharge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  })

export const listWalletTransactions = () => request(`/subscriptions/wallet/transactions`)

export const listBillingServices = () => request(`/billing/services`)

export const createBillingService = (name, price) =>
  request(`/billing/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price }),
  })

export const listQuotations = () => request(`/billing/quotations`)

export const createQuotation = (clientEmail, clientName, items, discountAmount) =>
  request(`/billing/quotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_email: clientEmail, client_name: clientName, items, discount_amount: discountAmount }),
  })

export const confirmQuotation = (quotationId) =>
  request(`/billing/quotations/${quotationId}/confirm`, { method: "POST" })

export const deleteQuotation = (quotationId) =>
  request(`/billing/quotations/${quotationId}`, { method: "DELETE" })

export const listBills = () => request(`/billing/bills`)

export const getBill = (billId) => request(`/billing/bills/${billId}`)

export const recordPayment = (billId, amount, method, remark) =>
  request(`/billing/bills/${billId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, method, remark }),
  })

// --- Support tickets (MERGE: Studio-Verse, Phase 13) ---

export const listSupportTickets = () => request(`/support/tickets`)

export const createSupportTicket = (subject, message, eventId) =>
  request(`/support/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, message, event_id: eventId || undefined }),
  })

export const replySupportTicket = (ticketId, message) =>
  request(`/support/tickets/${ticketId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })

export const setSupportTicketStatus = (ticketId, status) =>
  request(`/support/tickets/${ticketId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })

export const approvePhoto = (eventId, photoId) =>
  request(`/events/${eventId}/photos/${photoId}/approve`, { method: "POST" })

export const deletePhotoComment = (eventId, photoId, commentId) =>
  request(`/events/${eventId}/photos/${photoId}/comments/${commentId}`, { method: "DELETE" })

// Independent of the event's main 90-day guest-access window — null resets
// to "same as everyone else".
export const setGuestUploadWindow = (eventId, windowDays) =>
  request(`/events/${eventId}/guest-uploads/window`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ window_days: windowDays }),
  })

// --- Sub-galleries (photographer, authenticated) ---

export const createSubGallery = (eventId, name) =>
  request(`/events/${eventId}/sub-galleries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
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
