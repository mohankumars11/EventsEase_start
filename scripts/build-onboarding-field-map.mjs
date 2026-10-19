#!/usr/bin/env node
/**
 * Phase 1 artifact: the partner onboarding field-mapping inventory.
 *
 *   node scripts/build-onboarding-field-map.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * GENERATED, NOT TRANSCRIBED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The brief asks for an inventory of every onboarding question across
 * all 34 trades: label, type, required, validation, conditional
 * visibility, and where the answer should land. There are 34 trade
 * specs in src/data/trades/, each with screens, questions and usually a
 * catalogue sub-form. Hand-writing that table would be wrong within a
 * week of the next spec edit, and wrong in ways nobody would notice.
 *
 * So it is generated from the specs themselves. Re-run it after any
 * change to src/data/trades/ and the artifact tracks the product.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT CANNOT KNOW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Whether an answer is actually PERSISTED, and where. The specs declare
 * the form; the database declares the storage. Today every answer lands
 * in `vendor_services.specs` (jsonb) or `sambramo_listing_drafts.data`
 * (jsonb), so the "current storage" column is the same for all of them
 * and the proposed destination is computed, not observed. The companion
 * audit in the report states that plainly rather than implying a
 * per-field mapping exists when it does not.
 */
import { readdirSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TRADES_DIR = join(ROOT, 'src/data/trades')
const OUT_MD = join(ROOT, 'docs/partner-onboarding-field-map.md')
const OUT_JSON = join(ROOT, 'docs/partner-onboarding-field-map.json')

/* Form type -> the Postgres column type a dedicated, typed column would
   use. `multi` and `photos` are genuinely many-valued, so they are
   arrays rather than a comma-joined string that nobody can query. */
const SQL_TYPE = {
  text: 'TEXT',
  textarea: 'TEXT',
  url: 'TEXT',
  single: 'TEXT',
  multi: 'TEXT[]',
  photos: 'TEXT[]',
  number: 'NUMERIC',
  money: 'BIGINT',          // integer paise, as everywhere else in this repo
  toggle: 'BOOLEAN',
  date: 'DATE',
  time: 'TIME',
  dimensions: 'JSONB',      // {l,w,h,unit} — genuinely a shape, not a scalar
}

/* Fields whose answers are personal or commercially sensitive and must
   not sit on the public profile row. */
const SENSITIVE = /(^|_)(gst|pan|aadhaar|licence|license|fssai|account|ifsc|upi|bank|owner_name|phone|email|address)(_|$)/i

/* The specs import Vite-style extensionless paths, which Node will not
   resolve, so each one is bundled first. Same reason scripts/shoot-
   components.mjs bundles rather than importing src/ directly. */
const TMP = mkdtempSync(join(tmpdir(), 'sb-fieldmap-'))
async function loadSpec(file) {
  const out = join(TMP, file.replace(/\.js$/, '.mjs'))
  await esbuild.build({
    entryPoints: [join(TRADES_DIR, file)],
    outfile: out, bundle: true, format: 'esm', platform: 'node',
    logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
  })
  return (await import(pathToFileURL(out).href)).default
}

const files = readdirSync(TRADES_DIR)
  .filter(f => f.endsWith('.js') && !['schema.js', 'index.js', 'registry.js', '_trip.js'].includes(f))
  .sort()

const trades = []
for (const f of files) {
  const spec = await loadSpec(f)
  if (!spec?.id) { console.warn(`  skipped ${f}: no default export with an id`); continue }

  const rows = []
  /* make() in schema.js spreads the option bag FLAT onto the question:
     { id, label, type, required, min, max, showWhen, options }. Reading
     a nested `opts` found nothing and reported every question as
     optional with no validation — which looked plausible and was
     entirely wrong. */
  const push = (section, sectionKind, question) => {
    const o = question
    rows.push({
      trade_id: spec.id,
      section,
      section_kind: sectionKind,
      field_key: question.id,
      label: question.label,
      form_type: question.type,
      sql_type: SQL_TYPE[question.type] ?? 'TEXT',
      required: Boolean(o.required),
      choices: Array.isArray(question.options) ? question.options.length : null,
      validation: [
        o.min != null ? `min ${o.min}` : null,
        o.max != null ? `max ${o.max}` : null,
        o.suffix ? `unit ${o.suffix}` : null,
        o.other ? 'allows "other"' : null,
      ].filter(Boolean).join(', ') || null,
      conditional: o.showWhen
        ? (o.showWhen.in ? `${o.showWhen.q} in [${o.showWhen.in.join('|')}]`
          : o.showWhen.includes ? `${o.showWhen.q} includes ${o.showWhen.includes}`
            : o.showWhen.truthy ? `${o.showWhen.q} is set` : o.showWhen.q)
        : null,
      /* The rule itself, not just a sentence about it. The console has
         to decide whether an unanswered question was skipped or was
         never shown, and it cannot do that from prose. */
      showWhen: o.showWhen ?? null,
      sensitive: SENSITIVE.test(question.id),
    })
  }

  const screens = []
  for (const s of spec.screens ?? []) {
    screens.push({ id: s.id, title: s.title, sub: s.sub ?? null, count: (s.questions ?? []).length })
    for (const question of s.questions ?? []) push(s.id, 'screen', question)
  }
  /* The catalogue is a repeating sub-form — a menu, a vehicle list, a
     package of beverages. One row per item, so it is a child table, not
     columns on the profile. Marked so the schema step does not flatten
     it into the parent. */
  if (spec.catalogue) for (const question of spec.catalogue.fields ?? []) push(spec.catalogue.key, 'catalogue', question)

  trades.push({
    id: spec.id, file: f, rows, screens,
    serviceNoun: spec.serviceNoun ?? null,
    hasCatalogue: Boolean(spec.catalogue),
    catalogue: spec.catalogue
      ? { key: spec.catalogue.key, title: spec.catalogue.title, noun: spec.catalogue.noun, nounPlural: spec.catalogue.nounPlural }
      : null,
  })
}

const all = trades.flatMap(t => t.rows)
const screenRows = all.filter(r => r.section_kind === 'screen')
const catRows = all.filter(r => r.section_kind === 'catalogue')

mkdirSync(dirname(OUT_MD), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify({ generatedFrom: 'src/data/trades/*.js', trades }, null, 2))

const esc = v => String(v ?? '').replace(/\|/g, '\\|')
const lines = []
lines.push('# Partner onboarding field map')
lines.push('')
lines.push('**Generated** by `scripts/build-onboarding-field-map.mjs` from `src/data/trades/*.js`.')
lines.push('Do not edit by hand — re-run the script after changing a trade spec.')
lines.push('')
lines.push('## Totals')
lines.push('')
lines.push(`- Trades: **${trades.length}**`)
lines.push(`- Onboarding questions (profile screens): **${screenRows.length}**`)
lines.push(`- Catalogue sub-form fields (repeating items): **${catRows.length}**`)
lines.push(`- Required questions: **${screenRows.filter(r => r.required).length}**`)
lines.push(`- Conditional questions: **${all.filter(r => r.conditional).length}**`)
lines.push(`- Trades with a catalogue sub-form: **${trades.filter(t => t.hasCatalogue).length}**`)
lines.push('')
lines.push('## Where answers live today')
lines.push('')
lines.push('Every answer on every trade is stored in one of two JSONB columns:')
lines.push('')
lines.push('| Stage | Table | Column |')
lines.push('|---|---|---|')
lines.push('| In progress | `sambramo_listing_drafts` | `data` (jsonb) |')
lines.push('| Submitted | `vendor_services` | `specs` (jsonb) |')
lines.push('')
lines.push('There is no typed column for any of them. `sambramo_canonical_fields` types only 17')
lines.push('field ids and those are **booking-time** fields (`guest_count`, `duration_hours`), not')
lines.push('onboarding answers.')
lines.push('')
lines.push('## Per trade')
lines.push('')
for (const t of trades) {
  const s = t.rows.filter(r => r.section_kind === 'screen')
  const c = t.rows.filter(r => r.section_kind === 'catalogue')
  lines.push(`### ${t.id}`)
  lines.push('')
  lines.push(`\`${t.file}\` · ${s.length} profile questions · ${c.length ? `${c.length} catalogue fields` : 'no catalogue'}`)
  lines.push('')
  lines.push('| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const r of t.rows) {
    lines.push(`| ${r.section_kind === 'catalogue' ? `catalogue/${esc(r.section)}` : esc(r.section)} | \`${esc(r.field_key)}\` | ${esc(r.label)} | ${r.form_type} | \`${r.sql_type}\` | ${r.required ? 'yes' : ''} | ${esc(r.validation)} | ${esc(r.conditional)} |`)
  }
  lines.push('')
}
writeFileSync(OUT_MD, lines.join('\n'))

console.log(`trades            : ${trades.length}`)
console.log(`profile questions : ${screenRows.length}  (required ${screenRows.filter(r => r.required).length})`)
console.log(`catalogue fields  : ${catRows.length}`)
console.log(`conditional       : ${all.filter(r => r.conditional).length}`)
console.log(`sensitive flagged : ${all.filter(r => r.sensitive).length}`)
console.log(`\nwrote ${OUT_MD.replace(ROOT, '.')}`)
console.log(`wrote ${OUT_JSON.replace(ROOT, '.')}`)
