/**
 * "Great! Let's get started" — the screen the OTP flow used to skip.
 *
 * Mounted for real, from src/, with a router and an auth context around
 * it. What is asserted is what the brief is specific about: the heading,
 * the two sentences under it, the SIX named steps in order, and both
 * calls to action. A screenshot would prove the screen renders and
 * nothing about whether it says the right things.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import PartnerSetupIntro from '../../src/pages/partner/PartnerSetupIntro'
import { AuthContext } from '../../src/context/AuthContext'

const fail = m => console.error(`INTRO: ${m}`)
const $$ = sel => [...document.querySelectorAll(sel)]

const WANT = [
  'Business & Services',
  'Partner Details',
  'Service Area & Availability',
  'Verification & Compliance',
  'Bank & Payments',
  'Review & Publish',
]

export default function SetupIntroScene() {
  React.useEffect(() => {
    let done = false
    const end = () => { if (!done) { done = true; console.error('INTRO-DONE') } }

    /* Poll for a rendered marker rather than trusting a delay — the
       driving script's --eval fires before React has mounted anything. */
    let tries = 0
    const tick = setInterval(() => {
      if (++tries > 60) { fail('the screen never rendered'); clearInterval(tick); end(); return }
      if (!document.querySelector('h1')) return
      clearInterval(tick)
      try { assert(end) } catch (e) { fail(String(e?.message ?? e)); end() }
    }, 100)
    return () => clearInterval(tick)
  }, [])

  return (
    <MemoryRouter>
      {/* Not a vendor, so the stage hook short-circuits before it touches
          supabase: this scene is asserting the FIRST-VISIT wording, which
          is what a partner sees one screen after OTP. */}
      <AuthContext.Provider value={{ user: { id: 'intro-user' }, profile: null }}>
        <PartnerSetupIntro />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

function assert(end) {
  const text = document.body.textContent ?? ''

  const h1 = document.querySelector('h1')?.textContent ?? ''
  if (!/great/i.test(h1) || !/let.{0,3}s get started/i.test(h1)) {
    fail(`heading reads "${h1.trim()}"`)
  }

  if (!/partner profile is almost ready/i.test(text)) {
    fail('the "almost ready" line is missing')
  }
  if (!/match you with the right customers/i.test(text)) {
    fail('the supporting paragraph is missing')
  }

  const steps = $$('ol li').map(li => li.textContent ?? '')
  if (steps.length !== 6) fail(`${steps.length} steps on screen, expected 6`)

  WANT.forEach((want, i) => {
    if (!steps[i]?.includes(want)) {
      fail(`step ${i + 1} reads "${(steps[i] ?? '').slice(0, 40)}", expected "${want}"`)
    }
  })

  const buttons = $$('button').map(b => b.textContent ?? '')
  if (!buttons.some(b => /start setup/i.test(b))) fail('no Start Setup button')
  if (!buttons.some(b => /complete later/i.test(b))) fail('no Complete Later button')

  end()
}
