import { useEffect, useMemo, useState } from 'react'
import PromoDeck from '../home/PromoDeck'
import { supabase } from '../../lib/supabase'
import { selectPromotions, rewardLabel } from '../../lib/promotions'
import { isMissingTable } from '../../lib/serviceCatalog'

/**
 * The campaigns that apply to this partner, on the Earnings tab.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT RENDERS NOTHING UNTIL SOMEBODY CONFIGURES SOMETHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * No campaign in the table, no card on screen. Not a placeholder, not a
 * "coming soon", not a referral promising a reward nobody has set.
 *
 * That is the whole design. A marketing surface that ships with a
 * hard-coded card is a commitment made by whoever wrote the JSX, on a
 * date they chose, to every partner who has that build installed —
 * which is a different set of people every week, because partners
 * update when they feel like it. Two partners doing the same thing
 * would see two different promises, both in writing.
 *
 * So the copy, the reward, the window and the audience all live in
 * `partner_promotions`, and this reads them.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ON THE EARNINGS TAB, AND DELIBERATELY NOT AT THE TOP OF IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * It sits after the chart, before the breakdown. A partner opens
 * Earnings to find out what they are owed; a promotion above that
 * answer is an advert standing between somebody and their money.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO AMOUNT IS COMPUTED HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `reward_paise` is formatted by `rewardLabel` and shown. Nothing in
 * this component decides what anybody is owed — `referral_progress()`
 * says whether a threshold is met, and an operator pays through
 * `record_adjustment`, which writes an auditable row with a reason.
 */

/* Plum and the one supporting violet, because every other surface on
   this tab is white and the deck has to read as a different KIND of
   thing without introducing a colour. Keyed by promotion type so two
   referral cards never look like two different products. */
const GROUND = {
  referral:     'linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)',
  calendar:     'linear-gradient(135deg,#2e1065 0%,#6d28d9 100%)',
  profile:      'linear-gradient(135deg,#3b0764 0%,#7c3aed 100%)',
  education:    'linear-gradient(135deg,#2e1065 0%,#5b21b6 100%)',
  seasonal:     'linear-gradient(135deg,#4c1d95 0%,#9333ea 100%)',
  announcement: 'linear-gradient(135deg,#2e1065 0%,#4c1d95 100%)',
}

const ART = {
  referral: '\u{1F91D}', calendar: '\u{1F4C5}', profile: '\u{2728}',
  education: '\u{1F4A1}', seasonal: '\u{1F389}', announcement: '\u{1F4E2}',
}

export default function PartnerMarketingCarousel({ vendorId, facts = {} }) {
  const [rows, setRows] = useState(null)
  const [dismissed, setDismissed] = useState([])

  useEffect(() => {
    let alive = true
    if (!vendorId) return undefined

    ;(async () => {
      /* The RLS policy in 154 already filters to live campaigns, so this
         asks for everything it is allowed to see. The client-side window
         check in `promotionIsLive` is belt and braces for a clock that
         disagrees, not a second gate. */
      const [promos, hidden] = await Promise.all([
        supabase.from('partner_promotions').select('*'),
        supabase.from('partner_promotion_dismissals')
          .select('promotion_id').eq('vendor_id', vendorId),
      ])
      if (!alive) return

      /* 154 not pasted yet. A missing table is not an error worth
         showing: there is simply nothing to advertise, which is exactly
         what an empty result means too. */
      if (promos.error) { setRows(isMissingTable(promos.error) ? [] : []); return }

      setRows(promos.data ?? [])
      setDismissed((hidden.data ?? []).map(d => d.promotion_id))
    })()

    return () => { alive = false }
  }, [vendorId])

  const slides = useMemo(() => {
    const live = selectPromotions(rows, facts, { dismissed })
    return live.map(p => {
      const reward = rewardLabel(p.reward_paise)
      return {
        key: p.id,
        to: p.cta_route ?? '/dashboard/vendor?tab=account',
        background: GROUND[p.type] ?? GROUND.announcement,
        art: p.icon ?? ART[p.type] ?? ART.announcement,
        eyebrow: p.subtitle ?? null,
        title: p.title,
        /* The reward is appended rather than interpolated into the body,
           so a campaign with no amount configured simply has a shorter
           sentence instead of one with a hole in it. */
        body: [p.body, reward ? `Unlock ${reward}.` : null].filter(Boolean).join(' '),
        cta: p.cta_label ?? 'Open',
      }
    })
  }, [rows, facts, dismissed])

  /* Nothing configured, nothing rendered. Not a skeleton either: a
     loading shape for a card that may never exist is a promise of an
     advert. */
  if (!slides.length) return null

  return (
    <section aria-label="From Sambramo" data-promotions={slides.length}>
      <PromoDeck slides={slides} interval={5500} />
    </section>
  )
}
