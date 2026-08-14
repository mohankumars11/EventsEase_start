import { useState, useRef, useEffect, useMemo } from 'react'
import { Bell, Check, CheckCheck, X, Inbox, Undo2 } from 'lucide-react'
import { INK, STATUS } from '../../config/dataviz'
import { KINDS, groupByDay, relativeTime } from '../../lib/notifications'
import { EmptyNote } from './viz/Primitives'

/**
 * The bell, and the inbox behind it.
 *
 * ── Why it reads like mail ───────────────────────────────────────────────
 * The founder asked for "a normal conventional email system", and that is the
 * right instinct for a reason worth writing down: an inbox is the one
 * notification pattern people already know how to *finish*. A badge that only
 * counts is a number that goes up forever; an inbox has read, unread, and a
 * bottom you can reach. So: unread is bold with a dot, reading one marks it,
 * "mark all read" is one press, and anything already dealt with elsewhere is
 * struck through rather than hidden — because the fact that a return came in
 * is still worth seeing after it is handled.
 *
 * ── What is NOT here ─────────────────────────────────────────────────────
 * No per-notification delete. These are derived from the underlying rows
 * (see lib/notifications), so "delete" would either be a lie — it comes back
 * on the next fetch — or it would mean deleting the order. Read/unread is the
 * only state that is actually the admin's to own.
 */

export default function NotificationCenter({ items, unread, markAllRead, markRead, markUnread, onNavigate, persisted }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey  = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const recent = items.slice(0, 12)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        className="relative p-2 rounded-xl text-gray-500 hover:text-plum-700 hover:bg-plum-50 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: STATUS.critical }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,26rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="font-bold text-gray-900 text-sm">Notifications</p>
              <p className="text-[11px]" style={{ color: INK.muted }}>
                {unread ? `${unread} unread` : 'All caught up'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-plum-700 hover:bg-plum-50"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-500 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {recent.length === 0 ? (
              <EmptyNote icon="📭">Nothing has happened yet.</EmptyNote>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recent.map(it => (
                  <NotificationRow
                    key={it.key}
                    item={it}
                    compact
                    onOpen={() => { markRead(it.key); onNavigate(it.nav); setOpen(false) }}
                    onToggleRead={() => (it.read ? markUnread(it.key) : markRead(it.key))}
                  />
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => { onNavigate('inbox'); setOpen(false) }}
            className="w-full px-4 py-2.5 text-xs font-semibold text-plum-700 hover:bg-plum-50 border-t border-gray-100 flex items-center justify-center gap-1.5"
          >
            <Inbox size={13} /> Open the full inbox
          </button>

          {!persisted && (
            <p className="px-4 py-2 text-[10px] border-t border-gray-50" style={{ color: INK.muted }}>
              Read state is saved on this device only — apply migration 039 to sync it across your phone and laptop.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── One notification ──────────────────────────────────────────────────── */

function NotificationRow({ item, compact, onOpen, onToggleRead }) {
  return (
    <li className={`group flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50/70 transition-colors ${item.read ? '' : 'bg-plum-50/30'}`}>
      {/* Unread is carried by weight and a dot, not by colour alone. */}
      <span className="relative shrink-0 mt-0.5">
        <span className="text-lg" aria-hidden="true">{item.emoji}</span>
        {!item.read && (
          <span
            className="absolute -left-1.5 top-2 w-1.5 h-1.5 rounded-full"
            style={{ background: STATUS.critical }}
            aria-label="unread"
          />
        )}
      </span>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline gap-2">
          <span className={`text-xs truncate ${item.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
            {item.title}
          </span>
          <span className="text-[10px] shrink-0 ml-auto tabular-nums" style={{ color: INK.muted }}>
            {relativeTime(item.at)}
          </span>
        </div>
        {item.detail && (
          <p className={`text-[11px] mt-0.5 ${compact ? 'line-clamp-2' : ''} ${item.resolved ? 'line-through opacity-60' : ''}`}
             style={{ color: INK.secondary }}>
            {item.detail}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: INK.plane, color: INK.muted }}>
            {item.label}
          </span>
          {item.resolved && (
            <span className="text-[10px] font-semibold" style={{ color: STATUS.good }}>handled</span>
          )}
        </div>
      </button>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          onClick={onToggleRead}
          title={item.read ? 'Mark unread' : 'Mark read'}
          className="p-1 rounded text-gray-300 hover:text-plum-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {item.read ? <Undo2 size={13} /> : <Check size={13} />}
        </button>
      </div>
    </li>
  )
}

/* ── The full inbox view ───────────────────────────────────────────────── */

const FILTERS = [
  { id: 'all',      label: 'Everything' },
  { id: 'unread',   label: 'Unread' },
  { id: 'action',   label: 'Needs action' },
  ...Object.entries(KINDS).map(([id, k]) => ({ id, label: `${k.emoji} ${k.label}` })),
]

export function NotificationInbox({ items, unread, markAllRead, markRead, markUnread, onNavigate }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'all')    return items
    if (filter === 'unread') return items.filter(i => !i.read)
    if (filter === 'action') return items.filter(i => !i.resolved && i.priority === 'high')
    return items.filter(i => i.type === filter)
  }, [items, filter])

  const groups = useMemo(() => groupByDay(filtered), [filtered])
  const counts = useMemo(() => {
    const map = {}
    for (const i of items) map[i.type] = (map[i.type] ?? 0) + 1
    return map
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-[12px] max-w-prose" style={{ color: INK.muted }}>
          Built from the orders, returns and enquiries themselves rather than a separate log — so
          nothing can go missing, and this is complete back to your first order.
        </p>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-plum-600 text-white text-xs font-semibold hover:bg-plum-700"
          >
            <CheckCheck size={13} /> Mark all {unread} read
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const n = f.id === 'all' ? items.length
                  : f.id === 'unread' ? unread
                  : f.id === 'action' ? items.filter(i => !i.resolved && i.priority === 'high').length
                  : counts[f.id] ?? 0
          if (n === 0 && !['all', 'unread', 'action'].includes(f.id)) return null
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.id ? 'bg-plum-700 border-plum-700 text-ink' : 'bg-white border-gray-200 text-gray-600 hover:border-plum-300'
              }`}
            >
              {f.label} <span className="opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <EmptyNote icon="📭">
            {filter === 'unread' ? 'Nothing unread — you are caught up.' : 'Nothing matches this filter.'}
          </EmptyNote>
        </div>
      ) : (
        groups.map(g => (
          <div key={g.id} className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100" style={{ background: INK.plane }}>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: INK.muted }}>
                {g.label} <span className="font-semibold">· {g.items.length}</span>
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {g.items.map(it => (
                <NotificationRow
                  key={it.key}
                  item={it}
                  onOpen={() => { markRead(it.key); onNavigate(it.nav) }}
                  onToggleRead={() => (it.read ? markUnread(it.key) : markRead(it.key))}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
