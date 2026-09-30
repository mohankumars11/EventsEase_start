import { jobMoney } from './earningsStatement'

/**
 * A job, turned into the things a partner reads before saying yes.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE REQUIREMENTS LIST IS DERIVED, NOT INVENTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The reference design shows "Customer requirements" as six neat
 * bullets. There is no column holding six neat bullets. `booking_lines`
 * carries `service_name`, `spec_mode`, `customer_note` (scrubbed of
 * contact details on write by 068 and 073) and the request carries
 * `guest_count` and `time_note` — and that is genuinely everything the
 * customer told us.
 *
 * So the list is assembled out of those, each line labelled with where
 * it came from, and a job that carries little says little. Padding it
 * out to six bullets would mean writing requirements the customer never
 * gave, on the screen a partner uses to decide whether they can do the
 * work. That is the worst place in the app to invent anything.
 */

export const TIMELINE = [
  { id: 'requested', label: 'Request received' },
  { id: 'accepted',  label: 'You accepted' },
  { id: 'funded',    label: 'Customer paid' },
  { id: 'event',     label: 'Event day' },
  { id: 'paid_out',  label: 'Payment released' },
]

/**
 * Which step the job is on, and which are behind it.
 *
 * Read off the same timestamps the Jobs list and the earnings buckets
 * read, so the stepper cannot disagree with the row above it.
 */
export function timelineFor(job, { claim } = {}) {
  const eventOver = job?.event_date
    ? Date.now() > new Date(`${job.event_date}T00:00:00`).getTime() + 86400000
    : false

  const done = {
    requested: true,
    accepted: !!job?.accepted_at || ['accepted','paid','in_progress','delivered','settled'].includes(job?.status),
    funded: !!job?.is_funded || !!job?.paid_at,
    event: !!job?.delivered_at || eventOver,
    paid_out: claim?.status === 'paid' || job?.status === 'settled',
  }

  /* The current step is the first one NOT done. A job where everything
     is done sits on the last one rather than falling off the end. */
  const idx = TIMELINE.findIndex(s => !done[s.id])
  return {
    steps: TIMELINE.map(s => ({ ...s, done: done[s.id] })),
    currentIndex: idx === -1 ? TIMELINE.length - 1 : idx,
  }
}

/**
 * What the customer told us, as lines a partner can act on.
 *
 * `from` says which column each line came from. Nothing here is written
 * by this function except the labels.
 */
export function requirementsFor(job, spec) {
  const out = []

  if (job?.service_name) {
    out.push({ id: 'service', text: job.service_name, from: 'service_name' })
  }
  if (job?.guest_count) {
    out.push({ id: 'guests', text: `${job.guest_count} guests`, from: 'guest_count' })
  }
  if (job?.time_note) {
    out.push({ id: 'time', text: job.time_note, from: 'time_note' })
  }

  /* The standard setup for this service, out of the catalogue. Snapshotted
     at booking time, so it is what the customer was actually shown. */
  for (const inc of spec?.includes ?? []) {
    out.push({ id: `inc-${inc}`, text: inc, from: 'catalogue' })
  }

  if (job?.customer_note) {
    out.push({ id: 'note', text: job.customer_note, from: 'customer_note', theirWords: true })
  }

  return out
}

/**
 * The money, in the three lines the reference design puts on this screen
 * — plus the two it leaves out.
 *
 * The design shows customer price, commission, your earnings. TCS and
 * TDS are missing from it, and they are statutory: a partner shown a
 * number that does not arrive is the exact complaint instantPricing.js
 * was written to stop. So the breakdown is the full one, and the
 * headline is the net.
 */
export function moneyFor(job, opts) {
  return jobMoney(job, opts)
}

/** Whether the customer's name and number are released yet. */
export function contactReleased(job) {
  return !!(job?.is_funded || job?.paid_at)
}
