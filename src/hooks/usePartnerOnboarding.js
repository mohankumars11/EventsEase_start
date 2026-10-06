import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchListings } from '../lib/partnerListings'
import { fetchDocuments } from '../lib/partnerDocuments'
import { indexPricing } from '../lib/pricingReadiness'
import {
  onboardingSteps, currentStep, canOpen, completedCount,
  onboardingComplete, partnerLifecycle, STEPS, STATUS, LIFECYCLE,
} from '../lib/partnerOnboarding'

/**
 * Everything the six-step controller needs, read once.
 *
 * Four reads, because four different tables answer "how far through is
 * this partner": the vendors row, their trades, their documents and
 * their payout account. They are fetched together rather than by each
 * step screen, so the progress list and the screen a partner is looking
 * at cannot disagree — which they did whenever a step owned its own
 * query and refreshed at a different moment.
 *
 * Nothing here decides completion. lib/partnerOnboarding.js does that,
 * from these rows, and is pure so it can be tested without a database.
 */
export function usePartnerOnboarding() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState({
    vendor: null, listings: [], availability: {}, documents: {}, payout: null, weeklyRules: [], pricing: { byService: {}, generic: [], catering: [] },
  })
  const runId = useRef(0)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    const run = ++runId.current
    setLoading(true)
    try {
      let { data: vendor } = await supabase
        .from('vendors').select('*').eq('profile_id', user.id).maybeSingle()
      if (run !== runId.current) return

      /* A newly verified partner has a profile before they have a vendor row.
         Create the draft shell here, once, so the six-step setup has a real
         backend record to save into. This is intentionally the only bootstrap
         write: every later field is saved by its own step. */
      if (!vendor && profile?.role === 'vendor') {
        const fallbackName =
          profile?.full_name?.trim() ||
          user.email?.split('@')[0]?.trim() ||
          'Sambramo Partner'
        const { data: created } = await supabase
          .from('vendors')
          .insert({
            profile_id: user.id,
            business_name: fallbackName,
            contact_phone: profile?.phone || null,
            verification_status: 'draft',
            status: 'PENDING_REVIEW',
          })
          .select('*')
          .single()
        if (created) vendor = created
      }

      if (run !== runId.current) return

      let listings = [], availability = {}, documents = {}, payout = null, weeklyRules = [], generic = [], catering = [], priceBooks = []
      if (vendor?.id) {
        const [ls, avail, docs, pay, week, genericRes, cateringRes, priceRes] = await Promise.all([
          fetchListings(vendor.id),
          supabase.from('vendor_availability').select('slot_date,status,slots_total').eq('vendor_id', vendor.id).gte('slot_date', new Date().toISOString().slice(0, 10)),
          fetchDocuments(vendor.id),
          supabase.from('vendor_payout_details')
            .select('method, upi_id, account_number, verified_at')
            .eq('vendor_id', vendor.id).maybeSingle(),
          supabase.from('vendor_weekly_rules')
            .select('weekday, is_available, start_time, end_time, effective_from, effective_to')
            .eq('vendor_id', vendor.id),
          supabase.from('sambramo_trade_packages')
            .select('id, vendor_service_id, name, status, revision_round, parent_package_id, commercial_inputs')
            .eq('vendor_id', vendor.id),
          supabase.from('sambramo_catering_packages')
            .select('id, vendor_service_id, name, status, parent_package_id, rate_bands')
            .eq('vendor_id', vendor.id),
          supabase.from('sambramo_partner_price_books')
            .select('offering_id, vendor_service_id, unit, rate_paise, status, version')
            .eq('vendor_id', vendor.id),
        ])
        if (run !== runId.current) return
        listings = ls ?? []
        availability = Array.isArray(avail?.data) ? Object.fromEntries(avail.data.map(row => [row.slot_date, row])) : {}
        documents = docs ?? {}
        payout = pay?.data ?? null
        weeklyRules = week?.error ? [] : (week?.data ?? [])
        generic = genericRes?.error ? [] : (genericRes?.data ?? [])
        catering = cateringRes?.error ? [] : (cateringRes?.data ?? [])
        priceBooks = priceRes?.error ? [] : (priceRes?.data ?? [])
      }
      setAccount({ vendor: vendor ?? null, listings, availability, documents, payout, weeklyRules, pricing: { byService: indexPricing(generic, catering, priceBooks), generic, catering, priceBooks } })
    } catch {
      /* A partner we cannot read is left at the start rather than
         pushed somewhere by a half-answer. */
    } finally {
      if (run === runId.current) setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const steps = onboardingSteps(account)

  /**
   * Record that a step was explicitly finished.
   *
   * Only step 4 genuinely needs this — see the note on complianceDone —
   * but it is written for any step so the column means one thing. It is
   * a bookmark: `onboardingSteps` still derives status from the data,
   * so a stale marker cannot make an unfinished step look done.
   */
  const markStepComplete = useCallback(async (stepId) => {
    const id = account.vendor?.id
    if (!id) return
    const next = [...new Set([...(account.vendor.completed_steps ?? []), stepId])]
    try {
      await supabase.from('vendors')
        .update({ completed_steps: next, current_onboarding_step: stepId })
        .eq('id', id)
    } catch { /* 119 not applied — the derived status still holds */ }
    await load()
  }, [account.vendor, load])

  /**
   * Patch the vendor row and reload.
   *
   * Narrow on purpose: `ALLOWED` is an allow-list rather than a
   * pass-through, because this hook is reachable from every onboarding
   * screen and a patch object built from form state should never be
   * able to reach `is_verified`, `status` or anything else the partner
   * does not own. RLS would refuse most of it anyway; refusing it here
   * means the partner sees nothing rather than a Postgres error.
   */
  const updateVendor = useCallback(async (patch = {}) => {
    const id = account.vendor?.id
    if (!id) return
    const ALLOWED = new Set(['identity_document'])
    const safe = Object.fromEntries(
      Object.entries(patch).filter(([k]) => ALLOWED.has(k)))
    if (!Object.keys(safe).length) return
    /* ── Held locally as well, so an unapplied migration is not a
       dead button ──────────────────────────────────────────────────
       Migrations here are pasted by hand, so there is always a window
       where the column does not exist yet. Without this, the write
       fails, `load()` re-reads a row that has no such field, and the
       chooser silently snaps back to the default -- which reads as a
       broken control rather than a missing column.

       The patch is merged into the account optimistically and survives
       the reload. It does not survive a sign-out, which is correct: it
       was never stored, and pretending otherwise would be the same
       dishonesty in the other direction. */
    let stored = true
    try {
      const { error } = await supabase.from('vendors').update(safe).eq('id', id)
      if (error) stored = false
    } catch { stored = false }

    await load()
    if (!stored) {
      setAccount(a => ({ ...a, vendor: a.vendor ? { ...a.vendor, ...safe } : a.vendor }))
    }
    return stored
  }, [account.vendor?.id, load])

  return {
    loading,
    account,
    steps,
    STEPS,
    STATUS,
    LIFECYCLE,
    current: currentStep(account),
    done: completedCount(account),
    complete: onboardingComplete(account),
    lifecycle: partnerLifecycle(account),
    canOpen: id => canOpen(id, account),
    markStepComplete,
    updateVendor,
    refresh: load,
    profile,
  }
}
