import fs from 'node:fs'
import process from 'node:process'

const required = [
  ['src/components/layout/CustomerAppShell.jsx', 'CustomerAppShell'],
  ['src/components/layout/CustomerBottomNav.jsx', 'CustomerBottomNav'],
  ['src/lib/customerBookings.js', 'fetchCustomerBookings'],
  ['src/pages/customer/CustomerBookingCenter.jsx', 'CustomerBookingCenter'],
  ['src/App.jsx', 'CustomerBookingCenter'],
]

for (const [file, token] of required) {
  const text = fs.readFileSync(file, 'utf8')
  if (!text.includes(token)) throw new Error(file + ' is missing ' + token)
  if (text.includes('\\\\n')) throw new Error(file + ' contains escaped newline source text')
}

const app = fs.readFileSync('src/App.jsx', 'utf8')
if (!app.includes("import CustomerAppShell from './components/layout/CustomerAppShell'")) throw new Error('CustomerAppShell is not mounted')
if (!app.includes('<CustomerAppShell>')) throw new Error('ScreenShell does not use CustomerAppShell')
if (!app.includes('<CustomerBottomNav />')) throw new Error('CustomerBottomNav is not mounted')
if (!app.includes('<CustomerBookingCenter />')) throw new Error('CustomerBookingCenter is not routed')

const nav = fs.readFileSync('src/components/layout/CustomerBottomNav.jsx', 'utf8')
for (const label of ['Home', 'Book', 'Track', 'Account']) {
  if (!nav.includes("label: '" + label + "'")) throw new Error('Customer nav missing ' + label)
}

const bookings = fs.readFileSync('src/lib/customerBookings.js', 'utf8')
for (const table of ['booking_requests', 'booking_lines', 'dispatch_offers']) {
  if (!bookings.includes("'" + table + "'")) throw new Error('Booking center missing ' + table)
}

console.log('Customer realtime architecture gate passed.')
