import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

/**
 * One load of everything the admin dashboard reasons about.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * Every tab used to fetch for itself, and several fetched the same rows with
 * slightly different selects — which meant three table scans to open three
 * tabs, three spinners, and three chances for the same question to be asked
 * three ways. Now the dashboard loads once and every view reads the same rows,
 * which is also what makes cross-view analysis possible at all.
 *
 * ── Tolerating a database that is one migration behind ───────────────────
 * Migrations here are applied BY HAND in the Supabase SQL editor, and `git
 * push` does not run them (PROJECT_SUMMARY § Migrations). So a deploy can
 * legitimately reach production before its migration does.
 *
 * Every query therefore fails soft: a missing table or column resolves to an
 * empty array and its name lands in `missing`, rather than taking the whole
 * dashboard down with a red error. The views that need it say so in place —
 * see AdminServices, which explains exactly which migration to run. The one
 * query whose absence really is fatal (`events`) surfaces as `error` in the
 * normal way.
 *
 * `orders` used to be in that set, and taking it out is what makes the shop
 * removal survivable. Migration 054 drops the table, and the SQL is pasted by
 * hand at some point after the deploy that stops reading it. For the window
 * in between, a REQUIRED `orders` would set `fatal` and put a full-page error
 * over the whole console — including every event screen, which needs nothing
 * from the shop. Soft-failing it means the console keeps working and the shop
 * views simply read zero, which is the honest answer once the table is gone.
 */

/** Tables that must load for the dashboard to mean anything. */
const REQUIRED = new Set(['events'])

/**
 * Postgres/PostgREST codes for "you asked for something that isn't there":
 * 42P01 undefined_table, 42703 undefined_column, PGRST200 no such relationship,
 * PGRST202 no such function. Anything else is a real error and is re-thrown.
 */
const ABSENT_CODES = new Set(['42P01', '42703', 'PGRST200', 'PGRST202', 'PGRST205'])

function isAbsent(error) {
  if (!error) return false
  if (ABSENT_CODES.has(error.code)) return true
  return /does not exist|could not find|schema cache/i.test(error.message ?? '')
}

const EMPTY = {
  events: [], proposals: [], payments: [], profiles: [],
  vendors: [], enquiries: [], reviews: [], complaints: [],
  interest: [], services: [],
}

export default function useAdminData() {
  const [data, setData]       = useState(EMPTY)
  const [missing, setMissing] = useState([])
  const [loading, setLoading] = useState(true)
  // Distinct from `loading`: a refresh holds the previous render rather than
  // flashing a skeleton over numbers the operator is mid-sentence about.
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]     = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)

    const queries = {
      events: () => supabase
        .from('events')
        .select('*, profiles!customer_id(full_name, email, phone)')
        .order('created_at', { ascending: false }),

      proposals: () => supabase.from('event_proposals').select('id, event_id, total_amount, status, created_at'),

      /* The concierge side's money. This was never loaded because revenue was
         read off `orders`, which is gone — so without it the Command Center
         would report a business with no income. `milestone_id` needs migration
         046; the query soft-fails to [] without it like every other. */
      payments: () => supabase
        .from('event_payments')
        .select('id, event_id, enquiry_id, amount, status, payment_type, created_at, paid_at, due_at')
        .order('created_at', { ascending: false }),

      profiles: () => supabase
        .from('profiles')
        .select('id, full_name, phone, email, city, created_at')
        .eq('role', 'customer')
        .order('created_at', { ascending: false }),

      vendors: () => supabase
        .from('vendors')
        // The foreign key is NAMED, and it has to be.
        //
        // `vendors` used to have exactly one reference to `profiles` —
        // `profile_id`, the partner's own login — so a bare `profiles(...)`
        // embed was unambiguous. Migration 067 added a second:
        // `verified_by`, the operator who approved them.
        //
        // PostgREST will not guess between two paths. It refuses the whole
        // request, which took out the entire Command Center with
        // "more than one relationship was found for 'vendors' and
        // 'profiles'" — every admin screen at once, because they all share
        // this one load.
        //
        // Refusing is the right behaviour: guessing would have silently
        // shown the APPROVER's name where the partner's belongs.
        .select('*, profiles!vendors_profile_id_fkey(full_name, email, phone)')
        .order('created_at', { ascending: false }),

      enquiries: () => supabase.from('service_enquiries').select('*').order('created_at', { ascending: false }),
      reviews:   () => supabase.from('reviews_catalog').select('*').order('created_at', { ascending: false }),
      complaints:() => supabase.from('complaints').select('*, profiles!customer_id(full_name, phone)').order('created_at', { ascending: false }),
      interest:  () => supabase.from('city_interest_requests').select('city, created_at').order('created_at', { ascending: false }),

      // Migration 037/040. Absent on any database that has not run them yet,
      // which is the normal state right after a deploy — hence the soft
      // failure. `select('*')` rather than naming `kind`, so a database with
      // 037 but not 040 still returns its services instead of 400-ing.
      services:  () => supabase.from('service_catalog').select('*').order('sort_order').order('name'),

      // Migration 039 — the per-transition history behind every order
      // timeline. Bounded rather than unbounded: a year of transitions is
      // more than any screen reads, and the cap keeps this from becoming the
      // slowest query on the dashboard as the shop grows.
     }

    const keys = Object.keys(queries)
    const results = await Promise.all(keys.map(k => queries[k]().then(r => r, err => ({ error: err }))))

    const next = { ...EMPTY }
    const absent = []
    let fatal = null

    results.forEach((res, i) => {
      const key = keys[i]
      if (res.error) {
        if (isAbsent(res.error) && !REQUIRED.has(key)) { absent.push(key); return }
        // First real error wins; the rest of the dashboard still gets its rows.
        if (!fatal) fatal = res.error.message
        return
      }
      next[key] = res.data ?? []
    })

    setData(next)
    setMissing(absent)
    setError(fatal)
    setLoadedAt(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load(false) }, [load])

  const refresh = useCallback(() => load(true), [load])

  /* ══════════════════════════════════════════════════════════════════
     The console listens. It used to load once and go deaf.
     ══════════════════════════════════════════════════════════════════

     Every screen in the admin console shares this one load, and it ran
     exactly once on mount. Nothing polled, nothing subscribed. So a
     partner who signed up while the dashboard was open never appeared,
     a booking placed thirty seconds ago was invisible, and the only way
     to see anything new was to know to press Refresh.

     That reads as "the data is not reaching the database". It was
     reaching it. Both partner signups were sitting in `vendors`, correct
     and complete, on a screen that had stopped asking.

     ── Why a debounce and not a refresh per event ──────────────────
     One partner signup is several rows: a profile, a vendor, and a
     service list. A booking is a request plus N lines plus 5N offers —
     a four-service basket is more than twenty INSERTs inside a second,
     and each one arrives as its own event. Refreshing per event would
     fire twenty full dashboard loads, every one of them redundant with
     the last.

     So events are collapsed into one reload a second later. The console
     is never more than a second behind, and a busy Saturday does not
     turn the admin's browser into a load generator. */
  const [liveAt, setLiveAt] = useState(null)

  useEffect(() => {
    let timer = null
    const nudge = () => {
      setLiveAt(new Date())
      clearTimeout(timer)
      timer = setTimeout(() => load(true), 1000)
    }

    /* One channel, several tables. Each is here because somebody is
       waiting on it:

         vendors            a partner signed up or was approved
         profiles           a customer or partner account was created
         booking_requests   somebody started an instant booking
         dispatch_offers    a master accepted, or an offer expired
         complaints         a dispute was raised

       Deliberately NOT booking_lines: a basket writes one line per
       service and they always arrive with the request, which is already
       listened to above. */
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, nudge)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, nudge)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests' }, nudge)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_offers' }, nudge)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, nudge)
      .subscribe()

    /* The floor under Realtime.
     *
     * Realtime needs the table in the `supabase_realtime` publication,
     * and a table nobody remembered to add is silent rather than loud —
     * the subscription succeeds and no events ever come. A console that
     * is quietly forty minutes stale is worse than one that is honestly
     * one minute stale, so it also reloads on a timer.
     *
     * Same pattern as hooks/useNotifications.js: Realtime where it
     * works, a poll as the guarantee, never trust Realtime alone. */
    const floor = setInterval(() => load(true), 60_000)

    return () => {
      clearTimeout(timer)
      clearInterval(floor)
      supabase.removeChannel(channel)
    }
  }, [load])

  return useMemo(
    () => ({ ...data, missing, loading, refreshing, error, loadedAt, liveAt, refresh }),
    [data, missing, loading, refreshing, error, loadedAt, liveAt, refresh],
  )
}
