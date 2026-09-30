import { useMemo } from 'react'
import { Search } from 'lucide-react'
import { PARTNER_TRADES, tradeById } from '../../../lib/trades'
import { fetchReferralSummary, fetchReferrals } from '../../../lib/referrals'
import { FUNNEL, STATE_FILTERS, totalsOf, tradeRow } from '../../../lib/referralModel'
import { rewardLabel } from '../../../lib/promotions'
import { useLoad, LoadState, RefreshButton, Card, ListCard, fmtDate } from '../growth/parts'
import ReferralRow from './ReferralRow'
import TradeDetail from './TradeDetail'
import ReferralDetail from './ReferralDetail'
import PartnerCodeCard from './PartnerCodeCard'

/**
 * Trade Champion 26: the one referral destination.
 *
 * More → Referral & rewards, Earnings → Trade Champion 26, the Jobs card
 * and Grow with Sambramo all open this, with the same URL, so there is
 * one screen to fix and one to test.
 *
 * Which part is showing lives in the URL (VendorDashboard owns it):
 *
 *   ?screen=referral                         the dashboard
 *   ?screen=referral&trade=SBM-TRD-005       one trade
 *   ?screen=referral&rid=<uuid>              one referral
 *   &st=<state>&ft=<trade>&q=<text>          the list's filters
 *
 * so Android's back button walks back up through them, and returning
 * from a referral lands on the same filtered list.
 */
export default function TradeChampion({ view, onView }) {
  if (view.rid) return <ReferralDetail id={view.rid} onOpenTrade={id => onView({ trade: id })} />
  if (view.trade) {
    return tradeById(view.trade)
      ? <TradeDetail tradeId={view.trade} onOpenReferral={rid => onView({ rid, trade: view.trade })} />
      : <LoadState status="failed" error="error" />
  }
  return <Dashboard view={view} onView={onView} />
}

function Dashboard({ view, onView }) {
  const summary = useLoad(fetchReferralSummary, [])
  const s = summary.data
  const totals = useMemo(() => totalsOf(s), [s])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] leading-snug text-ink-mute">
          Invite professionals from any of the 26 trades and follow each one from sign-up to their first event.
        </p>
        {s && <RefreshButton onClick={() => summary.reload()} busy={summary.status === 'refreshing'} />}
      </div>

      <LoadState status={summary.status} error={summary.error} onRetry={summary.reload} what="your referrals" />

      {s && (
        <>
          <PartnerCodeCard code={s.code} />
          <CampaignCard campaign={s.campaign} />

          <Card>
            <h2 className="text-[13px] font-extrabold text-ink">Your referrals, all trades</h2>
            <p className="mt-1 text-[11px] text-ink-mute">
              Each number counts partners who reached that step. A share is not counted until somebody signs up with your code.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {FUNNEL.map(f => (
                <div key={f.key} className="rounded-xl bg-page-sunk px-3 py-2" data-testid={`total-${f.key}`}>
                  <dt className="text-[10.5px] font-bold text-ink-mute">{f.label}</dt>
                  <dd className="text-[17px] font-black tabular-nums text-ink">{totals[f.key]}</dd>
                </div>
              ))}
            </dl>
            {totals.not_eligible > 0 && (
              <p className="mt-2 text-[11px] text-ink-mute">
                {totals.not_eligible} sign-up{totals.not_eligible === 1 ? '' : 's'} with your code could not be counted.
              </p>
            )}
          </Card>

          <TradeGrid summary={s} onOpen={id => onView({ trade: id })} />
        </>
      )}

      <ReferralList view={view} onView={onView} enabled={!!s} />
    </div>
  )
}

function CampaignCard({ campaign }) {
  if (!campaign) {
    return (
      <Card>
        <h2 className="text-[13px] font-extrabold text-ink">No referral reward is running</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
          Your invitations and their progress are still recorded. Nothing is promised until Sambramo announces a campaign with its terms.
        </p>
      </Card>
    )
  }
  const reward = rewardLabel(campaign.reward_paise)
  const n = campaign.minimum_referrals ?? 1
  return (
    <Card>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-plum-700">Current campaign</p>
      <h2 className="mt-1 text-[14px] font-extrabold text-ink">{campaign.title}</h2>
      {campaign.body && <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{campaign.body}</p>}
      <ul className="mt-2 space-y-1 text-[12px] leading-snug text-ink-soft">
        <li>• A referral counts once that partner completes their first event on Sambramo{campaign.end_at ? `, before ${fmtDate(campaign.end_at)}` : ''}.</li>
        <li>• {n} counted referral{n === 1 ? '' : 's'} {reward ? `qualify you for ${reward}` : 'qualify you for this campaign’s reward'}.</li>
        <li>• Qualifying is not payment. A reward shows as paid only after the payout is made.</li>
      </ul>
      {campaign.terms_url && (
        <a href={campaign.terms_url} target="_blank" rel="noreferrer"
           className="mt-2 inline-block text-[11.5px] font-bold text-plum-700 underline">Full terms</a>
      )}
    </Card>
  )
}

/** The 26 trades, each a button to its own screen. */
function TradeGrid({ summary, onOpen }) {
  return (
    <Card>
      <h2 className="text-[13px] font-extrabold text-ink">Trade Champion 26</h2>
      <p className="mt-1 text-[11px] text-ink-mute">Tap a trade to invite a partner for it and follow their progress.</p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="trade-grid">
        {PARTNER_TRADES.map((t, i) => {
          const r = tradeRow(summary, t.id)
          const line = r.registered
            ? `${r.registered} signed up${r.live ? ` · ${r.live} live` : ''}`
            : r.invited ? `${r.invited} invited` : 'No invitations yet'
          return (
            <button key={t.id} type="button" onClick={() => onOpen(t.id)}
              data-trade-id={t.id} aria-label={`${t.name}: ${line}`}
              className="flex min-h-[58px] items-start gap-2 rounded-xl bg-page-sunk px-2.5 py-2 text-left ring-1 ring-transparent transition active:scale-[0.98] active:ring-plum-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-plum-100 text-[10px] font-black text-plum-700">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-bold leading-tight text-ink">{t.name}</span>
                <span className="mt-0.5 block text-[10.5px] text-ink-mute">{line}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function ReferralList({ view, onView, enabled }) {
  const list = useLoad(
    () => (enabled ? fetchReferrals({ tradeId: view.ft || null, state: view.st || null }) : Promise.resolve({ data: [] })),
    [enabled, view.ft, view.st],
  )
  const q = (view.q ?? '').trim().toLowerCase()
  const rows = (list.data ?? []).filter(r => !q
    || [r.referred_name, r.trade_name, r.invite_code].some(v => (v ?? '').toLowerCase().includes(q)))
  const setFilter = patch => onView({ st: view.st, ft: view.ft, q: view.q, ...patch }, { replace: true })

  if (!enabled) return null
  return (
    <section className="space-y-2">
      <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">Each referral</h2>

      <div className="space-y-2 rounded-[18px] bg-white p-3 ring-1 ring-ink/[0.07]">
        <label className="flex items-center gap-2 rounded-xl bg-page-sunk px-3">
          <Search size={14} className="text-ink-mute" />
          <input value={view.q ?? ''} onChange={e => setFilter({ q: e.target.value || null })}
            placeholder="Search by name, trade or code" aria-label="Search referrals"
            className="min-h-[38px] w-full bg-transparent text-[13px] text-ink outline-none" />
        </label>
        <select value={view.ft ?? ''} onChange={e => setFilter({ ft: e.target.value || null })}
          aria-label="Filter by trade"
          className="min-h-[38px] w-full rounded-xl bg-page-sunk px-3 text-[13px] font-semibold text-ink">
          <option value="">All trades</option>
          {PARTNER_TRADES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filter by stage">
          {STATE_FILTERS.map(f => {
            const on = (view.st ?? null) === f.key
            return (
              <button key={f.label} type="button" aria-pressed={on} onClick={() => setFilter({ st: f.key })}
                className={`min-h-[32px] shrink-0 rounded-full px-3 text-[11.5px] font-extrabold ${on ? 'bg-plum-600 text-white' : 'bg-page-sunk text-ink-soft'}`}>
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <LoadState status={list.status} error={list.error} onRetry={list.reload} what="referrals" />

      {list.status !== 'loading' && list.data && (rows.length ? (
        <ListCard>
          {rows.map(r => <ReferralRow key={r.id} r={r} onOpen={() => onView({ rid: r.id })} />)}
        </ListCard>
      ) : (
        <p className="rounded-[18px] bg-white p-4 text-[12.5px] leading-relaxed text-ink-mute ring-1 ring-ink/[0.06]">
          {view.st || view.ft || q
            ? 'No referrals match these filters.'
            : 'Nobody has signed up with your codes yet. Open a trade above to send an invitation.'}
        </p>
      ))}
    </section>
  )
}
