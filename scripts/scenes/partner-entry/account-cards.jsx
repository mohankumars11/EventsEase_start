/**
 * The Jobs confirmation after a submission (SubmittedCard).
 * The Identity Verification & Bank Details step has its own scenes
 * (payout-*.jsx) now that it is a real form rather than status cards.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import SubmittedCard from '../../../src/components/partner/SubmittedCard'

const fail = m => console.error(`CARDS: ${m}`)

export default function Cards() {
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!document.querySelector('[data-testid="submitted-card"]')) fail('no confirmation card')
      if (!/Your service has been submitted for review\./.test(document.body.textContent)) fail('confirmation text')
      if (!document.querySelector('[data-testid="submitted-payout"]')) fail('payout-incomplete note missing')
      if (!/Add Another Service/.test(document.body.textContent)) fail('no Add Another Service')
      console.error('CARDS-DONE')
    }, 1500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ width: 390, margin: '0 auto', background: '#fbfaff', padding: 16 }}>
      <MemoryRouter initialEntries={['/dashboard/vendor?submitted=Catering%20%26%20Food']}>
        <SubmittedCard vendorId={null} services={[]} />
      </MemoryRouter>
    </div>
  )
}
