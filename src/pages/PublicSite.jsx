import { useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bell, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, Heart, Instagram, Linkedin, MapPin, Menu, PackageCheck,
  Search, ShieldCheck, Sparkles, Truck, Users, X, Youtube
} from 'lucide-react'

const services = [
  ['Venues & Equipment','Spaces & setup','Spaces','https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=88'],
  ['Decorations & Florists','Themes & flowers','Creative','https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=88'],
  ['Catering & Cooks','Food & serving','Food','https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1000&q=88'],
  ['Photography & Videography','Capture the moment','Creative','https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=88'],
  ['DJ & Entertainment','Music & artists','Creative','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=88'],
  ['Event Staff','On-ground support','Operations','https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1000&q=88'],
  ['Logistics & Transport','Move people & things','Logistics','https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=88'],
  ['Beauty, Priests & More','Specialist services','Specialists','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=88'],
]
const trades = ['Catering & Cooks','Decorations & Florists','Photography & Videography','DJ & Entertainment','Venues & Equipment','Logistics & Transport','Beauty & Wellness','Priests & Traditional Services']
const flow = [
  ['01','Tell us the occasion','Date, location, guest count and what you are celebrating.',Sparkles],
  ['02','Explore what you need','Discover service categories and event partners.',Search],
  ['03','Build the plan','Bring selected services into one event plan.',CalendarDays],
  ['04','Coordinate','Connect preparation, availability and event-day movement.',Users],
  ['05','Deliver','Partners prepare, move, set up and support the event.',Truck],
  ['06','Celebrate','You focus on the people and the moment.',Heart],
]
const occasions = [
  ['Weddings','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=88'],
  ['Birthdays','https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=88'],
  ['Corporate Events','https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=88'],
  ['Cultural Events','https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=88'],
  ['Social Gatherings','https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=88'],
]

function LaunchSoon({partner=false,onClose}) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#120321]/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
    <div className="relative w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-2xl">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"><X size={18}/></button>
      <div className="relative bg-[#2A085C] px-7 pb-8 pt-9 text-white">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#a75ddd]/25 blur-3xl"/>
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]"><Sparkles size={24}/></div>
        <p className="relative mt-6 text-[10px] font-black uppercase tracking-[.24em] text-[#F4C85D]">SAMBRAMO • BENGALURU</p>
        <h2 className="relative mt-2 font-serif text-3xl font-bold">We’re launching soon.</h2>
        <p className="relative mt-3 text-sm leading-6 text-white/70">{partner ? 'The Sambramo partner experience is being prepared for event professionals across Bengaluru.' : 'The Sambramo customer experience is being prepared for Bengaluru. Access will open when the launch is ready.'}</p>
      </div>
      <div className="p-6">
        <div className="flex gap-3 rounded-2xl border border-[#eadff1] bg-[#fbf8fd] p-4"><MapPin size={18} className="mt-0.5 text-[#2A085C]"/><div><p className="text-sm font-black">Starting with Bengaluru</p><p className="mt-1 text-xs text-[#776b7d]">Events • Partners • Services • Logistics</p></div></div>
        <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-[#2A085C] py-3.5 text-sm font-black text-white">Continue exploring</button>
      </div>
    </div>
  </div>
}
function LaunchButton({children,partner=false,className=''}) {
  const [open,setOpen]=useState(false)
  return <><button type="button" onClick={()=>setOpen(true)} className={className}>{children}</button>{open&&<LaunchSoon partner={partner} onClose={()=>setOpen(false)}/>}</>
}
function Brand(){return <a href="#top" className="shrink-0"><span className="block text-[21px] font-black tracking-[.075em] text-white sm:text-[25px]">SAMBRAMO</span><span className="block text-[6.5px] font-semibold tracking-[.17em] text-white/65">EVENT SUPPLY CHAIN &amp; LOGISTICS</span></a>}

function Nav(){
  const [open,setOpen]=useState(false)
  const links=[['#services','Services'],['#how-it-works','How It Works'],['#about','About'],['#partners','Partners'],['#bengaluru','Bengaluru'],['#contact','Contact']]
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#210747]/92 shadow-lg backdrop-blur-2xl">
    <div className="mx-auto flex h-[66px] max-w-[1480px] items-center justify-between px-4 sm:h-[74px] sm:px-8">
      <Brand/><nav className="hidden items-center gap-6 xl:flex">{links.map(([h,l],i)=><a key={h} href={h} className={`text-[12px] font-black transition ${i===0?'text-[#F4C85D]':'text-white/75 hover:text-white'}`}>{l}</a>)}</nav>
      <div className="flex items-center gap-2"><LaunchButton className="hidden rounded-xl bg-[#F4C85D] px-5 py-2.5 text-[12px] font-black text-[#1d0b30] sm:block">Launching Soon</LaunchButton><button onClick={()=>setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white xl:hidden">{open?<X size={19}/>:<Menu size={19}/>}</button></div>
    </div>
    {open&&<div className="border-t border-white/10 bg-[#210747] px-4 pb-5 pt-3 xl:hidden"><div className="space-y-1">{links.map(([h,l])=><a key={h} href={h} onClick={()=>setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white/85">{l}</a>)}<LaunchButton className="mt-2 w-full rounded-xl bg-[#F4C85D] py-3 text-sm font-black text-[#1d0b30]">Launching Soon</LaunchButton></div></div>}
  </header>
}

function Hero(){
  return <section id="top" className="relative isolate min-h-[600px] overflow-hidden bg-[#18042f] text-white sm:min-h-[660px] lg:min-h-[700px]">
    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2200&q=90')] bg-cover bg-center"/>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(120,60,170,.3),transparent_32%),linear-gradient(90deg,#18042f_0%,rgba(24,4,47,.98)_30%,rgba(24,4,47,.75)_55%,rgba(24,4,47,.2)_100%)]"/>
    <div className="absolute inset-0 bg-gradient-to-t from-[#18042f]/75 via-transparent to-[#18042f]/20"/>
    <div className="relative mx-auto flex min-h-[600px] max-w-[1480px] items-end px-5 pb-14 pt-28 sm:min-h-[660px] sm:px-10 sm:pb-20 lg:min-h-[700px] lg:px-14">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#F4C85D]"><i className="h-1.5 w-1.5 rounded-full bg-[#F4C85D]"/>YOUR EVENT. OUR DELIVERY.</span>
        <h1 className="mt-5 font-serif text-[43px] font-bold leading-[.94] tracking-[-.035em] sm:text-[62px] lg:text-[76px]">Everything your event needs.<span className="block">Connected in one place.</span></h1>
        <p className="mt-6 max-w-xl text-[15px] leading-7 text-white/75 sm:text-[17px]">Sambramo brings event services, partners and logistics together so you can focus on the occasion—not the coordination.</p>
        <div className="mt-6 flex items-center gap-2 text-sm font-bold"><MapPin size={17} className="text-[#F4C85D]"/>Bengaluru, Karnataka</div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><LaunchButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F4C85D] px-6 py-3.5 text-sm font-black text-[#1c0b2d] shadow-xl">Customer Experience <ArrowRight size={17}/></LaunchButton><a href="#partners" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/[.06] px-6 py-3.5 text-sm font-black text-white backdrop-blur-md">Partner With Sambramo <ArrowUpRight size={16}/></a></div>
        <p className="mt-4 text-[11px] font-semibold text-white/40">The platform is launching soon in Bengaluru.</p>
      </div>
    </div>
    <div className="absolute bottom-8 right-8 hidden w-[290px] rounded-2xl border border-white/15 bg-[#18042f]/55 p-4 backdrop-blur-xl lg:block"><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/55">One connected experience</p><div className="mt-3 grid grid-cols-3 gap-2">{['Services','Partners','Logistics'].map((x,i)=><div key={x} className="rounded-xl bg-white/[.07] p-3"><p className="text-[10px] font-black">{x}</p><p className="mt-1 text-[9px] text-white/45">{['Explore','Connect','Deliver'][i]}</p></div>)}</div></div>
  </section>
}

function FeatureStrip(){
  const items=[[Users,'Multiple Event Services','From venues to logistics'],[BadgeCheck,'Partner Ecosystem','Event specialists'],[CalendarDays,'Simpler Coordination','Plan the moving parts'],[Heart,'For Every Celebration','Personal or professional']]
  return <section className="border-b border-[#e9e0ef] bg-white"><div className="mx-auto grid max-w-[1480px] grid-cols-2 lg:grid-cols-4">{items.map(([I,t,s])=><div key={t} className="flex items-center gap-3 border-b border-r border-[#ece4f0] px-5 py-5 lg:border-b-0 lg:px-8 lg:py-6"><I size={28} strokeWidth={1.7} className="shrink-0 text-[#2A085C]"/><div><p className="text-[11px] font-black sm:text-[13px]">{t}</p><p className="mt-1 text-[9px] text-[#7c7183] sm:text-[11px]">{s}</p></div></div>)}</div></section>
}

function Story(){
  return <section className="bg-[#fffdfd]"><div className="mx-auto grid max-w-[1480px] lg:grid-cols-[.9fr_1.1fr]">
    <div className="relative min-h-[390px] overflow-hidden bg-[url('https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1400&q=90')] bg-cover bg-center sm:min-h-[500px]"><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent"/><div className="absolute bottom-0 p-7 sm:p-10"><p className="max-w-md font-serif text-2xl leading-tight text-white sm:text-3xl">From small gatherings to grand celebrations, Sambramo grows with the occasion.</p></div></div>
    <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">The connected event model</p><h2 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">An event has many moving parts. Sambramo brings them together.</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-[#6e6274]">Planning an event can mean coordinating services, availability, transport, equipment, payments and execution separately. Sambramo is designed around one connected event experience.</p><div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">{flow.map(([n,t,,I])=><div key={n} className="text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0e7f7] text-[#2A085C]"><I size={18}/></div><p className="mt-2 text-[9px] font-black leading-4 sm:text-[10px]">{t}</p></div>)}</div></div>
  </div></section>
}

function Services(){
  const [filter,setFilter]=useState('All')
  const filters=['All','Creative','Food','Logistics','Spaces']
  const shown=useMemo(()=>filter==='All'?services:services.filter(x=>x[2]===filter),[filter])
  return <section id="services" className="bg-white px-5 py-14 sm:px-8 lg:py-20"><div className="mx-auto max-w-[1480px]">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Explore the ecosystem</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Services built around real events.</h2></div><div className="flex gap-1.5 overflow-x-auto">{filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] font-black ${filter===f?'bg-[#2A085C] text-white':'bg-[#f4eff7] text-[#5f4d68]'}`}>{f}</button>)}</div></div>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{shown.map(([title,sub,tag,img])=><a href="#partners" key={title} className="group overflow-hidden rounded-[20px] border border-[#ebe3ef] bg-white shadow-[0_8px_28px_rgba(42,8,92,.05)] transition hover:-translate-y-1 hover:shadow-xl"><div className="relative aspect-[1.15] overflow-hidden"><img src={img} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#2A085C]">{tag}</span><span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white"><ArrowUpRight size={13}/></span></div><div className="p-4 sm:p-5"><h3 className="text-[12px] font-black leading-5 sm:text-[14px]">{title}</h3><p className="mt-1.5 text-[10px] leading-4 text-[#7b7080] sm:text-[11px]">{sub}</p></div></a>)}</div>
    <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#e8deee] bg-[#fbf8fd] px-4 py-3.5"><p className="text-[10px] font-bold text-[#6c6073] sm:text-xs">More specialist categories are part of the partner ecosystem.</p><a href="#partners" className="inline-flex items-center gap-1 text-[10px] font-black text-[#2A085C]">Explore partners <ArrowRight size={13}/></a></div>
  </div></section>
}

function HowItWorks(){
  const [active,setActive]=useState(2)
  const [n,title,body,I]=flow[active]

  return (
    <section id="how-it-works" className="bg-[#f7f3fa] px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-9 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">How it works</p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">A journey designed to feel simpler.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#6d6173]">
              The public experience is shaped around the same connected model as the partner side: services, jobs, schedules, earnings and event-day movement.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {flow.map(([id,t]) => (
                <button
                  key={id}
                  onClick={() => setActive(Number(id)-1)}
                  className={`rounded-xl border px-3 py-2 text-[10px] font-black ${active===Number(id)-1 ? 'border-[#2A085C] bg-[#2A085C] text-white' : 'border-[#ded2e5] bg-white text-[#624f6d]'}`}
                >
                  {id} · {t}
                </button>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] bg-[#2A085C] p-6 text-white shadow-[0_25px_80px_rgba(42,8,92,.18)] sm:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#8c4dca]/30 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-[1fr_.8fr] md:items-center">
              <div>
                <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#F4C85D]">
                  Step {n}
                </span>
                <h3 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">{title}</h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-white/70">{body}</p>

                <div className="mt-7 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]">
                    <I size={20} />
                  </div>
                  <span className="text-xs font-black text-white/70">One connected event journey</span>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/[.07] p-3 backdrop-blur-xl">
                <div className="rounded-[22px] bg-[#fbf7fd] p-4 text-[#211329]">
                  <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#8a7693]">Event workspace</p>
                  <p className="mt-1 text-sm font-black">Bengaluru celebration</p>

                  <div className="mt-5 space-y-2">
                    {['Services selected','Partner coordination','Event-day logistics'].map((x,i) => (
                      <div key={x} className="flex items-center gap-2 rounded-xl border border-[#eee5f2] bg-white p-3">
                        <span className={`h-2 w-2 rounded-full ${i <= active/2 ? 'bg-emerald-500' : 'bg-[#c9bdcf]'}`} />
                        <span className="text-[10px] font-bold">{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnerSection(){
  const [tab,setTab]=useState('Jobs')
  const tabs=['Jobs','Calendar','Earnings','More']
  return <section id="partners" className="bg-[#210747] px-5 py-14 text-white sm:px-8 lg:py-20"><div className="mx-auto max-w-[1480px]"><div className="grid gap-10 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
    <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">For event partners</p><h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Turn your service into a connected event business.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/70">The partner journey is designed around real work: onboarding, service listings, opportunities, schedules, job details and earnings.</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['01','List services'],['02','Receive opportunities'],['03','Manage schedule'],['04','Track earnings']].map(([n,t])=><div key={n} className="rounded-2xl border border-white/10 bg-white/[.055] p-3.5"><span className="text-[9px] font-black text-[#F4C85D]">{n}</span><p className="mt-2 text-[10px] font-extrabold">{t}</p></div>)}</div><div className="mt-6 flex flex-wrap gap-2">{trades.map(x=><span key={x} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[9px] font-bold text-white/70">{x}</span>)}</div><LaunchButton partner className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#F4C85D] px-5 py-3.5 text-sm font-black text-[#1d0b30]">Partner Launch <ArrowRight size={15}/></LaunchButton></div>
    <div className="relative rounded-[32px] border border-white/12 bg-white/[.06] p-3 shadow-2xl backdrop-blur-xl"><div className="rounded-[26px] bg-[#fbf8fd] p-4 text-[#211329] sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#87768f]">SAMBRAMO PARTNER</p><p className="mt-1 text-base font-black">Good morning, Partner</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black text-emerald-700">Online</span></div><div className="mt-4 grid grid-cols-3 gap-2">{[['New jobs','6'],['Responded','2'],['Confirmed','1']].map(([l,n])=><div key={l} className="rounded-xl bg-[#f4eff8] p-3"><p className="text-[9px] text-[#7b6e82]">{l}</p><p className="mt-1 text-xl font-black text-[#2A085C]">{n}</p></div>)}</div><div className="mt-4 flex gap-1.5 overflow-x-auto">{tabs.map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg px-3 py-2 text-[9px] font-black ${tab===x?'bg-[#2A085C] text-white':'bg-[#f2edf6] text-[#65546e]'}`}>{x}</button>)}</div><div className="mt-3 rounded-2xl border border-[#e9dfee] bg-white p-4"><div className="flex items-start justify-between"><div><span className="rounded-full bg-[#e8d9f5] px-2 py-1 text-[8px] font-black text-[#5c3480]">NEW OPPORTUNITY</span><h4 className="mt-2 text-sm font-black">Wedding Photography</h4><p className="mt-1 text-[9px] text-[#7b6e82]">28 Sep · Koramangala · 250 guests</p></div><ArrowUpRight size={15} className="text-[#2A085C]"/></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#fbf8fd] p-3"><p className="text-[8px] text-[#87798d]">Customer range</p><p className="mt-1 text-[11px] font-black">₹15,000–₹20,000</p></div><div className="rounded-xl bg-[#fbf8fd] p-3"><p className="text-[8px] text-[#87798d]">Distance</p><p className="mt-1 text-[11px] font-black">12 km</p></div></div><div className="mt-4 flex gap-2"><button onClick={()=>setTab('Jobs')} className="flex-1 rounded-xl border border-[#dcd0e4] py-2.5 text-[9px] font-black">Decline</button><LaunchButton partner className="flex-1 rounded-xl bg-[#2A085C] py-2.5 text-[9px] font-black text-white">Accept Job</LaunchButton></div></div><div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-[#ece3f0] pt-3">{tabs.map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-lg py-2 text-[8px] font-black ${tab===x?'bg-[#f1e8f7] text-[#2A085C]':'text-[#84768a]'}`}>{x}</button>)}</div></div></div>
  </div></div></section>
}

function Bengaluru(){
  return <section id="bengaluru" className="relative overflow-hidden bg-[#2A085C] px-5 py-14 text-white sm:px-8 lg:py-16"><div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=2000&q=88')] bg-cover bg-center opacity-30"/><div className="absolute inset-0 bg-gradient-to-r from-[#2A085C] via-[#2A085C]/88 to-[#2A085C]/45"/><div className="relative mx-auto max-w-[1480px]"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">Local by design</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Built for Bengaluru.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Starting in Bengaluru, with event services, partners and logistics designed around the city.</p><div className="mt-7 flex flex-wrap gap-2">{['South Bengaluru','Central Bengaluru','East Bengaluru','West Bengaluru','More areas'].map(x=><span key={x} className="rounded-xl border border-white/20 bg-white/[.06] px-3.5 py-2 text-[10px] font-bold">{x}</span>)}</div></div></section>
}

function Occasions(){
  const [i,setI]=useState(0)
  return <section className="bg-[#fffdfd] px-5 py-14 sm:px-8 lg:py-20"><div className="mx-auto max-w-[1480px]"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Occasions</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Celebrations for every moment.</h2><p className="mt-3 text-sm text-[#74677b]">Weddings, birthdays, corporate events, cultural programs and social gatherings.</p></div><div className="hidden gap-2 sm:flex"><button onClick={()=>setI((i-1+5)%5)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd4e5] text-[#2A085C]"><ChevronLeft size={17}/></button><button onClick={()=>setI((i+1)%5)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfd4e5] text-[#2A085C]"><ChevronRight size={17}/></button></div></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[0,1,2,3,4].map((x)=><div key={x} className="group relative overflow-hidden rounded-[20px]"><img src={occasions[(i+x)%5][1]} alt={occasions[(i+x)%5][0]} loading="lazy" className="aspect-[1.12] h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"/><p className="absolute bottom-0 left-0 p-4 text-xs font-black text-white">{occasions[(i+x)%5][0]}</p></div>)}</div></div></section>
}

function About(){
  const items=[[Users,'Wide range','event services'],[ShieldCheck,'Partner review','before going live'],[PackageCheck,'Connected','event operations'],[MapPin,'Local focus','on Bengaluru'],[Sparkles,'Designed for','every celebration']]
  return <section id="about" className="bg-[#f7f3fa] px-5 py-14 sm:px-8 lg:py-20"><div className="mx-auto max-w-[1480px] text-center"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">The Sambramo idea</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Built around the way events actually happen.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6d6173]">One connected layer between customers, event specialists and the movement required to make a celebration happen.</p><div className="mt-9 grid grid-cols-2 border-y border-[#e1d6e6] sm:grid-cols-3 lg:grid-cols-5">{items.map(([I,t,s])=><div key={t} className="border-r border-b border-[#e1d6e6] px-4 py-7 lg:border-b-0"><I size={26} className="mx-auto text-[#2A085C]" strokeWidth={1.7}/><p className="mt-4 text-[11px] font-black">{t}</p><p className="mt-1 text-[9px] leading-4 text-[#7d7182]">{s}</p></div>)}</div></div></section>
}

function Contact(){
  const [email,setEmail]=useState(''); const [sent,setSent]=useState(false)
  return <section id="contact" className="bg-white px-5 py-12 sm:px-8 lg:py-16"><div className="relative mx-auto max-w-[1480px] overflow-hidden rounded-[30px] bg-[#2A085C] p-7 text-white sm:p-10 lg:p-12"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8c4dca]/25 blur-3xl"/><div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F4C85D]">Stay updated</p><h2 className="mt-2 max-w-xl font-serif text-3xl font-bold sm:text-4xl">Be among the first to know when Sambramo launches.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/68">Leave your email for launch updates, new features and Bengaluru availability announcements.</p>{sent?<div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold"><Check className="text-[#F4C85D]"/>You’re on the launch list.</div>:<form onSubmit={e=>{e.preventDefault();if(email.trim())setSent(true)}} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email address" className="min-h-12 flex-1 rounded-xl border border-white/10 bg-white px-4 text-sm text-[#211329] outline-none"/><button className="min-h-12 rounded-xl bg-[#F4C85D] px-5 text-sm font-black text-[#1d0b30]">Notify Me <ArrowRight size={15} className="ml-1 inline"/></button></form>}</div><div className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4C85D] text-[#2A085C]"><Bell size={20}/></div><div><p className="text-sm font-black">Bengaluru launch</p><p className="mt-1 text-[10px] text-white/55">Customer + partner experiences</p></div></div><div className="mt-5 grid grid-cols-2 gap-2">{['Services','Partners','Logistics','Events'].map(x=><div key={x} className="rounded-xl bg-black/10 p-3 text-[9px] font-black text-white/70">{x}</div>)}</div></div></div></div></section>
}

function FAQ(){
  const qs=[['When is Sambramo launching?','The platform is being prepared for Bengaluru. The website remains open for discovery while customer and partner access is being launched.'],['Can I join as an event partner?','Yes. Sambramo is designed for catering, decoration, photography, entertainment, venues, logistics, beauty, traditional services and more. Partner access will open with the launch.'],['Is Sambramo only for weddings?','No. The experience is designed around weddings, birthdays, corporate events, cultural programs, social gatherings and other celebrations.'],['Where is Sambramo starting?','Bengaluru is the launch market. The product and partner model are being developed around the city first.']]
  const [a,setA]=useState(0)
  return <section className="bg-[#fffdfd] px-5 py-14 sm:px-8 lg:py-20"><div className="mx-auto max-w-3xl"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#8050a8]">Questions</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">A few things people ask.</h2></div><div className="mt-8 space-y-2">{qs.map(([q,t],i)=><div key={q} className="overflow-hidden rounded-2xl border border-[#e8deed] bg-white"><button onClick={()=>setA(a===i?-1:i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><span className="text-sm font-black">{q}</span><ChevronDown size={17} className={a===i?'rotate-180 text-[#2A085C]':'text-[#2A085C]'}/></button>{a===i&&<p className="px-5 pb-5 text-sm leading-6 text-[#75697b]">{t}</p>}</div>)}</div></div></section>
}

function Footer(){
  return <footer className="bg-[#18042f] px-5 pb-6 pt-12 text-white sm:px-8"><div className="mx-auto grid max-w-[1480px] gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"><div><Brand/><p className="mt-5 text-xs leading-6 text-white/50">YOUR EVENT. OUR DELIVERY.</p><p className="mt-4 flex items-center gap-2 text-xs text-white/50"><MapPin size={14}/>Bengaluru, Karnataka, India</p></div><div><p className="text-xs font-black">Explore</p><div className="mt-4 space-y-2 text-xs text-white/55">{[['#services','Services'],['#how-it-works','How It Works'],['#about','About'],['#partners','Partners'],['#bengaluru','Bengaluru'],['#contact','Contact']].map(([h,t])=><a key={h} href={h} className="block hover:text-white">{t}</a>)}</div></div><div><p className="text-xs font-black">For Customers</p><LaunchButton className="mt-4 text-xs text-white/55 hover:text-white">Customer launch</LaunchButton><p className="mt-5 text-xs font-black">For Partners</p><LaunchButton partner className="mt-3 text-xs text-white/55 hover:text-white">Partner launch</LaunchButton></div><div><p className="text-xs font-black">Follow Sambramo</p><div className="mt-4 flex gap-2"><a href="#contact" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70"><Instagram size={16}/></a><a href="#contact" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70"><Linkedin size={16}/></a><a href="#contact" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70"><Youtube size={16}/></a></div></div></div><div className="mx-auto mt-10 flex max-w-[1480px] flex-col gap-2 border-t border-white/10 pt-5 text-[10px] text-white/35 sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} Sambramo. All rights reserved.</span><span className="text-[#F4C85D]">Celebrations are better, together.</span></div></footer>
}

export default function PublicSite(){
  return <div className="min-h-screen overflow-x-hidden bg-white text-[#211329]">
    <Nav/><main><Hero/><FeatureStrip/><Story/><Services/><HowItWorks/><PartnerSection/><Bengaluru/><Occasions/><About/><Contact/><FAQ/></main><Footer/>
    <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden"><div className="flex gap-2 rounded-2xl border border-[#e6d9eb] bg-white/95 p-2 shadow-xl backdrop-blur-xl"><LaunchButton className="flex-1 rounded-xl bg-[#2A085C] py-3 text-xs font-black text-white">Launching Soon</LaunchButton><a href="#partners" className="flex-1 rounded-xl bg-[#F4C85D] py-3 text-center text-xs font-black text-[#1d0b30]">For Partners</a></div></div>
  </div>
}
