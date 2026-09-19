/**
 * Structured-data gate.
 *
 * Two jobs. The first is mechanical: every JSON-LD block must parse, every
 * @id referenced must be defined, and every URL must be absolute on the
 * canonical origin. A block that fails to parse is invisible to every
 * consumer and reports no error anywhere, which is the worst failure mode
 * available.
 *
 * The second is the honesty gate, and it is the loud one. Sambramo has no
 * customers. src/components/layout/EventFooter.jsx:27-33 states the policy
 * in the product's own words: "no vendor counts, no years in business, no
 * star ratings and no testimonials. An invented review is the fastest
 * possible way to lose the trust this whole block is trying to earn."
 *
 * Fabricated review markup is also a Google structured-data manual action,
 * and under the ASCI code and the Consumer Protection Act 2019 it is a
 * misleading claim. So it is a BUILD FAILURE, not a lint warning. If you are
 * reading this because the build stopped: the fix is to remove the markup,
 * not to remove this check.
 */
import { readFileSync } from 'node:fs'
import { htmlFiles, pathOf, fail, report } from './_lib.mjs'

const BANNED = ['aggregateRating', 'ratingValue', 'reviewCount', 'ratingCount', '"review"', '"Review"']
const ORIGIN = 'https://sambramo.com'
const brand = JSON.parse(readFileSync(new URL('../content/brand.json', import.meta.url), 'utf8'))

const files = htmlFiles()
let blocks = 0

for (const f of files) {
  const html = readFileSync(f, 'utf8')
  const url = pathOf(f)
  const at = m => `${url} — ${m}`

  for (const b of BANNED) {
    if (html.includes(b)) {
      fail(at(`REVIEW MARKUP: found ${b}. Sambramo has no customers; see EventFooter.jsx:27-33. ` +
              `Remove the markup, not this check.`))
    }
  }

  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!m) continue
  blocks++

  let g
  try { g = JSON.parse(m[1]) } catch (e) { fail(at(`JSON-LD does not parse: ${e.message}`)); continue }
  if (g['@context'] !== 'https://schema.org') fail(at('JSON-LD @context is not schema.org'))

  const nodes = g['@graph'] ?? [g]
  const defined = new Set(nodes.map(n => n['@id']).filter(Boolean))
  const walk = (v, path = '') => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`))
    if (!v || typeof v !== 'object') return
    for (const [k, val] of Object.entries(v)) {
      if (k === '@type' && !val) fail(at(`empty @type at ${path}`))
      if ((k === 'url' || k === '@id') && typeof val === 'string' && !val.startsWith('http')) {
        fail(at(`relative ${k} "${val}" at ${path} — must be absolute`))
      }
      if ((k === 'url' || k === '@id') && typeof val === 'string' &&
          val.startsWith('http') && !val.startsWith(ORIGIN)) {
        fail(at(`off-origin ${k} "${val}" at ${path}`))
      }
      // The NAP gate. A model resolves "Sambramo" to one entity by seeing
      // the same phone number byte-for-byte everywhere. One page formatting
      // it differently is one more candidate entity.
      if (k === 'telephone' && val !== brand.supportPhone) {
        fail(at(`telephone "${val}" does not match brand.json "${brand.supportPhone}"`))
      }
      walk(val, `${path}.${k}`)
    }
  }
  walk(nodes)

  // A reference to an @id that nothing on the page defines is a dangling
  // pointer; consumers silently drop the whole relationship.
  const refs = [...m[1].matchAll(/\{"@id":"([^"]+)"\}/g)].map(x => x[1])
  for (const r of new Set(refs)) {
    if (!defined.has(r) && !r.startsWith(`${ORIGIN}/#`)) {
      fail(at(`@id reference "${r}" is not defined on this page`))
    }
  }
}

/* The phone number, in prose as well as in schema. Same reasoning. */
const digits = brand.supportPhone.replace(/\D/g, '')
for (const f of files) {
  const text = readFileSync(f, 'utf8').replace(/<[^>]+>/g, ' ')
  for (const m of text.matchAll(/\+?9\s?1[\s\-]?\d[\d\s\-]{8,13}\d/g)) {
    if (m[0].replace(/\D/g, '') === digits && m[0].trim() !== brand.supportPhone) {
      fail(`${pathOf(f)} — phone rendered as "${m[0].trim()}", expected "${brand.supportPhone}" (NAP must be byte-identical)`)
    }
  }
}

report('check-jsonld', blocks)
