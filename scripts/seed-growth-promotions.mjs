#!/usr/bin/env node
/**
 * Seed the three "Your Sambramo Growth" cards as rows.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE CARDS ARE NOT IN THE BUNDLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `PartnerGrowthRail` renders whatever `partner_promotions` holds and
 * renders nothing when it holds nothing. That is deliberate: a campaign
 * that ends on the 31st should not need a Play Store release, and two
 * partners on two builds must never see two different promises.
 *
 * So the copy lives here, applied once, and an operator edits the row
 * afterwards. This script is the initial fill, not the source of truth.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NO AMOUNT IS SEEDED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every row goes in with `reward_type: 'none'` and `reward_paise: null`.
 * `rewardLabel()` returns null for that, so the card shows its sentence
 * and promises no money. Nobody has approved a referral payout, and a
 * number invented by a seed script is a number a partner will later
 * quote back at support. When a real amount is approved, an operator
 * sets `reward_paise` on the row -- in paise -- and the card picks it up
 * without a release.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IDEMPOTENT ON A FIXED ID
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no slug column, so re-running would otherwise add three more
 * cards every time. The ids are fixed constants and the write is an
 * upsert on the primary key: run it twice and the rows are overwritten
 * with themselves.
 *
 *   node scripts/seed-growth-promotions.mjs           # dry run
 *   node scripts/seed-growth-promotions.mjs --apply   # writes
 */
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))

const URL_BASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

/* `cta_route` is CHECKed in 154 to start with `/`, so an operator cannot
   point a card at another origin. These are the real routes the tab
   already serves -- `screen=how-it-works` is the explainer added with
   the review card. */
const TAB = '/dashboard/vendor'

const ROWS = [
  {
    id: 'b1f4a9c2-1d3e-4a57-9c80-5e2f7a61c001',
    type: 'profile',
    title: 'Finish your profile',
    subtitle: 'Get chosen more often',
    body: 'Customers see your photos, your trade and your area before they see anything else. A profile with all three filled in is the one they can actually compare.',
    cta_label: 'Build your profile',
    cta_route: `${TAB}?tab=account&screen=profile`,
    icon: 'user-round',
    /* Only shown to somebody it is true of. A card telling a partner to
       finish a profile they already finished teaches them the rail is
       not paying attention. */
    audience: { profile_incomplete: true },
    qualification: {},
    reward_type: 'none',
    reward_paise: null,
    priority: 30,
    dismissible: true,
    active: true,
  },
  {
    id: 'b1f4a9c2-1d3e-4a57-9c80-5e2f7a61c002',
    type: 'referral',
    title: 'Invite & Earn',
    subtitle: 'Bring a partner you trust',
    body: 'Know a decorator, cook or photographer who does good work? Send them your code. You will both be on the same network.',
    cta_label: 'Invite & Earn',
    cta_route: `${TAB}?tab=account&screen=referral`,
    icon: 'gift',
    /* Empty audience -- every partner may invite somebody. */
    audience: {},
    /* The rule 155 measures a referral against. No minimum is set here
       because none has been agreed; the lifecycle in 155 is what decides
       whether a referral counts, not this card. */
    qualification: {},
    reward_type: 'none',
    reward_paise: null,
    priority: 20,
    dismissible: true,
    active: true,
  },
  {
    id: 'b1f4a9c2-1d3e-4a57-9c80-5e2f7a61c003',
    type: 'announcement',
    title: 'Grow with Sambramo',
    subtitle: 'How the work reaches you',
    body: 'See how a job travels from a customer request to money in your account, and what your calendar has to say for you to be in the running.',
    cta_label: 'See how it works',
    cta_route: `${TAB}?tab=account&screen=how-it-works`,
    icon: 'sparkles',
    audience: {},
    qualification: {},
    reward_type: 'none',
    reward_paise: null,
    priority: 10,
    dismissible: true,
    active: true,
  },
]

/* A promise nobody set must not reach a partner. Checked here as well as
   trusted in the card, because this file is the thing an operator will
   copy when they add a fourth campaign. */
for (const r of ROWS) {
  if (r.reward_paise !== null) {
    console.error(`${r.title}: seeds must not carry an amount`)
    process.exit(1)
  }
  if (!r.cta_route.startsWith('/')) {
    console.error(`${r.title}: cta_route must be a path`)
    process.exit(1)
  }
}

const apply = process.argv.includes('--apply')

console.log(`${ROWS.length} promotions -> ${URL_BASE}`)
for (const r of ROWS) {
  console.log(`  ${r.type.padEnd(13)} ${r.title.padEnd(22)} -> ${r.cta_route}`)
}

if (!apply) {
  console.log('\nDry run. Nothing written. Re-run with --apply.')
  process.exit(0)
}

const res = await fetch(`${URL_BASE}/rest/v1/partner_promotions?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(ROWS),
})

const text = await res.text()
if (!res.ok) {
  console.error(`\nFAILED ${res.status}\n${text}`)
  process.exit(1)
}

const back = JSON.parse(text)
console.log(`\nApplied ${back.length} rows.`)
for (const r of back) {
  console.log(`  ${r.active ? 'active ' : 'paused '} ${r.type.padEnd(13)} ${r.title}`)
}
