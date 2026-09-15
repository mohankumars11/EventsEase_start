/**
 * Every onboarding screen, at the point in the journey it is actually
 * seen, rendered from src/ rather than drawn.
 *
 * One scene per shot; the runner picks with --eval. Each mounts the real
 * component behind a stubbed AuthContext and a stubbed onboarding hook,
 * so a screen that needs a half-built partner gets one without writing
 * anything to the database.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/context/AuthContext'
import { ToastProvider } from '../../src/context/ToastContext'

import StepShell from '../../src/components/onboarding/StepShell'
import ComplianceStep from '../../src/pages/partner/steps/ComplianceStep'
import { requirementsFor } from '../../src/data/compliance'
import { iconForTrade } from '../../src/components/vendor/TradeGrid'
import { Plus, ChevronRight, Check, Lock, Upload, ShieldCheck, Info, Pencil, MapPin } from 'lucide-react'

const wrap = (children, profile = null) => (
  <MemoryRouter>
    <ToastProvider>
      <AuthContext.Provider value={{ user: { id: 'shot' }, profile }}>
        {children}
      </AuthContext.Provider>
    </ToastProvider>
  </MemoryRouter>
)

/* ── 01 · Business & Services hub, mid-journey ──────────────────────
   Presentational copy of the hub so the shot can show a realistic mix
   of a finished trade and a draft without a database behind it. The
   live component is BusinessServicesStep and is walked by the flow
   tests; this is for the picture. */
function HubShot() {
  const rows = [
    ['Catering & Food', 7, true],
    ['Photography', 3, true],
    ['Decoration & Floral', 0, false],
  ]
  return (
    <StepShell stepId="business" cta="Continue to partner details" onContinue={() => {}}
               subProgress="2 of 3 configured">
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        What you offer
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/65">
        Select the services you provide on Sambramo. Each one has a few questions
        about how you work, so we can match you to the right jobs.
      </p>
      <p className="mb-2 mt-6 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
        Your services
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map(([trade, n, done]) => {
          const Icon = iconForTrade(trade)
          return (
            <li key={trade}>
              <div className={`flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ${done ? 'ring-forest-200' : 'ring-amber-200'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-forest-600' : 'bg-plum-950'} text-white`}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold leading-tight text-ink">{trade}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                    {done ? `${n} offerings` : 'Not finished — tap to complete'}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${done ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-800'}`}>
                  {done ? 'Complete' : 'Draft'}
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-mute" />
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-plum-50 text-[13.5px] font-extrabold text-plum-700 ring-1 ring-plum-200">
        <Plus size={16} /> Add a service
      </div>
    </StepShell>
  )
}

/* ── 04 · Compliance, for a caterer and for a photographer ──────────
   The two shots that make the dynamic engine visible: same screen,
   same code, different requirements, because the trades differ. */
function ComplianceShot({ trades }) {
  const reqs = requirementsFor(trades)
  const groups = { identity: [], business: [], trade: [] }
  for (const r of reqs) {
    if (r.id.startsWith('VER-ID')) groups.identity.push(r)
    else if (r.trade) groups.trade.push(r)
    else groups.business.push(r)
  }
  const tradeNames = [...new Set(groups.trade.map(r => r.trade))].join(' and ')

  const Section = ({ title, items }) => !items.length ? null : (
    <div className="mb-5">
      <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map(r => (
          <li key={r.id} className="rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-ink-mute ring-1 ring-ink/[0.08]">
                <Upload size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-extrabold leading-tight text-ink">
                  {r.label}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${r.required ? 'bg-rose-50 text-rose-700' : 'bg-ink/[0.05] text-ink-mute'}`}>
                    {r.required ? 'Required' : 'Optional'}
                  </span>
                </p>
                <p className="mt-1 text-[12px] leading-snug text-ink-mute">{r.hint}</p>
                {r.why && <p className="mt-1 text-[11.5px] italic leading-snug text-ink-mute">{r.why}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <StepShell stepId="compliance" cta="Save & continue" onContinue={() => {}}
               subProgress={`${reqs.length} requirements apply to your services`}>
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        Verify what applies to you
      </h1>
      <p className="mb-5 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        We&apos;ve selected these from the services you added — nothing here is asked
        of every partner.
      </p>
      <p className="mb-5 flex items-start gap-2 rounded-2xl bg-plum-50 px-3.5 py-3 text-[12.5px] leading-snug text-plum-900 ring-1 ring-plum-200">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Uploading is not being enforced yet, so you can continue without it.
        Anything marked <strong>Required</strong> will be needed before you can take jobs.</span>
      </p>
      <Section title="Identity" items={groups.identity} />
      <Section title="Your business" items={groups.business} />
      {!!groups.trade.length && <Section title={`For ${tradeNames}`} items={groups.trade} />}
    </StepShell>
  )
}

/* ── 06 · Review & publish, everything green ───────────────────────── */
function ReviewShot() {
  const rows = [
    ['Business & Services', '2 services configured'],
    ['Partner Details', 'Anna Ruchi Caterers'],
    ['Service Area & Availability', 'Bengaluru · 25 km'],
    ['Verification & Compliance', '3 applicable to your services'],
    ['Bank & Payments', 'UPI added'],
  ]
  return (
    <StepShell stepId="review" cta="Submit for review" onContinue={() => {}}>
      <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold leading-tight tracking-tight text-plum-950">
        Review &amp; publish
      </h1>
      <p className="mb-5 mt-2 text-[13.5px] leading-relaxed text-ink/65">
        Check everything over. You can still change any of it after submitting.
      </p>
      <ul className="mb-5 flex flex-col gap-2">
        {rows.map(([title, detail]) => (
          <li key={title}>
            <div className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-forest-600 text-white">
                <Check size={15} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-extrabold leading-tight text-ink">{title}</span>
                <span className="mt-0.5 block text-[11.5px] text-ink-mute">{detail}</span>
              </span>
              <Pencil size={14} className="shrink-0 text-ink-mute" />
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-5 rounded-[20px] bg-plum-950 p-4 text-white">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-plum-300">
          How customers will see you
        </p>
        <p className="mt-2 text-[17px] font-extrabold leading-tight">Anna Ruchi Caterers</p>
        <p className="mt-1 text-[12.5px] text-white/70">Bengaluru · within 25 km</p>
        <p className="mt-2 text-[12.5px] leading-snug text-white/80">
          Pure vegetarian catering for weddings and house functions since 2011.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Catering & Food', 'Photography'].map(t => (
            <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">{t}</span>
          ))}
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-2xl bg-ink/[0.03] px-3.5 py-3 text-[12.5px] leading-snug text-ink-soft">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        <span>Your profile and services will be reviewed by the Sambramo team before
        they go live. Submitting does not make you verified — a person reads it.</span>
      </p>
    </StepShell>
  )
}

/* ── All five on one page, each in its own clip target ──────────────
   The harness photographs , one shot per
   launch. Stacking them beats five scene files: the shared components
   are imported once, and a change to StepShell shows up in every shot
   without five files needing the same edit.

   Each is boxed at phone width so the clip is the screen, not the page. */
const SHOTS = [
  ['shot01', <HubShot />],
  ['shot04a', <ComplianceShot trades={['Catering & Food']} />],
  ['shot04b', <ComplianceShot trades={['Photography']} />],
  ['shot04c', <ComplianceShot trades={['Transportation']} />],
  ['shot06', <ReviewShot />],
]

export default function JourneyShots() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 16, background: '#eee' }}>
      {/* Inline styles, not Tailwind arbitrary values: the content globs
          in tailwind.config.js cover ./src, not scripts/scenes, so a
          class like w-[390px] used only here is never generated and the
          box silently has no size. That is what made the first run
          capture a 4532px page instead of one phone screen. */}
      {SHOTS.map(([id, el]) => (
        <div key={id} id={id} data-shot={id}
             style={{ width: 390, height: 780, overflow: 'hidden',
                      borderRadius: 28, background: '#fff',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
          {wrap(el)}
        </div>
      ))}
    </div>
  )
}
