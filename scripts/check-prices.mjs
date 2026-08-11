/**
 * Price consistency check.
 *
 *   npx vite-node scripts/check-prices.mjs
 *
 * Sambramo states every service price twice, for two different audiences:
 *
 *   servicePricing.js   `base` — what the quote engine actually charges
 *   eventServicesData.js `priceHint`/`priceMin`/`priceMax` — the range the
 *                        customer reads on a service card
 *
 * Both are hand-maintained, and the failure they invite is silent: raise a
 * base past its displayed ceiling and the catalogue advertises "₹8,000 –
 * ₹60,000" while the builder quotes ₹85,000 for the same service. Nobody
 * notices until a customer does, and they notice at exactly the wrong moment.
 *
 * ── The unit trap ──────────────────────────────────────────────────────
 * This check exists in the shape it does because the naive version is wrong
 * twice over. `unit: 'per_guest'` bases are rates, not totals — but the
 * displayed ranges are *not* consistently one or the other:
 *
 *   dining        ₹50 – ₹200/seat      per-unit  (base 120 compares directly)
 *   return_gifts  ₹50 – ₹500/unit      per-unit
 *   gifting       ₹300 – ₹3,000/unit   per-unit
 *   invitations   ₹500 – ₹8,000        a total   (base × headcount)
 *   ice_cream     ₹3,000 – ₹15,000     a total
 *
 * So the suffix on the hint string decides how to compare, and a checker that
 * assumes either convention reports false failures on the other. Both times I
 * wrote it the quick way it flagged healthy rows, which is worse than no
 * check: it trains you to ignore the output.
 */
import { ALL_SERVICES, SERVICE_BY_ID, defaultQty, serviceCost } from '../src/data/servicePricing.js'
import { EVENT_DATA } from '../src/data/eventServicesData.js'

/** Headcounts a per-guest total is sanity-checked across. */
const HEADCOUNTS = [50, 400]

const svc = new Map()
for (const event of Object.values(EVENT_DATA)) {
  for (const s of event.services) svc.set(s.id, s)
}

const failures = []

for (const s of ALL_SERVICES) {
  const hint = svc.get(s.id)
  if (!hint || hint.priceMin == null || hint.priceMax == null) continue

  // Does the displayed range describe one unit, or the whole line?
  const perUnitRange = /\/(seat|unit|guest|person|plate)/.test(hint.priceHint ?? '')

  if (s.unit === 'per_guest' && !perUnitRange) {
    const lo = s.base * HEADCOUNTS[0]
    const hi = s.base * HEADCOUNTS[1]
    if (hi < hint.priceMin || lo > hint.priceMax) {
      failures.push(
        `${s.id}: ${s.base}/guest implies ${lo}–${hi} across ${HEADCOUNTS[0]}–${HEADCOUNTS[1]} guests, ` +
        `which never meets the displayed ${hint.priceMin}–${hint.priceMax}`
      )
    }
    continue
  }

  // Everything else: the base and the range are in the same unit.
  if (s.base < hint.priceMin || s.base > hint.priceMax) {
    failures.push(
      `${s.id}: base ${s.base} is outside the displayed ${hint.priceMin}–${hint.priceMax} (${hint.priceHint})`
    )
  }
}

const checked = ALL_SERVICES.filter(s => svc.has(s.id) && svc.get(s.id).priceMin != null).length

/**
 * ── Packages against their own inclusions ──────────────────────────────
 *
 * A package quotes a whole-job range and lists what is inside it. Those two
 * claims have to survive being multiplied out: if the services a package
 * names cost more than the package's own ceiling, the catalogue is
 * advertising a number the builder will contradict the moment somebody
 * configures the same event.
 *
 * Reported as a warning rather than a failure, because the fix is a
 * commercial decision and there is more than one valid answer — raise the
 * ceiling, or drop an inclusion that does not belong. `baby_shower/cozy` is
 * "intimate & sweet for up to 30 guests" and includes a hired `venue`, which
 * at ₹27,000 is most of its ₹30,000 ceiling on its own; a cozy shower for
 * thirty usually happens at home, so the questionable line there is the
 * inclusion, not the price.
 *
 * Catering and decor are excluded from the sum — they are priced by
 * cuisineMenus/decorPackages in a separate step, so counting them here would
 * bill them twice and flag everything.
 */
const PACKAGE_TEST_GUESTS = 30
const packageWarnings = []

for (const event of Object.values(EVENT_DATA)) {
  for (const pkg of event.packages ?? []) {
    if (pkg.type === 'hamper' || !pkg.includes?.length || !pkg.price_max) continue
    let sum = 0
    const counted = []
    for (const id of pkg.includes) {
      const s = SERVICE_BY_ID[id]
      if (!s) continue                     // priced in the food/decor step
      const amount = serviceCost(s, PACKAGE_TEST_GUESTS, defaultQty(s, PACKAGE_TEST_GUESTS))
      sum += amount
      counted.push(`${id} ${Math.round(amount)}`)
    }
    if (sum > pkg.price_max) {
      packageWarnings.push(
        `${event.id}/${pkg.id}: ceiling ${pkg.price_max}, but its own services already cost ` +
        `${Math.round(sum)} at ${PACKAGE_TEST_GUESTS} guests — ${counted.join(', ')}`
      )
    }
  }
}

if (packageWarnings.length) {
  console.warn(`\nWARN — ${packageWarnings.length} package(s) priced below their own inclusions:\n`)
  for (const w of packageWarnings) console.warn('  ' + w)
  console.warn('\nEither raise price_max, or remove an inclusion that does not belong in that package.')
}

if (failures.length) {
  console.error(`\n${failures.length} price inconsistency(ies) across ${checked} services:\n`)
  for (const f of failures) console.error('  ' + f)
  console.error('\nFix the base in servicePricing.js and the range in eventServicesData.js together.\n')
  process.exit(1)
}

console.log(`\nOK — ${checked} services checked, every base consistent with its displayed range.\n`)
