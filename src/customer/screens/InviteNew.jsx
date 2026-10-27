/**
 * /invites/new — making an invitation, one question at a time.
 *
 *   event → design → name on the card → hosts → when → where → note →
 *   (functions, for multi-day occasions) → RSVP options → review →
 *   CREATE → guests (upload Excel / CSV / contacts, paste, or one by one)
 *   → send (WhatsApp one by one, or one group link)
 *
 * Never a long form: each step is one screen with one question, a big
 * answer, and the card itself updating as they type — the same card the
 * guest will open. Choices advance on their own; typing steps have Next.
 * The designs are shown from the very first screen (a moving column of
 * real cards beside the occasion list) because the design is the hook.
 */
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Contact, FileSpreadsheet, Link2, Loader2, MapPin, MessageCircle, PartyPopper, Plus, Search, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { CATEGORIES, FEATURED, OCCASION, OCCASIONS } from '../data/occasions'
import { occasionArt } from '../data/art'
import { usePlan } from '../state/PlanContext'
import { STYLES, TEMPLATE, TEMPLATES, isSolemn, parseTheme, recommendedFor, templatesFor, themeString } from '../data/inviteTemplates'
import { addGuests, functionsFor, getInvitation, inviteText, parseGuestList, saveInvitation, shareText } from '../lib/rsvp'
import { canPickContacts, guestsFromFile, pickContacts } from '../lib/guestImport'
import InviteCard from '../ui/InviteCard'
import { Sheet } from '../ui/kit'
import SignInSheet from './SignInSheet'

const NOTES = {
  wedding: ['With the blessings of our families, we request the pleasure of your company as we begin our new journey together.', 'Two families, one celebration — your presence would make our day complete.', 'We’re getting married! Come celebrate with us.'],
  life: ['Join us to celebrate — it won’t be the same without you!', 'Good food, great company and lots of cake. Do come!', 'Save the date and come celebrate with us.'],
  festivals: ['Celebrate with us — food, family and festivities await.', 'Our home will be full of light and laughter. Join us!', 'Come, let’s celebrate together.'],
  work: ['We’d be delighted to have you join us.', 'You’re invited — we look forward to seeing you there.', 'Please join us for an evening of conversation and celebration.'],
  solemn: ['Please join us as we remember and celebrate a life well lived.', 'Your presence will mean a great deal to our family.'],
  default: ['We’d love for you to be there. Please let us know if you can make it.', 'You’re invited! Tap below to tell us if you’re coming.', 'It won’t be the same without you — see you there!'],
}
const WORK = ['corporate', 'industry', 'online', 'property', 'retail', 'community']
const notesFor = o => (isSolemn(o) ? NOTES.solemn : NOTES[o?.category] ?? (WORK.includes(o?.category) ? NOTES.work : NOTES.default))
const titleFor = (o, first) => (isSolemn(o) || WORK.includes(o.category) ? o.name : first ? `${first}’s ${o.name}` : o.name)
const TIMES = [['10:00', 'Morning', '10 AM'], ['12:30', 'Lunch', '12:30 PM'], ['16:00', 'Afternoon', '4 PM'], ['18:30', 'Evening', '6:30 PM'], ['20:00', 'Night', '8 PM']]
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function dayFrom(dow, weeks = 0) { const d = new Date(); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7 || 7) + weeks * 7); return d }
const nice = v => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '')
const PHASE = { event: 'Your occasion', design: 'The design', title: 'The card', hosts: 'The card', when: 'When', where: 'Where', message: 'A personal note', functions: 'Functions', rsvp: 'RSVP', review: 'Review', guests: 'Guests', send: 'Send' }

/* The moving column beside the occasion list: the trending designs, each
   dressed for an occasion it was made for. */
const SHOWCASE = TEMPLATES.filter(t => t.trending).map(t => ({ t, o: OCCASIONS.find(o => t.kw?.test(o.name)) ?? null }))

function blank(o, first, ev = {}) {
  return { occasion_id: o?.id ?? null, title: o ? titleFor(o, first) : '', hosts_line: '', message: notesFor(o)[0], event_date: ev.date ?? '', start_time: ev.time ?? '',
    venue_name: '', venue_address: '', map_url: '', dress_code: '', rsvp_by: '', ask_meal: true, allow_kids: true, open_enabled: false, cover_key: o?.id ?? null,
    theme: themeString((templatesFor(o)[0] ?? TEMPLATES[0]).id, { art: true, live: true }) }
}

export default function InviteNew() {
  const [q] = useSearchParams()
  const navigate = useNavigate()
  const plan = usePlan()
  const { user, profile } = useAuth()
  const fullName = (profile?.full_name ?? user?.user_metadata?.full_name ?? '').trim()
  const first = fullName.split(/\s+/)[0] || ''
  const pre = OCCASION[q.get('o') ?? ''] ?? null
  const [inv, setInv] = useState(() => blank(pre, first, pre && plan.event.occasionId === pre.id ? plan.event : {}))
  /* Functions start empty: the functions step asks, rather than ticking five for a one-day party. */
  const [fns, setFns] = useState([])
  const [at, setAt] = useState(pre ? 'design' : 'event')
  const [invId, setInvId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [added, setAdded] = useState(0)
  const occ = OCCASION[inv.occasion_id] ?? null
  const set = p => setInv(x => ({ ...x, ...p }))
  const opts = parseTheme(inv.theme, occ)

  const steps = useMemo(() => ['event', 'design', 'title', 'hosts', 'when', 'where', 'message', ...(occ && functionsFor(occ).length ? ['functions'] : []), 'rsvp', 'review', 'guests', 'send'], [occ])
  const i = Math.max(0, steps.indexOf(at))
  const go = k => { setErr(''); setAt(k); window.scrollTo({ top: 0 }) }
  const next = () => go(steps[i + 1])
  const back = () => {
    if (at === 'guests' && invId) return navigate(`/invites/${invId}`, { replace: true })
    if (i <= 0) return navigate(-1)
    go(steps[i - 1])
  }

  function pickOccasion(o) {
    setInv(x => ({ ...x, occasion_id: o.id, cover_key: o.id, title: titleFor(o, first), message: notesFor(o)[0], theme: themeString(templatesFor(o)[0].id, { art: true, live: true }) }))
    setFns([])
    setTimeout(() => go('design'), 160)
  }

  async function create() {
    if (!user) { setSignIn(true); return }
    setBusy(true); setErr('')
    try {
      const id = await saveInvitation({ ...inv, title: inv.title.trim() || occ?.name || 'Our Celebration' }, fns.filter(f => f.name.trim()))
      setInvId(id); go('guests')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  /* What the button at the foot does, per step. */
  const foot = {
    event: occ ? { label: `Continue with ${occ.name}`, onClick: next } : null,
    design: { label: `Use “${opts.t.name}”`, onClick: next },
    title: { label: 'Next', onClick: next, disabled: !inv.title.trim() },
    hosts: { label: inv.hosts_line.trim() ? 'Next' : 'Skip', onClick: next, quiet: !inv.hosts_line.trim() },
    when: { label: inv.event_date ? 'Next' : 'Skip — add the date later', onClick: next, quiet: !inv.event_date },
    where: { label: inv.venue_name.trim() ? 'Next' : 'Skip — add the venue later', onClick: next, quiet: !inv.venue_name.trim() },
    message: { label: 'Next', onClick: next },
    functions: { label: fns.length ? `Next · ${fns.length} function${fns.length === 1 ? '' : 's'}` : 'Next · one event', onClick: next },
    rsvp: { label: 'Review my invitation', onClick: next },
    review: { label: busy ? 'Creating…' : 'Create my invitation', onClick: create, disabled: busy, icon: busy ? Loader2 : Sparkles },
    guests: null,
    send: { label: 'Open my RSVP dashboard', onClick: () => navigate(`/invites/${invId}`, { replace: true }) },
  }[at]

  return (
    <main className="min-h-[100dvh] bg-white" data-invite-wizard={at}>
      <header className="cx-safe-top sticky top-0 z-[120] bg-white/95 px-3 pb-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={back} aria-label="Back" className="cx-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6F3FA] text-[#1C1033]"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#DB2777]">{PHASE[at]}</p>
            <p className="truncate text-[13px] font-bold text-[var(--ink-3)]">{occ?.name ?? 'New invitation'}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F6F3FA] px-2.5 py-1 text-[12px] font-extrabold text-[var(--ink-2)]">{i + 1} / {steps.length}</span>
        </div>
        <div className="mt-2.5 flex gap-1" aria-hidden>
          {steps.map((k, j) => <span key={k} className={'h-1.5 flex-1 rounded-full transition-colors duration-500 ' + (j <= i ? 'bg-gradient-to-r from-[#DB2777] to-[#7C3AED]' : 'bg-[#F1ECF6]')} />)}
        </div>
      </header>

      <div key={at} className="cx-rise px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}>
        {at === 'event' && <StepEvent occ={occ} onPick={pickOccasion} />}
        {at === 'design' && occ && <StepDesign inv={inv} occ={occ} set={set} onUse={next} />}
        {at === 'title' && <StepText inv={inv} occ={occ} title="What should the card say?" sub="The big line on the card." value={inv.title} onChange={v => set({ title: v })} max={120}
          chips={[...new Set([titleFor(occ ?? { name: '', category: '' }, first), occ?.name, occ && `Our ${occ.name}`, first && `${first}’s Big Day`].filter(Boolean))]} />}
        {at === 'hosts' && <StepText inv={inv} occ={occ} title="Who’s inviting?" sub="Shown as “… invite you”. Leave it empty if you like." value={inv.hosts_line} onChange={v => set({ hosts_line: v })} max={160} placeholder="Priya & Arjun Rao"
          chips={[...new Set([first, fullName.split(/\s+/).length > 1 && `The ${fullName.split(/\s+/).slice(-1)[0]} Family`, 'Family & Friends'].filter(Boolean))]} />}
        {at === 'when' && <StepWhen inv={inv} occ={occ} set={set} />}
        {at === 'where' && <StepWhere inv={inv} occ={occ} set={set} />}
        {at === 'message' && <StepText inv={inv} occ={occ} title="Add a personal note" sub="Guests read this when they open their invite." value={inv.message ?? ''} onChange={v => set({ message: v })} max={1200} area chips={notesFor(occ)} long />}
        {at === 'functions' && <StepFunctions occ={occ} inv={inv} fns={fns} setFns={setFns} />}
        {at === 'rsvp' && <StepRsvp inv={inv} set={set} />}
        {at === 'review' && <StepReview inv={inv} occ={occ} fns={fns} go={go} err={err} />}
        {at === 'guests' && <StepGuests invId={invId} added={added} onAdded={n => setAdded(a => a + n)} onDone={() => go('send')} />}
        {at === 'send' && <StepSend invId={invId} added={added} onAddMore={() => go('guests')} />}
      </div>

      {foot && (
        <div className="fixed inset-x-0 bottom-0 z-[130] bg-gradient-to-t from-white via-white to-white/0 px-4 pt-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
          <button type="button" onClick={foot.onClick} disabled={foot.disabled}
            className={'cx-press mx-auto flex h-14 w-full max-w-[540px] items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold disabled:opacity-50 ' + (foot.quiet ? 'bg-[#F6F3FA] text-[var(--ink-2)]' : 'cx-cta')} data-wizard-next>
            {foot.icon && <foot.icon size={18} className={busy ? 'animate-spin' : ''} />}{foot.label}{!foot.icon && !foot.quiet && <ChevronRight size={19} />}
          </button>
        </div>
      )}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => { setSignIn(false); create() }} why="to create your invitation" />
    </main>
  )
}

function Q({ title, sub }) {
  return (
    <div>
      <h1 className="text-[27px] font-black leading-[1.08] tracking-[-0.04em] text-[#1C1033]">{title}</h1>
      {sub && <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[var(--ink-3)]">{sub}</p>}
    </div>
  )
}

/* The card as it stands, small, updating as they type. */
function Preview({ inv, occ, w = 'w-[46%]' }) {
  return <div className={'mx-auto mt-4 max-w-[220px] drop-shadow-[0_18px_28px_rgba(30,10,60,.28)] ' + w} data-wizard-preview><InviteCard inv={inv} occasion={occ} theme={inv.theme} size="mini" /></div>
}

/* ── 1. The occasion — every one of them, with designs moving beside ── */
function StepEvent({ occ, onPick }) {
  const [term, setTerm] = useState('')
  const [cat, setCat] = useState('all')
  const list = useMemo(() => {
    const t = term.trim().toLowerCase()
    if (t) return OCCASIONS.filter(o => o.name.toLowerCase().includes(t) || o.categoryShort.toLowerCase().includes(t)).slice(0, 80)
    return cat === 'all' ? FEATURED : OCCASIONS.filter(o => o.category === cat)
  }, [term, cat])
  const sat = iso(dayFrom(6))
  return (
    <>
      <Q title="What are you celebrating?" sub={`Pick your occasion — all ${OCCASIONS.length} have invitation designs made for them.`} />
      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-[16px] bg-[#F6F3FA] px-3.5 focus-within:ring-2 focus-within:ring-[#C4B5FD]">
        <Search size={18} className="shrink-0 text-[var(--ink-3)]" />
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Birthday, haldi, housewarming…" className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[#A39CB5]" data-occasion-search />
        {term && <button type="button" onClick={() => setTerm('')} aria-label="Clear"><X size={17} className="text-[var(--ink-3)]" /></button>}
      </label>
      {!term && (
        <div className="cx-noscroll -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
          {[['all', 'Popular'], ...CATEGORIES.map(c => [c.id, c.short])].map(([id, l]) => (
            <button key={id} type="button" onClick={() => setCat(id)} className={'shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ' + (cat === id ? 'bg-[#1C1033] text-white' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>{l}</button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-start gap-3">
        <ul className="min-w-0 flex-1 space-y-1.5">
          {list.map(o => {
            const a = occasionArt(o)
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onPick(o)} data-pick-occasion={o.id}
                  className={'cx-press flex w-full items-center gap-2.5 rounded-[16px] p-1.5 pr-2 text-left transition ' + (occ?.id === o.id ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#FBF9FD] shadow-[inset_0_0_0_1px_#F0EAF6]')}>
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px]" style={{ background: o.tone }}>
                    {a.src && <img src={a.src} alt="" loading="lazy" className={'absolute inset-0 h-full w-full ' + (a.kind === 'art' ? 'object-cover object-[50%_20%] mix-blend-multiply' : 'object-contain p-1.5')} />}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-extrabold leading-tight tracking-[-0.01em] text-[#1C1033]">{o.name}</span>
                  <ChevronRight size={16} className="shrink-0 text-[#B9B0CC]" />
                </button>
              </li>
            )
          })}
          {!list.length && <li className="rounded-[16px] bg-[#FBF9FD] p-4 text-[13px] font-semibold text-[var(--ink-3)]">Nothing by that name — try another word.</li>}
          {!term && cat === 'all' && <li className="px-1 pt-1 text-[11.5px] font-bold text-[var(--ink-3)]">Pick a category above, or search — all {OCCASIONS.length} are here.</li>}
        </ul>
        {/* Beside the list: real designs, always moving. */}
        <aside className="sticky top-[118px] h-[62vh] w-[36%] shrink-0 overflow-hidden rounded-[18px] [mask-image:linear-gradient(180deg,transparent_0%,#000_8%,#000_92%,transparent_100%)]" aria-hidden data-design-showcase>
          <div className="cx-marquee-y space-y-2.5">
            {[...SHOWCASE, ...SHOWCASE].map(({ t, o }, k) => (
              <InviteCard key={k} inv={{ title: o?.name ?? 'Our Celebration', event_date: sat, start_time: '18:30' }} occasion={o} theme={themeString(t.id, { art: !!o })} size="mini" />
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}

/* ── 2. The design: every one, best for this occasion first ───────── */
function StepDesign({ inv, occ, set, onUse }) {
  const [style, setStyle] = useState('all')
  const [peek, setPeek] = useState(null)
  const ranked = useMemo(() => templatesFor(occ), [occ])
  const rec = useMemo(() => recommendedFor(occ), [occ])
  const list = style === 'all' ? ranked : ranked.filter(t => (style === 'trending' ? t.trending : t.style === style))
  const cur = parseTheme(inv.theme, occ)
  const sample = { ...inv, title: inv.title || occ.name }
  const k = peek ? list.findIndex(t => t.id === peek) : -1
  const use = id => { set({ theme: themeString(id, { art: cur.art, live: cur.live }) }); setPeek(null); onUse() }
  return (
    <>
      <Q title="Pick a design you love" sub={`${ranked.length} designs · ${rec.size} made for ${occ.name}. Tap one to see it live.`} />
      <div className="cx-noscroll -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
        {STYLES.filter(([id]) => id === 'all' || (id === 'trending' ? ranked.some(t => t.trending) : ranked.some(t => t.style === id))).map(([id, l]) => (
          <button key={id} type="button" onClick={() => setStyle(id)} className={'shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ' + (style === id ? 'bg-[#1C1033] text-white' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>{id === 'all' ? `For ${occ.name.length > 16 ? 'you' : occ.name}` : l}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-3.5">
        {list.map(t => {
          const on = cur.t.id === t.id
          return (
            <button key={t.id} type="button" onClick={() => setPeek(t.id)} className="cx-press text-left" data-template={t.id}>
              <span className={'relative block rounded-[15px] p-[3px] transition ' + (on ? 'bg-gradient-to-br from-[#DB2777] to-[#7C3AED]' : 'bg-transparent')}>
                <InviteCard inv={sample} occasion={occ} theme={themeString(t.id, { art: cur.art })} size="mini" />
                {on && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[#7C3AED] shadow"><Check size={14} strokeWidth={3.2} /></span>}
              </span>
              <span className="mt-1 block truncate text-[11.5px] font-extrabold text-[#1C1033]">{t.name}</span>
              <span className={'block truncate text-[10px] font-extrabold ' + (rec.has(t.id) ? 'text-[#0C831F]' : t.trending ? 'text-[#DB2777]' : 'text-[var(--ink-3)]')}>{rec.has(t.id) ? '✓ Made for this' : t.trending ? '🔥 Trending' : t.vibe}</span>
            </button>
          )
        })}
      </div>

      <Sheet open={!!peek} onClose={() => setPeek(null)} title={peek ? TEMPLATE[peek].name : ''}
        footer={peek && <button type="button" onClick={() => use(peek)} className="cx-press cx-cta flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold" data-use-design><Check size={18} strokeWidth={3} />Use this design</button>}>
        {peek && (
          <div className="pb-2">
            <div className="relative mx-auto w-[78%] max-w-[300px]">
              <InviteCard inv={sample} occasion={occ} theme={themeString(peek, { art: cur.art, live: cur.live })} />
              {k > 0 && <button type="button" onClick={() => setPeek(list[k - 1].id)} aria-label="Previous design" className="cx-press absolute -left-11 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.18)]"><ChevronLeft size={20} /></button>}
              {k >= 0 && k < list.length - 1 && <button type="button" onClick={() => setPeek(list[k + 1].id)} aria-label="Next design" className="cx-press absolute -right-11 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.18)]"><ChevronRight size={20} /></button>}
            </div>
            <p className="mt-2 text-center text-[12.5px] font-bold text-[var(--ink-3)]">{TEMPLATE[peek].vibe}{k >= 0 ? ` · ${k + 1} of ${list.length}` : ''}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Chip on={cur.art} onClick={() => set({ theme: themeString(cur.t.id, { art: !cur.art, live: cur.live }) })}>Illustration</Chip>
              <Chip on={cur.live} onClick={() => set({ theme: themeString(cur.t.id, { art: cur.art, live: !cur.live }) })}>✨ Live animation</Chip>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}

/* ── A typed answer: one big field, suggestions, the card above ────── */
function StepText({ inv, occ, title, sub, value, onChange, max, placeholder, chips = [], area = false, long = false }) {
  return (
    <>
      <Q title={title} sub={sub} />
      {!long && <Preview inv={inv} occ={occ} />}
      {area ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} maxLength={max}
          className="mt-4 w-full resize-none rounded-[18px] bg-[#F6F3FA] p-4 text-[16px] font-semibold leading-snug text-[#1C1033] outline-none focus:ring-2 focus:ring-[#C4B5FD]" data-wizard-input />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} maxLength={max} placeholder={placeholder}
          className="mt-4 h-[58px] w-full rounded-[18px] bg-[#F6F3FA] px-4 text-[19px] font-extrabold tracking-[-0.02em] text-[#1C1033] outline-none placeholder:font-semibold placeholder:text-[#B5ADC6] focus:ring-2 focus:ring-[#C4B5FD]" data-wizard-input />
      )}
      {chips.length > 0 && (
        <div className={'mt-3 ' + (long ? 'space-y-2' : 'flex flex-wrap gap-2')}>
          {chips.map(c => (
            <button key={c} type="button" onClick={() => onChange(c)}
              className={'cx-press text-left font-bold transition ' + (long ? 'block w-full rounded-[16px] px-3.5 py-3 text-[13px] leading-snug ' : 'rounded-full px-3.5 py-2 text-[13px] ') + (value === c ? 'bg-[#F3ECFF] text-[#5B21B6] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E9E2F2]')}>
              {c}
            </button>
          ))}
        </div>
      )}
      {long && <Preview inv={inv} occ={occ} w="w-[40%]" />}
    </>
  )
}

/* ── When ─────────────────────────────────────────────────────────── */
function StepWhen({ inv, occ, set }) {
  const quick = [['This Saturday', iso(dayFrom(6))], ['This Sunday', iso(dayFrom(0))], ['Next Saturday', iso(dayFrom(6, 1))]]
  const t = (inv.start_time ?? '').slice(0, 5)
  return (
    <>
      <Q title="When is it?" sub="Guests get a “Save the date” button for their calendar." />
      <Preview inv={inv} occ={occ} w="w-[40%]" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {quick.map(([l, v]) => (
          <button key={l} type="button" onClick={() => set({ event_date: v })} className={'cx-press rounded-[14px] px-2 py-2.5 text-center text-[12.5px] font-extrabold transition ' + (inv.event_date === v ? 'bg-[#F3ECFF] text-[#5B21B6] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>{l}</button>
        ))}
      </div>
      <label className="mt-2 flex h-[56px] items-center gap-3 rounded-[18px] bg-[#F6F3FA] px-4">
        <span className="text-[13px] font-extrabold text-[var(--ink-3)]">Date</span>
        <input type="date" value={inv.event_date ?? ''} min={iso(new Date())} onChange={e => set({ event_date: e.target.value })} className="h-full min-w-0 flex-1 bg-transparent text-right text-[17px] font-extrabold text-[#1C1033] outline-none" data-wizard-date />
      </label>
      <p className="mt-4 flex items-center gap-1.5 text-[14px] font-extrabold text-[#1C1033]"><Clock size={16} className="text-[#7C3AED]" />What time?</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {TIMES.map(([v, l, s]) => (
          <button key={v} type="button" onClick={() => set({ start_time: v })} className={'cx-press rounded-[14px] px-1 py-2 text-center transition ' + (t === v ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#F6F3FA]')}>
            <span className={'block text-[11px] font-extrabold ' + (t === v ? 'text-[#5B21B6]' : 'text-[var(--ink-2)]')}>{l}</span>
            <span className="block text-[10px] font-bold text-[var(--ink-3)]">{s}</span>
          </button>
        ))}
      </div>
      <label className="mt-2 flex h-[50px] items-center gap-3 rounded-[16px] bg-[#F6F3FA] px-4">
        <span className="text-[13px] font-extrabold text-[var(--ink-3)]">Or exactly</span>
        <input type="time" value={t} onChange={e => set({ start_time: e.target.value })} className="h-full min-w-0 flex-1 bg-transparent text-right text-[16px] font-extrabold text-[#1C1033] outline-none" />
      </label>
    </>
  )
}

/* ── Where ────────────────────────────────────────────────────────── */
function StepWhere({ inv, occ, set }) {
  const field = 'w-full rounded-[18px] bg-[#F6F3FA] px-4 font-extrabold text-[#1C1033] outline-none placeholder:font-semibold placeholder:text-[#B5ADC6] focus:ring-2 focus:ring-[#C4B5FD]'
  return (
    <>
      <Q title="Where is it?" sub="Guests get a Directions button that opens Maps." />
      <Preview inv={inv} occ={occ} w="w-[40%]" />
      <input value={inv.venue_name ?? ''} onChange={e => set({ venue_name: e.target.value })} maxLength={160} placeholder="Venue — e.g. The Grand Banquet, Koramangala" className={'mt-4 h-[56px] text-[17px] ' + field} data-wizard-input />
      <input value={inv.venue_address ?? ''} onChange={e => set({ venue_address: e.target.value })} maxLength={400} placeholder="Address (street, area, city)" className={'mt-2 h-[52px] text-[15px] ' + field} />
      <label className="mt-2 flex h-[52px] items-center gap-2 rounded-[18px] bg-[#F6F3FA] px-4">
        <MapPin size={17} className="shrink-0 text-[#7C3AED]" />
        <input value={inv.map_url ?? ''} onChange={e => set({ map_url: e.target.value })} placeholder="Google Maps link (optional)" className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#1C1033] outline-none placeholder:text-[#B5ADC6]" />
      </label>
      <input value={inv.dress_code ?? ''} onChange={e => set({ dress_code: e.target.value })} maxLength={120} placeholder="Dress code (optional) — e.g. Traditional, pastels" className={'mt-2 h-[52px] text-[14px] ' + field} />
    </>
  )
}

/* ── Functions (multi-day occasions) ──────────────────────────────── */
function StepFunctions({ occ, inv, fns, setFns }) {
  const [own, setOwn] = useState('')
  const suggested = functionsFor(occ)
  const has = n => fns.some(f => f.name === n)
  const toggle = n => setFns(x => (has(n) ? x.filter(f => f.name !== n) : [...x, { name: n, event_date: inv.event_date ?? '', start_time: '', venue_name: '' }]))
  return (
    <>
      <Q title="One event, or several functions?" sub="Each function gets its own RSVP — guests say which ones they’ll attend." />
      <button type="button" onClick={() => setFns([])} className={'cx-press mt-4 flex w-full items-center gap-3 rounded-[18px] p-4 text-left transition ' + (!fns.length ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#F6F3FA]')}>
        <span className={'grid h-6 w-6 place-items-center rounded-full ' + (!fns.length ? 'bg-[#7C3AED] text-white' : 'ring-2 ring-[#D6CDE4]')}>{!fns.length && <Check size={14} strokeWidth={3} />}</span>
        <span className="text-[15px] font-extrabold text-[#1C1033]">Just one event</span>
      </button>
      <p className="mt-4 text-[13px] font-extrabold text-[var(--ink-2)]">Or pick the functions</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[...new Set([...suggested, ...fns.map(f => f.name)])].map(n => (
          <button key={n} type="button" onClick={() => toggle(n)} className={'cx-press flex items-center gap-1 rounded-full px-4 py-2.5 text-[14px] font-extrabold transition ' + (has(n) ? 'bg-[#7C3AED] text-white' : 'bg-[#F6F3FA] text-[var(--ink-2)]')}>{has(n) && <Check size={14} strokeWidth={3} />}{n}</button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={own} onChange={e => setOwn(e.target.value)} maxLength={80} placeholder="Add another — e.g. Sangeet night" className="h-12 min-w-0 flex-1 rounded-[14px] bg-[#F6F3FA] px-3.5 text-[14px] font-bold outline-none" />
        <button type="button" disabled={!own.trim()} onClick={() => { toggle(own.trim()); setOwn('') }} className="cx-press grid h-12 w-12 place-items-center rounded-[14px] bg-[#1C1033] text-white disabled:opacity-30" aria-label="Add function"><Plus size={18} /></button>
      </div>
      {fns.length > 0 && (
        <div className="mt-4 space-y-2">
          {fns.map((f, k) => (
            <div key={f.name} className="flex items-center gap-2 rounded-[16px] bg-white p-2.5 shadow-[inset_0_0_0_1px_#EEE6FA]">
              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{f.name}</span>
              <input type="date" value={f.event_date ?? ''} onChange={e => setFns(x => x.map((y, j) => (j === k ? { ...y, event_date: e.target.value } : y)))} className="h-10 w-[138px] shrink-0 rounded-[11px] bg-[#F6F3FA] px-2 text-[13px] font-bold outline-none" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* ── RSVP options ─────────────────────────────────────────────────── */
function StepRsvp({ inv, set }) {
  const rows = [
    ['allow_kids', 'Count children separately', 'Guests say adults and kids — perfect for food and seating'],
    ['ask_meal', 'Ask their food preference', 'Veg, non-veg, Jain, vegan — counted for you'],
    ['open_enabled', 'One link for WhatsApp groups', 'Drop it in a group; each person types their name'],
  ]
  return (
    <>
      <Q title="What should guests tell you?" sub="Everyone says if they’re coming and how many. Add what else you need." />
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-3 rounded-[18px] bg-[#ECFDF3] p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#0C831F] text-white"><Users size={19} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold text-[#0B4F2A]">Coming or not · how many</span><span className="block text-[12px] font-semibold text-[#3C7A5A]">Always asked — this is your live headcount</span></span>
          <Check size={20} className="text-[#0C831F]" strokeWidth={3} />
        </div>
        {rows.map(([k, t, s]) => (
          <button key={k} type="button" onClick={() => set({ [k]: !inv[k] })} aria-pressed={!!inv[k]} className={'cx-press flex w-full items-center gap-3 rounded-[18px] p-4 text-left transition ' + (inv[k] ? 'bg-[#F3ECFF] shadow-[inset_0_0_0_2px_#7C3AED]' : 'bg-[#F6F3FA]')} data-rsvp-opt={k}>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold text-[#1C1033]">{t}</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">{s}</span></span>
            <span className={'relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors ' + (inv[k] ? 'bg-[#7C3AED]' : 'bg-[#DCD5E6]')}><span className={'absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ' + (inv[k] ? 'left-[23px]' : 'left-[3px]')} /></span>
          </button>
        ))}
        <label className="flex h-[56px] items-center gap-3 rounded-[18px] bg-[#F6F3FA] px-4">
          <span className="text-[14px] font-extrabold text-[#1C1033]">Reply by</span>
          <input type="date" value={inv.rsvp_by ?? ''} min={iso(new Date())} max={inv.event_date || undefined} onChange={e => set({ rsvp_by: e.target.value })} className="h-full min-w-0 flex-1 bg-transparent text-right text-[15px] font-extrabold outline-none" />
        </label>
      </div>
    </>
  )
}

/* ── Review ───────────────────────────────────────────────────────── */
function StepReview({ inv, occ, fns, go, err }) {
  const { t } = parseTheme(inv.theme, occ)
  const rows = [
    ['design', 'Design', t.name], ['when', 'When', [nice(inv.event_date), inv.start_time && `${inv.start_time.slice(0, 5)}`].filter(Boolean).join(' · ') || 'Not set yet'],
    ['where', 'Where', inv.venue_name || 'Not set yet'], ...(fns.length ? [['functions', 'Functions', fns.map(f => f.name).join(', ')]] : []),
    ['rsvp', 'Guests tell you', ['how many', inv.allow_kids && 'kids', inv.ask_meal && 'food'].filter(Boolean).join(' · ')],
  ]
  return (
    <>
      <Q title="Looks perfect?" sub="This is exactly what your guests will open." />
      <div className="mx-auto mt-4 w-[80%] max-w-[320px]" data-review-card><InviteCard inv={inv} occasion={occ} theme={inv.theme} /></div>
      <div className="mt-5 divide-y divide-[#F1ECF6] rounded-[20px] bg-[#FBF9FD] px-4 shadow-[inset_0_0_0_1px_#F0EAF6]">
        {rows.map(([k, l, v]) => (
          <button key={k} type="button" onClick={() => go(k)} className="flex w-full items-center gap-3 py-3.5 text-left">
            <span className="w-[92px] shrink-0 text-[12.5px] font-extrabold text-[var(--ink-3)]">{l}</span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-[#1C1033]">{v}</span>
            <span className="shrink-0 text-[12.5px] font-extrabold text-[#7C3AED]">Edit</span>
          </button>
        ))}
      </div>
      {err && <p className="mt-3 rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[13px] font-bold text-[#9B1A2A]">{err}</p>}
    </>
  )
}

/* ── Guests: upload, contacts, paste, or one by one ───────────────── */
function StepGuests({ invId, added, onAdded, onDone }) {
  const [mode, setMode] = useState(null)
  const [found, setFound] = useState([])
  const [off, setOff] = useState(() => new Set())
  const [text, setText] = useState('')
  const [name, setName] = useState(''); const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [note, setNote] = useState('')
  const sent = useRef(new Set())
  const file = useRef(null)
  const key = p => String(p ?? '').replace(/\D/g, '').slice(-10)
  const chosen = found.filter((g, k) => !off.has(k))

  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setErr(''); setBusy(true)
    try { const list = await guestsFromFile(f); setFound(list); setOff(new Set()); if (!list.length) setErr('No names found in that file. The first column should be names, with numbers beside them.') }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  async function fromContacts() {
    setErr('')
    try { const list = await pickContacts(); setFound(list); setOff(new Set()) } catch { /* cancelled */ }
  }
  async function add() {
    const list = chosen.filter(g => !g.phone || !sent.current.has(key(g.phone)))
    if (!list.length) return
    setBusy(true); setErr('')
    try {
      await addGuests(invId, list.map(g => ({ name: g.name.trim().slice(0, 100), phone: g.phone })))
      list.forEach(g => g.phone && sent.current.add(key(g.phone)))
      onAdded(list.length); setFound([]); setText(''); setMode(null)
      setNote(`${list.length} guest${list.length === 1 ? '' : 's'} added — each has their own RSVP link`)
    } catch (x) { setErr(/duplicate|unique/i.test(x.message) ? 'One of those numbers is already on your list — remove it and try again.' : x.message) } finally { setBusy(false) }
  }

  const tiles = [
    ['upload', FileSpreadsheet, 'Upload a list', 'Excel, CSV or contacts (.vcf)', '#0C831F', '#ECFDF3'],
    ...(canPickContacts() ? [['contacts', Contact, 'From my contacts', 'Pick people from your phone', '#2563EB', '#EFF6FF']] : []),
    ['paste', MessageCircle, 'Paste a list', 'From WhatsApp or notes', '#DB2777', '#FDF2F8'],
    ['one', UserPlus, 'Add one by one', 'Name and WhatsApp number', '#7C3AED', '#F5F3FF'],
  ]
  return (
    <>
      {added === 0 && (
        <div className="cx-pop flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-[#ECFDF3] to-[#F3ECFF] p-4" data-created>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#DB2777] shadow"><PartyPopper size={22} /></span>
          <span className="min-w-0"><span className="block text-[16px] font-black tracking-[-0.02em] text-[#1C1033]">Your invitation is ready!</span><span className="block text-[12.5px] font-semibold text-[var(--ink-2)]">Now add who you’re inviting — every guest gets a personal RSVP link.</span></span>
        </div>
      )}
      <div className="mt-4"><Q title="Who are you inviting?" sub={added ? `${added} on your list so far. Add more, or go on to send.` : 'Bring your list in seconds — or add people one at a time.'} /></div>
      {note && <p className="cx-pop mt-3 rounded-[14px] bg-[#ECFDF3] px-3.5 py-2.5 text-[13px] font-extrabold text-[#0B6B3D]">✓ {note}</p>}

      {!found.length && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {tiles.map(([k, I, t, s, c, bg]) => (
            <button key={k} type="button" onClick={() => { setErr(''); if (k === 'upload') file.current?.click(); else if (k === 'contacts') fromContacts(); else setMode(k) }}
              className={'cx-press flex min-h-[118px] flex-col items-start justify-between rounded-[20px] p-3.5 text-left transition ' + (mode === k ? 'shadow-[inset_0_0_0_2px_currentColor]' : '')} style={{ background: bg, color: c }} data-guest-mode={k}>
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white shadow-[0_4px_12px_-6px_rgba(0,0,0,.25)]"><I size={20} /></span>
              <span><span className="block text-[15px] font-black tracking-[-0.02em] text-[#1C1033]">{t}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">{s}</span></span>
            </button>
          ))}
        </div>
      )}
      <input ref={file} type="file" accept=".xlsx,.csv,.txt,.vcf,text/csv,text/plain,text/vcard,text/x-vcard,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onFile} data-guest-file />
      {busy && !found.length && <p className="mt-3 flex items-center gap-2 text-[13px] font-bold text-[var(--ink-2)]"><Loader2 size={16} className="animate-spin" />Reading your list…</p>}

      {mode === 'paste' && !found.length && (
        <div className="mt-4">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder={'One per line:\nRavi Kumar, 98450 12345\nAnita Rao 9886012345\nMeena aunty'} className="w-full resize-none rounded-[18px] bg-[#F6F3FA] p-4 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-[#C4B5FD]" data-guest-paste />
          <button type="button" disabled={!text.trim()} onClick={() => { const r = parseGuestList(text); setFound(r.guests); setOff(new Set()) }} className="cx-press cx-cta mt-2 h-12 w-full rounded-[16px] text-[15px] font-extrabold disabled:opacity-40">Read the list</button>
        </div>
      )}
      {mode === 'one' && (
        <div className="mt-4 space-y-2">
          <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Name" className="h-[54px] w-full rounded-[16px] bg-[#F6F3FA] px-4 text-[16px] font-extrabold outline-none focus:ring-2 focus:ring-[#C4B5FD]" data-guest-name />
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" maxLength={16} placeholder="WhatsApp number" className="h-[54px] w-full rounded-[16px] bg-[#F6F3FA] px-4 text-[16px] font-extrabold outline-none focus:ring-2 focus:ring-[#C4B5FD]" />
          <button type="button" disabled={name.trim().length < 2} onClick={() => { setFound(f => [...f, { name: name.trim(), phone: phone.trim() || null }]); setName(''); setPhone('') }} className="cx-press flex h-12 w-full items-center justify-center gap-1.5 rounded-[16px] bg-[#1C1033] text-[14.5px] font-extrabold text-white disabled:opacity-30"><Plus size={17} />Add to the list</button>
        </div>
      )}

      {found.length > 0 && (
        <div className="mt-4" data-guests-found>
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-black text-[#1C1033]">{chosen.length} of {found.length} selected</p>
            <button type="button" onClick={() => { setFound([]); setMode(null) }} className="text-[13px] font-extrabold text-[var(--ink-3)]">Start over</button>
          </div>
          {found.some(g => !g.phone) && <p className="mt-0.5 text-[12px] font-semibold text-[#8A5300]">{found.filter(g => !g.phone).length} without a number — you can share their link yourself.</p>}
          <ul className="mt-2 max-h-[46vh] divide-y divide-[#F1ECF6] overflow-y-auto rounded-[18px] bg-[#FBF9FD] shadow-[inset_0_0_0_1px_#F0EAF6]">
            {found.map((g, k) => (
              <li key={k}>
                <button type="button" onClick={() => setOff(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
                  <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-[8px] transition ' + (off.has(k) ? 'ring-2 ring-[#D6CDE4]' : 'bg-[#7C3AED] text-white')}>{!off.has(k) && <Check size={14} strokeWidth={3} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{g.name}</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">{g.phone ?? 'No number'}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" disabled={busy || !chosen.length} onClick={add} className="cx-press cx-cta mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-extrabold disabled:opacity-40" data-add-found>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}Add {chosen.length} guest{chosen.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
      {err && <p className="mt-3 rounded-[14px] bg-[#FFF1F2] px-3 py-2.5 text-[13px] font-bold text-[#9B1A2A]">{err}</p>}

      {!found.length && (
        <button type="button" onClick={onDone} className={'cx-press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15.5px] font-extrabold ' + (added ? 'cx-cta' : 'bg-[#F6F3FA] text-[var(--ink-2)]')} data-guests-next>
          {added ? <>Next: send {added} invite{added === 1 ? '' : 's'}<ChevronRight size={19} /></> : 'Skip — I’ll share one group link'}
        </button>
      )}
    </>
  )
}

/* ── Send ─────────────────────────────────────────────────────────── */
function StepSend({ invId, added, onAddMore }) {
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  async function group() {
    setBusy(true)
    try {
      await saveInvitation({ id: invId, open_enabled: true, status: 'sent' })
      const full = await getInvitation(invId)
      const r = await shareText(inviteText(full), full.title)
      setNote(r === 'copied' ? 'Group link copied — paste it in your WhatsApp group' : r === 'shared' ? 'Shared!' : '')
    } catch (e) { setNote(e.message) } finally { setBusy(false) }
  }
  return (
    <>
      <Q title="Send your invites" sub="WhatsApp opens with the message and their personal link ready — you just tap send." />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-[20px] bg-[#F5F3FF] p-4"><p className="cx-num text-[34px] font-black leading-none tracking-[-0.04em] text-[#5B21B6]">{added}</p><p className="mt-1 text-[12.5px] font-extrabold text-[var(--ink-2)]">guests on your list</p></div>
        <div className="rounded-[20px] bg-[#ECFDF3] p-4"><p className="cx-num text-[34px] font-black leading-none tracking-[-0.04em] text-[#0B6B3D]">0</p><p className="mt-1 text-[12.5px] font-extrabold text-[var(--ink-2)]">replies yet — live</p></div>
      </div>
      {added > 0 && (
        <button type="button" onClick={() => navigate(`/invites/${invId}`, { replace: true })} className="cx-press mt-4 flex h-[60px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#25D366] text-[16.5px] font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(37,211,102,.9)]" data-send-whatsapp>
          <MessageCircle size={20} />Send on WhatsApp, one by one
        </button>
      )}
      <button type="button" onClick={group} disabled={busy} className={'cx-press mt-2.5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold ' + (added ? 'bg-white text-[#1C1033] shadow-[inset_0_0_0_1.5px_#E2D9EE]' : 'bg-[#25D366] text-white shadow-[0_14px_26px_-14px_rgba(37,211,102,.9)]')} data-send-group>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}Share one link to a WhatsApp group
      </button>
      {note && <p className="cx-pop mt-3 rounded-[14px] bg-[#F3ECFF] px-3.5 py-2.5 text-[13px] font-extrabold text-[#5B21B6]">{note}</p>}
      <button type="button" onClick={onAddMore} className="mt-4 flex w-full items-center justify-center gap-1 text-[13.5px] font-extrabold text-[#7C3AED]"><Plus size={16} />Add more guests</button>
      <p className="mt-4 text-center text-[12px] font-semibold text-[var(--ink-3)]">Your dashboard shows who has seen it, who’s coming and the headcount — live.</p>
    </>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={'cx-press flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[13px] font-extrabold transition ' + (on ? 'bg-[#EEFAF2] text-[#0B5F33] shadow-[inset_0_0_0_1.5px_#16A34A]' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E7E1F0]')}>
      {on && <Check size={14} strokeWidth={3} />}{children}
    </button>
  )
}
