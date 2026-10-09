/**
 * /partner/payouts — the full-screen payout page.
 *
 * Setup status comes from Razorpay (via /api/anchor?op=route-setup), never
 * from a local flag. Earnings are read from the partner's own records:
 * accepted jobs (what they earned) and Route transfers (where that money
 * is). No state is shown that the backend did not record.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import PayoutFullScreen from '../../components/partner/payout/PayoutFullScreen'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/api'
import { authHeaders } from '../../lib/payLines'
import { useToast } from '../../context/ToastContext'

const STEP = { created: 'kyc', under_review: 'kyc', needs_clarification: 'kyc', activated: 'active', suspended: 'kyc', rejected: 'kyc' }

export default function Payouts() {
  const navigate = useNavigate()
  const toast = useToast()
  const [st, setSt] = useState(null)
  const [earn, setEarn] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const route = useCallback(async action => {
    const r = await fetch(apiUrl('/api/anchor?op=route-setup'), { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action }) })
    const body = await r.json().catch(() => ({}))
    return { ok: r.ok, body }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: vendor } = await supabase.from('vendors').select('id').eq('profile_id', user?.id).maybeSingle()
      const [s, offers, transfers] = await Promise.all([
        route('status'),
        supabase.from('dispatch_offers').select('line_id, partner_amount_paise').eq('vendor_id', vendor?.id).eq('status', 'ACCEPTED'),
        supabase.from('sambramo_route_transfers').select('amount_paise, status').eq('vendor_id', vendor?.id),
      ])
      /* Two queries, not an embed: offers and lines reference each other
         both ways, so PostgREST cannot tell which relationship to follow. */
      const ids = (offers.data ?? []).map(o => o.line_id)
      const { data: lines } = ids.length ? await supabase.from('booking_lines').select('id, status').in('id', ids) : { data: [] }
      const statusOf = Object.fromEntries((lines ?? []).map(l => [l.id, l.status]))
      if (!alive) return
      setSt(s.ok ? s.body : { error: s.body.error })
      const funded = (offers.data ?? []).filter(o => ['paid', 'in_progress', 'delivered', 'settled'].includes(statusOf[o.line_id]))
      const sum = (rows, f) => rows.filter(f).reduce((t, r) => t + Number(r.amount_paise ?? r.partner_amount_paise ?? 0), 0)
      const tr = transfers.data ?? []
      setEarn({
        recorded: sum(funded, () => true),
        collected: Math.round(sum(funded, () => true) / 0.92),
        not_eligible: sum(tr, t => t.status === 'on_hold' || t.status === 'pending'),
        eligible: 0,
        in_transfer: sum(tr, t => t.status === 'released'),
        paid: sum(tr, t => t.status === 'processed'),
        failed: sum(tr, t => t.status === 'failed'),
      })
    })()
    return () => { alive = false }
  }, [route])

  async function setup() {
    setBusy(true); setErr('')
    const r = await route('setup')
    setBusy(false)
    if (!r.ok) {
      setErr(r.body.error ?? 'Razorpay could not set this up.')
      if (r.body.step === 'bank' || r.body.step === 'pan') navigate('/partner/setup/bank')
      return
    }
    setSt(r.body)
    toast.success(r.body.route_status === 'activated' ? 'Payouts are active.' : 'Sent to Razorpay for verification.')
  }

  if (!st || !earn) return <div className="flex min-h-screen items-center justify-center bg-[#fbfaff]"><Loader2 className="animate-spin text-plum-600" /></div>

  const status = st.route_status
  const step = status ? STEP[status] ?? 'kyc' : 'started'
  const action = !status ? 'Set up Razorpay payouts to be paid automatically.'
    : status === 'needs_clarification' ? 'Razorpay needs more details. Tap to retry after updating Bank & payments.'
    : status === 'rejected' || status === 'suspended' ? `Razorpay ${status} this account. Contact Sambramo support.`
    : status !== 'activated' ? 'Razorpay is verifying your account. Tap to refresh.' : null

  return (
    <>
      <PayoutFullScreen
        setup={{ step, action: busy ? 'Working…' : (err || action) }}
        account={st.bank_last4 ? { bank: st.bank_name ?? 'Bank account', last4: st.bank_last4, verified_by: status === 'activated' ? 'Verified by Razorpay' : 'Being verified by Razorpay' } : null}
        earnings={earn}
        onBack={() => navigate(-1)}
        onFix={busy ? undefined : (status && status !== 'needs_clarification' ? async () => { const r = await route('status'); if (r.ok) setSt(r.body) } : setup)} />
    </>
  )
}
