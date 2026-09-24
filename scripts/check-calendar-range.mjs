#!/usr/bin/env node
/**
 * Can the calendar say "available" as easily as it says "blocked"?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BIAS THIS EXISTS TO STOP COMING BACK
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old sheet wrote ranges, but only BLOCKED ones. The only bulk
 * action the calendar offered was the one that stops work: a partner
 * could close October in two taps and could only open it thirty-one
 * taps at a time. That is a bias in the tool, and it quietly pushed
 * every partner's calendar towards closed.
 *
 * This is a STATIC read of the components. It cannot prove a button
 * works -- the headless screenshot run does that -- but it can prove the
 * four answers exist, that they reach the right write, and that no
 * component has started deciding availability rules for itself.
 *
 *   node scripts/check-calendar-range.mjs
 *   node scripts/check-calendar-range.mjs --sabotage
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
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

const read = rel => {
  const p = join(ROOT, rel)
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

/* Comments explain the rules they enforce, in the same words the rules
   are written in, so a checker that reads documentation as evidence
   proves nothing. Stripped, as every other guard here does. */
const strip = s => (s ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const SHEET = 'src/components/partner/AvailabilityRangeSheet.jsx'
const DAY = 'src/components/partner/DayDetailSheet.jsx'
const MONTH = 'src/components/partner/CalendarMonth.jsx'
const ALERTS = 'src/lib/calendarAlerts.js'

const sheetSrc = read(SHEET), daySrc = read(DAY), monthSrc = read(MONTH)
const sheet = strip(sheetSrc), day = strip(daySrc), month = strip(monthSrc)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE SHEET EXISTS AND THE OLD ONE IS GONE\n')

ok('AvailabilityRangeSheet is there', !!sheetSrc)
ok('BlockDatesSheet has been removed',
   !existsSync(join(ROOT, 'src/components/partner/BlockDatesSheet.jsx')),
   'two range sheets means two sets of rules')
ok('and nothing still imports it',
   !/from ['"].*BlockDatesSheet['"]/.test(month + day))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nFOUR ANSWERS, NOT ONE\n')

for (const [id, label] of [
  ['OPEN', 'Available'], ['LIMITED', 'Limited'],
  ['BLOCKED', 'Blocked'], ['CLEAR', 'Clear'],
]) {
  ok(`the partner can choose ${label}`,
     new RegExp(`id: '${id}'`).test(sheet), `no ${id} mode`)
}

ok('Available is offered before Blocked',
   sheet.indexOf("id: 'OPEN'") < sheet.indexOf("id: 'BLOCKED'"),
   'the order of the buttons is the suggestion the screen makes')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nCLEAR IS NOT THE SAME WRITE AS AVAILABLE\n')

/* The distinction useVendorAccount.js:308-320 documents. An OPEN row
   OUTRANKS a standing day off; clearing deletes so the standing week
   takes back over. Collapsing them makes the weekly pattern
   unrecoverable once a date has been touched. */
ok('Clear carries a null status', /id: 'CLEAR'[\s\S]{0,80}status: null/.test(sheet))
ok('and a null status routes to onClearDays',
   /mode\.status === null\)?\s*\{\s*await onClearDays\(days\)/.test(sheet),
   'clearing must DELETE the rows, not write OPEN ones')
ok('everything else routes to onSetRange',
   /else \{\s*await onSetRange\(days, mode\.status/.test(sheet))
ok('Clear is never written as an OPEN upsert',
   !/onSetRange\(days, 'OPEN'/.test(sheet))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEACH MODE ASKS FOR WHAT IT NEEDS AND NOTHING MORE\n')

ok('a cap is asked for only when Limited',
   /mode\.status === 'LIMITED' && \(/.test(sheet))
ok('a reason is asked for only when Blocked',
   /mode\.status === 'BLOCKED' && \(/.test(sheet))
ok('slots_total is null unless Limited',
   /slots_total: mode\.status === 'LIMITED'/.test(sheet))
ok('reason is null unless Blocked',
   /reason: mode\.status === 'BLOCKED' \? reason : null/.test(sheet))
ok('a note is not asked for when clearing',
   /mode\.status !== null && \(/.test(sheet),
   'there is no row left to attach a note to')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE COUNT IS ON THE BUTTON, BEFORE THE TAP\n')

ok('the cap is 90 days', /MAX_DAYS = 90/.test(sheet))
ok('the button prints the day count',
   /mode\.cta\(days\.length\)/.test(sheet),
   '"14 to 16" is three days to a person and two to a naive loop')
ok('every mode words its own button', /cta: n =>/.test(sheet))
ok('truncation is announced',
   /truncated && \(/.test(sheet) && /longer than \{MAX_DAYS\} days/.test(sheetSrc),
   'a silent truncation is how somebody blocks 90 days believing they blocked 300')
ok('the range is expanded by the shared engine, not a local loop',
   /expandRange\(from, to, MAX_DAYS\)/.test(sheet) &&
   !/setUTCDate\(/.test(sheet),
   'a second expansion is a second off-by-one')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE CONFIRM IS ARMED BY RED AND BY NOTHING ELSE\n')

ok('the sheet asks the engine, it does not judge',
   /assessChange\(\{/.test(sheet))
ok('the second press is gated on needsConfirm',
   /alert\.needsConfirm && !confirm/.test(sheet))
ok('and not on the level being merely non-info',
   !/level !== LEVEL\.INFO/.test(sheet),
   'confirming on every warning makes the confirmation routine')
ok('editing the range disarms the confirm',
   /setConfirm\(false\) \}, \[from, to, modeId\]/.test(sheet),
   'somebody who changed the dates has not agreed to the new warning')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nNO COMPONENT DECIDES AVAILABILITY FOR ITSELF\n')

for (const [rel, src] of [[SHEET, sheet], [DAY, day]]) {
  ok(`${rel.split('/').pop()} does not import supabase`,
     !/from ['"].*lib\/supabase['"]/.test(src),
     'every write goes through useVendorAccount, which owns the cache')
  ok(`${rel.split('/').pop()} does not build its own rows`,
     !/vendor_id:/.test(src))
}
ok('the alert wording lives in lib, not in the sheet',
   /from '\.\.\/\.\.\/lib\/calendarAlerts'/.test(sheet))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA DATE OPENS A RANGE\n')

ok('the day sheet offers to apply to a range',
   /onApplyToRange/.test(day),
   'tap a date, then say the same thing about the week after it')
ok('and it carries the chosen state across',
   /onApplyToRange\(status\)/.test(day))
ok('the month hands the tapped date over as the start',
   /setRange\(\{ from: selected, mode \}\)/.test(month))
ok('and closes the day sheet behind it',
   /setRange\(\{ from: selected, mode \}\); setSelected\(null\)/.test(month))

ok('the header button no longer says Block',
   !/Block dates/.test(month),
   'the only bulk action being a closing one is the bias itself')
/* ── This used to assert the duplicate ─────────────────────────────
   The old test was that BOTH "Mark a range available" and "Block a
   range of dates" appeared in the tools list. That was written to prove
   the list was not blocking-only -- a real bias worth catching -- but
   it locked in the wrong fix: two rows opening the SAME sheet, which
   carries a four-way picker across the top. Whichever row you pressed,
   the first thing you saw was the choice you had supposedly just made,
   and the two modes NOT named by either row (Limited, and clearing days
   back to the standing week) were hidden behind labels mentioning
   neither.

   So the assertion is now the fix rather than the symptom: one row, and
   a sheet that genuinely offers every direction. */
ok('the tools list has ONE range row, not one per direction',
   /Set a range of dates/.test(monthSrc)
   && !/Mark a range available/.test(monthSrc)
   && !/Block a range of dates/.test(monthSrc),
   'two rows opening one sheet is one tool listed twice, each time under half its name')

ok('and that row names what the sheet can actually do',
   /Available, limited or blocked/.test(monthSrc))

ok('the sheet still offers all four directions',
   ['OPEN', 'LIMITED', 'BLOCKED', 'CLEAR'].every(id => new RegExp(`id: '${id}'`).test(sheetSrc)))

ok('and it opens on Available, not Blocked',
   /MODES\.find\(m => m\.id === modeId\) \?\? MODES\[0\]/.test(sheetSrc),
   'the row no longer preselects a mode, so the fallback is what arms by default')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE DEMAND NUMBER IS READ, NOT INVENTED\n')

ok('the month reads date_demand', /rpc\('date_demand'/.test(month))
ok('a failed demand read is survivable',
   /demandRes\?\.error \? \[\]/.test(month),
   'a calendar that would not open because analytics were missing is a worse trade')
ok('the rows go through the shared indexer',
   /indexInterestRows\(/.test(month))
ok('the day sheet respects the same floor',
   /INTEREST_FLOOR/.test(day),
   '"1 enquiry" on a date reads as "nobody wants this"')
ok('and shows it only while blocking',
   /status === 'BLOCKED' && asking > 0/.test(day),
   'a demand count shown while opening up is encouragement, not information')

if (sabotage) {
  ran++
  if (!/onSetRange\(days, 'OPEN'/.test(sheet)) {
    bad++
    fails.push('sabotage: expected Clear to be written as an OPEN upsert, and it is not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
