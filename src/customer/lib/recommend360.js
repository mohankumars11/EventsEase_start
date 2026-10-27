/**
 * The 360° recommendation engine — deterministic, explainable, testable
 * without any UI.
 *
 *   recommend(occasionId, context, { rules }) → {
 *     occasionId, categoryId, ruleVersion, baselineVersion,
 *     services: [{ tradeId, status, recommended, score, reasonCodes, reason,
 *                  lifecyclePhases, primaryPhase, triggeredBy, coveredByVenue,
 *                  alreadyArranged, customerExcluded, savedForLater, addedByCustomer,
 *                  requiresFollowUpQuestion, question }],
 *     shortlist: [tradeId], phases: [{ id, title, tradeIds }], followUps: [...]
 *   }
 *
 * 1. Baseline status from the bundle matrix (catalogue360.generated.js).
 * 2. Context rules (data/rules360.js or a published DB version): activate,
 *    suppress, cover, demote — precedence customer > cover > suppress >
 *    demote > activate > baseline. A rule never fires on an unanswered field.
 * 3. Customer controls: arranged, excluded, added, later.
 * The same input always gives the same output (stable sort by score, then
 * the bundle's trade order). No network, no randomness, no LLM.
 */
import { BASELINE, LIFECYCLE_STAGES, TRADE_ORDER, RATIONALE } from '../data/catalogue360.generated'
import { OCCASION } from '../data/occasions'
import { TRADE } from '../data/trades'
import { PHASES, PRIMARY_PHASE, QUESTIONS, RULES, RULES_VERSION, STAGE_TO_PHASES } from '../data/rules360'

export const STATUS = { C: 'CORE', D: 'CONDITIONAL', O: 'OPTIONAL', N: 'NOT_DEFAULT' }
export const BASELINE_VERSION = 'baseline-v1'

export class RecommendationError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

/* Each trade's lifecycle phases, from the workbook's stage → trade lists. */
const PHASES_OF = Object.fromEntries(TRADE_ORDER.map(t => {
  const ph = new Set()
  LIFECYCLE_STAGES.forEach((s, i) => { if (s.trades.includes(t)) (STAGE_TO_PHASES[i + 1] ?? []).forEach(p => ph.add(p)) })
  if (PRIMARY_PHASE[t]) ph.add(PRIMARY_PHASE[t])
  return [t, [...ph].sort((a, b) => a - b)]
}))

const CONTEXT_FIELDS = new Set(['date', 'time', 'hours', 'guests', 'venueType', 'venueBooked', 'venueProvides', 'setting', 'formats', 'food', 'drinks',
  'media', 'privacy', 'travel', 'accessibility', 'children', 'public', 'budget', 'city', 'arranged', 'excluded', 'added', 'later'])

/** Reject unknown fields and wrong types with a useful message. */
export function validateContext(ctx = {}) {
  const errs = []
  for (const k of Object.keys(ctx)) if (!CONTEXT_FIELDS.has(k)) errs.push(`unknown context field "${k}"`)
  for (const k of ['guests', 'hours']) if (ctx[k] != null && !(Number(ctx[k]) >= 0)) errs.push(`${k} must be a non-negative number`)
  for (const k of ['venueProvides', 'formats', 'arranged', 'excluded', 'added', 'later']) if (ctx[k] != null && !Array.isArray(ctx[k])) errs.push(`${k} must be a list`)
  for (const k of ['arranged', 'excluded', 'added', 'later']) for (const t of ctx[k] ?? []) if (!TRADE[t]) errs.push(`${k}: unknown trade "${t}"`)
  if (ctx.time != null && !/^\d{2}:\d{2}$/.test(ctx.time)) errs.push('time must be HH:MM')
  return errs
}

/* Field lookup, with the occasion and a few derived values. */
function read(ctx, occ, f) {
  if (f.startsWith('occasion.')) return { id: occ.id, category: occ.category, where: occ.where }[f.slice(9)]
  if (f === 'endHour') {
    if (!ctx.time || ctx.hours == null) return undefined
    return Number(ctx.time.slice(0, 2)) + Number(ctx.time.slice(3, 5)) / 60 + Number(ctx.hours)
  }
  return ctx[f]
}

/** Does a rule condition hold? Unknown (unanswered) fields never match. */
export function holds(cond, ctx, occ) {
  if (!cond) return false
  if (cond.all) return cond.all.every(c => holds(c, ctx, occ))
  if (cond.any) return cond.any.some(c => holds(c, ctx, occ))
  if (cond.not) return !holds(cond.not, ctx, occ)
  const v = read(ctx, occ, cond.f)
  if ('exists' in cond) return (v != null) === cond.exists
  if (v == null || v === '') return false
  if ('is' in cond) return v === cond.is
  if ('in' in cond) return cond.in.includes(v)
  if ('has' in cond) return Array.isArray(v) && v.includes(cond.has)
  if ('hasAny' in cond) return Array.isArray(v) && v.some(x => cond.hasAny.includes(x))
  if ('gte' in cond) return typeof cond.gte === 'string' ? String(v) >= cond.gte : Number(v) >= cond.gte
  if ('lt' in cond) return Number(v) < cond.lt
  return false
}

const BASE_SCORE = { CORE: 100, CONDITIONAL: 60, OPTIONAL: 30, NOT_DEFAULT: 0 }

/* The rule set in use: the bundled one until a published version loads
   (lib/eventPlans.js loadRules → setActiveRules). */
let ACTIVE = { rules: RULES, ruleVersion: RULES_VERSION }
export function setActiveRules(set) { if (set?.rules) ACTIVE = { rules: set.rules, ruleVersion: set.ruleVersion } }

export function recommend(occasionId, context = {}, { rules = ACTIVE.rules, ruleVersion = ACTIVE.ruleVersion } = {}) {
  const occ = OCCASION[occasionId]
  if (!occ) throw new RecommendationError('UNKNOWN_OCCASION', `Unknown occasion "${occasionId}"`)
  const codes = BASELINE[occasionId]
  if (!codes) throw new RecommendationError('NO_BASELINE', `No baseline recommendations for "${occasionId}"`)
  const errs = validateContext(context)
  if (errs.length) throw new RecommendationError('INVALID_CONTEXT', errs.join('; '))
  const ctx = context
  const set = k => new Set(ctx[k] ?? [])
  const arranged = set('arranged'), excluded = set('excluded'), added = set('added'), later = set('later')

  const svc = Object.fromEntries(TRADE_ORDER.map((t, i) => [t, {
    tradeId: t, status: STATUS[codes[i]], baseline: STATUS[codes[i]], acts: [], sups: [], covers: [], demotes: [],
  }]))
  for (const r of rules) {
    if (!holds(r.when, ctx, occ)) continue
    if (r.unless && holds(r.unless, ctx, occ)) continue
    for (const t of r.trades) {
      const s = svc[t]
      if (!s) continue
      if (r.effect === 'activate') { if (s.baseline !== 'NOT_DEFAULT' || r.allowNotDefault) s.acts.push(r) }
      else if (r.effect === 'suppress') s.sups.push(r)
      else if (r.effect === 'cover') s.covers.push(r)
      else if (r.effect === 'demote') s.demotes.push(r)
    }
  }

  const services = TRADE_ORDER.map(t => {
    const s = svc[t]
    let status = s.baseline
    if (s.demotes.length) status = 'NOT_DEFAULT'
    else if (s.acts.length && status === 'NOT_DEFAULT') status = 'CONDITIONAL'
    const coveredByVenue = s.covers.length > 0
    const suppressed = s.sups.length > 0 || s.demotes.length > 0
    let recommended = status === 'CORE' ? !suppressed : status === 'CONDITIONAL' ? s.acts.length > 0 && !suppressed
      : status === 'OPTIONAL' ? s.acts.length > 0 && !suppressed : false
    const addedByCustomer = added.has(t)
    if (addedByCustomer) recommended = true
    const q = QUESTIONS[t]
    const requiresFollowUpQuestion = !recommended && status === 'CONDITIONAL' && !suppressed && !!q && read(ctx, occ, q.field) == null
    const fired = [...s.covers, ...s.sups, ...s.demotes, ...s.acts]
    const reasonCodes = [`baseline.${status.toLowerCase()}`, ...fired.map(r => r.id), ...(addedByCustomer ? ['customer.added'] : []),
      ...(arranged.has(t) ? ['customer.arranged'] : []), ...(excluded.has(t) ? ['customer.excluded'] : [])]
    const reason = arranged.has(t) ? 'You’ve already arranged this'
      : excluded.has(t) ? 'You removed this'
        : coveredByVenue ? s.covers[0].reason
          : addedByCustomer ? 'You added this'
            : s.demotes[0]?.reason ?? s.sups[0]?.reason ?? s.acts[0]?.reason
              ?? (occ.why?.[t] ?? (status === 'CORE' ? `Core for a ${occ.name.toLowerCase()}` : status === 'OPTIONAL' ? 'An optional upgrade' : status === 'CONDITIONAL' ? (q?.text ?? 'Depends on your event') : 'Available if you need it'))
    const score = (BASE_SCORE[status] ?? 0) + (recommended ? 50 : 0) + s.acts.length * 5 - (coveredByVenue || arranged.has(t) || excluded.has(t) ? 200 : 0)
    return {
      tradeId: t, status, baselineStatus: s.baseline, recommended, score, reasonCodes, reason,
      lifecyclePhases: PHASES_OF[t], primaryPhase: PRIMARY_PHASE[t] ?? PHASES_OF[t][0] ?? 8,
      triggeredBy: fired.map(r => r.id),
      coveredByVenue, alreadyArranged: arranged.has(t), customerExcluded: excluded.has(t), savedForLater: later.has(t), addedByCustomer,
      requiresFollowUpQuestion, question: requiresFollowUpQuestion ? { field: q.field, text: q.text } : null,
    }
  }).sort((a, b) => b.score - a.score || TRADE_ORDER.indexOf(a.tradeId) - TRADE_ORDER.indexOf(b.tradeId))

  const onList = x => x.recommended && !x.coveredByVenue && !x.alreadyArranged && !x.customerExcluded && !x.savedForLater
  const shortlist = services.filter(onList).map(x => x.tradeId)
  const phases = PHASES.map(p => ({ ...p, tradeIds: services.filter(x => onList(x) && x.primaryPhase === p.id).map(x => x.tradeId) })).filter(p => p.tradeIds.length)
  const followUps = [...new Map(services.filter(x => x.requiresFollowUpQuestion).map(x => [x.question.field, { ...x.question, trades: services.filter(y => y.question?.field === x.question.field).map(y => y.tradeId) }])).values()]
  return { occasionId, categoryId: occ.category, ruleVersion, baselineVersion: BASELINE_VERSION, rationale: RATIONALE[occ.category] ?? null, services, shortlist, phases, followUps }
}

/** Validate a rule set before it is used or published. Returns error strings. */
export function validateRules(rules) {
  const errs = [], ids = new Set()
  const EFFECTS = new Set(['activate', 'suppress', 'cover', 'demote'])
  const walk = (c, at) => {
    if (!c || typeof c !== 'object') return errs.push(`${at}: condition missing`)
    if (c.all || c.any) return (c.all ?? c.any).forEach((x, i) => walk(x, `${at}[${i}]`))
    if (c.not) return walk(c.not, `${at}.not`)
    if (typeof c.f !== 'string') errs.push(`${at}: condition needs a field "f"`)
    if (!['is', 'in', 'has', 'hasAny', 'gte', 'lt', 'exists'].some(k => k in c)) errs.push(`${at}: condition needs an operator`)
  }
  for (const r of rules) {
    if (!r.id || ids.has(r.id)) errs.push(`rule id missing or duplicated: ${r.id}`)
    ids.add(r.id)
    if (!EFFECTS.has(r.effect)) errs.push(`${r.id}: unknown effect ${r.effect}`)
    if (!r.reason) errs.push(`${r.id}: reason missing`)
    for (const t of r.trades ?? []) if (!TRADE[t]) errs.push(`${r.id}: unknown trade ${t}`)
    walk(r.when, `${r.id}.when`)
    if (r.unless) walk(r.unless, `${r.id}.unless`)
  }
  return errs
}
