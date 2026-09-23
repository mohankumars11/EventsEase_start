import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ChevronRight, Search, Menu, X, Play, ShieldCheck,
  Truck, PackageCheck, Users, CreditCard, Route, CheckCircle2,
  Sparkles, CalendarDays, MapPin, Star, Instagram, Linkedin,
  Youtube, MessageCircle
} from 'lucide-react'

const BRAND = 'SAMBRAMO'
const TAGLINE = 'Event Supply Chain and Logistics'

const EVENT_TYPES = [
  ['Wedding', 'Planning, decor, food, photography and movement.', '💍'],
  ['Corporate', 'Venues, production, catering and coordinated logistics.', '🏢'],
  ['Birthday', 'Make every detail feel effortless.', '🎂'],
  ['Social Events', 'Bring people, services and moments together.', '🎉'],
  ['Religious', 'Rituals, essentials and event-day coordination.', '🪔'],
  ['Logistics', 'Move supplies and materials where they belong.', '🚚'],
  ['Supplies', 'Connect the products and people behind the event.', '📦'],
  ['All Services', 'Explore the full SAMBRAMO ecosystem.', '✦'],
]

const SERVICES = [
  ['Venue & Spaces', 'Find the right place.', '🏛️'],
  ['Decoration', 'Stages, flowers and styling.', '🎨'],
  ['Food & Catering', 'Menus, cakes and live counters.', '🍽️'],
  ['Photography', 'Photo, video and memories.', '📸'],
  ['Entertainment', 'Music, DJ, anchors and acts.', '🎵'],
  ['Beauty & Rituals', 'Makeup, mehendi and ceremonies.', '✨'],
  ['Rentals', 'Furniture, sound and lighting.', '🪑'],
  ['Gifts & Essentials', 'Invites, gifts and event essentials.', '🎁'],
]

const SEARCH_ITEMS = [...EVENT_TYPES, ...SERVICES].map(([title, description, icon]) => ({
  title, description, icon
}))

const workflow = [
  ['01', 'You Plan', 'Tell us what you need.', 'You start with the occasion, location and requirements.', CalendarDays],
  ['02', 'We Connect', 'Verified service providers.', 'SAMBRAMO brings the right people into one event flow.', Users],
  ['03', 'Suppliers Prepare', 'Materials and essentials.', 'The supply side gets connected to what the event needs.', PackageCheck],
  ['04', 'Logistics Moves', 'On-time and tracked.', 'Movement from supplier to venue becomes part of the same flow.', Truck],
  ['05', 'Your Event Happens', 'Beautifully, stress-free.', 'Everything comes together so people can focus on the moment.', CheckCircle2],
]

function Reveal({ children, className = '', delay = 0 }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const node = document.querySelector('[data-reveal="' + Math.random() + '"]')
    return () => node?.remove()
  }, [])
  return (
    <div
      className={'sam-reveal ' + (show ? 'sam-reveal-in ' : '') + className}
      style={{ animationDelay: delay + 'ms' }}
      ref={(node) => {
        if (!node || show) return
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            setShow(true)
            observer.disconnect()
          }
        }, { threshold: 0.08 })
        observer.observe(node)
      }}
    >
      {children}
    </div>
  )
}

function AppHandoff({ open, onClose }) {
  if (!open) return null
  const roles = [
    ['Customer', 'Discover and plan your event.'],
    ['Event Provider', 'Connect your service to events.'],
    ['Logistics Partner', 'Move supplies and coordinate venue entry.'],
    ['Supplier', 'Connect inventory to the event supply chain.'],
  ]
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/15 bg-[#160522] text-white shadow-[0_30px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">SAMBRAMO</p>
            <h3 className="mt-1 text-xl font-black">Choose your experience</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/10" aria-label="Close"><X size={19} /></button>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
          {roles.map(([title, desc]) => (
            <button key={title} onClick={onClose} className="rounded-2xl border border-white/10 bg-white/[.045] p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-white/[.08]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200"><Users size={18}/></div>
              <p className="mt-3 font-extrabold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-white/50">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-violet-300">Continue <ArrowRight size={13}/></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryRail({ onSelect }) {
  return (
    <div className="sam-category-shell">
      <div className="sam-category-rail">
        {EVENT_TYPES.map(([title, , icon]) => (
          <button key={title} onClick={() => onSelect('events')} className="sam-category-card">
            <span className="sam-category-icon">{icon}</span>
            <span>{title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function HeroConnection() {
  return (
    <div className="sam-hero-visual">
      <div className="sam-hero-photo" />
      <div className="sam-photo-overlay" />
      <div className="sam-hero-note">
        <span className="sam-script">Make<br/>Moments<br/>Happen</span>
        <button className="sam-story-button"><Play size={13} fill="currentColor" /> Watch our story</button>
      </div>
      <div className="sam-connection-chip">
        <span className="sam-pulse" />
        <span><b>Connected</b><small>Customer → Provider → Supply → Logistics</small></span>
      </div>
    </div>
  )
}

function LiveFlow() {
  return (
    <div className="sam-live-flow">
      <div className="sam-live-line" />
      {[
        ['Customer', 'Search', Users],
        ['Provider', 'Connect', Sparkles],
        ['Supplier', 'Prepare', PackageCheck],
        ['Logistics', 'Move', Truck],
      ].map(([name, status, Icon]) => (
        <div className="sam-live-node" key={name}>
          <div className="sam-live-icon"><Icon size={17}/></div>
          <div className="sam-live-name">{name}</div>
          <div className="sam-live-status"><span />{status}</div>
        </div>
      ))}
    </div>
  )
}

export default function SumramoProductHome() {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [handoff, setHandoff] = useState(false)

  const recommendations = useMemo(() => {
    if (query.trim().length < 2) return []
    return SEARCH_ITEMS
      .filter(item => (item.title + ' ' + item.description).toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
  }, [query])

  const scrollTo = (id) => {
    setMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sambramo-site">
      <header className="sam-site-header">
        <div className="sam-header-inner">
          <button className="sam-wordmark" onClick={() => scrollTo('top')} aria-label="SAMBRAMO home">
            <span>{BRAND}</span>
          </button>

          <nav className="sam-desktop-nav" aria-label="Primary navigation">
            {[
              ['Home', 'top'], ['Services', 'services'], ['How it works', 'how-it-works'],
              ['For Partners', 'partners'], ['About', 'about']
            ].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}>{label}</button>
            ))}
          </nav>

          <div className="sam-header-actions">
            <button className="sam-search-trigger" onClick={() => scrollTo('search')} aria-label="Search"><Search size={18}/></button>
            <button className="sam-primary small" onClick={() => setHandoff(true)}>Get Started</button>
            <button className="sam-mobile-menu" onClick={() => setMenu(value => !value)} aria-label={menu ? 'Close menu' : 'Open menu'}>
              {menu ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {menu && (
          <div className="sam-mobile-nav">
            {[
              ['Home', 'top'], ['Services', 'services'], ['How it works', 'how-it-works'],
              ['For Partners', 'partners'], ['About', 'about']
            ].map(([label, id]) => <button key={id} onClick={() => scrollTo(id)}>{label}<ChevronRight size={16}/></button>)}
            <button className="sam-primary" onClick={() => { setMenu(false); setHandoff(true) }}>Get Started <ArrowRight size={16}/></button>
          </div>
        )}
      </header>

      <main id="top">
        <section className="sam-hero">
          <div className="sam-hero-bg" />
          <div className="sam-container sam-hero-grid">
            <div className="sam-hero-copy">
              <div className="sam-eyebrow"><span>✦</span> INDIA'S CONNECTED EVENT ECOSYSTEM</div>
              <h1>Events should<br/>feel <em>connected.</em></h1>
              <p className="sam-hero-sub">One platform. Real people. Seamless execution.</p>
              <p className="sam-hero-body">From services to supplies to logistics — SAMBRAMO connects everything that makes your event happen.</p>

              <div className="sam-search-wrap" id="search">
                <Search size={18} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search for services (e.g. wedding, catering, logistics...)" aria-label="Search services" />
                <button onClick={() => setHandoff(true)} aria-label="Explore"><ArrowRight size={18}/></button>
                {recommendations.length > 0 && (
                  <div className="sam-search-results">
                    {recommendations.map(item => (
                      <button key={item.title} onClick={() => { setQuery(item.title); scrollTo('events') }}>
                        <span>{item.icon}</span>
                        <span><b>{item.title}</b><small>{item.description}</small></span>
                        <ChevronRight size={15}/>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sam-trust-row">
                {[
                  [ShieldCheck, 'Verified Partners'],
                  [CreditCard, 'Secure Payments'],
                  [Route, 'Real-time Tracking'],
                  [CheckCircle2, 'End-to-End Support']
                ].map(([Icon, label]) => <div key={label}><Icon size={16}/><span>{label}</span></div>)}
              </div>
            </div>
            <HeroConnection />
          </div>
        </section>

        <section className="sam-category-section">
          <div className="sam-container">
            <CategoryRail onSelect={scrollTo} />
          </div>
        </section>

        <section id="how-it-works" className="sam-section sam-white">
          <div className="sam-container">
            <div className="sam-section-heading">
              <div>
                <p className="sam-overline">HOW SAMBRAMO CONNECTS</p>
                <h2>How SAMBRAMO<br/>connects your event <span>→</span></h2>
              </div>
              <p>Different people. A common purpose.<br/>Everything moves together.</p>
            </div>

            <div className="sam-workflow">
              {workflow.map(([number, title, subtitle, desc, Icon], index) => (
                <Reveal key={number}>
                  <article className="sam-workflow-card">
                    <div className="sam-workflow-image" style={{ backgroundImage: 'url(' + [
                      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=82',
                      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=82',
                      'https://images.unsplash.com/photo-1540317580384-e5d43867c8c4?auto=format&fit=crop&w=800&q=82',
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=82',
                      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=82'
                    ][index] + ')' }}>
                      <span>{number}</span>
                    </div>
                    <div className="sam-workflow-content">
                      <div className="sam-workflow-icon"><Icon size={16}/></div>
                      <div><h3>{title}</h3><p>{subtitle}</p><small>{desc}</small></div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="sam-connected-strip">
              <span>YOU PLAN</span><i>→</i><span>WE CONNECT</span><i>→</i><span>SUPPLIERS PREPARE</span><i>→</i><span>LOGISTICS MOVES</span><i>→</i><strong>YOUR EVENT HAPPENS</strong>
            </div>
          </div>
        </section>

        <section id="services" className="sam-section sam-soft">
          <div className="sam-container">
            <div className="sam-section-heading">
              <div><p className="sam-overline">ONE CONNECTED LAYER</p><h2>Everything your event needs.</h2></div>
              <p>Discover the services, people, products and movement around your event.</p>
            </div>
            <div className="sam-service-grid">
              {SERVICES.map(([title, desc, icon]) => (
                <button key={title} className="sam-service-card" onClick={() => setHandoff(true)}>
                  <span className="sam-service-icon">{icon}</span>
                  <span><b>{title}</b><small>{desc}</small></span>
                  <ChevronRight size={16}/>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="sam-section sam-white">
          <div className="sam-container sam-supply-grid">
            <Reveal>
              <div className="sam-supply-copy">
                <p className="sam-overline">EVENT SUPPLY CHAIN</p>
                <h2>The event is bigger than the booking.</h2>
                <p>Behind every beautiful event is a chain of people, materials, services and movement. SAMBRAMO brings that chain into one connected experience.</p>
                <div className="sam-supply-points">
                  {[
                    ['Source', 'Connect the right suppliers and service requirements.'],
                    ['Prepare', 'Make materials, services and schedules visible.'],
                    ['Move', 'Coordinate logistics from source to venue.'],
                    ['Arrive', 'Turn venue entry into a clear operational step.']
                  ].map(([title, desc], i) => <div key={title}><span>0{i + 1}</span><div><b>{title}</b><small>{desc}</small></div></div>)}
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="sam-supply-visual">
                <div className="sam-supply-header"><span className="sam-live-dot"/> SUPPLY CHAIN VIEW <span>CONNECTED</span></div>
                <div className="sam-supply-map">
                  <div className="sam-route-line" />
                  <div className="sam-map-node supplier"><PackageCheck size={18}/><b>Supplier</b><small>Ready</small></div>
                  <div className="sam-map-node moving"><Truck size={18}/><b>Logistics</b><small>In transit</small></div>
                  <div className="sam-map-node venue"><MapPin size={18}/><b>Venue</b><small>Arriving</small></div>
                </div>
                <LiveFlow />
                <p className="sam-visual-note">Product visualization. Live GPS and operational status will connect inside the SAMBRAMO apps.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="sam-section sam-dark-feature">
          <div className="sam-container sam-feature-grid">
            <div className="sam-feature-image" />
            <div className="sam-feature-copy">
              <p className="sam-overline">MORE THAN A BOOKING PLATFORM</p>
              <h2>Not just a booking platform,<br/><em>a complete event ecosystem.</em></h2>
              <p>SAMBRAMO brings together services, suppliers, logistics and people — so you can focus on what truly matters.</p>
              <button className="sam-primary" onClick={() => setHandoff(true)}>Explore SAMBRAMO <ArrowRight size={17}/></button>
              <div className="sam-status-card"><span className="sam-status-check">✓</span><div><b>Everything connected</b><small>Track · Coordinate · Celebrate</small></div></div>
            </div>
          </div>
        </section>

        <section className="sam-section sam-soft">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">WHY SAMBRAMO</p><h2>Built for the way events actually happen.</h2></div><p>One connected product experience instead of scattered conversations.</p></div>
            <div className="sam-benefits">
              {[
                [ShieldCheck, 'Verified & Trusted', 'Quality partners, always.'],
                [Truck, 'Real-time Logistics', 'Track supplies and movement.'],
                [Sparkles, 'All in One Platform', 'Services, suppliers, logistics.'],
                [CreditCard, 'Hassle-Free Payments', 'Secure and transparent.']
              ].map(([Icon, title, desc]) => <div key={title}><span><Icon size={19}/></span><b>{title}</b><small>{desc}</small></div>)}
            </div>
          </div>
        </section>

        <section id="events" className="sam-section sam-white">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">REAL OCCASIONS</p><h2>Whatever the occasion,<br/>the connection stays the same.</h2></div><p>Choose the occasion. SAMBRAMO connects the service layer around it.</p></div>
            <div className="sam-events-grid">
              {EVENT_TYPES.map(([title, desc, icon], index) => <button key={title} onClick={() => setHandoff(true)} className="sam-event-card"><span className="sam-event-icon">{icon}</span><small>0{index + 1}</small><b>{title}</b><p>{desc}</p><span className="sam-event-arrow">Explore <ArrowRight size={13}/></span></button>)}
            </div>
          </div>
        </section>

        <section className="sam-section sam-testimonials">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">REAL EVENTS. REAL HAPPINESS.</p><h2>Made for people who make moments.</h2></div></div>
            <div className="sam-testimonial-grid">
              {[
                ['“SAMBRAMO made our wedding so much easier. Everything arrived on time.”', 'Priya & Karthik', 'Bengaluru · Wedding'],
                ['“The logistics tracking was a game changer for our corporate event.”', 'Rahul Mehta', 'Bengaluru · Corporate Event'],
                ['“All our suppliers were coordinated perfectly. Highly recommended.”', 'Ananya Sharma', 'Mysuru · Birthday Event']
              ].map(([quote, name, meta]) => <article key={name}><div className="sam-stars">{[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor"/>)}</div><p>{quote}</p><div className="sam-avatar">{name[0]}</div><b>{name}</b><small>{meta}</small></article>)}
            </div>
          </div>
        </section>

        <section id="about" className="sam-final-cta">
          <div className="sam-container">
            <div><p className="sam-overline">READY WHEN YOU ARE</p><h2>Ready to plan your next event?</h2><p>Discover. Connect. Move. Complete.</p></div>
            <button className="sam-primary light" onClick={() => setHandoff(true)}>Get Started <ArrowRight size={17}/></button>
          </div>
        </section>
      </main>

      <footer className="sam-footer">
        <div className="sam-container sam-footer-grid">
          <div><p className="sam-footer-logo">SAMBRAMO</p><p className="sam-footer-tag">{TAGLINE}</p><p className="sam-footer-copy">The connected event ecosystem for people, services, supplies and movement.</p></div>
          <div><b>Product</b><button onClick={() => scrollTo('services')}>Services</button><button onClick={() => scrollTo('partners')}>Supply Chain</button><button onClick={() => scrollTo('partners')}>Logistics</button><button onClick={() => scrollTo('how-it-works')}>How it works</button></div>
          <div><b>Company</b><button onClick={() => scrollTo('about')}>About us</button><button onClick={() => setHandoff(true)}>For Partners</button><button onClick={() => setHandoff(true)}>Contact</button></div>
          <div><b>Follow us</b><div className="sam-socials"><button aria-label="Instagram"><Instagram size={17}/></button><button aria-label="LinkedIn"><Linkedin size={17}/></button><button aria-label="YouTube"><Youtube size={17}/></button><button aria-label="WhatsApp"><MessageCircle size={17}/></button></div></div>
        </div>
        <div className="sam-container sam-footer-bottom"><span>© {new Date().getFullYear()} SAMBRAMO. All rights reserved.</span><span>Made for people who make moments.</span></div>
      </footer>

      <AppHandoff open={handoff} onClose={() => setHandoff(false)} />

      <style>{`
        :root { color-scheme: dark; }
        html { scroll-behavior: smooth; scroll-padding-top: 82px; }
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; overflow-x: hidden; }
        button, input { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        .sambramo-site { min-height: 100vh; overflow: hidden; background: #210638; color: #fff; font-family: Manrope, Inter, system-ui, sans-serif; }
        .sam-container { width: min(100% - 48px, 1280px); margin-inline: auto; }
        .sam-site-header { position: sticky; top: 0; z-index: 60; background: rgba(14,3,28,.88); border-bottom: 1px solid rgba(255,255,255,.08); backdrop-filter: blur(22px); }
        .sam-header-inner { width: min(100% - 48px, 1280px); min-height: 72px; margin-inline: auto; display:flex; align-items:center; justify-content:space-between; gap:24px; }
        .sam-wordmark { border:0; background:none; color:#fff; padding:0; cursor:pointer; font-size:18px; font-weight:900; letter-spacing:.24em; }
        .sam-desktop-nav { display:flex; align-items:center; gap:8px; }
        .sam-desktop-nav button, .sam-header-actions button { border:0; background:transparent; color:rgba(255,255,255,.72); cursor:pointer; }
        .sam-desktop-nav button { padding:10px 13px; border-radius:12px; font-size:12px; font-weight:700; }
        .sam-desktop-nav button:hover { background:rgba(255,255,255,.07); color:#fff; }
        .sam-header-actions { display:flex; align-items:center; gap:8px; }
        .sam-search-trigger { width:40px; height:40px; display:grid; place-items:center; border-radius:12px; }
        .sam-primary { display:inline-flex; align-items:center; justify-content:center; gap:9px; border:0; border-radius:14px; padding:13px 19px; background:linear-gradient(135deg,#8b3dff,#6d28d9); color:#fff; font-size:12px; font-weight:900; cursor:pointer; box-shadow:0 10px 30px rgba(124,58,237,.32); transition:.2s ease; }
        .sam-primary:hover { transform:translateY(-2px); box-shadow:0 16px 36px rgba(124,58,237,.42); }
        .sam-primary.small { padding:11px 17px; }
        .sam-primary.light { background:#fff; color:#42105e; box-shadow:none; }
        .sam-mobile-menu { display:none; width:42px; height:42px; border:1px solid rgba(255,255,255,.1)!important; border-radius:12px; background:rgba(255,255,255,.06)!important; color:#fff!important; }
        .sam-mobile-nav { display:none; }
        .sam-hero { position:relative; min-height:660px; overflow:hidden; }
        .sam-hero-bg { position:absolute; inset:0; background:radial-gradient(circle at 70% 28%,rgba(155,89,255,.26),transparent 28%),linear-gradient(120deg,#10021e 0%,#210638 46%,#2d0a4b 100%); }
        .sam-hero-grid { position:relative; min-height:660px; display:grid; grid-template-columns:1fr .92fr; align-items:center; gap:48px; padding-block:58px; }
        .sam-hero-copy { max-width:680px; }
        .sam-eyebrow { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid rgba(255,255,255,.1); border-radius:999px; background:rgba(255,255,255,.05); color:#ddd0ff; font-size:9px; font-weight:900; letter-spacing:.1em; }
        .sam-hero h1 { margin:20px 0 0; font-size:clamp(48px,6.2vw,88px); line-height:.94; letter-spacing:-.06em; font-weight:900; }
        .sam-hero h1 em { color:#a66bff; font-style:normal; text-shadow:0 0 40px rgba(166,107,255,.22); }
        .sam-hero-sub { margin:20px 0 0; font-size:18px; font-weight:800; }
        .sam-hero-body { max-width:570px; margin:10px 0 0; color:rgba(255,255,255,.58); font-size:13px; line-height:1.75; }
        .sam-search-wrap { position:relative; display:flex; align-items:center; gap:10px; width:min(100%,590px); margin-top:26px; padding:7px 8px 7px 15px; border-radius:18px; background:#fff; color:#899; box-shadow:0 20px 60px rgba(0,0,0,.28); }
        .sam-search-wrap > svg { flex:none; color:#64748b; }
        .sam-search-wrap input { min-width:0; flex:1; border:0; outline:0; color:#111827; font-size:12px; background:transparent; }
        .sam-search-wrap > button { width:42px; height:42px; flex:none; display:grid; place-items:center; border:0; border-radius:13px; color:#fff; background:#7132e8; cursor:pointer; }
        .sam-search-results { position:absolute; left:0; right:0; top:calc(100% + 8px); z-index:20; padding:7px; border:1px solid #e5e7eb; border-radius:18px; background:#fff; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .sam-search-results button { width:100%; display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center; padding:10px; border:0; border-radius:12px; background:#fff; text-align:left; color:#111827; cursor:pointer; }
        .sam-search-results button:hover { background:#f7f3ff; }
        .sam-search-results b, .sam-search-results small { display:block; }
        .sam-search-results b { font-size:12px; }.sam-search-results small { margin-top:2px; color:#64748b; font-size:10px; }
        .sam-trust-row { display:grid; grid-template-columns:repeat(4,auto); gap:18px; margin-top:25px; }
        .sam-trust-row div { display:flex; align-items:center; gap:7px; color:rgba(255,255,255,.62); font-size:9px; font-weight:800; }
        .sam-trust-row svg { color:#c29cff; }
        .sam-hero-visual { position:relative; min-height:530px; overflow:hidden; border-radius:32px; border:1px solid rgba(255,255,255,.12); background:#12051d; box-shadow:0 30px 100px rgba(0,0,0,.35); }
        .sam-hero-photo { position:absolute; inset:0; background:url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=88') center/cover; transform:scale(1.03); }
        .sam-photo-overlay { position:absolute; inset:0; background:linear-gradient(180deg,rgba(24,4,39,.12),rgba(24,4,39,.78)),linear-gradient(90deg,rgba(18,5,29,.55),transparent 55%); }
        .sam-hero-note { position:absolute; right:10%; bottom:11%; display:flex; flex-direction:column; align-items:flex-start; gap:17px; }
        .sam-script { font-family:'Playfair Display',serif; font-style:italic; font-size:42px; line-height:.9; color:#fff; text-shadow:0 4px 30px rgba(0,0,0,.45); }
        .sam-story-button { display:flex; align-items:center; gap:8px; border:0; background:transparent; color:#fff; font-size:10px; font-weight:800; cursor:pointer; }
        .sam-story-button svg { padding:7px; width:30px; height:30px; border-radius:50%; background:#fff; color:#43136a; }
        .sam-connection-chip { position:absolute; left:22px; bottom:22px; display:flex; align-items:center; gap:10px; max-width:80%; padding:11px 14px; border:1px solid rgba(255,255,255,.12); border-radius:15px; background:rgba(20,4,34,.65); backdrop-filter:blur(15px); }
        .sam-pulse { width:8px; height:8px; flex:none; border-radius:50%; background:#6ee7b7; box-shadow:0 0 0 5px rgba(110,231,183,.1); }
        .sam-connection-chip b, .sam-connection-chip small { display:block; }.sam-connection-chip b { font-size:10px; }.sam-connection-chip small { margin-top:2px; color:rgba(255,255,255,.55); font-size:8px; }
        .sam-category-section { padding:0 0 2px; background:#210638; }
        .sam-category-shell { padding:14px; border:1px solid rgba(255,255,255,.08); border-radius:22px; background:rgba(255,255,255,.055); box-shadow:0 18px 55px rgba(0,0,0,.22); }
        .sam-category-rail { display:grid; grid-template-columns:repeat(8,1fr); gap:7px; }
        .sam-category-card { min-width:0; display:flex; flex-direction:column; align-items:center; gap:7px; padding:12px 7px; border:1px solid rgba(255,255,255,.07); border-radius:15px; background:rgba(255,255,255,.035); color:#fff; cursor:pointer; transition:.2s ease; }
        .sam-category-card:hover { background:rgba(255,255,255,.09); transform:translateY(-2px); }
        .sam-category-icon { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; background:linear-gradient(145deg,rgba(139,92,246,.24),rgba(236,72,153,.12)); font-size:17px; }
        .sam-category-card span:last-child { font-size:9px; font-weight:800; white-space:nowrap; }
        .sam-section { padding:86px 0; }
        .sam-white { background:#fff; color:#161022; }
        .sam-soft { background:#f7f4fb; color:#161022; }
        .sam-section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:30px; }
        .sam-overline { margin:0 0 10px; color:#7c3aed; font-size:9px; font-weight:900; letter-spacing:.2em; }
        .sam-section-heading h2 { margin:0; font-size:clamp(32px,4vw,53px); line-height:1; letter-spacing:-.05em; font-weight:900; }
        .sam-section-heading h2 span { color:#7c3aed; font-size:.8em; }
        .sam-section-heading > p { max-width:370px; margin:0; color:#7a7187; font-size:12px; line-height:1.7; }
        .sam-workflow { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-top:36px; }
        .sam-workflow-card { height:100%; overflow:hidden; border:1px solid #e8e2ef; border-radius:19px; background:#fff; box-shadow:0 8px 30px rgba(61,20,91,.06); transition:.25s ease; }
        .sam-workflow-card:hover { transform:translateY(-5px); box-shadow:0 20px 45px rgba(61,20,91,.13); }
        .sam-workflow-image { position:relative; height:145px; background-position:center; background-size:cover; }
        .sam-workflow-image:after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,transparent 35%,rgba(20,5,31,.62)); }
        .sam-workflow-image span { position:absolute; z-index:2; right:10px; top:10px; display:grid; place-items:center; width:27px; height:27px; border-radius:9px; background:rgba(22,5,34,.68); color:#fff; font-size:9px; font-weight:900; backdrop-filter:blur(8px); }
        .sam-workflow-content { display:flex; gap:10px; padding:13px; }
        .sam-workflow-icon { flex:none; display:grid; place-items:center; width:32px; height:32px; border-radius:10px; background:#f1eaff; color:#7132e8; }
        .sam-workflow-content h3 { margin:0; font-size:12px; font-weight:900; }.sam-workflow-content p { margin:2px 0 0; color:#7c3aed; font-size:9px; font-weight:800; }.sam-workflow-content small { display:block; margin-top:6px; color:#7a7187; font-size:9px; line-height:1.45; }
        .sam-connected-strip { display:flex; justify-content:center; align-items:center; gap:14px; flex-wrap:wrap; margin-top:25px; padding:13px 16px; border:1px solid #e7e0ef; border-radius:15px; color:#7c3aed; font-size:8px; font-weight:900; letter-spacing:.12em; }
        .sam-connected-strip i { color:#c5b6d8; font-style:normal; }
        .sam-connected-strip strong { color:#1e1228; }
        .sam-service-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:34px; }
        .sam-service-card { min-width:0; display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:11px; padding:14px; border:1px solid #e8e2ef; border-radius:18px; background:#fff; color:#1e1228; text-align:left; cursor:pointer; transition:.2s ease; }
        .sam-service-card:hover { border-color:#cdb9ee; transform:translateY(-3px); box-shadow:0 15px 35px rgba(75,30,110,.1); }
        .sam-service-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:13px; background:#f0e9ff; font-size:19px; }
        .sam-service-card b, .sam-service-card small { display:block; }.sam-service-card b { font-size:11px; }.sam-service-card small { margin-top:3px; color:#8a8195; font-size:9px; line-height:1.35; }.sam-service-card > svg { color:#9d91aa; }
        .sam-supply-grid { display:grid; grid-template-columns:.9fr 1.1fr; gap:70px; align-items:center; }
        .sam-supply-copy h2 { margin:0; font-size:clamp(35px,4.5vw,58px); line-height:.98; letter-spacing:-.055em; }
        .sam-supply-copy > p:not(.sam-overline) { max-width:510px; margin:17px 0 0; color:#776d83; font-size:13px; line-height:1.75; }
        .sam-supply-points { margin-top:26px; display:grid; gap:7px; }
        .sam-supply-points > div { display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #eee8f4; }.sam-supply-points span { color:#8b5cf6; font-size:9px; font-weight:900; }.sam-supply-points b,.sam-supply-points small{display:block}.sam-supply-points b{font-size:11px}.sam-supply-points small{margin-top:2px;color:#8b8194;font-size:9px}
        .sam-supply-visual { overflow:hidden; border-radius:27px; padding:15px; background:linear-gradient(145deg,#150421,#2a0b42 65%,#421060); box-shadow:0 25px 70px rgba(40,10,60,.2); color:#fff; }
        .sam-supply-header { display:flex; align-items:center; gap:7px; padding:4px 3px 12px; color:#ddd0ff; font-size:8px; font-weight:900; letter-spacing:.14em; }.sam-supply-header > span:last-child{margin-left:auto;color:#9ee9c8}
        .sam-live-dot { width:6px;height:6px;border-radius:50%;background:#6ee7b7;box-shadow:0 0 0 4px rgba(110,231,183,.08) }
        .sam-supply-map { position:relative; height:270px; overflow:hidden; border:1px solid rgba(255,255,255,.08); border-radius:20px; background:radial-gradient(circle at 30% 30%,rgba(139,92,246,.16),transparent 28%),linear-gradient(140deg,#0f0718,#1a0b2c); }
        .sam-supply-map:before { content:''; position:absolute; inset:0; opacity:.2; background-image:linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px); background-size:34px 34px; }
        .sam-route-line { position:absolute; left:16%; right:13%; top:48%; height:2px; transform:rotate(-10deg); background:linear-gradient(90deg,#9f7aea,#e9d5ff,#8b5cf6); box-shadow:0 0 18px rgba(167,139,250,.55); }
        .sam-route-line:after { content:''; position:absolute; right:0; top:-4px; width:10px;height:10px;border-radius:50%;background:#c4b5fd; box-shadow:0 0 0 5px rgba(196,181,253,.1); }
        .sam-map-node { position:absolute; display:flex; flex-direction:column; align-items:center; gap:4px; }.sam-map-node > svg { width:40px;height:40px;padding:10px;border-radius:13px;background:#fff;color:#6823a8;box-shadow:0 12px 30px rgba(0,0,0,.25) }.sam-map-node b{font-size:9px}.sam-map-node small{color:rgba(255,255,255,.45);font-size:8px}.sam-map-node.supplier{left:10%;top:22%}.sam-map-node.moving{left:44%;top:48%;transform:translate(-50%,-50%)}.sam-map-node.moving svg{background:#7c3aed;color:#fff;box-shadow:0 0 30px rgba(124,58,237,.5)}.sam-map-node.venue{right:8%;bottom:18%}
        .sam-live-flow { position:relative; display:grid; grid-template-columns:repeat(4,1fr); margin-top:11px; padding:10px 2px 3px; }.sam-live-line{position:absolute;left:12%;right:12%;top:25px;height:1px;background:rgba(196,181,253,.2)}.sam-live-node{text-align:center;position:relative}.sam-live-icon{position:relative;z-index:1;margin:auto;display:grid;place-items:center;width:29px;height:29px;border-radius:10px;background:#21102f;border:1px solid rgba(255,255,255,.1);color:#cdb8ff}.sam-live-name{margin-top:5px;font-size:8px;font-weight:900}.sam-live-status{display:flex;justify-content:center;align-items:center;gap:3px;margin-top:2px;color:#9b8ba9;font-size:7px}.sam-live-status span{width:4px;height:4px;border-radius:50%;background:#a78bfa}.sam-visual-note{margin:10px 2px 0;color:rgba(255,255,255,.35);font-size:8px;line-height:1.5}
        .sam-dark-feature { background:#160322; color:#fff; }
        .sam-feature-grid { display:grid; grid-template-columns:1.05fr .95fr; gap:0; overflow:hidden; min-height:470px; border-radius:28px; border:1px solid rgba(255,255,255,.08); background:#210638; }
        .sam-feature-image { min-height:470px; background:linear-gradient(90deg,rgba(33,6,56,.05),rgba(33,6,56,.8)),url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=88') center/cover; }
        .sam-feature-copy { position:relative; display:flex; flex-direction:column; justify-content:center; padding:48px; background:radial-gradient(circle at 80% 20%,rgba(139,92,246,.25),transparent 35%); }.sam-feature-copy h2{margin:0;font-size:clamp(32px,4vw,52px);line-height:1;letter-spacing:-.05em}.sam-feature-copy h2 em{color:#c49cff;font-style:normal}.sam-feature-copy > p:not(.sam-overline){max-width:430px;margin:17px 0 24px;color:rgba(255,255,255,.55);font-size:12px;line-height:1.75}.sam-status-card{position:absolute;right:30px;bottom:27px;display:flex;gap:9px;align-items:center;padding:11px 14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(0,0,0,.24);backdrop-filter:blur(12px)}.sam-status-check{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#a78bfa;color:#25073d;font-weight:900}.sam-status-card b,.sam-status-card small{display:block}.sam-status-card b{font-size:9px}.sam-status-card small{margin-top:2px;color:rgba(255,255,255,.42);font-size:7px}
        .sam-benefits { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:34px; }.sam-benefits > div{display:grid;grid-template-columns:auto 1fr;gap:9px;padding:18px;border:1px solid #e8e2ef;border-radius:18px;background:#fff}.sam-benefits span{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#efe8ff;color:#7c3aed;grid-row:span 2}.sam-benefits b,.sam-benefits small{display:block}.sam-benefits b{font-size:11px}.sam-benefits small{color:#8b8194;font-size:9px}
        .sam-events-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:34px; }.sam-event-card{position:relative;min-height:155px;padding:17px;border:1px solid #e8e2ef;border-radius:19px;background:#fff;text-align:left;color:#1e1228;cursor:pointer;transition:.2s ease}.sam-event-card:hover{transform:translateY(-4px);box-shadow:0 18px 38px rgba(61,20,91,.1);border-color:#cbb8e7}.sam-event-icon{display:block;font-size:22px}.sam-event-card > small{position:absolute;right:14px;top:15px;color:#c7bdcf;font-size:8px;font-weight:900}.sam-event-card b{display:block;margin-top:15px;font-size:12px}.sam-event-card p{margin:5px 0 0;color:#8b8194;font-size:9px;line-height:1.5}.sam-event-arrow{display:inline-flex;align-items:center;gap:4px;margin-top:13px;color:#7c3aed;font-size:9px;font-weight:900}
        .sam-testimonials { background:#f7f4fb; color:#17101f; }.sam-testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:32px}.sam-testimonial-grid article{padding:21px;border:1px solid #e5dfee;border-radius:20px;background:#fff}.sam-stars{display:flex;gap:2px;color:#f59e0b}.sam-testimonial-grid article p{min-height:75px;margin:17px 0;font-size:12px;line-height:1.65;font-weight:700}.sam-avatar{display:inline-grid;place-items:center;width:30px;height:30px;margin-right:7px;border-radius:50%;background:#eee4ff;color:#6d28d9;font-size:10px;font-weight:900;vertical-align:middle}.sam-testimonial-grid article b{font-size:10px}.sam-testimonial-grid article small{display:block;margin-left:38px;margin-top:-1px;color:#93899c;font-size:8px}
        .sam-final-cta { padding:55px 0; background:linear-gradient(125deg,#6d28d9,#8b3dff 55%,#5b21b6); color:#fff; }.sam-final-cta .sam-container{display:flex;align-items:center;justify-content:space-between;gap:25px}.sam-final-cta h2{margin:0;font-size:clamp(31px,4vw,48px);letter-spacing:-.05em}.sam-final-cta p:last-child{margin:7px 0 0;color:rgba(255,255,255,.7);font-size:11px}
        .sam-footer{padding:48px 0 20px;background:#12031f;color:#fff}.sam-footer-grid{display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:40px}.sam-footer-logo{margin:0;font-size:19px;font-weight:900;letter-spacing:.24em}.sam-footer-tag{margin:7px 0 0;color:#c6a9e4;font-size:9px;font-weight:800}.sam-footer-copy{max-width:280px;margin:13px 0 0;color:rgba(255,255,255,.35);font-size:9px;line-height:1.6}.sam-footer-grid > div:not(:first-child){display:flex;flex-direction:column;gap:8px}.sam-footer-grid > div:not(:first-child)>b{margin-bottom:3px;color:#d8c6ed;font-size:9px;text-transform:uppercase;letter-spacing:.14em}.sam-footer-grid button{width:max-content;padding:0;border:0;background:none;color:rgba(255,255,255,.45);font-size:10px;cursor:pointer}.sam-footer-grid button:hover{color:#fff}.sam-socials{display:flex!important;flex-direction:row!important;gap:7px!important}.sam-socials button{display:grid;width:32px;height:32px;place-items:center;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.04)}.sam-footer-bottom{display:flex;justify-content:space-between;gap:20px;margin-top:35px;padding-top:15px;border-top:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.25);font-size:8px}
        .sam-reveal{opacity:0;transform:translateY(18px)}.sam-reveal-in{opacity:1;transform:none;transition:opacity .65s ease,transform .65s ease}
        @media (max-width: 1000px){.sam-desktop-nav{display:none}.sam-mobile-menu{display:grid;place-items:center}.sam-header-actions .sam-search-trigger{display:none}.sam-hero-grid{grid-template-columns:1fr;gap:28px}.sam-hero-visual{min-height:470px}.sam-workflow{grid-template-columns:repeat(3,1fr)}.sam-service-grid{grid-template-columns:repeat(2,1fr)}.sam-supply-grid{grid-template-columns:1fr;gap:45px}.sam-benefits{grid-template-columns:repeat(2,1fr)}.sam-events-grid{grid-template-columns:repeat(3,1fr)}.sam-mobile-nav{display:grid;gap:3px;padding:8px 24px 18px;border-top:1px solid rgba(255,255,255,.08);background:#160522}.sam-mobile-nav button:not(.sam-primary){display:flex;justify-content:space-between;align-items:center;padding:12px;border:0;border-radius:11px;background:transparent;color:#fff;text-align:left;font-size:12px;font-weight:800}.sam-mobile-nav button:not(.sam-primary):hover{background:rgba(255,255,255,.06)}.sam-mobile-nav .sam-primary{width:100%;margin-top:6px}}
        @media (max-width: 700px){.sam-container{width:min(100% - 28px,1280px)}.sam-header-inner{width:min(100% - 28px,1280px);min-height:64px}.sam-primary.small{display:none}.sam-hero{min-height:auto}.sam-hero-grid{min-height:auto;padding-block:40px 34px}.sam-hero h1{font-size:clamp(45px,14vw,67px)}.sam-hero-sub{font-size:15px}.sam-hero-body{font-size:11px}.sam-trust-row{grid-template-columns:repeat(2,1fr);gap:11px}.sam-trust-row div{font-size:8px}.sam-hero-visual{min-height:390px;border-radius:25px}.sam-script{font-size:34px}.sam-category-shell{padding:8px;border-radius:17px}.sam-category-rail{display:flex;overflow-x:auto;gap:6px;scrollbar-width:none}.sam-category-rail::-webkit-scrollbar{display:none}.sam-category-card{width:84px;flex:none;padding:9px 4px}.sam-category-card span:last-child{font-size:8px}.sam-section{padding:58px 0}.sam-section-heading{display:block}.sam-section-heading > p{margin-top:12px}.sam-section-heading h2{font-size:34px}.sam-workflow{display:flex;overflow-x:auto;gap:8px;margin-right:-14px;padding-right:14px;scroll-snap-type:x mandatory;scrollbar-width:none}.sam-workflow::-webkit-scrollbar{display:none}.sam-workflow .sam-reveal{flex:0 0 78%;scroll-snap-align:start}.sam-workflow-card{height:100%}.sam-workflow-image{height:135px}.sam-connected-strip{justify-content:flex-start;flex-wrap:nowrap;overflow:hidden;white-space:nowrap;font-size:7px}.sam-service-grid{grid-template-columns:1fr;gap:7px}.sam-service-card{padding:11px;border-radius:15px}.sam-service-icon{width:36px;height:36px}.sam-supply-copy h2{font-size:37px}.sam-supply-visual{padding:10px;border-radius:22px}.sam-supply-map{height:230px}.sam-live-flow{overflow:hidden}.sam-live-name{font-size:7px}.sam-feature-grid{grid-template-columns:1fr;border-radius:23px}.sam-feature-image{min-height:280px}.sam-feature-copy{padding:30px 24px;min-height:350px}.sam-status-card{position:static;margin-top:28px;width:max-content;max-width:100%}.sam-benefits{grid-template-columns:1fr 1fr}.sam-benefits>div{padding:13px}.sam-events-grid{grid-template-columns:1fr 1fr;gap:7px}.sam-event-card{min-height:145px;padding:13px}.sam-testimonial-grid{grid-template-columns:1fr;gap:8px}.sam-testimonial-grid article p{min-height:0}.sam-final-cta .sam-container{display:block}.sam-final-cta .sam-primary{margin-top:22px}.sam-footer-grid{grid-template-columns:1.4fr 1fr;gap:28px}.sam-footer-bottom{display:block;line-height:1.8}.sam-footer-bottom span:last-child{display:block}.sam-script{font-size:30px}}
        @media (max-width: 390px){.sam-container{width:min(100% - 22px,1280px)}.sam-header-inner{width:min(100% - 22px,1280px)}.sam-wordmark{font-size:16px}.sam-hero-grid{padding-top:32px}.sam-eyebrow{font-size:7px}.sam-hero h1{font-size:43px}.sam-hero-visual{min-height:360px}.sam-category-card{width:78px}.sam-section-heading h2{font-size:31px}.sam-benefits{grid-template-columns:1fr}.sam-events-grid{grid-template-columns:1fr 1fr}.sam-footer-grid{grid-template-columns:1fr 1fr}.sam-footer-grid>div:first-child{grid-column:1/-1}}
      `}</style>
    </div>
  )
}
