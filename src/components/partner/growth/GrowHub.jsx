import { useEffect, useState } from 'react'
import {
  ClipboardCheck, Sparkles, Store, IndianRupee, Navigation, CalendarDays,
  ShieldCheck, Gift, ArrowRight, Zap,
} from 'lucide-react'
import { STATUS_LABEL, jobReadiness, nextActions } from '../../../lib/profileCompletion'
import { fetchReferralSummary } from '../../../lib/referrals'
import { totalsOf } from '../../../lib/referralModel'
import { Card, ListCard, DetailRow } from './parts'

/**
 * Grow with Sambramo: what stands between this partner and more work.
 *
 * Not the profile checklist (that is Build Your Profile) and not the
 * referral screen (that is Trade Champion 26). This is the business
 * view: can you be sent a job today, what is your listing doing, where
 * do you reach — each row a real value and a door to the screen that
 * changes it. No percentages that nothing computes, no growth numbers
 * nothing measured.
 */
export default function GrowHub({ checklist, vendor, listings, onGo, onRefresh }) {
  useEffect(() => { onRefresh?.() }, [onRefresh])

  const [referrals, setReferrals] = useState(null)
  useEffect(() => {
    let alive = true
    fetchReferralSummary().then(res => { if (alive && res.data) setReferrals(totalsOf(res.data)) })
    return () => { alive = false }
  }, [])

  const item = key => checklist.items.find(i => i.key === key)
  const readiness = jobReadiness({ vendor, listings })
  const next = nextActions(checklist)
  const rows = listings ?? []
  const byStatus = rows.reduce((m, l) => ({ ...m, [l.status]: (m[l.status] ?? 0) + 1 }), {})
  const listingLine = !rows.length ? 'No trades listed yet'
    : Object.entries(byStatus).map(([s, n]) => `${n} ${s.replace('_', ' ')}`).join(' · ')

  const row = (key, icon, label, to, override = {}) => {
    const i = item(key)
    return (
      <DetailRow key={label} testId={`grow-${key}`} icon={icon} label={label}
        detail={override.detail ?? i?.detail}
        chip={override.chip ?? STATUS_LABEL[i?.status]} tone={override.tone ?? i?.status}
        onClick={() => onGo(to ?? i.to)} />
    )
  }

  return (
    <div className="space-y-3">
      <Card>
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-plum-700">
          <Zap size={12} /> Job readiness
        </p>
        <h2 className="mt-1 text-[15px] font-extrabold text-ink" data-testid="grow-ready">
          {readiness.ready ? 'You can be sent jobs today' : 'Not receiving jobs yet'}
        </h2>
        {!readiness.ready && (
          <ul className="mt-2 space-y-1.5">
            {readiness.missing.map(m => (
              <li key={m.key}>
                <button type="button" onClick={() => onGo(m.to)}
                  className="flex min-h-[36px] w-full items-center justify-between gap-2 rounded-xl bg-page-sunk px-3 text-left text-[12.5px] font-bold text-ink">
                  {m.label} <ArrowRight size={14} className="text-plum-700" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {next.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">Do next</h2>
          <ListCard>
            {next.map(i => (
              <DetailRow key={i.key} testId={`next-${i.key}`} icon={ClipboardCheck} label={i.label}
                detail={i.detail} chip={STATUS_LABEL[i.status]} tone={i.status} onClick={() => onGo(i.to)} />
            ))}
          </ListCard>
        </section>
      )}

      <section className="space-y-1.5">
        <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">Your business on Sambramo</h2>
        <ListCard>
          <DetailRow testId="grow-profile" icon={ClipboardCheck} label="Profile completion"
            detail={`${checklist.done} of ${checklist.total} complete`}
            chip={checklist.done === checklist.total ? 'Complete' : 'Open checklist'}
            tone={checklist.done === checklist.total ? 'complete' : 'submitted'}
            onClick={() => onGo({ screen: 'buildprofile' })} />
          {row('business', Sparkles, 'Business profile')}
          {row('trades', Store, 'Trade listings', { screen: 'services' }, { detail: listingLine })}
          {row('pricing', IndianRupee, 'Add and manage services', { screen: 'services' })}
          {row('area', Navigation, 'Service area coverage')}
          {row('availability', CalendarDays, 'Availability', null, {
            detail: vendor?.accepting_jobs === false ? 'Job alerts are paused' : item('availability')?.detail,
          })}
          {row('verification', ShieldCheck, 'Verification')}
        </ListCard>
      </section>

      <section className="space-y-1.5">
        <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">Grow your network</h2>
        <ListCard>
          <DetailRow testId="grow-referral" icon={Gift} label="Trade Champion 26"
            detail={referrals
              ? `${referrals.registered} signed up · ${referrals.live} live · ${referrals.invited} invitations`
              : 'Invite partners for any of the 26 trades'}
            onClick={() => onGo({ screen: 'referral' })} />
        </ListCard>
      </section>
    </div>
  )
}
