#!/usr/bin/env node
/**
 * One real photograph per requirement card on the customer's plan
 * (EventPlan.jsx), resolved once from Pexels and written into
 * src/customer/data/requirementPhotos.generated.js — the app never searches
 * at runtime (the rule resolve-customer-photos.mjs follows).
 *
 *   node --env-file=.env scripts/resolve-requirement-photos.mjs           # search, keep 6 candidates each
 *   node scripts/resolve-requirement-photos.mjs --write                    # rewrite the module from the candidates + PICK
 *
 * These are SAMBRAMO inspiration photographs (Pexels License: free to use,
 * no attribution required — we store it anyway), never a partner's work: a
 * partner's card shows only that partner's own media. Every entry carries
 * source, licence, credit and kind so that can never be confused.
 *
 * Queries are written for Indian events; Pexels' default results for bare
 * words ("wedding", "food") are Western. Six candidates are kept per key
 * (scripts/data/requirement-photo-candidates.json) so a poor first result
 * is replaced by choosing another in PICK — after looking, never blind.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/customer/data/requirementPhotos.generated.js')
const CAND = join(ROOT, 'scripts/data/requirement-photo-candidates.json')

/* key → search. `t:<trade>` is the default for a trade on any occasion;
   `<template>:<trade>` is that template's own picture of it. */
const Q = {
  't:catering_food': 'indian wedding buffet food',
  't:cake_desserts': 'birthday cake decorated',
  't:decoration_floral': 'indian event flower decoration stage',
  't:photography': 'photographer camera event indian family',
  't:videography': 'videographer filming event',
  't:venue': 'banquet hall decorated tables',
  't:live_entertainment': 'magician performing kids party',
  't:dj_music': 'dj console party lights',
  't:anchor_mc': 'host microphone stage event',
  't:sound_av': 'concert speakers stage sound',
  't:event_lighting': 'fairy lights event decoration night',
  't:tent_furniture': 'event chairs tables banquet setup',
  't:priest_rituals': 'hindu priest pooja ritual',
  't:bridal_makeup_hair': 'indian bride makeup',
  't:mehendi_artist': 'mehendi henna hands',
  't:invitation_printing': 'wedding invitation card',
  't:gifts_favours': 'gift boxes ribbon party favours',
  't:bar_beverages': 'mocktails glasses party',
  't:passenger_transport': 'luxury car wedding decorated',
  't:valet_parking': 'valet parking hotel entrance',
  't:security_services': 'security guard event entrance',
  't:safety_facilities': 'event cleaning staff',
  't:guest_services': 'reception desk welcome guests hotel',
  't:power_cooling': 'diesel generator',
  't:event_equipment_rental': 'stage truss event setup',
  't:event_materials_supplier': 'party supplies decorations table',
  't:end_to_end_event_logistics': 'event setup crew stage',
  't:loading_unloading_crew': 'workers carrying boxes truck',
  't:medium_large_goods_vehicle': 'cargo truck india',
  't:mini_truck_pickup': 'small pickup truck',
  't:warehouse_storage': 'warehouse shelves boxes',
  't:trousseau_gift_packing': 'decorated gift trays indian wedding',
  't:wedding_planning': 'event planner checklist',
  't:transportation': 'bus transport guests',
  'firstBirthday:cake_desserts': 'first birthday cake baby',
  'firstBirthday:decoration_floral': 'first birthday balloon decoration',
  'firstBirthday:photography': 'baby first birthday photoshoot',
  'firstBirthday:catering_food': 'indian food buffet party',
  'firstBirthday:live_entertainment': 'kids birthday party magician',
  'firstBirthday:gifts_favours': 'kids party return gifts',
  'babyRite:priest_rituals': 'indian naming ceremony baby pooja',
  'babyRite:decoration_floral': 'decorated baby cradle flowers',
  'babyRite:catering_food': 'south indian banana leaf meal',
  'babyRite:photography': 'indian family portrait baby',
  'housewarming:priest_rituals': 'griha pravesh pooja new home',
  'housewarming:decoration_floral': 'marigold flower entrance decoration',
  'reception:venue': 'wedding reception hall',
  'reception:decoration_floral': 'wedding reception stage decoration',
  'reception:catering_food': 'wedding buffet live counter',
  'reception:photography': 'indian wedding couple photography',
  'launch:venue': 'conference hall stage',
  'launch:decoration_floral': 'product launch stage branding',
  'launch:event_lighting': 'stage lighting presentation',
  'launch:sound_av': 'led screen stage presentation',
  'collegeFest:tent_furniture': 'outdoor concert stage crowd',
  'collegeFest:event_lighting': 'concert stage lights',
  'collegeFest:sound_av': 'concert line array speakers',
  'collegeFest:security_services': 'crowd barrier concert security',
}
/* After review: key → candidate index (0-based) when the first is wrong. */
const PICK = {
  't:catering_food': 3, 't:cake_desserts': 4, 't:decoration_floral': 3, 't:videography': 1, 't:live_entertainment': 3, 't:dj_music': 2,
  't:anchor_mc': 3, 't:sound_av': 1, 't:event_lighting': 5, 't:tent_furniture': 1, 't:priest_rituals': 1, 't:bridal_makeup_hair': 5,
  't:mehendi_artist': 3, 't:invitation_printing': 1, 't:gifts_favours': 1, 't:passenger_transport': 2, 't:valet_parking': 3,
  't:security_services': 3, 't:safety_facilities': 4, 't:end_to_end_event_logistics': 1, 't:loading_unloading_crew': 3,
  't:medium_large_goods_vehicle': 2, 't:mini_truck_pickup': 1, 't:warehouse_storage': 3, 't:transportation': 2,
  'firstBirthday:cake_desserts': 4, 'firstBirthday:photography': 3, 'firstBirthday:catering_food': 2, 'firstBirthday:live_entertainment': 1,
  'babyRite:decoration_floral': 3, 'babyRite:catering_food': 5, 'housewarming:priest_rituals': 1,
  'reception:venue': 1, 'reception:decoration_floral': 1, 'reception:catering_food': 2, 'reception:photography': 5,
  'launch:venue': 3, 'launch:decoration_floral': 2, 'launch:event_lighting': 4, 'launch:sound_av': 2,
  'collegeFest:event_lighting': 1, 'collegeFest:sound_av': 3, 'collegeFest:security_services': 5, 't:power_cooling': 3,
}

const WRITE_ONLY = process.argv.includes('--write')
let cand = existsSync(CAND) ? JSON.parse(readFileSync(CAND, 'utf8')) : {}

if (!WRITE_ONLY) {
  const KEY = process.env.PEXELS_API_KEY
  if (!KEY) { console.error('PEXELS_API_KEY missing'); process.exit(1) }
  for (const [k, q] of Object.entries(Q)) {
    if (cand[k]?.query === q && cand[k]?.photos?.length) continue
    const r = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({ query: q, per_page: '6', orientation: 'landscape' })}`, { headers: { Authorization: KEY } })
    if (!r.ok) { console.error(`${k}: ${r.status}`); continue }
    const j = await r.json()
    cand[k] = { query: q, photos: (j.photos ?? []).map(p => ({ id: p.id, url: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=900&h=600`, alt: p.alt ?? '', credit: `Photo by ${p.photographer} on Pexels`, page: p.url, tone: p.avg_color })) }
    console.log(`${k}: ${cand[k].photos.length}`)
  }
  mkdirSync(dirname(CAND), { recursive: true })
  writeFileSync(CAND, JSON.stringify(cand, null, 1))
}

const out = {}
for (const k of Object.keys(Q)) {
  const p = cand[k]?.photos?.[PICK[k] ?? 0]
  if (p) out[k] = { ...p, source: 'pexels', licence: 'Pexels License', kind: 'inspiration' }
}
writeFileSync(OUT, `/* Generated by scripts/resolve-requirement-photos.mjs — do not edit by hand.
   SAMBRAMO inspiration photographs (kind: 'inspiration'), never a partner's work. */
export const REQUIREMENT_PHOTOS = ${JSON.stringify(out, null, 1)}

/** The photo for a requirement card: the template's own, else the trade's. */
export const photoFor = (template, tradeId) => REQUIREMENT_PHOTOS[\`\${template}:\${tradeId}\`] ?? REQUIREMENT_PHOTOS[\`t:\${tradeId}\`] ?? null
`)
console.log(`wrote ${Object.keys(out).length} photos → ${OUT}`)
