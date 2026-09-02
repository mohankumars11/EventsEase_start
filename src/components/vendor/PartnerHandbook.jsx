import { useState } from 'react'
import { ChevronDown, BookOpen, FileText } from 'lucide-react'
import { PARTNER_RULES, PARTNER_TERMS_LONG, PARTNER_TERMS_VERSION } from '../../config/partnerTerms'

/**
 * How Sambramo works, and what a partner agreed to — inside the app.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS IN ACCOUNT AND NOT IN THE TAB BAR
 * ══════════════════════════════════════════════════════════════════════
 *
 * "How it works" and "What it costs" were briefly two tabs on a bar the
 * landing page carried before sign-in. That made two tab bars in one app
 * — the thing at the bottom of the screen meant something different
 * depending on whether you had an account — and a permanent seat at the
 * bottom of the screen is the wrong price for a page somebody reads once.
 *
 * These are reference, not destinations. A partner reads them when they
 * are deciding, and after that only when something surprises them. That
 * is Account: the drawer you open on purpose.
 *
 * ── The terms were unreachable, which is the real bug ────────────────
 * Until now the only place PARTNER_TERMS_LONG rendered was the gate you
 * accept it on. Accept once and it was gone — the agreement a partner is
 * held to could not be re-read inside the app that holds them to it.
 * That is not a nicety: the fee, the cancellation ladder and the payment
 * rule all live in there, and "you agreed to it" only means anything if
 * you can still go and look.
 *
 * The version stamp is shown for the same reason. Terms change; which
 * one somebody accepted is a fact, and it is on their vendor row.
 */

function Fold({ icon: Icon, title, sub, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Icon size={18} className="shrink-0 text-ink-mute" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold leading-tight text-ink">{title}</span>
          <span className="block text-[12px] leading-snug text-ink-mute">{sub}</span>
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="border-t border-ink/[0.06] p-4 pt-3.5">{children}</div>}
    </div>
  )
}

export default function PartnerHandbook() {
  return (
    <div className="space-y-2.5">
      <Fold
        icon={BookOpen}
        title="How Sambramo works"
        sub="The seven rules, in short"
      >
        {/* The same seven cards as the acceptance gate, and deliberately
            the same words. A partner who reads this a month later should
            recognise it as the thing they ticked, not discover a second
            summary that says it slightly differently. */}
        <ul className="space-y-3.5">
          {PARTNER_RULES.map(r => (
            <li key={r.title}>
              <p className="text-[13.5px] font-extrabold leading-tight text-ink">{r.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{r.body}</p>
            </li>
          ))}
        </ul>
      </Fold>

      <Fold
        icon={FileText}
        title="Partner terms"
        sub={`The full agreement · version ${PARTNER_TERMS_VERSION}`}
      >
        <div className="max-h-[22rem] overflow-y-auto pr-1">
          {PARTNER_TERMS_LONG.map(s => (
            <div key={s.heading} className="mb-4 last:mb-0">
              <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
                {s.heading}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </Fold>
    </div>
  )
}
