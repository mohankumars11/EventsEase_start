#!/usr/bin/env node
/**
 * Can somebody pay themselves?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE OF THE ATTACK
 * ══════════════════════════════════════════════════════════════════════
 *
 * One person, twenty SIM cards, twenty partner accounts that never take
 * a job, and a payout for nothing. That is what a referral programme
 * attracts within about a week of launching, and every check here exists
 * because of it.
 *
 * The defence is not cleverness, it is WHERE THE REWARD SITS. Everything
 * up to "they signed up" can be manufactured by one determined person
 * with a phone. A completed event cannot: it needs a customer who chose
 * them, money that moved through escrow, and a date that passed. So the
 * reward hangs off `first_event_completed` and nothing earlier.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AND THE REFUSALS MUST ALL SOUND THE SAME
 * ══════════════════════════════════════════════════════════════════════
 *
 * A person testing codes against a signup form learns nothing from a
 * uniform answer. Told "duplicate phone", they know exactly which knob
 * to turn next. So every rejection returns one sentence and the real
 * reason is recorded for an operator.
 *
 *   node scripts/check-referral-fraud.mjs
 *   node scripts/check-referral-fraud.mjs --sabotage
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

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

const read = p => readFileSync(join(ROOT, p), 'utf8')
const referral = read('supabase/migrations/155_a_referral_that_has_to_be_earned.sql')
/* SQL with its comments removed. The migration's own header explains at
   length WHY it never writes to escrow, so a check for the word finds
   the explanation and fails on it — which would teach the next person to
   delete the explanation rather than keep the rule. */
const referralSql = referral.replace(/^\s*--.*$/gm, '')
const promos = read('supabase/migrations/154_a_campaign_without_a_release.sql')
const promoLib = read('src/lib/promotions.js')
const carousel = read('src/components/partner/PartnerMarketingCarousel.jsx')

const { promotionApplies, selectPromotions, rewardLabel, promotionIsLive } =
  await loadSrc({ 'src/lib/promotions.js':
    ['promotionApplies', 'selectPromotions', 'rewardLabel', 'promotionIsLive'] })

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE REWARD HANGS OFF A COMPLETED EVENT')
console.log('')

ok('the lifecycle has a completed-event state',
   /'first_event_completed'/.test(referral))
ok('and it is reached from a delivered or settled line',
   /l\.status IN \('delivered', 'settled'\)/.test(referral),
   'anything earlier can be manufactured by one person with a phone')
ok('and only from an ACCEPTED offer',
   /o\.status = 'ACCEPTED'/.test(referral))
ok('reward_unlocked is a separate state from qualifying',
   /'reward_unlocked'/.test(referral))
ok('qualifying counts only completed or unlocked referrals',
   /FILTER \(WHERE state = 'first_event_completed' OR state = 'reward_unlocked'\)/.test(referral),
   'counting sign-ups is the version that gets farmed')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE FIVE WAYS ONE PERSON BECOMES TWO')
console.log('')

ok('you cannot refer yourself — enforced by CHECK, not by code',
   /CONSTRAINT no_self_referral CHECK \(referred_id IS NULL OR referred_id <> referrer_id\)/.test(referral),
   'a constraint is the only place it cannot be forgotten')
ok('and refused in the RPC as well', /'self_referral'/.test(referral))
ok('a partner can be referred exactly once, for ever',
   /CONSTRAINT uq_referred_once UNIQUE \(referred_id\)/.test(referral),
   'letting a second referrer claim them later pays twice for one person')
ok('the same phone is caught', /'shared_phone'/.test(referral))
ok('and compared on digits, not as a string',
   /regexp_replace\(v_me\.contact_phone/.test(referral)
   && /right\(regexp_replace\(coalesce\(v_referrer\.contact_phone/.test(referral),
   '+91 98765 43210 and 9876543210 are the same phone')
ok('the same identity document is caught', /'shared_identity'/.test(referral))
ok('the same payout destination is caught', /'shared_payout'/.test(referral))
ok('and that covers both UPI and a bank account',
   /a\.upi_id = b\.upi_id/.test(referral) && /a\.account_number = b\.account_number/.test(referral))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('A REFUSAL TEACHES NOTHING')
console.log('')

const says = [...referral.matchAll(/'ok', false, 'says', '([^']+)'/g)].map(m => m[1])
const refusals = says.filter(s => !/Sign in first/.test(s))
ok(`every rejection returns one sentence (${refusals.length} found)`,
   new Set(refusals).size === 1,
   `found ${new Set(refusals).size} different refusals: ${[...new Set(refusals)].join(' | ')}`)
ok('and it does not name the signal',
   refusals.every(s => !/phone|identity|payout|document|bank|duplicate/i.test(s)),
   refusals.join(' | '))
ok('but the real reason is recorded for an operator',
   /rejected_reason/.test(referral))
ok('and that column says it is operator-only',
   /Operator-only\. Naming the signal/.test(referral))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THIS TABLE NEVER MOVES MONEY')
console.log('')

ok('no escrow_ledger write', !/escrow_ledger/.test(referralSql),
   'escrow is append-only and belongs to customer money')
ok('the reward points at an adjustment rather than paying',
   /adjustment_id\s+UUID REFERENCES public\.partner_adjustments/.test(referral))
ok('and says so', /This table never moves money itself/.test(referral))
ok('a partner cannot write their own referral row',
   /GRANT SELECT ON public\.partner_referrals TO authenticated/.test(referral)
   && !/GRANT[^;]*INSERT[^;]*ON public\.partner_referrals TO authenticated/.test(referral),
   'a partner who could write this table could write themselves to reward_unlocked')
ok('advancing states is operator-only',
   /refresh_referral_states is operator-only/.test(referral))
ok('and states are recomputed rather than incremented',
   /Recomputed, not incremented/.test(referral),
   'five call sites that must agree for ever is how somebody gets stuck one step short')
ok('terminal states are never walked back',
   /state NOT IN \('reward_unlocked', 'rejected'\)/.test(referral),
   'a reward already unlocked must not un-unlock because a listing was paused')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('A PARTNER SEES THEIR OWN REFERRALS AND NOTHING ELSE')
console.log('')

ok('they read the ones they MADE',
   /referrer_id IN \(SELECT id FROM public\.vendors WHERE profile_id = auth\.uid\(\)\)/.test(referral))
ok('and not the one they were referred BY',
   !/referred_id IN \(SELECT id FROM public\.vendors WHERE profile_id = auth\.uid\(\)\)/.test(referral),
   'that turns a referral code into a way to look up another partner')
ok('progress returns counts, not people',
   !/business_name/.test(referral.slice(referral.indexOf('referral_progress'))) ||
   /'referrer', v_referrer\.business_name/.test(referral))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('NO COMMERCIAL VALUE IS IN THE BUNDLE')
console.log('')

const NUMBERS = /(?:₹|Rs\.?\s*)\s*[\d,]{3,}/
ok('the promotions library names no amount', !NUMBERS.test(promoLib),
   promoLib.match(NUMBERS)?.[0] ?? '')
ok('nor does the carousel', !NUMBERS.test(carousel), carousel.match(NUMBERS)?.[0] ?? '')
ok('amounts are stored in paise', /reward_paise\s+BIGINT/.test(promos))
ok('and converted once, in one place',
   /Number\(paise\) \/ 100/.test(promoLib))
ok('zero or absent renders nothing rather than ₹0',
   rewardLabel(0) === null && rewardLabel(null) === null && rewardLabel('0') === null)
ok('250000 paise reads as ₹2,500', rewardLabel(250000) === '₹2,500', rewardLabel(250000))
ok('the minimum referral count comes from the campaign',
   /qualification ->> 'minimum_referrals'/.test(referral))
ok('a campaign is inactive until somebody says otherwise',
   /active\s+BOOLEAN NOT NULL DEFAULT false/.test(promos),
   'a half-written campaign must not be live by accident')
ok('and the carousel renders nothing without one',
   /if \(!slides\.length\) return null/.test(carousel))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('AN OPERATOR-AUTHORED AUDIENCE CANNOT LEAK')
console.log('')

const facts = { lifecycle: 'LIVE', coverageDays: 38, trades: ['Photography'], city: 'Bengaluru' }
ok('an unknown audience key hides the campaign',
   !promotionApplies({ audience: { max_coverage_dayz: 120 } }, facts),
   'ignoring what you do not understand shows a reward to the whole city')
ok('an empty audience means everybody',
   promotionApplies({ audience: {} }, facts))
ok('every key must pass, not any',
   !promotionApplies({ audience: { lifecycle: ['LIVE'], trades: ['Catering & Food'] } }, facts))
ok('a finished campaign is not shown',
   !promotionIsLive({ active: true, end_at: '2020-01-01T00:00:00Z' }))
ok('a campaign at its redemption cap is not shown',
   !promotionIsLive({ active: true, max_redemptions: 5, redeemed_count: 5 }))
ok('an inactive one is not shown', !promotionIsLive({ active: false }))
ok('at most three cards',
   selectPromotions(
     Array.from({ length: 9 }, (_, i) => ({ id: String(i), active: true, audience: {} })),
     facts).length === 3,
   'a carousel somebody has to swipe past is an obstacle to their earnings')
ok('a cta_route must be an in-app path',
   /cta_route LIKE '\/%'/.test(promos),
   'an absolute URL there is an open redirect wearing a Sambramo card')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('AGAINST THE LIVE DATABASE')
console.log('')

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))

if (!env.VITE_SUPABASE_URL) {
  console.log('  · no keys in .env; the live half is skipped')
} else {
  const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } })

  const { data: seen, error: seenErr } = await anon
    .from('partner_referrals').select('id').limit(3)
  ok('a signed-out caller reads no referrals',
     (seen?.length ?? 0) === 0,
     seenErr ? `refused with ${seenErr.code}` : `read ${seen?.length}`)

  const { error: wrote } = await anon.from('partner_referrals').insert({
    referrer_id: '00000000-0000-0000-0000-000000000000', code: 'XXXXXX', state: 'reward_unlocked' })
  ok('and cannot write itself a reward', !!wrote, 'the insert was accepted')

  const { error: promoWrite } = await anon.from('partner_promotions')
    .insert({ type: 'referral', title: 'free money', active: true, reward_paise: 99999900 })
  ok('and cannot publish a campaign', !!promoWrite, 'the insert was accepted')
}

/* ══════════════════════════════════════════════════════════════════ */
if (sabotage) {
  ran++
  if (/CONSTRAINT no_self_referral/.test(referral)) {
    bad++
    fails.push('sabotage: expected the self-referral constraint to be missing, and it is present')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails) console.log('  ' + f)
  console.log('')
}
process.exitCode = bad ? 1 : 0
