import { useEffect, useState } from 'react'
import {
  ArrowRight, ChevronRight, Menu, X, Sparkles, Truck, MapPin,
  PackageCheck, Route, Search, CalendarDays, Users, ShieldCheck
} from 'lucide-react'

const PROMOS = [
  { label: 'SAMBRAMO · EVENTS', text: 'Plan the celebration. Connect every service.' },
  { label: 'SAMBRAMO · EVENT SUPPLY CHAIN', text: 'From requirement to venue-ready movement.' },
  { label: 'SAMBRAMO · LOGISTICS', text: 'Move people, supplies and event-day operations together.' },
  { label: 'SAMBRAMO · CONNECTED', text: 'Discover · Connect · Move · Celebrate.' },
]

const SERVICES = [
  ['Venue & Spaces', 'The right place, ready for the occasion.', '🏛️'],
  ['Food & Catering', 'Menus, catering and celebration essentials.', '🍽️'],
  ['Decoration', 'Themes, flowers, stages and styling.', '✨'],
  ['Photography', 'Photo, video and pre-event memories.', '📸'],
  ['Entertainment', 'Music, artists, anchors and experiences.', '🎵'],
  ['Beauty & Rituals', 'Makeup, mehendi and ceremony support.', '🌸'],
  ['Rentals', 'Furniture, sound, lighting and setup.', '🪑'],
  ['Gifts & Essentials', 'Invites, gifts, flowers and details.', '🎁'],
]

const EVENTS = [
  ['Weddings', 'A connected journey from planning to event day.', '💍'],
  ['Birthdays', 'Everything around the moment, in one flow.', '🎂'],
  ['Engagements', 'Bring people, services and movement together.', '✨'],
  ['Baby Showers', 'Beautiful details without fragmented coordination.', '🍼'],
  ['Corporate Events', 'Professional planning with connected operations.', '🏢'],
  ['Housewarmings', 'Tradition, people, supplies and setup.', '🏠'],
  ['Naming Ceremonies', 'A beginning connected end to end.', '🌼'],
  ['Festivals', 'Celebration essentials and movement together.', '🪔'],
]

const SUPPLY = [
  ['SOURCE', 'Requirements', 'Find the services, supplies and people the event needs.', Search],
  ['PREPARE', 'Ready the event', 'Coordinate services, materials, schedules and handoffs.', PackageCheck],
  ['MOVE', 'Event logistics', 'Connect suppliers, logistics partners and event-day routes.', Truck],
  ['ARRIVE', 'Venue entry', 'Bring the right things to the right place at the right time.', MapPin],
]

function PromoStrip({ index }) {
  const promo = PROMOS[index]
  return (
    <div className="border-y border-white/10 bg-white/[.045]">
      <div className="mx-auto flex min-h-11 max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/15 text-violet-200">
          <Sparkles size={14} />
        </span>
        <p className="min-w-0 truncate text-[10px] font-extrabold uppercase tracking-[.12em] text-violet-100 sm:text-xs">
          <span className="text-white">{promo.label}</span>
          <span className="mx-2 text-violet-300">·</span>
          <span className="font-semibold text-violet-100/70 normal-case tracking-normal">{promo.text}</span>
        </p>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, copy, light = false }) {
  return (
    <div className="max-w-3xl">
      <span className={`text-[10px] font-black uppercase tracking-[.2em] ${light ? 'text-violet-300' : 'text-violet-700'}`}>{eyebrow}</span>
      <h2 className={`mt-3 text-3xl font-black leading-[1.03] tracking-[-.035em] sm:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      {copy && <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${light ? 'text-slate-300' : 'text-slate-500'}`}>{copy}</p>}
    </div>
  )
}

function AppModal({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-700">SAMBRAMO · COMING SOON</p>
            <h3 className="mt-2 text-2xl font-black">Choose your app</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">The website introduces the ecosystem. The app handles the actual customer and partner workflows.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {[
            ['Customer', 'Discover, plan and manage your event.'],
            ['Event Provider', 'Connect services and event requirements.'],
            ['Logistics Partner', 'Move supplies and coordinate event-day entry.'],
            ['Supplier', 'Connect inventory to the event supply chain.'],
          ].map(([title, copy]) => (
            <button key={title} onClick={onClose} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:shadow-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Users size={18}/></div>
              <p className="mt-3 font-black">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700">Coming soon <ArrowRight size={13}/></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LogisticsVisual() {
  const [step, setStep] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setStep(v => (v + 1) % 3), 2600)
    return () => clearInterval(id)
  }, [])
  const nodes = [
    ['Supplier', 'Materials ready', PackageCheck, 'left-[8%] top-[20%]'],
    ['In transit', 'Partner moving', Truck, 'left-[43%] top-[48%]'],
    ['Venue', 'Event entry', MapPin, 'right-[8%] bottom-[20%]'],
  ]
  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0719] sm:min-h-[430px]">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_45%,rgba(139,92,246,.24),transparent_38%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true">
        <path d="M100 120 C230 50 255 365 405 300 S580 145 705 380" fill="none" stroke="rgba(167,139,250,.18)" strokeWidth="16" strokeLinecap="round" />
        <path d="M100 120 C230 50 255 365 405 300 S580 145 705 380" fill="none" stroke="#c4b5fd" strokeWidth="3" strokeDasharray="8 10" strokeLinecap="round" />
      </svg>
      {nodes.map(([title, copy, Icon, position], i) => (
        <button key={title} onClick={() => setStep(i)} className={`absolute ${position} z-10 text-left transition-transform duration-500 ${step === i ? 'scale-110' : ''}`}>
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-xl ${step === i ? 'bg-violet-500 text-white shadow-violet-500/40' : 'bg-white text-violet-700'}`}><Icon size={19}/></span>
          <span className="mt-2 block text-[10px] font-black uppercase tracking-wider text-white">{title}</span>
          <span className="mt-0.5 block text-[9px] text-slate-400">{copy}</span>
        </button>
      ))}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
        <span className="text-[10px] font-bold text-white">Event-day route visualization</span>
        <span className="text-[10px] font-bold text-violet-300">SUPPLY → MOVE → ARRIVE</span>
      </div>
    </div>
  )
}

export default function SambramoWebsite() {
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(false)
  const [promo, setPromo] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPromo(v => (v + 1) % PROMOS.length), 3000)
    return () => clearInterval(id)
  }, [])

  const go = (id) => {
    setMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#160329] text-white selection:bg-violet-400/30">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#160329]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[72px] sm:px-6">
          <button onClick={() => go('top')} className="min-w-0 shrink text-left" aria-label="SAMBRAMO home">
            <span className="block text-xl font-black tracking-[.02em] sm:text-2xl">SAMBRAMO</span>
            <span className="mt-0.5 hidden truncate text-[8px] font-bold uppercase tracking-[.18em] text-violet-300 min-[380px]:block">EVENTS · SUPPLY CHAIN · LOGISTICS</span>
          </button>
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              ['How It Works', 'how-it-works'], ['Services', 'services'], ['Supply Chain', 'supply-chain'],
              ['Logistics', 'logistics'], ['Events', 'events'], ['About', 'about'], ['FAQ', 'faq'],
            ].map(([label, id]) => <button key={id} onClick={() => go(id)} className="rounded-xl px-3 py-2 text-xs font-bold text-violet-100/75 hover:bg-white/10 hover:text-white">{label}</button>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setModal(true)} className="hidden rounded-xl bg-white px-4 py-2.5 text-xs font-black text-violet-950 shadow-lg sm:inline-flex">Get the app</button>
            <button onClick={() => setMenu(v => !v)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-white lg:hidden" aria-label={menu ? 'Close menu' : 'Open menu'}>
              {menu ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-white/10 bg-[#160329] px-4 py-4 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['How It Works', 'how-it-works'], ['Services', 'services'], ['Supply Chain', 'supply-chain'],
                ['Logistics', 'logistics'], ['Events', 'events'], ['About', 'about'], ['FAQ', 'faq'],
              ].map(([label, id]) => <button key={id} onClick={() => go(id)} className="rounded-xl px-3 py-3 text-left text-xs font-bold text-violet-100 hover:bg-white/10">{label}</button>)}
            </div>
            <button onClick={() => { setMenu(false); setModal(true) }} className="mt-3 w-full rounded-xl bg-white py-3 text-sm font-black text-violet-950">Get the app</button>
          </div>
        )}
      </header>

      <main id="top">
        <PromoStrip index={promo} />

        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(139,92,246,.22),transparent_30%),radial-gradient(circle_at_20%_68%,rgba(109,40,217,.16),transparent_30%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div className="min-w-0">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.15em] text-violet-200 sm:text-[10px]">
                <Sparkles size={13}/> The connected event ecosystem
              </span>
              <h1 className="mt-6 max-w-4xl text-[clamp(2.65rem,12vw,6.8rem)] font-black leading-[.91] tracking-[-.055em]">
                The event ecosystem<br className="hidden sm:block" /> is about to <span className="text-violet-300">move.</span>
              </h1>
              <div className="mt-7 flex items-center gap-3">
                <span className="h-px w-8 bg-violet-300/60" />
                <p className="text-sm font-black uppercase tracking-[.16em] text-white">SAMBRAMO</p>
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,.7)]" />
                <p className="min-w-0 text-sm font-semibold text-violet-100/80">Events · Supply chain · Logistics</p>
              </div>
              <p className="mt-5 max-w-2xl text-base leading-7 text-violet-100/70 sm:text-lg">
                Sambramo connects the services, people, supplies and logistics behind an event — then carries the journey into the app for discovery, booking, payment and tracking.
              </p>
              <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:w-auto">
                <button onClick={() => setModal(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-400 to-violet-600 px-5 text-sm font-black text-white shadow-xl shadow-violet-950/40 sm:w-auto">Explore Sambramo <ArrowRight size={18}/></button>
                <button onClick={() => go('how-it-works')} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[.04] px-5 text-sm font-black text-white hover:bg-white/[.08] sm:w-auto">See how it works <ChevronRight size={18}/></button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[9px] font-bold text-violet-100/55 sm:flex sm:flex-wrap sm:gap-4 sm:text-[10px]">
                <span className="flex min-w-0 items-center gap-1.5"><ShieldCheck size={14} className="shrink-0"/>Secure checkout</span>
                <span className="flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0"/>GPS-aware journeys</span>
                <span className="flex min-w-0 items-center gap-1.5"><Route size={14} className="shrink-0"/>Connected movement</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="relative mx-auto w-full max-w-[560px]">
                <div className="rounded-[30px] border border-white/15 bg-white/[.055] p-2.5 shadow-2xl backdrop-blur-md">
                  <div className="rounded-[24px] bg-white p-4 text-slate-950 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-600">Event command view</p><p className="mt-1 truncate text-xl font-black">Wedding · Event Day</p></div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">CONNECTED</span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        ['Services', 'Ready', 'bg-violet-500'], ['Supply', 'Moving', 'bg-amber-400'], ['Venue', 'Next', 'bg-emerald-500'],
                      ].map(([label, state, bar]) => <div key={label} className="min-w-0 rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">{label}</p><p className="mt-1 truncate text-[11px] font-black">{state}</p><div className={`mt-2 h-1 rounded-full ${bar}`} /></div>)}
                    </div>
                    <div className="mt-3 rounded-2xl bg-violet-50 p-3.5">
                      <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white"><Truck size={18}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">Supplier → Venue</p><p className="mt-0.5 truncate text-[9px] text-slate-500">Route active · event-day delivery</p></div><Route size={17} className="shrink-0 text-violet-700"/></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-slate-100 p-3"><p className="text-[9px] font-bold text-slate-400">Supply chain</p><p className="mt-1 text-xs font-black">Connected</p></div>
                      <div className="rounded-2xl border border-slate-100 p-3"><p className="text-[9px] font-bold text-slate-400">Event entry</p><p className="mt-1 text-xs font-black">Tracked</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-4 py-16 text-slate-950 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="How it works" title="One event. One connected journey." copy="The website explains the product. The app is where customers, event providers, suppliers and logistics partners complete the real workflow." />
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'Discover', 'Find the occasion, service or capability you need.', Search],
                ['02', 'Connect', 'Bring the right people and event context together.', Users],
                ['03', 'Coordinate', 'Keep supply, services and movement aligned.', Route],
                ['04', 'Complete', 'Continue into the relevant app workflow.', ShieldCheck],
              ].map(([n, title, copy, Icon]) => <article key={n} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><span className="text-[10px] font-black text-violet-700">{n}</span><div className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon size={19}/></div><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section id="services" className="bg-[#f7f5fb] px-4 py-16 text-slate-950 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Services" title="Every part of the celebration, connected." copy="From a venue to a single flower order, the product is designed around the event rather than isolated transactions." />
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map(([title, copy, icon]) => <article key={title} className="group min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-lg">{icon}</div><h3 className="mt-4 break-words text-sm font-black sm:text-base">{title}</h3><p className="mt-1.5 text-[11px] leading-5 text-slate-500 sm:text-xs">{copy}</p><span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black text-violet-700">Explore <ChevronRight size={12}/></span></article>)}
            </div>
          </div>
        </section>

        <section id="supply-chain" className="bg-white px-4 py-16 text-slate-950 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Event supply chain" title="From the first requirement to the final movement." copy="Sambramo treats the supply side as part of the event: source it, prepare it, move it and get it into the venue." />
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SUPPLY.map(([eyebrow, title, copy, Icon], i) => <article key={title} className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-b from-white to-violet-50/40 p-5 shadow-sm"><span className="absolute right-4 top-4 text-[42px] font-black text-violet-100">{String(i + 1).padStart(2, '0')}</span><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white"><Icon size={19}/></div><p className="mt-5 text-[9px] font-black tracking-[.18em] text-violet-700">{eyebrow}</p><h3 className="mt-1 text-lg font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section id="logistics" className="bg-[#09050f] px-4 py-16 text-white sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading light eyebrow="Logistics" title="Supplier → Venue → Event Entry." copy="A product visualization of the movement layer. Live GPS and partner operations can connect here when the app workflow is enabled." />
            <div className="mt-9 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <LogisticsVisual />
              <div className="space-y-3">
                {[
                  ['Supplier pickup', 'Materials packed and ready.', PackageCheck],
                  ['In transit', 'Logistics partner follows the event route.', Truck],
                  ['Venue entry', 'Partner checks in at the event location.', MapPin],
                ].map(([title, copy, Icon], i) => <div key={title} className="rounded-[24px] border border-white/10 bg-white/[.045] p-5"><div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300"><Icon size={19}/></div><div><p className="font-black">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{copy}</p></div></div></div>)}
                <div className="rounded-[24px] border border-violet-400/20 bg-violet-500/[.08] p-5"><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Operational principle</p><p className="mt-2 text-sm font-bold leading-6 text-violet-100">The movement belongs to the event — not in a separate disconnected workflow.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="events" className="bg-white px-4 py-16 text-slate-950 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Events & offerings" title="Built around the occasions people actually celebrate." copy="The same connected product model can adapt to different event shapes, scales and requirements." />
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {EVENTS.map(([title, copy, icon]) => <article key={title} className="min-w-0 rounded-[24px] border border-slate-200 p-4 shadow-sm sm:p-5"><div className="text-2xl">{icon}</div><h3 className="mt-4 break-words text-sm font-black sm:text-base">{title}</h3><p className="mt-1.5 text-[11px] leading-5 text-slate-500 sm:text-xs">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section id="about" className="bg-[#f7f5fb] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <SectionHeading eyebrow="About Sambramo" title="An event ecosystem, not another isolated service directory." copy="The product vision is to connect the layers that sit behind an event: customers, services, suppliers, event providers and logistics. The public website explains that system; the apps carry the operational workflows." />
            <div className="rounded-[28px] border border-violet-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white"><Route size={19}/></div><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-700">SAMBRAMO</p><p className="text-sm font-black text-slate-950">Events · Supply chain · Logistics</p></div></div><p className="mt-5 text-sm leading-7 text-slate-500">Discover. Connect. Move. Celebrate.</p></div>
          </div>
        </section>

        <section id="faq" className="bg-white px-4 py-16 text-slate-950 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <SectionHeading eyebrow="FAQ" title="The product, simply explained." />
            <div className="mt-8 divide-y divide-slate-200 rounded-[24px] border border-slate-200 bg-white">
              {[
                ['Can I book on the website?', 'No. The website is the product introduction. Actual booking, payment and operational workflows belong in the relevant app experience.'],
                ['What does event supply chain mean?', 'It is the connected flow of requirements, supplies, services, preparation, movement and venue entry around an event.'],
                ['Is the logistics map live?', 'The map is a product visualization in this website. Live GPS and route data will come from partner operations when that workflow is enabled.'],
                ['Are app links available?', 'The app entry points are currently presented as coming soon.'],
              ].map(([q, a]) => <details key={q} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black"><span>{q}</span><ChevronRight className="shrink-0 transition-transform group-open:rotate-90" size={17}/></summary><p className="mt-3 max-w-3xl text-xs leading-6 text-slate-500">{a}</p></details>)}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#160329] px-4 py-16 sm:px-6 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(139,92,246,.28),transparent_36%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">SAMBRAMO · THE CONNECTED EVENT ECOSYSTEM</p><h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-5xl">The ecosystem is about to move.</h2><p className="mt-4 text-sm leading-7 text-violet-100/70">Stay close as the customer, partner, supply chain and logistics experiences come together.</p></div>
            <button onClick={() => setModal(true)} className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-violet-950 sm:w-auto">Get the app <ArrowRight size={17}/></button>
          </div>
        </section>
      </main>

      <footer className="bg-[#0d0615] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_.7fr_.7fr]">
          <div><p className="text-xl font-black tracking-[.02em]">SAMBRAMO</p><p className="mt-2 max-w-md text-xs leading-6 text-slate-500">Events · Supply chain · Logistics. A connected product experience for the journey behind every event.</p></div>
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Explore</p><div className="mt-4 space-y-2 text-xs text-slate-300">{['How it works','Services','Supply chain','Logistics','Events','FAQ'].map(x => <button key={x} onClick={() => go(x.toLowerCase().replaceAll(' ', '-'))} className="block hover:text-white">{x}</button>)}</div></div>
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Connect</p><p className="mt-4 text-xs text-slate-300">App experiences coming soon.</p><p className="mt-2 text-xs text-slate-500">Bengaluru · India</p></div>
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-5 text-[10px] text-slate-600 sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} SAMBRAMO</span><span>Discover · Connect · Move · Celebrate.</span></div>
      </footer>

      <AppModal open={modal} onClose={() => setModal(false)} />
    </div>
  )
}
