/**
 * When — the day, the start time and how long it runs, in one gesture
 * each.
 *
 * ── The day: a month calendar ───────────────────────────────────────
 * A real calendar on white, tap a date (Mohan, 2026-10-23: the old swipe
 * ribbon made people drag to find their day). The chosen one is read
 * back large ("Saturday, 12 December · in 51 days").
 *
 * ── The time: a 24-hour sky ─────────────────────────────────────────
 * A ring painted the colour of the sky at each hour — night indigo at
 * the bottom, dawn on the left, midday gold at the top, dusk violet on
 * the right — with a sun or moon you drag to the start time. It snaps to
 * half hours. The event's span is drawn on the ring as a bright arc, so
 * "7 PM for four hours" is something you see, not something you work
 * out. Hours already gone today are washed out and cannot be picked; the
 * first start today is two hours away, because nobody can be at your
 * door sooner.
 *
 * The engine reserves against `start_time` and prices performers by the
 * hour, so all three answers are real inputs, not decoration.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Minus, Moon, Plus, Sun } from 'lucide-react'
import { Sheet } from '../ui/kit'
import { iso, fromIso, timeLabel, countdown } from '../lib/format'

const LONG = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
/* The slider covers a day; typing goes beyond it — a 3-day wedding is 72 hours (2026-10-31: no cap). */
const MIN_H = 1, MAX_H = 16, MAX_TYPED = 240

const toMin = t => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : 19 * 60)
const toTime = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const partOf = m => (m < 300 ? 'Late night' : m < 720 ? 'Morning' : m < 960 ? 'Afternoon' : m < 1200 ? 'Evening' : 'Night')

/* Ring geometry: midnight at the bottom, noon at the top, clockwise. */
const S = 272, C = S / 2, R = 116, W = 30
const angleOf = m => 90 + m / 4
const pt = (deg, r = R) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)]
function arc(m1, m2, r = R) {
  const a1 = angleOf(m1), a2 = angleOf(m2)
  const [x1, y1] = pt(a1, r), [x2, y2] = pt(a2, r)
  const sweep = (((a2 - a1) % 360) + 360) % 360
  return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** The picker's state. `open` going true resets it to the saved answer. */
export function useWhen({ date, time, hours }, open = true) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [d, setD] = useState(date ?? null)
  const [m, setM] = useState(toMin(time))
  const [span, setSpan] = useState(hours ?? 4)
  useEffect(() => {
    if (!open) return
    setD(date ?? null); setM(toMin(time)); setSpan(hours ?? 4)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => Array.from({ length: 120 }, (_, i) => { const x = new Date(today); x.setDate(x.getDate() + i); return x }), [today])
  const isToday = d === iso(today)
  const earliest = useMemo(() => { const n = new Date(); return Math.ceil((n.getHours() * 60 + n.getMinutes() + 120) / 30) * 30 }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const minAllowed = isToday ? earliest : 0
  const bad = m < minAllowed || minAllowed >= 1440
  useEffect(() => { if (isToday && m < earliest && earliest < 1440) setM(earliest) }, [isToday]) // eslint-disable-line react-hooks/exhaustive-deps
  const end = m + (span ?? 0) * 60
  return {
    d, setD, m, setM, span, setSpan, days, minAllowed, bad, end, chosen: fromIso(d),
    value: () => ({ date: d, time: toTime(m), hours: span }),
    label: !d ? 'Choose a day' : bad ? 'No start times left today' : span ? `${timeLabel(toTime(m))} – ${timeLabel(toTime(end % 1440))}` : `Starts ${timeLabel(toTime(m))}`,
  }
}

export default function WhenSheet({ open, onClose, date, time, hours, onPick }) {
  const w = useWhen({ date, time, hours }, open)
  return (
    <Sheet open={open} onClose={onClose} title="When is it?"
      footer={<button type="button" disabled={!w.d || w.bad} onClick={() => onPick(w.value())} className="cx-press cx-cta h-14 w-full rounded-[18px] text-[15px] font-extrabold" data-when-done>
        {!w.d || w.bad ? w.label : `Lock in · ${w.label}`}
      </button>}>
      <WhenBody w={w} />
    </Sheet>
  )
}

/**
 * The day, as a real month calendar on white: tap a date, no dragging to
 * find it. ‹ › move a month; days before today and beyond the booking
 * window (120 days) are shown but cannot be picked; today wears a ring,
 * the chosen day is solid amethyst. Weeks start on Sunday, as an Indian
 * wall calendar does.
 */
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

function MonthCalendar({ value, onPick, first, last }) {
  const start = value ? fromIso(value) : first
  const [view, setView] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1))
  const y = view.getFullYear(), mo = view.getMonth()
  const lead = new Date(y, mo, 1).getDay()
  const count = new Date(y, mo + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(y, mo, i + 1))]
  const canBack = new Date(y, mo, 1) > new Date(first.getFullYear(), first.getMonth(), 1)
  const canNext = new Date(y, mo + 1, 1) <= last
  const todayKey = iso(first)
  return (
    <div className="mt-4 rounded-[24px] bg-white p-3 shadow-[0_0_0_1px_#EEE6FA,0_16px_32px_-26px_rgba(58,18,144,.7)]" data-calendar>
      <div className="flex items-center justify-between px-1 pb-2">
        <button type="button" onClick={() => setView(new Date(y, mo - 1, 1))} disabled={!canBack} aria-label="Previous month"
          className="cx-press grid h-9 w-9 place-items-center rounded-full text-[var(--am-ink)] hover:bg-[var(--am-50)] disabled:opacity-25"><ChevronLeft size={20} /></button>
        <p className="text-[15.5px] font-extrabold tracking-[-0.02em]" aria-live="polite">{MONTH_YEAR.format(view)}</p>
        <button type="button" onClick={() => setView(new Date(y, mo + 1, 1))} disabled={!canNext} aria-label="Next month"
          className="cx-press grid h-9 w-9 place-items-center rounded-full text-[var(--am-ink)] hover:bg-[var(--am-50)] disabled:opacity-25"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 pb-1">
        {WEEK.map((w, i) => <span key={i} className={'grid h-7 place-items-center text-[11px] font-extrabold ' + (i === 0 || i === 6 ? 'text-[var(--brand)]' : 'text-[var(--ink-3)]')}>{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((x, i) => {
          if (!x) return <span key={`b${i}`} />
          const k = iso(x), on = value === k, out = x < first || x > last, today = k === todayKey
          return (
            <button key={k} type="button" disabled={out} onClick={() => onPick(k)} aria-pressed={on} aria-label={LONG.format(x)}
              className={'cx-press cx-num relative mx-auto grid h-10 w-10 place-items-center rounded-full text-[14.5px] font-bold transition ' +
                (on ? 'bg-[var(--brand)] font-extrabold text-white shadow-[0_8px_16px_-8px_rgba(106,43,217,.9)]'
                  : out ? 'text-[#CFC9DC]'
                    : today ? 'text-[var(--brand)] ring-[1.5px] ring-[var(--am-300)]'
                      : 'text-[var(--ink)] hover:bg-[var(--am-50)]')}>
              {x.getDate()}
              {today && !on && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--brand)]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The month calendar, the sky dial and the duration — inline or in the sheet. */
export function WhenBody({ w }) {
  const { d, setD, m, setM, span, setSpan, days, minAllowed, chosen } = w
  /* One thing at a time: the calendar; tapping a day asks "go with this
     date?"; yes folds the calendar into a summary and brings the clock.
     A day already chosen (coming back to edit) opens straight on the clock. */
  const [stage, setStage] = useState(d ? 'time' : 'date')
  const [ask, setAsk] = useState(null)
  if (stage === 'date') {
    return (
      <>
        <p className="text-[22px] font-extrabold leading-tight tracking-[-0.03em]">Pick the day</p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-3)]">Tap a date — we’ll ask the time next.</p>
        <MonthCalendar value={ask ?? d} onPick={k => setAsk(k)} first={days[0]} last={days[days.length - 1]} />
        {ask && (
          <div className="fixed inset-0 z-[402] flex items-end bg-[#0E081C]/40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]" onClick={() => setAsk(null)} data-confirm-date>
            <div className="cx-pop w-full rounded-[24px] bg-white p-5 text-center shadow-[0_-10px_40px_-10px_rgba(20,8,50,.4)]" onClick={e => e.stopPropagation()}>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--brand)]">Your date</p>
              <p className="mt-1 text-[24px] font-black tracking-[-0.03em]">{LONG.format(fromIso(ask))}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-[var(--ink-3)]">{countdown(ask) === 'today' ? 'That’s today' : countdown(ask) === 'tomorrow' ? 'That’s tomorrow' : `That’s ${countdown(ask)}`} · go ahead with this date?</p>
              <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2">
                <button type="button" onClick={() => setAsk(null)} className="cx-press h-12 rounded-[16px] bg-[#F4F1F8] text-[14px] font-extrabold text-[var(--ink-2)]">Change</button>
                <button type="button" onClick={() => { setD(ask); setAsk(null); setStage('time') }} className="cx-press h-12 rounded-[16px] bg-[#0C831F] text-[14px] font-extrabold text-white" data-confirm-yes>Yes, pick the time</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }
  return (
    <>
      <button type="button" onClick={() => setStage('date')} className="cx-press flex w-full items-center gap-3 rounded-[18px] bg-[#F1FBF5] px-3.5 py-3 text-left ring-1 ring-[#CDEFDC]" data-date-summary>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0C831F] text-white"><Check size={17} strokeWidth={3} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold">{chosen ? LONG.format(chosen) : 'Pick the day'}</span><span className="block text-[11.5px] font-bold text-[#3C7A5A]">Date set · tap to change</span></span>
      </button>
      <p className="mt-5 text-center text-[13px] font-extrabold text-[var(--am-ink)]">Now, what time does it start?</p>
      <SkyDial minutes={m} span={span} min={minAllowed} onChange={setM} />

      <div className="mt-1 flex items-center justify-center gap-3">
        <button type="button" onClick={() => setM(x => Math.max(minAllowed, x - 30))} aria-label="30 minutes earlier" className="cx-press cx-btn grid h-10 w-10 place-items-center rounded-full"><Minus size={17} /></button>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Drag the {m >= 360 && m < 1110 ? 'sun' : 'moon'} or nudge</span>
        <button type="button" onClick={() => setM(x => Math.min(1410, x + 30))} aria-label="30 minutes later" className="cx-press cx-btn grid h-10 w-10 place-items-center rounded-full"><Plus size={17} /></button>
      </div>

      {/* How long it lasts: asked as a question, set with − / + or the slider. */}
      <div className="mt-6 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA,0_16px_32px_-26px_rgba(58,18,144,.7)]" data-duration>
        <p className="flex items-center justify-between text-[15.5px] font-extrabold tracking-[-0.02em]">How long will it last?<span className="rounded-full bg-[#F1EAFE] px-2 py-0.5 text-[10.5px] font-extrabold text-[var(--brand)]">Optional</span></p>
        <p className="mt-0.5 text-[12px] font-semibold text-[var(--ink-3)]">Type any number of hours, or skip it — masters confirm the timing with you.</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setSpan(h => Math.max(MIN_H, (h ?? 4) - 1))} disabled={!span || span <= MIN_H} aria-label="One hour less"
            className="cx-press cx-btn grid h-12 w-12 shrink-0 place-items-center rounded-full disabled:opacity-35"><Minus size={20} /></button>
          <div className="text-center" aria-live="polite">
            <label className="flex items-baseline justify-center gap-1">
              <input inputMode="numeric" value={span ?? ''} placeholder="—" aria-label="Hours"
                onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); setSpan(Number.isFinite(n) ? Math.min(MAX_TYPED, Math.max(MIN_H, n)) : null) }}
                className="cx-num w-[84px] border-b-2 border-dashed border-[#D9CCF5] bg-transparent text-center text-[34px] font-extrabold leading-none tracking-[-0.04em] outline-none focus:border-[var(--brand)]" data-hours-input />
              <span className="text-[16px] font-extrabold text-[var(--ink-2)]">{span === 1 ? 'hour' : 'hours'}</span>
            </label>
            <p className="mt-1 text-[12px] font-bold text-[var(--brand)]">{span ? <>{timeLabel(toTime(m))} – {timeLabel(toTime((m + span * 60) % 1440))}{m + span * 60 >= 1440 ? ` (+${Math.floor((m + span * 60) / 1440)} day${Math.floor((m + span * 60) / 1440) > 1 ? 's' : ''})` : ''}</> : 'Not sure yet — that’s fine'}</p>
          </div>
          <button type="button" onClick={() => setSpan(h => Math.min(MAX_TYPED, (h ?? 3) + 1))} disabled={span >= MAX_TYPED} aria-label="One hour more"
            className="cx-press cx-btn grid h-12 w-12 shrink-0 place-items-center rounded-full disabled:opacity-35"><Plus size={20} /></button>
        </div>
        <input type="range" min={MIN_H} max={MAX_H} step={1} value={Math.min(span ?? 4, MAX_H)} onChange={e => setSpan(Number(e.target.value))} aria-label="Hours"
          className="cx-range mt-4 w-full" style={{ '--fill': `${((Math.min(span ?? 4, MAX_H) - MIN_H) / (MAX_H - MIN_H)) * 100}%` }} />
        <div className="mt-1 flex justify-between text-[10.5px] font-bold text-[var(--ink-3)]"><span>{MIN_H} hour</span><span>Half day</span><span>{MAX_H} h · type more</span></div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[[null, 'Not sure yet'], [24, '1 day'], [48, '2 days'], [72, '3 days']].map(([v, t]) => (
            <button key={t} type="button" onClick={() => setSpan(v)} aria-pressed={span === v} className={'cx-press rounded-full px-3 py-1.5 text-[12px] font-extrabold ' + (span === v ? 'bg-[var(--brand)] text-white' : 'bg-[#F4F0FB] text-[var(--ink-2)]')}>{t}</button>
          ))}
        </div>
      </div>
    </>
  )
}

/** The 24-hour sky. Drag anywhere on the ring; it snaps to half hours. */
function SkyDial({ minutes, span, min, onChange }) {
  const box = useRef(null)
  const drag = useRef(false)
  const fromPointer = e => {
    const r = box.current.getBoundingClientRect()
    const deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
    const m = Math.round(((((deg - 90) % 360) + 360) % 360) * 4 / 30) * 30 % 1440
    onChange(Math.max(min, m))
  }
  const day = minutes >= 360 && minutes < 1110
  const [kx, ky] = pt(angleOf(minutes))
  const end = (minutes + span * 60) % 1440
  const [ex, ey] = pt(angleOf(end))
  const [tm, ap] = timeLabel(toTime(minutes)).split(' ')
  const labels = [[0, '12 AM'], [360, '6 AM'], [720, '12 PM'], [1080, '6 PM']]

  return (
    <div ref={box} className="relative mx-auto mt-3 touch-none select-none" style={{ width: S, height: S }} data-dial
      onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }}
      onPointerMove={e => drag.current && fromPointer(e)}
      onPointerUp={() => { drag.current = false }} onPointerCancel={() => { drag.current = false }}
      role="slider" aria-label="Start time" aria-valuetext={timeLabel(toTime(minutes))} aria-valuemin={0} aria-valuemax={1410} aria-valuenow={minutes} tabIndex={0}
      onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(1410, minutes + 30)); if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(min, minutes - 30)) }}>
      {/* The sky, as a conic ring: CSS 0deg is the top, so midnight starts at 180deg. */}
      <div className="absolute rounded-full" style={{
        inset: C - R - W / 2,
        background: 'conic-gradient(from 180deg, #1B1240 0deg, #2E1F66 60deg, #F59E7B 90deg, #FFD98A 135deg, #FFF0BE 180deg, #FFC98E 240deg, #E27BAE 270deg, #8B5CF6 292deg, #3B1E8A 315deg, #1B1240 360deg)',
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${W}px), #000 calc(100% - ${W - 1}px))`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${W}px), #000 calc(100% - ${W - 1}px))`,
        boxShadow: '0 24px 40px -28px rgba(43,14,102,.8)',
      }} />
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="absolute inset-0 overflow-visible">
        <defs>
          <filter id="cxglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" /></filter>
        </defs>
        {/* Hours already gone today. */}
        {min > 0 && <path d={arc(0, Math.min(min, 1439))} stroke="rgba(255,255,255,.78)" strokeWidth={W} fill="none" />}
        {Array.from({ length: 24 }, (_, h) => {
          const [x1, y1] = pt(angleOf(h * 60), R + W / 2 + 4), [x2, y2] = pt(angleOf(h * 60), R + W / 2 + (h % 6 ? 8 : 12))
          return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke={h % 6 ? '#D2BDFF' : '#6A2BD9'} strokeWidth={h % 6 ? 1.4 : 2.2} strokeLinecap="round" />
        })}
        {/* The event's span, glowing on the ring. */}
        <path d={arc(minutes, end === minutes ? minutes + 1 : end)} stroke="#fff" strokeOpacity=".55" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#cxglow)" />
        <path d={arc(minutes, end === minutes ? minutes + 1 : end)} stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx={ex} cy={ey} r="5.5" fill="#fff" stroke="#2B0E66" strokeWidth="2" />
        {/* The knob: the sun by day, the moon by night. */}
        <circle cx={kx} cy={ky} r="19" fill="#fff" stroke="rgba(43,14,102,.12)" style={{ filter: 'drop-shadow(0 6px 10px rgba(43,14,102,.45))' }} />
        {labels.map(([mm, l]) => {
          const [x, y] = pt(angleOf(mm), R - W / 2 - 14)
          return <text key={l} x={x} y={y + 3.5} textAnchor="middle" className="fill-[var(--ink-3)] text-[9.5px] font-extrabold">{l}</text>
        })}
      </svg>
      <span className="pointer-events-none absolute grid h-[26px] w-[26px] place-items-center" style={{ left: kx - 13, top: ky - 13 }}>
        {day ? <Sun size={22} className="fill-[var(--gold)] text-[#E79A00]" /> : <Moon size={20} className="fill-[#5B21C8] text-[#3B1295]" />}
      </span>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink-3)]">{partOf(minutes)}</span>
        <span className="cx-num mt-0.5 text-[44px] font-extrabold leading-none tracking-[-0.05em]">{tm}<span className="ml-1 text-[17px] tracking-normal text-[var(--ink-2)]">{ap}</span></span>
        <span className="mt-1.5 rounded-full bg-[var(--am-100)] px-2.5 py-1 text-[11.5px] font-extrabold text-[var(--am-ink)]">until {timeLabel(toTime(end))}</span>
      </div>
    </div>
  )
}
