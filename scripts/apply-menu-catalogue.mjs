#!/usr/bin/env node
/**
 * Put the Menu Studio catalogue into the live database (needs migration 200).
 *
 *   node --env-file=.env scripts/apply-menu-catalogue.mjs [--dry] [--force]
 *
 * Reads supabase/seed/menu-catalogue/v1/catalogue.json (written by
 * build-menu-catalogue.mjs) and src/customer/data/menuPhotos.generated.js.
 *
 * Seeds ONCE, then the admin owns the rows: a template, family or rule
 * that already exists is left as the admin made it (--force overwrites).
 * Dish attributes only fill what is empty — a corrected description or
 * diet is never put back. New dishes carry provenance
 * 'sambramo-curated:menu-studio' and needs_review, so they can be listed
 * and removed in one statement:
 *
 *   delete from sambramo_master_dishes where provenance = 'sambramo-curated:menu-studio'
 *     and id not in (select dish_id from sambramo_menu_template_items);
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry'), FORCE = process.argv.includes('--force')
const URL_ = process.env.VITE_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) { console.error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — run with --env-file=.env'); process.exit(1) }
const C = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/menu-catalogue/v1/catalogue.json'), 'utf8'))
const photosFile = join(ROOT, 'src/customer/data/menuPhotos.generated.js')
const P = existsSync(photosFile) ? await import(pathToFileURL(photosFile).href) : { MENU_PHOTOS: {}, FAMILY_PHOTOS: {} }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
async function rest(path, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path.split('?')[0]} → ${r.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
const all = async (table, select) => {
  const out = []
  for (let from = 0; ; from += 1000) {
    const page = await rest(`${table}?select=${select}`, { headers: { Range: `${from}-${from + 999}` } })
    out.push(...page)
    if (page.length < 1000) return out
  }
}
async function upsert(table, rows, onConflict) {
  if (!rows.length) return 0
  if (DRY) { console.log(`  [dry] ${table}: ${rows.length}`); return rows.length }
  for (let i = 0; i < rows.length; i += 200)
    await rest(`${table}?on_conflict=${onConflict}`, { method: 'POST', body: JSON.stringify(rows.slice(i, i + 200)), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } })
  return rows.length
}

// 0 · migration 200 must be in
try { await rest('sambramo_menu_sections?select=id&limit=1') } catch (e) {
  console.error('Migration 200 is not applied yet (sambramo_menu_sections is missing). Paste supabase/migrations/200_menu_studio.sql first.')
  process.exit(2)
}

// 1 · dishes — new ones in full; existing ones only where a field is empty
const live = new Map((await all('sambramo_master_dishes', 'id,name,description,contains_egg,allergens_usual,spice_level,serving_format')).map(d => [d.id, d]))
const dietOf = d => d.diet === 'non_veg' ? 'non_veg' : d.diet === 'egg' ? 'egg' : 'veg'
const fresh = C.dishes.filter(d => !live.has(d.id)).map(d => ({
  id: d.id, name: d.name, aliases: [], local_names: {}, cuisine_ids: d.cuisines, category_id: d.category, suggested_diet: dietOf(d),
  provenance: 'sambramo-curated:menu-studio', review_status: 'needs_review', active: true,
  description: d.desc, contains_egg: d.egg, allergens_usual: d.allergens, spice_level: d.spice, serving_format: d.format,
}))
const fill = C.dishes.filter(d => live.has(d.id)).map(d => {
  const cur = live.get(d.id)
  return { id: d.id, name: cur.name, description: cur.description ?? d.desc, contains_egg: cur.contains_egg ?? d.egg,
    allergens_usual: cur.allergens_usual ?? d.allergens, spice_level: cur.spice_level ?? d.spice, serving_format: cur.serving_format ?? d.format }
}).filter(r => { const c = live.get(r.id); return ['description', 'contains_egg', 'allergens_usual', 'spice_level', 'serving_format'].some(k => c[k] == null && r[k] != null) })
console.log(`dishes: ${await upsert('sambramo_master_dishes', fresh, 'id')} new, ${await upsert('sambramo_master_dishes', fill, 'id')} filled in`)

// 2 · sections, families, rules, templates — seed once unless --force
const have = async (table, key = 'id') => new Set((await all(table, key)).map(r => r[key]))
const only = async (table, rows) => { if (FORCE) return rows; const h = await have(table); return rows.filter(r => !h.has(r.id)) }
const sections = C.sections.map(s => ({ id: s.id, name: s.name, sort: s.sort, active: true, family_ids: [] }))
const families = C.families.map(f => ({ id: f.id, name: f.name, region: f.region, line: f.line, cuisine_ids: f.variants.map(v => v[0]),
  variant_labels: Object.fromEntries(f.variants), cities: f.cities, sort: f.sort, active: true,
  hero_asset_id: P.FAMILY_PHOTOS?.[f.id] ? `pexels-${P.FAMILY_PHOTOS[f.id].id}` : null }))
const rules = C.rules.map(r => ({ id: r.id, scope: r.scope, key: r.key, tags: r.tags, meals: r.meals, serve: r.serve, avoid: r.avoid, note: r.note || null, active: true }))
const templates = C.menus.map(m => ({ id: m.id, family_id: m.family, cuisine_id: m.cuisine, name: m.name, line: m.line, diet: m.diet,
  meals: m.meals, serve: m.serve, tags: m.tags, sort: m.sort, active: true, review_status: 'needs_review',
  hero_asset_id: P.MENU_PHOTOS?.[m.id] ? `pexels-${P.MENU_PHOTOS[m.id].id}` : null }))
console.log(`sections: ${await upsert('sambramo_menu_sections', await only('sambramo_menu_sections', sections), 'id')}`)
console.log(`families: ${await upsert('sambramo_cuisine_families', await only('sambramo_cuisine_families', families), 'id')}`)
console.log(`rules: ${await upsert('sambramo_occasion_menu_rules', await only('sambramo_occasion_menu_rules', rules), 'id')}`)
const newTemplates = await only('sambramo_menu_templates', templates)
console.log(`menus: ${await upsert('sambramo_menu_templates', newTemplates, 'id')}`)
const dishName = Object.fromEntries(C.dishes.map(d => [d.id, d]))
const items = C.menus.filter(m => newTemplates.some(t => t.id === m.id)).flatMap(m => m.sections.flatMap(s => s.dishes.map((id, i) => ({
  template_id: m.id, dish_id: id, section_id: s.id, sort: i, label: dishName[id].master_name && dishName[id].master_name !== dishName[id].name ? dishName[id].name : null }))))
if (FORCE && !DRY) for (const t of newTemplates) await rest(`sambramo_menu_template_items?template_id=eq.${encodeURIComponent(t.id)}`, { method: 'DELETE' })
console.log(`menu dishes: ${await upsert('sambramo_menu_template_items', items, 'template_id,dish_id')}`)

// 3 · photographs, with their licence and attribution
const asset = (kind, subject, p) => ({ id: `pexels-${p.id}`, subject_kind: kind, subject_id: subject, url: p.url, alt: p.alt, source: 'pexels',
  source_page: p.page, licence: 'Pexels License', attribution: p.credit, kind: 'inspiration', usage_status: 'active' })
const assets = [...Object.entries(P.FAMILY_PHOTOS ?? {}).map(([f, p]) => asset('family', f, p)), ...Object.entries(P.MENU_PHOTOS ?? {}).map(([m, p]) => asset('menu', m, p))]
const seen = new Set()
console.log(`photos: ${await upsert('sambramo_catalogue_assets', assets.filter(a => !seen.has(a.id) && seen.add(a.id)), 'id')}`)
console.log(DRY ? 'dry run — nothing written' : 'done')
