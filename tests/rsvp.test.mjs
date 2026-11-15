/**
 * Invitations & RSVP: the pure parts — pasting a guest list, the headcount,
 * the WhatsApp text, the CSV export. (The database side, rsvp_view and
 * rsvp_submit, is checked live by scripts/check-rsvp-live.mjs once
 * migration 191 is applied.)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/rsvp.test.bundle.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({
  stdin: { contents: "export { parseGuestList, tally, inviteText, guestsCsv, whatsappUrl, rsvpLink, functionsFor } from './src/customer/lib/rsvp.js'", resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.js': 'jsx' },
  plugins: [{ name: 'stub-supabase', setup: b => b.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: join(ROOT, 'tests/stubs/supabase.mjs') })) }],
})
const R = await import(pathToFileURL(out).href)

test('pasted list: names, Indian numbers normalised, duplicates skipped', () => {
  const { guests, dupes } = R.parseGuestList('Ravi Kumar, 98450 12345\nAnita Rao 9886012345\n\nMeena aunty\nRavi again +91 98450-12345\n  ,  \n', [{ phone: '+919886012345' }])
  assert.deepEqual(guests, [{ name: 'Ravi Kumar', phone: '+919845012345' }, { name: 'Meena aunty', phone: null }])
  assert.deepEqual(dupes, ['Anita Rao', 'Ravi again'])
})

test('headcount counts only people who are coming, and meals by head', () => {
  const t = R.tally([
    { status: 'attending', adults: 2, kids: 1, meal: 'veg', opened_at: 'x' },
    { status: 'attending', adults: 1, kids: 0, meal: 'jain', opened_at: 'x', checked_in_at: 'y' },
    { status: 'maybe', adults: 2, kids: 0 },
    { status: 'declined', adults: 0, kids: 0, opened_at: 'x' },
    { status: 'pending', adults: 0, kids: 0 },
  ])
  assert.equal(t.heads, 4); assert.equal(t.adults, 3); assert.equal(t.kids, 1)
  assert.deepEqual([t.invited, t.attending, t.maybe, t.declined, t.pending, t.opened, t.arrived], [5, 2, 1, 1, 1, 3, 1])
  assert.deepEqual(t.meals, { veg: 3, jain: 1 })
})

test('invite text carries the personal link; a reminder says so', () => {
  const inv = { title: 'Riya’s 1st Birthday', hosts_line: 'Priya & Arjun', event_date: '2026-11-14', start_time: '19:00:00', venue_name: 'Palace Grounds', open_token: 'OPEN0000000000000000000000' }
  const g = { name: 'Ravi Kumar', token: 'GUEST000000000000000000000' }
  const t = R.inviteText(inv, g)
  assert.match(t, /^Hi Ravi! You’re invited to Riya’s 1st Birthday — Priya & Arjun on Sat, 14 Nov/)
  assert.ok(t.endsWith(R.rsvpLink(g.token)))
  assert.match(R.inviteText(inv, g, { reminder: true }), /gentle reminder/)
  assert.ok(R.inviteText(inv).endsWith(R.rsvpLink(inv.open_token)), 'no guest → the open link')
  assert.match(R.whatsappUrl('a b', '+91 98450 12345'), /^https:\/\/wa\.me\/919845012345\?text=a%20b$/)
})

test('CSV escapes quotes and lists each function', () => {
  const inv = { invitation_functions: [{ id: 'f1', name: 'Haldi' }, { id: 'f2', name: 'Reception' }] }
  const csv = R.guestsCsv(inv, [{ name: 'Ravi "RK" Kumar', phone: '+91', status: 'attending', adults: 2, kids: 0, invitation_guest_functions: [{ function_id: 'f1', attending: true }, { function_id: 'f2', attending: false }] }])
  const [head, row] = csv.split('\n')
  assert.ok(head.endsWith('"Haldi","Reception"'))
  assert.ok(row.startsWith('"Ravi ""RK"" Kumar"'))
  assert.ok(row.endsWith('"yes","no"'))
})

test('weddings start with their functions', () => {
  assert.deepEqual(R.functionsFor({ id: 'wedding-ceremony', category: 'wedding' }), ['Haldi', 'Mehendi', 'Sangeet', 'Wedding ceremony', 'Reception'])
  assert.deepEqual(R.functionsFor({ id: 'birthday-party', category: 'life' }), [])
})
