import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Bell, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock3, Flower2, MapPin,
  Menu, Search, Sparkles, Truck, Users, X, Camera,
  CarFront, UtensilsCrossed, Music2, Building2, Gem, SlidersHorizontal, WalletCards,
  Route, Boxes, PartyPopper
} from 'lucide-react'

const IMG = {
  hero: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2200&q=86',
  decor: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=84',
  food: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=84',
  photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=84',
  music: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=84',
  venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=84',
  transport: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=84',
  beauty: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=84',
}

const services = [
  { title: 'Venues & Spaces', sub: 'Places, setup & equipment', tag: 'Spaces', image: IMG.venue, icon: Building2, terms: 'venue space hall mandapam equipment' },
  { title: 'Decor & Florists', sub: 'Themes, flowers & styling', tag: 'Creative', image: IMG.decor, icon: Flower2, terms: 'decor decoration florist flowers styling' },
  { title: 'Catering & Cooks', sub: 'Food, service & kitchens', tag: 'Food', image: IMG.food, icon: UtensilsCrossed, terms: 'catering cook food kitchen buffet' },
  { title: 'Photography & Video', sub: 'Capture every moment', tag: 'Creative', image: IMG.photo, icon: Camera, terms: 'photo photography photographer video wedding' },
  { title: 'Music & Entertainment', sub: 'DJs, artists & experiences', tag: 'Creative', image: IMG.music, icon: Music2, terms: 'music dj artist entertainment stage' },
  { title: 'Transport & Auto', sub: 'People, goods & event movement', tag: 'Logistics', image: IMG.transport, icon: CarFront, terms: 'auto car transport cab vehicle logistics' },
  { title: 'Beauty & Wellness', sub: 'Makeup, grooming & care', tag: 'Specialists', image: IMG.beauty, icon: Gem, terms: 'makeup beauty grooming wellness' },
  { title: 'Event Operations', sub: 'People, equipment & on-ground support', tag: 'Operations', image: IMG.venue, icon: Users, terms: 'staff security cleaning host operations equipment' },
]

const trades = [
  'Catering', 'Decor', 'Photography', 'Venues', 'Entertainment', 'Makeup',
  'Transport', 'Auto', 'Cars', 'Logistics', 'Flowers', 'Priests', 'Event Staff',
  'Equipment', 'Invitations', 'Gifts', 'Cakes', 'Music', 'Beauty', 'Security',
  'Cleaning', 'Hosts', 'Artists', 'Production', 'Rentals', 'More'
]

const searchCatalog = [
  ['Photography', 'Photographers', 'Wedding Photography', 'photo photographer photography video'],
  ['Decor', 'Decorators', 'Floral Decor', 'decor decoration florist flowers'],
  ['Catering', 'Catering Services', 'Cooks & Food Service', 'catering cook food'],
  ['Auto', 'Event Transport', 'Cars & Vehicles', 'auto car transport vehicle'],
  ['Venues', 'Event Venues', 'Halls & Spaces', 'venue hall space'],
  ['Logistics', 'Event Logistics', 'Transport & Delivery', 'logistics delivery supply chain'],
  ['Entertainment', 'DJs & Artists', 'Music & Experiences', 'dj music artist entertainment'],
]

const journey = [
  { id: '01', title: 'Discover', body: 'Start with what your occasion needs.', icon: Search },
  { id: '02', title: 'Connect', body: 'Explore the people and services around it.', icon: Users },
  { id: '03', title: 'Book', body: 'Move the selected service into your event journey.', icon: CalendarDays },
  { id: '04', title: 'Pay', body: 'Use the secure payment flow when booking is ready.', icon: WalletCards },
  { id: '05', title: 'Done', body: 'Keep the work moving toward a ready event.', icon: CircleCheck },
]

const occasions = [
  ['Weddings', IMG.hero],
  ['Birthdays', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=84'],
  ['Corporate Events', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1000&q=84'],
  ['Cultural Events', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=84'],
  ['Social Gatherings', 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=84'],
]

function Brand({ dark = false }) {
  return (
    <a href="#top" className="inline-flex min-w-0 flex-col" aria-label="Sambramo home">
      <span className={`block text-[19px] font-black tracking-[.09em] sm:text-[23px] ${dark ? 'text-[#2A085C]' : 'text-white'}`}>SAMBRAMO</span>
      <span className={`mt-0.5 block text-[6px] font-bold tracking-[.16em] sm:text-[7px] ${dark ? 'text-[#7a6a83]' : 'text-white/60'}`}>EVENT SUPPLY CHAIN &amp; LOGISTICS</span>
    </a>
  )
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={`sambramo-reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </div>
  )
}

function EarlyAccess({ partner = false, open, onClose }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState(partner ? 'Vendors' : 'Events')
  const [website, setWebsite] = useState('')
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
    if (website.trim()) return
    setState('loading')
    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), interest, partner }),
      })
      if (!response.ok) throw new Error('Unable to submit')
      setState('success')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#10021f]/75 p-0 backdrop-blur-md sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Sambramo early access">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[30px] bg-white shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:rounded-[30px]">
        <div className="relative overflow-hidden bg-[#2A085C] px-6 pb-7 pt-7 text-white sm:px-8">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#b86ce9]/25 blur-3xl" />
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"><X size={17} /></button>
          <p className="relative text-[9px] font-black uppercase tracking-[.22em] text-[#F4C85D]">SAMBRAMO · EARLY ACCESS</p>
          <h2 className="relative mt-2 max-w-sm font-serif text-[30px] font-bold leading-tight sm:text-4xl">Be among the first.</h2>
          <p className="relative mt-3 max-w-md text-sm leading-6 text-white/65">Tell us what you want to hear about when Sambramo opens in Bengaluru.</p>
        </div>
        {state === 'success' ? (
          <div className="p-7 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4edfa] text-[#2A085C]"><Check size={25} /></div>
            <h3 className="mt-5 text-2xl font-black text-[#211329]">You’re on the list.</h3>
            <p className="mt-2 text-sm leading-6 text-[#74677b]">We’ll use the details you shared for Sambramo launch updates.</p>
            <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-[#2A085C] py-3.5 text-sm font-black text-white">Continue exploring</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-2">
              {['Events', 'Vendors', 'Logistics', 'Transportation', 'Event Supply Chain', 'Other'].map((item) => (
                <button type="button" key={item} onClick={() => setInterest(item)} className={`min-h-11 rounded-xl border px-3 text-left text-[10px] font-black transition ${interest === item ? 'border-[#2A085C] bg-[#2A085C] text-white' : 'border-[#e3d8e8] bg-white text-[#65566e] hover:border-[#bda9c8]'}`}>{item}</button>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-[#6f6177]">Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-[#ddd1e3] bg-[#fcfafc] px-4 text-sm outline-none focus:border-[#2A085C]" placeholder="you@example.com" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-[#6f6177]">Mobile <span className="font-normal normal-case">(optional)</span></span><input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 w-full rounded-xl border border-[#ddd1e3] bg-[#fcfafc] px-4 text-sm outline-none focus:border-[#2A085C]" placeholder="+91" /></label>
              <input tabIndex="-1" autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[10000px] h-px w-px opacity-0" />
            </div>
            {state === 'error' && <p className="mt-4 rounded-xl bg-[#fff5f4] p-3 text-xs font-bold leading-5 text-[#9b4039]">We couldn’t connect to the launch list right now. Please try again in a moment.</p>}
            <button disabled={state === 'loading'} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F4C85D] px-5 text-sm font-black text-[#1d0b30] disabled:opacity-60">{state === 'loading' ? 'Saving…' : 'Notify Me'}<ArrowRight size={16} /></button>
            <p className="mt-3 text-center text-[9px] leading-4 text-[#9a8ca1]">Bengaluru launch · No unnecessary form fields.</p>
          </form>
        )}
      </div>
    </div>
  )
}

function LaunchButton({ children = 'Get Early Access', partner = false, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      <EarlyAccess partner={partner} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [['#services', 'Services'], ['#supply-chain', 'Supply Chain'], ['#logistics', 'Logistics'], ['#journey', 'How It Works'], ['#partners', 'Partners']]
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#160329]/92 text-white shadow-[0_8px_32px_rgba(16,2,31,.24)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[64px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:min-h-[70px] sm:px-8 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-5 lg:flex">
          {links.map(([href, label]) => <a key={href} href={href} className="rounded-lg px-2 py-2 text-[11px] font-black text-white/68 transition hover:text-white">{label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <LaunchButton className="hidden min-h-10 rounded-xl bg-[#F4C85D] px-4 text-[11px] font-black text-[#1d0b30] shadow-[0_8px_24px_rgba(244,200,93,.14)] transition hover:-translate-y-0.5 sm:inline-flex sm:items-center sm:justify-center">Get Early Access</LaunchButton>
          <button onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white lg:hidden">{open ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#160329] px-4 pb-5 pt-2 lg:hidden">
          {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-bold text-white/88">{label}</a>)}
          <LaunchButton className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#F4C85D] py-3 text-sm font-black text-[#1d0b30]">Get Early Access</LaunchButton>
        </div>
      )}
    </header>
  )
}

function Hero() {
  const [hook, setHook] = useState(0)
  const hooks = ['The event ecosystem is about to connect.', 'Event Supply Chain. Simplified.', 'Logistics. Connected.', 'Discover. Connect. Book. Done.']
  useEffect(() => {
    const timer = window.setInterval(() => setHook((value) => (value + 1) % hooks.length), 3200)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#160329] text-white">
      <div className="absolute inset-0 bg-cover bg-center lg:bg-[center_38%]" style={{ backgroundImage: `url(${IMG.hero})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_34%,rgba(166,94,214,.34),transparent_30%),linear-gradient(90deg,#160329_0%,rgba(22,3,41,.97)_28%,rgba(22,3,41,.74)_56%,rgba(22,3,41,.20)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#160329] via-transparent to-[#160329]/35" />
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle, rgba(244,200,93,.28) 1px, transparent 1px)', backgroundSize: '38px 38px', maskImage: 'linear-gradient(to bottom, black, transparent 70%)' }} />
      <div className="relative mx-auto grid min-h-[calc(100svh-64px)] max-w-[1480px] items-end px-5 pb-14 pt-20 sm:min-h-[680px] sm:px-8 sm:pb-20 lg:min-h-[760px] lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12 lg:pb-12">
        <div className="max-w-3xl">
          <div className="sambramo-enter inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3.5 py-2 text-[9px] font-black uppercase tracking-[.20em] text-[#F4C85D] backdrop-blur-md sm:text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F4C85D] shadow-[0_0_14px_rgba(244,200,93,.75)]" />
            YOUR EVENT. OUR DELIVERY.
          </div>
          <div className="mt-5 overflow-hidden">
            <p className="sambramo-enter text-[10px] font-black uppercase tracking-[.24em] text-white/55">THE FUTURE OF EVENTS IS CONNECTED.</p>
            <h1 className="sambramo-enter mt-3 max-w-3xl font-serif text-[clamp(2.75rem,10.2vw,5.9rem)] font-bold leading-[.94] tracking-[-.045em] [animation-delay:120ms]">
              One event.
              <span className="block text-white/88">One connected</span>
              <span className="block text-[#F4C85D]">experience.</span>
            </h1>
          </div>
          <div className="relative mt-6 min-h-[48px] max-w-2xl overflow-hidden sm:min-h-[54px]">
            {hooks.map((item, index) => <p key={item} className={`absolute inset-x-0 top-0 font-serif text-[clamp(1.25rem,4vw,2rem)] font-bold leading-tight transition-all duration-700 ${index === hook ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-sm'}`}>{item}</p>)}
          </div>
          <p className="sambramo-enter mt-2 max-w-xl text-[13px] leading-6 text-white/65 sm:text-[15px] sm:leading-7 [animation-delay:220ms]">From vendors and event services to supply chain movement and logistics, Sambramo is being built to connect the pieces that make an event happen.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['EVENT SUPPLY CHAIN', 'LOGISTICS', 'VENDORS', 'BOOKING', 'PAYMENT'].map((item, index) => <span key={item} className={`sambramo-enter rounded-full border px-3 py-2 text-[8px] font-black tracking-[.13em] backdrop-blur-md sm:text-[9px] ${index < 2 ? 'border-[#F4C85D]/45 bg-[#F4C85D]/10 text-[#F4C85D]' : 'border-white/12 bg-white/[.05] text-white/58'}`} style={{ animationDelay: `${280 + index * 45}ms` }}>{item}</span>)}
          </div>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <LaunchButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F4C85D] px-6 text-sm font-black text-[#1d0b30] shadow-[0_14px_35px_rgba(244,200,93,.18)] transition hover:-translate-y-0.5 active:scale-[.98]">Get Early Access <ArrowRight size={17} /></LaunchButton>
            <a href="#supply-chain" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/22 bg-white/[.06] px-6 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/[.11]">See how it connects <ArrowDownRight size={16} /></a>
          </div>
          <div className="mt-5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.17em] text-white/38"><MapPin size={12} className="text-[#F4C85D]" /> Bengaluru launch</div>
        </div>

        <div className="hidden h-full min-h-[520px] items-center justify-end lg:flex">
          <HeroProductMap />
        </div>
      </div>
    </section>
  )
}

function HeroProductMap() {
  const cards = [
    { icon: Boxes, title: 'SUPPLY CHAIN', text: 'Supplier → material → venue', pos: 'right-3 top-[12%]' },
    { icon: Truck, title: 'LOGISTICS', text: 'Pickup → move → deliver', pos: 'right-[18%] top-[40%]' },
    { icon: CalendarDays, title: 'BOOKING', text: 'Select → schedule → confirm', pos: 'right-8 bottom-[15%]' },
  ]
  return (
    <div className="relative h-[560px] w-full max-w-[560px]">
      <div className="absolute inset-8 rounded-full border border-white/10" />
      <div className="absolute inset-20 rounded-full border border-[#F4C85D]/15" />
      <div className="absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#F4C85D]/40 bg-[#F4C85D] text-center text-[#2A085C] shadow-[0_0_100px_rgba(244,200,93,.18)]">
        <Sparkles size={22} />
        <p className="mt-2 text-[11px] font-black tracking-[.17em]">SAMBRAMO</p>
        <p className="mt-1 text-[8px] font-bold uppercase tracking-[.13em]">One connected place</p>
      </div>
      {cards.map(({ icon: Icon, title, text, pos }, index) => (
        <div key={title} className={`absolute ${pos} w-[210px] rounded-2xl border border-white/12 bg-[#160329]/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-xl`} style={{ animation: `sambramo-float 6s ease-in-out ${index * .9}s infinite` }}>
          <div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#F4C85D]"><Icon size={17} /></div><div><p className="text-[9px] font-black tracking-[.14em] text-[#F4C85D]">{title}</p><p className="mt-1 text-[10px] leading-4 text-white/55">{text}</p></div></div>
        </div>
      ))}
      <div className="absolute bottom-[16%] left-[5%] rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 backdrop-blur-md">
        <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/42">LAUNCH STATUS</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs font-black"><span className="h-2 w-2 rounded-full bg-[#F4C85D] shadow-[0_0_12px_rgba(244,200,93,.7)]" />Coming soon</div>
      </div>
    </div>
  )
}

function Pillars() {
  const items = [
    [Boxes, 'EVENT SUPPLY CHAIN', 'The people, materials, equipment and movement behind the occasion.'],
    [Truck, 'LOGISTICS', 'Connect pickup, transport, delivery and the venue-side handoff.'],
    [BadgeCheck, 'PARTNERS', 'Bring specialist services into one discoverable event ecosystem.'],
    [WalletCards, 'BOOKING + PAYMENT', 'Move from selected service to booking and payment when the flow is live.'],
  ]
  return (
    <section className="border-b border-[#e8dfea] bg-white">
      <div className="mx-auto grid max-w-[1480px] grid-cols-2 lg:grid-cols-4">
        {items.map(([Icon, title, text], index) => (
          <div key={title} className={`border-r border-b border-[#eee7f1] px-4 py-5 sm:px-7 sm:py-7 ${index > 1 ? 'lg:border-b-0' : ''} ${index === 1 ? 'lg:border-r' : ''} `}>
            <Icon size={21} strokeWidth={1.8} className="text-[#2A085C]" />
            <p className="mt-3 text-[9px] font-black tracking-[.12em] text-[#2A085C] sm:text-[11px]">{title}</p>
            <p className="mt-1.5 text-[9px] leading-4 text-[#7a6d80] sm:text-[11px] sm:leading-5">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SearchExperience({ onOpen }) {
  const examples = ['photographer', 'car', 'logistics', 'decorator', 'venue', 'catering']
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (query) return undefined
    const timer = window.setInterval(() => setActive((value) => (value + 1) % examples.length), 2500)
    return () => window.clearInterval(timer)
  }, [query])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return searchCatalog.filter((item) => item.join(' ').toLowerCase().includes(q)).slice(0, 5)
  }, [query])
  return (
    <section id="search" className="bg-[#faf7fc] px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">Discovery</p>
          <h2 className="mt-2 font-serif text-[clamp(1.9rem,5vw,3rem)] font-bold tracking-[-.025em]">Start with what you need.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#71647a]">Search the service language you already use. Suggestions update as you type.</p>
        </div>
        <div className="relative mx-auto mt-7 max-w-3xl">
          <div className={`flex min-h-14 items-center gap-3 rounded-2xl border bg-white px-4 shadow-[0_16px_55px_rgba(42,8,92,.08)] transition ${focused ? 'border-[#2A085C] ring-4 ring-[#2A085C]/5' : 'border-[#dfd4e5]'}`}>
            <Search size={19} className="shrink-0 text-[#2A085C]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }) }} aria-label="Search event services" placeholder={`Try “${examples[active]}”`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#211329] outline-none placeholder:text-[#a093a8]" />
            {query && <button onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery('')} aria-label="Clear search" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3edf7] text-[#695873]"><X size={15} /></button>}
            <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} className="hidden min-h-10 shrink-0 items-center gap-1 rounded-xl bg-[#2A085C] px-4 text-[10px] font-black text-white sm:flex">Explore <ArrowRight size={13} /></button>
          </div>
          {focused && results.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-[#e1d6e6] bg-white p-2 shadow-[0_22px_60px_rgba(25,7,43,.16)]">
              {results.map(([title, subtitle]) => <button key={title} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(title); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }) }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#f7f1fa]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0e7f6] text-[#2A085C]"><Search size={15} /></span><span><span className="block text-xs font-black text-[#211329]">{title}</span><span className="block text-[10px] text-[#87798d]">{subtitle}</span></span><ArrowUpRight size={14} className="ml-auto text-[#9b8ea2]" /></button>)}
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:justify-center">{['Photography', 'Decor', 'Catering', 'Auto', 'Venues', 'Logistics'].map((item) => <button key={item} onClick={() => { setQuery(item); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }) }} className="shrink-0 rounded-full border border-[#e3d8e9] bg-white px-3.5 py-2 text-[10px] font-black text-[#624f6d] transition hover:border-[#2A085C] hover:text-[#2A085C]">{item}</button>)}</div>
        <button onClick={onOpen} className="mx-auto mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#2A085C]">Want launch access? <span className="text-[#a274bd]">Join the list →</span></button>
      </div>
    </section>
  )
}

function Services() {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const filters = ['All', 'Creative', 'Food', 'Logistics', 'Spaces', 'Specialists', 'Operations']
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter((item) => (filter === 'All' || item.tag === filter) && (!q || `${item.title} ${item.sub} ${item.terms}`.toLowerCase().includes(q)))
  }, [filter, query])
  return (
    <section id="services" className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <Reveal>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">Service discovery</p><h2 className="mt-2 max-w-3xl font-serif text-[clamp(1.9rem,4.5vw,3.1rem)] font-bold leading-[1.02]">The occasion has many moving parts.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71647a]">Explore the categories Sambramo is bringing together around the event journey.</p></div>
            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1"><SlidersHorizontal size={14} className="mr-1 shrink-0 text-[#8050a8]" />{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black transition ${filter === item ? 'bg-[#2A085C] text-white shadow-sm' : 'bg-[#f4eff7] text-[#62536b] hover:bg-[#e9def0]'}`}>{item}</button>)}</div>
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#e4d9e9] bg-[#fbf9fc] px-3"><Search size={15} className="text-[#806d8a]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter services..." className="h-10 min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" /></div>
        </Reveal>
        {shown.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {shown.map(({ title, sub, tag, image, icon: Icon }, index) => (
              <Reveal key={title} delay={index * 35}>
                <a href="#partners" className="group block h-full overflow-hidden rounded-[22px] border border-[#e9e1ed] bg-white shadow-[0_9px_30px_rgba(42,8,92,.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(42,8,92,.13)]">
                  <div className="relative aspect-[1.08] overflow-hidden"><img src={image} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/92 text-[#2A085C]"><Icon size={15} /></span><span className="absolute bottom-3 left-3 rounded-full bg-[#18042f]/75 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white backdrop-blur">{tag}</span><span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#2A085C]"><ArrowUpRight size={13} /></span></div>
                  <div className="p-4 sm:p-5"><h3 className="text-[11px] font-black leading-5 sm:text-[13px]">{title}</h3><p className="mt-1 text-[9px] leading-4 text-[#7d7082] sm:text-[11px]">{sub}</p></div>
                </a>
              </Reveal>
            ))}
          </div>
        ) : <div className="mt-8 rounded-2xl border border-dashed border-[#d9cce0] bg-[#fbf8fd] p-10 text-center"><Search size={22} className="mx-auto text-[#8a7693]" /><p className="mt-3 text-sm font-black">Nothing matches that filter.</p><button onClick={() => { setFilter('All'); setQuery('') }} className="mt-3 text-xs font-black text-[#2A085C]">Clear filters</button></div>}
      </div>
    </section>
  )
}

function SupplyChain() {
  const nodes = [
    [Boxes, 'Supplier', 'Materials & equipment'],
    [Users, 'Partner', 'Specialist service'],
    [Truck, 'Movement', 'Pickup & transport'],
    [MapPin, 'Venue', 'Delivery & handoff'],
    [PartyPopper, 'Event', 'Ready to celebrate'],
  ]
  return (
    <section id="supply-chain" className="overflow-hidden bg-[#17032f] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <Reveal>
          <div className="max-w-3xl"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F4C85D]">01 · Event Supply Chain</p><h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3.7rem)] font-bold leading-[1.02]">An event is more than the moment people see.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">The visible celebration sits on top of a chain of services, materials, equipment, people and movement. Sambramo is being built around that reality.</p></div>
        </Reveal>
        <div className="relative mt-10 rounded-[30px] border border-white/10 bg-white/[.035] p-5 sm:p-8 lg:p-12">
          <div className="absolute left-[10%] right-[10%] top-1/2 hidden h-px bg-gradient-to-r from-transparent via-[#F4C85D]/40 to-transparent lg:block" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {nodes.map(([Icon, title, sub], index) => (
              <Reveal key={title} delay={index * 60}>
                <div className="relative h-full rounded-2xl border border-white/10 bg-white/[.045] p-4 backdrop-blur-md lg:bg-[#1d0838]">
                  <div className="flex items-center gap-3 lg:block"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C85D]/10 text-[#F4C85D]"><Icon size={18} /></div><div><p className="mt-0 text-[10px] font-black uppercase tracking-[.14em] text-white lg:mt-4">{title}</p><p className="mt-1 text-[9px] leading-4 text-white/45">{sub}</p></div></div>
                  {index < nodes.length - 1 && <ArrowRight size={14} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-[#F4C85D] lg:block" />}
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[8px] font-black uppercase tracking-[.13em] text-white/38 lg:hidden"><span>Supplier</span><ArrowRight size={12}/><span>Movement</span><ArrowRight size={12}/><span>Venue</span><ArrowRight size={12}/><span>Event</span></div>
        </div>
      </div>
    </section>
  )
}

function Logistics() {
  const [active, setActive] = useState(1)
  const stops = ['Pickup', 'In Transit', 'Venue', 'Event Ready']
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % stops.length), 2200)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <section id="logistics" className="bg-[#f7f3fa] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
          <Reveal>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">02 · Logistics</p>
            <h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.02]">Book it. Move it. Track the journey.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#71647a]">The logistics story is simple: connect the thing that needs to move with the people, vehicle and venue-side handoff that make it arrive.</p>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">{stops.map((stop, index) => <button key={stop} onClick={() => setActive(index)} className={`rounded-xl border px-3 py-3 text-left transition ${active === index ? 'border-[#2A085C] bg-[#2A085C] text-white' : 'border-[#dfd4e5] bg-white text-[#65566e]'}`}><span className={`text-[8px] font-black ${active === index ? 'text-[#F4C85D]' : 'text-[#9a8ca2]'}`}>0{index + 1}</span><span className="mt-1 block text-[10px] font-black">{stop}</span></button>)}</div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative overflow-hidden rounded-[30px] bg-[#2A085C] p-5 text-white shadow-[0_25px_80px_rgba(42,8,92,.17)] sm:p-8">
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="relative">
                <div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-white/42">Journey preview</p><p className="mt-1 text-sm font-black">Event essentials</p></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-[#F4C85D]">Bengaluru</span></div>
                <div className="relative mt-8 px-1 sm:px-8">
                  <div className="absolute left-[10%] right-[10%] top-7 h-1 rounded-full bg-white/10" /><div className="absolute left-[10%] top-7 h-1 rounded-full bg-[#F4C85D] transition-all duration-700" style={{ width: `${(active / (stops.length - 1)) * 80}%` }} />
                  <div className="grid grid-cols-4">
                    {stops.map((stop, index) => <button key={stop} onClick={() => setActive(index)} className="relative z-10 text-center"><span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border transition ${index <= active ? 'border-[#F4C85D] bg-[#F4C85D] text-[#2A085C]' : 'border-white/12 bg-white/[.06] text-white/35'}`}>{index === 0 ? <Boxes size={18}/> : index === 1 ? <Truck size={18}/> : index === 2 ? <MapPin size={18}/> : <PartyPopper size={18}/>}</span><span className="mt-3 block text-[8px] font-black text-white/55">{stop}</span></button>)}
                  </div>
                </div>
                <div className="mt-8 grid gap-2 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><Route size={16} className="text-[#F4C85D]" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-white/45">Route</p><p className="mt-1 text-xs font-black">Supplier → venue</p></div><div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><Clock3 size={16} className="text-[#F4C85D]" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-white/45">Status</p><p className="mt-1 text-xs font-black">{stops[active]}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><Truck size={16} className="text-[#F4C85D]" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-white/45">Movement</p><p className="mt-1 text-xs font-black">Event logistics</p></div></div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Ecosystem() {
  const items = [['Vendors', Users], ['Events', PartyPopper], ['Logistics', Truck], ['Transport', CarFront], ['Suppliers', Boxes], ['Bookings', CalendarDays], ['Payments', WalletCards], ['Customers', Gem]]
  return (
    <section className="bg-[#1e063b] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <Reveal><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F4C85D]">The ecosystem</p><h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.02]">Many roles. One connected layer.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/58">The consumer view is simple. Underneath it is a network of customers, event specialists, suppliers, bookings, payments, transport and logistics.</p></Reveal>
          <Reveal delay={100}>
            <div className="rounded-[30px] border border-white/10 bg-white/[.04] p-4 sm:p-8">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {items.map(([name, Icon], index) => <div key={name} className="rounded-2xl border border-white/10 bg-white/[.045] p-4"><Icon size={17} className={index < 2 ? 'text-[#F4C85D]' : 'text-white/65'} /><p className="mt-3 text-[10px] font-black">{name}</p><p className="mt-1 text-[8px] text-white/38">Connected</p></div>)}
              </div>
              <div className="mt-3 rounded-2xl border border-[#F4C85D]/20 bg-[#F4C85D]/[.08] p-4 text-center"><p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F4C85D]">SAMBRAMO</p><p className="mt-1 text-xs font-black">Discover → Connect → Book → Pay → Done</p></div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Journey() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % journey.length), 3000)
    return () => window.clearInterval(timer)
  }, [])
  const current = journey[active]
  const Icon = current.icon
  return (
    <section id="journey" className="bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <Reveal><div className="text-center"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">03 · Product journey</p><h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3.5rem)] font-bold">Discover → Book → Pay → Done.</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#71647a]">A product story, not a promise that every launch capability is already live.</p></div></Reveal>
        <div className="mt-10 grid gap-3 lg:grid-cols-5">
          {journey.map((item, index) => <button key={item.id} onClick={() => setActive(index)} className={`rounded-2xl border p-4 text-left transition ${index === active ? 'border-[#2A085C] bg-[#2A085C] text-white shadow-[0_15px_35px_rgba(42,8,92,.16)]' : 'border-[#e5dbe9] bg-[#fbf9fc] text-[#5f5267] hover:bg-white'}`}><span className={`text-[9px] font-black ${index === active ? 'text-[#F4C85D]' : 'text-[#9b8ca2]'}`}>{item.id}</span><span className="mt-2 block text-sm font-black">{item.title}</span><span className={`mt-1 block text-[9px] leading-4 ${index === active ? 'text-white/55' : 'text-[#887b90]'}`}>{item.body}</span></button>)}
        </div>
        <Reveal delay={120}>
          <div className="relative mt-5 overflow-hidden rounded-[30px] bg-[#2A085C] p-6 text-white sm:p-9">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#b96be8]/20 blur-3xl" />
            <div className="relative grid gap-8 md:grid-cols-[1fr_.8fr] md:items-center">
              <div><span className="rounded-full border border-white/12 bg-white/[.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-[#F4C85D]">Step {current.id}</span><h3 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">{current.title}</h3><p className="mt-3 max-w-xl text-sm leading-7 text-white/62">{current.body}</p><div className="mt-6 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]"><Icon size={19} /></span><span className="text-xs font-black text-white/58">One connected event journey</span></div></div>
              <div className="rounded-[24px] border border-white/12 bg-white/[.06] p-4 backdrop-blur-xl"><div className="rounded-[18px] bg-[#fbf8fd] p-4 text-[#211329]"><p className="text-[8px] font-black uppercase tracking-[.15em] text-[#897a92]">Booking state</p><div className="mt-4 space-y-2">{['Selected service', 'Partner connection', 'Payment', 'Confirmed'].map((label, index) => <div key={label} className="flex items-center gap-2 rounded-xl border border-[#ece4ef] bg-white p-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${index <= active ? 'bg-[#2A085C] text-white' : 'bg-[#f0e9f3] text-[#a090a8]'}`}>{index <= active ? <Check size={12} /> : <span className="text-[8px] font-black">{index + 1}</span>}</span><span className="text-[10px] font-black">{label}</span></div>)}</div></div></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Partners() {
  return (
    <section id="partners" className="bg-[#230747] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <Reveal><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F4C85D]">For event partners</p><h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02]">Bring your service into the event ecosystem.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/60">The partner experience is being prepared for specialists across catering, decor, photography, venues, entertainment, transport, logistics and more.</p><div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">{['List services', 'Receive opportunities', 'Manage schedule', 'Track work'].map((item, index) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.05] p-3.5"><span className="text-[8px] font-black text-[#F4C85D]">0{index + 1}</span><p className="mt-2 text-[9px] font-black">{item}</p></div>)}</div><LaunchButton partner className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F4C85D] px-5 text-sm font-black text-[#1d0b30]">Join as a Partner <ArrowRight size={15} /></LaunchButton></Reveal>
          <Reveal delay={100}><div className="rounded-[30px] border border-white/10 bg-white/[.055] p-3 shadow-2xl"><div className="rounded-[24px] bg-[#fbf8fd] p-4 text-[#211329] sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#8a7b93]">Partner workspace preview</p><p className="mt-1 text-base font-black">Your event work, connected.</p></div><span className="rounded-full bg-[#efe4f5] px-2.5 py-1 text-[8px] font-black text-[#5c3d70]">Preview</span></div><div className="mt-5 grid grid-cols-3 gap-2">{[['Jobs', 'Opportunities'], ['Calendar', 'Availability'], ['Work', 'Earnings']].map(([a, b]) => <div key={a} className="rounded-xl bg-[#f4eff8] p-3"><p className="text-[10px] font-black text-[#2A085C]">{a}</p><p className="mt-1 text-[8px] text-[#7d7083]">{b}</p></div>)}</div><div className="mt-3 rounded-2xl border border-[#e8ddea] bg-white p-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0e7f6] text-[#2A085C]"><Bell size={14} /></span><div><p className="text-[10px] font-black">New event opportunity</p><p className="text-[8px] text-[#8a7c92]">Review details before responding.</p></div></div><div className="mt-4 flex gap-2"><div className="h-2 flex-1 rounded-full bg-[#e9dff0]" /><div className="h-2 w-1/4 rounded-full bg-[#2A085C]" /></div></div></div></div></Reveal>
        </div>
      </div>
    </section>
  )
}

function Occasions() {
  const [index, setIndex] = useState(0)
  return (
    <section className="bg-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">Occasions</p><h2 className="mt-2 font-serif text-[clamp(1.9rem,4.5vw,3rem)] font-bold">Made for the moment.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71647a]">The same connected idea, shaped around different kinds of celebrations and gatherings.</p></div><div className="hidden gap-2 sm:flex"><button aria-label="Previous occasion" onClick={() => setIndex((v) => (v - 1 + occasions.length) % occasions.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd4e5] text-[#2A085C]"><ChevronLeft size={17} /></button><button aria-label="Next occasion" onClick={() => setIndex((v) => (v + 1) % occasions.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd4e5] text-[#2A085C]"><ChevronRight size={17} /></button></div></div>
        <div className="mt-8 flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-5">{[0,1,2,3,4].map((offset) => { const item = occasions[(index + offset) % occasions.length]; return <div key={item[0]} className="group relative min-w-[78%] snap-start overflow-hidden rounded-[22px] sm:min-w-0"><img src={item[1]} alt={item[0]} loading="lazy" decoding="async" className="aspect-[1.12] h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><p className="absolute bottom-0 left-0 p-4 text-xs font-black text-white">{item[0]}</p></div> })}</div>
      </div>
    </section>
  )
}

function Bengaluru() {
  return (
    <section className="relative overflow-hidden bg-[#2A085C] px-5 py-14 text-white sm:px-8 lg:py-18">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(244,200,93,.18),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(182,107,232,.18),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[1480px] gap-7 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F4C85D]">Launch market</p><h2 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] font-bold">Bengaluru first.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Sambramo is preparing its first connected event experience for Bengaluru.</p></div><div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">{['South', 'Central', 'East', 'West', 'More areas'].map((item) => <span key={item} className="rounded-xl border border-white/12 bg-white/[.06] px-3.5 py-2 text-[9px] font-black text-white/68">{item} Bengaluru</span>)}</div></div>
    </section>
  )
}

function About() {
  const points = [[Users, 'Customers + partners'], [Boxes, 'Supply chain thinking'], [Truck, 'Logistics connected'], [Sparkles, 'Celebration-led'], [MapPin, 'Bengaluru first']]
  return (
    <section id="about" className="bg-[#f7f3fa] px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]"><div className="mx-auto max-w-3xl text-center"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">The Sambramo idea</p><h2 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3.1rem)] font-bold">Built around the way events actually happen.</h2><p className="mt-4 text-sm leading-7 text-[#71647a]">The ambition is simple: make a complex event ecosystem feel understandable, discoverable and connected.</p></div><div className="mt-10 grid grid-cols-2 border-y border-[#e2d7e7] sm:grid-cols-3 lg:grid-cols-5">{points.map(([Icon, title], index) => <div key={title} className={`border-b border-r border-[#e2d7e7] px-4 py-7 text-center ${index >= 3 ? 'lg:border-b-0' : ''}`}><Icon size={24} className="mx-auto text-[#2A085C]" strokeWidth={1.7} /><p className="mt-4 text-[10px] font-black">{title}</p></div>)}</div></div>
    </section>
  )
}

function FAQ() {
  const questions = [
    ['When is Sambramo launching?', 'Sambramo is preparing its first launch in Bengaluru. The public site is open for discovery while customer and partner access is being prepared.'],
    ['What is Event Supply Chain?', 'It describes the connected flow around an event: specialists, materials, equipment, transport, delivery, venue-side work and the event itself.'],
    ['Is Sambramo only for weddings?', 'No. The experience is being designed for weddings, birthdays, corporate events, cultural programs, social gatherings and other occasions.'],
    ['Can I join as a partner?', 'Yes. Partner access is being prepared for event specialists including catering, decor, photography, entertainment, venues, transport and logistics.'],
  ]
  const [active, setActive] = useState(0)
  return (
    <section className="bg-[#fffdfd] px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl"><div className="text-center"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#8050a8]">Questions</p><h2 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] font-bold">A few things worth knowing.</h2></div><div className="mt-8 space-y-2">{questions.map(([question, answer], index) => <div key={question} className="overflow-hidden rounded-2xl border border-[#e8deed] bg-white"><button onClick={() => setActive(active === index ? -1 : index)} aria-expanded={active === index} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left"><span className="text-sm font-black">{question}</span><ChevronDown size={17} className={active === index ? 'rotate-180 text-[#2A085C]' : 'text-[#2A085C]'} /></button>{active === index && <p className="px-5 pb-5 text-sm leading-6 text-[#75697b]">{answer}</p>}</div>)}</div></div>
    </section>
  )
}

function Footer() {
  const links = [['#services', 'Services'], ['#supply-chain', 'Supply Chain'], ['#logistics', 'Logistics'], ['#journey', 'How It Works'], ['#partners', 'Partners']]
  return (
    <footer id="contact" className="bg-[#160329] px-5 pb-7 pt-12 text-white sm:px-8">
      <div className="mx-auto grid max-w-[1480px] gap-9 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr]">
        <div><Brand /><p className="mt-5 max-w-xs text-xs leading-6 text-white/42">Discover. Connect. Book. Pay. Done.</p><p className="mt-4 flex items-center gap-2 text-xs text-white/42"><MapPin size={13} className="text-[#F4C85D]" /> Bengaluru launch</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/70">Explore</p><div className="mt-4 space-y-2.5 text-xs text-white/48">{links.map(([href, label]) => <a key={href} href={href} className="block hover:text-white">{label}</a>)}</div></div>
        <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/70">Access</p><LaunchButton className="mt-4 text-xs text-white/50 hover:text-white">Customer early access</LaunchButton><LaunchButton partner className="mt-3 block text-xs text-white/50 hover:text-white">Partner early access</LaunchButton></div>
        <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/70">The idea</p><p className="mt-4 text-xs leading-6 text-white/42">EVENT SUPPLY CHAIN<br />LOGISTICS<br />DISCOVERY<br />BOOKING<br />PAYMENT</p></div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1480px] flex-col gap-2 border-t border-white/10 pt-5 text-[9px] text-white/30 sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} SAMBRAMO. All rights reserved.</span><span className="font-black tracking-[.15em] text-[#F4C85D]">YOUR EVENT. OUR DELIVERY.</span></div>
    </footer>
  )
}

export default function PublicSite() {
  const [earlyOpen, setEarlyOpen] = useState(false)
  return (
    <div className="sambramo-site min-h-screen overflow-x-clip bg-white text-[#211329] selection:bg-[#F4C85D] selection:text-[#1d0b30]">
      <Nav />
      <main>
        <Hero />
        <Pillars />
        <SearchExperience onOpen={() => setEarlyOpen(true)} />
        <Services />
        <SupplyChain />
        <Logistics />
        <Ecosystem />
        <Journey />
        <Partners />
        <Bengaluru />
        <Occasions />
        <About />
        <FAQ />
      </main>
      <Footer />
      <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden">
        <div className="mx-auto flex max-w-[430px] gap-2 rounded-2xl border border-[#e2d8e7] bg-white/96 p-2 shadow-[0_14px_40px_rgba(42,8,92,.18)] backdrop-blur-xl">
          <button onClick={() => setEarlyOpen(true)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2A085C] text-xs font-black text-white">Get Early Access <ArrowRight size={14} /></button>
          <a href="#supply-chain" className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#F4C85D] text-xs font-black text-[#1d0b30]">Explore</a>
        </div>
      </div>
      <EarlyAccess open={earlyOpen} onClose={() => setEarlyOpen(false)} />
    </div>
  )
}
