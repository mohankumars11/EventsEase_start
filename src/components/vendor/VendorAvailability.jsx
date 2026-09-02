import { useCallback, useMemo, useState } from 'react'
import {
  CalendarCheck, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Loader2, Pause, Sparkles, Zap,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import DayStatusSheet from './DayStatusSheet'
import {
  AVAILABILITY_ORDER, AVAILABILITY_STATES, CALENDAR_HORIZON_MONTHS,
  MONTH_NAMES, WEEKDAYS, toDateKey,
} from '../../config/vendor'

/**
 * The Calendar tab.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS SCREEN IS FOR, IN ONE SENTENCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * It is the only place a partner can stop us offering them a job on a day
 * they cannot work — and the cost of not using it lands on them, not on us.
 * `match_partners` (migration 060) excludes a partner whose availability row
 * says BLOCKED and does NOT exclude one who simply never said. So an unfilled
 * calendar is not "no preference": it is "yes to everything", including the
 * Saturday they are already shooting a wedding on. They accept by reflex,
 * cancel, and collect a strike for it.
 *
 * Everything on this screen is arranged around making that easy enough that
 * it actually happens, for somebody holding a phone in one hand between jobs.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ORDER, AND WHY
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1. Am I on?         The master switch. Read as STATE, not as a button.
 *   2. My next 6 months One number that says what customers can see, and
 *                       six chips that page the calendar to any month.
 *   3. The calendar     The work. Tap a day, pick from three named answers.
 *   4. Standing rules   Set once a year. Last, because it is opened least.
 *
 * ── Why the switch is two labelled halves and not one button ─────────
 * It said "Pause" when the partner was live. A button labelled with a verb
 * sits in exactly the place a status pill sits, and half of everyone reads
 * it as the state they are IN — "it says pause, so I must be paused". That
 * is a partner who thinks their income is switched off, or worse, one who
 * thinks it is on when it is not. Reported exactly that way.
 *
 * A two-position control cannot be misread: both states are on screen, one
 * is lit, and the lit one is the truth. The same reason a light switch has
 * a visible position rather than a button that says "off".
 *
 * ── Why six months and not one ──────────────────────────────────────
 * See CALENDAR_HORIZON_MONTHS. The bookings worth the most are set a season
 * ahead — a wedding date is fixed at the engagement — so the month a partner
 * most needs to have answered is never the one on screen when they open the
 * app. The strip makes the other five one tap away and shows, honestly, that
 * they are unanswered.
 *
 * ── Why the coverage line counts days and not chores ────────────────
 * "You have not updated your calendar" is a scold about our record-keeping.
 * "Customers can book you on 174 of your next 180 days" is the same fact
 * told as what the partner's own listing currently says — which is the thing
 * they can act on, and the only framing that has ever made anyone open a
 * calendar they were not already going to open.
 */

const DAY_MS = 86400000

export default function VendorAvailability({
  vendor, availability, onSetDay, onSetRange, onClearDays, onUpdateVendor,
}) {
  const toast = useToast()
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayKey = toDateKey(today)

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [pending, setPending] = useState(null)      // dateKey mid-write
  const [savingRules, setSavingRules] = useState(false)
  const [bulking, setBulking] = useState(null)
  const [sheetDate, setSheetDate] = useState(null)

  const daysOff = vendor?.weekly_days_off ?? []
  const paused  = vendor?.accepting_bookings === false
  const maxPerDay = vendor?.max_events_per_day ?? 1

  /**
   * One date's effective state, and why.
   *
   * Precedence is deliberate: an explicit row always wins over the weekly
   * rule. That is what makes "I do work this one Sunday" expressible — see
   * the matching rule in useVendorAccount.setDayStatus, which keeps an OPEN
   * row only when it contradicts a day off.
   */
  const resolve = useCallback(date => {
    const key = toDateKey(date)
    const row = availability[key]
    if (row) return { key, row, state: row.status, reason: 'date' }
    if (daysOff.includes(date.getDay())) {
      return { key, row: null, state: 'BLOCKED', reason: 'weekly' }
    }
    return { key, row: null, state: 'OPEN', reason: null }
  }, [availability, daysOff])

  /**
   * The month grid, padded to whole weeks starting Sunday.
   *
   * Leading and trailing blanks are rendered rather than skipped: a grid that
   * starts the 1st under the wrong weekday column is a calendar a vendor will
   * misread, and they will block the wrong day because of it.
   */
  const cells = useMemo(() => {
    const year  = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const total = new Date(year, month + 1, 0).getDate()
    const out   = Array.from({ length: first.getDay() }, () => null)
    for (let d = 1; d <= total; d++) out.push(new Date(year, month, d))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [cursor])

  /* ══════════════════════════════════════════════════════════════════
     THE SIX-MONTH PICTURE
     ══════════════════════════════════════════════════════════════════

     Counted over real dates rather than over rows, because the honest
     question is "what can a customer book?" and the answer to that includes
     every day nobody has ever touched. A row count would report a partner
     with an empty calendar as having nothing to fix, which is the exact
     opposite of the truth. */
  const horizon = useMemo(() => {
    const end = new Date(today.getFullYear(), today.getMonth() + CALENDAR_HORIZON_MONTHS, today.getDate())
    const totalDays = Math.round((end - today) / DAY_MS)

    let open = 0, limited = 0, blocked = 0, weekendOpen = 0, weekendTotal = 0
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(today.getTime() + i * DAY_MS)
      const { state } = resolve(d)
      const weekend = d.getDay() === 0 || d.getDay() === 6
      if (weekend) weekendTotal++
      if (state === 'OPEN') { open++; if (weekend) weekendOpen++ }
      else if (state === 'LIMITED') limited++
      else blocked++
    }
    return { end, totalDays, open, limited, blocked, weekendOpen, weekendTotal }
  }, [today, resolve])

  /**
   * The six month chips.
   *
   * "Answered" means the partner has said something about THAT MONTH — at
   * least one availability row in it, or an explicit confirmation. A standing
   * day off deliberately does not count: it was set once, years ago possibly,
   * and it says nothing about whether the partner has looked at February.
   *
   * It is not a score out of thirty. A genuinely free November is correctly
   * answered by one tap on "November is right", and a partner whose month is
   * open should not be nagged for having one.
   */
  const months = useMemo(() => {
    const reviewedThrough = vendor?.calendar_reviewed_through ?? null
    return Array.from({ length: CALENDAR_HORIZON_MONTHS }, (_, i) => {
      const first = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const last  = new Date(first.getFullYear(), first.getMonth() + 1, 0)
      const from  = toDateKey(first)
      const to    = toDateKey(last)
      const marked = Object.values(availability).filter(
        r => r?.slot_date >= from && r.slot_date <= to,
      ).length
      const confirmed = reviewedThrough ? reviewedThrough >= to : false
      return {
        first, last, from, to, marked, confirmed,
        answered: marked > 0 || confirmed,
        label: MONTH_NAMES[first.getMonth()].slice(0, 3),
        year:  first.getFullYear(),
      }
    })
  }, [today, availability, vendor?.calendar_reviewed_through])

  const answered = months.filter(m => m.answered).length

  /* The confirm control exists only once the column behind it does.
     Migrations here are pasted into the SQL editor by hand, so shipping a
     button that writes to a column that may not exist yet would put a red
     toast in front of a partner for a feature they never asked for. `vendor`
     is `select('*')`, so the key's presence IS the migration check. */
  const canConfirm = vendor ? 'calendar_reviewed_through' in vendor : false
  const viewing = months.find(
    m => m.first.getFullYear() === cursor.getFullYear() && m.first.getMonth() === cursor.getMonth(),
  )

  /* Escape hatch for the cursor drifting outside the strip — paging past the
     six months is allowed (a partner legitimately books a year out), so the
     chips just stop being highlighted rather than snapping the view back. */
  const atFloor = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()

  /* ── Writes ───────────────────────────────────────────── */

  async function saveRules(patch, successMessage) {
    setSavingRules(true)
    try {
      await onUpdateVendor(patch)
      if (successMessage) toast.success(successMessage)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSavingRules(false)
    }
  }

  function toggleDayOff(dayId) {
    const next = daysOff.includes(dayId)
      ? daysOff.filter(d => d !== dayId)
      : [...daysOff, dayId].sort((a, b) => a - b)
    saveRules(
      { weekly_days_off: next },
      next.includes(dayId)
        ? `${WEEKDAYS[dayId].label}s are now closed.`
        : `${WEEKDAYS[dayId].label}s are open again.`,
    )
  }

  /** Every remaining day of the month on screen, optionally filtered. */
  const remainingKeys = useCallback(filter => cells
    .filter(d => d && toDateKey(d) >= todayKey && (!filter || filter(d)))
    .map(d => toDateKey(d)), [cells, todayKey])

  /**
   * A whole-month action. `status` of null means "undo", which is a different
   * write from "set these open" — see clearDays in useVendorAccount for why
   * collapsing the two would quietly open every Monday of the month.
   */
  async function bulk(id, keys, status, message) {
    if (keys.length === 0) { toast.info('Nothing left to change this month.'); return }
    setBulking(id)
    try {
      /* `slots_total` is cleared on the way past. A day that was "partly
         booked, 2 jobs left" and is now busy would otherwise keep the 2, and
         the next time it is opened the sheet would offer it back as if the
         partner had chosen it. */
      if (status === null) await onClearDays(keys)
      else await onSetRange(keys, status, { slots_total: null, slots_booked: 0 })
      toast.success(message)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBulking(null)
    }
  }

  /**
   * What the sheet decided, turned into writes.
   *
   * `slots_total` is written for LIMITED and cleared for the other two.
   * Migration 060 only skips a LIMITED day once `slots_booked >= slots_total`,
   * so a LIMITED row with no total is indistinguishable from an open one —
   * leaving a stale total behind when a day flips back to OPEN would be the
   * same bug in the other direction.
   */
  async function commitDay(date, { status, scope, slots, note }) {
    const key = toDateKey(date)
    const extra = {
      slots_total:  status === 'LIMITED' ? slots : null,
      slots_booked: 0,
      note: note || null,
    }

    let keys = [key]
    if (scope === 'weekday') {
      keys = remainingKeys(d => d.getDay() === date.getDay() && toDateKey(d) >= key)
    } else if (scope === 'rest') {
      keys = remainingKeys(d => toDateKey(d) >= key)
    }

    setPending(key)
    try {
      if (keys.length === 1) await onSetDay(key, status, extra)
      else await onSetRange(keys, status, extra)
      toast.success(keys.length === 1
        ? `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${AVAILABILITY_STATES[status].label}.`
        : `${keys.length} days set to ${AVAILABILITY_STATES[status].label.toLowerCase()}.`)
    } catch (err) {
      toast.error(friendlyError(err))
      throw err
    } finally {
      setPending(null)
    }
  }

  async function confirmMonth() {
    if (!viewing) return
    await saveRules(
      { calendar_reviewed_through: viewing.to },
      `${MONTH_NAMES[viewing.first.getMonth()]} confirmed. Customers can book you on the open days.`,
    )
  }

  /* ── Render ───────────────────────────────────────────── */

  return (
    <div className="space-y-3">

      {/* ══════════════════════════════════════════════════
          1 · AM I ON?
          ══════════════════════════════════════════════════ */}
      <section className={`overflow-hidden rounded-2xl border ${
        paused ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
      }`}>
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
          <span className={`relative flex h-2.5 w-2.5 shrink-0 ${paused ? '' : 'animate-pulse'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[14.5px] font-extrabold leading-tight ${paused ? 'text-amber-900' : 'text-emerald-900'}`}>
              {paused ? 'You are paused' : "You're live — taking bookings"}
            </p>
            <p className={`mt-0.5 text-[11.5px] leading-snug ${paused ? 'text-amber-800/85' : 'text-emerald-800/85'}`}>
              {paused
                ? 'We are not offering you any jobs. Your listing and calendar are untouched.'
                : 'Customers can book you on every day below that is not marked busy.'}
            </p>
          </div>
        </div>

        {/* The switch. Both positions visible, the true one lit — see the
            note at the top of this file for why this is not one button. */}
        <div className="flex gap-1 rounded-2xl bg-white/70 p-1 mx-1.5 mb-1.5" role="group" aria-label="Booking status">
          <SwitchHalf
            on={!paused}
            disabled={savingRules}
            tone="emerald"
            icon={Zap}
            label="Taking bookings"
            onClick={() => paused && saveRules({ accepting_bookings: true }, 'You are taking bookings again.')}
          />
          <SwitchHalf
            on={paused}
            disabled={savingRules}
            tone="amber"
            icon={Pause}
            label="Paused"
            onClick={() => !paused && saveRules({ accepting_bookings: false }, 'Bookings paused. Nothing else changed.')}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          2 · THE NEXT SIX MONTHS
          ══════════════════════════════════════════════════ */}
      <section className="card p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[14.5px] font-extrabold text-gray-900">Your next 6 months</h2>
          <span className="text-[11.5px] font-bold text-gray-500">
            {answered} of {CALENDAR_HORIZON_MONTHS} answered
          </span>
        </div>

        {/* The fact, stated as what a customer currently sees. */}
        <p className="mt-1.5 text-[12.5px] leading-snug text-gray-600">
          Right now customers can book you on{' '}
          <span className="font-extrabold text-gray-900">{horizon.open + horizon.limited}</span>
          {' '}of your next {horizon.totalDays} days
          {horizon.weekendTotal > 0 && (
            <> — including <span className="font-extrabold text-gray-900">{horizon.weekendOpen}</span> of {horizon.weekendTotal} weekend days, which is when most celebrations happen.</>
          )}
        </p>

        {/* Six chips, and they page the calendar. A month a partner has said
            nothing about says so, rather than looking identical to one they
            have gone through day by day. */}
        <div className="mt-3 grid grid-cols-6 gap-1.5">
          {months.map(m => {
            const on = viewing === m
            return (
              <button
                key={m.from}
                type="button"
                onClick={() => setCursor(new Date(m.first))}
                aria-pressed={on}
                title={m.answered
                  ? `${MONTH_NAMES[m.first.getMonth()]} — ${m.marked > 0 ? `${m.marked} day${m.marked === 1 ? '' : 's'} marked` : 'confirmed open'}`
                  : `${MONTH_NAMES[m.first.getMonth()]} — you have not said anything yet`}
                className={[
                  'rounded-xl border py-1.5 text-center transition-colors',
                  on ? 'border-plum-600 bg-plum-600 text-white'
                     : m.answered
                       ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400'
                       : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-plum-300',
                ].join(' ')}
              >
                <span className="block text-[11.5px] font-extrabold leading-none">{m.label}</span>
                <span className={`mt-1 block text-[9.5px] font-bold leading-none ${on ? 'text-white/75' : ''}`}>
                  {m.answered ? (m.marked > 0 ? `${m.marked} set` : 'ok') : '—'}
                </span>
              </button>
            )
          })}
        </div>

        {/* The loop closes here, or it does not close at all. A partner whose
            month is genuinely free has nothing to tap in the grid, so without
            this the strip could never reach six and the whole thing would be
            a counter that only ever goes up for people with problems. */}
        {canConfirm && viewing && !viewing.answered && (
          <button
            type="button"
            onClick={confirmMonth}
            disabled={savingRules}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-[12.5px] font-extrabold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-60"
          >
            <CheckCircle2 size={15} />
            {MONTH_NAMES[cursor.getMonth()]} is right — I am free on the open days
          </button>
        )}

        {/* The cost of leaving it, said once, where the number is. Not a
            standing banner: this card is only ever opened on purpose. */}
        <p className="mt-2.5 flex items-start gap-1.5 border-t border-orange-100 pt-2.5 text-[11.5px] leading-snug text-gray-500">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-saffron-500" />
          <span>
            We keep offering you jobs on every day you have not blocked. Accepting one
            and cancelling costs a strike — three in 90 days suspends the account.
          </span>
        </p>
      </section>

      {/* ══════════════════════════════════════════════════
          3 · THE CALENDAR
          ══════════════════════════════════════════════════ */}
      <section className="card p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            disabled={atFloor}
            aria-label="Previous month"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-plum-50 hover:text-plum-600 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="font-display text-[15px] font-bold leading-tight text-gray-900">
              {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            {!atFloor && (
              <button
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
                className="text-[10.5px] font-bold text-plum-600 hover:text-plum-800"
              >
                Back to this month
              </button>
            )}
          </div>
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            aria-label="Next month"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-plum-50 hover:text-plum-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map(d => (
            <div key={d.id} className="py-0.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
              {d.short}
            </div>
          ))}
        </div>

        <div className="mt-0.5 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} className="aspect-square" />

            const { key, state, reason, row } = resolve(date)
            const isPast  = key < todayKey
            const isToday = key === todayKey
            const busy    = pending === key
            const meta    = AVAILABILITY_STATES[state]

            // The past is history, not a setting. Blocking a date that has
            // already happened does nothing, and offering the control implies
            // it does.
            if (isPast) {
              return (
                <div key={key} className="flex aspect-square items-center justify-center rounded-xl text-[12px] text-gray-300">
                  {date.getDate()}
                </div>
              )
            }

            const title = [
              date.toDateString(),
              meta.label,
              reason === 'weekly' ? '(your standing day off)' : null,
              row?.status === 'LIMITED' && row?.slots_total
                ? `${row.slots_total} more job${row.slots_total === 1 ? '' : 's'}`
                : null,
              row?.note ?? null,
            ].filter(Boolean).join(' · ')

            return (
              <button
                key={key}
                onClick={() => setSheetDate(date)}
                disabled={busy}
                title={title}
                aria-label={title}
                className={[
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[12.5px] font-semibold transition-colors',
                  meta.cell,
                  // A weekly closure is shown dimmer than a date the vendor
                  // blocked by hand — same outcome, different thing to change.
                  reason === 'weekly' ? 'border-dashed opacity-70' : '',
                  isToday ? 'ring-2 ring-plum-500 ring-offset-1' : '',
                  busy ? 'opacity-50' : '',
                ].join(' ')}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : date.getDate()}
                {/* A note is worth a mark. Somebody scanning for "which
                    Saturday was the Jayanagar wedding" should be able to see
                    that a day has one without opening every day. */}
                {row?.note && !busy && (
                  <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-plum-500" />
                )}
                {state === 'LIMITED' && !busy && (
                  <span className="absolute bottom-1 text-[8px] font-extrabold leading-none text-amber-700">
                    {row?.slots_total ? `${row.slots_total} left` : '•'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Legend ─────────────────────────────────────
            Four squares that look like the squares above them, not four
            coloured dots. A dot legend for a grid of rounded rectangles
            makes somebody map one shape onto another to read their own
            calendar. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-orange-100 pt-2.5">
          {AVAILABILITY_ORDER.map(id => (
            <span key={id} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
              <span className={`h-3.5 w-3.5 rounded-[4px] ${AVAILABILITY_STATES[id].swatch}`} />
              {AVAILABILITY_STATES[id].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
            <span className="h-3.5 w-3.5 rounded-[4px] border border-dashed border-gray-400" />
            Standing day off
          </span>
        </div>

        {/* ── Quick actions ──────────────────────────────
            Buttons, not the two grey text links this used to be, and each
            one names the days it touches. "Block rest of month" as a link
            beside a legend is a destructive action styled as a footnote.

            Every label here is literally what happens. There is no "open the
            whole month", because that button could not keep its word: a
            partner with a standing Monday off would tap it and find four
            Mondays still closed. The clearing action says "undo what I
            marked" instead, which is exactly what it does — the standing
            rule is changed in the card below, where the rule lives. */}
        <div className="mt-2.5">
          <p className="type-overline mb-1.5 text-gray-500">One tap, many days</p>
          <div className="grid grid-cols-2 gap-1.5">
            <QuickAction
              icon={CalendarDays}
              label="Busy — next 7 days"
              tone="rose"
              loading={bulking === 'week'}
              disabled={bulking !== null}
              onClick={() => bulk(
                'week',
                Array.from({ length: 7 }, (_, i) => toDateKey(new Date(today.getTime() + i * DAY_MS))),
                'BLOCKED',
                'The next 7 days are marked busy.',
              )}
            />
            <QuickAction
              icon={CalendarDays}
              label="Busy — rest of month"
              tone="rose"
              loading={bulking === 'block'}
              disabled={bulking !== null}
              onClick={() => bulk('block', remainingKeys(), 'BLOCKED', `The rest of ${MONTH_NAMES[cursor.getMonth()]} is marked busy.`)}
            />
            <QuickAction
              icon={CalendarDays}
              label="Busy — every weekend"
              tone="rose"
              loading={bulking === 'weekends'}
              disabled={bulking !== null}
              onClick={() => bulk(
                'weekends',
                remainingKeys(d => d.getDay() === 0 || d.getDay() === 6),
                'BLOCKED',
                `Weekends left in ${MONTH_NAMES[cursor.getMonth()]} are marked busy.`,
              )}
            />
            <QuickAction
              icon={CalendarCheck}
              label="Undo my marks this month"
              tone="neutral"
              loading={bulking === 'clear'}
              disabled={bulking !== null}
              onClick={() => bulk(
                'clear',
                remainingKeys(d => !!availability[toDateKey(d)]),
                null,
                `${MONTH_NAMES[cursor.getMonth()]} is back to your usual days.`,
              )}
            />
          </div>
        </div>

        <p className="mt-2.5 text-[11.5px] leading-snug text-gray-500">
          Tap any date to say whether you are open, partly booked, or busy —
          and to write yourself a note. Days you never touch stay open.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════
          4 · STANDING RULES
          ══════════════════════════════════════════════════ */}
      <section className="card p-3.5">
        <h2 className="text-[14.5px] font-extrabold text-gray-900">Days you never work</h2>
        <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">
          One tap covers every one of them, this year and next. You can still
          open a single date in the calendar above.
        </p>

        <div className="mt-2.5 grid grid-cols-7 gap-1">
          {WEEKDAYS.map(d => {
            const off = daysOff.includes(d.id)
            return (
              <button
                key={d.id}
                onClick={() => toggleDayOff(d.id)}
                disabled={savingRules}
                aria-pressed={off}
                aria-label={`${d.label} — ${off ? 'closed' : 'open'}`}
                className={[
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 transition-colors disabled:opacity-60',
                  off
                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-plum-300',
                ].join(' ')}
              >
                <span className="text-[12px] font-extrabold leading-none">{d.abbr}</span>
                <span className={`text-[8.5px] font-bold uppercase leading-none tracking-wide ${off ? 'text-rose-600' : 'text-gray-400'}`}>
                  {off ? 'Closed' : 'Open'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-orange-100 pt-3">
          <NumberRule
            key={`lead-${vendor?.lead_time_days ?? 2}`}
            id="lead-time"
            label="Shortest notice"
            suffix="days"
            value={vendor?.lead_time_days ?? 2}
            min={0} max={365}
            hint="How late a customer can still book you."
            disabled={savingRules}
            onCommit={v => saveRules({ lead_time_days: v })}
          />
          <NumberRule
            key={`perday-${maxPerDay}`}
            id="per-day"
            label="Jobs per day"
            suffix="max"
            value={maxPerDay}
            min={1} max={50}
            hint="Above one, a date can be partly booked."
            disabled={savingRules}
            onCommit={v => saveRules({ max_events_per_day: v })}
          />
        </div>
      </section>

      {sheetDate && (() => {
        const { state, reason, row } = resolve(sheetDate)
        return (
          <DayStatusSheet
            date={sheetDate}
            current={state}
            hasRow={!!row}
            currentSlots={row?.slots_total ?? null}
            currentNote={row?.note ?? ''}
            reason={reason}
            isDayOff={daysOff.includes(sheetDate.getDay())}
            maxPerDay={maxPerDay}
            onClose={() => setSheetDate(null)}
            onSave={patch => commitDay(sheetDate, patch)}
          />
        )
      })()}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */

/** One half of the live/paused switch. Lit means true, not "tap me". */
function SwitchHalf({ on, disabled, tone, icon: Icon, label, onClick }) {
  const lit = tone === 'emerald'
    ? 'bg-emerald-600 text-white shadow-sm'
    : 'bg-amber-500 text-white shadow-sm'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-extrabold transition-colors disabled:opacity-60',
        on ? lit : 'text-gray-500 hover:bg-white',
      ].join(' ')}
    >
      <Icon size={14} />
      {label}
      {on && <CheckCircle2 size={13} className="opacity-90" />}
    </button>
  )
}

/** A whole-month action, sized like something you meant to press. */
function QuickAction({ icon: Icon, label, tone, loading, disabled, onClick }) {
  const skin = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
    rose:    'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-400',
    neutral: 'border-gray-200 bg-white text-gray-600 hover:border-plum-300',
  }[tone] ?? 'border-gray-200 bg-white text-gray-600'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11.5px] font-extrabold leading-tight transition-colors disabled:opacity-50 ${skin}`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  )
}

/**
 * A number that saves itself.
 *
 * Committed on blur and on Enter rather than on every keystroke — one write per
 * decision instead of one per digit, and it survives a vendor clearing the
 * field to retype it (an empty box would otherwise write NaN and trip the
 * CHECK constraint from migration 021).
 */
function NumberRule({ id, label, suffix, value, min, max, hint, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const n = Number(draft)
    if (!Number.isFinite(n) || draft === '') { setDraft(String(value)); return }
    const clamped = Math.min(max, Math.max(min, Math.round(n)))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-bold text-gray-700" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="input py-2 pr-12 text-[13px]"
          inputMode="numeric"
          value={draft}
          disabled={disabled}
          onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">
          {suffix}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-gray-500">{hint}</p>
    </div>
  )
}
