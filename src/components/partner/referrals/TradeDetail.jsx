import { useRef, useState } from 'react'
import { Share2, UserPlus, Loader2 } from 'lucide-react'
import { tradeById } from '../../../lib/trades'
import {
  fetchReferralSummary, fetchReferrals, fetchInvites, createInvite, newIdempotencyKey,
} from '../../../lib/referrals'
import { FUNNEL, tradeRow, inviteStatus, inviteMessage, inviteLink } from '../../../lib/referralModel'
import { shareText, shareSaid } from '../../../lib/share'
import { track, EVENTS } from '../../../lib/track'
import { useLoad, LoadState, RefreshButton, Card, ListCard, Chip, CopyButton, fmtDate } from '../growth/parts'
import ReferralRow from './ReferralRow'

const INVITE_TONE = { open: 'submitted', claimed: 'good', expired: 'mute' }
const INVITE_LABEL = { open: 'Waiting', claimed: 'Signed up', expired: 'Expired' }

/**
 * One trade: its numbers, its invitations, its referrals.
 *
 * "Invite a partner" writes an invitation row BEFORE anything is shared
 * (create_referral_invite), so the code in the message is tied to this
 * trade and can be followed. The row is an invitation and is counted as
 * one; it becomes a referral only when somebody signs up with it.
 */
export default function TradeDetail({ tradeId, onOpenReferral }) {
  const trade = tradeById(tradeId)
  const summary = useLoad(fetchReferralSummary, [])
  const invites = useLoad(() => fetchInvites(tradeId), [tradeId])
  const referrals = useLoad(() => fetchReferrals({ tradeId }), [tradeId])
  const row = tradeRow(summary.data, tradeId)

  const refreshAll = () => { summary.reload(); invites.reload(); referrals.reload() }
  const busy = [summary, invites, referrals].some(x => x.status === 'refreshing')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-plum-50 px-2.5 py-1 font-mono text-[10.5px] font-bold text-plum-700 ring-1 ring-plum-100"
              data-testid="trade-id">{tradeId}</span>
        {summary.data && <RefreshButton onClick={refreshAll} busy={busy} />}
      </div>

      <InviteCard trade={trade} onCreated={() => { invites.reload({ quiet: true }); summary.reload({ quiet: true }) }} />

      <LoadState status={summary.status} error={summary.error} onRetry={summary.reload} what="this trade" />
      {summary.data && (
        <Card>
          <h2 className="text-[13px] font-extrabold text-ink">{trade.name}: progress</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {FUNNEL.map(f => (
              <div key={f.key} className="rounded-xl bg-page-sunk px-3 py-2" data-testid={`trade-${f.key}`}>
                <dt className="text-[10.5px] font-bold text-ink-mute">{f.label}</dt>
                <dd className="text-[17px] font-black tabular-nums text-ink">{row[f.key]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">Partners who signed up</h2>
        <LoadState status={referrals.status} error={referrals.error} onRetry={referrals.reload} what="referrals" />
        {referrals.data && (referrals.data.length ? (
          <ListCard>
            {referrals.data.map(r => <ReferralRow key={r.id} r={r} onOpen={() => onOpenReferral(r.id)} />)}
          </ListCard>
        ) : (
          <p className="rounded-[18px] bg-white p-4 text-[12.5px] leading-relaxed text-ink-mute ring-1 ring-ink/[0.06]">
            Nobody has signed up for {trade.name} with your codes yet.
          </p>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">Invitations sent</h2>
        <LoadState status={invites.status} error={invites.error} onRetry={invites.reload} what="invitations" />
        {invites.data && (invites.data.length ? (
          <ListCard>
            {invites.data.map(inv => <InviteRow key={inv.id} inv={inv} trade={trade} />)}
          </ListCard>
        ) : (
          <p className="rounded-[18px] bg-white p-4 text-[12.5px] leading-relaxed text-ink-mute ring-1 ring-ink/[0.06]">
            No invitations for {trade.name} yet.
          </p>
        ))}
      </section>
    </div>
  )
}

function InviteCard({ trade, onCreated }) {
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [said, setSaid] = useState(null)
  // Kept across retries of one press, so a dropped connection cannot make
  // two invitations; replaced only once one has been made.
  const key = useRef(newIdempotencyKey())

  async function make() {
    setBusy(true); setError(null)
    const res = await createInvite(trade.id, key.current)
    setBusy(false)
    if (res.error) {
      setError(res.says ?? (res.error === 'offline' ? 'You are offline. Nothing was created; try again.'
        : res.error === 'unavailable' ? 'Invitations are not switched on for your account yet.'
        : 'That did not work. Try again.'))
      return
    }
    setInvite(res.data)
    key.current = newIdempotencyKey()
    track(EVENTS.REFERRAL_STARTED, { kind: 'trade_invite', trade_id: trade.id })
    onCreated?.()
  }

  async function share() {
    track(EVENTS.REFERRAL_SHARED, { kind: 'trade_invite', trade_id: trade.id })
    const res = await shareText({
      title: `Join Sambramo as a ${trade.name} partner`,
      text: inviteMessage({ tradeName: trade.name, code: invite.code }),
      dialogTitle: `Invite a ${trade.name} partner`,
    })
    const msg = shareSaid(res.how)
    if (msg) { setSaid(msg); setTimeout(() => setSaid(null), 3000) }
  }

  return (
    <Card>
      <h2 className="text-[13px] font-extrabold text-ink">Invite a {trade.name} partner</h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">
        Each invitation has its own code for {trade.name}, works for one person, and lasts 60 days.
      </p>

      {invite ? (
        <div className="mt-3 space-y-2" data-testid="created-invite">
          <div className="flex items-center gap-2 rounded-[14px] bg-page-sunk px-3.5 py-3">
            <span className="flex-1 font-mono text-[17px] font-extrabold tracking-[0.14em] text-ink" data-testid="invite-code">{invite.code}</span>
            <CopyButton text={inviteMessage({ tradeName: trade.name, code: invite.code })} label="Copy invitation" />
          </div>
          <p className="break-all text-[10.5px] text-ink-mute">{inviteLink(invite.code)}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={share}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white active:scale-[0.98]">
              <Share2 size={14} /> Share invitation
            </button>
            <button type="button" onClick={() => setInvite(null)}
              className="inline-flex min-h-[40px] items-center rounded-full bg-white px-4 text-[12.5px] font-extrabold text-plum-700 ring-1 ring-plum-200">
              Invite someone else
            </button>
          </div>
          {said && <p className="text-[11.5px] font-semibold text-ink-mute">{said}</p>}
        </div>
      ) : (
        <button type="button" onClick={make} disabled={busy} data-testid="invite-button"
          className="mt-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white active:scale-[0.98] disabled:opacity-70">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          {busy ? 'Creating invitation…' : 'Invite a partner'}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-[11.5px] font-semibold text-rose-700">{error}</p>}
    </Card>
  )
}

function InviteRow({ inv, trade }) {
  const status = inviteStatus(inv)
  return (
    <div className="flex items-center gap-3 px-3.5 py-3" data-invite-code={inv.code}>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[13px] font-extrabold tracking-[0.1em] text-ink">{inv.code}</span>
        <span className="mt-0.5 block text-[11px] text-ink-mute">
          Sent {fmtDate(inv.created_at)}{status === 'open' ? ` · until ${fmtDate(inv.expires_at)}` : ''}
          {status === 'claimed' ? ` · joined ${fmtDate(inv.claimed_at)}` : ''}
        </span>
      </span>
      <Chip tone={INVITE_TONE[status]}>{INVITE_LABEL[status]}</Chip>
      {status === 'open' && (
        <CopyButton text={inviteMessage({ tradeName: trade.name, code: inv.code })} label="Copy" />
      )}
    </div>
  )
}
