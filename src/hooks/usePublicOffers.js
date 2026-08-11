import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * The live coupons this visitor can actually use, fetched once per page load.
 *
 * Both the offers rail and every product card need the same list — the rail
 * to advertise it, the cards to show which coupon each item's price already
 * qualifies for. Fetching per component would mean one query for the rail
 * plus one per card, so the promise is cached at module scope and shared.
 *
 * RLS on `coupons` (migration 019) decides what comes back: public codes for
 * everyone, plus the signed-in customer's own referral rewards. The `active`
 * and `expires_at` filters here mirror `validate_coupon` exactly, so nothing
 * is ever advertised that checkout would refuse.
 */
let cache = null

export function fetchPublicOffers() {
  if (cache) return cache
  cache = supabase
    .from('coupons')
    .select('id, code, description, discount_type, discount_value, min_order_amount, max_discount, expires_at')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('discount_value', { ascending: false })
    .limit(8)
    .then(({ data, error }) => (error ? [] : (data ?? [])))
    // A failed fetch must not poison the cache for the rest of the session.
    .catch(() => { cache = null; return [] })
  return cache
}

export function usePublicOffers() {
  const [offers, setOffers] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchPublicOffers().then(list => { if (!cancelled) setOffers(list) })
    return () => { cancelled = true }
  }, [])

  return offers
}

/**
 * The best coupon a single item's price already clears on its own.
 *
 * Deliberately conservative: a coupon whose minimum is ₹1,499 is not shown on
 * a ₹699 cake, even though two of them would qualify, because the badge is
 * read as "this item, this price, this discount". Percent coupons are
 * compared at their real capped value against this item's price, so a "15%
 * off up to ₹400" doesn't outrank a flat ₹500 off it would never beat.
 */
export function bestOfferFor(price, offers) {
  const amount = Number(price)
  if (!amount || !offers?.length) return null

  let best = null
  let bestValue = 0
  for (const o of offers) {
    if (amount < Number(o.min_order_amount ?? 0)) continue
    let value = o.discount_type === 'percent'
      ? (amount * Number(o.discount_value)) / 100
      : Number(o.discount_value)
    if (o.discount_type === 'percent' && o.max_discount) {
      value = Math.min(value, Number(o.max_discount))
    }
    if (value > bestValue) { best = o; bestValue = value }
  }
  return best
}
