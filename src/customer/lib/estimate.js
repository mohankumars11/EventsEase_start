/**
 * What a plan comes to, honestly.
 *
 * A partner's "from" is a price OF something — a package, a plate, an
 * hour, a kilo — and those cannot be added together as they stand. A
 * caterer's ₹913 is not the catering bill; at 300 guests it is ₹2,73,900.
 * So each line is multiplied only by what the customer has told us
 * (guests, hours, the quantity on the line) and only when the unit allows
 * it. This is a floor, and every screen calls it one: checkout asks the
 * engine for the exact total before anything is paid.
 */
import { qtyOf } from './booking'

const STAFF = /staff/

export function lineFloor(line, event = {}) {
  const p = Number(line.fromPaise) || 0
  if (!p) return { paise: null, note: 'Price on request' }
  const q = qtyOf(line, event)
  switch (line.fromKind) {
    case 'plate': {
      /* A quoted line carries the guests it was priced for (and the menu's minimum). */
      const g = Number(line.guests) || Number(event.guests) || null
      return g ? { paise: p * g, note: `${g.toLocaleString('en-IN')} plates` } : { paise: null, note: 'Per plate · add guests' }
    }
    case 'hour': {
      const h = Number(line.hours) || Number(event.hours) || null
      if (STAFF.test(line.fromUnit ?? '')) return h ? { paise: p * h * q, note: `${q} staff × ${h} h` } : { paise: null, note: 'Per staff hour · add a duration' }
      return h ? { paise: p * h, note: `${h} hours` } : { paise: p, note: 'Per hour · add a duration' }
    }
    case 'unit':
      return { paise: p * q, note: `${q.toLocaleString('en-IN')} × ${String(line.fromUnit ?? 'item').replace(/^per /, '')}` }
    default:
      return { paise: p, note: line.fromKind === 'package' && line.fromLabel ? `${line.fromLabel} package` : null }
  }
}

/** The plan's floor: the sum of what can be summed, and how many lines could not. */
export function planFloor(lines, event = {}) {
  let paise = 0, open = 0
  for (const l of lines) {
    const ev = l.occasionId && l.occasionId === event.occasionId ? event : { hours: event.hours }
    const f = lineFloor(l, ev)
    if (f.paise == null) open++
    else paise += f.paise
  }
  return { paise, open }
}

/** Whether a line's quantity is the customer's to set (a stepper is shown). */
export const hasQty = line => line.fromKind === 'unit' || (line.fromKind === 'hour' && STAFF.test(line.fromUnit ?? ''))
