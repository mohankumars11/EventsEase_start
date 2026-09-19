import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Handshake, Heart, MapPin, Menu, PackageCheck, Sparkles, Truck, Users, X } from 'lucide-react'

const SERVICE_CARDS = [
  ['Venues & Equipment', 'Spaces, seating, stages, lighting and event-ready setup', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85'],
  ['Decorations & Florists', 'Themes, flowers, backdrops and celebration styling', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85'],
  ['Catering & Cooks', 'Food, cooks, serving teams and event-day catering', 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=85'],
  ['Photography & Videography', 'Photography, films and memories from the occasion', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85'],
  ['DJ & Entertainment', 'Music, sound, anchors, artists and entertainment', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85'],
  ['Event Staff', 'Hosts, serving teams, setup crews and on-ground support', 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=85'],
  ['Logistics & Transport', 'People, supplies, equipment movement and delivery', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=85'],
  ['More Services', 'Beauty, wellness, priests, traditional services and more', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85'],
]

const PARTNER_SERVICES = [
  'Catering & Cooks',
  'Decorations & Florists',
  'Photography & Videography',
  'DJ & Entertainment',
  'Venues & Equipment',
  'Logistics & Transport',
  'Beauty & Wellness',
  'Priests & Traditional Services',
]

const FLOW = [
  ['01', 'Plan', 'Tell us the occasion, date, location and guest count.'],
  ['02', 'Discover', 'Explore the services and event partners relevant to your celebration.'],
  ['03', 'Book', 'Choose what you need and review the event plan.'],
  ['04', 'Coordinate', 'The moving pieces are brought into one connected flow.'],
  ['05', 'Deliver', 'Partners prepare, move, set up and support the event.'],
  ['06', 'Celebrate', 'You focus on the people and the moment.'],
]

function LaunchButton({ children = 'Open Customer App', className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={className} type="button">
        {children}
      </button>
      {open && <LaunchSoonModal onClose={() => setOpen(false)} />}
    </>
  )
}

function LaunchSoonModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16052f]/70 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="launch-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <button onClick={onClose} type="button" aria-label="Close" className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#f2ebf8] text-[#2a085c]">
          <X size={18} />
        </button>
        <div className="bg-[#2a085c] px-7 pb-8 pt-9 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4c85d] text-[#2a085c]">
            <Sparkles size={25} />
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[.22em] text-[#f4c85d]">SAMBRAMO</p>
          <h2 id="launch-title" className="mt-2 font-serif text-3xl font-bold">We are launching soon.</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            The Sambramo platform is being prepared for Bengaluru. We’ll open access once the launch is ready.
          </p>
        </div>
        <div className="px-7 py-6">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f7f3fa] p-4">
            <MapPin size={19} className="text-[#2a085c]" />
            <div>
              <p className="text-sm font-extrabold text-[#211329]">Starting with Bengaluru</p>
              <p className="mt-0.5 text-xs text-[#75687e]">Events • Partners • Logistics</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="mt-5 w-full rounded-2xl bg-[#2a085c] px-5 py-3.5 text-sm font-extrabold text-white">
            Continue exploring
          </button>
        </div>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <a href="#top" className="shrink-0" aria-label="Sambramo home">
      <span className="block text-[21px] font-black tracking-[0.08em] text-white sm:text-[24px]">SAMBRAMO</span>
      <span className="block text-[6.5px] font-semibold tracking-[0.18em] text-white/65 sm:text-[7px]">EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </a>
  )
}

function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    ['#services', 'Services'],
    ['#how-it-works', 'How It Works'],
    ['#about', 'About'],
    ['#partners', 'Partners'],
    ['#bengaluru', 'Bengaluru'],
    ['#contact', 'Contact'],
  ]
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#210747]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-4 sm:h-[72px] sm:px-8 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {links.map(([href, label], i) => (
            <a key={href} href={href} className={i === 0 ? 'text-sm font-extrabold text-[#f4c85d]' : 'text-sm font-bold text-white/80 transition hover:text-white'}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LaunchButton className="hidden rounded-xl bg-[#f4c85d] px-5 py-2.5 text-sm font-extrabold text-[#1d0b30] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 sm:block">
            Open App
          </LaunchButton>
          <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu" aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white lg:hidden">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#210747] px-4 pb-5 pt-3 lg:hidden">
          <div className="mx-auto max-w-2xl space-y-1">
            {links.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white/85 hover:bg-white/10">
                {label}
              </a>
            ))}
            <LaunchButton className="mt-2 w-full rounded-xl bg-[#f4c85d] px-5 py-3 text-sm font-extrabold text-[#1d0b30]">Open App</LaunchButton>
          </div>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#1b0638] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_45%,rgba(101,35,168,.58),transparent_42%),linear-gradient(90deg,rgba(24,4,52,.98)_0%,rgba(35,6,65,.90)_40%,rgba(35,6,65,.30)_72%,rgba(15,2,29,.42)_100%)]" />
      <div className="absolute inset-y-0 right-0 w-full bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=88')] bg-cover bg-center opacity-80 sm:w-[72%]" />
      <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-r from-[#1b0638] via-[#1b0638]/80 to-transparent sm:w-[75%]" />
      <div className="relative mx-auto flex min-h-[570px] max-w-[1440px] items-center px-5 py-16 sm:min-h-[600px] sm:px-10 lg:min-h-[640px] lg:px-14">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#f4c85d] sm:text-sm">YOUR EVENT. OUR DELIVERY.</p>
          <h1 className="mt-5 max-w-xl font-serif text-[42px] font-bold leading-[.98] tracking-[-.03em] sm:text-6xl lg:text-[68px]">
            Everything your event needs.
            <span className="block text-[#fff9ff]">Connected in one place.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            Sambramo brings event services, partners and logistics together so you can focus on the occasion — not the coordination.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-bold text-white">
            <MapPin size={18} className="text-[#f4c85d]" />
            Bengaluru
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LaunchButton className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f4c85d] px-6 py-3.5 text-sm font-extrabold text-[#1c0b2d] shadow-xl shadow-black/20 transition hover:-translate-y-0.5">
              Open Customer App <ArrowRight size={17} />
            </LaunchButton>
            <a href="#partners" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/[.04] px-6 py-3.5 text-sm font-extrabold text-white backdrop-blur-sm transition hover:bg-white/10">
              Partner With Sambramo
            </a>
          </div>
          <p className="mt-4 text-xs font-semibold text-white/45">Launching soon in Bengaluru.</p>
        </div>
      </div>
    </section>
  )
}

function FeatureStrip() {
  const items = [
    [Users, 'Multiple Event Services', 'From venues to logistics'],
    [Handshake, 'Connected Partners', 'A unified ecosystem'],
    [CalendarDays, 'Simpler Coordination', 'Plan with confidence'],
    [Heart, 'For Every Celebration', 'Personal or professional'],
  ]
  return (
    <section className="border-b border-[#e9e0ef] bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-[#e9e0ef] lg:grid-cols-4 lg:divide-y-0">
        {items.map(([Icon, title, sub]) => (
          <div key={title} className="flex items-center gap-3 px-5 py-6 sm:px-8 sm:py-7">
            <Icon size={31} strokeWidth={1.8} className="shrink-0 text-[#2a085c]" />
            <div>
              <p className="text-xs font-extrabold text-[#211329] sm:text-sm">{title}</p>
              <p className="mt-1 text-[10px] text-[#776b7d] sm:text-xs">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StorySection() {
  return (
    <section className="bg-[#fffdfd]">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative min-h-[380px] overflow-hidden bg-[url('https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=88')] bg-cover bg-center sm:min-h-[470px]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 max-w-md p-7 text-white sm:p-10">
            <p className="font-serif text-2xl leading-tight sm:text-3xl">From small gatherings to grand celebrations, Sambramo grows with you.</p>
          </div>
        </div>
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#7950a7]">The problem we solve</p>
          <h2 className="mt-3 font-serif text-3xl font-bold leading-tight text-[#211329] sm:text-4xl">An event has many moving parts. Sambramo brings them together.</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#6c6072] sm:text-base">
            Planning an event often means coordinating different vendors, services, availability, transport, equipment, payments and execution separately. Sambramo is designed to bring these moving parts into one connected experience.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {FLOW.map(([num, title]) => (
              <div key={num} className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1e8f8] text-[#2a085c]"><span className="text-[10px] font-black">{num}</span></div>
                <p className="mt-2 text-[10px] font-extrabold text-[#211329] sm:text-[11px]">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section id="services" className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#7950a7]">Explore event services</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#211329] sm:text-4xl">Across multiple categories.</h2>
          </div>
          <a href="#partners" className="hidden items-center gap-1 text-sm font-extrabold text-[#2a085c] sm:flex">View all services <ArrowRight size={15} /></a>
        </div>
        <div className="-mx-5 mt-8 flex snap-x gap-4 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {SERVICE_CARDS.map(([title, sub, image]) => (
            <a key={title} href="#partners" className="group min-w-[155px] snap-start sm:min-w-0">
              <div className="aspect-[1.12] overflow-hidden rounded-xl bg-[#f1e9f6]">
                <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <p className="mt-2.5 text-xs font-extrabold leading-4 text-[#211329] sm:text-[13px]">{title}</p>
              <p className="mt-1 hidden text-[10px] leading-4 text-[#7b6d83] sm:block">{sub}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function BengaluruSection() {
  return (
    <section id="bengaluru" className="relative overflow-hidden bg-[#210747] px-5 py-14 text-white sm:px-8 lg:py-16">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#210747] via-[#210747]/90 to-[#210747]/45" />
      <div className="relative mx-auto max-w-[1440px]">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#f4c85d]">Starting here</p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Built for Bengaluru.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Sambramo is starting with Bengaluru — connecting event services, partners and logistics across the city.</p>
        <div className="mt-7 flex flex-wrap gap-2">
          {['South Bengaluru', 'Central Bengaluru', 'East Bengaluru', 'And more areas'].map(x => (
            <span key={x} className="rounded-lg border border-white/25 bg-white/[.05] px-3.5 py-2 text-xs font-bold">{x}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="bg-[#f7f2fa] px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-2">
        <div className="rounded-[26px] bg-[#2a085c] p-7 text-white sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c85d] text-[#2a085c]"><Users size={22} /></div>
          <h2 className="mt-6 font-serif text-3xl font-bold">Planning an event?</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Tell us what you’re celebrating. Sambramo is being prepared to bring services, partners and logistics together around your event.</p>
          <LaunchButton className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f4c85d] px-5 py-3 text-sm font-extrabold text-[#1d0b30]">Launching Soon <ArrowRight size={15} /></LaunchButton>
        </div>
        <div id="partners" className="rounded-[26px] bg-white p-7 shadow-sm ring-1 ring-[#e7dced] sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e7f8] text-[#2a085c]"><Handshake size={22} /></div>
          <h2 className="mt-6 font-serif text-3xl font-bold text-[#211329]">Have a service that brings celebrations to life?</h2>
          <p className="mt-3 text-sm leading-6 text-[#6c6072]">Join the Sambramo partner network and connect your trade with customers planning events in Bengaluru.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {PARTNER_SERVICES.map(x => <span key={x} className="rounded-full bg-[#f6f1f9] px-3 py-1.5 text-[10px] font-bold text-[#4f3a5d]">{x}</span>)}
          </div>
          <LaunchButton className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f4c85d] px-5 py-3 text-sm font-extrabold text-[#1d0b30]">Partner With Sambramo <ArrowRight size={15} /></LaunchButton>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#7950a7]">How it works</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-[#211329] sm:text-4xl">A connected event journey.</h2>
          <p className="mt-4 text-sm leading-7 text-[#6c6072] sm:text-base">One place for the plan, the people, the services and the movement around the celebration.</p>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map(([num, title, text]) => (
            <div key={num} className="rounded-2xl border border-[#e8dfed] bg-[#fcfbfd] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a085c] text-[10px] font-black text-white">{num}</span>
                <Check size={17} className="text-[#b087cf]" />
              </div>
              <h3 className="mt-5 text-base font-extrabold text-[#211329]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#75687e]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PartnerSection() {
  return (
    <section className="bg-[#210747] px-5 py-14 text-white sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-9 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#f4c85d]">For partners</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Grow your event business with Sambramo.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            The partner experience is designed around real event work: discover relevant opportunities, review job details, respond, manage upcoming work and keep track of earnings.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['More bookings', Users],
              ['Reach new customers', MapPin],
              ['Get paid securely', PackageCheck],
              ['Build your brand', Sparkles],
            ].map(([title, Icon]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <Icon size={18} className="text-[#f4c85d]" />
                <p className="mt-3 text-xs font-extrabold">{title}</p>
              </div>
            ))}
          </div>
          <LaunchButton className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#f4c85d] px-5 py-3 text-sm font-extrabold text-[#1d0b30]">Join as a Partner <ArrowRight size={15} /></LaunchButton>
        </div>
        <div className="rounded-[28px] bg-white p-5 text-[#211329] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#eee6f2] pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#8a7895]">SAMBRAMO PARTNER</p>
              <p className="mt-1 text-lg font-black">Opportunities</p>
            </div>
            <span className="rounded-full bg-[#e9f7ee] px-2.5 py-1 text-[9px] font-extrabold text-[#257342]">Online</span>
          </div>
          <div className="mt-4 rounded-2xl bg-[#f7f2fa] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#e8d9f5] px-2 py-1 text-[9px] font-extrabold text-[#5c3480]">NEW</span>
                <p className="mt-3 text-sm font-black">Wedding Catering</p>
                <p className="mt-1 text-xs text-[#776b7d]">Bengaluru • 500 guests</p>
              </div>
              <span className="text-xs font-black text-[#2a085c]">₹35,700</span>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="flex-1 rounded-xl border border-[#dcd0e3] py-2 text-center text-[10px] font-bold">Decline</span>
              <span className="flex-1 rounded-xl bg-[#2a085c] py-2 text-center text-[10px] font-bold text-white">Accept Job</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {['New jobs', 'Responded', 'Confirmed'].map((x, i) => (
              <div key={x} className="rounded-xl border border-[#eee6f2] p-3">
                <p className="text-base font-black text-[#2a085c]">{[6,2,1][i]}</p>
                <p className="mt-1 text-[9px] text-[#81738b]">{x}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-8 rounded-[28px] bg-[#f7f2fa] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#7950a7]">Bengaluru</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-[#211329] sm:text-4xl">Celebrations are better when the moving parts connect.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6c6072]">Sambramo is preparing the platform for launch. Customer and partner access will open soon.</p>
        </div>
        <LaunchButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2a085c] px-6 py-3.5 text-sm font-extrabold text-white">Launching Soon <ArrowRight size={16} /></LaunchButton>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-[#18052f] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-sm text-xs leading-6 text-white/50">YOUR EVENT. OUR DELIVERY.</p>
          <p className="mt-4 flex items-center gap-2 text-xs text-white/50"><MapPin size={14} /> Bengaluru, Karnataka, India</p>
        </div>
        <div>
          <p className="text-xs font-extrabold text-white">Quick Links</p>
          <div className="mt-4 space-y-2 text-xs text-white/55">
            {['#services', '#how-it-works', '#about', '#partners', '#bengaluru', '#contact'].map(x => <a key={x} href={x} className="block hover:text-white">{x.slice(1).replaceAll('-', ' ')}</a>)}
          </div>
        </div>
        <div>
          <p className="text-xs font-extrabold text-white">For Customers</p>
          <LaunchButton className="mt-4 text-left text-xs text-white/55 hover:text-white">Open Customer App</LaunchButton>
          <p className="mt-5 text-xs font-extrabold text-white">For Partners</p>
          <LaunchButton className="mt-3 text-left text-xs text-white/55 hover:text-white">Partner With Sambramo</LaunchButton>
        </div>
        <div>
          <p className="text-xs font-extrabold text-white">Our Start</p>
          <p className="mt-4 text-xs leading-6 text-white/50">Bengaluru first.<br />Built around events, partners and logistics.</p>
        </div>
      </div>
      <div className="mx-auto mt-9 flex max-w-[1440px] flex-col gap-2 border-t border-white/10 pt-5 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Sambramo. All rights reserved.</span>
        <span className="text-[#f4c85d]">Celebrations are better, together.</span>
      </div>
    </footer>
  )
}

export default function PublicSite() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#211329]">
      <PublicNav />
      <main>
        <Hero />
        <FeatureStrip />
        <StorySection />
        <ServicesSection />
        <HowItWorks />
        <BengaluruSection />
        <AboutSection />
        <PartnerSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
