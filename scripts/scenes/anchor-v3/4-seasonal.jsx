import React, { useState } from 'react'
import { Page } from './shell'
import { SeasonalUpdate } from '../../../src/components/vendor/pricing/PricingControlCenter'

export default function Scene() {
  const [v, set] = useState({ hour: '6000', half_day: '18000', full_day: '30000' })
  return (
    <Page bg="#3a3442">
      <div style={{ height: 120 }} />
      <div className="rounded-t-[28px] bg-white px-5 pb-6 pt-3">
        <div className="mx-auto h-1.5 w-11 rounded-full bg-ink/15" />
        <p className="pt-4 text-[17px] font-extrabold text-ink">Update seasonal prices</p>
        <div className="pt-3">
          <SeasonalUpdate window={{ from: '2026-11-01', to: '2027-02-15' }} value={v} onChange={set}
            fields={[
              { id: 'hour', label: 'Per hour (you earn)', current_paise: 500000 },
              { id: 'half_day', label: 'Half-day', current_paise: 1500000 },
              { id: 'full_day', label: 'Full-day', current_paise: 2500000 },
              { id: 'essential', label: 'Essential package', current_paise: 1086960, locked: true },
            ]} />
        </div>
      </div>
    </Page>
  )
}
