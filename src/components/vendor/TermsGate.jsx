import { useState } from 'react'
import {
  Percent, Phone, Wallet, Check, Undo2, AlertTriangle, Ban,
  ChevronDown, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  PARTNER_RULES, PARTNER_TERMS_LONG, PARTNER_TERMS_VERSION,
} from '../../config/partnerTerms'

/**
 * The seven rules, and the tick that says they were read.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS BLOCKS THE APP
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner who has not agreed to the cancellation ladder cannot fairly
 * be charged by it. A partner who has not been told about the strike
 * count cannot fairly be suspended by it. Both of those rules are
 * already enforced in the database — migrations 081 and 083 — against
 * people who were never shown them.
 *
 * So this is a gate rather than a page in a menu. It appears once, it is
 * not dismissible, and what is behind it does not load until it is
 * answered. That is not a dark pattern in reverse: everything the gate
 * asks about costs the partner money, and consent obtained after the
 * charge is not consent.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DESIGNED FOR SOMEBODY WHO WILL NOT READ IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Seven cards, each one line, scannable in twenty seconds. The long form
 * is underneath, collapsed, for whoever wants it and for the record.
 *
 * The test each card had to pass: would a master be surprised by this
 * later? A wall of text produces a tap. Seven cards produce a chance of
 * understanding, which is the only thing worth having.
 */

const ICONS = {
  percent: Percent, phone: Phone, wallet: Wallet,
  check: Check, undo: Undo2, alert: AlertTriangle, ban: Ban,
}

export default function TermsGate({ vendorId, onAccepted }) {
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [openLong, setOpenLong] = useState(false)

  async function accept() {
    setSaving(true); setError(null)
    const { error: e } = await supabase
      .from('vendors')
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: PARTNER_TERMS_VERSION,
      })
      .eq('id', vendorId)

    setSaving(false)
    if (e) { setError(e.message); return }
    onAccepted?.()
  }

  return (
    /* fixed, not min-h-screen: the vendor dashboard renders inside a
       shell that paints the app bar, and a consent screen with the
       customer chrome above it is neither full-screen nor obviously
       the partner app. This covers everything. */
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white">
      {/* Saffron, because this is the partner app and it should look like
          it from the first screen. */}
      <div className="bg-gradient-to-br from-saffron-500 to-saffron-400 px-5 pb-7 pt-10">
        {/* Set as type rather than the wordmark component: that lockup
           paints its own brand teal, and teal on saffron is the one
           pairing this header cannot have. */}
        <p className="font-serif text-[22px] font-extrabold leading-none tracking-tight text-plum-950">
          Sambramo
        </p>
        <p className="mt-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-plum-950/65">
          Partners
        </p>
        <h1 className="mt-5 font-serif text-[27px] font-extrabold leading-[1.12] tracking-tight text-plum-950">
          Seven things, then you are in
        </h1>
        <p className="mt-2 max-w-md text-[14px] font-semibold leading-relaxed text-plum-950/80">
          Everything here costs you money or your standing if it takes you by
          surprise. Twenty seconds now.
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-40 pt-5">
        <ul className="space-y-2.5">
          {PARTNER_RULES.map((r, i) => {
            const Icon = ICONS[r.icon] ?? Check
            return (
              <li
                key={r.id}
                className="flex gap-3 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.07]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-400/20">
                  <Icon size={17} className="text-saffron-800" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-extrabold leading-snug text-ink">
                    {/* Numbered, because seven unnumbered cards read as a
                        list somebody can stop halfway down. */}
                    <span className="text-ink-mute">{i + 1}. </span>{r.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{r.body}</p>
                </div>
              </li>
            )
          })}
        </ul>

        {/* ── The long form, collapsed ──────────────────────────────── */}
        <button
          type="button"
          onClick={() => setOpenLong(v => !v)}
          aria-expanded={openLong}
          className="mt-4 flex w-full items-center justify-between rounded-[18px] bg-ink/[0.03] px-4 py-3.5 text-left"
        >
          <span className="text-[13.5px] font-extrabold text-ink">Read the full terms</span>
          <ChevronDown
            size={17}
            className={`text-ink-mute transition-transform ${openLong ? 'rotate-180' : ''}`}
          />
        </button>

        {openLong && (
          <div className="mt-2 space-y-4 rounded-[18px] bg-ink/[0.02] p-4">
            {PARTNER_TERMS_LONG.map(s => (
              <div key={s.heading}>
                <h3 className="text-[13px] font-extrabold text-ink">{s.heading}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
            <p className="pt-1 text-[11.5px] font-semibold text-ink-mute">
              Version {PARTNER_TERMS_VERSION}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-[12.5px] font-bold text-rose-700">
            {error}
          </p>
        )}
      </div>

      {/* ── The tick and the button, pinned ───────────────────────────
          Pinned because the cards are longer than a phone screen and a
          button below seven of them is a button nobody reaches. The
          checkbox sits WITH it: separating the consent from the action
          is how people end up agreeing to something they scrolled past. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[0.08] bg-white/95 px-4 py-3.5 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink/25 text-saffron-500 focus:ring-saffron-400"
            />
            <span className="text-[13px] font-semibold leading-snug text-ink">
              I have read these and I agree to work by them.
            </span>
          </label>

          <button
            type="button"
            onClick={accept}
            disabled={!agreed || saving}
            /* Saffron, not the shared plum button. This is the partner
               app and its primary action should be its own colour --
               the same one now on the launcher icon. */
            className="mt-3 w-full rounded-full bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:bg-ink/[0.08] disabled:text-ink-mute"
          >
            {saving
              ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Saving…</span>
              : 'Agree and start working'}
          </button>
        </div>
      </div>
    </div>
  )
}
