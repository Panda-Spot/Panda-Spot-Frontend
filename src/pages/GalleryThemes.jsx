import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import {
  addCustomDomain,
  claimSubdomain,
  createTheme,
  deleteDomain,
  deleteTheme,
  getDomains,
  listThemes,
  setDefaultTheme,
  updateTheme,
  verifyCustomDomain,
} from '../api.js'
import { useToast } from '../toast.jsx'
import { useConfirm } from '../confirm.jsx'
import { themeVars, themeFont } from '../hooks/useGalleryTheme.js'

const FONTS = [
  { value: 'serif', label: 'Elegant serif' },
  { value: 'sans', label: 'Clean sans' },
  { value: 'script-accent', label: 'Script accents' },
]
const BUTTONS = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
  { value: 'square', label: 'Square' },
]
const LAYOUTS = [
  { value: 'grid', label: 'Grid' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'cinematic', label: 'Cinematic' },
]
const WATERMARKS = [
  { value: 'text', label: 'Studio name' },
  { value: 'logo', label: 'Logo' },
  { value: 'none', label: 'None' },
]

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="row" style={{ gap: 6 }}>
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#D4AF37'} onChange={(e) => onChange(e.target.value)} style={{ width: 40, height: 34, padding: 2 }} />
        <input
          className="text-input" value={value || ''} onChange={(e) => onChange(e.target.value)}
          placeholder="#D4AF37" maxLength={7} style={{ maxWidth: 110, fontFamily: 'monospace' }}
        />
      </div>
    </div>
  )
}

// Live preview: a miniature gallery rendered purely from the draft
// tokens — no photos needed, updates keystroke-live.
function ThemePreview({ draft }) {
  const vars = themeVars(draft)
  const font = themeFont(draft)
  const radius = vars['--theme-radius'] || '10px'
  return (
    <div
      className="card"
      style={{
        background: vars['--theme-bg'] || '#0A0A0B',
        color: vars['--theme-text'] || '#F5F1E8',
        fontFamily: font || undefined,
      }}
    >
      <div className="guest-link-label" style={{ color: vars['--theme-text'] || undefined }}>Live preview</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span
          style={{
            background: vars['--brand-primary'] || '#D4AF37',
            color: '#111', borderRadius: radius, padding: '6px 14px', fontWeight: 700, fontSize: 13,
          }}
        >
          Find My Photos
        </span>
        <span
          style={{
            border: `1px solid ${vars['--brand-primary'] || '#D4AF37'}`,
            color: vars['--theme-text'] || '#F5F1E8', borderRadius: radius, padding: '5px 14px', fontSize: 13,
          }}
        >
          View gallery
        </span>
      </div>
      <div
        style={
          draft.gallery_layout === 'masonry'
            ? { columns: 3, columnGap: 8 }
            : draft.gallery_layout === 'cinematic'
              ? { display: 'grid', gap: 8 }
              : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
        }
      >
        {['#B76E79', '#2563EB', '#EC4899', '#E5E5E5', '#C9A227', '#34D399'].map((c, i) => (
          <div
            key={i}
            style={{
              height: draft.gallery_layout === 'masonry' ? [90, 130, 70, 110, 95, 125][i] : draft.gallery_layout === 'cinematic' && i > 0 ? 60 : 90,
              borderRadius: radius,
              background: `linear-gradient(135deg, ${c}, ${vars['--brand-primary'] || '#D4AF37'})`,
              breakInside: 'avoid',
              marginBottom: draft.gallery_layout === 'masonry' ? 8 : 0,
              position: 'relative',
            }}
          >
            {draft.watermark_style !== 'none' && (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, opacity: 0.8, color: '#fff' }}>
                {draft.watermark_style === 'logo' ? '◈ studio' : 'Studio Name'}
              </span>
            )}
          </div>
        ))}
      </div>
      {!draft.hide_pandaspot_brand && (
        <p className="hint" style={{ marginTop: 8 }}>Powered by PandaSpot</p>
      )}
    </div>
  )
}

const emptyDraft = {
  name: '', preset: 'custom',
  primary_color: '#D4AF37', accent_color: '#D4AF37',
  background_color: '#0A0A0B', text_color: '#F5F1E8',
  font_family: 'sans', button_style: 'rounded', gallery_layout: 'grid',
  watermark_style: 'text', hide_pandaspot_brand: false, custom_share_card: false,
}

export default function GalleryThemes() {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [presets, setPresets] = useState({})
  const [themes, setThemes] = useState([])
  const [defaultId, setDefaultId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [domains, setDomains] = useState([])
  const [studioSlug, setStudioSlug] = useState(null)
  const [studioUrl, setStudioUrl] = useState(null)
  const [baseDomain, setBaseDomain] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [hostInput, setHostInput] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  const [newDomainHelp, setNewDomainHelp] = useState(null)
  const [verifyingId, setVerifyingId] = useState(null)

  const loadAll = async () => {
    const [t, d] = await Promise.all([listThemes(), getDomains()])
    setPresets(t.presets || {})
    setThemes(t.themes || [])
    setDefaultId(t.default_theme_id)
    setDomains(d.domains || [])
    setStudioSlug(d.studio_slug)
    setStudioUrl(d.studio_url)
    setBaseDomain(d.base_domain || '')
  }

  useEffect(() => {
    loadAll().catch((e) => showToast(e.message, { type: 'error' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startFromPreset = (preset) => {
    const p = presets[preset]
    if (!p) return
    setEditingId(null)
    setDraft({
      ...emptyDraft,
      name: `${p.name} (mine)`,
      preset,
      primary_color: p.primaryColor,
      accent_color: p.accentColor,
      background_color: p.backgroundColor,
      text_color: p.textColor,
      font_family: p.fontFamily,
      button_style: p.buttonStyle,
      gallery_layout: p.galleryLayout,
      watermark_style: p.watermarkStyle,
    })
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setDraft({
      name: t.name, preset: t.preset,
      primary_color: t.primary_color, accent_color: t.accent_color,
      background_color: t.background_color, text_color: t.text_color,
      font_family: t.font_family, button_style: t.button_style,
      gallery_layout: t.gallery_layout, watermark_style: t.watermark_style,
      hide_pandaspot_brand: !!t.hide_pandaspot_brand, custom_share_card: !!t.custom_share_card,
    })
  }

  const save = async () => {
    if (!draft.name.trim()) {
      showToast('Give the theme a name first', { type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (editingId) await updateTheme(editingId, draft)
      else await createTheme(draft)
      showToast(editingId ? 'Theme updated' : 'Theme created — assign it to events or set it as default')
      setEditingId(null)
      setDraft(emptyDraft)
      await loadAll()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t) => {
    const ok = await confirm(`Delete theme “${t.name}”? Events using it fall back to your default.`, { title: 'Delete theme?', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await deleteTheme(t.id)
      showToast('Theme deleted')
      await loadAll()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const makeDefault = async (id) => {
    try {
      await setDefaultTheme(id)
      showToast(id ? 'Default theme set' : 'Default cleared')
      await loadAll()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const claim = async (e) => {
    e.preventDefault()
    if (!slugInput.trim()) return
    setClaiming(true)
    try {
      const res = await claimSubdomain(slugInput.trim())
      showToast(`Your studio address is live: ${res.studio_url}`)
      setSlugInput('')
      await loadAll()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setClaiming(false)
    }
  }

  const addDomain = async (e) => {
    e.preventDefault()
    if (!hostInput.trim()) return
    setAddingDomain(true)
    setNewDomainHelp(null)
    try {
      const res = await addCustomDomain(hostInput.trim())
      if (res.verification_token) {
        setNewDomainHelp({
          host: res.host,
          cname: res.dns_help.cname,
          txt: res.dns_help.txt,
        })
      }
      showToast('Domain added — point DNS, then verify')
      setHostInput('')
      await loadAll()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setAddingDomain(false)
    }
  }

  const verify = async (id) => {
    setVerifyingId(id)
    try {
      const res = await verifyCustomDomain(id)
      showToast(res.status === 'verified' ? 'Domain verified!' : res.detail || res.status, res.status === 'verified' ? undefined : { type: 'error' })
      await loadAll()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setVerifyingId(null)
    }
  }

  const removeDomain = async (d) => {
    const ok = await confirm(`Remove ${d.host}? Galleries there stop resolving to your studio.`, { title: 'Remove domain?', confirmLabel: 'Remove', danger: true })
    if (!ok) return
    try {
      await deleteDomain(d.id)
      showToast('Domain removed')
      await loadAll()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div>
      <Link className="back-link" to="/branding"><ArrowLeft size={13} style={{ display: 'inline' }} /> Studio profile</Link>

      <h2 className="section-title">Your themes</h2>
      {themes.length === 0 && <p className="hint">No custom themes yet — start from a preset below. Until then every gallery uses the PandaSpot default.</p>}
      <div className="photo-grid">
        {themes.map((t) => (
          <div className="photo-card" key={t.id} style={{ padding: 10 }}>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              {[t.primary_color, t.accent_color, t.background_color].map((c, i) => (
                <span key={i} style={{ width: 26, height: 26, borderRadius: 6, background: c, border: '1px solid var(--border)' }} />
              ))}
              <strong style={{ marginLeft: 4 }}>{t.name}</strong>
            </div>
            <p className="hint">{t.preset} · {t.font_family} · {t.gallery_layout}{defaultId === t.id ? ' · default' : ''}</p>
            <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {defaultId === t.id ? (
                <button type="button" className="btn secondary" onClick={() => makeDefault(null)}>Unset default</button>
              ) : (
                <button type="button" className="btn secondary" onClick={() => makeDefault(t.id)}>Set default</button>
              )}
              <button type="button" className="btn secondary" onClick={() => startEdit(t)}>Edit</button>
              <button type="button" className="btn secondary" onClick={() => remove(t)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Start from a preset</h2>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {Object.keys(presets).map((key) => (
          <button key={key} type="button" className="btn secondary" onClick={() => startFromPreset(key)}>
            <Plus size={13} /> {presets[key].name}
          </button>
        ))}
        <button type="button" className="btn secondary" onClick={() => { setEditingId(null); setDraft(emptyDraft) }}>
          <Plus size={13} /> Blank theme
        </button>
      </div>

      <h2 className="section-title">{editingId ? 'Edit theme' : 'New theme'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 6fr) minmax(280px, 5fr)', gap: 12, alignItems: 'start' }} className="album-workspace-grid">
        <div className="card">
          <label className="field-label" htmlFor="theme-name">Name</label>
          <input id="theme-name" className="text-input" value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} placeholder="e.g. Sharma wedding gold" />
          <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
            <ColorField label="Primary" value={draft.primary_color} onChange={(v) => set({ primary_color: v })} />
            <ColorField label="Accent" value={draft.accent_color} onChange={(v) => set({ accent_color: v })} />
            <ColorField label="Background" value={draft.background_color} onChange={(v) => set({ background_color: v })} />
            <ColorField label="Text" value={draft.text_color} onChange={(v) => set({ text_color: v })} />
          </div>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 10, alignItems: 'flex-end' }}>
            <div>
              <label className="field-label" htmlFor="theme-font">Font</label>
              <select id="theme-font" className="text-input" value={draft.font_family} onChange={(e) => set({ font_family: e.target.value })}>
                <option value="serif">Elegant serif</option>
                <option value="sans">Clean sans</option>
                <option value="script-accent">Script accents</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="theme-btn">Buttons</label>
              <select id="theme-btn" className="text-input" value={draft.button_style} onChange={(e) => set({ button_style: e.target.value })}>
                <option value="rounded">Rounded</option>
                <option value="pill">Pill</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="theme-layout">Gallery layout</label>
              <select id="theme-layout" className="text-input" value={draft.gallery_layout} onChange={(e) => set({ gallery_layout: e.target.value })}>
                <option value="grid">Grid</option>
                <option value="masonry">Masonry</option>
                <option value="cinematic">Cinematic</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="theme-wm">Watermark</label>
              <select id="theme-wm" className="text-input" value={draft.watermark_style} onChange={(e) => set({ watermark_style: e.target.value })}>
                <option value="text">Studio name</option>
                <option value="logo">Logo</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <label className="checkbox-row" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={!!draft.hide_pandaspot_brand} onChange={(e) => set({ hide_pandaspot_brand: e.target.checked })} />
            Hide “Powered by PandaSpot” (premium)
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={!!draft.custom_share_card} onChange={(e) => set({ custom_share_card: e.target.checked })} />
            Studio-styled share cards (premium)
          </label>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn" type="button" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create theme'}
            </button>
            {(editingId || draft.name) && (
              <button className="btn secondary" type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft) }}>
                Cancel
              </button>
            )}
          </div>
        </div>
        <ThemePreview draft={draft} />
      </div>

      <h2 className="section-title">Studio address</h2>
      <div className="card">
        {studioSlug ? (
          <p>
            Your galleries live at <strong>https://{studioSlug}.{baseDomain}</strong>
          </p>
        ) : (
          <p className="hint">Claim your address — every gallery URL works under it automatically.</p>
        )}
        <form className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={claim}>
          <div>
            <label className="field-label" htmlFor="studio-slug">Address slug</label>
            <div className="row" style={{ gap: 4, alignItems: 'center' }}>
              <input id="studio-slug" className="text-input" value={slugInput} onChange={(e) => setSlugInput(e.target.value.toLowerCase())} placeholder="abcstudio" maxLength={40} style={{ maxWidth: 200 }} />
              <span className="hint">.{baseDomain}</span>
            </div>
          </div>
          <button className="btn" type="submit" disabled={claiming || !slugInput.trim()}>
            {claiming ? 'Claiming…' : studioSlug ? 'Change address' : 'Claim address'}
          </button>
        </form>
        {studioUrl && <p className="hint">Live now: {studioUrl}</p>}
      </div>

      <h2 className="section-title">Custom domains</h2>
      <div className="card">
        <p className="hint">Serve galleries from your own domain (e.g. gallery.yourstudio.com). Point DNS first, then verify.</p>
        <form className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={addDomain}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="field-label" htmlFor="custom-host">Domain</label>
            <input id="custom-host" className="text-input" value={hostInput} onChange={(e) => setHostInput(e.target.value)} placeholder="gallery.yourstudio.com" maxLength={253} />
          </div>
          <button className="btn" type="submit" disabled={addingDomain || !hostInput.trim()}>
            {addingDomain ? 'Adding…' : 'Add domain'}
          </button>
        </form>
        {newDomainHelp && (
          <div className="card" style={{ marginTop: 10, borderColor: 'var(--gold, #d4af37)' }}>
            <div className="guest-link-label">DNS setup for {newDomainHelp.host}</div>
            <p className="hint">1. Add a CNAME: <code>{newDomainHelp.cname.host}</code> → <code>{newDomainHelp.cname.points_to}</code></p>
            <p className="hint">2. Add a TXT record: <code>{newDomainHelp.txt.host}</code> = <code>{newDomainHelp.txt.value}</code></p>
            <p className="hint">3. Wait for propagation, then press Verify on the domain below.</p>
          </div>
        )}
        {domains.length > 0 && (
          <ul className="team-list" style={{ marginTop: 10 }}>
            {domains.map((d) => (
              <li key={d.id} className="team-list-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>
                    <strong>{d.host}</strong>
                    <span className="hint"> · {d.type === 'PANDA_SUBDOMAIN' ? 'studio address' : 'custom'} · {d.status}{d.verified_at ? ` · verified ${new Date(d.verified_at).toLocaleDateString()}` : ''}</span>
                  </span>
                  {d.type === 'CUSTOM_DOMAIN' && d.status !== 'verified' && (
                    <button type="button" className="btn secondary" disabled={verifyingId === d.id} onClick={() => verify(d.id)}>
                      {verifyingId === d.id ? 'Checking…' : 'Verify DNS'}
                    </button>
                  )}
                  {d.type === 'CUSTOM_DOMAIN' && (
                    <button type="button" className="btn secondary" onClick={() => removeDomain(d)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
