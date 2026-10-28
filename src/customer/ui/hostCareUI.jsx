/**
 * The host's side of guest care and style circles (migration 192), on the
 * RSVP dashboard (screens/InviteHost.jsx).
 *
 * GuestCarePanel — ask guests how they travel, the arrivals board, the
 * pickups and rooms to arrange, VIPs, where guests stay. Three levels of
 * care for every kind of celebration: Standard (included: the board and
 * the guests' travel details), Plus (pickups and drops booked with
 * verified Guest-transport masters) and VIP (a welcome desk, ushers and
 * valet from the Hosts & ushers masters) — the paid levels are real
 * bookings with real masters, priced by them, never a made-up package.
 *
 * HostCircles — every style circle, its chat (the host speaks as "Host"),
 * new circles with members picked from the guest list, and WhatsApp
 * invites to a circle.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Hotel, Loader2, Plane, Plus, Sparkles, UsersRound } from 'lucide-react'
import { Sheet } from './kit'
import { CircleChat, CircleRow, ColorPick } from './guestCareUI'
import { TRAVEL_MODES, addCircleMembers, careTally, hostCircles, hostCreateCircle, hostPost, saveCare, whenLabel } from '../lib/guestCare'

const field = 'h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]'
const EMOJI = Object.fromEntries(TRAVEL_MODES.map(([id, , e]) => [id, e]))

export function GuestCarePanel({ inv, reload }) {
  const navigate = useNavigate()
  const care = inv.care ?? {}
  const t = careTally(inv.invitation_guests)
  const [all, setAll] = useState(false)
  const [stay, setStay] = useState(false)
  const [busy, setBusy] = useState(false)
  const toggleAsk = async () => { setBusy(true); try { await saveCare(inv.id, { ...care, ask_travel: !care.ask_travel }); await reload() } finally { setBusy(false) } }
  const shown = all ? t.arrivals : t.arrivals.slice(0, 5)
  return (
    <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-guest-care>
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0E7490]"><Plane size={13} />Guest care</p>
      <p className="mt-0.5 text-[18px] font-black tracking-[-0.03em]">From their arrival to your venue</p>
      <button type="button" onClick={toggleAsk} disabled={busy} aria-pressed={!!care.ask_travel} className="mt-3 flex w-full items-center gap-3 rounded-[16px] bg-[#F0FDFF] p-3 text-left ring-1 ring-[#BAE6FD]" data-ask-travel>
        <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold text-[#0C4A6E]">Ask guests how they’re travelling</span><span className="block text-[11.5px] font-semibold text-[#0E7490]">After they RSVP: flight or train, arrival time, pickup, room</span></span>
        <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ' + (care.ask_travel ? 'bg-[#0891B2]' : 'bg-[#E5E0EA]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (care.ask_travel ? 'left-[21px]' : 'left-[3px]')} /></span>
      </button>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {[['Arriving', t.withTravel, '#0E7490', '#ECFEFF'], ['Pickups', t.pickups, '#B45309', '#FFF7E6'], ['Rooms', t.rooms, '#7C3AED', '#F5F0FF'], ['VIP', t.vip, '#B8860B', '#FFF9E6']].map(([l, n, c, bg]) => (
          <span key={l} className="rounded-[14px] py-2.5" style={{ background: bg }}>
            <span className="cx-num block text-[22px] font-black leading-none" style={{ color: c }}>{n}</span>
            <span className="mt-1 block text-[10.5px] font-extrabold text-[var(--ink-2)]">{l}</span>
          </span>
        ))}
      </div>
      {(t.roomNights > 0 || Object.keys(t.byMode).length > 0) && (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold text-[var(--ink-2)]">
          {Object.entries(t.byMode).map(([m, n]) => <span key={m}>{EMOJI[m]} {n}</span>)}
          {t.roomNights > 0 && <span>🏨 {t.roomNights} room-night{t.roomNights === 1 ? '' : 's'}</span>}
          {t.drops > 0 && <span>↩️ {t.drops} drop{t.drops === 1 ? '' : 's'}</span>}
        </p>
      )}

      {t.arrivals.length > 0 ? (
        <ul className="mt-3 divide-y divide-[#F3EEF9] rounded-[16px] bg-[#FBF9FD] px-3 shadow-[inset_0_0_0_1px_#F0EAF6]" data-arrivals>
          {shown.map(g => (
            <li key={g.id} className="flex items-center gap-2.5 py-2.5">
              <span className="text-[20px]">{EMOJI[g.travel.mode] ?? '🧳'}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-[13.5px] font-extrabold">{g.vip && <Crown size={13} className="shrink-0 text-[#B8860B]" />}{g.name}<span className="font-semibold text-[var(--ink-3)]"> · {g.heads}</span></span>
                <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{[g.travel.ref, g.travel.from && `from ${g.travel.from}`, whenLabel(g.travel.arrive_at)].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="flex shrink-0 gap-1">{g.travel.pickup && <span title="Needs pickup">🚖</span>}{g.travel.stay && <span title="Needs a room">🏨</span>}</span>
            </li>
          ))}
          {t.arrivals.length > 5 && <li><button type="button" onClick={() => setAll(x => !x)} className="w-full py-2.5 text-[12.5px] font-extrabold text-[var(--brand)]">{all ? 'Show fewer' : `Show all ${t.arrivals.length} arrivals`}</button></li>}
        </ul>
      ) : <p className="mt-3 rounded-[14px] bg-[#FBF9FD] p-3 text-[12.5px] font-semibold text-[var(--ink-3)]">{care.ask_travel ? 'Arrivals appear here as guests share their travel.' : 'Switch on the question above and guests tell you how they’re arriving.'}</p>}

      <button type="button" onClick={() => setStay(true)} className="mt-3 flex w-full items-center gap-3 rounded-[16px] bg-[#FFF8EB] p-3 text-left ring-1 ring-[#F7DDB0]" data-edit-stay>
        <Hotel size={20} className="shrink-0 text-[#B45309]" />
        <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-extrabold text-[#5A3B12]">{care.stay?.name ? care.stay.name : 'Tell guests where they’re staying'}</span><span className="block truncate text-[11.5px] font-semibold text-[#8A5A1A]">{care.stay?.name ? (care.stay.address || 'Shown on every guest’s invite') : 'Hotel, map, arrival tips, a helpline — on their invite'}</span></span>
        <span className="shrink-0 text-[12.5px] font-extrabold text-[#B45309]">{care.stay?.name ? 'Edit' : 'Add'}</span>
      </button>

      {/* Three levels of care, for every kind of celebration. */}
      <div className="mt-3 grid gap-2" data-care-tiers>
        <Tier tone="#0E7490" bg="#ECFEFF" title="Standard" tag="Included" body="Arrivals board, every guest’s travel and stay, hotel details on their invite." />
        <Tier tone="#B45309" bg="#FFF7E6" title="Plus — pickups & drops" tag="Verified drivers" body={t.pickups ? `${t.pickups} ${t.pickups === 1 ? 'person needs' : 'people need'} a pickup. Book cars or a tempo traveller in one go.` : 'Cars, tempo travellers and coaches from the airport, station or hotel.'}
          cta="Book guest pickups" onClick={() => navigate('/s/passenger_transport')} />
        <Tier tone="#B8860B" bg="#FFF9E6" title="VIP — welcome & concierge" tag="Hosts & ushers" body={t.vip ? `${t.vip} VIP guest${t.vip === 1 ? '' : 's'}. A welcome desk, ushers to seat them, valet at the door.` : 'A welcome desk, ushers and valet for the guests who matter most.'}
          cta="Book a welcome desk" onClick={() => navigate('/s/guest_services')} />
      </div>
      <StaySheet open={stay} onClose={() => setStay(false)} care={care} onSave={async c => { await saveCare(inv.id, c); setStay(false); await reload() }} />
    </section>
  )
}

function Tier({ tone, bg, title, tag, body, cta, onClick }) {
  return (
    <div className="rounded-[16px] p-3" style={{ background: bg }}>
      <div className="flex items-center justify-between gap-2"><p className="text-[13.5px] font-black" style={{ color: tone }}>{title}</p><span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-extrabold" style={{ color: tone }}>{tag}</span></div>
      <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-2)]">{body}</p>
      {cta && <button type="button" onClick={onClick} className="cx-press mt-2 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold text-white" style={{ background: tone }}>{cta} →</button>}
    </div>
  )
}

function StaySheet({ open, onClose, care, onSave }) {
  const [s, setS] = useState(care.stay ?? {})
  const [tips, setTips] = useState(care.tips ?? '')
  const [contact, setContact] = useState(care.contact ?? '')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setS(care.stay ?? {}); setTips(care.tips ?? ''); setContact(care.contact ?? '') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} title="Where guests stay"
      footer={<button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onSave({ ...care, stay: s.name ? s : null, tips: tips.trim() || null, contact: contact.trim() || null }) } finally { setBusy(false) } }} className="cx-press cx-cta flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-extrabold">{busy && <Loader2 size={16} className="animate-spin" />}Save for every guest</button>}>
      <div className="space-y-2.5 pb-2">
        <input value={s.name ?? ''} onChange={e => setS(x => ({ ...x, name: e.target.value }))} maxLength={120} placeholder="Hotel — e.g. Radisson Blu, Mysuru" className={field} />
        <input value={s.address ?? ''} onChange={e => setS(x => ({ ...x, address: e.target.value }))} maxLength={240} placeholder="Address" className={field} />
        <input value={s.map ?? ''} onChange={e => setS(x => ({ ...x, map: e.target.value }))} maxLength={300} placeholder="Google Maps link (optional)" className={field} />
        <input value={s.notes ?? ''} onChange={e => setS(x => ({ ...x, notes: e.target.value }))} maxLength={240} placeholder="Notes — e.g. Rooms under ‘Rao family’, check-in 2 pm" className={field} />
        <input value={tips} onChange={e => setTips(e.target.value)} maxLength={300} placeholder="Arrival tips — e.g. Prepaid taxi counter at Gate 4" className={field} />
        <input value={contact} onChange={e => setContact(e.target.value)} inputMode="tel" maxLength={16} placeholder="Guest helpline number (optional)" className={field} />
      </div>
    </Sheet>
  )
}

/* ── Style circles, the host's view ────────────────────────────────── */
export function HostCircles({ inv }) {
  const [list, setList] = useState(undefined)
  const [open, setOpen] = useState(null)
  const [making, setMaking] = useState(false)
  const guests = inv.invitation_guests
  const load = () => hostCircles(inv.id).then(setList).catch(e => setList(e.missing ? null : []))
  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 8000)
    return () => clearInterval(t)
  }, [inv.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return null
  const name = id => guests.find(g => g.id === id)?.name
  const c = list.find(x => x.id === open)
  const members = c ? c.invitation_circle_members.map(m => name(m.guest_id)).filter(Boolean) : []
  return (
    <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-host-circles>
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#DB2777]"><Sparkles size={13} />Style circles</p>
      <p className="mt-0.5 text-[18px] font-black tracking-[-0.03em]">Matching outfits, planned together</p>
      <p className="text-[12px] font-semibold text-[var(--ink-3)]">Cousins in yellow for Haldi, the bride’s friends in pastels — each circle chats and shares looks on their invite.</p>
      <div className="mt-3 space-y-2">
        {list.map(x => <CircleRow key={x.id} c={x} count={x.invitation_circle_members.length} last={x.invitation_circle_messages[x.invitation_circle_messages.length - 1]} onOpen={() => setOpen(x.id)} />)}
        <button type="button" onClick={() => setMaking(true)} className="cx-press flex w-full items-center justify-center gap-1.5 rounded-[16px] border-2 border-dashed border-[#FBCFE8] py-3 text-[13.5px] font-extrabold text-[#DB2777]" data-host-new-circle><Plus size={16} />New circle</button>
      </div>
      <Sheet open={!!c} onClose={() => setOpen(null)} title={c?.name ?? ''}>
        {c && (
          <>
            <CircleChat hostView circle={{ ...c, join: c.join_token }} members={members} inviteTitle={inv.title}
              messages={c.invitation_circle_messages.map(m => ({ ...m, host: m.guest_id == null }))}
              onSend={async (body, look) => { await hostPost(c.id, body, look); await load() }} />
            <AddMembers guests={guests.filter(g => !c.invitation_circle_members.some(m => m.guest_id === g.id))} onAdd={async ids => { await addCircleMembers(c.id, ids); await load() }} />
          </>
        )}
      </Sheet>
      <NewHostCircle open={making} onClose={() => setMaking(false)} guests={guests} onMake={async v => { const r = await hostCreateCircle(inv.id, v); setMaking(false); await load(); setOpen(r.id) }} />
    </section>
  )
}

function AddMembers({ guests, onAdd }) {
  const [pick, setPick] = useState([])
  if (!guests.length) return null
  return (
    <div className="mt-4 border-t border-[#F3EEF9] pt-3">
      <p className="flex items-center gap-1.5 text-[13px] font-extrabold"><UsersRound size={15} className="text-[var(--brand)]" />Add guests to this circle</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {guests.slice(0, 40).map(g => <button key={g.id} type="button" onClick={() => setPick(p => (p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id]))} className={'rounded-full px-3 py-1.5 text-[12.5px] font-bold ' + (pick.includes(g.id) ? 'bg-[#7C3AED] text-white' : 'bg-[#F4F1F8] text-[var(--ink-2)]')}>{g.name}</button>)}
      </div>
      {pick.length > 0 && <button type="button" onClick={async () => { await onAdd(pick); setPick([]) }} className="cx-press cx-cta mt-2 h-11 w-full rounded-[14px] text-[14px] font-extrabold">Add {pick.length}</button>}
    </div>
  )
}

function NewHostCircle({ open, onClose, guests, onMake }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [colors, setColors] = useState([])
  const [ids, setIds] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="New style circle"
      footer={<button type="button" disabled={name.trim().length < 2 || busy} onClick={async () => { setBusy(true); setErr(''); try { await onMake({ name: name.trim(), note: note.trim() || null, colors, guestIds: ids }); setName(''); setNote(''); setColors([]); setIds([]) } catch (e) { setErr(e.message) } finally { setBusy(false) } }}
        className="cx-press cx-cta flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-extrabold disabled:opacity-40">{busy && <Loader2 size={16} className="animate-spin" />}Create circle{ids.length ? ` with ${ids.length}` : ''}</button>}>
      <div className="space-y-3 pb-2">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Name — e.g. Groom’s cousins · Sangeet" className={field} />
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="The look — e.g. Black & gold, sequins" className={field} />
        <div><p className="text-[13px] font-extrabold">Colour theme</p><ColorPick value={colors} onChange={setColors} max={4} /></div>
        <div><p className="text-[13px] font-extrabold">Who’s in it</p>
          <div className="mt-2 flex max-h-[30vh] flex-wrap gap-1.5 overflow-y-auto">
            {guests.map(g => <button key={g.id} type="button" onClick={() => setIds(p => (p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id]))} className={'rounded-full px-3 py-1.5 text-[12.5px] font-bold ' + (ids.includes(g.id) ? 'bg-[#DB2777] text-white' : 'bg-[#F4F1F8] text-[var(--ink-2)]')}>{g.name}</button>)}
            {!guests.length && <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">Add guests first — or share the circle’s link once it’s made.</p>}
          </div>
        </div>
        {err && <p className="text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      </div>
    </Sheet>
  )
}
