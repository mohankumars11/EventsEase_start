import fs from 'node:fs'

const source = fs.readFileSync('src/assets/sambramo/pictograms/hd-34.js', 'utf8')
const component = fs.readFileSync('src/components/vendor/SambramoTradePictogram.jsx', 'utf8')

const trades = [
  'Anchor & MC','Bar & Beverages','Bridal Makeup & Hair','Cake & Desserts','Catering & Food',
  'DJ & Music','Decoration & Floral','End-to-End Event Logistics','Event Equipment Rental',
  'Event Lighting','Event Materials Supplier','Gifts & Favours','Guest Services',
  'Invitation & Printing','Live Entertainment','Loading & Unloading Crew',
  'Medium / Large Goods Vehicle','Mehendi Artist','Mini Truck / Pickup','Passenger Transport',
  'Photography','Power & Cooling','Priest & Rituals','Safety & Facilities','Security Services',
  'Sound & AV','Tent & Furniture','Transportation','Trousseau & Gift Packing','Valet Parking',
  'Venue','Videography','Warehouse / Storage','Wedding Planning',
]

for (const trade of trades) {
  if (!source.includes(trade)) {
    console.error('Missing trade from HD pictogram registry:', trade)
    process.exit(1)
  }
}

const bodyText = source.match(/const B=\[(?:.|\n)*?\]\nconst CANONICAL_INDEX/s)?.[0] ?? ''
const bodyCount = (bodyText.match(/<g>/g) ?? []).length
if (bodyCount !== 34) {
  console.error('Expected exactly 34 explicit pictogram bodies; found '+bodyCount)
  process.exit(1)
}

if (source.includes('row-1.js') || source.includes('row-2.js') || source.includes('row-3.js')
  || source.includes('sprite') || source.includes('RELATED_RASTER')) {
  console.error('Legacy low-resolution sprite/fallback artwork must not be used by the HD registry.')
  process.exit(1)
}

if (component.includes("from 'lucide-react'") || component.includes('lucide-react')) {
  console.error('Trade pictogram component must not fall back to Lucide icons.')
  process.exit(1)
}

if (!component.includes('getSambramoTradePictogramDataUri')) {
  console.error('Trade pictogram component is not wired to the centralized HD registry.')
  process.exit(1)
}

console.log('✓ All 34 canonical Sambramo trades are present.')
console.log('✓ Exactly 34 trade-matched HD pictogram bodies are registered.')
console.log('✓ No legacy low-resolution sprite/fallback path is referenced.')
