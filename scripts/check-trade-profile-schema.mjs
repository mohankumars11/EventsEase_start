#!/usr/bin/env node
/**
 * Verify the applied trade-profile schema against the field map.
 *
 *   node scripts/check-trade-profile-schema.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT "VERIFIED" HAS TO MEAN
 * ══════════════════════════════════════════════════════════════════════
 *
 * The migration's own verification SELECT proves tables were created. It
 * does not prove every question has a column, and that is the thing that
 * actually matters: a missing column does not fail, it silently drops an
 * answer the partner typed.
 *
 * So this walks the generated field map — which comes from the trade
 * specs — and asserts, per trade, that every profile question has a
 * column of the right type in the live database, and that every
 * catalogue field has one in the child table. It fails loudly on a gap
 * and is silent only when all 490-odd columns are present.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  ['.env', '.env.local']
    .flatMap(f => { try { return readFileSync(join(ROOT, f), 'utf8').split('\n') } catch { return [] } })
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const URL_ = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) { console.error('missing supabase env'); process.exit(1) }

const MAP = JSON.parse(readFileSync(join(ROOT, 'docs/partner-onboarding-field-map.json'), 'utf8'))
const RESERVED = new Set(['references', 'group', 'order', 'user', 'default', 'check', 'end', 'in', 'to', 'on'])
const colName = k => (RESERVED.has(k) ? `${k}_value` : k)

/* PostgREST reports an OpenAPI type, not the SQL type. This is the
   mapping back, loose enough not to fail on a cosmetic difference and
   tight enough to catch a text column where an array was intended. */
/* PostgREST describes a jsonb column as {"format":"jsonb"} with NO
   `type` key at all, so comparing against p.type flagged all eight
   jsonb columns as mismatched when the schema was correct. Match on
   format first, fall back to type. */
function typeOk(sqlType, prop) {
  if (sqlType === 'JSONB') return prop.format === 'jsonb'
  if (sqlType === 'TEXT[]') return prop.format?.endsWith('[]') || prop.type === 'array'
  const want = EXPECT[sqlType] ?? []
  return !want.length || want.includes(prop.type)
}

const EXPECT = {
  'TEXT': ['string'],
  'TEXT[]': ['array'],
  'NUMERIC': ['number', 'integer'],
  'BIGINT': ['integer', 'number'],
  'BOOLEAN': ['boolean'],
  'DATE': ['string'],
  'TIME': ['string'],
  'JSONB': ['object', 'array', 'string'],
}

const spec = await (await fetch(`${URL_}/rest/v1/`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json()
const defs = spec.definitions ?? {}

let missingTables = [], missingCols = [], typeMismatch = [], okCols = 0, okTables = 0

for (const trade of MAP.trades) {
  const profileRows = trade.rows.filter(r => r.section_kind === 'screen')
  const itemRows = trade.rows.filter(r => r.section_kind === 'catalogue')

  if (profileRows.length) {
    const t = `partner_${trade.id}_profiles`
    const d = defs[t]
    if (!d) { missingTables.push(t); } else {
      okTables++
      for (const r of profileRows) {
        const c = colName(r.field_key)
        const p = d.properties?.[c]
        if (!p) { missingCols.push(`${t}.${c}  (${r.label})`); continue }
        if (!typeOk(r.sql_type, p)) typeMismatch.push(`${t}.${c}: want ${r.sql_type}, db reports ${p.format ?? p.type}`)
        okCols++
      }
    }
  }

  if (itemRows.length) {
    const t = `partner_${trade.id}_items`
    const d = defs[t]
    if (!d) { missingTables.push(t) } else {
      okTables++
      for (const r of itemRows) {
        const c = colName(r.field_key)
        const p = d.properties?.[c]
        if (!p) { missingCols.push(`${t}.${c}  (${r.label})`); continue }
        if (!typeOk(r.sql_type, p)) typeMismatch.push(`${t}.${c}: want ${r.sql_type}, db reports ${p.format ?? p.type}`)
        okCols++
      }
    }
  }
}

console.log(`tables found        : ${okTables}`)
console.log(`columns verified    : ${okCols}`)
console.log(`missing tables      : ${missingTables.length}`)
console.log(`missing columns     : ${missingCols.length}`)
console.log(`type mismatches     : ${typeMismatch.length}`)

const show = (label, list) => {
  if (!list.length) return
  console.log(`\n${label}:`)
  for (const x of list.slice(0, 60)) console.log(`  ${x}`)
  if (list.length > 60) console.log(`  … and ${list.length - 60} more`)
}
show('MISSING TABLES', missingTables)
show('MISSING COLUMNS', missingCols)
show('TYPE MISMATCHES', typeMismatch)

const bad = missingTables.length + missingCols.length + typeMismatch.length
console.log(bad ? `\nFAIL — ${bad} problem(s)` : '\nPASS — every onboarding question has a typed column')
process.exit(bad ? 1 : 0)
