/**
 * Sambramo canonical trade boundaries V2.
 * Legacy internal trade names/IDs remain valid for persisted data.
 */
export const SAMBRAMO_TRADE_REGISTRY_V2 = {
  E01:{pillar:'Events',internalName:'Catering & Food',customerLabel:'Catering & Food',boundary:'Food service, catering packages, live counters and bulk meals; not bar/alcohol service.'},
  E02:{pillar:'Events',internalName:'Photography',customerLabel:'Photography',boundary:'Still photography coverage, albums, prints and photo booth; drone is conditional.'},
  E03:{pillar:'Events',internalName:'Videography',customerLabel:'Videography',boundary:'Video production, editing and livestream; drone is conditional.'},
  E04:{pillar:'Events',internalName:'Decoration & Floral',customerLabel:'Decoration & Floral',boundary:'Decor design/install, floral, stage/mandap and ambience; not furniture-only rental.'},
  E05:{pillar:'Events',internalName:'Venue',customerLabel:'Venue',boundary:'Physical event premises, capacity, facilities, house rules and slots.'},
  E06:{pillar:'Events',internalName:'DJ & Music',customerLabel:'DJ & Music',boundary:'DJ/music performance and DJ-specific rig; not general AV production.'},
  E07:{pillar:'Events',internalName:'Live Entertainment',customerLabel:'Live Entertainment',boundary:'Performers, cultural acts, bands, dance and entertainment.'},
  E08:{pillar:'Events',internalName:'Bridal Makeup & Hair',customerLabel:'Bridal Makeup & Hair',boundary:'Bridal/groom/family grooming, hair, draping and trials.'},
  E09:{pillar:'Events',internalName:'Wedding Planning',customerLabel:'Wedding Planning',boundary:'Planning, coordination, vendor management and on-day execution; not physical freight/logistics.'},
  E10:{pillar:'Events',internalName:'Tent & Furniture',customerLabel:'Tent & Furniture',boundary:'Tents, pandals, stages, seating and furniture rental/install.'},
  E11:{pillar:'Events',internalName:'Invitation & Printing',customerLabel:'Invitation & Printing',boundary:'Printed/digital invitations, stationery, artwork and assembly.'},
  E12:{pillar:'Events',internalName:'Transportation',customerLabel:'Event Cars & Guest Transfers',boundary:'Compatibility trade narrowed to event cars, chauffeur and point-to-point guest transfers; goods movement belongs to L01/L02 and group passenger transport belongs to L03.'},
  E13:{pillar:'Events',internalName:'Event Lighting',customerLabel:'Event Lighting',boundary:'Decorative/architectural/stage lighting; AV/video/LED belongs to E17.'},
  E14:{pillar:'Events',internalName:'Cake & Desserts',customerLabel:'Cake & Desserts',boundary:'Cakes, desserts and dessert tables; delivery/setup only where offered.'},
  E15:{pillar:'Events',internalName:'Mehendi Artist',customerLabel:'Mehendi Artist',boundary:'Bridal/guest mehendi services and deployable artist teams.'},
  E16:{pillar:'Events',internalName:'Anchor & MC',customerLabel:'Anchor & MC',boundary:'Event hosting/emcee, language, script and rehearsal capability.'},
  E17:{pillar:'Events',internalName:'Sound & AV',customerLabel:'Sound & AV',boundary:'Audio, projection, LED/video and technical AV production; decorative lighting belongs to E13.'},
  E18:{pillar:'Events',internalName:'Valet Parking',customerLabel:'Valet Parking',boundary:'Managed parking/valet operation, attendants and key/damage process.'},
  E19:{pillar:'Events',internalName:'Security Services',customerLabel:'Security Services',boundary:'Security staffing, access control and crowd protection; not valet or guest registration.'},
  E20:{pillar:'Events',internalName:'Bar & Beverages',customerLabel:'Bar & Beverages',boundary:'Beverage/mocktail/bar service; alcohol capability is conditional on compliance.'},
  E21:{pillar:'Events',internalName:'Guest Services',customerLabel:'Guest Services',boundary:'Ushers, registration, cloakroom/helpdesk and guest-support staffing.'},
  E22:{pillar:'Events',internalName:'Power & Cooling',customerLabel:'Power & Cooling',boundary:'Generators, distribution, cooling/heating and operators.'},
  E23:{pillar:'Events',internalName:'Safety & Facilities',customerLabel:'Safety & Facilities',boundary:'Toilets, first aid, barriers, waste and safety/facility equipment.'},
  E24:{pillar:'Events',internalName:'Priest & Rituals',customerLabel:'Priest & Rituals',boundary:'Ritual/ceremony delivery, traditions, languages and samagri responsibility.'},
  E25:{pillar:'Events',internalName:'Gifts & Favours',customerLabel:'Gifts & Favours',boundary:'Finished gift/hamper/return-gift SKUs; not bulk event materials or packing labour.'},
  E26:{pillar:'Events',internalName:'Trousseau & Gift Packing',customerLabel:'Trousseau & Gift Packing',boundary:'Packing/tray/tags/ribbon and packing labour; does not sell the gift itself.'},
  L01:{pillar:'Logistics',internalName:'Mini Truck / Pickup',customerLabel:'Mini Truck / Pickup',boundary:'Small goods movement with structured payload/route; no passenger service.'},
  L02:{pillar:'Logistics',internalName:'Medium / Large Goods Vehicle',customerLabel:'Medium / Large Goods Vehicle',boundary:'Heavy/bulk event cargo with payload, dimensions, access and special handling.'},
  L03:{pillar:'Logistics',internalName:'Passenger Transport',customerLabel:'Group Passenger Transport',boundary:'Bus/tempo traveller/group shuttle/fleet passenger movement, especially scheduled or multi-stop.'},
  L04:{pillar:'Logistics',internalName:'Event Equipment Rental',customerLabel:'Event Operations Equipment Rental',boundary:'General reusable event-operations equipment only; exclude tent/furniture, AV, lighting, power/cooling and safety-specialist assets.'},
  L05:{pillar:'Logistics',internalName:'Loading & Unloading Crew',customerLabel:'Loading & Unloading Crew',boundary:'Material-handling labour by role/shift/crew.'},
  L06:{pillar:'Logistics',internalName:'Warehouse / Storage',customerLabel:'Warehouse / Storage',boundary:'Temporary event storage, capacity, handling and access.'},
  L07:{pillar:'Logistics',internalName:'Event Materials Supplier',customerLabel:'Bulk Event Materials',boundary:'Bulk event consumables/raw materials/SKUs; exclude finished gifts, invitations, food and trade-specific equipment.'},
  L08:{pillar:'Logistics',internalName:'End-to-End Event Logistics',customerLabel:'End-to-End Event Logistics',boundary:'Project-level logistics orchestration; must not become a fallback match for every logistics request.'},
};

export const SAMBRAMO_TRADE_ID_ALIASES = {
  'Transportation':'E12',
  'Passenger Transport':'L03',
  'Mini Truck / Pickup':'L01',
  'Medium / Large Goods Vehicle':'L02',
  'Event Equipment Rental':'L04',
  'Event Materials Supplier':'L07',
  'End-to-End Event Logistics':'L08',
};

export const SAMBRAMO_TRADE_DISPLAY = Object.fromEntries(
  Object.entries(SAMBRAMO_TRADE_REGISTRY_V2).map(([id, x]) => [x.internalName, x.customerLabel])
);

export function tradeDefinition(tradeOrId){
  if (SAMBRAMO_TRADE_REGISTRY_V2[tradeOrId]) return SAMBRAMO_TRADE_REGISTRY_V2[tradeOrId];
  const id = SAMBRAMO_TRADE_ID_ALIASES[tradeOrId];
  return id ? SAMBRAMO_TRADE_REGISTRY_V2[id] : null;
}
