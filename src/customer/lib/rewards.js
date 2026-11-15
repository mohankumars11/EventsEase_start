/**
 * Rewards, consent and city interest (migration 193).
 *
 *   recordConsent()      the evidence that this customer accepted the terms
 *                        (policy version, time, app, device) — called right
 *                        after OTP sign-in. If 193 is not applied yet the
 *                        record waits in localStorage and is sent on the
 *                        next launch (flushConsent), never silently lost.
 *   claimWelcome()       the two welcome scratch cards: a free first RSVP and
 *                        25% off the first booking. Server-side once per
 *                        customer; before 193, kept on this device.
 *   myVouchers(), redeem(id, on)
 *   registerInterest()   "notify me when you're in my city"
 *
 * The 25% voucher is real and visible, but no screen claims it has been
 * taken off a payment until api/create-booking-payment.js applies it.
 */
import { supabase } from '../../lib/supabase'
import { POLICY_VERSION } from '../data/policies'

/* The launch offer, in one place (Mohan, 2026-10-28: 25%, not 10%). It
   comes out of Sambramo's margin, never below the partner's price
   (api/_lib/listPrice.js), and the server applies it at checkout. */
export const WELCOME = { pct: 25, capPaise: 250000, days: 30 }
export const welcomeLine = `${WELCOME.pct}% off your first booking`
export const welcomeFine = `Up to ₹${(WELCOME.capPaise / 100).toLocaleString('en-IN')} off · first booking · ${WELCOME.days} days`
export { BOOKING_KINDS } from '../../../api/_lib/listPrice.js'
import { BOOKING_KINDS as KINDS } from '../../../api/_lib/listPrice.js'

const missing = e => !!e && (e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42P01' || /schema cache|does not exist|Could not find/i.test(e.message ?? ''))
const LOCAL = 'sbm.cx.vouchers.v1'
const PENDING = 'sbm.cx.consent.pending'
const read = k => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage off */ } }
const appVersion = () => (import.meta.env?.VITE_APP_VERSION ?? 'customer')

/* ── Consent ───────────────────────────────────────────────────────── */
export async function recordConsent(method = 'otp') {
  const row = { version: POLICY_VERSION, surface: 'customer', method, app_version: String(appVersion()).slice(0, 60), user_agent: String(navigator.userAgent ?? '').slice(0, 400), at: new Date().toISOString() }
  const { at, ...insert } = row
  const { error } = await supabase.from('policy_acceptances').insert(insert)
  if (error) { write(PENDING, row); return false }
  write(PENDING, null)
  return true
}
/** On launch: send an acceptance that could not be recorded at sign-in. */
export async function flushConsent() {
  const row = read(PENDING)
  if (!row) return
  const { data } = await supabase.auth.getUser()
  if (!data?.user) return
  const { at, ...insert } = row
  const { error } = await supabase.from('policy_acceptances').insert({ ...insert, method: `${insert.method}@${at}` })
  if (!error) write(PENDING, null)
}

/* ── Vouchers ──────────────────────────────────────────────────────── */
/* Six characters, no 0/O/1/I — the same alphabet as migration 193. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const freshTag = () => { const b = new Uint8Array(6); crypto.getRandomValues(b); return [...b].map(x => ALPHABET[x % 32]).join('') }
function localWelcome(userId) {
  const tag = freshTag()
  const now = Date.now()
  const mine = read(LOCAL) ?? []
  if (mine.length) return mine
  const list = [
    { id: `local-rsvp-${tag}`, kind: 'free_rsvp', code: `SAMBRAMO-RSVP-${tag}`, title: 'Your first invitation is on us', terms: { what: 'Premium invitation with live RSVP, guest care and style circles', uses: 1 }, status: 'available', claimed_at: new Date(now).toISOString(), expires_at: new Date(now + 90 * 864e5).toISOString(), local: true },
    { id: `local-welcome-${tag}`, kind: 'welcome_pct', code: `SAMBRAMO25-${tag}`, title: welcomeLine, terms: { pct: WELCOME.pct, cap_paise: WELCOME.capPaise, uses: 1, first_booking_only: true }, status: 'available', claimed_at: new Date(now).toISOString(), expires_at: new Date(now + WELCOME.days * 864e5).toISOString(), local: true },
  ]
  write(LOCAL, list)
  return list
}
export async function claimWelcome(userId) {
  const { data, error } = await supabase.rpc('claim_welcome_vouchers')
  if (error) { if (missing(error)) return localWelcome(userId); throw new Error(error.message) }
  return data
}
/* The customer's vouchers, from the server once 193 is live. Anybody who
   scratched their cards before it was (kept on the phone, codes that no
   server knows) is given real ones on the next read — everybody gets
   their own, and only server vouchers can be applied at checkout. */
export async function myVouchers(userId) {
  const { data, error } = await supabase.from('customer_vouchers').select('*').order('claimed_at')
  if (error) return missing(error) ? (read(LOCAL) ?? []) : []
  if (data.length) { if (read(LOCAL)) write(LOCAL, null); return data }
  if (!userId) return []
  const { data: minted, error: e2 } = await supabase.rpc('claim_welcome_vouchers')
  if (e2) return read(LOCAL) ?? []
  write(LOCAL, null)
  return minted ?? []
}
/** Vouchers that take money off a booking right now (server ones only). */
export const bookingVouchers = list => (list ?? []).filter(v => !v.local && usable(v) && KINDS.includes(v.kind))
export async function redeem(v, on) {
  if (v.local) {
    const list = (read(LOCAL) ?? []).map(x => (x.id === v.id ? { ...x, status: 'used', used_at: new Date().toISOString(), used_on: on } : x))
    write(LOCAL, list)
    return list.find(x => x.id === v.id)
  }
  const { data, error } = await supabase.rpc('redeem_voucher', { p_id: v.id, p_on: on })
  if (error) throw new Error(error.message)
  return data
}
export const usable = v => v.status === 'available' && (!v.expires_at || new Date(v.expires_at) > new Date())
export const daysLeft = v => (v.expires_at ? Math.max(0, Math.ceil((new Date(v.expires_at) - Date.now()) / 864e5)) : null)

/* ── Referrals (193 · my_referrals) ─────────────────────────────────
   The referrer's reward: 25% + 5% off their next event, claimable once
   they have completed a paid event themselves AND a friend they referred
   has booked, paid and completed theirs. */
export const REFERRAL = { pct: 25, capPaise: 250000, bonus: 5, bonusCapPaise: 100000 }
const NO_REFERRALS = { joined: 0, paid: 0, done: 0, claimed: 0, eligible: false, friends: [] }
export async function myReferrals() {
  // 194: its own name — 193's my_referrals() collided with the partner programme's (158).
  const { data, error } = await supabase.rpc('my_customer_referrals')
  if (error) return missing(error) || error.code === 'PGRST203' ? { ...NO_REFERRALS, pending: true } : NO_REFERRALS
  return { ...NO_REFERRALS, ...data }
}
/** Issue the rewards a referrer has earned (server decides); returns their referral vouchers. */
export async function claimReferralRewards() {
  const { data, error } = await supabase.rpc('claim_referral_rewards')
  if (error) throw new Error(missing(error) ? 'Referral rewards switch on with our launch.' : error.message)
  return data ?? []
}

/* ── Cities ────────────────────────────────────────────────────────── */
export async function registerInterest({ city, area = null, contact = null, lat = null, lng = null }) {
  const { error } = await supabase.from('city_interest').insert({ city, area, contact, lat, lng })
  if (error && !missing(error)) throw new Error(error.message)
  const mine = read('sbm.cx.city.interest') ?? []
  write('sbm.cx.city.interest', [...mine.filter(x => x.city !== city), { city, at: Date.now() }])
  return !error
}
