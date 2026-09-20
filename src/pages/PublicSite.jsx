
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown, CircleCheck, Menu, ShieldCheck, Users, Truck, X } from 'lucide-react'
import './sam-launch-v2.css'

const slides = [
  {
    eyebrow: 'CUSTOMER APP',
    title: 'One place to discover the event services you need.',
    text: 'Start with the occasion. Find the right services. Keep the event context together.',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85',
  },
  {
    eyebrow: 'PARTNER APP',
    title: 'Work with event demand, not disconnected requests.',
    text: 'Partners can see relevant opportunities, context and movement around the work.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85',
  },
  {
    eyebrow: 'CONNECTED MOVEMENT',
    title: 'Services and logistics move with the event.',
    text: 'People, goods and last-mile coordination are part of the same journey.',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=85',
  },
]

const trades = [
  'Venues', 'Catering', 'Decor', 'Photography', 'Music', 'Artists',
  'Beauty', 'Transport', 'Logistics', 'Furniture', 'Flowers', 'Gifting',
  'Invites', 'Mehendi', 'Staffing', 'Packaging',
]

function Brand() {
  return (
    <a href="/" className="sv2-brand" aria-label="Sambramo home">
      <span className="sv2-brand-name">SAMBRAMO</span>
      <span className="sv2-brand-sub">EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </a>
  )
}

function InterestModal({ role, onClose }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
          interest: role === 'partner' ? 'Partners' : 'Customers',
          partner: role === 'partner',
        }),
      })
      if (!response.ok) throw new Error('interest')
      setDone(true)
    } catch {
      setError('We could not save your interest right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="sv2-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sv2-modal">
        <div className="sv2-modal-head">
          <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
          <span className="sv2-overline">{role === 'partner' ? 'PARTNER APP' : 'CUSTOMER APP'} · COMING SOON</span>
          <h2>{role === 'partner' ? 'Partner App is opening soon.' : 'Customer App is opening soon.'}</h2>
          <p>Sambramo is launching in Bengaluru first. Capture your interest and we’ll notify you when the app experience opens.</p>
        </div>
        {done ? (
          <div className="sv2-modal-body">
            <div className="sv2-success-icon"><CircleCheck size={21} /></div>
            <h3>Interest captured.</h3>
            <p>We’ll use your details only for the Sambramo launch communication.</p>
            <button className="sv2-btn sv2-btn-purple" type="button" onClick={onClose}>Done <ArrowRight size={14} /></button>
          </div>
        ) : (
          <form className="sv2-modal-body" onSubmit={submit}>
            <div className="sv2-role"><span>JOINING AS</span><b>{role === 'partner' ? 'PARTNER' : 'CUSTOMER'}</b></div>
            <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Mobile <em>optional</em><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" /></label>
            {error && <div className="sv2-error">{error}</div>}
            <button className="sv2-btn sv2-btn-purple sv2-full" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Capture my interest'} <ArrowRight size={14} /></button>
            <div className="sv2-form-note"><ShieldCheck size={11} /> Launch updates only.</div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

function AppEntry({ role, children, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && <InterestModal role={role} onClose={() => setOpen(false)} />}
    </>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="sv2-storebar">
        <div className="sv2-wrap sv2-storebar-inner">
          <span>Launching soon in <b>Bengaluru</b></span>
          <span className="sv2-store-links">
            <a href="https://play.google.com/store/" target="_blank" rel="noreferrer">Google Play</a>
            <a href="https://apps.apple.com/in/" target="_blank" rel="noreferrer">App Store</a>
          </span>
        </div>
      </div>
      <header className="sv2-header">
        <div className="sv2-wrap sv2-header-inner">
          <Brand />
          <div className="sv2-header-actions">
            <AppEntry role="partner" className="sv2-btn sv2-btn-outline sv2-desktop">Partner App</AppEntry>
            <AppEntry role="customer" className="sv2-btn sv2-btn-gold sv2-desktop">Customer App <ArrowRight size={12} /></AppEntry>
            <button className="sv2-menu" type="button" onClick={() => setOpen((v) => !v)} aria-label="Open menu">{open ? <X size={17} /> : <Menu size={17} />}</button>
          </div>
        </div>
        {open && (
          <div className="sv2-wrap sv2-mobile-menu">
            <AppEntry role="customer" className="sv2-btn sv2-btn-gold sv2-full">Customer App <ArrowRight size={12} /></AppEntry>
            <AppEntry role="partner" className="sv2-btn sv2-btn-outline sv2-full">Partner App</AppEntry>
          </div>
        )}
      </header>
    </>
  )
}

function ProductPreview() {
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  useEffect(() => {
    const t = window.setInterval(() => setIndex((v) => (v + 1) % slides.length), 4200)
    return () => window.clearInterval(t)
  }, [])

  const move = (direction) => setIndex((v) => (v + direction + slides.length) % slides.length)

  return (
    <div className="sv2-product">
      <div className="sv2-product-frame">
        <div className="sv2-product-image"><img src={slide.image} alt="" /><div className="sv2-product-image-shade" /></div>
        <div className="sv2-product-info">
          <span className="sv2-overline">{slide.eyebrow}</span>
          <h3>{slide.title}</h3>
          <p>{slide.text}</p>
          <div className="sv2-product-signals">
            <span><Users size={11} /> Services connected</span>
            <span><Truck size={11} /> Movement connected</span>
          </div>
          <div className="sv2-product-nav">
            <button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button>
            <span>{index + 1} / {slides.length}</span>
            <button type="button" onClick={() => move(1)} aria-label="Next slide">→</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="sv2-hero">
      <div className="sv2-wrap sv2-hero-inner">
        <div className="sv2-hero-copy">
          <span className="sv2-overline sv2-overline-light">SAMBRAMO</span>
          <h1>Everything behind your event.<br /><em>Connected.</em></h1>
          <p>Sambramo connects event services, partners and logistics into one simple experience — launching in Bengaluru.</p>
          <div className="sv2-hero-actions">
            <AppEntry role="customer" className="sv2-btn sv2-btn-gold">Customer App <ArrowRight size={14} /></AppEntry>
            <AppEntry role="partner" className="sv2-btn sv2-btn-ghost-light">Partner App</AppEntry>
          </div>
          <div className="sv2-trust"><span><Check size={11} /> Built around the event</span><span><Check size={11} /> Customer + partner journeys</span></div>
        </div>
        <ProductPreview />
      </div>
    </section>
  )
}

function LaunchExplainer() {
  return (
    <section className="sv2-section sv2-compact">
      <div className="sv2-wrap">
        <div className="sv2-section-title">
          <div><span className="sv2-overline">WHAT SAMBRAMO SOLVES</span><h2>Too many moving pieces.<br />One simpler journey.</h2></div>
          <p>Finding services, coordinating partners and managing event movement can feel fragmented. Sambramo is being built to connect the journey underneath one experience.</p>
        </div>
        <div className="sv2-solution-grid">
          <article><span>01</span><h3>Discover</h3><p>Find the event services that fit your occasion.</p></article>
          <article><span>02</span><h3>Connect</h3><p>Bring customer, partner and event context together.</p></article>
          <article><span>03</span><h3>Move</h3><p>Keep people, goods and logistics tied to event day.</p></article>
        </div>
      </div>
    </section>
  )
}

function Trades() {
  return (
    <section className="sv2-section sv2-trades-section">
      <div className="sv2-wrap">
        <div className="sv2-section-title sv2-section-title-tight">
          <div><span className="sv2-overline">THE EVENT SUPPLY CHAIN</span><h2>From the first requirement<br />to the final movement.</h2></div>
          <p>Core event trades can plug into the same Sambramo journey.</p>
        </div>
        <div className="sv2-trade-list">{trades.map((trade) => <span key={trade}>{trade}</span>)}</div>
      </div>
    </section>
  )
}

function FAQ() {
  const items = [
    ['What is Sambramo?', 'A connected event services, partner and logistics experience designed around the journey of an event.'],
    ['Where is Sambramo launching?', 'Sambramo is launching in Bengaluru first.'],
    ['When will the apps be available?', 'The customer and partner app experiences are coming soon on Google Play and the App Store.'],
    ['Who can use Sambramo?', 'Customers planning events and the event-service and logistics partners who support them.'],
  ]
  return (
    <section className="sv2-section sv2-faq-section">
      <div className="sv2-wrap">
        <div className="sv2-section-title sv2-section-title-tight"><div><span className="sv2-overline">FAQ</span><h2>Sambramo, simply explained.</h2></div></div>
        <div className="sv2-faq">
          {items.map(([question, answer]) => (
            <details key={question}><summary>{question}<ChevronDown size={13} /></summary><p>{answer}</p></details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="sv2-final">
      <div className="sv2-wrap sv2-final-inner">
        <div>
          <span className="sv2-overline sv2-overline-light">SAMBRAMO · BENGALURU</span>
          <h2>Stay tuned.<br />The experience is coming.</h2>
          <p>Customer App and Partner App are being prepared for launch.</p>
        </div>
        <div className="sv2-final-actions">
          <AppEntry role="customer" className="sv2-btn sv2-btn-gold">Customer App <ArrowRight size={13} /></AppEntry>
          <AppEntry role="partner" className="sv2-btn sv2-btn-ghost-light">Partner App</AppEntry>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="sv2-footer">
      <div className="sv2-wrap sv2-footer-grid">
        <div>
          <Brand />
          <p>Sambramo connects event services, partners and logistics into one experience.</p>
        </div>
        <div>
          <span className="sv2-footer-title">Explore</span>
          <a href="#top">What is Sambramo</a>
          <a href="#solutions">How it works</a>
          <a href="#faq">FAQs</a>
        </div>
        <div>
          <span className="sv2-footer-title">Contact</span>
          <a href="mailto:hello@sambramo.com">hello@sambramo.com</a>
          <span className="sv2-footer-muted">Bengaluru, India</span>
        </div>
      </div>
      <div className="sv2-wrap sv2-footer-bottom">
        <span>© {new Date().getFullYear()} Sambramo. All rights reserved.</span>
        <span>Google Play &amp; App Store — coming soon</span>
      </div>
    </footer>
  )
}

export default function PublicSite() {
  return (
    <div className="sv2-site">
      <Header />
      <main>
        <Hero />
        <LaunchExplainer />
        <Trades />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
