#!/usr/bin/env node
/**
 * Phase 2 backfill: move onboarding answers out of JSONB into the typed
 * trade-profile tables.
 *
 *   node scripts/backfill-trade-profiles.mjs            # dry run
 *   node scripts/backfill-trade-profiles.mjs --write    # actually write
 *
 * Requires migrations 173-178 to be applied first.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT ONE UPDATE STATEMENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `specs->>field_key` looks like it would do the whole job and it would
 * quietly do half of it. Sampled rows carry namespaced keys —
 * `emcee:hours`, `emcee:languages`, `anchor_v3` — alongside plain ones,
 * and a nested `answers` object. A SQL backfill keyed on the field name
 * finds the plain ones, misses the rest, and reports success.
 *
 * So each key is resolved through an explicit chain of candidates, and
 * anything that resolves to nothing is REPORTED rather than written as
 * NULL and forgotten. The run prints what it could not place; that list
 * is the actual output of this script, more than the rows it writes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOTHING IS DESTROYED
 * ══════════════════════════════════════════════════════════════════════
 *
 * `vendor_services.specs` is left exactly as it is. The whole original
 * blob is also copied into `source_specs` on the profile row, so the
 * typed columns can be re-derived or audited later without going back
 * to the service table. Legacy storage is removed only once the typed
 * representation has been validated — not by this script.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write')

const env = Object.fromEntries(
  ['.env', '.env.local']
    .flatMap(f => { try { return readFileSync(join(ROOT, f), 'utf8').split('\n') } catch { return [] } })
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const URL_ = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) { console.error('missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }

const MAP = JSON.parse(readFileSync(join(ROOT, 'docs/partner-onboarding-field-map.json'), 'utf8'))
const RESERVED = new Set(['references', 'group', 'order', 'user', 'default', 'check', 'end', 'in', 'to', 'on'])
const colName = k => (RESERVED.has(k) ? `${k}_value` : k)

const get = async q => {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: H })
  if (!r.ok) throw new Error(`${q} -> ${r.status} ${await r.text()}`)
  return r.json()
}

/* Where an answer might hide, in order of preference. The namespaced
   forms come from the older anchor/emcee flows; `answers` is a nested
   bag some drafts use. */
function resolve(specs, key) {
  if (!specs || typeof specs !== 'object') return undefined
  const direct = specs[key]
  if (direct !== undefined) return direct
  const nested = specs.answers && typeof specs.answers === 'object' ? specs.answers[key] : undefined
  if (nested !== undefined) return nested
  const suffix = Object.keys(specs).find(k => k.includes(':') && k.split(':').pop() === key)
  if (suffix) return specs[suffix]
  return undefined
}

/* The column is typed now, so a value that cannot be coerced is a
   mapping problem to report, not something to force in. */
function coerce(value, sqlType) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  if (sqlType === 'TEXT[]') {
    if (Array.isArray(value)) return { ok: true, value: value.map(String) }
    if (typeof value === 'string') return { ok: true, value: [value] }
    return { ok: false, why: `expected array, got ${typeof value}` }
  }
  if (sqlType === 'BOOLEAN') {
    if (typeof value === 'boolean') return { ok: true, value }
    if (value === 'true' || value === 'false') return { ok: true, value: value === 'true' }
    return { ok: false, why: `expected boolean, got ${JSON.stringify(value)}` }
  }
  if (sqlType === 'NUMERIC' || sqlType === 'BIGINT') {
    const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
    if (!Number.isFinite(n)) return { ok: false, why: `expected number, got ${JSON.stringify(value)}` }
    return { ok: true, value: sqlType === 'BIGINT' ? Math.round(n) : n }
  }
  if (sqlType === 'JSONB') return { ok: true, value }
  if (Array.isArray(value)) return { ok: true, value: value.join(', ') }
  if (typeof value === 'object') return { ok: false, why: 'object into a text column' }
  return { ok: true, value: String(value) }
}

const byTrade = Object.fromEntries(MAP.trades.map(t => [t.id, t]))

/* vendor_services.category holds the trade label, not the registry id,
   so the registry does the translation rather than a guess. */
const registry = await get('sambramo_trade_registry?select=id,name,catalogue_key&limit=50')
const tradeOf = label => {
  if (!label) return null
  const s = String(label).trim().toLowerCase()
  return registry.find(r => r.name.toLowerCase() === s
    || r.id === s
    || r.catalogue_key === s)?.id ?? null
}

const services = await get('vendor_services?select=id,vendor_id,category,specs&limit=5000')
const withSpecs = services.filter(s => s.specs && Object.keys(s.specs).length)

console.log(`vendor_services rows        : ${services.length}`)
console.log(`with non-empty specs        : ${withSpecs.length}`)
console.log(`mode                        : ${WRITE ? 'WRITE' : 'dry run (pass --write to apply)'}\n`)

const unmapped = []       // specs keys with no column
const uncoerced = []      // values that would not fit the column type
const noTrade = []        // service rows whose category matches no trade
let planned = 0, wrote = 0, failed = 0
const placedByTrade = new Map(), fieldsByTrade = new Map(), rowsByTrade = new Map()

for (const svc of withSpecs) {
  const tid = tradeOf(svc.category)
  if (!tid) { noTrade.push(`${svc.id} category=${JSON.stringify(svc.category)}`); continue }
  const trade = byTrade[tid]
  if (!trade) { noTrade.push(`${svc.id} trade=${tid} (no spec file)`); continue }

  const fields = trade.rows.filter(r => r.section_kind === 'screen')
  const row = { vendor_id: svc.vendor_id, service_id: svc.id, trade_id: tid, source_specs: svc.specs, backfilled_at: new Date().toISOString() }
  let placed = 0

  for (const f of fields) {
    const raw = resolve(svc.specs, f.field_key)
    if (raw === undefined) continue
    const c = coerce(raw, f.sql_type)
    if (!c.ok) { uncoerced.push(`${tid}.${f.field_key}: ${c.why}`); continue }
    if (c.value !== null) { row[colName(f.field_key)] = c.value; placed++ }
  }

  const known = new Set(fields.map(f => f.field_key))
  for (const k of Object.keys(svc.specs)) {
    const base = k.includes(':') ? k.split(':').pop() : k
    if (!known.has(base) && base !== 'answers') unmapped.push(`${tid}: ${k}`)
  }

  planned++
  placedByTrade.set(tid, (placedByTrade.get(tid) ?? 0) + placed)
  fieldsByTrade.set(tid, fields.length)
  rowsByTrade.set(tid, (rowsByTrade.get(tid) ?? 0) + 1)
  if (!WRITE) continue

  /* Update-or-insert: the unique index on service_id is partial, so
     PostgREST's on_conflict upsert cannot target it. */
  const base = `${URL_}/rest/v1/partner_${tid}_profiles`
  const look = await fetch(`${base}?service_id=eq.${svc.id}&select=id`, { headers: H })
  const have = look.ok ? await look.json() : []
  const res = have.length
    ? await fetch(`${base}?id=eq.${have[0].id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(row) })
    : await fetch(base, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(row) })
  if (res.ok) { wrote++ } else { failed++; console.error(`  write failed ${tid} ${svc.id}: ${res.status} ${(await res.text()).slice(0, 160)}`) }
}

const tally = list => {
  const m = new Map()
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

console.log(`profile rows planned        : ${planned}`)
if (WRITE) console.log(`written                     : ${wrote}   failed: ${failed}`)

console.log(`\nspecs keys with NO column (${new Set(unmapped).size} distinct):`)
for (const [k, n] of tally(unmapped).slice(0, 40)) console.log(`  ${String(n).padStart(3)} x  ${k}`)

if (uncoerced.length) {
  console.log(`\nvalues that would not fit their column (${new Set(uncoerced).size} distinct):`)
  for (const [k, n] of tally(uncoerced).slice(0, 25)) console.log(`  ${String(n).padStart(3)} x  ${k}`)
}
if (noTrade.length) {
  console.log(`\nservice rows with no matching trade (${noTrade.length}):`)
  for (const s of noTrade.slice(0, 15)) console.log(`  ${s}`)
}
console.log('\nvendor_services.specs was not modified.')
