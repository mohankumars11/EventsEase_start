#!/usr/bin/env node
/**
 * Bundle the `src/` modules the serverless functions need.
 *
 *   node scripts/build-api-bundle.mjs           # write the bundle
 *   node scripts/build-api-bundle.mjs --check   # fail if it is stale
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `api/dispatch-booking.js` must price every line server-side, and the
 * pricing engine lives in `src/lib/instantPricing.js`. Importing it
 * directly does not work in production:
 *
 *     node -e "import('./api/dispatch-booking.js')"
 *     → Cannot find module '.../src/data/servicePricing'
 *
 * `src/` uses extensionless relative imports, which Vite resolves and
 * Node's ESM resolver does not. On Vercel the handler therefore throws at
 * import time, returns an HTML 500, and the customer's screen sits on
 * "Finding masters…" for ever.
 *
 * It worked in development only because the dev-API bridge in
 * vite.config.js loads handlers through Vite's own module graph — which
 * is exactly the kind of difference between dev and production that hides
 * a fault until it is live.
 *
 * ── The three ways out, and why this one ─────────────────────────────
 *
 *   1. Add `.js` to every import in `src/`. Correct ESM, and a diff
 *      across most of the codebase for one endpoint's benefit.
 *
 *   2. Re-implement pricing inside `api/`. This is what
 *      `create-milestone-payment.js` does for the payment ladder, and
 *      its own header admits the cost: a second source of truth, kept in
 *      step by a checker. For a nine-line constant that is a fair trade.
 *      For a rate card, a market index, a collar and a tax split, it is
 *      not — the two would drift and the drift would be money.
 *
 *   3. Bundle the real modules into one Node-resolvable file. One source
 *      of truth, no rewriting of `src/`, and the output is a build
 *      artifact rather than a copy somebody maintains.
 *
 * Three it is. The generated file is COMMITTED, for the same reason
 * `config/generatedMarketIndex.js` is: Vercel builds functions from what
 * is in the repository, and a bundle produced only at build time is a
 * bundle that might not be there.
 *
 * ── Which is why --check matters ─────────────────────────────────────
 * A committed artifact goes stale the moment somebody edits the engine
 * and does not re-run this. `--check` compares a hash of the inputs and
 * fails loudly, so a stale bundle is a failed build rather than a price
 * that is silently three weeks old.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import esbuild from 'esbuild'
import { ROOT } from './lib/loadSrc.mjs'

const CHECK = process.argv.includes('--check')
const OUT = join(ROOT, 'api/_lib/pricing.bundle.js')

/**
 * What the handlers actually call. Kept narrow on purpose — every export
 * added here drags its transitive imports into a serverless bundle, and a
 * cold start is paid by a customer waiting on a spinner.
 */
const ENTRY = `
export { priceLine, lineSplit, partnerEarnings, priceBasis } from ${JSON.stringify(join(ROOT, 'src/lib/instantPricing.js'))}
export { tradeFor, TRADE_FOR_SERVICE } from ${JSON.stringify(join(ROOT, 'src/config/vendor.js'))}
export { OFFER_WINDOW_SECONDS, WAVES, MAX_RADIUS_KM, DEFAULT_RADIUS_KM, PLATFORM_FEE_RATE, INSTANT_RATE_MULTIPLIER } from ${JSON.stringify(join(ROOT, 'src/config/instantBooking.js'))}
export { POLICY_VERSION, instantCancellationRung, CANCELLATION_LADDER } from ${JSON.stringify(join(ROOT, 'src/config/policies.js'))}
export { specModeFor, DISCUSS_SERVICES, QUOTE_ONLY_SERVICES, setupSpec } from ${JSON.stringify(join(ROOT, 'src/data/instantSetups.js'))}
export { TAX } from ${JSON.stringify(join(ROOT, 'src/config/legal.js'))}
`

/**
 * Hash of every source that feeds the bundle, so staleness is detectable.
 *
 * ── Line endings are normalised, and that is not cosmetic ────────────
 * The first version hashed raw bytes and the production build failed on
 * the first deploy:
 *
 *     bundle was built from  ef67239207408ee5     (Windows)
 *     sources now hash to    8e7b24af38c0c7b3     (Vercel)
 *
 * Same files, same commit. Git checks out CRLF on Windows and LF on
 * Linux, so a byte hash describes the CHECKOUT rather than the content —
 * and the bundle could never be current on both machines at once. The
 * check would have failed every deploy for ever, while being perfectly
 * green locally.
 *
 * Stripping \r makes the hash a property of the source instead of the
 * platform. UTF-8 is read explicitly for the same reason: this repo is
 * full of em-dashes and rupee signs, and a default-encoding read would
 * make the hash depend on the locale too.
 */
function inputHash(metafile) {
  const files = Object.keys(metafile?.inputs ?? {})
    .filter(f => f.includes('src'))
    .sort()
  const h = createHash('sha256')
  for (const f of files) {
    try {
      h.update(readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'))
    } catch {
      h.update(f)
    }
  }
  return h.digest('hex').slice(0, 16)
}

const result = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, sourcefile: 'api-bundle-entry.js', loader: 'js' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  write: false,
  metafile: true,
  resolveExtensions: ['.js', '.jsx'],
  // `import.meta.env` is Vite's, and does not exist in a Node function.
  // Folded to production values so the dev-only guards compile out.
  define: {
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'import.meta.env.MODE': '"production"',
  },
  logLevel: 'error',
})

const hash = inputHash(result.metafile)
const code = result.outputFiles[0].text

const header = `// GENERATED by scripts/build-api-bundle.mjs — do not edit.
//
// The serverless functions in api/ cannot import from src/ directly:
// those modules use extensionless relative imports that Vite resolves
// and Node's ESM resolver does not. This is the same modules, bundled
// into one file Node can load.
//
// Regenerate after ANY change to the pricing engine, the rate card, the
// policy ladder or the tax constants:
//
//     node scripts/build-api-bundle.mjs
//
// \`npm run build\` runs --check first and fails if this is stale, so a
// forgotten regeneration is a broken build rather than a price that is
// quietly out of date.
//
// inputs: ${hash}
`

if (CHECK) {
  if (!existsSync(OUT)) {
    console.error('\n  api/_lib/pricing.bundle.js is MISSING.\n  Run: node scripts/build-api-bundle.mjs\n')
    process.exit(1)
  }
  const current = readFileSync(OUT, 'utf8')
  const stamped = (current.match(/^\/\/ inputs: ([0-9a-f]+)$/m) ?? [])[1]
  if (stamped !== hash) {
    console.error(`\n  api/_lib/pricing.bundle.js is STALE.`)
    console.error(`    bundle was built from  ${stamped ?? '(no stamp)'}`)
    console.error(`    sources now hash to    ${hash}`)
    console.error(`\n  Run: node scripts/build-api-bundle.mjs\n`)
    process.exit(1)
  }
  console.log(`  api bundle is current (${hash})`)
  process.exit(0)
}

writeFileSync(OUT, header + code)
console.log(`\n  Wrote api/_lib/pricing.bundle.js`)
console.log(`    ${(code.length / 1024).toFixed(0)} KB · inputs ${hash}\n`)
