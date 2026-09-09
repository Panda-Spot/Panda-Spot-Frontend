import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import Modal from './Modal.jsx'

// Live camera capture for guest selfies. Opens the front camera in a modal,
// shows a mirrored preview, and hands a JPEG File back via onCapture so the
// caller can run it through the exact same pipeline as a picked file.
// Camera is stopped the moment the modal closes or unmounts.
export default function SelfieCameraModal({ open, onClose, onCapture, disabled }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [facing, setFacing] = useState('user') // 'user' | 'environment'
  const [capturing, setCapturing] = useState(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop() } catch { /* already stopped */ }
      })
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startStream = useCallback(async (mode) => {
    stopStream()
    setError('')
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera access. Please choose a photo file instead.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (e) {
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera permission in your browser, or choose a photo file instead.'
          : e?.name === 'NotFoundError'
          ? 'No camera was found on this device. Please choose a photo file instead.'
          : e?.message || 'Could not start the camera. Please choose a photo file instead.'
      setError(msg)
    } finally {
      setStarting(false)
    }
  }, [stopStream])

  // (Re)start whenever the modal opens or the facing mode flips.
  useEffect(() => {
    if (open) startStream(facing)
    else stopStream()
    return stopStream
  }, [open, facing, startStream, stopStream])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || disabled) return
    setCapturing(true)
    try {
      // Downscale to a sane selfie size; mirror the front camera so the
      // preview matches what the guest saw.
      const maxDim = 1024
      const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight))
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (facing === 'user') {
        ctx.translate(w, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, w, h)
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo — please try again.'))), 'image/jpeg', 0.92)
      )
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
      onCapture(file)
    } catch (e) {
      setError(e.message || 'Could not capture the photo — please try again.')
    } finally {
      setCapturing(false)
    }
  }

  const flip = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'))

  return (
    <Modal open={open} onClose={onClose} title="Take a selfie">
      <div className="selfie-camera">
        <div className="selfie-camera-view">
          {error ? (
            <p className="error" style={{ margin: 0 }}>{error}</p>
          ) : (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className={`selfie-camera-video${facing === 'user' ? ' is-mirrored' : ''}`}
                playsInline
                muted
                autoPlay
              />
              {starting && (
                <div className="selfie-camera-starting">
                  <RefreshCw size={18} className="file-progress-icon-spin" />
                  <span>Starting camera…</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
          <button type="button" className="btn secondary" onClick={flip} disabled={starting || !!error} title="Switch camera">
            <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Flip
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn secondary" onClick={onClose}>
              <X size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Cancel
            </button>
            <button type="button" className="btn" onClick={handleCapture} disabled={starting || capturing || !!error || disabled}>
              <Camera size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              {capturing ? 'Capturing…' : 'Capture'}
            </button>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Your photo is only used to find your pictures at this event — it is never saved or shared.
        </p>
      </div>
    </Modal>
  )
}
