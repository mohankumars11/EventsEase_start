/**
 * The range sheet, blocking a stretch that has work in it.
 *
 * ONE sheet per run. The sheet is `position: fixed`, so two on a page
 * stack on top of each other — and the only thing that would scope them
 * to a box, an ancestor with a transform, is the exact thing that breaks
 * position:fixed and renders the sheet off-screen. See the header of
 * DayDetailSheet.
 *
 * This is the busiest state: a confirmed booking inside the range and
 * dates customers are asking about, so both red signals are on screen
 * at once and the button is armed for a second press.
 *
 *   node scripts/shoot-components.mjs shots/calendar-range-blocked.png \
 *     --scenes scripts/scenes/calendar-range.jsx --width 430
 */
import React from 'react'
import AvailabilityRangeSheet from '../../src/components/partner/AvailabilityRangeSheet'
import { SHEET_PROPS, MODE_FOR } from './calendar-range-props'

export default function CalendarRangeBlocked() {
  return (
    <div style={{ width: 430, minHeight: 820, margin: '0 auto', background: '#f6f5f7' }}>
      <AvailabilityRangeSheet {...SHEET_PROPS} initialMode={MODE_FOR.blocked} />
    </div>
  )
}
