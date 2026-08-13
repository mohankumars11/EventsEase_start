import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { buildFeed, applyReadState, unreadCount, toastable } from '../lib/notifications'

/**
 * The bell: the feed, what has been read, and a live nudge when something new
 * lands while the dashboard is open.
 *
 * ── Read state, twice over ───────────────────────────────────────────────
 * `admin_notification_state` (migration 039) is the real store, so triaging on
 * a laptop and then opening the dashboard on a phone shows the same inbox.
 * Migrations here are applied by hand and a deploy does not run them, so the
 * table may not exist — in which case this falls back to localStorage under
 * the same shape and the bell works exactly the same, just per-device. It
 * never errors, and it never blocks the feed: an unreadable read-state means
 * everything shows as unread, which is the safe direction to fail in.
 *
 * ── Live updates, with a floor ───────────────────────────────────────────
 * Supabase Realtime pushes a change the moment a customer places an order.
 * That needs the tables to be in the `supabase_realtime` publication, which
 * 039 attempts and is allowed to fail. So realtime is treated as an
 * OPTIMISATION, never as the mechanism: a slow poll runs regardless, and if
 * realtime is working the poll simply never has anything new to find. A
 * notification system whose only delivery path is a socket is one dropped
 * websocket away from silence, and silence is indistinguishable from "nothing
 * happened".
 */

const STORAGE_KEY = 'sambramo.admin.notifications.v1'
const POLL_MS = 60_000

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeLocal(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

function isAbsent(error) {
  if (!error) return false
  return /42P01|PGRST205|does not exist|schema cache/i.test(`${error.code ?? ''} ${error.message ?? ''}`)
}

export default function useNotifications(data, { onToast } = {}) {
  const { profile } = useAuth()
  const [state, setState] = useState({ lastSeenAt: null, readKeys: [] })
  const [persisted, setPersisted] = useState(true)   // false ⇒ localStorage only

  // Toasts must not replay the backlog on every reload. This is the moment
  // the tab opened; only things that arrive after it are allowed to pop.
  const sessionStart = useRef(new Date())
  const toasted = useRef(new Set())

  /* ── Load read state ──────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = readLocal()
      if (local && !cancelled) setState(local)
      if (!profile?.id) return

      const { data: row, error } = await supabase
        .from('admin_notification_state')
        .select('last_seen_at, read_keys')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        // Missing table is expected before 039; anything else is also not
        // worth taking the dashboard down for. Either way: local only.
        setPersisted(false)
        return
      }
      setPersisted(true)
      if (row) setState({ lastSeenAt: row.last_seen_at, readKeys: row.read_keys ?? [] })
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id])

  const save = useCallback(async next => {
    setState(next)
    writeLocal(next)
    if (!persisted || !profile?.id) return
    const { error } = await supabase
      .from('admin_notification_state')
      .upsert({
        profile_id: profile.id,
        last_seen_at: next.lastSeenAt ?? new Date().toISOString(),
        read_keys: next.readKeys ?? [],
      }, { onConflict: 'profile_id' })
    if (error && isAbsent(error)) setPersisted(false)
  }, [persisted, profile?.id])

  /* ── The feed ─────────────────────────────────────────────────────── */
  const items = useMemo(() => applyReadState(buildFeed(data), state), [data, state])
  const unread = useMemo(() => unreadCount(items), [items])

  /* ── Pop the urgent ones ──────────────────────────────────────────── */
  useEffect(() => {
    if (!onToast) return
    for (const it of toastable(items, sessionStart.current)) {
      if (toasted.current.has(it.key)) continue
      toasted.current.add(it.key)
      onToast(it)
    }
  }, [items, onToast])

  /* ── Live + polled refresh ────────────────────────────────────────── */
  const refresh = data?.refresh
  useEffect(() => {
    if (!refresh) return

    const poll = setInterval(() => {
      // Only when the tab is actually being looked at. Polling a background
      // tab every minute for a dashboard nobody is reading is just battery.
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)

    let channel
    try {
      channel = supabase
        .channel('admin-activity')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_enquiries' }, refresh)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, refresh)
        .subscribe()
    } catch {
      // Realtime not enabled on this project — the poll above still covers it.
    }

    return () => {
      clearInterval(poll)
      if (channel) supabase.removeChannel(channel)
    }
  }, [refresh])

  /* ── Actions ──────────────────────────────────────────────────────── */

  const markAllRead = useCallback(() => {
    // Collapse individually-read keys into the timestamp: they are all older
    // than "now" by definition, so keeping them would grow the array forever.
    save({ lastSeenAt: new Date().toISOString(), readKeys: [] })
  }, [save])

  const markRead = useCallback(key => {
    setState(prev => {
      if (prev.readKeys?.includes(key)) return prev
      const next = { ...prev, readKeys: [...(prev.readKeys ?? []), key] }
      save(next)
      return next
    })
  }, [save])

  const markUnread = useCallback(key => {
    setState(prev => {
      const next = { ...prev, readKeys: (prev.readKeys ?? []).filter(k => k !== key) }
      save(next)
      return next
    })
  }, [save])

  return { items, unread, markAllRead, markRead, markUnread, persisted }
}
