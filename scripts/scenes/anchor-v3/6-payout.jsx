import React from 'react'
import { Page } from './shell'
import PayoutFullScreen from '../../../src/components/partner/payout/PayoutFullScreen'

export default function Scene() {
  return (
    <Page>
      <PayoutFullScreen embedded setup={{ step: 'active' }}
        account={{ bank: 'HDFC Bank', last4: '4321', verified_by: 'Verified by Razorpay' }}
        earnings={{ collected: 5869570, recorded: 5400000, not_eligible: 1750000, eligible: 1000000, in_transfer: 920000, paid: 1730000, failed: 0 }} />
    </Page>
  )
}
