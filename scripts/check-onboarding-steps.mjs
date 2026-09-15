#!/usr/bin/env node
/**
 * The six-step gate, asserted before any screen renders it.
 *
 * The rule under test: a partner cannot reach step 2 by finishing a
 * trade questionnaire, and cannot reach step 5 by typing a URL. Pure —
 * the state machine takes rows and returns statuses, so every one of
 * these is a fact about the data rather than about a component.
 *
 *   node scripts/check-onboarding-steps.mjs
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'node_modules/.cache/onboarding-steps.mjs')
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(ROOT, 'src/lib/partnerOnboarding.js'),
  '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const { onboardingSteps, currentStep, canOpen, STATUS, partnerLifecycle, LIFECYCLE,
        onboardingComplete, completedCount } = await import(pathToFileURL(OUT).href)

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let bad = 0, ran = 0
const ok = (name, cond, detail = '') => {
  ran++; if (!cond) bad++
  console.log(`  ${cond ? tick : cross} ${name}${cond ? '' : `   <-- ${detail}`}`)
}
const statusOf = (acct, id) => onboardingSteps(acct).find(s => s.id === id)?.status

/* Building blocks for a partner at various depths. */
/* A partner is built up step by step, exactly as the real one is.
   An earlier draft of this file handed a 'trade only' partner a fully
   populated vendors row and then asserted that step 2 was LOCKED — an
   impossible state, and the state machine was right to disagree. A
   step whose data IS complete reads COMPLETE whoever filled it in;
   what is locked is an UNFINISHED step further down. */
const vendorBare = {
  id: 'v1', business_name: 'Anna Ruchi', verification_status: 'draft',
}
const vendorDetails = {
  ...vendorBare, contact_phone: '9000000000',
  description: 'Pure veg catering since 2011', years_active: 14,
}
const vendorFull = {
  ...vendorDetails, city: 'Bengaluru', pincode: '560102', service_radius_km: 25,
}
const listing = { trade: 'Catering & Food', offerings: [{ id: 'o1', name: 'Catering' }] }
const emptyListing = { trade: 'Catering & Food', offerings: [] }

console.log('\nNOBODY SKIPS A STEP\n')

const fresh = { vendor: null, listings: [], documents: {}, payout: null }
ok('a brand new partner starts on step 1', currentStep(fresh).id === 'business')
ok('step 2 is LOCKED', statusOf(fresh, 'details') === STATUS.LOCKED, statusOf(fresh, 'details'))
ok('step 5 is LOCKED', statusOf(fresh, 'bank') === STATUS.LOCKED)
ok('and cannot be opened by URL', !canOpen('bank', fresh))

/* TEST 11/12: finishing the questionnaire must NOT unlock anything past
   step 1 on its own, and must not look like completion. */
const tradeOnly = { vendor: vendorBare, listings: [listing], documents: {}, payout: null }
ok('one configured trade COMPLETES step 1', statusOf(tradeOnly, 'business') === STATUS.COMPLETE)
/* IN_PROGRESS rather than AVAILABLE, and that is right: the sign-up
   form already wrote `business_name`, so step 2 is genuinely part
   filled the moment it unlocks. What matters is that it is no longer
   LOCKED. */
ok('...and step 2 unlocks', canOpen('details', tradeOnly), statusOf(tradeOnly, 'details'))
ok('...as IN_PROGRESS, since the name is already known',
   statusOf(tradeOnly, 'details') === STATUS.IN_PROGRESS, statusOf(tradeOnly, 'details'))
ok('...but step 4 stays LOCKED', statusOf(tradeOnly, 'compliance') === STATUS.LOCKED)
ok('...and onboarding is NOT complete', !onboardingComplete(tradeOnly))
ok('...and the partner is not LIVE', partnerLifecycle(tradeOnly) === LIFECYCLE.ONBOARDING)

/* A trade opened and abandoned is not a finished step. */
const started = { vendor: vendorBare, listings: [emptyListing], documents: {}, payout: null }
ok('a trade with no offerings leaves step 1 IN_PROGRESS',
   statusOf(started, 'business') === STATUS.IN_PROGRESS, statusOf(started, 'business'))
ok('...and step 2 stays LOCKED', statusOf(started, 'details') === STATUS.LOCKED)

console.log('\nEACH STEP OPENS THE NEXT, IN ORDER\n')

const half = { vendor: { ...vendorDetails, description: null, years_active: null },
               listings: [listing], documents: {}, payout: null }
ok('half-filled details read IN_PROGRESS, not COMPLETE',
   statusOf(half, 'details') === STATUS.IN_PROGRESS, statusOf(half, 'details'))
ok('...so step 3 is still LOCKED', statusOf(half, 'area') === STATUS.LOCKED)

const thru3 = { vendor: vendorFull, listings: [listing], documents: {}, payout: null }
ok('details + area complete -> step 4 AVAILABLE',
   statusOf(thru3, 'compliance') === STATUS.AVAILABLE, statusOf(thru3, 'compliance'))

/* Nothing is mandatory while MANDATORY_FROM is unset — so this step
   would auto-complete for a partner who never opened it, which is the
   one thing §23 rules out: the requirements are dynamic, the STEP is
   mandatory. It takes an acknowledgement. */
ok('...and does NOT auto-complete with nothing required',
   statusOf(thru3, 'compliance') !== STATUS.COMPLETE, statusOf(thru3, 'compliance'))

const acked = { ...thru3, vendor: { ...vendorFull, completed_steps: ['compliance'] } }
ok('acknowledging it completes the step',
   statusOf(acked, 'compliance') === STATUS.COMPLETE, statusOf(acked, 'compliance'))

const withBank = { ...acked, payout: { method: 'upi', upi_id: 'a@okhdfc' } }
ok('a payout account completes step 5', statusOf(withBank, 'bank') === STATUS.COMPLETE)
ok('...and step 6 becomes reachable', canOpen('review', withBank))

console.log('\nSUBMITTED IS NOT LIVE\n')

const submitted = { ...withBank, vendor: { ...acked.vendor, verification_status: 'submitted' } }
ok('submitting completes step 6', statusOf(submitted, 'review') === STATUS.COMPLETE)
ok('...onboarding is complete', onboardingComplete(submitted))
ok('...and all six count', completedCount(submitted) === 6, String(completedCount(submitted)))
/* The heart of it: finishing the form does not make somebody verified. */
ok('...but the partner is UNDER_REVIEW, not LIVE',
   partnerLifecycle(submitted) === LIFECYCLE.UNDER_REVIEW, partnerLifecycle(submitted))

const approved = { ...withBank,
  vendor: { ...acked.vendor, verification_status: 'approved', is_verified: true, status: 'APPROVED' } }
ok('only an operator approval makes them LIVE',
   partnerLifecycle(approved) === LIFECYCLE.LIVE, partnerLifecycle(approved))

const sentBack = { ...withBank, vendor: { ...acked.vendor, verification_status: 'rejected' } }
ok('a rejection shows REQUIRES_ACTION on step 6',
   statusOf(sentBack, 'review') === STATUS.REQUIRES_ACTION, statusOf(sentBack, 'review'))
ok('...and the partner can still open it', canOpen('review', sentBack))
ok('...and the lifecycle says so', partnerLifecycle(sentBack) === LIFECYCLE.REQUIRES_ACTION)

console.log('\nRESUME LANDS ON THE RIGHT STEP\n')

ok('nothing done -> business', currentStep(fresh).id === 'business')
ok('trade done -> details', currentStep(tradeOnly).id === 'details')
ok('through area -> compliance', currentStep(thru3).id === 'compliance')
ok('bank done -> review', currentStep(withBank).id === 'review')
ok('rejected -> straight to what needs fixing', currentStep(sentBack).id === 'review')

console.log(`\n  ${bad ? cross : tick} ${ran - bad}/${ran} passed\n`)
process.exit(bad ? 1 : 0)
