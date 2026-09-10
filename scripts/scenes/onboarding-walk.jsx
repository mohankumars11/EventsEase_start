/**
 * The path every new partner takes, walked end to end.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Onboarding is the one screen sequence EVERY partner passes through
 * exactly once, and nothing tested it. It shipped with `setSaving(false)`
 * on a component whose setter is `setLoading` — a ReferenceError
 * swallowed by the surrounding catch, which showed the partner
 * "setSaving is not defined" in place of the sentence written for that
 * exact moment. It sat on the one path nobody clicks: a pincode we do
 * not serve.
 *
 * So this walks it. Business, location, how you heard, the agreement and
 * the signature — asserting at each step that the NEXT step actually
 * appeared, because a Continue button that silently does nothing is the
 * failure this file is written against.
 *
 * ── What it deliberately does not do ────────────────────────────────
 * It does not submit. Submit writes a vendor row, calls two RPCs and
 * navigates, and a guard that writes to the production database is a
 * guard that cannot be run twice — see the note on
 * check-booking-capture. Everything up to and including a valid
 * signature is asserted here.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import VendorOnboarding from '../../src/pages/onboarding/VendorOnboarding'
import { AuthContext } from '../../src/context/AuthContext'

const fail = m => console.error(`ONB: ${m}`)
const $ = sel => document.querySelector(sel)
const $$ = sel => [...document.querySelectorAll(sel)]

const click = el => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

function setInput(el, value) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function setSelect(el, value) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, value)
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

const nextButton = () => $$('button').find(b => /continue/i.test(b.textContent ?? ''))

export default function OnboardingWalk() {
  React.useEffect(() => {
    let done = false
    const end = () => { if (!done) { done = true; console.error('ONB-DONE') } }

    /* The page hydrates from supabase before it renders the form. Poll
       rather than guess a delay: a fixed timeout that fires early
       reports "no step 1" and looks exactly like a real failure. */
    let tries = 0
    const tick = setInterval(() => {
      if (++tries > 80) { fail('the form never appeared'); clearInterval(tick); end(); return }
      if (!$('[data-step="location"]')) return
      clearInterval(tick)
      try { step1(end) } catch (e) { fail(String(e?.message ?? e)); end() }
    }, 100)

    return () => clearInterval(tick)
  }, [])

  return (
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 'walk-user' }, profile: null }}>
        <VendorOnboarding />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

function step1(end) {
  /* Location is step 1 now: it is the only step that can end the
     conversation, and a partner outside the served set must hear so
     before typing a business name for a city we cannot serve. */
  const city = $('select')
  const bengaluru = [...(city?.options ?? [])].find(o => o.value === 'Bengaluru')
  if (!bengaluru) { fail('step 1: Bengaluru is not in the city list'); return end() }
  setSelect(city, 'Bengaluru')

  const area = $('input[placeholder="Koramangala"]')
  const pin = $('input[placeholder="560034"]')
  if (!area || !pin) { fail('step 1: area or pincode field missing'); return end() }
  setInput(area, 'Jayanagar')
  setInput(pin, '560041')

  /* The radius chips. They must exist here AND on the Account tab, and
     this is the field dispatch cares about most. */
  const km = $$('button').filter(b => /^\d+ km$/.test((b.textContent ?? '').trim()))
  if (km.length !== 6) { fail(`step 1: expected 6 radius chips, found ${km.length}`); return end() }
  click(km[3])

  setTimeout(() => {
    click(nextButton())
    setTimeout(() => step2(end), 80)
  }, 80)
}

function step2(end) {
  if (!$('[data-step="business"]')) {
    fail('Continue on step 1 did not reach the business step'); return end()
  }
  const name = $('input[placeholder*="Royal Caterers"]')
  if (!name) { fail('step 2: no business name field'); return end() }
  setInput(name, 'Walk Test Decorators')

  /* ══════════════════════════════════════════════════════════════
     THE CATEGORY SELECT MUST STAY GONE
     ══════════════════════════════════════════════════════════════

     It asked a partner to pick one of twenty-six trades from a
     dropdown before seeing what any of them contained, and then the
     last button of onboarding opened the listing flow ALREADY on that
     answer -- so somebody who picked Photography because it was near
     the top of the list landed in the photo-booth questions.

     Asserting an absence, deliberately. A field that was removed for a
     reason comes back by accident, and nothing else on this walk would
     notice: the form would still submit and the partner would still be
     dropped on the wrong trade. */
  if ($('[data-step="business"] select')) {
    fail('step 2: the category select is back -- it forces a wrong trade'); return end()
  }

  const desc = $('textarea')
  if (!desc) { fail('step 2: no description field'); return end() }
  setInput(desc, 'We decorate weddings, receptions and naming ceremonies across south Bengaluru.')

  const nums = $$('input[type="number"]')
  if (nums.length < 2) { fail('step 2: experience and price are not both here'); return end() }
  setInput(nums[0], '7')
  setInput(nums[1], '20000')

  setTimeout(() => {
    click(nextButton())
    setTimeout(() => step3(end), 80)
  }, 80)
}

function step3(end) {
  if (!$('[data-step="heard"]')) {
    fail('Continue on step 2 did not reach the attribution step'); return end()
  }

  /* ══════════════════════════════════════════════════════════════
     THE GATE MUST BITE — AND THIS CHECK MUST WAIT FOR IT
     ══════════════════════════════════════════════════════════════

     A required question that lets you past is not required, so the
     walk presses Continue on an empty step and asserts it is refused.

     The first version of this assertion read the DOM on the line after
     the click. React 18 renders asynchronously, so the step had not yet
     changed — and the check passed whether the gate worked or not. It
     was proved vacuous by disabling the gate and watching this guard
     print a green tick, which is the third time that class of mistake
     has been made in this repo and the reason every guard here is
     sabotage-tested before it is believed.

     So: click, let React commit, THEN look. */
  click(nextButton())
  setTimeout(() => {
    if (!$('[data-step="heard"]')) {
      fail('the attribution step let us past without an answer'); return end()
    }

    const chips = $$('[data-step="heard"] button[aria-pressed]')
    if (chips.length < 5) { fail(`step 3: only ${chips.length} attribution options`); return end() }
    click(chips[0])

    setTimeout(() => {
      click(nextButton())
      setTimeout(() => step4(end), 80)
    }, 80)
  }, 80)
}

function step4(end) {
  if (!$('[data-step="agreement"]')) {
    fail('Continue on step 3 did not reach the agreement'); return end()
  }

  const rules = $$('[data-step="agreement"] li')
  if (rules.length < 8) {
    fail(`the agreement shows ${rules.length} rules, expected at least 8`); return end()
  }

  const text = $('[data-step="agreement"]').textContent ?? ''
  if (!/really done/i.test(text)) {
    fail('the agreement does not carry the genuineness undertaking'); return end()
  }

  const sign = $('[data-hold-to-sign]')
  if (!sign) { fail('the agreement has no signature control'); return end() }

  const bar = sign.querySelector('button[aria-label="Hold to sign"]')
  if (!bar) { fail('no hold-to-sign bar'); return end() }
  if (!bar.disabled) { fail('the sign bar is live before a name is typed'); return end() }

  setInput(sign.querySelector('input'), 'Ramesh Kumar')

  setTimeout(() => {
    const live = $('[data-hold-to-sign] button[aria-label="Hold to sign"]')
    if (!live || live.disabled) { fail('typing a name did not arm the sign bar'); return end() }
    const submit = $$('button').find(b => /sign and start listing/i.test(b.textContent ?? ''))
    if (!submit) { fail('the last button does not lead into listing'); return end() }
    end()
  }, 100)
}
