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

  ok(`the header re-applies ${px}`,
     new RegExp(`<header[^>]*\\b${px}\\b`).test(header),
     'the header pads itself differently from the column it was pulled out of')
  ok(`and ${smPx} at the wider breakpoint`,
     new RegExp(`<header[^>]*\\b${smPx}\\b`).test(header))
  ok('and nothing else', !/<header[^>]*\bpx-5\b/.test(header),
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

ok('the header reads the shared clock',
   /useReviewClock\(/.test(header),
   'two intervals drift apart and the pill disagrees with the card below it')
ok('and the countdown exports it',
   /export function useReviewClock/.test(read('src/components/partner/ReviewCountdown.jsx') ?? ''))
ok('the header does not run its own interval',
   !/setInterval/.test(header))
ok('the figure is tabular, so the row does not twitch',
   /tabular-nums/.test(header))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nSAFE AREAS ARE HONOURED, NOT GUESSED\n')

ok('the header reaches the status bar',
   /safe-area-inset-top/.test(header),
   'without it the brand line sits under the clock on a phone that draws edge to edge')
ok('and it adds the inset TO its padding rather than beside it',
   !/safe-top[^"]*pt-\d/.test(header),
   '.safe-top and pt-3 both set padding-top; the stylesheet decides which, silently')
ok('the page clears the tab bar with the inset, not a round number',
   /env\(safe-area-inset-bottom/.test(dash),
   'a constant is too much on a phone without a gesture bar and too little on one with')

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
