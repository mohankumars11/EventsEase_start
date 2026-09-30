/**
 * Mount every component this session touched, one at a time, and report
 * which one throws. All five tabs showing the error boundary means the
 * dashboard body failed — this finds the file.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import Earnings from '../../src/components/vendor/Earnings'
import JobAlerts from '../../src/components/vendor/JobAlerts'
import VendorAvailability from '../../src/components/vendor/VendorAvailability'
import VendorServiceList from '../../src/components/vendor/VendorServiceList'
import ListingTracker from '../../src/components/vendor/ListingTracker'
import ListingPitch from '../../src/components/vendor/ListingPitch'
import TradeGrid from '../../src/components/vendor/TradeGrid'

class Catch extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error(`SMOKE: ${this.props.name} — ${err?.message ?? err}`) }
  render() {
    return this.state.err
      ? <p style={{ color: '#c8112a', font: '600 12px system-ui' }}>
          {this.props.name}: {String(this.state.err?.message ?? this.state.err)}
        </p>
      : this.props.children
  }
}

const CASES = [
  ['ListingPitch', <ListingPitch empty />],
  ['TradeGrid', <TradeGrid q="" setQ={() => {}} onPick={() => {}} />],
  ['ListingTracker', <ListingTracker services={[{ id: 1, name: 'X', review_status: 'live', is_active: true }]} />],
  ['Earnings', <Earnings vendorId="00000000-0000-0000-0000-000000000000" onAddPayout={() => {}} />],
  /* JobAlerts reads useAuth, which needs the real provider and a real
     session. Mounting it here would test the stub, not the component —
     and check-flow-renders already proves the push plumbing imports
     cleanly. Left out deliberately rather than stubbed into a pass. */
  ['VendorServiceList', <VendorServiceList vendor={{ id: 'v', category: 'Photography' }} services={[]} onAdd={() => {}} onUpdate={() => {}} onRemove={() => {}} />],
  ['VendorAvailability', <VendorAvailability vendor={{ id: 'v', weekly_days_off: [], accepting_bookings: true }} availability={{}} onSetDay={() => {}} onSetRange={() => {}} onClearDays={() => {}} onSaveRules={() => {}} />],
]

export default function SmokeScenes() {
  /* ══════════════════════════════════════════════════════════════
     MOUNTING IS NOT WORKING
     ══════════════════════════════════════════════════════════════

     VendorServiceList mounted perfectly while tapping a trade did
     nothing: the splice that replaced the red card had also removed the
     {picking && <AddItemFlow/>} block, so the grid set state that
     nothing read. No error, no screen, no clue — and this guard passed,
     because every component rendered.

     So the last step is an interaction: tap a trade, and the flow has to
     appear. It is the one thing the Listing tab exists to do. */
  React.useEffect(() => {
    const t = setTimeout(() => {
      const grid = document.querySelector('[data-smoke="VendorServiceList"]')
      const card = grid
        /* Matched on a data attribute, not on the label. This looked for
           the words "things you can list" and broke the day that label was
           shortened to fit a smaller card — a guard that fails because the
           copy changed teaches everyone to ignore it. */
        && grid.querySelector('button[data-trade]')
      if (!card) {
        console.error('SMOKE: VendorServiceList — no trade cards to tap')
      } else {
        card.click()
        setTimeout(() => {
          if (!document.querySelector('[data-add-item-flow]')) {
            console.error('SMOKE: VendorServiceList — tapping a trade opened nothing')
          }
          /* Close it again so the calendar underneath is reachable. */
          const close = document.querySelector('[data-add-item-flow] [aria-label="Close"]')
          close?.click()

          setTimeout(() => {
            /* The Calendar tab's one action: tapping a day has to open
               the sheet. Same reasoning as the trade tap — the grid
               mounted fine the whole time the sheet was unreachable. */
            const cal = document.querySelector('[data-smoke="VendorAvailability"]')
            const day = cal
              && [...cal.querySelectorAll('button')].find(b => /^\d+$/.test((b.textContent ?? '').trim()))
            if (!day) {
              console.error('SMOKE: VendorAvailability — no day cells to tap')
              console.error('SMOKE-DONE')
              return
            }
            day.click()
            setTimeout(() => {
              const sheet = [...document.querySelectorAll('*')]
                .some(el => /Set this day/i.test(el.textContent ?? '') && el.children.length < 6)
              if (!sheet) {
                console.error('SMOKE: VendorAvailability — tapping a day opened nothing')
              }
              console.error('SMOKE-DONE')
            }, 500)
          }, 350)
        }, 500)
        return
      }
      console.error('SMOKE-DONE')
    }, 1400)
    return () => clearTimeout(t)
  }, [])
  return (
    <MemoryRouter>
      <ToastProvider>
        <div id="smoke" style={{ width: 390, margin: '0 auto', padding: 12, font: '12px system-ui' }}>
          {CASES.map(([name, el]) => (
            <div key={name} data-smoke={name} style={{ marginBottom: 10 }}>
              <b>{name}</b>
              <Catch name={name}>{el}</Catch>
            </div>
          ))}
        </div>
      </ToastProvider>
    </MemoryRouter>
  )
}
