/**
 * What a referral IS, with no network in it.
 *
 * Kept apart from lib/referrals.js so `check-referral-lifecycle.mjs` can
 * load it in Node and test the exact functions the screens call. Every
 * number these produce comes from a row the server wrote; nothing here
 * decides a milestone, only how to say one.
 */

/** Where an invitation link lands. Inside the apk `location.origin` is
    localhost, which nobody can open, so the public partner site is named
    here (config/surface.js recognises it as the partner surface). */
export const PARTNER_SITE = 'https://sambramo-partners.vercel.app'

/** The lifecycle after a code is claimed, in order. `stamp` is the column
    on the referral; `count` is the key in my_referral_summary(). */
export const STAGES = [
  { key: 'registered',            label: 'Signed up',             stamp: 'claimed_at',              count: 'registered' },
  { key: 'onboarding_completed',  label: 'Finished onboarding',   stamp: 'onboarding_completed_at', count: 'onboarding_completed' },
  { key: 'verified',              label: 'Verified by Sambramo',  stamp: 'verified_at',             count: 'verified' },
  { key: 'live',                  label: 'Live for jobs',         stamp: 'live_at',                 count: 'live' },
  { key: 'first_event_completed', label: 'First event completed', stamp: 'first_event_at',          count: 'first_event_completed' },
]

/** The funnel as the dashboard shows it. Invitations first and labelled as
    what they are: a share is not a referral. */
export const FUNNEL = [
  { key: 'invited',               label: 'Invitations sent' },
  ...STAGES.map(s => ({ key: s.count, label: s.label })),
  { key: 'qualified',             label: 'Counted for a campaign' },
  { key: 'reward_eligible',       label: 'Reward qualified' },
  { key: 'paid',                  label: 'Reward paid' },
]

/** Reward status, worded so "qualified" can never be read as "paid". */
export const REWARD = {
  not_eligible:    { label: 'Not qualified yet',              tone: 'mute' },
  eligible:        { label: 'Qualified · not paid yet',       tone: 'attention' },
  payout_recorded: { label: 'Payout recorded · not paid yet', tone: 'attention' },
  paid:            { label: 'Paid',                           tone: 'good' },
}

/** Filters on the list. `state` values, plus the reward's `paid`. */
export const STATE_FILTERS = [
  { key: null,                    label: 'All' },
  { key: 'registered',            label: 'Signed up' },
  { key: 'onboarding_completed',  label: 'Onboarded' },
  { key: 'verified',              label: 'Verified' },
  { key: 'live',                  label: 'Live' },
  { key: 'first_event_completed', label: 'First event' },
  { key: 'reward_unlocked',       label: 'Reward qualified' },
  { key: 'paid',                  label: 'Paid' },
  { key: 'rejected',              label: 'Not eligible' },
]

export const STATE_KEYS = STATE_FILTERS.map(f => f.key).filter(Boolean)

const ZERO = Object.fromEntries(FUNNEL.map(f => [f.key, 0]))

/** Sum the per-trade rows into totals, including referrals with no trade. */
export function totalsOf(summary) {
  const rows = [...(summary?.trades ?? []), ...(summary?.untraded ? [summary.untraded] : [])]
  const out = { ...ZERO, invites_open: 0, not_eligible: 0 }
  for (const r of rows) {
    for (const k of Object.keys(out)) out[k] += Number(r?.[k] ?? 0)
  }
  return out
}

/** One trade's row from the summary, or zeros if it has none yet. */
export function tradeRow(summary, tradeId) {
  const r = (summary?.trades ?? []).find(t => t.trade_id === tradeId)
  return { ...ZERO, invites_open: 0, not_eligible: 0, ...(r ?? {}) }
}

/** The milestones of one referral, done or not, in order. */
export function timelineOf(r) {
  if (!r) return []
  const steps = STAGES.map(s => ({ key: s.key, label: s.label, at: r[s.stamp] ?? null }))
  steps.push({ key: 'qualified', label: 'Counted for a campaign', at: r.qualified_at ?? null })
  steps.push({ key: 'paid', label: 'Reward paid', at: r.reward_status === 'paid' ? r.paid_at : null })
  return steps.map(s => ({ ...s, done: !!s.at }))
}

/** What has to happen next, in one sentence, from the stamps alone. */
export function nextStep(r) {
  if (!r) return null
  if (r.not_eligible || r.state === 'rejected') {
    return 'This sign-up cannot count as a referral.'
  }
  if (!r.onboarding_completed_at) return 'They need to finish their partner application.'
  if (!r.verified_at) return 'Waiting for Sambramo to review and verify them.'
  if (!r.live_at) return 'Verified. They need to switch on job alerts to go live.'
  if (!r.first_event_at) return 'Live. It counts once they complete their first event.'
  switch (r.reward_status) {
    case 'paid':            return 'Complete. The reward has been paid.'
    case 'payout_recorded': return 'Your reward has been recorded. It shows as paid once the payout is made.'
    case 'eligible':        return 'Qualified. Sambramo records the payout; it is not paid yet.'
    default:
      return r.qualified_at
        ? 'Counted. The campaign needs more qualified referrals before a reward unlocks.'
        : 'First event done. It counts toward a reward only while a referral campaign is running.'
  }
}

/** An invitation's own state, from its timestamps. */
export function inviteStatus(inv, now = Date.now()) {
  if (inv?.claimed_at) return 'claimed'
  if (inv?.expires_at && new Date(inv.expires_at).getTime() <= now) return 'expired'
  return 'open'
}

/** Six characters is a partner's code; eight is one invitation. */
export const isReferralCode = code => /^[A-Z2-9]{6}$|^[A-Z2-9]{8}$/.test(String(code ?? ''))

export const normaliseCode = code => String(code ?? '').replace(/\s/g, '').toUpperCase()

export const inviteLink = code => `${PARTNER_SITE}/partner/join?ref=${encodeURIComponent(code)}`

export function inviteMessage({ tradeName, code }) {
  const as = tradeName ? ` as a ${tradeName} partner` : ' as a partner'
  return `Join me on Sambramo${as}. Sign up with my invitation code ${code}: ${inviteLink(code)}`
}

/** How a failed call should be shown. */
export function classifyError(error, online = true) {
  if (!error) return null
  const text = `${error.code ?? ''} ${error.message ?? ''}`
  if (!online || /Failed to fetch|NetworkError|Network request failed|Load failed/i.test(text)) return 'offline'
  // The function or table is not there: migration 158 has not been pasted.
  if (/PGRST202|PGRST205|42883|42P01|Could not find the function|does not exist|schema cache/i.test(text)) return 'unavailable'
  return 'error'
}

/**
 * The referral screen's title and the level above it, from the URL.
 * PartnerAccount renders these; check-trade-champion-ui drives them.
 *
 *   a referral  → back to its trade if it was opened from one, else the dashboard
 *   a trade     → back to the dashboard
 *   dashboard   → back to More (parent null)
 */
export function referralScreenMeta(view = {}, tradeName = null) {
  if (view.rid) {
    return { title: 'Referral', parent: view.trade ? { screen: 'referral', trade: view.trade } : { screen: 'referral' } }
  }
  if (view.trade) return { title: tradeName ?? 'Trade Champion 26', parent: { screen: 'referral' } }
  return { title: 'Trade Champion 26', parent: null }
}
