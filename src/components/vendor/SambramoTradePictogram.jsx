import React from 'react'
import './SambramoTradePictogram.css'
import { SAMBRAMO_PICTOGRAM_ROW_1 } from '../../assets/sambramo/pictograms/row-1'
import { SAMBRAMO_PICTOGRAM_ROW_2 } from '../../assets/sambramo/pictograms/row-2'
import { SAMBRAMO_PICTOGRAM_ROW_3 } from '../../assets/sambramo/pictograms/row-3'

const RASTER_TRADES = [
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
]

const ALIASES = {
  'Event Planning & Coordination': 'Wedding Planning',
  'Invitations & Print Media': 'Invitation & Printing',
  'Security & Bouncers': 'Security Services',
  'Cleaning & Housekeeping': 'Safety & Facilities',
  'Medical & Safety': 'Safety & Facilities',
  'Fire Safety & Compliance': 'Safety & Facilities',
  'Parking & Traffic Management': 'Valet Parking',
  'Toilets & Sanitation': 'Guest Services',
  'Signage & Branding': 'Invitation & Printing',
  'Live Counters & Food Stalls': 'Catering & Food',
}

// Until the remaining 13 individually-generated raster assets are added,
// use the closest existing generated 3D pictogram rather than reverting to
// the old SVG/Lucide-style artwork. This guarantees every trade surface is
// image-based and never silently falls back to the old icon system.
const RELATED_RASTER = {
  'Power & Cooling': 'Event Lighting',
  'Priest & Rituals': 'Decoration & Floral',
  'Safety & Facilities': 'Security Services',
  'Security Services': 'Security Services',
  'Sound & AV': 'DJ & Music',
  'Tent & Furniture': 'Event Equipment Rental',
  'Transportation': 'Passenger Transport',
  'Trousseau & Gift Packing': 'Gifts & Favours',
  'Valet Parking': 'Transportation',
  'Venue': 'Event Equipment Rental',
  'Videography': 'Photography',
  'Warehouse / Storage': 'Event Materials Supplier',
  'Wedding Planning': 'Decoration & Floral',
}

const SPRITES = [SAMBRAMO_PICTOGRAM_ROW_1, SAMBRAMO_PICTOGRAM_ROW_2, SAMBRAMO_PICTOGRAM_ROW_3]

function rasterSlot(trade) {
  const canonical = ALIASES[trade] ?? trade
  const related = RELATED_RASTER[canonical] ?? canonical
  const index = RASTER_TRADES.indexOf(related)
  if (index < 0) return { row: 0, slot: 0, canonical: related }
  return {
    row: Math.floor(index / 7),
    slot: index % 7,
    canonical: related,
  }
}

export function tradePictogramIcon(trade) {
  return rasterSlot(trade)
}

export default function SambramoTradePictogram({
  trade,
  size = 'md',
  className = '',
  showSparkle = true,
  title = true,
}) {
  const { row, slot, canonical } = rasterSlot(trade)
  const image = SPRITES[row] ?? SPRITES[0]
  const position = (slot / 6) * 100

  return (
    <span
      className={'sambramo-trade-pictogram sambramo-trade-pictogram-' + size + ' ' + className}
      data-trade-pictogram={String(trade ?? 'trade')}
      data-raster-trade={canonical}
      data-raster-row={String(row + 1)}
      data-raster-slot={String(slot + 1)}
      aria-label={title ? String(trade ?? '') : undefined}
      role={title ? 'img' : undefined}
    >
      <span
        className="sambramo-trade-raster"
        aria-hidden="true"
        style={{
          backgroundImage: 'url(' + image + ')',
          backgroundPosition: position + '% 0%',
        }}
      />
      {showSparkle ? <span className="sambramo-trade-pictogram-sparkle" aria-hidden="true">✦</span> : null}
    </span>
  )
}
