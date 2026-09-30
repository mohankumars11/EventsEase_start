#!/usr/bin/env node
/**
 * Where does a partner land after OTP?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BUG THIS PINS DOWN
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner who verified their email landed on /dashboard/vendor with no
 * vendors row, no trade and no listing — past "Great! Let's get started",
 * which nothing in the app navigated to. The rule now lives in one
 * function, and this asserts every branch of it.
 *
 * Pure: no browser, no database, no session. partnerStage() takes a
 * vendors row and a list of vendor_services rows and returns a stage.
 *
 *   node scripts/check-partner-stage.mjs
 */
import { pathToFileURL } from 'node:url'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mod = await import(pathToFileURL(join(ROOT, 'src/lib/partnerStage.js')).href)
const { partnerStage, routeForStage, STAGE } = mod

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let failed = 0

function check(name, got, want) {
  const ok = got === want
  if (!ok) failed++
  console.log(`  ${ok ? tick : cross} ${name}${ok ? '' : `  got ${got}, wanted ${want}`}`)
}

const live     = { review_status: 'live' }
const review   = { review_status: 'under_review' }
const rejected = { review_status: 'rejected' }
const vendor   = { id: 'v1' }

console.log('\nSTAGE, from the row and the listings\n')

/* The reported bug. A fresh OTP verification has an auth account and a
   profile, and nothing else — no vendors row is written until the
   onboarding form is submitted. */
check('verified email, nothing else          -> NEW',
  partnerStage({ vendor: null, services: [] }), STAGE.NEW)

check('onboarded, never picked a trade       -> CHOOSE_TRADES',
  partnerStage({ vendor, services: [] }), STAGE.CHOOSE_TRADES)

check('listing waiting to be read            -> UNDER_REVIEW',
  partnerStage({ vendor, services: [review] }), STAGE.UNDER_REVIEW)

check('one listing live                      -> LIVE',
  partnerStage({ vendor, services: [live] }), STAGE.LIVE)

/* A partner with something sent back is asked to fix it before anything
   else, even when other listings are live and earning. */
check('live listing AND one sent back        -> REQUIRES_ACTION',
  partnerStage({ vendor, services: [live, rejected] }), STAGE.REQUIRES_ACTION)

check('tapped Complete Later, no listings    -> NEW',
  partnerStage({ vendor: { ...vendor, onboarding_status: 'setup_later' }, services: [] }),
  STAGE.NEW)

/* Migration 119 is applied by hand. Until it is, the column is absent
   from every row — and this must still answer. */
check('no onboarding_status column at all    -> CHOOSE_TRADES',
  partnerStage({ vendor, services: [] }), STAGE.CHOOSE_TRADES)

check('called with nothing                   -> NEW',
  partnerStage(), STAGE.NEW)

console.log('\nROUTE, from the stage\n')

check('NEW             -> the intro screen',
  routeForStage(STAGE.NEW), '/partner/setup')
check('CHOOSE_TRADES   -> the listing tab',
  routeForStage(STAGE.CHOOSE_TRADES), '/dashboard/vendor?tab=list')
check('LIVE            -> the dashboard',
  routeForStage(STAGE.LIVE), '/dashboard/vendor')
check('UNDER_REVIEW    -> the dashboard',
  routeForStage(STAGE.UNDER_REVIEW), '/dashboard/vendor')
check('REQUIRES_ACTION -> the dashboard',
  routeForStage(STAGE.REQUIRES_ACTION), '/dashboard/vendor')

console.log(failed ? `\n${cross} ${failed} failed\n` : `\n${tick} all passed\n`)
process.exit(failed ? 1 : 0)
