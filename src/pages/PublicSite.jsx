
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleCheck, Menu, ShieldCheck, Truck, Users, X } from 'lucide-react'
import '../sam-launch.css'

const slides = [
  { kicker: 'CUSTOMER EXPERIENCE', title: 'Find what your event needs.', text: 'Start with an occasion. Discover relevant services and move forward without managing disconnected vendors.', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=86', label: 'Discover' },
  { kicker: 'CONNECTED BRIEF', title: 'Keep the whole event in view.', text: 'Your services, timing, people and movement stay connected to the same event context.', image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=86', label: 'Connect' },
  { kicker: 'PARTNER EXPERIENCE', title: 'Give partners the right context.', text: 'Event partners see the demand, scope and timing they need to respond and deliver.', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=86', label: 'Coordinate' },
  { kicker: 'MOVEMENT', title: 'Keep delivery tied to event day.', text: 'People, goods and last-mile movement are part of the same journey — not an afterthought.', image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=86', label: 'Move' },
]

const trades = ['Venues', 'Catering', 'Decor', 'Photography', 'Music', 'Artists', 'Beauty', 'Transport', 'Logistics', 'Furniture', 'Gifting', 'Staffing', 'Flowers', 'Invites', 'Mehendi', 'Packaging']

function Brand({ light = false }) {
  return (
    <a href="/" className="sam-brand">
      <span className="sam-brand-mark">S</span>
      <span>
        <span className="sam-brand-name" style={light ? { color: '#fff' } : undefined}>SAMBRAMO</span>
        <span className="sam-brand-sub" style={light ? { color: 'rgba(255,255,255,.45)' } : undefined}>EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
      </span>
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
      setError('Could not save your interest right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="sam-modal-back" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sam-modal">
        <div className="sam-modal-head">
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
          <span className="sam-eyebrow">{role === 'partner' ? 'PARTNER APP' : 'CUSTOMER APP'} · COMING SOON</span>
          <h3>{role === 'partner' ? 'Join the Sambramo partner launch.' : 'Join the Sambramo customer launch.'}</h3>
          <p>We are preparing the first Sambramo launch in Bengaluru.</p>
        </div>
        {done ? (
          <div className="sam-modal-success">
            <div className="sam-success-icon"><CircleCheck size={20} /></div>
            <h4>Interest captured.</h4>
            <p>We’ll contact you when the relevant Sambramo app experience is ready.</p>
            <button className="sam-btn sam-btn-purple" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="sam-modal-form" onSubmit={submit}>
            <div className="sam-role"><span>JOINING AS</span><b>{role === 'partner' ? 'PARTNER' : 'CUSTOMER'}</b></div>
            <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Mobile <span style={{ color: '#A298AA', fontWeight: 600 }}>optional</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" /></label>
            {error && <div style={{ marginTop: 9, borderRadius: 9, padding: 9, background: '#FFF1F1', color: '#9B3A40', fontSize: 8, fontWeight: 800 }}>{error}</div>}
            <button disabled={busy} className="sam-btn sam-btn-purple" style={{ width: '100%', marginTop: 14 }}>{busy ? 'Saving…' : 'Capture my interest'} <ArrowRight size={14} /></button>
            <div className="sam-modal-note"><ShieldCheck size={11} /> Used only for Sambramo launch communication.</div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

function LaunchButton({ role = 'customer', children, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && <InterestModal role={role} onClose={() => setOpen(false)} />}
    </>
  )
}

function Header() {
  const [mobile, setMobile] = useState(false)
  return (
    <>
      <div className="sam-topbar"><div className="sam-wrap sam-topbar-inner">Soon on <b>Google Play</b> &amp; <b>iOS</b> for the best Sambramo experience.</div></div>
      <header className="sam-header">
        <div className="sam-wrap sam-header-inner">
          <Brand />
          <nav className="sam-head-actions">
            <a href="/login" className="sam-btn sam-btn-outline sam-desktop">Partner App</a>
            <a href="/app" className="sam-btn sam-btn-gold sam-desktop">Customer App <ArrowRight size={12} /></a>
            <LaunchButton className="sam-btn sam-capture sam-desktop">Capture Interest</LaunchButton>
            <button className="sam-menu" onClick={() => setMobile((v) => !v)} aria-label="Menu">{mobile ? <X size={17} /> : <Menu size={17} />}</button>
          </nav>
        </div>
        {mobile && <div className="sam-wrap sam-mobile">
          <a href="/app" className="sam-btn sam-btn-gold">Customer App <ArrowRight size={12} /></a>
          <a href="/login" className="sam-btn sam-btn-outline">Partner App</a>
          <LaunchButton className="sam-btn sam-capture">Capture Interest</LaunchButton>
        </div>}
      </header>
    </>
  )
}

function Hero() {
  return (
    <section className="sam-hero">
      <div className="sam-wrap sam-hero-inner">
        <div>
          <span className="sam-eyebrow">WHAT IS SAMBRAMO?</span>
          <h1>Everything behind a celebration, <em>connected.</em></h1>
          <p className="sam-hero-copy">Sambramo is building one connected experience for event services, partners and logistics — so people can spend more time on the occasion and less time coordinating everything behind it.</p>
          <div className="sam-hero-actions">
            <a href="/app" className="sam-btn sam-btn-gold">Open Customer App <ArrowRight size={14} /></a>
            <a href="/login" className="sam-btn" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.16)' }}>Open Partner App</a>
            <LaunchButton className="sam-btn" style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.16)' }}>Capture Interest</LaunchButton>
          </div>
          <div className="sam-hero-facts">
            <span><Check size={11} /> Built for the event supply chain</span>
            <span><Check size={11} /> Launching in Bengaluru</span>
            <span><Check size={11} /> Customer + partner apps</span>
          </div>
        </div>
        <ProductCarousel />
      </div>
    </section>
  )
}

function ProductCarousel() {
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  useEffect(() => {
    const timer = setInterval(() => setIndex((v) => (v + 1) % slides.length), 4200)
    return () => clearInterval(timer)
  }, [])

  function move(next) { setIndex((index + next + slides.length) % slides.length) }

  return (
    <div className="sam-phone-stage">
      <div className="sam-phone">
        <div className="sam-phone-notch" />
        <div className="sam-phone-screen">
          <div className="sam-phone-visual"><img src={slide.image} alt="" /><div className="sam-phone-caption"><span>{slide.kicker}</span><strong>{slide.title}</strong></div></div>
          <div className="sam-phone-body">
            <div className="sam-phone-top"><div><span>SAMBRAMO</span><b>{slide.label}</b></div><span className="sam-avatar">S</span></div>
            <div className="sam-phone-card"><small>PRODUCT EXPERIENCE</small><strong>{slide.label} the journey</strong><p style={{ margin: 0, color: '#776D83', fontSize: 8, lineHeight: 1.5 }}>{slide.text}</p></div>
            <div className="sam-phone-list">
              <div className="sam-phone-row"><span><Users size={11} /> People &amp; services</span><small>Connected</small></div>
              <div className="sam-phone-row"><span><Truck size={11} /> Movement &amp; logistics</span><small>In context</small></div>
            </div>
            <div className="sam-phone-footer"><button onClick={() => move(-1)} aria-label="Previous"><ArrowLeft size={11} /></button><span>{index + 1} / {slides.length}</span><button onClick={() => move(1)} aria-label="Next"><ArrowRight size={11} /></button></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompactBody() {
  return (
    <>
      <section className="sam-section compact">
        <div className="sam-wrap">
          <div className="sam-section-head"><div><span className="sam-eyebrow">THE PROBLEM → THE SOLUTION</span><h2>Too many moving pieces.<br />One connected place.</h2></div><p>Finding services, coordinating partners, managing movement and keeping the event on track can become fragmented. Sambramo is designed to connect those pieces.</p></div>
          <div className="sam-problem-grid">
            <div className="sam-problem"><b>Finding services</b><p>Discover the right event services without starting every task from zero.</p></div>
            <div className="sam-problem"><b>Coordinating people</b><p>Keep customer, partner and event context together instead of across scattered conversations.</p></div>
            <div className="sam-problem solution"><b>Sambramo connects the journey</b><p>One experience across discovery, partner coordination and movement toward event day.</p></div>
          </div>
        </div>
      </section>

      <section className="sam-highlight sam-section compact">
        <div className="sam-wrap">
          <div className="sam-section-head"><div><span className="sam-eyebrow">THE TRADES WE COVER</span><h2>Built across the event supply chain.</h2></div><p>Start with the services that matter to your occasion. More categories can plug into the same network.</p></div>
          <div className="sam-service-chips">{trades.map((trade) => <span className="sam-service-chip" key={trade}>{trade}</span>)}</div>
        </div>
      </section>

      <section className="sam-section compact">
        <div className="sam-wrap">
          <div className="sam-section-head"><div><span className="sam-eyebrow">WHY IT EXISTS</span><h2>Simple on the outside.<br />Connected underneath.</h2></div><p>That is the Sambramo idea: make the customer journey feel simple while the event supply chain works behind it.</p></div>
          <div className="sam-journey">
            <div className="sam-step"><i>01</i><h4>Discover</h4><p>See the services and partners relevant to your event.</p></div>
            <div className="sam-step"><i>02</i><h4>Connect</h4><p>Keep the people and requirements tied to one event context.</p></div>
            <div className="sam-step"><i>03</i><h4>Move</h4><p>Bring transport, delivery and logistics into the same journey.</p></div>
          </div>
        </div>
      </section>

      <section className="sam-section compact">
        <div className="sam-wrap">
          <div className="sam-section-head"><div><span className="sam-eyebrow">FAQ</span><h2>Before you enter Sambramo.</h2></div></div>
          <div className="sam-faq">
            <details><summary>What is Sambramo? <ChevronDown size={12} /></summary><p>Sambramo is a connected event services, partner and logistics experience designed around the journey of an event.</p></details>
            <details><summary>When is Sambramo launching? <ChevronDown size={12} /></summary><p>The first launch is planned for Bengaluru, with the customer and partner app experiences coming soon on Google Play and iOS.</p></details>
            <details><summary>Who is the Customer App for? <ChevronDown size={12} /></summary><p>For people planning celebrations and events who want a simpler way to discover services and move through the event journey.</p></details>
            <details><summary>Who is the Partner App for? <ChevronDown size={12} /></summary><p>For event service providers and logistics partners participating in the Sambramo network.</p></details>
          </div>
        </div>
      </section>
    </>
  )
}

function LaunchCTA() {
  return (
    <section className="sam-bottom">
      <div className="sam-wrap sam-bottom-inner">
        <div><span className="sam-eyebrow" style={{ color: '#D7C5E5' }}>SAMBRAMO · BENGALURU</span><h2>Be there when the journey opens.</h2><p>Choose the app you are waiting for, or leave your details and we’ll capture your interest for launch.</p></div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <a href="/app" className="sam-btn sam-btn-gold">Customer App <ArrowRight size={13} /></a>
          <a href="/login" className="sam-btn" style={{ background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.16)' }}>Partner App</a>
          <LaunchButton className="sam-btn" style={{ background:'transparent',color:'#fff',border:'1px solid rgba(255,255,255,.2)' }}>Capture Interest</LaunchButton>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return <footer className="sam-footer"><div className="sam-wrap sam-footer-inner"><Brand light /><span>© {new Date().getFullYear()} Sambramo · <b>Launching soon in Bengaluru</b></span></div></footer>
}

export default function PublicSite() {
  return <div className="sam-launch"><Header /><main><Hero /><div className="sam-rail"><div className="sam-wrap sam-rail-inner"><strong>Sambramo</strong><span>Discover · connect · coordinate · move</span></div></div><CompactBody /><LaunchCTA /></main><Footer /></div>
}
