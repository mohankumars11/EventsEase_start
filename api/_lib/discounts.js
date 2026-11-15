/**
 * What vouchers took off booking lines (migration 193,
 * `booking_line_discounts`), keyed by line id.
 *
 * Before 193 the table does not exist and no voucher can have been used,
 * so "missing" is an empty answer. Any OTHER error throws: the balance is
 * the line's price less this saving, and guessing 0 would charge a
 * customer their saving back.
 */
const missing = e => e && (e.code === '42P01' || e.code === 'PGRST205' || /schema cache|does not exist/i.test(e.message ?? ''))

export async function discountsFor(db, lineIds) {
  if (!lineIds?.length) return {}
  const { data, error } = await db.from('booking_line_discounts').select('line_id, discount_paise').in('line_id', lineIds)
  if (error) { if (missing(error)) return {}; throw new Error(error.message) }
  return Object.fromEntries((data ?? []).map(d => [d.line_id, Number(d.discount_paise) || 0]))
}
