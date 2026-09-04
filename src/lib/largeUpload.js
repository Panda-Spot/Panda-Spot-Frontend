import {
  abortLargeUpload,
  completeLargeUpload,
  fileUrl,
  getLargeUploadStage,
  initiateLargeUpload,
} from "../api.js"
import { getToken } from "../authToken.js"

// Resumable chunked upload for files too big for one multipart POST — the
// client half of the server's /events/:id/uploads/large/* endpoints (the
// local-disk equivalent of Studio-Verse's S3-multipart flow). 8MB chunks,
// per-chunk timeout with retry (the stall watchdog: a hung chunk is
// retried, then the session is aborted rather than leaving a zombie
// stage), and resume from the server's received_bytes on a 409 offset
// mismatch or a fresh call against an existing stage.

const CHUNK_BYTES = 8 * 1024 * 1024
const MAX_RETRIES = 3
const CHUNK_TIMEOUT_MS = 60000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function putChunk(eventId, stageId, offset, chunk) {
  const token = getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS)
  try {
    const res = await fetch(
      fileUrl(`/events/${eventId}/uploads/large/part?stage_id=${stageId}&offset=${offset}`),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: chunk,
        signal: controller.signal,
      }
    )
    if (!res.ok) {
      let message = `Chunk upload failed (${res.status})`
      try {
        const body = await res.json()
        message = body.error || body.message || message
      } catch {
        // non-JSON error — keep generic
      }
      const err = new Error(message)
      err.status = res.status
      throw err
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function uploadLargeFile(eventId, file, { onProgress, signal } = {}) {
  const init = await initiateLargeUpload(eventId, file.name, file.size, file.type || "application/octet-stream")
  const stageId = init.stage_id
  let offset = init.received_bytes || 0

  const report = () => onProgress?.({ loaded: offset, total: file.size })

  try {
    for (;;) {
      signal?.throwIfAborted()
      if (offset >= file.size) break
      const end = Math.min(offset + CHUNK_BYTES, file.size)
      const chunk = file.slice(offset, end)

      let attempt = 0
      for (;;) {
        try {
          const res = await putChunk(eventId, stageId, offset, chunk)
          offset = res.received_bytes
          report()
          break
        } catch (err) {
          if (signal?.aborted) throw err
          if (err.status === 409) {
            // Server is ahead/behind us — resync and re-slice from there.
            const stage = await getLargeUploadStage(eventId, stageId)
            offset = stage.received_bytes || 0
            report()
            break
          }
          attempt += 1
          if (attempt > MAX_RETRIES) {
            throw new Error(`Upload stalled at ${Math.round((offset / file.size) * 100)}% — check your connection and retry.`)
          }
          await sleep(1000 * attempt)
        }
      }
    }

    signal?.throwIfAborted()
    return await completeLargeUpload(eventId, stageId)
  } catch (err) {
    if (!signal?.aborted) {
      await abortLargeUpload(eventId, stageId).catch(() => {})
    }
    throw err
  }
}
