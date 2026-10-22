#!/usr/bin/env node
/**
 * One photograph per category, featured occasion and trade, for the
 * customer app's tiles. Written once into src/customer/data/photos.generated.js
 * so the app never searches at runtime (the same rule imagery.js follows).
 *
 *   node --env-file=.env scripts/resolve-customer-photos.mjs [--only-missing]
 *
 * These are inspiration photographs of the KIND of occasion, never a
 * partner's work: a partner card shows only that partner's own media.
 * Trades reuse the trade pools the synthetic seed resolved
 * (scripts/data/synthetic-partner-photos.json), picking from the far end
 * so a tile and a partner's gallery rarely share a frame.
 */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/customer/data/photos.generated.js')
const ONLY_MISSING = process.argv.includes('--only-missing')
const KEY = process.env.PEXELS_API_KEY
if (!KEY) { console.error('PEXELS_API_KEY missing'); process.exit(1) }

const tmp = join(ROOT, 'node_modules/.cache/customer-catalogue-photos.mjs')
mkdirSync(dirname(tmp), { recursive: true })
await build({ stdin: { contents: `export * from './src/customer/data/occasions.js'`, resolveDir: ROOT }, bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error' })
const { CATEGORIES, FEATURED } = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`)

/* Queries chosen for Indian context; Pexels' default results for a bare
   "wedding" are overwhelmingly Western white-dress ceremonies. */
const Q = {
  'cat:life': 'indian family celebration birthday', 'cat:wedding': 'indian wedding ceremony', 'cat:festivals': 'diwali diya lamps',
  'cat:school': 'school children stage performance india', 'cat:college': 'college festival crowd', 'cat:corporate': 'corporate conference stage audience',
  'cat:nightlife': 'concert crowd lights', 'cat:public': 'art exhibition gallery people', 'cat:sport': 'cricket match stadium',
  'cat:food': 'indian street food festival', 'cat:retail': 'fashion store launch', 'cat:property': 'luxury hotel lobby',
  'cat:community': 'volunteers community event india', 'cat:industry': 'technology conference speaker', 'cat:themed': 'masquerade party',
  'cat:outdoor': 'beach sunset celebration', 'cat:online': 'livestream studio camera', 'cat:special': 'candlelight dinner table',
  'birthday-party': 'birthday party decorations balloons', 'first-birthday': 'baby first birthday cake', 'kids-birthday-party': 'kids birthday party',
  'wedding-anniversary': 'anniversary couple celebration', 'silver-jubilee-anniversary': 'elderly indian couple celebration', 'marriage-proposal': 'marriage proposal ring',
  'baby-shower': 'baby shower decoration', 'naming-ceremony': 'indian baby ceremony', 'housewarming-ceremony': 'indian house entrance marigold',
  'engagement-ceremony': 'indian engagement rings', 'haldi-ceremony': 'haldi ceremony', 'mehendi-ceremony': 'mehendi bride hands', 'sangeet-night': 'sangeet dance indian wedding',
  'baraat-procession': 'baraat groom horse', 'wedding-ceremony': 'indian wedding mandap', 'muhurtham-ceremony': 'south indian wedding', 'wedding-reception': 'indian wedding reception stage',
  'destination-wedding': 'destination wedding beach india', 'diwali-celebration': 'diwali celebration lights', 'ganesh-chaturthi': 'ganesh idol festival',
  'navratri-celebration': 'garba dance navratri', 'holi-festival': 'holi colours festival', 'onam-celebration': 'onam pookalam', 'eid-celebration': 'eid celebration food',
  'christmas-celebration': 'christmas tree decoration', 'school-annual-day': 'school stage performance children', 'school-sports-day': 'school sports day race',
  'college-fest': 'college fest stage lights', 'convocation-ceremony': 'graduation caps thrown', 'hackathon': 'hackathon laptops team', 'corporate-annual-day': 'corporate award night stage',
  'corporate-conference': 'business conference audience', 'product-launch': 'product launch stage', 'store-opening': 'shop opening ribbon cutting', 'team-building-event': 'team building outdoor activity',
  'live-concert': 'live concert stage', 'dj-night': 'dj night club', 'stand-up-comedy-show': 'stand up comedy microphone', 'rooftop-party': 'rooftop party city night',
  'fashion-show': 'fashion runway show', 'art-exhibition': 'art gallery exhibition', 'charity-gala': 'gala dinner ballroom', 'cricket-tournament': 'cricket match',
  'marathon': 'marathon runners', 'yoga-workshop': 'group yoga class', 'food-festival': 'food festival stalls', 'chefs-table-experience': 'chef plating fine dining',
  'bbq-party': 'barbecue party grill', 'retail-store-launch': 'boutique store interior', 'jewellery-exhibition': 'indian gold jewellery', 'property-launch': 'modern apartment building',
  'blood-donation-camp': 'blood donation', 'technology-summit': 'tech summit stage', 'startup-demo-day': 'startup pitch presentation', 'halloween-party': 'halloween party',
  'new-years-eve-party': 'new year fireworks party', 'masquerade-ball': 'masquerade masks', 'garden-party': 'garden party table', 'destination-celebration': 'resort pool celebration',
  'beach-wedding': 'beach wedding setup', 'camping-gathering': 'camping tents night', 'luxury-yacht-party': 'yacht party', 'virtual-conference': 'video conference screen',
  'hybrid-conference': 'conference livestream camera', 'surprise-celebration': 'surprise party confetti', 'romantic-dinner': 'romantic dinner candles', 'luxury-picnic': 'luxury picnic setup',
}

const existing = existsSync(OUT) ? (await import(pathToFileURL(OUT).href + `?t=${Date.now()}`)).PHOTOS ?? {} : {}
const used = new Set(Object.values(existing).map(p => p.id))
const out = { ...existing }
const wanted = [...CATEGORIES.map(c => [`cat:${c.id}`, Q[`cat:${c.id}`] ?? c.label]), ...FEATURED.map(o => [o.id, Q[o.id] ?? `${o.name} india`])]

for (const [key, query] of wanted) {
  if (ONLY_MISSING && out[key]) continue
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=square`, { headers: { Authorization: KEY } })
  if (!r.ok) { console.log(`  ${r.status} ${key}`); if (r.status === 429) break; continue }
  let photos = (await r.json()).photos ?? []
  if (!photos.length) {
    const r2 = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`, { headers: { Authorization: KEY } })
    photos = r2.ok ? (await r2.json()).photos ?? [] : []
  }
  const p = photos.find(x => !used.has(x.id)) ?? photos[0]
  if (!p) { console.log(`  none for ${key} ("${query}")`); continue }
  used.add(p.id)
  out[key] = { id: p.id, url: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=900&h=900`, alt: p.alt || query, credit: `Photo by ${p.photographer} on Pexels`, tone: p.avg_color }
  process.stdout.write('.')
}

const pools = JSON.parse(readFileSync(join(ROOT, 'scripts/data/synthetic-partner-photos.json'), 'utf8'))
for (const [trade, pool] of Object.entries(pools)) {
  const p = [...pool].reverse().find(x => !used.has(x.id))
  if (!p) continue
  used.add(p.id)
  out[`trade:${trade}`] = { id: p.id, url: p.url.replace('w=1000&h=1000', 'w=700&h=700'), alt: p.alt, credit: p.credit }
}

const body = Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')
writeFileSync(OUT, `// GENERATED by scripts/resolve-customer-photos.mjs — do not edit.
//
// Inspiration photographs for the customer app's category, occasion and
// trade tiles. Licensed stock (Pexels), never a partner's work. Re-run:
//   node --env-file=.env scripts/resolve-customer-photos.mjs --only-missing
// Resolved ${new Date().toISOString().slice(0, 10)}. ${Object.keys(out).length} photographs.

export const PHOTOS = {
${body}
}

export const photoFor = key => PHOTOS[key] ?? null
`)
console.log(`\nwrote ${Object.keys(out).length} photos → src/customer/data/photos.generated.js`)
