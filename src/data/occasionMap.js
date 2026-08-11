import { EVENT_DATA } from './eventServicesData'
import { EVENT_TYPES } from '../config/sambramo'
import { FESTIVALS } from './festivals'
import { entryPriceFor, PACKAGE_COUNT } from './occasionPackages'

/**
 * Translation between the app's two occasion vocabularies.
 *
 * They drifted apart and nothing reconciled them:
 *
 *   EVENT_TYPES  (config/sambramo.js)   hyphens — 'baby-shower', 'get-together'
 *                                       has 'festival' and 'other'
 *   EVENT_DATA   (eventServicesData.js) underscores — 'baby_shower', 'get_together'
 *                                       no 'festival', no 'other', but carries six
 *                                       extras: first_birthday, sangeet,
 *                                       thread_ceremony, seemantham, retirement,
 *                                       graduation
 *
 * The wizard speaks the first, the services catalog speaks the second, and the two
 * already cross in a couple of places where the mismatch produced dead ends:
 * MyEvents routed to the catalog using a wizard id and rendered "Event not found",
 * and the catalog linked back to the wizard with an id no EVENT_TYPES entry matches,
 * which wrote an unlabelable value into events.event_type.
 *
 * Making the catalog public multiplies those crossings, so the mapping lives here
 * once rather than being re-derived at each call site.
 */

/** Wizard id → catalog id. `null` means the catalog has nothing for it. */
const WIZARD_TO_CATALOG = {
  'birthday':         'birthday',
  'baby-shower':      'baby_shower',
  'naming-ceremony':  'naming_ceremony',
  'anniversary':      'anniversary',
  'housewarming':     'housewarming',
  'engagement':       'engagement',
  'wedding':          'wedding',
  'get-together':     'get_together',
  'corporate':        'corporate_event',
  // A festival is a whole category rather than one occasion, and "other" is by
  // definition unmapped. Both fall through to the full catalog index.
  'festival':         null,
  'other':            null,
}

/**
 * Catalog id → wizard id.
 *
 * The six catalog-only occasions have to land somewhere valid, because the value
 * ends up in events.event_type and every dashboard labels that column by looking
 * it up in EVENT_TYPES. Two have an honest parent; the rest become 'other', which
 * is exactly what that entry is for.
 */
const CATALOG_TO_WIZARD = {
  ...Object.fromEntries(
    Object.entries(WIZARD_TO_CATALOG)
      .filter(([, catalogId]) => catalogId)
      .map(([wizardId, catalogId]) => [catalogId, wizardId])
  ),
  'first_birthday':  'birthday',
  'sangeet':         'wedding',
  'thread_ceremony': 'other',
  'seemantham':      'other',
  'retirement':      'other',
  'graduation':      'other',
}

/**
 * Resolve anything occasion-shaped to a catalog id, or null when the catalog has
 * no page for it. Accepts either vocabulary so callers never have to know which
 * one they are holding.
 */
export function toCatalogId(type) {
  if (!type) return null
  if (EVENT_DATA[type]) return type
  if (type in WIZARD_TO_CATALOG) return WIZARD_TO_CATALOG[type]
  // A future hyphenated id whose underscored twin exists resolves without
  // anyone remembering to edit the table above.
  const underscored = type.replace(/-/g, '_')
  return EVENT_DATA[underscored] ? underscored : null
}

/** Resolve a catalog id to a wizard id that EVENT_TYPES definitely contains. */
export function toWizardType(catalogId) {
  if (!catalogId) return null
  if (EVENT_TYPES.some(t => t.id === catalogId)) return catalogId
  return CATALOG_TO_WIZARD[catalogId] ?? 'other'
}

/**
 * Everything the plan hub needs to speak about an occasion in one call.
 *
 * Prefers the catalog, because only it knows the service and package counts —
 * and those counts are the strongest self-select signal the hub can show. Falls
 * back to EVENT_TYPES for occasions the catalog does not carry, and to the
 * festival list when the visitor arrived from a festival card.
 */
export function occasionMeta(type, festivalId) {
  const catalogId = toCatalogId(type)
  const entry = catalogId ? EVENT_DATA[catalogId] : null

  if (entry) {
    return {
      known:         true,
      catalogId,
      label:         entry.name,
      emoji:         entry.emoji,
      tagline:       entry.tagline,
      heroGradient:  entry.heroGradient,
      serviceCount:  entry.services.length,
      // The eight scales, the same ladder every occasion is sold on.
      packageCount:  PACKAGE_COUNT,
    }
  }

  // A festival card carries its own identity, so name the festival rather than
  // saying the generic word "Festival" back at someone who just tapped "Diwali".
  if (type === 'festival' && festivalId) {
    const festival = FESTIVALS.find(f => f.id === festivalId)
    if (festival) {
      return {
        known:        true,
        catalogId:    null,
        label:        festival.name,
        emoji:        festival.emoji,
        tagline:      festival.tagline ?? null,
        heroGradient: null,
        serviceCount: null,
        packageCount: null,
      }
    }
  }

  const fallback = EVENT_TYPES.find(t => t.id === type)
  if (fallback) {
    return {
      known:        true,
      catalogId:    null,
      label:        fallback.label,
      emoji:        fallback.emoji,
      tagline:      fallback.tagline,
      heroGradient: null,
      serviceCount: null,
      packageCount: null,
    }
  }

  return {
    known: false,
    catalogId: null,
    label: null, emoji: null, tagline: null, heroGradient: null,
    serviceCount: null, packageCount: null,
  }
}

/** Totals for the hub's generic copy, so the numbers can never drift from the data. */
export const CATALOG_TOTALS = {
  occasions: Object.keys(EVENT_DATA).length,
  services: new Set(
    Object.values(EVENT_DATA).flatMap(e => e.services.map(s => s.id))
  ).size,
  cheapestPackage: Math.min(
    ...Object.keys(EVENT_DATA).map(entryPriceFor).filter(Number.isFinite)
  ),
}
