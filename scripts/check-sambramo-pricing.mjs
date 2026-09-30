import { SAMBRAMO_PRICING_POLICY, SAMBRAMO_TRADE_COUNT, PRICING_STATES, PRICING_MODES, classifyPricingRequest } from '../src/data/sambramoPricingPolicy.js'

const ids = Object.keys(SAMBRAMO_PRICING_POLICY)
const expected = ['E01','E02','E03','E04','E05','E06','E07','E08','E09','E10','E11','E12','E13','E14','E15','E16','E17','E18','E19','E20','E21','E22','E23','E24','E25','E26','L01','L02','L03','L04','L05','L06','L07','L08']
if (SAMBRAMO_TRADE_COUNT !== 34 || ids.length !== 34) throw new Error('Expected exactly 34 pricing trades')
if (ids.join(',') !== expected.join(',')) throw new Error('Canonical 34-trade order drifted')
for (const id of ids) {
  const p = SAMBRAMO_PRICING_POLICY[id]
  if (!p.customQuote || !p.tradeName || !p.determinants.length || !p.customTriggers.length) throw new Error(id + ' is missing policy fields')
  const instant = classifyPricingRequest({ tradeId: id, deterministic: true, requiredInputsComplete: true, availabilityConfirmed: true })
  const custom = classifyPricingRequest({ tradeId: id, customRequested: true, provisionalPossible: false })
  if (!p.customFirst && instant.state !== PRICING_STATES.INSTANT_BOOK) throw new Error(id + ' standard lane is not instant')
  if (custom.state !== PRICING_STATES.VENDOR_QUOTE) throw new Error(id + ' custom lane is not vendor quote')
  if (!custom.mode || custom.mode !== PRICING_MODES.VENDOR_ASSISTED) throw new Error(id + ' custom mode is wrong')
}
const quoteFirst = ids.filter(id => SAMBRAMO_PRICING_POLICY[id].customFirst)
if (quoteFirst.join(',') !== 'E09,E20,L08') throw new Error('Custom-first trades drifted: ' + quoteFirst.join(','))
console.log('Sambramo pricing policy check: PASS — 34/34 trades and both lanes verified.')
