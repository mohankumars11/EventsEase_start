/**
 * A partner standing in Mysuru, where we do not recruit yet.
 *
 * The branch that matters most and is hardest to reach by hand: you
 * would have to be in Mysuru. Seeded through the same localStorage keys
 * partnerLocation.js writes, so detectMarket() takes the saved-fix path
 * and no GPS is involved — the thing under test is the MARKET decision,
 * not the device.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import MarketCheck from '../../src/pages/partner/MarketCheck'
import { AuthContext } from '../../src/context/AuthContext'

const fail = m => console.error(`MKT: ${m}`)
const $ = s => document.querySelector(s)
const $$ = s => [...document.querySelectorAll(s)]
const click = el => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

/* Mysuru. A real coordinate for a real city we are not open in — not a
   made-up one, and not Bengaluru's. */
localStorage.setItem('sb_partner_loc_v1', JSON.stringify({
  lat: 12.2958, lng: 76.6394, accuracy: 30, at: Date.now(),
}))
localStorage.setItem('sb_partner_addr_v1', JSON.stringify({
  line: 'Kuvempunagar, Mysuru, Karnataka 570023',
  locality: 'Kuvempunagar', city: 'Mysuru', state: 'Karnataka', postcode: '570023',
}))
localStorage.removeItem('sb_market_interest_Mysore')

export default function ComingSoonScene() {
  React.useEffect(() => {
    let done = false
    const end = () => { if (!done) { done = true; console.error('MKT-DONE') } }
    let tries = 0
    const tick = setInterval(() => {
      if (++tries > 80) { fail('the screen never settled'); clearInterval(tick); end(); return }
      if (!$('[data-market]')) return
      clearInterval(tick)
      try { assert(end) } catch (e) { fail(String(e?.message ?? e)); end() }
    }, 100)
    return () => clearInterval(tick)
  }, [])

  return (
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 'mkt-user' }, profile: { full_name: 'Ramesh', email: 'r@example.com' } }}>
        <MarketCheck />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

function assert(end) {
  const state = $('[data-market]')?.dataset.market
  if (state !== 'coming-soon') { fail(`Mysuru resolved to "${state}", expected coming-soon`); return end() }

  const text = document.body.textContent ?? ''
  if (!/Mysuru/.test(text)) fail('the screen does not name the city it detected')
  if (!/Bengaluru/.test(text)) fail('the screen does not name the city that IS open')

  /* The serve question comes FIRST. A partner who works Bengaluru
     weddings was never out of market, and asking "shall we tell you when
     we open here" first would file them as a lead instead. */
  if (!$('[data-serve="yes"]')) { fail('"do you serve Bengaluru" is not asked'); return end() }
  if ($('[data-interest="yes"]')) fail('the interest ask is shown before the serve question is answered')

  click($('[data-serve="no"]'))
  setTimeout(() => {
    if (!$('[data-interest="yes"]')) { fail('saying no does not offer to capture the interest'); return end() }
    const t = document.body.textContent ?? ''
    if (/reject|sorry|cannot join|not eligible/i.test(t)) {
      fail('the out-of-city screen reads as a rejection')
    }
    /* Nothing here may promise a date. */
    if (/\b(next month|by \w+ 20\d\d|launching on)\b/i.test(t)) {
      fail('the screen promises a launch date')
    }
    end()
  }, 120)
}
