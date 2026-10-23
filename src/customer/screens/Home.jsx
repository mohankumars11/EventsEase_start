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
        <Palace className="block h-auto w-full" />
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

/* Mysuru Palace, front on, edge to edge — drawn from its elevation, not a
   generic dome: the tall gilded central dome on its tiered tower, the
   seven-arch portico with the Gajalakshmi pediment above, the two domed
   towers that flank it, the corner towers, the chhatris on the roofline,
   the arcaded wings and the steps. Filled and lit from the left (each
   face has a shaded right side, each dome a highlight) so it reads as a
   building, not an outline. */
function Palace({ className }) {
  const C = { wall: '#F1EBFC', shade: '#E2D6F7', depth: '#D2C0EF', line: '#CDBBEE', cornice: '#E4D9F7', pin: '#D9CAF3' }
  const dome = (cx, r, b, h, k) => (
    <g key={k}>
      <path d={`M${cx - r} ${b}C${cx - r * 1.18} ${b - h * 0.42} ${cx - r * 0.38} ${b - h * 0.8} ${cx} ${b - h}C${cx + r * 0.38} ${b - h * 0.8} ${cx + r * 1.18} ${b - h * 0.42} ${cx + r} ${b}Z`} fill="url(#pal-dome)" stroke={C.line} strokeWidth=".8" />
      <path d={`M${cx - r * 0.55} ${b - h * 0.2}C${cx - r * 0.6} ${b - h * 0.5} ${cx - r * 0.25} ${b - h * 0.72} ${cx - r * 0.05} ${b - h * 0.82}`} stroke="#FFFFFF" strokeOpacity=".8" strokeWidth={Math.max(1.2, r * 0.12)} strokeLinecap="round" fill="none" />
      <rect x={cx - r - 1.5} y={b - 1.5} width={2 * r + 3} height="3.5" rx="1" fill={C.cornice} stroke={C.line} strokeWidth=".6" />
      <path d={`M${cx} ${b - h}v-${h * 0.22}`} stroke={C.line} strokeWidth="1.1" />
      <circle cx={cx} cy={b - h - h * 0.08} r={Math.max(1, r * 0.09)} fill="#E8C766" />
      <circle cx={cx} cy={b - h - h * 0.18} r={Math.max(0.8, r * 0.06)} fill="#E8C766" />
    </g>
  )
  const archWin = (x, y, w, h, k) => <path key={k} d={`M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}Z`} fill={C.depth} />
  /* a cusped (foliated) arch, the portico's signature */
  const cusped = (x, w, top, bottom, k) => {
    const q = w / 4
    return <path key={k} d={`M${x} ${bottom}V${top + q * 1.6}q0 -${q} ${q} -${q * 1.2}q${q * 0.2} -${q} ${q} -${q}q${q * 0.8} 0 ${q} ${q}q${q} ${q * 0.2} ${q} ${q * 1.2}V${bottom}Z`} fill={C.depth} />
  }
  const tower = (x, w, top, bottom, k) => (
    <g key={k}>
      <rect x={x} y={top} width={w} height={bottom - top} fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <rect x={x + w * 0.64} y={top} width={w * 0.36} height={bottom - top} fill={C.shade} />
      {Array.from({ length: Math.floor((bottom - top - 6) / 13) }, (_, r) => (
        <g key={r}>
          <rect x={x - 1.5} y={top + r * 13} width={w + 3} height="2.2" fill={C.cornice} />
          {archWin(x + w / 2 - 3, top + r * 13 + 4, 6, 8, 'w')}
        </g>
      ))}
    </g>
  )
  const chhatri = (x, k) => (
    <g key={k}>
      <rect x={x} y="81" width="2" height="11" fill={C.shade} /><rect x={x + 12} y="81" width="2" height="11" fill={C.shade} />
      <rect x={x - 1.5} y="78.5" width="17" height="3" rx="1" fill={C.cornice} stroke={C.line} strokeWidth=".5" />
      {dome(x + 7, 6.5, 78.5, 10, 'd')}
    </g>
  )
  const wingArches = [], wingWins = [], pins = []
  for (let x = 52; x <= 103; x += 17) { wingArches.push(archWin(x, 126, 11, 24, `la${x}`)); wingWins.push(archWin(x + 2, 103, 7, 11, `lw${x}`)) }
  for (let x = 290; x <= 341; x += 17) { wingArches.push(archWin(x, 126, 11, 24, `ra${x}`)); wingWins.push(archWin(x + 2, 103, 7, 11, `rw${x}`)) }
  for (let x = 50; x < 350; x += 12) if (x < 110 || x > 288) pins.push(<path key={`p${x}`} d={`M${x} 92l2 -6l2 6Z`} fill={C.pin} />)

  return (
    <svg viewBox="0 -52 400 224" className={className} aria-label="Mysuru Palace" role="img">
      <defs>
        <linearGradient id="pal-dome" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#F7F1FF" /><stop offset=".45" stopColor="#E4D5FB" /><stop offset="1" stopColor="#C4ABEF" />
        </linearGradient>
        <linearGradient id="pal-ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E9DFF8" /><stop offset="1" stopColor="#DCCDF4" />
        </linearGradient>
      </defs>

      {/* the arcaded wings */}
      <rect x="46" y="96" width="308" height="54" fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <rect x="44" y="92" width="312" height="4.5" fill={C.cornice} stroke={C.line} strokeWidth=".5" />
      <rect x="46" y="119" width="308" height="2.5" fill={C.cornice} />
      {wingWins}{wingArches}{pins}
      {/* corner towers */}
      {tower(20, 28, 62, 150, 'ct1')}{tower(352, 28, 62, 150, 'ct2')}
      {dome(34, 12.5, 62, 22, 'cd1')}{dome(366, 12.5, 62, 22, 'cd2')}

      {chhatri(62, 'h1')}{chhatri(86, 'h2')}{chhatri(300, 'h3')}{chhatri(324, 'h4')}

      {/* the central tower and the great dome */}
      {tower(168, 64, 24, 92, 'mt')}
      <rect x="172" y="16" width="56" height="8" fill={C.wall} stroke={C.line} strokeWidth=".6" />
      {[178, 189, 200, 211, 222].map(x => <rect key={x} x={x - 1} y="17.5" width="2" height="5" fill={C.depth} />)}
      {dome(200, 27, 16, 54, 'md')}

      {/* the two towers flanking the portico */}
      {tower(114, 24, 50, 150, 'ft1')}{tower(262, 24, 50, 150, 'ft2')}
      {dome(126, 11, 50, 22, 'fd1')}{dome(274, 11, 50, 22, 'fd2')}

      {/* the portico: seven foliated arches, the Gajalakshmi pediment */}
      <rect x="138" y="84" width="124" height="66" fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <rect x="258" y="84" width="4" height="66" fill={C.shade} />
      <rect x="135" y="81" width="130" height="4" fill={C.cornice} stroke={C.line} strokeWidth=".5" />
      <rect x="138" y="110" width="124" height="2.5" fill={C.cornice} />
      {Array.from({ length: 7 }, (_, k) => archWin(146 + k * 16, 92, 8, 14, `pw${k}`))}
      {Array.from({ length: 7 }, (_, k) => cusped(144 + k * 16, 12, 116, 150, `pa${k}`))}
      <path d="M180 81v-7a20 13 0 0 1 40 0v7Z" fill={C.wall} stroke={C.line} strokeWidth=".7" />
      <path d="M188 81v-5a12 8 0 0 1 24 0v5Z" fill={C.depth} />
      <circle cx="200" cy="74.5" r="2.4" fill="#E8C766" />
      {[184, 216].map(x => <path key={x} d={`M${x} 74l2 -6l2 6Z`} fill={C.pin} />)}

      {/* the plinth and the steps */}
      <rect x="0" y="150" width="400" height="22" fill="url(#pal-ground)" />
      <rect x="0" y="150" width="400" height="2" fill={C.line} opacity=".7" />
      <rect x="146" y="146" width="108" height="4" fill={C.cornice} /><rect x="154" y="142" width="92" height="4" fill={C.wall} stroke={C.line} strokeWidth=".4" />
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
