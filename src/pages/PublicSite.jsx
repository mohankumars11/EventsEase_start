import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bell, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, Heart, Instagram, Linkedin, MapPin, Menu, PackageCheck,
  Search, ShieldCheck, Sparkles, Truck, Users, X, Youtube, Camera, CarFront,
  UtensilsCrossed, Flower2, Music2, Building2, PartyPopper, Gem, SlidersHorizontal
} from 'lucide-react'

const heroHooks = [
  'Your event. Your vendors. One place.',
  'Find the right service when you need it.',
  'From celebration to transportation.',
  'Discover. Connect. Book. Done.',
]

const services = [
  ['Venues & Spaces','Places, setup & equipment','Spaces','https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=88',Building2],
  ['Decor & Florists','Themes, flowers & styling','Creative','https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=88',Flower2],
  ['Catering & Cooks','Food, service & kitchens','Food','https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=88',UtensilsCrossed],
  ['Photography & Video','Capture every moment','Creative','https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=88',Camera],
  ['Music & Entertainment','DJs, artists & experiences','Creative','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=88',Music2],
  ['Transport & Auto','People, goods & event movement','Logistics','https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=88',CarFront],
  ['Beauty & Wellness','Makeup, grooming & care','Specialists','https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=88',Gem],
  ['Event Support','On-ground people & operations','Operations','https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1200&q=88',Users],
]

const trades = [
  'Catering','Decor','Photography','Venues','Entertainment','Makeup',
  'Transport','Auto','Cars','Logistics','Flowers','Priests','Event Staff',
  'Equipment','Invitations','Gifts','Cakes','Music','Beauty','Security',
  'Cleaning','Hosts','Artists','Production','Rentals','More'
]

const journey = [
  ['01','Discover','Tell Sambramo what you need.',Search],
  ['02','Connect','Explore the right service path.',Users],
  ['03','Choose','Review the details before you commit.',Check],
  ['04','Book','Move the selected service into your plan.',CalendarDays],
  ['05','Confirm','Keep the event moving toward the day.',PackageCheck],
]

const occasions = [
  ['Weddings','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=88'],
  ['Birthdays','https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=88'],
  ['Corporate Events','https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1000&q=88'],
  ['Cultural Events','https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=88'],
  ['Social Gatherings','https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=88'],
]

function LaunchSoon({ partner = false, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10021f]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Sambramo launch information">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <X size={18}/>
        </button>
        <div className="relative overflow-hidden bg-[#2A085C] px-7 pb-8 pt-9 text-white">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#b76be8]/25 blur-3xl"/>
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]"><Sparkles size={22}/></div>
          <p className="relative mt-5 text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">SAMBRAMO</p>
          <h2 className="relative mt-2 font-serif text-3xl font-bold">Live in Bengaluru soon.</h2>
          <p className="relative mt-3 text-sm leading-6 text-white/70">
            {partner
              ? 'The partner experience is being prepared for event professionals. Join early to hear when partner access opens.'
              : 'The customer experience is being prepared for Bengaluru. Join the launch list to hear when access opens.'}
          </p>
        </div>
        <div className="p-6">
          <div className="flex gap-3 rounded-2xl border border-[#eadff1] bg-[#fbf8fd] p-4">
            <MapPin size={18} className="mt-0.5 shrink-0 text-[#2A085C]"/>
            <div><p className="text-sm font-black">Live in Bengaluru soon</p><p className="mt-1 text-xs text-[#776b7d]">Events · services · partners · logistics</p></div>
          </div>
          <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-[#2A085C] py-3.5 text-sm font-black text-white transition hover:bg-[#3a0b78]">Continue exploring</button>
        </div>
      </div>
    </div>
  )
}

function LaunchButton({ children, partner = false, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      {open && <LaunchSoon partner={partner} onClose={() => setOpen(false)}/>}
    </>
  )
}

function Brand() {
  return (
    <a href="#top" className="shrink-0" aria-label="Sambramo home">
      <span className="block text-[21px] font-black tracking-[.08em] text-white sm:text-[25px]">SAMBRAMO</span>
      <span className="block text-[6.5px] font-semibold tracking-[.17em] text-white/65">EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </a>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [['#services','Services'],['#journey','How It Works'],['#about','About'],['#partners','Partners'],['#contact','Contact']]
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1b0534] shadow-[0_8px_30px_rgba(16,2,31,.22)]">
      <div className="mx-auto flex h-[64px] max-w-[1480px] items-center justify-between px-4 sm:h-[72px] sm:px-8">
        <Brand/>
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map(([href,label], index) => (
            <a key={href} href={href} className={`text-[12px] font-black transition-colors ${index===0 ? 'text-[#F4C85D]' : 'text-white/72 hover:text-white'}`}>{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LaunchButton className="hidden rounded-xl bg-[#F4C85D] px-5 py-2.5 text-[12px] font-black text-[#1d0b30] shadow-lg transition hover:-translate-y-0.5 sm:block">Launching Soon</LaunchButton>
          <button onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15 lg:hidden">
            {open ? <X size={19}/> : <Menu size={19}/>}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#1b0534] px-4 pb-5 pt-3 lg:hidden">
          <div className="space-y-1">
            {links.map(([href,label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white/90">{label}</a>)}
            <LaunchButton className="mt-2 w-full rounded-xl bg-[#F4C85D] py-3 text-sm font-black text-[#1d0b30]">Launching Soon</LaunchButton>
          </div>
        </div>
      )}
    </header>
  )
}

function DynamicMarketingHooks() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((v) => (v + 1) % heroHooks.length), 3200)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="relative h-[52px] overflow-hidden sm:h-[58px]" aria-live="polite">
      {heroHooks.map((hook, index) => (
        <div key={hook} className={`absolute inset-0 flex items-center transition-all duration-700 ${active===index ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-sm pointer-events-none'}`}>
          <span className="font-serif text-[24px] font-bold leading-tight text-white sm:text-[30px]">{hook}</span>
        </div>
      ))}
    </div>
  )
}

function FloatingMarketingCard({ icon: Icon, title, subtitle, action, className = '', delay = '0s' }) {
  return (
    <div className={`absolute z-20 hidden w-[230px] rounded-2xl border border-white/15 bg-[#16032c]/65 p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,.25)] backdrop-blur-xl lg:block ${className}`} style={{ animation: `sambramo-float 6s ease-in-out ${delay} infinite` }}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C85D] text-[#2A085C]"><Icon size={18}/></div>
        <div className="min-w-0">
          <p className="text-xs font-black">{title}</p>
          <p className="mt-1 text-[10px] leading-4 text-white/55">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-[9px] font-black uppercase tracking-[.14em] text-[#F4C85D]">{action}</span>
        <ArrowUpRight size={14} className="text-white/60"/>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#18042f] text-white">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2200&q=90')] bg-cover bg-[center_35%]"/>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(147,76,192,.28),transparent_28%),linear-gradient(90deg,#18042f_0%,rgba(24,4,47,.98)_30%,rgba(24,4,47,.78)_58%,rgba(24,4,47,.25)_100%)]"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#18042f] via-transparent to-[#18042f]/20"/>
      <div className="relative z-10 mx-auto flex min-h-[650px] max-w-[1480px] items-center px-5 py-20 sm:min-h-[690px] sm:px-10 lg:min-h-[730px] lg:px-14">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#18042f]/60 px-3.5 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F4C85D] backdrop-blur-md sm:text-[10px]">
            <i className="h-1.5 w-1.5 rounded-full bg-[#F4C85D]"/>
            YOUR EVENT. OUR DELIVERY.
          </div>
          <h1 className="max-w-3xl font-serif text-[43px] font-bold leading-[.99] tracking-[-.035em] text-white sm:text-[60px] lg:text-[76px]">
            Everything you need.
            <span className="block text-white">One connected experience.</span>
          </h1>
          <div className="mt-5 max-w-2xl"><DynamicMarketingHooks/></div>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72 sm:text-[16px] sm:leading-7">
            Discover event services, connect with partners and move from idea to execution through one connected experience.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#F4C85D]/30 bg-[#2A085C]/75 px-3.5 py-2 text-[10px] font-black uppercase tracking-[.15em] text-[#F4C85D] backdrop-blur-md">
            <MapPin size={14}/> Live in Bengaluru soon
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <LaunchButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F4C85D] px-6 py-3.5 text-sm font-black text-[#1c0b2d] shadow-[0_12px_30px_rgba(244,200,93,.2)] transition hover:-translate-y-0.5 active:scale-[.98]">
              Explore Sambramo <ArrowRight size={17}/>
            </LaunchButton>
            <a href="#services" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/[.06] px-6 py-3.5 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/[.12] active:scale-[.98]">
              Explore Services <Search size={16}/>
            </a>
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-white/40">Discover · Connect · Book · Done.</p>
        </div>
      </div>

      <FloatingMarketingCard icon={Camera} title="Photography" subtitle="Discover a service path for the moment." action="Explore" className="right-[7%] top-[24%]" delay="0s"/>
      <FloatingMarketingCard icon={CarFront} title="Auto & transport" subtitle="Move people and event essentials." action="Discover" className="right-[10%] bottom-[19%]" delay="1.4s"/>
      <FloatingMarketingCard icon={Flower2} title="Decor & flowers" subtitle="Build the visual experience around your occasion." action="Explore" className="right-[31%] bottom-[9%]" delay="2.4s"/>
    </section>
  )
}

function FeatureStrip() {
  const items = [
    [Users,'Connected services','Explore the moving parts'],
    [BadgeCheck,'Partner ecosystem','Services built around events'],
    [CalendarDays,'One event journey','Keep the details together'],
    [Heart,'For every occasion','Personal or professional'],
  ]
  return (
    <section className="border-b border-[#e9e0ef] bg-white">
      <div className="mx-auto grid max-w-[1480px] grid-cols-2 lg:grid-cols-4">
        {items.map(([Icon,title,sub]) => (
          <div key={title} className="flex items-center gap-3 border-b border-r border-[#ece4f0] px-4 py-5 sm:px-6 lg:border-b-0 lg:px-8 lg:py-6">
            <Icon size={25} strokeWidth={1.7} className="shrink-0 text-[#2A085C]"/>
            <div><p className="text-[11px] font-black sm:text-[13px]">{title}</p><p className="mt-1 text-[9px] text-[#7c7183] sm:text-[11px]">{sub}</p></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SearchExperience() {
  const examples = ['Find a photographer','Find a decorator','Book an auto','Find a venue','Find catering','Find logistics']
  const [query,setQuery] = useState('')
  const [active,setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((v) => (v + 1) % examples.length), 2600)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <section className="bg-[#fbf8fd] px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Quick discovery</p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">What do you need today?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#6d6173]">One place to discover the services that can become part of your event.</p>
        <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-[#ded2e6] bg-white p-2 shadow-[0_15px_50px_rgba(42,8,92,.08)] transition focus-within:border-[#2A085C] focus-within:shadow-[0_18px_55px_rgba(42,8,92,.13)]">
          <div className="flex items-center gap-3 rounded-xl bg-[#fbf8fd] px-4">
            <Search size={19} className="shrink-0 text-[#2A085C]"/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search Sambramo" placeholder={examples[active]} className="h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#211329] outline-none placeholder:text-[#9b8da4]"/>
            <button type="button" onClick={() => document.getElementById('services')?.scrollIntoView({behavior:'smooth'})} className="hidden h-10 shrink-0 items-center gap-1 rounded-xl bg-[#2A085C] px-4 text-[10px] font-black text-white sm:flex">Explore <ArrowRight size={13}/></button>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:justify-center">
          {['Photography','Decor','Catering','Auto','Venues','Logistics'].map((x) => <button key={x} onClick={() => { setQuery(x); document.getElementById('services')?.scrollIntoView({behavior:'smooth'}) }} className="whitespace-nowrap rounded-full border border-[#e3d8e9] bg-white px-3.5 py-2 text-[10px] font-black text-[#624f6d] transition hover:border-[#2A085C] hover:text-[#2A085C]">{x}</button>)}
        </div>
      </div>
    </section>
  )
}

function Services() {
  const [filter,setFilter] = useState('All')
  const filters = ['All','Creative','Food','Logistics','Spaces','Specialists']
  const shown = useMemo(() => filter==='All' ? services : services.filter((x) => x[2]===filter), [filter])
  return (
    <section id="services" className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Service discovery</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Everything around the occasion.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#6d6173]">Move through the categories you need without losing the bigger event picture.</p></div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1"><SlidersHorizontal size={14} className="mr-1 shrink-0 text-[#8050a8]"/>{filters.map((f) => <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] font-black transition ${filter===f ? 'bg-[#2A085C] text-white' : 'bg-[#f4eff7] text-[#5f4d68] hover:bg-[#e9def0]'}`}>{f}</button>)}</div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {shown.map(([title,sub,tag,img,Icon]) => (
            <a href="#partners" key={title} className="group overflow-hidden rounded-[20px] border border-[#ebe3ef] bg-white shadow-[0_8px_28px_rgba(42,8,92,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(42,8,92,.12)]">
              <div className="relative aspect-[1.15] overflow-hidden">
                <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"/>
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-[#2A085C]"><Icon size={15}/></span>
                <span className="absolute bottom-3 left-3 rounded-full bg-[#18042f]/75 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white backdrop-blur">{tag}</span>
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#2A085C]"><ArrowUpRight size={13}/></span>
              </div>
              <div className="p-4 sm:p-5"><h3 className="text-[12px] font-black leading-5 sm:text-[14px]">{title}</h3><p className="mt-1.5 text-[10px] leading-4 text-[#7b7080] sm:text-[11px]">{sub}</p></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function Ecosystem() {
  return (
    <section className="overflow-hidden bg-[#18042f] px-5 py-14 text-white sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">The service ecosystem</p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Many trades. One connected place.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/65">Sambramo is being shaped around the many specialist roles that make an event happen—from creative services and food to transport and event-day operations.</p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {trades.slice(0,18).map((x,i) => <div key={x} className="rounded-xl border border-white/10 bg-white/[.045] px-3 py-2.5 text-[9px] font-bold text-white/70 transition hover:bg-white/[.08]"><span className="mr-1 text-[#F4C85D]">{String(i+1).padStart(2,'0')}</span>{x}</div>)}
            </div>
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-[#2A085C] p-6 sm:p-10">
            <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#F4C85D]/40 bg-[#F4C85D] text-center text-[#2A085C] shadow-[0_0_80px_rgba(244,200,93,.18)]"><div><p className="text-[10px] font-black tracking-[.15em]">SAMBRAMO</p><p className="mt-1 text-[8px] font-bold">ONE PLACE</p></div></div>
            <div className="grid h-full grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ['Celebration','Weddings · Birthdays','top-3 left-3'],
                ['Creative','Decor · Photo','top-3 right-3'],
                ['Food','Catering · Cooks','bottom-3 left-3'],
                ['Mobility','Auto · Cars','bottom-3 right-3'],
                ['Spaces','Venues · Equipment','top-1/2 left-3 -translate-y-1/2'],
                ['Operations','Staff · Logistics','top-1/2 right-3 -translate-y-1/2'],
              ].map(([t,s,pos]) => <div key={t} className={`absolute ${pos} rounded-2xl border border-white/15 bg-white/[.07] px-4 py-3 backdrop-blur-md`}><p className="text-[10px] font-black text-white">{t}</p><p className="mt-1 text-[8px] text-white/45">{s}</p></div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductJourney() {
  const [active,setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((v) => (v + 1) % journey.length), 3000)
    return () => window.clearInterval(timer)
  }, [])
  const [n,title,body,Icon] = journey[active]
  return (
    <section id="journey" className="bg-[#f7f3fa] px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-9 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Product journey</p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Discover → Connect → Book → Confirm.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#6d6173]">A compact product story showing how the experience is intended to move, without pretending that every launch feature is already live.</p>
            <div className="mt-7 space-y-2">
              {journey.map(([id,title]) => <button key={id} onClick={() => setActive(Number(id)-1)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${active===Number(id)-1 ? 'border-[#2A085C] bg-[#2A085C] text-white shadow-lg' : 'border-[#e0d5e6] bg-white text-[#5e5066]'}`}><span className={`text-[9px] font-black ${active===Number(id)-1 ? 'text-[#F4C85D]' : 'text-[#8a7893]'}`}>{id}</span><span className="text-xs font-black">{title}</span></button>)}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[30px] bg-[#2A085C] p-6 text-white shadow-[0_25px_80px_rgba(42,8,92,.18)] sm:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#a75ddd]/20 blur-3xl"/>
            <div className="relative grid gap-8 md:grid-cols-[1fr_.85fr] md:items-center">
              <div>
                <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#F4C85D]">Step {n}</span>
                <h3 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">{title}</h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-white/70">{body}</p>
                <div className="mt-7 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]"><Icon size={20}/></div><span className="text-xs font-black text-white/65">One connected event journey</span></div>
              </div>
              <div className="rounded-[26px] border border-white/15 bg-white/[.07] p-3 backdrop-blur-xl">
                <div className="rounded-[20px] bg-[#fbf7fd] p-4 text-[#211329]">
                  <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#8a7693]">Event workspace</p>
                  <p className="mt-1 text-sm font-black">Your celebration</p>
                  <div className="mt-5 space-y-2">{['Service selected','Partner connection','Event movement'].map((x,i) => <div key={x} className="flex items-center gap-2 rounded-xl border border-[#eee5f2] bg-white p-3"><span className={`h-2 w-2 rounded-full ${i <= active/2 ? 'bg-emerald-500' : 'bg-[#c9bdcf]'}`}/><span className="text-[10px] font-bold">{x}</span></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnerSection() {
  return (
    <section id="partners" className="bg-[#210747] px-5 py-14 text-white sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">For event partners</p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">A better way to connect your service to events.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">A partner workspace can bring service listings, opportunities, schedules, job details and earnings into one place. Partner access will open with the launch.</p>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {['List services','Receive opportunities','Manage schedule','Track earnings'].map((x,i) => <div key={x} className="rounded-2xl border border-white/10 bg-white/[.05] p-3.5"><span className="text-[9px] font-black text-[#F4C85D]">0{i+1}</span><p className="mt-2 text-[10px] font-extrabold">{x}</p></div>)}
            </div>
            <LaunchButton partner className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F4C85D] px-5 py-3 text-sm font-black text-[#1d0b30]">Partner With Sambramo <ArrowRight size={15}/></LaunchButton>
          </div>
          <div className="rounded-[32px] border border-white/10 bg-white/[.055] p-3 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[26px] bg-[#fbf8fd] p-4 text-[#211329] sm:p-5">
              <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#87768f]">Partner workspace preview</p><p className="mt-1 text-base font-black">Your event work, connected.</p></div><span className="rounded-full bg-[#f1e7f8] px-2.5 py-1 text-[8px] font-black text-[#5b3c70]">Preview</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2">{[['Jobs','Opportunities'],['Calendar','Availability'],['Earnings','Payout view']].map(([a,b]) => <div key={a} className="rounded-xl bg-[#f4eff8] p-3"><p className="text-[11px] font-black text-[#2A085C]">{a}</p><p className="mt-1 text-[8px] text-[#7b6e82]">{b}</p></div>)}</div>
              <div className="mt-4 rounded-2xl border border-[#e9dfee] bg-white p-4"><span className="rounded-full bg-[#e8d9f5] px-2 py-1 text-[8px] font-black text-[#5c3480]">WORKFLOW PREVIEW</span><h4 className="mt-2 text-sm font-black">A new event opportunity</h4><p className="mt-1 text-[9px] leading-4 text-[#7b6e82]">Review service details, schedule and event requirements before responding.</p><div className="mt-4 flex gap-2"><LaunchButton partner className="flex-1 rounded-xl bg-[#2A085C] py-2.5 text-[9px] font-black text-white">Explore Partner Flow</LaunchButton><button className="flex-1 rounded-xl border border-[#dcd0e4] py-2.5 text-[9px] font-black text-[#44364d]">Learn More</button></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Bengaluru() {
  return (
    <section className="relative overflow-hidden bg-[#2A085C] px-5 py-14 text-white sm:px-8 lg:py-16">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=2000&q=88')] bg-cover bg-center opacity-25"/>
      <div className="absolute inset-0 bg-gradient-to-r from-[#2A085C] via-[#2A085C]/92 to-[#2A085C]/55"/>
      <div className="relative mx-auto max-w-[1480px]">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">Launch market</p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Live in Bengaluru soon.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Sambramo is preparing its connected event experience for Bengaluru.</p>
        <div className="mt-7 flex flex-wrap gap-2">{['South Bengaluru','Central Bengaluru','East Bengaluru','West Bengaluru','More areas'].map((x) => <span key={x} className="rounded-xl border border-white/15 bg-white/[.06] px-3.5 py-2 text-[10px] font-bold text-white/75">{x}</span>)}</div>
      </div>
    </section>
  )
}

function Occasions() {
  const [index,setIndex] = useState(0)
  return (
    <section className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex items-end justify-between gap-5">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Occasions</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Made for the moment.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#74677b]">Weddings, birthdays, corporate events, cultural programs and social gatherings.</p></div>
          <div className="hidden gap-2 sm:flex"><button aria-label="Previous" onClick={() => setIndex((v) => (v-1+5)%5)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd4e5] text-[#2A085C] transition hover:bg-[#f5eef8]"><ChevronLeft size={17}/></button><button aria-label="Next" onClick={() => setIndex((v) => (v+1)%5)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd4e5] text-[#2A085C] transition hover:bg-[#f5eef8]"><ChevronRight size={17}/></button></div>
        </div>
        <div className="mt-8 flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-5">{[0,1,2,3,4].map((offset) => { const item=occasions[(index+offset)%5]; return <div key={item[0]} className="group relative min-w-[76%] snap-start overflow-hidden rounded-[22px] sm:min-w-0"><img src={item[1]} alt="" loading="lazy" className="aspect-[1.12] h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"/><p className="absolute bottom-0 left-0 p-4 text-xs font-black text-white">{item[0]}</p></div> })}</div>
      </div>
    </section>
  )
}

function About() {
  const items = [[Users,'Wide range','event services'],[ShieldCheck,'Partner-led','service discovery'],[PackageCheck,'Connected','event operations'],[MapPin,'Local focus','Bengaluru first'],[Sparkles,'Designed for','every celebration']]
  return (
    <section id="about" className="bg-[#f7f3fa] px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px] text-center">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">The Sambramo idea</p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Built around the way events actually happen.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6d6173]">One connected layer between customers, event specialists and the movement required to make a celebration happen.</p>
        <div className="mt-9 grid grid-cols-2 border-y border-[#e1d6e6] sm:grid-cols-3 lg:grid-cols-5">
          {items.map(([Icon,title,sub]) => <div key={title} className="border-b border-r border-[#e1d6e6] px-4 py-7 last:border-r-0 lg:border-b-0"><Icon size={26} className="mx-auto text-[#2A085C]" strokeWidth={1.7}/><p className="mt-4 text-[11px] font-black">{title}</p><p className="mt-1 text-[9px] leading-4 text-[#7d7182]">{sub}</p></div>)}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const [email,setEmail] = useState('')
  const [sent,setSent] = useState(false)
  return (
    <section id="contact" className="bg-white px-5 py-12 sm:px-8 lg:py-16">
      <div className="relative mx-auto max-w-[1480px] overflow-hidden rounded-[30px] bg-[#2A085C] p-7 text-white sm:p-10 lg:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8c4dca]/25 blur-3xl"/>
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">Stay updated</p>
            <h2 className="mt-2 max-w-xl font-serif text-3xl font-bold sm:text-4xl">Be among the first to know.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">Leave your email for launch updates and Bengaluru availability announcements.</p>
            {sent ? <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold"><Check className="text-[#F4C85D]"/>You’re on the launch list.</div> : <form onSubmit={(e) => { e.preventDefault(); if(email.trim()) setSent(true) }} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="min-h-12 flex-1 rounded-xl border border-white/10 bg-white px-4 text-sm text-[#211329] outline-none placeholder:text-[#9b8da4]"/><button className="min-h-12 rounded-xl bg-[#F4C85D] px-5 text-sm font-black text-[#1d0b30]">Notify Me <ArrowRight size={15} className="ml-1 inline"/></button></form>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]"><Bell size={20}/></div><div><p className="text-sm font-black">Live in Bengaluru soon</p><p className="mt-1 text-[10px] text-white/50">Customer + partner experiences</p></div></div>
            <div className="mt-5 grid grid-cols-2 gap-2">{['Services','Partners','Logistics','Events'].map((x) => <div key={x} className="rounded-xl bg-black/10 p-3 text-[9px] font-black text-white/65">{x}</div>)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const questions = [
    ['When is Sambramo launching?','Sambramo is preparing its first launch in Bengaluru. The website is open for discovery while customer and partner access is being prepared.'],
    ['Can I join as an event partner?','Yes. The partner experience is designed for services such as catering, decoration, photography, entertainment, venues, logistics, beauty and traditional services.'],
    ['Is Sambramo only for weddings?','No. The experience is being designed for weddings, birthdays, corporate events, cultural programs, social gatherings and other occasions.'],
    ['What does Discover · Connect · Book · Done mean?','It is the product principle: make it easier to discover a service, connect the right people, move into booking and keep the event journey together.'],
  ]
  const [active,setActive] = useState(0)
  return (
    <section className="bg-[#fffdfd] px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Questions</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">A few things people ask.</h2></div>
        <div className="mt-8 space-y-2">{questions.map(([q,answer],i) => <div key={q} className="overflow-hidden rounded-2xl border border-[#e8deed] bg-white"><button onClick={() => setActive(active===i ? -1 : i)} aria-expanded={active===i} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left"><span className="text-sm font-black">{q}</span><ChevronDown size={17} className={active===i ? 'rotate-180 text-[#2A085C]' : 'text-[#2A085C]'}/></button>{active===i && <p className="px-5 pb-5 text-sm leading-6 text-[#75697b]">{answer}</p>}</div>)}</div>
      </div>
    </section>
  )
}

function Footer() {
  const links = [['#services','Services'],['#journey','How It Works'],['#about','About'],['#partners','Partners'],['#contact','Contact']]
  return (
    <footer className="bg-[#18042f] px-5 pb-6 pt-12 text-white sm:px-8">
      <div className="mx-auto grid max-w-[1480px] gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div><Brand/><p className="mt-5 text-xs leading-6 text-white/45">Discover · Connect · Book · Done.</p><p className="mt-4 flex items-center gap-2 text-xs text-white/45"><MapPin size={14}/>Live in Bengaluru soon.</p></div>
        <div><p className="text-xs font-black">Explore</p><div className="mt-4 space-y-2 text-xs text-white/55">{links.map(([href,label]) => <a key={href} href={href} className="block transition hover:text-white">{label}</a>)}</div></div>
        <div><p className="text-xs font-black">For Customers</p><LaunchButton className="mt-4 text-xs text-white/55 transition hover:text-white">Customer launch</LaunchButton><p className="mt-5 text-xs font-black">For Partners</p><LaunchButton partner className="mt-3 text-xs text-white/55 transition hover:text-white">Partner launch</LaunchButton></div>
        <div><p className="text-xs font-black">Follow Sambramo</p><div className="mt-4 flex gap-2"><a href="#contact" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70 transition hover:bg-white/10"><Instagram size={16}/></a><a href="#contact" aria-label="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70 transition hover:bg-white/10"><Linkedin size={16}/></a><a href="#contact" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70 transition hover:bg-white/10"><Youtube size={16}/></a></div></div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1480px] flex-col gap-2 border-t border-white/10 pt-5 text-[10px] text-white/35 sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} Sambramo. All rights reserved.</span><span className="text-[#F4C85D]">YOUR EVENT. OUR DELIVERY.</span></div>
    </footer>
  )
}

export default function PublicSite() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#211329] selection:bg-[#F4C85D] selection:text-[#1d0b30]">
      <Nav/>
      <main>
        <Hero/>
        <FeatureStrip/>
        <SearchExperience/>
        <Services/>
        <Ecosystem/>
        <ProductJourney/>
        <PartnerSection/>
        <Bengaluru/>
        <Occasions/>
        <About/>
        <Contact/>
        <FAQ/>
      </main>
      <Footer/>
      <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden">
        <div className="flex gap-2 rounded-2xl border border-[#e6d9eb] bg-white/95 p-2 shadow-[0_14px_35px_rgba(42,8,92,.18)] backdrop-blur-xl">
          <LaunchButton className="flex-1 rounded-xl bg-[#2A085C] py-3 text-xs font-black text-white">Launching Soon</LaunchButton>
          <a href="#partners" className="flex-1 rounded-xl bg-[#F4C85D] py-3 text-center text-xs font-black text-[#1d0b30]">For Partners</a>
        </div>
      </div>
    </div>
  )
}
