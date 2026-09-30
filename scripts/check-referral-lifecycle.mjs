#!/usr/bin/env node
/**
 * Does migration 158 make a referral that can only be earned?
 *
 *   node scripts/check-referral-lifecycle.mjs          the SQL, read
 *   node scripts/check-referral-lifecycle.mjs --live   and the database, asked
 *
 * ══════════════════════════════════════════════════════════════════════
 * --live: WHAT IT WRITES, AND WHAT IT WILL NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * It creates three throwaway partners (auth user + vendor row, emails on
 * example.com, business names starting "TC26 CHECK"), drives them as
 * THEMSELVES through minted sessions — never the service role, which
 * bypasses RLS and would pass against a database with no policies — and
 * deletes all three at the end, which cascades their invitations and
 * referrals. The service role is used only to create them, to play the
 * operator who approves one, and to clean up.
 *
 * It will not create a booking, an adjustment or a payout claim. Those
 * are append-only money tables on the production database, and a check
 * that writes a line it cannot delete is a check that can pass once.
 * So `first_event_completed`, `eligible` and `paid` are proved from the
 * SQL below, and the operator payout path is tested for its refusals.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { ROOT } from './lib/loadSrc.mjs'

const live = process.argv.includes('--live')
const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d)}`}`)
}
const head = t => console.log(`\n${t}\n`)

const raw = readFileSync(join(ROOT, 'supabase/migrations/158_a_referral_you_can_follow.sql'), 'utf8')
/* Comments out, so a rule explained in prose is not mistaken for a rule
   written in SQL (check-referral-fraud.mjs learnt this first). */
const sql = raw.replace(/--.*$/gm, '')
const fn = name => {
  const i = sql.indexOf(`FUNCTION public.${name}(`)
  if (i < 0) return ''
  const s = sql.indexOf('$$', i), e = sql.indexOf('$$', s + 2)
  return sql.slice(s, e)
}

/* ══════════════════════════════════════════════════════════════════ */
head('NOBODY WRITES A REFERRAL BUT THE SERVER')

ok('partners get no INSERT, UPDATE or DELETE on referrals or invitations',
   !/GRANT\s+(INSERT|UPDATE|DELETE|ALL)[^;]*ON\s+public\.partner_referral(s|_invites)\s+TO\s+authenticated/i.test(sql))
ok('invitation writes are revoked outright', /REVOKE ALL ON public\.partner_referral_invites FROM anon, authenticated/.test(sql))
ok('155\'s whole-row SELECT is taken back', /REVOKE SELECT ON public\.partner_referrals FROM authenticated/.test(sql))
const colGrant = sql.match(/GRANT SELECT \(([^)]*)\)\s+ON public\.partner_referrals TO authenticated/)
ok('and re-granted by column, without rejected_reason', colGrant && !/rejected_reason/.test(colGrant[1]))
ok('a hand-made insert is refused by trigger', /partner_referrals rows are created by claim_referral_code\(\)/.test(fn('partner_referrals_guard')))
ok('milestones, reward and payout cannot be written by hand, even by an operator',
   ['onboarding_completed_at', 'verified_at', 'live_at', 'first_event_at', 'reward_status', 'adjustment_id', 'paid_at']
     .every(c => fn('partner_referrals_guard').includes(`NEW.${c}`)))
ok('the only hand-made move is rejection', /only rejection is set by hand/.test(fn('partner_referrals_guard')))
ok('the internal flag is set only inside the server functions',
   [...sql.matchAll(/set_config\('sambramo\.referral_internal', 'on'/g)].length >= 4)
ok('a partner cannot choose their own code', /NEW\.referral_code := OLD\.referral_code/.test(fn('vendors_pin_referral_code')))
ok('the old apk keeps a working code: generate_referral_code() now saves it',
   /ensure_my_referral_code\(\)/.test(fn('generate_referral_code')))

/* ══════════════════════════════════════════════════════════════════ */
head('ATTRIBUTION')

const claim = fn('claim_referral_code')
ok('one referrer per partner, for ever (155) is untouched', !/DROP CONSTRAINT[^;]*uq_referred_once/i.test(sql))
ok('one referral per invitation', /CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_referrals_invite\s+ON public\.partner_referrals \(invite_id\) WHERE invite_id IS NOT NULL/.test(sql))
ok('an invitation code is unique', /code\s+TEXT NOT NULL UNIQUE/.test(sql))
ok('an invitation cannot be claimed by its sender', /CONSTRAINT invite_not_self CHECK/.test(sql))
ok('a retried invite returns the same invitation', /CONSTRAINT uq_invite_idempotency UNIQUE \(referrer_id, idempotency_key\)/.test(sql)
   && /'repeat', true/.test(fn('create_referral_invite')))
ok('the trade must be a real, active trade', /FROM public\.listing_trades WHERE id = p_trade_id AND is_active/.test(fn('create_referral_invite'))
   && /trade_id\s+TEXT NOT NULL REFERENCES public\.listing_trades\(id\)/.test(sql))
ok('invitations are rate-limited', /INTERVAL '1 day'\) >= 30/.test(fn('create_referral_invite')))
for (const reason of ['unknown_code', 'self_referral', 'invite_used', 'invite_expired', 'already_referred',
                      'existing_partner', 'shared_phone', 'shared_identity', 'shared_payout']) {
  ok(`a claim is refused for ${reason}`, claim.includes(`'${reason}'`))
}
const refusals = [...claim.matchAll(/'says', ([^)]+)\)/g)].map(m => m[1].trim())
ok('every refusal says the same thing', refusals.filter(r => !/Sign in first/.test(r)).every(r => r === 'v_refusal'),
   refusals.join(' | '))
ok('and that sentence names no signal', /v_refusal\s+CONSTANT TEXT := 'That code cannot be used on this account\.'/.test(claim))
ok('the same claim twice is ok, not a refusal', /'repeat', true/.test(claim))
ok('a race between two claims is caught, not raised', /EXCEPTION WHEN unique_violation/.test(claim))
ok('a refused attempt never uses up the invitation', /INSERT INTO public\.partner_referrals\s+\(referrer_id, referred_id, code, state, rejected_reason, trade_id\)/.test(claim))
ok('the claimed trade is the invitation\'s trade', /v_trade := COALESCE\(v_inv\.trade_id/.test(claim))

/* ══════════════════════════════════════════════════════════════════ */
head('THE LIFECYCLE, FROM FACTS')

const refresh = fn('_refresh_referrals')
ok('each milestone is stamped once and never cleared',
   ['onboarding_completed_at', 'verified_at', 'live_at', 'first_event_at'].every(c => new RegExp(`${c}\\s*= COALESCE\\(t\\.${c}`).test(refresh)))
ok('verified needs an operator\'s approval', /v\.is_verified AND v\.verification_status = 'approved'/.test(refresh))
ok('live needs approval AND taking jobs', /v\.accepting_jobs/.test(refresh))
ok('a first event needs an ACCEPTED offer on a delivered or settled line',
   /o\.status = 'ACCEPTED'/.test(refresh) && /l\.status IN \('delivered', 'settled'\)/.test(refresh))
ok('a campaign cannot reward an event from before it began', /p\.start_at <= t\.first_event_at/.test(refresh))
ok('eligibility is the campaign threshold, per referrer', /minimum_referrals/.test(refresh) && /GROUP BY r\.referrer_id, r\.promotion_id/.test(refresh))
ok('a rejected referral never advances', (refresh.match(/state <> 'rejected'/g) ?? []).length >= 5)

/* ══════════════════════════════════════════════════════════════════ */
head('QUALIFYING IS NOT BEING PAID')

ok('reward status is its own column, not a lifecycle state', /reward_status\s+TEXT NOT NULL DEFAULT 'not_eligible'/.test(sql))
ok('a recorded or paid reward must name its adjustment', /CHECK \(reward_status NOT IN \('payout_recorded', 'paid'\) OR adjustment_id IS NOT NULL\)/.test(sql))
ok('and "paid" exists exactly when paid_at does', /CHECK \(\(reward_status = 'paid'\) = \(paid_at IS NOT NULL\)\)/.test(sql))
const paidWrites = [...sql.matchAll(/reward_status = 'paid'\s*,/g)].length
ok('"paid" is written in exactly one place', paidWrites === 1, `${paidWrites} writes`)
ok('and that place reads a payout claim marked paid', /JOIN public\.payout_claims c ON c\.id = a\.settled_claim_id[\s\S]{0,200}c\.status = 'paid'/.test(refresh))
const pay = fn('record_referral_payout')
ok('the operator path records, it does not pay', /reward_status = 'payout_recorded'/.test(pay) && !/reward_status = 'paid'\s*,/.test(pay))
ok('it is operator-only', /IF NOT public\.caller_is_operator\(\)/.test(pay))
ok('only an eligible reward can be paid', /IF r\.reward_status <> 'eligible'/.test(pay))
ok('the adjustment must be to the referrer', /a\.vendor_id <> r\.referrer_id/.test(pay))
ok('positive, and a bonus or incentive', /a\.amount_paise <= 0 OR a\.kind NOT IN \('bonus', 'incentive'\)/.test(pay))
ok('not reversed', /reverses_id = a\.id/.test(pay))
ok('and not already carrying another reward', /already carries a different reward/.test(pay))
ok('customer money is never touched', !/escrow_ledger/.test(sql))

/* ══════════════════════════════════════════════════════════════════ */
head('SOMETHING ACTUALLY RUNS IT')

for (const [t, table] of [['referral_facts_vendor', 'vendors'], ['referral_facts_line', 'booking_lines'],
                          ['referral_facts_claim', 'payout_claims'], ['referral_facts_adjustment', 'partner_adjustments']]) {
  ok(`a trigger on ${table}`, new RegExp(`CREATE TRIGGER ${t}[\\s\\S]{0,120}ON public\\.${table}`).test(sql))
}
ok('a referral failure never fails an approval or a delivery', /EXCEPTION WHEN OTHERS THEN\s+RAISE WARNING 'referral refresh skipped/.test(fn('_referral_facts_changed')))
ok('an hourly sweep is scheduled, once', /cron\.unschedule[\s\S]{0,120}cron\.schedule\('sambramo-referral-refresh'/.test(sql))
ok('existing referrals are brought up to date on paste', /SELECT public\._refresh_referrals\(NULL\) AS referrals_moved/.test(sql))
ok('155\'s zero-argument refresh is dropped, not left ambiguous', /DROP FUNCTION IF EXISTS public\.refresh_referral_states\(\);/.test(sql))
ok('the refresh itself is not callable by a partner',
   /REVOKE ALL ON FUNCTION public\._refresh_referrals\(UUID\) FROM PUBLIC, anon, authenticated/.test(sql))

if (!live) {
  console.log(`\n${ran - bad} of ${ran} passed${bad ? `  —  ${bad} FAILED` : ''}   (SQL only; --live asks the database)\n`)
  process.exit(bad ? 1 : 0)
}

/* ══════════════════════════════════════════════════════════════════ */
/* --live                                                             */
/* ══════════════════════════════════════════════════════════════════ */
const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)
  .filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')] }))
const URL_ = env.VITE_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anonClient = () => createClient(URL_, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const stamp = Date.now().toString(36)
const made = []   // { userId, vendorId }

async function partner(label, patch = {}) {
  const email = `tc26-check-${label}-${stamp}@example.com`
  const { data: u, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  const userId = u.user.id
  made.push({ userId })
  await admin.from('profiles').upsert({ id: userId, email, full_name: `TC26 CHECK ${label}`, role: 'vendor' })
  const { data: v, error: vErr } = await admin.from('vendors')
    .insert({ profile_id: userId, business_name: `TC26 CHECK ${label}`, category: 'Photography', ...patch })
    .select('id').single()
  if (vErr) throw new Error(`vendor ${label}: ${vErr.message}`)
  made.at(-1).vendorId = v.id
  // Signed in as themselves: RLS applies to everything this client does.
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const client = anonClient()
  const { error: sErr } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (sErr) throw new Error(`session ${label}: ${sErr.message}`)
  return { client, userId, vendorId: v.id }
}

try {
  head('LIVE: AS THE PARTNERS THEMSELVES')

  const A = await partner('referrer')
  const B = await partner('recruit')
  const C = await partner('second')

  const noFn = await A.client.rpc('my_referral_summary')
  if (noFn.error && /PGRST202|Could not find the function/i.test(noFn.error.message)) {
    ok('migration 158 is on the database', false, 'my_referral_summary() does not exist: paste 158 first')
    throw new Error('stop')
  }

  const code = (await A.client.rpc('ensure_my_referral_code')).data
  ok('a partner code is minted on the server', /^[A-Z2-9]{6}$/.test(code ?? ''), code)
  ok('and asking again returns the same one', (await A.client.rpc('ensure_my_referral_code')).data === code)
  const self = await A.client.from('vendors').update({ referral_code: 'ZZZZZZ' }).eq('id', A.vendorId).select('referral_code').single()
  ok('a partner writing their own code is ignored', self.data?.referral_code === code, self)

  const key = randomUUID()
  const inv1 = (await A.client.rpc('create_referral_invite', { p_trade_id: 'SBM-TRD-014', p_idempotency_key: key })).data
  ok('an invitation is created for a trade', inv1?.ok && /^[A-Z2-9]{8}$/.test(inv1.code) && inv1.trade_id === 'SBM-TRD-014', inv1)
  const again = (await A.client.rpc('create_referral_invite', { p_trade_id: 'SBM-TRD-014', p_idempotency_key: key })).data
  ok('the same key returns the same invitation', again?.code === inv1.code && again.repeat === true, again)
  const badTrade = (await A.client.rpc('create_referral_invite', { p_trade_id: 'SBM-TRD-999', p_idempotency_key: randomUUID() })).data
  ok('a trade that does not exist is refused', badTrade?.ok === false, badTrade)
  const direct = await A.client.from('partner_referral_invites').insert({ referrer_id: A.vendorId, trade_id: 'SBM-TRD-014', code: 'AAAAAAAA', idempotency_key: randomUUID() })
  ok('a partner cannot insert an invitation directly', !!direct.error)

  const s0 = (await A.client.rpc('my_referral_summary')).data
  const photo0 = s0.trades.find(t => t.trade_id === 'SBM-TRD-014')
  ok('the invitation is counted as an invitation', photo0.invited === 1 && photo0.registered === 0, photo0)
  ok('the summary covers every active trade (34: 26 event + 8 logistics)', s0.trades.length === 34, s0.trades.length)

  const bad = (await B.client.rpc('claim_referral_code', { p_code: 'QQQQQQQQ' })).data
  ok('an unknown code is refused', bad?.ok === false && bad.says === 'That code cannot be used on this account.', bad)
  const selfClaim = (await A.client.rpc('claim_referral_code', { p_code: inv1.code })).data
  ok('the sender cannot claim their own invitation', selfClaim?.ok === false, selfClaim)

  const claimed = (await B.client.rpc('claim_referral_code', { p_code: inv1.code.toLowerCase() })).data
  ok('the recruit claims it', claimed?.ok === true, claimed)
  const twice = (await B.client.rpc('claim_referral_code', { p_code: inv1.code })).data
  ok('claiming again is harmless', twice?.ok === true && twice.id === claimed.id, twice)
  const used = (await C.client.rpc('claim_referral_code', { p_code: inv1.code })).data
  ok('somebody else cannot use the same invitation', used?.ok === false, used)
  const other = (await B.client.rpc('claim_referral_code', { p_code: code })).data
  ok('an attributed partner cannot be claimed a second time', other?.ok === false, other)

  const { data: expiring } = await admin.from('partner_referral_invites')
    .insert({ referrer_id: A.vendorId, trade_id: 'SBM-TRD-005', code: `X${stamp.toUpperCase().replace(/[^A-Z2-9]/g, 'Z')}ZZZZZZZ`.slice(0, 8),
              idempotency_key: randomUUID(), expires_at: new Date(Date.now() - 60000).toISOString() })
    .select('code').single()
  const expired = (await C.client.rpc('claim_referral_code', { p_code: expiring?.code })).data
  ok('an expired invitation is refused', expiring && expired?.ok === false, expired)

  /* The trade's list holds the real referral AND the refused attempt to
     reuse its invitation — filed under the invitation's trade on purpose,
     shown as "could not count" with no name and no reason. */
  const all = (await A.client.rpc('my_referrals', { p_trade_id: 'SBM-TRD-014' })).data ?? []
  const rows = all.filter(r => !r.not_eligible)
  ok('the referral carries the invitation\'s trade', rows.length === 1 && rows[0].trade_id === 'SBM-TRD-014' && rows[0].invite_code === inv1.code, all)
  ok('and starts as signed up, not eligible, not paid',
     rows[0]?.state === 'registered' && rows[0]?.reward_status === 'not_eligible' && !rows[0]?.paid_at, rows[0])
  ok('the refused reuse is under the same trade, anonymous',
     all.filter(r => r.not_eligible).length === 1 && all.find(r => r.not_eligible).referred_name === null
     && !all.find(r => r.not_eligible).invite_code, all.filter(r => r.not_eligible))
  ok('the refused attempts show as not eligible, with no name',
     ((await A.client.rpc('my_referrals', { p_state: 'rejected' })).data ?? []).every(r => r.referred_name === null && r.not_eligible))
  const leak = await A.client.from('partner_referrals').select('rejected_reason').limit(1)
  ok('the fraud reason cannot be read directly', !!leak.error, leak)

  // ── The facts move it, not the screens ────────────────────────────
  const stage = async () => (await A.client.rpc('my_referrals', { p_id: claimed.id })).data?.[0]
  await B.client.rpc('my_referral_summary'); await A.client.rpc('my_referrals', {})
  ok('reading the screens moves nothing', (await stage()).state === 'registered')

  const sub = await B.client.from('vendors').update({ verification_status: 'submitted' }).eq('id', B.vendorId)
  ok('the recruit submits their application', !sub.error, sub.error)
  let r = await stage()
  ok('the trigger stamps onboarding', r.state === 'onboarding_completed' && !!r.onboarding_completed_at, r)

  const selfApprove = await B.client.from('vendors').update({ is_verified: true, verification_status: 'approved' }).eq('id', B.vendorId)
  r = await stage()
  ok('a partner cannot approve themselves into "verified"', r.state === 'onboarding_completed', { err: selfApprove.error?.message, state: r.state })

  await admin.from('vendors').update({ is_verified: true, verification_status: 'approved', accepting_jobs: false }).eq('id', B.vendorId)
  r = await stage()
  ok('an operator\'s approval stamps verified', r.state === 'verified' && !!r.verified_at, r)
  await admin.from('vendors').update({ accepting_jobs: true }).eq('id', B.vendorId)
  r = await stage()
  ok('taking jobs stamps live', r.state === 'live' && !!r.live_at, r)
  await admin.from('vendors').update({ accepting_jobs: false }).eq('id', B.vendorId)
  r = await stage()
  ok('pausing afterwards does not un-live the history', r.state === 'live' && !!r.live_at, r)
  ok('and nothing reached a first event or a reward', !r.first_event_at && r.reward_status === 'not_eligible')

  const forged = await A.client.rpc('record_referral_payout', { p_referral_id: claimed.id, p_adjustment_id: randomUUID() })
  ok('a partner cannot record their own payout', !!forged.error, forged)
  const early = (await admin.rpc('record_referral_payout', { p_referral_id: claimed.id, p_adjustment_id: randomUUID() })).data
  ok('an operator cannot pay a reward that has not qualified', early?.ok === false && /eligible/.test(early.says), early)

  const s1 = (await A.client.rpc('my_referral_summary')).data
  const photo1 = s1.trades.find(t => t.trade_id === 'SBM-TRD-014')
  ok('the trade counts follow: 1 invited, 1 signed up, 1 verified, 1 live, 0 events',
     photo1.invited === 1 && photo1.registered === 1 && photo1.verified === 1 && photo1.live === 1 && photo1.first_event_completed === 0, photo1)
  ok('the recruit cannot see who invited them', ((await B.client.rpc('my_referrals', {})).data ?? []).length === 0)
  ok('a third partner sees none of it', ((await C.client.rpc('my_referrals', {})).data ?? []).length === 0
     && ((await C.client.from('partner_referral_invites').select('id')).data ?? []).length === 0)
  const anon = anonClient()
  ok('nor does anybody signed out',
     ((await anon.from('partner_referrals').select('id')).data ?? []).length === 0
     && !!(await anon.rpc('create_referral_invite', { p_trade_id: 'SBM-TRD-014', p_idempotency_key: randomUUID() })).error)
} catch (e) {
  if (e.message !== 'stop') ok('the live run completed', false, e.message)
} finally {
  for (const m of made.reverse()) {
    if (m.vendorId) await admin.from('vendors').delete().eq('id', m.vendorId)
    await admin.from('profiles').delete().eq('id', m.userId)
    await admin.auth.admin.deleteUser(m.userId)
  }
  const { data: left } = await admin.from('vendors').select('id').like('business_name', `TC26 CHECK %`)
  ok('every test partner was removed', (left ?? []).length === 0, left)
}

console.log(`\n${ran - bad} of ${ran} passed${bad ? `  —  ${bad} FAILED` : ''}\n`)
process.exit(bad ? 1 : 0)
