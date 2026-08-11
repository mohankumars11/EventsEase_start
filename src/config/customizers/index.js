// One entry point for "what can be changed about this product".
//
// The sheet component asks this and nothing else. Which means adding a
// category is adding a builder and a line in the table below — not touching
// the sheet, the cart, the order write, or the storefront.

import { buildCakeOptionGroups } from '../cakeCustomizer'
import { buildPartyOptionGroups } from './party'
import { buildPoojaOptionGroups } from './pooja'
import { buildGiftOptionGroups } from './gifts'

export {
  defaultSelections, computeOrder, selectionSignature, describeSelections, summaryLines,
} from './engine'

/**
 * Category → option-group builder.
 *
 * 'Hampers' points at the same builder as 'Gifts' deliberately. The two
 * categories are merged (migration 031), but migrations here are applied by
 * hand, so until someone runs it there are live rows still tagged 'Hampers' —
 * and a hamper that opens a sheet with no options because its category string
 * hadn't been rewritten yet would be a self-inflicted outage. It costs one
 * line to make the merge safe in both directions.
 */
const BUILDERS = {
  'Cakes':              buildCakeOptionGroups,
  'Party Essentials':   buildPartyOptionGroups,
  'Pooja & Essentials': buildPoojaOptionGroups,
  'Gifts':              buildGiftOptionGroups,
  'Hampers':            buildGiftOptionGroups,
}

export function isCustomizable(category) {
  return Boolean(BUILDERS[category])
}

export function buildOptionGroups(product) {
  const builder = BUILDERS[product?.category]
  return builder ? builder(product) : []
}
