/**
 * Invitations & RSVP — the host's side.
 *
 *   /invites              every invitation, with its live headcount
 *   /invites/new?o=<id>   make one (pre-filled from the celebration plan)
 *   /invites/:id/edit     change the card, the functions, the options
 *   /invites/:id          the guest list and RSVPs (InviteHost.jsx)
 *
 * The card preview above the form is the same card the guest sees.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, ChevronRight, Loader2, MapPin, Plus, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { OCCASION } from '../data/occasions'
import { occasionArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { deleteInvitation, functionsFor, getInvitation, myInvitations, saveInvitation, tally } from '../lib/rsvp'
import { BackHeader, Empty } from '../ui/kit'
import { ArtFill } from '../ui/art'
import InviteCard from '../ui/InviteCard'
import LookPicker from '../ui/inviteLook'
import { TEMPLATES, parseTheme, templatesFor, themeString } from '../data/inviteTemplates'
import SignInSheet from './SignInSheet'

const fmt = d => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date to be set')
const MESSAGES = {
  wedding: 'With the blessings of our families, we request the pleasure of your company as we begin our new journey together.',
  life: 'Join us to celebrate — it won’t be the same without you!',
  festivals: 'Celebrate with us — food, family and festivities await.',
  default: 'We’d love for you to be there. Please let us know if you can make it.',
}

export function InvitesList() {
  const { user } = useAuth()
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')
  const [signIn, setSignIn] = useState(false)
  useEffect(() => { if (user) myInvitations().then(setList).catch(e => { setErr(e.message); setList([]) }) }, [user])
  useEffect(() => { try { localStorage.setItem('sbm.cx.invites.seen', '1') } catch { /* storage off */ } }, [])

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] cx-bottom-pad-bar">
      <BackHeader title="Invitations & RSVP" sub="Invite, track who’s coming, count heads" />
      <section className="mx-3 mt-1 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#FBF7FF] to-[#FDF0F6] p-4 shadow-[0_0_0_1px_#EEE6FA]">
        <p className="text-[20px] font-black leading-tight tracking-[-0.03em] text-[var(--ink)]">Send invites on WhatsApp.<br /><span className="text-[#DB2777]">Know exactly who’s coming.</span></p>
        <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-3)]">Guests reply in one tap — no app needed. Headcount, food choices and functions, live.</p>
        <Link to="/invites/new" className="cx-press cx-cta mt-3 inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-extrabold" data-new-invite>
          <Plus size={17} />Create an invitation<ChevronRight size={16} />
        </Link>
      </section>

      {!user ? (
        <div className="mx-3 mt-4 rounded-[20px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]">
          <p className="text-[13.5px] font-semibold text-[var(--ink-2)]">Sign in to keep your invitations and see RSVPs from every phone.</p>
          <button type="button" onClick={() => setSignIn(true)} className="cx-press cx-btn mt-3 rounded-full px-4 py-2 text-[13px] font-extrabold">Sign in</button>
          <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => setSignIn(false)} why="to send invitations" />
        </div>
      ) : list === null ? (
        <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-[var(--brand)]" /></div>
      ) : (
        <div className="space-y-2.5 px-3 pt-4">
          {err && <p className="rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
          {!err && !list.length && <Empty title="No invitations yet" body="Make one for your next celebration — it takes a minute." />}
          {list.map(inv => {
            const t = tally(inv.invitation_guests)
            const o = OCCASION[inv.occasion_id]
            return (
              <Link key={inv.id} to={`/invites/${inv.id}`} className="cx-press flex gap-3 rounded-[20px] bg-white p-2.5 shadow-[0_0_0_1px_#EEE6FA]" data-invite={inv.id}>
                <span className="w-[66px] shrink-0"><InviteCard inv={inv} occasion={o} theme={inv.theme} size="mini" /></span>
                <span className="min-w-0 flex-1 py-0.5">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[15px] font-extrabold tracking-[-0.02em]">{inv.title}</span>
                    {inv.status === 'draft' && <span className="shrink-0 rounded-full bg-[#F4F1F8] px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase text-[var(--ink-3)]">Draft</span>}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-bold text-[var(--ink-3)]"><CalendarDays size={12} />{fmt(inv.event_date)}</span>
                  <span className="mt-1.5 flex gap-2 text-[11.5px] font-extrabold">
                    <span className="text-[#0B6B3D]">{t.heads} coming</span><span className="text-[#8A5300]">{t.maybe} maybe</span><span className="text-[var(--ink-3)]">{t.pending} to reply</span>
                  </span>
                  <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#F3ECFF]">
                    <span className="bg-[#16A34A]" style={{ width: `${t.invited ? (t.attending / t.invited) * 100 : 0}%` }} />
                    <span className="bg-[#F59E0B]" style={{ width: `${t.invited ? (t.maybe / t.invited) * 100 : 0}%` }} />
                    <span className="bg-[#CBD5E1]" style={{ width: `${t.invited ? (t.declined / t.invited) * 100 : 0}%` }} />
                  </span>
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-[var(--ink-3)]" />
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}

export function InviteEdit() {
  const { id } = useParams()
  const [q] = useSearchParams()
  const navigate = useNavigate()
  const plan = usePlan()
  const { user } = useAuth()
  const [inv, setInv] = useState(null)
  const [fns, setFns] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [signIn, setSignIn] = useState(false)

  useEffect(() => {
    if (id) { getInvitation(id).then(d => { setInv(d); setFns(d.invitation_functions) }).catch(e => setErr(e.message)); return }
    const occ = OCCASION[q.get('o') ?? plan.event.occasionId] ?? null
    const ev = occ && plan.event.occasionId === occ.id ? plan.event : {}
    setInv({ occasion_id: occ?.id ?? null, title: occ ? `${user?.user_metadata?.full_name?.split(' ')[0] ? `${user.user_metadata.full_name.split(' ')[0]}’s ` : 'Our '}${occ.name}` : '', hosts_line: '',
      message: MESSAGES[occ?.category] ?? MESSAGES.default, event_date: ev.date ?? '', start_time: ev.time ?? '', venue_name: '', venue_address: '', map_url: '',
      dress_code: '', rsvp_by: '', ask_meal: true, allow_kids: true, open_enabled: false, cover_key: occ?.id ?? null,
      theme: themeString(templatesFor(occ)[0].id, { art: true, live: true }) })
    setFns(functionsFor(occ).map(name => ({ name, event_date: ev.date ?? '', start_time: '', venue_name: '' })))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const occ = useMemo(() => (inv ? OCCASION[inv.occasion_id] : null), [inv])
  if (!inv) return <main className="grid min-h-[60dvh] place-items-center">{err ? <p className="px-6 text-center text-[13.5px] font-bold text-[#9B1A2A]">{err}</p> : <Loader2 className="animate-spin text-[var(--brand)]" />}</main>
  const set = p => setInv(x => ({ ...x, ...p }))
  const themeOpts = parseTheme(inv.theme, occ)

  async function save() {
    if (!user) { setSignIn(true); return }
    setBusy(true); setErr('')
    try { const newId = await saveInvitation(inv, fns); navigate(`/invites/${newId}`, { replace: true }) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+110px)]">
      <BackHeader title={id ? 'Edit invitation' : 'New invitation'} sub={occ?.name ?? 'Your celebration'} />

      {/* Live preview — exactly what the guest sees. */}
      <div className="mx-auto w-[78%] max-w-[330px]" data-invite-preview>
        <InviteCard inv={inv} occasion={occ} theme={inv.theme} />
      </div>

      {/* Pick a design */}
      <section className="mt-4" data-design-picker>
        <div className="flex items-end justify-between px-4 pb-2">
          <p className="text-[15px] font-extrabold tracking-[-0.02em]">Choose a design</p>
          <span className="text-[11.5px] font-bold text-[var(--ink-3)]">{TEMPLATES.length} styles</span>
        </div>
        <div className="cx-noscroll flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
          {templatesFor(occ).map((t, k) => {
            const on = parseTheme(inv.theme, occ).t.id === t.id
            return (
              <button key={t.id} type="button" onClick={() => set({ theme: themeString(t.id, { art: themeOpts.art, live: themeOpts.live }) })} aria-pressed={on} className="w-[30%] max-w-[120px] shrink-0 snap-start text-left" data-template={t.id}>
                <span className={'block rounded-[16px] p-1 transition ' + (on ? 'bg-[var(--brand)]' : 'bg-transparent')}>
                  <InviteCard inv={inv} occasion={occ} theme={themeString(t.id, { art: themeOpts.art })} size="mini" />
                </span>
                <span className="mt-1 block truncate text-[11.5px] font-extrabold">{t.name}</span>
                <span className={'block truncate text-[10px] font-bold ' + (k < 3 && t.for.includes(occ?.category) ? 'text-[#0C831F]' : 'text-[var(--ink-3)]')}>{k < 3 && t.for.includes(occ?.category) ? 'Recommended' : t.vibe}</span>
              </button>
            )
          })}
        </div>
        <div className="mx-3 mt-2 grid grid-cols-2 gap-2">
          <ChipToggle on={themeOpts.art} onClick={() => set({ theme: themeString(themeOpts.t.id, { ...themeOpts, art: !themeOpts.art }) })}>Show illustration</ChipToggle>
          <ChipToggle on={themeOpts.live} onClick={() => set({ theme: themeString(themeOpts.t.id, { ...themeOpts, live: !themeOpts.live }) })}>✨ Live animation</ChipToggle>
        </div>
        <div className="mx-3 mt-3 rounded-[20px] bg-white p-3.5 px-5 shadow-[0_0_0_1px_#EEE6FA]">
          <LookPicker base={themeOpts.base} look={{ pal: themeOpts.pal, font: themeOpts.font }} onChange={l => set({ theme: themeString(themeOpts.t.id, { ...themeOpts, ...l }) })} />
        </div>
      </section>

      <div className="space-y-3 px-3 pt-4">
        <Box title="The card">
          <Field label="Title" value={inv.title} onChange={v => set({ title: v })} max={120} placeholder="Riya’s 1st Birthday" />
          <Field label="From (hosts)" value={inv.hosts_line ?? ''} onChange={v => set({ hosts_line: v })} max={160} placeholder="Priya & Arjun Rao" />
          <label className="block"><span className="text-[12px] font-extrabold text-[var(--ink-2)]">Message</span>
            <textarea value={inv.message ?? ''} onChange={e => set({ message: e.target.value })} rows={3} maxLength={1200} className="mt-1 w-full resize-none rounded-[13px] bg-[#FAF8FD] p-3 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" /></label>
        </Box>
        <Box title="When & where">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" type="date" value={inv.event_date ?? ''} onChange={v => set({ event_date: v })} />
            <Field label="Time" type="time" value={(inv.start_time ?? '').slice(0, 5)} onChange={v => set({ start_time: v })} />
          </div>
          <Field label="Venue" value={inv.venue_name ?? ''} onChange={v => set({ venue_name: v })} max={160} placeholder="Palace Grounds, Gate 4" />
          <Field label="Address" value={inv.venue_address ?? ''} onChange={v => set({ venue_address: v })} max={400} placeholder="Street, area, city" />
          <Field label="Google Maps link (optional)" value={inv.map_url ?? ''} onChange={v => set({ map_url: v })} placeholder="https://maps.app.goo.gl/…" />
          <Field label="Dress code (optional)" value={inv.dress_code ?? ''} onChange={v => set({ dress_code: v })} max={120} placeholder="Traditional, pastel colours" />
        </Box>
        <Box title="Functions" sub="Each gets its own RSVP — haldi, mehendi, reception…">
          {fns.map((f, i) => (
            <div key={i} className="mb-2 flex items-center gap-2" data-fn-row>
              <input value={f.name} onChange={e => setFns(x => x.map((y, k) => (k === i ? { ...y, name: e.target.value } : y)))} maxLength={80} placeholder="Function name" className="h-11 min-w-0 flex-1 rounded-[12px] bg-[#FAF8FD] px-3 text-[14px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
              <input type="date" value={f.event_date ?? ''} onChange={e => setFns(x => x.map((y, k) => (k === i ? { ...y, event_date: e.target.value } : y)))} className="h-11 w-[132px] shrink-0 rounded-[12px] bg-[#FAF8FD] px-2 text-[12.5px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
              <button type="button" onClick={() => setFns(x => x.filter((_, k) => k !== i))} aria-label="Remove function" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)]"><X size={17} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setFns(x => [...x, { name: '', event_date: inv.event_date ?? '', start_time: '', venue_name: '' }])} className="flex items-center gap-1 text-[13px] font-extrabold text-[var(--brand)]"><Plus size={15} />Add a function</button>
        </Box>
        <Box title="RSVP options">
          <Field label="Reply by (optional)" type="date" value={inv.rsvp_by ?? ''} onChange={v => set({ rsvp_by: v })} />
          <Toggle on={inv.ask_meal} onClick={() => set({ ask_meal: !inv.ask_meal })}>Ask food preference</Toggle>
          <Toggle on={inv.allow_kids} onClick={() => set({ allow_kids: !inv.allow_kids })}>Count children separately</Toggle>
          <Toggle on={inv.open_enabled} onClick={() => set({ open_enabled: !inv.open_enabled })} sub="One link for a WhatsApp group — guests type their name">Open link for groups</Toggle>
        </Box>
        {err && <p className="rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
        {id && <button type="button" onClick={async () => { if (confirm('Delete this invitation and its guest list?')) { await deleteInvitation(id).catch(e => setErr(e.message)); navigate('/invites', { replace: true }) } }} className="flex items-center gap-1.5 px-1 text-[13px] font-extrabold text-[#9B1A2A]"><Trash2 size={15} />Delete invitation</button>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-[var(--line)] bg-white/95 px-3 pt-3 backdrop-blur-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <button type="button" disabled={busy || !inv.title.trim()} onClick={save} className="cx-press cx-cta mx-auto flex h-14 w-full max-w-[540px] items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold" data-save-invite>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}{id ? 'Save changes' : 'Save & add guests'}
        </button>
      </div>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => { setSignIn(false); save() }} why="to save your invitation" />
    </main>
  )
}

function Box({ title, sub, children }) {
  return <section className="rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE6FA]"><p className="text-[15px] font-extrabold tracking-[-0.02em]">{title}</p>{sub && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}<div className="mt-2.5 space-y-2.5">{children}</div></section>
}
function Field({ label, value, onChange, type = 'text', max, placeholder }) {
  return (
    <label className="block"><span className="text-[12px] font-extrabold text-[var(--ink-2)]">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} maxLength={max} placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-[13px] bg-[#FAF8FD] px-3 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" /></label>
  )
}
function Toggle({ on, onClick, sub, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="flex w-full items-center gap-3 py-1 text-left">
      <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{children}</span>{sub && <span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</span>}</span>
      <span className={'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ' + (on ? 'bg-[#0C831F]' : 'bg-[#E5E0EA]')}><span className={'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ' + (on ? 'left-[21px]' : 'left-[3px]')} /></span>
    </button>
  )
}

function ChipToggle({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={'cx-press flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[13px] font-extrabold transition ' + (on ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E7E1F0]')}>
      {on && <Check size={14} strokeWidth={3} />}{children}
    </button>
  )
}
