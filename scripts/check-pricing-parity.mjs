#!/usr/bin/env node
/**
 * Every trade's Pricing tab IS Anchor & MC's, not a lookalike.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS GUARDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Anchor & MC's Pricing Control Center has a heading, a price-update
 * card, a packages carousel, five named sections and a Customer
 * preview / Edit listing bar. The other 33 trades used to have none of
 * it — a different screen depending on which trade you happened to
 * list.
 *
 * They are now one component: TradePricing normalises a trade's
 * listing version into the shape PricingControlCenter expects and
 * renders THAT. So parity is not something to re-check section by
 * section — it holds structurally, and what has to be guarded is that
 * the arrangement stays structural:
 *
 *   1. the trade screen renders the real control center
 *   2. it does not grow its own Section / sections again
 *   3. the adapter fills every field the control center reads, or a
 *      section silently renders empty for 33 trades
 *   4. no customer price or fee rate reaches a partner-facing surface
 *   5. the readiness checklist still renders — moving onto the shared
 *      control center once left it imported and unused, and that is the
 *      only place a partner is told WHY they cannot be booked
 *
 *   node scripts/check-pricing-parity.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => { try { return readFileSync(join(ROOT, p), 'utf8') } catch { return null } }
const codeOf = s => (s ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ')

let ran = 0, bad = 0
const ok = (name, cond, detail) => {
  ran++
  if (cond) { console.log(`  ✓ ${name}`); return }
  bad++
  console.log(`  ✗ ${name}${detail ? `   <-- ${detail}` : ''}`)
}

console.log('\n  Every trade gets Anchor & MC\'s Pricing tab\n')

const anchorSrc = read('src/components/vendor/pricing/PricingControlCenter.jsx')
const tradeSrc = read('src/components/vendor/pricing/TradePricing.jsx')
const tabSrc = read('src/components/vendor/pricing/PricingTab.jsx')
const anchor = codeOf(anchorSrc)
const trade = codeOf(tradeSrc)

ok('the control center exists', !!anchorSrc)
ok('the shared-engine screen exists', !!tradeSrc)
ok('the pricing tab exists', !!tabSrc)

/* 1 · one component, not two */
ok('the trade screen renders the real control center',
   /<PricingControlCenter\b/.test(trade),
   'the 33 trades must use Anchor\'s component, not a copy of its layout')
ok('and does not define its own Section',
   !/^\s*(const|function)\s+Section\b/m.test(trade),
   'that is how the two screens diverged the first time')
ok('and does not hand-roll the sections again',
   !/title="My pricing models"/.test(trade) && !/title="Booking & payment rules"/.test(trade),
   'those belong to the control center now')

/* 2 · the control center still has what it is meant to have */
for (const title of ['My listing', 'My pricing models', 'Extra services',
                     'Other booking charges', 'Booking & payment rules']) {
  ok(`the control center still has "${title}"`, anchor.includes(`title="${title}"`))
}
ok('it still opens with the Pricing Control Center heading', anchor.includes('Pricing Control Center'))
ok('it still shows the price update window', anchor.includes('Price update window'))
ok('it still ends with Customer preview and Edit listing',
   anchor.includes('Customer preview') && anchor.includes('Edit listing'))
ok('it still renders the shared PackageCarousel', anchor.includes('PackageCarousel'))

/* 3 · the adapter fills every field the control center reads.
       A missing key is not a crash -- it renders an empty section for
       33 trades and looks like a design choice. */
const READS = ['listing', 'models', 'addons', 'charges', 'rules', 'packages', 'status', 'version']
const unmapped = READS.filter(k => !new RegExp(`(^|[^\\w])${k}:`, 'm').test(trade))
ok(`the adapter maps every field the control center reads (${READS.length} checked)`,
   unmapped.length === 0,
   unmapped.length ? `${unmapped.join(', ')} — that section renders empty for 33 trades` : '')

/* 4 · no customer price on a partner-facing surface.

   The file also holds the CUSTOMER PREVIEW, where a customer price is
   exactly right. So: the words never appear anywhere, and
   customer_paise only inside the preview sheet. An earlier version
   sliced the file at the preview and could not see a leak in anything
   defined after it. */
const WORDS = ['Customer pays', 'platform_fee_rate', 'You earn']
const said = WORDS.filter(t => trade.includes(t))
ok('no customer total or fee rate anywhere on the partner screen', said.length === 0, said.join(', '))

/* customer_paise cannot be judged by its NAME here: the package sheet
   is fed `customer_paise: rate` where rate is take_home_paise, so the
   key is misleading but the value is the partner's. Checking the name
   flagged correct code. What matters is the LABEL a partner reads. */
ok('the package sheet labels its figure as the partner rate',
   /Your rate/.test(trade),
   'a figure with no owner is read as whatever the reader assumes')
ok('the package sheet prefers the explicit rate_paise',
   /rate_paise \?\? /.test(trade),
   'falling back first to a key named customer_paise invites a real leak later')

/* 5 · the regression this file was written after */
ok('the readiness checklist is rendered, not merely imported',
   /<ReadinessChecklist\b/.test(trade),
   'it is the only place a partner is told WHY they cannot be booked')
ok('and it is fed the server\'s own answer',
   /d\.readiness/.test(trade),
   'listing_readiness() decides bookability; recomputing it here would drift')

console.log(`\n${bad ? '✗' : '✓'} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
