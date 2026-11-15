/**
 * Occasion blueprints — the whole test suite, across every category.
 *
 *   npm test
 *
 * Catalogue integrity, per-occasion coverage, the dynamic question
 * engine, the recommendation rules (including every "never assume" the
 * brief names), the free toolkit, toggles and determinism. The universal
 * rules run against every written category; the Category-1 cases that
 * name a specific occasion still name it.
 *
 * The engine and its data are bundled with esbuild first: the app's .js
 * files are JSX-free ESM but import each other without extensions.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const out = join(ROOT, 'node_modules/.cache/lifeBlueprints.test.bundle.mjs')
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true })
await build({
  stdin: {
    contents: `export * from './src/customer/lib/occasionPlan.js'
      export { LIFE_BLUEPRINTS, LIFE_BLUEPRINT } from './src/customer/data/lifeBlueprints.js'
      export { BLUEPRINTS, BLUEPRINT, BY_CATEGORY } from './src/customer/data/blueprints.js'
      export { TRADE_WORDS } from './src/customer/data/blueprintKit.js'
      export { TOOLKIT } from './src/customer/data/celebrationToolkit.js'
      export { OCCASIONS, CATEGORY } from './src/customer/data/occasions.js'
      export { TRADES, TRADE } from './src/customer/data/trades.js'
      export { blueprint } from './src/customer/lib/blueprint.js'
      export { needsFor, contextFor } from './src/customer/state/PlanContext.jsx'`,
    resolveDir: ROOT,
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.js': 'jsx' },
})
const E = await import(pathToFileURL(out).href)

const LIFE = E.CATEGORY.life.occasions
/* Every occasion that HAS a blueprint, across every category written so
   far. The engine rules below are universal, so they run against all of
   them; the Category-1 tests keep using LIFE. */
const MAPPED = Object.values(E.BY_CATEGORY).flat().map(b => E.OCCASIONS.find(o => o.id === b.id))
const OCC = Object.fromEntries(E.OCCASIONS.map(o => [o.id, o]))
const TRADE_IDS = new Set(E.TRADES.map(t => t.id))
const plan = (id, o = {}) => E.occasionPlan(OCC[id], o)
const rowFor = (p, trade) => p.recommended.find(r => r.tradeId === trade)
const isOn = (p, trade) => !!rowFor(p, trade)?.on
const shown = (p, trade) => !!rowFor(p, trade)

/* The names and the order the master catalogue gives, verbatim. */
const NAMES = [
  'Birthday Party', 'First Birthday', 'Kids’ Birthday Party', 'Teen Birthday Party', 'Milestone Birthday',
  'Surprise Birthday Party', 'Wedding Anniversary', 'Silver Jubilee Anniversary', 'Golden Jubilee Anniversary',
  'Engagement Celebration', 'Marriage Proposal', 'Valentine’s Day Celebration', 'Baby Shower', 'Gender Reveal Party',
  'Naming Ceremony', 'Cradle Ceremony', 'Rice-Feeding Ceremony', 'Housewarming Ceremony', 'Retirement Party',
  'Graduation Celebration', 'Family Reunion', 'Friends’ Get-Together', 'Farewell Party', 'Bachelor Party',
  'Bachelorette Party', 'Bridal Shower', 'Private Dinner Party', 'Children’s Theme Party', 'Pet Birthday Party',
  'Memorial Gathering', 'Celebration of Life',
]

/* ── Part 2 · the catalogue ───────────────────────────────────────── */

test('catalogue · all 31 occasions, exact names, original order', () => {
  assert.equal(LIFE.length, 31)
  assert.deepEqual(LIFE.map(o => o.name), NAMES)
})

test('catalogue · no duplicate ids, every one in PERSONAL_CELEBRATIONS', () => {
  const ids = LIFE.map(o => o.id)
  assert.equal(new Set(ids).size, 31)
  for (const o of LIFE) assert.equal(o.category, 'life')
})

test('catalogue · Haldi is a wedding ceremony, not a personal celebration', () => {
  assert.ok(!LIFE.some(o => o.id === 'haldi-ceremony'))
  assert.equal(E.OCCASIONS.find(o => o.id === 'haldi-ceremony').category, 'wedding')
})

test('catalogue · all 31 have an individually configured blueprint', () => {
  for (const o of LIFE) {
    const b = E.LIFE_BLUEPRINT[o.id]
    assert.ok(b, `${o.id} has no blueprint`)
    assert.equal(b.id, o.id)
  }
  assert.equal(E.LIFE_BLUEPRINTS.length, 31)
})

/* ── Part 3 · blueprint completeness ──────────────────────────────── */

test('blueprints · every one is complete, and none is a copy of another', () => {
  const hooks = new Set(), statements = new Set()
  for (const b of E.BLUEPRINTS) {
    assert.ok(b.hook && b.hook.length <= 14, `${b.id}: hook`)
    assert.ok(b.statement?.length > 20, `${b.id}: statement`)
    assert.ok(b.about?.length > 20, `${b.id}: description`)
    assert.ok(b.ask.length >= 4, `${b.id}: only ${b.ask.length} questions`)
    assert.ok(b.plan.length >= 8, `${b.id}: only ${b.plan.length} services`)
    assert.ok(b.addons.length >= 3, `${b.id}: only ${b.addons.length} add-ons`)
    assert.ok(b.formats.length >= 1, `${b.id}: formats`)
    for (const phase of ['before', 'during', 'after']) assert.ok(b.timeline[phase]?.length >= 2, `${b.id}: ${phase}`)
    assert.ok(b.checklist.length >= 3, `${b.id}: checklist`)
    assert.equal(typeof b.v, 'number')
    statements.add(b.statement)
  }
  /* Hooks may repeat where two occasions genuinely share a feeling;
     statements never may — that would be one mapping worn twice. */
  assert.equal(statements.size, E.BLUEPRINTS.length, 'two occasions share a marketing statement')
})

test('blueprints · every service has a hook, a line and a classification', () => {
  const KINDS = new Set(['essential', 'recommended', 'optional', 'conditional'])
  for (const b of E.BLUEPRINTS) {
    for (const s of b.plan) {
      assert.ok(KINDS.has(s.kind), `${b.id}/${s.trade}: kind ${s.kind}`)
      assert.ok(s.hook && s.hook.length <= 14, `${b.id}/${s.trade}: hook`)
      assert.ok(s.line?.length > 10 && s.line.length <= 70, `${b.id}/${s.trade}: line "${s.line}"`)
      if (s.kind === 'conditional') assert.ok(s.when?.length, `${b.id}/${s.trade}: conditional with no condition`)
    }
  }
})

test('blueprints · every trade id is a real registry id — nothing invented', () => {
  for (const b of E.BLUEPRINTS) {
    for (const s of b.plan) assert.ok(TRADE_IDS.has(s.trade), `${b.id}: ${s.trade}`)
    for (const a of b.addons) if (a.trade) assert.ok(TRADE_IDS.has(a.trade), `${b.id}/${a.id}: ${a.trade}`)
  }
})

test('blueprints · the occasions differ from each other, genuinely', () => {
  const sig = b => b.plan.map(s => `${s.trade}:${s.kind}`).sort().join('|')
  const seen = new Map()
  for (const b of E.BLUEPRINTS) {
    const k = sig(b)
    assert.ok(!seen.has(k), `${b.id} has the same mapping as ${seen.get(k)}`)
    seen.set(k, b.id)
  }
})

test('blueprints · every question is well formed and uniquely keyed', () => {
  const TYPES = new Set(['one', 'many', 'text', 'number', 'yesno', 'select'])
  for (const b of E.BLUEPRINTS) {
    const keys = new Set()
    for (const q of b.ask) {
      assert.ok(TYPES.has(q.type), `${b.id}/${q.k}: type ${q.type}`)
      assert.ok(!keys.has(q.k), `${b.id}: duplicate question ${q.k}`)
      keys.add(q.k)
      if (q.type === 'one' || q.type === 'many' || q.type === 'select') assert.ok(q.options?.length >= 2, `${b.id}/${q.k}: options`)
      assert.ok(q.label.length > 3, `${b.id}/${q.k}: label`)
    }
    /* Not a questionnaire: Event Details must stay completable. */
    assert.ok(b.ask.filter(q => !q.optional).length <= 12, `${b.id}: ${b.ask.filter(q => !q.optional).length} required questions`)
  }
})

test('blueprints · a condition can only name a question the occasion asks', () => {
  const keys = c => (!Array.isArray(c) ? [] : c[0] === 'ans' || c[0] === 'has' || c[0] === 'gt' ? [c[1]] : c.slice(1).flatMap(keys))
  for (const b of E.BLUEPRINTS) {
    const asked = new Set([...b.ask.map(q => q.k), 'arranged'])
    for (const r of [...b.plan, ...b.addons, ...b.ask]) {
      for (const c of [...(r.when ?? []), ...(r.unless ?? [])]) {
        for (const k of keys(c)) assert.ok(asked.has(k), `${b.id}/${r.trade ?? r.id ?? r.k}: condition reads "${k}", which is never asked`)
      }
    }
  }
})

/* ── Part 4 · the dynamic question engine ─────────────────────────── */

test('questions · each occasion loads its own, and switching changes them', () => {
  const fb = E.questionsFor(OCC['first-birthday'], {}).map(q => q.k)
  const nc = E.questionsFor(OCC['naming-ceremony'], {}).map(q => q.k)
  const wa = E.questionsFor(OCC['wedding-anniversary'], {}).map(q => q.k)
  assert.ok(fb.includes('kids') && fb.includes('baby_comfort'))
  assert.ok(nc.includes('priest') && nc.includes('timing_given'))
  assert.ok(wa.includes('year') && wa.includes('surprise'))
  assert.notDeepEqual(fb, nc)
  assert.notDeepEqual(nc, wa)
})

test('questions · we never re-ask what the system already knows', () => {
  for (const b of E.BLUEPRINTS) {
    for (const q of b.ask) {
      assert.ok(!/^(date|time|duration|guests|location|occasion)$/.test(q.k), `${b.id}: re-asks ${q.k}`)
      assert.ok(!/which occasion|what are you celebrating/i.test(q.label), `${b.id}: ${q.label}`)
    }
  }
})

test('questions · conditional ones appear only once their trigger is answered', () => {
  const o = OCC['naming-ceremony']
  const before = E.questionsFor(o, { answers: {} }).map(q => q.k)
  const after = E.questionsFor(o, { answers: { priest: 'yes' } }).map(q => q.k)
  assert.ok(!before.includes('ritual_language'))
  assert.ok(after.includes('ritual_language'))
})

test('questions · required ones validate, optional ones may stay empty', () => {
  const o = OCC['first-birthday']
  assert.ok(E.missingAnswers(o, { answers: {} }).includes('kids'))
  assert.ok(!E.missingAnswers(o, { answers: {} }).includes('child_name'))
  const full = Object.fromEntries(E.questionsFor(o, { answers: {} }).filter(q => !q.optional).map(q => [q.k, 'x']))
  assert.deepEqual(E.missingAnswers(o, { answers: full }), [])
})

test('questions · an answer to a question that disappeared is dropped', () => {
  const o = OCC['naming-ceremony']
  const kept = E.pruneAnswers(o, { answers: { priest: 'no', ritual_language: 'tamil' } })
  assert.equal(kept.priest, 'no')
  assert.equal(kept.ritual_language, undefined)
})

/* ── Parts 6, 8, 11 · the recommendation rules ────────────────────── */

test('engine · different occasions produce different plans', () => {
  const a = plan('first-birthday').recommended.filter(r => r.on).map(r => r.tradeId).sort()
  const b = plan('memorial-gathering').recommended.filter(r => r.on).map(r => r.tradeId).sort()
  const c = plan('private-dinner-party').recommended.filter(r => r.on).map(r => r.tradeId).sort()
  assert.notDeepEqual(a, b)
  assert.notDeepEqual(b, c)
  assert.notDeepEqual(a, c)
})

test('engine · Rule A — a restaurant celebration is never sold a caterer', () => {
  for (const id of ['birthday-party', 'first-birthday', 'wedding-anniversary', 'baby-shower']) {
    const p = plan(id, { event: { venueChoice: 'restaurant' }, answers: { food_way: 'restaurant' } })
    assert.ok(!isOn(p, 'catering_food'), `${id}: catering at a restaurant`)
    assert.ok(p.recommended.some(r => r.tradeId === 'restaurant'), `${id}: no table to book`) // trade #35 (2026-11-11)
  }
})

test('engine · Rule B — at home, catering and clean-up become possible', () => {
  const p = plan('birthday-party', { event: { venueChoice: 'home', guests: 40 }, answers: { food_way: 'catering', cleanup: 'yes' } })
  assert.ok(isOn(p, 'catering_food'))
  assert.ok(isOn(p, 'safety_facilities'))
  assert.ok(!shown(p, 'venue'), 'a venue was offered to someone celebrating at home')
})

test('engine · Rule C — an already-arranged service is never re-sold', () => {
  const p = plan('first-birthday', { answers: { arranged: ['photography', 'cake_desserts'] } })
  assert.ok(!shown(p, 'photography'))
  assert.ok(!shown(p, 'cake_desserts'))
  assert.deepEqual(p.arranged.map(r => r.tradeId).sort(), ['cake_desserts', 'photography'])
  assert.ok(!p.needed.includes('photography'))
})

test('engine · Rule D — a declined service stays declined through recalculation', () => {
  const picks = { decoration_floral: 'skip' }
  const a = plan('birthday-party', { picks })
  assert.ok(!a.needed.includes('decoration_floral'))
  const b = plan('birthday-party', { picks, event: { guests: 300, venueChoice: 'banquet' }, answers: { style: 'grand' } })
  assert.ok(!b.needed.includes('decoration_floral'), 'a bigger event un-declined a choice')
})

test('engine · Rule E — a venue is offered only to someone who asked for one', () => {
  assert.ok(shown(plan('birthday-party', { event: { venueChoice: 'need' } }), 'venue'))
  assert.ok(!shown(plan('birthday-party', { event: { venueChoice: 'have' } }), 'venue'))
  assert.ok(!shown(plan('housewarming-ceremony', { event: { venueChoice: 'home' } }), 'venue'))
})

test('engine · Rule G — "no photography" is honoured everywhere', () => {
  for (const id of ['first-birthday', 'kids-birthday-party', 'wedding-anniversary', 'bridal-shower', 'graduation-celebration']) {
    const p = plan(id, { answers: { photos: 'no' } })
    assert.ok(!shown(p, 'photography'), `${id}: photography after a refusal`)
    assert.ok(!shown(p, 'videography'), `${id}: video after a refusal`)
    assert.ok(!p.addons.some(a => a.tradeId === 'photography'), `${id}: a photo add-on after a refusal`)
  }
})

test('engine · Rule J — a priest is never assumed, for any ceremony', () => {
  for (const id of ['naming-ceremony', 'cradle-ceremony', 'rice-feeding-ceremony', 'housewarming-ceremony', 'silver-jubilee-anniversary']) {
    assert.ok(!shown(plan(id), 'priest_rituals'), `${id}: a priest nobody asked for`)
    assert.ok(!shown(plan(id, { answers: { priest: 'no' } }), 'priest_rituals'), `${id}: a priest after "no"`)
    assert.ok(isOn(plan(id, { answers: { priest: 'yes' } }), 'priest_rituals'), `${id}: no priest after "yes"`)
    /* A family's own practitioner is theirs — we do not find a second one. */
    assert.ok(!shown(plan(id, { answers: { priest: 'have' } }), 'priest_rituals'), `${id}: a second priest`)
  }
})

test('engine · a bachelor party assumes neither a bar nor a DJ', () => {
  for (const id of ['bachelor-party', 'bachelorette-party']) {
    const quiet = plan(id, { answers: { style: id === 'bachelor-party' ? 'gaming' : 'spa', drinks: 'none', music: 'none' } })
    assert.ok(!shown(quiet, 'bar_beverages'), `${id}: a bar nobody asked for`)
    assert.ok(!shown(quiet, 'dj_music'), `${id}: a DJ nobody asked for`)
    const loud = plan(id, { answers: { drinks: 'bar', music: 'dj' } })
    assert.ok(isOn(loud, 'bar_beverages') && isOn(loud, 'dj_music'), `${id}: asked for, not given`)
  }
})

test('engine · a friends’ meet-up gets no decorator, caterer, anchor or photographer', () => {
  const p = plan('friends-get-together', { event: { venueChoice: 'restaurant' }, answers: { kind: 'dinner', food_way: 'restaurant' } })
  for (const t of ['decoration_floral', 'anchor_mc', 'catering_food']) assert.ok(!shown(p, t), `a meet-up was offered ${t}`)
  assert.ok(!isOn(p, 'photography'), 'a meet-up pre-ticked a photographer')
  assert.ok(p.recommended.some(r => r.tradeId === 'restaurant'), 'no restaurant to find')
})

test('engine · a memorial is never sold a party', () => {
  for (const id of ['memorial-gathering', 'celebration-of-life']) {
    const p = plan(id)
    for (const t of ['dj_music', 'cake_desserts', 'gifts_favours', 'bridal_makeup_hair']) {
      assert.ok(!shown(p, t), `${id}: offered ${t}`)
    }
    assert.ok(!isOn(p, 'photography'), `${id}: photography without being asked`)
    assert.ok(isOn(plan(id, { answers: { photos_consent: 'yes' } }), 'photography'), `${id}: refused when asked`)
  }
})

test('engine · a pet party is never offered a human cake or loud entertainment', () => {
  const p = plan('pet-birthday-party', { answers: { pet_food: 'none', temperament: 'alone' } })
  assert.ok(!shown(p, 'cake_desserts'), 'a cake for a pet who is not having one')
  assert.ok(!shown(p, 'dj_music'))
  assert.ok(!shown(p, 'live_entertainment'), 'play dates for an animal that prefers to be alone')
  assert.ok(isOn(plan('pet-birthday-party', { answers: { pet_food: 'pet_cake' } }), 'cake_desserts'))
})

test('engine · a one-year-old and a teenager are not the same birthday', () => {
  const baby = plan('first-birthday', { answers: { activities: ['games'] } })
  const teen = plan('teen-birthday-party', { answers: { music: 'dj', guardian: 'yes' } })
  assert.ok(!shown(baby, 'dj_music'), 'a DJ at a first birthday')
  assert.ok(isOn(teen, 'dj_music'))
  assert.ok(isOn(baby, 'photography'))
})

test('engine · heavy operations never reach a small home celebration', () => {
  const p = plan('birthday-party', { event: { venueChoice: 'home', guests: 25 } })
  for (const t of ['end_to_end_event_logistics', 'security_services', 'valet_parking', 'power_cooling', 'medium_large_goods_vehicle', 'warehouse_storage']) {
    assert.ok(!shown(p, t), `a home birthday was offered ${t}`)
  }
})

test('engine · defaults — essentials and recommended on, optional off', () => {
  for (const o of MAPPED) {
    const p = plan(o.id)
    for (const r of p.recommended) {
      if (r.kind === 'essential' || r.kind === 'recommended') assert.ok(r.on, `${o.id}/${r.id}: ${r.kind} but off`)
      if (r.kind === 'optional') assert.ok(!r.on, `${o.id}/${r.id}: optional but on`)
    }
    for (const a of p.addons) assert.ok(!a.on, `${o.id}/${a.id}: an add-on starts on`)
  }
})

test('engine · an add-on never duplicates a service already on the plan', () => {
  for (const o of MAPPED) {
    const p = plan(o.id)
    const onPlan = new Set(p.recommended.map(r => r.tradeId))
    for (const a of p.addons) {
      if (a.bookable) assert.ok(!onPlan.has(a.tradeId), `${o.id}/${a.id}: sells ${a.tradeId} twice`)
      /* Otherwise it must say what it is instead: an upgrade that joins a
         service already chosen, or an idea with no partner behind it. */
      else assert.ok(a.joins || a.experience, `${o.id}/${a.id}: neither bookable, nor an upgrade, nor an idea`)
      if (a.joins) assert.ok(onPlan.has(a.joins) && a.reason, `${o.id}/${a.id}: joins a service that is not on the plan`)
    }
  }
})

/* The first answer to every required question: what a customer who
   accepted every default would send. Every occasion must plan from it. */
const defaults = o => Object.fromEntries(
  E.questionsFor(OCC[o.id], { answers: {} }).filter(q => !q.optional && q.options?.length)
    .map(q => [q.k, q.options[0][0]]))

test('engine · every occasion plans from the answers a customer actually gives', () => {
  for (const o of MAPPED) {
    const p = plan(o.id, { event: { venueChoice: 'need', guests: o.bands[1] }, answers: defaults(o) })
    assert.ok(p.recommended.length >= 3, `${o.id}: only ${p.recommended.length} services`)
    assert.ok(p.needed.length >= 1, `${o.id}: nothing selected`)
    assert.ok(p.recommended.every(r => r.hook && r.line), `${o.id}: a card with no words`)
  }
})

test('engine · every row is named after itself, never after its trade twice', () => {
  for (const o of MAPPED) {
    const p = plan(o.id)
    for (const r of p.recommended) assert.ok(r.name && r.name !== r.hook, `${o.id}/${r.id}: no service name`)
    const names = new Set(p.recommended.map(r => r.name))
    for (const a of p.addons) {
      assert.ok(a.name && a.name !== a.hook, `${o.id}/${a.id}: no add-on name`)
      assert.ok(!names.has(a.name), `${o.id}/${a.id}: add-on is named after a service already listed`)
      assert.ok(!/_/.test(a.name), `${o.id}/${a.id}: "${a.name}" is an id, not a name`)
    }
  }
})

test('engine · one trade is never two live rows (the toggle keys on it)', () => {
  const cases = [{}, { event: { venueChoice: 'need' } }, { event: { venueChoice: 'restaurant' } },
    { event: { venueChoice: 'need' }, answers: { food_way: 'restaurant', dining: 'restaurant', where_kind: 'restaurant', kind: 'dinner' } }]
  for (const o of MAPPED) for (const c of cases) {
    const live = plan(o.id, c).recommended.map(r => r.tradeId)
    assert.equal(new Set(live).size, live.length, `${o.id}: two live rows on one trade — ${live.join(',')}`)
  }
})

/**
 * The test above checks the OUTPUT, which the engine guarantees by
 * construction — so it can never fail. This one checks the DATA: a
 * blueprint that declares two rows on one trade whose conditions can
 * both be true has written a row that can never reach a customer,
 * because the engine keeps the first and drops the rest. Thirteen such
 * rows existed before this test did.
 *
 * The sweep is over the occasion's own answer space, seeded, so a
 * failure is reproducible and the suite does not flicker.
 */
test('blueprints · a declared row can always be reached', () => {
  let seed = 20261107
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const pick = a => a[Math.min(a.length - 1, (rnd() * a.length) | 0)]
  const valuesOf = q => q.options ? q.options.map(o => o[0]) : q.type === 'yesno' ? ['yes', 'no'] : ['x', '']
  const VENUES = ['home', 'need', 'have', 'restaurant', 'outdoor', 'banquet', 'newhome']

  for (const b of E.BLUEPRINTS) {
    const byTrade = new Map()
    for (const s of b.plan) byTrade.set(s.trade, [...(byTrade.get(s.trade) ?? []), s])
    for (const [trade, rows] of byTrade) {
      if (rows.length < 2) continue
      for (let i = 0; i < 400; i++) {
        const answers = {}
        for (const q of b.ask) { const v = valuesOf(q); answers[q.k] = q.type === 'many' ? [pick(v)] : pick(v) }
        const ctx = { answers, venue: pick(VENUES), guests: pick([10, 60, 150, 400, 900]) }
        const live = rows.filter(r => (r.when ?? []).every(c => E.test(c, ctx)) && !(r.unless ?? []).some(c => E.test(c, ctx)))
        assert.ok(live.length < 2,
          `${b.id}: ${live.map(r => r.hook).join(' + ')} are both live on "${trade}", so only the first reaches the customer. ` +
          'Make the conditions mutually exclusive, or merge them into one row.')
      }
    }
  }
})

test('engine · it is deterministic', () => {
  const args = { event: { venueChoice: 'home', guests: 60 }, answers: { food_way: 'catering', photos: 'yes' }, picks: { videography: 'need' } }
  assert.deepEqual(JSON.parse(JSON.stringify(plan('baby-shower', args))), JSON.parse(JSON.stringify(plan('baby-shower', args))))
})

/* ── Part 5 · the free toolkit ────────────────────────────────────── */

test('toolkit · every occasion gets it, and it is always free', () => {
  for (const o of MAPPED) {
    const t = plan(o.id).toolkit
    assert.equal(t.free, true)
    assert.ok(t.features.length >= 4, `${o.id}: ${t.features.length} features`)
    for (const f of t.features) {
      assert.ok(f.hook && f.label && f.line)
      assert.equal(f.price, undefined, 'a free feature has a price')
    }
  }
})

test('toolkit · it is never mixed in with the paid services', () => {
  for (const o of MAPPED) {
    const p = plan(o.id)
    const keys = new Set(E.TOOLKIT.map(f => f.key))
    for (const r of [...p.recommended, ...p.addons]) assert.ok(!keys.has(r.id), `${o.id}: ${r.id} is a free feature sold as a service`)
  }
})

test('toolkit · children’s occasions are guardian-controlled', () => {
  for (const id of ['first-birthday', 'kids-birthday-party', 'childrens-theme-party']) {
    const f = plan(id).toolkit.features
    assert.equal(f.find(x => x.key === 'rsvp').mode, 'guardian', `${id}: RSVP is not guardian-controlled`)
    assert.equal(f.find(x => x.key === 'chat').mode, 'guardian', `${id}: chat is not guardian-controlled`)
  }
})

test('toolkit · a surprise keeps the guest of honour out of everything', () => {
  for (const id of ['surprise-birthday-party', 'marriage-proposal']) {
    const f = plan(id).toolkit.features
    assert.equal(f.find(x => x.key === 'invitations').mode, 'private')
    assert.equal(f.find(x => x.key === 'chat').mode, 'organiser')
  }
})

test('toolkit · a memorial is never given polls or promotion', () => {
  for (const id of ['memorial-gathering', 'celebration-of-life']) {
    const f = plan(id).toolkit.features
    assert.ok(!f.some(x => x.key === 'polls'), `${id}: polls`)
    assert.equal(f.find(x => x.key === 'rsvp').mode, 'private')
  }
})

/* ── Toggles, and what the rest of the app reads ──────────────────── */

/**
 * `essential` means the occasion does not work safely, or at all,
 * without that service — a lifeguard at a swimming competition, trained
 * cover around a room full of jewellery. It must survive to the screen
 * as its own classification, sorted first and switched on, or the word
 * means nothing to the customer.
 */
test('engine · an essential service reaches the screen marked and first', () => {
  const essentials = E.BLUEPRINTS.filter(b => b.plan.some(s => s.kind === 'essential'))
  assert.ok(essentials.length >= 5, `only ${essentials.length} occasions declare an essential service`)
  for (const b of essentials) {
    const p = plan(b.id, { answers: defaults(OCC[b.id]) })
    const live = p.recommended.filter(r => r.kind === 'essential')
    if (!live.length) continue
    assert.ok(live.every(r => r.on), `${b.id}: an essential service is not switched on`)
    const first = p.recommended.findIndex(r => r.kind !== 'essential')
    assert.ok(first === -1 || first >= live.length, `${b.id}: essentials are not sorted first`)
  }
})

/**
 * An add-on is picked under the key `+id`, which is not a trade id. The
 * 360° engine rejects anything that is not in the registry, so feeding
 * those keys through as trades threw "added: unknown trade" and the
 * error boundary replaced the whole screen the moment a customer
 * switched an add-on on. Every downstream reader must survive it.
 */
test('toggle · switching an add-on on never breaks a downstream screen', () => {
  for (const b of E.BLUEPRINTS) {
    const o = OCC[b.id]
    const event = { occasionId: o.id, venueChoice: 'need', guests: o.bands?.[1] ?? 80 }
    const answers = defaults(o)
    for (const a of b.addons.slice(0, 3)) {
      for (const picks of [{ [`+${a.id}`]: 'need' }, { [`+${a.id}`]: 'off' }]) {
        assert.doesNotThrow(() => E.occasionPlan(o, { event, answers, picks }), `${o.id}/+${a.id}: occasionPlan`)
        assert.doesNotThrow(() => E.blueprint(o, picks, event), `${o.id}/+${a.id}: blueprint`)
        assert.doesNotThrow(() => E.needsFor(o, picks, event), `${o.id}/+${a.id}: needsFor`)
      }
      const ctx = E.contextFor(o, { [`+${a.id}`]: 'need', photography: 'need' }, event)
      assert.deepEqual(ctx.added, ['photography'], `${o.id}: an add-on key leaked into the engine as a trade`)
    }
  }
})

test('plan · the category id comes from the occasion, never hard-coded', () => {
  const seen = new Set(E.BLUEPRINTS.map(b => plan(b.id).categoryId))
  assert.ok(seen.size >= 10, `only ${seen.size} distinct category ids across ${E.BLUEPRINTS.length} occasions`)
  for (const b of E.BLUEPRINTS) assert.equal(plan(b.id).categoryId, OCC[b.id].category, `${b.id}: wrong category id`)
})

test('toggle · on adds the trade, off removes it', () => {
  const base = plan('birthday-party')
  assert.ok(base.needed.includes('decoration_floral'))
  assert.ok(!plan('birthday-party', { picks: { decoration_floral: 'skip' } }).needed.includes('decoration_floral'))
  assert.ok(plan('birthday-party', { picks: { videography: 'need' } }).needed.includes('videography'))
})

test('toggle · an add-on that maps to a trade becomes a real requirement', () => {
  const p = plan('first-birthday', { picks: { '+balloon_backdrop': 'need' } })
  assert.ok(p.addons.find(a => a.id === 'balloon_backdrop').on)
  assert.ok(p.needed.includes('decoration_floral'))
})

test('toggle · never a duplicate requirement, however many rows name a trade', () => {
  for (const o of MAPPED) {
    const n = plan(o.id, { event: { venueChoice: 'restaurant' }, answers: { food_way: 'restaurant' } }).needed
    assert.equal(new Set(n).size, n.length, `${o.id}: duplicate requirement`)
  }
})

test('downstream · blueprint() speaks the shape every older screen reads', () => {
  for (const o of MAPPED) {
    const b = E.blueprint(o, {}, { guests: o.bands[1], answers: {} })
    assert.equal(b.rows.length, E.TRADES.length, `${o.id}: a row per trade`)
    assert.ok(b.needed.every(t => TRADE_IDS.has(t)), `${o.id}: an unknown trade in needed`)
    for (const r of b.rows) assert.ok(['CORE', 'CONDITIONAL', 'OPTIONAL', 'NOT_DEFAULT'].includes(r.status), `${o.id}/${r.tradeId}: ${r.status}`)
    assert.ok(b.occasionPlan, `${o.id}: the occasion plan did not come through`)
  }
})

test('downstream · a service nobody asked for never reaches the masters step', () => {
  const b = E.blueprint(OCC['naming-ceremony'], {}, { guests: 60, answers: {} })
  assert.ok(!b.needed.includes('priest_rituals'), 'a priest would be searched for')
  const asked = E.blueprint(OCC['naming-ceremony'], {}, { guests: 60, answers: { priest: 'yes' } })
  assert.ok(asked.needed.includes('priest_rituals'))
})

/* ── The clause grammar itself ────────────────────────────────────── */

test('clauses · the grammar evaluates as documented', () => {
  const ctx = { venue: 'home', answers: { food_way: 'catering', activities: ['games', 'music'], kids: 12 }, guests: 50 }
  assert.equal(E.test(['venue', 'home', 'outdoor'], ctx), true)
  assert.equal(E.test(['venue', 'restaurant'], ctx), false)
  assert.equal(E.test(['ans', 'food_way', 'catering'], ctx), true)
  assert.equal(E.test(['ans', 'activities', 'music'], ctx), true, 'a multi-answer should match on any of its values')
  assert.equal(E.test(['has', 'activities'], ctx), true)
  assert.equal(E.test(['has', 'nothing'], ctx), false)
  assert.equal(E.test(['gt', 'kids', 10], ctx), true)
  assert.equal(E.test(['guests', 80], ctx), false)
  assert.equal(E.test(['any', ['venue', 'restaurant'], ['ans', 'food_way', 'catering']], ctx), true)
  assert.equal(E.test(['not', ['venue', 'home']], ctx), false)
})
