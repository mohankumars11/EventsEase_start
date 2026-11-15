/**
 * One celebration on the server: the event, who owns each requirement,
 * what the customer configured, and the one tap that sent a batch out
 * (migration 202).
 *
 * ── Why this sits beside eventPlans.js rather than inside it ─────────
 * eventPlans.js saves a whole plan in one upsert — the shape the 360°
 * screen needs, written every time a chip is tapped. This is the other
 * half: the individual requirement as a thing with a name, an owner, a
 * configuration and a lifecycle, which is what the review screen, the
 * planner and the partner all read. Same tables, different grain.
 *
 * ── Degrading ───────────────────────────────────────────────────────
 * Every call returns `{ ok, reason }` and never throws. Until 202 is
 * pasted, or for a signed-out customer, `reason` is 'not-migrated' or
 * 'signed-out' and the caller keeps using the phone's own plan
 * (PlanContext) — nothing the customer did is lost, and nothing claims
 * to be saved when it is not. That is the rule eventPlans.js already
 * follows and the reason the review screen can say "Saved on this phone".
 */
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/api'
import { authHeaders } from '../../lib/payLines'

const MISSING = /does not exist|schema cache|PGRST20[25]/i
const why = e => (!e ? null : MISSING.test(e.message ?? '') || ['42P01', '42703', 'PGRST202', 'PGRST205'].includes(e.code) ? 'not-migrated' : e.message)

/** Has 202 been applied? Probed once per session, never guessed. */
let spine = null
export async function spineReady() {
  if (spine !== null) return spine
  try {
    const { error } = await supabase.from('event_plan_services').select('requirement_code').limit(1)
    return (spine = !error)
  } catch { return (spine = false) }
}

/* ── The event ────────────────────────────────────────────────────── */

/**
 * The server row for the celebration the customer is planning, created
 * if it is not there yet. One per (customer, occasion) — `client_key` is
 * what 190 keys on, so a retry or a second phone finds the same event
 * rather than starting another one.
 */
export async function ensureEvent({ userId, occasionId, context = {}, ruleVersion = null }) {
  if (!userId) return { ok: false, reason: 'signed-out' }
  if (!(await spineReady())) return { ok: false, reason: 'not-migrated' }
  const row = {
    customer_id: userId, client_key: `occ:${occasionId}`, occasion_id: occasionId,
    context, rule_version: ruleVersion, status: 'active',
  }
  const { data, error } = await supabase.from('event_plans')
    .upsert(row, { onConflict: 'customer_id,client_key' })
    .select('id, plan_code, fulfilment_mode, booking_request_id').single()
  return error ? { ok: false, reason: why(error) } : { ok: true, ...data }
}

/**
 * Record how the customer wants the event organised. Advisory by design:
 * 202 enforces nothing against it, because what actually governs a
 * requirement is its owner — which is what makes changing your mind free.
 */
export async function setFulfilmentMode(planId, mode) {
  if (!planId) return { ok: false, reason: 'no-event' }
  if (!['self', 'planner', 'hybrid'].includes(mode)) return { ok: false, reason: 'unknown-mode' }
  const { error } = await supabase.from('event_plans')
    .update({ fulfilment_mode: mode, fulfilment_mode_set_at: new Date().toISOString() }).eq('id', planId)
  return error ? { ok: false, reason: why(error) } : { ok: true, mode }
}

/* ── The requirements ─────────────────────────────────────────────── */

/** Every requirement on this event, with its code, owner, state and configuration. */
export async function requirements(planId) {
  if (!planId) return []
  const { data, error } = await supabase.from('event_plan_services')
    .select('id, trade_id, requirement_code, decision, owner, state, config, config_version, missing_fields, booking_line_id, dispatch_batch_id, updated_at')
    .eq('plan_id', planId)
  return error ? [] : data
}

/**
 * The requirement row for one trade, created if it is not there yet.
 * 190 has UNIQUE (plan_id, trade_id), so this is an upsert and a second
 * tap on the same card cannot make a second requirement.
 */
export async function ensureRequirement({ planId, tradeId, recommendation = null, decision = 'selected' }) {
  if (!planId) return { ok: false, reason: 'no-event' }
  const { data, error } = await supabase.from('event_plan_services')
    /* recommendation_status only when given: an upsert writes every key it
       is sent, and null would wipe the engine's tag on an existing row. */
    .upsert({ plan_id: planId, trade_id: tradeId, decision, ...(recommendation ? { recommendation_status: recommendation } : {}) },
            { onConflict: 'plan_id,trade_id', ignoreDuplicates: false })
    .select('id, requirement_code, owner, state, config, config_version, missing_fields').single()
  return error ? { ok: false, reason: why(error) } : { ok: true, ...data }
}

/**
 * Save what the customer configured, as a new version.
 *
 * What is still MISSING is not sent and not ours to decide: 203's
 * validator works it out from the published template and hands it back.
 * That is the point — a phone that could say "nothing is missing" could
 * dispatch a half-answered requirement, or slip a non-vegetarian dish
 * into a menu a caterer then quotes against.
 *
 * `reason: 'refused'` means the server rejected a value outright (not on
 * the template, or a dish the chosen diet does not allow). That is a bug
 * or a tampered request, never something to retry — so the message is
 * passed through for the screen to show.
 */
export async function saveRequirement({ planServiceId, config }) {
  if (!planServiceId) return { ok: false, reason: 'no-requirement' }
  const { data, error } = await supabase.rpc('sambramo_save_requirement_config', {
    p_plan_service_id: planServiceId, p_config: config ?? {},
  })
  if (error) return { ok: false, reason: why(error), refused: error.code === '22023', message: error.message }
  const r = data?.[0] ?? {}
  return { ok: true, code: r.out_code, state: r.out_state, version: r.out_version, missing: r.out_missing ?? [] }
}

/**
 * Move a requirement: "I've already arranged this", "I don't need it",
 * "my planner is doing it", "I'll do it myself".
 *
 * Refused by the server for anything already with partners — that is a
 * cancellation, which has its own ladder, and must not be reachable by
 * relabelling a row.
 */
export async function setRequirementOwner({ planServiceId, owner, note = null }) {
  const { data, error } = await supabase.rpc('sambramo_set_requirement_owner', {
    p_plan_service_id: planServiceId, p_owner: owner, p_note: note,
  })
  if (error) return { ok: false, reason: why(error) }
  const r = data?.[0] ?? {}
  return { ok: true, code: r.out_code, owner: r.out_owner, state: r.out_state }
}

/* ── Sending them out ─────────────────────────────────────────────── */

/**
 * "Find everything for my celebration": claim every ready requirement on
 * the event in one transaction and hand the list back.
 *
 * This does not dispatch. The server does, through the per-line path that
 * already exists (api/anchor?op=dispatch-batch), because that is the only
 * place allowed to write a price. What this guarantees is the thing the
 * customer would notice if it were wrong: a requirement sent an hour ago
 * on its own is NOT sent again, and a double-tap does not open a second
 * batch — `clientKey` makes the call idempotent, exactly as the booking
 * path does.
 *
 * `skipped` comes back with a reason per requirement, so the screen can
 * say which service needs more information rather than failing silently.
 */
export async function openBatch({ planId, clientKey }) {
  if (!planId) return { ok: false, reason: 'no-event' }
  const { data, error } = await supabase.rpc('sambramo_open_dispatch_batch', {
    p_plan_id: planId, p_client_key: clientKey,
  })
  if (error) return { ok: false, reason: why(error) }
  const r = data?.[0] ?? {}
  return { ok: true, batchId: r.out_batch_id, status: r.out_status, ready: r.out_ready ?? [], skipped: r.out_skipped ?? [] }
}

/**
 * Send every ready requirement out, in one call.
 *
 * `lines` is what the phone already worked out for each requirement: the
 * master it matched (liveMatch) and the request it shaped for that trade
 * (lib/booking requestFor) — the same two things a single booking sends.
 * The server re-decides what may actually go out, prices every line
 * itself, and puts back anything that failed, so this list is a request
 * and never permission.
 */
export async function dispatchEverything({ planId, clientKey, lines }) {
  if (!planId) return { ok: false, reason: 'no-event' }
  try {
    const r = await fetch(apiUrl('/api/anchor?op=dispatch-batch'), {
      method: 'POST',
      headers: await authHeaders(),   // already sets content-type
      body: JSON.stringify({ planId, clientKey, lines }),
    })
    const out = await r.json().catch(() => ({}))
    return r.ok ? { ok: true, ...out } : { ok: false, reason: out.error ?? `http-${r.status}` }
  } catch (e) { return { ok: false, reason: e.message } }
}

/** How a batch finished, for the live screen. */
export async function batch(batchId) {
  if (!batchId) return null
  const { data, error } = await supabase.from('sambramo_dispatch_batches')
    .select('id, status, requested_ids, dispatched_ids, skipped, created_at, finished_at').eq('id', batchId).maybeSingle()
  return error ? null : data
}

/* ── What the customer is shown ───────────────────────────────────── */

/** Why a requirement stayed behind, in the customer's words. */
export const SKIP_REASON = {
  already_arranged: 'You’ve arranged this yourself',
  not_required: 'You said you don’t need this',
  planner_managed: 'Your planner is arranging this',
  needs_your_decision: 'Waiting for your decision',
  already_sent: 'Already with professionals',
  not_selected: 'Not added to your plan yet',
  not_configured: 'Tell us what you need first',
  configuration_incomplete: 'A few details still missing',
  not_ready: 'Not ready yet',
}

/**
 * The requirement's state as a customer reads it. The backend words are
 * deliberately not shown: PART 12 of the brief asks for terminology that
 * is friendly AND accurate, so each of these says only what is actually
 * true of the row — nothing here says "confirmed" or "booked", because
 * past dispatch the booking line owns that language, not the plan.
 */
export function requirementLabel(r) {
  if (r.owner === 'arranged') return 'Arranged by you'
  if (r.owner === 'not_needed') return 'Not needed'
  if (r.owner === 'planner') return 'With your planner'
  if (r.owner === 'ask_customer') return 'Needs your decision'
  if (r.state === 'dispatched') return 'Finding your professionals'
  if (r.state === 'ready') return 'Ready to match'
  if (r.state === 'configuring') return `${r.missing_fields?.length || 'A few'} details missing`
  if (r.state === 'suggested') return 'Suggested for you'
  return 'Added to your plan'
}

/** Can this requirement go out? The same question the server answers; asked here only to decide what the button says. */
export const isReady = r => ['customer', 'marketplace'].includes(r.owner) && r.state === 'ready'
  && !['removed', 'arranged'].includes(r.decision) && (r.config_version ?? 0) > 0

/** The counts the review screen and the dashboard show. */
export function progress(reqs = []) {
  const n = { total: reqs.length, ready: 0, configuring: 0, sent: 0, arranged: 0, notNeeded: 0, planner: 0 }
  for (const r of reqs) {
    if (r.owner === 'arranged') n.arranged++
    else if (r.owner === 'not_needed') n.notNeeded++
    else if (r.owner === 'planner') n.planner++
    else if (r.state === 'dispatched') n.sent++
    else if (isReady(r)) n.ready++
    else if (r.state === 'configuring') n.configuring++
  }
  return n
}

/* ── From the phone's plan to the server's requirements ──────────────── */

/**
 * Make sure the event and one requirement per service exist on the server,
 * and save what the customer answered for each — as a new version, checked
 * by the server (203). Returns, per trade, the requirement's id, its code,
 * and whether it is ready to send or what it still needs.
 *
 * A service the customer had marked "not needed" or "arranged" and has now
 * chosen a master for is handed back to the marketplace first — choosing a
 * master IS saying they want it. One already with professionals is left as
 * it is: the server refuses to re-save it, and the batch will not resend it.
 */
export async function syncRequirements({ userId, occasionId, context = {}, services = [] }) {
  if (!userId) return { ok: false, reason: 'signed-out' }
  if (!(await spineReady())) return { ok: false, reason: 'not-migrated' }
  const ev = await ensureEvent({ userId, occasionId, context })
  if (!ev.ok) return { ok: false, reason: ev.reason }
  const reqs = {}
  for (const { tradeId, needs = {} } of services) {
    const r = await ensureRequirement({ planId: ev.id, tradeId })
    if (!r.ok) { reqs[tradeId] = { ok: false, reason: r.reason }; continue }
    if (r.state === 'dispatched') { reqs[tradeId] = { ok: true, id: r.id, code: r.requirement_code, state: 'dispatched', missing: [] }; continue }
    if (['not_needed', 'arranged'].includes(r.owner)) await setRequirementOwner({ planServiceId: r.id, owner: 'marketplace' })
    const saved = await saveRequirement({ planServiceId: r.id, config: needs })
    reqs[tradeId] = saved.ok
      ? { ok: true, id: r.id, code: saved.code ?? r.requirement_code, state: saved.state, missing: saved.missing ?? [] }
      : { ok: false, id: r.id, code: r.requirement_code, refused: !!saved.refused, reason: saved.reason, message: saved.message }
  }
  return { ok: true, planId: ev.id, planCode: ev.plan_code, reqs }
}
