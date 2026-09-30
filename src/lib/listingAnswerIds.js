/**
 * Turn what a partner tapped into ids a database can read back.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS CLOSES
 * ══════════════════════════════════════════════════════════════════════
 *
 * The catalogue has an id for every question and every answer — 309
 * questions, 1,368 answers, all in listing_questions and
 * listing_answers. What a partner SAVED used none of them:
 *
 *   specs = { time_limits: ['early'], team_size: '9', kitchen: 'pure_veg' }
 *
 * `early` is unique inside its own question and nowhere else. Photography
 * has a `time_limits`, so does Catering, so does Security — three
 * different questions whose answers happen to share a key. Nothing
 * downstream can read that row without already knowing which trade and
 * which screen it came from, which means nothing downstream can query it
 * at all.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IDS ARE ADDED, NOT SUBSTITUTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The human-readable answers stay exactly where they are. A coordinator
 * opening a listing needs to read "no 4am muhurta starts", not
 * SBM-SPC-979, and the app has already been burnt once by showing an
 * operator an id where a name belonged.
 *
 * So this is the same split as dishes: `specs.dishes` for a person,
 * `specs.dish_ids` for the machine. Ids never replace text.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT CANNOT BE RESOLVED IS REPORTED, NOT DROPPED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A question whose id cannot be found comes back in `unresolved`. The
 * tempting alternative — skip it quietly — produces a listing that looks
 * complete and is missing an answer nobody will ever notice is gone.
 */
import {
  questionIdFor, answerIdFor, menuIdFor, counterIdFor,
} from '../data/catalogueIds.generated'
import { FUNNEL_QUESTIONS, FUNNEL_SCOPE } from '../data/cateringFunnel'

/**
 * Where each answered group came from.
 *
 * Scope is part of a question's identity, not a label on it. It is built
 * from the very lists the screens rendered from — `groups` and
 * `opsScreens` — so it cannot drift from what the partner was actually
 * shown.
 *
 * Service groups arrive already namespaced `serviceId:groupId` by
 * specsForServices, because two offerings can both have a `brings`
 * group. That namespacing is undone here: the catalogue id was minted
 * from the bare group id under a `service:` scope.
 */
export function scopeIndex({ trade, groups = [], opsScreens = [] }) {
  const index = new Map()
  const put = (key, scope, groupId) => { if (!index.has(key)) index.set(key, { scope, groupId }) }

  for (const g of groups) {
    if (g.forService) put(g.id, `service:${g.forService}`, String(g.id).slice(String(g.forService).length + 1))
    else put(g.id, `trade:${trade}`, g.id)
  }
  /* Keyed by where the answer LIVES (stateKey), resolved to the bare
     group id the catalogue minted its id from. The two differ because
     eight trades have an ops group whose id already exists on their
     detail screen. */
  for (const s of opsScreens) {
    for (const g of s.groups ?? []) put(g.stateKey ?? g.id, `ops:${trade}:${s.id}`, g.id)
  }
  for (const g of FUNNEL_QUESTIONS) put(g.id, FUNNEL_SCOPE, g.id)

  return index
}

const isNumeric = v => typeof v === 'string' && /^\d+$/.test(v)

/**
 * The id layer for one submitted listing.
 *
 * @returns {{answers: Array, menu_ids: string[], counter_ids: string[], unresolved: string[]}}
 */
export function listingAnswerIds({
  trade, groups = [], opsScreens = [], detail = {},
  menus = [], counters = [], kitchen = null,
}) {
  const index = scopeIndex({ trade, groups, opsScreens })
  const answers = []
  const unresolved = []

  /* The kitchen is answered on its own funnel screen and kept in its own
     state, not in `detail`. It is still an answer to a question. */
  const all = { ...detail }
  if (kitchen) all.kitchen = kitchen

  for (const [key, raw] of Object.entries(all)) {
    if (raw === undefined || raw === null || raw === '') continue

    /* Free text rides along with the question it qualifies rather than
       becoming an answer of its own — it has no id and never will. */
    if (key.endsWith('__other')) continue

    const hit = index.get(key)
    if (!hit) { unresolved.push(key); continue }

    const qid = questionIdFor(hit.scope, hit.groupId)
    if (!qid) { unresolved.push(`${hit.scope}|${hit.groupId}`); continue }

    const entry = { q: qid }

    const picked = Array.isArray(raw) ? raw : [raw]
    const ids = []
    for (const choice of picked) {
      if (isNumeric(choice)) continue          // an exact number, handled below
      const aid = answerIdFor(hit.scope, hit.groupId, choice)
      if (aid) ids.push(aid)
      else unresolved.push(`${hit.scope}|${hit.groupId}|${choice}`)
    }
    if (ids.length) entry.a = ids

    /* A typed number that matches no chip. The chips and the field share
       one value deliberately, so exactly one of these branches fires. */
    const exact = picked.find(isNumeric)
    if (exact !== undefined) entry.n = Number(exact)

    const other = all[`${key}__other`]
    if (typeof other === 'string' && other.trim()) entry.other = other.trim()

    if (entry.a || entry.n !== undefined || entry.other) answers.push(entry)
  }

  const menu_ids = []
  for (const slug of menus) {
    const id = menuIdFor(slug)
    if (id) menu_ids.push(id); else unresolved.push(`menu|${slug}`)
  }
  const counter_ids = []
  for (const slug of counters) {
    const id = counterIdFor(slug)
    if (id) counter_ids.push(id); else unresolved.push(`counter|${slug}`)
  }

  return { answers, menu_ids, counter_ids, unresolved }
}
