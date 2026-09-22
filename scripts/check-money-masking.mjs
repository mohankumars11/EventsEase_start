#!/usr/bin/env node
/**
 * Three promises the earnings module makes that nothing else enforces.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 1  A BANK ACCOUNT IS NEVER PRINTED IN FULL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `account_number`, `ifsc` and `pan` may appear in exactly two places:
 * the form that collects them, and the module that masks them. Anywhere
 * else is a screen — or now a PDF, which gets forwarded, printed and
 * photographed — carrying an identity document number.
 *
 * This was already nearly wrong: two components each did their own
 * `.slice(-4)`, differently, so one account read two ways on one screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 2  jsPDF IS LOADED LAZILY, AND THAT IS A PROPERTY OF ONE LINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * ~120 KB gzipped. `await import('jspdf')` inside a handler makes Vite
 * emit it as its own chunk, fetched the first time somebody taps
 * Download. One careless `import { jsPDF } from 'jspdf'` at the top of a
 * component moves all of it into the partner's main bundle — and in the
 * APK, into install size — with no visible symptom and nothing failing.
 *
 * So: the string may appear in one file, and only after `await import(`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 3  THE PARTNER APP DOES NOT LOAD RECHARTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * ~376 KB, admin-only by design, and it cannot be photographed by this
 * project's one UI harness (ResponsiveContainer measures its parent and
 * renders empty under a full-page CDP capture). The partner charts are
 * hand-rolled precisely so this stays true; a guard is what keeps a
 * future "just use ChartKit" from quietly undoing it.
 *
 * ── Comments are stripped first ──────────────────────────────────────
 * Every one of these files EXPLAINS why it does what it does, in prose
 * containing the exact strings being searched for. A checker that reads
 * its own justification as evidence reports a fault that is not there,
 * which is how three guards in this repo came to be vacuous.
 *
 *   node scripts/check-money-masking.mjs
 *   node scripts/check-money-masking.mjs --sabotage
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (n, cond, d = '') => { ran++; if (!cond) bad++; console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`) }

const strip = s => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')

const files = []
;(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(jsx?|tsx?)$/.test(p)) files.push(p)
  }
})(SRC)

const rel = p => relative(ROOT, p).replace(/\\/g, '/')
const code = new Map(files.map(p => [rel(p), strip(readFileSync(p, 'utf8'))]))

if (sabotage) {
  /* Prove the guard bites. Without this, a checker that greps for a
     string nobody writes passes forever and proves nothing. */
  code.set('src/components/vendor/earnings/Sabotage.jsx',
    `const n = payout.account_number\nimport { jsPDF } from 'jspdf'\nimport 'recharts'`)
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA BANK ACCOUNT IS NEVER PRINTED IN FULL\n')

/* ── What is actually asserted, and what deliberately is not ─────────
   Not "the string account_number appears nowhere". It has to appear:
   something must SELECT the column, the form must collect it, and the
   operator console must show an operator which account they are paying.
   An allowlist of every legitimate site would grow to include almost
   everything and assert nothing.

   The real regression is narrower and has already happened once: FOUR
   components each wrote their own last-four slice, so one account read
   "…4417", "ends 4417", "ending 4417" and "•••• 4417" on four screens.
   That is what mask.js ended, and this is what keeps it ended. */
const MASKERS = new Set(['src/lib/documents/mask.js'])
const ADHOC = /\.slice\(\s*-\s*[45]\s*\)|\.substr\(\s*-\s*4/

const rollingOwn = [...code.entries()]
  .filter(([p, src]) => !MASKERS.has(p) && ADHOC.test(src))
  /* A last-four taken off a DOCUMENT number is a different fact with a
     different column (`vendor_documents.number_last4`) and its own
     storage rule. It is not a payout destination.

     `identity.js` needs its own because mask.js's `last4` strips
     non-digits, which is correct for a bank account and wrong for a PAN
     or a GSTIN — "ABCDE1234F" would come back as "1234". Two functions
     because there are genuinely two facts, not because one drifted. */
  .filter(([p]) => p !== 'src/lib/partnerDocuments.js')
  .filter(([p]) => p !== 'src/lib/validation/identity.js')
  .map(([p]) => p)

ok('nobody masks an account by hand', rollingOwn.length === 0,
   `${rollingOwn.join(', ')} — use last4()/destinationOf() from lib/documents/mask.js`)

/* The earnings module is held to the stricter rule, because it is the
   one that now also produces a FILE. A PDF gets forwarded, printed and
   photographed, and nothing in it should carry a number that a screen
   would not. */
const EARNINGS = [...code.entries()].filter(([p]) =>
  p.startsWith('src/components/vendor/earnings/'))

for (const field of ['account_number', 'ifsc']) {
  const re = new RegExp(`\\b${field}\\b`)
  const offenders = EARNINGS.filter(([, src]) => re.test(src)).map(([p]) => p)
  ok(`the earnings module never touches ${field} directly`,
     offenders.length === 0, offenders.join(', '))
}

/* `pan` as a property, not the cooking pan — `\bpan\b` matches
   dishRegistry and four other data files, and a guard that cries wolf
   on a recipe is a guard people switch off. */
const PAN_PROP = /[.'"[]pan\b|pan:\s/
const panOffenders = EARNINGS.filter(([, src]) => PAN_PROP.test(src)).map(([p]) => p)
ok('and never reads a PAN (hasPan is a boolean, and is enough)',
   panOffenders.length === 0, panOffenders.join(', '))

ok('the masking module exists and is the one that says "ending"',
   /Account ending/.test(code.get('src/lib/documents/mask.js') ?? ''),
   'migration 091 snapshots this exact wording; the live row must match it')

/* ══════════════════════════════════════════════════════════════════ */
console.log('\njsPDF IS LOADED LAZILY\n')

const pdfFiles = [...code.entries()].filter(([, src]) => /jspdf/i.test(src)).map(([p]) => p)
ok('jspdf is named in exactly one file', pdfFiles.length === 1, pdfFiles.join(', '))

const pdfSrc = code.get('src/lib/documents/renderPdf.js') ?? ''
ok('and only behind an await import()',
   /await import\(\s*['"]jspdf['"]\s*\)/.test(pdfSrc),
   'a top-level import moves 120 KB into the partner bundle, silently')
ok('there is no static import of it anywhere',
   ![...code.values()].some(s => /^\s*import\s[^\n]*from\s*['"]jspdf['"]/m.test(s)))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE PARTNER APP DOES NOT LOAD RECHARTS\n')

const partnerish = [...code.entries()].filter(([p]) =>
  p.startsWith('src/components/vendor/') ||
  p.startsWith('src/components/partner/') ||
  p.startsWith('src/pages/partner/'))

const charty = partnerish
  .filter(([, src]) => /from\s*['"]recharts['"]|ChartKit/.test(src))
  .map(([p]) => p)
ok('no partner screen imports recharts or ChartKit', charty.length === 0, charty.join(', '))

ok('the partner time series is hand-rolled',
   !/recharts/.test(code.get('src/components/vendor/earnings/TimeSeries.jsx') ?? ''))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE SCREEN AND THE SLIP SHARE ONE MODEL\n')

const slip = code.get('src/lib/documents/slipModel.js') ?? ''
ok('the slip model derives from jobMoney, once', /jobMoney\(/.test(slip))
ok('and renderPdf derives nothing of its own',
   !/jobMoney|partnerEarnings|partnerDeductions/.test(pdfSrc),
   'a document that recomputes can disagree with the screen it came from')

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (sabotage) {
  console.log(bad >= 3
    ? `${tick} sabotage was caught\n`
    : `${cross} SABOTAGE WAS NOT CAUGHT — this guard is vacuous\n`)
  process.exitCode = bad >= 3 ? 0 : 1
} else {
  process.exitCode = bad ? 1 : 0
}
