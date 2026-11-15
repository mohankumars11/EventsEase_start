/**
 * What a master cannot quote without — per trade, the ONLY answers a
 * requirement must have before it can be sent (migration 203 validates it;
 * scripts/apply-requirement-templates.mjs writes it into the templates).
 *
 * Everything else a customer is offered is a preference: it narrows who is
 * matched, and it travels with the request, but leaving it blank must never
 * stop a booking. 203 first derived "required" as every question a partner
 * had to declare that the customer is also offered — which made photography
 * need "specialties" and "formats", a DJ need five answers, and a makeup
 * artist three, while the plan sheet asks only three questions for most
 * trades and none of those for photography. Requests would have sat
 * "incomplete" forever (found 2026-11-03, before anything depended on it).
 *
 * Two rules keep this honest:
 *   · every key here is asked FIRST on the plan sheet (EventPlan ChooseSheet),
 *     never cut by its "first three questions" limit
 *   · the trades with their own visual sheet — photography, videography,
 *     décor, cake, catering — require nothing here: hours, the experience,
 *     the design picks and the Menu Studio menu ARE their requirement, and
 *     those sheets always capture them.
 */
export const REQUIRED = {
  bridal_makeup_hair: ['who'],               // how many looks, for whom
  mehendi_artist: ['who'],
  priest_rituals: ['ceremonies'],            // which ceremony is the job
  live_entertainment: ['act_types'],         // a magician and a band are different jobs
  dj_music: ['performance_kinds'],
  sound_av: ['groups'],                      // what to bring
  event_lighting: ['service_types'],
  tent_furniture: ['groups'],
  event_equipment_rental: ['equipment_types'],
  guest_services: ['roles'],
  security_services: ['services'],
  valet_parking: ['services'],
  gifts_favours: ['gift_types'],
  invitation_printing: ['products'],
  event_materials_supplier: ['supplies'],
  trousseau_gift_packing: ['types'],
  power_cooling: ['services'],
  warehouse_storage: ['item_types'],
  loading_unloading_crew: ['work'],
  mini_truck_pickup: ['loads'],
  medium_large_goods_vehicle: ['loads'],
  passenger_transport: ['vehicle_services'],
  transportation: ['service_type'],
  end_to_end_event_logistics: ['scope'],
  bar_beverages: ['service_lines'],
  wedding_planning: ['services'],
  // Their own sheets carry the requirement:
  photography: [], videography: [], decoration_floral: [], cake_desserts: [], catering_food: [],
  // Nothing to ask beyond the event itself:
  anchor_mc: [], venue: [], safety_facilities: [],
}

export const requiredFor = tradeId => REQUIRED[tradeId] ?? []
