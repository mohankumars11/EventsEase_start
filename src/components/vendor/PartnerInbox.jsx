import { useCallback, useEffect, useState } from 'react'
import {
  Bell, IndianRupee, ShieldCheck, Star, MessageCircle,
  ClipboardList, Megaphone, Briefcase,
} from 'lucide-react'
import { fetchNotifications, markNotificationsRead } from '../../lib/partnerInbox'

/**
 * What happened while the partner was not looking.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A PUSH IS NOT A RECORD
 * ══════════════════════════════════════════════════════════════════════
 *
 * `push_tokens` (065) says where to send a buzz. Nothing said what was
 * sent, so a partner whose phone was face down, or who swiped it away,
 * or who never granted the permission, had no way to find out what it
 * said — and everything that matters to a partner happens while they are
 * not holding the phone. This is the record; push is one delivery
 * channel for it, and the less reliable one.
 *
 * ══════════════════════════════════════════════════════════════════════
 * READ ON OPEN, NOT ON TAP
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything visible is marked read when the section is opened, in one
 * request. Per-row "mark read" controls turn a feed into a chore, and a
 * badge that only clears when each item is individually dismissed is a
 * badge that never clears.
 *
 * The write is `read_at` and nothing else — migration 125 forces every
 * other column back, so this cannot become an edit even by mistake.
 */

const ICONS = {
  offer: Bell,
  job: Briefcase,
  payout: IndianRupee,
  verification: ShieldCheck,
  listing: ClipboardList,
  review: Star,
  message: MessageCircle,
  system: Megaphone,
}

const TONE = {
  payout: 'bg-forest-50 text-forest-700',
  verification: 'bg-plum-50 text-plum-700',
  review: 'bg-saffron-400/15 text-saffron-800',
}

function ago(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function PartnerInbox({ rows, onRead }) {
  const [busy, setBusy] = useState(false)
  const [cleared, setCleared] = useState(false)

  const unreadIds = (rows ?? []).filter(r => !r.read_at).map(r => r.id)

  /* One request, when the fold opens, for everything currently on
     screen. The list is not re-sorted or re-fetched afterwards: an item
     jumping out from under a thumb mid-read is worse than a stale dot
     until the next visit. */
  const clear = useCallback(async () => {
    if (!unreadIds.length || busy) return
    setBusy(true)
    const res = await markNotificationsRead(unreadIds)
    setBusy(false)
    if (res.ok) { setCleared(true); onRead?.(unreadIds) }
  }, [unreadIds, busy, onRead])

  useEffect(() => { clear() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!rows?.length) {
    return (
      <p className="rounded-[16px] bg-ink/[0.03] p-4 text-[12.5px] leading-relaxed text-ink-mute">
        Nothing here yet. Offers, payouts and decisions about your account will
        show up in this list, so you can catch up on anything you missed.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-ink/[0.06]">
      {rows.map(n => {
        const Icon = ICONS[n.kind] ?? Megaphone
        /* `cleared` rather than re-reading the row: the database now says
           read, and re-fetching only to watch every dot vanish under the
           partner's eyes is motion for nothing. */
        const unread = !n.read_at && !cleared
        return (
          <li key={n.id} className="flex items-start gap-3 py-2.5">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONE[n.kind] ?? 'bg-ink/[0.05] text-ink-mute'}`}>
              <Icon size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start gap-2">
                <span className={`min-w-0 flex-1 text-[13px] leading-snug ${unread ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}`}>
                  {n.title}
                </span>
                <span className="shrink-0 text-[10.5px] font-semibold text-ink-mute">
                  {ago(n.created_at)}
                </span>
              </span>
              {n.body && (
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-mute">{n.body}</span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
