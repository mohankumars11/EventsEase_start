#!/usr/bin/env node
/**
 * Prove Invitations & RSVP against the live database (migration 191).
 *
 *   node --env-file=.env scripts/check-rsvp-live.mjs
 *
 * As a real host session: create an invitation with two functions, add a
 * guest. As a signed-out guest (anon key only): view by token, answer.
 * Then: the host sees the answer; another customer sees nothing; anon
 * cannot read the tables; the party limit and the open link hold.
 * Everything it creates is deleted at the end, pass or fail.
 */
import { createClient } from '@supabase/supabase-js'

const U = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(U, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
async function as(email) {
  const c = createClient(U, ANON, { auth: { persistSession: false } })
  const { data: l, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const { data } = await c.auth.verifyOtp({ token_hash: l.properties.hashed_token, type: 'magiclink' })
  return { c, id: data.user.id }
}
let failed = 0
const check = (label, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`); if (!ok) failed++ }

const host = await as(process.env.RSVP_HOST_EMAIL ?? 'mohanpes328a@gmail.com')
const other = await as(process.env.RSVP_OTHER_EMAIL ?? 'sambramo.partner1.test@gmail.com')
const guestClient = createClient(U, ANON, { auth: { persistSession: false } })
let invId = null
try {
  const { data: inv, error } = await host.c.from('invitations').insert({ title: 'RSVP live check', occasion_id: 'birthday-party', event_date: '2026-12-01', start_time: '19:00', status: 'sent', open_enabled: true }).select('id, open_token').single()
  check('host creates an invitation', !error, error?.message)
  invId = inv.id
  const { data: fns } = await host.c.from('invitation_functions').insert([{ invitation_id: invId, name: 'Pooja', sort: 0 }, { invitation_id: invId, name: 'Dinner', sort: 1 }]).select('id, name')
  check('host adds functions', fns?.length === 2)
  const { data: g, error: ge } = await host.c.from('invitation_guests').insert({ invitation_id: invId, name: 'Test Guest', phone: '+919800000001', party_limit: 3 }).select('id, token').single()
  check('host adds a guest', !ge, ge?.message)

  const v = await guestClient.rpc('rsvp_view', { p_token: g.token })
  check('guest views by token (anon)', v.data?.invitation?.title === 'RSVP live check' && v.data.functions.length === 2, v.error?.message)
  check('view hides phone numbers and host id', !JSON.stringify(v.data).includes('9800000001') && !JSON.stringify(v.data).includes(host.id))
  const over = await guestClient.rpc('rsvp_submit', { p_token: g.token, p_status: 'attending', p_adults: 3, p_kids: 1, p_meal: 'veg', p_note: null, p_functions: [] })
  check('party limit is enforced', !!over.error, over.error?.message)
  const s = await guestClient.rpc('rsvp_submit', { p_token: g.token, p_status: 'attending', p_adults: 2, p_kids: 1, p_meal: 'jain', p_note: 'Coming!',
    p_functions: [{ id: fns[0].id, attending: true }, { id: fns[1].id, attending: false }] })
  check('guest answers (anon)', s.data?.ok === true, s.error?.message)

  const { data: seen } = await host.c.from('invitation_guests').select('status, adults, kids, meal, opened_at, responded_at, invitation_guest_functions(function_id, attending)').eq('id', g.id).single()
  check('host sees the answer', seen.status === 'attending' && seen.adults === 2 && seen.kids === 1 && seen.meal === 'jain' && !!seen.opened_at && !!seen.responded_at)
  check('host sees per-function answers', seen.invitation_guest_functions.filter(x => x.attending).length === 1)

  check('another customer cannot read it', ((await other.c.from('invitations').select('id').eq('id', invId)).data ?? []).length === 0)
  check('another customer cannot read its guests', ((await other.c.from('invitation_guests').select('id').eq('invitation_id', invId)).data ?? []).length === 0)
  const sneak = await other.c.from('invitation_guests').insert({ invitation_id: invId, name: 'Intruder' })
  check('another customer cannot add guests', !!sneak.error)
  check('anon cannot read the tables', ((await guestClient.from('invitation_guests').select('id').eq('invitation_id', invId)).data ?? []).length === 0)

  const o = await guestClient.rpc('rsvp_submit', { p_token: inv.open_token, p_status: 'maybe', p_adults: 1, p_kids: 0, p_meal: null, p_note: null, p_functions: [], p_name: 'Open Link Person', p_phone: '98000 00002' })
  check('open link adds a guest', o.data?.ok === true, o.error?.message)
  const noName = await guestClient.rpc('rsvp_submit', { p_token: inv.open_token, p_status: 'maybe', p_adults: 1, p_kids: 0, p_meal: null, p_note: null, p_functions: [], p_name: '', p_phone: null })
  check('open link needs a name', !!noName.error)
  const bad = await guestClient.rpc('rsvp_view', { p_token: 'not-a-real-token-at-all-000000' })
  check('unknown token returns nothing', bad.data === null && !bad.error)
  await host.c.from('invitations').update({ status: 'closed' }).eq('id', invId)
  const late = await guestClient.rpc('rsvp_submit', { p_token: g.token, p_status: 'declined', p_adults: 0, p_kids: 0, p_meal: null, p_note: null, p_functions: [] })
  check('closed invitation refuses answers', !!late.error)
} catch (e) {
  check('run', false, e.message)
} finally {
  if (invId) await admin.from('invitations').delete().eq('id', invId)
}
console.log(failed ? `FAILED: ${failed}` : 'all RSVP checks passed')
process.exit(failed ? 1 : 0)
