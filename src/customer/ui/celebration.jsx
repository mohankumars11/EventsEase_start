/**
 * The Your Plan screen's own parts, for Personal Celebrations.
 *
 *   CelebrationHero     the occasion's hook and sentence
 *   FreeToolkit         the seven free digital features, as one bundle
 *   PlanSection         "Recommended for your celebration" / "Make it even
 *                       more special" — compact rows, one toggle each
 *   PlanRow             pictogram · hook · one line · toggle
 *   EstimatedSummary    what the plan is estimated at, never a bill
 *   EventTimeline       before / during / after
 *
 * The row is the whole design: a customer should understand it in a
 * second and act on it with one thumb. Nothing on it is a paragraph, and
 * the toggle is the only control — tapping the row itself opens the
 * requirement's own choices, which is the existing sheet, untouched.
 *
 * Nothing here decides anything. What is on screen, in what order, with
 * what words, comes from lib/occasionPlan.js; this file only draws it.
 */
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Info, Lock, Zap } from 'lucide-react'
import Glyph from './Glyph'
import { POLL_LABEL } from '../data/celebrationToolkit'

/* ── Hero ─────────────────────────────────────────────────────────── */

export function CelebrationHero({ plan, occasion, when = null }) {
  return (
    <section className="px-4 pt-4">
      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[var(--brand)]">{plan.hook}</p>
      <h1 className="mt-1 text-[24px] font-black leading-[1.12] tracking-[-0.035em] text-[var(--ink)]">
        Your {occasion.name} plan
      </h1>
      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[var(--ink-2)]">{plan.statement}</p>
      {when && <p className="mt-2 text-[12.5px] font-bold text-[var(--ink-3)]">{when}</p>}
    </section>
  )
}

/* ── The free bundle ──────────────────────────────────────────────── */

export function FreeToolkit({ toolkit, onOpen = null }) {
  if (!toolkit?.features?.length) return null
  return (
    <section className="mt-5 px-4" data-toolkit>
      <div className="rounded-[22px] bg-[linear-gradient(170deg,#F7F2FF_0%,#FFF7FB_100%)] p-4 shadow-[inset_0_0_0_1.5px_#EADFFF]">
        <div className="flex items-start gap-2.5">
          <Glyph name="invite" size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15.5px] font-black leading-tight tracking-[-0.02em] text-[var(--ink)]">Your free celebration toolkit</h2>
              <span className="rounded-full bg-[#16A34A] px-2 py-[3px] text-[9.5px] font-black uppercase tracking-[0.1em] text-white">Free · included</span>
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">
              Everything you need to bring everyone together, plan together and stay connected. No master to hire, nothing to pay.
            </p>
          </div>
        </div>

        <ul className="mt-3.5 grid grid-cols-2 gap-2">
          {toolkit.features.map((f, i) => {
            const inner = (
              <>
                <Glyph name={f.icon} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-[var(--brand)]">{f.hook}</span>
                  <span className="block truncate text-[12.5px] font-extrabold leading-tight text-[var(--ink)]">{f.label}</span>
                </span>
                {f.ready ? <ChevronRight size={15} className="shrink-0 text-[var(--ink-3)]" /> : <Lock size={13} className="shrink-0 text-[var(--ink-3)]" />}
              </>
            )
            const cls = 'flex w-full items-center gap-2 rounded-[15px] bg-white/85 px-2.5 py-2.5 text-left shadow-[inset_0_0_0_1.2px_#EFE7FB]'
            return (
              <li key={f.key} className={'min-w-0 ' + (i === toolkit.features.length - 1 && toolkit.features.length % 2 ? 'col-span-2' : '')}>
                {f.ready && f.to
                  ? <Link to={f.to} className={'cx-press ' + cls} data-toolkit-feature={f.key}>{inner}</Link>
                  : <button type="button" onClick={() => onOpen?.(f)} className={'cx-press ' + cls} data-toolkit-feature={f.key}>{inner}</button>}
              </li>
            )
          })}
        </ul>

        {toolkit.note && (
          <p className="mt-3 flex items-start gap-1.5 text-[11.5px] font-semibold leading-snug text-[var(--ink-2)]">
            <Info size={13} className="mt-[1px] shrink-0 text-[var(--brand)]" />{toolkit.note}
          </p>
        )}
      </div>
    </section>
  )
}

/** What a toolkit feature actually gives you — shown when its card is tapped. */
export function ToolkitDetail({ feature }) {
  if (!feature) return null
  return (
    <div className="px-1 pb-4">
      <div className="flex items-center gap-3">
        <Glyph name={feature.icon} size={48} />
        <div>
          <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">{feature.hook}</p>
          <p className="text-[16px] font-black leading-tight text-[var(--ink)]">{feature.label}</p>
        </div>
      </div>
      <p className="mt-2.5 text-[13.5px] font-semibold leading-snug text-[var(--ink-2)]">{feature.line}</p>
      <ul className="mt-3 space-y-1.5">
        {(feature.polls ? feature.polls.map(p => POLL_LABEL[p] ?? p) : feature.does ?? []).map(d => (
          <li key={d} className="flex items-start gap-2 text-[13px] font-semibold text-[var(--ink)]">
            <Check size={14} strokeWidth={3} className="mt-[3px] shrink-0 text-[#16A34A]" />{d}
          </li>
        ))}
      </ul>
      {feature.note && <p className="mt-3 rounded-[14px] bg-[#F7F2FF] px-3 py-2.5 text-[12.5px] font-bold text-[#4C1D95]">{feature.note}</p>}
      {!feature.ready && (
        <p className="mt-3 rounded-[14px] bg-[#FFF7E8] px-3 py-2.5 text-[12px] font-bold text-[#8A5A00]">
          Included free with your event. Opens here once it’s switched on for your account.
        </p>
      )}
    </div>
  )
}

/* ── Service rows ─────────────────────────────────────────────────── */

export function PlanSection({ title, sub, rows, onToggle, onOpen, children = null }) {
  if (!rows?.length) return children
  return (
    <section className="mt-6 px-4">
      <h2 className="text-[16px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)]">{title}</h2>
      {sub && <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
      <ul className="mt-3 space-y-2">
        {rows.map(r => <PlanRow key={r.id} row={r} onToggle={onToggle} onOpen={onOpen} />)}
      </ul>
      {children}
    </section>
  )
}

export function PlanRow({ row, onToggle, onOpen }) {
  const on = !!row.on
  return (
    <li
      className={'flex items-center gap-3 rounded-[18px] bg-white px-3 py-3 transition-shadow ' +
        (on ? 'shadow-[inset_0_0_0_1.6px_#CDB4FF,0_10px_22px_-20px_rgba(76,29,149,.9)]' : 'shadow-[inset_0_0_0_1.4px_#EDE8F5]')}
      data-plan-row={row.id} data-on={on ? '1' : '0'}
    >
      <button
        type="button" onClick={() => onOpen?.(row)}
        className="cx-press flex min-w-0 flex-1 items-start gap-3 py-0.5 text-left"
        aria-label={`${row.name ?? row.hook}. ${row.hook}: ${row.line}. Open choices.`}
      >
        <Glyph name={row.icon} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-[14.5px] font-black leading-tight tracking-[-0.015em] text-[var(--ink)]">{row.name ?? row.hook}</span>
            {/* "Essential" is the one classification the customer needs to
                see: it means the occasion does not work safely or at all
                without it — a lifeguard at a swimming competition, trained
                security around high-value stock. Everything else that is
                switched on reads simply as added. */}
            {row.kind === 'essential'
              ? <span className="rounded-full bg-[#FFF1E7] px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] text-[#B45309]">Essential</span>
              : on && <span className="rounded-full bg-[#E7F7EC] px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] text-[#15803D]">Added</span>}
            {row.experience && <span className="rounded-full bg-[#F1ECFB] px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] text-[#5B21B6]">Idea</span>}
          </span>
          {/* Hook then sentence, on one line where it fits and two where it
              does not — the sentence is never cut off mid-word. */}
          <span className="cx-clamp-2 mt-[2px] text-[12.5px] font-semibold leading-[1.35] text-[var(--ink-2)]">
            <span className="font-black text-[var(--brand)]">{row.hook}</span>
            <span className="mx-1 text-[var(--ink-3)]">·</span>
            {row.line}
          </span>
          {row.reason && <span className="mt-[2px] block truncate text-[11px] font-bold text-[#7C5BC7]">{row.reason}</span>}
        </span>
      </button>
      <Toggle on={on} onChange={() => onToggle?.(row, !on)} label={`${on ? 'Remove' : 'Add'} ${row.hook}`} />
    </li>
  )
}

export function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={'cx-press relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors ' + (on ? 'bg-[#6D28D9]' : 'bg-[#E4DEEE]')}
      data-toggle={on ? 'on' : 'off'}
    >
      <span className={'absolute top-[3px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_5px_rgba(20,15,31,.28)] transition-[left] ' + (on ? 'left-[25px]' : 'left-[3px]')} />
    </button>
  )
}

/* ── Already arranged ─────────────────────────────────────────────── */

export function ArrangedStrip({ rows, onUndo }) {
  if (!rows?.length) return null
  return (
    <section className="mt-6 px-4">
      <h2 className="text-[16px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)]">You’ve already arranged</h2>
      <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-3)]">In your plan, and we won’t suggest booking them again.</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {rows.map(r => (
          <li key={r.id}>
            <button type="button" onClick={() => onUndo?.(r)}
              className="cx-press flex items-center gap-1.5 rounded-full bg-[#F4F1FA] px-3 py-2 text-[12.5px] font-extrabold text-[var(--ink)]">
              <Check size={13} strokeWidth={3} className="text-[#16A34A]" />{r.hook}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── The estimate ─────────────────────────────────────────────────── */

const rupees = p => '₹' + Math.round(p / 100).toLocaleString('en-IN')

export function EstimatedSummary({ budget, counts }) {
  if (!budget) return null
  const { low, high, priced, open, loading } = budget
  return (
    <section className="mt-6 px-4" data-estimate>
      <div className="rounded-[20px] bg-[#FAF8FF] p-4 shadow-[inset_0_0_0_1.4px_#E9E1FA]">
        <div className="flex items-center gap-2">
          <Glyph name="budget" size={34} />
          <h2 className="text-[15px] font-black tracking-[-0.02em] text-[var(--ink)]">Estimated plan</h2>
        </div>
        <dl className="mt-3 space-y-1.5 text-[13px] font-semibold text-[var(--ink-2)]">
          <Line label="Chosen services" value={counts.services} />
          {counts.addons > 0 && <Line label="Extras" value={counts.addons} />}
          <Line label="Free celebration toolkit" value="₹0" strong />
        </dl>
        <div className="mt-3 flex items-end justify-between border-t border-[#EADFFF] pt-3">
          <span className="text-[13.5px] font-extrabold text-[var(--ink)]">Estimated total</span>
          <span className="text-[17px] font-black tracking-[-0.02em] text-[var(--ink)]">
            {loading ? '…' : low == null ? 'On request' : low === high ? rupees(low) : `${rupees(low)} – ${rupees(high)}`}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] font-semibold leading-snug text-[var(--ink-3)]">
          {loading
            ? 'Reading live prices from masters near you…'
            : <>From live prices of masters near you{open > 0 ? `, for ${priced} of ${priced + open} services — the rest are quoted on request` : ''}. An estimate, not a bill: nothing is charged until a master accepts and you pay.</>}
        </p>
      </div>
    </section>
  )
}

const Line = ({ label, value, strong }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="min-w-0 truncate">{label}</dt>
    <dd className={strong ? 'font-black text-[#15803D]' : ''}>{value ?? ''}</dd>
  </div>
)

/* ── Timeline ─────────────────────────────────────────────────────── */

const PHASE = [['before', 'Before the day'], ['during', 'On the day'], ['after', 'Afterwards']]

export function EventTimeline({ timeline }) {
  if (!timeline) return null
  return (
    <section className="mt-6 px-4" data-timeline>
      <h2 className="text-[16px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)]">How your celebration runs</h2>
      <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--ink-3)]">We’ll keep everyone on this, start to finish.</p>
      <ol className="mt-3 space-y-3">
        {PHASE.map(([k, label]) => (
          <li key={k} className="rounded-[18px] bg-white p-3.5 shadow-[inset_0_0_0_1.4px_#EDE8F5]">
            <p className="flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-[0.08em] text-[var(--brand)]">
              <Zap size={13} />{label}
            </p>
            <ul className="mt-2 space-y-1.5">
              {(timeline[k] ?? []).map(s => (
                <li key={s} className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-[var(--ink)]">
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#C4B0EC]" />{s}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}
