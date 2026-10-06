import { useState } from 'react'
import { ScanFace, Check, Loader2, X } from 'lucide-react'
import { CONSENT, setConsent } from '../../lib/partnerConsent'

/**
 * "May we compare this photo with the one on your ID?"
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASKED PROPERLY, WHICH MEANS REFUSABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Comparing a face with the photograph on a government ID is biometric
 * processing, and the DPDP Act 2023 asks four things of consent to it:
 * free, specific, informed, and withdrawable as easily as it was given.
 *
 * Each of those is a design constraint here, not a paragraph:
 *
 *   free         "No thanks" is a real button and costs the partner
 *                nothing. Migration 149 deliberately leaves the selfie
 *                advisory so that stays true.
 *   specific     This asks about one thing. It is not folded into the
 *                terms, where a partner would be agreeing to it in
 *                order to get paid.
 *   informed     What is compared, what is kept, and what happens if it
 *                does not match — all three said here, before the
 *                camera opens, in four lines rather than a policy.
 *   withdrawable The same switch, in the same place, afterwards.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT REFUSING ACTUALLY COSTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing, and the panel says so in those words. A partner who declines
 * has their photographs compared by a person at Sambramo instead, which
 * is what happened before any automatic comparison existed.
 *
 * Saying "this may delay your verification" would be a threat dressed as
 * information, and it would make the consent unfree — which would make
 * every other consent in the app unfree too, because the pattern is what
 * a regulator reads.
 */
export default function BiometricConsent({ vendorId, granted, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function decide(yes) {
    setBusy(true); setError(null)
    try {
      await setConsent(vendorId, CONSENT.FACE_MATCH, yes)
      onChanged?.(yes)
    } catch (e) {
      setError(e?.message ?? 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  /* Already agreed: a line and a way back out, not the whole argument
     again. The withdrawal sits exactly where the grant did. */
  if (granted) {
    return (
      <div className="mb-3 flex items-start gap-2.5 rounded-[14px] bg-forest-50 px-3.5 py-3 ring-1 ring-forest-200">
        <Check size={15} strokeWidth={3} className="mt-0.5 shrink-0 text-forest-700" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold leading-snug text-forest-900">
            You agreed we can compare this photo with the one on your ID.
          </p>
          <button
            type="button" onClick={() => decide(false)} disabled={busy}
            className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-extrabold text-forest-800 underline disabled:opacity-50"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            Change my mind
          </button>
          {error && <p className="mt-1 text-[11px] text-rose-700">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-[16px] bg-plum-50 px-3.5 py-3.5 ring-1 ring-plum-200">
      <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-plum-900">
        <ScanFace size={16} className="shrink-0" />
        Before you take this photo
      </p>

      <ul className="mt-2 space-y-1 text-[11.5px] leading-snug text-plum-900/85">
        <li>
          We compare your photo with the picture printed on the ID you uploaded,
          to check they are the same person.
        </li>
        <li>
          The photo is kept privately with your other documents. It is never
          shown to customers and never used for anything else.
        </li>
        <li>
          If the two do not match, nothing is rejected automatically —
          a person at Sambramo looks at both.
        </li>
        {/* The sentence that makes the consent free. It is here because
            it is true, and it has to be read before the decision. */}
        <li className="font-bold">
          You can say no. A person will compare them by eye instead, and
          nothing about your account changes.
        </li>
      </ul>

      {error && <p className="mt-2 text-[11.5px] font-bold text-rose-700">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button" onClick={() => decide(true)} disabled={busy}
          className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full bg-plum-700 px-4 text-[12.5px] font-extrabold text-white disabled:opacity-60"
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          Yes, compare them
        </button>
        {/* Same size, same weight, same row. A "no" rendered as a faint
            link is a "no" the layout is discouraging. */}
        <button
          type="button" onClick={() => decide(false)} disabled={busy}
          className="min-h-[38px] flex-1 rounded-full bg-white px-4 text-[12.5px] font-extrabold text-plum-900 ring-1 ring-plum-300 disabled:opacity-60"
        >
          No, thank you
        </button>
      </div>
    </div>
  )
}
