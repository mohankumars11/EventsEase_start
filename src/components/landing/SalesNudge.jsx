import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'

/**
 * The one nudge this page gets.
 *
 * Worth saying why it is built this way, because the obvious version — a
 * modal over a dimmed page a few seconds after load — is the version that
 * costs money:
 *
 *   - It interrupts before the visitor knows what we sell, so the offer
 *     lands as noise and the only learned response is hunting for the X.
 *   - Google treats an interstitial covering mobile content on arrival as a
 *     ranking problem, and this is a page we want found.
 *   - It fires at people already reading, i.e. the ones who need no push.
 *
 * So this waits for a signal that someone is drifting rather than a stopwatch:
 * either they have read far enough to have seen both halves of the offer and
 * stayed a while, or on desktop their pointer has left for the tab bar. It
 * never covers the page — no backdrop, nothing blocked, and it sits at the
 * bottom where a thumb can dismiss it.
 *
 * The copy is chosen by where they are when it fires, because the two
 * audiences have opposite frustrations: one is exhausted from chasing
 * vendors, the other is tired of the market run.
 */

const DISMISS_KEY = 'sambramo_nudge_dismissed_until'
const SHOWN_KEY   = 'sambramo_nudge_shown'
const SNOOZE_MS   = 7 * 24 * 60 * 60 * 1000

/**
 * How long someone must have been here, and how far down, before the nudge
 * may fire.
 *
 * Brought in from 7000ms / 45% to 2500ms / 22%. The reasoning above still
 * holds — do not interrupt on arrival, never cover the page — but 45% of this
 * page is a long way down: it sits past the fork, the contrast band and the
 * décor gallery, so the nudge was reaching people who had already read the
 * entire argument and reaching almost nobody else. 22% is past the fork,
 * which is the first point at which "plan or shop" has been put to the reader
 * and the nudge has something to be relevant about.
 *
 * The dwell floor is what keeps this off a stopwatch: a fast scroll to 22%
 * inside 2.5s still will not fire it, so somebody flinging down the page is
 * not ambushed mid-gesture.
 */
const MIN_DWELL_MS   = 2500
const SCROLL_TRIGGER = 0.22

const VARIANTS = {
  plan: {
    eyebrow: 'Still doing this the hard way?',
    title: 'Ten tabs open. Twelve quotes. Still no answer.',
    body: 'Chasing decorators and caterers is a second job. Tell us once — a real coordinator makes the calls, negotiates, and brings you one clear price.',
    cta: 'Let us find them for you',
    accent: 'saffron',
  },
  shop: {
    eyebrow: 'Still buying it offline?',
    title: 'The market run. The traffic. The haggling.',
    body: 'Cakes, flowers, hampers and pooja samagri — priced, in stock and at your door. You are one click from the whole list.',
    cta: 'Shop the essentials',
    accent: 'plum',
  },
}

function snoozed() {
  try {
    if (sessionStorage.getItem(SHOWN_KEY)) return true
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() < until
  } catch {
    // Private mode or storage disabled — treat as not snoozed rather than
    // suppressing the nudge entirely.
    return false
  }
}

export default function SalesNudge({ onPlan }) {
  const [variant, setVariant] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const [entered, setEntered] = useState(false)
  const mounted = useRef(Date.now())

  const dismiss = useCallback(() => {
    setLeaving(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS))
    } catch { /* storage unavailable — the session guard still holds */ }
    setTimeout(() => setVariant(null), 150)
  }, [])

  /**
   * Slide it in rather than having it appear already arrived.
   *
   * The panel previously mounted at full opacity — `leaving` animated the
   * exit and nothing animated the entrance — so a card simply existed in the
   * corner between one frame and the next. That reads as a rendering glitch,
   * not as something offered, and it is the version people reflexively close.
   *
   * Two nested rAFs so the browser has committed the pre-transition style
   * before the class flips; one frame is not reliably enough, and a dropped
   * transition puts us straight back to the popping version.
   */
  useEffect(() => {
    if (!variant) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(id)
  }, [variant])

  useEffect(() => {
    if (snoozed()) return

    let done = false

    // Which half of the page is under the reader decides the message. The
    // shop sections carry #shop, so anything at or past it is a shopper.
    function pickVariant() {
      const shop = document.getElementById('shop')
      if (!shop) return 'plan'
      return shop.getBoundingClientRect().top <= window.innerHeight * 0.5 ? 'shop' : 'plan'
    }

    function fire() {
      if (done || snoozed()) return
      done = true
      try { sessionStorage.setItem(SHOWN_KEY, '1') } catch { /* ignore */ }
      setVariant(pickVariant())
    }

    function onScroll() {
      if (Date.now() - mounted.current < MIN_DWELL_MS) return
      const max = document.body.scrollHeight - window.innerHeight
      if (max > 0 && window.scrollY / max >= SCROLL_TRIGGER) fire()
    }

    // Exit intent, desktop only. On touch there is no pointer leaving the
    // viewport, and firing on scroll-up there just ambushes people.
    function onLeave(e) {
      if (e.clientY <= 0 && window.matchMedia('(min-width: 768px)').matches) fire()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mouseout', onLeave)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [])

  useEffect(() => {
    if (!variant) return
    function onKey(e) { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant, dismiss])

  if (!variant) return null
  const v = VARIANTS[variant]

  return (
    <div
      role="region"
      aria-label="A suggestion from Sambramo"
      // Two fixed neighbours already own this corner, and the nudge has to
      // clear both rather than sit under them:
      //   BottomNav   — md:hidden, fixed bottom-0, z-50, ~56px + safe area.
      //   ChatWidget  — the `chat-dock` corner in index.css: z-45, bottom
      //                 4.75rem on mobile, bottom-5 from md, ~52–56px tall.
      // Breakpoints match BottomNav's md:hidden, not sm — switching at sm left
      // a 640–767px window where the nav covered these buttons. The stacking
      // order is deliberate too: navigation and support outrank a promo, so
      // the nudge stays at z-40 and moves out of the way instead of climbing
      // over them.
      className={[
        'fixed z-40 inset-x-3 bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))]',
        'md:inset-x-auto md:right-5 md:bottom-24 md:w-[26rem]',
        'rounded-2xl bg-plum-950 text-white shadow-2xl shadow-black/50 border border-plum-700',
        // Only opacity and transform, so this stays on the compositor —
        // `transition-all` on a fixed, backdrop-heavy panel animates layout
        // properties nothing here changes and costs a paint per frame for it.
        'transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none',
        leaving || !entered ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0',
      ].join(' ')}
    >
      <div className="relative p-5 sm:p-6">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-plum-400 hover:text-white hover:bg-plum-800 transition-colors"
        >
          <X size={16} />
        </button>

        <p
          className={`text-[11px] font-bold tracking-[0.14em] uppercase mb-2 ${
            v.accent === 'saffron' ? 'text-saffron-400' : 'text-berry-300'
          }`}
        >
          {v.eyebrow}
        </p>

        <h2 className="font-serif text-lg sm:text-xl font-bold leading-snug mb-2 pr-6">
          {v.title}
        </h2>

        <p className="text-plum-200 text-sm leading-relaxed mb-4">{v.body}</p>

        <div className="flex items-center gap-3">
          {variant === 'plan' ? (
            <button
              onClick={() => { dismiss(); onPlan?.() }}
              className="inline-flex items-center gap-2 rounded-xl bg-saffron-400 hover:bg-saffron-300 text-plum-950 font-bold text-sm px-4 py-2.5 transition-colors"
            >
              {v.cta} <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              to="/shop"
              onClick={dismiss}
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-plum-100 text-plum-900 font-bold text-sm px-4 py-2.5 transition-colors"
            >
              {v.cta} <ArrowRight size={15} />
            </Link>
          )}
          <button
            onClick={dismiss}
            className="text-plum-400 hover:text-plum-200 text-sm font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
