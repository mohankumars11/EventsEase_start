#!/usr/bin/env node
/**
 * The admin console's registry and its screens agree.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DRIFT THIS EXISTS FOR
 * ══════════════════════════════════════════════════════════════════════
 *
 * `config/adminNav.js` says what screens exist — the sidebar, the ⌘K
 * palette and the page header all read it. `AdminDashboard` says what
 * each one RENDERS. Two lists, and nothing made them agree.
 *
 * Both failure directions are silent and neither is a build error:
 *
 *   - a nav item with no screen renders the partner console under
 *     somebody else's title, which looks like a bug in the console
 *     rather than a missing entry.
 *   - a screen with no nav item is unreachable, and its author will
 *     swear it was added.
 *
 * It also checks the things a console full of money buttons must not
 * get wrong: every RPC named in an admin screen must exist in a
 * migration with the parameters the screen sends, and no admin screen
 * may write a money table directly instead of going through the
 * operator-gated function.
 *
 *   node scripts/check-admin-console.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => { try { return readFileSync(join(ROOT, p), 'utf8') } catch { return null } }

let ran = 0, bad = 0
const ok = (name, cond, detail) => {
  ran++
  if (cond) { console.log(`  ✓ ${name}`); return }
  bad++
  console.log(`  ✗ ${name}${detail ? `   <-- ${detail}` : ''}`)
}

console.log('\n  The admin console is wired to itself\n')

const navSrc = read('src/config/adminNav.js')
const dashSrc = read('src/pages/dashboard/AdminDashboard.jsx')
ok('the nav registry exists', !!navSrc)
ok('the dashboard exists', !!dashSrc)

/* ── 1 · the two lists agree ────────────────────────────────────── */
const navIds = [...(navSrc ?? '').matchAll(/^\s*id: '([a-z-]+)', label:/gm)].map(m => m[1])
const screenIds = [...(dashSrc ?? '').matchAll(/^\s*'([a-z-]+)':\s*[A-Z]\w+,/gm)].map(m => m[1])

ok('the registry declares screens', navIds.length > 0, `found ${navIds.length}`)
ok('the dashboard maps screens', screenIds.length > 0, `found ${screenIds.length}`)

const noScreen = navIds.filter(id => !screenIds.includes(id))
const noNav = screenIds.filter(id => !navIds.includes(id))
ok('every nav item has a screen', noScreen.length === 0,
   noScreen.length ? `${noScreen.join(', ')} would render the default under the wrong title` : '')
ok('every screen has a nav item', noNav.length === 0,
   noNav.length ? `${noNav.join(', ')} is unreachable` : '')

/* ── 2 · every screen file is really there ──────────────────────── */
const imports = Object.fromEntries(
  [...(dashSrc ?? '').matchAll(/import (\w+) from '([^']+)'/g)].map(m => [m[1], m[2]]))
const mapped = [...(dashSrc ?? '').matchAll(/^\s*'([a-z-]+)':\s*(\w+),/gm)].map(m => m[2])
/* Resolved properly, relative to the dashboard file. The first version
   of this stripped ONE leading '../' with a regex, so '../../components'
   became 'src/../components' and every screen looked missing — a guard
   that cries wolf about eleven real files teaches people to ignore it. */
const DASH_DIR = 'src/pages/dashboard'
const missingFile = mapped.filter(name => {
  const rel = imports[name]
  if (!rel) return true
  /* posix.resolve, not resolve: on Windows resolve('/') yields 'D:\' and
     slicing the leading character ate the drive letter, so every path
     came out as ':/src/...' and all eleven screens looked missing. A
     module specifier is a posix path whatever the host filesystem is. */
  const base = posix.resolve('/', DASH_DIR, rel).slice(1)
  return !read(`${base}.jsx`) && !read(`${base}.js`) && !read(base)
})
ok('every mapped screen resolves to a file', missingFile.length === 0, missingFile.join(', '))

/* ── 3 · screens are addressable ────────────────────────────────── */
ok('the active screen lives in the URL, not local state',
   /useSearchParams/.test(dashSrc ?? '') && !/useState\(['"]partners['"]\)/.test(dashSrc ?? ''),
   'a console nobody can link into is a console nobody can be sent to')

/* ── 4 · money goes through the operator-gated RPCs ─────────────── */
const adminDir = 'src/components/admin'
const adminFiles = readdirSync(join(ROOT, adminDir)).filter(f => f.endsWith('.jsx'))
const codeOf = s => (s ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ')

const MONEY_TABLES = ['partner_adjustments', 'escrow_ledger', 'payout_claims', 'payout_batches', 'money_audit']
const directWrites = []
for (const f of adminFiles) {
  const code = codeOf(read(`${adminDir}/${f}`))
  for (const t of MONEY_TABLES) {
    const re = new RegExp(`from\\(['"]${t}['"]\\)[\\s\\S]{0,80}?\\.(insert|update|delete|upsert)\\(`)
    if (re.test(code)) directWrites.push(`${f} → ${t}`)
  }
}
ok('no admin screen writes a money table directly', directWrites.length === 0,
   directWrites.length ? `${directWrites.join(', ')} — use the operator-gated RPC` : '')

/* ── 5 · every RPC an admin screen calls exists, with those params ─ */
const migs = readdirSync(join(ROOT, 'supabase/migrations'))
  .filter(f => f.endsWith('.sql'))
  .map(f => read(`supabase/migrations/${f}`) ?? '')
  .join('\n')

const called = new Set()
for (const f of adminFiles) {
  const code = codeOf(read(`${adminDir}/${f}`))
  for (const m of code.matchAll(/\b(?:rpc|call)\(\s*['"]([a-z_]+)['"]/g)) called.add(m[1])
}
const unknown = [...called].filter(fn =>
  !new RegExp(`(create or replace function|CREATE OR REPLACE FUNCTION)\\s+public\\.${fn}\\b`, 'i').test(migs))
ok(`every RPC an admin screen calls is defined in a migration (${called.size} checked)`,
   unknown.length === 0, unknown.join(', '))

/* The one I got wrong by guessing: the parameter name. */
const paramMisses = []
for (const f of adminFiles) {
  const code = codeOf(read(`${adminDir}/${f}`))
  for (const m of code.matchAll(/\b(?:rpc|call)\(\s*['"]([a-z_]+)['"]\s*,\s*\{([^}]*)\}/g)) {
    const [, fn, args] = m
    const sig = new RegExp(`function\\s+public\\.${fn}\\s*\\(([^)]*)\\)`, 'i').exec(migs)
    if (!sig) continue
    const declared = [...sig[1].matchAll(/\b(p_\w+)/g)].map(x => x[1])
    for (const a of [...args.matchAll(/\b(p_\w+)\s*:/g)].map(x => x[1])) {
      if (!declared.includes(a)) paramMisses.push(`${f}: ${fn}(${a}) — declared: ${declared.join(', ')}`)
    }
  }
}
ok('and sends the parameter names that function declares', paramMisses.length === 0,
   paramMisses.join(' | '))

/* ── 6 · a missing table is a feature that is off, not a crash ──── */
const newScreens = ['MaterialsAdvances.jsx', 'MoneyConsole.jsx', 'AuditTrail.jsx']
const unguarded = newScreens.filter(f => {
  const code = codeOf(read(`${adminDir}/${f}`))
  return code && !/42P01|does not exist/.test(code)
})
ok('screens over hand-applied tables tolerate the table being absent',
   unguarded.length === 0,
   unguarded.length ? `${unguarded.join(', ')} will throw before the migration is pasted` : '')

console.log(`\n${bad ? '✗' : '✓'} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
