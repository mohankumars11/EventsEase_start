import { supabase } from './supabase'
import { compressImage } from './imageUpload'
import { slugify, isMissingTable } from './serviceCatalog'
import { SERVICE_GROUPS } from '../data/servicePricing'
import { DECOR_THEME_CATALOGUE, DECOR_FAMILIES } from '../data/decorThemes'
import { DECOR_LEVELS } from '../data/decorPackages'
import { CUISINES } from '../data/cuisineMenus'
import { CELEBRATION_TIERS } from '../data/celebrationTiers'
import { FESTIVALS } from '../data/festivals'
import { OFFERS } from '../data/celebrationOffers'

/**
 * Every kind of thing a customer can see, and how to edit it.
 *
 * ── Why a registry ───────────────────────────────────────────────────────
 * The founder's ask was blunt and correct: everything available to a customer
 * should be addable, editable and removable from the admin console. Six
 * content types were still hard-coded in `src/data/*.js` — decor themes,
 * decor levels, cuisines, the eight celebration tiers, festivals and offers —
 * so changing any of them meant a code change and a deploy.
 *
 * Six bespoke admin screens would have been six screens to keep in sync. They
 * are all the same shape underneath: a name, an emoji, a line of copy, a
 * picture, a price or two, an order, and an on/off switch. So there is one
 * screen, driven by this registry, and the differences live in `fields` and
 * `payload`.
 *
 * ── Code stays the pricing authority ─────────────────────────────────────
 * Same split `serviceCatalog.js` documents, for the same reason. The quote
 * engine computes from `celebrationTiers.js`, `decorPackages.js` and
 * `cuisineMenus.js` — `quoteFor()`, `tierEconomics`, the menu allowances.
 * Copying those numbers into SQL and editing them there would give one figure
 * to the admin screen and a different one to the customer's actual quote.
 *
 * So this table owns everything DESCRIPTIVE — names, taglines, blurbs,
 * photographs, what is offered, what order it appears in — plus anything the
 * founder adds that has no code behind it. Numbers that the engine computes
 * with are shown, marked, and edited in code. Every kind below states which
 * of its fields are which, and the editor renders that warning inline instead
 * of leaving somebody to discover it.
 *
 * ── Sync is idempotent, and never destructive ────────────────────────────
 * `syncKind()` upserts the built-ins by (kind, slug), writing only the fields
 * the source file owns. A photograph, a rewritten blurb or a retired flag set
 * in the console SURVIVES a re-sync — a sync button that eats your work is a
 * button nobody presses twice.
 */

const BUCKET = 'product-images'

/* ── Field types the editor knows how to render ────────────────────────── */

const F = {
  text:    (key, label, hint) => ({ key, label, hint, type: 'text' }),
  area:    (key, label, hint) => ({ key, label, hint, type: 'textarea' }),
  money:   (key, label, hint) => ({ key, label, hint, type: 'number' }),
  list:    (key, label, hint) => ({ key, label, hint, type: 'list' }),
  emoji:   (key, label)       => ({ key, label, type: 'emoji' }),
}

/* ── The registry ──────────────────────────────────────────────────────── */

export const CONTENT_KINDS = [
  {
    id: 'service',
    label: 'Event services',
    emoji: '🎪',
    singular: 'service',
    blurb: 'Everything bookable for a celebration — photography, decor, catering, priests, security.',
    // Where the customer meets it, so an admin knows what they are changing.
    surface: 'The occasion page and the celebration builder',
    engineOwns: ['unit', 'base', 'scales'],
    engineNote: 'The pricing unit and base rate are computed with by the quote engine from src/data/servicePricing.js. Edit them there, then re-sync.',
    fields: [F.text('tagline', 'Tagline'), F.area('description', 'What it is')],
    seed: () => SERVICE_GROUPS.flatMap((g, gi) => g.services.map((s, si) => ({
      slug: s.id, name: s.name, emoji: s.emoji, group_id: g.id,
      description: s.desc ?? null, unit: s.unit ?? null, base: s.base ?? null,
      scales: Boolean(s.scales), sort_order: gi * 100 + si,
      payload: { note: s.note ?? null },
    }))),
    groups: SERVICE_GROUPS.map(g => ({ id: g.id, label: g.label })),
  },

  {
    id: 'decor_theme',
    label: 'Decor themes',
    emoji: '🎨',
    singular: 'theme',
    blurb: 'The individual setups — a mandap, a haldi corner, a griha pravesh doorway. This is the biggest photo opportunity you have.',
    surface: 'The decor chooser and the theme sheets',
    engineOwns: [],
    engineNote: null,
    fields: [
      F.text('tagline', 'One-line hook'),
      F.area('description', 'What it is'),
      F.money('base', 'Fixed cost (₹)'),
      F.money('per_guest', 'Per guest (₹)'),
      F.list('includes', 'What is installed', 'One line each — this is the list the customer actually reads.'),
      F.list('bestFor', 'Best for', 'Occasions this suits.'),
    ],
    seed: () => DECOR_THEME_CATALOGUE.map((t, i) => ({
      slug: t.id, name: t.name, emoji: t.emoji, group_id: t.family,
      tagline: t.blurb ?? null, base: t.base ?? null, per_guest: t.perGuest ?? null,
      sort_order: i,
      payload: { includes: t.includes ?? [], bestFor: t.bestFor ?? [], tags: t.tags ?? [], tint: t.tint ?? null },
    })),
    groups: DECOR_FAMILIES.map(f => ({ id: f.id, label: f.label ?? f.name ?? f.id })),
  },

  {
    id: 'decor_level',
    label: 'Decor levels',
    emoji: '✨',
    singular: 'level',
    blurb: 'How much decoration, as a ladder — from "we are handling it" to a full production.',
    surface: 'The tier ladder and the decor step of the builder',
    engineOwns: ['base', 'per_guest'],
    engineNote: 'The quote engine reads fixedCost and perGuestTouch from src/data/decorPackages.js. The figures here are display copies.',
    fields: [
      F.text('tagline', 'Tagline'),
      F.area('description', 'What it is'),
      F.list('inclusions', 'What is included'),
    ],
    seed: () => DECOR_LEVELS.map((d, i) => ({
      slug: d.id, name: d.name, emoji: d.emoji, group_id: 'levels',
      tagline: d.tagline ?? null, description: d.description ?? null,
      base: d.fixedCost ?? null, per_guest: d.perGuestTouch ?? null,
      active: !d.hidden, sort_order: i,
      payload: { inclusions: d.inclusions ?? [] },
    })),
    groups: [{ id: 'levels', label: 'The ladder' }],
  },

  {
    id: 'cuisine',
    label: 'Cuisines',
    emoji: '🍽️',
    singular: 'cuisine',
    blurb: 'The menus behind catering. Photograph the food and this stops being a list of words.',
    surface: 'The menu composer and every catering service card',
    engineOwns: ['base'],
    engineNote: 'The per-plate rate the quote engine uses is basePlate in src/data/cuisineMenus.js. The dish lists live there too — this screen owns the name, the blurb and the photograph.',
    fields: [
      F.text('tagline', 'One-line description'),
      F.money('base', 'Per plate (₹)'),
      F.text('localName', 'Local name'),
    ],
    seed: () => CUISINES.map((c, i) => ({
      slug: c.id, name: c.name, emoji: c.emoji, group_id: c.region ?? 'other',
      tagline: c.blurb ?? null, base: c.basePlate ?? null, unit: 'per_guest',
      sort_order: i,
      payload: {
        localName: c.localName ?? null,
        hasNonVeg: Boolean(c.hasNonVeg),
        courseCounts: Object.fromEntries(
          Object.entries(c.courses ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
        ),
      },
    })),
    groups: [...new Set(CUISINES.map(c => c.region).filter(Boolean))].map(r => ({ id: r, label: r })),
  },

  {
    id: 'tier',
    label: 'Celebration tiers',
    emoji: '🪜',
    singular: 'tier',
    blurb: 'The eight scales the whole planner is built on. Change these carefully — they are the ladder every quote climbs.',
    surface: 'The tier ladder, the plan hub, and every occasion page',
    engineOwns: ['base', 'guests', 'menuAllowance'],
    engineNote: 'Guest ranges, coordination fees and menu allowances are computed with from src/data/celebrationTiers.js. The name, tagline, description and highlights are yours.',
    fields: [
      F.text('tagline', 'Tagline'),
      F.area('description', 'What this scale is'),
      F.list('highlights', 'Highlights', 'The bullets on the tier card.'),
      F.text('localName', 'Local name'),
    ],
    seed: () => CELEBRATION_TIERS.map((t, i) => ({
      slug: t.id, name: t.name, emoji: t.emoji, group_id: 'tiers',
      tagline: t.tagline ?? null, description: t.description ?? null,
      base: t.coordinationFee ?? null, sort_order: i,
      payload: {
        localName: t.localName ?? null,
        guests: t.guests ?? null,
        highlights: t.highlights ?? [],
        includedServices: t.includedServices ?? [],
        defaultDecor: t.defaultDecor ?? null,
      },
    })),
    groups: [{ id: 'tiers', label: 'The eight scales' }],
  },

  {
    id: 'festival',
    label: 'Festivals',
    emoji: '🪔',
    singular: 'festival',
    blurb: 'The festival landing pages. Each one is a seasonal front door — worth a real photograph before its month comes round.',
    surface: '/festivals/:id and the home festival strip',
    engineOwns: [],
    engineNote: null,
    fields: [
      F.text('tagline', 'Tagline'),
      F.area('description', 'What the festival is'),
      F.area('emotionalHook', 'The feeling', 'The sentence that goes above the fold.'),
      F.text('month', 'When'),
      F.text('region', 'Where'),
    ],
    seed: () => FESTIVALS.map((f, i) => ({
      slug: f.id, name: f.name, emoji: f.emoji, group_id: 'festivals',
      tagline: f.tagline ?? null, description: f.description ?? null, sort_order: i,
      payload: {
        emotionalHook: f.emotionalHook ?? null,
        month: f.month ?? null,
        duration: f.duration ?? null,
        region: f.region ?? null,
        accentHex: f.accentHex ?? null,
      },
    })),
    groups: [{ id: 'festivals', label: 'All festivals' }],
  },

  {
    id: 'offer',
    label: 'Offers',
    emoji: '🎁',
    singular: 'offer',
    blurb: 'The coupons and promises on the offers rail. These are commitments to customers — the terms line is not decoration.',
    surface: 'The offers rail on the plan hub and the storefront',
    engineOwns: [],
    engineNote: null,
    fields: [
      F.text('code', 'Coupon code', 'Leave blank for a promise that is not a code.'),
      F.text('headline', 'Headline', 'e.g. "10% off"'),
      F.area('description', 'What it is'),
      F.area('terms', 'Terms', 'Exactly what is and is not included. This is the bit that gets argued about.'),
    ],
    seed: () => OFFERS.map((o, i) => ({
      slug: o.id, name: o.name, emoji: o.emoji, group_id: o.kind ?? 'offer',
      tagline: o.blurb ?? null, sort_order: i,
      payload: {
        code: o.code ?? null,
        headline: o.headline ?? null,
        terms: o.terms ?? null,
        kind: o.kind ?? null,
        accent: o.accent ?? null,
      },
    })),
    // Built from the source so a new `kind` in celebrationOffers.js appears
    // as a filter here without an edit in two places.
    groups: [...new Set(OFFERS.map(o => o.kind).filter(Boolean))].map(k => ({
      id: k, label: k.charAt(0).toUpperCase() + k.slice(1) + 's',
    })),
  },
]

export const KIND_BY_ID = Object.fromEntries(CONTENT_KINDS.map(k => [k.id, k]))

/* ── Reading ───────────────────────────────────────────────────────────── */

export async function fetchKind(kind) {
  const { data, error } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('kind', kind)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * How many rows each kind has, and how many carry a photograph.
 *
 * One query rather than seven: this drives the studio's landing grid, and
 * seven round trips to draw seven tiles is how a dashboard feels slow.
 * `kind` is only added by migration 040, so a database with 037 but not 040
 * returns rows without it — those are all services, which is exactly what
 * they were.
 */
export async function fetchKindCounts() {
  const { data, error } = await supabase
    .from('service_catalog')
    .select('kind, active, image_url, image_source')
  if (error) throw error
  const map = Object.fromEntries(CONTENT_KINDS.map(k => [k.id, { total: 0, active: 0, photos: 0, real: 0 }]))
  for (const row of data ?? []) {
    const k = row.kind ?? 'service'
    if (!map[k]) map[k] = { total: 0, active: 0, photos: 0, real: 0 }
    map[k].total += 1
    if (row.active !== false) map[k].active += 1
    if (row.image_url) map[k].photos += 1
    if (row.image_source === 'actual') map[k].real += 1
  }
  return map
}

/* ── Writing ───────────────────────────────────────────────────────────── */

/**
 * Copy the built-ins for one kind into the table.
 *
 * Only the fields the source file owns are written. `active` is deliberately
 * NOT in the upsert payload except where the source explicitly hides a row
 * (decor levels), because otherwise re-syncing would un-retire everything the
 * admin had switched off.
 */
export async function syncKind(kind) {
  const meta = KIND_BY_ID[kind]
  if (!meta) throw new Error(`Unknown content kind: ${kind}`)

  const rows = meta.seed().map(r => ({
    kind,
    source: 'seed',
    scales: false,
    ...r,
    payload: r.payload ?? {},
  }))

  const { data, error } = await supabase
    .from('service_catalog')
    .upsert(rows, { onConflict: 'kind,slug', ignoreDuplicates: false })
    .select()
  if (error) throw error
  return data ?? []
}

export async function createItem(kind, patch) {
  const slug = patch.slug?.trim() || slugify(patch.name)
  const { data, error } = await supabase
    .from('service_catalog')
    .insert({ ...patch, kind, slug, source: 'custom', payload: patch.payload ?? {} })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItem(id, patch) {
  const { data, error } = await supabase
    .from('service_catalog')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Retire, don't delete — for built-ins.
 *
 * A seeded row that is deleted simply reappears on the next sync, so "delete"
 * on a built-in is a button that undoes itself. Custom rows have no source to
 * come back from and can genuinely be removed.
 */
export async function setActive(id, active) {
  return updateItem(id, { active })
}

export async function deleteItem(id) {
  const { error } = await supabase.from('service_catalog').delete().eq('id', id)
  if (error) throw error
}

/** Move an item up or down within its kind. Sort order is what the customer sees. */
export async function reorder(items) {
  const updates = items.map((it, i) => ({ id: it.id, sort_order: i }))
  const { error } = await supabase.from('service_catalog').upsert(updates)
  if (error) throw error
}

/* ── Images ────────────────────────────────────────────────────────────── */

export async function removeItemImage(item) {
  const dir = `content/${item.kind ?? 'service'}/${item.id}`
  const { data: files } = await supabase.storage.from(BUCKET).list(dir)
  if (files?.length) {
    await supabase.storage.from(BUCKET).remove(files.map(f => `${dir}/${f.name}`))
  }
  return updateItem(item.id, {
    image_url: null, image_source: 'stock', image_updated_at: new Date().toISOString(),
    // The gallery is stored in `payload` (see below) and every file it pointed
    // at has just been deleted from storage. Leaving the array behind would
    // give the customer a slider full of 404s.
    payload: { ...(item.payload ?? {}), gallery: [] },
  })
}

/* ── Galleries ─────────────────────────────────────────────────────────────
 *
 * One item, any number of photographs, and a horizontal slider on the customer
 * side. The founder's ask was blunt: everything with a picture on it should take
 * MORE than one picture, uploaded from the console.
 *
 * ── Why this lives in `payload` and not in a new table ────────────────────
 * `service_catalog.payload` is JSONB and already exists (migration 040), so the
 * whole feature ships with no migration — which matters here more than it
 * usually would, because migrations in this project are applied by hand out of
 * the SQL editor. A feature that needs a `content_images` table is a feature
 * that silently does nothing until somebody remembers to run the file, and the
 * failure mode is an admin uploading six photographs into a void.
 *
 * The honest trade: a JSONB array cannot be queried or constrained the way a
 * table could. Nothing needs to — no screen asks "which photo is used most",
 * the arrays are single-digit, and they are always read as part of the row they
 * belong to. If that ever changes this becomes a table, and `itemGallery()`
 * below is the one place that would have to know.
 *
 * ── `image_url` stays the cover, and that is the important part ───────────
 * The gallery INCLUDES the cover at index 0, and `image_url` keeps pointing at
 * it. So every existing consumer — the storefront, the decor chooser, the theme
 * sheets, `fetchKindCounts`, the "needs a real photo" index from migration 023
 * — goes on working with no change at all, and reads the same first frame it
 * always did. The slider is additive: a surface that has not been taught about
 * galleries shows the cover, which is exactly right.
 *
 * That is also why cover changes write BOTH fields. Two sources of truth for
 * "the main photo" is the bug this ordering exists to prevent.
 */

/** A gallery frame: `{ url, alt, source, at }`. */
function frameOf(url, { alt = null, source = 'actual' } = {}) {
  return { url, alt, source, at: new Date().toISOString() }
}

/**
 * Every photograph on this item, oldest-cover-first, as normalised frames.
 *
 * Rows that predate galleries have an `image_url` and no `payload.gallery`, and
 * they must not read as having zero photographs — so a bare `image_url` is
 * promoted to a one-frame gallery. This is the only function that knows the
 * storage shape; everything else takes its output.
 */
export function itemGallery(item) {
  const raw = Array.isArray(item?.payload?.gallery) ? item.payload.gallery : []
  const frames = raw
    .filter(f => f && typeof f.url === 'string')
    .map(f => ({ url: f.url, alt: f.alt ?? null, source: f.source ?? 'stock', at: f.at ?? null }))

  if (frames.length === 0 && item?.image_url) {
    return [{ url: item.image_url, alt: item.image_alt ?? null, source: item.image_source ?? 'stock', at: item.image_updated_at ?? null }]
  }
  // The cover wins its place regardless of array order — if the two ever
  // disagree, `image_url` is what every other surface in the app is already
  // showing, so it is the one the slider must open on.
  if (item?.image_url) {
    const i = frames.findIndex(f => f.url === item.image_url)
    if (i > 0) return [frames[i], ...frames.slice(0, i), ...frames.slice(i + 1)]
    if (i === -1) return [{ url: item.image_url, alt: item.image_alt ?? null, source: item.image_source ?? 'stock', at: null }, ...frames]
  }
  return frames
}

/**
 * Upload several photographs at once and append them to the gallery.
 *
 * Sequential rather than `Promise.all`: these are phone photographs being
 * compressed in the browser and pushed to storage, and eight parallel canvas
 * encodes on a mid-range laptop is how the console freezes. `onProgress` exists
 * so the button can say "3 of 8" instead of spinning silently for a minute.
 *
 * Partial success is a real outcome and is treated as one. If file five fails,
 * files one to four are already in storage and are STILL SAVED to the row
 * before the error is raised — the alternative is an admin losing four
 * successful uploads to one bad JPEG, and orphaned objects nothing points at
 * that cost storage forever.
 */
export async function uploadItemImages(item, files, { source = 'actual', onProgress } = {}) {
  const list = Array.from(files ?? []).filter(Boolean)
  if (list.length === 0) return item

  const kind = item.kind ?? 'service'
  const existing = itemGallery(item)
  const added = []
  let failure = null

  for (let i = 0; i < list.length; i++) {
    onProgress?.({ done: i, total: list.length })
    try {
      const blob = await compressImage(list[i])
      const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg'
      // The index is in the path as well as the timestamp: a multi-file upload
      // can complete two files inside the same millisecond, and `upsert: false`
      // would then reject the second as a duplicate key.
      const path = `content/${kind}/${item.id}/${Date.now()}-${i}.${ext}`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      added.push(frameOf(publicUrl, { alt: item.image_alt, source }))
    } catch (err) {
      failure = err
      break
    }
  }

  if (added.length === 0) throw new Error(`Upload failed: ${failure?.message ?? 'unknown error'}`)

  const gallery = [...existing, ...added]
  const patch = {
    payload: { ...(item.payload ?? {}), gallery },
    image_updated_at: new Date().toISOString(),
  }
  // Only claim the cover if there wasn't one. An admin adding a second angle to
  // a photographed item is not asking to replace its cover.
  if (!item.image_url) {
    patch.image_url = gallery[0].url
    patch.image_source = gallery[0].source
  }

  const saved = await updateItem(item.id, patch)
  if (failure) {
    throw Object.assign(
      new Error(`Saved ${added.length} of ${list.length}. The rest failed: ${failure.message}`),
      { item: saved, partial: true },
    )
  }
  return saved
}

/** Promote one frame to the cover, so every other surface shows it too. */
export async function setGalleryCover(item, url) {
  const gallery = itemGallery(item)
  const frame = gallery.find(f => f.url === url)
  if (!frame) throw new Error('That photo is not on this item.')
  return updateItem(item.id, {
    payload: { ...(item.payload ?? {}), gallery: [frame, ...gallery.filter(f => f.url !== url)] },
    image_url: frame.url,
    image_source: frame.source,
    image_alt: frame.alt ?? item.image_alt ?? null,
    image_updated_at: new Date().toISOString(),
  })
}

/**
 * Delete one frame — from the row and from storage.
 *
 * The row is updated FIRST and the object removed after. That order is
 * deliberate: if the storage delete fails we are left with a file nothing points
 * at, which costs a few kilobytes; the other order risks a row pointing at a
 * file that no longer exists, which is a broken image on a customer's screen.
 *
 * Removing the cover promotes the next frame rather than leaving the item
 * pictureless while five photographs sit in its gallery.
 */
export async function removeGalleryImage(item, url) {
  const gallery = itemGallery(item)
  const rest = gallery.filter(f => f.url !== url)
  const wasCover = item.image_url === url

  const patch = {
    payload: { ...(item.payload ?? {}), gallery: rest },
    image_updated_at: new Date().toISOString(),
  }
  if (wasCover) {
    patch.image_url    = rest[0]?.url ?? null
    patch.image_source = rest[0]?.source ?? 'stock'
    patch.image_alt    = rest[0]?.alt ?? null
  }

  const saved = await updateItem(item.id, patch)

  // Storage keys are paths, not URLs. Anything not under our own prefix is a
  // resolver-assigned stock photo on a CDN we do not own — skip rather than
  // attempt a delete that would fail.
  const marker = '/object/public/' + BUCKET + '/'
  const at = url.indexOf(marker)
  if (at !== -1) {
    await supabase.storage.from(BUCKET).remove([url.slice(at + marker.length)])
  }
  return saved
}

/** True when migration 040 has not been applied — `kind` will not exist. */
export function isMissingKindColumn(error) {
  if (!error) return false
  return /42703/.test(error.code ?? '') || /kind.*does not exist|column .*kind/i.test(error.message ?? '')
}

export { isMissingTable, slugify }
