import React from 'react'
import TradePricingStudio from '../../../src/components/vendor/TradePricingStudio'
import { supabase } from '../../../src/lib/supabase'

const rows = []
window.__PRICING_RPC__ = []

function chain(table) {
  const result = table === 'sambramo_trade_packages'
    ? { data: rows, error: null }
    : { data: [], error: null }
  const self = {
    select() { return self },
    eq() { return self },
    in() { return self },
    order() { return self },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
    catch(reject) { return Promise.resolve(result).catch(reject) },
  }
  return self
}

supabase.from = table => chain(table)
supabase.rpc = async (name, args) => {
  window.__PRICING_RPC__.push({ name, args })
  return {
    data: { ok: true, package_id: 'test-package-photo-001', status: 'UNDER_REVIEW' },
    error: null,
  }
}

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
