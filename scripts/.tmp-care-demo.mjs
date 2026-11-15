// Temporary: a demo invitation with guest care + a style circle, for screenshots (--delete <id> removes it).
import { createClient } from '@supabase/supabase-js'
const U = process.env.VITE_SUPABASE_URL
const admin = createClient(U, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
if (process.argv[2] === '--delete') { await admin.from('invitations').delete().eq('id', process.argv[3]); console.log('deleted'); process.exit(0) }
const c = createClient(U, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: l } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'mohanpes328a@gmail.com' })
await c.auth.verifyOtp({ token_hash: l.properties.hashed_token, type: 'magiclink' })
const { data: inv } = await c.from('invitations').insert({ title: 'Ananya & Rohit’s Wedding', hosts_line: 'The Rao Family', occasion_id: 'wedding-reception', event_date: '2026-12-12', start_time: '18:30', venue_name: 'Lalitha Mahal Palace, Mysuru', status: 'sent', theme: 'royal|art|live',
  care: { ask_travel: true, stay: { name: 'Radisson Blu Plaza', address: 'MG Road, Mysuru', notes: 'Rooms under “Rao family”, check-in 2 pm' }, tips: 'Prepaid taxi counter at Mysuru station exit', contact: '+919800000099' } }).select('id').single()
const anon = createClient(U, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const rows = [['Ravi Kumar', 2, 1, true, { mode: 'flight', ref: '6E 517', from: 'Delhi', arrive_at: '2026-12-11T09:30', point: 'Bengaluru Airport T2', pickup: true, stay: true, rooms: 1, nights: 2 }],
  ['Meena aunty', 1, 0, false, { mode: 'train', ref: '12614 · B2', from: 'Chennai', arrive_at: '2026-12-11T14:10', point: 'Mysuru Junction', pickup: true, stay: true, rooms: 1, nights: 1 }],
  ['Kavya', 1, 0, false, { mode: 'bus', from: 'Hubballi', arrive_at: '2026-12-12T06:00', pickup: true }],
  ['Suresh & family', 3, 2, false, { mode: 'car', from: 'Bengaluru', arrive_at: '2026-12-12T11:00', stay: true, rooms: 2, nights: 1 }],
  ['Lakshmi', 1, 0, false, null]]
const { data: gs } = await c.from('invitation_guests').insert(rows.map(([n], k) => ({ invitation_id: inv.id, name: n, party_limit: 6, phone: `+9198000001${k}0` }))).select('id, token, name')
for (const [k, [, a, kids, vip, tr]] of rows.entries()) {
  await anon.rpc('rsvp_submit', { p_token: gs[k].token, p_status: 'attending', p_adults: a, p_kids: kids, p_meal: 'veg', p_note: null, p_functions: [] })
  if (tr) await anon.rpc('rsvp_travel', { p_token: gs[k].token, p_travel: tr })
  if (vip) await c.from('invitation_guests').update({ vip: true }).eq('id', gs[k].id)
}
const cc = await anon.rpc('circle_create', { p_token: gs[1].token, p_name: 'Cousins in yellow · Haldi', p_note: 'Yellow & green silk, floral jewellery', p_colors: ['#FACC15', '#16A34A'] })
await anon.rpc('circle_join', { p_token: gs[2].token, p_join: cc.data.join })
await anon.rpc('circle_post', { p_token: gs[1].token, p_circle: cc.data.id, p_body: 'Mustard silk with a green border?', p_look: { outfit: 'Saree', colors: ['#FACC15', '#16A34A'] } })
await anon.rpc('circle_post', { p_token: gs[2].token, p_circle: cc.data.id, p_body: 'Love it! I’ll match in a lehenga 💛', p_look: { outfit: 'Lehenga', colors: ['#FACC15'] } })
console.log(inv.id, gs[2].token)
