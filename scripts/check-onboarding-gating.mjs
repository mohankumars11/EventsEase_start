#!/usr/bin/env node
/**
 * Do the onboarding flows refuse a forward jump?
 *
 * Section D is explicit that a disabled tab is not enough: the state
 * must refuse invalid progression even when a request bypasses the UI.
 * This reads the source and asserts the guard is where it has to be —
 * on go(), not only on the rail — and that a step is not completed
 * merely by being visited.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BOTH FLOWS, BECAUSE ANCHOR RUNS ITS OWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Anchor & MC predates the shared engine and has its own component. A
 * fix applied only to the shared flow leaves the oldest and busiest
 * trade ungated — which is what was found when this guard was pointed
 * at it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT READS CODE, NOT COMMENTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first version failed on correct code because the source explains
 * WHY `seen.has('payout')` was removed, and the check matched the
 * explanation. A guard that accepts its own documentation as evidence
 * also passes on a comment claiming a fix that was never made.
 *
 * This is a source-level check. It cannot prove runtime behaviour; it
 * proves the guard has not been deleted or pushed back behind the UI,
 * which is how this regresses.
 */
import { readFileSync } from 'node:fs'

const FLOWS = [
  'src/components/vendor/listing/ListingOnboardingFlow.jsx',
  'src/components/vendor/anchor/AnchorOnboardingFlow.jsx',
]

const codeOf = raw => raw
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const checksFor = src => [
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
  ['Next is gated on the current step being done',
    /const canNext = done\.has\((here\.id|step)\)/.test(src)],
]

let bad = 0
for (const flow of FLOWS) {
  const src = codeOf(readFileSync(flow, 'utf8'))
  console.log()
  console.log(flow.split('/').pop())
  for (const [name, ok] of checksFor(src)) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
    if (!ok) bad++
  }
  /* Reported, not hidden: a step still ticked by being looked at. */
  const visitBased = [...src.matchAll(/seen\.has\('([a-z]+)'\)/g)].map(m => m[1])
  if (visitBased.length) {
    console.log(`  note: still completed by visiting — ${[...new Set(visitBased)].join(', ')}`)
  }
}

console.log()
console.log(bad
  ? `FAIL — ${bad} gating check(s)`
  : 'PASS — both flows enforce progression in state, not only in the rail')
process.exit(bad ? 1 : 0)
