import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Share2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { rewardLabel } from '../../lib/promotions'
import { track, EVENTS } from '../../lib/track'

/**
 * Invite other professionals, and see honestly how far off the reward is.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING IS PROMISED UNTIL A CAMPAIGN EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `referral_progress()` returns `campaign: null` when nothing is
 * configured, and this renders the code with no reward attached to it.
 * A partner can still invite somebody — that is useful on its own — but
 * the app does not mention money that nobody has set.
 *
 * The amount comes from the row, in paise, formatted once by
 * `rewardLabel`. There is no rupee value anywhere in this component,
 * and `check-referral-fraud.mjs` asserts that.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PROGRESS IS COUNTED THE WAY THE REWARD IS
 * ══════════════════════════════════════════════════════════════════════
 *
 * `qualified` counts only referrals that reached a completed event.
 * `in_progress` is everybody else who has signed up. Showing a single
 * number that mixes them would be the more flattering display and the
 * dishonest one: a partner with nineteen sign-ups and no completed
 * events is not one away from a reward, and finding that out at
 * nineteen is worse than knowing at one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS NOT SHOWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not who was rejected and not why. A partner told "that one was
 * refused for a duplicate phone" learns exactly what to change next
 * time, which is the opposite of the point. The reasons live in
 * `rejected_reason` and are operator-only.
 */
export default function PartnerReferral({ vendorId }) {
  const [state, setState] = useState(null)
  const [code, setCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let alive = true
    if (!vendorId) return undefined

    ;(async () => {
      const [progress, vendor] = await Promise.all([
        supabase.rpc('referral_progress'),
        supabase.from('vendors').select('referral_code').eq('id', vendorId).maybeSingle(),
      ])
      if (!alive) return

      /* 155 not pasted. The row is still shown in More — a screen that
         says why is better than a row that is missing — and this says
         so plainly rather than rendering an empty card. */
      if (progress.error || vendor.error) { setUnavailable(true); return }

      setState(progress.data ?? null)
      setCode(vendor.data?.referral_code ?? null)
      track(EVENTS.REFERRAL_CARD_VIEWED, {
        has_campaign: !!progress.data?.campaign,
        qualified: progress.data?.qualified ?? 0,
      })
    })()

    return () => { alive = false }
  }, [vendorId])

  /* Minted on first view rather than at signup, so 228 existing vendors
     do not all need a backfill before this screen works. */
  const mint = useCallback(async () => {
    const { data, error } = await supabase.rpc('generate_referral_code')
    if (error || !data) return
    const { error: wErr } = await supabase
      .from('vendors').update({ referral_code: data }).eq('id', vendorId)
    if (!wErr) setCode(data)
  }, [vendorId])

  useEffect(() => {
    if (state && !code && !unavailable) mint()
  }, [state, code, unavailable, mint])

  if (unavailable) {
    return (
      <p className="rounded-[16px] bg-ink/[0.03] p-4 text-[12.5px] leading-relaxed text-ink-mute">
        Referrals are not switched on for this account yet.
      </p>
    )
  }

  if (!state) {
    return (
      <p className="flex items-center gap-2 rounded-[16px] bg-ink/[0.03] p-4 text-[12.5px] text-ink-mute">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </p>
    )
  }

  const campaign = state.campaign ?? null
  const reward = rewardLabel(campaign?.reward_paise)
  const needed = state.needed ?? 0
  const qualified = state.qualified ?? 0
  const pct = needed ? Math.min(100, Math.round((qualified / needed) * 100)) : 0

  async function share() {
    track(EVENTS.REFERRAL_SHARED, { has_campaign: !!campaign })
    const text = `Join me on Sambramo. Use my code ${code} when you sign up.`
    try {
      if (navigator.share) { await navigator.share({ text }); return }
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* the partner dismissed the sheet; nothing to say */ }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <h2 className="text-[13.5px] font-extrabold text-ink">
          {campaign?.title ?? 'Invite other professionals'}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
          Know event professionals who should be on Sambramo? Share your code.
          {campaign
            ? ' They count once they have completed their first event with us.'
            : ' There is no reward running at the moment.'}
        </p>

        {code && (
          <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-page-sunk px-3.5 py-3">
            <span className="flex-1 font-mono text-[18px] font-extrabold tracking-[0.18em] text-ink">
              {code}
            </span>
            <button
              type="button"
              aria-label="Copy your code"
              onClick={async () => {
                track(EVENTS.REFERRAL_STARTED, {})
                try {
                  await navigator.clipboard.writeText(code)
                  setCopied(true); setTimeout(() => setCopied(false), 2000)
                } catch { /* clipboard refused; the code is on screen anyway */ }
              }}
              className="shrink-0 rounded-full bg-white p-2 text-plum-700 ring-1 ring-plum-200"
            >
              {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        <button
          type="button" onClick={share}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white active:scale-[0.98]"
        >
          <Share2 size={14} /> Share your code
        </button>
      </section>

      {campaign && (
        <section className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
              Progress
            </p>
            <p className="text-[12px] font-extrabold tabular-nums text-ink-soft">
              {qualified} of {needed}
            </p>
          </div>

          <span className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
            <span className="h-full rounded-full bg-plum-600" style={{ width: `${Math.max(2, pct)}%` }} />
          </span>

          {/* ── Counted the way the reward is ─────────────────────────
              Sign-ups and qualified referrals are separate numbers on
              purpose. One number mixing them is the flattering display
              and the dishonest one: nineteen sign-ups with no completed
              events is not one away from anything. */}
          <p className="mt-2.5 text-[12px] leading-snug text-ink-mute">
            {state.in_progress > 0
              ? `${state.in_progress} ${state.in_progress === 1 ? 'person has' : 'people have'} signed up with your code and ${state.in_progress === 1 ? 'has' : 'have'} not completed a first event yet. They count when they do.`
              : 'A referral counts once that partner has completed their first event with Sambramo.'}
          </p>

          {reward && (
            <p className="mt-2 text-[12.5px] font-extrabold text-ink">
              {state.unlocked
                ? `${reward} unlocked. It is added to your next payout.`
                : `${needed} qualified referrals unlock ${reward}.`}
            </p>
          )}

          {campaign.terms_url && (
            <a
              href={campaign.terms_url} target="_blank" rel="noreferrer"
              className="mt-2 inline-block text-[11.5px] font-bold text-plum-700 underline"
            >
              Terms apply
            </a>
          )}
        </section>
      )}
    </div>
  )
}
