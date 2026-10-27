/**
 * Invitations & RSVP (migration 191).
 *
 * The host works on their own rows (RLS: host_id = auth.uid()). A guest
 * never signs in: they open /rsvp/<token> and talk to two SECURITY DEFINER
 * functions, rsvp_view and rsvp_submit, which see only that token's card.
 *
 * Links point at the customer web app (sambramoh.vercel.app) so they open
 * in any phone browser — no install. They work once this build is deployed
 * there (see docs/PENDING.md).
 */
import { supabase } from '../../lib/supabase'

export const RSVP_ORIGIN = import.meta.env?.VITE_RSVP_ORIGIN || 'https://sambramoh.vercel.app'
export const rsvpLink = token => `${RSVP_ORIGIN}/rsvp/${token}`

export const STATUS = {
  attending: { label: 'Coming', tone: 'bg-[#E9F8EF] text-[#0B6B3D]' },
  maybe: { label: 'Maybe', tone: 'bg-[#FFF4DA] text-[#8A5300]' },
  declined: { label: 'Can’t come', tone: 'bg-[#F4F1F8] text-[#5F5675]' },
  pending: { label: 'Not replied', tone: 'bg-[#F3ECFF] text-[var(--am-ink)]' },
}
export const MEALS = [['veg', 'Veg'], ['non_veg', 'Non-veg'], ['jain', 'Jain'], ['vegan', 'Vegan'], ['no_preference', 'Anything']]

/* Functions suggested for an occasion, so a wedding starts with its events. */
export const SUGGESTED_FUNCTIONS = {
  wedding: ['Haldi', 'Mehendi', 'Sangeet', 'Wedding ceremony', 'Reception'],
  'engagement-ceremony': ['Engagement', 'Dinner'],
  'naming-ceremony': ['Naming ceremony', 'Lunch'],
  'housewarming-ceremony': ['Griha pravesh pooja', 'Lunch'],
}
export function functionsFor(occasion) {
  if (!occasion) return []
  return SUGGESTED_FUNCTIONS[occasion.id] ?? (occasion.category === 'wedding' ? SUGGESTED_FUNCTIONS.wedding : [])
}

const unmigrated = e => e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message))
const fail = e => { throw Object.assign(new Error(unmigrated(e) ? 'Invitations are not switched on yet (migration 191).' : e.message), { code: e.code }) }

/* ── Host ─────────────────────────────────────────────────────────────── */
export async function myInvitations() {
  const { data, error } = await supabase.from('invitations')
    .select('id, title, hosts_line, occasion_id, event_date, start_time, venue_name, status, cover_key, theme, updated_at, invitation_guests(status, adults, kids, opened_at)')
    .order('updated_at', { ascending: false }).limit(50)
  if (error) fail(error)
  return data
}

export async function getInvitation(id) {
  const { data, error } = await supabase.from('invitations')
    .select('*, invitation_functions(*), invitation_guests(*, invitation_guest_functions(function_id, attending))')
    .eq('id', id).single()
  if (error) fail(error)
  data.invitation_functions.sort((a, b) => a.sort - b.sort)
  data.invitation_guests.sort((a, b) => a.name.localeCompare(b.name))
  return data
}

export async function saveInvitation(inv, functions = null) {
  const row = Object.fromEntries(Object.entries(inv).filter(([k]) => !['invitation_functions', 'invitation_guests', 'created_at', 'updated_at', 'host_id'].includes(k)))
  for (const k of ['event_date', 'start_time', 'rsvp_by', 'map_url', 'occasion_id', 'event_plan_id']) if (row[k] === '') row[k] = null
  const q = row.id ? supabase.from('invitations').update(row).eq('id', row.id) : supabase.from('invitations').insert(row)
  const { data, error } = await q.select('id').single()
  if (error) fail(error)
  if (functions) {
    const keep = functions.filter(f => f.id).map(f => f.id)
    const del = supabase.from('invitation_functions').delete().eq('invitation_id', data.id)
    const r0 = await (keep.length ? del.not('id', 'in', `(${keep.join(',')})`) : del)
    if (r0.error) fail(r0.error)
    const rows = functions.map((f, i) => ({ ...(f.id ? { id: f.id } : {}), invitation_id: data.id, name: f.name.trim(), event_date: f.event_date || null, start_time: f.start_time || null, venue_name: f.venue_name || null, sort: i }))
      .filter(f => f.name)
    if (rows.length) { const r = await supabase.from('invitation_functions').upsert(rows); if (r.error) fail(r.error) }
  }
  return data.id
}

export async function deleteInvitation(id) {
  const { error } = await supabase.from('invitations').delete().eq('id', id)
  if (error) fail(error)
}

const cleanPhone = p => {
  const d = String(p ?? '').replace(/[^0-9+]/g, '')
  if (!d) return null
  const digits = d.replace(/\D/g, '')
  return digits.length === 10 ? `+91${digits}` : d.startsWith('+') ? d : `+${digits}`
}

/**
 * "Ravi Kumar, 98450 12345" lines → guests. Names without a phone are
 * kept; a phone already on the list is skipped (and counted).
 */
export function parseGuestList(text, existing = []) {
  const have = new Set(existing.map(g => g.phone).filter(Boolean))
  const out = [], dupes = []
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/(\+?\d[\d\s-]{7,16}\d)/)
    const phone = m ? cleanPhone(m[1]) : null
    const name = line.replace(m?.[0] ?? '', '').replace(/[,;|\t-]+\s*$/, '').replace(/^[,;|\t-]+/, '').trim()
    if (!name) continue
    if (phone && have.has(phone)) { dupes.push(name); continue }
    if (phone) have.add(phone)
    out.push({ name: name.slice(0, 100), phone })
  }
  return { guests: out, dupes }
}

export async function addGuests(invitationId, guests, { side = null, partyLimit = 2, functionIds = [] } = {}) {
  if (!guests.length) return []
  const { data, error } = await supabase.from('invitation_guests')
    .insert(guests.map(g => ({ invitation_id: invitationId, name: g.name, phone: cleanPhone(g.phone), side: side || null, party_limit: g.party_limit ?? partyLimit })))
    .select('id')
  if (error) fail(error)
  if (functionIds.length && data.length) {
    const r = await supabase.from('invitation_guest_functions').insert(data.flatMap(g => functionIds.map(f => ({ guest_id: g.id, function_id: f, attending: null }))))
    if (r.error) fail(r.error)
  }
  return data
}

export async function updateGuest(id, patch) {
  if ('phone' in patch) patch = { ...patch, phone: cleanPhone(patch.phone) }
  const { error } = await supabase.from('invitation_guests').update(patch).eq('id', id)
  if (error) fail(error)
}
export async function removeGuest(id) {
  const { error } = await supabase.from('invitation_guests').delete().eq('id', id)
  if (error) fail(error)
}

/** Headcount for the dashboard and the plan. */
export function tally(guests = []) {
  const t = { invited: guests.length, attending: 0, maybe: 0, declined: 0, pending: 0, opened: 0, adults: 0, kids: 0, arrived: 0, meals: {} }
  for (const g of guests) {
    t[g.status] = (t[g.status] ?? 0) + 1
    if (g.opened_at) t.opened++
    if (g.checked_in_at) t.arrived++
    if (g.status === 'attending') {
      t.adults += g.adults; t.kids += g.kids
      if (g.meal) t.meals[g.meal] = (t.meals[g.meal] ?? 0) + g.adults + g.kids
    }
  }
  t.heads = t.adults + t.kids
  return t
}

/* ── Sharing ──────────────────────────────────────────────────────────── */
const day = d => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '')
const time = t => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '')

export function inviteText(inv, guest = null, { reminder = false } = {}) {
  const hi = guest ? `Hi ${guest.name.split(' ')[0]}! ` : ''
  const when = [day(inv.event_date), time(inv.start_time)].filter(Boolean).join(', ')
  const where = inv.venue_name ? ` at ${inv.venue_name}` : ''
  const head = reminder ? `${hi}A gentle reminder — please let us know if you can make it to ${inv.title}` : `${hi}You’re invited to ${inv.title}${inv.hosts_line ? ` — ${inv.hosts_line}` : ''}`
  return `${head}${when ? ` on ${when}` : ''}${where}. 💜\nPlease RSVP here: ${rsvpLink(guest ? guest.token : inv.open_token)}`
}

/** WhatsApp to one number (or the chooser when there is none). */
export const whatsappUrl = (text, phone = null) => `https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`

export async function shareText(text, title = 'Invitation') {
  if (navigator.share) { try { await navigator.share({ title, text }); return 'shared' } catch { return 'dismissed' } }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { return 'failed' }
}

export async function markSent(ids, field = 'sent_at') {
  if (!ids.length) return
  const { error } = await supabase.from('invitation_guests').update({ [field]: new Date().toISOString() }).in('id', ids)
  if (error) fail(error)
}

export function guestsCsv(inv, guests) {
  const fn = inv.invitation_functions ?? []
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Name', 'Phone', 'Side', 'Status', 'Adults', 'Kids', 'Meal', 'Note', 'Opened', 'Replied', 'Arrived', ...fn.map(f => f.name)]
  const rows = guests.map(g => [g.name, g.phone, g.side, STATUS[g.status]?.label, g.adults, g.kids, g.meal, g.note, g.opened_at ? 'yes' : '', g.responded_at?.slice(0, 10), g.checked_in_at ? 'yes' : '',
    ...fn.map(f => { const a = g.invitation_guest_functions?.find(x => x.function_id === f.id)?.attending; return a === true ? 'yes' : a === false ? 'no' : '' })])
  return [head, ...rows].map(r => r.map(esc).join(',')).join('\n')
}

/* ── Guest (no sign-in) ───────────────────────────────────────────────── */
export async function viewRsvp(token) {
  const { data, error } = await supabase.rpc('rsvp_view', { p_token: token })
  if (error) fail(error)
  return data
}
export async function submitRsvp(token, answer) {
  const { data, error } = await supabase.rpc('rsvp_submit', {
    p_token: token, p_status: answer.status, p_adults: answer.adults, p_kids: answer.kids, p_meal: answer.meal ?? null,
    p_note: answer.note ?? null, p_functions: answer.functions ?? [], p_name: answer.name ?? null, p_phone: answer.phone ?? null,
  })
  if (error) throw new Error(error.message.replace(/^.*?: /, ''))
  return data
}
