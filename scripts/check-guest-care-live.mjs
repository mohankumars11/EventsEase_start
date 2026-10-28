#!/usr/bin/env node
/**
 * Prove guest care and style circles against the live database (migration 192).
 *
 *   node --env-file=.env scripts/check-guest-care-live.mjs
 *
 * As a real host: an invitation that asks for travel, two guests. As a
 * signed-out guest (anon key only): share travel (junk keys dropped),
 * see the host's stay note, start a circle, post a message and an outfit
 * card, read the feed. A relative opens the circle's join link, joins by
 * name and gets their own RSVP token. Then: the host sees the travel, the
 * VIP flag and the circle; another customer sees nothing; anon cannot read
 * the circle tables. Everything created is deleted at the end.
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
const anon = createClient(U, ANON, { auth: { persistSession: false } })
let invId = null
try {
  const { data: inv, error } = await host.c.from('invitations').insert({ title: 'Guest care live check', occasion_id: 'birthday-party', event_date: '2026-12-01', status: 'sent',
    care: { ask_travel: true, stay: { name: 'Test Hotel', address: 'MG Road' }, tips: 'Prepaid taxi at Gate 4' } }).select('id').single()
  check('host creates an invitation with care notes', !error, error?.message)
  invId = inv.id
  const { data: gs } = await host.c.from('invitation_guests').insert([{ invitation_id: invId, name: 'Guest One', phone: '+919800000011' }, { invitation_id: invId, name: 'Guest Two', phone: '+919800000012' }]).select('id, token')
  const [g1, g2] = gs

  const v = await anon.rpc('rsvp_view', { p_token: g1.token })
  check('guest page carries the stay note', v.data?.invitation?.care?.stay?.name === 'Test Hotel', v.error?.message)
  const tr = await anon.rpc('rsvp_travel', { p_token: g1.token, p_travel: { mode: 'flight', ref: '6E 517', arrive_at: '2026-12-01T09:30', pickup: true, stay: true, rooms: 2, nights: 99, evil: 'x', mode2: 1 } })
  check('guest shares travel', !tr.error && tr.data?.travel?.mode === 'flight', tr.error?.message)
  check('unknown keys are dropped, nights capped at 30', tr.data?.travel && !('evil' in tr.data.travel) && tr.data.travel.nights === 30)
  check('bad mode is refused', (await anon.rpc('rsvp_travel', { p_token: g1.token, p_travel: { mode: 'rocket' } })).data?.travel?.mode === undefined)
  await anon.rpc('rsvp_travel', { p_token: g1.token, p_travel: { mode: 'flight', ref: '6E 517', arrive_at: '2026-12-01T09:30', pickup: true, stay: true, rooms: 2, nights: 2 } })
  check('a bad token cannot write travel', !!(await anon.rpc('rsvp_travel', { p_token: 'x'.repeat(40), p_travel: { mode: 'car' } })).error)

  const cc = await anon.rpc('circle_create', { p_token: g1.token, p_name: 'Cousins in yellow', p_note: 'Haldi', p_colors: ['#FACC15', 'not-a-colour'] })
  check('guest starts a circle', !cc.error && !!cc.data?.join, cc.error?.message)
  const post = await anon.rpc('circle_post', { p_token: g1.token, p_circle: cc.data.id, p_body: 'Yellow silk?', p_look: { outfit: 'Saree', colors: ['#FACC15', 'red'] } })
  check('guest posts an outfit card', !post.error, post.error?.message)
  check('a guest outside the circle cannot post', !!(await anon.rpc('circle_post', { p_token: g2.token, p_circle: cc.data.id, p_body: 'hi' })).error)
  check('…but can join with the link', !(await anon.rpc('circle_join', { p_token: g2.token, p_join: cc.data.join })).error)
  const feed = await anon.rpc('circle_feed', { p_token: g2.token })
  const c0 = feed.data?.circles?.[0]
  check('feed shows the circle, both members and the message', c0?.members?.length === 2 && c0?.messages?.length === 1, feed.error?.message)
  check('only valid colours are kept', JSON.stringify(c0?.colors) === '["#FACC15"]' && JSON.stringify(c0?.messages?.[0]?.look?.colors) === '["#FACC15"]')

  const w = await anon.rpc('circle_welcome', { p_join: cc.data.join })
  check('the join link shows the circle to a stranger', w.data?.circle?.name === 'Cousins in yellow', w.error?.message)
  const en = await anon.rpc('circle_enter', { p_join: cc.data.join, p_name: 'Cousin Three', p_phone: '98000 00013' })
  check('a relative joins by name and gets their own RSVP token', !en.error && en.data?.token?.length >= 20, en.error?.message)
  const again = await anon.rpc('circle_enter', { p_join: cc.data.join, p_name: 'Cousin Three', p_phone: '+919800000013' })
  check('joining again with the same phone finds the same guest', again.data?.token === en.data?.token)

  await host.c.from('invitation_guests').update({ vip: true }).eq('id', g1.id)
  const { data: hg } = await host.c.from('invitation_guests').select('name, vip, travel, source').eq('invitation_id', invId).order('name')
  check('host sees travel, VIP and the circle guest', hg?.find(x => x.name === 'Guest One')?.travel?.ref === '6E 517' && hg?.find(x => x.name === 'Guest One')?.vip === true && hg?.some(x => x.source === 'circle'))
  const { data: hc } = await host.c.from('invitation_circles').select('id, invitation_circle_messages(id)').eq('invitation_id', invId)
  check('host sees the circle and its chat', hc?.[0]?.invitation_circle_messages?.length === 1)
  const { data: oc } = await other.c.from('invitation_circles').select('id').eq('invitation_id', invId)
  check('another customer sees no circles', (oc ?? []).length === 0)
  const { data: ac } = await anon.from('invitation_circle_messages').select('id').limit(5)
  check('anon cannot read circle messages directly', (ac ?? []).length === 0)
} catch (e) {
  check('no unexpected error', false, e.message)
} finally {
  if (invId) await admin.from('invitations').delete().eq('id', invId)
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
  process.exit(failed ? 1 : 0)
}
