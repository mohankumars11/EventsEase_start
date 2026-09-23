import { useMemo, useState } from 'react'
import {
  ArrowRight, ChevronRight, Search, Menu, X, Play, ShieldCheck,
  Truck, PackageCheck, Users, CreditCard, Route, CheckCircle2,
  Sparkles, CalendarDays, MapPin, Star, Instagram, Linkedin,
  Youtube, MessageCircle, Clock3, Heart, Send, WalletCards
} from 'lucide-react'

const BRAND = 'SAMBRAMO'
const TAGLINE = 'Event Supply Chain and Logistics'

const EVENT_TYPES = [
  ['Wedding', '💍'],
  ['Corporate', '🏢'],
  ['Birthday', '🎂'],
  ['Social Events', '🎉'],
  ['Religious', '🪔'],
  ['All Services', '✦'],
]

const SERVICES = [
  ['Decoration & Setup', 'Stages, flowers and styling.', '✦'],
  ['Catering', 'Food, menus and live counters.', '♨'],
  ['Photography', 'Photo, video and memories.', '◉'],
  ['Venue', 'Spaces for every occasion.', '⌂'],
  ['Logistics', 'Supplies moving to the venue.', '▣'],
  ['Supplies', 'Products and event essentials.', '□'],
  ['Entertainment', 'Music, anchors and experiences.', '♪'],
  ['Invitations', 'Invites, gifting and essentials.', '◇'],
]

const SEARCH_ITEMS = [
  ...EVENT_TYPES.map(([title, icon]) => ({ title, description: 'Explore connected event services.', icon })),
  ...SERVICES.map(([title, description, icon]) => ({ title, description, icon })),
]

const WORKFLOW = [
  ['01', 'You Plan', 'Tell us what you need.', CalendarDays],
  ['02', 'We Connect', 'Verified service providers.', Users],
  ['03', 'Suppliers Prepare', 'Materials and essentials.', PackageCheck],
  ['04', 'Logistics Moves', 'On-time and tracked.', Truck],
  ['05', 'Your Event Happens', 'Beautifully, stress-free.', CheckCircle2],
]

const IMAGES = {
  wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=88',
  venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=88',
  celebration: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=88',
  people: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=88',
  catering: 'https://images.unsplash.com/photo-1540317580384-e5d43867c8c4?auto=format&fit=crop&w=1000&q=88',
}

function AppHandoff({ open, onClose }) {
  if (!open) return null
  const roles = [
    ['Customer', 'Discover and plan your event.', Users],
    ['Event Provider', 'Connect your service to events.', Sparkles],
    ['Logistics Partner', 'Move supplies and coordinate venue entry.', Truck],
    ['Supplier', 'Connect inventory to the event supply chain.', PackageCheck],
  ]

  return (
    <div className="sam-modal-backdrop" role="dialog" aria-modal="true" aria-label="Choose your SAMBRAMO experience">
      <div className="sam-modal">
        <div className="sam-modal-head">
          <div>
            <span className="sam-mini-label">SAMBRAMO</span>
            <h3>Choose your experience</h3>
          </div>
          <button className="sam-icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <div className="sam-role-grid">
          {roles.map(([title, desc, Icon]) => (
            <button key={title} className="sam-role-card" onClick={onClose}>
              <span className="sam-role-icon"><Icon size={19} /></span>
              <b>{title}</b>
              <small>{desc}</small>
              <span className="sam-role-link">Continue <ArrowRight size={13} /></span>
            </button>
          ))}
        </div>
        <p className="sam-modal-note">App links can be connected here when the customer, partner and supplier apps are released.</p>
      </div>
    </div>
  )
}

function SearchBox({ query, setQuery, onExplore }) {
  const recommendations = useMemo(() => {
    if (query.trim().length < 2) return []
    return SEARCH_ITEMS
      .filter(item => (item.title + ' ' + item.description).toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
  }, [query])

  return (
    <div className="sam-search-wrap">
      <Search size={17} />
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search services (e.g. wedding, catering, logistics...)"
        aria-label="Search services"
      />
      <button onClick={onExplore} aria-label="Explore"><ArrowRight size={18} /></button>
      {recommendations.length > 0 && (
        <div className="sam-search-results">
          {recommendations.map(item => (
            <button key={item.title} onClick={() => setQuery(item.title)}>
              <span>{item.icon}</span>
              <span><b>{item.title}</b><small>{item.description}</small></span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="sam-hero-card">
      <div className="sam-hero-image" />
      <div className="sam-hero-image-shade" />
      <div className="sam-hero-story">
        <span className="sam-script">Make<br />Moments<br />Happen</span>
        <button><span className="sam-play"><Play size={12} fill="currentColor" /></span> Watch our story</button>
      </div>
      <div className="sam-live-chip"><span /> <b>Connected</b><small>Customer → Provider → Supply → Logistics</small></div>
    </div>
  )
}

function Workflow() {
  return (
    <div className="sam-workflow">
      {WORKFLOW.map(([number, title, subtitle, Icon], index) => (
        <article className="sam-work-card" key={number}>
          <div className="sam-work-image" style={{ backgroundImage: 'url(' + [IMAGES.people, IMAGES.venue, IMAGES.catering, IMAGES.wedding, IMAGES.celebration][index] + ')' }}>
            <span>{number}</span>
          </div>
          <div className="sam-work-body">
            <span className="sam-work-icon"><Icon size={16} /></span>
            <div><h3>{title}</h3><p>{subtitle}</p></div>
          </div>
        </article>
      ))}
    </div>
  )
}

function LiveSupplyChain() {
  const steps = [
    ['Supplier Preparing', 'Decor items ready', PackageCheck],
    ['In Transit', 'On the way to venue', Truck],
    ['Out for Delivery', 'Arriving soon', Route],
    ['Venue Reached', 'Setup in progress', MapPin],
  ]

  return (
    <div className="sam-chain-card">
      <div className="sam-chain-head"><span><i /> LIVE EVENT SUPPLY CHAIN</span><b>CONNECTED</b></div>
      <div className="sam-chain-visual">
        <div className="sam-city-glow" />
        <div className="sam-truck-visual"><Truck size={54} /></div>
        <div className="sam-route route-a" />
        <div className="sam-route route-b" />
        <div className="sam-map-pin pin-a"><PackageCheck size={15} /></div>
        <div className="sam-map-pin pin-b"><MapPin size={15} /></div>
      </div>
      <div className="sam-chain-steps">
        {steps.map(([title, status, Icon], index) => (
          <div key={title} className="sam-chain-step">
            <span className="sam-chain-icon"><Icon size={16} /></span>
            <div><b>{title}</b><small>{status}</small></div>
            {index < steps.length - 1 && <span className="sam-chain-line" />}
          </div>
        ))}
      </div>
      <small className="sam-disclaimer">Product visualization. Live GPS and operational status will connect inside the SAMBRAMO apps.</small>
    </div>
  )
}

function ReviewSection({ reviews, setReviews }) {
  const [form, setForm] = useState({ name: '', city: '', eventType: '', review: '', rating: 0 })
  const [submitted, setSubmitted] = useState(false)

  const submitReview = event => {
    event.preventDefault()
    if (!form.name.trim() || !form.city.trim() || !form.eventType || !form.review.trim() || !form.rating) return
    setReviews(current => [...current, {
      ...form,
      id: Date.now(),
      name: form.name.trim(),
      city: form.city.trim(),
      review: form.review.trim(),
    }])
    setForm({ name: '', city: '', eventType: '', review: '', rating: 0 })
    setSubmitted(true)
  }

  return (
    <section className="sam-section sam-reviews" id="reviews">
      <div className="sam-container">
        <div className="sam-section-heading">
          <div>
            <p className="sam-overline">AUTHENTIC REVIEWS</p>
            <h2>Real experiences.<br />No invented testimonials.</h2>
          </div>
          <p>Only reviews submitted through this experience are shown. The initial pool is intentionally empty.</p>
        </div>

        <div className="sam-review-layout">
          <div>
            {reviews.length === 0 ? (
              <div className="sam-review-empty">
                <div className="sam-review-mark"><Star size={22} /></div>
                <div>
                  <b>Your first verified experience can appear here.</b>
                  <p>There are currently no published reviews. We will never populate this section with fabricated customer stories.</p>
                </div>
              </div>
            ) : (
              <div className="sam-testimonial-list">
                {reviews.map(item => (
                  <article className="sam-testimonial" key={item.id}>
                    <div className="sam-review-top">
                      <span className="sam-review-avatar">{item.name.charAt(0).toUpperCase()}</span>
                      <div><b>{item.name}</b><small>{item.city} · {item.eventType}</small></div>
                      <div className="sam-stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={i < item.rating ? 'currentColor' : 'none'} />)}</div>
                    </div>
                    <p>“{item.review}”</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <form className="sam-review-form" onSubmit={submitReview}>
            <div>
              <p className="sam-overline">SHARE YOUR SAMBRAMO EXPERIENCE</p>
              <h3>Tell us what actually happened.</h3>
              <p className="sam-form-note">Your review is added to this page immediately in this session.</p>
            </div>
            <div className="sam-form-stars" aria-label="Select rating">
              {Array.from({ length: 5 }, (_, i) => (
                <button key={i} type="button" aria-label={'Rate ' + (i + 1) + ' stars'} className={i < form.rating ? 'active' : ''} onClick={() => setForm(value => ({ ...value, rating: i + 1 }))}>
                  <Star size={23} fill={i < form.rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <div className="sam-form-grid">
              <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder="Your name" required />
              <input value={form.city} onChange={e => setForm(v => ({ ...v, city: e.target.value }))} placeholder="City" required />
              <select value={form.eventType} onChange={e => setForm(v => ({ ...v, eventType: e.target.value }))} required>
                <option value="">Event type</option>
                {EVENT_TYPES.filter(([title]) => title !== 'All Services').map(([title]) => <option key={title}>{title}</option>)}
              </select>
              <textarea value={form.review} onChange={e => setForm(v => ({ ...v, review: e.target.value }))} placeholder="Write your actual experience..." rows={5} required />
            </div>
            <button className="sam-primary" type="submit"><Send size={15} /> Submit Review</button>
            {submitted && <p className="sam-success"><CheckCircle2 size={14} /> Review added to the active testimonial pool.</p>}
          </form>
        </div>

        <div className="sam-review-process">
          <div><span>01</span><b>Complete an event</b><small>Use SAMBRAMO for your event journey.</small></div>
          <div><span>02</span><b>Verify your booking</b><small>Production can connect this to booking verification.</small></div>
          <div><span>03</span><b>Share your experience</b><small>Approved reviews can become public testimonials.</small></div>
        </div>
      </div>
    </section>
  )
}

export default function SumramoProductHome() {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const [reviews, setReviews] = useState([])

  const scrollTo = id => {
    setMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sambramo-site">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap');

        .sambramo-site{--purple:#7c3aed;--violet:#a855f7;--pink:#ec4899;--deep:#210638;--ink:#12031f;--soft:#f7f4fb;font-family:'Manrope',sans-serif;background:var(--deep);color:#fff;min-height:100vh;overflow:hidden}
        .sambramo-site *{box-sizing:border-box}.sambramo-site button,.sambramo-site input{font:inherit}.sambramo-site button{cursor:pointer}
        .sam-container{width:min(1280px,calc(100% - 44px));margin:auto}
        .sam-site-header{position:sticky;top:0;z-index:80;background:rgba(18,3,31,.88);border-bottom:1px solid rgba(255,255,255,.07);backdrop-filter:blur(22px)}
        .sam-header-inner{width:min(1280px,calc(100% - 44px));min-height:70px;margin:auto;display:flex;align-items:center;gap:28px}
        .sam-wordmark{border:0;background:none;color:#fff;padding:0;font-size:18px;font-weight:900;letter-spacing:.25em}.sam-wordmark span{display:block}
        .sam-desktop-nav{display:flex;align-items:center;gap:25px;margin-left:auto}.sam-desktop-nav button{border:0;background:none;color:rgba(255,255,255,.62);font-size:10px;font-weight:800}.sam-desktop-nav button:hover{color:#fff}
        .sam-header-actions{display:flex;align-items:center;gap:9px}.sam-search-trigger,.sam-mobile-menu,.sam-icon-button{display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;border-radius:12px;width:38px;height:38px}.sam-mobile-menu{display:none}
        .sam-primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:14px;padding:13px 18px;background:linear-gradient(135deg,#8b3dff,#6d28d9);color:#fff;font-size:10px;font-weight:900;box-shadow:0 12px 30px rgba(124,58,237,.27)}.sam-primary.small{padding:10px 14px}

        .sam-brand-lockup{display:flex;align-items:center;gap:8px;border:0;background:none;color:#fff;padding:0;font-size:17px;font-weight:900;letter-spacing:.2em}.sam-infinity{font-size:27px;line-height:1;color:#e879f9;text-shadow:0 0 18px rgba(232,121,249,.7)}
        .sam-review-layout{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:30px}.sam-testimonial-list{display:grid;gap:8px}.sam-testimonial{padding:18px;border:1px solid #e7e0ef;border-radius:18px;background:#fff}.sam-review-top{display:flex;align-items:center;gap:8px}.sam-review-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#efe7ff;color:#6d28d9;font-weight:900}.sam-review-top b,.sam-review-top small{display:block}.sam-review-top b{font-size:10px}.sam-review-top small{margin-top:2px;color:#8b8194;font-size:8px}.sam-review-top .sam-stars{margin-left:auto}.sam-testimonial>p{margin:14px 0 0;color:#4a4052;font-size:10px;line-height:1.7}.sam-review-form{padding:21px;border:1px solid #e1d6ee;border-radius:21px;background:#fff;box-shadow:0 15px 40px rgba(61,20,91,.07)}.sam-review-form h3{margin:0;font-size:20px}.sam-form-note{margin:5px 0 0;color:#8b8194;font-size:8px;line-height:1.5}.sam-form-stars{display:flex;gap:3px;margin:18px 0 13px}.sam-form-stars button{border:0;background:none;padding:3px;color:#b8adbf}.sam-form-stars button.active{color:#f59e0b;transform:scale(1.08)}.sam-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.sam-form-grid input,.sam-form-grid select,.sam-form-grid textarea{width:100%;border:1px solid #e3dbea;border-radius:12px;background:#fbf9fd;color:#24172c;padding:11px;font-size:9px;outline:none}.sam-form-grid input:focus,.sam-form-grid select:focus,.sam-form-grid textarea:focus{border-color:#a78bfa;box-shadow:0 0 0 3px rgba(139,92,246,.08)}.sam-form-grid textarea{grid-column:1/-1;resize:vertical}.sam-review-form>.sam-primary{margin-top:10px}.sam-success{display:flex;align-items:center;gap:5px;color:#15803d;font-size:8px}.sam-metrics{background:#12031f;color:#fff}.sam-metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:30px}.sam-metric-grid>div{padding:20px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.045);box-shadow:inset 0 0 35px rgba(139,92,246,.05)}.sam-metric-grid b,.sam-metric-grid span{display:block}.sam-metric-grid b{font-size:27px;letter-spacing:-.04em;background:linear-gradient(90deg,#fff,#c084fc);-webkit-background-clip:text;color:transparent}.sam-metric-grid span{margin-top:4px;color:rgba(255,255,255,.43);font-size:8px}.sam-footer-infinity{color:#e879f9;font-size:23px;text-shadow:0 0 15px rgba(232,121,249,.6)}

        .sam-mobile-nav{display:none}
        .sam-hero{position:relative;background:var(--deep);padding:44px 0 26px}.sam-hero-bg{position:absolute;inset:0;background:radial-gradient(circle at 80% 15%,rgba(168,85,247,.2),transparent 30%),radial-gradient(circle at 20% 60%,rgba(124,58,237,.12),transparent 32%);pointer-events:none}
        .sam-hero-grid{position:relative;display:grid;grid-template-columns:.88fr 1.12fr;gap:35px;align-items:center;min-height:650px}.sam-hero-copy{padding:20px 0}
        .sam-eyebrow{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.045);color:#ddd0ff;font-size:8px;font-weight:900;letter-spacing:.12em}.sam-eyebrow span{color:#e879f9}
        .sam-hero h1{margin:22px 0 0;font-size:clamp(54px,6vw,86px);line-height:.91;letter-spacing:-.065em;font-weight:900}.sam-hero h1 em{font-style:normal;background:linear-gradient(90deg,#fff,#c084fc 55%,#e879f9);-webkit-background-clip:text;color:transparent}
        .sam-hero-tagline{margin:18px 0 0;font-family:'Playfair Display',serif;font-size:clamp(19px,2vw,27px);font-style:italic;color:#fff}.sam-hero-body{max-width:520px;margin:11px 0 0;color:rgba(255,255,255,.57);font-size:12px;line-height:1.75}
        .sam-search-wrap{position:relative;display:flex;align-items:center;gap:10px;max-width:590px;margin-top:24px;padding:7px 7px 7px 14px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.075);box-shadow:0 20px 60px rgba(0,0,0,.2)}.sam-search-wrap>svg{color:#c9b5e7;flex:none}.sam-search-wrap input{min-width:0;flex:1;border:0;outline:0;background:none;color:#fff;font-size:10px}.sam-search-wrap input::placeholder{color:rgba(255,255,255,.42)}.sam-search-wrap>button{display:grid;place-items:center;flex:none;width:37px;height:37px;border:0;border-radius:12px;background:#fff;color:#5b21b6}
        .sam-search-results{position:absolute;z-index:20;left:0;right:0;top:calc(100% + 8px);overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:#160522;box-shadow:0 25px 70px rgba(0,0,0,.45)}.sam-search-results button{width:100%;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:11px 13px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:none;color:#fff;text-align:left}.sam-search-results button:hover{background:rgba(255,255,255,.06)}.sam-search-results b,.sam-search-results small{display:block}.sam-search-results b{font-size:10px}.sam-search-results small{margin-top:2px;color:rgba(255,255,255,.42);font-size:8px}
        .sam-trust-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px}.sam-trust-row div{display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.58);font-size:8px;font-weight:800}.sam-trust-row svg{color:#c084fc}
        .sam-hero-card{position:relative;min-height:600px;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:30px;background:#12031f;box-shadow:0 35px 110px rgba(0,0,0,.4)}.sam-hero-image{position:absolute;inset:0;background:url(${IMAGES.venue}) center/cover}.sam-hero-image-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,4,39,.08),rgba(24,4,39,.85) 85%),linear-gradient(90deg,rgba(18,3,31,.55),transparent 55%)}
        .sam-hero-story{position:absolute;right:10%;bottom:10%;display:flex;flex-direction:column;align-items:flex-start;gap:15px}.sam-script{font-family:'Playfair Display',serif;font-style:italic;font-size:43px;line-height:.88;text-shadow:0 5px 25px rgba(0,0,0,.4)}.sam-hero-story button{display:flex;align-items:center;gap:8px;border:0;background:none;color:#fff;font-size:9px;font-weight:900}.sam-play{display:grid;place-items:center;width:31px;height:31px;border-radius:50%;background:#fff;color:#5b21b6}
        .sam-live-chip{position:absolute;left:18px;bottom:18px;display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.11);border-radius:15px;background:rgba(18,3,31,.62);backdrop-filter:blur(15px)}.sam-live-chip>span{grid-row:span 2;width:7px;height:7px;border-radius:50%;background:#6ee7b7;box-shadow:0 0 0 5px rgba(110,231,183,.09)}.sam-live-chip b{font-size:9px}.sam-live-chip small{font-size:7px;color:rgba(255,255,255,.45)}
        .sam-category-section{padding:0 0 2px;background:var(--deep)}.sam-category-shell{padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(255,255,255,.05)}.sam-category-rail{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.sam-category-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border:1px solid rgba(255,255,255,.06);border-radius:14px;background:rgba(255,255,255,.035);color:#fff}.sam-category-card:hover{background:rgba(255,255,255,.09);transform:translateY(-2px)}.sam-category-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,rgba(139,92,246,.25),rgba(236,72,153,.13));font-size:17px}.sam-category-card b{font-size:8px;white-space:nowrap}
        .sam-section{padding:82px 0}.sam-white{background:#fff;color:#161022}.sam-soft{background:var(--soft);color:#161022}.sam-section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:28px}.sam-overline{margin:0 0 10px;color:#7c3aed;font-size:8px;font-weight:900;letter-spacing:.2em}.sam-section-heading h2{margin:0;font-size:clamp(34px,4vw,55px);line-height:.97;letter-spacing:-.055em;font-weight:900}.sam-section-heading>p{max-width:360px;margin:0;color:#7b7186;font-size:11px;line-height:1.7}
        .sam-workflow{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:32px}.sam-work-card{overflow:hidden;border:1px solid #e7e0ef;border-radius:18px;background:#fff;box-shadow:0 9px 30px rgba(61,20,91,.06)}.sam-work-image{position:relative;height:150px;background-position:center;background-size:cover}.sam-work-image:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(18,3,31,.7))}.sam-work-image>span{position:absolute;z-index:2;right:9px;top:9px;display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:rgba(18,3,31,.7);color:#fff;font-size:8px;font-weight:900}.sam-work-body{display:flex;gap:9px;padding:12px}.sam-work-icon{display:grid;place-items:center;flex:none;width:31px;height:31px;border-radius:9px;background:#efe7ff;color:#7c3aed}.sam-work-body h3{margin:0;font-size:10px;font-weight:900}.sam-work-body p{margin:3px 0 0;color:#7c3aed;font-size:8px;font-weight:800}
        .sam-connected-strip{display:flex;align-items:center;justify-content:center;gap:12px;overflow:hidden;margin-top:20px;padding:12px;border:1px solid #e7e0ef;border-radius:14px;color:#7c3aed;white-space:nowrap;font-size:7px;font-weight:900;letter-spacing:.11em}.sam-connected-strip i{color:#c9bfd4;font-style:normal}.sam-connected-strip strong{color:#24172c}
        .sam-service-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:31px}.sam-service-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:13px;border:1px solid #e7e0ef;border-radius:17px;background:#fff;color:#1e1228;text-align:left}.sam-service-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:12px;background:#efe8ff;color:#7c3aed;font-size:18px}.sam-service-card b,.sam-service-card small{display:block}.sam-service-card b{font-size:10px}.sam-service-card small{margin-top:3px;color:#8a8192;font-size:8px;line-height:1.4}.sam-service-card>svg{color:#a49aaf}
        .sam-chain-section{background:#fff}.sam-chain-grid{display:grid;grid-template-columns:.92fr 1.08fr;gap:60px;align-items:center}.sam-chain-copy h2{margin:0;font-size:clamp(36px,4.5vw,59px);line-height:.95;letter-spacing:-.06em}.sam-chain-copy>p:not(.sam-overline){max-width:500px;margin:17px 0 0;color:#786e83;font-size:12px;line-height:1.75}.sam-chain-points{display:grid;gap:6px;margin-top:22px}.sam-chain-points>div{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid #eee8f4}.sam-chain-points>div>span{color:#8b5cf6;font-size:8px;font-weight:900}.sam-chain-points b,.sam-chain-points small{display:block}.sam-chain-points b{font-size:10px}.sam-chain-points small{margin-top:2px;color:#8a8192;font-size:8px}
        .sam-chain-card{overflow:hidden;padding:12px;border-radius:25px;background:linear-gradient(145deg,#11031d,#2a0a42 62%,#4a1266);color:#fff;box-shadow:0 30px 75px rgba(40,10,60,.2)}.sam-chain-head{display:flex;justify-content:space-between;align-items:center;padding:4px 4px 10px;font-size:8px;font-weight:900;letter-spacing:.13em}.sam-chain-head span{display:flex;align-items:center;gap:6px}.sam-chain-head i{width:6px;height:6px;border-radius:50%;background:#6ee7b7}.sam-chain-head b{color:#9ee9c8;font-size:7px}.sam-chain-visual{position:relative;height:225px;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:radial-gradient(circle at 50% 60%,rgba(168,85,247,.25),transparent 32%),linear-gradient(180deg,#12071e,#24103a)}.sam-chain-visual:before{content:'';position:absolute;inset:0;opacity:.17;background-image:linear-gradient(rgba(255,255,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.13) 1px,transparent 1px);background-size:32px 32px}.sam-city-glow{position:absolute;right:8%;bottom:-5%;width:58%;height:52%;background:linear-gradient(90deg,transparent,rgba(168,85,247,.25));filter:blur(25px)}.sam-truck-visual{position:absolute;left:39%;top:49%;display:grid;place-items:center;width:76px;height:53px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:linear-gradient(145deg,#8b3dff,#3b1260);color:#fff;box-shadow:0 0 35px rgba(139,92,246,.42);transform:rotate(-5deg)}.sam-route{position:absolute;height:2px;background:linear-gradient(90deg,#d8b4ff,#8b5cf6);box-shadow:0 0 15px rgba(168,85,247,.5)}.route-a{left:15%;top:35%;width:29%;transform:rotate(18deg)}.route-b{right:13%;top:63%;width:32%;transform:rotate(-14deg)}.sam-map-pin{position:absolute;display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:#fff;color:#6823a8;box-shadow:0 10px 25px rgba(0,0,0,.25)}.pin-a{left:12%;top:27%}.pin-b{right:9%;bottom:23%}.sam-chain-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:11px 2px 2px}.sam-chain-step{position:relative;text-align:center}.sam-chain-icon{position:relative;z-index:2;display:grid;place-items:center;width:31px;height:31px;margin:auto;border:1px solid rgba(255,255,255,.11);border-radius:10px;background:#21102f;color:#d4c0ff}.sam-chain-step:nth-child(2) .sam-chain-icon{background:#7c3aed;color:#fff}.sam-chain-step b,.sam-chain-step small{display:block}.sam-chain-step b{margin-top:5px;font-size:7px}.sam-chain-step small{margin-top:2px;color:rgba(255,255,255,.4);font-size:6px}.sam-chain-line{position:absolute;z-index:1;left:64%;right:-35%;top:15px;height:1px;background:rgba(196,181,253,.22)}.sam-disclaimer{display:block;margin:10px 2px 1px;color:rgba(255,255,255,.32);font-size:7px;line-height:1.5}
        .sam-feature{background:#160322;color:#fff}.sam-feature-grid{display:grid;grid-template-columns:1.05fr .95fr;overflow:hidden;min-height:470px;border:1px solid rgba(255,255,255,.08);border-radius:27px;background:#210638}.sam-feature-image{min-height:470px;background:linear-gradient(90deg,rgba(33,6,56,.02),rgba(33,6,56,.8)),url(${IMAGES.wedding}) center/cover}.sam-feature-copy{display:flex;flex-direction:column;justify-content:center;padding:45px;background:radial-gradient(circle at 80% 20%,rgba(139,92,246,.24),transparent 35%)}.sam-feature-copy h2{margin:0;font-size:clamp(33px,4vw,53px);line-height:.97;letter-spacing:-.055em}.sam-feature-copy h2 em{color:#c49cff;font-style:normal}.sam-feature-copy>p:not(.sam-overline){max-width:420px;margin:16px 0 22px;color:rgba(255,255,255,.55);font-size:11px;line-height:1.75}.sam-status-card{display:flex;align-items:center;gap:9px;width:max-content;margin-top:25px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(0,0,0,.24)}.sam-status-check{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#a78bfa;color:#25073d;font-weight:900}.sam-status-card b,.sam-status-card small{display:block}.sam-status-card b{font-size:8px}.sam-status-card small{margin-top:2px;color:rgba(255,255,255,.4);font-size:7px}
        .sam-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:31px}.sam-benefits>div{display:grid;grid-template-columns:auto 1fr;gap:9px;padding:16px;border:1px solid #e7e0ef;border-radius:17px;background:#fff}.sam-benefits span{display:grid;place-items:center;width:37px;height:37px;border-radius:11px;background:#efe8ff;color:#7c3aed;grid-row:span 2}.sam-benefits b,.sam-benefits small{display:block}.sam-benefits b{font-size:10px}.sam-benefits small{margin-top:2px;color:#8b8194;font-size:8px}
        .sam-events-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:31px}.sam-event-card{position:relative;min-height:142px;padding:15px;border:1px solid #e7e0ef;border-radius:18px;background:#fff;text-align:left;color:#1e1228}.sam-event-icon{display:block;font-size:21px}.sam-event-card>small{position:absolute;right:12px;top:12px;color:#c8bfd1;font-size:7px;font-weight:900}.sam-event-card b{display:block;margin-top:13px;font-size:11px}.sam-event-card p{margin:4px 0 0;color:#8b8194;font-size:8px;line-height:1.45}.sam-event-arrow{display:inline-flex;align-items:center;gap:4px;margin-top:10px;color:#7c3aed;font-size:8px;font-weight:900}
        .sam-reviews{background:var(--soft);color:#17101f}.sam-review-empty{display:flex;align-items:center;gap:15px;margin-top:30px;padding:20px;border:1px dashed #cfc2df;border-radius:21px;background:#fff}.sam-review-mark{display:grid;place-items:center;flex:none;width:45px;height:45px;border-radius:14px;background:#efe7ff;color:#7c3aed}.sam-review-empty b{font-size:11px}.sam-review-empty p{margin:4px 0 0;color:#887d91;font-size:9px;line-height:1.5}.sam-outline-button{margin-left:auto;display:inline-flex;align-items:center;gap:7px;flex:none;padding:10px 13px;border:1px solid #cbbbe0;border-radius:12px;background:#fff;color:#6d28d9;font-size:8px;font-weight:900}.sam-review-process{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.sam-review-process>div{padding:15px;border:1px solid #e7e0ef;border-radius:16px;background:#fff}.sam-review-process span{display:block;color:#8b5cf6;font-size:8px;font-weight:900}.sam-review-process b{display:block;margin-top:8px;font-size:10px}.sam-review-process small{display:block;margin-top:3px;color:#8b8194;font-size:8px;line-height:1.45}
        .sam-payment{background:#fff;color:#17101f}.sam-payment-card{display:grid;grid-template-columns:1fr auto;align-items:center;gap:20px;margin-top:28px;padding:20px;border:1px solid #e7e0ef;border-radius:21px;background:linear-gradient(135deg,#fff,#faf7ff)}.sam-payment-card h3{margin:0;font-size:16px}.sam-payment-card p{max-width:600px;margin:6px 0 0;color:#83798d;font-size:9px;line-height:1.6}.sam-razorpay{display:flex;align-items:center;gap:8px;padding:11px 13px;border:1px solid #ded3ec;border-radius:13px;background:#f8f4ff;color:#4c1d95;font-size:10px;font-weight:900;white-space:nowrap}.sam-razorpay span{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#6842d9;color:#fff;font-weight:900}.sam-payment-note{margin-top:9px;color:#a198a8;font-size:7px}
        .sam-city{background:var(--deep);color:#fff}.sam-city-grid{display:grid;grid-template-columns:1fr 1fr;gap:45px;align-items:center}.sam-city h2{margin:0;font-size:clamp(35px,4.3vw,56px);line-height:.96;letter-spacing:-.055em}.sam-city p{max-width:500px;color:rgba(255,255,255,.55);font-size:11px;line-height:1.7}.sam-india-map{position:relative;height:430px;display:grid;place-items:center}.sam-india-shape{width:245px;height:330px;clip-path:polygon(46% 0,64% 9%,69% 20%,80% 28%,74% 38%,86% 48%,75% 58%,77% 69%,67% 77%,70% 91%,53% 100%,43% 87%,32% 78%,35% 65%,24% 55%,30% 44%,18% 35%,28% 26%,34% 14%);background:linear-gradient(180deg,#b76cff,#6d28d9);filter:drop-shadow(0 0 35px rgba(139,92,246,.4));opacity:.8}.sam-city-pin{position:absolute;display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.08);backdrop-filter:blur(8px);font-size:7px}.sam-city-pin i{width:6px;height:6px;border-radius:50%;background:#f0abfc;box-shadow:0 0 0 5px rgba(240,171,252,.09)}.pin-1{left:17%;top:28%}.pin-2{right:8%;top:42%}.pin-3{left:28%;bottom:26%}.pin-4{right:19%;bottom:13%}.sam-city-stats{display:flex;gap:8px;margin-top:23px}.sam-city-stat{padding:10px 13px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.05)}.sam-city-stat b,.sam-city-stat small{display:block}.sam-city-stat b{font-size:13px}.sam-city-stat small{margin-top:2px;color:rgba(255,255,255,.4);font-size:7px}
        .sam-guides{background:var(--soft);color:#17101f}.sam-guide-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:8px;margin-top:30px}.sam-guide-card{overflow:hidden;border:1px solid #e7e0ef;border-radius:19px;background:#fff}.sam-guide-image{height:190px;background-position:center;background-size:cover}.sam-guide-body{padding:16px}.sam-guide-body span{display:inline-block;padding:4px 7px;border-radius:7px;background:#efe7ff;color:#6d28d9;font-size:7px;font-weight:900}.sam-guide-body h3{margin:10px 0 0;font-size:15px}.sam-guide-body p{margin:6px 0 0;color:#887d91;font-size:8px}.sam-guide-side{display:grid;gap:8px}.sam-guide-mini{display:grid;grid-template-columns:105px 1fr;overflow:hidden;border:1px solid #e7e0ef;border-radius:16px;background:#fff}.sam-guide-mini-image{background-position:center;background-size:cover}.sam-guide-mini-body{padding:12px}.sam-guide-mini-body span{color:#7c3aed;font-size:7px;font-weight:900}.sam-guide-mini-body b{display:block;margin-top:5px;font-size:9px}.sam-guide-mini-body small{display:block;margin-top:4px;color:#94899e;font-size:7px}
        .sam-final{background:linear-gradient(125deg,#6d28d9,#8b3dff 55%,#5b21b6);color:#fff;padding:55px 0}.sam-final-inner{display:flex;align-items:center;justify-content:space-between;gap:25px}.sam-final h2{margin:0;font-size:clamp(33px,4vw,49px);line-height:.98;letter-spacing:-.055em}.sam-final p{margin:7px 0 0;color:rgba(255,255,255,.7);font-size:9px}.sam-final .sam-primary{background:#fff;color:#5b21b6}
        .sam-footer{padding:48px 0 20px;background:#12031f;color:#fff}.sam-footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:30px}.sam-footer-logo{margin:0;font-size:20px;font-weight:900;letter-spacing:.24em}.sam-footer-tag{margin:7px 0 0;color:#c6a9e4;font-size:9px;font-weight:800}.sam-footer-copy{max-width:300px;margin:12px 0 0;color:rgba(255,255,255,.36);font-size:8px;line-height:1.65}.sam-footer-col{display:flex;flex-direction:column;gap:8px}.sam-footer-col>b{margin-bottom:3px;color:#d8c6ed;font-size:8px;text-transform:uppercase;letter-spacing:.14em}.sam-footer-col button{width:max-content;padding:0;border:0;background:none;color:rgba(255,255,255,.45);font-size:9px;text-align:left}.sam-footer-col button:hover{color:#fff}.sam-socials{display:flex;gap:6px}.sam-socials button{display:grid;place-items:center;width:31px;height:31px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.04);color:#fff}.sam-footer-bottom{display:flex;justify-content:space-between;gap:15px;margin-top:35px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.25);font-size:7px}
        .sam-modal-backdrop{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(14px)}.sam-modal{width:min(620px,100%);overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:25px;background:#160522;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.55)}.sam-modal-head{display:flex;justify-content:space-between;align-items:center;padding:20px;border-bottom:1px solid rgba(255,255,255,.08)}.sam-mini-label{color:#c9a7ff;font-size:8px;font-weight:900;letter-spacing:.2em}.sam-modal h3{margin:4px 0 0;font-size:19px}.sam-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:14px}.sam-role-card{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.04);color:#fff;text-align:left}.sam-role-card:hover{background:rgba(255,255,255,.08);border-color:rgba(196,156,255,.4)}.sam-role-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(139,92,246,.17);color:#d1b7ff}.sam-role-card>b,.sam-role-card>small{display:block}.sam-role-card>b{margin-top:9px;font-size:10px}.sam-role-card>small{margin-top:3px;color:rgba(255,255,255,.45);font-size:8px;line-height:1.45}.sam-role-link{display:flex;align-items:center;gap:4px;margin-top:9px;color:#c4a2ff;font-size:8px;font-weight:900}.sam-modal-note{margin:0;padding:0 18px 18px;color:rgba(255,255,255,.32);font-size:7px;line-height:1.5}
        @media(max-width:1000px){.sam-desktop-nav{display:none}.sam-mobile-menu{display:grid}.sam-search-trigger{display:none}.sam-hero-grid{grid-template-columns:1fr}.sam-hero-card{min-height:540px}.sam-workflow{grid-template-columns:repeat(3,1fr)}.sam-service-grid{grid-template-columns:repeat(2,1fr)}.sam-chain-grid,.sam-city-grid{grid-template-columns:1fr}.sam-chain-grid{gap:38px}.sam-benefits{grid-template-columns:repeat(2,1fr)}.sam-events-grid{grid-template-columns:repeat(3,1fr)}.sam-footer-grid{grid-template-columns:1.5fr 1fr 1fr}.sam-mobile-nav{display:grid;gap:3px;padding:8px 22px 17px;border-top:1px solid rgba(255,255,255,.08);background:#160522}.sam-mobile-nav button:not(.sam-primary){display:flex;justify-content:space-between;align-items:center;padding:11px;border:0;border-radius:11px;background:none;color:#fff;font-size:11px;font-weight:800}.sam-mobile-nav .sam-primary{width:100%;margin-top:5px}}
        @media(max-width:700px){.sam-container{width:min(calc(100% - 28px),1280px)}.sam-header-inner{width:min(calc(100% - 28px),1280px);min-height:63px}.sam-primary.small{display:none}.sam-hero{padding-top:24px}.sam-hero-grid{gap:20px;min-height:auto;padding:24px 0 26px}.sam-hero h1{font-size:clamp(46px,13.8vw,67px)}.sam-hero-tagline{font-size:19px}.sam-hero-body{font-size:10px}.sam-search-wrap{margin-top:18px}.sam-trust-row{grid-template-columns:repeat(2,1fr);gap:9px}.sam-trust-row div{font-size:7px}.sam-hero-card{min-height:410px;border-radius:24px}.sam-script{font-size:34px}.sam-category-shell{padding:7px;border-radius:16px}.sam-category-rail{display:flex;overflow:auto;scrollbar-width:none}.sam-category-rail::-webkit-scrollbar{display:none}.sam-category-card{width:86px;flex:none}.sam-section{padding:58px 0}.sam-section-heading{display:block}.sam-section-heading>p{margin-top:11px}.sam-section-heading h2{font-size:34px}.sam-workflow{display:flex;overflow:auto;gap:7px;margin-right:-14px;padding-right:14px;scroll-snap-type:x mandatory;scrollbar-width:none}.sam-workflow::-webkit-scrollbar{display:none}.sam-work-card{flex:0 0 78%;scroll-snap-align:start}.sam-work-image{height:135px}.sam-connected-strip{justify-content:flex-start}.sam-service-grid{grid-template-columns:1fr}.sam-service-card{padding:11px;border-radius:15px}.sam-service-icon{width:36px;height:36px}.sam-chain-copy h2{font-size:37px}.sam-chain-card{border-radius:22px}.sam-chain-visual{height:220px}.sam-chain-steps{gap:2px}.sam-chain-step b{font-size:6px}.sam-feature-grid{grid-template-columns:1fr;border-radius:23px}.sam-feature-image{min-height:280px}.sam-feature-copy{min-height:350px;padding:29px 23px}.sam-benefits{grid-template-columns:1fr 1fr}.sam-benefits>div{padding:12px}.sam-events-grid{grid-template-columns:1fr 1fr;gap:7px}.sam-event-card{min-height:140px;padding:13px}.sam-review-empty{align-items:flex-start;flex-wrap:wrap}.sam-outline-button{margin-left:0}.sam-review-process{grid-template-columns:1fr}.sam-payment-card{grid-template-columns:1fr}.sam-razorpay{width:max-content}.sam-india-map{height:360px}.sam-city-pin{font-size:6px}.sam-guide-grid{grid-template-columns:1fr}.sam-guide-image{height:175px}.sam-guide-side{grid-template-columns:1fr 1fr}.sam-guide-mini{grid-template-columns:1fr}.sam-guide-mini-image{height:100px}.sam-final-inner{display:block}.sam-final .sam-primary{margin-top:20px}.sam-review-layout{grid-template-columns:1fr}.sam-review-form{order:-1}.sam-form-grid{grid-template-columns:1fr}.sam-form-grid textarea{grid-column:auto}.sam-metric-grid{grid-template-columns:1fr 1fr}.sam-footer-grid{grid-template-columns:1.4fr 1fr}.sam-brand-lockup{font-size:16px}.sam-infinity{font-size:24px}.sam-footer-grid>div:first-child{grid-column:1/-1}.sam-footer-bottom{display:block;line-height:1.8}.sam-footer-bottom span:last-child{display:block}.sam-role-grid{grid-template-columns:1fr}.sam-modal h3{font-size:17px}}
        @media(max-width:390px){.sam-container,.sam-header-inner{width:min(calc(100% - 22px),1280px)}.sam-wordmark{font-size:16px}.sam-hero h1{font-size:43px}.sam-hero-tagline{font-size:17px}.sam-hero-card{min-height:370px}.sam-category-card{width:78px}.sam-section-heading h2{font-size:31px}.sam-benefits{grid-template-columns:1fr}.sam-guide-side{grid-template-columns:1fr}.sam-footer-grid{grid-template-columns:1fr 1fr}}
      `}</style>

      <header className="sam-site-header">
        <div className="sam-header-inner">
          <button className="sam-brand-lockup" onClick={() => scrollTo('top')} aria-label="SAMBRAMO home"><span className="sam-infinity">∞</span><span>{BRAND}</span></button>
          <nav className="sam-desktop-nav" aria-label="Primary navigation">
            {[
              ['Home', 'top'], ['Services', 'services'], ['How it works', 'how-it-works'],
              ['Supply Chain', 'supply-chain'], ['About', 'about']
            ].map(([label, id]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}
          </nav>
          <div className="sam-header-actions">
            <button className="sam-search-trigger" onClick={() => scrollTo('search')} aria-label="Search"><Search size={17} /></button>
            <button className="sam-primary small" onClick={() => setHandoff(true)}>Get Started</button>
            <button className="sam-mobile-menu" onClick={() => setMenu(value => !value)} aria-label={menu ? 'Close menu' : 'Open menu'}>{menu ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
        </div>
        {menu && <div className="sam-mobile-nav">
          {[
            ['Home', 'top'], ['Services', 'services'], ['How it works', 'how-it-works'],
            ['Supply Chain', 'supply-chain'], ['About', 'about']
          ].map(([label, id]) => <button key={id} onClick={() => scrollTo(id)}>{label}<ChevronRight size={15} /></button>)}
          <button className="sam-primary" onClick={() => { setMenu(false); setHandoff(true) }}>Get Started <ArrowRight size={15} /></button>
        </div>}
      </header>

      <main id="top">
        <section className="sam-hero">
          <div className="sam-hero-bg" />
          <div className="sam-container sam-hero-grid">
            <div className="sam-hero-copy">
              <div className="sam-eyebrow"><span>✦</span> INDIA'S CONNECTED EVENT ECOSYSTEM</div>
              <h1>Events should<br />feel <em>connected.</em></h1>
              <p className="sam-hero-tagline">{TAGLINE}</p>
              <p className="sam-hero-body">From bookings to supplies to logistics — SAMBRAMO connects everything that makes your event happen.</p>
              <div id="search"><SearchBox query={query} setQuery={setQuery} onExplore={() => setHandoff(true)} /></div>
              <div className="sam-trust-row">
                {[[ShieldCheck, 'Verified Partners'], [WalletCards, 'Secure Payments'], [Route, 'Real-time Tracking'], [CheckCircle2, 'End-to-End Support']].map(([Icon, label]) =>
                  <div key={label}><Icon size={14} /><span>{label}</span></div>
                )}
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section className="sam-category-section">
          <div className="sam-container">
            <div className="sam-category-shell">
              <div className="sam-category-rail">
                {EVENT_TYPES.map(([title, icon]) => <button key={title} className="sam-category-card" onClick={() => setHandoff(true)}><span className="sam-category-icon">{icon}</span><b>{title}</b></button>)}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="sam-section sam-white">
          <div className="sam-container">
            <div className="sam-section-heading">
              <div><p className="sam-overline">HOW SAMBRAMO CONNECTS</p><h2>How SAMBRAMO<br />connects your event <span>→</span></h2></div>
              <p>Different people. A common purpose. Everything moves together.</p>
            </div>
            <Workflow />
            <div className="sam-connected-strip"><span>YOU PLAN</span><i>→</i><span>WE CONNECT</span><i>→</i><span>SUPPLIERS PREPARE</span><i>→</i><span>LOGISTICS MOVES</span><i>→</i><strong>YOUR EVENT HAPPENS</strong></div>
          </div>
        </section>

        <section id="services" className="sam-section sam-soft">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">OUR SERVICES</p><h2>Everything your event needs.</h2></div><p>One connected layer for services, people, products and movement.</p></div>
            <div className="sam-service-grid">
              {SERVICES.map(([title, desc, icon]) => <button key={title} className="sam-service-card" onClick={() => setHandoff(true)}><span className="sam-service-icon">{icon}</span><span><b>{title}</b><small>{desc}</small></span><ChevronRight size={15} /></button>)}
            </div>
          </div>
        </section>

        <section id="supply-chain" className="sam-section sam-chain-section">
          <div className="sam-container sam-chain-grid">
            <div className="sam-chain-copy">
              <p className="sam-overline">LIVE EVENT SUPPLY CHAIN</p>
              <h2>From suppliers to your venue — in one flow.</h2>
              <p>Behind every event is a chain of people, materials, services and movement. SAMBRAMO makes that journey visible and coordinated.</p>
              <div className="sam-chain-points">
                {[['Source', 'Connect suppliers and service requirements.'], ['Prepare', 'Make materials and schedules visible.'], ['Move', 'Coordinate logistics from source to venue.'], ['Arrive', 'Turn venue entry into a clear operational step.']].map(([title, desc], i) =>
                  <div key={title}><span>0{i + 1}</span><div><b>{title}</b><small>{desc}</small></div></div>
                )}
              </div>
            </div>
            <LiveSupplyChain />
          </div>
        </section>

        <section className="sam-section sam-feature">
          <div className="sam-container sam-feature-grid">
            <div className="sam-feature-image" />
            <div className="sam-feature-copy">
              <p className="sam-overline">MORE THAN A BOOKING PLATFORM</p>
              <h2>Not just a booking platform,<br /><em>a complete event ecosystem.</em></h2>
              <p>SAMBRAMO brings together services, suppliers, logistics and people — so you can focus on what truly matters.</p>
              <button className="sam-primary" onClick={() => setHandoff(true)}>Explore SAMBRAMO <ArrowRight size={16} /></button>
              <div className="sam-status-card"><span className="sam-status-check">✓</span><div><b>Everything connected</b><small>Track · Coordinate · Celebrate</small></div></div>
            </div>
          </div>
        </section>

        <section className="sam-section sam-soft">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">WHY SAMBRAMO</p><h2>Built for the way events actually happen.</h2></div><p>One connected product experience instead of scattered conversations.</p></div>
            <div className="sam-benefits">
              {[[ShieldCheck, 'Verified & Trusted', 'Quality partners, always.'], [Truck, 'Real-time Logistics', 'Track supplies and movement.'], [Sparkles, 'All in One Platform', 'Services, suppliers, logistics.'], [CreditCard, 'Hassle-Free Payments', 'Secure and transparent.']].map(([Icon, title, desc]) =>
                <div key={title}><span><Icon size={18} /></span><b>{title}</b><small>{desc}</small></div>
              )}
            </div>
          </div>
        </section>

        <section className="sam-section sam-white">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">PLAN ANY EVENT</p><h2>Whatever the occasion,<br />the connection stays the same.</h2></div><p>Choose the occasion. SAMBRAMO connects the service layer around it.</p></div>
            <div className="sam-events-grid">
              {EVENT_TYPES.map(([title, icon], index) => <button key={title} onClick={() => setHandoff(true)} className="sam-event-card"><span className="sam-event-icon">{icon}</span><small>0{index + 1}</small><b>{title}</b><p>Explore the connected services for your event.</p><span className="sam-event-arrow">Explore <ArrowRight size={12} /></span></button>)}
            </div>
          </div>
        </section>

        <ReviewSection reviews={reviews} setReviews={setReviews} />

        <section className="sam-section sam-payment">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">PAYMENTS</p><h2>Simple, secure event payments.</h2></div><p>Payment collection belongs inside the SAMBRAMO app experience.</p></div>
            <div className="sam-payment-card">
              <div><h3>Razorpay payment support</h3><p>When payments are enabled for a booking, SAMBRAMO can route the customer through a secure Razorpay-powered payment flow. The public website does not collect or process payments.</p><div className="sam-payment-note">Payment gateway availability and configuration depend on the production app integration.</div></div>
              <div className="sam-razorpay"><span>R</span> Razorpay</div>
            </div>
          </div>
        </section>

        <section className="sam-section sam-metrics">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">THE ECOSYSTEM AT A GLANCE</p><h2>Designed around the whole event.</h2></div><p>These are product architecture targets, not claims of current completed volume.</p></div>
            <div className="sam-metric-grid">
              <div><b>10K+</b><span>Partner capacity target</span></div>
              <div><b>500+</b><span>Event delivery target</span></div>
              <div><b>26+</b><span>Service categories</span></div>
              <div><b>4.9★</b><span>Rating framework target</span></div>
            </div>
          </div>
        </section>

        <section className="sam-section sam-city" id="about">
          <div className="sam-container sam-city-grid">
            <div>
              <p className="sam-overline" style={{ color: '#d7b8ff' }}>PLAN ANY EVENT, ANYWHERE IN INDIA</p>
              <h2>One connected experience, wherever your event happens.</h2>
              <p>Currently active in Bangalore. Scaling further across India soon. Coverage and partner availability will grow city by city.</p>
              <div className="sam-city-stats">
                <div className="sam-city-stat"><b>Bangalore</b><small>Current focus city</small></div>
                <div className="sam-city-stat"><b>India</b><small>Expansion roadmap</small></div>
              </div>
              <button className="sam-primary" style={{ marginTop: 22 }} onClick={() => setHandoff(true)}>Explore in your city <ArrowRight size={15} /></button>
            </div>
            <div className="sam-india-map" aria-label="Illustrative India coverage map">
              <div className="sam-india-shape" />
              <div className="sam-city-pin bangalore-pin"><i />Bangalore · Active</div>
            </div>
          </div>
        </section>

        <section className="sam-section sam-guides">
          <div className="sam-container">
            <div className="sam-section-heading"><div><p className="sam-overline">FROM OUR BLOG</p><h2>Ideas for better events.</h2></div><p>Useful guides can live here as the SAMBRAMO content library grows.</p></div>
            <div className="sam-guide-grid">
              <article className="sam-guide-card"><div className="sam-guide-image" style={{ backgroundImage: 'url(' + IMAGES.wedding + ')' }} /><div className="sam-guide-body"><span>GUIDE</span><h3>10 ways to make event planning feel simpler</h3><p>Planning ideas, checklists and practical event operations.</p></div></article>
              <div className="sam-guide-side">
                <article className="sam-guide-mini"><div className="sam-guide-mini-image" style={{ backgroundImage: 'url(' + IMAGES.venue + ')' }} /><div className="sam-guide-mini-body"><span>VENUE</span><b>How to coordinate venue entry</b><small>Practical event-day planning.</small></div></article>
                <article className="sam-guide-mini"><div className="sam-guide-mini-image" style={{ backgroundImage: 'url(' + IMAGES.catering + ')' }} /><div className="sam-guide-mini-body"><span>SUPPLY CHAIN</span><b>From supplier to celebration</b><small>Understanding event movement.</small></div></article>
              </div>
            </div>
          </div>
        </section>

        <section className="sam-final">
          <div className="sam-container sam-final-inner">
            <div><h2>Ready to plan your<br />next event?</h2><p>Discover. Connect. Move. Complete.</p></div>
            <button className="sam-primary" onClick={() => setHandoff(true)}>Get Started <ArrowRight size={16} /></button>
          </div>
        </section>
      </main>

      <footer className="sam-footer">
        <div className="sam-container">
          <div className="sam-footer-grid">
            <div>
              <p className="sam-footer-logo"><span className="sam-footer-infinity">∞</span> {BRAND}</p>
              <p className="sam-footer-tag">{TAGLINE}</p>
              <p className="sam-footer-copy">A connected event ecosystem for services, supplies and logistics. Built to bring the people behind an event into one experience.</p>
              <div className="sam-socials" style={{ marginTop: 14 }}>
                <button aria-label="Instagram"><Instagram size={14} /></button><button aria-label="LinkedIn"><Linkedin size={14} /></button><button aria-label="YouTube"><Youtube size={14} /></button><button aria-label="WhatsApp"><MessageCircle size={14} /></button>
              </div>
            </div>
            <div className="sam-footer-col"><b>Product</b><button onClick={() => scrollTo('services')}>Services</button><button onClick={() => scrollTo('supply-chain')}>Supply Chain</button><button onClick={() => scrollTo('how-it-works')}>How it works</button><button onClick={() => setHandoff(true)}>Get Started</button></div>
            <div className="sam-footer-col"><b>Company</b><button onClick={() => scrollTo('about')}>About us</button><button>Careers</button><button>Blog</button><button>Contact</button></div>
            <div className="sam-footer-col"><b>Trust</b><button>Privacy</button><button>Terms</button><button>Payments</button><button>Partner with us</button></div>
          </div>
          <div className="sam-footer-bottom"><span>© 2026 SAMBRAMO. All rights reserved.</span><span>Event Supply Chain and Logistics · Made for people who make moments.</span></div>
        </div>
      </footer>

      <AppHandoff open={handoff} onClose={() => setHandoff(false)} />
    </div>
  )
}
