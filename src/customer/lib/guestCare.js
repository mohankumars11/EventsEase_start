/**
 * Guest care and style circles (migration 192).
 *
 * Guest care: each guest's arrival (flight / train / bus / car), pickup,
 * room and departure, written by the guest through rsvp_travel(token);
 * the host's notes for guests (where you're staying, arrival tips) in
 * invitations.care; VIP flags. careTally() turns the guest list into the
 * host's arrivals board: who lands when, pickups to arrange, rooms.
 *
 * Style circles: small groups of guests who agree what to wear, with a
 * chat whose messages can carry an outfit card. Guests act by their RSVP
 * token through SECURITY DEFINER functions; the host works on the rows
 * directly (RLS). Before 192 is applied every call here fails with a
 * "not found" — `missing192(e)` tells the screens to hide the feature.
 */
import { supabase } from '../../lib/supabase'
import { RSVP_ORIGIN } from './rsvp'

export const missing192 = e => !!e && (e.code === 'PGRST202' || e.code === '42703' || e.code === '42P01' || e.code === 'PGRST205' || /schema cache|does not exist|Could not find/i.test(e.message ?? ''))
const fail = e => { const x = new Error(String(e.message ?? '').replace(/^.*?: /, '')); x.code = e.code; x.missing = missing192(e); throw x }

export const TRAVEL_MODES = [['flight', 'Flight', '✈️'], ['train', 'Train', '🚆'], ['bus', 'Bus', '🚌'], ['car', 'Own car', '🚗'], ['local', 'I’m local', '📍']]
export const POINTS = { flight: ['Airport'], train: ['Railway station'], bus: ['Bus stand'], car: [], local: [] }
export const OUTFITS = ['Saree', 'Lehenga', 'Half-saree', 'Kurta set', 'Sherwani', 'Anarkali', 'Dhoti & shirt', 'Bandhgala', 'Gown', 'Dress', 'Suit', 'Indo-western']
export const LOOK_COLORS = ['#DC2626', '#F97316', '#FACC15', '#16A34A', '#0D9488', '#0EA5E9', '#1D4ED8', '#7C3AED', '#DB2777', '#F9A8D4', '#FDE68A', '#D4AF37', '#FFFFFF', '#111827']

/* ── Guest side (no sign-in) ───────────────────────────────────────── */
export async function saveTravel(token, travel) {
  const { data, error } = await supabase.rpc('rsvp_travel', { p_token: token, p_travel: travel })
  if (error) fail(error)
  return data
}
export async function circleFeed(token, since = null) {
  const { data, error } = await supabase.rpc('circle_feed', { p_token: token, p_since: since })
  if (error) fail(error)
  return data
}
export async function circleCreate(token, { name, note = null, colors = [] }) {
  const { data, error } = await supabase.rpc('circle_create', { p_token: token, p_name: name, p_note: note, p_colors: colors })
  if (error) fail(error)
  return data
}
export async function circleJoin(token, join) {
  const { data, error } = await supabase.rpc('circle_join', { p_token: token, p_join: join })
  if (error) fail(error)
  return data
}
export async function circlePost(token, circleId, body, look = null) {
  const { data, error } = await supabase.rpc('circle_post', { p_token: token, p_circle: circleId, p_body: body || null, p_look: look })
  if (error) fail(error)
  return data
}
export async function circleWelcome(join) {
  const { data, error } = await supabase.rpc('circle_welcome', { p_join: join })
  if (error) fail(error)
  return data
}
export async function circleEnter(join, name, phone = null) {
  const { data, error } = await supabase.rpc('circle_enter', { p_join: join, p_name: name, p_phone: phone || null })
  if (error) fail(error)
  return data
}
export const circleLink = join => `${RSVP_ORIGIN}/rsvp/circle/${join}`
export const circleInviteText = (circle, inviteTitle) =>
  `Join our style circle “${circle.name}” for ${inviteTitle} 👗✨ — let’s plan what we’re wearing together, and RSVP while you’re there: ${circleLink(circle.join)}`

/* ── Host side ─────────────────────────────────────────────────────── */
export async function hostCircles(invitationId) {
  const { data, error } = await supabase.from('invitation_circles')
    .select('id, name, note, colors, join_token, created_at, invitation_circle_members(guest_id), invitation_circle_messages(id, author, body, look, guest_id, created_at)')
    .eq('invitation_id', invitationId).order('created_at')
  if (error) fail(error)
  for (const c of data) c.invitation_circle_messages.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return data
}
export async function hostCreateCircle(invitationId, { name, note = null, colors = [], guestIds = [] }) {
  const { data, error } = await supabase.from('invitation_circles').insert({ invitation_id: invitationId, name, note, colors }).select('id, join_token').single()
  if (error) fail(error)
  if (guestIds.length) await addCircleMembers(data.id, guestIds)
  return data
}
export async function addCircleMembers(circleId, guestIds) {
  const { error } = await supabase.from('invitation_circle_members').upsert(guestIds.map(g => ({ circle_id: circleId, guest_id: g })), { onConflict: 'circle_id,guest_id', ignoreDuplicates: true })
  if (error) fail(error)
}
export async function hostPost(circleId, body, look = null) {
  const { error } = await supabase.from('invitation_circle_messages').insert({ circle_id: circleId, author: 'Host', body: body || null, look })
  if (error) fail(error)
}
export async function setVip(guestId, vip) {
  const { error } = await supabase.from('invitation_guests').update({ vip }).eq('id', guestId)
  if (error) fail(error)
}
export async function saveCare(invitationId, care) {
  const { error } = await supabase.from('invitations').update({ care }).eq('id', invitationId)
  if (error) fail(error)
}

/** The host's arrivals board, from the guests' own answers. */
export function careTally(guests = []) {
  const coming = guests.filter(g => g.status !== 'declined')
  const t = { withTravel: 0, byMode: {}, pickups: 0, pickupGuests: 0, rooms: 0, roomNights: 0, stays: 0, drops: 0, vip: 0, arrivals: [] }
  for (const g of coming) {
    if (g.vip) t.vip++
    const tr = g.travel
    if (!tr) continue
    t.withTravel++
    if (tr.mode) t.byMode[tr.mode] = (t.byMode[tr.mode] ?? 0) + 1
    const heads = Math.max(1, (g.adults ?? 0) + (g.kids ?? 0))
    if (tr.pickup) { t.pickups += heads; t.pickupGuests++ }
    if (tr.drop) t.drops++
    if (tr.stay) { t.stays++; t.rooms += tr.rooms || 1; t.roomNights += (tr.rooms || 1) * (tr.nights || 1) }
    if (tr.arrive_at || tr.mode) t.arrivals.push({ ...g, heads })
  }
  t.arrivals.sort((a, b) => (b.vip - a.vip) || String(a.travel.arrive_at ?? '9').localeCompare(String(b.travel.arrive_at ?? '9')))
  return t
}

export const whenLabel = s => {
  if (!s) return 'Time not shared'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
