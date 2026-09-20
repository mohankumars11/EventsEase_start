import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight, BadgeCheck, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, MapPin, Menu, Minus, PackageCheck, PartyPopper, Plus, Search, ShieldCheck,
  Sparkles, Truck, Users, WalletCards, X, Building2, UtensilsCrossed, Flower2, Camera,
  Music2, CarFront, Gem, Boxes, Route
} from 'lucide-react'

const IMG = {
  hero: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=84',
  decor: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=84',
  food: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=84',
  photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=84',
  music: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=84',
  venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=84',
  transport: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=84',
  beauty: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=84',
}

const serviceCatalog = [
  { id: 'venue', name: 'Venue', sub: 'Spaces & setup', icon: Building2, image: IMG.venue, tone: 'space' },
  { id: 'catering', name: 'Catering', sub: 'Food & service', icon: UtensilsCrossed, image: IMG.food, tone: 'food' },
  { id: 'decor', name: 'Decor', sub: 'Themes & flowers', icon: Flower2, image: IMG.decor, tone: 'creative' },
  { id: 'photo', name: 'Photography', sub: 'Photo & video', icon: Camera, image: IMG.photo, tone: 'creative' },
  { id: 'music', name: 'Music', sub: 'DJs & artists', icon: Music2, image: IMG.music, tone: 'creative' },
  { id: 'transport', name: 'Transport', sub: 'People & goods', icon: CarFront, image: IMG.transport, tone: 'move' },
  { id: 'beauty', name: 'Beauty', sub: 'Makeup & grooming', icon: Gem, image: IMG.beauty, tone: 'care' },
  { id: 'logistics', name: 'Logistics', sub: 'Delivery & support', icon: Truck, image: IMG.transport, tone: 'move' },
]

const occasions = ['Birthday', 'Wedding', 'Engagement', 'Baby shower', 'Anniversary', 'Corporate']
const partners = [
  { name: 'Venue partner', type: 'Venue', rating: '4.8', note: 'Large celebrations · Bengaluru', image: IMG.venue },
  { name: 'Signature Catering', type: 'Catering', rating: '4.9', note: 'South Indian · 500+ guests', image: IMG.food },
  { name: 'Studio Stories', type: 'Photography', rating: '4.9', note: 'Photo + cinematic video', image: IMG.photo },
  { name: 'Bloom & Beam', type: 'Decor', rating: '4.7', note: 'Custom themes · Floral', image: IMG.decor },
]

function Brand({ dark = false }) {
  return (
    <a href="#top" className="inline-flex min-w-0 flex-col" aria-label="Sambramo home">
      <span className={`text-[19px] font-black tracking-[.09em] sm:text-[22px] ${dark ? 'text-[#2A085C]' : 'text-white'}`}>SAMBRAMO</span>
      <span className={`mt-0.5 text-[6px] font-bold tracking-[.16em] sm:text-[7px] ${dark ? 'text-[#7a6a83]' : 'text-white/55'}`}>EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </a>
  )
}

function EarlyAccess({ partner = false, open, onClose }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState(partner ? 'Vendors' : 'Events')
  const [state, setState] = useState('idle')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  async function submit(event) {
    event.preventDefault()
    setState('loading')
    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), interest, partner }),
      })
      if (!response.ok) throw new Error('submit')
      setState('success')
    } catch {
      setState('error')
    }
  }

  return createPortal(
    <div className="sambramo-modal fixed inset-0 z-[9999] flex items-end justify-center bg-[#10021dcc] p-3 backdrop-blur-md sm:items-center">
      <button aria-label="Close dialog" onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full max-w-[500px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="bg-[#2A085C] p-6 text-white sm:p-7">
          <button onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={17}/></button>
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F4C85D]">SAMBRAMO · BENGALURU</p>
          <h2 className="mt-2 font-serif text-3xl font-bold">Stay close to launch.</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">We’ll use your details for relevant launch updates.</p>
        </div>
        {state === 'success' ? (
          <div className="p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e9f6] text-[#2A085C]"><Check/></div>
            <h3 className="mt-4 text-xl font-black text-[#211329]">You’re on the list.</h3>
            <p className="mt-2 text-sm leading-6 text-[#74677b]">Thanks. We’ll keep the launch updates focused.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-[#2A085C] py-3.5 text-sm font-black text-white">Continue</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-6 sm:p-7">
            <div className="grid grid-cols-2 gap-2">
              {['Events', 'Vendors', 'Logistics', 'Transportation'].map((item) => (
                <button type="button" key={item} onClick={() => setInterest(item)} className={`rounded-xl border px-3 py-3 text-left text-[10px] font-black ${interest === item ? 'border-[#2A085C] bg-[#2A085C] text-white' : 'border-[#e1d7e6] text-[#67586f]'}`}>{item}</button>
              ))}
            </div>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="h-12 w-full rounded-xl border border-[#ddd1e3] bg-[#fcfafc] px-4 text-sm outline-none focus:border-[#2A085C]" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile (optional)" className="h-12 w-full rounded-xl border border-[#ddd1e3] bg-[#fcfafc] px-4 text-sm outline-none focus:border-[#2A085C]" />
            {state === 'error' && <p className="rounded-xl bg-[#fff3f1] p-3 text-xs font-bold text-[#9b4039]">Couldn’t save that right now. Please try again.</p>}
            <button disabled={state === 'loading'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4C85D] py-3.5 text-sm font-black text-[#1d0b30] disabled:opacity-60">{state === 'loading' ? 'Saving…' : 'Notify me'} <ArrowRight size={15}/></button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

function LaunchButton({ children = 'Get Early Access', partner = false, className = '' }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)} className={className}>{children}</button><EarlyAccess partner={partner} open={open} onClose={() => setOpen(false)} /></>
}

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [['#planner', 'Build an event'], ['#explore', 'Explore services'], ['#partners', 'Partners'], ['#tracking', 'Delivery']]
  return (
    <header className="sambramo-interactive-nav sticky top-0 z-50">
      <div className="mx-auto flex min-h-[64px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => <a key={href} href={href} className="rounded-lg px-3 py-2 text-[11px] font-extrabold text-white/65 hover:bg-white/[.06] hover:text-white">{label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#planner" className="hidden rounded-xl bg-[#F4C85D] px-4 py-2.5 text-[11px] font-black text-[#1d0b30] sm:block">Start planning</a>
          <button onClick={() => setOpen(!open)} aria-label="Menu" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white lg:hidden">{open ? <X size={18}/> : <Menu size={18}/>}</button>
        </div>
      </div>
      {open && <div className="border-t border-white/10 bg-[#160329] px-4 pb-4 lg:hidden">{links.map(([href,label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-white/5 py-3 text-sm font-bold text-white/80">{label}</a>)}<a href="#planner" onClick={() => setOpen(false)} className="mt-3 block rounded-xl bg-[#F4C85D] py-3 text-center text-sm font-black text-[#1d0b30]">Start planning</a></div>}
    </header>
  )
}

function EventPlanner() {
  const [occasion, setOccasion] = useState('Birthday')
  const [guests, setGuests] = useState(500)
  const [date, setDate] = useState('')
  const [selected, setSelected] = useState(['venue', 'catering', 'decor'])
  const [built, setBuilt] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)

  const matches = useMemo(() => Math.max(6, Math.round(guests / 35)), [guests])

  const toggleService = (id) => {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
    setBuilt(false)
  }

  function buildEvent() {
    setBuilt(true)
    window.setTimeout(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  return (
    <section id="planner" className="sambramo-planner-wrap">
      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[.86fr_1.14fr] lg:px-10 lg:py-9">
        <div className="sambramo-planner-panel">
          <div className="sambramo-planner-header">
            <div><span className="sambramo-eyebrow">BUILD YOUR EVENT</span><h2>Tell us what you’re planning.</h2><p>Start with the details you already know. The workspace changes as you customise it.</p></div>
            <span className="sambramo-live-chip"><span/> LIVE PREVIEW</span>
          </div>

          <div className="sambramo-planner-section">
            <div className="sambramo-field-head"><span>01</span><b>Occasion</b><small>Select one</small></div>
            <div className="sambramo-choice-grid">{occasions.map((item) => <button key={item} onClick={() => { setOccasion(item); setBuilt(false) }} className={occasion === item ? 'is-active' : ''}>{item}</button>)}</div>
          </div>

          <div className="sambramo-planner-section">
            <div className="sambramo-field-head"><span>02</span><b>Guest count</b><small>Approximate is fine</small></div>
            <div className="sambramo-guest-control">
              <button onClick={() => { setGuests((v) => Math.max(20, v - 50)); setBuilt(false) }} aria-label="Decrease guests"><Minus size={16}/></button>
              <div><strong>{guests.toLocaleString('en-IN')}</strong><span>guests</span></div>
              <button onClick={() => { setGuests((v) => Math.min(5000, v + 50)); setBuilt(false) }} aria-label="Increase guests"><Plus size={16}/></button>
            </div>
          </div>

          <div className="sambramo-planner-section">
            <div className="sambramo-field-head"><span>03</span><b>Date & city</b><small>Bengaluru launch</small></div>
            <div className="grid grid-cols-2 gap-2">
              <label className="sambramo-input"><CalendarDays size={15}/><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setBuilt(false) }}/></label>
              <div className="sambramo-input"><MapPin size={15}/><span>Bengaluru</span></div>
            </div>
          </div>

          <div className="sambramo-planner-section">
            <div className="sambramo-field-head"><span>04</span><b>What do you need?</b><small>{selected.length} selected</small></div>
            <div className="sambramo-service-pills">{serviceCatalog.map(({id,name,icon:Icon}) => <button key={id} onClick={() => toggleService(id)} className={selected.includes(id) ? 'is-active' : ''}><Icon size={14}/>{name}</button>)}</div>
          </div>

          <button onClick={buildEvent} className="sambramo-build-button">Build my event workspace <ArrowRight size={17}/></button>
          <p className="sambramo-planner-note"><ShieldCheck size={13}/> This is an interactive preview. No booking or payment is created here.</p>
        </div>

        <div id="workspace" className="sambramo-workspace">
          <div className="sambramo-workspace-top">
            <div><span className="sambramo-eyebrow">YOUR EVENT WORKSPACE</span><h3>{occasion} · {guests.toLocaleString('en-IN')} guests</h3><p>{date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Choose a date when you are ready'} · Bengaluru</p></div>
            <div className="sambramo-workspace-state"><span/> {built ? 'BLUEPRINT READY' : 'EDITING'}</div>
          </div>

          <div className="sambramo-blueprint">
            <div className="sambramo-blueprint-main">
              <div className="sambramo-blueprint-title"><span><Sparkles size={15}/> Event blueprint</span><b>{matches} matching options</b></div>
              <div className="sambramo-selected-grid">
                {selected.map((id, index) => {
                  const service = serviceCatalog.find((item) => item.id === id)
                  if (!service) return null
                  const Icon = service.icon
                  return <button key={id} onClick={() => setSelectedPartner({ ...service, index })} className="sambramo-work-card"><img src={service.image} alt="" /><div className="sambramo-work-card-overlay"/><div className="sambramo-work-card-content"><span><Icon size={14}/> {service.name}</span><b>Explore partners</b><small>{Math.max(4, matches - index)} options nearby <ArrowRight size={12}/></small></div></button>
                })}
              </div>
              {selected.length === 0 && <div className="sambramo-empty">Add at least one service to see your event blueprint.</div>}
            </div>

            <div className="sambramo-blueprint-side">
              <div className="sambramo-side-card"><span>EVENT READINESS</span><strong>{Math.min(96, 36 + selected.length * 9 + (built ? 18 : 0))}%</strong><div className="sambramo-progress"><i style={{ width: `${Math.min(96, 36 + selected.length * 9 + (built ? 18 : 0))}%` }}/></div><small>Details can be refined at every step.</small></div>
              <div className="sambramo-side-card"><span>CONNECTED LAYERS</span>{['Customer brief', 'Partner discovery', 'Booking', 'Event movement'].map((item, i) => <div className="sambramo-side-row" key={item}><span className={i <= (built ? 2 : 0) ? 'done' : ''}>{i <= (built ? 2 : 0) ? <Check size={9}/> : i + 1}</span>{item}</div>)}</div>
            </div>
          </div>

          {selectedPartner && <PartnerDrawer partner={selectedPartner} onClose={() => setSelectedPartner(null)} onContinue={() => setSelectedPartner(null)} />}
        </div>
      </div>
    </section>
  )
}

function PartnerDrawer({ partner, onClose, onContinue }) {
  const [tab, setTab] = useState('catalogue')
  return createPortal(
    <div className="sambramo-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="sambramo-drawer" role="dialog" aria-modal="true">
        <div className="sambramo-drawer-image"><img src={partner.image} alt="" /><div><span>{partner.name || partner.title}</span><b>4.8 · Bengaluru</b></div><button onClick={onClose} aria-label="Close"><X size={18}/></button></div>
        <div className="sambramo-drawer-tabs"><button onClick={() => setTab('catalogue')} className={tab === 'catalogue' ? 'is-active' : ''}>Catalogue</button><button onClick={() => setTab('details')} className={tab === 'details' ? 'is-active' : ''}>Details</button><button onClick={() => setTab('availability')} className={tab === 'availability' ? 'is-active' : ''}>Availability</button></div>
        {tab === 'catalogue' && <div className="sambramo-drawer-content"><p className="sambramo-eyebrow">PARTNER CATALOGUE</p><h3>{partner.name || partner.title}</h3><p>Explore service packages, portfolio-style examples and the information a customer would use before selecting a partner.</p><div className="sambramo-catalogue-items"><div><img src={partner.image} alt="" /><span>Signature package</span><b>View package</b></div><div><img src={IMG.hero} alt="" /><span>Event-day coverage</span><b>View package</b></div></div><button onClick={onContinue} className="sambramo-drawer-primary">Select this partner <ArrowRight size={15}/></button></div>}
        {tab === 'details' && <div className="sambramo-drawer-content"><p className="sambramo-eyebrow">PARTNER DETAILS</p><h3>Built for your event brief.</h3><div className="sambramo-detail-list">{['Guest capacity alignment', 'Service scope', 'Bengaluru availability', 'Event-day coordination'].map((item) => <div key={item}><Check size={14}/>{item}</div>)}</div></div>}
        {tab === 'availability' && <div className="sambramo-drawer-content"><p className="sambramo-eyebrow">AVAILABILITY</p><h3>Check before you commit.</h3><div className="sambramo-calendar-preview">{['18','19','20','21','22','23','24'].map((day) => <button key={day} className={day === '21' ? 'selected' : ''}>{day}<small>{day === '21' ? 'Open' : '—'}</small></button>)}</div><p className="mt-4 text-xs text-[#75697b]">Availability shown here is a product preview, not a live partner inventory feed.</p></div>}
      </aside>
    </div>,
    document.body,
  )
}

function InteractiveJourney() {
  const [active, setActive] = useState(0)
  const steps = [
    { title: 'Tell Sambramo the occasion', body: 'Guest count, date, city and preferences become one event brief.', icon: CalendarDays },
    { title: 'Get a connected shortlist', body: 'Relevant service categories and partner options appear around that brief.', icon: Sparkles },
    { title: 'Open the partner catalogue', body: 'Explore packages, service details and availability before selecting.', icon: Users },
    { title: 'Book and pay', body: 'When the product flow is live, the selected work moves into booking and payment.', icon: WalletCards },
    { title: 'Watch the work move', body: 'Preparation, pickup, transport and venue-side progress stay connected.', icon: Truck },
  ]
  const StepIcon = steps[active].icon
  return (
    <section id="how-it-works" className="sambramo-journey">
      <div className="mx-auto max-w-[1480px] px-4 py-9 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
        <div className="sambramo-section-head"><div><span className="sambramo-eyebrow">NOT A BROCHURE · A PRODUCT FLOW</span><h2>See the customer journey by using it.</h2></div><p>Tap any stage. The product surface changes with it.</p></div>
        <div className="sambramo-journey-shell">
          <div className="sambramo-step-rail">{steps.map((step, index) => { const Icon = step.icon; return <button key={step.title} onClick={() => setActive(index)} className={index === active ? 'is-active' : ''}><span>{String(index + 1).padStart(2,'0')}</span><Icon size={16}/><b>{step.title}</b><small>{index === active ? 'Open' : 'Tap to view'}</small></button> })}</div>
          <div className="sambramo-journey-stage">
            <div className="sambramo-stage-top"><span>EVENT FLOW</span><b>{String(active + 1).padStart(2,'0')} / 05</b></div>
            <div className="sambramo-stage-body">
              <div className="sambramo-stage-copy"><div className="sambramo-stage-icon"><StepIcon size={21}/></div><span className="sambramo-eyebrow">STEP {String(active + 1).padStart(2,'0')}</span><h3>{steps[active].title}</h3><p>{steps[active].body}</p><button onClick={() => active < steps.length - 1 ? setActive(active + 1) : document.getElementById('tracking')?.scrollIntoView({ behavior: 'smooth' })}>{active === steps.length - 1 ? 'See delivery preview' : 'Next step'} <ArrowRight size={15}/></button></div>
              <div className="sambramo-stage-visual">
                {active === 0 && <div className="sambramo-mini-phone"><div className="sambramo-mini-notch"/><span>SAMBRAMO</span><strong>Birthday</strong><div className="sambramo-mini-line"/><div className="sambramo-mini-row"><small>Guests</small><b>500</b></div><div className="sambramo-mini-row"><small>City</small><b>Bengaluru</b></div><button>Continue</button></div>}
                {active === 1 && <div className="sambramo-mini-recommend"><span>RECOMMENDED</span><strong>For 500 guests</strong>{['Venue · 12', 'Catering · 18', 'Decor · 24'].map((x) => <div key={x}><Check size={11}/>{x}<ArrowRight size={11}/></div>)}</div>}
                {active === 2 && <div className="sambramo-mini-catalog"><span>PARTNER CATALOGUE</span><div><img src={IMG.photo} alt=""/><b>Photography</b><small>Packages · Portfolio</small></div><div><img src={IMG.decor} alt=""/><b>Decor</b><small>Packages · Portfolio</small></div></div>}
                {active === 3 && <div className="sambramo-mini-payment"><span>SECURE CHECKOUT</span><strong>Booking ready</strong><div><WalletCards size={16}/> Razorpay checkout</div><small>UPI · Cards · Netbanking</small></div>}
                {active === 4 && <TrackingMap compact />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrackingMap({ compact = false }) {
  const [moving, setMoving] = useState(false)
  useEffect(() => {
    if (!moving) return undefined
    const timer = window.setTimeout(() => setMoving(false), 6500)
    return () => window.clearTimeout(timer)
  }, [moving])
  return (
    <div className={`sambramo-tracking-map ${compact ? 'is-compact' : ''} ${moving ? 'is-moving' : ''}`}>
      <div className="sambramo-map-road road-a"/><div className="sambramo-map-road road-b"/><div className="sambramo-map-road road-c"/>
      <svg className="sambramo-route-svg" viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true"><path d="M65 245 C180 220 170 90 305 125 S455 235 535 70" /></svg>
      <div className="sambramo-map-origin"><Boxes size={14}/></div><div className="sambramo-map-destination"><PartyPopper size={14}/></div>
      <div className="sambramo-map-vehicle"><Truck size={17}/></div>
      <div className="sambramo-map-info"><div><span className="sambramo-live-dot"/> {moving ? 'LIVE · MOVING' : 'DELIVERY PREVIEW'}</div><b>Event supplies</b><small>Partner → venue · Bengaluru</small><strong>{moving ? 'On the way' : 'Ready to start'}</strong></div>
      {!compact && <button onClick={() => setMoving(true)} className="sambramo-map-action">{moving ? 'Movement in progress…' : 'Play delivery movement'} <ArrowRight size={14}/></button>}
    </div>
  )
}

function Delivery() {
  return (
    <section id="tracking" className="sambramo-delivery">
      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-9 sm:px-7 sm:py-12 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:py-14">
        <div className="sambramo-delivery-copy"><span className="sambramo-eyebrow">EVENT-DAY CONTROL</span><h2>The work keeps moving after the booking.</h2><p>Preparation, pickup, movement and venue arrival can live inside the same event journey instead of becoming another chain of calls.</p><div className="sambramo-delivery-stats"><div><strong>01</strong><span>Partner prepares</span></div><div><strong>02</strong><span>Pickup begins</span></div><div><strong>03</strong><span>Movement updates</span></div><div><strong>04</strong><span>Venue handoff</span></div></div></div>
        <TrackingMap />
      </div>
    </section>
  )
}

function Explore() {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(null)
  const filters = ['All', 'Spaces', 'Food', 'Creative', 'Move', 'Care']
  const filtered = serviceCatalog.filter((item) => (filter === 'All' || item.tone === filter.toLowerCase()) && item.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <section id="explore" className="sambramo-explore">
      <div className="mx-auto max-w-[1480px] px-4 py-9 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
        <div className="sambramo-section-head"><div><span className="sambramo-eyebrow">EXPLORE THE EVENT STACK</span><h2>Don’t read the service list. Interact with it.</h2></div><p>Filter, search and open a service to see the next action.</p></div>
        <div className="sambramo-explore-toolbar"><div className="sambramo-filter-row">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'is-active' : ''}>{item}</button>)}</div><label className="sambramo-search"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a service"/></label></div>
        <div className="sambramo-service-grid">
          {filtered.map((service) => { const Icon = service.icon; return <button key={service.id} onClick={() => setActive(service)} className="sambramo-service-tile"><div className="sambramo-service-image"><img src={service.image} alt="" /><span><Icon size={14}/></span></div><div className="sambramo-service-copy"><b>{service.name}</b><small>{service.sub}</small><span>Explore <ArrowRight size={12}/></span></div></button> })}
        </div>
      </div>
      {active && <PartnerDrawer partner={active} onClose={() => setActive(null)} onContinue={() => setActive(null)} />}
    </section>
  )
}

function ControlCenter() {
  const [tab, setTab] = useState('customer')
  const data = tab === 'customer'
    ? { title: 'Customer view', items: ['Event brief created', 'Partner selected', 'Payment ready', 'Preparation scheduled', 'Delivery moving'] }
    : { title: 'Partner view', items: ['New event opportunity', 'Scope reviewed', 'Booking confirmed', 'Team preparing', 'Pickup scheduled'] }
  return (
    <section className="sambramo-control">
      <div className="mx-auto max-w-[1480px] px-4 py-9 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
        <div className="sambramo-section-head light"><div><span className="sambramo-eyebrow">ONE EVENT · MULTIPLE ROLES</span><h2>Everyone sees the part they need.</h2></div><p>The customer and partner experiences are connected without forcing either side to use the same screen.</p></div>
        <div className="sambramo-control-shell">
          <div className="sambramo-control-tabs"><button onClick={() => setTab('customer')} className={tab === 'customer' ? 'is-active' : ''}><Users size={15}/> Customer</button><button onClick={() => setTab('partner')} className={tab === 'partner' ? 'is-active' : ''}><PackageCheck size={15}/> Partner</button></div>
          <div className="sambramo-control-main">
            <div className="sambramo-control-title"><div><span>{data.title}</span><b>Event #BLR-500</b></div><span className="sambramo-status-pill"><i/> Connected</span></div>
            <div className="sambramo-control-list">{data.items.map((item, index) => <div key={item} className={index === data.items.length - 1 ? 'current' : ''}><span>{index < 3 ? <Check size={11}/> : index + 1}</span><div><b>{item}</b><small>{index < 3 ? 'Completed' : index === 3 ? 'In progress' : 'Next'}</small></div><Clock3 size={14}/></div>)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnerCTA() {
  return (
    <section id="partners" className="sambramo-partner-cta">
      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-9 sm:px-7 sm:py-12 lg:grid-cols-[1fr_.9fr] lg:px-10 lg:py-14">
        <div><span className="sambramo-eyebrow">FOR EVENT PARTNERS</span><h2>Don’t just list a service. Plug into the event.</h2><p>Sambramo is being designed for venues, caterers, decorators, photographers, artists, transport providers and logistics partners.</p><LaunchButton partner className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F4C85D] px-5 py-3 text-sm font-black text-[#1d0b30]">Join partner early access <ArrowRight size={15}/></LaunchButton></div>
        <div className="sambramo-partner-card"><div className="sambramo-partner-card-top"><span>PARTNER WORKSPACE</span><Bell size={15}/></div><div className="sambramo-opportunity"><div><span className="sambramo-live-dot"/> NEW OPPORTUNITY</div><b>Birthday · 500 guests</b><small>Photography · Bengaluru · event date</small><button>Review event <ArrowRight size={13}/></button></div><div className="grid grid-cols-3 gap-2"><div><b>Jobs</b><small>Opportunities</small></div><div><b>Calendar</b><small>Availability</small></div><div><b>Work</b><small>Progress</small></div></div></div>
      </div>
    </section>
  )
}

function FAQ() {
  const questions = [
    ['Is this a live booking page?', 'The public experience is an interactive product preview. Booking, partner inventory and payment should only be treated as live once those integrations are connected.'],
    ['What can I customise?', 'The planner lets you choose an occasion, guest count, date, Bengaluru and the service layers you want to explore.'],
    ['Can I inspect a partner before selecting?', 'Yes. The interactive preview opens a catalogue-style drawer with packages, details and an availability preview.'],
    ['Will tracking be real?', 'The interface demonstrates the intended GPS-style experience. Actual live tracking requires connected location data from the delivery workflow.'],
  ]
  const [active, setActive] = useState(0)
  return (
    <section className="sambramo-faq">
      <div className="mx-auto max-w-3xl px-4 py-9 sm:px-7 sm:py-12">
        <div className="text-center"><span className="sambramo-eyebrow">CLARITY</span><h2>Simple to use. Clear about what is live.</h2></div>
        <div className="mt-6 space-y-2">{questions.map(([q,a], index) => <div key={q} className="sambramo-faq-item"><button onClick={() => setActive(active === index ? -1 : index)}><span>{q}</span><ChevronDown size={16} className={active === index ? 'rotate-180' : ''}/></button>{active === index && <p>{a}</p>}</div>)}</div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contact" className="sambramo-footer">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-4 pb-7 pt-10 sm:px-7 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div><Brand/><p className="mt-4 max-w-sm text-xs leading-6 text-white/45">A connected event supply chain and logistics experience, starting in Bengaluru.</p><p className="mt-3 flex items-center gap-2 text-xs text-white/40"><MapPin size={13} className="text-[#F4C85D]"/> Bengaluru · Launch market</p></div>
        <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/45">Explore</p><div className="mt-4 space-y-2 text-xs text-white/55"><a href="#planner">Build an event</a><a href="#explore">Explore services</a><a href="#how-it-works">How it works</a><a href="#tracking">Delivery</a></div></div>
        <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/45">Access</p><LaunchButton className="mt-4 block text-xs text-white/55 hover:text-white">Customer early access</LaunchButton><LaunchButton partner className="mt-3 block text-xs text-white/55 hover:text-white">Partner early access</LaunchButton></div>
      </div>
      <div className="mx-auto flex max-w-[1480px] flex-col gap-2 border-t border-white/10 px-4 py-5 text-[9px] text-white/28 sm:flex-row sm:justify-between sm:px-7 lg:px-10"><span>© {new Date().getFullYear()} SAMBRAMO. All rights reserved.</span><span className="font-black tracking-[.14em] text-[#F4C85D]">YOUR EVENT. OUR DELIVERY.</span></div>
    </footer>
  )
}

function Hero() {
  const [heroTab, setHeroTab] = useState('customer')
  return (
    <section id="top" className="sambramo-interactive-hero">
      <div className="sambramo-hero-orb orb-one"/><div className="sambramo-hero-orb orb-two"/>
      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 pb-7 pt-7 sm:px-7 sm:pb-9 sm:pt-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10 lg:py-12">
        <div className="sambramo-hero-copy">
          <span className="sambramo-hero-kicker">BENGALURU · EVENT SUPPLY CHAIN & LOGISTICS</span>
          <h1>Plan the event.<br/><em>Not the chaos.</em></h1>
          <p>Tell Sambramo what you’re celebrating. Shape the event, discover the right services, inspect partners and move the work toward event day — from one connected experience.</p>
          <div className="sambramo-hero-actions"><a href="#planner" className="sambramo-primary-action">Build my event <ArrowRight size={16}/></a><a href="#how-it-works" className="sambramo-secondary-action">Use the product tour</a></div>
          <div className="sambramo-hero-proof"><span><Check size={12}/> Customer-led</span><span><Check size={12}/> Partner-connected</span><span><Check size={12}/> Bengaluru first</span></div>
        </div>

        <div className="sambramo-live-product">
          <div className="sambramo-product-top"><div><span>LIVE PRODUCT PREVIEW</span><b>{heroTab === 'customer' ? 'Customer workspace' : 'Partner workspace'}</b></div><div className="sambramo-product-tabs"><button onClick={() => setHeroTab('customer')} className={heroTab === 'customer' ? 'is-active' : ''}>Customer</button><button onClick={() => setHeroTab('partner')} className={heroTab === 'partner' ? 'is-active' : ''}>Partner</button></div></div>
          {heroTab === 'customer' ? (
            <div className="sambramo-product-body">
              <div className="sambramo-product-welcome"><div><span>Good afternoon</span><strong>What are you planning?</strong></div><div className="sambramo-product-avatar">M</div></div>
              <div className="sambramo-product-create"><span>START WITH AN OCCASION</span><div><b>Birthday celebration</b><small>500 guests · Bengaluru</small></div><button onClick={() => document.getElementById('planner')?.scrollIntoView({behavior:'smooth'})}>Start <ArrowRight size={14}/></button></div>
              <div className="sambramo-product-row"><div><Sparkles size={15}/><span><b>Recommendations</b><small>Built around your brief</small></span></div><strong>24 options</strong></div>
              <div className="sambramo-product-row"><div><Users size={15}/><span><b>Partner catalogues</b><small>Open, compare, select</small></span></div><strong>Explore</strong></div>
              <div className="sambramo-product-footer"><span><span className="sambramo-live-dot"/> Event journey ready</span><b>01 → 05</b></div>
            </div>
          ) : (
            <div className="sambramo-product-body">
              <div className="sambramo-product-welcome"><div><span>Partner workspace</span><strong>Work coming your way.</strong></div><div className="sambramo-product-avatar"><Bell size={15}/></div></div>
              <div className="sambramo-product-opportunity"><span>NEW OPPORTUNITY</span><b>Birthday · 500 guests</b><small>Photography · Bengaluru</small><button>Review event <ArrowRight size={13}/></button></div>
              <div className="sambramo-product-row"><div><CalendarDays size={15}/><span><b>Schedule</b><small>Availability around events</small></span></div><strong>Open</strong></div>
              <div className="sambramo-product-row"><div><PackageCheck size={15}/><span><b>Preparation</b><small>Work and status in one place</small></span></div><strong>Track</strong></div>
              <div className="sambramo-product-footer"><span><span className="sambramo-live-dot"/> Partner side</span><b>EVENT #BLR-500</b></div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PublicSiteSEO() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/'
    const pages = {
      '/': ['SAMBRAMO — Interactive Event Supply Chain & Logistics | Bengaluru', 'Explore SAMBRAMO through an interactive event planning experience connecting customers, event partners, supply chain and logistics in Bengaluru.'],
      '/about': ['About SAMBRAMO | Event Supply Chain & Logistics in Bengaluru', 'Learn about SAMBRAMO and its Bengaluru-first approach to connecting event services, partners, supply chain and logistics.'],
      '/how-it-works': ['How SAMBRAMO Works | Interactive Event Journey', 'Explore the customer, partner, booking and event-day journey designed by SAMBRAMO.'],
      '/partners': ['SAMBRAMO Partners | Event Vendors & Logistics in Bengaluru', 'Explore the partner experience for event specialists, transport and logistics providers in Bengaluru.'],
      '/contact': ['Contact SAMBRAMO | Bengaluru', 'Contact SAMBRAMO about customer early access, partner opportunities and the Bengaluru launch.'],
    }
    const [title, description] = pages[path] || pages['/']
    document.title = title
    const setMeta = (selector, attr, value) => {
      let node = document.head.querySelector(selector)
      if (!node) {
        node = document.createElement('meta')
        node.setAttribute(attr, selector.includes('og:') ? 'og:' + selector.split('og:')[1].split('"')[0] : selector.match(/name="([^"]+)"/)?.[1] || '')
        document.head.appendChild(node)
      }
      node.setAttribute('content', value)
    }
    setMeta('meta[name="description"]', 'name', description)
    setMeta('meta[property="og:title"]', 'property', title)
    setMeta('meta[property="og:description"]', 'property', description)
    setMeta('meta[name="twitter:title"]', 'name', title)
    setMeta('meta[name="twitter:description"]', 'name', description)
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = `https://sambramo.com${path === '/' ? '/' : path}`
    const old = document.getElementById('sambramo-seo-jsonld')
    if (old) old.remove()
    const script = document.createElement('script')
    script.id = 'sambramo-seo-jsonld'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': 'https://sambramo.com/#organization', name: 'SAMBRAMO', alternateName: 'SAMBRAMO Event Supply Chain & Logistics', url: 'https://sambramo.com/' },
        { '@type': 'WebSite', '@id': 'https://sambramo.com/#website', name: 'SAMBRAMO', url: 'https://sambramo.com/', inLanguage: 'en-IN', publisher: { '@id': 'https://sambramo.com/#organization' } },
        { '@type': 'WebPage', '@id': `https://sambramo.com${path}#webpage`, url: `https://sambramo.com${path}`, name: title, description, isPartOf: { '@id': 'https://sambramo.com/#website' } },
      ],
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [])
  return null
}

export default function PublicSite() {
  return (
    <>
      <PublicSiteSEO/>
      <div className="sambramo-site min-h-screen bg-white text-[#211329]">
        <Nav/>
        <main>
          <Hero/>
          <EventPlanner/>
          <InteractiveJourney/>
          <Explore/>
          <Delivery/>
          <ControlCenter/>
          <PartnerCTA/>
          <FAQ/>
        </main>
        <Footer/>
      </div>
    </>
  )
}
