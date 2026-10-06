import { Share2, ChevronRight } from 'lucide-react'
import { REWARD, STATE_FILTERS } from '../../../lib/referralModel'
import { Chip, fmtDate } from '../growth/parts'

/** One referral in a list: who, which trade, how far, and the reward only once there is one. */
export default function ReferralRow({ r, onOpen }) {
  const reward = REWARD[r.reward_status] ?? REWARD.not_eligible
  const stage = r.not_eligible ? 'Not eligible'
    : STATE_FILTERS.find(f => f.key === r.state)?.label ?? r.state
  return (
    <button type="button" onClick={onOpen} data-referral-id={r.id}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-ink/[0.03]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-50 text-plum-700 ring-1 ring-plum-100">
        <Share2 size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold text-ink">
          {r.not_eligible ? 'A sign-up that could not count' : (r.referred_name || 'A partner who signed up')}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-mute">
          {r.trade_name ?? 'Trade not set'} · {stage} · {fmtDate(r.updated_at)}
        </span>
      </span>
      {r.reward_status !== 'not_eligible' && <Chip tone={reward.tone}>{reward.label}</Chip>}
      <ChevronRight size={16} className="shrink-0 text-ink/30" />
    </button>
  )
}
