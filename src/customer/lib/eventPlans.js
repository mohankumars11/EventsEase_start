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
import { planFromSaved } from './eventPlanSnapshot'
export { planFromSaved, savedContextFor } from './eventPlanSnapshot'

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
    const clientKey = `occ:${occasionId}`
    const { data: existing, error: lookupError } = await supabase.from('event_plans')
      .select('id, status').eq('customer_id', userId).eq('client_key', clientKey).maybeSingle()
    if (lookupError) return { ok: false, reason: lookupError.code === '42P01' || /does not exist|schema cache/i.test(lookupError.message) ? 'not-migrated' : lookupError.message }
    // Autosave must never demote a completed booking back to an active draft.
    const status = existing?.status === 'booked' ? 'booked' : 'active'
    const { data: plan, error } = await supabase.from('event_plans')
      .upsert({ customer_id: userId, client_key: clientKey, occasion_id: occasionId, context, rule_version: ruleVersion, status }, { onConflict: 'customer_id,client_key' })
      .select('id').single()
    if (error) return { ok: false, reason: error.code === '42P01' || /does not exist|schema cache/i.test(error.message) ? 'not-migrated' : error.message }
    const { data: savedServices, error: serviceReadError } = await supabase.from('event_plan_services')
      .select('trade_id, vendor_service_id, booking_line_id').eq('plan_id', plan.id)
    if (serviceReadError) return { ok: false, reason: serviceReadError.message }
    const previousByTrade = Object.fromEntries((savedServices ?? []).map(row => [row.trade_id, row]))
    const rows = Object.entries(statuses).filter(([t]) => picks[t] || statuses[t] === 'CORE' || lines.some(l => l.tradeId === t)).map(([t, status]) => {
      const line = lines.find(item => item.tradeId === t)
      const previous = previousByTrade[t]
      return {
        plan_id: plan.id, trade_id: t, recommendation_status: status,
        decision: DECISION[picks[t]] ?? 'recommended',
        // An autosave after checkout must not clear the master or the booking
        // line already linked to this service.
        vendor_service_id: line?.serviceId ?? previous?.vendor_service_id ?? null,
        booking_line_id: previous?.booking_line_id ?? null,
      }
    })
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

