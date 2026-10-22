/**
 * This round's partner-side pieces: ?s=pop | submit | sheet | edit | header
 *   pop     the card that pops after a step: exactly what that step changed
 *   submit  the customer preview on the Submit step, in a phone frame
 *   sheet   adding a product: the full-screen form, Save above the keyboard
 *   edit    the customer preview with Edit on every section, no photos yet
 *   header  the Jobs header for an approved partner: green badge
 */
import React from 'react'
import { StepPop, SubmitPreview } from '../../src/components/vendor/listing/LivePreview'
import Storefront from '../../src/components/customer/storefront/Storefront'
import StoreAvatar from '../../src/components/customer/storefront/StoreAvatar'
import { modelFromTradeListing } from '../../src/components/customer/storefront/storefrontModel'
import { engineDraftListing } from '../../src/components/vendor/listing/draftPreview'
import { configFor } from '../../src/data/trades'
import { Sheet } from '../../src/components/vendor/anchor/ui'
import QuestionRenderer from '../../src/components/vendor/listing/QuestionRenderer'
import JobsHeader from '../../src/components/partner/JobsHeader'

const config = configFor('photography')
const draft = {
  basics: { display_name: 'Lumen Frames Studio', tagline: 'Candid wedding stories, told in natural light', bio: 'A team of four photographers covering weddings across Karnataka since 2016.' },
  location: { locality: 'Jayanagar', city: 'Bengaluru', travel_scope: '50' },
  answers: { specialties: ['candid', 'traditional', 'pre_wedding', 'drone_photography'], events: ['weddings', 'engagements', 'sangeet'],
    styles: ['documentary', 'bright_and_airy'], years: 9, formats: ['online_gallery', 'printed_album'], service_radius_km: 150,
    languages: ['english', 'kannada', 'hindi'], sneak_peek_days: 3, same_day_edit: true, outstation: true, team: 4 },
  rules: { hour: { on: true, amount_paise: 500000, min_qty: 3 } },
  packages: [{ key: 'essential', name: 'Essential', hours: 6, take_home_paise: 3500000, inclusions: ['album'] },
    { key: 'signature', name: 'Signature', hours: 10, take_home_paise: 6000000, inclusions: ['album', 'same_day'] }],
  addons: { album: { on: true, take_home_paise: 1500000 }, drone: { on: true, take_home_paise: 1000000 } },
  availability: { min_notice_days: 7, travel_model: 'per_km' }, booking: { instant: true, cancellation: 'moderate' },
}
const model = modelFromTradeListing(engineDraftListing(config, draft), { tradeName: config.name, media: [] })

export default function Scene() {
  const s = new URLSearchParams(location.search).get('s') || 'pop'
  if (s === 'pop') return (
    <div style={{ width: 390, height: 844, background: '#fbfaff' }} data-ready>
      <StepPop pop={{ key: 1, stage: 'screen:profile', label: 'Your photography', n: 3, secs: ['glance', 'about'] }} model={model} total={13} onClose={() => {}} onFull={() => {}} />
    </div>
  )
  if (s === 'questions') return (
    <div style={{ width: 390, padding: 16, background: '#fbfaff' }} data-ready>
      <QuestionRenderer questions={config.screens[0].questions.filter(q => ['specialties', 'formats', 'languages', 'same_day_edit', 'outstation'].includes(q.id))}
        answers={{ specialties: ['candid', 'drone_photography', 'other'], specialties_other: 'Temple-light portraits', formats: ['online_gallery', 'photo_book'], languages: ['english', 'kannada'], same_day_edit: true }}
        set={() => {}} trade={config.name} tried={false} />
    </div>
  )
  if (s === 'submit') return <div style={{ width: 390, padding: 16, background: '#fbfaff' }} data-ready><SubmitPreview model={model} onOpenFull={() => {}} /></div>
  if (s === 'sheet') return (
    <div style={{ width: 390, height: 844 }} data-ready>
      <Sheet full open onOpenChange={() => {}} title="New coverage package"
        footer={<button type="button" className="h-[52px] w-full rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15px] font-extrabold text-white">Save coverage package</button>}>
        <QuestionRenderer questions={config.catalogue.fields} answers={{ coverage: 'full_day', hours: 10 }} set={() => {}} trade={config.name} tried={false} />
      </Sheet>
    </div>
  )
  if (s === 'edit') return (
    <div style={{ width: 390 }} data-ready>
      <Storefront model={{ ...model, isLive: false, status: 'UNDER_REVIEW', verified: true }} onEditSection={() => {}} avatarSlot={<StoreAvatar name={model.name} />} />
    </div>
  )
  return (
    <div style={{ width: 390, padding: '8px 16px', background: '#fff' }} data-ready>
      <JobsHeader businessName="Lumen Frames Studio" fullName="Mohan" vendorId={null} acceptingJobs verified onAcceptingChange={() => {}} onOpenProfile={() => {}} onOpenAlerts={() => {}} />
    </div>
  )
}
