/**
 * What a plan comes to, honestly.
 *
 * A partner's "from" is a price OF something — a package, a plate, an
 * hour, a kilo — and those cannot be added together as they stand. A
 * caterer's ₹913 is not the catering bill; at 300 guests it is ₹2,73,900.
 * So each line is multiplied only by what the customer has actually told
 * us (guests, hours) and only when the unit allows it. A line priced by
 * quantity (a rental per item, storage per sq ft) is left out of the sum
 * and said so, rather than counted as one.
 *
 * This is a floor, and every screen calls it one. The engine states the
 * exact total at checkout, from the same rows, before anything is paid.
 */
export function lineFloor(line, event = {}) {
  const p = Number(line.fromPaise) || 0
  if (!p) return { paise: null, note: 'Price on request' }
  switch (line.fromKind) {
    case 'plate':
      return event.guests ? { paise: p * event.guests, note: `${event.guests.toLocaleString('en-IN')} plates` } : { paise: null, note: 'Per plate · add guests' }
    case 'hour':
      return event.hours ? { paise: p * event.hours, note: `${event.hours} hours` } : { paise: p, note: 'Per hour · add a duration' }
    case 'unit':
      return { paise: null, note: `${line.fromUnit ?? 'By quantity'} · priced at checkout` }
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
