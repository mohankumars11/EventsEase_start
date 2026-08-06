import { BRAND } from '../config/sambramo'

// Geocoding/free-text input spells these differently than our pilot list —
// normalize before comparing so "Bangalore" and "Mysuru" still match.
const CITY_ALIASES = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  mysuru:    'Mysore',
  mysore:    'Mysore',
}

export function normalizeCity(name) {
  const key = name?.trim().toLowerCase()
  return CITY_ALIASES[key] ?? name?.trim() ?? ''
}

export function isPilotCity(name) {
  if (!name) return false
  return BRAND.pilotCities.includes(normalizeCity(name))
}
