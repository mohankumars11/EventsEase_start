import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { selectPromotions } from '../../../lib/promotions'
import { isMissingTable } from '../../../lib/serviceCatalog'
import { track, EVENTS } from '../../../lib/track'
import PartnerGrowthCard from './PartnerGrowthCard'

/**
 * Your Sambramo Growth — a swipeable rail under the review card.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOT THE DECK ON THE EARNINGS TAB
 * ══════════════════════════════════════════════════════════════════════
 *
 * `PromoDeck` cross-fades ONE slide on a timer: the others are not in
 * the DOM and there is nothing to swipe through. That is right for the
 * customer home, where the deck is a rotating banner. It is wrong here,
 * where three cards are a set a partner is meant to browse — a deck that
 * changes under your thumb while you read is worse than no motion.
 *
 * `SlideCarousel` is the other candidate and is dead code: arrows only,
 * `hidden sm:flex`, so on a phone it is a plain overflow scroller with
 * no indication there is anything to the right.
 *
 * So: the house scroll-snap idiom, which nine rails in this codebase
 * already use — `flex snap-x snap-mandatory … scroll-pl-4 scrollbar-hide`
 * with each card `shrink-0 snap-start`. Cards are 86% wide so the next
 * one peeks, which is the only honest affordance for "swipe me".
 *
 * ══════════════════════════════════════════════════════════════════════
 * FULL-BLEED, BUT BACK ON THE RULER
 * ══════════════════════════════════════════════════════════════════════
 *
 * `-mx-4 sm:-mx-6` breaks out of the page column so a card can run off
 * the right edge; `px-4 sm:px-6` and `scroll-pl-4 sm:scroll-pl-6` put
 * the first card and every snapped card back exactly on the column's
 * left edge. Without the scroll padding the snap lands at the
 * scroller's edge and every card sits 16px left of the cards above it —
 * the stagger `check-partner-alignment` exists to catch.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT RENDERS NOTHING UNTIL SOMEBODY CONFIGURES SOMETHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Cards come from `partner_promotions`, not from this file. No copy, no
 * reward and no campaign window is compiled into the bundle — which is
 * the whole reason that table exists: a campaign that ends on the 31st
 * should not need a release, and two partners on two builds must not see
 * two different promises.
 */
export default function PartnerGrowthRail({ vendorId, facts = {}, onAct }) {
  const [rows, setRows] = useState(null)
  const [dismissed, setDismissed] = useState([])
  const [active, setActive] = useState(0)
  const railRef = useRef(null)
  const seenRef = useRef(false)

  useEffect(() => {
    let alive = true
    if (!vendorId) return undefined

    ;(async () => {
      const [promos, hidden] = await Promise.all([
        supabase.from('partner_promotions').select('*'),
        supabase.from('partner_promotion_dismissals')
          .select('promotion_id').eq('vendor_id', vendorId),
      ])
      if (!alive) return

      if (promos.error) {
        /* 154 not pasted, or the read failed. Either way there is
           nothing to show, and a marketing rail is not worth an error
           state. The distinction is kept for whoever is debugging. */
        if (!isMissingTable(promos.error)) {
          console.warn('promotions unavailable:', promos.error.message)
        }
        setRows([])
        return
      }

      setRows(promos.data ?? [])
      setDismissed(hidden.error ? [] : (hidden.data ?? []).map(d => d.promotion_id))
    })()

    return () => { alive = false }
  }, [vendorId])

  const cards = useMemo(
    () => selectPromotions(rows, facts, { dismissed }),
    [rows, facts, dismissed])

  /* Once per set, not per render and not per card. A rail that reports
     an impression every time React re-runs makes the click-through rate
     meaningless. */
  useEffect(() => {
    if (!cards.length || seenRef.current) return
    seenRef.current = true
    track(EVENTS.GROWTH_CARD_IMPRESSION, { count: cards.length, first: cards[0].type })
  }, [cards])

  /* Which card is under the thumb, from scroll position rather than
     from a timer — the dots have to follow the finger, not lead it. */
  const onScroll = useCallback(() => {
    const el = railRef.current
    if (!el || !cards.length) return
    const i = Math.round(el.scrollLeft / (el.scrollWidth / cards.length))
    setActive(Math.max(0, Math.min(cards.length - 1, i)))
  }, [cards.length])

  if (!cards.length) return null

  return (
    <section className="mb-4" aria-label="Your Sambramo growth">
      <div className="mb-2.5 flex items-start gap-2">
        <TrendingUp size={15} className="mt-0.5 shrink-0 text-plum-600" />
        <div className="min-w-0">
          <h2 className="font-mono text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-800">
            Your Sambramo growth
          </h2>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-mute">
            More events. More connections. More opportunities.
          </p>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-1 sm:-mx-6 sm:scroll-pl-6 sm:px-6"
      >
        {cards.map(p => (
          <PartnerGrowthCard
            key={p.id}
            promotion={p}
            onAct={promo => {
              track(EVENTS.GROWTH_CARD_CLICKED, { type: promo.type })
              onAct?.(promo)
            }}
          />
        ))}
      </div>

      {/* Dots only when there is somewhere to go. One card with one dot
          under it is a control that does nothing. */}
      {cards.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
          {cards.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-plum-600' : 'w-1.5 bg-ink/20'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
