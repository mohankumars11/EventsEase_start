/**
 * "What you offer" — all 26 trades, multi-select, with the duplicate rule.
 *
 * Asserts the things the brief is specific about and a screenshot cannot
 * show: that every canonical trade is on screen, that each row carries
 * what the trade covers, that selection is MULTI, that the count is
 * honest, and that Continue is dead until something is picked.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import WhatYouOffer from '../../src/pages/partner/WhatYouOffer'
import { AuthContext } from '../../src/context/AuthContext'
import { TRADES } from '../../src/data/partnerCatalogue'

const fail = m => console.error(`OFFER: ${m}`)
const $$ = sel => [...document.querySelectorAll(sel)]
const click = el => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

export default function WhatYouOfferScene() {
  React.useEffect(() => {
    let done = false
    const end = () => { if (!done) { done = true; console.error('OFFER-DONE') } }
    let tries = 0
    const tick = setInterval(() => {
      if (++tries > 60) { fail('the screen never rendered'); clearInterval(tick); end(); return }
      if (!$$('[data-trade]').length) return
      clearInterval(tick)
      try { assert(end) } catch (e) { fail(String(e?.message ?? e)); end() }
    }, 100)
    return () => clearInterval(tick)
  }, [])

  return (
    <MemoryRouter>
      {/* Signed in, but not as a vendor: the stage hook short-circuits
          before it reaches supabase, so this asserts the screen and not
          the network. */}
      <AuthContext.Provider value={{ user: { id: 'offer-user' }, profile: null }}>
        <WhatYouOffer />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

const continueBtn = () => $$('button').find(b => /continue/i.test(b.textContent ?? ''))

function assert(end) {
  const rows = $$('[data-trade]')

  if (rows.length !== TRADES.length) {
    fail(`${rows.length} trades on screen, the catalogue has ${TRADES.length}`)
  }
  const missing = TRADES.filter(t => !rows.some(r => r.dataset.trade === t))
  if (missing.length) fail(`not on screen: ${missing.join(', ')}`)

  /* Every row says what is inside the trade. "Decoration & Floral" alone
     does not tell a partner whether the mandap work they do is in it.

     The test is that a description EXISTS and adds something — not that
     it is long. Venue's is "Venue booking", which is thirteen characters
     and is the whole truth about that trade; a length threshold failed
     it and was measuring the wrong thing. */
  const noScan = rows.filter(r => {
    const trade = r.dataset.trade
    const rest = (r.textContent ?? '').replace(trade, '').trim()
    return rest.length < 4 || rest === trade
  })
  if (noScan.length) {
    fail(`${noScan.length} row(s) say nothing beyond the trade name, e.g. ${noScan[0].dataset.trade}`)
  }

  const cta = continueBtn()
  if (!cta) { fail('no Continue button'); return end() }
  if (!cta.disabled) fail('Continue is live with nothing selected')

  /* Multi-select: two taps must leave TWO selected, not swap. */
  click(rows.find(r => r.dataset.trade === 'Photography'))
  click(rows.find(r => r.dataset.trade === 'Catering & Food'))

  setTimeout(() => {
    const on = $$('[data-trade][aria-pressed="true"]').map(r => r.dataset.trade)
    if (on.length !== 2) fail(`two taps left ${on.length} selected, expected 2`)
    if (!on.includes('Photography') || !on.includes('Catering & Food')) {
      fail(`selected the wrong ones: ${on.join(', ')}`)
    }
    if (!/2 services selected/i.test(document.body.textContent ?? '')) {
      fail('the count does not read "2 services selected"')
    }
    if (continueBtn()?.disabled) fail('Continue is still dead with two selected')

    /* Tapping again un-picks: a partner who mis-taps must be able to
       undo it without leaving the screen. */
    click($$('[data-trade]').find(r => r.dataset.trade === 'Photography'))
    setTimeout(() => {
      const after = $$('[data-trade][aria-pressed="true"]').length
      if (after !== 1) fail(`un-picking left ${after} selected, expected 1`)
      end()
    }, 80)
  }, 120)
}
