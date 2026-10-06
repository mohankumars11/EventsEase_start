import React, { useMemo } from 'react'
import './SambramoTradePictogram.css'
import { getSambramoTradePictogramDataUri, getSambramoTradePictogramMeta } from '../../assets/sambramo/pictograms/hd-34'

export function tradePictogramIcon(trade) {
  return props => <SambramoTradePictogram trade={trade} {...props} />
}

export default function SambramoTradePictogram({ trade, size = 'md', className = '', showSparkle = false, title = true }) {
  const meta = useMemo(() => getSambramoTradePictogramMeta(trade), [trade])
  const src = useMemo(() => getSambramoTradePictogramDataUri(trade), [trade])
  return (
    <span className={'sambramo-trade-pictogram sambramo-trade-pictogram-' + size + ' ' + className}
      data-trade-pictogram={String(trade ?? 'trade')}
      data-pictogram-index={String(meta.index)}
      data-pictogram-asset={meta.asset}
      aria-label={title ? String(trade ?? '') : undefined}
      role={title ? 'img' : undefined}>
      <img className="sambramo-trade-art" src={src} alt={title ? String(trade ?? '') : ''} draggable="false" decoding="async" />
      {showSparkle ? <span className="sambramo-trade-pictogram-sparkle" aria-hidden="true">✦</span> : null}
    </span>
  )
}
