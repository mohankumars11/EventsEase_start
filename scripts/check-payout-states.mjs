#!/usr/bin/env node
/**
 * Two ladders decide where a partner's money is. They must agree.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FAILURE THIS CATCHES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `payout_state` exists twice, on purpose:
 *
 *   src/lib/payoutState.js                  so the app can render before
 *                                           migration 141 is pasted, and
 *                                           so a filter chip can work
 *                                           without a round trip
 *   migrations/141_*.sql, as a CASE         so the database answers the
 *                                           same question the same way
 *
 * Two implementations of one rule drift. This one decides whether
 * somebody is told their money is available, so the drift is expensive:
 * a state added to the SQL and not the JS renders as a blank chip, and
 * a state added to the JS and not the SQL means the screen and the
 * database describe one job differently -- which is exactly how "Ready
 * to claim" and "Delivered" once disagreed about the same row.
 *
 * So the SQL is PARSED here and its string literals compared against the
 * JS enum. Not a comment saying "keep these in sync".
 *
 * It also pins the two tax rates, which exist in THREE places now:
 * src/config/legal.js, the pricing bundle, and plpgsql constants inside
 * settle_payout_claim. The SQL cannot import the JS; this is the seam.
 *
 *   node scripts/check-payout-states.mjs
 *   node scripts/check-payout-states.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MIG = join(ROOT, 'supabase', 'migrations')
const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

/* ── Bundle the JS side ──────────────────────────────────────────── */
const OUT = join(ROOT, 'node_modules/.cache/payout-states.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/payout-states-entry.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/payoutState.js'))}`,
  `export { TAX } from ${JSON.stringify(join(ROOT, 'src/config/legal.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }
const M = await import(pathToFileURL(OUT).href)
const { payoutState, PAYOUT_STATES, STATE_LABEL, STATE_TONE, isRetryable, TAX } = M

const file = name => {
  const f = readdirSync(MIG).find(x => x.startsWith(name))
  return f ? readFileSync(join(MIG, f), 'utf8') : null
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE SQL LADDER AND THE JS LADDER ARE THE SAME SET\n')

const sql141 = file('141_')
ok('migration 141 is present', !!sql141, 'the view has not been written')

if (sql141) {
  /* The CASE that ends in `AS payout_state`. Taken by position rather
     than by scanning the whole file, because the file contains the word
     in prose and a guard that reads its own documentation as evidence
     reports a fault that is not there. */
  const start = sql141.indexOf('CASE')
  const end = sql141.indexOf('AS payout_state')
  const body = start >= 0 && end > start ? sql141.slice(start, end) : ''

  ok('the payout_state CASE was found', body.length > 0)

  let sqlStates = [...body.matchAll(/THEN\s+'([a-z_]+)'/g)].map(m => m[1])
  const elseArm = body.match(/ELSE\s+'([a-z_]+)'/)
  if (elseArm) sqlStates.push(elseArm[1])
  if (sabotage) sqlStates = sqlStates.filter(s => s !== 'failed')

  const sqlSet = [...new Set(sqlStates)].sort()
  const jsSet = [...PAYOUT_STATES].sort()

  ok('every state the SQL can return exists in the JS',
     sqlSet.every(s => jsSet.includes(s)),
     `SQL-only: ${sqlSet.filter(s => !jsSet.includes(s)).join(', ')}`)
  ok('every state the JS can return exists in the SQL',
     jsSet.every(s => sqlSet.includes(s)),
     `JS-only: ${jsSet.filter(s => !sqlSet.includes(s)).join(', ')}`)
  ok('and the two sets are identical',
     JSON.stringify(sqlSet) === JSON.stringify(jsSet),
     `${sqlSet.join(',')}  vs  ${jsSet.join(',')}`)

  /* Order is part of the meaning: cancelled outranks disputed outranks
     paid. If the SQL put `ready` before `claimed`, a claimed job would
     be offered a claim button. */
  const order = sqlStates.filter((s, i) => sqlStates.indexOf(s) === i)
  ok('cancelled is decided before everything else', order[0] === 'cancelled', order.join(' > '))
  ok('disputed outranks paid',
     order.indexOf('disputed') < order.indexOf('paid'), order.join(' > '))
  ok('a claim outranks the time-based arms',
     order.indexOf('claimed') < order.indexOf('ready'), order.join(' > '))
  ok('held is the fallback', order[order.length - 1] === 'held', order.join(' > '))

  /* The view must test the SAME instant claimable() does, or the screen
     offers a button the RPC then refuses. */
  ok("the view unlocks money with claimable()'s own expression",
     /event_date \+ INTERVAL '1 day'/.test(sql141),
     "092 uses (v_req.event_date + INTERVAL '1 day')")
  ok('and exposes it, so the app stops deriving it from the device clock',
     /AS claimable_at/.test(sql141))
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEVERY STATE HAS WORDS AND A TONE\n')

for (const s of PAYOUT_STATES) {
  ok(`${s} has a label and a note`,
     !!STATE_LABEL[s]?.label && !!STATE_LABEL[s]?.note, s)
}
ok('every state has a tone', PAYOUT_STATES.every(s => !!STATE_TONE[s]))
ok('no state is red', !Object.values(STATE_TONE).includes('crimson'),
   'a failed payout is a thing to redo, not an alarm')
ok('failed is the one a partner can retry',
   isRetryable('failed') && !isRetryable('rejected'),
   'a rejection will not go through on a second try; offering one sends them in a loop')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nONE JOB IS NEVER IN TWO STATES\n')

const base = {
  line_id: 'L', status: 'delivered', is_funded: true,
  paid_at: '2026-09-01T00:00:00Z', delivered_at: '2026-09-04T00:00:00Z',
  event_date: '2026-09-03', quoted_amount_paise: 2500000,
}
const NOW = Date.parse('2026-09-21T12:00:00+05:30')

let seen = new Set(), total = 0
for (const lineStatus of ['accepted', 'paid', 'delivered', 'settled', 'cancelled', 'expired', 'disputed']) {
  for (const funded of [true, false]) {
    for (const delivered of [true, false]) {
      for (const claimStatus of [null, 'requested', 'paid', 'rejected', 'failed']) {
        for (const eventDate of ['2026-01-01', '2026-12-01']) {
          const row = { ...base, status: lineStatus, is_funded: funded,
                        paid_at: funded ? base.paid_at : null,
                        delivered_at: delivered ? base.delivered_at : null,
                        event_date: eventDate }
          const s = payoutState(row, claimStatus ? { status: claimStatus } : null, NOW)
          seen.add(s); total++
          if (!PAYOUT_STATES.includes(s)) {
            ok(`undeclared state ${s}`, false, JSON.stringify(row))
          }
        }
      }
    }
  }
}
ok(`all ${total} combinations return a declared state`, true)
ok('and the ladder is reachable in most of its arms',
   seen.size >= 7, [...seen].join(', '))

ok('a failed claim frees the line to be asked again',
   payoutState({ ...base, event_date: '2026-01-01' }, { status: 'failed' }, NOW) === 'failed' &&
   isRetryable('failed'),
   'uq_claim_one_open_per_line is partial on (requested, paid), so failed is claimable')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE TAX RATES ARE THE SAME IN SQL AND IN JS\n')

const sql139 = file('139_')
ok('migration 139 is present', !!sql139)

if (sql139) {
  const tcs = sql139.match(/c_tcs_rate\s+CONSTANT\s+NUMERIC\s*:=\s*([\d.]+)/)
  const tds = sql139.match(/c_tds_rate\s+CONSTANT\s+NUMERIC\s*:=\s*([\d.]+)/)
  ok('the SQL declares a TCS rate', !!tcs)
  ok('the SQL declares a TDS rate', !!tds)
  const sqlTcs = sabotage ? 0.02 : Number(tcs?.[1])
  ok('TCS matches src/config/legal.js', sqlTcs === TAX.tcsRate,
     `sql ${sqlTcs} vs js ${TAX.tcsRate}`)
  ok('TDS matches src/config/legal.js', Number(tds?.[1]) === TAX.tdsRate,
     `sql ${tds?.[1]} vs js ${TAX.tdsRate}`)
  ok('and the SQL says where the truth lives',
     /config\/legal\.js/.test(sql139),
     'a constant with no provenance is a constant that drifts')
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE LEDGER CLOSES TO ZERO ON A SETTLED LINE\n')

if (sql139) {
  for (const kind of ['RELEASE_PARTNER', 'REMIT_TCS', 'RELEASE_PLATFORM']) {
    ok(`${kind} is written`, new RegExp(`'${kind}'`).test(sql139))
  }
  ok('REMIT_TDS is written only when it applies',
     /IF v_tds > 0 THEN/.test(sql139),
     'a zero-rupee ledger row would violate amount_paise <> 0')
  ok('the four rows are one INSERT, so the solvency trigger sees them together',
     /VALUES\s*\n?\s*\(v_line\.id, 'RELEASE_PARTNER'/.test(sql139),
     'the constraint trigger is AFTER INSERT ... FOR EACH ROW')
  ok('a short balance refuses instead of prorating',
     /'short_balance'/.test(sql139) && /do NOT prorate|Refuse, do NOT prorate/i.test(sql139))
  ok("this is the first code to write booking_lines 'settled'",
     /SET status = 'settled'/.test(sql139))
  ok('a dispute stops it', /'disputed'/.test(sql139))
  ok('settling twice is a replay, not a second transfer',
     /'replayed', true/.test(sql139))
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (sabotage) {
  console.log(bad >= 2
    ? `${tick} sabotage was caught\n`
    : `${cross} SABOTAGE WAS NOT CAUGHT -- this guard is vacuous\n`)
  process.exitCode = bad >= 2 ? 0 : 1
} else {
  process.exitCode = bad ? 1 : 0
}
