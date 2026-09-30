/**
 * The partner Pricing tab, mounted from src/ with no login.
 *
 *   node scripts/shoot-components.mjs shots/pricing.png \
 *     --scenes scripts/scenes/pricing-studio.jsx --width 430 --wait 2500
 *
 * supabase.from is replaced before mount so the saved-rates query
 * answers from ROWS instead of the stub URL.
 */
import React from 'react'
import { supabase } from '../../src/lib/supabase'
import ErrorBoundary from '../../src/components/layout/ErrorBoundary'
import SambramoPricingStudio from '../../src/components/vendor/SambramoPricingStudio'

const ROWS = [
  { id: 'r1', trade_id: 'E02', unit: 'per hour', rate_paise: 450000, minimum_quantity: 4, included_quantity: 0, status: 'active', version: 2, updated_at: '2026-09-29T10:00:00Z' },
  { id: 'r2', trade_id: 'E01', unit: 'per plate', rate_paise: 42000, minimum_quantity: 100, included_quantity: 0, status: 'active', version: 1, updated_at: '2026-09-28T10:00:00Z' },
]

const chain = result => {
  const q = { select: () => q, eq: () => q, order: () => Promise.resolve(result) }
  return q
}
supabase.from = () => chain({ data: ROWS, error: null })

export default function PricingScene() {
  return (
    <div style={{ width: 430, margin: '0 auto', background: '#f6f5f7', padding: 16 }}>
      <div data-mounted-marker>
        <ErrorBoundary>
          <SambramoPricingStudio
            vendor={{ id: '00000000-0000-4000-8000-000000000034', business_name: 'Preview Studio' }}
            services={[{ id: 's1', category: 'Photography' }]}
            onOpenListings={() => {}}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
