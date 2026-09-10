import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { signedUrlsFor } from '../../lib/partnerWork'

/**
 * The master's own work, at the moment a family decides to pay.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY HERE, OF EVERYWHERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A customer never chooses a partner — dispatch does. So there are only
 * two moments in the whole product where a partner has a name, and this
 * is the first: a master has accepted, the date is being held, and the
 * customer is being asked for money.
 *
 * Until now the only thing they were told was a business name. "Ramesh
 * Decorators has accepted" and a Pay button. Three photographs of work
 * that person has actually done is the difference between paying and
 * putting the phone down — and an unanswered hold expires, taking the
 * master they already had with it (migration 082).
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT RENDERS NOTHING WHEN THERE IS NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Not an empty frame, not a heading with a blank strip under it —
 * `null`. On the day this ships most partners have no approved work, and
 * a box that can be empty must not reserve height on the payment screen.
 * `MasterSticker` follows the same rule for the same reason.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE CAPTION IS SOMEBODY ELSE'S FREE TEXT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Migration 068 made contact masking a property of the schema, on the
 * argument that a phone number withheld by a React component is a phone
 * number sitting in a JSON response. A caption is typed by the partner
 * and rendered PRE-PAYMENT, which is the one screen where going around
 * Sambramo is worth money to them.
 *
 * An operator reads every item before it can reach here — that is the
 * real gate, and 118 built it. This is the second lock: a caption
 * carrying a run of digits or an @ is dropped rather than shown. No
 * caption is worth enough to risk the thing 068 exists to protect.
 */

/* Six or more digits in a row, allowing the spaces and dashes people
   write numbers with. Deliberately blunt: "serves 200000 guests" losing
   its caption is a smaller failure than a phone number reaching a
   customer on the payment screen. */
const CONTACTISH = /(?:\d[\s-]?){6,}|@/

const safe = text => (text && !CONTACTISH.test(text) ? text : null)

export default function MasterWork({ vendorId, className = '' }) {
  const [items, setItems] = useState([])
  const [urls, setUrls] = useState({})

  useEffect(() => {
    if (!vendorId) return
    let alive = true

    ;(async () => {
      /* Only what an operator has approved. The row policy from 110 and
         the storage policy from 118 both require 'live', so a customer
         cannot reach an unreviewed file even by guessing its path. */
      const { data, error } = await supabase
        .from('partner_work')
        .select('id, kind, storage_path, caption, body, said_by')
        .eq('vendor_id', vendorId)
        .eq('review_status', 'live')
        .order('sort_order', { ascending: true })
        .limit(8)

      if (error || !alive) return
      const rows = data ?? []
      setItems(rows)

      /* One request for the whole strip. MatchingBoard polls every few
         seconds, and this effect is keyed on vendorId alone, so the URLs
         are minted once per master rather than once per poll. */
      const media = rows.filter(r => r.kind !== 'testimonial')
      if (media.length) setUrls(await signedUrlsFor(media.map(r => r.storage_path)))
    })()

    return () => { alive = false }
  }, [vendorId])

  const media = items.filter(r => r.kind !== 'testimonial' && urls[r.storage_path]).slice(0, 6)
  const words = items.filter(r => r.kind === 'testimonial' && r.body).slice(0, 2)

  if (!media.length && !words.length) return null

  return (
    <div className={`mt-2.5 ${className}`}>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-forest-800/70">
        Their work
      </p>

      {media.length > 0 && (
        /* A scroller, not a grid: it must not push the Pay button off
           the screen, and a family will swipe three photographs. */
        <ul className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {media.map(m => (
            <li key={m.id} className="shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-xl bg-ink/[0.06]">
                {m.kind === 'video' ? (
                  <video src={urls[m.storage_path]} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img
                    src={urls[m.storage_path]}
                    alt={safe(m.caption) ?? 'Work by this master'}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              {safe(m.caption) && (
                <p className="mt-0.5 w-20 truncate text-[9.5px] text-forest-900/70">
                  {safe(m.caption)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {words.map(w => (
        <p key={w.id} className="mt-1.5 text-[11px] leading-snug text-forest-900/80">
          &ldquo;{safe(w.body) ?? w.body.replace(CONTACTISH, '…')}&rdquo;
          {safe(w.said_by) && <span className="text-forest-800/60"> — {safe(w.said_by)}</span>}
        </p>
      ))}
    </div>
  )
}
