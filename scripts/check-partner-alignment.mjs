#!/usr/bin/env node
/**
 * Does everything on a partner tab start on the same line?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TWO FAULTS THIS HOLDS SHUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Both were found in a photograph a partner sent, and neither would ever
 * have produced an error.
 *
 * 1 · A FULL-BLEED BLOCK THAT RE-PADS ITSELF WRONG.
 *     VendorDashboard lays content out in `px-4 sm:px-6` and pulls the
 *     header out of that column with `-mx-4 sm:-mx-6`. The header then
 *     applied its own `px-5`, so every line inside it began 4px further
 *     right than every card beneath it — a stagger down the whole left
 *     edge, too small to report and impossible to unsee.
 *
 * 2 · A SIBLING RENDERED ABOVE A NEGATIVELY-MARGINED HEADER.
 *     `-mt-4` pulls the header up over whatever precedes it. The review
 *     countdown was rendered just above and got dragged half off the top
 *     of the screen, its corners clipped by the header behind it.
 *
 * A static read of the source. It cannot see a layout; it can see the
 * two spellings that produce these, which is what keeps them from
 * coming back.
 *
 *   node scripts/check-partner-alignment.mjs
 *   node scripts/check-partner-alignment.mjs --sabotage
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const read = rel => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : null)
const strip = s => (s ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const DASH = 'src/pages/dashboard/VendorDashboard.jsx'
const HEADER = 'src/components/partner/JobsHeader.jsx'

const dash = strip(read(DASH))
const header = strip(read(HEADER))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE COLUMN AND THE FULL-BLEED BLOCK AGREE\n')

/* The page's own padding, read rather than assumed — if the column is
   ever widened, this guard follows it instead of going stale. */
const column = dash.match(/max-w-5xl mx-auto (px-\d+)[^"`]*?(sm:px-\d+)/)
ok('the page column declares its padding', !!column, 'could not find the container')

if (column) {
  const [, px, smPx] = column
  console.log(`  · the column is ${px} ${smPx}`)

  /* Matched against the COMPONENT, not against the <header> tag.
     JobsHeader splits the two deliberately: <header> carries the
     gradient so it bleeds the full width, and the inner <div> carries
     the padding so the CONTENT lines up with the column. Requiring
     px-4 on the tag itself failed a header that is laid out correctly,
     which is the kind of red that teaches people to ignore a guard. */
  const headerPad = header.match(/\bpx-\d+\b/g) ?? []
  const headerSmPad = header.match(/\bsm:px-\d+\b/g) ?? []

  ok(`the header re-applies ${px}`,
     headerPad.includes(px),
     `the header pads itself ${headerPad.join('/') || 'not at all'}, the column is ${px}`)
  ok(`and ${smPx} at the wider breakpoint`,
     headerSmPad.includes(smPx),
     `found ${headerSmPad.join('/') || 'none'}`)
  ok('and nothing else', !headerPad.includes('px-5'),
     'px-5 against a px-4 column is the 4px stagger')

  /* The pull-out has to match the padding it is cancelling, or the
     block does not reach the screen edge. */
  ok(`the header is pulled out by -mx-${px.slice(3)}`,
     new RegExp(`-mx-${px.slice(3)}\\b`).test(dash))
  ok(`and by sm:-mx-${smPx.slice(6)} at the wider breakpoint`,
     new RegExp(`sm:-mx-${smPx.slice(6)}\\b`).test(dash))
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nNOTHING RENDERS ABOVE THE HEADER\n')

const offersBlocks = [...dash.matchAll(/\{tab === 'offers' &&/g)].map(m => m.index)
const headerAt = dash.indexOf('<JobsHeader')
ok('the header is on the Jobs tab', headerAt > 0)
ok('and it is the FIRST thing that tab renders',
   offersBlocks.length > 0 && headerAt < (offersBlocks[1] ?? Infinity) &&
   headerAt - offersBlocks[0] < 400,
   '-mt-4 drags whatever precedes it half off the top of the screen')

const countdownAt = dash.indexOf('<ReviewCountdown')
ok('the review countdown is BELOW the header',
   countdownAt > headerAt,
   'this is the exact card a partner photographed floating above everything')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONE CLOCK, NOT TWO\n')

/* This section asked the header to READ the shared clock, on the
   assumption that it renders a status pill of its own. It does not, and
   it never did: JobsHeader shows a PARTNER chip and an accepting-jobs
   dot, while destructuring reviewDueAt and reviewSubmittedAt and using
   neither. Two comments in VendorDashboard asserted the pill existed,
   which is how four assertions stayed red without anyone looking.

   The intent -- one clock, so two intervals cannot drift apart and
   disagree -- is better served by the header having NO clock at all.
   So that is what is checked now. */
ok('the countdown owns the clock and exports it',
   /export function useReviewClock/.test(read('src/components/partner/ReviewCountdown.jsx') ?? ''))
ok('the header runs no clock of its own',
   !/useReviewClock\(/.test(header) && !/setInterval/.test(header),
   'a second clock is a second truth about the same deadline')
ok('and is not handed review timestamps it does not render',
   !/reviewDueAt/.test(header) && !/reviewSubmittedAt/.test(header),
   'props passed but unread are how a phantom status pill survived')
ok('the review state has exactly one home on the Jobs tab',
   (dash.match(/<ReviewCountdown/g) ?? []).length === 1)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nSAFE AREAS ARE HONOURED, NOT GUESSED\n')

ok('the header reaches the status bar',
   /safe-area-inset-top/.test(header),
   'without it the brand line sits under the clock on a phone that draws edge to edge')
ok('and it adds the inset TO its padding rather than beside it',
   !/safe-top[^"]*pt-\d/.test(header),
   '.safe-top and pt-3 both set padding-top; the stylesheet decides which, silently')
/* The rule did not change; the file that keeps it did.
   This read VendorDashboard, because that is where the bottom padding
   used to be. It now lives on PartnerAppShell's <main>, whose own header
   says "Set here and nowhere else -- a screen that adds its own gets
   double the gap". VendorDashboard was that screen: it also paid
   calc(76px + inset) inside a <main> already paying calc(68px + inset),
   so every partner tab reserved ~144px plus twice the gesture inset.

   So: assert the shell pays it with the inset, and assert the page does
   NOT pay it a second time. The second half is the check that would have
   caught the doubling. */
const shell = read('src/components/layout/PartnerAppShell.jsx')
ok('the shell clears the tab bar with the inset, not a round number',
   /env\(safe-area-inset-bottom/.test(shell ?? ''),
   'a constant is too much on a phone without a gesture bar and too little on one with')
ok('and the page inside it does not pay the gap twice',
   !/pb-\[calc\([^\]]*safe-area-inset-bottom/.test(dash),
   'PartnerAppShell already pads <main>; a screen that adds its own doubles the dead strip')

const cropper = read('src/components/partner/ImageCropper.jsx')
/* Spelled out rather than using the .safe-top / .safe-bottom helpers.
   Those set padding-top and padding-bottom, and so do Tailwind's pt-*
   and pb-* -- put both on one element and whichever the stylesheet
   happens to emit last wins, silently. On a full-screen sheet that is
   the difference between a button being pressable and sitting under the
   gesture bar. */
ok('the cropper honours the top inset',
   /safe-area-inset-top/.test(cropper ?? ''),
   'a full-screen sheet starts under the status bar')
ok('and the bottom one',
   /safe-area-inset-bottom/.test(cropper ?? ''),
   'a button under the gesture bar cannot be pressed')
ok('and it does not stack a helper class against a Tailwind one',
   !/safe-(top|bottom)[^"]*p[tb]-\d/.test(cropper ?? ''),
   'two rules for one property, resolved by stylesheet order')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nNO TRAILING WHITESPACE IN src/\n')

const offenders = []
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { walk(p); continue }
    if (!/\.(js|jsx|css)$/.test(name)) continue
    const lines = readFileSync(p, 'utf8').split('\n')
    lines.forEach((l, i) => {
      if (/[ \t]+$/.test(l)) offenders.push(`${relative(ROOT, p)}:${i + 1}`)
    })
  }
}
walk(join(ROOT, 'src'))
ok(`every line in src/ ends where it stops (${offenders.length} found)`,
   offenders.length === 0, offenders.slice(0, 5).join(', '))

if (sabotage) {
  ran++
  if (!/<header[^>]*\bpx-5\b/.test(header)) {
    bad++
    fails.push('sabotage: expected the header to be px-5 against a px-4 column, and it is not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
