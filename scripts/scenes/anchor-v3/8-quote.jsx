import React from 'react'
import { Page } from './shell'
import QuoteEditor from '../../../src/components/vendor/quote/QuoteEditor'

export default function Scene() {
  return (
    <Page>
      <div className="px-4 pb-6 pt-5">
        <p className="mb-3 text-[20px] font-extrabold text-plum-950">Quote request</p>
        <QuoteEditor now={Date.parse('2026-10-09T10:00:00Z')} expiresAt="2026-10-09T13:42:10Z" advancePct={30}
          request={{ title: 'Destination wedding · 2 days', dates: '12–13 Dec 2026', venue: 'Goa', guests: '350', languages: 'English, Hindi', reason: 'Multi-day event outside your travel area' }}
          lines={[
            { id: 'd1', description: 'Day 1 hosting · full day', qty: 1, unit: 'day', unit_paise: 2500000, auto: true },
            { id: 'd2', description: 'Day 2 hosting · full day', qty: 1, unit: 'day', unit_paise: 2500000, auto: true },
            { id: 'fn', description: 'Extra functions', qty: 2, unit: 'function', unit_paise: 600000, auto: true },
            { id: 'tr', description: 'Travel Bengaluru – Goa', qty: 1, unit: 'trip', unit_paise: 0, needs: true },
          ]} />
      </div>
    </Page>
  )
}
