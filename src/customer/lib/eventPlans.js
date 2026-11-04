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
import { planFromSaved, serviceRowsForPlan, staleServiceIds } from './eventPlanSnapshot'
import { serializeByKey } from './saveQueue'
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

/**
 * Save (create or update) one occasion's plan for the signed-in customer.
 * `clientKey` keeps it to one row per occasion per customer.
 */
export function savePlan(input = {}) {
  const { userId, occasionId } = input
  if (!userId) return Promise.resolve({ ok: false, reason: 'signed-out' })
  return serializeByKey(`${userId}:${occasionId}`, () => savePlanNow(input))
}

async function savePlanNow({ userId, occasionId, context, picks = {}, statuses = {}, lines = [], ruleVersion }) {
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
      .select('trade_id, recommendation_status, decision, vendor_service_id, booking_line_id').eq('plan_id', plan.id)
    if (serviceReadError) return { ok: false, reason: serviceReadError.message }
    const previousServices = savedServices ?? []
    const rows = serviceRowsForPlan(plan.id, statuses, picks, lines, previousServices)
    if (rows.length) {
      const r = await supabase.from('event_plan_services').upsert(rows, { onConflict: 'plan_id,trade_id' })
      if (r.error) return { ok: false, reason: r.error.message }
    }

    // The child table is the current plan snapshot. Without this cleanup,
    // deselected optional services survive the upsert and are rehydrated as
    // selected on the customer's next device. Booking-linked rows are kept.
    const obsoleteTradeIds = staleServiceIds(previousServices, rows)
    if (obsoleteTradeIds.length) {
      const { error: deleteError } = await supabase.from('event_plan_services')
        .delete().eq('plan_id', plan.id).in('trade_id', obsoleteTradeIds)
      if (deleteError) return { ok: false, reason: deleteError.message }
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
    const result = await serializeByKey(`${userId}:${occ}`, async () => {
      try {
        const { data: plan, error: planError } = await supabase.from('event_plans').select('id')
          .eq('customer_id', userId).eq('client_key', `occ:${occ}`).maybeSingle()
        if (planError) return { ok: false, reason: planError.message }
        if (!plan) return { ok: true }
        const rows = booked.filter(r => r.occasionId === occ).map(r => ({
          plan_id: plan.id,
          trade_id: r.tradeId,
          decision: 'selected',
          vendor_service_id: r.serviceId ?? null,
          booking_line_id: r.lineId,
        }))
        const { error } = await supabase.from('event_plan_services').upsert(rows, { onConflict: 'plan_id,trade_id' })
        if (error) return { ok: false, reason: error.message }
        const { error: statusError } = await supabase.from('event_plans').update({ status: 'booked' }).eq('id', plan.id)
        if (statusError) return { ok: false, reason: statusError.message }
        return { ok: true }
      } catch (e) { return { ok: false, reason: e.message } }
    })
    if (!result.ok) return result
  }
  return { ok: true }
}
