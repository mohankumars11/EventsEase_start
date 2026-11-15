/**
 * Experiences (migration 208): what a customer means by "Complete Story",
 * and whether one of a partner's real packages delivers it.
 *
 * The rule is the server's — sambramo_package_fit — and this mirrors it so
 * a card can say "matches Complete Story" before anything is sent. If the
 * two ever disagree, the server wins: api/_lib/anchorBook.js re-checks the
 * exact package it priced and refuses to book a package as an experience
 * it does not deliver.
 *
 * Judged on the package's real hours and inclusions, never its label:
 * every partner's tiers are relative to their own hours (src/lib/
 * tierPackages.js), so one photographer's "Signature" is 2 hours and
 * another's is 8. On 2026-11-03, 10 of 11 photographers could deliver
 * "Important Moments" (at least 2 h) only through a package NOT named
 * Essential — their Essential was 1 hour.
 */
import { experienceTiers } from './needs'

/**
 * Hours, from whatever a screen stored. Brief.jsx stores a number; the
 * photography sheet stored its chip label — "4 hours", "Full day" — and
 * Number("4 hours") is NaN, so until this existed a customer's chosen
 * coverage never reached the price while the partner's brief still read
 * "Coverage: 6 hours". "Full day" is 8, as quote.js already counts it.
 */
export function hoursOf(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v > 0 ? v : null
  const s = String(v).toLowerCase()
  if (/full\s*day/.test(s)) return 8
  if (/half\s*day/.test(s)) return 4
  const n = parseFloat(s)
  return n > 0 ? n : null
}

/** One trade's chosen experience, or null. `tier` is ESSENTIAL | SIGNATURE | VIP. */
export function experienceOf(tradeId, tier) {
  if (!tier) return null
  return experienceTiers(tradeId).find(t => t.tier === String(tier).toUpperCase()) ?? null
}

/**
 * Does a package offer (lib/market.js `offers`) deliver this experience for
 * these asked hours? { ok, gaps } — the same gaps the server returns.
 */
export function packageFits(offer, exp, askedHours = null) {
  if (!exp) return { ok: true, gaps: [] }
  if (exp.model !== 'PARTNER_PACKAGE') return { ok: false, gaps: [{ need: 'quote' }] }
  const gaps = []
  const want = Math.max(Number(exp.min_hours) || 0, Number(askedHours) || 0)
  const have = Number(offer.hours) || null
  if (!have || have < want) gaps.push({ need: 'hours', want, have })
  const inc = offer.inclusions ?? []
  for (const x of exp.required_inclusions ?? []) if (!inc.includes(x)) gaps.push({ need: 'inclusion', want: x })
  return { ok: gaps.length === 0, gaps }
}
