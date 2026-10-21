#!/usr/bin/env node
/**
 * Does any onboarding or pricing screen still show a customer price?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner enters one number: what they earn. No screen in the listing
 * flow quotes what the customer pays, and none names the platform fee.
 * The "I enter customer price" mode and the "after the 8% fee" line were
 * removed for this reason; the review screen then quietly re-introduced
 * the markup under a "what customers see" heading, which left a partner
 * looking at two different numbers with no way to tell which was theirs.
 *
 * The giveaway is the gross-up: dividing by (1 - fee) turns a take-home
 * figure into a customer one. Any appearance of that in these files is
 * the bug, whatever it is labelled.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS DELIBERATELY DOES NOT COVER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The earnings and settlement screens — EarningsStatement, Transactions,
 * JobMoneyRow, AdjustmentsPanel — DO show the commission, by name and
 * with its rate. That is money actually deducted from a completed
 * booking, and hiding a real deduction from the person it was taken from
 * would be a far worse failure than the one this guard prevents. They
 * are out of scope on purpose, not by oversight.
 */
import { readFileSync, existsSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIRS = [
  'src/components/vendor/listing',
  'src/components/vendor/listing/catering',
  'src/components/vendor/anchor',
  'src/components/vendor/anchor/stages',
  'src/components/vendor/packages',
]

const codeOf = raw => raw
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

/* payload.js is a writer, not a screen. It still branches on a stored
   `customer` price mode so a listing saved before that mode was removed
   is written back with the number its partner actually entered, rather
   than being silently reinterpreted as a take-home figure. Nobody is
   shown anything by it. */
const WRITERS = ['payload.js']

const files = DIRS.filter(existsSync).flatMap(d =>
  readdirSync(d).filter(f => /\.jsx?$/.test(f) && !WRITERS.includes(f)).map(f => join(d, f)))

const fails = []
for (const f of files) {
  const src = codeOf(readFileSync(f, 'utf8'))
  /* The gross-up, in any spacing. */
  for (const m of src.matchAll(/\/\s*\(\s*1\s*-\s*fee\s*\)/g)) {
    fails.push(`${f}: grosses a take-home figure up to a customer price — "${m[0].trim()}"`)
  }
  /* Naming the fee to a partner during onboarding. */
  for (const m of src.matchAll(/['"`][^'"`]*\b(8%|platform fee|after the fee|commission)\b[^'"`]*['"`]/gi)) {
    fails.push(`${f}: names the fee to a partner — ${m[0].slice(0, 70)}`)
  }
  /* The removed mode. */
  if (/price_mode\s*===?\s*['"]customer['"]/.test(src)) {
    fails.push(`${f}: still branches on the removed "customer" price mode`)
  }
}

console.log(`files checked : ${files.length}`)
console.log('')
for (const f of fails) console.log(`  FAIL  ${f}`)
console.log(fails.length
  ? `FAIL — ${fails.length} place(s) show a partner a price that is not theirs`
  : 'PASS — onboarding and pricing quote the partner\'s own rate and nothing else')
process.exit(fails.length ? 1 : 0)
