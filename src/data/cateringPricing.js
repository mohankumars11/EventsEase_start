import { CUISINES, COURSES, dishesFor, CUISINE_BY_ID } from './cuisineMenus'
import { KITCHEN_TYPES, dietOf } from './cateringFunnel'

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
  return {
    cuisines,
    kitchenType: kitchen,
    dishIds,
    diet: dietOf(kitchen),
    cuisineNames: cuisines.map(id => CUISINE_BY_ID[id]?.name).filter(Boolean),
  }
}

export function cateringDishCatalogue(cuisineIds = [], kitchenType = 'pure_veg') {
  const ids = cuisineIds.length ? cuisineIds : CUISINES.map(c => c.id)
  const diet = dietOf(kitchenType)
  const byId = new Map()

  for (const cuisineId of ids) {
    const cuisine = CUISINE_BY_ID[cuisineId]
    if (!cuisine) continue
    for (const course of COURSES) {
      for (const dish of dishesFor(cuisine, course.id, { vegOnly: false })) {
        if (!dish.sbmId) continue
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
  if (!Number.isFinite(min) || min < 1 || !Number.isInteger(min)) errors.minGuests = 'Minimum guests must be a whole number of at least 1.'
  if (max !== null && (!Number.isFinite(max) || !Number.isInteger(max) || max < min)) errors.maxGuests = 'Maximum guests must be a whole number at least as large as the minimum.'
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) errors.serviceHours = 'Service duration must be between 0 and 24 hours.'
  if (!Number.isFinite(staff) || !Number.isInteger(staff) || staff < 0 || staff > 500) errors.includedStaff = 'Enter a valid included staff count.'
  if (requireActive) {
    if (!Number.isFinite(rate) || rate <= 0) errors.rate = 'Enter a supply rate greater than zero.'
    if (!Array.isArray(draft?.items) || draft.items.length === 0) errors.items = 'Add at least one dish before activating.'
  } else if (draft?.rate !== '' && (!Number.isFinite(rate) || rate < 0)) {
    errors.rate = 'Supply rate cannot be negative.'
  }

  const duplicate = new Set()
  for (const item of draft?.items ?? []) {
    if (!item?.id) errors.items = errors.items || 'One menu item is missing a dish.'
    if (item?.id && duplicate.has(item.id)) errors.items = 'A dish can only appear once in a package.'
    if (item?.id) duplicate.add(item.id)
    if (!CATERING_MENU_SECTIONS.some(x => x.id === item.section)) errors.items = 'One menu item has an unsupported section.'
    if (!['included','optional','replacement'].includes(item.selectionType)) errors.items = 'One menu item has an unsupported selection type.'
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
    serviceStyle: 'buffet',
    minGuests: 100,
    maxGuests: 1000,
    serviceHours: 3,
    includedStaff: 4,
    rate: '',
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
