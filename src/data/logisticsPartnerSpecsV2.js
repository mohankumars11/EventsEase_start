/**
 * V2 logistics capability questions.
 *
 * Operations owns notice, service area, working windows and capacity.
 * This file owns what the partner can supply for the selected offering.
 */
const one = (id, question, choices, extra = {}) => ({ id, question, type: 'one', choices, ...extra })
const many = (id, question, choices, extra = {}) => ({ id, question, type: 'multi', choices, ...extra })
const c = (id, label, scan) => scan ? { id, label, scan } : { id, label }

export const LOGISTICS_SERVICE_SPECS = {
  mini_truck: [
    one('vehicle_class', 'Which small vehicles do you operate?', [
      c('tata_ace', 'Tata Ace / mini truck'), c('bolero_pickup', 'Bolero / pickup'),
      c('closed_mini', 'Closed-body mini truck'), c('other', 'Other small goods vehicle'),
    ]),
    one('payload', 'Maximum payload you accept', [
      c('500', 'Up to 500 kg'), c('750', 'Up to 750 kg'), c('1500', 'Up to 1.5 tonnes'),
    ], { exact: { label: 'Or exact', unit: 'kg', max: 5000 } }),
    many('cargo_types', 'What event cargo do you carry?', [
      c('decor', 'Décor and floral'), c('food', 'Packed food and catering equipment'),
      c('av', 'AV and event equipment'), c('furniture', 'Chairs, tables and furniture'),
      c('materials', 'Bulk event materials'),
    ]),
  ],

  goods_vehicle: [
    one('vehicle_class', 'Which goods vehicles do you operate?', [
      c('14ft', '14 ft'), c('17ft', '17 ft'), c('19ft', '19–20 ft'),
      c('container', 'Closed container'), c('other', 'Other medium/large vehicle'),
    ]),
    one('payload', 'Maximum payload you accept', [
      c('2000', 'Up to 2 tonnes'), c('4000', 'Up to 4 tonnes'),
      c('7000', 'Up to 7 tonnes'), c('10000', '10 tonnes or more'),
    ], { exact: { label: 'Or exact', unit: 'kg', max: 30000 } }),
    many('handling', 'What special handling can you support?', [
      c('fragile', 'Fragile / secured cargo'), c('oversize', 'Oversized event structures'),
      c('heavy', 'Heavy equipment'), c('closed', 'Closed-body protection'),
      c('tail_lift', 'Tail lift / loading equipment'),
    ]),
  ],

  passenger_transport: [
    one('vehicle_class', 'Which passenger vehicles do you provide?', [
      c('tempo', 'Tempo traveller'), c('urbania', 'Force Urbania'),
      c('minibus', 'Mini bus'), c('bus', 'Large bus'), c('fleet', 'Mixed fleet'),
    ]),
    one('seats', 'Largest vehicle you can provide', [
      c('9', 'Up to 9 seats'), c('17', 'Up to 17 seats'),
      c('26', 'Up to 26 seats'), c('33', 'Up to 33 seats'), c('45', '45+ seats'),
    ], { exact: { label: 'Or exact', unit: 'seats', max: 100 } }),
    many('amenities', 'What can the passenger vehicle provide?', [
      c('ac', 'Air conditioning'), c('luggage', 'Dedicated luggage space'),
      c('charging', 'Charging points'), c('first_aid', 'First-aid kit'), c('gps', 'GPS tracking'),
    ]),
  ],

  event_equipment: [
    many('asset_types', 'What general event equipment do you rent?', [
      c('barriers', 'Crowd barriers'), c('queue', 'Queue stanchions'),
      c('tables', 'Utility tables'), c('trolleys', 'Transport trolleys'),
      c('racks', 'Display / storage racks'), c('other', 'Other reusable event equipment'),
    ]),
    one('condition', 'How do you maintain rental equipment?', [
      c('checked', 'Checked before every dispatch'),
      c('scheduled', 'Scheduled maintenance'), c('both', 'Both'),
    ]),
    one('setup', 'Do you deliver and set up?', [
      c('delivery', 'Delivery only'), c('setup', 'Delivery + setup'),
      c('pickup', 'Customer pickup'), c('all', 'Delivery + setup + pickup'),
    ]),
  ],

  loading_crew: [
    many('roles', 'What handling work can your crew do?', [
      c('loading', 'Loading'), c('unloading', 'Unloading'),
      c('movement', 'Internal movement'), c('setup', 'Event setup / strike'),
      c('packing', 'Packing / consolidation'),
    ]),
    one('crew_size', 'Largest crew you can deploy for one shift', [
      c('2', '2 people'), c('5', '3–5 people'), c('10', '6–10 people'),
      c('20', '11–20 people'), c('more', 'More than 20'),
    ], { exact: { label: 'Or exact', unit: 'people', max: 200 } }),
    many('tools', 'What handling tools can you provide?', [
      c('trolley', 'Trolleys'), c('dolly', 'Platform dolly'),
      c('straps', 'Straps / securing gear'), c('forklift', 'Forklift'),
      c('none', 'Manpower only'),
    ], { showWhen: { type: 'detailPresent', field: 'roles' } }),
  ],

  warehouse_storage: [
    one('storage_type', 'What storage can you provide?', [
      c('warehouse', 'General warehouse'), c('self_storage', 'Lockable storage unit'),
      c('covered', 'Covered event-material storage'), c('yard', 'Secured yard / open storage'),
    ]),
    one('capacity', 'Maximum storage capacity available to an event client', [
      c('100', 'Up to 100 sq ft'), c('500', 'Up to 500 sq ft'),
      c('2000', 'Up to 2,000 sq ft'), c('5000', 'Up to 5,000 sq ft'),
      c('more', 'More than 5,000 sq ft'),
    ], { exact: { label: 'Or exact', unit: 'sq ft', max: 1000000 } }),
    many('conditions', 'What storage conditions can you support?', [
      c('dry', 'Dry / weather protected'), c('cctv', 'CCTV monitored'),
      c('restricted', 'Restricted access'), c('temperature', 'Temperature controlled'),
    ], { showWhen: { type: 'detailPresent', field: 'storage_type' } }),
  ],

  event_materials: [
    many('material_types', 'What event materials do you supply?', [
      c('packing', 'Packing materials'), c('print_raw', 'Paper / print inputs'),
      c('floral_raw', 'Floral / decoration inputs'), c('fabric', 'Textile / soft goods'),
      c('consumables', 'Event consumables'), c('hardware', 'Fixtures / hardware'),
    ]),
    many('stock', 'How is stock fulfilled?', [
      c('own_stock', 'Own stock'), c('warehouse', 'Warehouse stock'),
      c('supplier_network', 'Supplier network'), c('custom_source', 'Custom sourcing'),
    ]),
    one('custom', 'Can you source or produce custom quantities?', [
      c('catalogue', 'Catalogue quantities only'),
      c('bulk', 'Bulk custom quantities'), c('bespoke', 'Bespoke sourcing / production'),
    ], { showWhen: { type: 'detailIncludes', field: 'stock', value: 'custom_source' } }),
  ],

  event_logistics: [
    many('project_scope', 'What parts of event logistics can you coordinate?', [
      c('pickup', 'Vendor pickups'), c('consolidation', 'Consolidation'),
      c('storage', 'Temporary storage'), c('delivery', 'Venue delivery'),
      c('setup', 'Setup / placement'), c('strike', 'Strike / reverse pickup'),
      c('crew', 'Loading crew'),
    ]),
    one('network', 'Which resources do you own versus coordinate?', [
      c('own', 'Own vehicles / crew / storage'),
      c('mixed', 'Own + partner network'),
      c('coordination', 'Partner network coordinated by us'),
    ]),
    one('project_scale', 'Largest event logistics project you manage', [
      c('single', 'Single venue'), c('multi', 'Multiple vendors, one venue'),
      c('multi_site', 'Multiple sites'), c('complex', 'Large / complex event project'),
    ]),
  ],
};

export const LOGISTICS_TRADES = new Set([
  'Mini Truck / Pickup',
  'Medium / Large Goods Vehicle',
  'Passenger Transport',
  'Event Equipment Rental',
  'Loading & Unloading Crew',
  'Warehouse / Storage',
  'Event Materials Supplier',
  'End-to-End Event Logistics',
]);

export function logisticsSpecsForServices(serviceIds = []) {
  const out = [];
  const seen = new Set();
  for (const serviceId of serviceIds) {
    for (const group of LOGISTICS_SERVICE_SPECS[serviceId] ?? []) {
      if (seen.has(group.id)) continue;
      seen.add(group.id);
      out.push({ ...group, id: serviceId + ':' + group.id, forService: serviceId });
    }
  }
  return out;
}
