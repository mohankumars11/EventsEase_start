import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { authenticatedUser } from './_lib/auth.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const FEE_RATE = 0.15
const VERSION = 'sambramo-custom-quote-v2'
const CUSTOMER_ACCEPT_MINUTES = 10

const money = value => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
const list = value => Array.isArray(value) ? value.map(x => String(x).trim()).filter(Boolean).slice(0, 50) : []

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const authn = await authenticatedUser(req, db)
  if (authn.error) return res.status(401).json({ error: 'Authentication required' })

  const body = req.body ?? {}
  const quoteRequestId = String(body.quoteRequestId ?? '')
  const partnerAmountPaise = money(body.partnerAmountPaise)
  if (!quoteRequestId || partnerAmountPaise <= 0) return res.status(400).json({ error: 'Quote request and positive partner quote are required.' })

  const { data: vendor } = await db
    .from('vendors')
    .select('id, profile_id, is_verified, verification_status')
    .eq('profile_id', authn.user.id)
    .maybeSingle()
  if (!vendor?.id) return res.status(403).json({ error: 'Partner account not found.' })
  if (!vendor.is_verified || vendor.verification_status !== 'approved') return res.status(403).json({ error: 'Only approved partners can submit customer quotes.' })

  const { data: request } = await db
    .from('sambramo_quote_requests')
    .select('id, vendor_id, state, expires_at, quote_group_id')
    .eq('id', quoteRequestId)
    .eq('vendor_id', vendor.id)
    .maybeSingle()

  if (!request) return res.status(404).json({ error: 'Quote request not found.' })
  if (!['VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED'].includes(request.state)) return res.status(409).json({ error: 'That request is no longer open.' })
  if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) return res.status(409).json({ error: 'That quote window has closed.' })

  const customerAmountPaise = Math.max(partnerAmountPaise + 100, Math.round(partnerAmountPaise / (1 - FEE_RATE)))
  const platformFeePaise = customerAmountPaise - partnerAmountPaise
  const validUntil = new Date(Date.now() + CUSTOMER_ACCEPT_MINUTES * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('sambramo_quote_responses')
    .upsert({
      quote_request_id: quoteRequestId,
      vendor_id: vendor.id,
      partner_amount_paise: partnerAmountPaise,
      partner_components: body.partnerComponents && typeof body.partnerComponents === 'object' ? body.partnerComponents : {},
      inclusions: list(body.inclusions),
      exclusions: list(body.exclusions),
      quote_valid_until: validUntil,
      notes: String(body.notes ?? '').trim().slice(0, 4000) || null,
      customer_amount_paise: customerAmountPaise,
      platform_fee_rate: FEE_RATE,
      platform_fee_paise: platformFeePaise,
      pricing_version: VERSION,
      status: 'SUBMITTED',
    }, { onConflict: 'quote_request_id,vendor_id' })
    .select('id, customer_amount_paise, quote_valid_until, status')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({
    ok: true,
    responseId: data.id,
    customerAmountPaise: data.customer_amount_paise,
    quoteValidUntil: data.quote_valid_until,
    customerAcceptWindowMinutes: CUSTOMER_ACCEPT_MINUTES,
    status: data.status,
    quoteGroupId: request.quote_group_id,
  })
}
