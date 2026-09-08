#!/usr/bin/env node
/**
 * Is any option asked twice, or asked where it makes no sense?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Eleven dishes turned out to be the same dish under two names, and the
 * only reason anybody noticed was that two of them landed side by side
 * on one screen. The listing questions have the same shape and far less
 * scrutiny: 26 trades, 356 questions, 1663 answers, written across
 * several sessions, and nothing has ever compared them.
 *
 * Three things it looks for, all deterministic:
 *
 *   1  the SAME option twice in one question
 *        "Drone" and "Drone" — a straight mistake
 *
 *   2  one option's words a subset of another's, in the same question
 *        "Kadai Veg" / "Veg Kadai", "Drone" / "Drone (aerial)".
 *        Sometimes right — "Chairs" and "Padded banquet chairs" are
 *        different stock — so it is answered, not auto-failed.
 *
 *   3  a question asked twice of one trade
 *        The detail screen and the operations screens are written in
 *        different files. Asking a photographer about their kit on both
 *        is how a partner learns the form is not paying attention.
 *
 * ── Answered, not silenced ───────────────────────────────────────────
 * Every overlap must be either fixed or named in ALLOWED with a reason.
 * That is the rule the dish version proved: silence is how eleven got
 * in, and an allow-list with no reasons is silence with extra steps.
 *
 *   node scripts/check-listing-options.mjs
 */
import { build } from 'esbuild'

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, format: 'esm', write: false, platform: 'node',
  })
  return import('data:text/javascript;base64,'
    + Buffer.from(out.outputFiles[0].text).toString('base64'))
}

const P = await load('src/data/partnerCatalogue.js')
const S = await load('src/data/partnerSpecs.js')
const OPS = await load('src/data/partnerOperations.js')

const NOISE = new Set([
  'and', 'or', 'with', 'the', 'a', 'of', 'in', 'on', 'for', 'to',
  'we', 'you', 'your', 'our', 'my', 'i', 'is', 'it', 'do', 'does',
])
const tokens = s => new Set(
  String(s).toLowerCase().replace(/[()/,.\-–—:]/g, ' ').split(/\s+/)
    .filter(w => w && !NOISE.has(w)))
const subset = (a, b) => a.size > 0 && [...a].every(w => b.has(w))

/**
 * Overlaps a person has looked at and kept, and why.
 *
 * Keyed "trade · question · label", so a reason cannot silently start
 * covering a different option than the one it was written for.
 */
const ALLOWED = {
  'Tent & Furniture · stock · High cocktail tables':
    'standing height, hired separately from dining tables. A buffet order'
    + ' wants both and a supplier may stock only one',
  'Wedding Planning · events · Destination weddings':
    'travel, accommodation and vendors in another city. A planner who does'
    + ' Bengaluru weddings may not do these at all',
}

let bad = 0
const tick = String.fromCharCode(10003)
const fail = (head, lines) => {
  bad++
  console.log(`\n  x ${head}`)
  for (const l of lines.slice(0, 30)) console.log(`      ${l}`)
  if (lines.length > 30) console.log(`      … and ${lines.length - 30} more`)
}
const pass = msg => console.log(`  ${tick} ${msg}`)

/* Every question a partner is asked, from both files, with where it
   came from — so a duplicate can be reported by its real address. */
const questions = []
for (const trade of P.TRADES) {
  for (const g of (S.SPECS_BY_TRADE[trade] ?? [])) {
    questions.push({ trade, where: 'detail', screen: 'detail', ...g })
  }
  for (const screen of OPS.operationScreensFor(trade)) {
    for (const g of screen.groups ?? []) {
      questions.push({ trade, where: 'ops', screen: screen.id, ...g })
    }
  }
}

if (!questions.length) {
  console.log('\n  x read no questions at all — the loader is broken\n')
  process.exit(1)
}

/* ── 1 · the same option twice in one question ───────────────────── */
{
  const dupes = []
  for (const q of questions) {
    const seenId = new Map()
    const seenLabel = new Map()
    for (const c of q.choices ?? []) {
      const l = String(c.label).trim().toLowerCase()
      if (seenId.has(c.id)) dupes.push(`${q.trade} · ${q.id}: id "${c.id}" twice`)
      if (seenLabel.has(l)) dupes.push(`${q.trade} · ${q.id}: "${c.label}" twice`)
      seenId.set(c.id, 1)
      seenLabel.set(l, 1)
    }
  }
  if (dupes.length) fail(`${dupes.length} options appear twice in one question`, dupes)
  else pass(`no option is listed twice in its own question`)
}

/* A question whose options are a ladder of amounts: "Up to 50 / Up to
   150 / Up to 500", "Same day / A day / Three days". Containment is
   meaningless inside one — the rungs SHARE their words on purpose, and
   flagging them buries the two real duplicates under thirty-one.

   Detected rather than listed: half or more of the options carrying a
   number, in digits or in words. */
const NUMBER_WORD = /^(same|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|fifty|hundred|a|an)$/i
const numeric = label => /\d/.test(label)
  || String(label).split(/[\s-]+/).some(w => NUMBER_WORD.test(w))
const isLadder = q => {
  const cs = q.choices ?? []
  if (cs.length < 2) return false
  return cs.filter(c => numeric(c.label)).length * 2 >= cs.length
}

/* ── 2 · one option contained in another ─────────────────────────── */
{
  const overlaps = []
  for (const q of questions) {
    if (isLadder(q)) continue
    const cs = q.choices ?? []
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const a = tokens(cs[i].label)
        const b = tokens(cs[j].label)
        if (!subset(a, b) && !subset(b, a)) continue
        const key = `${q.trade} · ${q.id} · ${cs[j].label}`
        const keyA = `${q.trade} · ${q.id} · ${cs[i].label}`
        if (ALLOWED[key] || ALLOWED[keyA]) continue
        overlaps.push(`${q.trade} · ${q.id}: "${cs[i].label}" ⟷ "${cs[j].label}"`)
      }
    }
  }
  if (overlaps.length) {
    fail(`${overlaps.length} options overlap inside one question`, overlaps)
  } else {
    pass(`no option is a second name for another in the same question`
      + ` (${Object.keys(ALLOWED).length} explained)`)
  }
}

/* ── 3 · the same question asked twice of one trade ──────────────── */
{
  const twice = []
  for (const trade of P.TRADES) {
    const mine = questions.filter(q => q.trade === trade)
    const seen = new Map()
    for (const q of mine) {
      const t = tokens(q.question)
      for (const [other, oq] of seen) {
        if (subset(t, other) || subset(other, t)) {
          twice.push(`${trade}: "${oq.question}" (${oq.where}/${oq.screen})`
            + ` and "${q.question}" (${q.where}/${q.screen})`)
        }
      }
      seen.set(t, q)
    }
  }
  if (twice.length) fail(`${twice.length} questions are asked twice of one trade`, twice)
  else pass('no trade is asked the same question twice')
}

/* ── What is actually there ──────────────────────────────────────── */
const answers = questions.reduce((n, q) => n + (q.choices?.length ?? 0), 0)
console.log(`\n  ${P.TRADES.length} trades · ${questions.length} questions · ${answers} options`)

if (bad) {
  console.log(`\n  ${bad} check${bad > 1 ? 's' : ''} failed\n`)
  process.exit(1)
}
console.log('\n  Nothing is asked twice.\n')
