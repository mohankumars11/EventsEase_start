import { useEffect } from 'react'
import {
  UserRound, Sparkles, Camera, Phone, Store, IndianRupee, Navigation,
  CalendarDays, ShieldCheck, Landmark,
} from 'lucide-react'
import { STATUS_LABEL } from '../../../lib/profileCompletion'
import { Card, ListCard, DetailRow } from './parts'

const ICON = {
  personal: UserRound, business: Sparkles, photo: Camera, contact: Phone,
  trades: Store, pricing: IndianRupee, area: Navigation, availability: CalendarDays,
  verification: ShieldCheck, payout: Landmark,
}

/**
 * Build Your Profile: the checklist, and nothing else.
 *
 * Every row is decided by a saved value (lib/profileCompletion.js) and
 * opens the exact screen that saves it. The count at the top is how many
 * rows the DATABASE says are complete — opening a form and leaving it
 * changes nothing here, and a save shows up the moment it lands.
 *
 * `onRefresh` re-reads the listings, documents and payout rows on the
 * way in, so a partner coming back from the Listing or Calendar tab sees
 * what they just did rather than what was true when More first loaded.
 */
export default function BuildProfile({ checklist, onGo, onRefresh }) {
  useEffect(() => { onRefresh?.() }, [onRefresh])

  const { items, done, total } = checklist
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13.5px] font-extrabold text-ink">Your profile</h2>
          <p className="text-[12px] font-extrabold tabular-nums text-ink-soft" data-testid="profile-count">
            {done} of {total} complete
          </p>
        </div>
        <span className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]"
              role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
          <span className="h-full rounded-full bg-plum-600" style={{ width: `${Math.max(2, pct)}%` }} />
        </span>
        <p className="mt-2 text-[11.5px] leading-snug text-ink-mute">
          Each row opens the place where it is changed. It turns complete once it is saved.
        </p>
      </Card>

      <ListCard>
        {items.map(i => (
          <DetailRow key={i.key} testId={`check-${i.key}`}
            icon={ICON[i.key]} label={i.label} detail={i.detail}
            chip={STATUS_LABEL[i.status]} tone={i.status}
            onClick={() => onGo(i.to)} />
        ))}
      </ListCard>
    </div>
  )
}
