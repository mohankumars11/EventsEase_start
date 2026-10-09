/**
 * The onboarding chrome around a stage: header, the 11-stage rail, the
 * sticky CTA. Mirrors AnchorOnboardingFlow so a stage can be photographed
 * in the frame the partner will actually see.
 */
import React from 'react'
import { ArrowLeft, ArrowRight, LogOut } from 'lucide-react'
import StepRail from '../../../src/components/vendor/anchor/StepRail'
import { STAGES } from '../../../src/components/vendor/anchor/options'

export function Shell({ stage, children, cta }) {
  const idx = STAGES.findIndex(s => s.id === stage)
  const done = new Set(STAGES.slice(0, idx).map(s => s.id))
  return (
    <div style={{ width: 390, margin: '0 auto' }} className="flex flex-col bg-[#fbfaff]">
      <header className="bg-white/90 px-4 pb-3 pt-3 ring-1 ring-ink/[0.05]">
        <div className="flex items-center gap-2">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-600">Anchor & MC</p>
            <p className="text-[14px] font-extrabold text-ink">Step {idx + 1} of {STAGES.length} · {STAGES[idx].label}</p>
          </div>
          <button type="button" className="flex h-9 items-center gap-1 rounded-full bg-plum-50 px-3 text-[11.5px] font-extrabold text-plum-700"><LogOut size={13} />Save & exit</button>
        </div>
        <div className="mt-3"><StepRail steps={STAGES} current={stage} done={done} onJump={() => {}} /></div>
      </header>
      <div className="px-4 pb-6 pt-5">{children}</div>
      <footer className="bg-white px-4 pb-4 pt-3 ring-1 ring-ink/[0.05]">
        <button type="button" className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-fuchsia-600 text-[15.5px] font-extrabold text-white">
          {cta ?? <>Next: {STAGES[idx + 1]?.label} <ArrowRight size={17} /></>}
        </button>
      </footer>
    </div>
  )
}

export const Page = ({ children, bg = '#fbfaff' }) => <div style={{ width: 390, margin: '0 auto', background: bg }}>{children}</div>
