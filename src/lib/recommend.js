// What to show next to this, and why.
//
// ── Choosing the algorithm honestly ─────────────────────────────────────
// The brief was "the best futuristic algorithm available". The best algorithm
// for a recommender is decided by the data you have, and the honest reading of
// ours is this: Sambramo is pre-launch. `order_items` is close to empty. Every
// state-of-the-art recommender — item-item collaborative filtering, matrix
// factorisation, ALS, a two-tower neural retriever, a sequence transformer —
// learns item relationships *from co-occurrence in purchase history*, and with
// no history they all return the same thing, which is nothing. A transformer
// over a 100-product catalogue with 40 orders would not be sophisticated; it
// would memorise noise and present it with confidence.
//
// So the architecture here is the one that is actually correct for a catalogue
// at day zero that intends to have a year of data later: a **hybrid ranker
// whose weights move with the evidence**.
//
//   score = w_cf·copurchase + w_content·affinity + w_context·context
//
// with the crucial part being that `w_cf` is not a constant. It is
//
//   w_cf = n / (n + K)
//
// where n is how many orders actually contain the seed product. At n = 0 the
// learned term contributes literally nothing and the content prior carries the
// whole rail; at n = 50 with K = 8 the learned signal carries 86% of it. The
// system therefore starts as a curated complement graph on launch day and
// becomes a genuine market-basket recommender as orders accumulate, with no
// migration, no retraining job and no flag to flip. That transition is the
// design, not a fallback.
//
// This shrinkage is standard practice (it is the same empirical-Bayes idea
// behind shrunk means everywhere in statistics), and it is the specific thing
// that makes "customers who bought this also bought" safe to ship before there
// are customers: the sentence is only ever rendered when real orders back it,
// because at low n the co-purchase term cannot reach the top of the ranking on
// its own.
//
// ── Why lift, and why lift alone is a trap ──────────────────────────────
// The measure of association used here is lift:
//
//   lift(a→b) = P(b | a) / P(b)
//
// which asks whether buying A makes B *more likely than usual*, rather than
// whether B is merely popular. Raw confidence P(b|a) is the classic mistake:
// the greeting card is in a third of all baskets, so it has high confidence
// after every product and would be recommended beside everything, which is the
// same as recommending nothing.
//
// But lift on thin data is unstable in the opposite direction — two obscure
// products bought together once have enormous lift and mean nothing. The
// shrinkage above handles that, and `MIN_PAIR_SUPPORT` refuses to look at a
// pair seen fewer than twice at all. That floor is also what makes the
// aggregate safe to expose: a pair from a single order is one identifiable
// person's basket.
//
// ── Substitutes and complements are different questions ─────────────────
// The single most common recommender bug in Indian e-commerce is showing four
// more cakes under a cake somebody has just put in their cart. Before the add,
// the customer is choosing and wants alternatives; after it, they are done
// choosing and want the candles. Same product, opposite answers — so intent is
// a parameter here, not a heuristic:
//
//   intent: 'similar'  → substitutes. Same category, comparable price.
//   intent: 'complete' → complements. Different category, goes on the table.
//
// ── The three things this ranks for ─────────────────────────────────────
// Relevance is necessary and not sufficient. The ranker also carries:
//
//   Diversity, via MMR (maximal marginal relevance). Left alone, a relevance
//   ranking returns five near-identical items, because whatever made the first
//   one score well makes its neighbours score well too. MMR penalises each
//   candidate by its similarity to what has already been picked, which is what
//   turns a list into a rail worth swiping.
//
//   Basket completion against a real threshold. When a customer is ₹212 from
//   free delivery, an item priced ₹212–₹340 is worth more to them *and* to us
//   than a better-matched item at ₹90 or ₹900. This is the one place where a
//   commercial objective enters the ranking, and it is the honest kind: the
//   customer genuinely comes out ahead by taking it.
//
//   Occasion. The whole catalogue is tagged by occasion and the cart knows the
//   delivery date. A Diwali hamper beside a Diwali diya set is not clever, and
//   it is worth more than anything clever.
//
// Nothing here fabricates social proof. `alsoBought` is true only when real
// paid orders contain both items; every other suggestion is labelled for what
// it is — goes together, same occasion, popular — and `reasonFor` returns the
// evidence so a card cannot claim more than the data supports.

import { SHOP_CATEGORIES } from '../config/shop'

/**
 * How much co-purchase evidence it takes before the learned signal is trusted
 * as much as the hand-authored prior.
 *
 * At n = K the two carry equal weight. K = 8 means roughly eight orders
 * containing a product before its measured neighbours outweigh its assumed
 * ones — early enough that the shop starts learning within its first weeks,
 * late enough that one unusual Tuesday cannot rewrite a shelf.
 */
const CF_PRIOR_STRENGTH = 8

/**
 * The fewest distinct orders a pair must appear in to be considered at all.
 *
 * Two, for two independent reasons that happen to agree. Statistically, a pair
 * seen once is indistinguishable from coincidence. And a pair seen once is one
 * real person's basket — exposing it through an aggregate function would leak
 * an individual's purchase through a query anyone can run. The SQL side
 * enforces the same floor; this is the client-side half of the same rule.
 */
export const MIN_PAIR_SUPPORT = 2

/**
 * How categories go together, as the shop actually gets shopped.
 *
 * This is the prior the whole system runs on before it has any data, so it is
 * worth being explicit about what it encodes and what it does not.
 *
 * Directional, because complementarity is not symmetric. Somebody buying a
 * cake very often wants candles and balloons — that is a birthday taking
 * shape. Somebody buying balloons is usually decorating and already has the
 * cake sorted, so the reverse arrow is weaker. A symmetric matrix would have
 * to average the two and would be wrong in both directions.
 *
 * The weights are a considered guess at Bengaluru celebration shopping, not a
 * measurement, and they are here rather than inline precisely so that they can
 * be corrected when the co-purchase data arrives to correct them. They stop
 * mattering as the data thickens, which is the point of the design.
 *
 * Read as: FROM[a][b] = "a customer buying a wants b this much".
 */
const COMPLEMENT = {
  'Cakes': {
    'Party Essentials': 0.95,   // candles, balloons, the banner — the same party
    'Flowers':          0.55,
    'Gifts':            0.60,
    'Pooja & Essentials': 0.15,
  },
  'Party Essentials': {
    'Cakes':            0.70,   // weaker than the reverse: decor is usually second
    'Gifts':            0.45,
    'Flowers':          0.40,
    'Pooja & Essentials': 0.15,
  },
  'Flowers': {
    'Cakes':            0.60,
    'Gifts':            0.75,   // flowers and a gift are one gesture
    'Pooja & Essentials': 0.55, // the garland and the lamp
    'Party Essentials': 0.30,
  },
  'Gifts': {
    'Flowers':          0.80,   // the classic pairing, and the highest arrow here
    'Cakes':            0.55,
    'Party Essentials': 0.35,
    'Pooja & Essentials': 0.20,
  },
  'Pooja & Essentials': {
    'Flowers':          0.85,   // no pooja happens without them
    'Gifts':            0.30,
    'Cakes':            0.25,   // griha pravesh, satyanarayan — a sweet after
    'Party Essentials': 0.20,
  },
}

/** Category ids that exist, so an unknown tag cannot silently score 0. */
const KNOWN_CATEGORIES = new Set(SHOP_CATEGORIES.map(c => c.id))

/**
 * Occasions that mean the same event under different tags.
 *
 * `products.occasion` is free text and the taxonomies in shopOccasions.js
 * disagree across categories by design — Party Essentials tags "Wedding &
 * Engagement" where Flowers tags "Wedding". Without this, a wedding backdrop
 * and a wedding bouquet look like unrelated occasions to the ranker.
 */
const OCCASION_ALIASES = [
  ['Wedding', 'Wedding & Engagement', 'Wedding Pooja', 'Sangeet'],
  ['Housewarming', 'Griha Pravesh'],
  ['Daily Pooja', 'Daily & Pooja', 'Festive'],
  ['Congratulations', 'Farewell'],
]

const OCCASION_GROUP = (() => {
  const map = new Map()
  OCCASION_ALIASES.forEach((group, i) => group.forEach(o => map.set(o, i)))
  return map
})()

function sameOccasion(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const ga = OCCASION_GROUP.get(a)
  return ga != null && ga === OCCASION_GROUP.get(b)
}

/**
 * Build a recommender over the catalogue.
 *
 * Constructed once per page and reused, because the co-purchase index is an
 * O(pairs) walk and re-deriving it inside a render is how a rail becomes a
 * frame drop on a mid-range Android.
 *
 * `copurchase` is what get_copurchase_counts() returns (migration 042) and is
 * allowed to be empty — that is the launch-day state and everything below is
 * written to work without it.
 */
export function buildRecommender({ products = [], copurchase = [], orderCounts = {} } = {}) {
  const byId = new Map(products.map(p => [p.id, p]))

  // Adjacency: seed id → [{ id, pairOrders, lift }]. Built once.
  const pairs = new Map()
  // How many orders contain each product at all — the n in the shrinkage.
  const seedOrders = new Map()

  for (const row of copurchase) {
    const a = row.product_a ?? row.a_id
    const b = row.product_b ?? row.b_id
    const pairOrders = Number(row.pair_orders ?? 0)
    if (!a || !b || pairOrders < MIN_PAIR_SUPPORT) continue

    const aOrders = Number(row.a_orders ?? 0)
    const bOrders = Number(row.b_orders ?? 0)
    const totalOrders = Number(row.total_orders ?? 0)
    if (!aOrders || !bOrders || !totalOrders) continue

    // lift = P(b|a) / P(b). Above 1 means A genuinely predicts B; at or below
    // 1 the pairing is no better than B's own popularity and is not worth a
    // slot, so it is dropped rather than ranked low.
    const confidence = pairOrders / aOrders
    const support    = bOrders / totalOrders
    const lift       = support > 0 ? confidence / support : 0
    if (lift <= 1) continue

    if (!pairs.has(a)) pairs.set(a, [])
    pairs.get(a).push({ id: b, pairOrders, lift, confidence })
    seedOrders.set(a, aOrders)
  }

  // Popularity, log-damped. A product ordered 400 times is not 40× the signal
  // of one ordered 10 times, and a linear prior would let one best-seller win
  // every slot on every rail in the shop.
  const maxOrders = Math.max(1, ...Object.values(orderCounts).map(Number))
  const popularity = id => {
    const n = Number(orderCounts[id] ?? 0)
    return n <= 0 ? 0 : Math.log1p(n) / Math.log1p(maxOrders)
  }

  /**
   * The measured half of the score, already shrunk toward zero by how much
   * evidence stands behind it.
   *
   * Returns both the score and the raw counts, because the card is only
   * allowed to say "customers also bought" when there are real orders to
   * point at — and that decision belongs to the data, not to the copy.
   */
  function copurchaseScore(seedId, candidateId) {
    const list = pairs.get(seedId)
    if (!list) return { score: 0, pairOrders: 0, lift: 0, weight: 0 }

    const hit = list.find(x => x.id === candidateId)
    const n = seedOrders.get(seedId) ?? 0
    const weight = n / (n + CF_PRIOR_STRENGTH)
    if (!hit) return { score: 0, pairOrders: 0, lift: 0, weight }

    // Lift is unbounded above; squash it so a freak 40× pair cannot dominate
    // a rail. tanh(lift/4) puts a lift of 2 at ~0.46, 4 at ~0.76, 10 at ~0.99.
    const squashed = Math.tanh(hit.lift / 4)
    return { score: squashed * weight, pairOrders: hit.pairOrders, lift: hit.lift, weight }
  }

  /**
   * The assumed half: does this go with that, judged on what we know about the
   * two products rather than on who bought them.
   *
   * Every term is in [0,1] and the weights sum to 1, so `affinity` is directly
   * comparable with `copurchaseScore` above. That comparability is the whole
   * reason the blend works.
   */
  function affinity(seed, candidate, { intent }) {
    if (!seed || !candidate || seed.id === candidate.id) return 0

    const sameCat = seed.category === candidate.category

    // ── Category term ──
    let category
    if (intent === 'similar') {
      // Substitutes: the same shelf is the point. A different shelf is not a
      // worse alternative, it is not an alternative.
      category = sameCat ? 1 : 0.05
    } else {
      // Complements: a second cake is not what somebody with a cake needs.
      // Not zeroed — two hampers for two families is a real basket — just
      // ranked far below anything that completes the table.
      if (sameCat) category = 0.12
      else if (!KNOWN_CATEGORIES.has(candidate.category)) category = 0.2
      else category = COMPLEMENT[seed.category]?.[candidate.category] ?? 0.25
    }

    // ── Occasion term ──
    // The strongest content signal in this catalogue by a distance. Two items
    // tagged Diwali belong beside each other whatever their categories say.
    const occasion = sameOccasion(seed.occasion, candidate.occasion) ? 1
      : (!seed.occasion || !candidate.occasion) ? 0.35   // untagged: no evidence either way
      : 0

    // ── Price term ──
    // An accessory should not cost more than the thing it accessorises. Scored
    // on the ratio rather than the difference so it behaves the same on a ₹149
    // card and a ₹2,199 hamper.
    const sp = Number(seed.price) || 0
    const cp = Number(candidate.price) || 0
    let price = 0.5
    if (sp > 0 && cp > 0) {
      const ratio = cp / sp
      if (intent === 'similar') {
        // Substitutes: near the same price is the same decision. Beyond ±60%
        // it is a different budget and a different customer.
        price = Math.max(0, 1 - Math.abs(Math.log(ratio)) / Math.log(2.5))
      } else {
        // Complements: cheaper is natural, dearer is suspicious. Full marks up
        // to about 70% of the seed, tapering after.
        price = ratio <= 0.7 ? 1 : Math.max(0, 1 - (ratio - 0.7) / 1.3)
      }
    }

    return 0.45 * category + 0.35 * occasion + 0.20 * price
  }

  /**
   * How alike two candidates are — used only by the diversity pass, never by
   * relevance. Deliberately crude: category and occasion are what make two
   * tiles look like the same tile in a rail, and price is not.
   */
  function similarity(a, b) {
    if (a.id === b.id) return 1
    let s = 0
    if (a.category === b.category) s += 0.65
    if (sameOccasion(a.occasion, b.occasion)) s += 0.35
    return s
  }

  /**
   * The ranking.
   *
   * @param seed        the product being viewed, or null on a cart-wide rail
   * @param cart        product rows already in the basket — excluded from
   *                    results and used as additional seeds
   * @param intent      'similar' (alternatives) | 'complete' (goes with it)
   * @param occasion    an occasion to bias toward, e.g. from the festival page
   * @param budgetGap   rupees to the next real threshold, from savings.js
   * @param limit       how many to return
   */
  function recommend({
    seed = null,
    cart = [],
    intent = 'complete',
    occasion = null,
    budgetGap = null,
    limit = 8,
    pool = products,
  } = {}) {
    // `cart` arrives as CartContext lines — { key, product, qty, … } — not as
    // bare product rows, and a caller may reasonably pass either. Unwrapping
    // once here is what keeps the basket's own contents out of its
    // recommendations; reading `.id` off the line instead of the product
    // collects a set of `undefined` and excludes nothing, so the rail cheerfully
    // recommends the cake already sitting in the bag.
    const inCart = cart.map(l => l?.product ?? l).filter(Boolean)

    const exclude = new Set(inCart.map(p => p.id))
    if (seed) exclude.add(seed.id)

    // Cart-wide rails have no single seed. Every item in the basket becomes
    // one, and a candidate's score is the best case across them — "goes with
    // something you have" is the useful question, not "goes with the average
    // of your basket", which is a description of nothing.
    const seeds = seed ? [seed] : inCart
    if (!seeds.length) return []

    const scored = []
    for (const candidate of pool) {
      if (!candidate || exclude.has(candidate.id)) continue
      if (candidate.is_active === false) continue

      let best = null
      for (const s of seeds) {
        const cf = copurchaseScore(s.id, candidate.id)
        const content = affinity(s, candidate, { intent })

        // The blend. w_cf rises with evidence about THIS seed; the content
        // prior takes what is left. At zero data this is exactly the content
        // score, which is the launch-day behaviour by construction.
        const relevance = cf.score + (1 - cf.weight) * content

        if (!best || relevance > best.relevance) {
          best = { relevance, cf, content, from: s }
        }
      }
      if (!best || best.relevance <= 0) continue

      // ── Context, applied on top of relevance ──
      let boost = 0

      // Popularity, small. It breaks ties toward things that sell and must
      // never be large enough to overturn a genuine match — that is how every
      // rail in a shop ends up showing the same four best-sellers.
      boost += 0.10 * popularity(candidate.id)

      // The occasion the customer is actually shopping for, when we know it.
      if (occasion && sameOccasion(candidate.occasion, occasion)) boost += 0.25

      // Basket completion. An item that closes a real gap is worth surfacing:
      // the customer clears a threshold they were going to miss. Scored on a
      // window rather than a point, since nothing will be priced at exactly
      // ₹212, and tapered so a wildly overshooting item gets nothing.
      let closesGap = false
      const price = Number(candidate.price) || 0
      if (budgetGap > 0 && price >= budgetGap && price <= budgetGap * 2.5) {
        const overshoot = (price - budgetGap) / (budgetGap * 2.5)
        boost += 0.30 * (1 - overshoot)
        closesGap = true
      }

      scored.push({
        product: candidate,
        score: best.relevance + boost,
        relevance: best.relevance,
        seed: best.from,
        // Evidence, carried through so the card can only claim what is true.
        alsoBought: best.cf.pairOrders >= MIN_PAIR_SUPPORT,
        pairOrders: best.cf.pairOrders,
        lift: best.cf.lift,
        dataWeight: best.cf.weight,
        closesGap,
        occasionMatch: !!(occasion && sameOccasion(candidate.occasion, occasion))
          || sameOccasion(best.from.occasion, candidate.occasion),
      })
    }

    scored.sort((a, b) => b.score - a.score)
    return diversify(scored, limit)
  }

  /**
   * MMR: pick the best, then repeatedly pick whatever maximises
   * (relevance − λ · similarity to everything already picked).
   *
   * λ = 0.45 is deliberately assertive. A shop rail is five tiles wide and the
   * cost of two near-identical tiles is one wasted slot out of five, which is
   * much worse than the cost of the third-best item losing to the fifth-best
   * from a different shelf.
   */
  function diversify(scored, limit, lambda = 0.45) {
    const picked = []
    const pool = [...scored]

    while (picked.length < limit && pool.length) {
      let bestIdx = 0
      let bestVal = -Infinity
      for (let i = 0; i < pool.length; i++) {
        const penalty = picked.length
          ? Math.max(...picked.map(p => similarity(p.product, pool[i].product)))
          : 0
        const val = pool[i].score - lambda * penalty
        if (val > bestVal) { bestVal = val; bestIdx = i }
      }
      picked.push(pool.splice(bestIdx, 1)[0])
    }
    return picked
  }

  return { recommend, copurchaseScore, affinity, popularity, hasData: pairs.size > 0 }
}

/**
 * The one line a card is allowed to print about why this is here.
 *
 * Ordered by how much the customer should believe it, strongest evidence
 * first, and it is the ranking result — not the component rendering it — that
 * decides. "Customers also bought" appears only when `alsoBought` is true,
 * which requires real orders past MIN_PAIR_SUPPORT; there is no code path that
 * prints that sentence on an empty database.
 */
export function reasonFor(rec) {
  if (!rec) return null
  if (rec.alsoBought) {
    return {
      kind: 'copurchase',
      text: `Bought together in ${rec.pairOrders} order${rec.pairOrders === 1 ? '' : 's'}`,
      strong: true,
    }
  }
  if (rec.closesGap) {
    return { kind: 'gap', text: 'Takes you past the free-delivery line', strong: false }
  }
  if (rec.occasionMatch && rec.product.occasion) {
    return { kind: 'occasion', text: `Also for ${rec.product.occasion}`, strong: false }
  }
  return { kind: 'affinity', text: 'Goes with this', strong: false }
}
