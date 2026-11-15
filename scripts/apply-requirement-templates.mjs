#!/usr/bin/env node
/**
 * Generate and load the 34 requirement templates (migration 203).
 *
 *   node --env-file=.env scripts/apply-requirement-templates.mjs           # dry run
 *   node --env-file=.env scripts/apply-requirement-templates.mjs --apply
 *
 * ══════════════════════════════════════════════════════════════════════
 * GENERATED, NOT TRANSCRIBED
 * ══════════════════════════════════════════════════════════════════════
 * The questions come from src/customer/lib/needs.js, which itself derives
 * them from the partner app's own listing definitions in
 * src/data/trades/<trade>.js. So a customer's option is literally the
 * option a partner ticked, and a new option appears on both sides at
 * once. Hand-writing these rows would be wrong within a week of the next
 * spec edit, and wrong in ways nobody would notice.
 *
 * ── Which answers are MANDATORY ───────────────────────────────────────
 * Exactly the ones in src/customer/data/requiredAnswers.js — what a master
 * cannot quote without — and only where the customer is actually asked.
 * The plan sheet reads the same list and always asks those first.
 *
 * It used to be every question a partner had to DECLARE that the customer
 * is also offered (sambramo_trade_registry.required_answers ∩ asked). That
 * made photography need "specialties" and "formats" and a DJ five answers,
 * while the plan sheet never asks most of them — a request could never
 * have become ready. Partners' declarations are preferences to match on,
 * not requirements to book (changed 2026-11-03).
 *
 * Nothing is marked mandatory that the customer is not actually shown.
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')

/* needs.js imports Vite-style extensionless paths, which Node will not
   resolve, so it is bundled first — the same reason
   scripts/build-onboarding-field-map.mjs bundles rather than importing. */
const TMP = mkdtempSync(join(tmpdir(), 'sb-reqtpl-'))
const entry = join(TMP, 'needs.mjs')
await esbuild.build({
  stdin: { resolveDir: ROOT, loader: 'js', contents: `
    export * from './src/customer/lib/needs'
    export { REQUIRED } from './src/customer/data/requiredAnswers'` },
  outfile: entry, bundle: true, format: 'esm', platform: 'node',
  logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', '@supabase/supabase-js'],
})
const { needsFor, loadCuisines, loadExperienceTiers, experienceTiers, REQUIRED } = await import(pathToFileURL(entry).href)

function fieldsFor(trade) {
  /* The experience (migration 208) leads, when the trade has one. Optional:
     a customer may skip it and state their own hours instead. Its options
     are the tier keys, so the server refuses an experience that does not
     exist; an admin renaming "Complete Story" changes no stored answer. */
  const tiers = experienceTiers(trade.id)
  const tierField = tiers.length ? [{ key: '$tier', title: 'Choose the experience', kind: 'single', group: 'experience', required: false,
    options: tiers.map(t => ({ value: t.tier, label: t.name })) }] : []
  const asked = needsFor(trade.id) ?? []
  /* Required = src/customer/data/requiredAnswers.js, the one list the plan
     sheet also reads — never the partner's own onboarding list. */
  const essential = new Set(REQUIRED[trade.id] ?? [])
  return [...tierField, ...asked.map(q => ({
    key: q.key,
    title: q.title,
    kind: q.kind,
    group: q.group ?? 'choose',
    required: essential.has(q.key),
    options: (q.options ?? []).map(o => ({
      value: String(o.id ?? o.value ?? o),
      label: String(o.label ?? o.name ?? o.id ?? o),
    })),
  }))]
}

async function main(db, trades) {
  /* $cuisine's options are loaded from the database at runtime by
     needs.js, so at generation time they are empty — which would leave
     cuisine answers with nothing for the server to check them against.
     Priming the same loader with the same query fixes that: the stored
     options are exactly the groups the customer is shown. ($dishes stays
     empty on purpose: 3,192 rows do not belong in a template, and the
     save checks a dish against the catalogue itself.) */
  await loadCuisines(db)
  await loadExperienceTiers(db)   // {} until 208 is applied — then no trade gains a $tier field

  const rows = []
  for (const t of trades) {
    const fields = fieldsFor(t)
    /* `dishes` options are the whole catalogue — 3,192 rows — and are NOT
       frozen into the template. The server checks a dish against
       sambramo_master_dishes at save time instead, which is also what
       makes the dietary rule keep holding as the catalogue changes. */
    const stored = fields.map(f => (f.kind === 'dishes' ? { ...f, options: [] } : f))
    const required = stored.filter(f => f.required).map(f => f.key)
    const fingerprint = createHash('sha256').update(JSON.stringify(stored)).digest('hex').slice(0, 16)
    rows.push({ trade_id: t.id, fields: stored, required_keys: required, source_fingerprint: fingerprint })
    console.log(`${t.id.padEnd(30)} ${String(stored.length).padStart(2)} fields, ${String(required.length).padStart(2)} required  ${fingerprint}`)
  }

  const none = rows.filter(r => r.fields.length === 0).map(r => r.trade_id)
  if (none.length) console.log(`\n  note: no customer questions for ${none.join(', ')} — these ask nothing beyond the event itself.`)

  if (!APPLY) { console.log(`\n${rows.length} templates generated. Dry run — pass --apply to load them.`); return }

  const probe = await db.from('sambramo_requirement_templates').select('trade_id').limit(1)
  if (probe.error) { console.error('\nMigration 203 is not applied:', probe.error.message); process.exitCode = 2; return }

  let created = 0, unchanged = 0
  for (const r of rows) {
    const { data: live } = await db.from('sambramo_requirement_templates')
      .select('version, source_fingerprint').eq('trade_id', r.trade_id).eq('published', true).maybeSingle()
    if (live?.source_fingerprint === r.source_fingerprint) { unchanged++; continue }

    /* A published version is never edited. Unpublish it and write the
       next one, so every stored answer keeps the questions it answered. */
    const { data: top } = await db.from('sambramo_requirement_templates')
      .select('version').eq('trade_id', r.trade_id).order('version', { ascending: false }).limit(1).maybeSingle()
    const next = (top?.version ?? 0) + 1
    if (live) await db.from('sambramo_requirement_templates').update({ published: false }).eq('trade_id', r.trade_id).eq('published', true)
    const ins = await db.from('sambramo_requirement_templates').insert({ ...r, version: next, published: true })
    if (ins.error) { console.error(`  ${r.trade_id}: ${ins.error.message}`); process.exitCode = 1 } else created++
  }
  console.log(`\n${created} new version(s), ${unchanged} already current.`)
  writeFileSync(join(ROOT, 'docs/requirement-templates.json'), JSON.stringify(rows, null, 2))
  console.log('docs/requirement-templates.json written')
}

const URL_ = process.env.VITE_SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !SERVICE) { console.error('run with --env-file=.env'); process.exitCode = 1 }
else {
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: trades, error } = await db.from('sambramo_trade_registry')
    .select('id, name, required_answers, archetype').order('sort_order')
  if (error) { console.error('cannot read the trade registry:', error.message); process.exitCode = 1 }
  else await main(db, trades)
}
