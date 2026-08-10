import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

/**
 * The whole sales argument, as one auto-advancing deck.
 *
 * ── What this replaces, and why ───────────────────────────────────────────
 * The argument used to be told three times down the page, in three
 * full-height sections: the OldWayBand contrast ("Sound familiar?"), the
 * five-step story flow, and a four-tile trust grid underneath it. Roughly
 * three screens of scrolling to deliver four ideas, on a page that already
 * asks for a dozen more screens after it.
 *
 * Told as slides it is one screen. Nobody scrolls past the argument because
 * the argument no longer takes any scrolling to get through — it comes to
 * the reader instead, which is the only honest way to "keep popping up"
 * without an interstitial that hurts the mobile search ranking this page
 * depends on.
 *
 * ── Why it is allowed to move on its own ──────────────────────────────────
 * Auto-advance is a liability when it steals a click target or restarts a
 * video. Here every slide is read-only prose with one shared CTA outside the
 * deck, so the worst case of a badly timed advance is that somebody re-reads
 * a sentence. It still yields immediately to any sign of a human: hover,
 * focus, touch, or the pause button. And it does not run at all under
 * prefers-reduced-motion, where a panel that rewrites itself every five
 * seconds is precisely the thing being opted out of.
 */

const SLIDE_MS = 6000

/**
 * The vendor slide is the one to be careful with.
 *
 * "Top-rated vendors" and "hundreds of trusted partners" are the obvious
 * copy, and both are false today: the vendors table holds one row, it is
 * is_verified=false with rating_avg=0, and the only review in the system was
 * written by the founder's own account. A customer who books on a rating that
 * does not exist and gets let down writes the review that actually decides
 * whether this business survives its first month.
 *
 * So this slide promises a standard instead of claiming a history. Every line
 * is something Sambramo controls on day one and would be judged against
 * immediately — which is what makes it worth more than the claim it replaces.
 * A marketplace structurally cannot say "if they do not show, that is our
 * problem"; a concierge can, and it is the whole difference between the two
 * models.
 */
const SLIDES = [
  {
    id: 'problem',
    eyebrow: 'Sound familiar?',
    title: 'You are not bad at this. It is genuinely exhausting.',
    body: 'Planning a celebration in India means being a project manager for a month.',
    tone: 'dim',
    points: [
      { icon: '🔍', text: 'Fourteen tabs open, comparing decorators you have never heard of' },
      { icon: '📞', text: 'Nine calls, four callbacks, two vendors who ghost you' },
      { icon: '🧾', text: 'Quotes that change the moment they hear the word "wedding"' },
      { icon: '🚗', text: 'A Saturday lost to the market for cake, flowers and pooja items' },
    ],
  },
  {
    id: 'switch',
    eyebrow: 'With Sambramo',
    title: 'You describe it once. To a person.',
    body: 'That is the entire job we take off you.',
    tone: 'bright',
    points: [
      { icon: '💬', text: 'One conversation — no forms to fill, no vendors to chase' },
      { icon: '🤝', text: 'We call them, compare them and negotiate on your behalf' },
      { icon: '🧮', text: 'One transparent proposal, the fee stated inside it' },
      { icon: '📦', text: 'Everything else arrives at your door, priced before you buy' },
    ],
  },
  {
    id: 'how',
    eyebrow: 'How it works',
    title: 'Five steps, and four of them are ours.',
    body: 'You do the first one and then you show up.',
    tone: 'bright',
    steps: [
      { emoji: '🗣️', title: 'Tell us',       desc: 'Date, place, people, and what you picture' },
      { emoji: '🔍', title: 'We plan',       desc: 'We source vendors and compare real quotes' },
      { emoji: '📋', title: 'You approve',   desc: 'One clear proposal — the fee is stated in it' },
      { emoji: '🤝', title: 'We handle it',  desc: 'We coordinate every detail on the day' },
      { emoji: '🎉', title: 'You celebrate', desc: 'Just be there for the moment' },
    ],
  },
  {
    id: 'vendors',
    eyebrow: 'Our vendor standard',
    title: 'We do not hand you a directory and wish you luck.',
    body: 'A marketplace lists whoever signs up. We are on the hook for who turns up.',
    tone: 'bright',
    points: [
      { icon: '🪪', text: 'Identity and business details checked before a vendor is put on a job' },
      { icon: '👀', text: 'We see the previous work ourselves — you are not booking off a thumbnail' },
      { icon: '🧭', text: 'One coordinator owns your event end to end, and you have their number' },
      { icon: '🛟', text: 'If a vendor does not show, that is our problem to solve, not yours' },
    ],
  },
  {
    id: 'cost',
    eyebrow: 'What it costs to ask',
    title: 'Nothing. And the fee is never a surprise.',
    body: 'We price the job after we know its size — because a birthday for 20 and a wedding for 400 are not the same job.',
    tone: 'bright',
    points: [
      { icon: '🆓', text: 'Free to enquire, and free to walk away from the proposal' },
      { icon: '⏱️', text: 'A complete written proposal back within 24–48 hours' },
      { icon: '🧾', text: 'Our fee is a line item in it, disclosed before you confirm anything' },
      { icon: '💳', text: 'Nothing to pay until you have approved the plan' },
    ],
  },
]

export default function StoryDeck({ onPlan }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [manual, setManual] = useState(false)   // user took over — stop auto entirely
  const touchX = useRef(null)

  const go = useCallback(n => setIndex((n + SLIDES.length) % SLIDES.length), [])

  const take = useCallback(n => {
    setManual(true)
    go(n)
  }, [go])

  // Auto-advance. Stops for good once somebody drives it themselves — an
  // advance that fights the reader is worse than no advance at all.
  useEffect(() => {
    if (manual || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const id = setTimeout(() => go(index + 1), SLIDE_MS)
    return () => clearTimeout(id)
  }, [index, paused, manual, go])

  // Arrow keys, but only while the deck holds focus — binding these to the
  // window would hijack arrow-key scrolling for the whole page.
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); take(index - 1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); take(index + 1) }
  }

  function onTouchStart(e) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 45) return
    take(index + (dx < 0 ? 1 : -1))
  }

  const slide = SLIDES[index]
  const running = !manual && !paused

  return (
    <section
      className="py-14 sm:py-20 px-4 bg-plum-950"
      aria-roledescription="carousel"
      aria-label="Why Sambramo"
    >
      <div className="max-w-5xl mx-auto">
        <div
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative rounded-3xl border border-plum-800 bg-gradient-to-br from-plum-900 to-berry-900/50 p-6 sm:p-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400"
        >
          {/* Progress ticks double as the pager. Sized as real tap targets on
              a phone rather than 8px dots, which are the standard reason
              carousel pagination goes unused on touch. */}
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => take(i)}
                aria-label={`Slide ${i + 1} of ${SLIDES.length}: ${s.eyebrow}`}
                aria-current={i === index}
                className="group flex-1 py-2 -my-2"
              >
                <span className="block h-1 rounded-full overflow-hidden bg-white/15">
                  <span
                    className={[
                      'block h-full rounded-full bg-saffron-400',
                      i < index ? 'w-full' : i > index ? 'w-0' : '',
                      // The active tick fills across the dwell, so the deck
                      // shows how long is left rather than moving without
                      // warning.
                      //
                      // Paused holds the animation where it is rather than
                      // swapping to a full-width class: hovering is how most
                      // people pause this, and a bar that jumps to 100% the
                      // instant the pointer lands reads as "finished", which
                      // is the opposite of what pausing just did.
                      i === index ? (manual ? 'w-full' : 'deck-tick') : '',
                    ].filter(Boolean).join(' ')}
                    style={i === index && !manual
                      ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }
                      : undefined}
                  />
                </span>
              </button>
            ))}
          </div>

          {/* One live region for the whole slide, so a screen reader hears a
              complete panel rather than five separate fragments landing. */}
          <div aria-live="polite" aria-atomic="true" className="min-h-[22rem] sm:min-h-[19rem]">
            <p className={`text-[11px] font-bold tracking-[0.18em] uppercase mb-3 ${
              slide.tone === 'dim' ? 'text-plum-300' : 'text-saffron-400'
            }`}>
              {slide.eyebrow}
            </p>

            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white mb-2.5 text-balance">
              {slide.title}
            </h2>
            <p className="text-white/60 text-sm sm:text-lg leading-relaxed mb-6 max-w-2xl">
              {slide.body}
            </p>

            {slide.points && (
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
                {slide.points.map(p => (
                  <li key={p.text} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      aria-hidden="true"
                      className={`text-base shrink-0 ${slide.tone === 'dim' ? 'grayscale opacity-60' : ''}`}
                    >
                      {p.icon}
                    </span>
                    <span className={slide.tone === 'dim' ? 'text-plum-200/80' : 'text-white/90'}>
                      {p.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {slide.steps && (
              <ol className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {slide.steps.map((s, i) => (
                  <li
                    key={s.title}
                    className="relative rounded-2xl bg-white/[0.07] border border-white/10 p-3.5 text-center"
                  >
                    <span aria-hidden="true" className="block text-2xl mb-1.5">{s.emoji}</span>
                    <p className="font-bold text-white text-xs mb-0.5">
                      <span className="text-saffron-400/70">{i + 1}.</span> {s.title}
                    </p>
                    <p className="text-white/55 text-[11px] leading-snug">{s.desc}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-white/10">
            <button
              onClick={() => onPlan?.()}
              className="btn-cta text-sm px-5 py-3"
            >
              Tell us what you're celebrating
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Only offered while the deck is still driving itself. Once a
                  reader has paged it by hand it no longer auto-advances, so a
                  pause button would control nothing. */}
              {!manual && (
                <button
                  onClick={() => setPaused(p => !p)}
                  aria-label={paused ? 'Resume' : 'Pause'}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors"
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
              )}
              <button
                onClick={() => take(index - 1)}
                aria-label="Previous"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => take(index + 1)}
                aria-label="Next"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
