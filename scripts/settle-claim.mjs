#!/usr/bin/env node
/**
 * Mark a partner payout paid, or failed, against the real database.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no payout provider and no operator console. A payout is a
 * person with a bank app, and until migration 139 there was no way to
 * record that it had happened -- `payout_claims.status = 'paid'` was
 * reachable only by a raw UPDATE, which wrote no ledger row, left
 * `escrow_position.held_paise` positive forever, and left the line
 * un-settled.
 *
 * 139 fixes that with `settle_payout_claim()`. This is the safe way to
 * call it: the alternative is typing SQL into the Supabase editor with
 * a service-role connection and a UTR, against production, at the exact
 * moment when being wrong is most expensive.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT SHOWS YOU THE MONEY BEFORE IT MOVES IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every escrow_ledger insert is permanent: the table is append-only by
 * trigger and a wrong settle can only ever be compensated, never undone.
 * So a settle here is two steps -- a dry run that prints the split and
 * changes nothing, and the same command with --confirm.
 *
 *   node scripts/settle-claim.mjs --list
 *   node scripts/settle-claim.mjs --claim <uuid> --ref UTR123456
 *   node scripts/settle-claim.mjs --claim <uuid> --ref UTR123456 --confirm
 *   node scripts/settle-claim.mjs --claim <uuid> --fail bad_account \
 *        --reason "The bank returned it: account closed." --confirm
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env, which is what makes
 * caller_is_operator() true inside the RPC.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n  SUPABASE_SERVICE_ROLE_KEY is not in .env.\n')
  process.exit(1)
}

const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                        { auth: { persistSession: false } })

const argv = process.argv.slice(2)
const flag = n => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : argv[i + 1] }
const has = n => argv.includes(`--${n}`)

const rupees = p => `Rs ${(Math.round(p / 100)).toLocaleString('en-IN')}`

/* 42703 is undefined_column, 42P01 undefined_table. Both mean a
   migration in this set has not been pasted yet, which is a state this
   project is ALWAYS briefly in -- migrations are applied by hand. Saying
   which file to paste beats leaking "column x does not exist". */
const notYetApplied = e =>
  e && (e.code === '42703' || e.code === '42P01' || /does not exist/i.test(e.message ?? ''))

async function list() {
  const FULL = 'id, line_id, vendor_id, amount_paise, status, destination, requested_at, attempt, failure_reason'
  const OLD = 'id, line_id, vendor_id, amount_paise, status, destination, requested_at'

  let { data, error } = await db
    .from('payout_claims').select(FULL)
    .in('status', ['requested', 'failed'])
    .order('requested_at', { ascending: true })

  if (notYetApplied(error)) {
    console.log('\n  (migration 137 is not applied yet — no failure or attempt columns)')
    ;({ data, error } = await db
      .from('payout_claims').select(OLD)
      .eq('status', 'requested')
      .order('requested_at', { ascending: true }))
  }

  if (error) { console.error('\n  ' + error.message + '\n'); return 1 }
  if (!data.length) { console.log('\n  Nothing waiting.\n'); return 0 }

  console.log(`\n  ${data.length} claim${data.length === 1 ? '' : 's'} waiting\n`)
  for (const c of data) {
    const age = Math.floor((Date.now() - Date.parse(c.requested_at)) / 86400000)
    console.log(`  ${c.id}`)
    console.log(`     ${rupees(c.amount_paise).padEnd(14)} ${c.status.padEnd(10)} ${c.destination}`)
    console.log(`     asked ${age} day${age === 1 ? '' : 's'} ago` +
                (c.attempt > 1 ? `  ·  attempt ${c.attempt}` : '') +
                (c.failure_reason ? `\n     last failure: ${c.failure_reason}` : ''))
    console.log()
  }
  return 0
}

/**
 * The dry run.
 *
 * It recomputes the same split settle_payout_claim() will write, from
 * the same rows, so what is printed here is what will be inserted. It
 * does NOT call the RPC -- there is no "preview" mode on a function
 * whose whole job is to write four irreversible ledger rows.
 */
async function preview(claimId) {
  const { data: claim, error: cE } = await db
    .from('payout_claims').select('*').eq('id', claimId).maybeSingle()
  if (cE) { console.error('\n  ' + cE.message + '\n'); return null }
  if (!claim) { console.error(`\n  No claim ${claimId}\n`); return null }

  const { data: line } = await db
    .from('booking_lines')
    .select('id, status, quoted_amount_paise, platform_fee_paise, partner_amount_paise, delivered_at')
    .eq('id', claim.line_id).maybeSingle()

  const { data: ledger } = await db
    .from('escrow_ledger').select('kind, amount_paise').eq('line_id', claim.line_id)

  const { data: payout } = await db
    .from('vendor_payout_details').select('pan, method').eq('vendor_id', claim.vendor_id).maybeSingle()

  const held = (ledger ?? []).reduce((n, r) => n + r.amount_paise, 0)
  const share = line?.partner_amount_paise ?? 0
  const fee = line?.platform_fee_paise ?? 0
  const hasPan = !!(payout?.pan && payout.pan.trim())
  const tcs = Math.round(share * 0.01)
  const tds = hasPan ? 0 : Math.round(share * 0.01)
  const net = share - tcs - tds

  console.log(`\n  CLAIM   ${claim.id}`)
  console.log(`  status  ${claim.status}`)
  console.log(`  to      ${claim.destination}`)
  console.log(`  line    ${claim.line_id}  (${line?.status ?? '?'})`)
  console.log()
  console.log(`  held in escrow      ${rupees(held).padStart(14)}`)
  console.log(`  booking value       ${rupees(line?.quoted_amount_paise ?? 0).padStart(14)}`)
  console.log()
  console.log(`  partner share       ${rupees(share).padStart(14)}`)
  console.log(`  - TCS (1%)          ${rupees(tcs).padStart(14)}`)
  console.log(`  - TDS ${hasPan ? '(waived, PAN)' : '(1%)        '} ${rupees(tds).padStart(14)}`)
  console.log(`  = REACHES THE BANK  ${rupees(net).padStart(14)}   <- transfer THIS`)
  console.log(`  platform fee        ${rupees(fee).padStart(14)}`)
  console.log()

  if (held < (line?.quoted_amount_paise ?? 0)) {
    console.log(`  !! SHORT BALANCE. A refund or penalty has already run on this`)
    console.log(`     line. settle_payout_claim() will refuse rather than guess`)
    console.log(`     how the shortfall splits. Settle it by hand.\n`)
  }
  if (claim.status !== 'requested') {
    console.log(`  !! This claim is '${claim.status}', not 'requested'.\n`)
  }

  return { claim, net }
}

async function main() {
  if (has('list') || argv.length === 0) return list()

  const claimId = flag('claim')
  if (!claimId) {
    console.error('\n  --claim <uuid> is required. Use --list to see them.\n')
    return 1
  }

  const failCode = flag('fail')

  if (failCode) {
    const reason = flag('reason')
    if (!reason) {
      console.error('\n  --reason is required when failing a payout.')
      console.error('  The partner reads it. "other" with no sentence is a dead end.\n')
      return 1
    }
    if (!has('confirm')) {
      console.log(`\n  Would mark ${claimId} failed: ${failCode}`)
      console.log(`  "${reason}"`)
      console.log(`\n  Add --confirm to do it.\n`)
      return 0
    }
    const { data, error } = await db.rpc('fail_payout_claim', {
      p_claim_id: claimId, p_code: failCode, p_reason: reason,
    })
    if (error) { console.error('\n  ' + error.message + '\n'); return 1 }
    console.log('\n  ' + JSON.stringify(data) + '\n')
    return data?.ok ? 0 : 1
  }

  const ref = flag('ref')
  const shown = await preview(claimId)
  if (!shown) return 1

  if (!ref) {
    console.error('  --ref <UTR> is required to settle. It is the only thing')
    console.error('  tying this row to a line on a bank statement.\n')
    return 1
  }

  if (!has('confirm')) {
    console.log(`  Dry run. Nothing was written.`)
    console.log(`  Transfer ${rupees(shown.net)} first, then re-run with --confirm.\n`)
    return 0
  }

  const { data, error } = await db.rpc('settle_payout_claim', {
    p_claim_id: claimId,
    p_reference: ref,
    p_adapter: 'ManualPayout',
    p_gateway_transfer_id: null,
    p_has_pan: null,
  })
  if (error) { console.error('\n  ' + error.message + '\n'); return 1 }

  console.log('  ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n  '))
  if (data?.ok) {
    console.log(`\n  Settled. Run scripts/audit-partner-money.mjs before settling another.\n`)
  } else {
    console.log(`\n  Refused: ${data?.reason}. Nothing was written.\n`)
  }
  return data?.ok ? 0 : 1
}

process.exitCode = await main()
