/**
 * The 360° recommendation engine: catalogue integrity, the twelve bundle
 * scenarios (README §11), validation and determinism.
 *
 *   npm test        (node --test tests/)
 *
 * The engine and catalogue are bundled with esbuild first (the app's .js
 * files contain JSX-free ESM but import each other without extensions).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/recommend360.test.bundle.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({
  stdin: { contents: `export * from './src/customer/lib/recommend360.js'
    export * from './src/customer/data/catalogue360.generated.js'
    export { RULES, RULES_VERSION } from './src/customer/data/rules360.js'
    export { OCCASIONS, CATEGORIES } from './src/customer/data/occasions.js'
    export { TRADES } from './src/customer/data/trades.js'`, resolveDir: ROOT },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.js': 'jsx' },
})
const E = await import(pathToFileURL(out).href)
const R = (id, ctx) => E.recommend(id, ctx)
const svc = (r, t) => r.services.find(s => s.tradeId === t)
const listed = (r, t) => r.shortlist.includes(t)

/* ── Catalogue integrity ─────────────────────────────────────────────── */
test('catalogue: 18 categories, 438 unique occasions, 34 trades, full matrix', () => {
  assert.equal(E.CATEGORIES.length, 18)
  assert.equal(new Set(E.OCCASIONS.map(o => o.id)).size, 438)
  assert.equal(E.TRADE_ORDER.length, 34)
  assert.deepEqual([...E.TRADE_ORDER].sort(), E.TRADES.map(t => t.id).sort())
  assert.equal(Object.keys(E.BASELINE).length, 438)
  for (const o of E.OCCASIONS) {
    const codes = E.BASELINE[o.id]
    assert.ok(codes, `baseline for ${o.id}`)
    assert.match(codes, /^[CDON]{34}$/, `codes for ${o.id}`)
  }
  assert.equal(Object.keys(E.CATEGORY_SOURCE).length, 18)
})

test('every recommendation has a valid status, phase and reason', () => {
  for (const o of E.OCCASIONS) {
    const r = R(o.id, {})
    assert.equal(r.services.length, 34)
    for (const s of r.services) {
      assert.ok(['CORE', 'CONDITIONAL', 'OPTIONAL', 'NOT_DEFAULT'].includes(s.status), `${o.id}/${s.tradeId}`)
      assert.ok(s.reason && s.reason.length < 90, `${o.id}/${s.tradeId} reason`)
      assert.ok(s.lifecyclePhases.length > 0, `${o.id}/${s.tradeId} phases`)
      assert.equal(typeof s.score, 'number')
    }
    assert.equal(r.ruleVersion, E.RULES_VERSION)
  }
})

test('the rule set validates', () => assert.deepEqual(E.validateRules(E.RULES), []))

/* ── The twelve scenarios ────────────────────────────────────────────── */
test('1. small home birthday, no stage programme', () => {
  const r = R('birthday-party', { venueType: 'home', guests: 15, formats: ['meal'], food: 'meal', time: '18:00', hours: 3 })
  assert.equal(svc(r, 'venue').coveredByVenue, true)
  assert.ok(!listed(r, 'venue'))
  assert.ok(listed(r, 'cake_desserts') && listed(r, 'catering_food'))
  assert.ok(!listed(r, 'sound_av'), 'no stage → no sound by default')
  assert.ok(!listed(r, 'anchor_mc'))
  assert.ok(!listed(r, 'valet_parking') && !listed(r, 'security_services'))
  assert.ok(!listed(r, 'wedding_planning'))
})

test('2. first birthday at a banquet hall that provides sound, lighting, furniture and catering', () => {
  const r = R('first-birthday', { venueType: 'banquet', venueBooked: true, venueProvides: ['sound', 'lighting', 'furniture', 'catering'], guests: 120, formats: ['stage', 'meal'], food: 'meal', time: '19:00', hours: 4 })
  for (const t of ['venue', 'sound_av', 'event_lighting', 'tent_furniture', 'catering_food']) {
    assert.equal(svc(r, t).coveredByVenue, true, `${t} covered`)
    assert.ok(!listed(r, t), `${t} off the shortlist`)
  }
  assert.ok(listed(r, 'anchor_mc'), 'a stage programme still needs a host')
  assert.ok(listed(r, 'photography'))
})

test('3. traditional wedding ceremony with rituals', () => {
  const r = R('wedding-ceremony', { formats: ['ceremony', 'rituals', 'meal'], food: 'meal', guests: 400, time: '07:00', hours: 8 })
  for (const t of ['priest_rituals', 'wedding_planning', 'catering_food', 'photography', 'videography']) assert.ok(listed(r, t), t)
  assert.ok(listed(r, 'security_services'), '400 guests → security')
  assert.ok(listed(r, 'power_cooling'), '8 hours → power')
})

test('4. outdoor evening concert with stage, transport and safety', () => {
  const r = R('live-concert', { setting: 'outdoor', time: '19:00', hours: 5, guests: 2000, public: true, formats: ['concert', 'stage'], travel: 'local' })
  for (const t of ['sound_av', 'event_lighting', 'tent_furniture', 'power_cooling', 'security_services', 'safety_facilities', 'passenger_transport', 'medium_large_goods_vehicle'])
    assert.ok(listed(r, t), t)
  assert.ok(r.phases.length >= 4, 'grouped into lifecycle phases')
})

test('5. corporate conference, hybrid with presentations', () => {
  const r = R('corporate-conference', { venueType: 'hybrid', formats: ['speeches', 'workshop', 'livestream'], guests: 250, food: 'meal' })
  for (const t of ['sound_av', 'videography', 'anchor_mc', 'catering_food', 'guest_services']) assert.ok(listed(r, t), t)
  assert.ok(listed(r, 'venue'), 'hybrid keeps the physical venue')
})

test('6. school annual day in the school, conditional rental and safety', () => {
  const r = R('school-annual-day', { guests: 600, formats: ['stage', 'performance'], children: true, time: '17:30', hours: 4, food: 'snacks' })
  assert.equal(svc(r, 'venue').coveredByVenue, true, 'the school is the venue')
  assert.ok(listed(r, 'safety_facilities') && listed(r, 'security_services'))
  assert.ok(listed(r, 'event_equipment_rental'))
  assert.ok(!listed(r, 'bar_beverages'), 'never a bar at a school')
  assert.equal(svc(r, 'bar_beverages').status, 'NOT_DEFAULT')
})

test('7. virtual / hybrid business event (webinar)', () => {
  const r = R('webinar', { venueType: 'virtual', formats: ['speeches', 'livestream'] })
  assert.ok(listed(r, 'sound_av') && listed(r, 'videography'))
  for (const t of ['venue', 'catering_food', 'tent_furniture', 'valet_parking', 'safety_facilities']) assert.ok(!listed(r, t), `${t} not for online`)
})

test('8. destination wedding with outstation logistics', () => {
  const r = R('destination-wedding', { venueType: 'destination', travel: 'destination', guests: 150, hours: 48, formats: ['rituals', 'ceremony'] })
  for (const t of ['passenger_transport', 'transportation', 'warehouse_storage', 'wedding_planning', 'tent_furniture']) assert.ok(listed(r, t), t)
})

test('9. memorial gathering keeps respectful, non-festive defaults', () => {
  const r = R('memorial-gathering', { guests: 60, food: 'meal' })
  for (const t of ['dj_music', 'live_entertainment', 'bar_beverages', 'cake_desserts', 'gifts_favours']) {
    assert.equal(svc(r, t).status, 'NOT_DEFAULT', `${t} demoted`)
    assert.ok(!listed(r, t))
  }
  assert.ok(listed(r, 'catering_food'))
})

test('10. public festival with crowd and safety considerations', () => {
  const r = R('public-festival', { public: true, guests: 5000, setting: 'outdoor', formats: ['stage', 'performance'], time: '16:00', hours: 8 })
  for (const t of ['security_services', 'safety_facilities', 'sound_av', 'event_lighting', 'tent_furniture', 'power_cooling', 'loading_unloading_crew']) assert.ok(listed(r, t), t)
})

test('11. photographer already booked, videography excluded', () => {
  const r = R('wedding-reception', { arranged: ['photography'], excluded: ['videography'], guests: 300 })
  assert.equal(svc(r, 'photography').alreadyArranged, true)
  assert.equal(svc(r, 'videography').customerExcluded, true)
  assert.ok(!listed(r, 'photography') && !listed(r, 'videography'))
  assert.ok(r.services.some(s => s.tradeId === 'videography'), 'still searchable')
})

test('12. unknown or incomplete context: CORE shortlist plus follow-up questions', () => {
  const r = R('housewarming-ceremony', {})
  assert.ok(r.shortlist.length > 0)
  for (const s of r.services) if (s.status === 'CONDITIONAL' && !s.recommended && s.requiresFollowUpQuestion) assert.ok(s.question?.text)
  assert.ok(r.followUps.length > 0, 'asks what would change the plan')
  assert.ok(!r.services.some(s => s.status === 'CONDITIONAL' && s.recommended && s.triggeredBy.length === 0), 'no conditional shown without a trigger')
})

/* ── Rules, precedence and errors ────────────────────────────────────── */
test('customer choices beat rules; covered services leave the shortlist', () => {
  const r = R('birthday-party', { added: ['dj_music'], venueBooked: true })
  assert.ok(listed(r, 'dj_music') && svc(r, 'dj_music').addedByCustomer)
  assert.ok(!listed(r, 'venue'))
})

test('NOT_DEFAULT is not upgraded against a contradictory fact', () => {
  const r = R('webinar', { venueType: 'virtual', formats: ['rituals'] })
  assert.ok(!listed(r, 'priest_rituals'))
  assert.equal(svc(r, 'priest_rituals').status, 'NOT_DEFAULT')
})

test('conditional services are not defaults when their trigger is unmet', () => {
  const r = R('corporate-conference', { food: 'none', media: 'none' })
  assert.ok(!listed(r, 'catering_food') && !listed(r, 'photography'))
})

test('unknown ids and invalid context give useful errors', () => {
  assert.throws(() => R('no-such-occasion', {}), e => e.code === 'UNKNOWN_OCCASION')
  assert.throws(() => R('birthday-party', { guests: -4 }), e => e.code === 'INVALID_CONTEXT')
  assert.throws(() => R('birthday-party', { arranged: ['spaceship'] }), e => e.code === 'INVALID_CONTEXT' && /spaceship/.test(e.message))
  assert.throws(() => R('birthday-party', { colour: 'red' }), e => /unknown context field/.test(e.message))
})

test('deterministic: same input, same output', () => {
  const ctx = { guests: 250, setting: 'outdoor', formats: ['stage'], time: '18:00', hours: 6 }
  assert.deepEqual(R('sangeet-night', ctx), R('sangeet-night', ctx))
})
