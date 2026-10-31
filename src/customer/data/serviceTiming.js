/**
 * When each service happens, and what a bundled one includes — in the
 * customer's words (Mohan, 2026-10-31: "make him informed what all the
 * things are here … at what time that service will be accomplished").
 *
 *   PHASE_TEXT[phaseKey]   the plan screen's group heading, plain English
 *   WHEN[tradeId]          one short line: when it happens at the event
 *   INCLUDES[tradeId]      for services that bundle several jobs
 */
export const PHASE_TEXT = {
  discover: ['Getting started', 'Weeks before'],
  plan: ['Planning it together', 'Weeks before'],
  book: ['The big bookings', 'Book these first'],
  coordinate: ['Inviting your guests', '1 to 3 weeks before'],
  logistics: ['Getting everything there', 'The day before and on the day'],
  setup: ['Setting up the place', 'Hours before guests arrive'],
  arrival: ['When guests arrive', 'As the party starts'],
  programme: ['The celebration itself', 'During the party'],
  hospitality: ['Food and drinks', 'During the party'],
  departure: ['Seeing guests off', 'As it ends'],
  teardown: ['Clean-up', 'After the party'],
  post: ['After the event', 'The days after'],
}

export const WHEN = {
  catering_food: 'On the day · cooked fresh, served at mealtime',
  cake_desserts: 'On the day · delivered before the cake-cutting',
  bar_beverages: 'During the party · counters open with the guests',
  venue: 'Book first · it decides your date and guest count',
  decoration_floral: 'Set up 2 to 4 hours before guests arrive',
  tent_furniture: 'Put up the day before or that morning',
  event_lighting: 'Set up before dusk · on through the evening',
  photography: 'From the first guest to the last photo',
  videography: 'Films the whole event · your film comes after',
  dj_music: 'During the party · music from start to finish',
  live_entertainment: 'During the programme · a timed performance',
  anchor_mc: 'Runs the stage through the programme',
  sound_av: 'Set up and tested before the programme',
  bridal_makeup_hair: 'Hours before · ready before the photos',
  mehendi_artist: 'A day or two before, or that morning',
  priest_rituals: 'At the muhurat · performs the rituals',
  trousseau_gift_packing: 'A week before · packed and ready',
  wedding_planning: 'From now until the last guest leaves',
  end_to_end_event_logistics: 'The day before and on the day',
  guest_services: 'As guests arrive · welcome, seating, help',
  passenger_transport: 'Picks guests up before, drops them after',
  valet_parking: 'As guests arrive and as they leave',
  security_services: 'Throughout · at the gate and in the crowd',
  safety_facilities: 'During and after · clean-up, washrooms, first aid',
  gifts_favours: 'Handed out as guests leave',
  invitation_printing: '2 to 3 weeks before · invites go out',
  event_materials_supplier: 'Delivered the day before',
  event_equipment_rental: 'Delivered and set up before the event',
  power_cooling: 'Running from before guests arrive to the end',
  transportation: 'On the day · every vehicle on time',
  mini_truck_pickup: 'The day before or on the day',
  medium_large_goods_vehicle: 'Before set-up · brings the heavy loads',
  loading_unloading_crew: 'At set-up and again at clean-up',
  warehouse_storage: 'Before and after · keeps things safe',
}

export const INCLUDES = {
  end_to_end_event_logistics: ['Trucks and tempos', 'Loading crew', 'Set-up team', 'Storage'],
  wedding_planning: ['Every vendor coordinated', 'Runs the day', 'Budget and timeline'],
  sound_av: ['Speakers and mics', 'LED wall', 'Projector'],
  guest_services: ['Welcome desk', 'Ushers', 'Hostesses'],
  safety_facilities: ['Cleaning crew', 'Washrooms', 'First aid', 'Fire safety'],
  event_equipment_rental: ['Tables and chairs', 'Chafing dishes', 'Stage and podium'],
  transportation: ['Vehicle plan', 'Drivers', 'Timings'],
  power_cooling: ['Silent genset', 'AC and coolers'],
  event_materials_supplier: ['Plates and cutlery', 'Banners', 'Pooja items'],
  tent_furniture: ['Shamiana', 'Chairs and sofas', 'Flooring'],
  bar_beverages: ['Mocktails', 'Coffee', 'Ice cream'],
}
