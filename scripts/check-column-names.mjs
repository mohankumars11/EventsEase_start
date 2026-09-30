#!/usr/bin/env node
/**
 * Does every column this app writes actually exist?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The onboarding bank form wrote `account_holder`. The column has been
 * called `account_name` since migration 090 created the table, and the
 * older form on the More tab had it right — two forms writing one table
 * and only one of them ever checked against the schema.
 *
 * Nothing caught it. It is not a syntax error, esbuild has no opinion,
 * and the render guards mount the screen without submitting it. It
 * failed at the only moment it could: a real partner typing real bank
 * details, who got "Could not find the 'account_holder' column of
 * 'vendor_payout_details' in the schema cache" printed on the screen
 * under their IFSC.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HOW
 * ══════════════════════════════════════════════════════════════════════
 *
 * PostgREST publishes an OpenAPI document describing every table and
 * column it can see. That is the same schema cache the error message
 * comes from, so it is the right authority — not the migration files,
 * which say what SHOULD be there and have been wrong before (123 exists
 * because the live database carried policies absent from the repo).
 *
 * Then every `.from('x').insert|update|upsert({ ... })` in src/ is read
 * and its keys are checked against that table.
 *
 *   node scripts/check-column-names.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]))

const KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_ANON_KEY

const spec = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/openapi+json' },
}).then(r => r.json()).catch(() => null)

const defs = spec?.definitions ?? spec?.components?.schemas ?? null
if (!defs || !Object.keys(defs).length) {
  console.error('\n  Could not read the schema from PostgREST.\n')
  process.exitCode = 1
}

const COLUMNS = Object.fromEntries(
  Object.entries(defs ?? {}).map(([t, d]) => [t, new Set(Object.keys(d.properties ?? {}))]))

/* ── Every source file ─────────────────────────────────────────────── */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(p)
  }
  return out
}

/* `.from('table')` … `.insert({ … })`, allowing whitespace, chained
   calls and a leading array. Deliberately conservative: a write whose
   payload is a variable rather than a literal is skipped rather than
   guessed at, because a false alarm in a guard is how a guard starts
   being ignored.

   The gap may not contain another `.from(`: without that, a 400-char
   window happily jumps a statement boundary and attributes one
   table's write to the table named above it. It did exactly that on
   its first run and reported a bug in partnerListings.js that was not
   there. */
const WRITE = /\.from\(\s*['"`]([a-z0-9_]+)['"`]\s*\)((?:(?!\.from\()[\s\S]){0,400}?)\.(insert|update|upsert)\(\s*(\[\s*)?\{([\s\S]{0,1200}?)\}/g

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, checked = 0, skipped = 0

for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(WRITE)) {
    const [, table, , op, , body] = m

    const cols = COLUMNS[table]
    if (!cols) { skipped++; continue }   // a view or an RPC target, not a table

    /* Top-level keys only. A nested object's keys belong to a jsonb
       column and are not column names. */
    let depth = 0
    const keys = []
    for (const part of body.split('\n')) {
      const opens = (part.match(/[[{(]/g) ?? []).length
      const closes = (part.match(/[\]})]/g) ?? []).length
      if (depth === 0) {
        const k = part.match(/^\s*([a-z_][a-z0-9_]*)\s*:/i)
        if (k) keys.push(k[1])
      }
      depth += opens - closes
      if (depth < 0) depth = 0
    }

    for (const k of keys) {
      checked++
      if (!cols.has(k)) {
        bad++
        const line = src.slice(0, m.index).split('\n').length
        console.log(`  ${cross} ${relative('.', file)}:${line}`)
        console.log(`      ${op} into ${table} sets "${k}", which that table does not have.`)
        const near = [...cols].filter(c => c.includes(k.split('_')[0]) || k.includes(c.split('_')[0]))
        if (near.length) console.log(`      Did you mean: ${near.join(', ')}`)
      }
    }
  }
}

console.log(`\n${bad ? cross : tick} ${checked - bad}/${checked} column names exist`
  + (skipped ? ` (${skipped} writes to views or unknown tables skipped)` : ''))
process.exitCode = bad ? 1 : 0
