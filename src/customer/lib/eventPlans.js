/**
 * The 360° plan on the server: the published rule set, and the customer's
 * saved event plans (migration 190).
 *
 * Both degrade quietly. Until migration 190 is applied, or for a signed-out
 * customer, the bundled rules are used and the plan lives on the phone
 * (PlanContext) — nothing the customer did is lost and nothing claims to be
 * saved when it is not: `savePlan` returns { ok: false, reason } and the
 * screen says "Saved on this phone".
 */
import { supabase } from '../../lib/supabase'
import { RULES, RULES_VERSION } from '../data/rules360'
import { validateRules } from './recommend360'

let published = null
/** The published rule set, validated; the bundled one when there is none. */
export async function loadRules() {
  if (published) return published
  try {
    const { data, error } = await supabase.from('recommendation_rule_versions').select('version, rules').eq('status', 'published').maybeSingle()
    if (!error && data?.rules && validateRules(data.rules).length === 0) return (published = { rules: data.rules, ruleVersion: data.version, source: 'published' })
  } catch { /* table missing or offline */ }
  return (published = { rules: RULES, ruleVersion: RULES_VERSION, source: 'bundled' })
}

const DECISION = { need: 'selected', skip: 'removed', have: 'arranged', later: 'later' }

/**
 * Save (create or update) one occasion's plan for the signed-in customer.
 * `clientKey` keeps it to one row per occasion per customer.
 */
export async function savePlan({ userId, occasionId, context, picks = {}, statuses = {}, lines = [], ruleVersion }) {
  if (!userId) return { ok: false, reason: 'signed-out' }
  try {
    const { data: plan, error } = await supabase.from('event_plans')
      .upsert({ customer_id: userId, client_key: `occ:${occasionId}`, occasion_id: occasionId, context, rule_version: ruleVersion, status: 'active' }, { onConflict: 'customer_id,client_key' })
      .select('id').single()
    if (error) return { ok: false, reason: error.code === '42P01' || /does not exist|schema cache/i.test(error.message) ? 'not-migrated' : error.message }
    const rows = Object.entries(statuses).filter(([t]) => picks[t] || statuses[t] === 'CORE' || lines.some(l => l.tradeId === t)).map(([t, status]) => ({
      plan_id: plan.id, trade_id: t, recommendation_status: status,
      decision: DECISION[picks[t]] ?? 'recommended',
      vendor_service_id: lines.find(l => l.tradeId === t)?.serviceId ?? null,
    }))
    if (rows.length) {
      const r = await supabase.from('event_plan_services').upsert(rows, { onConflict: 'plan_id,trade_id' })
      if (r.error) return { ok: false, reason: r.error.message }
    }
    return { ok: true, id: plan.id }
  } catch (e) { return { ok: false, reason: e.message } }
}

/** The customer's saved plans, newest first (for resume on another phone). */
export async function myPlans(userId) {
  if (!userId) return []
  const { data, error } = await supabase.from('event_plans').select('id, occasion_id, context, status, updated_at, event_plan_services(trade_id, decision, recommendation_status)')
    .eq('customer_id', userId).order('updated_at', { ascending: false }).limit(20)
  return error ? [] : data
}

/**
 * After checkout: tie each booked line to its plan's service row, so the
 * saved plan knows which services are booked and with whom.
 * `results` are Checkout's per-line outcomes ({ occasionId, tradeId, serviceId, lineId }).
 */
export async function linkBookings(userId, results = []) {
  if (!userId) return { ok: false, reason: 'signed-out' }
  const booked = results.filter(r => r.lineId && r.tradeId && r.occasionId)
  for (const occ of [...new Set(booked.map(r => r.occasionId))]) {
    const { data: plan } = await supabase.from('event_plans').select('id').eq('customer_id', userId).eq('client_key', `occ:${occ}`).maybeSingle()
    if (!plan) continue
    const rows = booked.filter(r => r.occasionId === occ).map(r => ({ plan_id: plan.id, trade_id: r.tradeId, decision: 'selected', vendor_service_id: r.serviceId ?? null, booking_line_id: r.lineId }))
    const { error } = await supabase.from('event_plan_services').upsert(rows, { onConflict: 'plan_id,trade_id' })
    if (error) return { ok: false, reason: error.message }
    await supabase.from('event_plans').update({ status: 'booked' }).eq('id', plan.id)
  }
  return { ok: true }
}

const PICK = { selected: 'need', removed: 'skip', arranged: 'have', later: 'later' }
const ABOUT = ['venueProvides', 'setting', 'formats', 'food', 'drinks', 'media', 'travel', 'public', 'children', 'accessibility', 'privacy', 'budget']

/** A saved plan back into the phone's plan state: { event, picks }. */
export function planFromSaved(row) {
  const c = row.context ?? {}
  const event = {
    occasionId: row.occasion_id, date: c.date ?? null, time: c.time ?? null, hours: c.hours ?? null, guests: c.guests ?? null,
    venue: c.venueBooked ? 'have' : 'need', venueKind: null,
    context: Object.fromEntries(Object.entries(c).filter(([k]) => ABOUT.includes(k))),
  }
  const picks = {}
  for (const s of row.event_plan_services ?? []) if (PICK[s.decision]) picks[s.trade_id] = PICK[s.decision]
  return { event, picks }
}
