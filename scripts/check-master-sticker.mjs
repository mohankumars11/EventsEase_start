#!/usr/bin/env node
/**
 * The sticker must never show a state the booking is not in.
 *
 *   node scripts/check-master-sticker.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS WORTH A SCRIPT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `stickerFor` is nine lines and looks obvious. What it decides is not:
 * a booking is many lines in different states at once, and the rule
 * picks which one the customer is shown.
 *
 * Two of its outputs are claims about the real world that a customer
 * will act on:
 *
 *   CONFIRMED tells somebody their date is held. Shown while a service
 *   is still searching, it is a promise nobody made, and they find out
 *   at the venue.
 *
 *   PAYMENT PENDING is the only state waiting on the customer. Missing
 *   it costs them the master they already had — the unpaid hold expires
 *   (migration 082) and the job is re-dispatched.
 *
 * The mixed cases are where a plausible-looking implementation goes
 * wrong, and they are exactly the cases nobody reproduces by hand,
 * because reaching "one paid, one accepted, one searching" through the
 * UI takes three partners and a payment.
 */
import { loadSrc } from './lib/loadSrc.mjs'

const { stickerFor } = await loadSrc({
  'src/config/instantBooking.js': ['stickerFor'],
})

const L = (...statuses) => statuses.map((status, i) => ({ id: String(i), status }))

const CASES = [
  // ── The plain ones ────────────────────────────────────────────────
  ['nothing at all',                 [],                                          null],
  ['one still being sent',           L('pending'),                                'reaching'],
  ['one being dispatched',           L('dispatching'),                            'reaching'],
  ['one accepted, unpaid',           L('accepted'),                               'pending'],
  ['one paid',                       L('paid'),                                   'confirmed'],

  // ── After a paid line moves on ────────────────────────────────────
  ['delivered still counts as done', L('delivered'),                              'confirmed'],
  ['settled still counts as done',   L('settled'),                                'confirmed'],
  ['in progress counts as done',     L('in_progress'),                            'confirmed'],

  // ── The mixed ones, which are the point ───────────────────────────
  ['money owed outranks a search',   L('dispatching', 'accepted'),                'pending'],
  ['money owed outranks a paid one', L('paid', 'accepted'),                       'pending'],
  ['money owed outranks both',       L('paid', 'dispatching', 'accepted'),        'pending'],
  ['a search outranks a paid one',   L('paid', 'dispatching'),                    'reaching'],
  ['confirmed needs ALL of them',    L('paid', 'paid'),                           'confirmed'],

  // ── Cancelled and expired are not "still searching" ───────────────
  ['a cancelled line is not a state', L('cancelled'),                             null],
  ['cancelled does not hold reaching', L('paid', 'cancelled'),                    'confirmed'],
  ['expired does not hold reaching',   L('paid', 'expired'),                      'confirmed'],
  ['all gone says nothing',            L('cancelled', 'expired'),                 null],
  ['a live line still wins',           L('cancelled', 'dispatching'),             'reaching'],

  /* A status the rule has never heard of -- `disputed` exists in
     migration 062, and more will follow. It is not settled, not gone and
     not in flight, so there is nothing honest to show: better a booking
     with no sticker than one claiming to be confirmed while a dispute is
     open against it. This is the case that makes the final `every` load
     bearing rather than decorative. */
  ['an unknown status says nothing',   L('disputed'),                               null],
  ['one disputed among paid ones',     L('paid', 'disputed'),                       null],
]

console.log('\n  Master sticker\n')
let bad = 0

for (const [name, lines, want] of CASES) {
  const got = stickerFor(lines)
  const ok = got === want
  if (!ok) bad++
  console.log(`    ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(34)} ${String(got)}`
    + (ok ? '' : `   expected ${String(want)}`))
}

/* The rule that matters most, stated once more as a property rather
   than a case: CONFIRMED may never appear beside anything unfinished. */
const UNFINISHED = ['pending', 'dispatching', 'accepted']
for (const u of UNFINISHED) {
  const got = stickerFor(L('paid', u))
  if (got === 'confirmed') {
    bad++
    console.log(`    FAIL confirmed shown beside a '${u}' line`)
  }
}

if (bad) {
  console.error(`\n  ${bad} FAILURE(S) — the sticker would tell a customer something untrue.\n`)
  process.exit(1)
}
console.log(`\n  ${CASES.length} cases + the confirmed-is-never-premature property: all hold\n`)
