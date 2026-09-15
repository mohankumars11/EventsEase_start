import { useMemo } from 'react'
import { Star } from 'lucide-react'

/**
 * What customers said, and how many of them said it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ROWS EXISTED AND THE PARTNER COULD NOT READ THEM
 * ══════════════════════════════════════════════════════════════════════
 *
 * `useVendorAccount` has fetched `reviews` since it was written, and the
 * only thing the partner app ever did with them was reduce them to a
 * single average on a tile. A partner whose rating moved had no way to
 * find out what moved it — which is both the useful half of a review and
 * the half that lets them fix something.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO REPLIES, BECAUSE THERE IS NOWHERE TO PUT ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `reviews` has no reply column and no policy that would let a vendor
 * write to the row (001: customers insert, everyone reads). A reply box
 * here would be a control that silently discards what is typed into it,
 * which is worse than not offering one. When there is a column, there
 * can be a box.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHO WROTE IT IS NOT SHOWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * The row carries `customer_id` and nothing else about the person, and
 * this screen does not go looking. A name pulled from `profiles` to
 * decorate a review is a customer's identity handed to a supplier for no
 * operational reason — and the review says what it needs to say without
 * it.
 */
export default function PartnerReviews({ reviews }) {
  const rows = reviews ?? []

  const { avg, spread } = useMemo(() => {
    const spread = [0, 0, 0, 0, 0]  // index 0 is one star
    let total = 0
    for (const r of rows) {
      const n = Math.min(5, Math.max(1, Math.round(r.rating)))
      spread[n - 1] += 1
      total += n
    }
    return { avg: rows.length ? total / rows.length : 0, spread }
  }, [rows])

  if (!rows.length) {
    return (
      <p className="rounded-[16px] bg-ink/[0.03] p-4 text-[12.5px] leading-relaxed text-ink-mute">
        No reviews yet. A customer can leave one after a job is done — nothing
        you do here brings them in, so there is nothing on this screen to
        chase.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center">
          <p className="font-serif text-[30px] font-extrabold leading-none tabular-nums text-ink">
            {avg.toFixed(1)}
          </p>
          <Stars value={avg} />
          <p className="mt-1 text-[11px] font-semibold text-ink-mute">
            {rows.length} review{rows.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Five bars, widest at the top, because "how many ones" is the
            question a partner actually has and an average hides it. */}
        <div className="min-w-0 flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map(n => {
            const count = spread[n - 1]
            const pct = rows.length ? Math.round((count / rows.length) * 100) : 0
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="w-3 shrink-0 text-[10.5px] font-extrabold tabular-nums text-ink-mute">{n}</span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
                  <span
                    className="block h-full rounded-full bg-saffron-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-5 shrink-0 text-right text-[10.5px] font-semibold tabular-nums text-ink-mute">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <ul className="divide-y divide-ink/[0.06]">
        {rows.map(r => (
          <li key={r.id} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <Stars value={r.rating} />
              <span className="shrink-0 text-[11px] font-semibold text-ink-mute">
                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {r.comment && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{r.comment}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stars({ value }) {
  const full = Math.round(value)
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={13}
          className={n <= full ? 'fill-saffron-500 text-saffron-500' : 'text-ink/20'}
        />
      ))}
    </span>
  )
}
