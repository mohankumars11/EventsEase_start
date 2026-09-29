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
