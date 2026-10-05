import React from 'react'
import './pricing-fetch-stub.js'
import TradePricingStudio from '../../../src/components/vendor/TradePricingStudio'

const CONFIG = {
  trade_id: 'E02',
  name: 'Photography',
  mode: 'PACKAGE',
  templates: [['photo-essential', 'Essential Coverage']],
}

const SERVICE = {
  id: 'test-vendor-service-photo-001',
  trade_id: 'E02',
  category: 'Photography',
  name: 'Photography',
  unit: 'per hour',
  lead_time_days: 1,
}

const VENDOR = {
  id: 'test-vendor-photo-001',
  business_name: 'Sambramo Test Photography',
  city: 'Bengaluru',
}

export default function PhotographyPricingHarness() {
  return (
    <div data-testid="photography-pricing-lab" style={{ width: 412, margin: '0 auto' }}>
      <TradePricingStudio
        vendor={VENDOR}
        service={SERVICE}
        config={CONFIG}
        onBack={() => { window.__PRICING_BACK__ = true }}
        onOpenListings={() => { window.__PRICING_LISTINGS__ = true }}
      />
    </div>
  )
}
