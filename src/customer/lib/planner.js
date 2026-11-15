/**
 * The Event Planner (Mode B, migration 210) — "Arrange everything for me".
 *
 *   brief      what a planner needs on top of the event: scope, an optional
 *              budget, what is already arranged, what the planner should
 *              handle, priorities, theme, constraints. Never the event's
 *              date, guests or place again — those are on the event.
 *   send       to EVERY eligible planner at once, as quote requests in one
 *              group (the server takes the group from the brief). Accepting
 *              one closes the rest (api/accept-custom-quote).
 *   track      per planner: asked → acknowledged → proposal → accepted, or
 *              declined — acknowledged is not a proposal, and the screen
 *              never treats it as one.
 *   engage     accepting a proposal opens the engagement; paying the fee
 *              makes them the event's planner (210's trigger).
 *   approve    a planner proposes requirements on the event; each waits for
 *              the customer's yes (sambramo_customer_decide_requirement).
 */
import { supabase } from '../../lib/supabase'
import { partnersFor, rank } from './market'
import { filterByNeeds } from './needs'
import { quoteLine } from './booking'
import { lineOf, some } from './liveMatch'
import { asLine } from './quote'
import { ensureEvent } from './eventSpine'
import { TRADE } from '../data/trades'

export const PLANNER_TRADE = 'wedding_planning'

export const SCOPES = [
  { id: 'plan', title: 'Plan my event', line: 'A complete plan, the right vendors and a budget — you book and run it.' },
  { id: 'plan_coordinate', title: 'Plan and coordinate', line: 'The plan, the vendors arranged, and someone running the day.' },
  { id: 'full', title: 'Complete event management', line: 'Everything, from the first idea to the last guest leaving.' },
]
export const PRIORITIES = ['Food', 'Décor', 'Photos & video', 'Music & entertainment', 'Guest comfort', 'Staying on budget', 'Rituals done right', 'Smooth timing']

/* A missing table means migration 210 is not pasted yet — said as such, never as a raw database message. */
const fail = e => ({ ok: false, reason: /does not exist|schema cache|PGRST20[25]/i.test(e?.message ?? '') ? 'not-migrated' : (e?.message ?? String(e)) })

/** The open brief for this event, if any. */
export async function briefFor(planId) {
  if (!planId) return null
  const { data } = await supabase.from('sambramo_planner_briefs').select('*').eq('plan_id', planId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ?? null
}

/** Save the brief as a draft (one open brief per event — this edits it). */
export async function saveBrief({ userId, occasionId, context, brief }) {
  const ev = await ensureEvent({ userId, occasionId, context })
  if (!ev.ok) return ev
  const open = await briefFor(ev.id)
  if (open?.status === 'sent') return { ok: true, id: open.id, planId: ev.id, sent: true, brief: open }
  const row = {
    plan_id: ev.id, customer_id: userId, status: 'draft',
    scope: brief.scope, budget_min_paise: brief.budgetMin ?? null, budget_max_paise: brief.budgetMax ?? null,
    arranged_trades: brief.arranged ?? [], planner_trades: brief.plannerTrades ?? [], theme: brief.theme?.trim() || null,
    reference_urls: (brief.references ?? []).slice(0, 5), priorities: (brief.priorities ?? []).slice(0, 8),
    special: brief.special?.trim() || null, must_not_change: brief.mustNotChange?.trim() || null, contact_pref: brief.contact ?? null,
  }
  const r = open?.status === 'draft'
    ? await supabase.from('sambramo_planner_briefs').update({ ...row, updated_at: new Date().toISOString() }).eq('id', open.id).select('*').single()
    : await supabase.from('sambramo_planner_briefs').insert(row).select('*').single()
  return r.error ? fail(r.error) : { ok: true, id: r.data.id, planId: ev.id, brief: r.data }
}

/** Every planner near the event who can take it (guests, scope), best first. */
export async function eligiblePlanners({ event = {}, place = {}, needs = {} } = {}) {
  const all = await partnersFor(PLANNER_TRADE, place?.lat ? { lat: place.lat, lng: place.lng, limit: 100 } : { limit: 100 })
  return rank(filterByNeeds(all, PLANNER_TRADE, needs, event.guests).list ?? all)
}

/** What a planner reads first: the brief, in one paragraph. */
export function briefText(b, { occasionName = null } = {}) {
  const scope = SCOPES.find(s => s.id === b.scope)?.title
  const rupee = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')
  const budget = b.budget_max_paise ? `${b.budget_min_paise ? rupee(b.budget_min_paise) + '–' : 'up to '}${rupee(b.budget_max_paise)}` : null
  const label = ids => ids.map(t => TRADE[t]?.label ?? t).join(', ')
  return [
    `${scope ?? 'Planning'}${occasionName ? ` for a ${occasionName}` : ''}`,
    budget && `Budget ${budget}`,
    b.planner_trades?.length && `Please arrange: ${label(b.planner_trades)}`,
    b.arranged_trades?.length && `Already arranged: ${label(b.arranged_trades)}`,
    b.priorities?.length && `What matters most: ${b.priorities.join(', ')}`,
    b.theme && `Theme: ${b.theme}`,
    b.must_not_change && `Must not change: ${b.must_not_change}`,
    b.special && `Also: ${b.special}`,
  ].filter(Boolean).join(' · ')
}

/**
 * Send the brief: mark it sent (the server sets the group and when an
 * answer is due), then put it to every eligible planner, a few at a time.
 * Each request carries the brief's id; the server takes the group from the
 * brief, so the phone cannot attach a proposal to the wrong one.
 */
export async function sendBrief({ brief, planners, occasionId, event, place, venue, occasionName }) {
  const { data, error } = await supabase.rpc('sambramo_send_planner_brief', { p_brief_id: brief.id })
  if (error) return fail(error)
  const due = data?.[0] ?? {}
  const note = briefText(brief, { occasionName })
  const sent = await some(planners.map(p => () => quoteLine(lineOf(asLine(p), occasionId), event, place, { note, venue, plannerBriefId: brief.id })
    .then(r => ({ serviceId: p.serviceId, name: p.name, ok: !!r?.quoteRequestId, quoteRequestId: r?.quoteRequestId ?? null, reason: r?.reasons_text?.[0] ?? r?.error ?? null }))
    .catch(e => ({ serviceId: p.serviceId, name: p.name, ok: false, reason: e.message }))), 4)
  return { ok: sent.some(x => x.ok), sent, ackDue: due.out_ack_due, proposalDue: due.out_proposal_due }
}

/**
 * Where each planner stands, from the database:
 *   declined      they cannot take it
 *   accepted      the customer accepted their proposal
 *   proposal      a proposal is in — fee, scope, itemised lines
 *   acknowledged  they said "on it"; no proposal yet
 *   asked         nothing yet
 */
export async function proposalsFor(briefId) {
  if (!briefId) return []
  const { data: reqs, error } = await supabase.from('sambramo_quote_requests')
    .select('id, vendor_id, vendor_service_id, service_name, state, acknowledged_at, created_at, expires_at')
    .eq('planner_brief_id', briefId)
  if (error || !reqs?.length) return []
  const ids = reqs.map(r => r.id)
  const [{ data: resp }, { data: items }] = await Promise.all([
    supabase.from('sambramo_quote_responses').select('id, quote_request_id, status, customer_amount_paise, inclusions, exclusions, quote_valid_until, notes, proposal, created_at').in('quote_request_id', ids),
    supabase.from('sambramo_quote_line_items').select('quote_request_id, description, quantity, unit, unit_take_home_paise, charged, is_estimate, estimate_note, source, sort_order').in('quote_request_id', ids),
  ])
  return reqs.map(r => {
    const rs = (resp ?? []).filter(x => x.quote_request_id === r.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    const p = rs[0] ?? null
    const status = r.state === 'UNAVAILABLE' ? 'declined' : p?.status === 'ACCEPTED' ? 'accepted' : p ? 'proposal' : r.acknowledged_at ? 'acknowledged' : 'asked'
    const lines = (items ?? []).filter(x => x.quote_request_id === r.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return { request: r, response: p, status, lines,
      /* The planner's fee is never mixed with what vendors will cost, and an
         estimate is never shown as confirmed — the brief's two rules. */
      fee: lines.filter(l => l.source === 'planner_fee'), vendors: lines.filter(l => l.source !== 'planner_fee'),
      estimated: lines.some(l => l.is_estimate) }
  })
}

/** The engagement on this event, if a proposal was accepted. */
export async function engagementFor(planId) {
  if (!planId) return null
  const { data } = await supabase.from('sambramo_planner_engagements').select('*').eq('plan_id', planId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ?? null
}

/** The customer's answer to a requirement their planner proposed. */
export async function decideRequirement(planServiceId, approve) {
  const { data, error } = await supabase.rpc('sambramo_customer_decide_requirement', { p_plan_service_id: planServiceId, p_approve: !!approve })
  return error ? fail(error) : { ok: true, owner: data }
}
