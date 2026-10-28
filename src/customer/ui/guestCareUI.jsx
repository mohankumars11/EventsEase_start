/**
 * Guest care and style circles — the pieces shared by the guest's page
 * (screens/Rsvp.jsx), the circle-join page and the host's dashboard.
 *
 *   TravelForm   how and when I arrive, pickup / drop / room, when I leave
 *   StayCard     where the host has put guests up, and arrival tips
 *   GuestCircles the guest's style circles, start one, invite a relative
 *   CircleChat   one circle's chat: messages and outfit cards
 *   LookBadge    an outfit card: what I'm wearing, in which colours
 */
import { useEffect, useRef, useState } from 'react'
import { Check, Hotel, Loader2, MapPin, Minus, Phone, Plus, Send, Shirt, Sparkles, UserPlus, X } from 'lucide-react'
import { Sheet } from './kit'
import { whatsappUrl } from '../lib/rsvp'
import { LOOK_COLORS, OUTFITS, POINTS, TRAVEL_MODES, circleCreate, circleFeed, circleInviteText, circlePost, whenLabel } from '../lib/guestCare'

const field = 'h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[14.5px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]'

/* ── Travel & stay (guest) ─────────────────────────────────────────── */
export function TravelForm({ initial, hostName, onSave }) {
  const [t, setT] = useState(initial ?? {})
  const [edit, setEdit] = useState(!initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = p => setT(x => ({ ...x, ...p }))
  const far = ['flight', 'train', 'bus'].includes(t.mode)
  async function save() {
    setBusy(true); setErr('')
    try { const r = await onSave(t); setT(r?.travel ?? t); setEdit(false) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  if (!edit) {
    const m = TRAVEL_MODES.find(x => x[0] === t.mode)
    return (
      <section className="rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-travel-saved>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-extrabold">Your travel & stay</p>
          <button type="button" onClick={() => setEdit(true)} className="text-[13px] font-extrabold text-[var(--brand)]">Edit</button>
        </div>
        <p className="mt-1.5 text-[14px] font-bold text-[var(--ink)]">{m ? `${m[2]} ${m[1]}` : 'Not shared yet'}{t.ref ? ` · ${t.ref}` : ''}{t.from ? ` from ${t.from}` : ''}</p>
        {t.arrive_at && <p className="text-[12.5px] font-semibold text-[var(--ink-2)]">Arriving {whenLabel(t.arrive_at)}{t.point ? ` at ${t.point}` : ''}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.pickup && <Tag>🚖 Pickup requested</Tag>}{t.drop && <Tag>↩️ Drop back requested</Tag>}
          {t.stay && <Tag>🏨 {t.rooms || 1} room{(t.rooms || 1) > 1 ? 's' : ''} · {t.nights || 1} night{(t.nights || 1) > 1 ? 's' : ''}</Tag>}
        </div>
        <p className="mt-2 text-[12px] font-semibold text-[#0B6B3D]">✓ {hostName ? `${hostName} can` : 'The host can'} see this and arrange it for you.</p>
      </section>
    )
  }
  return (
    <section className="rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-travel-form>
      <p className="text-[15px] font-extrabold">How are you getting here?</p>
      <p className="text-[12px] font-semibold text-[var(--ink-3)]">Share it once — {hostName ? hostName : 'the host'} sorts your pickup and stay.</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {TRAVEL_MODES.map(([id, l, e]) => (
          <button key={id} type="button" onClick={() => set({ mode: id, point: POINTS[id]?.[0] ?? t.point, pickup: id === 'local' || id === 'car' ? false : t.pickup })} aria-pressed={t.mode === id} data-travel-mode={id}
            className={'cx-press flex flex-col items-center gap-0.5 rounded-[14px] py-2 text-[10.5px] font-extrabold transition ' + (t.mode === id ? 'bg-[#F3ECFF] text-[#5B21B6] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#FAF8FD] text-[var(--ink-2)]')}>
            <span className="text-[19px] leading-none">{e}</span>{l}
          </button>
        ))}
      </div>
      {t.mode && t.mode !== 'local' && (
        <div className="mt-3 space-y-2">
          <input value={t.from ?? ''} onChange={e => set({ from: e.target.value })} maxLength={80} placeholder="Coming from (city)" className={field} />
          {far && <input value={t.ref ?? ''} onChange={e => set({ ref: e.target.value.toUpperCase() })} maxLength={40} placeholder={t.mode === 'flight' ? 'Flight number — e.g. 6E 517' : t.mode === 'train' ? 'Train number & coach' : 'Bus operator / number'} className={field} />}
          <label className="flex items-center gap-2 rounded-[13px] bg-[#FAF8FD] px-3.5 ring-1 ring-[#E7E1F0]"><span className="shrink-0 text-[12.5px] font-extrabold text-[var(--ink-3)]">Arriving</span>
            <input type="datetime-local" value={t.arrive_at ?? ''} onChange={e => set({ arrive_at: e.target.value })} className="h-12 min-w-0 flex-1 bg-transparent text-right text-[14px] font-bold outline-none" /></label>
          {far && <input value={t.point ?? ''} onChange={e => set({ point: e.target.value })} maxLength={120} placeholder="Arriving at — e.g. Bengaluru Airport T2" className={field} />}
        </div>
      )}
      <div className="mt-3 divide-y divide-[#F3EEF9]">
        {far && <Toggle on={!!t.pickup} onClick={() => set({ pickup: !t.pickup })} title="I need a pickup" sub="From where you arrive, to the venue or hotel" />}
        {t.mode && t.mode !== 'local' && <Toggle on={!!t.drop} onClick={() => set({ drop: !t.drop })} title="I need a drop back" sub="To the airport / station when you leave" />}
        {t.mode && t.mode !== 'local' && <Toggle on={!!t.stay} onClick={() => set({ stay: !t.stay, rooms: t.rooms || 1, nights: t.nights || 1 })} title="I need a room" sub="The host can book you near the venue" />}
      </div>
      {t.stay && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Step label="Rooms" value={t.rooms || 1} min={1} max={20} onChange={v => set({ rooms: v })} />
          <Step label="Nights" value={t.nights || 1} min={1} max={30} onChange={v => set({ nights: v })} />
        </div>
      )}
      {t.mode && t.mode !== 'local' && (
        <label className="mt-2 flex items-center gap-2 rounded-[13px] bg-[#FAF8FD] px-3.5 ring-1 ring-[#E7E1F0]"><span className="shrink-0 text-[12.5px] font-extrabold text-[var(--ink-3)]">Leaving</span>
          <input type="datetime-local" value={t.depart_at ?? ''} onChange={e => set({ depart_at: e.target.value })} className="h-12 min-w-0 flex-1 bg-transparent text-right text-[14px] font-bold outline-none" /></label>
      )}
      {t.mode && <input value={t.needs ?? ''} onChange={e => set({ needs: e.target.value })} maxLength={300} placeholder="Anything we should know? Elderly parents, a wheelchair, an infant…" className={field + ' mt-2'} />}
      {err && <p className="mt-2 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      <button type="button" disabled={!t.mode || busy} onClick={save} className="cx-press cx-cta mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-extrabold disabled:opacity-40" data-travel-save>
        {busy && <Loader2 size={16} className="animate-spin" />}Share my travel plan
      </button>
    </section>
  )
}

/* ── Where the host has put guests up ──────────────────────────────── */
export function StayCard({ care }) {
  const s = care?.stay
  if (!s?.name && !care?.tips && !care?.contact) return null
  return (
    <section className="rounded-[22px] bg-gradient-to-br from-[#FFF8EB] to-[#FFF1DC] p-4 ring-1 ring-[#F7DDB0]" data-stay-card>
      {s?.name && <>
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]"><Hotel size={13} />Where you’re staying</p>
        <p className="mt-1 text-[16px] font-black text-[#3B2A0F]">{s.name}</p>
        {s.address && <p className="text-[12.5px] font-semibold text-[#6B4E1F]">{s.address}</p>}
        {s.notes && <p className="mt-1 text-[12.5px] font-semibold text-[#6B4E1F]">{s.notes}</p>}
      </>}
      {care?.tips && <p className="mt-2 rounded-[12px] bg-white/70 px-3 py-2 text-[12.5px] font-semibold text-[#5A3B12]">💡 {care.tips}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(s?.map || s?.address) && <a href={s.map || `https://maps.google.com/?q=${encodeURIComponent([s.name, s.address].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer" className="cx-press flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#7A3E00]"><MapPin size={15} />Hotel directions</a>}
        {care?.contact && <a href={`tel:${care.contact}`} className="cx-press flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#7A3E00]"><Phone size={15} />Guest helpline</a>}
      </div>
    </section>
  )
}

/* ── The guest's style circles ─────────────────────────────────────── */
export function GuestCircles({ token, inviteTitle, focus = false }) {
  const [feed, setFeed] = useState(undefined)
  const [open, setOpen] = useState(null)
  const [making, setMaking] = useState(false)
  const load = () => circleFeed(token).then(setFeed).catch(e => setFeed(e.missing ? null : feed ?? { circles: [] }))
  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 6000)
    return () => clearInterval(t)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focus && feed?.circles?.length && !open) setOpen(feed.circles[feed.circles.length - 1].id) }, [focus, feed?.circles?.length]) // eslint-disable-line react-hooks/exhaustive-deps
  if (feed === undefined || feed === null) return null
  const circle = feed.circles.find(c => c.id === open)
  return (
    <section className="rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-guest-circles>
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#DB2777]"><Sparkles size={13} />Style circles</p>
      <p className="mt-0.5 text-[16px] font-black tracking-[-0.02em]">Twinning with the family?</p>
      <p className="text-[12.5px] font-semibold text-[var(--ink-3)]">Plan matching outfits together — share what you’re wearing, pick the colours.</p>
      <div className="mt-3 space-y-2">
        {feed.circles.map(c => <CircleRow key={c.id} c={c} last={c.messages[c.messages.length - 1]} onOpen={() => setOpen(c.id)} />)}
        <button type="button" onClick={() => setMaking(true)} className="cx-press flex w-full items-center justify-center gap-1.5 rounded-[16px] border-2 border-dashed border-[#E9D5FF] py-3 text-[13.5px] font-extrabold text-[#7C3AED]" data-new-circle><Plus size={16} />Start a style circle</button>
      </div>
      <NewCircle open={making} onClose={() => setMaking(false)} onMake={async v => { const r = await circleCreate(token, v); setMaking(false); await load(); setOpen(r.id) }} />
      <Sheet open={!!circle} onClose={() => setOpen(null)} title={circle?.name ?? ''}>
        {circle && <CircleChat circle={{ ...circle, join: circle.join }} messages={circle.messages} inviteTitle={inviteTitle} members={circle.members}
          onSend={async (body, look) => { await circlePost(token, circle.id, body, look); await load() }} />}
      </Sheet>
    </section>
  )
}

export function CircleRow({ c, last, onOpen, count }) {
  return (
    <button type="button" onClick={onOpen} className="cx-press flex w-full items-center gap-3 rounded-[16px] bg-[#FBF9FD] p-3 text-left shadow-[inset_0_0_0_1px_#F0EAF6]" data-circle={c.id}>
      <Swatches colors={c.colors} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-extrabold">{c.name}</span>
        <span className="block truncate text-[12px] font-semibold text-[var(--ink-3)]">{last ? `${last.author}: ${last.look?.outfit ? `👗 ${last.look.outfit}` : last.body}` : (c.note || 'Say hello and share your look')}</span>
      </span>
      <span className="shrink-0 rounded-full bg-[#F3ECFF] px-2 py-1 text-[11px] font-extrabold text-[#5B21B6]">{count ?? c.members?.length ?? 0} 👥</span>
    </button>
  )
}

function NewCircle({ open, onClose, onMake }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [colors, setColors] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="Start a style circle"
      footer={<button type="button" disabled={name.trim().length < 2 || busy} onClick={async () => { setBusy(true); setErr(''); try { await onMake({ name: name.trim(), note: note.trim() || null, colors }); setName(''); setNote(''); setColors([]) } catch (e) { setErr(e.message) } finally { setBusy(false) } }}
        className="cx-press cx-cta flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-extrabold disabled:opacity-40" data-make-circle>{busy && <Loader2 size={16} className="animate-spin" />}Create circle</button>}>
      <div className="space-y-3 pb-2">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Circle name — e.g. Cousins in yellow for Haldi" className={field} />
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="The idea (optional) — e.g. Yellow & green, silk, floral jewellery" className={field} />
        <div><p className="text-[13px] font-extrabold">Colour theme</p><ColorPick value={colors} onChange={setColors} max={4} /></div>
        {err && <p className="text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      </div>
    </Sheet>
  )
}

/* ── One circle's chat ─────────────────────────────────────────────── */
export function CircleChat({ circle, messages, members = [], inviteTitle, onSend, hostView = false }) {
  const [text, setText] = useState('')
  const [look, setLook] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  async function send() {
    setBusy(true); setErr('')
    try { await onSend(text.trim(), look && (look.outfit || look.colors?.length) ? look : null); setText(''); setLook(null) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="pb-2" data-circle-chat>
      <div className="flex items-center gap-2.5 rounded-[16px] bg-[#FBF9FD] p-2.5 shadow-[inset_0_0_0_1px_#F0EAF6]">
        <Swatches colors={circle.colors} size={26} />
        <span className="min-w-0 flex-1 text-[12px] font-semibold text-[var(--ink-2)]">{circle.note || 'Share your look and pick colours together'}{members.length ? ` · ${members.slice(0, 4).join(', ')}${members.length > 4 ? ` +${members.length - 4}` : ''}` : ''}</span>
        {circle.join && <a href={whatsappUrl(circleInviteText(circle, inviteTitle ?? 'the celebration'))} target="_blank" rel="noreferrer" className="cx-press flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#25D366] px-3 text-[12px] font-extrabold text-white" data-circle-invite><UserPlus size={14} />Invite</a>}
      </div>
      <div className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {!messages.length && <p className="py-6 text-center text-[13px] font-semibold text-[var(--ink-3)]">No messages yet — share what you’re thinking of wearing 👗</p>}
        {messages.map(m => {
          const mine = hostView ? m.host || m.guest_id == null : m.mine
          return (
            <div key={m.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] rounded-[18px] px-3 py-2 ' + (mine ? 'rounded-br-[6px] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white' : m.host || m.guest_id === null ? 'rounded-bl-[6px] bg-[#FFF4DA] text-[#5A3B12]' : 'rounded-bl-[6px] bg-[#F4F1F8] text-[var(--ink)]')}>
                {!mine && <p className="text-[10.5px] font-black uppercase tracking-[0.08em] opacity-70">{m.author}</p>}
                {m.look && <LookBadge look={m.look} dark={mine} />}
                {m.body && <p className="whitespace-pre-line text-[13.5px] font-semibold leading-snug">{m.body}</p>}
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      {look && (
        <div className="mt-3 rounded-[16px] bg-[#FDF2F8] p-3 ring-1 ring-[#FBCFE8]" data-look-composer>
          <div className="flex items-center justify-between"><p className="text-[12.5px] font-extrabold text-[#9D174D]">👗 This is what I’m wearing</p><button type="button" onClick={() => setLook(null)} aria-label="Remove outfit card"><X size={16} className="text-[#9D174D]" /></button></div>
          <div className="cx-noscroll -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {OUTFITS.map(o => <button key={o} type="button" onClick={() => setLook(l => ({ ...l, outfit: l.outfit === o ? null : o }))} className={'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold ' + (look.outfit === o ? 'bg-[#DB2777] text-white' : 'bg-white text-[#9D174D]')}>{o}</button>)}
          </div>
          <ColorPick value={look.colors ?? []} onChange={c => setLook(l => ({ ...l, colors: c }))} max={3} />
        </div>
      )}
      {err && <p className="mt-2 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => setLook(l => (l ? null : { outfit: null, colors: [] }))} aria-label="Share my outfit" aria-pressed={!!look} className={'cx-press grid h-12 w-12 shrink-0 place-items-center rounded-full ' + (look ? 'bg-[#DB2777] text-white' : 'bg-[#FDF2F8] text-[#DB2777]')} data-look-toggle><Shirt size={19} /></button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (text.trim() || look) && !busy && send()} maxLength={1000} placeholder={look ? 'Add a note (optional)' : 'Message the circle…'} className="h-12 min-w-0 flex-1 rounded-full bg-[#F4F1F8] px-4 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-[#C4B5FD]" data-chat-input />
        <button type="button" disabled={busy || (!text.trim() && !(look && (look.outfit || look.colors?.length)))} onClick={send} aria-label="Send" className="cx-press grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1C1033] text-white disabled:opacity-30" data-chat-send>{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
      </div>
    </div>
  )
}

export function LookBadge({ look, dark = false }) {
  return (
    <div className={'mb-1 mt-1 flex items-center gap-2 rounded-[12px] px-2.5 py-2 ' + (dark ? 'bg-white/15' : 'bg-white')} data-look>
      <span className="text-[18px]">👗</span>
      <span className="min-w-0">
        <span className={'block text-[10px] font-black uppercase tracking-[0.1em] ' + (dark ? 'text-white/75' : 'text-[#DB2777]')}>I’m wearing</span>
        <span className="block text-[13px] font-extrabold">{look.outfit ?? 'My colours'}</span>
      </span>
      {look.colors?.length > 0 && <Swatches colors={look.colors} size={18} />}
    </div>
  )
}

export function Swatches({ colors = [], size = 24 }) {
  if (!colors?.length) return <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#F9A8D4] to-[#C4B5FD]" style={{ width: size, height: size }}><Sparkles size={size * 0.5} className="text-white" /></span>
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {colors.slice(0, 4).map(c => <span key={c} className="rounded-full ring-2 ring-white" style={{ width: size, height: size, background: c }} />)}
    </span>
  )
}

export function ColorPick({ value, onChange, max = 4 }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {LOOK_COLORS.map(c => {
        const on = value.includes(c)
        return (
          <button key={c} type="button" onClick={() => onChange(on ? value.filter(x => x !== c) : value.length >= max ? [...value.slice(1), c] : [...value, c])} aria-pressed={on} aria-label={c}
            className={'grid h-8 w-8 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)] transition ' + (on ? 'ring-2 ring-[#7C3AED] ring-offset-2' : '')} style={{ background: c }}>
            {on && <Check size={14} strokeWidth={3.2} className={c === '#FFFFFF' || c === '#FDE68A' || c === '#FACC15' ? 'text-[#1C1033]' : 'text-white'} />}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ on, onClick, title, sub }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="flex w-full items-center gap-3 py-3 text-left">
      <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">{title}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</span></span>
      <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ' + (on ? 'bg-[#0C831F]' : 'bg-[#E5E0EA]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (on ? 'left-[21px]' : 'left-[3px]')} /></span>
    </button>
  )
}
function Step({ label, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-[#FAF8FD] px-3 py-2 ring-1 ring-[#E7E1F0]">
      <span className="text-[13px] font-extrabold">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white disabled:opacity-30"><Minus size={14} /></button>
        <span className="cx-num w-5 text-center text-[16px] font-black">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white disabled:opacity-30"><Plus size={14} /></button>
      </span>
    </div>
  )
}
function Tag({ children }) {
  return <span className="rounded-full bg-[#F1FBF5] px-2.5 py-1 text-[11.5px] font-extrabold text-[#0B6B3D]">{children}</span>
}
