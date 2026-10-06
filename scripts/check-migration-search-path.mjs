#!/usr/bin/env node
/**
 * A migration that uses PostGIS must put `extensions` on its search_path.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS NEEDS A CHECK AND NOT JUST CARE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Supabase installs PostGIS into the `extensions` schema. A SECURITY
 * DEFINER function pins its own search_path, so one set to `public`
 * alone cannot see ST_Distance or ST_DWithin.
 *
 * The failure mode is what makes it worth automating: the function
 * CREATES successfully. `CREATE FUNCTION` does not resolve names in the
 * body. It fails later, at call time, with
 *
 *   function st_distance(extensions.geography, extensions.geography)
 *   does not exist
 *
 * which reads like a type-casting problem and is a visibility one. So
 * the migration looks applied, and dispatch is broken until somebody
 * makes a booking and reads that message carefully.
 *
 * Migrations 057 and 060 got this right. 082 and 084 did not, and the
 * error surfaced only when the SQL was pasted into production.
 *
 *   node scripts/check-migration-search-path.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const DIR = join(ROOT, 'supabase', 'migrations')

// The PostGIS surface this project actually touches.
const POSTGIS = /\b(ST_Distance|ST_DWithin|ST_SetSRID|ST_MakePoint|ST_X|ST_Y|geography\s*\()/i

const problems = []

for (const file of readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()) {
  const sql = readFileSync(join(DIR, file), 'utf8')

  // Split on function definitions so one file with several functions is
  // judged per function rather than as a whole.
  const parts = sql.split(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i).slice(1)

  for (const part of parts) {
    const head = part.slice(0, part.search(/\bAS\s+\$\$/i) + 1)
    const body = part.slice(head.length)

    // Comments are not code. A file explaining the trap must not trip it.
    const code = body.replace(/^\s*--.*$/gm, '')
    if (!POSTGIS.test(code)) continue

    const sp = head.match(/SET\s+search_path\s*=\s*([^\n]+)/i)
    if (!sp) continue                       // no pinned path: inherits, fine
    if (/extensions/i.test(sp[1])) continue

    const name = part.match(/public\.(\w+)/)?.[1] ?? '(unnamed)'
    problems.push(`${file}  →  ${name}()  has search_path = ${sp[1].trim()}`)
  }
}

if (problems.length) {
  console.error('\n  These functions use PostGIS and cannot see it:\n')
  for (const p of problems) console.error('    ' + p)
  console.error('\n  Add `extensions`:  SET search_path = public, extensions\n')
  process.exit(1)
}

console.log('\n  Every PostGIS function can see PostGIS.\n')
