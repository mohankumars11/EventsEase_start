#!/usr/bin/env node
/**
 * The safe workflow for changing 360° recommendation rules — no admin UI
 * needed, nothing reaches customers until it validates and passes tests.
 *
 *   node scripts/rules360.mjs validate                 check src/customer/data/rules360.js
 *   node scripts/rules360.mjs export [file.json]       write the rules as JSON (to review / edit)
 *   node scripts/rules360.mjs preview <occasion> '<ctx json>'   what a customer would see
 *   node --env-file=.env scripts/rules360.mjs publish [file.json] --notes "why"
 *        validate → run the test suite → insert as a new version → publish it
 *        (the previous published version is retired; the trigger audits both)
 *   node --env-file=.env scripts/rules360.mjs rollback <version>
 *        re-publish an earlier version
 *   node --env-file=.env scripts/rules360.mjs history
 *
 * publish / rollback / history use the service role from the operator's own
 * .env and run on the operator's machine only — never in the app. Migration
 * 190 must be applied first.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const [cmd, a1, a2] = process.argv.slice(2)
const out = join(ROOT, 'node_modules/.cache/rules360.cli.mjs')
mkdirSync(dirname(out), { recursive: true })
await build({ stdin: { contents: "export * from './src/customer/lib/recommend360.js'; export * from './src/customer/data/rules360.js'; export { BASELINE } from './src/customer/data/catalogue360.generated.js'", resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.js': 'jsx' } })
const E = await import(pathToFileURL(out).href + `?t=${Date.now()}`)

const load = file => (file && file.endsWith('.json') ? JSON.parse(readFileSync(file, 'utf8')) : { version: E.RULES_VERSION, rules: E.RULES })
const check = set => {
  const errs = E.validateRules(set.rules)
  if (!set.version) errs.push('version missing')
  if (errs.length) { errs.forEach(e => console.error('  ✗', e)); process.exit(1) }
  /* every occasion must still evaluate */
  for (const id of Object.keys(E.BASELINE ?? {})) E.recommend(id, {}, { rules: set.rules, ruleVersion: set.version })
  console.log(`  ✓ ${set.rules.length} rules valid (${set.version})`)
}
const flag = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null }

async function rest(path, init = {}) {
  const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!U || !K) { console.error('needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (node --env-file=.env)'); process.exit(1) }
  const r = await fetch(`${U}/rest/v1/${path}`, { ...init, headers: { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) } })
  const body = await r.text()
  if (!r.ok) { console.error(`${path}: ${r.status} ${body.slice(0, 300)}`); process.exit(1) }
  return body ? JSON.parse(body) : null
}

if (cmd === 'validate') check(load(a1))
else if (cmd === 'export') {
  const file = a1 ?? join(ROOT, `rules360-${E.RULES_VERSION}.json`)
  writeFileSync(file, JSON.stringify({ version: E.RULES_VERSION, rules: E.RULES }, null, 2))
  console.log(`wrote ${file}`)
} else if (cmd === 'preview') {
  const r = E.recommend(a1, a2 ? JSON.parse(a2) : {})
  for (const p of r.phases) console.log(`${p.title}: ${p.tradeIds.join(', ')}`)
  for (const q of r.followUps) console.log(`ask: ${q.text} (${q.trades.join(', ')})`)
} else if (cmd === 'publish') {
  const set = load(a1)
  check(set)
  execSync('node --test tests/recommend360.test.mjs', { cwd: ROOT, stdio: 'inherit' })
  await rest('recommendation_rule_versions?status=eq.published', { method: 'PATCH', body: JSON.stringify({ status: 'retired' }) })
  const [row] = await rest('recommendation_rule_versions', { method: 'POST', body: JSON.stringify({ version: set.version, rules: set.rules, status: 'published', notes: flag('--notes'), published_at: new Date().toISOString() }) })
  console.log(`published ${row.version} (${row.id})`)
} else if (cmd === 'rollback') {
  if (!a1) { console.error('rollback <version>'); process.exit(1) }
  const [target] = await rest(`recommendation_rule_versions?version=eq.${encodeURIComponent(a1)}&select=id,version,rules`)
  if (!target) { console.error(`no version ${a1}`); process.exit(1) }
  check({ version: target.version, rules: target.rules })
  await rest('recommendation_rule_versions?status=eq.published', { method: 'PATCH', body: JSON.stringify({ status: 'retired' }) })
  await rest(`recommendation_rule_versions?id=eq.${target.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }) })
  console.log(`re-published ${a1}`)
} else if (cmd === 'history') {
  for (const r of await rest('recommendation_rule_audit?select=at,version,action,detail&order=at.desc&limit=30')) console.log(r.at, r.version, r.action, JSON.stringify(r.detail))
} else {
  console.log('usage: rules360.mjs validate | export [file] | preview <occasion> [ctx] | publish [file] --notes "…" | rollback <version> | history')
}
