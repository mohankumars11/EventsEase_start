/**
 * The same sheet, saying the thing it could never say before.
 *
 * Identical fixture to calendar-range.jsx -- same dates, same confirmed
 * booking, same enquiry counts -- differing only in the mode. That is
 * the point of the pair: the confirmed booking and the in-demand dates
 * are still there, and opening up raises nothing, because there is
 * nothing to warn about.
 *
 *   node scripts/shoot-components.mjs shots/calendar-range-open.png \
 *     --scenes scripts/scenes/calendar-range-open.jsx --width 430
 */
import React from 'react'
import AvailabilityRangeSheet from '../../src/components/partner/AvailabilityRangeSheet'
import { SHEET_PROPS, MODE_FOR } from './calendar-range-props'

export default function CalendarRangeOpen() {
  return (
    <div style={{ width: 430, minHeight: 820, margin: '0 auto', background: '#f6f5f7' }}>
      <AvailabilityRangeSheet {...SHEET_PROPS} initialMode={MODE_FOR.open} />
    </div>
  )
}
