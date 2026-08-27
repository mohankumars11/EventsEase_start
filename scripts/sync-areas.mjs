#!/usr/bin/env node
/**
 * Regenerate src/data/bengaluruAreas.js from the seeder's locality file.
 *
 *   node scripts/sync-areas.mjs
 *
 * One source of coordinates, two consumers: the seeder places partners
 * around these centroids and the customer's area picker offers them. Two
 * hand-maintained lists would drift, and a drifted centroid shows up as
 * a dispatch that finds nobody — a failure whose symptom points nowhere
 * near its cause.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const { localities } = JSON.parse(
  readFileSync(join(ROOT, 'scripts/data/bengaluru-localities.json'), 'utf8'))

const rows = localities
  .map(l => `  { name: '${l.name}', lat: ${l.lat}, lng: ${l.lng}, tier: ${l.tier}, market: '${l.market}' },`)
  .join('\n')

writeFileSync(join(ROOT, 'src/data/bengaluruAreas.js'),
`// GENERATED from scripts/data/bengaluru-localities.json — do not edit by hand.
//
// Regenerate:  node scripts/sync-areas.mjs
//
// The seeder places partners around these same centroids, so the picker
// and the network cannot disagree about where Koramangala is.

export const BENGALURU_AREAS = [
${rows}
]

export const AREA_BY_NAME = Object.fromEntries(BENGALURU_AREAS.map(a => [a.name, a]))

/** Areas we can serve well today. Tier 3 is reachable but thin. */
export const CORE_AREAS = BENGALURU_AREAS.filter(a => a.tier <= 2)
`)

console.log(`  wrote src/data/bengaluruAreas.js — ${localities.length} areas`)
