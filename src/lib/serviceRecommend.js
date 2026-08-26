// What is missing from this celebration, and what goes with what is in it.
//
// The concierge-side twin of lib/recommend.js. That file ranks products beside
// products; this ranks services beside a half-built plan. The architecture is
// deliberately the same one and the long argument for it is not repeated here
// — read recommend.js for why a hybrid whose weights move with the evidence is
// the correct choice for a catalogue at day zero, why lift and not confidence,
// and why MMR. What follows is only what is *different* on this side, and the
// differences are real enough to be worth stating.
//
// ── A plan is not a basket ──────────────────────────────────────────────
// Three things break if you treat it like one.
//
// A basket is a set of independent decisions; a celebration is one decision
// expressed thirty ways. Nobody wants a photographer — they want their
// daughter's wedding to be photographed, and whether that includes a second
// shooter is a question about the wedding, not about photographers. So the
// primary signal here is not "what goes with what you picked" but "what does a
// celebration of THIS kind normally include", which is OCCASION_ESSENTIALS
// below. On the shop side, occasion is one term among several. Here it leads.
//
// A basket has no size; a celebration has a guest count, and the guest count
// makes some services not merely likely but operationally necessary. Four
// hundred people at a wedding need crowd management and parking help — that is
// not a preference to be inferred from co-occurrence, it is a fact about four
// hundred people. SCALE_TRIGGERS states those directly, and they are the one
// part of this file that is not a guess.
//
// A basket's items rarely exclude each other; a plan's routinely do. A live
// band and a DJ are the same slot in the evening, and suggesting the second to
// somebody who has booked the first is the single most obviously wrong thing
// this could do. SUBSTITUTES suppresses those outright rather than ranking
// them low — low is not enough, because a rail of six will eventually show it.
//
// ── The framing, which is a commercial decision as much as a design one ─
// Every suggestion here is phrased as a gap in the plan rather than as
// something more to buy, and that is not politeness. This business sells one
// coordinator handling a whole celebration; the customer's actual fear is
// having forgotten something they will only notice on the day. "Most weddings
// this size also book crowd management" is worth more to them than any
// discount, and it happens to raise the quote — those two facts pointing the
// same way is the reason this feature is worth building at all. Where they
// stop pointing the same way, the gap framing wins: nothing here suggests a
// ₹55,000 live band on a forty-guest naming ceremony, because BUDGET_FIT
// prices every candidate against the quote it would be joining.
//
// ── What the numbers below are, honestly ────────────────────────────────
// OCCASION_ESSENTIALS and COMPLEMENTS are considered estimates of Bengaluru
// and Mysore celebration practice, written by hand, pre-launch, with no
// booking data behind them — the same standing caveat as every rate in
// data/servicePricing.js. They are the prior, they are wrong in the specific
// way hand-authored priors are always wrong, and the entire point of the
// shrinkage in `cobookingScore` is that they stop mattering as
// get_service_cobooking_counts() (migration 043) fills in. They are here
// rather than inline so that when the data arrives to correct them, there is
// one place to correct.

import { ALL_SERVICES, serviceCost, groupForService } from '../data/servicePricing'

/**
 * How much co-booking evidence it takes before the measured signal is trusted
 * as much as the hand-authored prior. At n = K the two carry equal weight.
 *
 * Higher than the shop's K = 8, and the reason is the difference in what one
 * observation costs. A wrong product on a rail is a tile somebody scrolls
 * past. A wrong service in a celebration plan is a line on a quote for a
 * wedding, and a coordinator on the phone explaining why we suggested a
 * mehendi artist for a retirement party. Enquiries also arrive far more slowly
 * than orders, so a low K would let the first handful of plans — which will be
 * friends, family and tests — write the prior for everybody after them.
 */
const CF_PRIOR_STRENGTH = 14

/**
 * The fewest distinct enquiries a pair must appear in to be considered.
 *
 * Two, for the two reasons that agree: a pair seen once is indistinguishable
 * from coincidence, and a pair seen once is one identifiable family's plan.
 * The SQL side enforces the same floor — see migration 043.
 */
export const MIN_PAIR_SUPPORT = 2

/**
 * What a celebration of each kind normally includes.
 *
 * Read as: ESSENTIALS[occasion][serviceId] = "roughly what share of these
 * celebrations book this". A value near 1 means its absence from a plan is a
 * genuine omission worth naming; a value near 0.2 means it is a nice-to-have
 * that some people want.
 *
 * These are the sharpest opinions in the file and they are supposed to be.
 * A wedding without a priest is not a wedding, and a ranker that hedged that
 * to 0.5 to look modest would bury the one suggestion most worth making.
 *
 * Occasion ids match data/eventServicesData.js. An occasion missing from this
 * map falls through to OCCASION_BASELINE rather than scoring zero, so adding a
 * new occasion to the catalogue degrades the suggestions gracefully instead of
 * emptying them.
 */
const OCCASION_ESSENTIALS = {
  wedding: {
    priest: 0.95, photography: 0.92, videography: 0.80, makeup: 0.85,
    bridal_wear: 0.75, mehendi: 0.70, invitations: 0.80, return_gifts: 0.72,
    dj: 0.55, drum: 0.60, transport: 0.55, bouncers: 0.45, tent: 0.50,
    emcee: 0.40, live_music: 0.35, dining: 0.85, venue: 0.80, cleanup: 0.65,
    photobooth: 0.30, gifting: 0.35, ice_cream: 0.30, fireworks: 0.25,
  },
  engagement: {
    photography: 0.88, videography: 0.55, makeup: 0.72, invitations: 0.60,
    dj: 0.50, emcee: 0.35, return_gifts: 0.55, priest: 0.45, dining: 0.75,
    venue: 0.70, photobooth: 0.40, cake: 0.55, cleanup: 0.50,
  },
  sangeet: {
    dj: 0.90, choreography: 0.75, photography: 0.85, videography: 0.60,
    makeup: 0.70, emcee: 0.55, entertainment: 0.50, live_music: 0.40,
    photobooth: 0.45, dining: 0.70, venue: 0.65, cleanup: 0.50, drum: 0.45,
  },
  birthday: {
    cake: 0.95, photography: 0.55, return_gifts: 0.70, dj: 0.40,
    photobooth: 0.35, kids_play: 0.30, ice_cream: 0.40, invitations: 0.30,
    entertainment: 0.30, cleanup: 0.45, emcee: 0.20,
  },
  first_birthday: {
    cake: 0.95, photography: 0.85, videography: 0.50, return_gifts: 0.80,
    kids_play: 0.65, photobooth: 0.50, entertainment: 0.45, ice_cream: 0.50,
    invitations: 0.45, priest: 0.35, cleanup: 0.45,
  },
  naming_ceremony: {
    priest: 0.92, pooja: 0.85, photography: 0.70, return_gifts: 0.65,
    dining: 0.70, invitations: 0.40, drum: 0.35, cake: 0.30, cleanup: 0.45,
  },
  baby_shower: {
    photography: 0.72, makeup: 0.55, return_gifts: 0.60, cake: 0.55,
    photobooth: 0.45, pooja: 0.50, priest: 0.45, dining: 0.65,
    invitations: 0.40, entertainment: 0.25,
  },
  seemantham: {
    priest: 0.88, pooja: 0.82, photography: 0.65, return_gifts: 0.62,
    dining: 0.70, makeup: 0.50, invitations: 0.35, cleanup: 0.40,
  },
  thread_ceremony: {
    priest: 0.95, pooja: 0.90, photography: 0.72, return_gifts: 0.65,
    dining: 0.75, drum: 0.45, invitations: 0.45, tent: 0.40, cleanup: 0.45,
  },
  housewarming: {
    priest: 0.88, pooja: 0.85, photography: 0.45, return_gifts: 0.50,
    dining: 0.70, cleanup: 0.55, invitations: 0.30, drum: 0.30,
  },
  anniversary: {
    photography: 0.65, cake: 0.75, candle_setup: 0.55, dj: 0.35,
    makeup: 0.40, return_gifts: 0.40, live_music: 0.30, dining: 0.65,
    photobooth: 0.30, invitations: 0.25,
  },
  retirement: {
    photography: 0.70, memory_wall: 0.65, emcee: 0.55, cake: 0.60,
    return_gifts: 0.50, av_setup: 0.50, dining: 0.70, invitations: 0.35,
    live_music: 0.30, cleanup: 0.40,
  },
  graduation: {
    photography: 0.75, cake: 0.55, photobooth: 0.50, memory_wall: 0.45,
    dj: 0.40, return_gifts: 0.35, emcee: 0.30, dining: 0.60, av_setup: 0.35,
  },
  get_together: {
    dining: 0.75, photography: 0.40, dj: 0.35, cleanup: 0.50, cake: 0.35,
    photobooth: 0.30, ice_cream: 0.30, entertainment: 0.25,
  },
  corporate_event: {
    av_setup: 0.85, emcee: 0.75, photography: 0.70, videography: 0.55,
    dining: 0.80, invitations: 0.45, transport: 0.40, bouncers: 0.40,
    gifting: 0.50, live_music: 0.30, cleanup: 0.55, venue: 0.75,
  },

  /* ── The ten the life-cycle audit added ───────────────────────────────
     Weighted from what actually gets bought at each, not from what the
     catalogue would like to sell. Two of them break the usual shape and
     should: `vehicle_pooja` puts vehicle_decor above photography because the
     garland IS the occasion, and `shop_opening` puts sweets above catering
     because a launch feeds the street rather than a guest list. */
  vehicle_pooja: {
    vehicle_decor: 0.95, priest: 0.90, pooja: 0.82, photography: 0.70,
    sweets: 0.75, videography: 0.45, vehicle_care: 0.45, cake: 0.30,
    return_gifts: 0.28, drum: 0.25, nadaswaram: 0.25, cleanup: 0.22,
  },
  half_saree: {
    priest: 0.90, pooja: 0.85, photography: 0.88, videography: 0.62,
    makeup: 0.78, bridal_wear: 0.70, mehendi: 0.60, dining: 0.80,
    nadaswaram: 0.55, return_gifts: 0.70, invitations: 0.50,
    venue: 0.70, live_music: 0.35, photobooth: 0.35, cleanup: 0.50,
  },
  mundan: {
    priest: 0.92, pooja: 0.88, photography: 0.72, dining: 0.68,
    return_gifts: 0.55, sweets: 0.50, transport: 0.40, cake: 0.35,
    nadaswaram: 0.35, videography: 0.35, nanny: 0.30, cleanup: 0.40,
  },
  annaprashana: {
    priest: 0.92, pooja: 0.88, photography: 0.82, videography: 0.50,
    dining: 0.72, return_gifts: 0.65, cake: 0.45, sweets: 0.45,
    nadaswaram: 0.40, livestream: 0.35, invitations: 0.35, nanny: 0.30,
    photobooth: 0.30, cleanup: 0.42,
  },
  reception: {
    photography: 0.92, videography: 0.75, dining: 0.88, venue: 0.85,
    emcee: 0.70, dj: 0.65, makeup: 0.72, live_counters: 0.60,
    return_gifts: 0.68, invitations: 0.62, wedding_car: 0.50, bar: 0.45,
    photobooth: 0.45, hospitality: 0.45, valet: 0.45, cake: 0.55,
    live_music: 0.40, fireworks: 0.30, signage: 0.35, cleanup: 0.60,
  },
  shop_opening: {
    inauguration: 0.95, priest: 0.90, pooja: 0.82, sweets: 0.85,
    photography: 0.75, signage: 0.70, nadaswaram: 0.55, drum: 0.55,
    emcee: 0.55, videography: 0.50, gifting: 0.45, hospitality: 0.42,
    folk: 0.35, bouncers: 0.35, invitations: 0.35, cleanup: 0.45,
  },
  bhoomi_pooja: {
    priest: 0.94, pooja: 0.90, tent: 0.75, photography: 0.62,
    dining: 0.65, drone: 0.45, sweets: 0.45, washrooms: 0.42,
    power: 0.40, nadaswaram: 0.35, return_gifts: 0.35, transport: 0.35,
    videography: 0.30, cleanup: 0.45,
  },
  aksharabhyasa: {
    priest: 0.92, pooja: 0.88, photography: 0.68, sweets: 0.45,
    return_gifts: 0.40, dining: 0.40, videography: 0.28, bhajan: 0.25,
    cleanup: 0.20,
  },
  haldi: {
    mehendi: 0.85, photography: 0.88, decor: 0.80, drum: 0.70,
    videography: 0.62, makeup: 0.65, dining: 0.65, live_counters: 0.55,
    cleanup: 0.70, ice_cream: 0.42, dj: 0.45, photobooth: 0.40,
    return_gifts: 0.45, cooling: 0.40, drone: 0.30, venue: 0.60,
  },
  farewell: {
    memory_wall: 0.80, photography: 0.72, dining: 0.75, av_setup: 0.62,
    emcee: 0.50, cake: 0.55, gifting: 0.60, videography: 0.48,
    livestream: 0.42, photobooth: 0.40, live_music: 0.35, dj: 0.30,
    venue: 0.60, invitations: 0.28, cleanup: 0.45,
  },
}

/**
 * What an unmapped occasion assumes.
 *
 * Not zero and not uniform. These are the services that turn up in almost any
 * gathering regardless of what it is for, so a brand-new occasion id — or the
 * `custom` one the wizard uses for "something else" — still produces sensible
 * suggestions on its first day in the catalogue.
 */
const OCCASION_BASELINE = {
  photography: 0.60, dining: 0.55, cake: 0.45, cleanup: 0.40,
  return_gifts: 0.35, dj: 0.30, invitations: 0.25,
}

/** Everything unmentioned is mildly plausible rather than disqualified. */
const UNLISTED_ESSENTIAL = 0.18

/**
 * Services that compete for the same slot, so choosing one should suppress
 * the other rather than merely rank it lower.
 *
 * Symmetric, and each group is one job at the celebration:
 *
 *   The evening's sound. A DJ, a live band and a classical ensemble are three
 *   answers to the same question, and the customer has already answered it.
 *
 *   The takeaway. Return gifts and premium hampers differ in budget, not in
 *   purpose; showing both reads as an upsell, which is exactly the reading
 *   this feature cannot afford.
 *
 *   The roof. A venue booking normally includes the covered space that a
 *   tent or pandal is hired to provide when it does not.
 *
 * Note that photography and videography are deliberately NOT here. They look
 * like a pair to anybody who has not planned an Indian wedding; they are two
 * different crews delivering two different things, and most weddings book
 * both.
 */
const SUBSTITUTES = [
  ['dj', 'live_music'],
  ['return_gifts', 'gifting'],
  ['venue', 'tent'],
]

const SUBSTITUTE_OF = (() => {
  const map = new Map()
  SUBSTITUTES.forEach(group => {
    group.forEach(id => {
      const others = group.filter(x => x !== id)
      map.set(id, new Set([...(map.get(id) ?? []), ...others]))
    })
  })
  return map
})()

/**
 * Services that pull other services in, beyond what the occasion already says.
 *
 * Directional, because "goes with" is not symmetric. Booking a DJ makes an
 * emcee likely — somebody has to hold the microphone between sets. Booking an
 * emcee says much less about whether there is a DJ; a corporate awards night
 * has an anchor and no dance floor.
 *
 * Only the pairs where the connection is a real operational fact are listed.
 * A thin, defensible map beats a dense speculative one: every entry here is a
 * claim the ranker will act on, and an invented 0.3 between two unrelated
 * services is noise that outranks a genuine 0.25 somewhere else.
 */
export const COMPLEMENTS = {
  dj:           { emcee: 0.55, av_setup: 0.40, photobooth: 0.25 },
  live_music:   { av_setup: 0.50, emcee: 0.35 },
  photography:  { videography: 0.60, photobooth: 0.30, makeup: 0.35 },
  videography:  { photography: 0.65, av_setup: 0.30 },
  priest:       { pooja: 0.85, drum: 0.30 },
  pooja:        { priest: 0.80 },
  mehendi:      { makeup: 0.45, photography: 0.35 },
  makeup:       { bridal_wear: 0.50, photography: 0.40 },
  bridal_wear:  { makeup: 0.60 },
  venue:        { dining: 0.65, cleanup: 0.55, transport: 0.35 },
  tent:         { dining: 0.55, cleanup: 0.50 },
  dining:       { cleanup: 0.45 },
  kids_play:    { ice_cream: 0.35, entertainment: 0.30 },
  choreography: { dj: 0.60, emcee: 0.30 },
  emcee:        { av_setup: 0.45 },
  av_setup:     { emcee: 0.30 },
  transport:    { bouncers: 0.30 },
  bouncers:     { transport: 0.35 },
  cake:         { photography: 0.30, ice_cream: 0.25 },
  memory_wall:  { av_setup: 0.40, photography: 0.30 },
  invitations:  { return_gifts: 0.25 },
  fireworks:    { photography: 0.35, videography: 0.30 },
}

/**
 * Guest counts at which a service stops being optional.
 *
 * The only numbers in this file that are not estimates of taste. Six hundred
 * people arriving at one gate need somebody managing the gate; three hundred
 * people eating need more than a domestic bin bag afterwards. Stated as the
 * headcount at which the need becomes real, with the reason carried alongside
 * because the reason is the entire persuasive content of the suggestion —
 * "400 guests" is why, and a card that says it will be believed.
 */
const SCALE_TRIGGERS = [
  { id: 'bouncers',  from: 250, why: 'a crowd this size needs someone on the gate' },
  { id: 'transport', from: 200, why: 'guests arriving from out of town' },
  { id: 'cleanup',   from: 150, why: 'a hall this full is a real clear-up' },
  { id: 'tent',      from: 300, why: 'covered seating for everyone' },
  { id: 'av_setup',  from: 250, why: 'the back rows need to hear the speeches' },
  { id: 'emcee',     from: 200, why: 'somebody has to run the room' },
  { id: 'dining',    from: 100, why: 'seating and service at this headcount' },
]

const SCALE_BY_ID = new Map(SCALE_TRIGGERS.map(t => [t.id, t]))

/** Services whose own step owns them — never suggested from here. */
const OWNED_ELSEWHERE = new Set([
  'catering', 'cooks', 'menu', 'welcome_drinks',
  'decor', 'stage', 'floral', 'balloon_arch', 'mandap', 'lighting',
])

/**
 * Build a suggester over the service catalogue.
 *
 * `cobooking` is what get_service_cobooking_counts() returns (migration 043)
 * and is allowed to be empty — that is the pre-launch state, and everything
 * below is written to work without it.
 */
export function buildServiceSuggester({ cobooking = [] } = {}) {
  // Adjacency: seed id → [{ id, pairEnquiries, lift }]. Built once.
  const pairs = new Map()
  // How many plans contain each service at all — the n in the shrinkage.
  const seedPlans = new Map()

  for (const row of cobooking) {
    const a = row.service_a
    const b = row.service_b
    const pairEnquiries = Number(row.pair_enquiries ?? 0)
    if (!a || !b || pairEnquiries < MIN_PAIR_SUPPORT) continue

    const aPlans = Number(row.a_enquiries ?? 0)
    const bPlans = Number(row.b_enquiries ?? 0)
    const total  = Number(row.total_enquiries ?? 0)
    if (!aPlans || !bPlans || !total) continue

    // lift = P(b|a) / P(b). At or below 1 the pairing is no better than b's
    // own popularity and is not worth a slot, so it is dropped rather than
    // ranked low. Without this, the priest — who is in most plans — would be
    // "co-booked" with everything.
    const lift = (pairEnquiries / aPlans) / (bPlans / total)
    if (lift <= 1) continue

    if (!pairs.has(a)) pairs.set(a, [])
    pairs.get(a).push({ id: b, pairEnquiries, lift })
    seedPlans.set(a, aPlans)
  }

  /**
   * The measured half, already shrunk toward zero by how much evidence stands
   * behind it. Returns the counts too, because the card may only say "also
   * booked" when there are real plans to point at.
   */
  function cobookingScore(seedId, candidateId) {
    const list = pairs.get(seedId)
    const n = seedPlans.get(seedId) ?? 0
    const weight = n / (n + CF_PRIOR_STRENGTH)
    if (!list) return { score: 0, pairEnquiries: 0, lift: 0, weight: 0 }

    const hit = list.find(x => x.id === candidateId)
    if (!hit) return { score: 0, pairEnquiries: 0, lift: 0, weight }

    // Squashed so a freak pairing cannot dominate. Same curve as the shop's.
    return {
      score: Math.tanh(hit.lift / 4) * weight,
      pairEnquiries: hit.pairEnquiries,
      lift: hit.lift,
      weight,
    }
  }

  /** How normal this service is for this kind of celebration. */
  function essentialScore(occasion, serviceId) {
    const map = OCCASION_ESSENTIALS[occasion] ?? OCCASION_BASELINE
    return map[serviceId] ?? UNLISTED_ESSENTIAL
  }

  /** The strongest pull any already-chosen service exerts on this one. */
  function complementScore(chosenIds, serviceId) {
    let best = 0
    for (const chosen of chosenIds) {
      const w = COMPLEMENTS[chosen]?.[serviceId] ?? 0
      if (w > best) best = w
    }
    return best
  }

  /**
   * Whether the headcount asks for this.
   *
   * Three states rather than two. A triggered service scores 1 and carries its
   * reason; an untriggered but scale-sensitive service scores 0 — suggesting
   * crowd management for thirty guests is how a customer decides the whole
   * feature is trying to sell them things. Everything with no scale opinion
   * sits at a neutral 0.5 so this term neither helps nor hurts it.
   */
  function scaleFit(serviceId, guestCount) {
    const trigger = SCALE_BY_ID.get(serviceId)
    if (!trigger) return { score: 0.5, triggered: false, why: null }
    if ((guestCount || 0) >= trigger.from) {
      return { score: 1, triggered: true, why: trigger.why }
    }
    return { score: 0, triggered: false, why: null }
  }

  /**
   * Whether this belongs on a quote of this size.
   *
   * The guard against the one failure that would discredit the whole panel:
   * a ₹55,000 live band suggested on a ₹40,000 naming ceremony. Scored on the
   * candidate's cost as a share of the quote it would be joining, so it
   * behaves the same on a close-circle lunch and a Mysuru wedding.
   *
   * Full marks up to a tenth of the current quote, tapering to nothing at
   * two-fifths. Deliberately not a hard cut: somebody on a ₹2,00,000 plan who
   * has not booked photography should absolutely be told, and photography at
   * ₹35,000 is 17% of their quote.
   */
  function budgetFit(service, guestCount, quoteTotal) {
    if (!quoteTotal || quoteTotal <= 0) return 0.5
    const cost = serviceCost(service, guestCount, undefined)
    if (!cost) return 0.5
    const share = cost / quoteTotal
    if (share <= 0.10) return 1
    if (share >= 0.40) return 0
    return 1 - (share - 0.10) / 0.30
  }

  /** Crude, and only for the diversity pass: same group reads as same tile. */
  function similarity(a, b) {
    if (a.id === b.id) return 1
    return a.group === b.group ? 0.7 : 0
  }

  /**
   * The ranking.
   *
   * @param occasion    event id from eventServicesData, or 'custom'
   * @param chosenIds   service ids already in the plan
   * @param guestCount  headcount, which is an input and not a filter
   * @param quoteTotal  the live quote, for budget fit
   * @param limit       how many to return
   */
  function suggest({
    occasion = null,
    chosenIds = [],
    guestCount = 0,
    quoteTotal = 0,
    limit = 4,
  } = {}) {
    const chosen = new Set(chosenIds)

    // Everything the plan already implies it does not want.
    const suppressed = new Set()
    for (const id of chosen) {
      const subs = SUBSTITUTE_OF.get(id)
      if (subs) subs.forEach(s => suppressed.add(s))
    }

    const scored = []
    for (const service of ALL_SERVICES) {
      const id = service.id
      if (chosen.has(id) || suppressed.has(id) || OWNED_ELSEWHERE.has(id)) continue

      const essential  = essentialScore(occasion, id)
      const complement = complementScore(chosen, id)
      const scale      = scaleFit(id, guestCount)
      const budget     = budgetFit(service, guestCount, quoteTotal)

      const prior =
        0.42 * essential +
        0.26 * complement +
        0.16 * scale.score +
        0.16 * budget

      // The measured half is asked of every chosen service, and the best case
      // wins: "co-booked with something in your plan" is the useful question,
      // not "co-booked with the average of your plan", which describes nothing.
      let cf = { score: 0, pairEnquiries: 0, lift: 0, weight: 0 }
      for (const seedId of chosen) {
        const s = cobookingScore(seedId, id)
        if (s.score > cf.score) cf = s
      }

      // The blend. At zero data the weight is zero and this is exactly the
      // prior, which is the pre-launch behaviour by construction.
      const score = cf.score + (1 - cf.weight) * prior
      if (score <= 0) continue

      scored.push({
        service,
        // The group is what the diversity pass reads, and it lives on the
        // catalogue rather than on the service row — see GROUP_BY_SERVICE_ID.
        group: groupForService(id).id,
        score,
        // Evidence, carried through so a card can only claim what is true.
        alsoBooked: cf.pairEnquiries >= MIN_PAIR_SUPPORT,
        pairEnquiries: cf.pairEnquiries,
        essential,
        complement,
        scaleTriggered: scale.triggered,
        scaleWhy: scale.why,
        cost: serviceCost(service, guestCount, undefined),
      })
    }

    scored.sort((a, b) => b.score - a.score)
    return diversify(scored, limit)
  }

  /**
   * MMR, λ = 0.5 — a shade more assertive than the shop's.
   *
   * A panel of four is shorter than a rail of eight, so a duplicated group
   * costs a quarter of the advice rather than an eighth. Three photography
   * suggestions in a four-slot panel is a plan that looks over-photographed
   * and under-planned.
   */
  function diversify(scored, limit, lambda = 0.5) {
    const picked = []
    const pool = [...scored]

    while (picked.length < limit && pool.length) {
      let bestIdx = 0
      let bestVal = -Infinity
      for (let i = 0; i < pool.length; i++) {
        const penalty = picked.length
          ? Math.max(...picked.map(p => similarity(p, pool[i])))
          : 0
        const val = pool[i].score - lambda * penalty
        if (val > bestVal) { bestVal = val; bestIdx = i }
      }
      picked.push(pool.splice(bestIdx, 1)[0])
    }
    return picked
  }

  return { suggest, cobookingScore, hasData: pairs.size > 0 }
}

/**
 * The one line a suggestion is allowed to print about why it is there.
 *
 * Ordered strongest evidence first, and it is the ranking result — not the
 * component — that decides. "Also booked with" appears only when
 * `alsoBooked` is true, which requires real enquiries past MIN_PAIR_SUPPORT;
 * there is no code path that prints it on an empty database.
 *
 * `occasionName` is passed in rather than looked up so this stays a pure
 * function of the result, and so the copy reads in the customer's own words —
 * "most weddings", not "most wedding".
 */
export function reasonForService(rec, { occasionName = null, guestCount = 0 } = {}) {
  if (!rec) return null

  if (rec.alsoBooked) {
    return {
      kind: 'cobooked',
      text: `Booked alongside yours in ${rec.pairEnquiries} plan${rec.pairEnquiries === 1 ? '' : 's'}`,
      strong: true,
    }
  }
  if (rec.scaleTriggered) {
    return {
      kind: 'scale',
      text: `${guestCount} guests — ${rec.scaleWhy}`,
      strong: true,
    }
  }
  // 0.6 is the line between "most of them" and "some of them", and the copy
  // must not cross it: claiming "most weddings book a photo booth" at 0.30
  // would be inventing a statistic about customers we do not have.
  if (rec.essential >= 0.6 && occasionName) {
    return {
      kind: 'typical',
      text: `Most ${occasionName.toLowerCase()} plans include this`,
      strong: false,
    }
  }
  if (rec.complement >= 0.4) {
    return { kind: 'goes_with', text: 'Goes with what you have picked', strong: false }
  }
  return { kind: 'worth', text: 'Worth considering', strong: false }
}
