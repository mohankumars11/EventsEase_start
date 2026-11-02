#!/usr/bin/env node
/**
 * The visual choices inside a requirement — decoration themes and cake
 * designs — one real photograph each, resolved once from Pexels into
 * src/customer/data/visualCatalogue.generated.js (never searched at runtime).
 *
 *   node --env-file=.env scripts/resolve-visual-catalogue.mjs     # search, keep 6 candidates each
 *   node scripts/resolve-visual-catalogue.mjs --write              # rewrite from candidates + PICK
 *
 * SAMBRAMO inspiration photographs (Pexels License), labelled as such in the
 * app and sent to masters as the customer's REFERENCE — never shown as any
 * master's work. Six candidates are kept so a wrong first result is fixed in
 * PICK after looking, not blind.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/customer/data/visualCatalogue.generated.js')
const CAND = join(ROOT, 'scripts/data/visual-catalogue-candidates.json')

const Q = {
  'theme:teddy': 'teddy bear birthday party decoration',
  'theme:jungle': 'jungle safari birthday party decoration',
  'theme:princess': 'princess birthday party decoration pink',
  'theme:rainbow': 'pastel rainbow balloon decoration',
  'theme:space': 'space theme birthday party decoration',
  'theme:balloon': 'balloon arch backdrop party',
  'theme:marigold': 'marigold flower decoration indian ceremony',
  'theme:cradle': 'decorated cradle flowers baby ceremony',
  'theme:rangoli': 'rangoli flower petals',
  'theme:mandap': 'pooja mandap flower decoration',
  'theme:diya': 'diya lamps decoration',
  'theme:floralstage': 'indian wedding stage floral decoration',
  'theme:weddingmandap': 'wedding mandap decoration flowers',
  'theme:haldi': 'haldi ceremony yellow decoration',
  'theme:pastelwedding': 'pastel wedding reception decor',
  'theme:royal': 'royal indian wedding decor gold',
  'theme:whitefloral': 'white flowers wedding decor',
  'theme:brandstage': 'corporate event stage backdrop',
  'theme:ledstage': 'led screen stage event',
  'theme:ribbon': 'grand opening ribbon cutting',
  'theme:awards': 'awards night stage',
  'theme:lounge': 'corporate event lounge seating',
  'theme:minimalcorp': 'minimal event decor white',
  'theme:fairylights': 'fairy lights party decoration night',
  'theme:rustic': 'rustic party decoration flowers wood',
  'theme:neon': 'neon sign party decoration',
  'theme:boho': 'boho party decor pampas',
  'cake:teddy': 'teddy bear cake',
  'cake:number': 'number one birthday cake',
  'cake:floral': 'floral buttercream cake',
  'cake:fondant': 'fondant theme cake kids',
  'cake:minimal': 'minimal white cake',
  'cake:tiered': 'three tier celebration cake',
  'food:caterer': 'indian catering buffet event',
  'food:cook': 'chef cooking indian food kitchen',
  'food:live': 'live cooking station event',
  'food:counters': 'food counter stall event',
  'food:packed': 'packed meal boxes',
  'food:custom': 'indian food spread',
  'food:drinks': 'mocktails welcome drinks',
  'ent:magician': 'magician show kids',
  'ent:mascot': 'mascot costume party kids',
  'ent:puppet': 'puppet show',
  'ent:games': 'kids party games',
  'ent:singer': 'live singer performance',
  'ent:dj': 'dj party lights',
  'ent:anchor': 'event host microphone stage',
  'ent:band': 'live band music performance',
  'ent:dance': 'dance performance stage',
}
/* After review: key → candidate index when the first is wrong. */
const PICK = {
  'theme:teddy': 4, 'theme:rainbow': 1, 'theme:space': 2, 'theme:balloon': 4, 'theme:marigold': 7, 'theme:rangoli': 3, 'theme:mandap': 9,
  'theme:haldi': 4, 'theme:pastelwedding': 1, 'theme:royal': 2, 'theme:whitefloral': 1, 'theme:brandstage': 2, 'theme:ledstage': 1,
  'theme:awards': 4, 'theme:lounge': 4, 'theme:minimalcorp': 1, 'theme:fairylights': 4, 'theme:rustic': 5,
  'cake:teddy': 3, 'cake:number': 6, 'cake:floral': 1, 'cake:fondant': 2, 'cake:minimal': 8, 'cake:tiered': 1,
  'food:caterer': 1, 'food:cook': 1, 'food:custom': 1, 'ent:magician': 1, 'ent:mascot': 1, 'ent:puppet': 1, 'ent:singer': 3, 'ent:dj': 2, 'ent:anchor': 3, 'ent:band': 1,
}

const WRITE_ONLY = process.argv.includes('--write')
const cand = existsSync(CAND) ? JSON.parse(readFileSync(CAND, 'utf8')) : {}
if (!WRITE_ONLY) {
  const KEY = process.env.PEXELS_API_KEY
  if (!KEY) { console.error('PEXELS_API_KEY missing'); process.exit(1) }
  for (const [k, q] of Object.entries(Q)) {
    if (cand[k]?.query === q && cand[k]?.photos?.length) continue
    const r = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({ query: q, per_page: '10', orientation: 'landscape' })}`, { headers: { Authorization: KEY } })
    if (!r.ok) { console.error(`${k}: ${r.status}`); continue }
    const j = await r.json()
    cand[k] = { query: q, photos: (j.photos ?? []).map(p => ({ id: p.id, url: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=700&h=525`, alt: p.alt ?? '', credit: `Photo by ${p.photographer} on Pexels`, page: p.url, tone: p.avg_color })) }
    console.log(`${k}: ${cand[k].photos.length}`)
  }
  mkdirSync(dirname(CAND), { recursive: true })
  writeFileSync(CAND, JSON.stringify(cand, null, 1))
}
const out = {}
for (const k of Object.keys(Q)) {
  const p = cand[k]?.photos?.[PICK[k] ?? 0]
  if (p) out[k] = { ...p, source: 'pexels', licence: 'Pexels License', kind: 'inspiration' }
}
writeFileSync(OUT, `/* Generated by scripts/resolve-visual-catalogue.mjs — do not edit by hand.
   SAMBRAMO inspiration photographs (kind: 'inspiration'), sent to masters as
   the customer's reference — never a master's own work. */
export const VISUALS = ${JSON.stringify(out, null, 1)}
`)
console.log(`wrote ${Object.keys(out).length} visuals → ${OUT}`)
