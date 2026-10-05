import React from 'react'
import './pricing-fetch-stub.js'

/* Load TradePricingStudio only after the fetch stub has evaluated. This
   guarantees supabase-js captures the deterministic harness fetch rather
   than its original browser fetch. */
const TradePricingStudio = React.lazy(() => import('../../../src/components/vendor/TradePricingStudio'))

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
  id: null,
  business_name: 'Sambramo Test Photography',
  city: 'Bengaluru',
}

export default function PhotographyPricingHarness() {
  return (
    <div data-testid="photography-pricing-lab" style={{ width: 412, margin: '0 auto' }}>
      <React.Suspense fallback={<div style={{ padding: 24 }}>Loading Photography pricing…</div>}>
        <TradePricingStudio
          vendor={VENDOR}
          service={SERVICE}
          config={CONFIG}
          onBack={() => { window.__PRICING_BACK__ = true }}
          onOpenListings={() => { window.__PRICING_LISTINGS__ = true }}
        />
      </React.Suspense>
    </div>
  )
}
