/**
 * The storefront a partner is building, from the answers they have given
 * so far: what the live preview and the Submit step show.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY FROM THE DRAFT, NOT THE SERVER
 * ══════════════════════════════════════════════════════════════════════
 *
 * listing_preview reads a SUBMITTED version. During onboarding there is
 * none yet, and the point of the live preview is to show the effect of
 * the answer the partner gave a second ago. So the listing is assembled
 * here from the flow's own state, in the same shape listing_public
 * returns, and fed to the same storefront model the customer page uses.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PRICES ARE THE PARTNER'S OWN RATE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Onboarding quotes the partner's rate and nothing else (see
 * scripts/check-partner-price-only.mjs). The customer price is worked out
 * on the server when the listing is submitted, so this preview never
 * guesses it: every amount here is what the partner entered, and the
 * preview says so in one line.
 */
import { useEffect, useMemo, useState } from 'react'
import { RULE_KINDS } from '../../../data/trades/schema'
import { holds } from '../../../data/trades'
import { itemName, itemPricePaise } from './payload'
import { signedUrlsFor } from '../../../lib/partnerWork'
import { takeHomeOf } from '../../../lib/tierPackages'

const list = v => (Array.isArray(v) ? v : [])
const num = v => (Number(v) > 0 ? Number(v) : null)

function visibleAnswers(config, ans) {
  const qs = [...(config.screens ?? []).flatMap(s => s.questions), ...(config.pricing?.fields ?? []), ...(config.resources?.fields ?? [])]
  return Object.fromEntries(Object.entries(ans ?? {}).filter(([k]) => {
    const q = qs.find(x => x.id === k)
    return !q || holds(q.showWhen, ans)
  }))
}

function cityLine(loc) {
  return [loc?.locality, loc?.city].filter(Boolean).join(', ')
}

function termsOf(a) {
  const av = a.availability ?? {}, b = a.booking ?? {}, loc = a.location ?? {}
  return {
    instant: b.instant !== false ? 'true' : 'false',
    cancellation: b.cancellation ?? null,
    min_notice_days: av.min_notice_days ?? null,
    travel_model: av.travel_model ?? null,
    travel_scope: loc.travel_scope ?? null,
  }
}

/** The 33 engine trades. */
export function engineDraftListing(config, a) {
  const { legal_name, work, ...basics } = a.basics ?? {} // eslint-disable-line no-unused-vars
  const answers = visibleAnswers(config, a.answers)
  const addonLabel = id => config.addons?.find(d => d.id === id)?.label ?? id
  return {
    trade_id: config.id, status: 'DRAFT', is_live: false,
    city: cityLine(a.location),
    profile: { ...basics },
    answers,
    rules: Object.entries(a.rules ?? {}).filter(([, r]) => r?.on).map(([kind, r]) => ({
      kind, label: RULE_KINDS[kind]?.label, unit: RULE_KINDS[kind]?.unit,
      customer_paise: num(r.amount_paise), min_qty: num(r.min_qty), max_qty: num(r.max_qty),
      included_hours: num(r.included_hours), included_qty: num(r.included_qty),
    })),
    catalogue: config.catalogue ? list(a.catalogue).map(it => ({
      item_key: it.item_key, name: itemName(config.catalogue, it.answers),
      customer_paise: num(itemPricePaise(config.catalogue, it.answers)),
      unit: it.answers?.price_unit ?? it.answers?.unit ?? it.answers?.rate_period ?? null,
      attributes: it.answers ?? {},
    })) : [],
    packages: list(a.packages).map(p => ({
      key: p.key, name: p.name, hours: num(p.hours),
      customer_paise: num(p.take_home_paise),
      inclusions: list(p.inclusions).map(addonLabel),
    })),
    addons: Object.entries(a.addons ?? {}).filter(([, x]) => x?.on).map(([id, x]) => ({
      addon_id: id, label: addonLabel(id), unit: config.addons?.find(d => d.id === id)?.unit ?? 'per_event',
      customer_paise: num(x.take_home_paise),
    })),
    terms: termsOf(a),
  }
}

/** Catering's own flow: menus by course, priced per guest. */
export function cateringDraftListing(config, a) {
  const { legal_name, work, ...basics } = a.basics ?? {} // eslint-disable-line no-unused-vars
  const dishName = new Map(list(a.dishes).map(d => [d.item_key, d.name]))
  const live = x => x && x.status !== 'archived'
  return {
    trade_id: config.id, status: 'DRAFT', is_live: false,
    city: cityLine(a.location),
    profile: { ...basics },
    answers: { ...(a.answers ?? {}) },
    menus: list(a.menus).filter(live).map(m => ({
      name: m.name, diet: m.diet, price_model: m.price_model,
      customer_paise: m.price_model === 'quote' ? null : num(m.price_paise),
      min_guests: num(m.min_guests), max_guests: num(m.max_guests),
      items: list(m.items).map(it => ({ course_group: it.course_group, name: dishName.get(it.dish_key) ?? null })).filter(it => it.name),
    })),
    packages: list(a.packages).filter(live).map(p => ({ key: p.package_key ?? p.name, name: p.name, customer_paise: num(p.price_paise), inclusions: [] })),
    terms: termsOf(a),
  }
}

/** Anchor & MC: the props AnchorProfileCard takes. `labelOf` turns an
 *  add-on id in a tier's inclusions into its name. */
export function anchorDraftProps(a, tiers, labelOf = id => id) {
  const { legal_name, work, ...about } = a.about ?? {} // eslint-disable-line no-unused-vars
  return {
    profile: { ...about, ...(a.events ?? {}), ...(a.languages ?? {}) },
    city: cityLine(a.location),
    packages: list(tiers).map(k => ({ tier: k.tier, name: k.name, hours: k.duration_hours, /* An anchor tier's price_paise is the customer price; the partner
       is shown their own rate, as everywhere else in onboarding. */
    customer_paise: takeHomeOf(k.price_paise), inclusions: list(k.inclusions).map(labelOf) })),
    instantBookEnabled: a.rules?.instant !== false,
    isLive: false,
  }
}

/** The partner's uploads, signed for display. Photos and videos only. */
export function useWorkMedia(work) {
  const items = useMemo(() => list(work).filter(w => (w.kind === 'photo' || w.kind === 'video') && (w.path || w.storage_path)), [work])
  const key = items.map(w => w.path || w.storage_path).join('|')
  const [urls, setUrls] = useState({})
  useEffect(() => {
    let alive = true
    const paths = items.map(w => w.path || w.storage_path)
    if (!paths.length) { setUrls({}); return }
    signedUrlsFor(paths, 600).then(u => { if (alive) setUrls(u) }).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return useMemo(() => items.map((w, i) => ({
    id: w.path || w.storage_path || i, kind: w.kind, caption: w.caption || '',
    url: urls[w.path || w.storage_path] || '', review_status: 'pending',
  })).filter(m => m.url), [items, urls])
}

/* Which storefront sections a finished step changed. The pop-up after
   each step shows exactly those, so the partner sees what that answer
   bought them. A step that changes nothing a customer sees (identity
   documents, payout) shows nothing. */
const ENGINE = { basics: ['profile', 'about', 'work'], location: ['profile'], catalogue: ['pricing'], pricing: ['pricing'],
  packages: ['offers'], extras: ['pricing'], resources: ['glance'], availability: ['terms'], booking: ['terms'] }
const CATERING = { cat_profile: ['profile', 'about', 'work'], location: ['profile'], cat_cuisines: ['about'], cat_capacity: ['glance'],
  cat_dishes: ['offers'], cat_menus: ['offers'], cat_counters: ['offers'], cat_packages: ['offers'], cat_pricing: ['pricing'],
  cat_extras: ['pricing'], cat_prep: ['terms'] }
const ANCHOR = { about: ['profile', 'about', 'work'], location: ['profile'], events: ['about'], languages: ['glance'],
  pricing: ['pricing'], extras: ['pricing'], packages: ['offers'], availability: ['terms'], rules: ['terms'] }

export function sectionsForStage(stageId, flow = 'engine') {
  if (flow === 'anchor') return ANCHOR[stageId] ?? null
  if (flow === 'catering') return CATERING[stageId] ?? null
  if (String(stageId).startsWith('screen:')) return ['glance', 'about']
  return ENGINE[stageId] ?? null
}
