import { chromium } from 'playwright'

const URL = 'http://localhost:5173'
const out = 'D:/temp/pandaspot-shots'
import fs from 'node:fs'
fs.mkdirSync(out, { recursive: true })

const errors = []
const warnings = []
const consoleEntries = []

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
})
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
})
const page = await ctx.newPage()

page.on('console', (msg) => {
  consoleEntries.push({ type: msg.type(), text: msg.text() })
  if (msg.type() === 'error') errors.push(msg.text())
  if (msg.type() === 'warning') warnings.push(msg.text())
})
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()} -- ${req.failure()?.errorText}`))

console.log('Navigating…')
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)

// Hero shot
await page.screenshot({ path: `${out}/01-hero.png`, fullPage: false })
console.log('01-hero.png')

// Full page
await page.screenshot({ path: `${out}/02-fullpage.png`, fullPage: true })
console.log('02-fullpage.png')

// Scroll to each section and capture
const sections = [
  { id: 'wall', name: '03-wall' },
  { id: 'features', name: '04-features' },
  { id: 'workflow', name: '05-workflow' },
  { id: 'pricing', name: '06-pricing' },
  { id: 'faq', name: '07-faq' },
]
for (const s of sections) {
  await page.evaluate((id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, s.id)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: false })
  console.log(`${s.name}.png`)
}

// Check for any visible overflow / clipping issues
const overflow = await page.evaluate(() => {
  const out = []
  const docW = document.documentElement.scrollWidth
  const winW = window.innerWidth
  if (docW > winW + 1) out.push(`docW(${docW}) > winW(${winW}) by ${docW - winW}px`)
  // any element wider than viewport
  const all = document.querySelectorAll('*')
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (r.width > winW + 1 && r.right > winW + 1) {
      out.push(`overflow: ${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ').join('.') : ''} width=${Math.round(r.width)} right=${Math.round(r.right)}`)
      if (out.length > 12) break
    }
  }
  return out
})
console.log('OVERFLOW:', JSON.stringify(overflow, null, 2))

// Check for any element with 0 height (broken layout)
const zeroHeight = await page.evaluate(() => {
  const out = []
  const all = document.querySelectorAll('section, .bento-cell, .pricing-card, .scene-card, .faq-item')
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (r.height < 4) out.push(`zero-height: ${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 60)} h=${r.height}`)
  }
  return out
})
console.log('ZERO-HEIGHT:', JSON.stringify(zeroHeight, null, 2))

// Check fonts loaded
const fonts = await page.evaluate(() => ({
  hasInter: !!document.fonts.check('16px Inter'),
  hasSpaceGrotesk: !!document.fonts.check('16px "Space Grotesk"'),
  hasDMSans: !!document.fonts.check('16px "DM Sans"'),
}))
console.log('FONTS:', JSON.stringify(fonts))

// Check the key animation classes
const reveal = await page.evaluate(() => {
  const total = document.querySelectorAll('.scroll-reveal').length
  const inView = document.querySelectorAll('.scroll-reveal.in-view').length
  return { total, inView }
})
console.log('SCROLL-REVEAL:', JSON.stringify(reveal))

// Check hero counters present
const counters = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('.hero-counter-num'))
  return els.map((e) => e.textContent)
})
console.log('HERO-COUNTERS:', JSON.stringify(counters))

// Console + errors dump
console.log('--- console messages (errors+warnings only) ---')
for (const e of errors) console.log('ERR:', e)
for (const w of warnings) console.log('WARN:', w)

await browser.close()
console.log('Done.')
