/**
 * Venue experiences are customer-friendly groupings of the canonical
 * venue_type answers recorded by the venue trade. These are preferences,
 * not separate inventory claims: matching still requires a LIVE listing
 * whose saved answer contains the selected canonical type.
 */
export const VENUE_EXPERIENCES = [
  {
    id: 'gardens_lawns',
    label: 'Gardens & lawns',
    hint: 'Open-air green spaces',
    types: ['lawn_garden'],
  },
  {
    id: 'resorts_hotels',
    label: 'Resorts & hotels',
    hint: 'Stay and celebrate in one place',
    types: ['resort', 'hotel'],
  },
  {
    id: 'farmhouses_villas',
    label: 'Farmhouses & villas',
    hint: 'Private properties and retreats',
    types: ['farmhouse', 'villa'],
  },
  {
    id: 'banquet_halls',
    label: 'Banquet & community halls',
    hint: 'Halls, mantapas and convention spaces',
    types: ['banquet_hall', 'party_hall', 'community_hall', 'temple_hall', 'kalyana_mantapa', 'convention_centre'],
  },
  {
    id: 'heritage_properties',
    label: 'Heritage & palace properties',
    hint: 'Character-filled historic settings',
    types: ['heritage_property_palace'],
  },
  {
    id: 'rooftops_clubhouses',
    label: 'Rooftops & clubhouses',
    hint: 'Terraces and community spaces',
    types: ['rooftop', 'club_house'],
  },
  {
    id: 'beach_properties',
    label: 'Beach properties',
    hint: 'Coastal event properties',
    types: ['beach_property'],
  },
  {
    id: 'auditoriums',
    label: 'Auditoriums & amphitheatres',
    hint: 'Seated shows and performances',
    types: ['auditorium', 'open_air_amphitheatre'],
  },
  {
    id: 'private_dining',
    label: 'Private dining venues',
    hint: 'Restaurant spaces booked for your group',
    types: ['restaurant_private_dining'],
  },
]

export const VENUE_TYPE_IDS = [...new Set(VENUE_EXPERIENCES.flatMap(x => x.types))]

export function toggleVenueExperience(selected = [], experienceId) {
  const experience = VENUE_EXPERIENCES.find(x => x.id === experienceId)
  if (!experience) return [...selected]
  const current = new Set(selected)
  const allSelected = experience.types.every(type => current.has(type))
  for (const type of experience.types) {
    if (allSelected) current.delete(type)
    else current.add(type)
  }
  return [...current]
}

export function experienceSelected(selected = [], experienceId) {
  const experience = VENUE_EXPERIENCES.find(x => x.id === experienceId)
  return !!experience && experience.types.every(type => selected.includes(type))
}
