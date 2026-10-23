/**
 * When — the day, the start time and how long it runs, in one gesture
 * each.
 *
 * ── The day: a ribbon, not a form ───────────────────────────────────
 * Four months of days in one swipe, the chosen one read back large
 * ("Saturday, 12 December · in 51 days"). The full month is not a
 * separate mode; the ribbon IS the calendar.
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
import { Minus, Moon, Plus, Sun } from 'lucide-react'
import { Sheet } from '../ui/kit'
import { iso, fromIso, timeLabel, countdown } from '../lib/format'

const LONG = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
const DOW = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
const MON = new Intl.DateTimeFormat('en-IN', { month: 'long' })
const SPANS = [2, 3, 4, 6, 8, 12]

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
  const end = m + span * 60
  return {
    d, setD, m, setM, span, setSpan, days, minAllowed, bad, end, chosen: fromIso(d),
    value: () => ({ date: d, time: toTime(m), hours: span }),
    label: !d ? 'Choose a day' : bad ? 'No start times left today' : `${timeLabel(toTime(m))} – ${timeLabel(toTime(end % 1440))}`,
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

/** The day ribbon, the sky dial and the duration — inline or in the sheet. */
export function WhenBody({ w }) {
  const ribbon = useRef(null)
  const { d, setD, m, setM, span, setSpan, days, minAllowed, chosen } = w
  useEffect(() => {
    requestAnimationFrame(() => ribbon.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {/* The chosen day, read back large. */}
      <div className="flex items-end justify-between gap-3">
        <p className="text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{chosen ? LONG.format(chosen) : 'Pick the day'}</p>
        {chosen && <span className="mb-0.5 shrink-0 rounded-full bg-[var(--am-100)] px-2.5 py-1 text-[11.5px] font-extrabold text-[var(--am-ink)]">{countdown(d) === 'today' ? 'Today' : countdown(d) === 'tomorrow' ? 'Tomorrow' : countdown(d)}</span>}
      </div>

      <div ref={ribbon} className="cx-noscroll -mx-5 mt-3 flex snap-x gap-1.5 overflow-x-auto px-5 pb-2" data-ribbon>
        {days.map((x, i) => {
          const k = iso(x), on = d === k, wk = x.getDay() === 0 || x.getDay() === 6
          const newMonth = i === 0 || x.getDate() === 1
          return (
            <div key={k} className="flex shrink-0 snap-start items-end gap-1.5">
              {newMonth && (
                <span className="flex h-[66px] w-6 shrink-0 items-center justify-center">
                  <span className="-rotate-90 whitespace-nowrap text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">{MON.format(x)}</span>
                </span>
              )}
              <button type="button" onClick={() => setD(k)} aria-pressed={on} aria-label={LONG.format(x)}
                className={'cx-press flex h-[66px] w-[50px] flex-col items-center justify-center rounded-[16px] transition-all duration-300 ' +
                  (on ? 'scale-105 bg-[var(--brand-deep)] text-white shadow-[0_12px_22px_-12px_rgba(43,14,102,.95)]' : wk ? 'bg-[var(--am-100)] text-[var(--am-ink)]' : 'bg-white text-[var(--ink)] ring-1 ring-[var(--am-200)]')}>
                <span className={'text-[10.5px] font-extrabold uppercase ' + (on ? 'text-white/70' : 'text-[var(--ink-3)]')}>{DOW.format(x)}</span>
                <span className="cx-num text-[20px] font-extrabold leading-tight tracking-[-0.03em]">{x.getDate()}</span>
                {on && <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--gold)]" />}
              </button>
            </div>
          )
        })}
      </div>

      <SkyDial minutes={m} span={span} min={minAllowed} onChange={setM} />

      <div className="mt-1 flex items-center justify-center gap-3">
        <button type="button" onClick={() => setM(x => Math.max(minAllowed, x - 30))} aria-label="30 minutes earlier" className="cx-press cx-btn grid h-10 w-10 place-items-center rounded-full"><Minus size={17} /></button>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Drag the {m >= 360 && m < 1110 ? 'sun' : 'moon'} or nudge</span>
        <button type="button" onClick={() => setM(x => Math.min(1410, x + 30))} aria-label="30 minutes later" className="cx-press cx-btn grid h-10 w-10 place-items-center rounded-full"><Plus size={17} /></button>
      </div>

      <p className="mt-5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Runs for</p>
      <div className="mt-2.5 grid grid-cols-6 gap-1.5 pb-2">
        {SPANS.map(h => (
          <button key={h} type="button" onClick={() => setSpan(h)} aria-pressed={span === h}
            className={'cx-press cx-num rounded-[14px] py-2.5 text-[13.5px] font-extrabold transition ' + (span === h ? 'bg-[var(--brand-deep)] text-white' : 'cx-btn')}>
            {h === 12 ? 'Day' : `${h}h`}
          </button>
        ))}
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
