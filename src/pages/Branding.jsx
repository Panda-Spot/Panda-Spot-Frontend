import { useEffect, useRef, useState } from 'react'
import { driveBackupConnectUrl, fileUrl, getBranding, saveBranding } from '../api.js'
import { useAuth } from '../auth.jsx'

const DEFAULT_ACCENT = '#aa3bff'

export default function Branding() {
  const [studioName, setStudioName] = useState('')
  const [brandColor, setBrandColor] = useState(DEFAULT_ACCENT)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileInput = useRef(null)
  const { user } = useAuth()

  useEffect(() => {
    getBranding()
      .then((b) => {
        setStudioName(b.studio_name || '')
        setBrandColor(b.brand_color || DEFAULT_ACCENT)
        setCurrentLogoUrl(b.logo_url || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    setLogoFile(file || null)
    setLogoPreview(file ? URL.createObjectURL(file) : '')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const b = await saveBranding(studioName, brandColor, logoFile)
      setStudioName(b.studio_name || '')
      setBrandColor(b.brand_color || DEFAULT_ACCENT)
      setCurrentLogoUrl(b.logo_url || null)
      setLogoFile(null)
      setLogoPreview('')
      if (fileInput.current) fileInput.current.value = ''
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="hint">Loading branding…</p>

  return (
    <div>
      <h1 className="section-title">Studio branding</h1>
      <p className="subtle">
        Customize how your studio appears on guest pages and guest cards — your name, logo, and brand color.
      </p>

      <form className="card branding-form" onSubmit={handleSave}>
        <label className="field-label" htmlFor="studio-name">Studio name</label>
        <input
          id="studio-name"
          className="text-input"
          placeholder="e.g. Aurora Photography"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
        />

        <label className="field-label" htmlFor="brand-color">Brand color</label>
        <div className="row">
          <input
            id="brand-color"
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
          />
          <span className="color-swatch" style={{ background: brandColor }} />
          <span className="hint">{brandColor}</span>
        </div>

        <label className="field-label" htmlFor="logo">Logo</label>
        <div className="row logo-row">
          {(logoPreview || currentLogoUrl) && (
            <img
              className="logo-preview"
              src={logoPreview || fileUrl(currentLogoUrl)}
              alt="Studio logo preview"
            />
          )}
          <input id="logo" ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoChange} />
        </div>

        <button className="btn auth-submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save branding'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {user?.is_admin && (
        <div className="card">
          <h2 className="section-title" style={{ fontSize: 18, marginTop: 0 }}>Drive backup <span className="hint">(advanced, beta — platform setup)</span></h2>
          <p className="subtle">
            One Google account, shared across every event that turns on Drive backup — not something each
            photographer connects individually. Beam captures get mirrored into an event's Drive folder using this
            one account (works because the folder is shared as "Anyone with the link — Editor"). Since uploads count
            against this single account's own Drive quota, they're only kept there for 2 days before being reclaimed
            back to the server, and 7 days total before permanent deletion — photographers are notified to make
            their own copy well before then.
          </p>
          {user.drive_backup_configured && <p className="hint">Connected — GOOGLE_DRIVE_BACKUP_REFRESH_TOKEN is set on the server.</p>}
          <a className="btn" href={driveBackupConnectUrl()}>
            {user.drive_backup_configured ? 'Reconnect a different account' : 'Connect Google Drive'}
          </a>
          <p className="hint">
            The callback page shows a fresh refresh token to copy into the server's .env, then restart the server for
            it to take effect.
          </p>
        </div>
      )}
    </div>
  )
}
