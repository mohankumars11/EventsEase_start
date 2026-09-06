#!/usr/bin/env node
/**
 * No two things a partner answers may share a key.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CLASS OF BUG, NOT THE EIGHT INSTANCES
 * ══════════════════════════════════════════════════════════════════════
 *
 * AddItemFlow keeps every answer in ONE flat object and writes it to
 * vendor_services.specs. Two things sharing a key means the second
 * silently destroys the first, and there is nothing on screen to say so
 * — the partner sees their tick land and never learns the earlier one
 * went.
 *
 * That already happened once, to eight trades: an ops group whose id
 * also existed on their detail screen. Photography, Videography and
 * Event Lighting all had `kit` twice; Tent & Furniture `stock`, Anchor &
 * MC `languages`, Priest & Rituals `samagri`, Mehendi Artist `styles`,
 * Transportation `fleet`. Nobody reported it, because a lost tick looks
 * exactly like a tick you forgot to make.
 *
 * Namespacing fixed those eight. This checks the CLASS, so the ninth
 * cannot be added quietly:
 *
 *   1. Two questions in one trade's flow sharing a state key.
 *   2. A question whose key collides with a RESERVED specs key —
 *      `specs = { ...detail }` and then `specs.menus = menus`, so a
 *      group id of `menus` is overwritten by the menu list and the
 *      answer is gone for a completely different reason.
 *   3. A key that would collide with the `__other` free-text slot of
 *      another question.
 *
 *   node scripts/check-listing-keys.mjs
 */
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const P   = await load('src/data/partnerCatalogue.js')
const S   = await load('src/data/partnerSpecs.js')
const SS  = await load('src/data/partnerServiceSpecs.js')
const OPS = await load('src/data/partnerOperations.js')
const F   = await load('src/data/cateringFunnel.js')

/**
 * Every key the submit block writes to specs itself.
 *
 * Read from the source rather than typed here, so a new one added next
 * month is covered without anyone remembering to update this list.
 */
const flow = readFileSync('src/components/vendor/AddItemFlow.jsx', 'utf8')
const RESERVED = new Set(
  [...flow.matchAll(/\bspecs\.([a-z_][a-z0-9_]*)\s*=/gi)].map(m => m[1]))

const fails = []
const trades = P.TRADES.map(t => typeof t === 'string' ? t : (t.name ?? t.id))

for (const trade of trades) {
  const picked = (P.offeringsForTrade(trade) ?? []).map(o => o.serviceId)
  const groups = SS.specsForServices(picked, S.specsForTrade(trade))
  const opsScreens = OPS.operationScreensFor(trade) ?? []
  const isCatering = trade === 'Catering & Food'

  /* Exactly the keys the screens write, from exactly the lists they
     render. A key invented here would test a flow that does not exist. */
  const asked = []
  for (const g of groups) asked.push({ key: g.id, where: 'detail' })
  for (const s of opsScreens) {
    for (const g of s.groups ?? []) asked.push({ key: g.stateKey ?? g.id, where: `ops:${s.id}` })
  }
  if (isCatering) {
    for (const g of F.FUNNEL_QUESTIONS) asked.push({ key: g.id, where: 'funnel' })
  }

  const seen = new Map()
  for (const { key, where } of asked) {
    if (seen.has(key)) {
      fails.push(`${trade}: "${key}" is asked on ${seen.get(key)} AND ${where}`
        + ` — the second answer overwrites the first`)
    } else seen.set(key, where)

    if (RESERVED.has(key)) {
      fails.push(`${trade}: "${key}" on ${where} collides with specs.${key},`
        + ` which submit assigns after spreading detail — the answer is lost`)
    }
  }

  /* Free text is stored at `${key}__other`. A question literally named
     x__other would land in the same slot as question x's free text. */
  for (const { key, where } of asked) {
    if (key.endsWith('__other')) {
      const base = key.slice(0, -7)
      if (seen.has(base)) fails.push(`${trade}: "${key}" on ${where} is the free-text slot of "${base}"`)
    }
  }
}

console.log(`\n  ${trades.length} trades · ${RESERVED.size} reserved specs keys read from the flow:`)
console.log(`  ${[...RESERVED].sort().join(', ')}\n`)

if (fails.length) {
  console.error('  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('  No two answers share a key.\n')
