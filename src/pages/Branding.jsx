import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { disconnectDriveBackup, driveBackupConnectUrl, fileUrl, getBranding, saveBranding } from '../api.js'
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
  const { user, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [driveBackupMessage, setDriveBackupMessage] = useState('')
  const [disconnectingDriveBackup, setDisconnectingDriveBackup] = useState(false)

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

  useEffect(() => {
    const connected = searchParams.get('drive_backup')
    const err = searchParams.get('drive_backup_error')
    if (connected === 'connected') {
      setDriveBackupMessage('Drive backup connected.')
      refreshUser()
    } else if (err) {
      setDriveBackupMessage(`Couldn't connect Drive backup: ${err.replace(/_/g, ' ')}`)
    }
    if (connected || err) {
      searchParams.delete('drive_backup')
      searchParams.delete('drive_backup_error')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDisconnectDriveBackup = async () => {
    if (!window.confirm('Disconnect Drive backup? Beam captures will stop mirroring to Drive for any event using it.')) return
    setDisconnectingDriveBackup(true)
    setDriveBackupMessage('')
    try {
      await disconnectDriveBackup()
      await refreshUser()
      setDriveBackupMessage('Drive backup disconnected.')
    } catch (e) {
      setDriveBackupMessage(e.message)
    } finally {
      setDisconnectingDriveBackup(false)
    }
  }

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

      {user?.drive_backup_beta && (
        <div className="card">
          <h2 className="section-title" style={{ fontSize: 18, marginTop: 0 }}>Drive backup <span className="hint">(advanced, beta)</span></h2>
          <p className="subtle">
            Mirror each Beam (camera-to-cloud) capture into an event's connected Google Drive folder, so Drive stays
            the complete archive instead of only holding what was imported from it. Turn it on per-event from that
            event's page once connected here.
          </p>
          {user.drive_backup_connected ? (
            <>
              <p className="hint">Connected.</p>
              <button className="btn danger-btn" type="button" onClick={handleDisconnectDriveBackup} disabled={disconnectingDriveBackup}>
                {disconnectingDriveBackup ? 'Disconnecting…' : 'Disconnect Drive backup'}
              </button>
            </>
          ) : (
            <a className="btn" href={driveBackupConnectUrl()}>Connect Google Drive</a>
          )}
          {driveBackupMessage && <p className="hint">{driveBackupMessage}</p>}
        </div>
      )}
    </div>
  )
}
