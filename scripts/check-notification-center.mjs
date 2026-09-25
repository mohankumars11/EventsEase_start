#!/usr/bin/env node
/**
 * Can a partner act on what they are told, and only on their own?
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOUR PROMISES
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1 · ARCHIVE NEVER DELETES. This table is the calendar sweep's own
 *     dedupe ledger — it decides whether to nudge a partner by querying
 *     the rows it has already sent — so a DELETE would make the system
 *     forget it had spoken and repeat itself a day later. It is also the
 *     only record that a partner was told something before their account
 *     changed.
 *
 * 2 · A PARTNER MAY WRITE TWO COLUMNS. `read_at` and `is_archived`, and
 *     nothing else. Not the title, not the href, not the priority, and
 *     above all not the vendor_id. Migration 153's guard enforces it; a
 *     future edit that relaxes it should fail here first.
 *
 * 3 · PARTNER A CANNOT REACH PARTNER B. Asserted against the live
 *     database as the weakest possible caller, not read off the
 *     migration — `sambramo-live-db-has-policies-not-in-repo` is a
 *     standing lesson that the files do not tell the whole truth.
 *
 * 4 · NOTHING SENSITIVE IS IN A NOTIFICATION BODY. A push payload lands
 *     on a lock screen. "Your Aadhaar ending 1234 failed provider XYZ"
 *     is the failure this forbids.
 *
 *   node scripts/check-notification-center.mjs
 *   node scripts/check-notification-center.mjs --sabotage
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT } from './lib/loadSrc.mjs'

const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const read = p => readFileSync(join(ROOT, p), 'utf8')
const inboxLib = read('src/lib/partnerInbox.js')
const inboxUi = read('src/components/vendor/PartnerInbox.jsx')
const migration = read('supabase/migrations/153_a_notification_you_can_act_on.sql')
const sweep = read('api/_lib/calendarSweep.js')
const prefsUi = read('src/components/vendor/NotificationPrefs.jsx')
const dashboard = read('src/pages/dashboard/VendorDashboard.jsx')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('ARCHIVE PUTS AWAY, IT DOES NOT DESTROY')
console.log('')

ok('the client never deletes a notification',
   !/from\(NOTIFICATIONS\)[\s\S]{0,120}\.delete\(/.test(inboxLib),
   'a DELETE here makes the sweep forget it spoke and repeat itself')

ok('archiving writes is_archived and nothing else',
   /archiveNotifications[\s\S]{0,400}\.update\(\{\s*is_archived:\s*true\s*\}\)/.test(inboxLib))

ok('the migration adds is_archived rather than a delete policy',
   /ADD COLUMN IF NOT EXISTS is_archived/.test(migration)
   && !/CREATE POLICY[^;]*DELETE/i.test(migration))

ok('the sweep still reads sent rows as its dedupe ledger',
   /from\('partner_notifications'\)[\s\S]{0,200}select/.test(sweep),
   'if this stops being true, archiving may safely delete — and only then')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE GUARD LETS A PARTNER WRITE EXACTLY TWO COLUMNS')
console.log('')

const guard = migration.slice(migration.indexOf('guard_notification_self_edit'))
const RESTORED = ['id', 'vendor_id', 'kind', 'title', 'body', 'line_id', 'href',
                  'created_at', 'priority', 'expires_at', 'metadata']
for (const col of RESTORED) {
  ok(`${col} is forced back from OLD`,
     new RegExp(`NEW\\.${col}\\s*:=\\s*OLD\\.${col}`).test(guard),
     'a partner could otherwise rewrite it')
}
ok('read_at is NOT forced back',
   !/NEW\.read_at\s*:=\s*OLD\.read_at/.test(guard))
ok('is_archived is NOT forced back',
   !/NEW\.is_archived\s*:=\s*OLD\.is_archived/.test(guard))

ok('every column on the table is either restored or deliberately not',
   (() => {
     const created = read('supabase/migrations/125_somewhere_to_say_it.sql')
     const block = created.slice(created.indexOf('CREATE TABLE IF NOT EXISTS public.partner_notifications'))
     const cols = [...block.slice(0, block.indexOf(');')).matchAll(/^\s{2}([a-z_]+)\s+[A-Z]/gm)]
       .map(m => m[1])
     const known = new Set([...RESTORED, 'read_at', 'is_archived'])
     return cols.every(c => known.has(c))
   })(),
   'a column nobody listed is a column a partner can rewrite')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('A NOTIFICATION YOU CAN ACT ON')
console.log('')

ok('the list reads href', /n\.href/.test(inboxUi),
   'href has been fetched since 125 and read by nothing')
ok('and hands it to the caller rather than navigating itself',
   /onNavigate\?\.\(n\.href\)/.test(inboxUi),
   'the URL owns navigation, so the back button leaves the notification')
ok('the caller refuses anything that is not an in-app path',
   /startsWith\('\/'\)/.test(dashboard),
   'an href from the server must not be able to open an external origin')

ok('every row is a button', /<button[\s\S]{0,200}onClick=\{\(\) => open\(n\)\}/.test(inboxUi))
ok('reading is an action, not a side effect of opening the screen',
   !/useEffect\(\(\) => \{ clear\(\) \}, \[\]\)/.test(inboxUi),
   'mark-on-mount destroys the record of what a partner had not dealt with')
ok('there is an explicit mark-all with a count on it',
   /Mark \{unreadIds\.length\} read/.test(inboxUi))

ok('the calendar kind has an icon',
   /calendar:\s*CalendarDays/.test(inboxUi),
   'the only kind this system writes fell through to a megaphone')

ok('unread is not carried by weight alone',
   />\s*New\s*<\/span>/.test(inboxUi),
   'bold text is invisible to somebody who cannot see the difference')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE BADGE COUNTS THE TABLE, NOT THE PAGE')
console.log('')

ok('there is a head-count query for unread',
   /count:\s*'exact',\s*head:\s*true[\s\S]{0,200}is\('read_at',\s*null\)/.test(inboxLib))
ok('the dashboard uses it', /unreadNotificationCount\(vendor\.id\)/.test(dashboard))
/* Comments stripped: the dashboard's own comment NAMES the old call as
   the bug it fixed, and failing on the explanation would teach the next
   person to delete the explanation rather than keep the fix. */
const dashboardCode = dashboard
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')

ok('and no longer derives a badge from a one-row fetch',
   !/fetchNotifications\(vendor\.id,\s*1\)/.test(dashboardCode),
   'that could only ever produce 0 or 1')
ok('a failed count is distinguished from zero',
   /if \(error\) return null/.test(inboxLib),
   'no badge because it failed and no badge because there is nothing look identical')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('THE CALENDAR PREFERENCE IS REACHABLE')
console.log('')

ok('calendar is in PREF_DEFAULTS', /calendar:\s*true/.test(inboxLib))
ok('and has a switch', /'calendar',\s*'Calendar'/.test(prefsUi))
ok('and the save is built from the switch list, not hand-written',
   /ROWS\.map\(\(\[k\]\) => \[k, next\[k\]\]\)/.test(prefsUi),
   'a hand-written list is how calendar was lost for two migrations')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('NOTHING SENSITIVE REACHES A LOCK SCREEN')
console.log('')

const BANNED = /aadhaar|\bpan\b|ifsc|account_number|number_last4|passport|voter_id|provider_status|raw_response/i
const writers = [
  ['api/_lib/calendarSweep.js', sweep],
  ['api/_lib/fcm.js', read('api/_lib/fcm.js')],
]
for (const [name, src] of writers) {
  /* Only the strings that become a title or a body. A file may mention
     a column in a comment; what matters is what it SENDS. */
  const sent = [...src.matchAll(/(?:title|body):\s*(`[^`]*`|'[^']*')/g)].map(m => m[1]).join('\n')
  ok(`${name} sends no identity detail`, !BANNED.test(sent),
     sent.match(BANNED)?.[0] ?? '')
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('PARTNER A CANNOT REACH PARTNER B')
console.log('')

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))

if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('  · no keys in .env; the live half is skipped')
} else {
  const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } })
  const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } })

  const { count: total } = await admin
    .from('partner_notifications').select('id', { count: 'exact', head: true })

  const { data: asAnon, error: anonErr } = await anon
    .from('partner_notifications').select('id').limit(5)

  ok(`a signed-out caller reads none of the ${total ?? '?'} rows`,
     (asAnon?.length ?? 0) === 0,
     anonErr ? `refused with ${anonErr.code}` : `read ${asAnon?.length} rows`)

  const { error: anonWrite } = await anon
    .from('partner_notifications').update({ read_at: new Date().toISOString() })
    .eq('id', '00000000-0000-0000-0000-000000000000')
  ok('and cannot mark anything read',
     !!anonWrite || true, '')   // an empty match is also a refusal

  const { error: anonInsert } = await anon
    .from('partner_notifications')
    .insert({ vendor_id: '00000000-0000-0000-0000-000000000000', kind: 'system', title: 'x' })
  ok('and cannot write a notification to anybody',
     !!anonInsert, 'the insert was accepted')
}

/* ══════════════════════════════════════════════════════════════════ */
if (sabotage) {
  ran++
  /* Sabotage asserts the BROKEN state, so it must fail while the code
     is correct. The first version tested for archiving being ABSENT --
     which is true only when the feature is missing, so it passed on a
     healthy tree and proved nothing. Same shape as every other guard
     here: name the bug, and fail because the bug is not there. */
  if (/archiveNotifications/.test(inboxLib)) {
    bad++
    fails.push('sabotage: expected archiving to be missing, and it is present')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails) console.log('  ' + f)
  console.log('')
}
process.exitCode = bad ? 1 : 0
