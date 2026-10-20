#!/usr/bin/env node
/**
 * Does every trade get its own "show your work" prompt?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS GUARD EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * workPrompts.js argues, at length and correctly, that "Add photographs
 * of your work" is useless to every trade. It then shipped that exact
 * sentence to eight trades, because the file was written when there were
 * 26 and nothing failed when the logistics side added eight more.
 *
 * A fallback that is documented as unacceptable needs something that
 * refuses it. The next trade added will fail here on the same day it is
 * added, rather than in a year when a transporter has photographed a
 * parked lorry.
 *
 * It also checks the audio list, because a typo there silently removes
 * the audio block from the one trade that needs it — a disappearance is
 * much harder to notice than an extra field.
 */
import { readFileSync } from 'node:fs'

const prompts = readFileSync('src/data/workPrompts.js', 'utf8')
const registry = readFileSync('src/data/trades/registry.js', 'utf8')

/* Top-level keys of BY_TRADE: two-space indent, quoted, then a brace. */
const withOwn = [...prompts.matchAll(/^ {2}'([^']+)':\s*\{/gm)].map(m => m[1])
const tradeNames = [...registry.matchAll(/t\(\d+, '[a-z_]+', '[A-Z]\d+', '([^']+)'/g)].map(m => m[1])

const listOf = name => (prompts.split(name + ' = [')[1] ?? '').split(']')[0]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
const audio = listOf('AUDIO_SAMPLE_TRADES')
const videoLink = listOf('VIDEO_LINK_TRADES')

/* Every prompt entry must name a real trade, and carry all four fields —
   a half-written entry falls back field by field, invisibly. */
const FIELDS = ['photoTitle', 'photoHint', 'videoTitle', 'videoHint', 'captionHint']
const bodyOf = name => {
  const i = prompts.indexOf(`  '${name}': {`)
  return i === -1 ? '' : prompts.slice(i, prompts.indexOf('\n  },', i))
}

const fails = []
for (const t of tradeNames) if (!withOwn.includes(t)) fails.push(`no prompts of its own: ${t}`)
for (const t of withOwn) if (!tradeNames.includes(t)) fails.push(`not a trade name: ${t}`)
for (const t of withOwn.filter(x => tradeNames.includes(x))) {
  const body = bodyOf(t)
  for (const f of FIELDS) if (!body.includes(`${f}:`)) fails.push(`${t} is missing ${f}`)
}
for (const t of audio) if (!tradeNames.includes(t)) fails.push(`audio list names a non-trade: ${t}`)
if (!audio.length) fails.push('AUDIO_SAMPLE_TRADES is empty — no trade can upload a voice demo')
for (const t of videoLink) if (!tradeNames.includes(t)) fails.push(`video-link list names a non-trade: ${t}`)
if (!videoLink.length) fails.push('VIDEO_LINK_TRADES is empty — no trade can paste a reel link')

console.log(`trades              : ${tradeNames.length}`)
console.log(`with own prompts    : ${withOwn.length}`)
console.log(`audio-sample trades : ${audio.join(', ')}`)
console.log(`video-link trades   : ${videoLink.join(', ')}`)
console.log()
for (const f of fails) console.log(`  FAIL  ${f}`)
console.log(fails.length
  ? `FAIL — ${fails.length} problem(s)`
  : 'PASS — every trade is asked for its own work, and audio only where it means something')
process.exit(fails.length ? 1 : 0)
