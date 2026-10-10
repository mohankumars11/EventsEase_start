/**
 * The real "Identity Verification & Bank Details" step (PayoutStage), driven:
 *   state 'empty'   — first visit, nothing filed
 *   state 'filled'  — bank searched + picked, IFSC looked up live (Razorpay
 *                     IFSC service), account typed twice (mismatch caught),
 *                     UPI added and confirmed
 *   state 'badifsc' — a code that does not exist gets a field error
 * vendorId is null: nothing is written; this asserts the screen.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { PayoutStage } from '../../../src/components/vendor/anchor/stages/PayoutReviewStages'
import { PAYOUT } from '../../../src/lib/partnerAccountStatus'

const fail = m => console.error(`PAYOUT: ${m}`)
const note = m => console.error(`PAYOUT-INFO: ${m}`)
const $ = s => document.querySelector(s)
const $$ = s => [...document.querySelectorAll(s)]
const wait = ms => new Promise(r => setTimeout(r, ms))
const click = el => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
const type = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
const status = { loading: false, details: null, account: null, verified: false, identity: 'not_started', payout: PAYOUT.NOT_STARTED, active: false, reload: () => {} }

async function drive(state) {
  await wait(600)
  const body = document.body.textContent
  for (const t of ['Identity Verification & Bank Details', 'Verify your identity', 'PAN and tax details', 'Bank account details', 'UPI details', 'Verification and payout status', 'Save Bank & UPI Details'])
    if (!body.includes(t)) fail(`missing "${t}"`)
  if (/Set Up Payouts|Open Payouts|managed in Payouts/.test(body)) fail('old status-only wording still present')
  if ($$('a[href*="razorpay.com"], a[href*="tab=account"]').length) fail('a link leaves the step')
  if ($$('input[type="password"]').length) fail('a password field')
  if (!$('[data-section="identity"]')) fail('no identity section')
  const rows = $$('[data-section="step-status"] [data-status]').map(r => `${r.dataset.status}=${r.querySelector('span span:last-child')?.textContent}`)
  note(`status rows: ${rows.join(' | ')}`)
  if (/Verified/.test(rows.join())) fail('something reads Verified with nothing filed')

  if (state === 'filled') {
    click($('[data-bank-picker] button')); await wait(200)
    type($('[data-testid="bank-search"]'), 'hdfc'); await wait(200)
    const shown = $$('[data-bank]').map(b => b.textContent)
    if (shown.length !== 1 || !/HDFC/.test(shown[0])) fail(`bank search "hdfc" → ${shown}`)
    click($('[data-bank="HDFC"]')); await wait(200)
    type($('#ob-ifsc'), 'HDFC0000240'); await wait(2600)
    const br = $('[data-testid="ifsc-branch"]')?.textContent
    if (!br) fail('IFSC lookup did not fill the branch'); else note(`IFSC HDFC0000240 → ${br}`)
    type($('#ob-name'), 'Ravi Kumar')
    type($('#ob-acc'), '123456789012')
    type($('#ob-acc2'), '123456789013'); $('#ob-acc2').dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await wait(300)
    if (!/do not match/.test(document.body.textContent)) fail('account mismatch not caught')
    type($('#ob-acc2'), '123456789012'); await wait(200)
    click($('[data-upi-choice="add"]')); await wait(200)
    type($('#ob-upi'), 'ravi@oksbi'); type($('#ob-upi2'), 'ravi@okhdfc'); await wait(200)
    if (!/UPI IDs do not match/.test(document.body.textContent)) fail('UPI mismatch not caught')
    type($('#ob-upi2'), 'ravi@oksbi'); await wait(200)
    type($('#ob-pan'), 'ABCPK1234F'); await wait(200)
    $('#ob-upi')?.scrollIntoView({ block: 'center' })
  }
  if (state === 'badifsc') {
    type($('#ob-ifsc'), 'ZZZZ0999999'); await wait(2800)
    const e = $('[data-testid="ifsc-error"]')?.textContent ?? $('[data-field="ifsc"]')?.getAttribute('aria-invalid')
    if (!e) fail('no error for a non-existent IFSC'); else note(`bad IFSC → ${e}`)
    $('#ob-ifsc')?.scrollIntoView({ block: 'center' })
  }
  if (state === 'empty') window.scrollTo(0, 0)
  console.error(`PAYOUT-DONE ${state}`)
}

export default function PayoutStep({ state = 'empty' }) {
  React.useEffect(() => { drive(state).catch(e => fail(String(e?.message ?? e))) }, [state])
  return (
    <MemoryRouter>
      <div style={{ width: 390, margin: '0 auto', background: '#fbfaff', padding: 16 }}>
        <PayoutStage status={status} vendorId={null} />
      </div>
    </MemoryRouter>
  )
}
