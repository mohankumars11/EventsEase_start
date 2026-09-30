import { CUISINES, COURSES, dishesFor, CUISINE_BY_ID } from './cuisineMenus'
import { KITCHEN_TYPES, dietOf } from './cateringFunnel'
import { SOURCING_MODES, DEFAULT_SOURCING } from './cateringModel'

export const CATERING_PRICING_UNIT = Object.freeze({
  id: 'per_guest',
  label: 'Per guest',
  short: '/ guest',
})

export const CATERING_SERVICE_STYLES = Object.freeze([
  { id: 'plantain_leaf', label: 'Plantain leaf', helper: 'Traditional seated service' },
  { id: 'buffet', label: 'Buffet', helper: 'Guests serve from counters' },
  { id: 'plated', label: 'Plated service', helper: 'Served at the table' },
  { id: 'packed_meals', label: 'Packed meals', helper: 'Packed and handed over' },
  { id: 'live_counters', label: 'Live counters', helper: 'Fresh preparation at the event' },
  { id: 'mixed', label: 'Mixed service', helper: 'More than one service style' },
  { id: 'custom', label: 'Custom arrangement', helper: 'Describe the setup in notes' },
])

export const CATERING_MENU_SECTIONS = Object.freeze([
  ['welcome','Welcome'],
  ['starters','Starters'],
  ['soup','Soup'],
  ['salad','Salad / kosambari'],
  ['breads','Breads / tiffin'],
  ['mains','Main dishes'],
  ['curries','Curries / gravies'],
  ['rice','Rice / biryani'],
  ['accompaniments','Accompaniments'],
  ['sweets','Sweets'],
  ['dessert','Dessert'],
  ['beverages','Beverages'],
  ['live_counter','Live counter'],
  ['other','Other'],
].map(([id, label]) => ({ id, label })))

export const CATERING_ADDON_CATALOGUE = Object.freeze([
  { id:'live_dosa', name:'Live dosa counter', unit:'per_counter', hint:'A live dosa station at the event.' },
  { id:'live_chaat', name:'Live chaat counter', unit:'per_counter', hint:'A staffed chaat station.' },
  { id:'live_pasta', name:'Live pasta counter', unit:'per_counter', hint:'Fresh pasta prepared on site.' },
  { id:'beverage', name:'Welcome beverage station', unit:'per_guest', hint:'Configured welcome beverage service.' },
  { id:'dessert', name:'Premium dessert station', unit:'per_counter', hint:'Dedicated dessert / finishing station.' },
  { id:'staff', name:'Additional service staff', unit:'per_staff', hint:'Additional serving or buffet staff.' },
  { id:'hour', name:'Additional service hour', unit:'per_hour', hint:'Extends the configured service window.' },
  { id:'crockery', name:'Crockery upgrade', unit:'per_set', hint:'Upgrade the serving ware package.' },
  { id:'transport', name:'Catering transport', unit:'per_trip', hint:'Transport of catering equipment / food.' },
])

export const CATERING_ADDON_UNITS = Object.freeze([
  { id:'per_guest', label:'per guest' },
  { id:'per_counter', label:'per counter' },
  { id:'per_staff', label:'per staff' },
  { id:'per_hour', label:'per hour' },
  { id:'per_event', label:'per event' },
  { id:'per_set', label:'per set' },
  { id:'per_item', label:'per item' },
  { id:'per_trip', label:'per trip' },
])

export const CATERING_DIET_LABELS = Object.freeze({
  pure_veg: 'Pure vegetarian kitchen',
  pure_nonveg: 'Non-vegetarian kitchen',
  both: 'Vegetarian + non-vegetarian',
})

export function defaultCateringRateBands({ minGuests = 100, maxGuests = 1000, rate = '' } = {}) {
  return [{
    id: 'band-1',
    minGuests: String(minGuests),
    maxGuests: maxGuests == null ? '' : String(maxGuests),
    rate: rate === '' || rate == null ? '' : String(rate),
  }]
}

export function validateCateringRateBands({ bands = [], minGuests = 1, maxGuests = null, requireActive = false } = {}) {
  const errors = []
  const list = Array.isArray(bands) ? bands : []
  const min = Number(minGuests)
  const cap = maxGuests === '' || maxGuests == null ? null : Number(maxGuests)

  if (requireActive && list.length === 0) {
    errors.push('Add at least one guest-volume price band.')
    return errors
  }

  if (!list.length) return errors
  let previousMax = null

  for (let i = 0; i < list.length; i++) {
    const band = list[i] ?? {}
    const bandMin = Number(band.minGuests)
    const bandMax = band.maxGuests === '' || band.maxGuests == null ? null : Number(band.maxGuests)
    const bandRate = Number(band.rate)

    if (!Number.isInteger(bandMin) || bandMin < min) {
      errors.push('Every pricing band must start at or above the menu minimum.')
      break
    }
    if (i === 0 && bandMin !== min) {
      errors.push('The first pricing band must start at the menu minimum.')
      break
    }
    if (i > 0 && (previousMax == null || bandMin !== previousMax + 1)) {
      errors.push('Guest pricing bands must be contiguous with no gaps or overlaps.')
      break
    }
    if (bandMax != null && (!Number.isInteger(bandMax) || bandMax < bandMin)) {
      errors.push('A pricing band maximum must be a whole number at least its minimum.')
      break
    }
    if (i < list.length - 1 && bandMax == null) {
      errors.push('Only the final pricing band can have no maximum.')
      break
    }
    if (!Number.isFinite(bandRate) || bandRate <= 0) {
      errors.push('Every active pricing band needs a supply rate greater than zero.')
      break
    }
    if (cap != null && bandMax != null && bandMax > cap) {
      errors.push('A pricing band cannot exceed the menu maximum.')
      break
    }
    previousMax = bandMax
  }

  if (requireActive) {
    if (cap != null && previousMax !== cap) {
      errors.push('Pricing bands must cover the full menu guest range.')
    }
    if (cap == null && previousMax != null) {
      errors.push('With no menu maximum, the final pricing band must have no maximum.')
    }
  }
  return errors
}

export function rateFromBands(bands = []) {
  const first = Array.isArray(bands) ? bands[0] : null
  const n = Number(first?.rate)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const normDish = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

export function cateringCapabilityFromListing(service) {
  const specs = service?.specs ?? {}
  const cuisines = Array.isArray(specs.cuisines)
    ? specs.cuisines.filter(id => CUISINE_BY_ID[id])
    : []
  const kitchen = KITCHEN_TYPES.some(k => k.id === specs.kitchen_type)
    ? specs.kitchen_type
    : 'pure_veg'
  const dishIds = Array.isArray(specs.dish_ids)
    ? specs.dish_ids.filter(id => typeof id === 'string' && id.startsWith('SBM-'))
    : []
  const legacyDishNames = Array.isArray(specs.dishes)
    ? specs.dishes.filter(v => String(v ?? '').trim()).map(v => String(v).trim())
    : []
  const serviceStyle = CATERING_SERVICE_STYLES.some(x => x.id === specs.service_style)
    ? specs.service_style
    : 'buffet'
  const sourcingMode = SOURCING_MODES.some(x => x.id === specs.sourcing_mode)
    ? specs.sourcing_mode
    : DEFAULT_SOURCING

  return {
    cuisines,
    kitchenType: kitchen,
    dishIds,
    legacyDishNames,
    dishCount: dishIds.length,
    diet: dietOf(kitchen),
    cuisineNames: cuisines.map(id => CUISINE_BY_ID[id]?.name).filter(Boolean),
    serviceStyle,
    sourcingMode,
  }
}

export function cateringDishCatalogue(cuisineIds = [], kitchenType = 'pure_veg', allowedDishIds = null) {
  const ids = cuisineIds.length ? cuisineIds : CUISINES.map(c => c.id)
  const diet = dietOf(kitchenType)
  const byId = new Map()
  const allowed = Array.isArray(allowedDishIds) && allowedDishIds.length ? new Set(allowedDishIds) : null

  for (const cuisineId of ids) {
    const cuisine = CUISINE_BY_ID[cuisineId]
    if (!cuisine) continue
    for (const course of COURSES) {
      for (const dish of dishesFor(cuisine, course.id, { vegOnly: false })) {
        if (!dish.sbmId) continue
        if (allowed && !allowed.has(dish.sbmId)) continue
        if (diet === 'veg' && dish.veg === false) continue
        if (diet === 'nonveg' && dish.veg !== false) continue
        const prior = byId.get(dish.sbmId)
        if (prior) {
          if (!prior.cuisineIds.includes(cuisine.id)) prior.cuisineIds.push(cuisine.id)
          continue
        }
        byId.set(dish.sbmId, {
          id: dish.sbmId,
          name: dish.name,
          cuisineIds: [cuisine.id],
          cuisineName: cuisine.name,
          courseId: course.id,
          diet: dish.veg === false ? 'nonveg' : 'veg',
          note: dish.note ?? '',
        })
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function catalogueSections() {
  return COURSES.map(course => ({
    id: course.id,
    label: course.label ?? course.name ?? course.id,
  }))
}

export function validateCateringPackage({ draft, requireActive = false } = {}) {
  const errors = {}
  const name = String(draft?.name ?? '').trim()
  const min = Number(draft?.minGuests)
  const max = draft?.maxGuests === '' || draft?.maxGuests == null ? null : Number(draft.maxGuests)
  const hours = Number(draft?.serviceHours)
  const staff = Number(draft?.includedStaff)
  const rate = Number(draft?.rate)

  if (!name) errors.name = 'Name this menu package so customers know what they are choosing.'
  else if (name.length > 80) errors.name = 'Keep the menu name within 80 characters.'
  if (!Array.isArray(draft?.cuisines) || draft.cuisines.length === 0) errors.cuisines = 'Select at least one cuisine.'
  if (!['pure_veg','pure_nonveg','both'].includes(draft?.kitchenType)) errors.kitchenType = 'Select the kitchen type.'
  if (!CATERING_SERVICE_STYLES.some(x => x.id === draft?.serviceStyle)) errors.serviceStyle = 'Select the service style.'
  if (!SOURCING_MODES.some(x => x.id === draft?.sourcingMode)) errors.sourcingMode = 'Select how the food is sourced.'
  if (!Number.isFinite(min) || min < 1 || !Number.isInteger(min)) errors.minGuests = 'Minimum guests must be a whole number of at least 1.'
  if (max !== null && (!Number.isFinite(max) || !Number.isInteger(max) || max < min)) errors.maxGuests = 'Maximum guests must be a whole number at least as large as the minimum.'
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) errors.serviceHours = 'Service duration must be between 0 and 24 hours.'
  if (!Number.isFinite(staff) || !Number.isInteger(staff) || staff < 0 || staff > 500) errors.includedStaff = 'Enter a valid included staff count.'
  if (requireActive) {
    if (!Number.isFinite(rate) || rate <= 0) errors.rate = 'Enter a supply rate greater than zero.'
    const bandErrors = validateCateringRateBands({ bands: draft?.rateBands, minGuests: min, maxGuests: max, requireActive: true })
    if (bandErrors.length) errors.rateBands = bandErrors[0]
    if (!Array.isArray(draft?.items) || draft.items.length === 0) errors.items = 'Add at least one dish before activating.'
  } else if (draft?.rate !== '' && (!Number.isFinite(rate) || rate < 0)) {
    errors.rate = 'Supply rate cannot be negative.'
  }
  if (draft?.rateBands?.length && !requireActive) {
    const bandErrors = validateCateringRateBands({ bands: draft.rateBands, minGuests: min, maxGuests: max, requireActive: false })
    if (bandErrors.length) errors.rateBands = bandErrors[0]
  }

  const duplicate = new Set()
  for (const item of draft?.items ?? []) {
    if (!item?.id) errors.items = errors.items || 'One menu item is missing a dish.'
    if (item?.id && duplicate.has(item.id)) errors.items = 'A dish can only appear once in a package.'
    if (item?.id) duplicate.add(item.id)
    if (!CATERING_MENU_SECTIONS.some(x => x.id === item.section)) errors.items = 'One menu item has an unsupported section.'
    if (!['included','optional','replacement'].includes(item.selectionType)) errors.items = 'One menu item has an unsupported selection type.'
    if (item.selectionType === 'replacement' && !String(item.choiceGroup ?? '').trim()) errors.items = 'Replacement dishes need a replacement group.'
    if (Array.isArray(draft?.capabilityDishIds) && draft.capabilityDishIds.length && !draft.capabilityDishIds.includes(item.id)) errors.items = 'A menu can only include dishes you declared on this catering listing.'
  }

  for (const addon of draft?.addons ?? []) {
    const addonId = addon.id || crypto.randomUUID()
    if (!String(addon.name ?? '').trim()) errors['addon:' + addonId] = 'Add-on name is required.'
    const addonRate = Number(addon.rate)
    const addonMin = Number(addon.minimum)
    const addonMax = addon.maximum === '' || addon.maximum == null ? null : Number(addon.maximum)
    if (!Number.isFinite(addonRate) || addonRate < 0) errors['addon:' + addonId] = 'Enter a valid add-on rate.'
    if (!Number.isInteger(addonMin) || addonMin < 1) errors['addon:' + addonId] = 'Minimum quantity must be at least 1.'
    if (addonMax !== null && (!Number.isInteger(addonMax) || addonMax < addonMin)) errors['addon:' + addonId] = 'Maximum quantity cannot be below the minimum.'
    if (!CATERING_ADDON_UNITS.some(u => u.id === addon.unit)) errors['addon:' + addonId] = 'Choose a supported add-on unit.'
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

export function emptyCateringPackage(capability) {
  return {
    id: null,
    name: '',
    cuisines: capability?.cuisines?.length ? [...capability.cuisines] : [],
    kitchenType: capability?.kitchenType ?? 'pure_veg',
    serviceStyle: capability?.serviceStyle ?? 'buffet',
    sourcingMode: capability?.sourcingMode ?? DEFAULT_SOURCING,
    capabilityDishIds: capability?.dishIds ?? [],
    minGuests: 100,
    maxGuests: 1000,
    serviceHours: 3,
    includedStaff: 4,
    rate: '',
    rateBands: defaultCateringRateBands({ minGuests: 100, maxGuests: 1000 }),
    items: [],
    addons: [],
    notes: '',
    status: 'DRAFT',
    version: 0,
  }
}

export function addonDraftFrom(addon) {
  return {
    id: addon?.id ?? crypto.randomUUID(),
    name: addon?.name ?? '',
    unit: addon?.unit ?? 'per_counter',
    rate: addon?.rate_paise != null ? String(Math.round(Number(addon.rate_paise) / 100)) : '',
    minimum: String(addon?.minimum_quantity ?? 1),
    maximum: addon?.maximum_quantity == null ? '' : String(addon.maximum_quantity),
    included: String(addon?.included_quantity ?? 0),
    notes: addon?.notes ?? '',
    active: addon?.active !== false,
  }
}

export function sectionLabel(id) {
  return CATERING_MENU_SECTIONS.find(x => x.id === id)?.label ?? 'Other'
}

export function addonUnitLabel(id) {
  return CATERING_ADDON_UNITS.find(x => x.id === id)?.label ?? id
}
