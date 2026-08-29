#!/usr/bin/env node
/**
 * Assemble the pre-deployment test report.
 *
 *   node scripts/shrink-report.mjs && node scripts/build-test-report.mjs
 *
 * One self-contained HTML file with every capture inlined, so the report
 * is the evidence rather than a page that links to it. Written because
 * "I checked it" stopped being worth anything: builds went out on that
 * sentence and came back broken, and the agreement now is that nothing
 * deploys without pictures somebody can look at first.
 *
 * The captions state what each picture PROVES. Where a picture proves
 * nothing on its own — a screen that renders is not a screen that works
 * — the caption says which server call or check backs it.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const SMALL = join(ROOT, 'docs', 'test-report', 'small')
const OUT = join(ROOT, 'docs', 'test-report', 'report.html')

if (!existsSync(SMALL)) {
  console.error('\n  Run scripts/shrink-report.mjs first.\n')
  process.exit(1)
}

const dataUri = f => `data:image/jpeg;base64,${readFileSync(join(SMALL, f)).toString('base64')}`

/* ── What each capture is evidence OF ─────────────────────────────────
   `fixed` marks a picture that shows something repaired in this round.
   Everything else was already working and is here because a claim
   without a picture is the thing that stopped being accepted. */
const SHOTS = [
  { f: '14-matching-board.jpg', t: 'The matching board, live',
    fixed: true,
    say: 'A real request with three services. Anu events accepted the photography through <code>accept_offer()</code> from their own signed-in session — the same call the Accept button makes — and the board says so by name, at 0.5 km, with a pay button for that one line. The other two keep hunting. <b>Fixed here:</b> every row used to draw the same generic sparkle, because the board never selected <code>service_id</code> or <code>trade</code>. It now reads camera, balloon, cake.' },

  { f: '22-paid-confirmation.jpg', t: 'A line that has been paid for',
    say: 'Photography reads <b>Paid · confirmed</b> in green at the full ₹9,560 while the other two keep hunting — the per-service model, working. <b>Read this one carefully:</b> no rupee moved. <code>check-booking-capture.mjs</code> writes a test capture (<code>pay_TEST…</code>, a ₹1 hold) against an accepted line to exercise the webhook’s shapes, and that is what flipped this line. The screen is genuine; the money behind it is a fixture. A real ₹1 payment is still the one thing outstanding. One nit visible here: the subhead still says “you can pay for these now” when the only payable line is already paid.' },

  { f: '15-cancel-sheet.jpg', t: 'Cancelling one service',
    say: 'Scoped to the one service and it says so. The refund line is fetched from <code>cancellation_quote()</code> before the button is drawn, so the customer sees the consequence first — here “nothing has been charged, so there is nothing to refund”, which is the correct answer for a line that is accepted but unpaid.' },

  { f: '21-home-resume.jpg', t: 'Getting back into a booking',
    fixed: true,
    say: 'Closing the app no longer loses the booking: the home screen carries it back. <b>Fixed here:</b> this card was reading every open line the customer had across every booking, so a three-service booking showed “+9”, one booking’s date beside another’s services, and a tap that led wherever the sort landed. It now describes one booking, and names the others underneath instead of swallowing them.' },

  { f: '16-partner-jobs.jpg', t: 'The partner’s jobs',
    say: 'Two live offers with a countdown and the earning stated before the tap, then the accepted job below: <b>waiting for payment</b>, ₹8,795 — the exact figure <code>accept_offer()</code> returned — with “do not buy anything for this job yet” and the customer’s name and number locked until the money is through. “I can no longer do this job” is the decline-after-accept path.' },

  { f: '20-partner-menu.jpg', t: 'The partner menu',
    fixed: true,
    say: 'Dashboard and Sign out. Nothing else. This is the menu that was showing customer items — Track, cart, occasions — to somebody using the partner app.' },

  { f: '17b-dead-service-row.jpg', t: 'A service that could never be offered',
    fixed: true,
    say: 'A real partner typed “videpgraphy”. Dispatch matches on the trade, so that row has never once been offered to them, and the screen looked exactly like the working row beside it. It now says so, and only on the broken row. The form above now requires a trade from a list, so no new row can be born dead.' },

  { f: '09c-service-options.jpg', t: 'What exactly, per service',
    fixed: true,
    say: 'Photography forks on style and delivery; the cake on flavour and dietary need; every choice carries what it makes the line cost. <b>Fixed here:</b> decor had no questions at all — a photo corner and a decorated hall were the same button at the same price. The three rows are now the real rate-card setups, and the heading is the trade rather than the raw id “decor”.' },

  { f: '09b-offer-unlocked.jpg', t: 'The unlock moment',
    say: 'Fires when the basket crosses a threshold it did not meet a moment ago — never on load, never twice for the same offer. On white, and it says who funds it: “Sambramo funds this. Your masters are paid their full rate.”' },

  { f: '09-instant-services.jpg', t: 'Picking the masters',
    say: 'Live prices per service at this headcount, from the same rate card the server quotes from.' },

  { f: '17-partner-list.jpg', t: 'What a partner offers',
    say: 'Thirteen services, every one carrying a trade dispatch can match. This is the screen the backfill repaired.' },

  { f: '18-partner-availability.jpg', t: 'The partner’s calendar' },
  { f: '19-partner-account.jpg',      t: 'The partner’s account' },
  { f: '01-customer-home.jpg',        t: 'Customer home' },
  { f: '05-services.jpg',             t: 'Occasions' },
  { f: '06-plan-hub.jpg',             t: 'Plan' },
  { f: '07-instant-when.jpg',         t: 'When is it?' },
  { f: '08-instant-where.jpg',        t: 'Where is it?' },
  { f: '10-celebrate-journey.jpg',    t: 'The pre-book journey' },
  { f: '11-track.jpg',                t: 'Track' },
  { f: '13-account.jpg',              t: 'Customer account' },
  { f: '04-partner-landing.jpg',      t: 'Partner landing' },
  { f: '12-vendor-dashboard.jpg',     t: 'Partner dashboard, signed out' },
  { f: '02-login.jpg',                t: 'Sign in' },
  { f: '03-signup.jpg',               t: 'Sign up' },
]

const missing = SHOTS.filter(s => !existsSync(join(SMALL, s.f)))
if (missing.length) {
  console.error('\n  Missing captures: ' + missing.map(m => m.f).join(', ') + '\n')
  process.exit(1)
}
const extra = readdirSync(SMALL).filter(f => f.endsWith('.jpg') && !SHOTS.some(s => s.f === f))
if (extra.length) console.log('  (not in the report: ' + extra.join(', ') + ')')

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const card = (s, i) => `
      <figure class="shot${s.fixed ? ' shot--fixed' : ''}">
        <div class="shot__frame">
          <img src="${dataUri(s.f)}" alt="${esc(s.t)}" loading="${i < 4 ? 'eager' : 'lazy'}" />
        </div>
        <figcaption>
          <h3>${esc(s.t)}${s.fixed ? ' <span class="tag tag--fixed">fixed</span>' : ''}</h3>
          ${s.say ? `<p>${s.say}</p>` : ''}
          <p class="shot__file">${esc(s.f.replace(/\.jpg$/, '.png'))}</p>
        </figcaption>
      </figure>`

const html = readFileSync(join(ROOT, 'scripts', 'lib', 'report-template.html'), 'utf8')
  .replace('<!--SHOTS-->', SHOTS.map(card).join('\n'))
  .replace(/<!--COUNT-->/g, String(SHOTS.length))
  .replace('<!--DATE-->', new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  }))

writeFileSync(OUT, html, 'utf8')
console.log(`\n  docs/test-report/report.html · ${SHOTS.length} captures · ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB\n`)
