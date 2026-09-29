/**
 * Sambramo partner questionnaire V2 reconciliation rules.
 * Additive/non-destructive: legacy answer keys remain readable during migration.
 */
export const PARTNER_QUESTIONNAIRE_V2_RULES = {
  version: '1.2.0',
  tradeSpecificRowCount: 229,
  originalTradeSpecificRowCount: 291,

  // These concepts already exist in the shared partner spine.
  moveToSharedOperations: {
    lead_time: 'operations.notice',
    travel: 'operations.where',
    service_area: 'operations.where',
    team_size: 'operations.scale',
    events_per_day: 'operations.scale',
  },

  // Do not ask pricing as a generic question group.
  moveToPriceBook: ['rate_card', 'base_rate', 'tiers', 'addon_rates', 'quantity_tiers', 'surcharges', 'fee_model', 'charge_metric', 'deposit_damage'],

  // Evidence gates are collected in Verification/Risk, not in capability detail.
  moveToVerification: ['fssai', 'vehicle_documents', 'psara', 'documents', 'damage_process'],

  canonicalFields: {
    coverage_duration_options: ['durations'],
    duration_options: ['durations'],
    setup_soundcheck_duration: ['setup_time', 'setup'],
    service_area: ['travel', 'service_area'],
    pricing_model: ['how_you_charge', 'charge_metric', 'fee_model'],
    rigging_capability: ['rigging'],
    personalization_options: ['personalization'],
    minimum_order: ['minimum_order'],
    loading_support: ['loading_support'],
    vehicle_compliance: ['documents', 'vehicle_documents'],
    fleet_assets: ['vehicle_inventory'],
    operator_included: ['operator'],
  },

  conditionalFields: {
    drone: { condition: 'offering.capabilityTags includes drone' },
    rigging: { condition: 'offering.capabilityTags includes rigging' },
    led_specs: { condition: 'offering.capabilityTags includes led_wall' },
    projector: { condition: 'offering.capabilityTags includes projector' },
    power_draw: { condition: 'offering.requiresPowerEngineering' },
    load_assessment: { condition: 'offering.requiresLoadAssessment' },
    site_visit: { condition: 'offering.requiresSiteSurvey' },
    customization: { condition: 'offering.supportsCustomization' },
    complexity: { condition: 'offering.supportsComplexDesign' },
    licence: { condition: 'offering.includesAlcohol' },
    specialist_capability: { condition: 'offering.isSpecialistGuestService' },
  },

  screens: {
    offering: 'Trade + Offering',
    detail: 'Capability & Match Profile',
    operations: 'Operations & Availability',
    resources: 'Resources & Inventory',
    price: 'Price Book',
    verification: 'Verification & Evidence',
    review: 'Review & Publish',
  },

  // Compatibility rules for customer matching.
  tradeBoundaries: {
    E12: { scope: ['event_car', 'chauffeur', 'guest_transfer'], excludes: ['goods_movement', 'group_shuttle'] },
    L01: { scope: ['small_goods_movement'], excludes: ['passenger_transport'] },
    L02: { scope: ['heavy_goods_movement', 'bulk_event_cargo'], excludes: ['passenger_transport'] },
    L03: { scope: ['bus', 'tempo_traveller', 'van', 'group_shuttle', 'multi_stop_guest_transport'], excludes: ['single_wedding_car'] },
    L04: { excludes: ['tent_furniture', 'lighting', 'sound_av', 'power_cooling', 'safety_facilities'] },
    L07: { scope: ['bulk_event_materials', 'consumables', 'raw_materials'], excludes: ['finished_gifts', 'invitations', 'food'] },
    L08: { scope: ['orchestration', 'multi_vendor_logistics'], fallbackMatch: false },
  },
};

// Runtime field aliases found in the legacy React questionnaire. These map
// the old source vocabulary onto the v1.2 screen contract without requiring
// a destructive data migration.
const RUNTIME_SHARED_OPERATION_IDS = new Set([
  'lead_time', 'notice', 'travel', 'service_area', 'team_size', 'events_per_day',
]);
const RUNTIME_PRICE_BOOK_IDS = new Set([
  'rate_card', 'base_rate', 'tiers', 'addons', 'addon_rates', 'quantity_tiers',
  'surcharges', 'fee_model', 'charge_metric', 'deposit_damage',
]);
const RUNTIME_VERIFICATION_IDS = new Set([
  'fssai', 'vehicle_documents', 'psara', 'documents', 'damage_process',
]);

const CANONICAL_BY_ID = new Map([
  ['durations', 'coverage_duration_options'],
  ['setup_time', 'setup_soundcheck_duration'],
  ['rigging', 'rigging_capability'],
  ['operator', 'operator_included'],
  ['personalization', 'personalization_options'],
  ['minimum_order', 'minimum_order'],
  ['vehicle_inventory', 'fleet_assets'],
  ['loading_support', 'loading_support'],
  ['travel', 'service_area'],
  ['service_area', 'service_area'],
]);

const CROSS_OFFERING_DEDUP = new Set([
  'coverage_duration_options',
  'duration_options',
  'setup_soundcheck_duration',
  'rigging_capability',
  'operator_included',
  'personalization_options',
  'minimum_order',
  'fleet_assets',
  'loading_support',
]);

function baseFieldId(groupId) {
  const id = String(groupId ?? '');
  const colon = id.lastIndexOf(':');
  return colon >= 0 ? id.slice(colon + 1) : id;
}

export function canonicalPartnerFieldId(group) {
  const base = baseFieldId(group?.id);
  return CANONICAL_BY_ID.get(base) ?? base;
}

/**
 * Apply v1.2 reconciliation at runtime.
 *
 * This is intentionally additive. Saved legacy answers are not deleted.
 * The flow simply stops showing a question when its authoritative answer
 * now belongs to shared Operations, Price Book or Verification. It also
 * collapses cross-offering duplicate capability questions while retaining
 * each offering's unique questions.
 */
export function reconcilePartnerQuestionGroups(groups = []) {
  const out = [];
  const seen = new Map();

  for (const group of groups) {
    const base = baseFieldId(group?.id);

    if (
      RUNTIME_SHARED_OPERATION_IDS.has(base) ||
      RUNTIME_PRICE_BOOK_IDS.has(base) ||
      RUNTIME_VERIFICATION_IDS.has(base)
    ) {
      continue;
    }

    const canonical = canonicalPartnerFieldId(group);
    const dedupe = group?.forService && CROSS_OFFERING_DEDUP.has(canonical);
    const key = dedupe ? canonical : group.id;

    if (!seen.has(key)) {
      out.push({ ...group, canonicalField: canonical });
      seen.set(key, out.length - 1);
      continue;
    }

    // Merge option sets for a cross-offering canonical field so the single
    // visible question still retains any offering-specific choices.
    const index = seen.get(key);
    const prior = out[index];
    const choices = [...(prior.choices ?? [])];
    const choiceIds = new Set(choices.map(c => c.id));
    for (const choice of group.choices ?? []) {
      if (!choiceIds.has(choice.id)) {
        choices.push(choice);
        choiceIds.add(choice.id);
      }
    }
    out[index] = {
      ...prior,
      choices,
      mergedFrom: [...(prior.mergedFrom ?? []), group.id],
    };
  }

  return out;
}



export function shouldShowPartnerQuestion(group, { detail = {}, picked = [] } = {}) {
  const condition = group?.showWhen
  if (!condition) return true
  const values = value => Array.isArray(value) ? value : (value == null || value === '' ? [] : [value])
  if (condition.type === 'detailIncludes') return values(detail[condition.field]).map(String).includes(String(condition.value))
  if (condition.type === 'pickedIncludes') return values(picked).map(String).includes(String(condition.value))
  if (condition.type === 'detailPresent') return String(detail[condition.field] ?? '').trim() !== ''
  return true
}

export function filterPartnerQuestionGroups(groups = [], context = {}) {
  return groups
    .filter(group => shouldShowPartnerQuestion(group, context))
    .map(group => ({
      ...group,
      choices: (group.choices ?? []).filter(choice => {
        const when = choice?.showWhen
        if (!when) return true
        const values = value => Array.isArray(value) ? value : (value == null || value === '' ? [] : [value])
        if (when.type === 'detailIncludes') return values(context.detail?.[when.field]).map(String).includes(String(when.value))
        if (when.type === 'pickedIncludes') return values(context.picked).map(String).includes(String(when.value))
        return true
      }),
    }))
}
