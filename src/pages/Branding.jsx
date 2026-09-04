import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Palette, Receipt } from 'lucide-react'
import { fileUrl, getBranding, getMySubscription, getStudioProfile, saveBranding, updateStudioProfile } from '../api.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'

const DEFAULT_ACCENT = '#D97706'

// Studio Profile: studio name/logo/brand color (shown on every guest page),
// watermark intensity with live preview, contact details, plus shortcuts
// to the plan and the service catalog.
export default function Branding() {
  const [studioName, setStudioName] = useState('')
  const [brandColor, setBrandColor] = useState(DEFAULT_ACCENT)
  const [watermarkIntensity, setWatermarkIntensity] = useState(0.75)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null)
  const [watermarkFile, setWatermarkFile] = useState(null)
  const [watermarkPreview, setWatermarkPreview] = useState('')
  const [currentWatermarkUrl, setCurrentWatermarkUrl] = useState(null)
  const [phone, setPhone] = useState('')
  const [studioAddress, setStudioAddress] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileInput = useRef(null)
  const watermarkInput = useRef(null)

  useEffect(() => {
    getBranding()
      .then((b) => {
        setStudioName(b.studio_name || '')
        setBrandColor(b.brand_color || DEFAULT_ACCENT)
        setWatermarkIntensity(Number.isFinite(Number(b.watermark_intensity)) ? Number(b.watermark_intensity) : 0.75)
        setCurrentLogoUrl(b.logo_url || null)
        setCurrentWatermarkUrl(b.watermark_image_url || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    getMySubscription()
      .then((data) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
    getStudioProfile()
      .then((p) => {
        setPhone(p.phone || '')
        setStudioAddress(p.studio_address || '')
      })
      .catch(() => {})
  }, [])

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    setLogoFile(file || null)
    setLogoPreview(file ? URL.createObjectURL(file) : '')
  }

  const handleWatermarkChange = (e) => {
    const file = e.target.files?.[0]
    setWatermarkFile(file || null)
    setWatermarkPreview(file ? URL.createObjectURL(file) : '')
  }

  const handleRemoveWatermark = async () => {
    setSaving(true)
    setError('')
    try {
      const b = await saveBranding(studioName, brandColor, null, watermarkIntensity, null, true)
      setCurrentWatermarkUrl(b.watermark_image_url || null)
      setWatermarkFile(null)
      setWatermarkPreview('')
      if (watermarkInput.current) watermarkInput.current.value = ''
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const b = await saveBranding(studioName, brandColor, logoFile, watermarkIntensity, watermarkFile)
      setStudioName(b.studio_name || '')
      setBrandColor(b.brand_color || DEFAULT_ACCENT)
      setWatermarkIntensity(Number.isFinite(Number(b.watermark_intensity)) ? Number(b.watermark_intensity) : 0.75)
      setCurrentLogoUrl(b.logo_url || null)
      setCurrentWatermarkUrl(b.watermark_image_url || null)
      setLogoFile(null)
      setLogoPreview('')
      setWatermarkFile(null)
      setWatermarkPreview('')
      if (fileInput.current) fileInput.current.value = ''
      if (watermarkInput.current) watermarkInput.current.value = ''
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContact = async (e) => {
    e.preventDefault()
    setSavingContact(true)
    setError('')
    setContactSaved(false)
    try {
      const p = await updateStudioProfile({
        phone: phone.trim() === '' ? null : phone.trim(),
        studio_address: studioAddress.trim() === '' ? null : studioAddress.trim(),
      })
      setPhone(p.phone || '')
      setStudioAddress(p.studio_address || '')
      setContactSaved(true)
      setTimeout(() => setContactSaved(false), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingContact(false)
    }
  }

  if (loading) return <p className="hint">Loading studio profile…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Palette size={22} className="text-gold-500" /> Studio Profile
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          How your studio appears on guest pages and guest cards — name, logo, and brand color.
        </p>
      </div>

      <GlassCard hover={false}>
        <form className="branding-form" onSubmit={handleSave} style={{ border: 'none', padding: 0, margin: 0, background: 'transparent' }}>
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

          <label className="field-label" htmlFor="watermark-image">Watermark overlay image (optional)</label>
          <p className="hint">Centered over protected client-gallery photos instead of the studio-name text. Never burned into files.</p>
          <div className="row logo-row">
            {(watermarkPreview || currentWatermarkUrl) && (
              <img
                className="logo-preview"
                src={watermarkPreview || fileUrl(currentWatermarkUrl)}
                alt="Watermark preview"
              />
            )}
            <input id="watermark-image" ref={watermarkInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleWatermarkChange} />
            {currentWatermarkUrl && !watermarkPreview && (
              <button className="btn secondary" type="button" onClick={handleRemoveWatermark} disabled={saving}>
                Remove
              </button>
            )}
          </div>

          <label className="field-label" htmlFor="watermark-intensity">Watermark intensity</label>
          <div className="watermark-control">
            <input
              id="watermark-intensity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={watermarkIntensity}
              onChange={(e) => setWatermarkIntensity(Number(e.target.value))}
            />
            <span className="hint">{Math.round(watermarkIntensity * 100)}%</span>
          </div>

          <div className="watermark-preview protected-photo-frame" data-watermark={studioName || 'PandaSpot'} style={{ '--watermark-opacity': watermarkIntensity }}>
            <div className="watermark-preview-image" style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #263238 55%, #f2c94c 100%)` }} />
          </div>

          <GoldButton className="auth-submit" type="submit" disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save studio profile'}
          </GoldButton>
        </form>

        {error && <p className="error">{error}</p>}
      </GlassCard>

      <GlassCard hover={false}>
        <form onSubmit={handleSaveContact}>
          <div className="guest-link-label">Contact details</div>
          <p className="hint">Your phone and studio address for invoices and client communication.</p>
          <label className="field-label" htmlFor="studio-phone">Phone</label>
          <input
            id="studio-phone"
            className="text-input"
            placeholder="e.g. +91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label className="field-label" htmlFor="studio-address">Studio address</label>
          <input
            id="studio-address"
            className="text-input"
            placeholder="Street, city, state"
            value={studioAddress}
            onChange={(e) => setStudioAddress(e.target.value)}
          />
          <GoldButton type="submit" disabled={savingContact} style={{ marginTop: 12 }}>
            {savingContact ? 'Saving…' : contactSaved ? 'Saved!' : 'Save contact details'}
          </GoldButton>
        </form>
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-4">
        <GlassCard hover={false}>
          <div className="guest-link-label flex items-center gap-2">
            <CreditCard size={14} className="text-gold-500" /> Plan & billing
          </div>
          {subscription ? (
            <p className="subtle">
              <strong>{subscription.plan_name || 'Trial'}</strong>{' '}
              <Badge variant={subscription.status === 'TRIAL' || subscription.status === 'ACTIVE' ? 'success' : 'default'}>
                {subscription.status}
              </Badge>
              <span className="hint"> · {subscription.photo_quota_used} / {subscription.photo_quota_total} photos</span>
            </p>
          ) : (
            <p className="hint">No subscription yet.</p>
          )}
          <Link to="/billing">
            <GoldButton size="sm" variant="outline">Open Billing</GoldButton>
          </Link>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="guest-link-label flex items-center gap-2">
            <Receipt size={14} className="text-gold-500" /> Services catalog
          </div>
          <p className="hint">Reusable services feed quotations — managed under Invoicing.</p>
          <Link to="/billing/documents">
            <GoldButton size="sm" variant="outline">Open Invoicing</GoldButton>
          </Link>
        </GlassCard>
      </div>
    </div>
  )
}
