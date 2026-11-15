/**
 * The caterer's side of a Menu Studio request, photographed without a
 * partner login: the request card's menu and the "Price this menu" sheet.
 * The request is the one scripts/e2e-menu-quote.mjs sent through the real
 * API (canonical_demand.menu as the server stored it).
 *
 *   node scripts/shoot-components.mjs out.png --scenes scripts/scenes/menu-quote-scenes.jsx
 */
import React from 'react'
import { MenuBrief, MenuQuoteSheet } from '../../src/components/vendor/MenuQuote'

const MENU = {
  menuId: null, version: null, templateId: 'ka-traditional-veg-feast', name: 'Traditional Karnataka Vegetarian Feast', cuisine: 'Karnataka', diet: 'veg',
  meal: 'lunch', serve: 'Banana leaf', guests: 120, allergies: 'no peanuts', instructions: 'Less spicy for the children', refs: [],
  flags: ['Chitranna: Usually contains peanut — you said to avoid it'],
  sections: [
    { id: 'welcome', name: 'Welcome Drinks', dishes: [{ n: 'Panaka', d: 'veg' }, { n: 'Majjige', d: 'veg' }] },
    { id: 'starters', name: 'Starters', dishes: [{ n: 'Mysore Bonda', d: 'veg', c: 'swapped', r: 'Ambode' }] },
    { id: 'mains', name: 'Main Course', dishes: [{ n: 'Bisi Bele Bath', d: 'veg' }, { n: 'Chitranna', d: 'veg' }] },
    { id: 'curries', name: 'Curries & Gravies', dishes: [{ n: 'Huli', d: 'veg' }, { n: 'Tili Saaru', d: 'veg' }, { n: 'Majjige Huli', d: 'veg' }] },
    { id: 'desserts', name: 'Desserts & Sweets', dishes: [{ n: 'Obbattu', d: 'veg' }, { n: 'Ellu Bella', d: null, c: 'typed' }] },
  ],
}
const REQUEST = { id: 'ee9b7a03-06ad-4b8d-b5b4-72140bd5677c', canonical_demand: { menu: MENU, guests: 120 } }

export default function MenuQuoteScenes() {
  const sheet = new URLSearchParams(location.search).get('sheet')
  /* The sheet is a fixed overlay; the box gives the shooter something to frame. */
  if (sheet) return <div style={{ width: 390, height: 1500 }}><MenuQuoteSheet request={REQUEST} busy={false} onClose={() => {}} onSubmit={async () => {}} /></div>
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 16, background: '#fbfaff' }}>
      <article className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-1)] ring-1 ring-hairline/10">
        <span className="rounded-full bg-plum-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-plum-700">Instant Quote &amp; Pay</span>
        <h3 className="mt-2 text-[19px] font-extrabold text-ink">Catering · First Birthday</h3>
        <p className="mt-1 text-[12px] font-bold text-ink-soft">Sat, 12 Dec · Koramangala</p>
        <MenuBrief menu={MENU} compact />
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[13px] font-extrabold text-plum-950">Price this menu</button>
      </article>
    </div>
  )
}
