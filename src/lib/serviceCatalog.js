import { supabase } from './supabase'
import { compressImage } from './imageUpload'
import { SERVICE_GROUPS } from '../data/servicePricing'

/**
 * Reading and writing the event-service catalogue (migration 037).
 *
 * ── What was wrong before ────────────────────────────────────────────────
 * The shop became editable in migration 025 — an admin can fix a cake's price
 * or photograph it from a phone. Event services never did. All thirty-nine of
 * them live in `src/data/servicePricing.js` as a JavaScript literal, so adding
 * "Mehendi artist" or putting a real photograph on "Photography" meant editing
 * source, building, and deploying.
 *
 * `service_catalog` fixes that: a row per service, an image, admin writes.
 *
 * ── The static file is still the authority for pricing ───────────────────
 * Not because of inertia. `servicePricing.js` carries `unit` (fixed /
 * per_guest / per_unit) and `scales`, and the quote engine computes with them
 * — `serviceCost()` in that same file, which the builder, the tier ladder and
 * every cart total run through. Copying those numbers into SQL and editing
 * them there would create two sources for one figure, and the quote engine
 * would keep reading the old one. That is the exact drift PROJECT_SUMMARY
 * describes for the brand strings, where four contradicting descriptors once
 * coexisted and one of them still called the product a marketplace.
 *
 * So the split is deliberate and worth stating plainly:
 *
 *   servicePricing.js  the thirty-nine built-in services, and the ONLY source
 *                      of the numbers the quote engine computes with.
 *   service_catalog    the editable layer — photographs, descriptions, what is
 *                      offered and what is retired, plus any service the
 *                      founder adds that has no code behind it.
 *
 * `syncBuiltIns()` copies the built-ins in, keyed by slug, so the two agree
 * without either becoming a mirror of the other. It is idempotent: run it
 * after any edit to servicePricing.js and it updates rather than duplicates.
 */

const BUCKET = 'product-images'

/**
 * Services live under `services/` inside the SHOP's bucket rather than a
 * bucket of their own. Migration 025's storage policies key on `bucket_id`
 * alone, so the prefix inherits public-read and admin-only-write unchanged —
 * one bucket and one set of policies to get right instead of two.
 */
const PREFIX = 'services'

/** Postgres/PostgREST codes for "that table isn't there yet". */
const ABSENT = /42P01|PGRST205|does not exist|schema cache/i

export function isMissingTable(error) {
  if (!error) return false
  return ABSENT.test(error.code ?? '') || ABSENT.test(error.message ?? '')
}

/**
 * URL-safe id from a service name. Matches the shape of the built-in ids
 * (`live_music`, `welcome_drinks`) so custom and built-in slugs read alike.
 */
export function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || `service_${Date.now().toString(36)}`
}

export async function fetchServices() {
  const { data, error } = await supabase
    .from('service_catalog')
    .select('*')
    .order('group_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Copy every built-in service into the table, by slug.
 *
 * Upsert on `slug` so re-running never duplicates. Only the fields the static
 * file actually owns are written — name, emoji, group, description, unit,
 * base, scales — which means an image, a rewritten description or a retired
 * flag set here SURVIVES a re-sync. Losing a photograph because somebody
 * pressed a sync button would make the button unusable.
 *
 * `source: 'seed'` marks these as code-derived. Custom rows are never touched
 * by this function, because their slugs are not in the static file.
 */
export async function syncBuiltIns() {
  const rows = SERVICE_GROUPS.flatMap((group, gi) =>
    group.services.map((s, si) => ({
      slug:        s.id,
      name:        s.name,
      emoji:       s.emoji ?? null,
      group_id:    group.id,
      description: s.desc ?? null,
      unit:        s.unit ?? null,
      base:        s.base ?? null,
      scales:      Boolean(s.scales),
      source:      'seed',
      sort_order:  gi * 100 + si,
    })),
  )

  const { data, error } = await supabase
    .from('service_catalog')
    .upsert(rows, { onConflict: 'slug', ignoreDuplicates: false })
    .select()

  if (error) throw error
  return data ?? []
}

export async function createService(patch) {
  const slug = patch.slug?.trim() || slugify(patch.name)
  const { data, error } = await supabase
    .from('service_catalog')
    .insert({ ...patch, slug, source: 'custom' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateService(id, patch) {
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
 * Retiring rather than deleting.
 *
 * A service can be referenced by the `services` JSONB snapshot on any past
 * `service_enquiries` row. Deleting the catalogue entry would not break those
 * rows — they carry their own copy — but it WOULD silently drop the service
 * out of the demand analytics that join the two back together, so a service
 * that was asked for fifty times would look like it had never existed.
 * `active = false` keeps the history readable and takes it off the storefront,
 * which is what "remove it" actually means here.
 */
export async function setServiceActive(id, active) {
  return updateService(id, { active })
}

/** Only ever for a custom row created by mistake and never used. */
export async function deleteService(id) {
  const { error } = await supabase.from('service_catalog').delete().eq('id', id)
  if (error) throw error
}

/**
 * Compress in the browser, upload, point the row at the result.
 *
 * Same path as the shop's product photos — `compressImage` turns a 4 MB phone
 * JPEG into roughly 200 KB of WebP before it ever leaves the device — because
 * there is no server here to resize on.
 *
 * `source` is the honesty flag the shop already uses: 'stock' is a licensed
 * lookalike and the customer-facing badge says so; 'actual' is a photograph of
 * work Sambramo has really delivered. Uploading from this screen defaults to
 * 'actual', because the reason to stand in front of a decorated hall with a
 * phone is that it is your decorated hall.
 */
export async function uploadServiceImage(service, file, { alt, source = 'actual' } = {}) {
  const blob = await compressImage(file)
  const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${PREFIX}/${service.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  try {
    return await updateService(service.id, {
      image_url:        publicUrl,
      image_alt:        alt || service.image_alt || null,
      image_source:     source,
      image_updated_at: new Date().toISOString(),
    })
  } catch (err) {
    // Never leave an object in the bucket that no row points at — it costs
    // storage forever and nothing will ever find it again.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(`Saved the file but could not update the service: ${err.message}`)
  }
}

/** Drop every uploaded file for a service and clear its image. */
export async function removeServiceImage(service) {
  const { data: files } = await supabase.storage.from(BUCKET).list(`${PREFIX}/${service.id}`)
  if (files?.length) {
    await supabase.storage.from(BUCKET).remove(files.map(f => `${PREFIX}/${service.id}/${f.name}`))
  }
  return updateService(service.id, {
    image_url: null, image_source: 'stock', image_updated_at: new Date().toISOString(),
  })
}

/** The groups a service can belong to, for the editor's dropdown. */
export const SERVICE_GROUP_OPTIONS = SERVICE_GROUPS.map(g => ({ id: g.id, label: g.label, hint: g.hint }))

export const UNIT_OPTIONS = [
  { id: 'fixed',     label: 'One price for the job',      hint: 'A photographer, a venue, a cake' },
  { id: 'per_guest', label: 'Per guest',                  hint: 'Catering, seating, welcome drinks' },
  { id: 'per_unit',  label: 'Per unit (hour, artist, …)', hint: 'Guards, mehendi artists, extra hours' },
]
