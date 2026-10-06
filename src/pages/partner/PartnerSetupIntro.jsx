import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness, Layers3, MapPin, ShieldCheck, Landmark, Send,
  Check, Lock, Loader2, TriangleAlert, ArrowRight,
} from 'lucide-react'
import { usePartnerOnboarding } from '../../hooks/usePartnerOnboarding'
import { ensureVendorRow } from '../../lib/ensureVendor'
import InviteCodeEntry from '../../components/partner/referrals/InviteCodeEntry'

const ICON = {
  business: BriefcaseBusiness,
  services: Layers3,
  area: MapPin,
  compliance: ShieldCheck,
  bank: Landmark,
  review: Send,
}

const ROUTE = {
  business: '/partner/setup/details',
  services: '/partner/setup/services',
  area: '/partner/setup/area',
  compliance: '/partner/setup/compliance',
  bank: '/partner/setup/bank',
  review: '/partner/setup/review',
}

const TONE = {
  COMPLETE:        { ring: 'ring-forest-200', chip: 'bg-forest-50 text-forest-700', icon: 'bg-forest-600 text-white' },
  IN_PROGRESS:     { ring: 'ring-plum-300', chip: 'bg-plum-50 text-plum-700', icon: 'bg-plum-600 text-white' },
  AVAILABLE:       { ring: 'ring-plum-200', chip: 'bg-plum-50 text-plum-700', icon: 'bg-plum-600 text-white' },
  REQUIRES_ACTION: { ring: 'ring-amber-300', chip: 'bg-amber-50 text-amber-800', icon: 'bg-amber-500 text-white' },
  LOCKED:          { ring: 'ring-ink/[0.07]', chip: 'bg-ink/[0.05] text-ink-mute', icon: 'bg-ink/[0.06] text-ink-mute' },
}

const LABEL = {
  COMPLETE: 'Done',
  IN_PROGRESS: 'In progress',
  AVAILABLE: 'Start',
  REQUIRES_ACTION: 'Action needed',
  LOCKED: 'Locked',
}

export default function PartnerSetupIntro() {
  const navigate = useNavigate()
  const { loading, steps, current, done, profile, account, refresh } = usePartnerOnboarding()
  const ensuring = useRef(false)

  useEffect(() => {
    if (loading || ensuring.current || account?.vendor?.id) return
    ensuring.current = true
    ensureVendorRow({ profile })
      .then(result => { if (result.created) refresh() })
      .finally(() => { ensuring.current = false })
  }, [loading, account?.vendor?.id, profile, refresh])

  if (loading) {
    return (
      <div className="native-screen partner-v2-screen flex min-h-[100dvh] items-center justify-center bg-white">
        <Loader2 size={26} className="animate-spin text-plum-600" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0]
  const percent = steps.length ? Math.round(done / steps.length * 100) : 0
  const returning = done > 0

  return (
    <div className="native-screen partner-v2-screen flex min-h-[100dvh] flex-col bg-white">
      <main className="min-h-0 flex-1 overflow-y-auto partner-v2-container">
        <div className="pb-28 pt-7">
          <p className="partner-v2-meta">Partner setup · {done} of {steps.length} complete</p>
          <h1 className="mt-2 partner-v2-page-title">
            {returning ? <>Welcome back{firstName ? ', ' + firstName : ''}.<br />Let&apos;s finish your setup.</> : <>Let&apos;s get your business live.</>}
          </h1>
          <p className="mt-3 partner-v2-body">Complete the steps below to publish your partner profile and start receiving eligible opportunities.</p>

          <div className="mt-5 partner-v2-feature p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="partner-v2-meta">Setup progress</p>
                <p className="mt-1 text-[16px] font-black text-ink">{percent}% complete</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-ink-mute">Current step</p>
                <p className="mt-0.5 max-w-[170px] truncate text-[12px] font-extrabold text-plum-700">{current?.title}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500 transition-all" style={{ width: percent + '%' }} />
            </div>
          </div>

          <InviteCodeEntry vendorId={account?.vendor?.id} />

          <ol className="mt-5 space-y-2.5">
            {steps.map(step => {
              const Icon = ICON[step.id] || BriefcaseBusiness
              const tone = TONE[step.status] || TONE.LOCKED
              const locked = step.status === 'LOCKED'
              const currentRow = step.id === current.id
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    data-step={step.id}
                    data-status={step.status}
                    disabled={locked}
                    onClick={() => navigate(ROUTE[step.id])}
                    className={'partner-v2-card flex min-h-[82px] w-full items-center gap-3 p-3.5 text-left ring-1 ring-inset transition active:scale-[0.995] ' + tone.ring + (currentRow ? ' ring-2' : '') + (locked ? ' opacity-55' : '')}
                  >
                    <span className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ' + tone.icon}>
                      {step.status === 'COMPLETE' ? <Check size={18} strokeWidth={3} /> : locked ? <Lock size={16} /> : step.status === 'REQUIRES_ACTION' ? <TriangleAlert size={18} /> : <Icon size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-ink-mute">{step.n}</span>
                        <span className="truncate text-[14px] font-extrabold text-ink">{step.title}</span>
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-snug text-ink-mute">{step.detail ?? step.blurb}</span>
                    </span>
                    <span className={'partner-v2-chip shrink-0 ' + tone.chip}>{LABEL[step.status]}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </main>

      <div className="partner-v2-sticky-cta">
        <button type="button" data-cta="continue" onClick={() => navigate(ROUTE[current.id])} className="partner-v2-primary flex w-full items-center justify-center gap-2">
          <span>{returning ? 'Continue setup' : 'Start setup'}</span>
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}
