/**
 * Personal Celebrations on the server: the occasion's answers, and the
 * three free toolkit features migration 211 adds.
 *
 * Same contract as eventSpine.js, for the same reason: every call
 * returns `{ ok, reason }` and never throws. Until 211 is applied, or
 * for a signed-out customer, `reason` is 'not-migrated' or 'signed-out'
 * and the phone's own copy (PlanContext) stays the record. Nothing ever
 * claims to be saved when it is not — which is why the toolkit cards for
 * polls, budget and schedule say "opens here once it's switched on"
 * rather than opening a screen that would fail.
 */
import { supabase } from '../../lib/supabase'
import { ensureEvent, spineReady } from './eventSpine'

const MISSING = /does not exist|schema cache|PGRST20[25]/i
const why = e => (!e ? null : MISSING.test(e.message ?? '') || ['42P01', '42703', 'PGRST202', 'PGRST205'].includes(e.code) ? 'not-migrated' : e.message)

/** Has 211 been applied? Probed once per session, never guessed. */
let ready = null
export async function toolkitReady() {
  if (ready !== null) return ready
  if (!(await spineReady())) return (ready = false)
  try {
    const { error } = await supabase.from('event_plans').select('occasion_answers').limit(1)
    return (ready = !error)
  } catch { return (ready = false) }
}

/* ── The answers ──────────────────────────────────────────────────── */

/**
 * Save the occasion's own answers onto the event. The blueprint version
 * goes with them, so a plan the customer agreed to can always be read
 * back against the blueprint that produced it.
 */
export async function saveAnswers({ userId, occasionId, answers, version, category = null, context = {} }) {
  if (!userId) return { ok: false, reason: 'signed-out' }
  if (!(await toolkitReady())) return { ok: false, reason: 'not-migrated' }
  const ev = await ensureEvent({ userId, occasionId, context })
  if (!ev.ok) return ev
  const { error } = await supabase.from('event_plans')
    .update({ occasion_answers: answers ?? {}, blueprint_version: version ?? null, blueprint_category: category ?? null })
    .eq('id', ev.id)
  return error ? { ok: false, reason: why(error) } : { ok: true, planId: ev.id }
}

export async function loadAnswers(planId) {
  if (!planId || !(await toolkitReady())) return null
  const { data, error } = await supabase.from('event_plans')
    .select('occasion_answers, blueprint_version').eq('id', planId).single()
  return error ? null : { answers: data.occasion_answers ?? {}, version: data.blueprint_version ?? null }
}

/* ── Polls ────────────────────────────────────────────────────────── */

export async function polls(planId) {
  if (!planId || !(await toolkitReady())) return []
  const { data, error } = await supabase.from('sambramo_event_polls')
    .select('id, kind, question, options, multi, closes_at, closed_at, created_at')
    .eq('plan_id', planId).order('created_at', { ascending: false })
  return error ? [] : data
}

export async function createPoll(planId, { kind, question, options, multi = false, closesAt = null }, userId) {
  if (!planId || !userId) return { ok: false, reason: 'signed-out' }
  if (!(await toolkitReady())) return { ok: false, reason: 'not-migrated' }
  if (!Array.isArray(options) || options.length < 2 || options.length > 12) return { ok: false, reason: 'bad-options' }
  const { data, error } = await supabase.from('sambramo_event_polls')
    .insert({ plan_id: planId, created_by: userId, kind, question, options, multi, closes_at: closesAt })
    .select('id').single()
  return error ? { ok: false, reason: why(error) } : { ok: true, id: data.id }
}

/** A guest votes with their invitation token — no account needed (191's path). */
export async function vote(token, pollId, choices) {
  const { data, error } = await supabase.rpc('event_poll_vote', { p_token: token, p_poll: pollId, p_choices: choices })
  return error ? { ok: false, reason: why(error) } : data
}

export async function guestPolls(token) {
  const { data, error } = await supabase.rpc('event_polls_view', { p_token: token })
  return error ? { ok: false, reason: why(error), polls: [] } : data
}

/* ── The shared budget ────────────────────────────────────────────── */

/**
 * What people have put in, and what has actually been spent. The
 * ESTIMATE is never stored — it is computed from live prices every time
 * (lib/planBudget.js), because a stale estimate is worse than none.
 */
export async function budgetBook(planId) {
  if (!planId || !(await toolkitReady())) return { contributions: [], expenses: [] }
  const [c, e] = await Promise.all([
    supabase.from('sambramo_event_contributions').select('id, person, pledged_paise, paid_paise, note').eq('plan_id', planId),
    supabase.from('sambramo_event_expenses').select('id, label, trade_id, amount_paise, kind').eq('plan_id', planId),
  ])
  return { contributions: c.data ?? [], expenses: e.data ?? [] }
}

export async function addContribution(planId, userId, { person, pledgedPaise = 0, paidPaise = 0, note = null }) {
  if (!planId || !userId) return { ok: false, reason: 'signed-out' }
  if (!(await toolkitReady())) return { ok: false, reason: 'not-migrated' }
  const { error } = await supabase.from('sambramo_event_contributions')
    .insert({ plan_id: planId, added_by: userId, person, pledged_paise: pledgedPaise, paid_paise: paidPaise, note })
  return error ? { ok: false, reason: why(error) } : { ok: true }
}

/** Pledged, paid and outstanding — in paise, so nothing rounds twice. */
export function budgetTotals({ contributions = [], expenses = [] }, estimate = null) {
  const pledged = contributions.reduce((s, c) => s + Number(c.pledged_paise || 0), 0)
  const paid = contributions.reduce((s, c) => s + Number(c.paid_paise || 0), 0)
  const actual = expenses.filter(e => e.kind === 'actual').reduce((s, e) => s + Number(e.amount_paise || 0), 0)
  return {
    pledged, paid, outstanding: Math.max(0, pledged - paid), actual,
    estimated: estimate?.low ?? null,
    /* An estimate is never counted as money spent. */
    remaining: pledged ? pledged - actual : null,
  }
}

/* ── The schedule ─────────────────────────────────────────────────── */

export async function schedule(planId) {
  if (!planId || !(await toolkitReady())) return []
  const { data, error } = await supabase.from('sambramo_event_updates')
    .select('id, phase, at_time, title, body, notify, position')
    .eq('plan_id', planId).order('phase').order('position')
  return error ? [] : data
}

/**
 * Seed the schedule from the occasion's own timeline the first time, so
 * a customer never faces an empty screen. Only ever adds — an existing
 * schedule is the customer's and is left alone.
 */
export async function seedSchedule(planId, userId, timeline) {
  if (!planId || !userId || !timeline) return { ok: false, reason: 'signed-out' }
  if (!(await toolkitReady())) return { ok: false, reason: 'not-migrated' }
  if ((await schedule(planId)).length) return { ok: true, seeded: 0 }
  const rows = ['before', 'during', 'after'].flatMap(phase =>
    (timeline[phase] ?? []).map((title, i) => ({ plan_id: planId, created_by: userId, phase, title, position: i })))
  if (!rows.length) return { ok: true, seeded: 0 }
  const { error } = await supabase.from('sambramo_event_updates').insert(rows)
  return error ? { ok: false, reason: why(error) } : { ok: true, seeded: rows.length }
}
