import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const MODE = String(process.env.DL_VERIFY_MODE || 'none').toLowerCase()
const PROVIDER_URL = process.env.DL_VERIFY_PROVIDER_URL
const PROVIDER_KEY = process.env.DL_VERIFY_PROVIDER_KEY
const PROVIDER_NAME = process.env.DL_VERIFY_PROVIDER_NAME || 'parivahan-provider'

function bearer(req) { const v = req.headers?.authorization || ''; return v.startsWith('Bearer ') ? v.slice(7) : null }
async function caller(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null
  const client = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + token } } })
  const { data } = await client.auth.getUser()
  return data?.user ? { client, user: data.user } : null
}
function normaliseStatus(value) {
  const v = String(value || '').toLowerCase()
  if (['verified','success','successful','approved','ok','valid','active'].includes(v)) return 'verified'
  if (['pending','processing','in_progress'].includes(v)) return 'pending'
  if (['mismatch','name_mismatch'].includes(v)) return 'mismatch'
  if (['not_found','invalid','failed','failure','rejected','expired'].includes(v)) return 'not_found'
  return 'unavailable'
}
async function providerVerify(dlNumber, name) {
  if (MODE === 'mock') return /INVALID|EXPIRED/i.test(dlNumber) ? { providerStatus: 'not_found', provider: 'mock-parivahan', reference: 'MOCK-DL-' + dlNumber.slice(-4), says: 'The driving licence could not be verified.' } : { providerStatus: 'verified', provider: 'mock-parivahan', reference: 'MOCK-DL-' + dlNumber.slice(-4), says: 'Driving licence verified.' }
  if (MODE !== 'generic' || !PROVIDER_URL || !PROVIDER_KEY) return { providerStatus: 'unavailable', provider: PROVIDER_NAME, reference: null, says: 'RTO driving licence verification is not connected yet.' }
  const r = await fetch(PROVIDER_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + PROVIDER_KEY }, body: JSON.stringify({ action: 'verify', dl_number: dlNumber, name: name || undefined }), signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error('DL provider returned ' + r.status)
  const d = await r.json()
  return { providerStatus: normaliseStatus(d?.status || d?.data?.status || d?.result?.status), provider: PROVIDER_NAME, reference: d?.reference || d?.ref || d?.requestId || d?.request_id || null, says: d?.message || d?.data?.message || 'Driving licence verification result received.' }
}
async function writeEvent(vendorId, result, last4) {
  if (!SUPABASE_SERVICE) return
  try { const db = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } }); await db.from('verification_events').insert({ vendor_id: vendorId, provider: result.provider, direction: 'response', reference: result.reference || null, payload: { kind: 'driving_licence', status: result.providerStatus, dl_last4: last4 } }) } catch {}
}
async function stamp(vendorId, documentId, result) {
  if (!SUPABASE_SERVICE) return
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } })
  await db.from('vendor_documents').update({ provider_status: result.providerStatus, provider_name: result.provider, provider_ref: result.reference || null, provider_at: new Date().toISOString() }).eq('id', documentId).eq('vendor_id', vendorId)
}
export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const token = bearer(req)
  if (!token) return res.status(401).json({ error: 'Please sign in again.' })
  const auth = await caller(token)
  if (!auth) return res.status(401).json({ error: 'Please sign in again.' })
  const { data: vendor } = await auth.client.from('vendors').select('id').eq('profile_id', auth.user.id).maybeSingle()
  if (!vendor?.id) return res.status(403).json({ error: 'Partner profile not found.' })
  const body = req.body || {}
  if (body.vendorId && body.vendorId !== vendor.id) return res.status(403).json({ error: 'Partner mismatch.' })
  if (!body.documentId) return res.status(400).json({ error: 'Document is required.' })
  const { data: doc } = await auth.client.from('vendor_documents').select('id,vendor_id,requirement_id').eq('id', body.documentId).eq('vendor_id', vendor.id).maybeSingle()
  if (!doc) return res.status(403).json({ error: 'Document not found.' })
  if (doc.requirement_id !== 'VER-TRADE-DL' && doc.requirement_id !== 'VER-ID-IDENTITY') return res.status(400).json({ error: 'This document is not a driving licence requirement.' })
  const dlNumber = String(body.dlNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (dlNumber.length < 6 || dlNumber.length > 20) return res.status(400).json({ error: 'Enter the driving licence number as printed.' })
  try {
    const result = await providerVerify(dlNumber, body.holderName ? String(body.holderName).slice(0,120) : null)
    await writeEvent(vendor.id, result, dlNumber.slice(-4))
    if (result.providerStatus !== 'unavailable') await stamp(vendor.id, body.documentId, result)
    return res.status(200).json({ ok: true, providerStatus: result.providerStatus, says: result.says, reference: result.reference || null })
  } catch { return res.status(200).json({ ok: true, providerStatus: 'unavailable', says: 'The RTO check could not be completed. The document remains available for Sambramo review.' }) }
}
