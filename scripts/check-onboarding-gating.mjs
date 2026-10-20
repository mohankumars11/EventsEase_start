#!/usr/bin/env node
/**
 * Does the onboarding flow refuse a forward jump?
 *
 * Section D is explicit that a disabled tab is not enough: the state
 * must refuse invalid progression even when a request bypasses the UI.
 * This reads the source and asserts the guard exists where it has to
 * be — on go(), not only on the rail — and that step completion is not
 * granted merely by visiting a screen.
 *
 * A source-level check, not a behavioural one. It cannot prove the
 * flow behaves correctly at runtime; it can prove the guard has not
 * been deleted or moved back behind the UI, which is how this
 * regresses.
 */
import { readFileSync } from 'node:fs'
const FLOW = 'src/components/vendor/listing/ListingOnboardingFlow.jsx'
const raw = readFileSync(FLOW, 'utf8')

/* Comments are prose, not behaviour. The first version of this guard
   failed because the code explains WHY `seen.has('payout')` was
   removed, and the check matched the explanation. A guard that reads
   its own documentation as evidence will go red on correct code and,
   worse, green on a comment that claims a fix. */
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const checks = [
  ['go() consults canEnter before moving',
    /function go\(to\)\s*\{[\s\S]{0,400}?if \(!canEnter\(to\)\)/.test(src)],
  ['canEnter is bounded by the furthest earned step',
    /const canEnter[\s\S]{0,300}?j <= reachIdx/.test(src)],
  ['reachIdx is the first step that is not done',
    /const reachIdx[\s\S]{0,300}?findIndex\(s => !done\.has\(s\.id\)\)/.test(src)],
  ['a restored or caller-supplied step is clamped',
    /if \(at > reachIdx\) setStep\(STAGES\[reachIdx\]\.id\)/.test(src)],
  ['payout completion comes from data, not from a visit',
    /payout\?\.details \|\| payout\?\.active/.test(src) && !/seen\.has\('payout'\)/.test(src)],
  ['Next is still gated on the current step being done',
    /const canNext = done\.has\(here\.id\)/.test(src)],
]

let bad = 0
for (const [name, ok] of checks) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) bad++
}

/* Visit-based completion that remains, reported rather than hidden. */
const visitBased = [...src.matchAll(/seen\.has\('([a-z]+)'\)/g)].map(m => m[1])
if (visitBased.length) {
  console.log(`\n  still completed by visiting: ${[...new Set(visitBased)].join(', ')}`)
}

console.log(bad ? `\nFAIL — ${bad} gating check(s)` : '\nPASS — progression is enforced in state, not only in the rail')
process.exit(bad ? 1 : 0)
