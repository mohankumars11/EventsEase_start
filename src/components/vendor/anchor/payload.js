/**
 * The partner's answers → the payload submit_anchor_listing_version reads.
 *
 * One function for both the onboarding submit and a seasonal price update,
 * so the two can never describe the same listing differently. Amounts go
 * out as take-home paise; the server computes every customer price.
 */
import { ADDONS_V3 } from './options'
import { finalPackages } from './StepsCommercial'
import { tiersFromModels, DEFAULT_CONFIG } from '../../../lib/tierPackages'

export const paise = rupees => Math.round((Number(rupees) || 0) * 100)

export function buildListingPayload(a, cfg = DEFAULT_CONFIG) {
  const p = a.pricing ?? {}, ex = a.extras ?? {}, av = a.availability ?? {}, r = a.rules ?? {}, loc = a.location ?? {}
  const generated = tiersFromModels(p, cfg)
  const offered = ex.on ?? {}
  const overtime = p.hour?.overtime ? paise(p.hour.overtime) : (ex.overtime ? paise(ex.overtime) : null)

  const models = {}
  for (const id of p.models ?? []) {
    const m = p[id] ?? {}
    const base = { take_home_paise: paise(m.rate), extra_hour_take_home_paise: overtime }
    if (id === 'hour') Object.assign(base, { min_hours: m.min_hours, max_hours: m.max_hours, hours: m.min_hours,
      overtime_step_minutes: m.ot_step ?? 60, overtime_grace_minutes: m.grace ?? 0 })
    if (id === 'session') Object.assign(base, { hours: m.hours, sessions: 1, extra_session_take_home_paise: paise(m.extra) || null })
    if (id === 'event') Object.assign(base, { hours: m.hours, sessions: m.functions, extra_session_take_home_paise: paise(m.extra) || null, meta: { rehearsal_included: !!m.rehearsal } })
    if (id === 'half_day') Object.assign(base, { hours: m.hours ?? 4, sessions: m.functions ?? null })
    if (id === 'full_day') Object.assign(base, { hours: m.hours ?? 8, meta: { breaks_included: m.breaks !== false } })
    if (id === 'multi_day') Object.assign(base, { hours: m.hours, multi_day: { max_days: m.max_days, consecutive_discount_pct: m.discount ?? 0, overnight: !!m.overnight } })
    models[id] = base
  }

  const pkgs = finalPackages(generated, a.overrides ?? {}, offered)
  const addons = Object.entries(offered).map(([id, x]) => ({
    addon_id: id, label: ADDONS_V3.find(d => d.id === id)?.label ?? id, unit: x.unit ?? 'per_event',
    take_home_paise: paise(x.fee), notice_days: x.notice ?? 0,
    included_in: pkgs.filter(k => k.inclusions.includes(id)).map(k => k.tier),
  }))
  const overrides = Object.fromEntries(pkgs.map(k => [k.tier, {
    ...(k.edited ? { take_home_paise: Math.round(k.price_paise * (1 - cfg.platform_fee_rate)), hours: k.duration_hours } : {}),
    inclusions: k.inclusions,
  }]))

  const { work, legal_name, ...about } = a.about ?? {} // eslint-disable-line no-unused-vars
  return {
    legal_name,
    profile: { ...about, ...(a.events ?? {}), audience_band: a.events?.audience, ...(a.languages ?? {}) },
    models, addons, overrides,
    booking_rules: {
      instant: r.instant !== false, advance_pct: r.advance_pct, cancellation: r.cancellation,
      custom_quotes: r.custom_quotes !== false, quote_hours: r.quote_hours, min_budget_paise: paise(r.min_budget) || null,
      rider: r.rider, min_notice_days: av.min_notice_days, horizon_months: av.horizon_months,
      max_consecutive_hours: av.max_consecutive_hours, rest_hours: av.rest_hours, multiple_per_day: !!av.multiple_per_day,
      waiting: ex.waiting ? { free_minutes: ex.waiting.free_minutes, fee_take_home_paise: paise(ex.waiting.fee) } : null,
      surcharge: ex.surcharge ?? null,
    },
    travel_rules: {
      scope: loc.travel_scope, model: av.travel_model, flat_take_home_paise: paise(av.travel_fee) || null,
      per_km_take_home_paise: paise(av.travel_per_km) || null, hotel_required: !!av.hotel_required,
    },
    location: {
      lat: loc.lat, lng: loc.lng, formatted_address: loc.formatted_address, state: loc.state, city: loc.city,
      locality: loc.locality, postal_code: loc.postal_code, source: loc.source, confirmed: !!loc.confirmed, travel_scope: loc.travel_scope,
    },
  }
}
