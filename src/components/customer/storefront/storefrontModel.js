/**
 * One storefront shape for all 34 trades.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A MODEL AND NOT TWO CARDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * There were two storefronts, one for Anchor & MC and one for every other
 * trade, and they had drifted into two different products: different
 * sections, different labels, both with the same headline for every trade
 * on earth ("Make Your Service Unforgettable"), neither of which showed
 * what the partner actually told us about their work.
 *
 * The listing already carries that. `listing_public` and `listing_preview`
 * return the partner's questionnaire answers (private keys stripped
 * server-side), and the trade file says what every answer means: its
 * label, its options, its unit. This module joins the two, so a
 * photographer's storefront says "Candid · Traditional · Drone" and
 * "Sneak-peek photos within 3 days" instead of nothing.
 *
 * Both adapters (TradeListingCard, AnchorProfileCard) build this shape and
 * render the same <Storefront>. Pure functions only, no React, so the
 * shape can be asserted on without mounting anything.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT NEVER REACHES A CUSTOMER
 * ══════════════════════════════════════════════════════════════════════
 *
 *   money answers   a partner's money answers are their TAKE-HOME rates.
 *                   The customer price is a different number the server
 *                   computes; showing the answer would quote the partner's
 *                   rate as the customer's price. Prices come only from
 *                   packages, rules, catalogue and add-ons, which arrive
 *                   already converted to customer_paise.
 *   private         any question marked private (registration numbers…)
 *   sensitive       anything whose key or label looks like identity, bank
 *                   or internal review data, belt and braces over the
 *                   server's own strip.
 *   reviewed text   free text a trade file says is reviewed before it is
 *                   shown (security "other_service", storage
 *                   "custom_category").
 */
import { configFor, questionsOf } from '../../../data/trades'
import { RULE_KINDS } from '../../../data/trades/schema'
import { CANCELLATION_V3, EVENT_GROUPS_V3, TRAVEL_MODELS } from '../../vendor/anchor/options'

const SENSITIVE = /(aadhaar|aadhar|\bpan\b|bank|account|ifsc|password|private|internal|take.?home|platform.?fee|commission|payout|review.?note|licen[cs]e.?number|registration|legal|gst.?number|otp)/i
const REVIEWED_TEXT = new Set(['other_service', 'custom_category', 'other_description'])

export const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
export const list = v => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.split(',').map(x => x.trim()).filter(Boolean) : [])
export const present = v => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)
const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
const labelOf = v => (typeof v === 'string' || typeof v === 'number' ? String(v) : v?.label ?? v?.name ?? v?.title ?? v?.id ?? '')
const humanize = s => { const t = String(s ?? '').replace(/_/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : '' }
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s)

/* ── Units ─────────────────────────────────────────────────────────────── */
const UNIT = {
  hour: 'per hour', session: 'per session', event: 'per event', half_day: 'per half-day', day: 'per day',
  person: 'per person', unit: 'per unit', guest: 'per guest', plate: 'per plate', staff_hour: 'per staff-hour',
  staff_shift: 'per staff shift', staff_day: 'per staff-day', trip: 'per trip', km: 'per km',
  vehicle_hour: 'per vehicle-hour', vehicle_day: 'per vehicle-day', item: 'per item', item_period: 'per item, per period',
  slot: 'per slot', capacity_period: 'per unit, per period', package: 'per package', percent: '% of the agreed base',
  piece: 'per piece', kg: 'per kg', set: 'per set', box: 'per box', counter: 'per counter', month: 'per month',
  function: 'per function', project: 'per project', staff: 'per staff member', vehicle: 'per vehicle', sqft: 'per sq ft',
}
export function unitLabel(u) {
  if (!present(u)) return ''
  const raw = String(u).trim().toLowerCase()
  if (raw === 'included') return 'included'
  if (raw.startsWith('per ')) return raw
  const key = raw.replace(/^per_/, '')
  return UNIT[key] ?? 'per ' + key.replace(/_/g, ' ')
}

/* ── Rewriting a partner question as a customer fact ───────────────────
   The trade files ask the PARTNER: "Which flowers do you work with?",
   "You travel for destination shoots". On a storefront those read as a
   form left open. Turned into the third person they read as facts:
   "Flowers", "Travels for destination shoots". Heuristic by design; a
   question can carry an explicit `customerLabel` when it reads wrong. */
const IRREGULAR = { have: 'has', do: 'does', go: 'goes', are: 'is', can: 'can', will: 'will', also: 'also' }
function conjugate(verb) {
  const v = verb.toLowerCase()
  if (IRREGULAR[v]) return IRREGULAR[v]
  if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es'
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'
  return v + 's'
}
const theyForm = s => s
  .replace(/\byours\b/gi, 'theirs').replace(/\byour\b/gi, 'their')
  .replace(/\byou're\b/gi, "they're").replace(/\byou\b/gi, 'they')

/* "You pack and wrap items": both verbs, not only the first. */
const conjugateRest = rest => rest.replace(/^(\s+(?:and|or)\s+)(\w+)\b/i, (_, join, v) => join + conjugate(v))

/** A toggle's label, as a thing the partner does: "You bring X" -> "Brings X". */
export function asCapability(label) {
  let s = String(label ?? '').trim().replace(/\?$/, '')
  let m = s.match(/^do you\s+(.+)$/i)
  if (m) s = 'You ' + m[1]
  if ((m = s.match(/^can (?:customers|they)\s+(.+)$/i))) return cap(theyForm('Customers can ' + m[1]))
  if ((m = s.match(/^can you\s+(.+)$/i))) return cap(theyForm('Can ' + m[1]))
  if ((m = s.match(/^(?:is|are)\s+(.+)$/i))) return cap(theyForm(m[1]))
  m = s.match(/^you\s+(\w+)\b(.*)$/i)
  if (m) return cap(theyForm(conjugate(m[1]) + conjugateRest(m[2])))
  return cap(theyForm(s))
}

/* "How many guests can you serve per hour?" reads as a form left open
   once the question mark goes. Put back in statement order it is a
   heading: "Guests they can serve per hour". */
function statementOrder(s) {
  let m
  if ((m = s.match(/^how many\s+(.+?)\s+(can|will|do|does)\s+(you|your \w+)\s+(.+?)\??$/i))) {
    const aux = /^do(es)?$/i.test(m[2]) ? '' : m[2].toLowerCase() + ' '
    return cap(theyForm(`${m[1]} ${m[3]} ${aux}${m[4]}`))
  }
  if ((m = s.match(/^what is (?:the |your )?(.+?)\??$/i))) return cap(theyForm(m[1]))
  if ((m = s.match(/^((?:how(?: \w+)?|what|where|when|who)(?: [^?]*?)?)\s+(do|does|can|will|is|are)\s+(you|your \w+)\b\s*(.*?)\??$/i))) {
    const aux = /^do(es)?$/i.test(m[2]) ? '' : m[2].toLowerCase() + ' '
    return cap(theyForm(`${m[1]} ${m[3]} ${aux}${m[4]}`.replace(/\s+/g, ' ').trim()))
  }
  return null
}

/** A choice or number question's label, as a fact heading. */
export function asFactLabel(q) {
  if (q?.customerLabel) return q.customerLabel
  let s = String(q?.label ?? '').trim()
  let m
  if (/^which of these\b/i.test(s)) return 'Services'
  if ((m = s.match(/^describe (?:your|the)\s+(.+)$/i))) return cap(m[1])
  if ((m = s.match(/^which\s+(.+?)\s+(?:do|does|can|will)\s+you\b.*\?$/i))) return cap(m[1])
  if ((m = s.match(/^which\s+(.+?)\s+(?:do|does)\s+(your \w+)\s+(.+?)\?$/i))) return cap(theyForm(`${m[1]} ${m[2]} ${m[3]}`))
  if ((m = s.match(/^which\s+(.+?)\s+can customers\s+(.+?)\?$/i))) return cap(`${m[1]} customers can ${m[2]}`)
  if ((m = s.match(/^which\s+(.+?)\s+(?:are|is)\s+\w+\??$/i))) return cap(m[1])
  if ((m = s.match(/^what\s+(?:kinds?|types?|sorts?|parts?)\s+of\s+(.+?)\s+(?:do|does|can|will)\s+you\b.*\?$/i))) return cap(m[1])
  if ((m = s.match(/^what do you\s+(\w+)\??$/i))) return 'What they ' + m[1]
  if ((m = s.match(/^(?:is|are)\s+(.+?)\?$/i))) return cap(m[1])
  if ((m = s.match(/^do you\s+(.+?)\?$/i))) return asCapability('You ' + m[1])
  const ordered = statementOrder(s)
  if (ordered) return ordered
  return cap(theyForm(s.replace(/\?$/, '')))
}

/* ── Turning answers into facts ──────────────────────────────────────── */
function optionLabel(q, id, answers) {
  if (id === 'other') return String(answers?.[`${q.id}_other`] ?? '').trim() || null
  const o = (q.options ?? []).find(x => x.id === id)
  return o ? o.label : humanize(id)
}

function formatNumber(n, suffix) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  const t = v.toLocaleString('en-IN')
  return suffix ? `${t} ${suffix}` : t
}

/** One answer, as display text (string) or chips (array), or null. */
export function answerValue(q, raw, answers) {
  if (!present(raw)) return null
  switch (q.type) {
    case 'multi': {
      const chips = list(raw).map(id => optionLabel(q, id, answers)).filter(Boolean)
      return chips.length ? chips : null
    }
    case 'single': return optionLabel(q, raw, answers)
    case 'number': return formatNumber(raw, q.suffix)
    case 'dimensions': {
      const d = obj(raw)
      const parts = [d.l ?? d.length, d.w ?? d.width, d.h ?? d.height].filter(present)
      return parts.length ? parts.join(' × ') + (q.unit ? ' ' + q.unit : '') : null
    }
    case 'text': case 'textarea': case 'time': {
      const t = String(raw).trim()
      return t || null
    }
    default: return null
  }
}

const shownElsewhere = q =>
  q.private || q.id === 'display_name' || q.id === 'business_name' || q.type === 'money' || q.type === 'photos' || q.type === 'url' || q.type === 'date' ||
  REVIEWED_TEXT.has(q.id) || SENSITIVE.test(q.id) || SENSITIVE.test(q.label ?? '')

/**
 * Everything a partner said, as customer facts.
 *   facts   [{ id, label, value: string | string[], wide }]
 *   checks  ["Travels for destination shoots", …]  (toggles that are on)
 */
export function factsFromAnswers(config, answers, { skip = new Set() } = {}) {
  const facts = [], checks = []
  if (!config) return { facts, checks }
  const a = obj(answers)
  for (const q of questionsOf(config)) {
    if (q.scope === 'catalogue' || skip.has(q.id) || shownElsewhere(q)) continue
    if (q.type === 'toggle') { if (a[q.id] === true) checks.push(asCapability(q.label)); continue }
    const value = answerValue(q, a[q.id], a)
    if (!present(value)) continue
    const wide = Array.isArray(value) || (typeof value === 'string' && value.length > 34) || q.type === 'textarea'
    facts.push({ id: q.id, label: asFactLabel(q), value, wide })
  }
  return { facts, checks }
}

/** A catalogue item's own answers, as short "Label · value" chips. */
export function itemChips(config, attributes, max = 5) {
  const fields = config?.catalogue?.fields ?? []
  const a = obj(attributes)
  const out = []
  for (const q of fields) {
    if (out.length >= max) break
    if (shownElsewhere(q) || ['name', 'sku', 'description'].includes(q.id)) continue
    if (q.type === 'toggle') { if (a[q.id] === true) out.push(asCapability(q.label)); continue }
    const v = answerValue(q, a[q.id], a)
    if (!present(v)) continue
    const text = Array.isArray(v) ? v.slice(0, 3).join(', ') : v
    if (String(text).length > 40) continue
    out.push(`${asFactLabel(q)} · ${text}`)
  }
  return out
}

/* ── Shared pieces of a storefront ───────────────────────────────────── */
const CAPACITY_KEYS = ['max_guests', 'max_audience', 'max_capacity', 'max_event_guests', 'max_seated_guests',
  'max_visitors', 'max_attendees', 'recommended_capacity', 'max_cars', 'capacity']
const YEAR_KEYS = ['years', 'years_experience', 'years_active']
const TEAM_KEYS = ['team', 'crew', 'artists', 'guards', 'workers', 'staff', 'staff_pool', 'valets', 'technicians', 'drivers', 'performers', 'coordinators']

function findQuestion(config, id) {
  return config ? questionsOf(config).find(q => q.id === id) ?? null : null
}

function cancellationText(id) {
  const c = CANCELLATION_V3.find(x => x.id === id)
  return c ? { title: c.title, body: c.body } : present(id) ? { title: humanize(id), body: '' } : null
}

/* TRAVEL_MODELS is written for the partner ("Included within my travel
   area"). The customer needs the same rule from their side of it. */
function travelText(model, scope) {
  const km = /^\d+$/.test(String(scope ?? '')) ? Number(scope) : null
  const area = km ? `${km} km` : present(scope) ? humanize(scope).toLowerCase() : 'their area'
  switch (model) {
    case 'included_radius': return `No travel charge within ${area}`
    case 'flat': return `A flat outstation fee beyond ${area}`
    case 'per_km': return `Charged per km beyond ${area}`
    case 'customer_arranged': return 'You arrange travel and stay'
    case 'custom': return `Travel beyond ${area} is quoted per event`
    default: return km ? `Works within ${area}` : present(scope) ? `Works across ${area}` : null
  }
}

const instantOf = terms => {
  const t = obj(terms)
  const v = t.instant ?? t.availability_policy ?? t.booking_mode
  if (v === undefined || v === null || v === '') return null
  return v === true || ['true', 'instant', 'on'].includes(String(v).toLowerCase())
}

/* ── Engine trades (33 of the 34) ────────────────────────────────────── */
export function modelFromTradeListing(listing, { tradeName, media = [] } = {}) {
  const L = obj(listing)
  const config = configFor(L.trade_id) ?? configFor(tradeName)
  const profile = obj(L.profile)
  const answers = obj(L.answers)
  const terms = obj(L.terms)

  const name = [profile.display_name, profile.business_name, L.business_name, profile.stage_name, L.vendor_name]
    .find(v => present(v) && !['this partner', 'partner business', 'your business'].includes(String(v).trim().toLowerCase()))
    || 'Partner profile'

  /* The headline facts: the four numbers a customer compares partners on. */
  const yearsKey = YEAR_KEYS.find(k => num(answers[k] ?? profile[k]))
  const years = yearsKey ? num(answers[yearsKey] ?? profile[yearsKey]) : null
  const capKey = CAPACITY_KEYS.find(k => num(answers[k]))
  const capQ = capKey ? findQuestion(config, capKey) : null
  const capacity = capKey ? { value: num(answers[capKey]), unit: capQ?.suffix ?? (capKey === 'max_cars' ? 'cars' : 'guests') } : null
  /* No capacity answer (a photographer has none): the team is the next
     thing a customer weighs, so it takes the slot. */
  const teamKey = capKey ? null : TEAM_KEYS.find(k => num(answers[k]))
  const team = teamKey ? num(answers[teamKey]) : null

  /* What they do, said in their own chips: the first required choice on
     the first screen is the trade's "what do you offer" question in every
     file (specialties, services, ceremonies, venue type…). */
  const first = config?.screens?.[0]?.questions ?? []
  const headQ = first.find(q => (q.type === 'multi' || q.type === 'single') && q.required && !['events', 'event_types', 'languages'].includes(q.id))
  const highlights = headQ ? list(answerValue(headQ, answers[headQ.id], answers)) : list(profile.specialties ?? profile.services).map(labelOf)
  const eventsQ = findQuestion(config, 'events') ?? findQuestion(config, 'event_types')
  const events = eventsQ
    ? list(answerValue(eventsQ, answers[eventsQ.id], answers))
    : list(profile.events).map(labelOf).filter(Boolean)
  const langQ = findQuestion(config, 'languages')
  const languages = langQ ? list(answerValue(langQ, answers.languages, answers)) : list(profile.languages).map(labelOf)

  const skip = new Set([headQ?.id, eventsQ?.id, 'languages', yearsKey, capKey].filter(Boolean))
  const answered = factsFromAnswers(config, answers, { skip })
  /* A venue's name answer is usually the name at the top of the card. */
  const facts = answered.facts.filter(f => String(f.value).trim().toLowerCase() !== String(name).trim().toLowerCase())
  const { checks } = answered
  /* Legacy listings built before answers travelled: their saved details. */
  for (const d of Array.isArray(L.details) ? L.details : []) {
    if (!d || !present(d.value) || SENSITIVE.test(String(d.label ?? ''))) continue
    facts.push({ id: d.key ?? d.label, label: d.label ?? humanize(d.key), value: Array.isArray(d.value) ? d.value.map(labelOf) : labelOf(d.value), wide: Array.isArray(d.value) })
  }

  const addonLabel = id => list(L.addons).find(x => x?.addon_id === id || x?.id === id)?.label
    ?? config?.addons?.find(x => x.id === id)?.label ?? humanize(id)

  const packages = list(L.packages).filter(p => p && !['ARCHIVED', 'PAUSED'].includes(String(p.status ?? '').toUpperCase())).map((p, i) => ({
    id: String(p.key ?? p.id ?? p.name ?? i),
    tier: p.key ?? p.tier ?? null,
    name: p.name || 'Package',
    price: num(p.customer_paise),
    unit: unitLabel(p.unit),
    hours: num(p.hours ?? p.duration_hours),
    guests: (num(p.min_guests) || num(p.max_guests)) ? [num(p.min_guests), num(p.max_guests)] : null,
    inclusions: list(p.inclusions).map(x => (typeof x === 'string' ? addonLabel(x) : labelOf(x))).filter(Boolean),
    description: p.description || '',
    /* Only when the data says so. "Most popular" is a claim about
       bookings; guessing it from position would be inventing one. */
    popular: p.is_popular === true || p.is_featured === true,
    raw: p,
  }))

  const rules = list(L.rules).map(r => ({
    label: r.label || RULE_KINDS[r.kind]?.label || unitLabel(r.unit) || 'Rate',
    price: num(r.customer_paise),
    unit: unitLabel(r.unit || RULE_KINDS[r.kind]?.unit),
    detail: [
      num(r.included_hours) && `${r.included_hours} hours included`,
      num(r.included_qty) && `${r.included_qty} included`,
      num(r.min_qty) && `minimum ${r.min_qty} ${RULE_KINDS[r.kind]?.qty ?? ''}`.trim(),
      num(r.max_qty) && `up to ${r.max_qty} ${RULE_KINDS[r.kind]?.qty ?? ''}`.trim(),
    ].filter(Boolean).join(' · '),
  }))

  const items = list(L.catalogue).map((c, i) => ({
    id: c.item_key ?? c.id ?? i,
    name: c.name || c.label || 'Item',
    price: num(c.customer_paise),
    unit: unitLabel(c.unit),
    chips: [
      ...itemChips(config, c.attributes ?? c.answers),
      num(c.lead_days) && `${c.lead_days} days notice`,
      num(c.min_qty) && `Minimum ${c.min_qty}`,
    ].filter(Boolean).slice(0, 6),
    deposit: num(c.deposit_paise),
  }))

  const extras = list(L.addons).filter(a => a && a.active !== false).map(a => ({
    label: a.label || addonLabel(a.addon_id) || 'Optional extra',
    price: num(a.customer_paise),
    unit: unitLabel(a.unit),
    description: a.description || '',
  }))

  const menus = list(L.menus).map(m => ({
    name: m.name || 'Menu',
    price: num(m.customer_paise),
    unit: m.price_model === 'fixed' ? 'per event' : 'per guest',
    diet: m.diet ? humanize(m.diet) : '',
    guests: (num(m.min_guests) || num(m.max_guests)) ? [num(m.min_guests), num(m.max_guests)] : null,
    courses: Object.entries(list(m.items).reduce((acc, it) => {
      const k = humanize(it.course_group || 'Dishes'); (acc[k] = acc[k] || []).push(it.name); return acc
    }, {})).map(([course, dishes]) => ({ course, dishes: dishes.filter(Boolean) })),
  }))

  const cancellation = cancellationText(terms.cancellation ?? terms.cancellation_policy)
  const fromPaise = [...packages.map(p => p.price), ...rules.map(r => r.price), ...items.map(x => x.price), ...menus.map(m => m.price)]
    .filter(Boolean).sort((x, y) => x - y)[0] ?? null

  const links = [
    profile.video_url && { kind: 'video', label: 'Watch their showreel', url: profile.video_url },
    answers.showreel && { kind: 'video', label: 'Watch their showreel', url: answers.showreel },
    answers.gallery_link && { kind: 'gallery', label: 'Open their online gallery', url: answers.gallery_link },
    answers.video && { kind: 'video', label: 'Venue walkthrough video', url: answers.video },
    profile.instagram && { kind: 'instagram', label: 'Instagram', url: profile.instagram },
    profile.catalog_url && { kind: 'catalog', label: 'Product catalogue', url: profile.catalog_url },
    profile.audio_url && { kind: 'audio', label: 'Listen to a sample', url: profile.audio_url },
  ].filter(Boolean).filter((x, i, arr) => arr.findIndex(y => y.url === x.url) === i)

  return {
    tradeName: tradeName || config?.name || L.trade_name || 'Event service',
    name,
    tagline: profile.tagline || '',
    bio: profile.bio || L.description || profile.about || '',
    avatarUrl: profile.avatar_url || L.avatar_url || '',
    location: L.city || profile.city || '',
    rating: num(L.rating ?? L.rating_avg),
    reviewCount: num(L.review_count) ?? 0,
    verified: L.is_verified === true,
    isLive: L.is_live === true || ['LIVE', 'ACTIVE'].includes(String(L.status ?? L.state ?? '').toUpperCase()),
    status: String(L.status ?? L.state ?? '').toUpperCase(),
    years, capacity, team, fromPaise,
    noticeDays: present(terms.min_notice_days) ? Number(terms.min_notice_days) : null,
    instant: instantOf(terms),
    highlights, events, languages, facts, checks,
    media: list(media).filter(m => m?.url && ['photo', 'video'].includes(m.kind)),
    packages, rules, items, extras, menus, links,
    terms: {
      advancePct: num(terms.advance_pct ?? terms.advance_percent),
      cancellation,
      travel: travelText(terms.travel_model, terms.travel_scope),
      charges: list(terms.charges).map(c => ({ label: c.label || humanize(c.role) || 'Charge', price: num(c.customer_paise), unit: unitLabel(c.unit) })),
    },
    reviews: list(L.reviews),
  }
}

/* ── Anchor & MC ─────────────────────────────────────────────────────── */
const EVENT_LABEL = Object.fromEntries(EVENT_GROUPS_V3.flatMap(g => g.items.map(i => [i.id, i.label])))
const ROLE = { anchor: 'Anchor', mc: 'MC', both: 'Anchor & MC' }

export function modelFromAnchor({ profile, packages = [], pricingModels = [], extras = [], bookingDetails = [],
  city, rating, reviewCount = 0, verified = false, media = [], instantBookEnabled = true, isLive }) {
  const p = obj(profile)
  const role = p.role === 'other' ? p.role_other : ROLE[p.role] ?? 'Anchor & MC'
  const langs = list(p.languages).map(l => {
    const n = labelOf(l)
    const level = l?.level ?? l?.proficiency
    return level ? `${n} (${humanize(level)})` : n
  }).filter(Boolean)
  const events = [...list(p.events).map(e => EVENT_LABEL[e?.id ?? e] ?? labelOf(e)),
    ...Object.values(obj(p.events_other)).flat()].filter(Boolean)
  const styles = [...list(p.styles ?? p.style).map(labelOf), p.style_other].filter(present)
  const yearsBand = present(p.years) ? String(p.years) : null
  const audience = num(p.max_audience)

  const facts = []
  if (styles.length) facts.push({ id: 'styles', label: 'Hosting style', value: styles, wide: true })
  if (list(p.formats).length) facts.push({ id: 'formats', label: 'Formats', value: list(p.formats).map(labelOf), wide: true })
  if (langs.length) facts.push({ id: 'languages', label: 'Languages', value: langs, wide: true })
  for (const d of list(bookingDetails)) {
    const label = d.label ?? d.k ?? d.name
    if (label && present(d.value) && !SENSITIVE.test(String(label))) facts.push({ id: label, label, value: labelOf(d.value), wide: String(labelOf(d.value)).length > 34 })
  }

  const pkgs = list(packages).map((k, i) => ({
    id: String(k.tier ?? k.name ?? i), tier: k.tier ?? null, name: k.name || 'Package',
    price: num(k.customer_paise), unit: 'per event', hours: num(k.hours ?? k.duration_hours), guests: null,
    inclusions: list(k.inclusions).map(labelOf).filter(Boolean), description: k.description || '',
    popular: k.is_popular === true || k.is_featured === true, raw: k,
  }))

  return {
    tradeName: 'Anchor & MC',
    name: p.stage_name || p.name || p.display_name || 'Anchor & MC',
    tagline: p.tagline || role,
    bio: p.bio || '',
    avatarUrl: p.avatar_url || p.profile_photo_url || '',
    location: city || '',
    rating: num(rating),
    reviewCount: num(reviewCount) ?? 0,
    verified: verified === true,
    isLive: isLive !== false,
    status: isLive === false ? 'DRAFT' : '',
    years: yearsBand ? null : num(p.years), yearsBand,
    capacity: audience ? { value: audience, unit: 'guests' } : null,
    fromPaise: pkgs.map(x => x.price).filter(Boolean).sort((a, b) => a - b)[0] ?? null,
    noticeDays: null,
    instant: instantBookEnabled === true || instantBookEnabled === 'true',
    highlights: [role, ...styles.slice(0, 3)].filter(Boolean),
    events, languages: langs.map(l => l.replace(/ \(.+\)$/, '')), facts, checks: [],
    media: list(media).filter(m => m?.url && ['photo', 'video'].includes(m.kind)),
    packages: pkgs,
    rules: list(pricingModels).map(m => ({ label: m.name ?? m.label ?? 'Rate', price: null, priceText: m.price || '', unit: '', detail: m.rules || '' })),
    items: [], menus: [],
    extras: list(extras).map(x => ({ label: x.name ?? x.label ?? 'Optional extra', price: num(x.customer_paise), priceText: x.price || '', unit: '' })),
    links: [
      p.video_url && { kind: 'video', label: 'Watch them host', url: p.video_url },
      p.instagram && { kind: 'instagram', label: 'Instagram', url: p.instagram },
      p.audio_url && { kind: 'audio', label: 'Listen to a sample', url: p.audio_url },
    ].filter(Boolean),
    terms: { advancePct: null, cancellation: null, travel: null, charges: [] },
    reviews: [],
  }
}

/* ── Which form step edits which storefront section ──────────────────
   The preview's Edit buttons name a section; the listing form needs a
   stage id. Engine trades share one stage set (listing/payload.js
   stagesFor), catering has its own, Anchor & MC its own. A stage the
   flow does not know falls back to its first step, never past an
   unfinished one, so a wrong mapping cannot strand anybody. */
export const ANCHOR_SECTION_STAGE = {
  profile: 'about', about: 'about', work: 'about', offers: 'packages',
  pricing: 'pricing', glance: 'languages', terms: 'rules',
}
const CATERING_SECTION_STAGE = {
  profile: 'cat_profile', about: 'cat_profile', work: 'cat_profile', offers: 'cat_menus',
  pricing: 'cat_pricing', glance: 'cat_capacity', terms: 'cat_prep',
}
export function stageForSection(section, config) {
  if (!config) return 'review'
  if (config.legacyFlow === 'anchor' || config.id === 'anchor_mc') return ANCHOR_SECTION_STAGE[section] ?? 'review'
  if (config.customFlow === 'catering') return CATERING_SECTION_STAGE[section] ?? 'review'
  const first = config.screens?.[0]?.id
  const map = {
    profile: 'basics', about: 'basics', work: 'basics',
    offers: config.tiers && config.pricing?.packages ? 'packages' : config.catalogue ? 'catalogue' : 'pricing',
    pricing: 'pricing',
    glance: first ? `screen:${first}` : 'resources',
    terms: 'booking',
  }
  return map[section] ?? 'review'
}
