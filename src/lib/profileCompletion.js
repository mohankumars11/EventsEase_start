/**
 * How complete a partner's profile is, from what is SAVED.
 *
 * Every item is decided by a column or a row the server returned — never
 * by whether a form was opened. Called again after every save and every
 * time the screen is entered, so "complete" means the database says so.
 *
 * Each item names where it is fixed: `screen` is a More destination
 * (`?screen=`), `tab` a dashboard tab. Build Your Profile and Grow with
 * Sambramo both open exactly that place, and nothing more generic.
 *
 * Status vocabulary, and nothing else:
 *
 *   complete      saved and, where somebody checks it, accepted
 *   incomplete    missing, or saved but not enough to use
 *   submitted     sent, waiting to be picked up
 *   under_review  with the Sambramo team
 *   rejected      somebody said no; it needs changing
 */

export const STATUS_LABEL = {
  complete:     'Complete',
  incomplete:   'To do',
  submitted:    'Submitted',
  under_review: 'Under review',
  rejected:     'Needs changes',
}

const filled = v => typeof v === 'string' ? v.trim().length > 0 : v != null

/**
 * @param facts {
 *   profile, vendor,
 *   listings      rows from fetchListings (null while loading)
 *   weeklyRules   the standing week, from useVendorAccount
 *   markedDays    how many calendar days carry a deliberate mark
 *   docs          fetchDocuments() result (null while loading)
 *   requirements  requirementsFor(listed trades)
 *   payout        vendor_payout_details row, or null
 *   payoutLoaded  false until that read has answered
 * }
 */
export function profileChecklist(facts = {}) {
  const {
    profile = null, vendor = null, listings = null,
    weeklyRules = [], markedDays = 0,
    docs = null, requirements = [], payout = null, payoutLoaded = false,
  } = facts

  const items = []
  const add = (key, label, status, detail, to) => items.push({ key, label, status, detail, to })

  add('personal', 'Personal details',
    filled(profile?.full_name) ? 'complete' : 'incomplete',
    filled(profile?.full_name) ? profile.full_name : 'Add the name on your account',
    { screen: 'profile' })

  const descOk = (vendor?.description ?? '').trim().length >= 30
  add('business', 'Business name and description',
    filled(vendor?.business_name) && descOk ? 'complete' : 'incomplete',
    !filled(vendor?.business_name) ? 'Add your business name'
      : !descOk ? 'Describe your business in at least 30 characters'
      : vendor.business_name,
    { screen: 'business' })

  add('photo', 'Profile photo',
    filled(vendor?.avatar_url) ? 'complete' : 'incomplete',
    filled(vendor?.avatar_url) ? 'Added' : 'Customers trust a face or a logo',
    { screen: 'profile' })

  add('contact', 'Phone and contact',
    filled(vendor?.contact_phone) ? 'complete' : 'incomplete',
    filled(vendor?.contact_phone) ? vendor.contact_phone : 'Add the number customers call on the day',
    { screen: 'profile' })

  // ── Trades: the listing's own status, most urgent first ─────────────
  const rows = listings ?? []
  const statuses = rows.map(l => l.status)
  const tradeStatus = listings === null ? 'incomplete'
    : !rows.length ? 'incomplete'
    : statuses.includes('live') ? 'complete'
    : statuses.some(s => s === 'rejected' || s === 'requires_action') ? 'rejected'
    : statuses.includes('under_review') ? 'under_review'
    : 'incomplete'
  add('trades', 'Trades and service listings', tradeStatus,
    !rows.length ? 'Choose the trades you work in'
      : `${rows.length} trade${rows.length === 1 ? '' : 's'}: ${rows.map(l => l.trade).join(', ')}`,
    { screen: 'services' })

  const offerings = rows.flatMap(l => l.offerings ?? [])
  const priced = offerings.filter(o => o.is_active !== false && o.price != null).length
  add('pricing', 'Prices for your services',
    priced > 0 ? 'complete' : 'incomplete',
    priced > 0 ? `${priced} service${priced === 1 ? '' : 's'} priced`
      : offerings.length ? 'Add a price to at least one service' : 'Add a service with a price',
    { screen: 'services' })

  const located = filled(vendor?.pincode) || filled(vendor?.area)
  add('area', 'Service area and location',
    located ? 'complete' : 'incomplete',
    located ? `${vendor.area || vendor.pincode} · ${vendor.service_radius_km ?? 10} km`
      : 'Set where you are based and how far you travel',
    { screen: 'area' })

  const hasWeek = (weeklyRules?.length ?? 0) > 0 || markedDays > 0
  add('availability', 'Availability',
    hasWeek ? 'complete' : 'incomplete',
    hasWeek ? (vendor?.accepting_jobs === false ? 'Set · job alerts are paused' : 'Working days set')
      : 'Set the days you work',
    { tab: 'availability' })

  // ── Verification: the review's answer first, then the documents ─────
  const vs = vendor?.verification_status
  const uploaded = docs && !docs.unavailable ? Object.values(docs.byRequirement ?? {}) : []
  const needed = requirements.filter(r => r.required !== false)
  const have = needed.filter(r => docs?.byRequirement?.[r.id]).length
  const docRejected = uploaded.some(d => d?.status === 'rejected')
  const verifyStatus = vendor?.is_verified ? 'complete'
    : vs === 'rejected' || vs === 'suspended' || docRejected ? 'rejected'
    : vs === 'submitted' ? 'under_review'
    : 'incomplete'
  add('verification', 'Verification documents', verifyStatus,
    vendor?.is_verified ? 'Verified'
      : verifyStatus === 'rejected' ? 'A document needs replacing'
      : vs === 'submitted' ? 'With the Sambramo team'
      : needed.length ? `${have} of ${needed.length} added${have === needed.length ? ' · send them for review' : ''}`
      : 'Add your documents',
    { screen: 'verification' })

  add('payout', 'Payout details',
    !payoutLoaded ? 'incomplete' : !payout ? 'incomplete' : payout.verified_at ? 'complete' : 'submitted',
    !payoutLoaded ? 'Checking…' : !payout ? 'Add a bank account or UPI to get paid'
      : payout.verified_at ? (payout.method === 'upi' ? 'UPI' : 'Bank account') : 'Added · being checked',
    { screen: 'bank' })

  const done = items.filter(i => i.status === 'complete').length
  return { items, done, total: items.length }
}

/**
 * Can this partner be sent work today, and if not, why not.
 *
 * The same four facts dispatch reads: approved, taking jobs, a trade
 * that is live, and a location to measure distance from. Anything else
 * would be a readiness score this app made up.
 */
export function jobReadiness({ vendor = null, listings = null } = {}) {
  const missing = []
  if (!vendor?.is_verified) missing.push({ key: 'verification', label: 'Get verified', to: { screen: 'verification' } })
  if (!(listings ?? []).some(l => l.status === 'live')) missing.push({ key: 'trades', label: 'Have a trade listing go live', to: { screen: 'services' } })
  if (!(filled(vendor?.pincode) || filled(vendor?.area))) missing.push({ key: 'area', label: 'Set your service area', to: { screen: 'area' } })
  // The switch is OnlineToggle, in the Jobs tab's header.
  if (vendor?.accepting_jobs === false) missing.push({ key: 'alerts', label: 'Switch job alerts back on', to: { tab: 'offers' } })
  return { ready: missing.length === 0, missing }
}

/** The few things most worth doing next: refusals first, then gaps. */
export function nextActions(checklist, limit = 3) {
  const rank = { rejected: 0, incomplete: 1 }
  return (checklist?.items ?? [])
    .filter(i => i.status in rank)
    .sort((a, b) => rank[a.status] - rank[b.status])
    .slice(0, limit)
}
