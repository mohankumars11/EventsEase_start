import { useCallback, useEffect, useState } from 'react'
import { Star, MapPin, Users, Eye, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { iconForTrade } from './TradeGrid'

/**
 * How a customer sees this partner.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT READS THE PUBLIC VIEW, NOT THE PARTNER'S OWN ROW
 * ══════════════════════════════════════════════════════════════════════
 *
 * The obvious build is to render the vendor row already in memory. That
 * would be a preview of what the partner has typed, which is not the
 * question. The question is what a stranger actually sees — and a
 * stranger reads `public_vendor_services` (migration 124), which
 * deliberately exposes less than the table behind it.
 *
 * So this reads that view, as the partner, and shows what comes back. A
 * field the partner filled in that the public view does not carry simply
 * does not appear here — which is the honest answer and the one that
 * explains why an edit did not change anything a customer can see.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A PROFILE THAT IS NOT LIVE SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner under review has a profile nobody can find. Showing them a
 * polished card with no note would be showing them a page that does not
 * exist yet, and "why am I getting no enquiries" is exactly the question
 * this screen is opened to answer.
 */
export default function PublicProfilePreview({ vendor, reviews }) {
  const [rows, setRows] = useState(null)
  const [unavailable, setUnavailable] = useState(false)

  const read = useCallback(async () => {
    if (!vendor?.id) return
    const { data, error } = await supabase
      .from('public_vendor_services')
      .select('*')
      .eq('vendor_id', vendor.id)
    if (error) { setUnavailable(true); setRows([]); return }
    setRows(data ?? [])
  }, [vendor?.id])

  useEffect(() => { read() }, [read])

  const live = vendor?.status === 'APPROVED' && (rows?.length ?? 0) > 0
  const count = reviews?.length ?? 0
  const avg = count ? reviews.reduce((n, r) => n + r.rating, 0) / count : 0
  const trades = [...new Set((rows ?? []).map(r => r.category).filter(Boolean))]

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 p-3 text-[12.5px] text-ink-mute">
        <Loader2 size={14} className="animate-spin" /> Loading your public profile…
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {!live && (
        <p className="rounded-[14px] bg-amber-50 px-3.5 py-2.5 text-[12px] font-semibold leading-snug text-amber-900 ring-1 ring-amber-200">
          {unavailable
            ? 'We cannot read your public listing right now, so this is what we '
              + 'hold rather than what a customer sees.'
            : vendor?.status === 'APPROVED'
              ? 'Nothing of yours is live yet, so customers cannot find you. '
                + 'Add a service and send it for review.'
              : 'This is how you will look once your account is approved. '
                + 'Customers cannot see it yet.'}
        </p>
      )}

      {/* The card, at customer scale. */}
      <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.08]">
        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-plum-950 to-plum-700">
          {/* No stock photograph. Sambramo has no supplier photography
              yet, and a borrowed image on a profile preview teaches a
              partner to expect one on their live listing. */}
          <p className="px-6 text-center text-[11.5px] font-semibold leading-snug text-white/70">
            {trades.length
              ? 'Your photos appear here once you add them to a service.'
              : 'Add a service to give customers something to look at.'}
          </p>
        </div>

        <div className="p-4">
          <h3 className="text-[16px] font-extrabold leading-tight text-ink">
            {vendor?.business_name ?? 'Your business'}
          </h3>

          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
            {count > 0 ? (
              <>
                <Star size={13} className="fill-saffron-500 text-saffron-500" />
                <span className="tabular-nums">{avg.toFixed(1)}</span>
                <span className="text-ink-mute">({count} review{count === 1 ? '' : 's'})</span>
              </>
            ) : (
              <span className="text-ink-mute">No reviews yet</span>
            )}
          </p>

          <dl className="mt-2.5 space-y-1.5 text-[12.5px] font-semibold text-ink-soft">
            {trades.map(t => {
              const Icon = iconForTrade(t)
              return (
                <div key={t} className="flex items-center gap-2">
                  <Icon size={13} className="shrink-0 text-ink-mute" /> {t}
                </div>
              )
            })}
            <div className="flex items-center gap-2">
              <MapPin size={13} className="shrink-0 text-ink-mute" />
              {[vendor?.area, vendor?.city].filter(Boolean).join(', ') || 'Bengaluru'}
              {vendor?.service_radius_km ? ` · within ${vendor.service_radius_km} km` : ''}
            </div>
            {vendor?.max_guests && (
              <div className="flex items-center gap-2">
                <Users size={13} className="shrink-0 text-ink-mute" />
                Up to {vendor.max_guests} guests
              </div>
            )}
          </dl>

          {vendor?.description && (
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">
              {vendor.description}
            </p>
          )}

          {(rows?.length ?? 0) > 0 && (
            <p className="mt-2.5 text-[11.5px] font-semibold text-ink-mute">
              {rows.length} service{rows.length === 1 ? '' : 's'} visible to customers
            </p>
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 text-[11.5px] leading-snug text-ink-mute">
        <Eye size={12} className="mt-0.5 shrink-0" />
        <span>
          Read from the same public listing customers see — not from your own
          record. Anything you have filled in that does not appear here is
          held for our team and is not shown publicly.
        </span>
      </p>
    </div>
  )
}
