#!/usr/bin/env node
/**
 * The 34-trade table for docs/PARTNER_PRODUCTION_TEST.md, from code.
 *
 *   node scripts/gen-partner-trade-table.mjs            print it
 *   node scripts/gen-partner-trade-table.mjs --write    replace it in the doc
 *
 * Read from the registry (sambramoTradeRegistryV2), the database ids
 * (catalogueIds.generated, which is listing_trades), the questionnaire
 * (partnerSpecs for event trades, logisticsPartnerSpecsV2 for L01–L08) and
 * the price book (logisticsPricing), so the document cannot describe a
 * trade the app does not have.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadSrc } from './lib/loadSrc.mjs'

const M = await loadSrc({
  'src/data/sambramoTradeRegistryV2.js': ['SAMBRAMO_TRADE_REGISTRY_V2'],
  'src/data/catalogueIds.generated.js': ['tradeIdFor'],
  'src/data/partnerSpecs.js': ['specsForTrade'],
  'src/data/logisticsPartnerSpecsV2.js': ['LOGISTICS_SERVICE_SPECS'],
  'src/data/logisticsPricing.js': ['LOGISTICS_PRICING', 'LOGISTICS_PRICE_BOOK_VERSION'],
})

const byTradeCode = Object.fromEntries(Object.entries(M.LOGISTICS_PRICING).map(([id, p]) => [p.tradeId, { id, ...p }]))
const pricingModel = p => {
  if (!p) return 'Partner price list (per item/unit), reviewed'
  if (p.id === 'mini_truck') return `Trip: ₹${p.base} incl. ${p.includedKm} km, ₹${p.extraKm}/km after, payload surcharge`
  if (p.id === 'goods_vehicle') return `Trip by vehicle class, ${p.includedKm} km incl., ₹${p.extraKm}/km, payload surcharge`
  if (p.id === 'passenger_transport') return `Package by seats, ${p.includedKm} km incl., ₹${p.extraKm}/km, driver allowance`
  if (p.id === 'event_equipment') return 'Day rate by quantity + delivery, setup, pickup'
  if (p.id === 'loading_crew') return `₹${p.perPersonShift}/person per ${p.includedHours} h shift, overtime`
  if (p.id === 'warehouse_storage') return `₹${p.sqftMonthRate}/sq ft/month + inbound, outbound`
  if (p.id === 'event_materials') return `Minimum order ₹${p.minimumOrder} + delivery, rush %`
  if (p.id === 'event_logistics') return `Project fee from ₹${p.minimumProjectFee} + coordination %`
  return p.serviceName
}

const rows = Object.entries(M.SAMBRAMO_TRADE_REGISTRY_V2).map(([code, t]) => {
  const logistics = byTradeCode[code]
  const questions = logistics ? (M.LOGISTICS_SERVICE_SPECS[logistics.id] ?? []).length : (M.specsForTrade(t.internalName) ?? []).length
  return `| ${code} | ${t.customerLabel}${t.customerLabel !== t.internalName ? ` (app: ${t.internalName})` : ''} | ${M.tradeIdFor(t.internalName) ?? '**missing**'} | ${questions} | ${pricingModel(logistics)} |`
})

const table = [
  `Generated from code by \`scripts/gen-partner-trade-table.mjs\`. Price book ${M.LOGISTICS_PRICE_BOOK_VERSION}; customer logistics prices have a ₹500 floor and round to the nearest ₹50. Question groups are the trade-level ones; each offering adds its own, and Catering asks through its menu and cuisine flow instead (hence 0).`,
  '',
  '| Code | Trade | Database id | Trade-level question groups | Pricing |',
  '|---|---|---|---|---|',
  ...rows,
].join('\n')

if (process.argv.includes('--write')) {
  const f = join(ROOT, 'docs', 'PARTNER_PRODUCTION_TEST.md')
  const doc = readFileSync(f, 'utf8')
  const out = doc.replace(/<!-- trades:start -->[\s\S]*<!-- trades:end -->/, `<!-- trades:start -->\n${table}\n<!-- trades:end -->`)
  writeFileSync(f, out)
  console.log(`wrote ${rows.length} trades into docs/PARTNER_PRODUCTION_TEST.md`)
} else {
  console.log(table)
}
if (rows.length !== 34 || rows.some(r => r.includes('**missing**'))) process.exit(1)
