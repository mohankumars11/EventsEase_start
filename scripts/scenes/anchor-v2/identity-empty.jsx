import React from 'react'
import { Step } from './fixtures'
export default function Scene() {
  return <Step step="identity" answers={{ identity: {}, skills: {}, pricing: { vip_multiplier: 4 }, addons: { on: {} }, overrides: {}, rules: { custom_quotes: true }, publish: { instant: true } }} />
}
