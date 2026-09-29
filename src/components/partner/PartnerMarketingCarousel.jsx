import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Banknote, CalendarCheck2, ChevronLeft, ChevronRight,
  FileText, Landmark, Percent, ReceiptIndianRupee, ShieldCheck, Sparkles, WalletCards,
} from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const SLIDES = [
  {
    key: 'paid-after-event',
    eyebrow: 'GET PAID AFTER EVERY EVENT',
    title: 'Your work gets rewarded.',
    body: 'Once the event is completed and the holding window ends, eligible earnings move toward payout.',
    cta: 'Learn how it works',
    target: '#how-payouts-work',
    accent: 'plum',
    Art: () => <div className="relative h-[132px] w-[154px] shrink-0">
      <div className="absolute right-2 top-1 h-24 w-24 rotate-[-7deg] rounded-[28px] bg-white/90 p-3 shadow-[0_18px_35px_rgba(42,8,92,0.20)]">
        <div className="flex h-full flex-col items-center justify-center rounded-[20px] bg-plum-50">
          <CalendarCheck2 size={28} className="text-plum-700" />
          <span className="mt-1 text-[9px] font-extrabold text-plum-900">EVENT DONE</span>
          <span className="mt-1 rounded-full bg-forest-100 px-2 py-0.5 text-[9px] font-extrabold text-forest-700">₹ PAYOUT</span>
        </div>
      </div>
      <div className="absolute bottom-1 left-1 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-plum-700 to-purple-500 text-white shadow-[0_18px_34px_rgba(42,8,92,0.32)]"><Landmark size={36} /></div>
      <span className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-saffron-300 text-plum-950 shadow-lg"><ReceiptIndianRupee size={19} /></span>
      <span className="absolute bottom-0 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-plum-700 shadow-lg"><ShieldCheck size={18} /></span>
    </div>,
  },
  {
    key: 'razorpay-payouts',
    eyebrow: 'SECURE PAYOUTS WITH RAZORPAY',
    title: 'Payouts, clearly tracked.',
    body: 'See the payout destination and payout status from one clear Earnings screen.',
    cta: 'View payout details',
    target: '#your-account',
    accent: 'blue',
    Art: () => <div className="relative h-[132px] w-[154px] shrink-0">
      <div className="absolute right-0 top-0 flex h-16 w-28 items-center gap-2 rounded-[18px] bg-white px-3 shadow-[0_16px_30px_rgba(37,99,235,0.20)]">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck size={23} /></span>
        <span><b className="block text-[11px] font-black text-slate-900">Razorpay</b><small className="text-[8px] font-semibold text-slate-500">PAYOUTS</small></span>
      </div>
      <div className="absolute bottom-0 left-0 h-24 w-28 rounded-[24px] bg-gradient-to-br from-blue-700 to-indigo-500 p-3 text-white shadow-[0_18px_34px_rgba(37,99,235,0.28)]">
        <div className="flex items-center justify-between"><Landmark size={22} /><ShieldCheck size={18} className="text-cyan-200" /></div>
        <p className="mt-4 text-[9px] font-bold text-white/70">BANK TRANSFER</p><p className="text-[13px] font-black">TRACKED</p>
      </div>
      <span className="absolute bottom-1 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-700 shadow-lg"><Banknote size={20} /></span>
    </div>,
  },
  {
    key: 'transparent-earnings',
    eyebrow: 'TRANSPARENT EARNINGS & TAX',
    title: 'Know every rupee.',
    body: 'Understand customer billing, SAMBRAMO commission and the tax amounts shown in your statement.',
    cta: 'View your statement',
    target: '#your-statement',
    accent: 'gold',
    Art: () => <div className="relative h-[132px] w-[154px] shrink-0">
      <div className="absolute right-1 top-0 h-28 w-24 rotate-[5deg] rounded-[22px] bg-white p-3 shadow-[0_18px_32px_rgba(146,64,14,0.18)]">
        <div className="flex items-center gap-1.5 text-amber-700"><FileText size={18} /><span className="text-[9px] font-black">STATEMENT</span></div>
        <div className="mt-3 h-2 rounded-full bg-amber-100" /><div className="mt-2 h-2 w-4/5 rounded-full bg-slate-100" /><div className="mt-2 h-2 w-3/5 rounded-full bg-slate-100" />
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-2 py-1.5"><Percent size={14} className="text-amber-700" /><span className="text-[9px] font-extrabold text-amber-800">TAX</span></div>
      </div>
      <div className="absolute bottom-1 left-1 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-[0_18px_34px_rgba(245,158,11,0.30)]"><ReceiptIndianRupee size={36} /></div>
    </div>,
  },
  {
    key: 'grow-with-sambramo',
    eyebrow: 'GROW MORE WITH SAMBRAMO',
    title: 'Stay ready for more work.',
    body: 'Keep your services, pricing inputs and calendar current so matching stays accurate.',
    cta: 'Open your account',
    target: '#your-account',
    accent: 'green',
    Art: () => <div className="relative h-[132px] w-[154px] shrink-0">
      <div className="absolute right-1 top-1 flex h-24 w-28 flex-col justify-between rounded-[24px] bg-white p-3 shadow-[0_18px_32px_rgba(5,150,105,0.18)]">
        <div className="flex items-center justify-between"><WalletCards size={22} className="text-emerald-600" /><Sparkles size={16} className="text-emerald-500" /></div>
        <div><div className="h-2 w-4/5 rounded-full bg-emerald-100" /><div className="mt-2 h-2 w-3/5 rounded-full bg-slate-100" /></div>
      </div>
      <div className="absolute bottom-1 left-0 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-600 to-teal-400 text-white shadow-[0_18px_34px_rgba(5,150,105,0.28)]"><ArrowRight size={35} /></div>
    </div>,
  },
]

const theme = {
  plum: ['from-[#2A085C] via-[#5B21B6] to-[#8B5CF6]', 'bg-fuchsia-300/25'],
  blue: ['from-[#111B45] via-[#2563EB] to-[#6366F1]', 'bg-cyan-200/25'],
  gold: ['from-[#3D1F0B] via-[#B45309] to-[#F59E0B]', 'bg-amber-100/25'],
  green: ['from-[#073B35] via-[#047857] to-[#10B981]', 'bg-emerald-100/25'],
}

export default function PartnerMarketingCarousel() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [held, setHeld] = useState(false)
  const touchStart = useRef(null)

  useEffect(() => {
    if (reduced || held) return
    const id = window.setInterval(() => setIndex(i => (i + 1) % SLIDES.length), 5600)
    return () => window.clearInterval(id)
  }, [reduced, held])

  const slide = SLIDES[index]
  const Art = slide.Art
  const [gradient, glow] = theme[slide.accent]

  const move = direction => {
    setIndex(i => (i + direction + SLIDES.length) % SLIDES.length)
    setHeld(true)
  }

  const onTouchStart = e => {
    touchStart.current = e.touches[0].clientX
    setHeld(true)
  }

  const onTouchEnd = e => {
    if (touchStart.current == null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(dx) > 45) setIndex(i => (i + (dx < 0 ? 1 : -1) + SLIDES.length) % SLIDES.length)
    touchStart.current = null
  }

  return (
    <section aria-label="Earnings information">
      <div className="relative overflow-hidden rounded-[28px] bg-white p-1.5 shadow-[0_14px_38px_rgba(42,8,92,0.10)] ring-1 ring-plum-100"
        onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <a href={slide.target} className={`relative block min-h-[188px] overflow-hidden rounded-[23px] bg-gradient-to-br ${gradient} px-5 py-5 text-white`} aria-label={slide.cta}>
          <span className={`absolute -right-12 -top-16 h-48 w-48 rounded-full blur-2xl ${glow}`} />
          <span className="absolute -left-12 bottom-[-70px] h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex min-h-[150px] items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <span className="inline-flex max-w-[76%] items-center rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] ring-1 ring-white/20">{slide.eyebrow}</span>
              <h2 className="mt-3 max-w-[64%] text-[24px] font-black leading-[1.02] tracking-tight">{slide.title}</h2>
              <p className="mt-2 max-w-[68%] text-[11.5px] font-medium leading-[1.35] text-white/85">{slide.body}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11.5px] font-black text-plum-900 shadow-[0_7px_18px_rgba(0,0,0,0.12)]">{slide.cta}<ArrowRight size={13} strokeWidth={3} /></span>
            </div>
            <div className="absolute bottom-0 right-[-7px]"><Art /></div>
          </div>
        </a>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 backdrop-blur-sm">
          {SLIDES.map((s, i) => <button key={s.key} type="button" onClick={() => { setIndex(i); setHeld(true) }} aria-label={`Show slide ${i + 1}: ${s.title}`} aria-current={i === index} className="flex h-3.5 w-3.5 items-center justify-center"><span className={`block rounded-full transition-all ${i === index ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/55'}`} /></button>)}
        </div>

        <button type="button" aria-label="Previous earnings information" onClick={() => move(-1)} className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-plum-900 shadow-md sm:flex"><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Next earnings information" onClick={() => move(1)} className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-plum-900 shadow-md sm:flex"><ChevronRight size={16} /></button>
      </div>
    </section>
  )
}
