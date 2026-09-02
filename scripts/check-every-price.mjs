/**
 * Every dispatchable service must be priceable. All of them. Always.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS FOUND, WHICH HAD BEEN THERE FOR MONTHS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `mandap`, `balloon`, `welcome_drinks` and `lighting` were all in
 * TRADE_FOR_SERVICE, so the app offered them, partners could list them
 * and dispatch would have matched them. None of them had a rate card
 * anywhere, so `priceLine()` returned null and api/dispatch-booking
 * answered:
 *
 *   400  cannot price mandap
 *
 * That is not one broken line. The endpoint prices every line BEFORE
 * writing anything -- deliberately, so a half-built booking with a Rs 0
 * line is impossible -- so a customer who added a mandap to a basket of
 * six other services lost the entire booking, with a message that told
 * them nothing.
 *
 * Nothing caught it. It is not a type error, not a lint error, not a
 * render error; the build is green and the route smoke-tests clean. It
 * only appears when somebody taps that particular service.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THREE HEADCOUNTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The ladder in servicePricing.js multiplies by guest bands, and
 * `qtyFor` on per-unit services derives a quantity from the headcount. A
 * service can price correctly at 150 and return zero at 20 if its
 * quantity function floors to nothing. 20, 150 and 600 straddle the
 * bands that exist.
 *
 * Falsifiable: delete any rate card and this fails, naming the service.
 *
 * Usage:  node scripts/check-every-price.mjs
 */
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const vendor = await load('src/config/vendor.js')
const pricing = await load('src/lib/instantPricing.js')

const ids = Object.keys(vendor.TRADE_FOR_SERVICE)
const HEADCOUNTS = [20, 150, 600]
const bad = []

for (const id of ids) {
  for (const guests of HEADCOUNTS) {
    let q = null
    try {
      q = pricing.priceLine({ serviceId: id, guestCount: guests })
    } catch (e) {
      bad.push(`${id} at ${guests} guests threw: ${e.message}`)
      continue
    }
    if (!q) { bad.push(`${id} at ${guests} guests has no rate card`); continue }
    if (!(q.paise > 0)) bad.push(`${id} at ${guests} guests priced ${q.paise}`)
  }
}

console.log(`\n  ${ids.length} dispatchable services, priced at ${HEADCOUNTS.join(', ')} guests`)

if (bad.length) {
  console.error(`\n  FAILED — ${bad.length} problems\n`)
  for (const b of bad) console.error('   · ' + b)
  console.error('\n  A service dispatch can offer and pricing cannot quote')
  console.error('  fails the WHOLE booking, not just its own line.\n')
  process.exit(1)
}

console.log('\n  Everything dispatch can offer, pricing can quote.\n')
