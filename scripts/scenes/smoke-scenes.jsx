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
  React.useEffect(() => {
    const t = setTimeout(() => console.error('SMOKE-DONE'), 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <MemoryRouter>
      <ToastProvider>
        <div id="smoke" style={{ width: 390, margin: '0 auto', padding: 12, font: '12px system-ui' }}>
          {CASES.map(([name, el]) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <b>{name}</b>
              <Catch name={name}>{el}</Catch>
            </div>
          ))}
        </div>
      </ToastProvider>
    </MemoryRouter>
  )
}
