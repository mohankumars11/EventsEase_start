import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const MODE = String(process.env.AADHAAR_VERIFY_MODE || 'none').toLowerCase()
const PROVIDER_URL = process.env.AADHAAR_PROVIDER_URL
const PROVIDER_KEY = process.env.AADHAAR_PROVIDER_KEY
const PROVIDER_NAME = process.env.AADHAAR_PROVIDER_NAME || 'aadhaar-provider'
const WEBHOOK_SECRET = process.env.AADHAAR_WEBHOOK_SECRET
const CHALLENGE_SECRET = process.env.AADHAAR_CALLBACK_SECRET || SUPABASE_SERVICE

const fail = (res, status, says) => res.status(status).json({ ok: false, says })
const ok = (res, payload = {}) => res.status(200).json({ ok: true, ...payload })
function bearer(req) { const v = req.headers?.authorization || ''; return v.startsWith('Bearer ') ? v.slice(7) : null }
function sign(payload) {
  if (!CHALLENGE_SECRET) throw new Error('Aadhaar callback secret is not configured.')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', CHALLENGE_SECRET).update(body).digest('base64url')
  return body + '.' + mac
}
function readChallenge(token) {
  try {
    if (!CHALLENGE_SECRET) return null
    const parts = String(token || '').split('.')
    if (parts.length !== 2) return null
    const expected = crypto.createHmac('sha256', CHALLENGE_SECRET).update(parts[0]).digest()
    const got = Buffer.from(parts[1], 'base64url')
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null
    const p = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    return p?.exp > Date.now() ? p : null
  } catch { return null }
}
function normaliseStatus(value) {
  const v = String(value || '').toLowerCase()
  if (['verified','success','successful','approved','ok','authenticated'].includes(v)) return 'verified'
  if (['pending','processing','in_progress'].includes(v)) return 'pending'
  if (['mismatch','name_mismatch'].includes(v)) return 'mismatch'
  if (['not_found','invalid','failed','failure','rejected'].includes(v)) return 'not_found'
  return 'unavailable'
}
async function caller(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null
  const client = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + token } } })
  const { data } = await client.auth.getUser()
  return data?.user ? { client, user: data.user } : null
}
async function providerStart(aadhaar) {
  if (MODE === 'mock') return { providerStatus: 'pending', provider: 'mock-aadhaar', requestId: crypto.randomUUID(), maskedMobile: '******1234', says: 'Test OTP session created.' }
  if (MODE !== 'generic' || !PROVIDER_URL || !PROVIDER_KEY) return { providerStatus: 'unavailable', provider: PROVIDER_NAME, says: 'Aadhaar OTP verification is not connected yet.' }
  const r = await fetch(PROVIDER_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + PROVIDER_KEY }, body: JSON.stringify({ action: 'start', mode: 'otp', aadhaar, consent: true, callback_url: process.env.AADHAAR_CALLBACK_URL || undefined }), signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error('Aadhaar provider returned ' + r.status)
  const d = await r.json()
  return { providerStatus: normaliseStatus(d?.status || d?.data?.status || d?.result?.status), provider: PROVIDER_NAME, requestId: d?.requestId || d?.request_id || d?.data?.requestId || d?.data?.request_id || null, maskedMobile: d?.maskedMobile || d?.masked_mobile || d?.data?.maskedMobile || d?.data?.masked_mobile || 'your Aadhaar-linked mobile', says: d?.message || d?.data?.message || 'OTP sent to your Aadhaar-linked mobile.' }
}
async function providerVerify(requestId, otp) {
  if (MODE === 'mock') return otp === String(process.env.AADHAAR_MOCK_OTP || '123456') ? { providerStatus: 'verified', provider: 'mock-aadhaar', reference: requestId, says: 'Identity verified.' } : { providerStatus: 'mismatch', provider: 'mock-aadhaar', reference: requestId, says: 'The OTP is not correct.' }
  if (MODE !== 'generic' || !PROVIDER_URL || !PROVIDER_KEY) return { providerStatus: 'unavailable', provider: PROVIDER_NAME, reference: requestId, says: 'Aadhaar OTP verification is not connected yet.' }
  const r = await fetch(PROVIDER_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + PROVIDER_KEY }, body: JSON.stringify({ action: 'verify', mode: 'otp', request_id: requestId, otp }), signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error('Aadhaar provider returned ' + r.status)
  const d = await r.json()
  return { providerStatus: normaliseStatus(d?.status || d?.data?.status || d?.result?.status), provider: PROVIDER_NAME, reference: d?.reference || d?.ref || d?.requestId || d?.request_id || requestId, says: d?.message || d?.data?.message || 'Aadhaar authentication result received.' }
}
async function event(vendorId, provider, direction, reference, payload) {
  if (!SUPABASE_SERVICE) return
  try { const db = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } }); await db.from('verification_events').insert({ vendor_id: vendorId || null, provider, direction, reference: reference || null, payload }) } catch {}
}
async function stamp(vendorId, status, provider, reference, last4) {
  if (!SUPABASE_SERVICE) return
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } })
  await db.from('vendor_documents').upsert({ vendor_id: vendorId, requirement_id: 'VER-ID-IDENTITY', kind: 'aadhaar', storage_path: '', number_last4: last4 || null, checksum_ok: true, checksum_rule: 'aadhaar', checked_at: new Date().toISOString(), provider_status: status, provider_name: provider || null, provider_ref: reference || null, provider_at: new Date().toISOString() }, { onConflict: 'vendor_id,requirement_id' })
}
export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const body = req.body || {}
  if (body.action === 'callback') {
    if (!WEBHOOK_SECRET || req.headers?.['x-sambramo-verification-secret'] !== WEBHOOK_SECRET) return fail(res, 401, 'Unauthorised callback.')
    const reference = body.requestId || body.request_id || body.reference || null
    if (!reference) return fail(res, 400, 'A provider reference is required.')
    let vendorId = body.vendorId || body.vendor_id || null
    let last4 = body.last4 || null
    if (!vendorId && SUPABASE_SERVICE) {
      const db = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } })
      const { data } = await db.from('verification_events').select('vendor_id,payload').eq('direction', 'request').eq('reference', reference).order('at', { ascending: false }).limit(1).maybeSingle()
      vendorId = data?.vendor_id || null; last4 = last4 || data?.payload?.aadhaar_last4 || null
    }
    if (!vendorId) return fail(res, 404, 'Verification session not found.')
    const providerStatus = normaliseStatus(body.status || body.result || body.outcome)
    await stamp(vendorId, providerStatus, body.provider || PROVIDER_NAME, reference, last4)
    await event(vendorId, body.provider || PROVIDER_NAME, 'webhook', reference, { status: providerStatus, last4: last4 || null })
    return ok(res, { providerStatus })
  }
  const token = bearer(req)
  if (!token) return fail(res, 401, 'Please sign in again.')
  const auth = await caller(token)
  if (!auth) return fail(res, 401, 'Please sign in again.')
  const { data: vendor } = await auth.client.from('vendors').select('id').eq('profile_id', auth.user.id).maybeSingle()
  if (!vendor?.id) return fail(res, 403, 'Partner profile not found.')
  if (body.vendorId && body.vendorId !== vendor.id) return fail(res, 403, 'Partner profile mismatch.')
  const action = String(body.action || 'start')
  if (action === 'start') {
    const aadhaar = String(body.aadhaar || '').replace(/\D/g, '')
    if (!/^\d{12}$/.test(aadhaar)) return fail(res, 400, 'Enter a valid 12-digit Aadhaar number.')
    if (body.consent !== true) return fail(res, 400, 'Your consent is required before Aadhaar authentication.')
    try {
      const result = await providerStart(aadhaar)
      if (result.providerStatus === 'unavailable') return ok(res, { providerStatus: 'unavailable', challenge: null, says: result.says })
      const challenge = sign({ v: 1, vendorId: vendor.id, requirementId: body.requirementId || 'VER-ID-IDENTITY', requestId: result.requestId, provider: result.provider, last4: aadhaar.slice(-4), exp: Date.now() + 10 * 60 * 1000 })
      await event(vendor.id, result.provider, 'request', result.requestId, { action: 'start', requirementId: body.requirementId || 'VER-ID-IDENTITY', aadhaar_last4: aadhaar.slice(-4), consent: true })
      return ok(res, { providerStatus: result.providerStatus, challenge, maskedMobile: result.maskedMobile, says: result.says })
    } catch (e) { return fail(res, 502, 'Aadhaar OTP service is temporarily unavailable. Your details were not stored.') }
  }
  if (action === 'resend' || action === 'verify') {
    const ch = readChallenge(body.challenge)
    if (!ch || ch.vendorId !== vendor.id) return fail(res, 400, 'That verification session has expired. Start again.')
    if (action === 'resend') {
      const result = await providerStart('')
      if (result.providerStatus === 'unavailable') return fail(res, 503, result.says)
      const next = sign({ ...ch, requestId: result.requestId, exp: Date.now() + 10 * 60 * 1000 })
      await event(vendor.id, result.provider, 'request', result.requestId, { action: 'resend', requirementId: ch.requirementId, aadhaar_last4: ch.last4, consent: true })
      return ok(res, { providerStatus: result.providerStatus, challenge: next, maskedMobile: result.maskedMobile, says: result.says || 'A new OTP has been sent.' })
    }
    const otp = String(body.otp || '')
    if (!/^\d{6}$/.test(otp)) return fail(res, 400, 'Enter the 6-digit OTP.')
    try {
      const result = await providerVerify(ch.requestId, otp)
      await event(vendor.id, result.provider, 'response', result.reference, { action: 'verify', requirementId: ch.requirementId, status: result.providerStatus })
      if (result.providerStatus === 'verified') await stamp(vendor.id, 'verified', result.provider, result.reference, ch.last4)
      return ok(res, { providerStatus: result.providerStatus, says: result.says, reference: result.reference || null })
    } catch { return ok(res, { providerStatus: 'unavailable', says: 'The Aadhaar check could not be completed. Please try again or use another accepted ID.' }) }
  }
  return fail(res, 400, 'Unknown Aadhaar verification action.')
}
