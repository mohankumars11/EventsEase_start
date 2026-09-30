/**
 * The master onboarding home, mounted for real.
 *
 * Asserts the property the whole redesign turns on: six steps, in
 * order, with everything past the current one LOCKED — and no escape
 * hatch. A screenshot would show six rows and tell you nothing about
 * whether row five can be tapped.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import PartnerSetupIntro from '../../src/pages/partner/PartnerSetupIntro'
import { AuthContext } from '../../src/context/AuthContext'

const fail = m => console.error(`HOME: ${m}`)
const $$ = s => [...document.querySelectorAll(s)]

const WANT = [
  ['business',   'Business & Services'],
  ['details',    'Partner Details'],
  ['area',       'Service Area & Availability'],
  ['compliance', 'Verification & Compliance'],
  ['bank',       'Bank & Payments'],
  ['review',     'Review & Publish'],
]

export default function SixStepHomeScene() {
  React.useEffect(() => {
    let done = false
    const end = () => { if (!done) { done = true; console.error('HOME-DONE') } }
    let tries = 0
    const tick = setInterval(() => {
      if (++tries > 80) { fail('the screen never rendered'); clearInterval(tick); end(); return }
      if (!$$('[data-step]').length) return
      clearInterval(tick)
      try { assert(end) } catch (e) { fail(String(e?.message ?? e)); end() }
    }, 100)
    return () => clearInterval(tick)
  }, [])

  return (
    <MemoryRouter>
      {/* Not a vendor, so the hook short-circuits before supabase: this
          asserts the FIRST-VISIT shape, which is what a partner sees
          one screen after OTP. */}
      <AuthContext.Provider value={{ user: { id: 'home-user' }, profile: null }}>
        <PartnerSetupIntro />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

function assert(end) {
  const rows = $$('[data-step]')
  if (rows.length !== 6) fail(`${rows.length} steps on screen, expected 6`)

  WANT.forEach(([id, title], i) => {
    const row = rows[i]
    if (row?.dataset.step !== id) fail(`step ${i + 1} is "${row?.dataset.step}", expected "${id}"`)
    if (!(row?.textContent ?? '').includes(title)) fail(`step ${i + 1} is not titled "${title}"`)
  })

  /* The gate. A brand new partner may open step 1 and nothing else. */
  const first = rows[0]
  if (first?.disabled) fail('step 1 is locked for a new partner')
  const laterUnlocked = rows.slice(1).filter(r => !r.disabled)
  if (laterUnlocked.length) {
    fail(`${laterUnlocked.length} later step(s) are tappable: ${laterUnlocked.map(r => r.dataset.step).join(', ')}`)
  }
  const locked = rows.slice(1).filter(r => r.dataset.status === 'LOCKED')
  if (locked.length !== 5) fail(`${locked.length} steps read LOCKED, expected 5`)

  const text = document.body.textContent ?? ''
  if (!/Great!/.test(text)) fail('the heading is missing')
  if (!/0 of 6/.test(text)) fail('the progress count is not shown')

  /* The prohibitions, checked as text rather than trusted. */
  for (const banned of ['Complete Later', 'Maybe Later', 'Skip for now']) {
    if (text.includes(banned)) fail(`"${banned}" is still on the screen`)
  }
  if (!$$('[data-cta="continue"]').length) fail('no primary CTA')
  end()
}
