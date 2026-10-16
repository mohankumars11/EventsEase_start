import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import tripLiveArt from '../../../shots/trip-live.png'
import inquiriesArt from '../../../brand/partner-card-2-services.png'

const STORIES = [
  {
    id: 'trip',
    title: 'Talk to customers, plan & start your trip',
    shortTitle: 'Plan your trip',
    subtitle: 'Chat inside the app. Share live tracking. Keep every trip detail together.',
    image: tripLiveArt,
    ring: 'from-orange-400 via-amber-300 to-violet-500',
    initials: 'LIVE',
  },
  {
    id: 'inquiries',
    title: 'Still taking inquiries and sharing quotations?',
    shortTitle: 'Instant bookings',
    subtitle: 'Move from inquiries and quotations to confirmed bookings and instant payments.',
    image: inquiriesArt,
    ring: 'from-emerald-400 via-lime-300 to-green-600',
    initials: 'BOOK',
  },
]

/**
 * Partner-wide campaign stories.
 * The initial stories are centrally configured here; this can later be
 * switched to admin-published records without changing the Jobs layout.
 */
export default function PartnerStories() {
  const [activeIndex, setActiveIndex] = useState(-1)
  const activeStory = STORIES[activeIndex]

  const close = () => setActiveIndex(-1)
  const previous = () => setActiveIndex(index => Math.max(0, index - 1))
  const next = () => setActiveIndex(index => index >= STORIES.length - 1 ? -1 : index + 1)

  return (
    <>
      <section aria-label="Sambramo partner stories" className="mb-4 -mx-1">
        <div className="flex items-start gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STORIES.map((story, index) => (
            <button
              key={story.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View story: ${story.title}`}
              className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center active:scale-[0.97]"
            >
              <span className={`block rounded-full bg-gradient-to-br p-[3px] ${story.ring}`}>
                <span className="block rounded-full bg-white p-[3px]">
                  <img
                    src={story.image}
                    alt=""
                    className="h-[58px] w-[58px] rounded-full object-cover"
                  />
                </span>
              </span>
              <span className="line-clamp-2 min-h-[28px] text-[10.5px] font-bold leading-tight text-[#39334D]">
                {story.shortTitle}
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeStory && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#100522] p-3"
          role="dialog"
          aria-modal="true"
          aria-label={activeStory.title}
          onClick={close}
        >
          <div
            className="relative flex h-[min(92dvh,760px)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-br from-[#250052] via-[#5B16A8] to-[#8B22E8] shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5" aria-hidden="true">
              {STORIES.map((story, index) => (
                <span key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/35">
                  <span className={`block h-full rounded-full ${index === activeIndex ? 'bg-white' : index < activeIndex ? 'bg-white/90' : 'bg-transparent'}`} />
                </span>
              ))}
            </div>
            <div className="relative z-20 flex items-center justify-between px-4 pt-7">
              <div className="min-w-0 pr-3">
                <p className="text-[11px] font-black uppercase tracking-[0.13em] text-white">SAMBRAMO PARTNER</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-white/75">{activeStory.title}</p>
              </div>
              <button type="button" onClick={close} aria-label="Close stories" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/25 text-white">
                <X size={20} />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2 pt-3">
              <img src={activeStory.image} alt={activeStory.title} className="max-h-full w-full rounded-2xl object-contain" />
              <button type="button" onClick={previous} aria-label="Previous story" disabled={activeIndex === 0} className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white disabled:opacity-20">
                <ChevronLeft size={24} />
              </button>
              <button type="button" onClick={next} aria-label="Next story" className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white">
                <ChevronRight size={24} />
              </button>
            </div>
            <div className="px-5 pb-6 pt-2 text-white">
              <p className="text-[22px] font-black leading-tight">{activeStory.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/85">{activeStory.subtitle}</p>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">A message for our partner community</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
