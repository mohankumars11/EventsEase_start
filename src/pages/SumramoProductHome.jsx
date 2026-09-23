import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, ChevronRight, CheckCircle2, Truck, MapPin, Search,
  CalendarDays, Sparkles, ShieldCheck, Smartphone, X, Play, Menu,
  PackageCheck, Route, Users, CreditCard, Clock3
} from 'lucide-react'

const BRAND = 'SAMBRAMO'
const TAGLINE = 'Events • Supply Chain • Logistics'

const EVENT_TYPES = [
  ['Weddings','Everything coordinated around your day.','💍'],
  ['Birthdays','Decor, food, entertainment and more.','🎂'],
  ['Engagements','Make the beginning feel special.','✨'],
  ['Baby Showers','Beautiful moments, handled end to end.','🍼'],
  ['Corporate Events','Professional event execution, connected.','🏢'],
  ['Housewarmings','Set up the new beginning with ease.','🏠'],
  ['Naming Ceremonies','Tradition, people and logistics together.','🌼'],
  ['Festivals','Essentials, services and movement in one place.','🪔'],
  ['Get-Togethers','Bring people together. We handle the rest.','🥂'],
]

const SERVICES = [
  ['Venue & Spaces','Find and coordinate the place your event needs.','🏛️'],
  ['Decoration','Themes, stage, flowers, balloons and styling.','🎨'],
  ['Food & Catering','Catering, cakes, sweets and live counters.','🍽️'],
  ['Photography','Photography, video, pre-event shoots and more.','📸'],
  ['Entertainment','DJ, music, anchors, games and live acts.','🎵'],
  ['Beauty & Rituals','Makeup, mehendi, priests and ceremony support.','✨'],
  ['Rentals','Furniture, sound, lighting, pandal and crockery.','🪑'],
  ['Gifts & Essentials','Invites, return gifts, flowers and essentials.','🎁'],
]

const SEARCH_ITEMS = [...EVENT_TYPES, ...SERVICES].map(([title, description, icon]) => ({
  title, description, icon
}))

function Reveal({ children, className = '' }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShow(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`transition-all duration-700 ${show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}>{children}</div>
}

function AppHandoff({ open, onClose }) {
  if (!open) return null
  const roles = [
    ['Customer','Discover, plan and manage your celebration.','/'],
    ['Event Provider','Manage enquiries, services and event work.','/'],
    ['Logistics Partner','Move supplies and coordinate event-day entry.','/'],
    ['Supplier','Connect your inventory to the event supply chain.','/'],
  ]
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Coming soon</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Choose your SAMBRAMO app</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20}/></button>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {roles.map(([title, desc]) => (
            <button key={title} onClick={() => onClose()} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Smartphone size={19}/></div>
              <p className="font-extrabold text-slate-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700">App coming soon <ArrowRight size={13}/></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LogisticsStory() {
  const [step, setStep] = useState(2)
  useEffect(() => {
    const timer = setInterval(() => setStep(s => (s + 1) % 3), 2800)
    return () => clearInterval(timer)
  }, [])
  const steps = [
    ['Supplier pickup','Materials packed and ready.','PackageCheck'],
    ['In transit','Logistics partner follows the route.','Truck'],
    ['Venue entry','Partner checks in at the event location.','MapPin'],
  ]
  return (
    <section id="logistics" className="relative overflow-hidden bg-slate-950 py-20 text-white sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(124,58,237,.28),transparent_42%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,.16),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Logistics, visualised</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Supplier → Venue → Event Entry.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">On event day, movement becomes part of the experience. SAMBRAMO connects the supply side, the route and the venue handoff into one operational story.</p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="relative min-h-[390px] overflow-hidden rounded-[30px] border border-white/10 bg-[#111827] shadow-2xl">
            <div className="absolute inset-0 opacity-80" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)',backgroundSize:'42px 42px'}} />
            <div className="absolute inset-[8%] rounded-[40%] border border-white/10 rotate-[-8deg]" />
            <div className="absolute left-[12%] top-[18%] h-24 w-48 rounded-full border border-white/10 rotate-12" />
            <div className="absolute right-[8%] bottom-[15%] h-28 w-52 rounded-full border border-white/10 rotate-[-18deg]" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 500" preserveAspectRatio="none" aria-label="Illustrated GPS route from supplier to venue">
              <path d="M120 120 C240 70, 260 360, 410 300 S580 160, 700 370" fill="none" stroke="rgba(196,181,253,.25)" strokeWidth="14" strokeLinecap="round"/>
              <path d="M120 120 C240 70, 260 360, 410 300 S580 160, 700 370" fill="none" stroke="#c4b5fd" strokeWidth="3" strokeDasharray="8 10" strokeLinecap="round"/>
            </svg>
            <div className="absolute left-[11%] top-[20%]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-violet-700 shadow-xl"><PackageCheck size={20}/></div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">Supplier</p>
            </div>
            <div className={`absolute left-[43%] top-[52%] transition-all duration-1000 ${step === 1 ? 'scale-110' : ''}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-[0_0_35px_rgba(139,92,246,.55)]"><Truck size={21}/></div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-violet-200">In transit</p>
            </div>
            <div className="absolute right-[8%] bottom-[19%]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-violet-700 shadow-xl"><MapPin size={20}/></div>
              <p className="mt-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-300">Venue</p>
            </div>
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs"><span className="font-bold">Event-day route</span><span className="text-violet-300">GPS view</span></div>
            </div>
          </div>
          <div className="space-y-3">
            {steps.map(([title, desc, icon], i) => {
              const Icon = icon === 'Truck' ? Truck : icon === 'MapPin' ? MapPin : PackageCheck
              return <button key={title} onClick={() => setStep(i)} className={`w-full rounded-[24px] border p-5 text-left transition ${step === i ? 'border-violet-300 bg-white text-slate-950 shadow-xl' : 'border-white/10 bg-white/[.04] text-white hover:bg-white/[.07]'}`}>
                <div className="flex gap-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${step === i ? 'bg-violet-100 text-violet-700' : 'bg-white/10 text-violet-200'}`}><Icon size={19}/></div><div><p className="font-extrabold">{title}</p><p className={`mt-1 text-xs leading-5 ${step === i ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p></div></div>
              </button>
            })}
            <p className="px-1 pt-2 text-[11px] leading-5 text-slate-500">The map above is a product visualization. Live GPS and route data will be connected to partner operations in the app.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function SumramoProductHome() {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const recommendations = useMemo(() => query.trim().length < 2 ? [] : SEARCH_ITEMS.filter(x => (x.title + x.description).toLowerCase().includes(query.toLowerCase())).slice(0, 6), [query])

  const scrollTo = (id) => {
    setMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#210638] text-white">
      <header className="sambramo-header sticky top-0 z-50 border-b border-white/10 bg-[#210638]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-6">
          <button onClick={() => scrollTo('top')} className="min-w-0 shrink-0 text-left" aria-label="SAMBRAMO home">
            <span className="block font-display text-[21px] font-black leading-none tracking-[-.035em] sm:text-3xl">SAMBRAMO</span>
            <span className="mt-1 hidden text-[8px] font-bold uppercase tracking-[.16em] text-violet-200/80 min-[390px]:block">{TAGLINE}</span>
          </button>
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              ['How It Works','how-it-works'],['Services','services'],['Supply Chain','supply-chain'],
              ['Logistics','logistics'],['Events / Offerings','events'],['About','about'],['FAQ','faq']
            ].map(([label,id]) => <button key={id} onClick={() => scrollTo(id)} className="rounded-xl px-3 py-2 text-sm font-semibold text-violet-100/80 transition hover:bg-white/10 hover:text-white">{label}</button>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setHandoff(true)} className="hidden rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-violet-950 shadow-lg sm:inline-flex">Get the app</button>
            <button onClick={() => setMenu(!menu)} className="sambramo-menu-button inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-white hover:bg-white/10 lg:hidden" aria-label={menu ? 'Close menu' : 'Open menu'}>
              {menu ? <X size={21}/> : <Menu size={21}/>}
            </button>
          </div>
        </div>
        <div className="sambramo-promo border-t border-white/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-400/10 to-violet-500/10">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2 sm:px-6">
            <span className="shrink-0 text-[9px] font-black uppercase tracking-[.18em] text-violet-200">SAMBRAMO</span>
            <span className="shrink-0 text-violet-300">•</span>
            <div className="sambramo-promo-track min-w-0 text-[9px] font-bold uppercase tracking-[.14em] text-white/75">
              <span>EVENTS</span><span>SUPPLY CHAIN</span><span>LOGISTICS</span><span>DISCOVER • CONNECT • BOOK • PAY • DONE</span>
            </div>
          </div>
        </div>
        {menu && <div className="border-t border-white/10 bg-[#210638] px-4 py-3 lg:hidden">
          <div className="grid grid-cols-1 gap-1 pb-2 sm:grid-cols-2">
            {[
              ['How It Works','how-it-works'],['Services','services'],['Supply Chain','supply-chain'],
              ['Logistics','logistics'],['Events / Offerings','events'],['About','about'],['FAQ','faq']
            ].map(([label,id]) => <button key={id} onClick={() => scrollTo(id)} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-violet-100 hover:bg-white/10">{label}</button>)}
          </div>
          <button onClick={() => {setMenu(false);setHandoff(true)}} className="w-full rounded-xl bg-white py-3 text-sm font-extrabold text-violet-950">Get the app</button>
        </div>}
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pb-24 sm:pt-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(168,85,247,.32),transparent_34%),radial-gradient(circle_at_20%_60%,rgba(124,58,237,.2),transparent_32%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
            <Reveal>
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-violet-200"><Sparkles size={13}/> The connected event ecosystem</div>
                <h1 className="mt-5 max-w-[11ch] text-[clamp(2.7rem,12vw,6.6rem)] font-black leading-[.93] tracking-[-.055em] sm:mt-6 sm:max-w-none sm:text-[clamp(3.4rem,7vw,6.6rem)]">Your event.<br/><span className="text-violet-300">Everything connected.</span></h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-violet-100/75 sm:text-lg">Discover event services, connect the supply chain, coordinate logistics and move into the SAMBRAMO app when you are ready.</p>
                <div className="relative mt-7 max-w-2xl">
                  <div className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-2xl">
                    <Search className="ml-2 shrink-0 text-slate-400" size={20}/>
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search weddings, catering, decor, logistics…" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" aria-label="Search SAMBRAMO"/>
                    <button onClick={() => setHandoff(true)} className="hidden shrink-0 rounded-xl bg-violet-700 px-4 py-3 text-xs font-extrabold text-white sm:block">Explore app</button>
                  </div>
                  {recommendations.length > 0 && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">{recommendations.map(x => <button key={x.title} onClick={() => {setQuery(x.title);scrollTo('events')}} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50"><span className="text-lg">{x.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{x.title}</span><span className="block truncate text-[11px] text-slate-500">{x.description}</span></span><ChevronRight size={15}/></button>)}</div>}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-violet-100/65 sm:text-[11px]"><span>Weddings</span><span>•</span><span>Food</span><span>•</span><span>Decor</span><span>•</span><span>Photography</span><span>•</span><span>Logistics</span></div>
              </div>
            </Reveal>
            <Reveal>
              <div className="relative mx-auto w-full max-w-[540px] lg:mt-2">
                <div className="rounded-[26px] border border-white/15 bg-white/[.07] p-2.5 shadow-2xl backdrop-blur-md sm:rounded-[32px] sm:p-3">
                  <div className="rounded-[21px] bg-white p-4 text-slate-950 sm:rounded-[25px] sm:p-5">
                    <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">Event command view</p><p className="mt-1 text-xl font-black">Wedding • 21 June</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">On track</span></div>
                    <div className="mt-5 grid grid-cols-3 gap-2">{[['Supply','Ready'],['Logistics','Moving'],['Venue','Next']].map(([a,b],i)=><div key={a} className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{a}</p><p className="mt-1 text-xs font-extrabold">{b}</p><div className={`mt-2 h-1 rounded-full ${i===1?'bg-violet-500':'bg-slate-200'}`} /></div>)}</div>
                    <div className="mt-3 rounded-2xl bg-violet-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700 text-white"><Truck size={18}/></div><div className="flex-1"><p className="text-xs font-extrabold">Supplier → Venue</p><p className="mt-0.5 text-[10px] text-slate-500">Route active · event-day delivery</p></div><Route size={17} className="text-violet-700"/></div></div>
                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 p-3"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600"/><span className="text-[11px] font-bold">Secure payments</span></div><span className="text-[10px] font-semibold text-slate-400">Razorpay</span></div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-2 hidden rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-2xl sm:block"><p className="text-[10px] font-bold text-slate-400">CONNECTED</p><p className="text-sm font-black">Supply · Service · Movement</p></div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal><div className="max-w-2xl"><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">How it works</span><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">One ecosystem. One simple journey.</h2><p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">The website introduces the experience. Your SAMBRAMO app handles the real customer, provider and partner workflows.</p></div></Reveal>
            <div className="mt-10 grid gap-3 md:grid-cols-4">{[
              ['01','Discover','Search the service, occasion or capability you need.','Search'],
              ['02','Connect','Bring the right event providers and suppliers into the flow.','Users'],
              ['03','Coordinate','Track supply, logistics and event-day movement together.','Route'],
              ['04','Complete','Move into the relevant SAMBRAMO app for the actual transaction.','CheckCircle2'],
            ].map(([n,t,d,icon]) => {const Icon=icon==='Search'?Search:icon==='Users'?Users:icon==='Route'?Route:CheckCircle2; return <div key={n} className="rounded-[26px] border border-slate-200 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><span className="text-xs font-black text-violet-600">{n}</span><div className="mt-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon size={19}/></div><h3 className="mt-4 font-black">{t}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{d}</p></div>})}</div>
          </div>
        </section>

        <section id="services" className="bg-[#f7f5fb] py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6"><Reveal><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">Services</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">Everything your event needs.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">A connected service layer across venues, people, experiences, essentials and event operations.</p></div></Reveal><div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">{SERVICES.map(([title,desc,icon])=><Reveal key={title}><article className="h-full rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">{icon}</div><h3 className="mt-4 text-sm font-black sm:text-base">{title}</h3><p className="mt-2 text-[11px] leading-5 text-slate-500 sm:text-xs">{desc}</p><button onClick={() => setHandoff(true)} className="mt-4 inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-700">Explore <ArrowRight size={13}/></button></article></Reveal>)}</div></div>
        </section>

        <section id="supply-chain" className="bg-white py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><Reveal><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">Event Supply Chain</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">The event is bigger than the booking.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">SAMBRAMO is designed to connect what happens before the event with what has to arrive, move and be ready on the day.</p><div className="mt-7 space-y-3">{[['Source','Suppliers and event requirements are connected.'],['Prepare','Materials, services and schedules become visible.'],['Move','Logistics partners carry the right things to the right place.'],['Arrive','Venue entry becomes an explicit operational step.']].map(([a,b],i)=><div key={a} className="flex gap-3 rounded-2xl border border-slate-200 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-black text-white">{i+1}</span><div><p className="text-sm font-extrabold">{a}</p><p className="mt-1 text-xs text-slate-500">{b}</p></div></div>)}</div></Reveal><Reveal><div className="rounded-[30px] bg-[#210638] p-5 text-white shadow-2xl sm:p-7"><div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider"><div className="rounded-2xl bg-white/10 p-4"><PackageCheck className="mx-auto mb-2 text-violet-300" size={19}/>Supply</div><div className="rounded-2xl bg-violet-500/30 p-4"><Truck className="mx-auto mb-2 text-violet-200" size={19}/>Movement</div><div className="rounded-2xl bg-white/10 p-4"><MapPin className="mx-auto mb-2 text-violet-300" size={19}/>Venue</div></div><div className="my-8 h-px bg-white/10"/><p className="text-sm font-bold text-violet-200">Operational principle</p><p className="mt-2 text-2xl font-black leading-tight">If it has to reach the event, it belongs in the event supply chain.</p></div></Reveal></div></div>
        </section>

        <LogisticsStory />

        <section id="events" className="bg-[#f7f5fb] py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6"><Reveal><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">Events / Offerings</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">Every kind of celebration. One connected platform.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">Explore the event types SAMBRAMO is designed to support. Actual availability and booking move into the relevant app.</p></Reveal><div className="mt-9 flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none]">{EVENT_TYPES.map(([title,desc,icon])=><button key={title} onClick={() => setHandoff(true)} className="min-w-[220px] snap-start rounded-[26px] bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl sm:min-w-[260px]"><span className="text-3xl">{icon}</span><h3 className="mt-5 font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700">Explore <ChevronRight size={14}/></span></button>)}</div></div>
        </section>

        <section id="about" className="bg-white py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6"><Reveal><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">About SAMBRAMO</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">Built around the way events actually happen.</h2><p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">Events are not a single transaction. People, services, supplies, payments, schedules and movement all have to come together. SAMBRAMO is being built as the connective layer between them.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-5"><Sparkles className="mx-auto text-violet-700"/><p className="mt-3 font-black">Discover</p><p className="mt-1 text-xs text-slate-500">Find the right capability quickly.</p></div><div className="rounded-2xl bg-slate-50 p-5"><Route className="mx-auto text-violet-700"/><p className="mt-3 font-black">Connect</p><p className="mt-1 text-xs text-slate-500">Connect people, supply and movement.</p></div><div className="rounded-2xl bg-slate-50 p-5"><CheckCircle2 className="mx-auto text-violet-700"/><p className="mt-3 font-black">Complete</p><p className="mt-1 text-xs text-slate-500">Finish the real transaction in the app.</p></div></div></Reveal></div>
        </section>

        <section id="faq" className="bg-[#f7f5fb] py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6"><Reveal><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">FAQ</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">Questions, answered.</h2><div className="mt-8 space-y-3">{[
            ['What is SAMBRAMO?','A connected event ecosystem designed to bring event services, supply chain and logistics into one experience.'],
            ['Can I book directly on this website?','No. This website is the product experience and discovery layer. Actual booking, payment and operational workflows are handled in the relevant SAMBRAMO app.'],
            ['Will payments use Razorpay?','Razorpay is part of the planned secure payment experience for supported app transactions. The website does not process bookings.'],
            ['Is the logistics map live?','The cinematic map is a product visualization on the website. Live GPS, route and venue-entry status will come from partner operations inside the app.'],
            ['When are the apps launching?','The role-based apps are coming soon. Use the Get the app / Early access CTA to register interest once the launch links are available.'],
          ].map(([q,a])=><details key={q} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><summary className="cursor-pointer list-none font-extrabold marker:hidden">{q}<ChevronRight className="float-right transition group-open:rotate-90" size={18}/></summary><p className="mt-3 pr-6 text-sm leading-6 text-slate-500">{a}</p></details>)}</div></Reveal></div>
        </section>

        <section className="bg-[#210638] px-4 py-16 text-center text-white sm:py-24"><Reveal><div className="mx-auto max-w-3xl"><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-violet-300"><Clock3 size={14}/> Coming soon</span><h2 className="mt-4 text-4xl font-black sm:text-6xl">Your next event starts here.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-violet-100/70 sm:text-base">Get early access when the SAMBRAMO apps open for customers, event providers, logistics partners and suppliers.</p><button onClick={() => setHandoff(true)} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-violet-950 shadow-2xl transition hover:-translate-y-0.5">Get early access <ArrowRight size={17}/></button></div></Reveal></section>
      </main>

      <footer className="border-t border-white/10 bg-[#160325] px-4 py-9 pb-[calc(2.25rem+env(safe-area-inset-bottom))] text-white sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div><p className="font-display text-2xl font-black">SAMBRAMO</p><p className="mt-2 text-sm text-violet-100/55">{TAGLINE}</p><p className="mt-4 max-w-sm text-xs leading-5 text-violet-100/45">The connected event ecosystem — discovery, services, supply chain and logistics.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-violet-200">Explore</p><div className="mt-3 space-y-2 text-sm text-violet-100/60">{['how-it-works','services','supply-chain','logistics'].map(id=><button key={id} onClick={() => scrollTo(id)} className="block hover:text-white">{id.replaceAll('-',' ')}</button>)}</div></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-violet-200">Events</p><div className="mt-3 space-y-2 text-sm text-violet-100/60">{EVENT_TYPES.slice(0,4).map(x=><button key={x[0]} onClick={() => scrollTo('events')} className="block hover:text-white">{x[0]}</button>)}</div></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-violet-200">Connect</p><div className="mt-3 space-y-2 text-sm text-violet-100/60"><span className="block">Instagram · Coming soon</span><span className="block">WhatsApp · Coming soon</span><span className="block">LinkedIn · Coming soon</span><span className="block">Facebook · Coming soon</span></div></div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-[11px] text-violet-100/35">© {new Date().getFullYear()} SAMBRAMO. Product preview.</div>
      </footer>

      <AppHandoff open={handoff} onClose={() => setHandoff(false)} />
      <style>{`
        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; }
        body { overflow-x: hidden; }
        button, a, input { -webkit-tap-highlight-color: transparent; }
        .sambramo-header { padding-top: env(safe-area-inset-top); }
        .sambramo-menu-button { flex: 0 0 44px; }
        .sambramo-promo { min-width: 0; }
        .sambramo-promo-track {
          display: flex; min-width: max-content; gap: 1.1rem; white-space: nowrap;
          animation: sambramo-promo 18s linear infinite;
        }
        .sambramo-promo-track span { display: inline-flex; align-items: center; }
        @keyframes sambramo-promo { from { transform: translateX(0); } to { transform: translateX(-38%); } }
        @media (prefers-reduced-motion: reduce) { .sambramo-promo-track { animation: none; } }
        @media (max-width: 639px) {
          main, section, footer { max-width: 100%; }
          img, picture, video, svg { max-width: 100%; }
          h1, h2, h3, p { overflow-wrap: anywhere; }
          input { font-size: 16px !important; }
        }
        @media (max-width: 380px) {
          .sambramo-promo-track { gap: .8rem; }
        }
      `}</style>
    </div>
  )
}
