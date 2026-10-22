/**
 * Writes a listing's answers into its typed trade-profile table
 * (migrations 173-178, 188) at submit, so the columns fill as partners
 * list, not only when someone runs scripts/backfill-trade-profiles.mjs.
 *
 * The table and column names come from the generated allowlist
 * (config/tradeProfileSchema.js), never from the answers. RLS lets a
 * partner write only rows for their own vendor. A failure here never
 * blocks a submit: the answers are already safe in the listing itself.
 */
import { supabase } from './supabase'
import { schemaFor } from '../config/tradeProfileSchema'

function coerce(type, v) {
  if (v === undefined || v === null || v === '') return null
  switch (type) {
    case 'NUMERIC': case 'INTEGER': { const n = Number(v); return Number.isFinite(n) ? n : null }
    case 'BOOLEAN': return v === true || v === 'true'
    case 'TEXT[]': return Array.isArray(v) ? v.map(String) : [String(v)]
    case 'JSONB': return typeof v === 'object' ? v : null
    default: return Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)
  }
}

export async function writeTradeProfile({ tradeId, vendorId, serviceId, answers, specs }) {
  const schema = schemaFor(tradeId)
  if (!schema?.table || !vendorId || !serviceId) return { skipped: true }
  const row = { vendor_id: vendorId, service_id: serviceId, trade_id: tradeId, source_specs: specs ?? null, updated_at: new Date().toISOString() }
  for (const c of schema.columns ?? []) {
    const val = coerce(c.type, answers?.[c.key])
    if (val !== null) row[c.k] = val
  }
  /* Update-or-insert, not upsert: the unique index on service_id is
     partial (drafts have none), and PostgREST cannot target it. */
  const { data: found } = await supabase.from(schema.table).select('id').eq('service_id', serviceId).maybeSingle()
  const { error } = found
    ? await supabase.from(schema.table).update(row).eq('id', found.id)
    : await supabase.from(schema.table).insert(row)
  if (error) console.warn('typed profile not written', schema.table, error.message)
  return { error }
}
