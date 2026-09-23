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

function LiveConnectionPanel() {
  const [active, setActive] = useState(1)

  useEffect(() => {
    const timer = setInterval(() => setActive(value => (value + 1) % 4), 2200)
    return () => clearInterval(timer)
  }, [])

  const nodes = [
    ['Customer', 'Needs decor', 'Search'],
    ['Provider', 'Confirms service', 'Connect'],
    ['Supplier', 'Prepares supply', 'Ready'],
    ['Logistics', 'Moves it', 'Arriving'],
  ]

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-white/15 bg-white/[.07] p-2.5 shadow-2xl backdrop-blur-xl sm:rounded-[34px] sm:p-3">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-950 p-4 sm:rounded-[28px] sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,.3),transparent_35%),radial-gradient(circle_at_15%_85%,rgba(168,85,247,.2),transparent_32%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Connected event view</p>
              <p className="mt-1 text-sm font-black text-white sm:text-base">One event. Four moving parts.</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> LIVE VIEW
            </span>
          </div>

          <div className="relative mt-5">
            <div className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-violet-400/20 via-violet-300/80 to-violet-400/20 sm:block" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1">
              {nodes.map(([title, detail, status], index) => (
                <div key={title} className={'relative min-w-0 rounded-2xl border p-3 transition-all duration-500 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-2 ' + (active === index ? 'border-violet-300/40 bg-violet-500/15 sm:scale-105' : 'border-white/10 bg-white/[.035]')}>
                  <div className="relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-violet-200 shadow-lg">
                    {index === 0 ? <Users size={17} /> : index === 1 ? <Sparkles size={17} /> : index === 2 ? <PackageCheck size={17} /> : <Truck size={17} />}
                  </div>
                  <p className="mt-2 truncate text-center text-[10px] font-black text-white">{title}</p>
                  <p className="mt-0.5 truncate text-center text-[9px] text-slate-400">{detail}</p>
                  <div className="mx-auto mt-2 flex w-fit items-center gap-1 text-[8px] font-black uppercase tracking-wider text-violet-300"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" />{status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.05] p-3">
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Problem</p>
              <p className="mt-1 text-[10px] font-bold text-white">Too many calls</p>
            </div>
            <div className="rounded-2xl border border-violet-300/15 bg-violet-400/10 p-3">
              <p className="text-[8px] font-black uppercase tracking-wider text-violet-300">SAMBRAMO</p>
              <p className="mt-1 text-[10px] font-bold text-white">One connected flow</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.05] p-3">
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Result</p>
              <p className="mt-1 text-[10px] font-bold text-white">Clear status</p>
            </div>
          </div>

          <p className="mt-3 text-center text-[9px] leading-4 text-slate-500">Animated product visualization — live operational data will be connected inside the SAMBRAMO apps.</p>
        </div>
      </div>
    </div>
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
        <section className="relative overflow-hidden border-b border-white/10 px-4 pb-12 pt-9 sm:px-6 sm:pb-20 sm:pt-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(168,85,247,.34),transparent_32%),radial-gradient(circle_at_12%_70%,rgba(124,58,237,.22),transparent_34%)]" />
          <div className="relative mx-auto w-full max-w-7xl">
            <Reveal>
              <div className="max-w-4xl">
                <div className="border-l-2 border-violet-300 pl-4 sm:pl-5">
                  <p className="text-[clamp(2.3rem,9vw,5.4rem)] font-black leading-[.9] tracking-[-.055em] text-white">SAMBRAMO</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-200 sm:text-xs">Events • Event Supply Chain • Logistics</p>
                </div>

                <h1 className="mt-7 max-w-4xl text-[clamp(2.45rem,9vw,6.2rem)] font-black leading-[.94] tracking-[-.055em]">
                  Events should feel <span className="text-violet-300">connected.</span>
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-6 text-violet-100/75 sm:text-lg sm:leading-7">
                  One connected layer for people, services, supplies and movement — so families spend less time coordinating and more time celebrating.
                </p>

                <div className="mt-6 grid max-w-3xl grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[.055] p-3 backdrop-blur"><p className="text-[9px] font-black uppercase tracking-wider text-violet-300">Problem</p><p className="mt-1 text-xs font-bold text-white">Scattered vendors</p></div>
                  <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-3 backdrop-blur"><p className="text-[9px] font-black uppercase tracking-wider text-violet-300">Connection</p><p className="mt-1 text-xs font-bold text-white">One event flow</p></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.055] p-3 backdrop-blur"><p className="text-[9px] font-black uppercase tracking-wider text-violet-300">Outcome</p><p className="mt-1 text-xs font-bold text-white">Clearer execution</p></div>
                </div>

                <div className="relative mt-5 max-w-2xl">
                  <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl">
                    <Search className="ml-2 shrink-0 text-slate-400" size={19} />
                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search weddings, catering, decor, logistics…" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400" aria-label="Search SAMBRAMO" />
                    <button onClick={() => setHandoff(true)} className="hidden shrink-0 rounded-xl bg-violet-700 px-4 py-3 text-xs font-black text-white sm:block">Explore</button>
                  </div>
                  {recommendations.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">
                      {recommendations.map(item => (
                        <button key={item.title} onClick={() => { setQuery(item.title); scrollTo('events') }} className="flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50">
                          <span className="shrink-0 text-lg">{item.icon}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.title}</span><span className="block truncate text-[11px] text-slate-500">{item.description}</span></span>
                          <ChevronRight size={15} className="shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Reveal>

            <div className="mt-7 grid gap-3 lg:absolute lg:right-0 lg:top-4 lg:mt-0 lg:w-[44%]">
              <Reveal><LiveConnectionPanel /></Reveal>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-14 text-slate-950 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <Reveal>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[.2em] text-violet-700">The problem → the connection</span>
                  <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Stop coordinating an event across ten different conversations.</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-500">SAMBRAMO connects the people, service, supply and movement that normally sit in separate silos.</p>
              </div>
            </Reveal>

            <div className="relative mt-8">
              <div className="pointer-events-none absolute left-[12%] right-[12%] top-1/2 hidden h-px bg-gradient-to-r from-slate-200 via-violet-300 to-slate-200 lg:block" />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['01','DISCOVER','Find a service','Search by event, need or category.',Search],
                  ['02','CONNECT','Match the right people','Bring providers and suppliers into one event.',Users],
                  ['03','MOVE','Track what is happening','Coordinate supply, logistics and venue entry.',Truck],
                  ['04','COMPLETE','Finish in the app','Book, pay and manage the actual workflow.',CheckCircle2],
                ].map(([number,label,title,description,Icon], index) => (
                  <Reveal key={number}>
                    <article className="relative z-10 h-full rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-black text-violet-600">{number}</span><span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_5px_rgba(139,92,246,.1)]" /></div>
                      <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon size={18} /></div>
                      <p className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p>
                      <h3 className="mt-1 text-sm font-black">{title}</h3>
                      <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{description}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="bg-[#f7f5fb] py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6"><Reveal><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">Services</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">Everything your event needs.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">A connected service layer across venues, people, experiences, essentials and event operations.</p></div></Reveal><div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">{SERVICES.map(([title,desc,icon])=><Reveal key={title}><article className="h-full rounded-[20px] bg-white p-3.5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl sm:rounded-[24px] sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">{icon}</div><h3 className="mt-4 text-[13px] font-black leading-tight sm:text-base">{title}</h3><p className="mt-2 text-[10px] leading-4 text-slate-500 sm:text-xs">{desc}</p><button onClick={() => setHandoff(true)} className="mt-4 inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-700">Explore <ArrowRight size={13}/></button></article></Reveal>)}</div></div>
        </section>

        <section id="supply-chain" className="bg-white py-16 text-slate-950 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><Reveal><span className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">Event Supply Chain</span><h2 className="mt-3 text-3xl font-black sm:text-5xl">The event is bigger than the booking.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">SAMBRAMO is designed to connect what happens before the event with what has to arrive, move and be ready on the day.</p><div className="mt-7 space-y-3">{[['Source','Suppliers and event requirements are connected.'],['Prepare','Materials, services and schedules become visible.'],['Move','Logistics partners carry the right things to the right place.'],['Arrive','Venue entry becomes an explicit operational step.']].map(([a,b],i)=><div key={a} className="flex gap-3 rounded-2xl border border-slate-200 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-black text-white">{i+1}</span><div><p className="text-sm font-extrabold">{a}</p><p className="mt-1 text-xs text-slate-500">{b}</p></div></div>)}</div></Reveal><Reveal><div className="rounded-[30px] bg-[#210638] p-5 text-white shadow-2xl sm:p-7"><div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider"><div className="rounded-2xl bg-white/10 p-4"><PackageCheck className="mx-auto mb-2 text-violet-300" size={19}/>Supply</div><div className="rounded-2xl bg-violet-500/30 p-4"><Truck className="mx-auto mb-2 text-violet-200" size={19}/>Movement</div><div className="rounded-2xl bg-white/10 p-4"><MapPin className="mx-auto mb-2 text-violet-300" size={19}/>Venue</div></div><div className="my-8 h-px bg-white/10"/><p className="text-sm font-bold text-violet-200">Operational principle</p><p className="mt-2 text-2xl font-black leading-tight">If it has to reach the event, it belongs in the event supply chain.</p></div></Reveal></div></div>
        </section>

        <LogisticsStory />

        <section id="events" className="bg-[#f7f5fb] py-14 text-slate-950 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <Reveal>
              <span className="text-[10px] font-black uppercase tracking-[.2em] text-violet-700">Events / Offerings</span>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">Whatever the occasion, the connection stays the same.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Choose the occasion. SAMBRAMO connects the service layer around it.</p>
            </Reveal>
            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {EVENT_TYPES.map(([title, description, icon], index) => (
                <button key={title} onClick={() => setHandoff(true)} className="group rounded-[20px] border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl sm:rounded-[22px] sm:p-4">
                  <div className="flex items-start justify-between gap-2"><span className="text-2xl">{icon}</span><span className="text-[9px] font-black text-slate-300">0{index + 1}</span></div>
                  <h3 className="mt-3 text-[13px] font-black leading-tight sm:text-sm">{title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-500">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-violet-700">Explore <ChevronRight size={12} className="transition group-hover:translate-x-0.5" /></span>
                </button>
              ))}
            </div>
          </div>
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
        :root { color-scheme: dark; }
        html { scroll-behavior: smooth; scroll-padding-top: 120px; }
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { width: 100%; max-width: 100%; min-height: 100%; margin: 0; }
        body { overflow-x: hidden; }
        button, a, input, summary { -webkit-tap-highlight-color: transparent; }
        input { font-size: 16px; }
        img, picture, video, canvas, iframe { display: block; max-width: 100%; }
        svg { max-width: 100%; }
        .sambramo-header { padding-top: env(safe-area-inset-top); }
        .sambramo-menu-button { flex: 0 0 44px; }
        .sambramo-promo { min-width: 0; }
        .sambramo-promo-track { display: flex; min-width: max-content; gap: 1.1rem; white-space: nowrap; animation: sambramo-promo 18s linear infinite; }
        .sambramo-promo-track span { display: inline-flex; align-items: center; }
        @keyframes sambramo-promo { from { transform: translateX(0); } to { transform: translateX(-38%); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
        }
        @media (max-width: 639px) {
          html, body, #root { width: 100%; min-width: 0; overflow-x: hidden; }
          main, section, footer, header, nav, article, form, div { min-width: 0; }
          h1, h2, h3, p, span, button, a, summary { overflow-wrap: anywhere; }
          .sambramo-promo-track { max-width: none; }
        }
        @media (max-width: 389px) {
          .sambramo-promo-track { animation-duration: 13s; gap: .8rem; }
        }
      `}</style>
    </div>
  )
}
