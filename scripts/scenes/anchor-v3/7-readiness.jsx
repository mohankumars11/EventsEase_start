import React from 'react'
import { Shell } from './shell'
import ReadinessChecklist from '../../../src/components/vendor/pricing/ReadinessChecklist'

export default function Scene() {
  return (
    <Shell stage="review" cta="Submit for review">
      <ReadinessChecklist state="PAYOUT_SETUP_PENDING" quotesOk items={[
        { id: 'profile', label: 'Profile & identity', status: 'pass' },
        { id: 'capability', label: 'Services, languages & capacity', status: 'pass' },
        { id: 'location', label: 'Location confirmed', status: 'pass' },
        { id: 'pricing', label: 'Pricing approved', status: 'pending', next: 'Our team is reviewing your packages. Usually under 24 hours.' },
        { id: 'availability', label: 'Calendar & booking windows', status: 'pass' },
        { id: 'rules', label: 'Booking & cancellation rules', status: 'pass' },
        { id: 'payout', label: 'Razorpay payout account', status: 'fail', next: 'Add your PAN and bank account to activate payouts.' },
      ]} />
    </Shell>
  )
}
