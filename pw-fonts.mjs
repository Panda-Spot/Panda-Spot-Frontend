import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then(c => c.newPage())

const failedRequests = []
page.on('requestfailed', (req) => {
  const url = req.url()
  if (url.includes('fonts.g')) failedRequests.push(`FAILED: ${url} -- ${req.failure()?.errorText}`)
})

const fontsReqs = []
page.on('response', (res) => {
  const url = res.url()
  if (url.includes('fonts.g')) fontsReqs.push({ url, status: res.status() })
})

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

console.log('fonts requests:')
for (const r of fontsReqs) console.log('  ', r.status, r.url)
console.log('failed:', failedRequests)

// Now check what's actually applied to .landing-hero-title
const title = await page.evaluate(() => {
  const el = document.querySelector('.landing-hero-title')
  if (!el) return null
  const cs = getComputedStyle(el)
  return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color }
})
console.log('hero title style:', JSON.stringify(title, null, 2))

// Body font
const body = await page.evaluate(() => {
  const el = document.querySelector('.landing-page')
  if (!el) return null
  return getComputedStyle(el).fontFamily
})
console.log('body font:', body)

// Check whether counter shows 4,800,000 now
const counter = await page.evaluate(() => document.querySelector('.hero-counter-num')?.textContent)
console.log('first counter:', counter)

await browser.close()
