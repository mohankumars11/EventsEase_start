import React from 'react'
import TradePricingStudio from '../../../src/components/vendor/TradePricingStudio'

window.__PRICING_RPC__ = []

const realFetch = window.fetch.bind(window)
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  if (!url.startsWith('http://127.0.0.1:9/stub')) return realFetch(input, init)

  const u = new URL(url)
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

  if (u.pathname.endsWith('/sambramo_trade_packages')) return json([])
  if (u.pathname.endsWith('/sambramo_partner_price_books')) return json([])
  if (u.pathname.endsWith('/sambramo_trade_package_addons')) return json([])

  if (u.pathname.endsWith('/rpc/save_sambramo_trade_package')) {
    const body = JSON.parse(init.body || '{}')
    window.__PRICING_RPC__.push({ name: 'save_sambramo_trade_package', args: body })
    return json({ ok: true, package_id: 'test-package-photo-001', status: 'UNDER_REVIEW' })
  }

  if (u.pathname.endsWith('/rpc/create_sambramo_trade_package_revision')) {
    const body = JSON.parse(init.body || '{}')
    window.__PRICING_RPC__.push({ name: 'create_sambramo_trade_package_revision', args: body })
    return json({ ok: true, package_id: 'test-package-photo-revision-001', status: 'UNDER_REVIEW' })
  }

  return json({ message: 'No pricing stub for ' + u.pathname }, 404)
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
