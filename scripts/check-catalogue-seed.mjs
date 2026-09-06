#!/usr/bin/env node
/**
 * Read the generated seed back and check it holds together.
 *
 * ── Why bother, when a generator wrote it ─────────────────────────────
 * Because it is applied BY HAND. A foreign key that points at nothing
 * fails in the middle of a 2,000-statement paste, rolls the whole
 * transaction back, and costs whoever is at the SQL editor twenty
 * minutes working out which line. Catching it here costs two seconds.
 *
 * It parses the SQL rather than re-reading the JavaScript on purpose. If
 * it re-derived the rows from src/data it would be checking the
 * generator against itself and would agree with any bug they shared.
 *
 *   node scripts/check-catalogue-seed.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'

const FILE = 'supabase/migrations/107_catalogue_seed.generated.sql'
if (!existsSync(FILE)) {
  console.error(`\n  ${FILE} is missing.\n  Run: node scripts/generate-catalogue-seed.mjs\n`)
  process.exit(1)
}
const sql = readFileSync(FILE, 'utf8')

/**
 * Split a VALUES list on TOP-LEVEL commas only.
 *
 * The first version of this used a regex alternation and matched the
 * space after each separator as if it were a value, which shifted every
 * column right and reported perfectly good rows as having a diet of
 * "served with coconut chutney". A quoted string containing a comma is
 * completely ordinary in this data — half the dish notes have one — so
 * the tokeniser has to actually track quote state.
 */
function splitValues(s) {
  const out = []
  let cur = '', inQuote = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuote) {
      if (ch === "'" && s[i + 1] === "'") { cur += "'"; i++; continue }
      if (ch === "'") { inQuote = false; continue }
      cur += ch
    } else if (ch === "'") {
      inQuote = true
    } else if (ch === ',') {
      out.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

const rows = {}
const re = /INSERT INTO public\.(\w+) \(([^)]+)\) VALUES \(([\s\S]*?)\)\n  ON CONFLICT/g
let m
while ((m = re.exec(sql))) {
  const [, table, cols, vals] = m
  const c = cols.split(',').map(x => x.trim())
  const v = splitValues(vals)
  ;(rows[table] ??= []).push(Object.fromEntries(c.map((k, i) => [k, v[i]])))
}

const fails = []
const line = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)
  if (!ok) fails.push(label + (detail ? ` — ${detail}` : ''))
}

console.log('\n  Generated catalogue seed\n')

const tables = Object.keys(rows)
line(tables.length >= 14, `parsed ${tables.length} tables`,
  tables.length < 14 ? 'the parser could not read the file' : '')

/* ── ids unique within each table ─────────────────────────────────── */
{
  const bad = []
  for (const [t, list] of Object.entries(rows)) {
    const seen = new Set()
    for (const r of list) { if (seen.has(r.id)) bad.push(`${t}/${r.id}`); seen.add(r.id) }
  }
  line(!bad.length, 'every id is unique within its table', bad.slice(0, 3).join(', '))
}

/* ── ids unique ACROSS tables ─────────────────────────────────────── */
// Not required by the schema, and worth knowing anyway: one id meaning
// two things is how a stored reference becomes ambiguous later.
{
  const owner = new Map(); const clash = []
  for (const [t, list] of Object.entries(rows)) {
    for (const r of list) {
      if (owner.has(r.id) && owner.get(r.id) !== t) clash.push(`${r.id} in ${owner.get(r.id)} and ${t}`)
      owner.set(r.id, t)
    }
  }
  line(!clash.length, 'no id is used by two different tables', clash.slice(0, 3).join('; '))
}

/* ── foreign keys ─────────────────────────────────────────────────── */
const idsOf = t => new Set((rows[t] ?? []).map(r => r.id))
for (const [from, col, to] of [
  ['catalogue_cuisines', 'region_id', 'catalogue_regions'],
  ['catalogue_dishes', 'cuisine_id', 'catalogue_cuisines'],
  ['catalogue_dishes', 'course_id', 'catalogue_courses'],
  ['catalogue_menu_lines', 'menu_id', 'catalogue_menus'],
  ['listing_services', 'trade_id', 'listing_trades'],
  ['listing_service_variants', 'service_id', 'listing_services'],
  ['listing_answers', 'question_id', 'listing_questions'],
]) {
  const target = idsOf(to)
  const bad = (rows[from] ?? [])
    .filter(r => r[col] && r[col] !== 'NULL' && !target.has(r[col]))
    .map(r => r[col])
  line(!bad.length, `${from}.${col} → ${to}`, bad.slice(0, 3).join(', '))
}

/* ── the CHECK constraints, before Postgres has to enforce them ───── */
{
  const bad = (rows.catalogue_dishes ?? []).filter(r => !['veg', 'nonveg'].includes(r.diet))
  line(!bad.length, 'every dish diet is veg or nonveg',
    bad.slice(0, 3).map(r => `${r.id}=${r.diet}`).join(', '))
}
{
  const bad = (rows.catalogue_menus ?? []).filter(r => !['veg', 'nonveg'].includes(r.diet))
  line(!bad.length, 'every menu diet is veg or nonveg',
    bad.slice(0, 3).map(r => `${r.id}=${r.diet}`).join(', '))
}
{
  const bad = (rows.listing_questions ?? []).filter(r => !['one', 'multi'].includes(r.answer_type))
  line(!bad.length, 'every question is one or multi',
    bad.slice(0, 3).map(r => `${r.id}=${r.answer_type}`).join(', '))
}

/* ── the ids look like ids ────────────────────────────────────────── */
{
  const bad = []
  for (const t of ['catalogue_dishes', 'catalogue_menus', 'catalogue_menu_lines',
                   'listing_trades', 'listing_services', 'listing_questions', 'listing_answers']) {
    for (const r of rows[t] ?? []) if (!/^SBM-[A-Z]{2,3}-/.test(r.id)) bad.push(`${t}/${r.id}`)
  }
  line(!bad.length, 'every generated id starts SBM-', bad.slice(0, 3).join(', '))
}

/* ── the transaction is closed ────────────────────────────────────── */
line(/^BEGIN;/m.test(sql) && /^COMMIT;/m.test(sql),
  'the file is one transaction (a failed paste rolls all the way back)')

/* ── the parts a human actually pastes ──────────────────────────────
   107 is 1.3 MB and the SQL editor refuses it, so the same statements
   are written again to 107_parts/, in pieces small enough to paste.

   A stale parts directory is worse than no parts directory: it looks
   applied and leaves half a catalogue. So the parts are checked against
   the file itself — same statements, same order, nothing dropped. */
const PARTS = 'supabase/migrations/107_parts'
if (!existsSync(PARTS)) {
  line(false, 'the parts directory exists', 'run: node scripts/generate-catalogue-seed.mjs')
} else {
  const files = readdirSync(PARTS).filter(f => f.endsWith('.sql')).sort()
  const stmt = /^INSERT INTO [\s\S]*?;$/gm
  const whole = sql.match(stmt) ?? []
  const text = files.map(f => readFileSync(PARTS + '/' + f, 'utf8'))
  const joined = text.flatMap(t => t.match(stmt) ?? [])

  const named = files.length > 0 && files.every(f => f.endsWith('_of_' + files.length + '.sql'))
  line(named, files.length + ' parts, numbered _of_' + files.length,
    named ? '' : 'left over from an older split: ' + files.join(', '))

  let diff = -1
  for (let i = 0; i < Math.max(whole.length, joined.length); i++) {
    if (whole[i] !== joined[i]) { diff = i; break }
  }
  line(diff === -1, 'the parts are the file, in order (' + joined.length + ' statements)',
    diff === -1 ? '' : 'differ at statement ' + (diff + 1) + ' of ' + whole.length + ' — regenerate')

  line(text.every(t => /^BEGIN;$/m.test(t) && /^COMMIT;$/m.test(t)),
    'each part is its own transaction')

  const big = files.filter((f, i) => text[i].length > 200000)
  line(big.length === 0, 'no part is near the size the editor refused', big.join(', '))
}

const n = t => (rows[t] ?? []).length
const choices = (rows.catalogue_menu_lines ?? []).filter(r => r.has_choice === 'TRUE').length
console.log(`\n  ${n('catalogue_dishes')} dishes · ${n('catalogue_menus')} menus`
  + ` · ${n('catalogue_menu_lines')} lines (${choices} offer a choice)`)
console.log(`  ${n('listing_trades')} trades · ${n('listing_services')} services`
  + ` · ${n('listing_questions')} questions · ${n('listing_answers')} answers`)

/* The bridge, stated every run so it does not quietly stay at zero. */
const resolved = (rows.catalogue_menu_lines ?? []).filter(r => r.dish_id && r.dish_id !== 'NULL').length
console.log(`\n  menu lines resolved to a dish: ${resolved} of ${n('catalogue_menu_lines')}`
  + `  — the bridge menu-card matching will need\n`)

if (fails.length) {
  console.error('  FAILED\n' + fails.map(f => '   · ' + f).join('\n') + '\n')
  process.exit(1)
}
console.log('  Safe to paste.\n')
