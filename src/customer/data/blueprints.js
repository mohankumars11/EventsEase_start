/**
 * Every occasion blueprint, in one map.
 *
 * The engine (lib/occasionPlan.js) asks this file and nothing else, so a
 * new category is one import and one line — no engine change, no screen
 * change. An occasion with no blueprint here falls back to its shared
 * template (lib/blueprint.js), which is how the catalogue's other
 * categories keep working while they are written.
 *
 * Ids come from data/occasions.js and are never invented here: a
 * blueprint for an occasion the catalogue does not have is a typo, and
 * `check-occasion-blueprints.mjs` catches it.
 */
import { LIFE_BLUEPRINTS } from './lifeBlueprints'
import { WEDDING_BLUEPRINTS } from './weddingBlueprints'
import { FESTIVAL_BLUEPRINTS } from './festivalBlueprints'
import { SCHOOL_BLUEPRINTS } from './schoolBlueprints'
import { COLLEGE_BLUEPRINTS } from './collegeBlueprints'
import { CORPORATE_BLUEPRINTS } from './corporateBlueprints'
import { NIGHTLIFE_BLUEPRINTS } from './nightlifeBlueprints'
import { PUBLIC_BLUEPRINTS } from './publicBlueprints'
import { SPORT_BLUEPRINTS } from './sportBlueprints'
import { FOOD_BLUEPRINTS } from './foodBlueprints'
import { RETAIL_BLUEPRINTS } from './retailBlueprints'
import { PROPERTY_BLUEPRINTS } from './propertyBlueprints'
import { COMMUNITY_BLUEPRINTS } from './communityBlueprints'
import { INDUSTRY_BLUEPRINTS } from './industryBlueprints'
import { THEMED_BLUEPRINTS } from './themedBlueprints'
import { OUTDOOR_BLUEPRINTS } from './outdoorBlueprints'
import { ONLINE_BLUEPRINTS } from './onlineBlueprints'
import { SPECIAL_BLUEPRINTS } from './specialBlueprints'

/** Category id (data/occasions.js) → the blueprints written for it. */
export const BY_CATEGORY = {
  life: LIFE_BLUEPRINTS,
  wedding: WEDDING_BLUEPRINTS,
  festivals: FESTIVAL_BLUEPRINTS,
  school: SCHOOL_BLUEPRINTS,
  college: COLLEGE_BLUEPRINTS,
  corporate: CORPORATE_BLUEPRINTS,
  nightlife: NIGHTLIFE_BLUEPRINTS,
  public: PUBLIC_BLUEPRINTS,
  sport: SPORT_BLUEPRINTS,
  food: FOOD_BLUEPRINTS,
  retail: RETAIL_BLUEPRINTS,
  property: PROPERTY_BLUEPRINTS,
  community: COMMUNITY_BLUEPRINTS,
  industry: INDUSTRY_BLUEPRINTS,
  themed: THEMED_BLUEPRINTS,
  outdoor: OUTDOOR_BLUEPRINTS,
  online: ONLINE_BLUEPRINTS,
  special: SPECIAL_BLUEPRINTS,
}

export const BLUEPRINTS = Object.values(BY_CATEGORY).flat()
export const BLUEPRINT = Object.fromEntries(BLUEPRINTS.map(b => [b.id, b]))

/* Two blueprints for one occasion would make the engine's answer depend
   on import order, which is the worst kind of bug to find. */
if (BLUEPRINTS.length !== Object.keys(BLUEPRINT).length) {
  const seen = new Set(), dupes = []
  for (const b of BLUEPRINTS) { if (seen.has(b.id)) dupes.push(b.id); seen.add(b.id) }
  throw new Error(`blueprints: two blueprints for ${dupes.join(', ')}`)
}
