/**
 * "Often booked together" — the next service worth adding once one is in
 * the cart, for every one of the 34 trades. Each pairing is a real
 * dependency or a natural companion (a photographer's day is usually
 * filmed too; a DJ needs sound), never a random upsell, and the hook says
 * why in a few words. Shown as a suggestion the customer can ignore.
 */
export const PAIRS = {
  photography: [['videography', 'Film the day too'], ['decoration_floral', 'A backdrop worth shooting']],
  videography: [['photography', 'Photos to go with the film'], ['event_lighting', 'Light it for the camera']],
  decoration_floral: [['event_lighting', 'Make the décor glow'], ['photography', 'Capture the décor']],
  event_lighting: [['decoration_floral', 'Décor to light up'], ['sound_av', 'Sound to match the stage']],
  catering_food: [['cake_desserts', 'Finish with dessert'], ['bar_beverages', 'Drinks with the meal']],
  cake_desserts: [['catering_food', 'A meal before the cake'], ['decoration_floral', 'A table to set it on']],
  bar_beverages: [['catering_food', 'Food with the drinks'], ['security_services', 'Safe service at the bar']],
  dj_music: [['sound_av', 'Sound that fills the room'], ['event_lighting', 'Lights for the dance floor']],
  sound_av: [['anchor_mc', 'Someone on the mic'], ['event_lighting', 'Light the stage']],
  anchor_mc: [['sound_av', 'Mics and speakers'], ['live_entertainment', 'Acts to introduce']],
  live_entertainment: [['sound_av', 'Sound for the act'], ['anchor_mc', 'A host to introduce them']],
  bridal_makeup_hair: [['mehendi_artist', 'Mehendi to match'], ['photography', 'Capture the look']],
  mehendi_artist: [['bridal_makeup_hair', 'Makeup to match'], ['dj_music', 'Music for the mehendi']],
  priest_rituals: [['decoration_floral', 'Pooja décor and flowers'], ['catering_food', 'Prasad and the meal']],
  venue: [['decoration_floral', 'Dress up the venue'], ['catering_food', 'Feed your guests']],
  tent_furniture: [['power_cooling', 'Power and fans for the tent'], ['event_lighting', 'Light it at night']],
  power_cooling: [['tent_furniture', 'The shelter it powers'], ['event_lighting', 'Lights on the same power']],
  event_equipment_rental: [['tent_furniture', 'Seating and shelter'], ['loading_unloading_crew', 'Hands to set it up']],
  invitation_printing: [['gifts_favours', 'Return gifts to match'], ['guest_services', 'Welcome them at the door']],
  gifts_favours: [['trousseau_gift_packing', 'Packed beautifully'], ['invitation_printing', 'Invites to match']],
  trousseau_gift_packing: [['gifts_favours', 'Gifts to pack'], ['bridal_makeup_hair', 'Ready for the day']],
  wedding_planning: [['bridal_makeup_hair', 'The bride’s look'], ['decoration_floral', 'The mandap décor']],
  guest_services: [['valet_parking', 'Smooth arrivals'], ['invitation_printing', 'Invites and badges']],
  valet_parking: [['security_services', 'Safe parking and gates'], ['guest_services', 'A welcome at the door']],
  security_services: [['safety_facilities', 'First aid and safety'], ['valet_parking', 'Orderly parking']],
  safety_facilities: [['security_services', 'Security at the gate'], ['loading_unloading_crew', 'Pack-up after']],
  passenger_transport: [['valet_parking', 'Smooth drop-offs'], ['guest_services', 'Someone to receive guests']],
  transportation: [['loading_unloading_crew', 'Crew to load and unload'], ['passenger_transport', 'Move guests too']],
  mini_truck_pickup: [['loading_unloading_crew', 'Hands to load it'], ['warehouse_storage', 'Store it after']],
  medium_large_goods_vehicle: [['loading_unloading_crew', 'Crew for heavy loads'], ['warehouse_storage', 'Store it after']],
  loading_unloading_crew: [['mini_truck_pickup', 'A truck to load'], ['warehouse_storage', 'Somewhere to keep it']],
  warehouse_storage: [['mini_truck_pickup', 'Pickup to the store'], ['loading_unloading_crew', 'Crew to stack it']],
  event_materials_supplier: [['decoration_floral', 'Décor to use it in'], ['mini_truck_pickup', 'Deliver it']],
  end_to_end_event_logistics: [['guest_services', 'Hosts on the day'], ['transportation', 'Every vehicle sorted']],
}

/** The companions for one trade that are not already in `have`. */
export const companions = (tradeId, have = []) => (PAIRS[tradeId] ?? []).filter(([t]) => !have.includes(t))
