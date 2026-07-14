const BASE_URL = import.meta.env.VITE_AI_BACKEND_URL || "http://localhost:8000"

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.detail || message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message)
  }
  return res.json()
}

export const fileUrl = (path) => `${BASE_URL}${path}`

export const createAlbum = (name) =>
  request("/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })

export const listAlbums = () => request("/albums")

export const getAlbum = (albumId) => request(`/albums/${albumId}`)

export const listPhotos = (albumId) => request(`/albums/${albumId}/photos`)

export const uploadPhotos = (albumId, files) => {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  return request(`/albums/${albumId}/photos`, { method: "POST", body: form })
}

export const searchBySelfie = (albumId, selfieFile) => {
  const form = new FormData()
  form.append("selfie", selfieFile)
  return request(`/albums/${albumId}/search`, { method: "POST", body: form })
}
