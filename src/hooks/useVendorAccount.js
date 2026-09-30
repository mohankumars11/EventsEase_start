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
  const [weeklyRules,  setWeeklyRules]  = useState([])   // the standing week
  const [bookings, setBookings] = useState([])
  const [reviews,  setReviews]  = useState([])

  /* Kept apart from `error` on purpose. `error` blanks the dashboard;
     this one lets the rest of the page stand while the calendar says
     truthfully that it could not load. */
  const [availabilityError, setAvailabilityError] = useState(null)

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
        setServices([]); setAvailability({}); setWeeklyRules([])
        setBookings([]); setReviews([]); setAvailabilityError(null)
        setLoading(false)
        return
      }

      // Availability used to be fetched from ONE MONTH back, which was a
      // window the calendar could page straight out of: MonthGrid steps a
      // month at a time with no bound, so anything older than that — or
      // further ahead than the rows happened to reach — rendered as
      // "nothing marked" on a month the partner had definitely marked.
      //
      // A year back is not a bigger query in any way that matters. These
      // rows are sparse and per-vendor: a busy partner has a few hundred
      // in total, so the whole history costs less than the round-trip
      // that paging would otherwise need. There is no upper bound for the
      // same reason — a partner blocking a date eighteen months out must
      // see it when they get there.
      const from = new Date()
      from.setFullYear(from.getFullYear() - 1)

      const [svc, avail, bkg, rvw, wk] = await Promise.all([
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
        supabase.from('vendor_weekly_rules')
          .select('*').eq('vendor_id', vendorRow.id)
          .order('effective_from', { ascending: false }),
      ])
      if (run !== runId.current) return

      // A failure on one of the secondary reads should not blank the page —
      // the vendor's own list is the reason they came.
      if (svc.error) throw svc.error
      setServices(svc.data ?? [])

      /* ── A failed availability read is NOT an empty calendar ─────────
         This used to be `avail.data ?? []` with `avail.error` never
         inspected, so a request that failed for any reason at all —
         offline, an expired token, an RLS change — rendered as a month
         in which the partner had marked nothing. That is the most
         damaging possible lie on this screen: it invites them to mark it
         all again, and the second write fails the same way.

         The rows are kept on a failed re-read (a stale month is better
         than a blank one) and the error is handed to the calendar, which
         says so. Same for bookings. */
      if (!avail.error) {
        setAvailability(Object.fromEntries((avail.data ?? []).map(r => [r.slot_date, r])))
      }
      setAvailabilityError(avail.error ?? null)

      if (!wk.error) setWeeklyRules(wk.data ?? [])
      if (!bkg.error) setBookings(bkg.data ?? [])
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

  /**
   * `slots_booked` is the server's column, not ours.
   *
   * Both availability editors used to send `slots_booked: 0` on every
   * save, which meant editing the NOTE on a day with two confirmed jobs
   * reset its booked count to zero — and, before migration 132, nothing
   * ever put it back. 132 recomputes the column from accepted offers by
   * trigger, so any value sent from here is at best ignored and at worst
   * fights the trigger. Dropped in one place rather than trusted to
   * every caller.
   */
  const sanitise = ({ slots_booked, ...rest } = {}) => rest

  /**
   * Postgres tells the truth; it does not tell it to a partner.
   *
   * The write policies on vendor_availability run through
   * owns_active_vendor (migration 116), which excludes a suspended
   * partner — so a suspended account's save fails with "new row violates
   * row-level security policy for table", printed raw above the Save
   * button. That sentence teaches nobody anything.
   */
  const describeWriteError = err => {
    const raw = err?.message ?? ''
    if (/row-level security/i.test(raw)) {
      return new Error('Your account cannot change availability right now. If it is under review or suspended, that is why.')
    }
    if (/violates check constraint .*status/i.test(raw)) {
      return new Error('That is not a status this calendar knows about.')
    }
    if (/slots_sane/i.test(raw)) {
      return new Error('That limit is lower than the jobs already confirmed for the day.')
    }
    if (/Failed to fetch|NetworkError/i.test(raw)) {
      return new Error('Could not reach the server. Your previous availability is still active.')
    }
    return err
  }

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
   * Every deliberate mark is written, OPEN included. OPEN is still the
   * platform default for a day with NO row -- that has not changed, and
   * `match_partners` cannot tell the two apart -- but a row the partner
   * asked for is kept so the month view can show it back to them.
   */
  const setDayStatus = useCallback(async (dateKey, status, extra = {}) => {
    if (!vendor) throw new Error('No vendor profile yet')

    /* ── An explicit OPEN is now KEPT ─────────────────────────────────
       This used to delete any OPEN row that "said nothing the defaults
       do not" -- a normal day, no note, no location -- to keep the
       table sparse. The partner got nothing back: they tapped a date,
       chose Available, tapped Save, and the month returned identical.
       The old comment predicted exactly that ("the sheet would appear
       to save and the row would vanish") and accepted it, because the
       row is redundant to the MATCHING engine.

       It is not redundant to the person. An app that silently discards
       a deliberate tap teaches a partner that none of their taps are
       trusted, and this is the tap they make most.

       `match_partners` treats "no row" and an OPEN row identically, so
       keeping it changes no dispatch behaviour and costs one row per
       deliberate mark. Clearing a mark is still a delete -- that is
       what `clearDays` is for, and it stays. */

    const { data, error: err } = await supabase
      .from('vendor_availability')
      .upsert(
        { vendor_id: vendor.id, slot_date: dateKey, status, ...sanitise(extra) },
        { onConflict: 'vendor_id,slot_date' },
      )
      .select().single()
    if (err) throw describeWriteError(err)
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
   * OPEN behaves exactly as it does in setDayStatus: written, not dropped.
   * The scope a partner chooses must never change what gets recorded.
   */
  const setRangeStatus = useCallback(async (dateKeys, status, extra = {}) => {
    if (!vendor || dateKeys.length === 0) return

    /* The OPEN split that used to live here is gone.
       It kept an OPEN row only on a standing day off or when the mark
       carried a note, and deleted the rest -- so "open every Saturday
       this month" wrote nothing on a vendor who works Saturdays anyway,
       and the range came back looking untouched. Same complaint as the
       single-day path, same fix: every deliberate mark is written.

       Which also restores the property the old comment cared about most
       -- that the SCOPE must not change the outcome. One day and a range
       now do exactly the same thing. */

    const clean = sanitise(extra)
    const rows = dateKeys.map(slot_date => ({ vendor_id: vendor.id, slot_date, status, ...clean }))
    const { data, error: err } = await supabase
      .from('vendor_availability')
      .upsert(rows, { onConflict: 'vendor_id,slot_date' })
      .select()
    if (err) throw describeWriteError(err)
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
    if (err) throw describeWriteError(err)
    setAvailability(map => {
      const next = { ...map }
      dateKeys.forEach(k => delete next[k])
      return next
    })
  }, [vendor])

  /**
   * Replace the standing week.
   *
   * Written as a whole week rather than a rule at a time, because that is
   * how the partner thinks about it and because a half-applied week — Monday
   * saved, Tuesday not — is a state nobody can reason about afterwards.
   *
   * Old rules are not deleted. They are closed off with `effective_to`, so
   * "I used to work Sundays until October" stays answerable and a booking
   * taken under the old week is not retrospectively made impossible. A
   * calendar that rewrites its own history cannot settle a dispute.
   */
  const saveWeeklyRules = useCallback(async (rules, effectiveFrom) => {
    if (!vendor) throw new Error('No vendor profile yet')
    const from = effectiveFrom ?? toDateKey(new Date())

    /* Close anything currently open, the day before the new week starts.
       An open-ended rule left open would keep winning the "newest
       effective" test on dates the new week is supposed to own. */
    const dayBefore = new Date(`${from}T00:00:00Z`)
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
    const until = dayBefore.toISOString().slice(0, 10)

    const { error: closeErr } = await supabase
      .from('vendor_weekly_rules')
      .update({ effective_to: until })
      .eq('vendor_id', vendor.id)
      .is('effective_to', null)
      .lt('effective_from', from)
    if (closeErr) throw describeWriteError(closeErr)

    const rows = rules.map(r => ({
      vendor_id: vendor.id,
      weekday: r.weekday,
      is_available: r.is_available !== false,
      start_time: r.start_time ?? null,
      end_time: r.end_time ?? null,
      effective_from: from,
      effective_to: r.effective_to ?? null,
    }))
    const { data, error: err } = await supabase
      .from('vendor_weekly_rules')
      .upsert(rows, { onConflict: 'vendor_id,weekday,effective_from' })
      .select()
    if (err) throw describeWriteError(err)

    await fetchAll()
    return data
  }, [vendor, fetchAll])

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
      { key: 'profile',  label: 'Submit your business profile', done: hasProfile, to: '/partner/setup' },
      { key: 'detail',   label: 'Add a category and description', done: hasDetail, to: '/partner/setup/details' },
      { key: 'list',     label: 'List what you offer',        done: hasList,   tab: 'list' },
      { key: 'prices',   label: 'Price at least one item',    done: hasPrices, tab: 'list' },
      // weekly_days_off is superseded by vendor_weekly_rules (131) and is
      // no longer read by anything; the checklist follows the live table.
      { key: 'calendar', label: 'Set your working days',      done: weeklyRules.length > 0 || stats.busyDays > 0, tab: 'availability' },
      { key: 'approved', label: 'Get approved by our team',   done: approved },
    ]
  }, [vendor, weeklyRules.length, stats.activeServices, stats.pricedServices, stats.busyDays])

  return {
    loading, error, refresh: fetchAll,
    vendor, services, availability, weeklyRules, availabilityError,
    bookings, reviews,
    stats, checklist,
    updateVendor, addService, updateService, removeService,
    setDayStatus, setRangeStatus, clearDays, saveWeeklyRules,
  }
}
