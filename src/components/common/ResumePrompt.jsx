import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, X, History, Clock3 } from 'lucide-react'
import { useJourney, resumeTargetOf, dismissResume, isHomePath, WEIGHT } from '../../lib/journey'

/**
 * "You were in the middle of something."
 *
 * ── Why it appears on home and nowhere else ─────────────────────────────
 * Home is where an interrupted customer lands. Every route back to it is a
 * *leaving* gesture — the Home tab, the brand mark in an app bar, the phone's
 * back button, a notification — and the screen they arrive on is a marketing
 * page with no memory of the four minutes they just spent in the wizard. That
 * is the one moment where an offer to go back is help rather than noise.
 *
 * Anywhere else it would be an interruption: somebody reading a product page
 * does not need a card over it asking whether they would rather be doing
 * something else. So this renders on `/` and `/dashboard/customer`, and returns
 * null everywhere in the app.
 *
 * ── Why it does not just redirect ───────────────────────────────────────
 * The obvious reading of "send them back to where they were" is an automatic
 * `<Navigate>`. That would be a trap: the customer pressed Home, and a Home
 * button that refuses to go home is a broken button — they would press it
 * again, get bounced again, and the only way out would be to kill the tab. It
 * also breaks the back gesture, which is the same navigation.
 *
 * So the destination is offered, one tap away, and declining it is a tap too.
 * The customer stays in charge of their own navigation, which is the whole
 * difference between "resume" and "hijack".
 *
 * ── Why it is not a modal ───────────────────────────────────────────────
 * No overlay, no focus trap, no blocked scroll. A dialog demands an answer
 * before the screen underneath can be used, and this question does not deserve
 * that — plenty of people press Home *because* they want home. It is a card
 * that slides in above the tab bar, ignorable by scrolling past, dismissable by
 * one control, and gone for good on that piece of work once dismissed.
 */

/** Rounded, never precise. "14 minutes ago" is a fact nobody needs; "just now"
 *  and "a few minutes ago" are how a person describes their own last action. */
function agoLabel(at) {
  const mins = Math.floor((Date.now() - at) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 5) return 'a few minutes ago'
  if (mins < 60) return `${mins} minutes ago`
  return 'earlier'
}

export default function ResumePrompt() {
  const journey = useJourney()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [shown, setShown] = useState(false)

  const target = useMemo(
    () => resumeTargetOf(journey, { currentPath: pathname }),
    [journey, pathname],
  )

  const onHome = isHomePath(pathname)
  const active = onHome && !!target

  /**
   * A beat before it slides in.
   *
   * Home is the heaviest screen in the app — a hero, a photo reel, three rails
   * — and a card animating in on the same frame as all of that reads as part of
   * the page loading rather than as a message. Half a second later it is
   * unmistakably a thing that arrived, which is what makes it get read.
   */
  useEffect(() => {
    if (!active) { setShown(false); return }
    const t = setTimeout(() => setShown(true), 550)
    return () => clearTimeout(t)
  }, [active, target?.href])

  if (!active) return null

  const isWork = target.weight >= WEIGHT.WORK

  return (
    <div
      // `above-bottom-nav` is the shared clearance the builder's price sheet
      // already uses: the card lands above the six tabs on a phone and never
      // on top of them — the fault the floating help bubble and the raised
      // Plan FAB were both removed for. On md the tab bar is gone and the
      // utility collapses to bottom:0, so the padding is what lifts it off the
      // window edge.
      className={`above-bottom-nav fixed inset-x-0 z-40 flex justify-center px-3 pb-3 transition-all duration-500 ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="animate-fade-in-up w-full max-w-md overflow-hidden rounded-2xl bg-plum-950 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="flex items-start gap-3 p-3.5">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isWork ? 'bg-saffron-400 text-plum-950' : 'bg-white/10 text-saffron-300'
          }`}>
            <History size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-saffron-700">
              {isWork ? 'Still unfinished' : 'Pick up where you left off'}
            </p>
            <p className="mt-0.5 truncate text-[14px] font-extrabold text-ink">
              {target.label}
            </p>
            {/* The detail is the proof the work survived — "Step 4 of 6 ·
                Wedding" is what turns a generic offer into a specific one. It
                is only ever present when the page reported it. */}
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-ink-mute">
              <Clock3 size={11} className="shrink-0" />
              {target.detail ? `${target.detail} · ` : ''}{agoLabel(target.at)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => dismissResume(target.href)}
            aria-label="Not now"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-surface-sunk/[0.07] hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(target.href)}
          className="flex w-full items-center justify-center gap-2 bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950 transition-colors hover:bg-saffron-300 active:bg-saffron-500"
        >
          {target.verb === 'Back to' ? `Back to ${target.label.toLowerCase()}` : `${target.verb} it`}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
