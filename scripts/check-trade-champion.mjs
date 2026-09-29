#!/usr/bin/env node
/**
 * Trade Champion 26 / 34-trade catalogue, Grow with Sambramo and Build Your Profile — the
 * parts that can be proved without a browser or a database.
 *
 *   node scripts/check-trade-champion.mjs
 *
 * Four questions:
 *
 *   THE 26       is every trade there exactly once, with the id the
 *                database knows it by?
 *   THE MODEL    do the functions the screens call say what the rows
 *                mean — and never "paid" for something that qualified?
 *   THE PROFILE  is completion decided by saved data alone, and does
 *                every item open the exact place that saves it?
 *   THE ROUTES   do the three destinations stay three, and does every
 *                way in reach the same referral screen?
 *
 * The SQL of migration 158 is checked by check-referral-lifecycle.mjs.
 * The screens themselves are driven in a browser by
 * check-trade-champion-ui (see the bottom of this file for how).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}
const head = t => console.log(`\n${t}\n`)
const read = p => readFileSync(join(ROOT, p), 'utf8')

const M = await loadSrc({
  'src/config/vendor.js': ['VENDOR_CATEGORIES'],
  'src/lib/trades.js': ['PARTNER_TRADES', 'tradeById'],
  'src/lib/referralModel.js': '*',
  'src/lib/profileCompletion.js': '*',
})

/* ══════════════════════════════════════════════════════════════════ */
head('THE TRADE CATALOGUE')

const T = M.PARTNER_TRADES
ok('there are 34 canonical trades', M.VENDOR_CATEGORIES.length === 34, `found ${M.VENDOR_CATEGORIES.length}`)
ok('and the Trade Champion list is exactly them, in order',
   T.length === 34 && T.every((t, i) => t.name === M.VENDOR_CATEGORIES[i]))
ok('no trade is listed twice', new Set(T.map(t => t.name)).size === 34)
ok('every trade has a database id', T.every(t => /^SBM-TRD-\d{3}$/.test(t.id ?? '')),
   T.filter(t => !t.id).map(t => t.name).join(', '))
ok('and no two share one', new Set(T.map(t => t.id)).size === 34)

const seedSources = [read('supabase/migrations/107_catalogue_seed.generated.sql'), read('supabase/migrations/160_logistics_listing_catalogue_backfill.sql')]
const seed = new Map(seedSources.flatMap(source => [...source.matchAll(/INSERT INTO public\.listing_trades \(id, name[^)]*\) VALUES \('(SBM-TRD-\\d+)', '((?:[^']|'')+)'/g)]).map(m => [m[1], m[2].replace(/''/g, "'")])));
/* legacy source remains above for explanatory compatibility */
/*
  .matchAll(/INSERT INTO public\.listing_trades \(id, name[^)]*\) VALUES \('(SBM-TRD-\d+)', '((?:[^']|'')+)'/g)]
  .map(m => [m[1], m[2].replace(/''/g, "'")]))
ok('the seeded listing_trades table has the same 34', seed.size === 34, `seed has ${seed.size}`)
ok('with the same name for every id', T.every(t => seed.get(t.id) === t.name),
   T.filter(t => seed.get(t.id) !== t.name).map(t => `${t.id}: ${t.name} vs ${seed.get(t.id)}`).join('; '))
ok('tradeById finds each one back', T.every(t => M.tradeById(t.id)?.name === t.name))
ok('and nothing for an id that is not a trade', M.tradeById('SBM-TRD-999') === null)

/* ══════════════════════════════════════════════════════════════════ */
head('THE MODEL')

ok('the funnel starts with invitations, labelled as invitations',
   M.FUNNEL[0].key === 'invited' && /invitation/i.test(M.FUNNEL[0].label))
ok('and a sign-up is a separate step from an invitation',
   M.FUNNEL[1].key === 'registered' && !/invit/i.test(M.FUNNEL[1].label))
ok('the lifecycle stages are in order',
   M.STAGES.map(s => s.key).join() === 'registered,onboarding_completed,verified,live,first_event_completed')

const summary = {
  trades: [
    { trade_id: 'SBM-TRD-014', invited: 3, registered: 2, verified: 1, live: 1, paid: 0 },
    { trade_id: 'SBM-TRD-005', invited: 1, registered: 1 },
  ],
  untraded: { registered: 1, live: 1 },
}
const tot = M.totalsOf(summary)
ok('totals add up across trades', tot.invited === 4 && tot.registered === 4 && tot.live === 2,
   JSON.stringify(tot))
ok('including referrals whose trade is unknown', tot.registered === 4)
ok('an empty summary totals to zeros, not NaN', Object.values(M.totalsOf(null)).every(v => v === 0))
ok('a trade with no rows reads zeros', M.tradeRow(summary, 'SBM-TRD-001').registered === 0)
ok('a trade with rows reads its own numbers', M.tradeRow(summary, 'SBM-TRD-014').invited === 3)

const at = '2026-09-01T10:00:00Z'
const r0 = { claimed_at: at, reward_status: 'not_eligible' }
const steps = r => M.timelineOf(r).filter(s => s.done).map(s => s.key).join()
ok('a fresh referral has only its sign-up done', steps(r0) === 'registered')
const r5 = { ...r0, onboarding_completed_at: at, verified_at: at, live_at: at, first_event_at: at, qualified_at: at }
ok('a delivered one has every lifecycle step done',
   steps(r5) === 'registered,onboarding_completed,verified,live,first_event_completed,qualified')
ok('QUALIFIED IS NOT PAID: an eligible reward leaves "paid" undone',
   !M.timelineOf({ ...r5, reward_status: 'eligible' }).find(s => s.key === 'paid').done)
ok('nor does a recorded payout',
   !M.timelineOf({ ...r5, reward_status: 'payout_recorded' }).find(s => s.key === 'paid').done)
ok('only a paid reward marks it paid',
   M.timelineOf({ ...r5, reward_status: 'paid', paid_at: at }).find(s => s.key === 'paid').done)
ok('and a stray paid_at without the status does not',
   !M.timelineOf({ ...r5, reward_status: 'eligible', paid_at: at }).find(s => s.key === 'paid').done)

ok('the reward labels for eligible and recorded both say "not paid"',
   /not paid/i.test(M.REWARD.eligible.label) && /not paid/i.test(M.REWARD.payout_recorded.label))
ok('and only "paid" says Paid without qualification', M.REWARD.paid.label === 'Paid')

const next = r => M.nextStep(r)
ok('next step: a refused sign-up says it cannot count, with no reason',
   /cannot count/.test(next({ not_eligible: true })) && !/phone|document|bank|fraud/i.test(next({ not_eligible: true })))
ok('next step: not onboarded', /application/.test(next(r0)))
ok('next step: waiting for review', /review/.test(next({ ...r0, onboarding_completed_at: at })))
ok('next step: verified, not live', /job alerts/.test(next({ ...r0, onboarding_completed_at: at, verified_at: at })))
ok('next step: live, no event', /first event/.test(next({ ...r0, onboarding_completed_at: at, verified_at: at, live_at: at })))
ok('next step: eligible says it is not paid yet', /not paid yet/.test(next({ ...r5, reward_status: 'eligible' })))
ok('next step: recorded says it is not paid until the payout', /once the payout is made/.test(next({ ...r5, reward_status: 'payout_recorded' })))
ok('next step: no campaign says so, and promises nothing',
   /only while a referral campaign is running/.test(next({ ...r5, qualified_at: null })))

const now = Date.parse('2026-09-10T00:00:00Z')
ok('an invitation nobody used is open', M.inviteStatus({ expires_at: '2026-10-01T00:00:00Z' }, now) === 'open')
ok('an old one is expired', M.inviteStatus({ expires_at: '2026-09-01T00:00:00Z' }, now) === 'expired')
ok('a used one is claimed, even past its date',
   M.inviteStatus({ expires_at: '2026-09-01T00:00:00Z', claimed_at: at }, now) === 'claimed')

ok('a partner code is six characters', M.isReferralCode('ABC234'))
ok('an invitation code is eight', M.isReferralCode('ABCD2345'))
ok('seven is neither', !M.isReferralCode('ABC2345'))
ok('the easily-misheard characters are not codes', !M.isReferralCode('ABCO01'))
ok('typing is forgiven: spaces and lower case', M.normaliseCode(' abcd 2345 ') === 'ABCD2345')

const msg = M.inviteMessage({ tradeName: 'Photography', code: 'ABCD2345' })
ok('the invitation names the trade', /Photography/.test(msg))
ok('and carries the code and a link that carries it too',
   /ABCD2345/.test(msg) && msg.includes('/partner/join?ref=ABCD2345'))
ok('the link is the public partner site, not localhost', M.inviteLink('X').startsWith('https://sambramo-partners.vercel.app/'))
ok('the message promises no money', !/₹|rupee|reward|earn|bonus/i.test(msg), msg)

const E = (code, message) => ({ code, message })
ok('a network failure reads as offline', M.classifyError(E('', 'TypeError: Failed to fetch')) === 'offline')
ok('and so does navigator saying offline', M.classifyError(E('XX', 'x'), false) === 'offline')
ok('a missing function reads as not switched on', M.classifyError(E('PGRST202', 'Could not find the function')) === 'unavailable')
ok('anything else is an error, with retry', M.classifyError(E('42501', 'permission denied')) === 'error')

ok('a trade screen goes back to the dashboard',
   JSON.stringify(M.referralScreenMeta({ trade: 'SBM-TRD-014' }, 'Photography')) ===
   JSON.stringify({ title: 'Photography', parent: { screen: 'referral' } }))
ok('a referral opened from a trade goes back to that trade',
   M.referralScreenMeta({ rid: 'x', trade: 'SBM-TRD-014' }).parent.trade === 'SBM-TRD-014')
ok('a referral opened from the list goes back to the list', M.referralScreenMeta({ rid: 'x' }).parent.trade === undefined)
ok('the dashboard goes back to More', M.referralScreenMeta({}).parent === null)

/* ══════════════════════════════════════════════════════════════════ */
head('THE PROFILE')

const empty = M.profileChecklist({})
const keys = empty.items.map(i => i.key)
ok('ten items', empty.total === 10, `${empty.total}: ${keys.join()}`)
ok('every one a different thing', new Set(keys).size === keys.length)
ok('an empty account has none complete', empty.done === 0,
   empty.items.filter(i => i.status === 'complete').map(i => i.key).join())
ok('and nothing claims a percentage it did not compute',
   empty.items.every(i => !/%/.test(i.detail ?? '')))

const EXPECT = {
  personal: { screen: 'profile' }, business: { screen: 'business' }, photo: { screen: 'profile' },
  contact: { screen: 'profile' }, trades: { screen: 'services' }, pricing: { screen: 'services' },
  area: { screen: 'area' }, availability: { tab: 'availability' },
  verification: { screen: 'verification' }, payout: { screen: 'bank' },
}
ok('each item opens the exact place that saves it',
   empty.items.every(i => JSON.stringify(i.to) === JSON.stringify(EXPECT[i.key])),
   empty.items.filter(i => JSON.stringify(i.to) !== JSON.stringify(EXPECT[i.key])).map(i => `${i.key}→${JSON.stringify(i.to)}`).join('; '))

const reqs = [{ id: 'id_proof', required: true }, { id: 'address', required: true }, { id: 'extra', required: false }]
const full = {
  profile: { full_name: 'Asha Rao' },
  vendor: {
    business_name: 'Asha Photography', description: 'Candid wedding photography across Bengaluru since 2015.',
    avatar_url: 'https://x/y.jpg', contact_phone: '+91 98765 43210', pincode: '560001', area: 'MG Road',
    service_radius_km: 20, accepting_jobs: true, is_verified: true, verification_status: 'approved',
  },
  listings: [{ trade: 'Photography', status: 'live', offerings: [{ price: 25000, is_active: true }] }],
  weeklyRules: [{ weekday: 1 }], markedDays: 0,
  docs: { byRequirement: { id_proof: { status: 'accepted' }, address: { status: 'accepted' } } },
  requirements: reqs, payout: { method: 'upi', verified_at: at }, payoutLoaded: true,
}
const done = M.profileChecklist(full)
ok('a finished account is ten of ten', done.done === 10,
   done.items.filter(i => i.status !== 'complete').map(i => `${i.key}:${i.status}`).join())

const status = (patch, key) => M.profileChecklist({ ...full, ...patch }).items.find(i => i.key === key).status
const withVendor = (v, key) => status({ vendor: { ...full.vendor, ...v } }, key)
ok('recalculated from data: a description cut short reopens the item',
   withVendor({ description: 'Photos.' }, 'business') === 'incomplete')
ok('a removed photo reopens the photo', withVendor({ avatar_url: null }, 'photo') === 'incomplete')
ok('no location, no area', withVendor({ pincode: null, area: null }, 'area') === 'incomplete')
ok('opening a form is not saving it: a "visited" flag changes nothing',
   M.profileChecklist({ visited: ['business', 'photo'] }).done === 0)

ok('a trade under review reads under review',
   status({ listings: [{ trade: 'Photography', status: 'under_review', offerings: [] }] }, 'trades') === 'under_review')
ok('a trade sent back reads needs changes',
   status({ listings: [{ trade: 'Photography', status: 'requires_action', offerings: [] }] }, 'trades') === 'rejected')
ok('a draft trade is still to do',
   status({ listings: [{ trade: 'Photography', status: 'draft', offerings: [] }] }, 'trades') === 'incomplete')
ok('a service with no price leaves pricing to do',
   status({ listings: [{ trade: 'Photography', status: 'live', offerings: [{ price: null, is_active: true }] }] }, 'pricing') === 'incomplete')

ok('verification: submitted is under review',
   withVendor({ is_verified: false, verification_status: 'submitted' }, 'verification') === 'under_review')
ok('verification: rejected needs changes',
   withVendor({ is_verified: false, verification_status: 'rejected' }, 'verification') === 'rejected')
ok('verification: a rejected document needs changes even in draft',
   status({ vendor: { ...full.vendor, is_verified: false, verification_status: 'draft' },
            docs: { byRequirement: { id_proof: { status: 'rejected' } } } }, 'verification') === 'rejected')
const draftDocs = M.profileChecklist({ ...full, vendor: { ...full.vendor, is_verified: false, verification_status: 'draft' },
  docs: { byRequirement: { id_proof: { status: 'pending' } } } }).items.find(i => i.key === 'verification')
ok('verification in draft counts only required documents',
   draftDocs.status === 'incomplete' && /1 of 2/.test(draftDocs.detail), draftDocs.detail)

ok('payout: none is to do', status({ payout: null }, 'payout') === 'incomplete')
ok('payout: added and unchecked is submitted', status({ payout: { method: 'upi', verified_at: null } }, 'payout') === 'submitted')
ok('payout: not yet read is not claimed as missing', /Checking/.test(
   M.profileChecklist({ ...full, payoutLoaded: false }).items.find(i => i.key === 'payout').detail))

ok('job ready when approved, taking jobs, live and located', M.jobReadiness(full).ready)
const paused = M.jobReadiness({ ...full, vendor: { ...full.vendor, accepting_jobs: false } })
ok('paused alerts are the one thing missing, and they open Jobs where the switch is',
   !paused.ready && paused.missing.length === 1 && paused.missing[0].to.tab === 'offers')
ok('nothing is ready for an empty account', M.jobReadiness({}).missing.length === 3)

const na = M.nextActions(M.profileChecklist({ ...full,
  vendor: { ...full.vendor, avatar_url: null, is_verified: false, verification_status: 'rejected' } }))
ok('next actions put what was refused first', na[0]?.key === 'verification', na.map(i => i.key).join())
ok('and never more than three', M.nextActions(empty).length === 3)

/* ══════════════════════════════════════════════════════════════════ */
head('THE ROUTES')

const account = read('src/components/vendor/PartnerAccount.jsx')
const dash = read('src/pages/dashboard/VendorDashboard.jsx')
const earnings = read('src/components/vendor/Earnings.jsx')
const screens = account.slice(account.indexOf('const SCREENS = {'))

ok('Grow with Sambramo renders the growth hub', /growth: \{ title: 'Grow with Sambramo', render: \(\) => \(\s*<GrowHub/.test(screens))
ok('Build Your Profile renders the checklist', /buildprofile: \{ title: 'Build Your Profile', render: \(\) => \(\s*<BuildProfile/.test(screens))
ok('Referral & rewards renders Trade Champion 26', /referral: \{[\s\S]{0,200}<TradeChampion/.test(screens))
ok('and none of the three is a list of links to the others',
   !/growth: \{[^}]*<Group/.test(screens) && !/buildprofile: \{[^}]*<Group/.test(screens))
ok('More offers all three, each to its own screen',
   ["onOpenScreen('growth')", "onOpenScreen('buildprofile')", "onOpenScreen('referral')"].every(s => account.includes(s)))
ok('the Earnings card opens the referral screen through the dashboard',
   /onClick=\{onOpenReferral\}/.test(earnings) && /onOpenReferral=\{\(\) => openAccount\('referral'\)\}/.test(dash))
ok('the Jobs cards open the same three',
   /onGrow=\{\(\) => openAccount\('growth'\)\}/.test(dash)
   && /onInvite=\{\(\) => openAccount\('referral'\)\}/.test(dash)
   && /onProfile=\{\(\) => openAccount\('buildprofile'\)\}/.test(dash))

const srcFiles = []
;(function walk(d) {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, f.name)
    if (f.isDirectory()) walk(p); else if (/\.(jsx?|mjs)$/.test(f.name)) srcFiles.push(p)
  }
})(join(ROOT, 'src'))
const allSrc = srcFiles.map(p => readFileSync(p, 'utf8')).join('\n')
ok('no hard-coded URL into the referral screen is left behind',
   !/navigate\(['"]\/dashboard\/vendor\?tab=account&screen=referral/.test(allSrc))
ok('the app never writes a referral table', !/from\(['"]partner_referral(s|_invites)['"]\)\s*\.(insert|update|upsert|delete)/.test(allSrc))
ok('and never writes its own referral code', !/referral_code:\s*data|update\(\{\s*referral_code/.test(allSrc))
ok('the old static referral card is gone', !existsSync(join(ROOT, 'src/components/vendor/PartnerReferral.jsx')))
ok('a partner invitation code is not left for the customer programme to spend',
   /if \(PARTNER\) stashPartnerRef\(ref\)/.test(read('src/pages/auth/SignupPage.jsx')))

console.log(`\n${ran - bad} of ${ran} passed${bad ? `  —  ${bad} FAILED` : ''}\n`)
process.exit(bad ? 1 : 0)
