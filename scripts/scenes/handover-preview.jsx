import React from 'react'
import TradeListingCard from '../../src/components/customer/TradeListingCard'

const listing = {
  trade_id: 'decoration_floral',
  state: 'UNDER_REVIEW', is_live: false,
  city: 'Gayathripuram, Mysuru',
  rating: 4.8,
  profile: { business_name: 'Jai Decor & Florals', tagline: 'Mandap, stage and entrance florals' },
  terms: { instant: 'true', min_notice_days: 3, cancellation: 'flexible',
    charges: [{ label: 'Travel beyond 25 km', role: 'travel', customer_paise: 150000 }] },
  packages: [
    { key: 'ESSENTIAL', name: 'Essential', hours: 4, customer_paise: 2500000,
      inclusions: ['Entrance arch', 'Stage backdrop'] },
    { key: 'SIGNATURE', name: 'Signature', hours: 6, customer_paise: 4375000,
      inclusions: ['Entrance arch', 'Stage backdrop', 'Mandap florals', 'Aisle decor'] },
  ],
  rules: [{ kind: 'per_event', label: 'Full decor', unit: 'per_event', customer_paise: 2500000, min_qty: 1 }],
  catalogue: [
    { item_key: 'A', name: 'Marigold garland', unit: 'per_piece', customer_paise: 35000, lead_days: 2 },
    { item_key: 'B', name: 'Rose centrepiece', unit: 'per_item', customer_paise: 90000 },
  ],
  addons: [{ addon_id: 'x', label: 'Fresh flower car decor', unit: 'per_item', customer_paise: 250000 }],
}

export default function HandoverPreview() {
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 12, background: '#fbfaff' }}>
      <p style={{ margin: '4px 4px 10px', borderRadius: 14, background: '#fef6e0',
        border: '1px solid #f3d99b', padding: '9px 12px', font: '700 12.5px system-ui', color: '#7a5a09' }}>
        This version is with our team. Customers still see your live listing, if you have one.
      </p>
      <TradeListingCard listing={listing} tradeName="Decoration &amp; Floral" />
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', paddingTop: 8 }}>rendered</p>
    </div>
  )
}
