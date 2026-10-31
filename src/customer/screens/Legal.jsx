/**
 * /legal/:doc — Cancellation & refunds, Terms, Privacy, What masters supply.
 *
 * The way the big consumer apps do it: the short version first (a few
 * plain lines with green ticks), the cancellation ladder as a timeline,
 * and the full text one tap away, section by section. Nothing is hidden —
 * the full policy is always there; the screen just leads with what a
 * customer needs to know.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, FileText, Mail, ShieldCheck } from 'lucide-react'
import { BackHeader } from '../ui/kit'
import { GRIEVANCE, LADDER, POLICIES, POLICY_LIST, POLICY_VERSION, SUPPORT } from '../data/policies'

export default function Legal() {
  const { doc = 'cancellation' } = useParams()
  const navigate = useNavigate()
  const id = POLICIES[doc] ? doc : 'cancellation'
  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+40px)]" data-legal={id}>
      <BackHeader title="Policies" sub="Clear, fair, and always here" />
      <div className="cx-noscroll flex gap-1.5 overflow-x-auto px-3 pb-2">
        {POLICY_LIST.map(k => (
          <button key={k} type="button" onClick={() => navigate(`/legal/${k}`, { replace: true })} aria-pressed={k === id}
            className={'shrink-0 rounded-full px-4 py-2 text-[13px] font-extrabold transition ' + (k === id ? 'bg-[#1C1033] text-white' : 'bg-white text-[var(--ink-2)] shadow-[0_0_0_1px_#EFE7DD]')}>{POLICIES[k].short}</button>
        ))}
      </div>
      <PolicyDoc id={id} />
    </main>
  )
}

/** One policy: the summary, the ladder (cancellation), the full text. */
export function PolicyDoc({ id, compact = false }) {
  const p = POLICIES[id]
  const [open, setOpen] = useState(compact ? null : -1)
  return (
    <div className={compact ? '' : 'px-3'}>
      <section className="rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EFE7DD]">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0C831F]"><ShieldCheck size={13} />In short</p>
        <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#1C1033]">{p.title}</h1>
        <ul className="mt-3 space-y-2">
          {p.summary.map(s => (
            <li key={s} className="flex items-start gap-2.5 text-[13.5px] font-semibold leading-snug text-[var(--ink-2)]">
              <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0C831F] text-white"><Check size={12} strokeWidth={3.2} /></span>{s}
            </li>
          ))}
        </ul>
      </section>

      {id === 'cancellation' && (
        <section className="mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EFE7DD]" data-ladder>
          <p className="text-[15px] font-extrabold">When you cancel</p>
          <ol className="relative mt-3 space-y-3 border-l-2 border-dashed border-[#E9DDFB] pl-4">
            {LADDER.map((r, k) => (
              <li key={r.when} className="relative">
                <span className={'absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-2 ring-white ' + (k < 2 ? 'bg-[#0C831F]' : k < 4 ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]')} />
                <p className="text-[13px] font-extrabold text-[#1C1033]">{r.when}</p>
                <p className="text-[13px] font-bold"><span className={k < 2 ? 'text-[#0B6B3D]' : k < 4 ? 'text-[#B45309]' : 'text-[#475569]'}>{r.refund}</span>{r.credit && <span className="text-[#5B21B6]"> · {r.credit}</span>}</p>
                {r.note && <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">{r.note}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-[14px] bg-[#F1FBF5] px-3 py-2.5 text-[12.5px] font-bold text-[#0B4F2A]">If a master cancels or doesn’t turn up — everything back, and we’ll find you another.</p>
        </section>
      )}

      <section className="mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#EFE7DD]" data-full-policy>
        <p className="flex items-center gap-1.5 px-4 pt-4 text-[15px] font-extrabold"><FileText size={16} className="text-[var(--brand)]" />Read the full policy</p>
        <div className="mt-2 divide-y divide-[#F4EEE6]">
          {p.sections.map((s, k) => (
            <div key={s.h}>
              <button type="button" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} className="flex w-full items-center gap-2 px-4 py-3.5 text-left">
                <span className="min-w-0 flex-1 text-[13.5px] font-extrabold text-[#1C1033]">{s.h}</span>
                <ChevronDown size={17} className={'shrink-0 text-[var(--ink-3)] transition-transform ' + (open === k ? 'rotate-180' : '')} />
              </button>
              {open === k && (
                <div className="space-y-2 px-4 pb-4">
                  {s.p.map(t => <p key={t.slice(0, 30)} className="text-[13px] font-medium leading-relaxed text-[var(--ink-2)]">{t}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-[24px] bg-white p-4 text-[12.5px] font-semibold text-[var(--ink-2)] shadow-[0_0_0_1px_#EFE7DD]">
        <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#1C1033]"><Mail size={15} className="text-[var(--brand)]" />Questions or complaints</p>
        <p className="mt-1">Help in the app, or {SUPPORT.email}. Grievance Officer: {GRIEVANCE.name} · {GRIEVANCE.email} · {GRIEVANCE.hours}.</p>
        <p className="mt-2 text-[11px] text-[var(--ink-3)]">Version {POLICY_VERSION}. The version you accepted at sign-in is kept on your account.</p>
      </section>
    </div>
  )
}

/** "By continuing you agree to …" with each policy a link. */
export function AgreeLine({ onOpen, className = '' }) {
  const L = ({ id, children }) => (onOpen
    ? <button type="button" onClick={() => onOpen(id)} className="font-extrabold text-[var(--brand)] underline-offset-2 hover:underline">{children}</button>
    : <Link to={`/legal/${id}`} className="font-extrabold text-[var(--brand)]">{children}</Link>)
  return (
    <p className={'text-[11.5px] font-semibold leading-relaxed text-[var(--ink-3)] ' + className} data-agree>
      By entering the OTP you agree to Sambramo’s <L id="terms">Terms</L>, <L id="cancellation">Cancellation & Refund policy</L>, <L id="privacy">Privacy policy</L> and <L id="supply">Supply rules</L>.
    </p>
  )
}
