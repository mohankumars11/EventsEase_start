import fs from 'node:fs'

const source = fs.readFileSync('src/components/vendor/SambramoTradePictogram.jsx', 'utf8')

const trades = [
  'Anchor & MC',
  'Bar & Beverages',
  'Bridal Makeup & Hair',
  'Cake & Desserts',
  'Catering & Food',
  'DJ & Music',
  'Decoration & Floral',
  'End-to-End Event Logistics',
  'Event Equipment Rental',
  'Event Lighting',
  'Event Materials Supplier',
  'Gifts & Favours',
  'Guest Services',
  'Invitation & Printing',
  'Live Entertainment',
  'Loading & Unloading Crew',
  'Medium / Large Goods Vehicle',
  'Mehendi Artist',
  'Mini Truck / Pickup',
  'Passenger Transport',
  'Photography',
  'Power & Cooling',
  'Priest & Rituals',
  'Safety & Facilities',
  'Security Services',
  'Sound & AV',
  'Tent & Furniture',
  'Transportation',
  'Trousseau & Gift Packing',
  'Valet Parking',
  'Venue',
  'Videography',
  'Warehouse / Storage',
  'Wedding Planning',
]

const missing = trades.filter(trade => !source.includes(`'\${trade}':`))
const fallback = source.match(/ICONS\s*=\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

if (missing.length) {
  console.error('Missing trade pictograms:', missing)
  process.exit(1)
}

if (!source.includes('sambramo-trade-pictogram-glow')
  || !source.includes('sambramo-trade-pictogram-sheen')
  || !source.includes('sambramo-trade-pictogram-depth')
  || !source.includes('sambramo-trade-pictogram-face')) {
  console.error('Glossy 3D pictogram visual layers are incomplete.')
  process.exit(1)
}

console.log(`✓ All ${trades.length} Sambramo trades have explicit premium pictogram mappings.`)
console.log('✓ Gloss, depth, sheen and highlight layers are present.')
