#!/usr/bin/env node
/**
 * Is there exactly ONE partner experience?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE THING THIS CATCHES
 * ══════════════════════════════════════════════════════════════════════
 *
 * The partner app grew a new design on top of an old one without the old
 * one being taken out, so a partner opening Jobs saw:
 *
 *   the customer app's Navbar, with a hamburger drawer
 *   the new JobsHeader, with the business name again
 *   an old grey <header>, with the business name a THIRD time,
 *     a status pill, a plan pill and a Sign out button
 *   the new bottom bar
 *
 * Every one of those was correct on its own. Together they were four
 * navigation surfaces and three headers, and no amount of reading one
 * component tells you that — it is only visible from above.
 *
 * So this asserts the shape of the whole, not the correctness of a part.
 *
 *   node scripts/check-one-partner-ui.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

const read = p => readFileSync(p, 'utf8')

/* ── Comments are not code ──────────────────────────────────────────
   Every assertion below searches for a SYMPTOM, and a file that
   explains why it removed a symptom contains the word for it. This
   guard's first run failed on four counts, all of them its own prose:
   PartnerBottomNav says "Menu is the three horizontal lines" in the
   comment explaining why it no longer imports Menu, and the shell says
   "drawer" in the comment explaining that nothing slides.

   A guard that reads comments reports the fix as the bug. */
const code = p => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.jsx?$/.test(name)) out.push(p)
  }
  return out
}

const app = code('src/App.jsx')
const nav = code('src/components/layout/PartnerBottomNav.jsx')
const dash = code('src/pages/dashboard/VendorDashboard.jsx')

console.log('\nONE SHELL\n')

ok('the partner dashboard renders inside PartnerAppShell',
   /<PartnerAppShell>[\s\S]{0,200}<VendorDashboard/.test(app),
   'it is still in DashboardShell, which carries the customer Navbar')

ok('DashboardShell no longer wraps the partner dashboard',
   !/<DashboardShell><VendorDashboard/.test(app))

console.log('\nONE NAVIGATION\n')

/* The bar itself. Four, and the four the brief names. */
const tabs = [...nav.matchAll(/\{\s*id:\s*'([a-z]+)',\s*label:\s*'([A-Za-z]+)'/g)]
  .map(m => m[2])
ok('the bottom bar has exactly four tabs', tabs.length === 4, tabs.join(', '))
ok('and they are Jobs, Calendar, Earnings, More',
   JSON.stringify(tabs) === JSON.stringify(['Jobs', 'Calendar', 'Earnings', 'More']),
   tabs.join(', '))

/* The hamburger. `Menu` from lucide IS the three horizontal lines, so
   importing it into the bar is the defect however it is rendered. */
ok('the bar does not use the three-line Menu icon',
   !/\bMenu\b/.test(nav),
   'lucide Menu is the hamburger, and a drawer icon beside a tab bar promises a drawer')

ok('no navigation drawer on the partner shell',
   !/drawer|Drawer/.test(code('src/components/layout/PartnerAppShell.jsx')))

console.log('\nONE HEADER ON JOBS\n')

/* The old header printed the business name at 2xl in the display font.
   The new one prints it once, in JobsHeader. */
ok('the dashboard does not print a second business-name heading',
   !/text-2xl[^>]*font-display[\s\S]{0,80}\{businessName\}/.test(dash),
   'the old grey <header> is back')

/* The control, not the words. handleSignOut may be DEFINED here — the
   closed-account screen and More both need it — but it must not be
   wired to anything the Jobs tab renders. */
ok('no Sign out control on the Jobs tab',
   !/>\s*Sign out\s*</.test(dash) && !/<LogOut\b/.test(dash),
   'the old header had one; it belongs under More, behind its confirm')

console.log('\nNO DEAD SCREENS\n')

ok('the Overview dashboard is gone', !/function Overview\s*\(/.test(dash))
ok('and nothing renders it', !/<Overview\b/.test(dash))

/* ── Off the Jobs tab, not out of the codebase ─────────────────────
   The first version asserted nothing imports them at all, and failed on
   InstallTheApp — which the customer Account screen and the partner
   LANDING page both use legitimately. "Install the app" is a real
   message on a web page; it is only wrong on the Jobs tab of the
   installed app, where it tells somebody to install what they are
   already holding. */
const gone = ['InstallTheApp', 'PartnerResume', 'ListingTracker']
  .filter(n => new RegExp(`<${n}\b`).test(dash))
ok('the old Jobs cards no longer render on the dashboard',
   gone.length === 0, gone.join(', '))

const files = walk('src')
ok('InstallTheApp survives on the web surfaces that need it',
   files.some(f => /Account\.jsx$|PartnerLanding\.jsx$/.test(f)
     && /import InstallTheApp/.test(read(f))))

console.log('\nTHE TRADE ENGINE SURVIVES\n')

/* The consolidation must not have taken the questionnaire with it. */
ok('My Services still renders', /<VendorServiceList/.test(dash))
ok('the onboarding hand-off still resolves',
   /tab === 'list'/.test(dash) && /startTrade=\{params\.get\('start'\)\}/.test(dash),
   'onboarding ends at ?tab=list&start=<trade>')
ok('and ?tab=list lights the More tab',
   /UNDER\s*=\s*\{[^}]*list:\s*'account'/.test(nav),
   'otherwise the bar goes blank on My Services')

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
process.exitCode = bad ? 1 : 0
