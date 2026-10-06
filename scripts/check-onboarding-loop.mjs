#!/usr/bin/env node
/**
 * Does finishing a trade bring the partner back to Step 1?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner in six-step onboarding picked a trade, answered its
 * questionnaire, tapped Submit — and was dumped on the dashboard with
 * Step 1 silently completed behind them. Precisely the failure the
 * six-step redesign was built to prevent.
 *
 * Nothing had "navigated to the dashboard". The dashboard is the HOST
 * that renders the questionnaire, and the return hop was missing: the
 * modal unmounted and left the partner standing on its host. The whole
 * return mechanism existed and was correct; it hung off one condition
 * that could never be true:
 *
 *     const inSetup = pathname.startsWith('/partner/setup')
 *
 * `WhatYouOffer` is mounted only at `/partner/services`. The comment
 * above that line described a routing arrangement that had stopped
 * existing when Step 1 became its own component.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS A STRING TEST AND NOT A RENDER TEST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every existing guard was green while this was broken. check-tabs-render
 * mounts the screens and they mount fine; nothing mounts WRONG. The bug
 * lives in which URL one screen hands to the next, across four files and
 * a modal, and it is only visible if you follow the parameter.
 *
 * So this asserts the contract on the parameter itself: who emits it, who
 * reads it, and who must not drop it.
 *
 *   node scripts/check-onboarding-loop.mjs
 */
import { readFileSync } from 'node:fs'

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

/* Comments describe the bug; code causes it. */
const code = p => readFileSync(p, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const hub   = code('src/pages/partner/steps/BusinessServicesStep.jsx')
const offer = code('src/pages/partner/WhatYouOffer.jsx')
const list  = code('src/components/vendor/VendorServiceList.jsx')
const dash  = code('src/pages/dashboard/VendorDashboard.jsx')
const vonb  = code('src/pages/onboarding/VendorOnboarding.jsx')

console.log('\nTHE MARKER IS EMITTED\n')

ok('Step 1 "Add a service" declares where it came from',
   /\/partner\/services\?from=setup/.test(hub),
   'without ?from=setup the trade flow cannot know to come back')

ok('Step 1 sends a draft trade straight to its questionnaire',
   /tab=list&start=\$\{encodeURIComponent\(l\.trade\)\}&return=setup/.test(hub),
   'it used to send ?start= to a screen that reads no params')

ok('the first-trade detour carries the marker too',
   /tab=list&start=\$\{encodeURIComponent\(queued\[0\]\)\}&return=setup/.test(vonb),
   'a brand-new partner loses it on the no-vendor-row path')

console.log('\nTHE MARKER IS READ, NOT INFERRED\n')

/* The dead condition. Inferring from the pathname is what broke it, and
   it broke silently — so the test is that the inference is GONE. */
ok('inSetup is not inferred from the pathname',
   !/pathname\.startsWith\(['"`]\/partner\/setup/.test(offer),
   'WhatYouOffer is never mounted under /partner/setup, so this is always false')

ok('inSetup reads the explicit parameter',
   /params\.get\(['"`]from['"`]\)\s*===\s*['"`]setup['"`]/.test(offer))

ok('and it still appends &return=setup',
   /return=setup/.test(offer))

console.log('\nTHE DASHBOARD HONOURS IT\n')

ok('returnTo maps to the Step 1 hub',
   /return['"`]\)\s*===\s*['"`]setup['"`]\s*\?\s*['"`]\/partner\/setup\/services['"`]/.test(dash),
   'the destination must be step 1, not the dashboard')

console.log('\nNOTHING DROPS IT MID-FLOW\n')

/* Both handlers replaced the WHOLE query string, so touching any tab
   mid-flow quietly turned an onboarding partner into a dashboard
   visitor. */
ok('a helper exists to carry `return` across param rewrites',
   /keepReturn/.test(dash))
ok('setTab uses it',
   /setTab = id =>\s*setParams\(keepReturn\(/.test(dash),
   'a tab switch would drop return and strand the partner')
ok('onOpenTrade uses it',
   /onOpenTrade=\{trade => setParams\(keepReturn\(/.test(dash))

ok('no bare setParams({ tab: … }) left in the dashboard',
   !/setParams\(\{\s*tab:/.test(dash),
   'every rewrite must go through keepReturn')

console.log('\nBOTH EXITS FROM THE QUESTIONNAIRE COME BACK\n')

/* Two AddItemFlow instances: add, and edit. The edit one ignored
   returnTo unconditionally. */
const closes = [...list.matchAll(/onClose=\{[\s\S]{0,400}?\}\}/g)].map(m => m[0])
ok('both AddItemFlow instances have a close handler', closes.length >= 2,
   `${closes.length} found`)
ok('every close handler honours returnTo',
   closes.every(c => /returnTo/.test(c)),
   'the edit instance used to be onClose={() => setEditing(null)}')

console.log('\nAN ABANDONED WALK DOES NOT HAUNT THE NEXT ONE\n')

ok('the trade queue is cleared when a walk ends',
   /clearQueue\(\)/.test(list),
   'clearQueue was exported and never called, so a localStorage queue survived')

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
