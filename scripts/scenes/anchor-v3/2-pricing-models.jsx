import React, { useState } from 'react'
import { Shell } from './shell'
import PricingModelsStage from '../../../src/components/vendor/anchor/stages/PricingModelsStage'
export default function Scene() {
  const [v, set] = useState({ models: ['hour', 'half_day', 'full_day'], hour: { rate: '5000', min_hours: 2, max_hours: 8, overtime: '6000', ot_step: 60, grace: 15 }, half_day: { rate: '15000', hours: 4, functions: 2 }, full_day: { rate: '25000', hours: 8, breaks: true } })
  return <Shell stage="pricing"><PricingModelsStage value={v} set={set} /></Shell>
}
