#!/usr/bin/env node
/**
 * Load the master food catalogue into the database (idempotent upsert).
 *
 *   node scripts/build-food-catalogue-seed.mjs          # dishes.json from sources
 *   node --env-file=.env scripts/import-food-catalogue.mjs [--dry]
 *
 * Writes sambramo_cuisines, sambramo_food_categories and sambramo_master_dishes
 * from supabase/seed/food-catalogue/v1. Re-running changes nothing that is
 * already equal; a dish an operator has reviewed keeps review_status
 * 'reviewed' even if the seed still says 'needs_review'. Never deletes.
 * Requires migration 20261010_12.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = join(ROOT, 'supabase/seed/food-catalogue/v1')
const dry = process.argv.includes('--dry')
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const read = f => JSON.parse(readFileSync(join(SEED, f), 'utf8'))

const cuisines = read('cuisines.json').groups.flatMap((g, gi) => g.styles.map(([id, name], i) =>
  ({ id, group_id: g.id, group_name: g.name, name, sort: gi * 100 + i, active: true, is_custom: false, review_status: 'reviewed' })))
const cats = read('categories.json')
const categories = cats.parents.flatMap((p, pi) => p.children.map(([id, name, course], i) =>
  ({ id, parent_id: p.id, parent_name: p.name, name, course_group: course ?? p.course, sort: pi * 100 + i, active: true })))
const dishes = read('dishes.json').dishes

async function upsert(table, rows, size = 300) {
  if (dry) { console.log(`  [dry] ${table}: ${rows.length}`); return }
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), { onConflict: 'id' })
    if (error) throw new Error(`${table} @${i}: ${error.message}`)
  }
  console.log(`  ${table}: ${rows.length} upserted`)
}

// Keep operator decisions: a reviewed / rejected dish is not reset by a re-import.
const decided = new Map()
if (!dry) {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('sambramo_master_dishes').select('id, review_status').neq('review_status', 'needs_review').range(from, from + 999)
    if (error) throw error
    for (const r of data) decided.set(r.id, r.review_status)
    if (data.length < 1000) break
  }
}
const rows = dishes.map(d => ({ ...d, review_status: decided.get(d.id) ?? d.review_status, updated_at: new Date().toISOString() }))

console.log(`food catalogue v1 → ${dry ? 'dry run' : process.env.VITE_SUPABASE_URL}`)
await upsert('sambramo_cuisines', cuisines)
await upsert('sambramo_food_categories', categories)
await upsert('sambramo_master_dishes', rows)
if (!dry) {
  const { count } = await db.from('sambramo_master_dishes').select('id', { count: 'exact', head: true })
  console.log(`  master dishes now in the database: ${count}`)
}
