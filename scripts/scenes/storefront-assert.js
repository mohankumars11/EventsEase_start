// Body of an async function; returns [{ name, ok, detail }]. See shoot-components --assert.
const out = []
const check = (name, ok, detail = '') => out.push({ name, ok: !!ok, detail: String(detail) })
for (let i = 0; i < 60 && !document.querySelector('[data-storefront]'); i++) await new Promise(r => setTimeout(r, 100))
await new Promise(r => setTimeout(r, 600))
const root = document.querySelector('[data-storefront]')
const scene = document.querySelector('[data-scene]')?.getAttribute('data-scene')
check('storefront mounted', root, scene)
if (!root) return out

/* 1. Nothing runs off the side of a 390px phone, except inside the two
      deliberate horizontal scrollers (packages, section bar). */
/* An element inside a scroller or a clipping frame cannot push the page sideways. */
const scrollerOf = el => { for (let p = el.parentElement; p && p !== root; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (['auto', 'scroll', 'hidden', 'clip'].includes(o)) return p } return null }
const wide = [...root.querySelectorAll('*')].filter(el => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.right > 391 && !scrollerOf(el)
}).map(el => el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.'))
check('no horizontal overflow outside the scrollers', !wide.length, wide.slice(0, 4).join(' | '))
check('the page itself never scrolls sideways', document.documentElement.scrollWidth <= 391, document.documentElement.scrollWidth)

/* 1b. The four headline numbers and their labels fit their cells. */
const cut = [...root.querySelectorAll('[data-stat-strip] p')].filter(p => p.scrollWidth > p.clientWidth + 1).map(p => p.textContent)
check('headline numbers and labels fit without truncating', !cut.length, cut.join(' | '))

/* 2. Every line of text is 11px or larger. */
const small = []
const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
for (let n = walker.nextNode(); n; n = walker.nextNode()) {
  if (!n.textContent.trim()) continue
  const el = n.parentElement
  if (!el || el.closest('[hidden]')) continue
  const fs = parseFloat(getComputedStyle(el).fontSize)
  if (fs < 11) small.push(`${fs}px "${n.textContent.trim().slice(0, 24)}"`)
}
check('all text at 11px or larger', !small.length, small.slice(0, 4).join(' | '))

/* 3. The gallery is aligned: every tile the same square. */
const tiles = [...root.querySelectorAll('[data-work-grid] > *')].map(t => t.getBoundingClientRect())
if (tiles.length) {
  const w = tiles[0].width, h = tiles[0].height
  const same = tiles.every(r => Math.abs(r.width - w) < 0.6 && Math.abs(r.height - h) < 0.6)
  check('gallery tiles are identical squares', same && Math.abs(w - h) < 0.6, `${tiles.length} tiles, first ${w.toFixed(1)}x${h.toFixed(1)}`)
  const rows = new Set(tiles.map(r => Math.round(r.top)))
  check('gallery tiles sit on clean rows of three', tiles.length <= 3 || [...rows].every(top => tiles.filter(r => Math.round(r.top) === top).length <= 3), `${rows.size} rows`)
}

/* 4. No placeholder leaked into the page. */
const text = root.innerText
const leak = ['undefined', 'null', 'NaN', '[object Object]'].filter(w => new RegExp(`\\b${w.replace(/[[\]]/g, '\\$&')}\\b`).test(text))
check('no undefined / null / NaN in the page', !leak.length, leak.join(','))

/* 5. Facts speak about the partner, not to them. */
const glance = root.querySelector('[data-glance]')?.parentElement?.innerText ?? ''
const second = glance.match(/\b(you|your)\b[^.\n]{0,30}/gi) ?? []
check('details read in the third person', !second.length, second.slice(0, 3).join(' | '))

/* 6. The face is really Manrope, not a fallback. */
check('Manrope is loaded', document.fonts.check('800 16px Manrope'), '')

/* 7. Per scene. */
const stats = root.querySelectorAll('[data-stat-strip] > *').length
const facts = root.querySelectorAll('[data-glance] > *').length
if (scene === 'photo') {
  check('photo: four headline numbers (team fills the capacity slot)', stats === 4, stats)
  check('photo: answers became facts', facts >= 6, facts + ' facts')
  check('photo: three packages', root.textContent.includes('Signature') && root.textContent.includes('VIP'), '')
  check('photo: "Other" answer shows the typed text', root.innerText.includes('Temple-light portraits'), '')
  check('photo: package inclusions are names, not ids', !/\bsame_day\b|\balbum\b(?! )/.test(root.innerText) || root.innerText.includes('Same-day edit slideshow'), '')
}
if (scene === 'dj') check('dj: no media shows the aurora, not a stock photo', root.querySelector('.sb-aurora') && !root.querySelector('.sb-mosaic'), '')
if (scene === 'venue') check('venue: spaces listed with their own details', root.innerText.includes('Main hall') && root.innerText.includes('Terrace lawn'), '')
if (scene === 'catering') check('catering: menus with courses', root.textContent.includes('Kalyana bhojana') && /Sweets/.test(root.textContent), '')
if (scene === 'anchor') check('anchor: selected package marked', root.innerText.includes('Selected'), '')
if (scene === 'empty') check('empty: says what will appear instead of inventing it', root.innerText.includes('appear here'), '')
return out
