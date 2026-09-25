import { useCallback, useMemo, useState } from 'react'
import {
  Bell, Briefcase, IndianRupee, ShieldCheck, ClipboardList, Star,
  MessageCircle, Megaphone, CalendarDays, Gift, Check, Archive, ChevronRight,
} from 'lucide-react'
import { markNotificationsRead, archiveNotifications } from '../../lib/partnerInbox'

/**
 * Everything Sambramo has told this partner, that they can act on.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT WAS A LIST OF SENTENCES YOU COULD NOT TOUCH
 * ══════════════════════════════════════════════════════════════════════
 *
 * The previous version rendered `<li>` elements. Not buttons — list
 * items. `href` was fetched from the database on every row and never
 * read, so "Your calendar stops soon" sat there as a fact about the
 * partner's account with no way to go and fix it. The only notification
 * this system has ever sent was one you could read and nothing else.
 *
 * Every row is now a button when it has somewhere to go.
 *
 * ══════════════════════════════════════════════════════════════════════
 * MARKING READ USED TO HAPPEN TO YOU
 * ══════════════════════════════════════════════════════════════════════
 *
 * Opening the fold marked every visible row read, in one request, on
 * mount. That is defensible — you did look at them — but it means a
 * partner who taps the bell, sees five bold lines, and gets interrupted
 * has lost the record of which five they had not dealt with. There is no
 * way back: `read_at` is a timestamp and nothing un-sets it.
 *
 * So reading is now something the partner does: tapping a row marks that
 * row, and "Mark all read" is a button with a number on it. The bold
 * stays until somebody decides it should not.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARCHIVE NEVER DELETES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `is_archived`, from migration 153. Two reasons it is not a DELETE, and
 * both are load-bearing:
 *
 *   · `calendarSweep.js` decides whether to nudge a partner by querying
 *     the notifications it has already sent. A deleted row makes the
 *     system forget it spoke, and it says the same thing again tomorrow.
 *   · It is the only record that a partner was told something before
 *     their account changed, which somebody will one day have to answer
 *     for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FIVE FILTERS, NOT NINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * There are eleven `kind` values and a partner does not think in eleven
 * categories. They think: is this about work, about money, about my
 * calendar, or is it Sambramo talking. Anything that is none of those is
 * still in All, which is the default and where most people will stay.
 *
 * A filter with nothing behind it is not shown. A row of tabs where four
 * lead to empty lists teaches people not to press tabs.
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
  /* Added in 148 and never given an icon, so the only kind this system
     actually writes fell through to a megaphone — which reads as an
     announcement rather than as something about your own calendar. */
  calendar: CalendarDays,
  marketing: Gift,
  referral: Gift,
}

const TONE = {
  payout: 'bg-forest-50 text-forest-700',
  verification: 'bg-plum-50 text-plum-700',
  review: 'bg-saffron-400/15 text-saffron-800',
  calendar: 'bg-plum-50 text-plum-700',
  offer: 'bg-plum-50 text-plum-700',
  job: 'bg-plum-50 text-plum-700',
}

/* Which kinds sit behind each filter. `all` is not in here; it means no
   filtering rather than "every kind I remembered to list", so a kind
   added later cannot go missing from the default view. */
const FILTERS = [
  ['all', 'All', null],
  ['jobs', 'Jobs', ['offer', 'job', 'listing']],
  ['money', 'Money', ['payout']],
  ['calendar', 'Calendar', ['calendar']],
  ['sambramo', 'Sambramo', ['system', 'verification', 'review', 'message', 'marketing', 'referral']],
]

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

export default function PartnerInbox({ rows, onRead, onNavigate }) {
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')
  /* Applied over the fetched rows rather than re-fetching. A row
     vanishing from under a thumb mid-read is worse than a list that is
     one action out of date until the next visit. */
  const [readIds, setReadIds] = useState(() => new Set())
  const [archivedIds, setArchivedIds] = useState(() => new Set())
  const [error, setError] = useState(null)

  const live = useMemo(
    () => (rows ?? []).filter(r => !archivedIds.has(r.id)),
    [rows, archivedIds])

  const isUnread = useCallback(
    r => !r.read_at && !readIds.has(r.id), [readIds])

  const unreadIds = useMemo(
    () => live.filter(isUnread).map(r => r.id), [live, isUnread])

  /* Only the filters that have something behind them. */
  const tabs = useMemo(() => FILTERS.filter(([id, , kinds]) =>
    id === 'all' || live.some(r => kinds.includes(r.kind))), [live])

  const shown = useMemo(() => {
    const kinds = FILTERS.find(([id]) => id === filter)?.[2]
    return kinds ? live.filter(r => kinds.includes(r.kind)) : live
  }, [live, filter])

  const markRead = useCallback(async (ids) => {
    if (!ids.length) return
    setReadIds(prev => new Set([...prev, ...ids]))   // optimistic
    const res = await markNotificationsRead(ids)
    if (!res.ok) {
      setReadIds(prev => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
      setError('That did not save. Try again.')
      return
    }
    onRead?.(ids)
  }, [onRead])

  const open = useCallback(async (n) => {
    if (isUnread(n)) markRead([n.id])
    /* `href` has been on every row since 125 and read by nothing. It is
       an in-app path — `/dashboard/vendor?tab=availability` — so the
       caller routes it rather than this component navigating, which
       keeps Android's back button working. */
    if (n.href) onNavigate?.(n.href)
  }, [isUnread, markRead, onNavigate])

  const archive = useCallback(async (id) => {
    setArchivedIds(prev => new Set([...prev, id]))
    const res = await archiveNotifications([id])
    if (!res.ok) {
      setArchivedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setError(res.unsupported
        ? 'Putting notifications away is not switched on for this account yet.'
        : 'That did not save. Try again.')
    }
  }, [])

  if (!live.length) {
    return (
      <p className="rounded-[16px] bg-ink/[0.03] p-4 text-[12.5px] leading-relaxed text-ink-mute">
        Nothing here yet. Offers, payouts and decisions about your account will
        show up in this list, so you can catch up on anything you missed.
      </p>
    )
  }

  return (
    <div>
      {/* ── The controls, only when they do something ─────────────── */}
      {(tabs.length > 1 || unreadIds.length > 0) && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {tabs.length > 1 && tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              data-filter={id}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                filter === id
                  ? 'bg-plum-600 text-white'
                  : 'bg-ink/[0.04] text-ink-soft active:bg-ink/[0.07]'
              }`}
            >
              {label}
            </button>
          ))}

          {unreadIds.length > 0 && (
            <button
              type="button"
              onClick={async () => { setBusy(true); await markRead(unreadIds); setBusy(false) }}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-extrabold text-plum-700 disabled:opacity-50"
            >
              <Check size={12} strokeWidth={3} />
              Mark {unreadIds.length} read
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mb-2 text-[11.5px] font-semibold text-rose-700">{error}</p>
      )}

      <ul className="divide-y divide-ink/[0.06]">
        {shown.map(n => {
          const Icon = ICONS[n.kind] ?? Megaphone
          const unread = isUnread(n)
          const actionable = !!n.href

          return (
            <li key={n.id} className="flex items-start gap-2 py-1">
              <button
                type="button"
                onClick={() => open(n)}
                data-notification={n.kind}
                data-unread={unread ? '1' : '0'}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-[12px] py-1.5 pl-1 pr-1 text-left active:bg-ink/[0.03]"
              >
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
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-mute">
                      {n.body}
                    </span>
                  )}

                  {/* ── Unread is not only a weight ──────────────────
                      Bold text is the whole signal today, and weight
                      alone fails somebody who cannot see the
                      difference. The word says it. */}
                  {unread && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-plum-600/10 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-plum-700">
                      New
                    </span>
                  )}
                </span>

                {actionable && (
                  <ChevronRight size={14} className="mt-2 shrink-0 text-ink-faint" />
                )}
              </button>

              {/* Put away, never deleted. See the header. */}
              <button
                type="button"
                onClick={() => archive(n.id)}
                aria-label={`Put "${n.title}" away`}
                className="mt-2 shrink-0 rounded-full p-2 text-ink-faint active:bg-ink/[0.04]"
              >
                <Archive size={14} />
              </button>
            </li>
          )
        })}
      </ul>

      {shown.length === 0 && (
        <p className="rounded-[16px] bg-ink/[0.03] p-4 text-[12.5px] text-ink-mute">
          Nothing under this heading.
        </p>
      )}
    </div>
  )
}
