import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight, CalendarDays, Camera, CarFront, Check, CircleCheck,
  Flower2, MapPin, Menu, Minus, Music2, PackageCheck, Plus, ShieldCheck, Sparkles,
  Truck, Users, UtensilsCrossed, X, Building2, Gem
} from 'lucide-react'
import '../public-site.css'

const IMG = {
  hero: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=86',
  venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=86',
  catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1000&q=86',
  decor: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=86',
  photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=86',
  music: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=86',
  transport: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=86',
  beauty: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=86',
}

const services = [
  { id: 'venue', name: 'Venue', sub: 'Spaces & setup', image: IMG.venue, icon: Building2 },
  { id: 'catering', name: 'Catering', sub: 'Food & service', image: IMG.catering, icon: UtensilsCrossed },
  { id: 'decor', name: 'Decor', sub: 'Themes & florals', image: IMG.decor, icon: Flower2 },
  { id: 'photo', name: 'Photography', sub: 'Photo & video', image: IMG.photo, icon: Camera },
  { id: 'music', name: 'Music & artists', sub: 'DJs & live acts', image: IMG.music, icon: Music2 },
  { id: 'transport', name: 'Transport', sub: 'People & goods', image: IMG.transport, icon: CarFront },
  { id: 'beauty', name: 'Beauty', sub: 'Makeup & grooming', image: IMG.beauty, icon: Gem },
  { id: 'logistics', name: 'Logistics', sub: 'Delivery & support', image: IMG.transport, icon: Truck },
]
const occasions = ['Birthday', 'Wedding', 'Engagement', 'Baby shower', 'Anniversary', 'Corporate']

function Brand({ inverse = false }) {
  return (
    <a className="sam27-brand" href="#top" aria-label="Sambramo home">
      <span className="sam27-mark">S</span>
      <span>
        <span className="sam27-wordmark" style={{ color: inverse ? '#fff' : undefined }}>SAMBRAMO</span>
        <span className="sam27-tagline" style={{ color: inverse ? 'rgba(255,255,255,.46)' : undefined }}>EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
      </span>
    </a>
  )
}

function AppGate({ role = 'customer', onClose }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), interest: role === 'partner' ? 'Partners' : 'Customers', partner: role === 'partner' }),
      })
      if (!response.ok) throw new Error('request failed')
      setSent(true)
    } catch {
      setError('We could not save that right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="sam27-modal-back" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="sam27-modal">
        <div className="sam27-modal-head">
          <button onClick={onClose} aria-label="Close"><X size={17} /></button>
          <span className="sam27-eyebrow" style={{ color: '#E7D8F4' }}>SAMBRAMO APP · COMING SOON</span>
          <h3>{role === 'partner' ? 'Bring your services into the Sambramo network.' : 'Your celebration starts here.'}</h3>
          <p>Join the launch list and we will let you know when the Sambramo app opens in Bengaluru.</p>
        </div>
        {sent ? (
          <div className="sam27-success">
            <div className="sam27-success-icon"><CircleCheck size={22} /></div>
            <h4>You’re on the launch list.</h4>
            <p>We’ll share the next step with you when the app opens.</p>
            <button className="sam27-btn sam27-btn-dark" onClick={onClose}>Back to Sambramo</button>
          </div>
        ) : (
          <form className="sam27-form" onSubmit={submit}>
            <div className="sam27-role"><span>JOINING AS</span><b>{role === 'partner' ? 'EVENT PARTNER' : 'CUSTOMER'}</b></div>
            <label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Mobile number <span style={{ color: '#A096AA', fontWeight: 600 }}>optional</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" /></label>
            {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#fff1f1', color: '#9E3A42', fontSize: 10, fontWeight: 800 }}>{error}</div>}
            <button className="sam27-btn sam27-btn-primary" disabled={busy} style={{ width: '100%', marginTop: 16 }}>{busy ? 'Saving…' : 'Notify me when the app opens'} <ArrowRight size={15} /></button>
            <small><ShieldCheck size={12} /> Your details are used for Sambramo launch communication.</small>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

function AppCTA({ role = 'customer', children, className = '', style }) {
  const [open, setOpen] = useState(false)
  return (<><button className={className} style={style} onClick={() => setOpen(true)} type="button">{children}</button>{open && <AppGate role={role} onClose={() => setOpen(false)} />}</>)
}

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [['#services', 'Services'], ['#planner', 'Plan'], ['#how-it-works', 'How it works'], ['#partners', 'Partners']]
  return (<header className="sam27-nav">
    <div className="sam27-shell sam27-nav-inner">
      <Brand />
      <nav className="sam27-navlinks">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
      <div className="sam27-nav-actions">
        <AppCTA role="partner" className="sam27-btn sam27-btn-ghost sam27-hide-mobile">For partners</AppCTA>
        <AppCTA className="sam27-btn sam27-btn-primary sam27-hide-mobile">Join launch <ArrowRight size={13} /></AppCTA>
        <button className="sam27-menu" onClick={() => setOpen((value) => !value)} aria-label="Menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
    </div>
    {open && <div className="sam27-shell sam27-mobile-menu">{links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}<AppCTA role="partner" className="sam27-btn sam27-btn-ghost">For partners</AppCTA><AppCTA className="sam27-btn sam27-btn-primary">Join launch <ArrowRight size={13} /></AppCTA></div>}
  </header>)
}

function Hero() {
  return (<section id="top" className="sam27-hero"><div className="sam27-shell sam27-hero-grid">
    <div>
      <span className="sam27-eyebrow">BENGALURU · LAUNCHING SOON</span>
      <h1>Plan the <em>celebration.</em><br />Not the chaos.</h1>
      <p className="sam27-hero-copy">Sambramo connects the people, services and movement behind an event in one experience — from your first idea to the final delivery.</p>
      <div className="sam27-hero-actions"><a href="#planner" className="sam27-btn sam27-btn-primary">Build your event <ArrowRight size={16} /></a><AppCTA role="partner" className="sam27-btn" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.16)' }}>Join as a partner</AppCTA></div>
      <div className="sam27-proof"><span><Check size={12} /> Bengaluru first</span><span><Check size={12} /> 26+ service categories</span><span><Check size={12} /> Event supply chain + logistics</span></div>
    </div>
    <div className="sam27-hero-visual">
      <div className="sam27-floating one"><span className="sam27-floating-badge"><Sparkles size={15} /></span><span><small>YOUR EVENT</small><b>One connected brief</b></span></div>
      <div className="sam27-hero-card"><div className="sam27-hero-image"><img src={IMG.hero} alt="Celebration gathering" /><div className="sam27-hero-overlay"><span>One journey · many moving pieces</span><strong>From occasion to event day.</strong></div></div></div>
      <div className="sam27-floating two"><span className="sam27-floating-badge"><Truck size={15} /></span><span><small>MOVEMENT</small><b>Delivery stays connected</b></span></div>
    </div>
  </div></section>)
}

function TrustStrip() { return <div className="sam27-strip"><div className="sam27-shell sam27-strip-inner"><strong>One event. One connected flow.</strong><span>Discover · compare · book · move · deliver</span></div></div> }

function Services() {
  const extra = ['Invites', 'Mehendi', 'Entertainment', 'Furniture', 'Lighting', 'Flowers', 'Staffing', 'Gifting', 'Packaging', 'Last-mile']
  return (<section id="services" className="sam27-section"><div className="sam27-shell">
    <div className="sam27-section-head"><div><span className="sam27-eyebrow">THE SAMBRAMO NETWORK</span><h2>Everything your event needs,<br />in one place.</h2></div><p>Start with the service you need. Build outward. Sambramo is being designed around the full event supply chain, not a single vendor category.</p></div>
    <div className="sam27-service-grid">{services.map(({ id, name, sub, image }) => <a className="sam27-service" key={id} href="#planner" aria-label={name}><img src={image} alt="" /><div className="sam27-service-copy"><span>{id === 'logistics' ? 'MOVE' : 'EVENT SERVICE'}</span><strong>{name}</strong><small>{sub}</small></div></a>)}</div>
    <div className="sam27-trades">{extra.map((item) => <span className="sam27-trade" key={item}>{item}</span>)}</div>
  </div></section>)
}

function Planner() {
  const [occasion, setOccasion] = useState('Birthday')
  const [guests, setGuests] = useState(250)
  const [date, setDate] = useState('')
  const [selected, setSelected] = useState(['venue', 'catering', 'decor'])
  const [built, setBuilt] = useState(false)
  const toggle = (id) => { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); setBuilt(false) }
  const matches = Math.max(6, Math.round(guests / 30))
  return (<section id="planner" className="sam27-section alt"><div className="sam27-shell">
    <div className="sam27-section-head"><div><span className="sam27-eyebrow">INTERACTIVE PRODUCT PREVIEW</span><h2>Shape the event.<br />See it come together.</h2></div><p>Try the flow with a real event brief. This is a preview of the Sambramo experience — no booking or payment is created.</p></div>
    <div className="sam27-planner">
      <div className="sam27-panel"><div className="sam27-panel-pad">
        <div className="sam27-panel-title"><div><span className="sam27-eyebrow">01 — EVENT BRIEF</span><h3>What are you planning?</h3><p>Start with the details you already know.</p></div><span className="sam27-status">Live preview</span></div>
        <div className="sam27-field"><div className="sam27-field-head"><span className="sam27-num">01</span><strong>Occasion</strong><small>Choose one</small></div><div className="sam27-choices">{occasions.map((item) => <button key={item} className={occasion === item ? 'sam27-choice active' : 'sam27-choice'} onClick={() => { setOccasion(item); setBuilt(false) }}>{item}</button>)}</div></div>
        <div className="sam27-field"><div className="sam27-field-head"><span className="sam27-num">02</span><strong>Guest count</strong><small>Approximate is fine</small></div><div className="sam27-stepper"><button onClick={() => { setGuests((value) => Math.max(25, value - 25)); setBuilt(false) }} aria-label="Decrease guests"><Minus size={16} /></button><div><b>{guests.toLocaleString('en-IN')}</b><span>guests</span></div><button onClick={() => { setGuests((value) => Math.min(5000, value + 25)); setBuilt(false) }} aria-label="Increase guests"><Plus size={16} /></button></div></div>
        <div className="sam27-field"><div className="sam27-field-head"><span className="sam27-num">03</span><strong>Date & city</strong><small>Bengaluru launch</small></div><div className="sam27-inputs"><label className="sam27-input"><CalendarDays size={14} /><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setBuilt(false) }} /></label><div className="sam27-input"><MapPin size={14} /><span>Bengaluru</span></div></div></div>
        <div className="sam27-field"><div className="sam27-field-head"><span className="sam27-num">04</span><strong>Services</strong><small>{selected.length} selected</small></div><div className="sam27-services">{services.map(({ id, name, icon: Icon }) => <button key={id} className={selected.includes(id) ? 'sam27-service-pill active' : 'sam27-service-pill'} onClick={() => toggle(id)}><Icon size={13} />{name}</button>)}</div></div>
        <button className="sam27-btn sam27-btn-dark sam27-build" onClick={() => { setBuilt(true); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{built ? 'Blueprint updated' : 'Build my event workspace'} <ArrowRight size={16} /></button>
        <div className="sam27-note"><ShieldCheck size={12} /> Preview only. Your brief is not a booking request.</div>
      </div></div>
      <Workspace occasion={occasion} guests={guests} date={date} selected={selected} built={built} matches={matches} />
    </div>
  </div></section>)
}

function Workspace({ occasion, guests, date, selected, built, matches }) {
  const displayDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick a date'
  const readiness = Math.min(96, 35 + selected.length * 11 + (built ? 19 : 0))
  return (<div id="workspace" className="sam27-workspace">
    <div className="sam27-workspace-top"><div><span className="sam27-eyebrow" style={{ color: '#D8C4E8' }}>02 — YOUR EVENT WORKSPACE</span><h3>{occasion} · {guests.toLocaleString('en-IN')} guests</h3><p>{displayDate} · Bengaluru</p></div><span className="sam27-ready">{built ? 'BLUEPRINT READY' : 'EDITING'}</span></div>
    <div className="sam27-workgrid"><div className="sam27-workmain"><div className="sam27-workhead"><span><Sparkles size={13} /> SERVICE BLUEPRINT</span><b>{matches} matching options</b></div>{selected.length ? <div className="sam27-preview-grid">{selected.map((id, index) => { const service = services.find((item) => item.id === id); if (!service) return null; const Icon = service.icon; return <div className="sam27-preview" key={id}><img src={service.image} alt="" /><div className="sam27-preview-copy"><strong>{service.name}</strong><small><Icon size={10} /> {Math.max(4, matches - index)} options nearby <ArrowRight size={10} /></small></div></div> })}</div> : <div style={{ padding: 24, color: 'rgba(255,255,255,.58)', fontSize: 11 }}>Add a service to see the blueprint.</div>}</div>
      <div className="sam27-side"><div className="sam27-side-card"><span>EVENT READINESS</span><strong>{readiness}%</strong><div className="sam27-progress"><i style={{ width: readiness + '%' }} /></div><small>Keep refining the brief as plans become clearer.</small></div><div className="sam27-side-card"><span>CONNECTED LAYERS</span><div className="sam27-layers">{['Customer brief', 'Partner discovery', 'Booking flow', 'Event movement'].map((item, index) => <div className="sam27-layer" key={item}><i className={built && index < 3 ? 'done' : ''}>{built && index < 3 ? <Check size={9} /> : index + 1}</i>{item}</div>)}</div></div></div>
    </div>
  </div>)
}

function HowItWorks() {
  const steps = [
    { title: 'Tell Sambramo', body: 'Set the occasion, size, date and the services you need.', icon: Sparkles },
    { title: 'Discover partners', body: 'Explore relevant services and partner catalogues around your brief.', icon: Users },
    { title: 'Book the work', body: 'Move from options to confirmed services in a connected journey.', icon: CircleCheck },
    { title: 'Move everything', body: 'Coordinate people, goods and last-mile logistics toward event day.', icon: Truck },
  ]
  return (<section id="how-it-works" className="sam27-section"><div className="sam27-shell">
    <div className="sam27-section-head"><div><span className="sam27-eyebrow">HOW IT WORKS</span><h2>One flow from idea<br />to event day.</h2></div><p>The website is the introduction. The Sambramo app is being designed to carry the actual customer, partner and movement journeys.</p></div>
    <div className="sam27-story-grid"><div className="sam27-story-card"><img src={IMG.hero} alt="People celebrating together" /><div className="sam27-story-copy"><span className="sam27-eyebrow" style={{ color: '#E7D8F4' }}>THE PROMISE</span><h3>Plan the occasion.<br />We connect the moving pieces.</h3><p>From venues and food to decor, photography, artists, transport and logistics — the experience is designed around the event, not isolated transactions.</p></div></div>
      <div className="sam27-story-stack">{steps.map(({ title, body, icon: Icon }, index) => <div className="sam27-mini" key={title}><div className="sam27-mini-icon"><Icon size={22} /></div><div><div style={{ fontSize: 9, color: '#9B91A6', fontWeight: 900, letterSpacing: '.12em' }}>0{index + 1}</div><h4>{title}</h4><p>{body}</p></div></div>)}</div>
    </div>
  </div></section>)
}

function Movement() {
  return (<section id="movement" className="sam27-section alt"><div className="sam27-shell">
    <div className="sam27-section-head"><div><span className="sam27-eyebrow">EVENT SUPPLY CHAIN & LOGISTICS</span><h2>Because the event isn’t<br />only what people see.</h2></div><p>Sambramo brings the visible celebration and the invisible movement together — so the right things reach the right place at the right time.</p></div>
    <div className="sam27-story-grid"><div className="sam27-story-stack">
      <div className="sam27-mini"><div className="sam27-mini-icon"><Truck size={23} /></div><div><h4>People movement</h4><p>Transport options for guests, teams and event-day coordination.</p></div></div>
      <div className="sam27-mini"><div className="sam27-mini-icon"><PackageCheck size={23} /></div><div><h4>Goods movement</h4><p>Move decor, equipment, food, gifts and event essentials through the same connected flow.</p></div></div>
      <div className="sam27-mini"><div className="sam27-mini-icon"><MapPin size={23} /></div><div><h4>Last-mile visibility</h4><p>Keep delivery and support work connected to the occasion and the event date.</p></div></div>
    </div><div className="sam27-story-card" style={{ minHeight: 410 }}><img src={IMG.transport} alt="Event transportation" /><div className="sam27-story-copy"><span className="sam27-eyebrow" style={{ color: '#E7D8F4' }}>CONNECTED MOVEMENT</span><h3>From the first booking<br />to the final drop.</h3><p>Designing an event supply chain that feels as simple as booking a service.</p></div></div></div>
  </div></section>)
}

function Partners() {
  const features = ['Opportunities', 'Availability', 'Work status', 'Event context', 'Connected demand']
  return (<section id="partners" className="sam27-section"><div className="sam27-shell sam27-partner-grid">
    <div className="sam27-partner-copy"><span className="sam27-eyebrow">FOR EVENT PARTNERS</span><h3>Don’t just list a service. Plug into the event.</h3><p>Sambramo is being designed for venues, caterers, decorators, photographers, artists, transport providers, logistics teams and more. Build a better pipeline around real event demand.</p><div className="sam27-trades">{features.map((item) => <span className="sam27-trade" key={item}>{item}</span>)}</div><AppCTA role="partner" className="sam27-btn sam27-btn-dark" style={{ marginTop: 20 }}>Join partner launch <ArrowRight size={15} /></AppCTA></div>
    <div className="sam27-partner-card"><div className="sam27-opportunity"><div className="sam27-opportunity-top"><span>PARTNER WORKSPACE</span><span className="sam27-live"><i /> NEW OPPORTUNITY</span></div><h4>Birthday · 500 guests</h4><p>Photography · Bengaluru · event date to confirm</p><div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#F7EAB2', fontWeight: 900 }}><span>Review event brief</span><ArrowRight size={14} /></div></div><div className="sam27-kpis"><div className="sam27-kpi"><b>24</b><span>Open opportunities</span></div><div className="sam27-kpi"><b>08</b><span>Pending responses</span></div><div className="sam27-kpi"><b>91%</b><span>Calendar visibility</span></div></div></div>
  </div></section>)
}

function FinalCTA() {
  return (<section className="sam27-cta"><div className="sam27-shell sam27-cta-inner"><div><span className="sam27-eyebrow" style={{ color: '#D8C4E8' }}>SAMBRAMO · BENGALURU</span><h2>Your event deserves<br />one connected journey.</h2><p>We’re building the Sambramo app now. Join the launch list for the customer or event-partner experience.</p></div><AppCTA className="sam27-btn sam27-btn-primary">Stay close to launch <ArrowRight size={15} /></AppCTA></div></section>)
}

function Footer() {
  return (<footer className="sam27-footer"><div className="sam27-shell sam27-footer-grid"><div><Brand inverse /><p>Sambramo is building a connected event supply chain and logistics experience, starting in Bengaluru.</p></div><div><h4>Explore</h4><a href="#services">Services</a><a href="#planner">Plan an event</a><a href="#how-it-works">How it works</a><a href="#movement">Movement</a></div><div><h4>Access</h4><AppCTA className="sam27-footer-action">Customer launch list</AppCTA><AppCTA role="partner" className="sam27-footer-action">Partner launch list</AppCTA></div></div><div className="sam27-shell sam27-footer-bottom"><span>© {new Date().getFullYear()} SAMBRAMO. All rights reserved.</span><span>YOUR EVENT. OUR DELIVERY.</span></div></footer>)
}

export default function PublicSite() {
  return (<div className="sam27-site"><Nav /><main><Hero /><TrustStrip /><Services /><Planner /><HowItWorks /><Movement /><Partners /><FinalCTA /></main><Footer /></div>)
}