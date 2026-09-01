#!/usr/bin/env node
/**
 * The Android manifest has to be well-formed XML.
 *
 *   node scripts/check-android-manifest.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS WORTH A SCRIPT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two APK builds failed in a row, four minutes each, because a comment I
 * had written contained `--`:
 *
 *     …does not offer UPI at all -- which is why…
 *
 * A double hyphen is illegal inside an XML comment. It is the one piece
 * of XML pedantry that catches people who write prose in manifests, and
 * this codebase writes a lot of prose. The manifest merger rejects the
 * file, gradle reports "Execution failed for task", and the actual cause
 * is a punctuation mark.
 *
 * The build log that would have said so needs admin rights on the
 * repository to read, which I do not have — so a failure there costs a
 * round trip through somebody else. Ten milliseconds here is better.
 *
 * ── Not a real XML parser, on purpose ───────────────────────────────
 * Node ships none, and adding a dependency to count angle brackets is a
 * poor trade. These are the three things that have actually gone wrong
 * or realistically can: illegal comments, unbalanced tags, and <queries>
 * in the wrong place. A malformed attribute would still reach gradle.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const FILES = [
  'android/app/src/main/AndroidManifest.xml',
]

let bad = 0
const fail = m => { bad++; console.log(`    FAIL ${m}`) }

console.log('\n  Android manifest\n')

for (const rel of FILES) {
  const p = join(ROOT, rel)
  if (!existsSync(p)) { console.log(`    -- ${rel} (absent)`); continue }
  const src = readFileSync(p, 'utf8')

  /* 1 · No `--` inside a comment. The one that actually bit. */
  let comments = 0
  const re = /<!--([\s\S]*?)-->/g
  let m
  while ((m = re.exec(src))) {
    comments++
    if (m[1].includes('--')) {
      const line = m[1].split('\n').find(l => l.includes('--'))?.trim() ?? ''
      fail(`${rel}: "--" inside a comment — illegal XML`)
      console.log(`         ${line.slice(0, 72)}`)
    }
  }

  /* 2 · The elements this file actually uses, balanced. */
  for (const tag of ['manifest', 'application', 'queries', 'intent-filter']) {
    const open = (src.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length
    const close = (src.match(new RegExp(`</${tag}>`, 'g')) ?? []).length
    if (open !== close) fail(`${rel}: <${tag}> opened ${open}×, closed ${close}×`)
  }

  /* 3 · <queries> is a child of <manifest> and must precede
         <application>. Android rejects it anywhere else, and the error
         it gives is not obviously about position. */
  const q = src.indexOf('<queries>')
  if (q >= 0) {
    const app = src.indexOf('<application')
    if (app >= 0 && q > app) fail(`${rel}: <queries> must come before <application>`)
  }

  if (!bad) console.log(`    ok   ${rel}  (${comments} comment${comments === 1 ? '' : 's'} checked)`)
}

if (bad) {
  console.error(`\n  ${bad} problem(s). The APK build would fail on this.\n`)
  process.exit(1)
}
console.log('\n  Well-formed.\n')
