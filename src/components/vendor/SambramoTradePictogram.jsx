import React, { useMemo } from 'react'
import './SambramoTradePictogram.css'
import { SAMBRAMO_RASTER_SPRITE, SAMBRAMO_RASTER_TRADES } from '../../assets/sambramo/pictograms/raster-34'

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

function canonicalTrade(trade) {
  const value = String(trade ?? '').trim()
  return ALIASES[value] || value
}

export function tradePictogramIcon(trade) {
  return props => <SambramoTradePictogram trade={trade} {...props} />
}

export default function SambramoTradePictogram({ trade, size = 'md', className = '', showSparkle = false, title = true }) {
  const canonical = useMemo(() => canonicalTrade(trade), [trade])
  const index = useMemo(() => SAMBRAMO_RASTER_TRADES.indexOf(canonical), [canonical])
  const safeIndex = index >= 0 ? index : 0
  const col = safeIndex % 7
  const row = Math.floor(safeIndex / 7)
  const style = useMemo(() => ({
    '--sambramo-raster-image': `url(${SAMBRAMO_RASTER_SPRITE})`,
    '--sambramo-raster-x': `${(col / 6) * 100}%`,
    '--sambramo-raster-y': `${(row / 4) * 100}%`,
  }), [col, row])
  return (
    <span className={'sambramo-trade-pictogram sambramo-trade-pictogram-' + size + ' ' + className}
      data-trade-pictogram={canonical || 'trade'}
      data-pictogram-index={String(safeIndex + 1)}
      data-pictogram-asset={`sambramo-raster-34-${String(safeIndex + 1).padStart(2, '0')}`}
      aria-label={title ? canonical : undefined}
      role={title ? 'img' : undefined}>
      <span className="sambramo-trade-art" style={style} aria-hidden={!title} />
      {showSparkle ? <span className="sambramo-trade-pictogram-sparkle" aria-hidden="true">✦</span> : null}
    </span>
  )
}
