/**
 * This round's brand and Anchor changes: ?s=splash | header | review
 *   splash   the launch screen, wordmark in Manrope ExtraBold
 *   header   the Jobs tab top-left chip in the same face
 *   review   Anchor & MC step 11: no Instant Book checklist, Submit wording,
 *            the section list with Edit / Finish first
 */
import React from 'react'
import SplashScreen from '../../src/components/ui/SplashScreen'
import JobsHeader from '../../src/components/partner/JobsHeader'
import { ReviewStage } from '../../src/components/vendor/anchor/stages/PayoutReviewStages'
import { STAGES } from '../../src/components/vendor/anchor/options'

const tiers = [
  { tier: 'essential', name: 'Essential', price_paise: 2500000, duration_hours: 3 },
  { tier: 'signature', name: 'Signature', price_paise: 4000000, duration_hours: 5 },
  { tier: 'vip', name: 'VIP', price_paise: 6500000, duration_hours: 8 },
]

export default function Scene() {
  const s = new URLSearchParams(location.search).get('s') || 'splash'
  if (s === 'splash') return <div style={{ width: 390, height: 844, position: 'relative' }} data-ready><SplashScreen /></div>
  if (s === 'header') return (
    <div style={{ width: 390, padding: '8px 16px', background: '#fff' }} data-ready>
      <JobsHeader businessName="Lumen Frames Studio" fullName="Mohan" vendorId={null} acceptingJobs onAcceptingChange={() => {}} onOpenProfile={() => {}} onOpenAlerts={() => {}} />
    </div>
  )
  const done = new Set(STAGES.map(x => x.id).filter(id => !['about', 'payout', 'review'].includes(id)))
  return (
    <div style={{ width: 390, padding: 16, background: '#fbfaff' }} data-ready>
      <p style={{ font: '800 14px Manrope', margin: '0 0 8px' }}>Step 11 of 11 · {STAGES[STAGES.length - 1].label}</p>
      <ReviewStage tiers={tiers} name="Kavya Rao" langs="Kannada · English" stages={STAGES} done={done} onEdit={() => {}} />
    </div>
  )
}
