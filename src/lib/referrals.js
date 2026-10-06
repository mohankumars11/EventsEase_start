import { supabase } from './supabase'
import { classifyError, isReferralCode, normaliseCode } from './referralModel'

/**
 * Every referral read and write the partner app makes, in one place.
 *
 * All of them go through functions from migration 158. None of them
 * writes a referral table directly — there is no grant for that, on
 * purpose: a partner who could write partner_referrals could write
 * themselves to "paid".
 *
 * Each returns `{ data }` or `{ error: 'offline' | 'unavailable' | 'error',
 * says? }`, so a screen can show the right one of its four states without
 * parsing Postgres.
 */

const online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)

async function call(fn, args) {
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) return { error: classifyError(error, online()) }
    return { data }
  } catch (e) {
    return { error: classifyError(e, online()) ?? 'error' }
  }
}

export async function fetchReferralSummary() {
  const res = await call('my_referral_summary')
  if (res.data && res.data.ok === false) return { error: 'error' }
  return res
}

export async function fetchReferrals({ tradeId = null, state = null, id = null } = {}) {
  return call('my_referrals', { p_trade_id: tradeId, p_state: state, p_id: id })
}

export async function fetchReferral(id) {
  const res = await fetchReferrals({ id })
  if (res.error) return res
  return { data: res.data?.[0] ?? null }
}

/** The caller's invitations, newest first. Read under RLS, not written. */
export async function fetchInvites(tradeId) {
  try {
    let q = supabase
      .from('partner_referral_invites')
      .select('id, trade_id, code, created_at, expires_at, claimed_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (tradeId) q = q.eq('trade_id', tradeId)
    const { data, error } = await q
    if (error) return { error: classifyError(error, online()) }
    return { data: data ?? [] }
  } catch (e) {
    return { error: classifyError(e, online()) ?? 'error' }
  }
}

export const newIdempotencyKey = () =>
  (globalThis.crypto?.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    }))

/**
 * One invitation for one trade. `key` is kept by the caller across
 * retries of the SAME tap, so a dropped connection cannot make two.
 */
export async function createInvite(tradeId, key) {
  const res = await call('create_referral_invite', { p_trade_id: tradeId, p_idempotency_key: key })
  if (res.error) return res
  if (!res.data?.ok) return { error: 'refused', says: res.data?.says ?? 'That did not work.' }
  return { data: res.data }
}

/** The partner's own six-character code, minted on the server. */
export async function ensureMyCode() {
  return call('ensure_my_referral_code')
}

/* ══════════════════════════════════════════════════════════════════════
   A CODE THAT ARRIVED BEFORE THE ACCOUNT DID
   ══════════════════════════════════════════════════════════════════════

   /partner/join?ref=CODE is opened by somebody who has no partner row
   yet, and claim_referral_code() needs one. So the code waits here until
   there is a vendor to attach it to.

   Its own key, not `ee_pending_ref`: AuthContext spends that one on the
   CUSTOMER referral programme the first time any profile loads, and a
   partner's code would be consumed there, looked up in the wrong table,
   and lost. */
const PENDING = 'sb_partner_ref'

export function stashPartnerRef(raw) {
  const code = normaliseCode(raw)
  if (!isReferralCode(code)) return
  try { localStorage.setItem(PENDING, code) } catch { /* storage off */ }
}

export function pendingPartnerRef() {
  try { return localStorage.getItem(PENDING) } catch { return null }
}

/**
 * Claim the waiting code, once. Kept on a network failure so the next
 * launch tries again; dropped on any answer from the server, because a
 * refusal will not change by asking twice.
 */
export async function claimPendingPartnerRef() {
  const code = pendingPartnerRef()
  if (!code) return null
  const res = await call('claim_referral_code', { p_code: code })
  if (res.error === 'offline') return { pending: true }
  try { localStorage.removeItem(PENDING) } catch { /* storage off */ }
  if (res.error) return { ok: false, says: 'We could not apply that invitation code.' }
  return res.data
}

export async function claimCode(raw) {
  const code = normaliseCode(raw)
  if (!isReferralCode(code)) return { ok: false, says: 'That does not look like a Sambramo code.' }
  const res = await call('claim_referral_code', { p_code: code })
  if (res.error) return { ok: false, says: res.error === 'offline' ? 'You are offline. Try again.' : 'That did not work. Try again.' }
  return res.data
}
