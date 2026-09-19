import { useEffect } from 'react'
import { ArrowRight, Check, Clock3, MapPin, PackageCheck, Sparkles, Users, Truck, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const SERVICES = [
  ['Venue & setup', 'Venues, seating, stage and event-ready setup'],
  ['Food & catering', 'Catering, cooks, serving teams and event food'],
  ['Decoration', 'Themes, flowers, backdrops, lighting and decor'],
  ['Photography & video', 'Photography, videography and event coverage'],
  ['Music & entertainment', 'DJ, sound, anchors and entertainment support'],
  ['Transport & logistics', 'People, supplies and event-day movement'],
  ['Gifts & essentials', 'Cakes, flowers, gifts, pooja and party essentials'],
  ['Event support', 'Coordination, delivery, setup and on-ground assistance'],
]

const STEPS = [
  ['01', 'Tell us what you are celebrating', 'Share the occasion, date, guest count, location and what you need.'],
  ['02', 'We assemble the event', 'Sambramo coordinates the services and event partners needed for your occasion.'],
  ['03', 'Review and confirm', 'See the plan, make changes and confirm when everything looks right.'],
  ['04', 'We deliver the day', 'Partners prepare, travel, set up and execute while the event comes together.'],
]

const EVENT_TYPES = ['Birthdays', 'Weddings & functions', 'Engagements', 'House functions', 'Baby showers', 'Anniversaries']

function Brand() {
  return (
    <Link to="/" className="shrink-0" aria-label="Sambramo home">
      <span className="block text-[19px] font-black tracking-[0.12em] text-white">SAMBRAMO</span>
      <span className="hidden text-[7px] font-semibold tracking-[0.19em] text-white/65 sm:block">EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </Link>
  )
}

function PublicNav() {
  const { pathname } = useLocation()
  const links = [
    ['/#services', 'Services'],
    ['/#how-it-works', 'How it works'],
    ['/#about', 'About'],
    ['/#partners', 'Partners'],
  ]
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#190537]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className={`text-sm font-semibold transition ${pathname === to ? 'text-white' : 'text-white/65 hover:text-white'}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <Link to="/login" className="hidden rounded-full px-4 py-2.5 text-sm font-bold text-white/75 hover:text-white sm:block">Sign in</Link>
          <Link to="/app" className="group flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-[#26063f] shadow-lg shadow-black/20 transition hover:-translate-y-0.5">
            Open Sambramo <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#1b053b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(167,91,255,.28),transparent_32%),radial-gradient(circle_at_15%_65%,rgba(255,196,77,.11),transparent_28%)]" />
      <div className="absolute -right-28 top-24 h-80 w-80 rounded-full border border-white/10 bg-white/[0.025] blur-[1px]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-bold tracking-wide text-white/80">
            <MapPin size={13} /> Bengaluru, Karnataka
          </div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-[#d7b4ff]">EVENT SUPPLY CHAIN &amp; LOGISTICS</p>
          <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            YOUR EVENT.<br />
            <span className="text-[#d9b8ff]">OUR DELIVERY.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/70 sm:text-xl">
            From the first requirement to event-day setup, Sambramo brings the people, services and movement behind a celebration together in one coordinated experience.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/app" className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-[#26063f] shadow-xl shadow-black/20 transition hover:-translate-y-0.5">
              Explore Sambramo <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </Link>
            <Link to="/how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-xs text-white/45">Currently serving Bengaluru only.</p>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="rounded-[32px] border border-white/15 bg-white/[0.07] p-3 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="overflow-hidden rounded-[25px] bg-[#f7f2fb]">
              <div className="flex items-center justify-between bg-[#2a085c] px-5 py-4 text-white">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">SAMBRAMO</p>
                  <p className="mt-1 text-sm font-extrabold">Your celebration, coordinated</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><Sparkles size={16} /></div>
              </div>
              <div className="space-y-3 p-5">
                {[
                  ['Birthday celebration', '100 guests', 'Planning'],
                  ['Venue + decoration', 'Bengaluru', 'Matched'],
                  ['Catering + photography', 'Event day', 'Coordinating'],
                ].map(([a,b,c], i) => (
                  <div key={a} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(42,8,92,.08)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0e6fb] text-[#2a085c]">
                      {i === 0 ? <Users size={18} /> : i === 1 ? <Sparkles size={18} /> : <Truck size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#24152f]">{a}</p>
                      <p className="mt-0.5 text-xs text-[#76677f]">{b}</p>
                    </div>
                    <span className="rounded-full bg-[#eee3f8] px-2.5 py-1 text-[9px] font-extrabold text-[#4a2670]">{c}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 rounded-2xl bg-[#2a085c] p-4 text-white">
                  <PackageCheck size={19} />
                  <div className="flex-1">
                    <p className="text-xs font-extrabold">One coordinated event flow</p>
                    <p className="mt-0.5 text-[10px] text-white/60">People · services · supplies · movement</p>
                  </div>
                  <Check size={18} className="text-[#f4c85d]" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white/15 bg-[#2a085c]/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
            <p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/45">PILOT CITY</p>
            <p className="mt-1 text-sm font-extrabold">Bengaluru</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section id="services" className="bg-[#faf8fc] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#7950a7]">What we coordinate</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-[#211329] sm:text-5xl">The services behind the celebration.</h2>
          <p className="mt-5 text-base leading-7 text-[#6c6072]">Sambramo is built around the work that has to happen before, during and around an event — not just a list of vendors.</p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(([title, sub]) => (
            <div key={title} className="group rounded-3xl border border-[#e9e1ef] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#2a085c]/[.07]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0e6fb] text-[#2a085c]"><Check size={18} /></div>
              <h3 className="mt-5 text-base font-extrabold text-[#211329]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#776b7d]">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowSection() {
  return (
    <section id="how-it-works" className="bg-white px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#7950a7]">How it works</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-[#211329] sm:text-5xl">One event. One coordinated flow.</h2>
          <p className="mt-5 text-base leading-7 text-[#6c6072]">The goal is simple: reduce the number of separate calls, messages and moving pieces the customer has to manage.</p>
          <div className="mt-8 rounded-3xl bg-[#2a085c] p-6 text-white">
            <ShieldCheck size={22} />
            <p className="mt-4 text-base font-bold">Human coordination where it matters.</p>
            <p className="mt-2 text-sm leading-6 text-white/60">Sambramo connects the digital planning flow with people who actually prepare, move and execute the event.</p>
          </div>
        </div>
        <div className="space-y-3">
          {STEPS.map(([num, title, text]) => (
            <div key={num} className="flex gap-5 rounded-3xl border border-[#e9e1ef] bg-[#fbf9fd] p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2a085c] text-xs font-black text-white">{num}</span>
              <div>
                <h3 className="text-lg font-extrabold text-[#211329]">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#776b7d]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="bg-[#f4eff8] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#7950a7]">About Sambramo</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-[#211329] sm:text-5xl">Event supply chain, made visible.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#66596e]">
              A celebration depends on a chain of people and supplies: a venue, food, decoration, equipment, transport, setup and the teams who make each piece happen. Sambramo is being built to coordinate that chain from one place.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#66596e]">
              We are starting in Bengaluru and building the operating layer around real event work — so customers can focus on the occasion instead of chasing every moving part.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {EVENT_TYPES.map(x => <span key={x} className="rounded-full border border-[#d9cce3] bg-white px-3.5 py-2 text-xs font-bold text-[#4c3a58]">{x}</span>)}
            </div>
          </div>
          <div className="rounded-[32px] bg-[#2a085c] p-7 text-white shadow-2xl shadow-[#2a085c]/20">
            <Clock3 size={24} />
            <p className="mt-8 text-2xl font-black leading-tight">From requirement to event day.</p>
            <div className="mt-7 space-y-4 text-sm">
              {['Planning and coordination', 'Service and partner matching', 'Preparation and movement', 'Venue setup and execution'].map(x => (
                <div key={x} className="flex items-center gap-3 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <Check size={15} className="text-[#f4c85d]" /> <span className="text-white/75">{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnerSection() {
  return (
    <section id="partners" className="bg-[#190537] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_.9fr] lg:items-center">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#c9a8ee]">For event partners</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-5xl">Bring your trade into the Sambramo network.</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/60">If you already operate in events — catering, decor, photography, transport, entertainment, rentals or other event services — Sambramo is building a structured way to receive and execute relevant work.</p>
          <Link to="/onboarding/vendor" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-[#26063f]">Partner with Sambramo <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['Receive relevant requests', Users], ['Manage event work', PackageCheck], ['Prepare & dispatch', Truck], ['Track execution', Check]].map(([x, Icon]) => (
            <div key={x} className="rounded-3xl border border-white/10 bg-white/[.06] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#d9b8ff]"><Icon size={17} /></div>
              <p className="mt-4 text-sm font-extrabold">{x}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="bg-white px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl rounded-[32px] bg-[#f3edf8] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:p-12">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#7950a7]">Bengaluru</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-[#211329]">Building the event network, one celebration at a time.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6c6072]">For customer support, partnership enquiries or general questions, reach Sambramo through the channels available in the app.</p>
        </div>
        <Link to="/app" className="mt-7 inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#2a085c] px-6 py-3.5 text-sm font-extrabold text-white lg:mt-0">Explore the platform <ArrowRight size={16} /></Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#120227] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-xs leading-6 text-white/45">You Pick the Occasion. We Deliver the Celebration.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/50">
          <Link to="/#services" className="hover:text-white">Services</Link>
          <Link to="/#how-it-works" className="hover:text-white">How it works</Link>
          <Link to="/#about" className="hover:text-white">About</Link>
          <Link to="/#partners" className="hover:text-white">Partners</Link>
          <Link to="/app" className="hover:text-white">Platform</Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-[11px] text-white/35">© {new Date().getFullYear()} Sambramo. Bengaluru, India.</div>
    </footer>
  )
}

export default function PublicSite() {
  const { pathname } = useLocation()
  const section = pathname === '/services' ? 'services' : pathname === '/how-it-works' ? 'how-it-works' : pathname === '/about' ? 'about' : pathname === '/partners' ? 'partners' : pathname === '/contact' ? 'contact' : null

  return (
    <div className="min-h-screen bg-white font-sans text-[#211329]">
      <PublicNav />
      <main>
        <Hero />
        <ServicesSection />
        <HowSection />
        <AboutSection />
        <PartnerSection />
        <ContactSection />
      </main>
      <Footer />
      {section && <ScrollToSection id={section} />}
    </div>
  )
}

function ScrollToSection({ id }) {
  // Route-specific landing pages retain crawlable URLs while still presenting
  // one coherent public site. Scrolling is delayed until the section exists.
  useEffect(() => {
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    return () => window.clearTimeout(timer)
  }, [id])
  return null
}
