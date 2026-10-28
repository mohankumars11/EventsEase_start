/**
 * /rsvp/:token — what a guest sees when they tap the link on WhatsApp.
 *
 * No app, no sign-in, no location: the invitation card, then one question
 * at a time — coming / maybe / can't, how many, food, which functions,
 * a note. Answers can be changed until the host closes RSVPs. The page
 * reads and writes only through rsvp_view / rsvp_submit (migration 191).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarPlus, Check, Loader2, MapPin, Minus, Navigation, PartyPopper, Plus, Shirt } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import InviteCard from '../ui/InviteCard'
import { MEALS, submitRsvp, viewRsvp } from '../lib/rsvp'
import { saveTravel } from '../lib/guestCare'
import { GuestCircles, StayCard, TravelForm } from '../ui/guestCareUI'

const DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtDate = d => (d ? DAY.format(new Date(`${d}T00:00:00`)) : null)
const fmtTime = t => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null)

export default function Rsvp() {
  const { token } = useParams()
  const [q] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState(undefined)
  const [err, setErr] = useState('')
  const [a, setA] = useState({ status: null, adults: 1, kids: 0, meal: null, note: '', functions: {}, name: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    viewRsvp(token).then(d => {
      setData(d)
      const g = d?.guest
      if (g?.responded_at) {
        setA(x => ({ ...x, status: g.status, adults: Math.max(g.adults, g.status === 'declined' ? 1 : 0) || 1, kids: g.kids, meal: g.meal, note: g.note ?? '',
          functions: Object.fromEntries(d.functions.map(f => [f.id, f.attending !== false])) }))
        setDone(true)
      } else if (d) setA(x => ({ ...x, functions: Object.fromEntries(d.functions.map(f => [f.id, true])) }))
    }).catch(e => { setErr(e.message); setData(null) })
  }, [token])

  if (data === undefined) return <Shell><div className="grid min-h-[60dvh] place-items-center"><Loader2 className="animate-spin text-[var(--brand)]" /></div></Shell>
  if (!data) return <Shell><Empty title="This invitation link isn’t active" body="Ask the host to send you the link again." /></Shell>

  const inv = data.invitation, g = data.guest
  const occ = OCCASION[inv.occasion] ?? null
  const limit = g?.limit ?? 10
  const heads = a.adults + (inv.allow_kids ? a.kids : 0)
  const set = p => setA(x => ({ ...x, ...p }))
  const canSend = a.status && (a.status === 'declined' || heads >= 1) && heads <= limit && (!data.open || a.name.trim().length >= 2)

  async function send() {
    setBusy(true); setErr('')
    try {
      const r = await submitRsvp(token, { ...a, kids: inv.allow_kids ? a.kids : 0, functions: data.functions.map(f => ({ id: f.id, attending: !!a.functions[f.id] })) })
      /* Through the group link: move to their own personal link, so travel and circles are theirs. */
      if (data.open && r?.token && r.token !== token) { navigate(`/rsvp/${r.token}`, { replace: true }); return }
      setDone(true)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell>
      {/* The card — the design the host picked. */}
      <div className="cx-pop" data-rsvp-card>
        <InviteCard inv={inv} occasion={occ} theme={inv.theme} />
      </div>
      <section className="mt-3 rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]">
        {g && <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.24em] text-[var(--brand)]">Dear {g.name.split(' ')[0]}</p>}
        {inv.message && <p className="mx-auto mt-1.5 max-w-[34ch] whitespace-pre-line text-center text-[13.5px] font-medium leading-relaxed text-[var(--ink-2)]">{inv.message}</p>}
        <div className="mt-3 grid gap-1.5 text-left">
          {(inv.date || inv.time) && <Fact icon={CalendarPlus}>{[fmtDate(inv.date), fmtTime(inv.time)].filter(Boolean).join(' · ')}</Fact>}
          {(inv.venue || inv.address) && <Fact icon={MapPin}>{[inv.venue, inv.address].filter(Boolean).join(', ')}</Fact>}
          {inv.dress && <Fact icon={Shirt}>Dress code: {inv.dress}</Fact>}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {(inv.map || inv.address) && (
            <a href={inv.map || `https://maps.google.com/?q=${encodeURIComponent([inv.venue, inv.address].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer"
              className="cx-press flex h-10 items-center gap-1.5 rounded-full bg-[var(--am-100)] px-4 text-[13px] font-extrabold text-[var(--am-ink)]"><Navigation size={15} />Directions</a>
          )}
          {inv.date && <button type="button" onClick={() => downloadIcs(inv)} className="cx-press flex h-10 items-center gap-1.5 rounded-full bg-[var(--am-100)] px-4 text-[13px] font-extrabold text-[var(--am-ink)]"><CalendarPlus size={15} />Save the date</button>}
        </div>
      </section>

      {inv.closed ? (
        <p className="mt-5 rounded-[18px] bg-[#F4F1F8] p-4 text-center text-[13.5px] font-bold text-[var(--ink-2)]">The host has closed RSVPs. {g?.responded_at ? `Your answer: ${label(g.status)}.` : ''}</p>
      ) : done ? (
        <section className="cx-pop mt-5 rounded-[24px] bg-[#F1FBF5] p-5 text-center ring-1 ring-[#CDEFDC]" data-rsvp-done>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0C831F] text-white">{a.status === 'declined' ? <Check size={28} strokeWidth={3} /> : <PartyPopper size={26} />}</span>
          <p className="mt-3 text-[20px] font-black tracking-[-0.03em] text-[#0B4F2A]">{a.status === 'attending' ? 'See you there!' : a.status === 'maybe' ? 'Thanks — we’ve noted a maybe' : 'Thanks for letting us know'}</p>
          <p className="mt-1 text-[13px] font-semibold text-[#3C7A5A]">{a.status === 'declined' ? 'The host has your reply.' : `${heads} ${heads === 1 ? 'person' : 'people'}${a.meal ? ` · ${MEALS.find(m => m[0] === a.meal)?.[1]}` : ''} — the host has your reply.`}</p>
          <button type="button" onClick={() => setDone(false)} className="mt-3 text-[13px] font-extrabold text-[#0C831F] underline underline-offset-4" data-rsvp-edit>Change my answer</button>
        </section>
      ) : (
        <section className="mt-5 space-y-3" data-rsvp-form>
          <h2 className="px-1 text-[19px] font-black tracking-[-0.03em]">Will you be there?</h2>
          <div className="grid grid-cols-3 gap-2">
            {[['attending', 'Yes, coming', '#0C831F'], ['maybe', 'Maybe', '#B45309'], ['declined', 'Can’t come', '#64748B']].map(([s, l, c]) => (
              <button key={s} type="button" onClick={() => set({ status: s })} aria-pressed={a.status === s} data-rsvp={s}
                className={'cx-press h-14 rounded-[16px] text-[14px] font-extrabold transition ' + (a.status === s ? 'text-white shadow-lg' : 'bg-white text-[var(--ink)] shadow-[0_0_0_1px_#E7E1F0]')}
                style={a.status === s ? { background: c } : undefined}>{l}</button>
            ))}
          </div>

          {data.open && (
            <Box title="Your name">
              <input value={a.name} onChange={e => set({ name: e.target.value })} placeholder="Full name" maxLength={100} className="h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[15px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" data-rsvp-name />
              <input value={a.phone} onChange={e => set({ phone: e.target.value })} placeholder="Mobile (optional — lets you change your answer later)" inputMode="tel" maxLength={16} className="mt-2 h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" />
            </Box>
          )}

          {a.status && a.status !== 'declined' && (
            <>
              <Box title="How many of you?" sub={`This invitation is for up to ${limit} ${limit === 1 ? 'person' : 'people'}`}>
                <Counter label="Adults" value={a.adults} min={inv.allow_kids ? 0 : 1} max={limit - (inv.allow_kids ? a.kids : 0)} onChange={v => set({ adults: v })} />
                {inv.allow_kids && <Counter label="Children" value={a.kids} min={0} max={limit - a.adults} onChange={v => set({ kids: v })} />}
              </Box>
              {inv.ask_meal && (
                <Box title="Food preference">
                  <div className="flex flex-wrap gap-1.5">
                    {MEALS.map(([id, l]) => <Chip key={id} on={a.meal === id} onClick={() => set({ meal: a.meal === id ? null : id })}>{l}</Chip>)}
                  </div>
                </Box>
              )}
              {data.functions.length > 0 && (
                <Box title="Which functions will you attend?">
                  <div className="divide-y divide-[#F3EEF9]">
                    {data.functions.map(f => (
                      <button key={f.id} type="button" onClick={() => set({ functions: { ...a.functions, [f.id]: !a.functions[f.id] } })} aria-pressed={!!a.functions[f.id]} className="flex w-full items-center gap-3 py-3 text-left" data-rsvp-fn>
                        <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold">{f.name}</span>
                          <span className="block text-[12px] font-semibold text-[var(--ink-3)]">{[fmtDate(f.date), fmtTime(f.time), f.venue].filter(Boolean).join(' · ') || 'Details from the host'}</span></span>
                        <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-full transition ' + (a.functions[f.id] ? 'bg-[#0C831F] text-white' : 'ring-2 ring-[#DDD6E8]')}>{a.functions[f.id] && <Check size={15} strokeWidth={3.2} />}</span>
                      </button>
                    ))}
                  </div>
                </Box>
              )}
            </>
          )}

          {a.status && (
            <Box title={a.status === 'declined' ? 'A note for the host (optional)' : 'Anything the host should know? (optional)'}>
              <textarea value={a.note} onChange={e => set({ note: e.target.value })} rows={2} maxLength={500} placeholder={a.status === 'declined' ? 'Sending my love and blessings…' : 'Arriving late, need wheelchair access…'}
                className="w-full resize-none rounded-[13px] bg-[#FAF8FD] p-3 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" />
            </Box>
          )}

          {err && <p className="rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[13px] font-bold text-[#9B1A2A]">{err}</p>}
          <button type="button" disabled={!canSend || busy} onClick={send} className="cx-press flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#0C831F] text-[16px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(12,131,31,.9)] disabled:opacity-40" data-rsvp-send>
            {busy && <Loader2 size={18} className="animate-spin" />}Send my RSVP
          </button>
          {inv.rsvp_by && <p className="text-center text-[12px] font-bold text-[var(--ink-3)]">Please reply by {fmtDate(inv.rsvp_by)}</p>}
        </section>
      )}

      {/* Guest care and style circles (migration 192) — shown once there is a personal link. */}
      {g && (
        <div className="mt-5 space-y-3">
          <StayCard care={inv.care} />
          {inv.care?.ask_travel && done && a.status !== 'declined' && <TravelForm initial={g.travel} hostName={inv.hosts} onSave={t => saveTravel(token, t)} />}
          <GuestCircles token={token} inviteTitle={inv.title} focus={!!q.get('circle')} />
        </div>
      )}

      <a href="https://sambramoh.vercel.app" className="mt-8 block rounded-[20px] bg-[var(--am-50)] p-4 text-center ring-1 ring-[var(--am-200)]">
        <p className="text-[13.5px] font-extrabold text-[var(--am-ink)]">Planning a celebration of your own?</p>
        <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-2)]">Invites, RSVPs and every master you need — on Sambramo.</p>
      </a>
    </Shell>
  )
}

const label = s => ({ attending: 'coming', maybe: 'maybe', declined: 'can’t come' }[s] ?? 'not replied')

function Shell({ children }) {
  return <main className="cx-enter min-h-[100dvh] bg-gradient-to-b from-[#F3ECFF] via-[#FBF8FF] to-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] pt-[calc(env(safe-area-inset-top,0px)+16px)]" data-rsvp><div className="mx-auto max-w-[480px]">{children}</div></main>
}
function Fact({ icon: Icon, children }) {
  return <p className="flex items-start gap-2.5 rounded-[14px] bg-[#FAF8FD] px-3.5 py-2.5 text-[13.5px] font-bold text-[var(--ink)]"><Icon size={17} className="mt-[1px] shrink-0 text-[var(--brand)]" />{children}</p>
}
function Box({ title, sub, children }) {
  return <section className="rounded-[20px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]"><p className="text-[15px] font-extrabold tracking-[-0.02em]">{title}</p>{sub && <p className="text-[12px] font-semibold text-[var(--ink-3)]">{sub}</p>}<div className="mt-2.5">{children}</div></section>
}
function Chip({ on, onClick, children }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={'cx-press flex h-10 items-center gap-1 rounded-full px-4 text-[13.5px] font-bold transition ' + (on ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-[#FAF8FD] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E7E1F0]')}>{on && <Check size={14} strokeWidth={3} />}{children}</button>
}
function Counter({ label: l, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[14.5px] font-bold">{l}</span>
      <span className="flex items-center gap-3">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${l.toLowerCase()}`} className="cx-press grid h-10 w-10 place-items-center rounded-full bg-[var(--am-100)] text-[var(--am-ink)] disabled:opacity-35"><Minus size={17} /></button>
        <span className="cx-num w-6 text-center text-[19px] font-black">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${l.toLowerCase()}`} className="cx-press grid h-10 w-10 place-items-center rounded-full bg-[var(--am-100)] text-[var(--am-ink)] disabled:opacity-35"><Plus size={17} /></button>
      </span>
    </div>
  )
}
function Empty({ title, body }) {
  return <div className="grid min-h-[60dvh] place-items-center text-center"><div><p className="text-[20px] font-black tracking-[-0.03em]">{title}</p><p className="mt-1 text-[13.5px] font-semibold text-[var(--ink-3)]">{body}</p></div></div>
}

/* A calendar file the guest's phone can add (all-day if no time). */
function downloadIcs(inv) {
  const d = inv.date.replace(/-/g, '')
  const t = inv.time ? inv.time.slice(0, 5).replace(':', '') + '00' : null
  const esc = s => String(s ?? '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sambramo//RSVP//EN', 'BEGIN:VEVENT', `UID:${d}-${Math.random().toString(36).slice(2)}@sambramo`,
    t ? `DTSTART;TZID=Asia/Kolkata:${d}T${t}` : `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(inv.title)}`,
    `LOCATION:${esc([inv.venue, inv.address].filter(Boolean).join(', '))}`, `DESCRIPTION:${esc(inv.message)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: 'invitation.ics' })
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
}
