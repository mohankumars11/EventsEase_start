// Body of an async fn; returns [{ name, ok, detail }].
const out = []
const check = (name, ok, detail = '') => out.push({ name, ok: !!ok, detail: String(detail) })
for (let i = 0; i < 60 && !document.querySelector('[data-storefront]'); i++) await new Promise(r => setTimeout(r, 100))
await new Promise(r => setTimeout(r, 700))
const root = document.querySelector('[data-storefront]')
check('storefront mounted', root)
const cta = [...document.querySelectorAll('[data-hero-empty] button')].find(b => /Add your photos/.test(b.textContent || ''))
const card = root?.querySelector('section.-mt-9')
if (cta && card) check('Add your photos sits above the profile card', cta.getBoundingClientRect().bottom <= card.getBoundingClientRect().top + 0.5,
  `button bottom ${cta.getBoundingClientRect().bottom.toFixed(0)} · card top ${card.getBoundingClientRect().top.toFixed(0)}`)
const cap = [...document.querySelectorAll('[data-hero-empty] p')].find(p => /coming soon/.test(p.textContent || ''))
if (cap && card) check('"coming soon" caption is not under the card', cap.getBoundingClientRect().bottom <= card.getBoundingClientRect().top + 0.5)
const cut = [...document.querySelectorAll('[data-stat-strip] p')].filter(p => p.scrollWidth > p.clientWidth + 1).map(p => p.textContent)
check('stat strip fits without truncating', !cut.length, cut.join(' | '))
check('no trade artwork in the hero', !document.querySelector('[data-storefront] .sambramo-trade-pictogram'))
check('no sparkle icon anywhere in the storefront', !document.querySelector('[data-storefront] .lucide-sparkles'))
const v = document.querySelector('[data-storefront] [data-verified]')
if (v) check('verified badge is green', /22, 163, 74|16a34a/i.test(getComputedStyle(v).fill || '') || /16A34A/i.test(v.getAttribute('class') || ''), getComputedStyle(v).fill)
return out
