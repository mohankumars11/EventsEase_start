import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toDateKey } from '../config/vendor'

/**
 * Everything the signed-in vendor owns, in one place.
 *
 * The old dashboard queried nothing at all — its checklist, its stats and its
 * plan badge were literals in the component, so an approved vendor on the Pro
 * plan with a full price list still read "Complete your profile · Important",
 * "Free plan" and four em-dashes. This hook is the fix for the whole class of
 * that bug: every number the dashboard shows comes from a row.
 *
 * What a vendor is allowed to read is narrower than it looks, and the honest
 * shape of this hook follows the RLS rather than fighting it:
 *
 *   vendors, vendor_services, vendor_availability   own rows, read + write
 *   bookings                                        own rows, read + status
 *   reviews                                         public read, filtered
 *   event_vendor_options                            admin only (migration 006)
 *
 * That last line is why there is no enquiry count here. Concierge sourcing is
 * coordinator-side by design, and inventing a "0 enquiries" tile for data the
 * vendor cannot see would be a lie told to the person most damaged by it.
 */
export function useVendorAccount() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [vendor,  setVendor]  = useState(null)
  const [services, setServices]         = useState([])
  const [availability, setAvailability] = useState({})   // dateKey → row
  const [bookings, setBookings] = useState([])
  const [reviews,  setReviews]  = useState([])

  // Guards a late response from a previous user/refresh overwriting current
  // state — a vendor who signs out mid-fetch should not see the old account
  // repaint a moment later.
  const runId = useRef(0)

  const fetchAll = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    const run = ++runId.current
    setLoading(true)
    setError(null)

    try {
      const { data: vendorRow, error: vendorErr } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle()          // no row yet is a state, not an error
      if (vendorErr) throw vendorErr
      if (run !== runId.current) return

      setVendor(vendorRow ?? null)

      if (!vendorRow) {
        setServices([]); setAvailability({}); setBookings([]); setReviews([])
        setLoading(false)
        return
      }

      // Availability is fetched from a month back rather than from today, so
      // the calendar can be paged into the recent past without a second
      // round-trip — and a vendor who blocked last week still sees why.
      const from = new Date()
      from.setMonth(from.getMonth() - 1)

      const [svc, avail, bkg, rvw] = await Promise.all([
        supabase.from('vendor_services')
          .select('*').eq('vendor_id', vendorRow.id)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.from('vendor_availability')
          .select('*').eq('vendor_id', vendorRow.id)
          .gte('slot_date', toDateKey(from)),
        supabase.from('bookings')
          .select('id, status, event_date, quoted_price')
          .eq('vendor_id', vendorRow.id),
        supabase.from('reviews')
          .select('id, rating, comment, created_at')
          .eq('vendor_id', vendorRow.id)
          .order('created_at', { ascending: false }),
      ])
      if (run !== runId.current) return

      // A failure on one of the four secondary reads should not blank the
      // page — the vendor's own list is the reason they came.
      if (svc.error) throw svc.error
      setServices(svc.data ?? [])
      setAvailability(Object.fromEntries((avail.data ?? []).map(r => [r.slot_date, r])))
      setBookings(bkg.data ?? [])
      setReviews(rvw.data ?? [])
    } catch (err) {
      if (run !== runId.current) return
      setError(err)
    } finally {
      if (run === runId.current) setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Mutations ────────────────────────────────────────────
  // Each one writes first and updates state from the row Postgres returns,
  // rather than optimistically guessing. These are single-record writes on a
  // page the vendor is looking at, so the round-trip is cheap, and echoing the
  // server's row means defaults, triggers and constraints are reflected
  // instead of a local approximation of them.

  const updateVendor = useCallback(async patch => {
    if (!vendor) throw new Error('No vendor profile yet')
    const { data, error: err } = await supabase
      .from('vendors').update(patch).eq('id', vendor.id).select().single()
    if (err) throw err
    setVendor(data)
    return data
  }, [vendor])

  const addService = useCallback(async fields => {
    if (!vendor) throw new Error('No vendor profile yet')
    // New items land at the end. Max+1 rather than length so re-ordering and
    // deleting can't collide two rows onto one sort_order.
    const nextOrder = services.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0) + 1
    const { data, error: err } = await supabase
      .from('vendor_services')
      .insert({ ...fields, vendor_id: vendor.id, sort_order: nextOrder })
      .select().single()
    if (err) throw err
    setServices(list => [...list, data])
    return data
  }, [vendor, services])

  const updateService = useCallback(async (id, patch) => {
    const { data, error: err } = await supabase
      .from('vendor_services').update(patch).eq('id', id).select().single()
    if (err) throw err
    setServices(list => list.map(s => (s.id === id ? data : s)))
    return data
  }, [])

  const removeService = useCallback(async id => {
    const { error: err } = await supabase.from('vendor_services').delete().eq('id', id)
    if (err) throw err
    setServices(list => list.filter(s => s.id !== id))
  }, [])

  /**
   * Set one day's state.
   *
   * OPEN is the platform default, so an OPEN row is usually redundant — with
   * one exception that matters: on a weekday the vendor has marked as a
   * standing day off, an explicit OPEN row is the only way to say "but I am
   * working this particular Sunday". So OPEN deletes the row unless the date
   * falls on a day off, which keeps the table sparse without losing the
   * override. Getting this backwards would silently re-close every Sunday a
   * vendor had opened.
   */
  const setDayStatus = useCallback(async (dateKey, status, extra = {}) => {
    if (!vendor) throw new Error('No vendor profile yet')

    const weekday   = new Date(`${dateKey}T00:00:00`).getDay()
    const isDayOff  = (vendor.weekly_days_off ?? []).includes(weekday)
    const redundant = status === 'OPEN' && !isDayOff && !extra.note

    if (redundant) {
      const { error: err } = await supabase
        .from('vendor_availability')
        .delete().eq('vendor_id', vendor.id).eq('slot_date', dateKey)
      if (err) throw err
      setAvailability(map => {
        const next = { ...map }
        delete next[dateKey]
        return next
      })
      return null
    }

    const { data, error: err } = await supabase
      .from('vendor_availability')
      .upsert(
        { vendor_id: vendor.id, slot_date: dateKey, status, ...extra },
        { onConflict: 'vendor_id,slot_date' },
      )
      .select().single()
    if (err) throw err
    setAvailability(map => ({ ...map, [dateKey]: data }))
    return data
  }, [vendor])

  /**
   * Same write for a run of dates — "block this whole week" in one call.
   *
   * `extra` carries the same payload setDayStatus takes, because the calendar
   * sheet offers one choice and three scopes ("just this day", "every Tuesday
   * left this month") and the scope must not change what gets written. A
   * range that silently dropped `slots_total` would turn "partly booked, two
   * jobs left" into a LIMITED row with no total — which migration 060 treats
   * as fully available, so the partner would be offered a full day's work on
   * every date they had just limited.
   *
   * OPEN splits the same way setDayStatus does, and it has to: this table
   * records EXCEPTIONS, so an OPEN row is only worth keeping when it says
   * something the defaults do not. That is exactly two cases — a day the
   * weekly rule would otherwise close, and a day carrying a note. Everything
   * else is deleted, because a month of explicit OPEN rows is a month of rows
   * that say nothing.
   *
   * Doing this per key rather than for the whole call is what stops the scope
   * changing the outcome: "open every Sunday this month" on a vendor closed
   * Sundays must keep its rows, or it silently does nothing at all.
   */
  const setRangeStatus = useCallback(async (dateKeys, status, extra = {}) => {
    if (!vendor || dateKeys.length === 0) return

    if (status === 'OPEN') {
      const daysOff = vendor.weekly_days_off ?? []
      const keep = extra.note
        ? dateKeys
        : dateKeys.filter(k => daysOff.includes(new Date(`${k}T00:00:00`).getDay()))
      const drop = dateKeys.filter(k => !keep.includes(k))

      if (drop.length) {
        const { error: err } = await supabase
          .from('vendor_availability')
          .delete().eq('vendor_id', vendor.id).in('slot_date', drop)
        if (err) throw err
      }
      let kept = []
      if (keep.length) {
        const { data, error: err } = await supabase
          .from('vendor_availability')
          .upsert(
            keep.map(slot_date => ({ vendor_id: vendor.id, slot_date, status, ...extra })),
            { onConflict: 'vendor_id,slot_date' },
          )
          .select()
        if (err) throw err
        kept = data ?? []
      }
      setAvailability(map => {
        const next = { ...map }
        drop.forEach(k => delete next[k])
        kept.forEach(r => { next[r.slot_date] = r })
        return next
      })
      return
    }

    const rows = dateKeys.map(slot_date => ({ vendor_id: vendor.id, slot_date, status, ...extra }))
    const { data, error: err } = await supabase
      .from('vendor_availability')
      .upsert(rows, { onConflict: 'vendor_id,slot_date' })
      .select()
    if (err) throw err
    setAvailability(map => ({
      ...map,
      ...Object.fromEntries((data ?? []).map(r => [r.slot_date, r])),
    }))
  }, [vendor])

  /**
   * Delete every exception row in a run of dates.
   *
   * Not the same call as setRangeStatus(keys, 'OPEN'), and the difference is
   * the whole reason this exists. "Open these days" is a statement — it must
   * survive a standing day off, so it writes an explicit OPEN row on any date
   * the weekly rule would close. "Undo what I marked" is the opposite: it
   * removes what the vendor said and lets the standing rule take back over,
   * so a Monday they had opened by hand goes back to being closed.
   *
   * Collapsing the two would make the calendar's clear-month button quietly
   * open every Monday of the month.
   */
  const clearDays = useCallback(async dateKeys => {
    if (!vendor || dateKeys.length === 0) return
    const { error: err } = await supabase
      .from('vendor_availability')
      .delete().eq('vendor_id', vendor.id).in('slot_date', dateKeys)
    if (err) throw err
    setAvailability(map => {
      const next = { ...map }
      dateKeys.forEach(k => delete next[k])
      return next
    })
  }, [vendor])

  // ── Derived facts ────────────────────────────────────────
  const stats = useMemo(() => {
    const todayKey = toDateKey(new Date())
    const activeServices = services.filter(s => s.is_active)
    const priced = activeServices.filter(s => s.price !== null && s.price !== undefined)

    const upcoming = bookings.filter(
      b => ['confirmed', 'quoted'].includes(b.status) && (b.event_date ?? '') >= todayKey,
    )
    const completed = bookings.filter(b => b.status === 'completed')

    const busyDays = Object.values(availability).filter(
      a => a.status === 'BLOCKED' && a.slot_date >= todayKey,
    ).length

    // vendors.rating_avg is kept up to date by the trigger in migration 002,
    // so it is the number of record. Falling back to the review rows keeps a
    // rating on screen if that trigger has not fired on this database yet.
    const ratingFromRows = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null
    const rating = Number(vendor?.rating_avg) || ratingFromRows

    return {
      activeServices: activeServices.length,
      totalServices:  services.length,
      pricedServices: priced.length,
      upcomingBookings: upcoming.length,
      completedBookings: completed.length,
      busyDays,
      reviewCount: reviews.length,
      rating: rating ? Number(rating) : null,
    }
  }, [services, bookings, reviews, availability, vendor?.rating_avg])

  /**
   * The onboarding checklist, derived rather than declared.
   *
   * The old version was five hardcoded booleans — the first `true`, the rest
   * `false` — so it read 1/5 forever and each incomplete step wore a "Coming
   * soon" pill. A checklist that cannot be completed is worse than no
   * checklist: it trains the vendor to ignore the one part of the page whose
   * whole job is telling them what to do next.
   */
  const checklist = useMemo(() => {
    const hasProfile = Boolean(vendor)
    const hasDetail  = Boolean(vendor?.description && vendor.description.length >= 30 && vendor?.category)
    const hasList    = stats.activeServices > 0
    const hasPrices  = stats.pricedServices > 0
    const approved   = vendor?.status === 'APPROVED'

    return [
      { key: 'account',  label: 'Create your account',        done: true },
      { key: 'profile',  label: 'Submit your business profile', done: hasProfile, to: '/onboarding/vendor' },
      { key: 'detail',   label: 'Add a category and description', done: hasDetail, to: '/onboarding/vendor' },
      { key: 'list',     label: 'List what you offer',        done: hasList,   tab: 'list' },
      { key: 'prices',   label: 'Price at least one item',    done: hasPrices, tab: 'list' },
      { key: 'calendar', label: 'Set your working days',      done: (vendor?.weekly_days_off?.length ?? 0) > 0 || stats.busyDays > 0, tab: 'availability' },
      { key: 'approved', label: 'Get approved by our team',   done: approved },
    ]
  }, [vendor, stats.activeServices, stats.pricedServices, stats.busyDays])

  return {
    loading, error, refresh: fetchAll,
    vendor, services, availability, bookings, reviews,
    stats, checklist,
    updateVendor, addService, updateService, removeService,
    setDayStatus, setRangeStatus, clearDays,
  }
}
