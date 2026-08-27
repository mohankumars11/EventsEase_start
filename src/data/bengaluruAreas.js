// GENERATED from scripts/data/bengaluru-localities.json — do not edit by hand.
//
// Regenerate:  node scripts/sync-areas.mjs
//
// The seeder places partners around these same centroids, so the picker
// and the network cannot disagree about where Koramangala is.

export const BENGALURU_AREAS = [
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245, tier: 1, market: 'south-central' },
  { name: 'HSR Layout', lat: 12.9116, lng: 77.6389, tier: 1, market: 'south-central' },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, tier: 1, market: 'south-central' },
  { name: 'Domlur', lat: 12.9608, lng: 77.6387, tier: 1, market: 'south-central' },
  { name: 'Ejipura', lat: 12.942, lng: 77.627, tier: 1, market: 'south-central' },
  { name: 'BTM Layout', lat: 12.9166, lng: 77.6101, tier: 1, market: 'south-central' },
  { name: 'Jayanagar', lat: 12.925, lng: 77.5938, tier: 1, market: 'south' },
  { name: 'JP Nagar', lat: 12.9063, lng: 77.5857, tier: 1, market: 'south' },
  { name: 'Banashankari', lat: 12.925, lng: 77.5667, tier: 1, market: 'south' },
  { name: 'Basavanagudi', lat: 12.9422, lng: 77.5738, tier: 1, market: 'south' },
  { name: 'Bannerghatta Road', lat: 12.89, lng: 77.597, tier: 2, market: 'south' },
  { name: 'Hulimavu', lat: 12.879, lng: 77.6, tier: 2, market: 'south' },
  { name: 'Whitefield', lat: 12.9698, lng: 77.75, tier: 1, market: 'east' },
  { name: 'Hoodi', lat: 12.992, lng: 77.716, tier: 1, market: 'east' },
  { name: 'Marathahalli', lat: 12.9591, lng: 77.6974, tier: 1, market: 'east' },
  { name: 'Kadugodi', lat: 12.995, lng: 77.76, tier: 2, market: 'east' },
  { name: 'KR Puram', lat: 13.007, lng: 77.696, tier: 2, market: 'east' },
  { name: 'Bellandur', lat: 12.926, lng: 77.6762, tier: 2, market: 'east' },
  { name: 'Sarjapur Road', lat: 12.901, lng: 77.6874, tier: 2, market: 'east' },
  { name: 'Malleshwaram', lat: 13.0035, lng: 77.5709, tier: 2, market: 'north' },
  { name: 'Rajajinagar', lat: 12.9916, lng: 77.5526, tier: 2, market: 'north' },
  { name: 'Hebbal', lat: 13.0358, lng: 77.597, tier: 2, market: 'north' },
  { name: 'RT Nagar', lat: 13.0206, lng: 77.5945, tier: 2, market: 'north' },
  { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, tier: 3, market: 'north' },
  { name: 'Jalahalli', lat: 13.045, lng: 77.52, tier: 3, market: 'north' },
  { name: 'Peenya', lat: 13.028, lng: 77.519, tier: 3, market: 'north' },
  { name: 'Devanahalli', lat: 13.249, lng: 77.711, tier: 3, market: 'north' },
  { name: 'Ulsoor', lat: 12.982, lng: 77.627, tier: 2, market: 'central' },
  { name: 'Frazer Town', lat: 13.0002, lng: 77.615, tier: 2, market: 'central' },
  { name: 'Kammanahalli', lat: 13.0159, lng: 77.6408, tier: 2, market: 'central' },
  { name: 'Banaswadi', lat: 13.014, lng: 77.651, tier: 2, market: 'central' },
  { name: 'CV Raman Nagar', lat: 12.985, lng: 77.665, tier: 2, market: 'central' },
  { name: 'Vijayanagar', lat: 12.9719, lng: 77.53, tier: 2, market: 'west' },
  { name: 'Nagarbhavi', lat: 12.96, lng: 77.51, tier: 3, market: 'west' },
  { name: 'Kengeri', lat: 12.9082, lng: 77.4855, tier: 3, market: 'west' },
  { name: 'Uttarahalli', lat: 12.908, lng: 77.546, tier: 3, market: 'west' },
  { name: 'Kanakapura Road', lat: 12.89, lng: 77.55, tier: 3, market: 'west' },
  { name: 'Bommanahalli', lat: 12.901, lng: 77.62, tier: 2, market: 'south-east' },
  { name: 'Begur', lat: 12.865, lng: 77.625, tier: 3, market: 'south-east' },
  { name: 'Electronic City', lat: 12.8452, lng: 77.6602, tier: 3, market: 'south-east' },
  { name: 'Anekal', lat: 12.711, lng: 77.696, tier: 3, market: 'south-east' },
]

export const AREA_BY_NAME = Object.fromEntries(BENGALURU_AREAS.map(a => [a.name, a]))

/** Areas we can serve well today. Tier 3 is reachable but thin. */
export const CORE_AREAS = BENGALURU_AREAS.filter(a => a.tier <= 2)
