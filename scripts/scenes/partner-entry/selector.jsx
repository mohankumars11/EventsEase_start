/**
 * "What services do you offer?" — the real ServiceSelector, driven through
 * the DOM and asserted. One file, four states, chosen by window.__STATE
 * (set with --eval): initial | selected | search | empty | summary.
 *
 * Signed in but with no vendor profile, so usePartnerStage stops before the
 * network: this asserts the screen, not the database.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import ServiceSelector from '../../../src/pages/partner/ServiceSelector'
import { AuthContext } from '../../../src/context/AuthContext'
import { TRADE_CONFIGS } from '../../../src/data/trades'

const fail = m => console.error(`SELECTOR: ${m}`)
const $$ = sel => [...document.querySelectorAll(sel)]
const click = el => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
const type = (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const wait = ms => new Promise(r => setTimeout(r, ms))
const PICK = ['Catering & Food', 'Bar & Beverages', 'Event Materials Supplier']

async function drive(STATE) {
  await wait(500)   // let React attach handlers before the first click
  const cards = $$('[data-trade]')
  const want = TRADE_CONFIGS.slice().sort((a, b) => a.order - b.order).map(c => c.name)
  if (cards.length !== 34) fail(`${cards.length} trade cards, expected 34`)
  if (cards.map(c => c.dataset.trade).join('|') !== want.join('|')) fail('cards are not in canonical order')
  const cta = document.querySelector('[data-cta="continue"]')
  if (!cta?.disabled) fail('Continue is enabled with nothing selected')
  if (!/Select at least one service to continue\./.test(document.querySelector('[data-testid="selected-count"]')?.textContent ?? '')) fail('no prompt when nothing is selected')

  const search = document.querySelector('[data-testid="service-search"]')
  if (STATE === 'search') {
    type(search, 'CATER'); await wait(300)
    const names = $$('[data-trade]').map(c => c.dataset.trade)
    if (!names.includes('Catering & Food')) fail(`case-insensitive search missed Catering: ${names}`)
    console.error(`SELECTOR: search "CATER" → ${names.join(', ')}`)
  }
  if (STATE === 'empty') {
    type(search, 'zzqx spaceship'); await wait(300)
    if ($$('[data-trade]').length) fail('nonsense query still shows trades')
    if (!/No services found\. Try another name\./.test(document.querySelector('[data-testid="no-results"]')?.textContent ?? '')) fail('no empty-state message')
  }
  if (STATE === 'selected' || STATE === 'summary') {
    for (const t of PICK) { click(document.querySelector(`[data-trade="${t}"]`)); await wait(60) }
    click(document.querySelector('[data-trade="Bar & Beverages"]')); await wait(60)   // deselect …
    click(document.querySelector('[data-trade="Bar & Beverages"]')); await wait(200)  // … and back
    const count = document.querySelector('[data-testid="selected-count"]')?.textContent ?? ''
    if (!/3 services selected/.test(count)) fail(`count reads "${count}"`)
    if (document.querySelector('[data-cta="continue"]')?.disabled) fail('Continue still disabled with 3 picked')
    const pressed = $$('[data-trade][aria-pressed="true"]').map(c => c.dataset.trade)
    if (pressed.length !== 3) fail(`pressed: ${pressed}`)
  }
  if (STATE === 'summary') {
    click(document.querySelector('[data-cta="continue"]')); await wait(900)
    const names = document.querySelector('[data-testid="summary-names"]')?.textContent ?? ''
    if (names !== 'Catering & Food · Event Materials Supplier · Bar & Beverages') fail(`summary names "${names}"`)
    if (!/Let's set up your 3 services/.test(document.body.textContent)) fail('no "Let\'s set up your 3 services"')
    if (!document.querySelector('[data-account-status="payout"]')) fail('no shared payout status in the summary')
    if (!document.querySelector('[data-badge="razorpay"] img[alt="Razorpay"]')) fail('no Razorpay logo')
    if (document.querySelector('input[name*="account"], input[name*="ifsc"]')) fail('bank fields on the selector')
  }
  await wait(400)
  console.error(`SELECTOR-DONE ${STATE}`)
}

export default function SelectorScene({ state = 'initial' }) {
  React.useEffect(() => {
    let tries = 0
    const t = setInterval(() => {
      if (++tries > 80) { clearInterval(t); fail('never rendered'); return }
      if ($$('[data-trade]').length < 34) return
      clearInterval(t)
      drive(state).catch(e => fail(String(e?.message ?? e)))
    }, 100)
    return () => clearInterval(t)
  }, [])
  return (
    <MemoryRouter initialEntries={['/partner/setup']}>
      <AuthContext.Provider value={{ user: { id: 'scene-user' }, profile: null }}>
        <div style={{ width: 390, height: 844, margin: '0 auto', position: 'relative' }}>
          <ServiceSelector />
        </div>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
