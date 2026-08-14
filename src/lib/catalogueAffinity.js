// Which services turn up in the same celebrations — read off the catalogue
// itself rather than written down again.
//
// ── Why this exists next to serviceRecommend.js ─────────────────────────
// That file ranks services inside the celebration builder, where the ranker
// knows the occasion, the guest count and the running quote. Its prior is
// hand-authored (OCCASION_ESSENTIALS, COMPLEMENTS) and covers the thirty ids
// in data/servicePricing.js, which is exactly the set the builder can add.
//
// The single-service door is a different question over a different set. A
// customer on /service/photography has told us one thing and nothing else: no
// occasion, no headcount, no quote. And the bookable set there is much wider —
// SERVICE_PACKS alone carries drone, livestream, nadaswaram, valet, washrooms,
// baraat and thirty more that the builder never offers. Extending the
// hand-written COMPLEMENTS map to sixty-odd ids would mean inventing several
// hundred pairwise opinions, and an invented 0.3 between two unrelated
// services is noise that outranks a real 0.25 somewhere else.
//
// ── The signal that was already sitting there ───────────────────────────
// EVENT_DATA lists, for every occasion, the services that occasion offers.
// Eighteen occasions × their service lists is an incidence matrix, and it
// encodes precisely the judgement we would otherwise be re-typing: a mandap
// and a nadaswaram both belong to weddings and to nothing else, so they belong
// beside each other. A photographer belongs to nearly everything, so his
// appearing next to anything means very little.
//
// That last sentence is the whole reason this measures lift and not raw
// co-occurrence. `venue` and `decor` are in almost every occasion, so they
// co-occur with everything and a count would make them the answer to every
// question — the catalogue equivalent of recommending the best-seller beside
// every product. Lift asks whether two services share occasions *more than
// their own breadth explains*, which is the question worth asking.
//
// ── What this is not ────────────────────────────────────────────────────
// It is not a measurement of customers. Nobody booked anything to produce these
// numbers; it is our own catalogue's structure, which makes it a prior in
// exactly the way the hand-written maps are — better grounded, because a human
// decided a nadaswaram belongs to a wedding when they built the occasion, but
// still an assumption about people rather than an observation of them. The
// copy it drives says "often arranged together", never "customers booked".
// The measured half stays get_service_cobooking_counts() (migration 043), and
// the same shrinkage hands over to it as enquiries arrive.

import { EVENT_DATA } from '../data/eventServicesData'
import { COMPLEMENTS } from './serviceRecommend'

/** The fewest occasions a pair must share before it is considered at all. */
const MIN_SHARED_OCCASIONS = 2

/**
 * The incidence matrix, built once at module load.
 *
 * Cheap — eighteen occasions of a few dozen services each — and done at load
 * rather than per render because every card on the page would otherwise
 * re-walk it.
 */
const OCCASION_SERVICES = Object.values(EVENT_DATA)
  .map(e => [...new Set((e.services ?? []).map(s => s.id).filter(Boolean))])
  .filter(list => list.length > 1)

const TOTAL_OCCASIONS = OCCASION_SERVICES.length

/** How many occasions each service appears in. The marginal. */
const SERVICE_OCCASIONS = (() => {
  const counts = new Map()
  for (const list of OCCASION_SERVICES) {
    for (const id of list) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
})()

/**
 * seed id → [{ id, shared, lift }], strongest first.
 *
 * Both directions are stored. Lift is symmetric here — sharing occasions is a
 * symmetric relation — but the lookup is directional and duplicating costs
 * nothing at this size.
 */
const RELATED = (() => {
  const pairShared = new Map()   // "a|b" → count
  for (const list of OCCASION_SERVICES) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [list[i], list[j]]
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        pairShared.set(key, (pairShared.get(key) ?? 0) + 1)
      }
    }
  }

  const out = new Map()
  const add = (a, b, shared, lift) => {
    if (!out.has(a)) out.set(a, [])
    out.get(a).push({ id: b, shared, lift })
  }

  for (const [key, shared] of pairShared) {
    if (shared < MIN_SHARED_OCCASIONS) continue
    const [a, b] = key.split('|')
    const na = SERVICE_OCCASIONS.get(a) ?? 0
    const nb = SERVICE_OCCASIONS.get(b) ?? 0
    if (!na || !nb || !TOTAL_OCCASIONS) continue

    // lift = P(b | a) / P(b). Above 1 means the two share occasions more than
    // b's own breadth accounts for. At or below 1 the pairing says nothing —
    // dropped rather than ranked low, so `venue` and `decor` stop being the
    // answer to every question.
    const lift = (shared / na) / (nb / TOTAL_OCCASIONS)
    if (lift <= 1) continue

    add(a, b, shared, lift)
    add(b, a, shared, lift)
  }

  for (const list of out.values()) list.sort((x, y) => y.lift - x.lift)
  return out
})()

/** How broadly wanted a service is, log-damped, in [0,1]. Breaks ties only. */
const MAX_OCCASIONS = Math.max(1, ...SERVICE_OCCASIONS.values())
export function serviceBreadth(id) {
  const n = SERVICE_OCCASIONS.get(id) ?? 0
  return n <= 0 ? 0 : Math.log1p(n) / Math.log1p(MAX_OCCASIONS)
}

/** How many of our occasions include this service. Used in the copy. */
export function occasionCount(id) {
  return SERVICE_OCCASIONS.get(id) ?? 0
}

/**
 * What is arranged alongside this service.
 *
 * @param seedId   the service being viewed
 * @param filter   predicate on a candidate id — the caller's job, because
 *                 what is *bookable* differs by surface. The single-service
 *                 page must pass `isBookable`, since a suggestion linking to a
 *                 page that says "nothing matches" is worse than no suggestion.
 * @param limit    how many to return
 *
 * Returns [{ id, shared, lift, score }]. The caller resolves ids to whatever
 * shape its own catalogue holds; this deliberately returns ids and evidence
 * rather than service objects, so it stays usable from the builder, the
 * occasion page and the single-service door without knowing what any of them
 * render.
 */
export function relatedServices(seedId, { filter = () => true, limit = 6 } = {}) {
  const ok = id => id !== seedId && filter(id)

  // ── Layer 1: lift over the occasion matrix, plus the authored opinion ──
  //
  // The two are summed rather than one falling back to the other, because they
  // fail in opposite places and the sum is strongest exactly where one of them
  // is silent. Lift is empty for a service in every occasion (it predicts
  // nothing, correctly) and empty for a service in one occasion (no pair
  // clears the floor); COMPLEMENTS has an opinion about most of the common
  // services and none about the long tail, which is where lift is sharpest.
  const authored = COMPLEMENTS[seedId] ?? {}
  const candidates = new Map()

  for (const r of RELATED.get(seedId) ?? []) {
    if (!ok(r.id)) continue
    candidates.set(r.id, { id: r.id, shared: r.shared, lift: r.lift, authoredWeight: 0 })
  }
  for (const [id, w] of Object.entries(authored)) {
    if (!ok(id)) continue
    const existing = candidates.get(id)
    if (existing) existing.authoredWeight = w
    else candidates.set(id, { id, shared: 0, lift: 0, authoredWeight: w })
  }

  const scored = [...candidates.values()].map(c => ({
    ...c,
    // Squashed so a freak pair on a thin catalogue cannot dominate, with a
    // small breadth term to break ties toward things more people want. The
    // breadth weight is deliberately tiny: large enough to order two equal
    // matches, far too small to lift a broad service over a genuine one.
    score: Math.tanh(c.lift / 3) + c.authoredWeight + 0.08 * serviceBreadth(c.id),
  }))

  if (scored.length) {
    return scored.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // ── Layer 2: the occasions this service does belong to ─────────────────
  //
  // Only reached by services too narrow for either layer above — a mandap
  // belongs to one occasion, so nothing it appears with can clear the shared
  // floor, and nobody wrote it a complement list. But "one occasion" is itself
  // the strongest possible statement about what a service is for: everything
  // else in that wedding is a better suggestion than anything outside it.
  //
  // Ranked by specificity rather than by breadth, which is the inverse of the
  // tiebreak above and deliberately so. Beside a mandap, a nadaswaram is a
  // better suggestion than a venue — the venue is in every occasion and tells
  // the customer nothing they had not already assumed.
  const peers = new Map()
  for (const list of OCCASION_SERVICES) {
    if (!list.includes(seedId)) continue
    for (const id of list) {
      if (!ok(id)) continue
      peers.set(id, (peers.get(id) ?? 0) + 1)
    }
  }

  return [...peers.entries()]
    .map(([id, shared]) => ({
      id,
      shared,
      lift: 0,
      authoredWeight: 0,
      // Specificity: 1 for a service unique to this occasion, falling as it
      // spreads across the catalogue.
      score: shared * (1 - serviceBreadth(id)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** True when the catalogue has any opinion about this service at all. */
export function hasRelated(seedId) {
  return (RELATED.get(seedId)?.length ?? 0) > 0
}
