// Vercel deploy trigger — deploy current Sambramo public-site state
import { useEffect, useState } from 'react'
import './sam-launch-v2.css'

const slides = [
  ['CUSTOMER APP', 'Discover the services your event needs.', 'Find venues, food, decor, photography and more around one event.', 'Discover'],
  ['PARTNER APP', 'See the right event demand in one place.', 'Get the event context, timing and requirements you need to respond.', 'Connect'],
  ['CONNECTED MOVEMENT', 'Keep services and logistics moving together.', 'People, goods and last-mile coordination stay tied to the event.', 'Move'],
]

const trades = [
  'Venues', 'Catering', 'Decor', 'Photography', 'Music', 'Artists',
  'Beauty', 'Transport', 'Logistics', 'Furniture', 'Flowers', 'Gifting',
  'Invites', 'Mehendi', 'Staffing', 'Packaging',
]

function Brand() {
  return (
    <a className="sv2-brand" href="/" aria-label="Sambramo home">
      <span className="sv2-brand-name">SAMBRAMO</span>
      <span className="sv2-brand-sub">EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </a>
  )
}

function InterestModal({ role, close }) {
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

      if (!response.ok) throw new Error('request failed')
      setDone(true)
    } catch {
      setError('We could not save your interest right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="sv2-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="sv2-modal">
        <div className="sv2-modal-head">
          <button type="button" className="sv2-modal-close" onClick={close} aria-label="Close">×</button>
          <span className="sv2-overline sv2-overline-light">
            {role === 'partner' ? 'PARTNER APP' : 'CUSTOMER APP'} · COMING SOON
          </span>
          <h2>{role === 'partner' ? 'Partner App is opening soon.' : 'Customer App is opening soon.'}</h2>
          <p>Sambramo is launching in Bengaluru first. Leave your details and we will notify you when the app experience opens.</p>
        </div>

        {done ? (
          <div className="sv2-modal-body">
            <div className="sv2-success-icon">✓</div>
            <h3>Interest captured.</h3>
            <p>We will use your details for Sambramo launch communication.</p>
            <button type="button" className="sv2-btn sv2-btn-purple" onClick={close}>Done</button>
          </div>
        ) : (
          <form className="sv2-modal-body" onSubmit={submit}>
            <div className="sv2-role">
              <span>JOINING AS</span>
              <b>{role === 'partner' ? 'PARTNER' : 'CUSTOMER'}</b>
            </div>

            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Mobile <em>optional</em>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91"
              />
            </label>

            {error && <div className="sv2-error">{error}</div>}

            <button className="sv2-btn sv2-btn-purple sv2-full" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Capture my interest'}
              <span aria-hidden="true">→</span>
            </button>

            <div className="sv2-form-note">Launch updates only.</div>
          </form>
        )}
      </div>
    </div>
  )
}

function AppEntry({ role, children, className }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <InterestModal role={role} close={() => setOpen(false)} />}
    </>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

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
            <AppEntry role="customer" className="sv2-btn sv2-btn-gold sv2-desktop">Customer App →</AppEntry>
            <button
              type="button"
              className="sv2-menu"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open menu"
            >
              {menuOpen ? '×' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="sv2-wrap sv2-mobile-menu">
            <AppEntry role="customer" className="sv2-btn sv2-btn-gold sv2-full">Customer App →</AppEntry>
            <AppEntry role="partner" className="sv2-btn sv2-btn-outline sv2-full">Partner App</AppEntry>
          </div>
        )}
      </header>
    </>
  )
}

function ProductPreview() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slides.length)
    }, 4200)

    return () => window.clearInterval(timer)
  }, [])

  const slide = slides[index]

  return (
    <div className="sv2-product">
      <div className="sv2-product-frame">
        <div className="sv2-product-visual">
          <div className="sv2-product-visual-label">{slide[0]}</div>
          <div className="sv2-product-visual-title">{slide[3]}</div>
        </div>

        <div className="sv2-product-info">
          <span className="sv2-overline">{slide[0]}</span>
          <h3>{slide[1]}</h3>
          <p>{slide[2]}</p>

          <div className="sv2-product-signals">
            <span>Services connected</span>
            <span>Movement connected</span>
          </div>

          <div className="sv2-product-nav">
            <button type="button" onClick={() => setIndex((index + slides.length - 1) % slides.length)} aria-label="Previous">←</button>
            <span>{index + 1} / {slides.length}</span>
            <button type="button" onClick={() => setIndex((index + 1) % slides.length)} aria-label="Next">→</button>
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
            <AppEntry role="customer" className="sv2-btn sv2-btn-gold">Customer App →</AppEntry>
            <AppEntry role="partner" className="sv2-btn sv2-btn-ghost-light">Partner App</AppEntry>
          </div>

          <div className="sv2-trust">
            <span>Built around the event</span>
            <span>Customer + partner journeys</span>
          </div>
        </div>

        <ProductPreview />
      </div>
    </section>
  )
}

function LaunchExplainer() {
  return (
    <section className="sv2-section sv2-compact" id="solutions">
      <div className="sv2-wrap">
        <div className="sv2-section-title">
          <div>
            <span className="sv2-overline">WHAT SAMBRAMO SOLVES</span>
            <h2>Too many moving pieces.<br />One simpler journey.</h2>
          </div>
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
        <div className="sv2-section-title">
          <div>
            <span className="sv2-overline">THE EVENT SUPPLY CHAIN</span>
            <h2>From the first requirement<br />to the final movement.</h2>
          </div>
          <p>Core event trades can plug into the same Sambramo journey.</p>
        </div>

        <div className="sv2-trade-list">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
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
    <section className="sv2-section sv2-faq-section" id="faq">
      <div className="sv2-wrap">
        <div className="sv2-section-title">
          <div>
            <span className="sv2-overline">FAQ</span>
            <h2>Sambramo, simply explained.</h2>
          </div>
        </div>

        <div className="sv2-faq">
          {items.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<span>⌄</span></summary>
              <p>{answer}</p>
            </details>
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
          <AppEntry role="customer" className="sv2-btn sv2-btn-gold">Customer App →</AppEntry>
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
    <div className="sv2-site" id="top">
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
