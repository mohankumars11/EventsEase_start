import React from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import HoldToSign from './HoldToSign'

/**
 * The partner signs what they just said they can do.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A LISTING NEEDS A SIGNATURE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything before this screen is a claim. A caterer ticks 312 dishes,
 * a transporter ticks a 32-foot container, a venue ticks step-free
 * access — and dispatch then sends real jobs on the strength of it. When
 * one of those turns out not to be true, a family is standing in a hall
 * at 6pm and the only record is a checkbox nobody attested to.
 *
 * So the last thing before Submit is the partner putting their name to
 * it. Not a terms-and-conditions tick, which everybody scrolls past and
 * which is about OUR liability — a short, plain declaration about THEIR
 * claims, in words a person actually reads.
 *
 * ── Why hold, and not tap ────────────────────────────────────────────
 * A tap is indistinguishable from a mis-tap. Holding for a second is a
 * deliberate act, it cannot happen in a pocket, and on a phone it feels
 * like signing rather than like dismissing. The bar filling is the whole
 * interface: no keyboard, no scroll, nothing to read twice.
 *
 * ── What is kept ─────────────────────────────────────────────────────
 * The typed name, the moment, and the count of what was claimed. Not a
 * drawn image: a scribble on a canvas proves nothing about who held the
 * phone and costs a hundred kilobytes in every listing row. A name, a
 * timestamp and the exact claim is what an operator can actually use.
 *
 * The partner can still change anything — Back works, and a listing is
 * reviewed by a person before it goes live. This is a record of what was
 * asserted, not a lock.
 */

export default function ListingSignature({ trade, claimCount, value, onChange }) {
  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-xl bg-forest-50 p-2 text-forest-700">
          <ShieldCheck size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold leading-tight text-ink">
            Put your name to it
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
            Jobs are sent to you on the strength of what is above. Sign it
            and an operator checks it before anything goes live.
          </p>
        </div>
      </div>

      {/* The declaration. Four lines, in the second person, about what
          THEY claimed — not a licence agreement about what we may do. */}
      <ul className="mt-3 space-y-1.5 rounded-2xl bg-ink/[0.02] p-3.5">
        {[
          `Everything ticked here is work you have really done before${trade ? ` as ${trade}` : ''} — not work you would arrange if a job came.`,
          'You will say no to a job you cannot take, rather than take it and hope.',
          'What you cannot do, you have said so, and nothing is held against you for it.',
          'You can change any of this afterwards, at any time.',
        ].map(line => (
          <li key={line} className="flex gap-2">
            <Check size={13} className="mt-[3px] shrink-0 text-forest-600" />
            <span className="text-[12.5px] leading-snug text-ink-soft">{line}</span>
          </li>
        ))}
      </ul>

      {/* The gesture is HoldToSign, shared with the partner agreement
          signed during onboarding. A partner who has signed one and
          meets the other should not have to work out whether it is the
          same kind of act. It is. */}
      <div className="mt-3.5">
        <HoldToSign
          value={value}
          onChange={onChange}
          extra={{ trade, claims: claimCount }}
        />
      </div>
    </div>
  )
}
