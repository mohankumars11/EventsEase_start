import { useState } from 'react'
import { Check, Loader2, ShieldCheck, ScanLine } from 'lucide-react'

/**
 * Which ID this partner would like to prove themselves with.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AADHAAR IS THE DEFAULT, NOT THE PRICE OF ENTRY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Until now VER-ID-IDENTITY resolved to exactly one document type and a
 * partner who did not want to hand over an Aadhaar number had no way
 * through onboarding at all. That is not a preference we are entitled
 * to override -- the UIDAI's own position is that Aadhaar is one
 * acceptable proof among several and may not be demanded as the only
 * one.
 *
 * ── Why the strength of the check is printed on the card ────────────
 * These four are not equally checkable and pretending otherwise is the
 * dishonesty this whole screen exists to avoid. Aadhaar carries a
 * Verhoeff check digit; a driving licence carries a state code, an RTO
 * code and an issue year that can be contradicted. A voter ID number
 * has no check digit and no public algorithm -- the ECI validates
 * against its roll, not against arithmetic -- and a passport's check
 * digits live in the machine-readable zone, which is a different string
 * from the number on the card.
 *
 * So each card says what will actually happen to it. A partner picking
 * the passport should know a person will read it, and a partner picking
 * Aadhaar should know the number is checked the moment they type it.
 * Neither line promises a government lookup, because none of the four
 * gets one today.
 */

/* What each choice actually buys, in the partner's terms. Deliberately
   not a star rating: "checked instantly" and "a person reads it" are
   different KINDS of answer, not different amounts of the same one. */
const STRENGTH = {
  aadhaar: {
    tone: 'strong',
    says: 'The number is checked as you type it.',
    note: 'Both sides. We store only the last four digits.',
  },
  dl: {
    tone: 'strong',
    says: 'The state, RTO and issue year are checked as you type.',
    note: 'The card itself, front and back.',
  },
  voter_id: {
    tone: 'shape',
    says: 'We check the format; a person reads the card.',
    note: 'No public system verifies a voter ID number.',
  },
  passport: {
    tone: 'shape',
    says: 'We check the format; a person reads the page.',
    note: 'The first page, and it must not have expired.',
  },
}

const TONE = {
  strong: 'text-forest-700',
  shape: 'text-ink/55',
}

export default function IdentityChoice({ value, options = [], onChange, locked = false, lockedReason = null }) {
  const [saving, setSaving] = useState(null)
  const current = value ?? options[0]?.kind ?? null

  if (options.length < 2) return null

  async function pick(kind) {
    if (locked || kind === current || saving) return
    setSaving(kind)
    try {
      await onChange?.(kind)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mb-5 rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07]">
      <p className="flex items-center gap-2 text-[13.5px] font-extrabold leading-tight text-ink">
        <ScanLine size={15} className="shrink-0 text-plum-600" />
        Which ID would you like to use?
      </p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-ink/65">
        Any one of these proves who you are. You only need to upload the one you
        pick.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {options.map(o => {
          const on = o.kind === current
          const s = STRENGTH[o.kind] ?? { tone: 'shape', says: '', note: null }
          return (
            <li key={o.kind}>
              <button
                type="button"
                onClick={() => pick(o.kind)}
                disabled={locked}
                aria-pressed={on}
                data-identity-choice={o.kind}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ring-1 ${
                  on
                    ? 'bg-plum-50 ring-plum-300'
                    : 'bg-white ring-ink/[0.09] active:bg-ink/[0.03]'
                } ${locked ? 'opacity-55' : ''}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ${
                    on ? 'bg-plum-600 text-white ring-plum-600' : 'bg-white ring-ink/20'
                  }`}
                >
                  {saving === o.kind
                    ? <Loader2 size={11} className="animate-spin" />
                    : on ? <Check size={11} strokeWidth={3.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold leading-tight text-ink">
                    {o.label}
                  </span>
                  <span className={`mt-0.5 block text-[11.5px] font-semibold leading-snug ${TONE[s.tone]}`}>
                    {s.says}
                  </span>
                  {s.note && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink/50">
                      {s.note}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* ── Once something is uploaded, switching would orphan it ─────
          The row is keyed by requirement, so changing the type under an
          uploaded document leaves a photo of a passport filed as an
          Aadhaar card. Locking is the honest response; the way out is
          to remove what was uploaded, which the row below already
          offers. */}
      {locked && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-ink/60">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" />
          {lockedReason ?? 'Remove what you uploaded below to choose a different ID.'}
        </p>
      )}
    </div>
  )
}
