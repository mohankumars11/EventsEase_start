import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { greetingFor, msUntilNextBand } from '../../lib/greeting'
import OnlineToggle from './OnlineToggle'
import PartnerAvatar from '../vendor/PartnerAvatar'

function useGreeting(fullName) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer
    const arm = () => {
      const at = new Date()
      setNow(at)
      timer = setTimeout(arm, msUntilNextBand(at) + 1000)
    }
    timer = setTimeout(arm, msUntilNextBand(new Date()) + 1000)
    return () => clearTimeout(timer)
  }, [])
  return greetingFor({ fullName, date: now })
}

/**
 * The top of the Jobs tab.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE GREETING, NOT TWO
 * ══════════════════════════════════════════════════════════════════════
 *
 * This carried "Good morning, Mohan" AND "Happy Wednesday!" on separate
 * lines, above and below the business name. Two greetings is one more
 * than any app gets to open with, and it pushed the name — the thing
 * the partner is actually looking for — into the middle of a sandwich.
 *
 * Every partner app in this category opens with the time-of-day
 * greeting and the name: Uber, Swiggy, Zomato, Urban Company, Porter.
 * None of them says what day it is, because the partner knows, and
 * because "Happy Wednesday!" is the same sentence for everybody and
 * therefore tells them nothing about their own business.
 *
 * So the wish stays, the day line is gone, and the name is the biggest
 * thing on the screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE BUSINESS NAME WAS LOSING ITS DESCENDERS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `leading-[1.04]` on a 27px type with a 36px breakpoint cuts the line
 * box below the font's own descent. "Photography" loses the tail of its
 * g and the bowl of its p — reported, and visible in the screenshot. A
 * line box cannot be shorter than the type it holds; `leading-tight`
 * (1.25) is the smallest that clears Archivo's descenders, and the
 * explicit `pb` gives the one-line case room when it truncates.
 */
export default function JobsHeader({
  businessName, fullName = null, vendorId, avatarUrl, acceptingJobs, unreadAlerts = 0,
  onAcceptingChange, onOpenProfile, onOpenAlerts,
}) {
  const { wish } = useGreeting(fullName)
  return (
    <header className="bg-white text-[#17152B]">
      <div className="px-0 pb-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {/* ── The mark, as it is drawn on the launch screen ───────
                White capitals on royal amethyst. It used to be the
                gradient-clipped text on white, whose darkest stop
                (#1B0240) reads as navy at this size — and navy is not
                this brand. A solid amethyst ground is the same object
                as the splash, so the first thing a partner ever sees
                and the thing at the top of every session match. */}
            <span
              aria-label="Sambramo"
              className="brand-wordmark-sans shrink-0 rounded-[11px] px-3 py-[7px] text-[15px] uppercase leading-none tracking-[0.055em] text-white"
              /* #5B21A8 — the same light royal amethyst the splash
                 paints, and the native launch ground with it. One
                 purple across the whole brand: the screen that opens
                 the app and the chip at the top of every session are
                 the same colour, which is the point of a brand colour.

                 It was #2A085C, sampled from the first reference. That
                 is four times darker and reads as near-black at this
                 size rather than as the brand's purple. */
              style={{ background: '#5B21A8' }}
            >
              Sambramo
            </span>
            <span className="shrink-0 rounded-full border border-[#E3C9FF] bg-[#F7F0FF] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#6D28D9]">
              Partner
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onOpenAlerts} aria-label={unreadAlerts ? `Alerts and updates, ${unreadAlerts} unread` : 'Alerts and updates'} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17152B] shadow-[0_2px_8px_rgba(25,15,50,.06)] transition active:scale-95">
              <Bell size={21} strokeWidth={1.9} />
              {unreadAlerts > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
            </button>
            <button type="button" onClick={onOpenProfile} aria-label="Your account" className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(25,15,50,.06)] transition active:scale-95">
              <PartnerAvatar url={avatarUrl} name={businessName} size={40} shape="square" />
            </button>
          </div>
        </div>

        {/* mt-3 and not mt-4: one greeting line now sits here, so the
            gap that used to separate two of them is too much air. */}
        {/* No trailing comma: the name below is a heading, not the rest
            of this sentence, and a comma hanging off the end of a line
            reads as something that failed to load. */}
        <p className="mt-3 text-[14px] font-medium leading-tight text-[#77738D]">{wish}</p>

        {/* leading-tight, and pb-0.5 under it: see the note above. The
            descenders of a truncated business name were being clipped
            by the line box itself. */}
        <h1 className="mt-0.5 flex max-w-full items-baseline gap-1.5 pb-0.5 text-[26px] font-black leading-tight tracking-[-0.03em] text-[#17152B] sm:text-[31px]">
          <span className="min-w-0 truncate">{businessName ?? 'Your business'}</span>
          <WavingHand />
        </h1>

        <div className="mt-3">
          <OnlineToggle vendorId={vendorId} initial={acceptingJobs} onChange={onAcceptingChange} />
        </div>
      </div>
    </header>
  )
}

/**
 * The wave, actually waving.
 *
 * A static 👋 next to a business name is a full stop. Four degrees of
 * rotation about the wrist, on a slow loop with a long pause between
 * waves, reads as the screen being alive without becoming the thing
 * you look at — which is what an animation beside a heading has to
 * manage.
 *
 * `prefers-reduced-motion` stops it dead rather than slowing it: a
 * partner who has asked for no motion has asked for no motion.
 */
function WavingHand() {
  return (
    <span
      aria-hidden="true"
      className="partner-wave inline-block shrink-0 origin-[70%_80%] text-[0.82em] leading-none"
    >
      👋
    </span>
  )
}
