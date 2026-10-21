#!/usr/bin/env node
/**
 * One row per trade: what a partner is actually asked, and what is
 * missing.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A MATRIX AND NOT A CHECKLIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Audit all 34 trades" is unanswerable as prose — by the time the
 * thirty-fourth is written the first has changed. So it is generated
 * from the trade files and the live database, and it says the same thing
 * every time it runs.
 *
 * Nothing here is a judgement about whether a question is good. It
 * reports what exists, flags the cases that are structurally wrong — no
 * pricing kinds, a catalogue with no price field, a trade with no
 * readiness criteria — and leaves taste to a human.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT CHECKS AGAINST THE DATABASE, NOT ONLY THE FILES
 * ══════════════════════════════════════════════════════════════════════
 *
 * A trade whose typed table does not exist looks perfect in the trade
 * file and loses a partner's answers on submit. So the matrix asks the
 * live database which tables are there, and a trade missing one is a
 * failure rather than a footnote.
 *
 *   node scripts/qa-onboarding-matrix.mjs            prints + writes docs
 *   node scripts/qa-onboarding-matrix.mjs --offline  skips the DB checks
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OFFLINE = process.argv.includes('--offline')

const entry = join(ROOT, 'scripts/.qa-entry.tmp.js')
writeFileSync(entry, "export { TRADE_CONFIGS } from '../src/data/trades/index'\n"
  + "export { workPromptsFor, tradeTakesAudio, tradeTakesVideoLink, AUDIO_SAMPLE_TRADES } from '../src/data/workPrompts'\n")
const out = join(mkdtempSync(join(tmpdir(), 'qa-')), 'b.mjs')
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', outfile: out,
  platform: 'node', logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic' })
const { TRADE_CONFIGS, tradeTakesAudio, tradeTakesVideoLink } = await import(pathToFileURL(out).href)

/* Which typed tables exist. */
let tables = null
if (!OFFLINE) {
  const env = Object.fromEntries(['.env', '.env.local'].filter(existsSync).flatMap(f =>
    readFileSync(f, 'utf8').split('\n').map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
      .map(m => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])))
  const U = env.VITE_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
  if (U && K) {
    tables = new Set()
    for (const c of TRADE_CONFIGS) {
      for (const suffix of ['profiles', 'items']) {
        const t = `partner_${c.id}_${suffix}`
        const r = await fetch(`${U}/rest/v1/${t}?select=id&limit=1`, { headers: { apikey: K, authorization: `Bearer ${K}` } })
        if (r.status === 200) tables.add(t)
      }
    }
  }
}

const questionsOf = c => [
  ...(c.screens ?? []).flatMap(s => s.questions ?? []),
  ...((c.catalogue?.fields) ?? []),
  ...((c.pricing?.fields) ?? []),
  ...((c.resources?.fields) ?? []),
]

const rows = []
const problems = []
for (const c of [...TRADE_CONFIGS].sort((a, b) => a.order - b.order)) {
  const qs = questionsOf(c)
  const choice = qs.filter(q => q.type === 'single' || q.type === 'multi')
  const cat = c.catalogue
  const row = {
    order: c.order, code: c.code, name: c.name,
    screens: (c.screens ?? []).length,
    questions: qs.length,
    required: qs.filter(q => q.required).length,
    choice: choice.length,
    withOther: choice.filter(q => q.other).length,
    catalogue: cat ? cat.fields.length : 0,
    pricingKinds: (c.pricing?.kinds ?? []).length,
    addons: (c.addons ?? []).length,
    compliance: (c.compliance?.conditional ?? []).length,
    quoteTriggers: (c.quoteTriggers ?? []).length,
    readiness: (c.readiness ?? []).length,
    tiers: !!c.tiers,
    legacy: !!c.legacyFlow,
    audio: tradeTakesAudio(c.name),
    videoLink: tradeTakesVideoLink(c.name),
    profileTable: tables ? tables.has(`partner_${c.id}_profiles`) : null,
    itemsTable: tables ? tables.has(`partner_${c.id}_items`) : null,
  }
  rows.push(row)

  const p = m => problems.push(`${c.name}: ${m}`)

  /* Anchor & MC runs its own 11-stage flow and says so with
     `legacyFlow`. Its trade file carries no screens and no typed table
     on purpose — it only tells the shared engine what it prices. The
     first version of this matrix reported all three as failures, which
     was the matrix being naive rather than the trade being broken. */
  const legacy = !!c.legacyFlow

  if (!legacy && !row.screens) p('no screens — a partner is asked nothing')
  if (!legacy && !row.required) p('nothing is required — a partner can submit an empty listing')
  if (!legacy && tables && !row.profileTable) p(`typed table partner_${c.id}_profiles is missing — answers are lost on submit`)
  if (legacy && !(c.stages ?? []).length) p('declares a legacy flow but names no stages')

  if (!row.pricingKinds) p('no pricing kinds — nothing it offers can be priced')
  if (!row.readiness) p('no readiness criteria — nothing tells the partner when they are done')
  if (!row.quoteTriggers) p('no quote triggers — every out-of-scope job silently becomes instant')

  /* A catalogue only needs its own price when the items are what gets
     priced. A lorry's catalogue is an inventory — the money is in the
     per-trip and per-km rules — so demanding a money field there was
     asking the wrong question. */
  const itemsArePriced = (c.pricing?.kinds ?? []).some(k => k === 'catalogue' || k === 'rental')
  if (cat && itemsArePriced && !cat.fields.some(f => f.type === 'money')) {
    p('items are priced from the catalogue but no field holds a price')
  }
  if (tables && cat && !row.itemsTable) p(`has a catalogue but partner_${c.id}_items is missing`)
}

const tot = k => rows.reduce((a, r) => a + (typeof r[k] === 'number' ? r[k] : 0), 0)
const yn = v => (v === null ? '—' : v ? 'yes' : 'no')

const md = [
  '# Partner onboarding — the 34-trade matrix',
  '',
  `Generated by \`scripts/qa-onboarding-matrix.mjs\` on ${new Date().toISOString().slice(0, 10)}.`,
  tables ? 'Typed tables checked against the live database.' : 'Typed tables NOT checked (offline run).',
  '',
  `${rows.length} trades · ${tot('questions')} questions · ${tot('required')} required · `
    + `${tot('choice')} choice questions, ${tot('withOther')} with "Other" · ${tot('catalogue')} catalogue fields.`,
  '',
  '| # | Code | Trade | Screens | Qs | Req | Choice/Other | Catalogue | Pricing | Add-ons | Compliance | Quote | Ready | Tiers | Audio | Video link | Tables |',
  '|--:|:--|:--|--:|--:|--:|:--|--:|--:|--:|--:|--:|--:|:--|:--|:--|:--|',
  ...rows.map(r => `| ${r.order} | ${r.code} | ${r.name} | ${r.screens} | ${r.questions} | ${r.required} | `
    + `${r.withOther}/${r.choice} | ${r.catalogue || '—'} | ${r.pricingKinds} | ${r.addons} | ${r.compliance} | `
    + `${r.quoteTriggers} | ${r.readiness} | ${yn(r.tiers)} | ${yn(r.audio)} | ${yn(r.videoLink)} | `
    + `${r.legacy ? 'own flow' : r.profileTable === null ? '—' : (r.profileTable ? 'P' : '✗P') + (r.catalogue ? (r.itemsTable ? '+I' : '+✗I') : '')} |`),
  '',
  '## Structural problems',
  '',
  problems.length ? problems.map(p => `- ${p}`).join('\n') : '_None._',
  '',
  '## What this does not check',
  '',
  '- Whether a question is worth asking, or worded well. That is taste, and taste is a human job.',
  '- Whether the options on a list are the right ones — only that an open-ended list has a way to add more (`check-other-options.mjs`).',
  '- Runtime behaviour. The gating, allergen, price and prompt guards cover their own corners;',
  '  this counts what exists.',
  '- Anchor & MC is measured differently: it runs its own flow (`legacyFlow`), so it has no',
  '  engine screens and no typed table, and that is correct rather than missing.',
  '- A catalogue is only required to carry a price when the trade prices items from it. A',
  '  vehicle catalogue is an inventory; its money lives in the per-trip and per-km rules.',
  '',
].join('\n')

writeFileSync(join(ROOT, 'docs/partner-onboarding-matrix.md'), md)

console.log(`trades            : ${rows.length}`)
console.log(`questions         : ${tot('questions')}  (${tot('required')} required)`)
console.log(`choice questions  : ${tot('choice')}  (${tot('withOther')} with "Other")`)
console.log(`catalogue fields  : ${tot('catalogue')}`)
console.log(`typed tables      : ${tables ? `${[...tables].length} found` : 'not checked'}`)
console.log('')
for (const p of problems) console.log(`  FAIL  ${p}`)
console.log(problems.length
  ? `\nFAIL — ${problems.length} structural problem(s). Written to docs/partner-onboarding-matrix.md`
  : '\nPASS — every trade asks something, prices something, and has somewhere to store it')
console.log('wrote docs/partner-onboarding-matrix.md')
process.exit(problems.length ? 1 : 0)
