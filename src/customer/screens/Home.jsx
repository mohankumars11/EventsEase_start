/**
 * Home (Mohan, 2026-10-23).
 *
 *   location ·························· bell · you
 *   [ Celebrations ]  [ Book a Service ]      the two doors, up top
 *   ┌ promo: moments → how it works → refer ┐ one card at a time, on its own
 *   ● Instant booking                         what the app does, live
 *   ( Search "Haldi Ceremony"… )              the box names real things
 *   Celebrate anything. Book it in minutes.   + View all
 *   ▢ ▢ ▢  18 categories, their occasions taking turns underneath
 *   Crafted with love in Mysuru               the sign-off
 *
 * No brand name or logo anywhere on the screen, by instruction.
 *
 * ── The promo cards are Mohan's artwork, with real buttons ──────────
 * Each image had its button painted in, at a different place on each
 * card. The art is cropped just above it and one real button sits under
 * every card, same size, same place: Book a Celebration Instantly → the
 * categories below; Book a Service Instantly → Services; Refer Your
 * Friend → Refer. The whole card answers a tap the same way. They move
 * every 1.5 s (as asked), stop while a thumb is on them, and have no dots.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, CalendarDays, ChevronDown, ChevronRight, Loader2, LocateFixed, MapPin, Search, Users, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { CATEGORIES, OCCASIONS } from '../data/occasions'
import { TRADES, TRADE_GROUPS } from '../data/trades'
import { artFor } from '../data/art'
import { CategoryCard, Rotator, ServiceCard } from '../ui/art'
import { Sheet } from '../ui/kit'
import { locate, saveWhere, savedWhere } from '../lib/where'

/* The artwork is cropped just above its painted button; the button is a
   real one, the same size and place on all three, so the deck lines up. */
const PROMOS = [
  { id: 'promo-moments', alt: 'Make every moment special', label: 'Book a Celebration Instantly', icon: Zap, go: 'celebrate' },
  { id: 'promo-how', alt: 'From a thought to a celebration — how it works', label: 'Book a Service Instantly', icon: CalendarDays, go: '/s' },
  { id: 'promo-refer', alt: 'Celebrate together — refer and earn', label: 'Refer Your Friend', icon: Users, go: '/refer' },
]
const HOLD_MS = 1500
const SLIDE_MS = 600

/* What the app really does, said one at a time. Only shipped features. */
const LIVE = [
  ['Instant booking', 'confirm a master in seconds'],
  ['Instant payment', 'UPI, cards, netbanking'],
  ['Escrow-safe', 'paid out only after your event'],
  ['Verified masters', 'checked before they go live'],
  ['Negotiate', 'send your price, they reply'],
  ['Compare', 'three masters side by side'],
]

export default function Home() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [door, setDoor] = useState(() => { try { return sessionStorage.getItem('sbm.cx.door') ?? 'occasions' } catch { return 'occasions' } })
  const [whereOpen, setWhereOpen] = useState(false)
  const [where, setWhere] = useState(savedWhere)
  const grid = useRef(null)
  const choose = d => { setDoor(d); try { sessionStorage.setItem('sbm.cx.door', d) } catch { /* storage off */ } }
  const name = profile?.full_name?.trim()
  const photo = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
  const initial = (name || user?.email || 'S').trim()[0].toUpperCase()
  const hints = useMemo(() => shuffle([...OCCASIONS.filter(o => o.featured).map(o => o.name), ...TRADES.map(t => t.label)]).slice(0, 40), [])
  const celebrate = () => { choose('occasions'); requestAnimationFrame(() => grid.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
      <header className="cx-safe-top flex items-center justify-between gap-3 px-3">
        {/* Where you are, said plainly in the corner — not a button. Tapping it still changes it. */}
        <button type="button" onClick={() => setWhereOpen(true)} className="flex min-w-0 items-start gap-1.5 py-1 text-left" data-where>
          <MapPin size={20} className="mt-[3px] shrink-0 fill-[var(--brand)] text-white" strokeWidth={1.8} />
          <span className="min-w-0">
            <span className="flex items-center gap-0.5 text-[17px] font-extrabold leading-tight tracking-[-0.025em]"><span className="truncate">{where?.area ?? 'Bengaluru'}</span><ChevronDown size={16} className="shrink-0" /></span>
            <span className="block truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{[where?.city ?? 'Bengaluru', where?.pincode].filter(Boolean).join(' · ')}{where?.test ? ' · testing' : ''}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/notifications" aria-label="Notifications" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-[var(--am-50)] text-[var(--am-ink)]"><Bell size={20} /></Link>
          <Link to="/me" aria-label="Your profile" className="cx-press relative grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#A57BFF] to-[#6D35E0] text-[16px] font-extrabold text-white ring-2 ring-white shadow-[0_8px_20px_-12px_rgba(58,18,144,.8)]" data-avatar>
            {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
          </Link>
        </div>
      </header>

      {/* The two doors. */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 px-3" role="tablist">
        <Door on={door === 'occasions'} onClick={() => choose('occasions')} title="Celebrations" sub="Planned in minutes" />
        <Door on={door === 'services'} onClick={() => choose('services')} title="Book a Service" sub="Masters are ready" />
      </div>

      <Promos onGo={g => (g === 'celebrate' ? celebrate() : navigate(g))} />

      {/* Live: what the app does, one line at a time. */}
      <div className="mt-3.5 flex justify-center px-3">
        <span className="flex max-w-full items-center gap-2 rounded-full bg-[#F1FBF5] px-3 py-1.5 ring-1 ring-[#CDEFDC]" data-live>
          <span className="cx-live-dot h-2 w-2 shrink-0 rounded-full bg-[var(--ok)]" />
          <Rotator items={LIVE.map(([a, b]) => <><b className="font-extrabold text-[#0B6B3D]">{a}</b><span className="text-[#3C7A5A]"> · {b}</span></>)} every={2200} className="text-[12px] font-semibold" />
        </span>
      </div>

      <button type="button" onClick={() => navigate('/search')} className="cx-press mx-3 mt-3.5 flex h-[54px] w-[calc(100%-24px)] items-center gap-2.5 rounded-[22px] bg-white px-3 text-left shadow-[0_0_0_1.5px_var(--am-200),0_12px_26px_-18px_rgba(58,18,144,.65)]" data-search>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[var(--am-50)] text-[var(--brand)]"><Search size={19} /></span>
        <span className="flex min-w-0 flex-1 items-center gap-1 text-[14px] font-semibold text-[var(--ink-3)]">
          Search<Rotator items={hints.map(h => <span className="font-extrabold text-[var(--am-ink)]">“{h}”</span>)} every={2000} />
        </span>
      </button>

      <section ref={grid} className="mt-7 scroll-mt-4" key={door}>
        <div className="flex items-end justify-between gap-3 px-3 pb-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">{door === 'occasions' ? 'Your moment · our masters' : 'One tap · one master'}</p>
            <h2 className="mt-1 text-[21px] font-extrabold leading-[1.1] tracking-[-0.035em]">{door === 'occasions' ? <>Celebrate anything.<br />Book it in minutes.</> : <>The right master,<br />at your door.</>}</h2>
          </div>
          <Link to="/explore" className="cx-press flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-2 text-[12.5px] font-extrabold text-[var(--brand)] shadow-[0_0_0_1px_var(--am-200)]" data-view-all>View all<ChevronRight size={15} /></Link>
        </div>
        {door === 'occasions' ? (
          <div className="cx-enter grid grid-cols-3 gap-2 px-3">
            {CATEGORIES.map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}
          </div>
        ) : (
          <div className="cx-enter">
            {TRADE_GROUPS.map((g, i) => (
              <div key={g.id} className={i ? 'mt-5' : ''}>
                <h3 className="px-3 pb-2.5 text-[14px] font-extrabold tracking-[-0.02em] text-[var(--ink-2)]">{g.label}</h3>
                <div className="grid grid-cols-3 gap-2 px-3">{g.trades.map(t => <ServiceCard key={t.id} tradeId={t.id} />)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SignOff />

      <WhereSheet open={whereOpen} onClose={() => setWhereOpen(false)} onPick={p => { saveWhere(p); setWhere(savedWhere()); setWhereOpen(false) }} />
    </main>
  )
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* The two doors are the brand's two promises, so they are words, not
   icons: bold, large, a living amethyst when chosen (the splash colour,
   lifted), a soft amethyst when not — clearly a toggle either way. */
function Door({ on, onClick, title, sub }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick} data-door={title}
      className={'cx-press relative min-w-0 overflow-hidden rounded-[22px] px-4 py-3.5 text-left transition-all duration-300 ' +
        (on ? 'cx-door-on bg-gradient-to-br from-[#A57BFF] via-[#8650F2] to-[#6D35E0] text-white shadow-[0_16px_30px_-14px_rgba(91,33,168,.95),inset_0_1px_0_rgba(255,255,255,.35)]'
            : 'bg-[#EEE5FF] text-[#3A1290] shadow-[inset_0_0_0_1.5px_#DCCBFF]')}>
      <span className={'absolute right-3 top-3 h-2 w-2 rounded-full transition ' + (on ? 'bg-white shadow-[0_0_0_4px_rgba(255,255,255,.25),0_0_10px_2px_rgba(255,255,255,.8)]' : 'bg-[#C8B2FF]')} />
      <span className="block truncate pr-3 text-[17.5px] font-black leading-tight tracking-[-0.035em]">{title}</span>
      <span className={'mt-0.5 block truncate text-[11.5px] font-bold ' + (on ? 'text-white/85' : 'text-[#6B5C92]')}>{sub}</span>
    </button>
  )
}

/* ── The promo cards ─────────────────────────────────────────────── */
function Promos({ onGo }) {
  const slides = [...PROMOS, PROMOS[0]]          // a copy of the first, so the loop never runs backwards
  const [i, setI] = useState(0)
  const [animate, setAnimate] = useState(true)
  const held = useRef(0)
  const touch = useRef(null)
  useEffect(() => {
    const t = setInterval(() => { if (Date.now() > held.current) { setAnimate(true); setI(n => n + 1) } }, HOLD_MS + SLIDE_MS)
    return () => clearInterval(t)
  }, [])
  /* Landing on the copy: jump, unanimated, to the real first card. */
  useEffect(() => {
    if (i !== PROMOS.length) return
    const t = setTimeout(() => { setAnimate(false); setI(0) }, SLIDE_MS + 20)
    return () => clearTimeout(t)
  }, [i])
  const hold = () => { held.current = Date.now() + 5000 }
  const swipe = dx => { hold(); setAnimate(true); setI(n => (dx < 0 ? Math.min(n + 1, PROMOS.length) : Math.max(n - 1, 0))) }

  return (
    <section className="mx-3 mt-3.5 overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#EEE6FA,0_20px_36px_-24px_rgba(58,18,144,.75)]" aria-roledescription="carousel" aria-label="Offers"
      onTouchStart={e => { hold(); touch.current = e.touches[0].clientX }}
      onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 40) swipe(dx) }}>
      <div className="cx-track" style={{ transform: `translateX(-${i * 100}%)`, transition: animate ? undefined : 'none' }}>
        {slides.map((p, k) => (
          <div key={`${p.id}-${k}`} className="bg-white" data-promo={p.id} aria-hidden={k !== i}>
            <button type="button" onClick={() => onGo(p.go)} tabIndex={-1} className="relative block aspect-[1200/553] w-full bg-[#F6F0FF]" aria-label={p.alt}>
              <img src={artFor(p.id)} alt="" className="absolute inset-0 h-full w-full object-cover" loading={k ? 'lazy' : 'eager'} />
            </button>
            <div className="p-2">
              <button type="button" onClick={() => onGo(p.go)} tabIndex={k === i ? 0 : -1} className="cx-press cx-cta flex h-12 w-full items-center gap-2.5 rounded-[16px] pl-3 pr-1.5 text-left" data-promo-go={p.id}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-white text-[var(--brand)] shadow-[0_4px_10px_-6px_rgba(58,18,144,.7)]"><p.icon size={17} strokeWidth={2.4} /></span>
                <span className="flex-1 truncate text-[14.5px] font-extrabold tracking-[-0.02em]">{p.label}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[var(--brand)] text-white"><ArrowRight size={18} /></span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── The sign-off ────────────────────────────────────────────────── */
function SignOff() {
  return (
    <footer className="mt-14 overflow-hidden" aria-label="Crafted with love in Mysuru">
      <div className="px-6">
        <p className="text-[42px] font-extrabold leading-[0.96] tracking-[-0.05em] text-[#E6DDF6]">Crafted<br />with love <Heart /><br /><span className="text-[#D8CAF1]">in Mysuru.</span></p>
        <p className="mt-3 text-[12.5px] font-bold text-[#A79BC2]">For every celebration across India.</p>
      </div>
      <div className="mt-6 bg-gradient-to-b from-white via-[#FBF8FF] to-[#F3EDFF] pt-2">
        <Palace className="block h-auto w-full text-[#D9CBF2]" />
      </div>
    </footer>
  )
}

/* A real red heart, beating slowly. */
function Heart() {
  return (
    <svg viewBox="0 0 32 29" className="cx-beat inline-block h-[0.78em] w-auto align-baseline drop-shadow-[0_4px_8px_rgba(255,0,32,.35)]" aria-label="love">
      <path d="M16 28.5S1 19.6 1 9.4C1 4.6 4.7 1 9.2 1c2.9 0 5.4 1.5 6.8 3.8C17.4 2.5 19.9 1 22.8 1 27.3 1 31 4.6 31 9.4 31 19.6 16 28.5 16 28.5z" fill="#FF0F2E" />
      <path d="M8.6 5.2c-2 .3-3.6 2-3.8 4.1" stroke="#FFC2CB" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/* Mysuru Palace, edge to edge: the gilded central dome on its tower, the
   two domes beside it, the corner towers, the chhatris on the parapet,
   the long Indo-Saracenic arcade and the steps up to it. */
function Palace({ className }) {
  const arches = Array.from({ length: 15 }, (_, k) => 40 + k * 21)
  return (
    <svg viewBox="0 -10 390 140" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M0 128h390" />
      <path d="M8 128v-16h374v16" />
      <path d="M150 128v-6h90v6M158 122v-5h74v5" />
      <path d="M28 112V76h334v36" />
      <path d="M24 76h342M28 82h334" />
      {arches.map(x => <path key={x} d={`M${x} 112v-13a7.5 7.5 0 0 1 15 0v13`} />)}
      <path d="M32 76V46h26v30M332 76V46h26v30" />
      <path d="M32 46c0-9 6-15 13-18 7 3 13 9 13 18M332 46c0-9 6-15 13-18 7 3 13 9 13 18" />
      <path d="M45 28v-7M345 28v-7" /><circle cx="45" cy="19.5" r="1.6" /><circle cx="345" cy="19.5" r="1.6" />
      {[38, 46].map(x => <path key={x} d={`M${x} 70v-12M${x + 300} 70v-12`} />)}
      {[84, 110, 268, 294].map(x => <g key={x}><path d={`M${x} 76v-9h14v9`} /><path d={`M${x} 67c0-5 3-8 7-10 4 2 7 5 7 10`} /><path d={`M${x + 7} 57v-4`} /></g>)}
      <path d="M128 76V52h24v24M238 76V52h24v24" />
      <path d="M128 52c0-8 5-13 12-16 7 3 12 8 12 16M238 52c0-8 5-13 12-16 7 3 12 8 12 16" />
      <path d="M140 36v-6M250 36v-6" />
      <path d="M158 76V38h74v38" />
      <path d="M158 50h74M158 62h74" />
      {[168, 182, 196, 210].map(x => <path key={x} d={`M${x} 74v-8a5 5 0 0 1 10 0v8M${x} 60v-6a5 5 0 0 1 10 0v6`} />)}
      <path d="M160 38c0-18 16-28 35-38 19 10 35 20 35 38" />
      <path d="M176 38c0-11 9-19 19-25 10 6 19 14 19 25" opacity=".55" />
      <path d="M195 0v-6" /><circle cx="195" cy="-7.5" r="1.8" />
    </svg>
  )
}

/* ── Where am I ──────────────────────────────────────────────────── */
function WhereSheet({ open, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return BENGALURU_AREAS.filter(a => !t || a.name.toLowerCase().includes(t)).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
  }, [q])
  async function here() {
    setBusy(true); setErr('')
    const r = await locate()
    setBusy(false)
    if (!r.ok) { setErr('Location is off. Pick your area below.'); return }
    if (!r.market?.live) { setErr(`You are in ${r.place.area}. We are live in Bengaluru — pick an area below.`); return }
    onPick({ ...r.place, market: r.market.id, test: !!r.market.test })
  }
  return (
    <Sheet open={open} onClose={onClose} title="Where are you?">
      <button type="button" onClick={here} className="cx-press cx-btn flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left">
        {busy ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
        <span className="flex-1 text-[14.5px] font-extrabold">Use my current location</span><ArrowRight size={16} />
      </button>
      {err && <p className="mt-2 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-[16px] bg-[var(--am-50)] px-3.5 ring-1 ring-[var(--am-200)]">
        <Search size={17} className="text-[var(--brand)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your area" className="h-full flex-1 bg-transparent text-[14px] font-bold outline-none placeholder:text-[var(--ink-3)]" />
      </label>
      <ul className="mt-2 max-h-[40dvh] overflow-y-auto pb-2">
        {list.map(a => (
          <li key={a.name}>
            <button type="button" onClick={() => onPick({ area: a.name, city: 'Bengaluru', lat: a.lat, lng: a.lng, market: 'BLR', source: 'picked' })}
              className="cx-press flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left text-[14.5px] font-bold last:border-0">
              <MapPin size={16} className="text-[var(--brand)]" />{a.name}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
