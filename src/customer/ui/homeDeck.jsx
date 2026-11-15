/**
 * Home, the quick-commerce way (Mohan, 2026-11-13):
 *
 *   QuickCard      "India's quickest celebration platform" — a highlighted,
 *                  tappable card; the live lines under it are short, true
 *                  and move like a ticker
 *   OfferSlider    real offer cards that slide by themselves (Blinkit /
 *                  Zomato / Zepto) — every card opens its own occasion and
 *                  carries only an offer Sambramo really runs (lib/rewards)
 *   PrebookCard    "book months ahead, lock your masters' date" — the next
 *                  free weekends, each a tap into planning
 *   InstantSheet   Instant Booking asks first: a celebration (438+
 *                  occasions) or a single service
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarClock, ChevronRight, Gift, LayoutGrid, MailOpen, PartyPopper, ShieldCheck, Ticket, Timer, Zap } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { hdArtFor, occasionArt } from '../data/art'
import { WELCOME, REFERRAL } from '../lib/rewards'
import { Sheet } from './kit'
import Glyph3D from './Glyph3D'

const CAP = `₹${Math.round(WELCOME.capPaise / 100).toLocaleString('en-IN')}`

/* ── India's quickest celebration platform ───────────────────────── */
/* To the reference (Mohan, 2026-11-14): a white card, the shield, the
   claim, one plain line of fact and LIVE — still, nothing moving. */
export function QuickCard({ where }) {
  return (
    <Link to="/explore#celebrations" className="cx-press mx-3 mt-3 flex items-center gap-2.5 rounded-[16px] bg-white px-2.5 py-2.5 shadow-[0_0_0_1px_#EEE8F8,0_10px_24px_-18px_rgba(28,16,51,.45)]" data-live-strip data-quick-card>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#F1EAFF] text-[#6D28D9]"><ShieldCheck size={21} strokeWidth={2.2} /></span>
      {/* Title and LIVE on one line, the fact under it, the chevron at the end — as the reference sets it. */}
      <span className="min-w-0 flex-1">
        {/* Title and LIVE on the first line, the fact and the chevron on the second — as the reference sets it. */}
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-black leading-tight tracking-[-0.03em] text-[#1C1033]">India’s quickest celebration platform</span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#E6F7EC] px-2 py-[2px] text-[10.5px] font-black tracking-[0.04em] text-[#1B7F4A]">
            <span className="relative grid h-1.5 w-1.5 place-items-center"><span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-[#22C55E]" /><span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /></span>LIVE
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#6B6880]" data-quick-line>₹0 to request · Pay only after accept</span>
          <ChevronRight size={16} className="shrink-0 text-[#8E869E]" />
        </span>
      </span>
    </Link>
  )
}
function QuickCardOld({ where }) {
  const lines = useMemo(() => [
    [Zap, 'Masters reply in minutes', where ? `Live now near ${where}` : 'Live now near you'],
    [ShieldCheck, '₹0 to request', 'Pay only after a master accepts'],
    [BadgeCheck, 'Every master ID-verified', 'Checked before they go live'],
    [Ticket, `${WELCOME.pct}% off your first booking`, `Up to ${CAP} · first ${WELCOME.days} days`],
    [CalendarClock, 'Lock dates months ahead', 'Weekends go first'],
  ], [where])
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % lines.length), 2800); return () => clearInterval(t) }, [lines.length])
  const [Icon, a, b] = lines[i]
  return (
    <Link to="/explore#celebrations" className="cx-press relative mx-3 mt-3 block overflow-hidden rounded-[22px] p-[1.5px] shadow-[0_18px_36px_-22px_rgba(58,18,144,.8)]" data-live-strip data-quick-card>
      <span aria-hidden className="cx-live-ring absolute left-1/2 top-1/2 aspect-square w-[170%]" style={{ background: 'conic-gradient(from 0deg, #A78BFA, #22D3EE, #FDE68A, #F472B6, #A78BFA)' }} />
      <div className="relative overflow-hidden rounded-[20.5px] px-3.5 pb-3 pt-2.5" style={{ background: 'radial-gradient(120% 90% at 0% 0%, #3B1A7A 0%, #1C0B3A 55%, #12072A 100%)' }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* LIVE up on the brand line, so the claim below reads whole. */}
        <div className="relative flex items-center justify-between gap-2">
          <span className="text-[9.5px] font-black uppercase tracking-[0.24em] text-[#C4B5FD]">Sambramo</span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.12em] text-[#86EFAC] ring-1 ring-[#22C55E]/40">
            <span className="relative grid h-1.5 w-1.5 place-items-center"><span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-[#4ADE80]" /><span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" /></span>Live
          </span>
        </div>
        <p className="relative mt-0.5 text-[17.5px] font-black leading-tight tracking-[-0.03em] text-white">India’s quickest celebration platform</p>
        <div className="relative mt-2.5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br from-[#FDE68A] to-[#F59E0B] text-[#4A2800] shadow-[0_8px_18px_-8px_rgba(245,158,11,.9)]"><Icon size={18} strokeWidth={2.5} /></span>
          <span className="min-w-0 flex-1" data-quick-line={i}>
            <span className="block truncate text-[14px] font-black text-white">{a}</span>
            <span className="block truncate text-[11.5px] font-semibold text-white/80">{b}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-white/60" />
        </div>
        <div className="relative mt-2.5 flex gap-1" aria-hidden>
          {lines.map((_, k) => <span key={k} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">{k < i && <span className="absolute inset-0 bg-[#A78BFA]" />}{k === i && <span key={`f${i}`} className="cx-story absolute inset-0 bg-[#FDE68A]" />}</span>)}
        </div>
      </div>
    </Link>
  )
}

/* ── The offer slider ────────────────────────────────────────────── */
const OFFERS = {
  occasions: [
    { id: 'birthday-party', tag: `${WELCOME.pct}% OFF`, title: 'Birthday Party', line: `Your first booking, up to ${CAP} off`, code: 'SAMBRAMO25', bg: ['#6D28D9', '#A855F7'] },
    { id: 'wedding-reception', tag: 'FREE INVITES', title: 'Wedding Reception', line: 'Live RSVP for every guest, on WhatsApp', code: 'RSVP FREE', bg: ['#BE185D', '#F472B6'], to: '/invites/new?o=wedding-reception' },
    { id: 'haldi-ceremony', tag: '₹0 TO REQUEST', title: 'Haldi Ceremony', line: 'Masters quote first — you pay after one accepts', code: 'NO FEE', bg: ['#B45309', '#F59E0B'] },
    { id: 'housewarming-ceremony', tag: `${WELCOME.pct}% OFF`, title: 'Housewarming', line: `Priest, catering & décor — up to ${CAP} off`, code: 'SAMBRAMO25', bg: ['#0F766E', '#14B8A6'] },
    { id: 'naming-ceremony', tag: 'LOCK THE DATE', title: 'Naming Ceremony', line: 'Book the muhurtham now, pay after they accept', code: 'NO FEE', bg: ['#1D4ED8', '#60A5FA'] },
    { id: 'surprise-birthday-party', tag: `REFER · ${REFERRAL.pct}%`, title: 'Surprise Birthday', line: `Invite a friend — they get ${REFERRAL.pct}% off`, code: 'REFER', bg: ['#C2410C', '#FB923C'], to: '/refer' },
    { id: 'baby-shower', tag: `${WELCOME.pct}% OFF`, title: 'Baby Shower', line: `Décor, cake & photos — up to ${CAP} off`, code: 'SAMBRAMO25', bg: ['#9333EA', '#E879F9'] },
  ],
  services: [
    { id: 'photography', svc: true, tag: `${WELCOME.pct}% OFF`, title: 'Photography', line: `First booking, up to ${CAP} off`, code: 'SAMBRAMO25', bg: ['#6D28D9', '#A855F7'] },
    { id: 'catering_food', svc: true, tag: '₹0 TO REQUEST', title: 'Catering', line: 'Menus written for your occasion', code: 'NO FEE', bg: ['#B45309', '#F59E0B'] },
    { id: 'decoration_floral', svc: true, tag: `${WELCOME.pct}% OFF`, title: 'Décor & flowers', line: `Up to ${CAP} off your first`, code: 'SAMBRAMO25', bg: ['#BE185D', '#F472B6'] },
    { id: 'bridal_makeup_hair', svc: true, tag: 'VERIFIED', title: 'Makeup & hair', line: 'ID-checked artists near you', code: 'VERIFIED', bg: ['#0F766E', '#14B8A6'] },
  ],
}
export function OfferSlider({ door }) {
  const items = OFFERS[door] ?? OFFERS.occasions
  const track = useRef(null)
  const held = useRef(0)
  const [at, setAt] = useState(0)
  const go = k => { const el = track.current, c = el?.children[k]; if (c) el.scrollTo({ left: Math.max(0, c.offsetLeft - 16), behavior: 'smooth' }) }
  useEffect(() => { setAt(0); track.current?.scrollTo({ left: 0 }) }, [door])
  useEffect(() => { const t = setInterval(() => { if (Date.now() > held.current) go((at + 1) % items.length) }, 3500); return () => clearInterval(t) }, [at, items.length])
  const onScroll = () => { const el = track.current; if (!el) return; const w = el.children[0]?.clientWidth ?? 1; setAt(Math.min(items.length - 1, Math.round(el.scrollLeft / (w + 16)))) }
  return (
    <section className="mt-3" data-offer-slider>
      {/* The heading and the counter, to the reference. */}
      <div ref={track} onScroll={onScroll} onTouchStart={() => { held.current = Date.now() + 6000 }} className="cx-noscroll flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1" style={{ scrollPaddingInline: 16 }}>
        {items.map(x => {
          const o = x.svc ? null : OCCASION[x.id]
          const art = x.svc ? hdArtFor(`svc-${x.id}`) : hdArtFor(`occ-${x.id}`) ?? (o ? occasionArt(o).src : null)
          const to = x.to ?? (x.svc ? `/brief/${x.id}` : `/o/${x.id}`)
          return (
            <Link key={x.id} to={to} className="cx-press relative block w-[calc(100vw-32px)] max-w-[520px] shrink-0 snap-start overflow-hidden rounded-[18px]" data-offer={x.id}
              style={{ background: `linear-gradient(135deg, ${x.bg[1]}12 0%, ${x.bg[1]}30 100%)`, boxShadow: `inset 0 0 0 1px ${x.bg[1]}55` }}>
              <div className="relative flex min-h-[182px]">
                <div className="relative z-10 flex w-[52%] flex-col p-4">
                  <span className="w-fit rounded-full px-2.5 py-[3px] text-[11.5px] font-black tracking-[0.02em]" style={{ color: x.bg[0], background: `${x.bg[1]}30` }}>{x.tag}</span>
                  <span className={'mt-2 block font-black leading-[1.08] tracking-[-0.03em] text-[#1C1033] ' + (x.title.split(' ').some(w => w.length > 10) ? 'text-[17px]' : 'text-[20px]')}>{x.title}</span>
                  <span className="mb-2.5 mt-1 line-clamp-2 block text-[12px] font-semibold leading-snug text-[#5A5470]">{x.line}</span>
                  <span className="mt-auto flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-extrabold text-white" style={{ background: x.bg[0] }}>Book now<ArrowRight size={15} strokeWidth={2.8} /></span>
                </div>
                {art && <img src={art} alt="" loading="lazy" className="absolute bottom-0 right-0 h-full w-[50%] object-cover object-[50%_20%] mix-blend-multiply" />}
              </div>
            </Link>
          )
        })}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {items.map((_, k) => <span key={k} className={'h-1.5 rounded-full transition-all duration-300 ' + (k === at ? 'w-5 bg-[#5B21B6]' : 'w-1.5 bg-[#DDD3F0]')} />)}
      </div>
    </section>
  )
}

/* ── Pre-book: lock your masters' date ───────────────────────────── */
export function PrebookCard() {
  const weekends = useMemo(() => {
    const out = []
    const d = new Date(); d.setHours(0, 0, 0, 0)
    for (const m of [1, 2, 3, 6]) {
      const x = new Date(d); x.setMonth(x.getMonth() + m)
      while (x.getDay() !== 6) x.setDate(x.getDate() + 1)
      out.push([m, x])
    }
    return out
  }, [])
  return (
    <section className="mx-3 mt-4 overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#FBE2BA,0_18px_34px_-26px_rgba(180,83,9,.6)]" data-prebook>
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#FFF4E5] to-[#FFFBF3] p-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#FFB020] to-[#F07A00] text-white shadow-[0_8px_18px_-8px_rgba(240,122,0,.9)]"><Timer size={21} strokeWidth={2.4} /></span>
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#B45309]">Pre-book · lock the date</span>
          <span className="block text-[16px] font-black leading-tight tracking-[-0.02em] text-[#3A1D00]">Planning months ahead? Lock your masters now</span>
          <span className="block text-[11.5px] font-semibold text-[#8A5A1E]">The best masters are booked 4–6 weeks before every weekend. ₹0 to request.</span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-2.5">
        {weekends.map(([m, x]) => (
          <Link key={m} to="/explore#celebrations" className="cx-press flex flex-col items-center rounded-[14px] bg-[#FFF8EC] py-2 text-center shadow-[inset_0_0_0_1px_#FBE2BA]" data-prebook-month={m}>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#B45309]">In {m} {m === 1 ? 'month' : 'months'}</span>
            <span className="text-[13px] font-black text-[#3A1D00]">{x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span className="text-[10px] font-bold text-[#8A5A1E]">Saturday</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ── Instant Booking: what kind? ─────────────────────────────────── */
export function InstantSheet({ open, onClose }) {
  const navigate = useNavigate()
  const go = to => { onClose(); navigate(to) }
  return (
    <Sheet open={open} onClose={onClose} title="What would you like to book?">
      <div className="grid gap-2.5 pb-3" data-instant-sheet>
        <button type="button" onClick={() => go('/explore#celebrations')} className="cx-press flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-[#F5EEFF] to-[#E5D6FF] p-3.5 text-left shadow-[inset_0_0_0_1.5px_#D9C7FF]" data-instant-pick="celebration">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-white shadow-[0_8px_18px_-12px_rgba(76,29,149,.6)]"><Glyph3D id="life" size={44} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-black tracking-[-0.02em] text-[#2E1065]">A celebration</span>
            <span className="block text-[12px] font-semibold text-[#5B4A7A]">438+ occasions — we plan every master it needs</span>
          </span>
          <PartyPopper size={20} className="shrink-0 text-[#7C3AED]" />
        </button>
        <button type="button" onClick={() => go('/s')} className="cx-press flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-[#ECFAF1] to-[#CDEFDB] p-3.5 text-left shadow-[inset_0_0_0_1.5px_#B5E4C6]" data-instant-pick="service">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-white shadow-[0_8px_18px_-12px_rgba(11,107,61,.6)]"><Glyph3D id="all" size={44} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-black tracking-[-0.02em] text-[#063B22]">A single service</span>
            <span className="block text-[12px] font-semibold text-[#3F6B57]">35 services — a photographer, a cake, a DJ…</span>
          </span>
          <LayoutGrid size={20} className="shrink-0 text-[#0B7A45]" />
        </button>
        <p className="flex items-center justify-center gap-1.5 pt-1 text-[11.5px] font-bold text-[var(--ink-3)]"><Gift size={13} className="text-[#7C3AED]" />{WELCOME.pct}% off your first booking · <MailOpen size={13} className="text-[#DB2777]" />free invites</p>
      </div>
    </Sheet>
  )
}
