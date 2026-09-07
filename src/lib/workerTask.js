// Shared Web Worker runner for CPU-bound list crunching (filtering,
// sorting, merging, CSV building over hundreds/thousands of rows).
//
// Why: fetch/SSE are already async and never block rendering — the freezes
// come from crunching big arrays on the main thread (event/client/photo
// lists, attendee exports). This moves that work off-thread.
//
// Usage: runInWorker(pureFn, input) — pureFn MUST be self-contained (no
// closure variables, no imports; everything it needs comes via `input`,
// which must be structured-cloneable plain data). Returns a promise.
// Falls back to running inline if Workers are unavailable, so the UI
// always works — just on-thread.

let seq = 0
const pending = new Map()
let worker = null
let workerFailed = false

function getWorker() {
  if (worker) return worker
  const src = `self.onmessage = async (e) => {
    const { id, fnSrc, input } = e.data;
    try {
      const fn = new Function('return (' + fnSrc + ')')();
      const result = await fn(input);
      self.postMessage({ id, ok: true, result });
    } catch (err) {
      self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
    }
  };`
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })))
  worker.onmessage = (e) => {
    const { id, ok, result, error } = e.data || {}
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (ok) p.resolve(result)
    else p.reject(new Error(error || 'Worker task failed'))
  }
  worker.onerror = () => {
    // Poisoned worker (CSP etc.) — drop it and fall back to inline.
    workerFailed = true
    try { worker.terminate() } catch { /* ignore */ }
    worker = null
    pending.forEach((p) => p.reject(new Error('Worker unavailable')))
    pending.clear()
  }
  return worker
}

export function runInWorker(fn, input) {
  if (workerFailed) return Promise.resolve().then(() => fn(input))
  return new Promise((resolve, reject) => {
    let w
    try {
      w = getWorker()
    } catch {
      Promise.resolve().then(() => fn(input)).then(resolve, reject)
      return
    }
    const id = ++seq
    pending.set(id, { resolve, reject })
    try {
      w.postMessage({ id, fnSrc: fn.toString(), input })
    } catch {
      pending.delete(id)
      Promise.resolve().then(() => fn(input)).then(resolve, reject)
    }
  })
}

// Same pure function, run inline — use as the instant fallback/first
// paint while the worker result is in flight, so lists never flash empty.
export function runInline(fn, input) {
  return fn(input)
}
