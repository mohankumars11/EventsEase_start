#!/usr/bin/env node
/**
 * The occasion → service intelligence, audited for every occasion.
 *
 *   node scripts/audit-occasion-services.mjs            # check + write the report
 *   node scripts/audit-occasion-services.mjs --quiet    # check only
 *
 * For all 438 occasions × every service the occasion can hold (its must,
 * often and extra trades), it resolves the preference questions
 * (data/prefSpecs via data/occasionProfile), the décor moments
 * (data/decorMoments) and the headcount question (peopleAsk), then checks:
 *
 *   · every pick is an option the partner app really offers on that
 *     question (an id that is not one would silently match nobody)
 *   · nothing wedding-only reaches a non-wedding day (no haldi for a
 *     wedding anniversary, no bride for a birthday), nothing baby-only
 *     outside a baby occasion, nothing kids-only at an adult's, nothing
 *     corporate at a family's, nothing festive at a memorial
 *   · a couple's occasion asks who is celebrating, not "how many guests";
 *     an audience is asked for as an audience; a memorial is asked quietly
 *   · two to five questions a service, never a directory
 *
 * Then it writes docs/occasion-service-audit.md — every family of
 * occasion with what each service asks, in the customer's words, and the
 * full table of occasions — so the intelligence can be read, not trusted.
 * Exit 1 on any finding.
 */
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const quiet = process.argv.includes('--quiet')
const dir = mkdtempSync(join(tmpdir(), 'occ-audit-'))
const entry = join(dir, 'entry.mjs')
const root = process.cwd().replace(/\\/g, '/')
writeFileSync(entry, `
  export { specFor, pickId } from '${root}/src/customer/data/prefSpecs.js'
  export { momentsFor } from '${root}/src/customer/data/decorMoments.js'
  export { profileFor, peopleAsk, peopleLine } from '${root}/src/customer/data/occasionProfile.js'
  export { TRADE_CONFIGS, questionsOf } from '${root}/src/data/trades/index.js'
  export { OCCASIONS } from '${root}/src/customer/data/occasions.js'
  export { TRADE } from '${root}/src/customer/data/trades.js'
`)
const out = join(dir, 'bundle.mjs')
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', jsx: 'automatic',
  loader: { '.webp': 'empty', '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
  plugins: [{ name: 'glob', setup(b) { b.onResolve({ filter: /^\.\.\/art\/.*\.webp$/ }, a => ({ path: a.path, namespace: 'x' })); b.onLoad({ filter: /.*/, namespace: 'x' }, () => ({ contents: 'export default ""' })) } }] })
const { specFor, pickId, momentsFor, profileFor, peopleAsk, peopleLine, TRADE_CONFIGS, questionsOf, OCCASIONS, TRADE } = await import(pathToFileURL(out).href)

/* The partner's own options, by trade and question. */
const options = {}, labels = {}
for (const c of TRADE_CONFIGS) {
  options[c.id] = {}; labels[c.id] = {}
  for (const q of questionsOf(c)) if (q.scope.startsWith('screen') && q.options?.length) { options[c.id][q.id] = q.options.map(o => o.id); for (const o of q.options) labels[c.id][`${q.id}:${o.id}`] = o.label }
}

/* ── What may reach which family ─────────────────────────────────── */
const WEDDING_ONLY = /pre_wedding|haldi|mehendi|sangeet|baraat|bridal|^bride$|^groom$|mandap|boxed_wedding|scroll_invitations|save_the_date|wedding|trousseau|welcome_and_aarti|ring_platters|saree_trays|stage_thrones|^engagement$|^jaimala/
const BABY_ONLY = /maternity|naming|seemantha|annaprashana|cradle|baby_shower/
const KIDS_ONLY = /^kids_|puppet_show|kids_entertainer|baby_and_kids/
const CORP_ONLY = /^corporate|^product$|registration_desk|corporate_gifts|podium|hospitality_desk|vip_protocol|teleprompter|interpretation|shop_office_opening|bhoomi_puja/
const FESTIVE = /party|balloon|^dj|karaoke|disco|birthday|celebration|bouncer|fire_led|laser/
const FAMILY_CORP = new Set(['corporate', 'gala', 'retail', 'property', 'online', 'campus', 'school', 'public', 'sport', 'community', 'food', 'dining'])
const allowed = (p, id, tradeId) => {
  if (WEDDING_ONLY.test(id) && p.family !== 'wedding') return `wedding-only "${id}"`
  if (BABY_ONLY.test(id) && p.family !== 'baby') return `baby-only "${id}"`
  if (KIDS_ONLY.test(id) && !['kids', 'teen'].includes(p.age) && p.family !== 'school' && p.family !== 'baby' && !(id === 'kids_zone_attendants' && p.family === 'birthday')) return `kids-only "${id}"`
  if (CORP_ONLY.test(id) && !FAMILY_CORP.has(p.family)) return `corporate "${id}"`
  if (id === 'birthday' && p.family !== 'birthday') return `birthday coverage`
  if (/shashti/.test(id) && !p.milestone) return `60th rite "${id}"`
  if (/^anniversary$/.test(id) && p.family !== 'anniversary' && !p.milestone) return `anniversary rite`
  if (/memorial|shraddha/.test(id) && p.family !== 'memorial') return `memorial rite "${id}"`
  if (p.family === 'memorial' && FESTIVE.test(id)) return `festive "${id}" at a memorial`
  if (p.family === 'romance' && /crowd|registration|kids|family_group|baraat/.test(id)) return `"${id}" at a romantic occasion`
  return null
}
const MOMENT_WEDDING = /mandap|haldi|mehendi|sangeet|engagement|reception|jaimala/i
const MOMENT_BABY = /naamkarana|seemantha|cradle/i

/* ── The audit ───────────────────────────────────────────────────── */
let bad = 0, checked = 0
const fail = m => { bad++; if (bad <= 80) console.log('✗ ' + m) }
const rows = [] // the full table
const byFamily = {}
for (const o of OCCASIONS) {
  const p = profileFor(o)
  const ask = peopleAsk(o)
  byFamily[p.family] = byFamily[p.family] ?? []
  byFamily[p.family].push(o)
  /* The headcount question fits the kind of day. */
  if (['anniversary', 'romance'].includes(p.family) && ask.who !== 'couple') fail(`${o.id}: a couple's occasion asks "${ask.title}"`)
  if (p.family === 'memorial' && ask.who !== 'quiet') fail(`${o.id}: a memorial asks "${ask.title}"`)
  if (o.people && o.people !== 'Guests' && ask.who === 'guests') fail(`${o.id}: ${o.people} are asked for as guests`)
  if (!ask.picks?.length || ask.picks.some((x, i, a) => i && x <= a[i - 1])) fail(`${o.id}: headcount picks are not ascending (${ask.picks})`)
  /* Every service the occasion can hold, in both companies a couple's day can have. */
  const trades = [...new Set([...o.must, ...o.often, ...o.extra])]
  const evs = ask.who === 'couple' ? [{ guests: 2, hours: 4, company: 'two' }, { guests: o.bands[2] ?? 50, hours: 4, company: 'party' }] : [{ guests: o.bands[1] ?? 50, hours: 4 }]
  for (const t of trades) for (const ev of evs) {
    const { qs } = specFor(o, t, ev)
    if (qs.length > 5) fail(`${o.id} · ${t}: ${qs.length} questions — a directory`)
    for (const q of qs) {
      if (!q.map) continue
      const have = options[t]?.[q.k]
      if (!have) { fail(`${t}: spec maps "${q.k}" but the partner has no such option question`); continue }
      const ids = (q.pick ?? []).map(pickId)
      if (!ids.length) fail(`${o.id} · ${t}: ${q.k} has an empty pick list`)
      if (ids.length > 8) fail(`${o.id} · ${t}: ${q.k} offers ${ids.length} — more than eight is a directory`)
      for (const id of ids) {
        checked++
        if (!have.includes(id)) { fail(`${o.id} · ${t}: pick "${id}" is not an option of ${q.k}`); continue }
        const why = allowed(p, id, t)
        if (why) fail(`${o.id} (${p.family}) · ${t} · ${q.k}: ${why}`)
      }
    }
  }
  /* Décor moments. */
  for (const ev of evs) for (const m of momentsFor(o, ev)) {
    checked++
    if (MOMENT_WEDDING.test(m.svc) && p.family !== 'wedding') fail(`${o.id}: décor moment "${m.label}" is a wedding set-up`)
    if (MOMENT_BABY.test(m.svc) && p.family !== 'baby') fail(`${o.id}: décor moment "${m.label}" is a baby set-up`)
    if (p.family === 'memorial' && /balloon|neon|party|booth/i.test(m.svc)) fail(`${o.id}: décor moment "${m.label}" at a memorial`)
  }
  rows.push([o.name, o.categoryShort, p.family + (p.fn ? ` · ${p.fn}` : ''), ask.who, ask.title])
}

console.log(`checked ${checked} picks and moments across ${OCCASIONS.length} occasions · ${Object.keys(byFamily).length} families`)
console.log(bad ? `${bad} finding(s)` : '✓ every service asks what fits the occasion, for all 438')

/* ── The report ──────────────────────────────────────────────────── */
if (!quiet) {
  const FAMILY_WORD = { wedding: 'Weddings and their functions', anniversary: 'Anniversaries', romance: 'Romantic occasions', birthday: 'Birthdays', baby: 'Babies', home: 'A new home', faith: 'Poojas and festivals of faith', festival: 'Festivals',
    memorial: 'Memorials', nightlife: 'Nights out and parties', gathering: 'Gatherings', dining: 'Dinners', gala: 'Galas and premieres', corporate: 'Corporate', campus: 'Campus', school: 'School', public: 'Public shows', sport: 'Sport and wellness', food: 'Food events', retail: 'Retail and fashion', property: 'Property', community: 'Community', online: 'Online', outdoor: 'Outdoors' }
  /* One representative per family — and every wedding function — with what each service asks. */
  const reps = []
  for (const [fam, list] of Object.entries(byFamily)) {
    if (fam === 'wedding') { const seen = new Set(); for (const o of list) { const f = profileFor(o).fn; if (!seen.has(f)) { seen.add(f); reps.push(o) } } }
    else if (fam === 'anniversary') reps.push(list[0])
    else reps.push(list[0])
  }
  const word = (t, q, x) => { const id = pickId(x); const own = labels[t]?.[`${q.k}:${id}`] ?? id; return Array.isArray(x) && x[1] ? `${x[1]}` : own }
  let md = `# Occasion → service intelligence — the audit\n\nGenerated by \`node scripts/audit-occasion-services.mjs\` on ${new Date().toISOString().slice(0, 10)}. ${OCCASIONS.length} occasions, ${Object.keys(byFamily).length} families, ${checked.toLocaleString('en-IN')} picks and set-ups checked, **${bad} findings**.\n\n`
  md += `An occasion's *family* comes from its template (data/occasionProfile.js), never from words in its name — so a Wedding Anniversary is an anniversary. Every service reads the family and asks only what fits; every option offered is one the partner app really has, shown in the customer's words.\n\n`
  md += `## Families\n\n| Family | Occasions | Headcount asked as |\n|---|---:|---|\n`
  for (const [fam, list] of Object.entries(byFamily).sort((a, b) => b[1].length - a[1].length)) md += `| ${FAMILY_WORD[fam] ?? fam} | ${list.length} | ${[...new Set(list.map(o => peopleAsk(o).title))].slice(0, 3).join(' · ')} |\n`
  md += `\n## What each service asks, by family\n\nOne occasion stands for its family (and each wedding function for its own). A couple's occasion is shown twice where it differs: just the two of them, and with people around.\n`
  for (const o of reps) {
    const p = profileFor(o)
    const ask = peopleAsk(o)
    const evs = ask.who === 'couple' ? [['Just the two of us', { guests: 2, hours: 4, company: 'two' }], ['With family or friends', { guests: o.bands[2] ?? 50, hours: 4, company: 'party' }]] : [[null, { guests: o.bands[1] ?? 50, hours: 4 }]]
    md += `\n### ${FAMILY_WORD[p.family] ?? p.family}${p.fn ? ` — ${p.fn}` : ''} · _${o.name}_\n\n**Headcount:** “${ask.title}” — ${ask.sub}${ask.company ? ` Options: ${ask.company.map(c => c.label).join(' · ')}.` : ''}\n`
    const trades = [...new Set([...o.must, ...o.often, ...o.extra])]
    for (const [tag, ev] of evs) {
      if (tag) md += `\n_${tag}:_\n`
      md += `\n| Service | Asks | Offers |\n|---|---|---|\n`
      for (const t of trades) {
        const { qs } = specFor(o, t, ev)
        if (t === 'decoration_floral') { md += `| ${TRADE[t]?.label ?? t} | What should we set up? | ${momentsFor(o, ev).map(m => m.label).join(' · ')} |\n`; continue }
        for (const q of qs) {
          if (['hours', 'count', 'yesno', 'text', 'colours', 'menu', 'venue'].includes(q.type)) continue
          const offers = q.map ? (q.pick ?? []).map(x => word(t, q, x)) : (q.options ?? []).map(x => x.label)
          md += `| ${TRADE[t]?.label ?? t} | ${q.label} | ${offers.join(' · ')} |\n`
        }
      }
    }
  }
  md += `\n## Every occasion\n\n| Occasion | Category | Family | Headcount model | Asked as |\n|---|---|---|---|---|\n`
  for (const r of rows) md += `| ${r.join(' | ')} |\n`
  writeFileSync('docs/occasion-service-audit.md', md)
  console.log('wrote docs/occasion-service-audit.md')
}
process.exit(bad ? 1 : 0)
