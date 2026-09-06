#!/usr/bin/env node
/**
 * Apply 107 — the catalogue seed — over PostgREST.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * 107 is 1.3 MB. The Supabase SQL editor refuses it outright, and psql
 * is not installed on this machine and the database password is not in
 * the repo. But 107 contains no DDL — 105 and 106 made the tables, and
 * every statement here is an upsert of one row. Rows can go through
 * PostgREST with the service role key, which IS in .env.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT APPLIES THE REVIEWED FILE, NOT A SECOND OPINION
 * ══════════════════════════════════════════════════════════════════════
 *
 * This reads 107 and replays it. It does NOT re-derive rows from
 * src/data — that would be a second implementation of the generator,
 * free to disagree with the file everyone reviewed, and the disagreement
 * would only show up as wrong data in production.
 *
 * ── Order is a foreign key ───────────────────────────────────────────
 * A dish needs its cuisine; an answer needs its question. Statements are
 * emitted parent-first, and consecutive rows for the same table are
 * batched WITHOUT reordering, so the sequence that made the file valid
 * is the sequence that reaches the database.
 *
 * ── There is no transaction ──────────────────────────────────────────
 * PostgREST gives one per request, not one across 3,191 rows. So a
 * failure halfway leaves a partial catalogue. That is survivable only
 * because every write is an upsert on the id: fix the cause, run it
 * again, and the rows that landed are overwritten with themselves.
 * Nothing here deletes.
 *
 *   node scripts/apply-catalogue-seed.mjs            # dry run, writes nothing
 *   node scripts/apply-catalogue-seed.mjs --apply    # writes
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const FILE = 'supabase/migrations/107_catalogue_seed.generated.sql'
const APPLY = process.argv.includes('--apply')
const BATCH = 400

/* ── .env, read directly: this is a script, not the app ─────────────── */
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const URL = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('\n  .env is missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY\n')
  process.exit(1)
}

/* ══════════════════════════════════════════════════════════════════════
   READING SQL LITERALS BACK
   ══════════════════════════════════════════════════════════════════════

   Splitting on commas is the bug that already bit the throwaway version
   of the seed checker: half the dish notes contain a comma inside their
   quotes ("Mini cocktail size, served with coconut chutney"), so a naive
   split shifts every column right and a dish quietly acquires a diet of
   "served with coconut chutney".

   Quote state is tracked, and WHETHER A TOKEN WAS QUOTED is kept — it is
   the only thing separating the SQL keyword NULL from a five-character
   string that happens to spell it. */
function tokenise(s) {
  const out = []
  let cur = '', quoted = false, inQuote = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuote) {
      if (ch === "'" && s[i + 1] === "'") { cur += "'"; i++; continue }
      if (ch === "'") { inQuote = false; continue }
      cur += ch
    } else if (ch === "'") {
      inQuote = true; quoted = true
    } else if (ch === ',') {
      out.push({ text: cur.trim(), quoted }); cur = ''; quoted = false
    } else {
      cur += ch
    }
  }
  out.push({ text: cur.trim(), quoted })
  return out
}

const value = ({ text, quoted }) => {
  if (quoted) return text
  if (text === 'NULL') return null
  if (text === 'TRUE') return true
  if (text === 'FALSE') return false
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  return text
}

const sql = readFileSync(FILE, 'utf8')
const re = /INSERT INTO public\.(\w+) \(([^)]+)\) VALUES \(([\s\S]*?)\)\n  ON CONFLICT/g

const statements = []
let m
while ((m = re.exec(sql))) {
  const [, table, cols, vals] = m
  const c = cols.split(',').map(x => x.trim())
  const v = tokenise(vals).map(value)
  if (c.length !== v.length) {
    console.error(`\n  ${table}: ${c.length} columns, ${v.length} values — parser is wrong, refusing\n`)
    process.exit(1)
  }
  statements.push({ table, row: Object.fromEntries(c.map((k, i) => [k, v[i]])) })
}

/* Consecutive rows for one table become one request. Order is never
   changed, so parents still land before children. */
const batches = []
for (const s of statements) {
  const last = batches[batches.length - 1]
  if (last && last.table === s.table && last.rows.length < BATCH) last.rows.push(s.row)
  else batches.push({ table: s.table, rows: [s.row] })
}

const counts = {}
for (const s of statements) counts[s.table] = (counts[s.table] ?? 0) + 1

console.log(`\n  ${FILE}`)
console.log(`  ${statements.length} rows · ${batches.length} requests\n`)
for (const [t, n] of Object.entries(counts)) console.log(`   ${String(n).padStart(5)}  ${t}`)

if (!APPLY) {
  console.log(`\n  Dry run — nothing written.`)
  console.log(`  To write:  node scripts/apply-catalogue-seed.mjs --apply\n`)
  process.exit(0)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

console.log(`\n  writing to ${URL}\n`)
let done = 0
for (const [i, b] of batches.entries()) {
  const { error } = await db.from(b.table).upsert(b.rows, { onConflict: 'id' })
  if (error) {
    console.error(`\n  FAILED on request ${i + 1}/${batches.length} · ${b.table}`)
    console.error(`  ${error.message}`)
    if (error.details) console.error(`  ${error.details}`)
    console.error(`\n  ${done} rows are in. Every write is an upsert, so fix the`)
    console.error(`  cause and run this again — the rows that landed are simply`)
    console.error(`  rewritten with themselves.\n`)
    process.exit(1)
  }
  done += b.rows.length
  process.stdout.write(`\r  ${done} / ${statements.length} rows`)
}

/* ══════════════════════════════════════════════════════════════════
   WHAT "APPLIED" MEANS, AND WHY IT IS NOT AN EQUAL SIGN
   ══════════════════════════════════════════════════════════════════

   This used to compare row counts and fail on any difference. That is
   the wrong test in one direction.

   The seed is an UPSERT, not a mirror. Ids are append-only, so when a
   catalogue entry is replaced — Transportation's five vehicle names
   became twenty-four, and `tempo`, `bus` and `goods` went — the seed
   stops emitting three rows but the DATABASE MUST KEEP THEM. A partner
   who ticked "Goods vehicle" has SBM-SPC-118 saved in their specs, and
   deleting the row turns their answer into an id with no label.

   So the two directions are not the same failure:

     a row the file has and the database does not   → the apply broke
     a row the database has and the file does not   → retired, keep it

   Retired rows are named rather than counted, because a list of three
   ids is inspectable and "1666 ≠ 1663" is not. */
console.log(`\n\n  ── what is actually in the database now ──`)
let missing = false
const retired = {}

for (const t of Object.keys(counts)) {
  const { count, error } = await db.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    missing = true
    console.log(`  x ${String('—').padStart(5)}  ${t}   ${error.message}`)
    continue
  }
  const extra = count - counts[t]
  if (extra < 0) missing = true

  /* Name the extras. Read in pages because a table can be past the
     PostgREST default limit and a short read would invent a mismatch. */
  if (extra > 0) {
    const inFile = new Set(
      statements.filter(x => x.table === t).map(x => String(x.row.id)))
    const rows = []
    for (let from = 0; ; from += 1000) {
      const page = await db.from(t).select('id').range(from, from + 999)
      if (page.error) break
      rows.push(...page.data)
      if (page.data.length < 1000) break
    }
    retired[t] = rows.map(r => r.id).filter(id => !inFile.has(String(id)))
  }

  const mark = extra < 0 ? 'x' : String.fromCharCode(10003)
  console.log(`  ${mark} ${String(count).padStart(5)}  ${t}`
    + (extra < 0 ? `   ${-extra} MISSING — expected ${counts[t]}` : '')
    + (extra > 0 ? `   ${extra} retired, kept on purpose` : ''))
}

for (const [t, ids] of Object.entries(retired)) {
  if (!ids.length) continue
  console.log(`\n  retired in ${t}, still in the database so saved answers keep`)
  console.log(`  their label: ${ids.join(', ')}`)
}

console.log(missing
  ? `\n  Rows the file has are not in the database. Run this again.\n`
  : `\n  107 is applied.\n`)
process.exit(missing ? 1 : 0)
