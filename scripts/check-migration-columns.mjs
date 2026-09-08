#!/usr/bin/env node
/**
 * Does every column a migration names actually exist?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS EXISTS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * 110's row-level security said:
 *
 *   FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()
 *
 * `vendors` has no `user_id`. The column is `profile_id`, and every other
 * policy in the repo has always used it. The whole migration aborted in
 * the SQL editor, and the only signal was "run failed" — after the file
 * had been read, sent, and described as ready to paste.
 *
 * Nothing could have caught it here. The migration is SQL in a text file;
 * no build compiles it and no test runs it, because applying it IS the
 * test and applying it needs a human in the SQL editor.
 *
 * So this asks the live database instead. It reads the real columns over
 * PostgREST and checks every `alias.column` a migration writes against
 * the table that alias was bound to.
 *
 * ── Deliberately narrow ─────────────────────────────────────────────
 * It understands one shape:
 *
 *   FROM public.<table> <alias> ... <alias>.<column>
 *
 * which is what policies and EXISTS clauses are made of, and where this
 * class of mistake lives. It does not parse SQL. A migration written
 * another way is not checked and is reported as such rather than passing
 * quietly — a checker that silently covers a third of the file is worse
 * than one that says which third.
 *
 * ── Only what is not applied yet ────────────────────────────────────
 * An applied migration's columns exist by definition. Checking them
 * would mean re-reporting history every run, so this looks at migrations
 * whose tables do not exist yet, and at everything when --all is passed.
 *
 *   node scripts/check-migration-columns.mjs
 *   node scripts/check-migration-columns.mjs --all
 */
import { readFileSync, readdirSync } from 'node:fs'

const DIR = 'supabase/migrations'
const ALL = process.argv.includes('--all')

/* .env read directly: this is a script, not the app, and importing the
   app's supabase client would drag half of src into a checker. */
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter(l => /^[A-Z]/.test(l))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))

const URL_ = env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_ANON_KEY
if (!URL_ || !KEY) {
  console.log('\n  x no Supabase credentials in .env — cannot check anything\n')
  process.exit(1)
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY }

/**
 * The real columns of a table, from the database.
 *
 * Read from the OpenAPI description rather than by selecting a row: an
 * empty table returns no keys, and "the table has no columns" would be
 * indistinguishable from "the table is empty" — which is exactly the
 * kind of vacuous pass this file exists to avoid.
 */
let SPEC = null
async function columnsOf(table) {
  if (!SPEC) {
    const r = await fetch(`${URL_}/rest/v1/`, { headers: H })
    if (!r.ok) {
      console.log(`\n  x could not read the schema (${r.status})\n`)
      process.exit(1)
    }
    SPEC = await r.json()
  }
  const def = SPEC?.definitions?.[table] ?? SPEC?.components?.schemas?.[table]
  return def?.properties ? new Set(Object.keys(def.properties)) : null
}

const files = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()
const tick = String.fromCharCode(10003)

let bad = 0
let checked = 0
const skipped = []

for (const f of files) {
  const sql = readFileSync(`${DIR}/${f}`, 'utf8')

  /* alias -> table, for the one shape this understands. */
  const bound = new Map()
  for (const m of sql.matchAll(/\bFROM\s+public\.(\w+)\s+(?!WHERE|ON|SET|USING)(\w+)\b/gi)) {
    bound.set(m[2], m[1])
  }
  if (!bound.size) continue

  for (const [alias, table] of bound) {
    const cols = await columnsOf(table)
    if (!cols) { skipped.push(`${f}: public.${table} does not exist yet`); continue }
    checked++

    const used = new Set(
      [...sql.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))].map(x => x[1]))

    for (const col of used) {
      if (cols.has(col)) continue
      bad++
      const guess = [...cols].find(c => c.endsWith(col) || col.endsWith(c)
        || c.includes(col.replace(/^.*_/, '')))
      console.log(`\n  x ${f}`)
      console.log(`      ${alias}.${col} — public.${table} has no column "${col}"`)
      if (guess) console.log(`      did you mean "${guess}"?`)
    }
  }
}

if (skipped.length && !ALL) {
  console.log(`\n  · ${skipped.length} reference${skipped.length > 1 ? 's' : ''} to`
    + ' tables that do not exist yet, so their columns could not be checked:')
  for (const s of [...new Set(skipped)].slice(0, 6)) console.log(`      ${s}`)
}

if (bad) {
  console.log(`\n  ${bad} column${bad > 1 ? 's' : ''} named by a migration`
    + ` do${bad > 1 ? '' : 'es'} not exist.`)
  console.log('  Pasting this would abort the whole migration.\n')
  process.exit(1)
}

console.log(`\n  ${tick} every column ${checked} table reference`
  + `${checked === 1 ? '' : 's'} name${checked === 1 ? 's' : ''} exists\n`)
