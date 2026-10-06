import { Check } from 'lucide-react'
import { fetchReferral } from '../../../lib/referrals'
import { REWARD, timelineOf, nextStep } from '../../../lib/referralModel'
import { useLoad, LoadState, RefreshButton, Card, Chip, fmtDate } from '../growth/parts'

/**
 * One referral, as far as it has got.
 *
 * Every date on this screen is a milestone the server stamped from a
 * fact (see migration 158). Nothing here moves it along: opening this
 * screen, or the one before it, changes nothing.
 *
 * Deliberately absent: the referred partner's phone, documents and bank
 * details; the booking behind their first event (its customer is not
 * the referrer's business); and, for a sign-up that could not count,
 * who it was and why.
 */
export default function ReferralDetail({ id, onOpenTrade }) {
  const one = useLoad(() => fetchReferral(id), [id])
  const r = one.data

  if (one.status === 'loading' || one.status === 'failed') {
    return <LoadState status={one.status} error={one.error} onRetry={one.reload} what="this referral" />
  }
  if (!r) {
    return (
      <Card>
        <h2 className="text-[13px] font-extrabold text-ink">This referral is not on your account</h2>
        <p className="mt-1 text-[12px] text-ink-mute">It may have been opened from an old link. Go back to see your referrals.</p>
      </Card>
    )
  }

  const reward = REWARD[r.reward_status] ?? REWARD.not_eligible
  const steps = timelineOf(r)

  return (
    <div className="space-y-3" data-testid="referral-detail">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold text-ink">
              {r.not_eligible ? 'A sign-up that could not count' : (r.referred_name || 'A partner who signed up')}
            </h2>
            {r.trade_id ? (
              <button type="button" onClick={() => onOpenTrade(r.trade_id)}
                className="mt-0.5 text-[12px] font-bold text-plum-700 underline">
                {r.trade_name}
              </button>
            ) : (
              <p className="mt-0.5 text-[12px] text-ink-mute">Trade not set</p>
            )}
          </div>
          <RefreshButton onClick={() => one.reload()} busy={one.status === 'refreshing'} />
        </div>
        {r.invite_code && (
          <p className="mt-2 text-[11px] text-ink-mute">
            Joined with invitation <span className="font-mono font-bold text-ink-soft">{r.invite_code}</span>
          </p>
        )}
        <p className="mt-3 rounded-xl bg-plum-50 px-3 py-2 text-[12.5px] font-semibold leading-snug text-plum-900" data-testid="next-step">
          {nextStep(r)}
        </p>
      </Card>

      {!r.not_eligible && (
        <Card>
          <h3 className="text-[13px] font-extrabold text-ink">Milestones</h3>
          <ol className="mt-3 space-y-0">
            {steps.map((s, i) => (
              <li key={s.key} className="flex gap-3" data-milestone={s.key} data-done={s.done}>
                <span className="flex flex-col items-center">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${s.done ? 'bg-plum-600 text-white' : 'bg-ink/[0.07] text-ink-faint'}`}>
                    {s.done ? <Check size={13} strokeWidth={3} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                  </span>
                  {i < steps.length - 1 && <span className={`w-0.5 flex-1 ${s.done ? 'bg-plum-200' : 'bg-ink/[0.07]'}`} style={{ minHeight: 16 }} />}
                </span>
                <span className="pb-3">
                  <span className={`block text-[12.5px] font-bold ${s.done ? 'text-ink' : 'text-ink-mute'}`}>{s.label}</span>
                  <span className="block text-[11px] text-ink-mute">{s.done ? fmtDate(s.at) : 'Not yet'}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {!r.not_eligible && (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-extrabold text-ink">Reward</h3>
            <Chip tone={reward.tone}>{reward.label}</Chip>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">
            {r.campaign_title
              ? `Counted under “${r.campaign_title}”. `
              : 'No referral campaign applies to this referral yet. '}
            Qualifying and being paid are separate: a reward shows as paid only once the payout has been made.
          </p>
          {r.reward_status === 'paid' && r.paid_at && (
            <p className="mt-1 text-[12px] font-bold text-forest-700">Paid on {fmtDate(r.paid_at)}.</p>
          )}
        </Card>
      )}
    </div>
  )
}
