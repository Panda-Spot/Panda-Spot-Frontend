import { useEffect } from 'react'

const FONT_STACKS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  'script-accent': "'Brush Script MT', 'Segoe Script', cursive",
}

const BUTTON_RADII = {
  rounded: '10px',
  pill: '999px',
  square: '3px',
}

// Applies a resolved gallery theme (Phase 11) to a page container:
// palette vars (reusing the brand hooks' vocabulary), background + text +
// font, button radius, and gallery-layout/watermark markers for CSS.
// Null/absent theme = no overrides (built-in look stays untouched).
export const THEME_VAR_KEYS = [
  '--brand-primary', '--brand-secondary',
  '--brand-primary-30', '--brand-primary-40', '--brand-primary-25',
  '--brand-primary-15', '--brand-primary-12',
  '--accent-primary', '--accent-hover', '--accent-muted',
  '--theme-bg', '--theme-text', '--theme-radius',
]

const hexToRgba = (hex, alpha) => {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const validHex = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)

export function themeVars(theme) {
  const p = validHex(theme?.primary_color)
  const s = validHex(theme?.accent_color) || p
  const bg = validHex(theme?.background_color)
  const tx = validHex(theme?.text_color)
  const vars = {}
  if (p) {
    vars['--brand-primary'] = p
    vars['--brand-primary-30'] = hexToRgba(p, 0.30)
    vars['--brand-primary-40'] = hexToRgba(p, 0.40)
    vars['--brand-primary-25'] = hexToRgba(p, 0.25)
    vars['--brand-primary-15'] = hexToRgba(p, 0.15)
    vars['--brand-primary-12'] = hexToRgba(p, 0.12)
    vars['--accent-primary'] = p
    vars['--accent-muted'] = hexToRgba(p, 0.12)
  }
  if (s) {
    vars['--brand-secondary'] = s
    vars['--accent-hover'] = s
  }
  if (bg) vars['--theme-bg'] = bg
  if (tx) vars['--theme-text'] = tx
  if (BUTTON_RADII[theme?.button_style]) vars['--theme-radius'] = BUTTON_RADII[theme.button_style]
  return vars
}

export function themeFont(theme) {
  return FONT_STACKS[theme?.font_family] || null
}

export default function useGalleryTheme(rootRef, theme) {
  useEffect(() => {
    const el = rootRef.current
    if (!el || !theme || theme.is_default) return
    const style = el.style
    for (const [k, v] of Object.entries(themeVars(theme))) {
      if (v) style.setProperty(k, v)
    }
    const font = themeFont(theme)
    const prevBg = el.style.background
    const prevColor = el.style.color
    const prevFont = el.style.fontFamily
    if (theme.background_color && validHex(theme.background_color)) style.background = theme.background_color
    if (theme.text_color && validHex(theme.text_color)) style.color = theme.text_color
    if (font) style.fontFamily = font
    el.setAttribute('data-theme', theme.preset || 'custom')
    if (theme.gallery_layout) el.setAttribute('data-gallery-layout', theme.gallery_layout)
    return () => {
      el.removeAttribute('data-theme')
      el.removeAttribute('data-gallery-layout')
      THEME_VAR_KEYS.forEach((k) => style.removeProperty(k))
      el.style.background = prevBg
      el.style.color = prevColor
      el.style.fontFamily = prevFont
    }
    // Stringified tokens: theme objects are re-created per fetch, so field
    // identity would re-run this constantly — compare values instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, JSON.stringify(themeVars(theme)), themeFont(theme), theme?.preset, theme?.gallery_layout, theme?.is_default])
}
