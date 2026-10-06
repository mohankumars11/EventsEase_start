import { useState } from 'react'
import { ArrowRight, Gift, MapPin, TrendingUp, UsersRound, Sparkles, UserRound } from 'lucide-react'

const CARDS = [
  {
    id: 'grow',
    eyebrow: 'YOUR BUSINESS. BIGGER.',
    title: 'GROW BEYOND\nYOUR NEIGHBOURHOOD.',
    body: 'Your next customer could be one event away.',
    cta: 'Grow with SAMBRAMO',
    className: 'bg-gradient-to-br from-yellow-300 via-amber-300 to-yellow-400 text-plum-950',
    icon: TrendingUp,
    accent: 'bg-plum-900/10',
  },
  {
    id: 'invite',
    eyebrow: 'KNOW SOMEONE GOOD?',
    title: 'BRING YOUR PEOPLE.\nGROW TOGETHER.',
    body: 'Invite trusted event professionals and earn through eligible referral campaigns.',
    cta: 'Invite & Earn',
    className: 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-400 text-white',
    icon: Gift,
    accent: 'bg-white/15',
  },
  {
    id: 'profile',
    eyebrow: 'START LOCAL.',
    title: 'THINK BIG.',
    body: 'Build your name in Bengaluru today. Be ready for celebrations across India tomorrow.',
    cta: 'Build Your Profile',
    className: 'bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-600 text-white',
    icon: MapPin,
    accent: 'bg-white/15',
  },
]

function CardArt({ id, Icon }) {
  if (id === 'grow') {
    return (
      <div aria-hidden="true" className="absolute right-3 top-7 h-20 w-20 opacity-95">
        <div className="absolute bottom-1 left-1 h-10 w-10 rounded-xl bg-plum-800/90 rotate-[-8deg]" />
        <div className="absolute bottom-1 left-12 h-16 w-9 rounded-xl bg-plum-700/90 rotate-[8deg]" />
        <TrendingUp className="absolute right-0 top-0 h-12 w-12 text-fuchsia-600" strokeWidth={2.8} />
        <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-fuchsia-600 ring-4 ring-yellow-200/70" />
      </div>
    )
  }
  if (id === 'invite') {
    return (
      <div aria-hidden="true" className="absolute right-2 top-5 h-24 w-24">
        <div className="absolute right-1 top-1 flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-lg">
          <Gift size={23} strokeWidth={2.4} />
        </div>
        <UsersRound className="absolute bottom-0 left-2 h-14 w-14 text-white/90" strokeWidth={1.8} />
        <span className="absolute bottom-1 right-0 h-7 w-7 rounded-full bg-yellow-300 ring-4 ring-white/20" />
      </div>
    )
  }
  return (
    <div aria-hidden="true" className="absolute right-2 top-5 h-28 w-28">
      <div className="absolute right-1 top-1 h-20 w-20 rounded-full bg-fuchsia-300/20" />
      <MapPin className="absolute right-4 top-4 h-16 w-16 text-yellow-300" fill="currentColor" strokeWidth={1.7} />
      <Sparkles className="absolute bottom-1 left-2 h-8 w-8 text-yellow-200" />
    </div>
  )
}

export default function PartnerGrowthCarousel({ onGrow, onInvite, onProfile }) {
  const [active, setActive] = useState(0)

  const actions = { grow: onGrow, invite: onInvite, profile: onProfile }

  return (
    <section className="mb-4" aria-label="Your Sambramo growth">
      <div className="mb-2 flex items-end gap-2 px-0.5">
        <Sparkles size={17} className="text-fuchsia-600" fill="currentColor" />
        <div>
          <p className="text-[14px] font-black uppercase tracking-[0.14em] text-plum-900">Your SAMBRAMO growth</p>
          <p className="text-[11px] font-semibold text-ink-mute">More events. More connections. More opportunities.</p>
        </div>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={e => {
          const el = e.currentTarget
          const width = el.clientWidth
          if (!width) return
          setActive(Math.min(CARDS.length - 1, Math.max(0, Math.round(el.scrollLeft / (width * 0.9 + 12)))))
        }}
      >
        {CARDS.map(({ id, eyebrow, title, body, cta, className, icon: Icon }) => (
          <article
            key={id}
            className={`relative min-w-[88%] snap-start overflow-hidden rounded-[22px] p-3.5 shadow-[0_8px_22px_rgba(35,10,70,0.10)] ring-1 ring-black/5 ${className}`}
          >
            <div className="relative z-10 min-h-[164px] pr-20">
              <p className="inline-flex rounded-full border border-current/25 bg-white/20 px-2 py-1 text-[9px] font-black uppercase tracking-wide">
                {eyebrow}
              </p>
              <h3 className="mt-2 whitespace-pre-line text-[21px] font-black leading-[0.93] tracking-[-0.035em]">{title}</h3>
              <p className="mt-2 max-w-[205px] text-[10.5px] font-semibold leading-snug opacity-90">{body}</p>

              <button
                type="button"
                onClick={() => actions[id]?.()}
                className="mt-3 inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-plum-950 px-3.5 text-[10.5px] font-black text-white shadow-sm transition active:scale-[0.98]"
              >
                {cta}
                <ArrowRight size={14} />
              </button>
            </div>

            <CardArt id={id} Icon={Icon} />
          </article>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-1.5" aria-label="Carousel position">
        {CARDS.map((card, i) => (
          <span key={card.id} className={`h-2 w-2 rounded-full transition-all ${active === i ? 'bg-plum-600 w-5' : 'bg-plum-200'}`} />
        ))}
      </div>
    </section>
  )
}
