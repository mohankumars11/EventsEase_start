/**
 * usePartnerDraft — Draft store for resuming in-progress onboarding
 *
 * Stores baseline inputs and other progress in localStorage per listing_id,
 * and (when the key is "<vendorId>:<trade>") mirrors it to
 * sambramo_listing_drafts so a reinstall or a second phone resumes the same
 * draft. The device copy stays the primary one: it is written synchronously
 * on every change; the server copy is a debounced, best-effort upsert, and a
 * failure (offline, migration 20261010_12 not applied) never blocks typing.
 */
import { supabase } from '../lib/supabase'

const DRAFT_KEY_PREFIX = 'partner_draft:'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const timers = new Map()

/** "<vendorId>:<trade>" → { vendorId, trade } for server sync, else null. */
function serverTarget(listingId) {
  const [vendorId, trade] = String(listingId ?? '').split(':')
  return UUID.test(vendorId ?? '') && trade ? { vendorId, trade } : null
}

export function usePartnerDraft(listingId = null) {
  const key = listingId ? `${DRAFT_KEY_PREFIX}${listingId}` : null
  const target = serverTarget(listingId)

  const saveDraft = (data) => {
    if (!key) return
    const stamped = { ...data, savedAt: new Date().toISOString() }
    try {
      localStorage.setItem(key, JSON.stringify(stamped))
    } catch (e) {
      console.warn('Failed to save draft:', e)
    }
    if (!target) return
    clearTimeout(timers.get(key))
    timers.set(key, setTimeout(() => {
      supabase.from('sambramo_listing_drafts').upsert({
        vendor_id: target.vendorId, draft_key: listingId, trade_id: target.trade,
        data: stamped, schema_version: Number(stamped?.answers?._schema) || 1, updated_at: stamped.savedAt,
      }, { onConflict: 'vendor_id,draft_key' }).then(() => {}, () => {})
    }, 1500))
  }

  const loadDraft = () => {
    if (!key) return null
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch (e) {
      console.warn('Failed to load draft:', e)
      return null
    }
  }

  /** The server copy, when it is newer than this device's (or the device has none). */
  const loadRemoteDraft = async () => {
    if (!target) return null
    try {
      const { data } = await supabase.from('sambramo_listing_drafts').select('data, updated_at')
        .eq('vendor_id', target.vendorId).eq('draft_key', listingId).maybeSingle()
      if (!data?.data) return null
      const local = loadDraft()
      return !local?.savedAt || new Date(data.updated_at) > new Date(local.savedAt) ? data.data : null
    } catch {
      return null
    }
  }

  const clearDraft = () => {
    if (!key) return
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('Failed to clear draft:', e)
    }
    if (target) {
      clearTimeout(timers.get(key))
      supabase.from('sambramo_listing_drafts').delete().eq('vendor_id', target.vendorId).eq('draft_key', listingId).then(() => {}, () => {})
    }
  }

  return { saveDraft, loadDraft, loadRemoteDraft, clearDraft }
}
