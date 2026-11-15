/**
 * /rewards (and /wallet) — every reward the customer holds.
 *
 * The welcome scratch cards (a free first invitation, 25% off the first
 * booking) as tickets with their code, validity and a "Use now" that goes
 * where they are used; Sambramo credit (cancellations paid out as credit
 * land here once the credit ledger exists — it reads ₹0 until then, and
 * says so); refer & earn; gift cards to come. Nothing here claims money
 * that is not there.
 */
import { copyText } from '../lib/share'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Copy, Gift, IndianRupee, Loader2, Ticket } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BackHeader } from '../ui/kit'
import { claimWelcome, daysLeft, myVouchers, usable, welcomeFine } from '../lib/rewards'

export default function Wallet() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [copied, setCopied] = useState('')
  useEffect(() => {
    if (!user) { setList([]); return }
    myVouchers(user.id).then(l => (l.length ? l : claimWelcome(user.id))).then(setList).catch(() => setList([]))
  }, [user])
  const copy = async c => { if (await copyText(c)) { setCopied(c); setTimeout(() => setCopied(''), 1500) } }

  return (
    <main className="cx-enter min-h-[100dvh] bg-white pb-[calc(env(safe-area-inset-bottom,0px)+40px)]" data-rewards-wallet>
      <BackHeader title="Rewards" sub="Vouchers, credit and gifts" />
      <section className="mx-3 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FFFFFF] via-[#F6F0FF] to-[#FFF1F8] p-5 text-[#1B0B33] shadow-[0_18px_36px_-26px_rgba(91,33,168,.7)] ring-1 ring-[#E9DDFB]">
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#5B21A8]"><IndianRupee size={14} /><span className="cx-brand text-[12px]">Sambramo</span> credit</p>
        <p className="cx-num mt-1 text-[38px] font-black leading-none tracking-[-0.03em] text-[#3B1670]">₹0</p>
        <p className="mt-1.5 text-[12.5px] font-semibold text-[#5B4A72]">Cancellation credit and referral rewards land here, ready for any booking.</p>
      </section>

      <p className="mx-4 mt-5 text-[15px] font-extrabold">Your vouchers</p>
      <div className="mt-2 space-y-2.5 px-3">
        {list === null && <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-[var(--brand)]" /></div>}
        {list?.length === 0 && <p className="rounded-[18px] bg-white p-4 text-[13px] font-semibold text-[var(--ink-3)]">Sign in to collect your welcome scratch cards.</p>}
        {list?.map(v => {
          const ok = usable(v), rsvp = v.kind === 'free_rsvp'
          return (
            <div key={v.id} className={'relative flex overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#EFE7DD] ' + (ok ? '' : 'opacity-60')} data-voucher={v.kind}>
              <div className={'flex w-[30%] shrink-0 flex-col items-center justify-center p-3 text-center ' + (rsvp ? 'bg-gradient-to-b from-[#FDF2F8] to-[#FCE7F3] text-[#9D174D]' : 'bg-gradient-to-b from-[#FFF8E7] to-[#FFEDD0] text-[#9A3412]')}>
                <span className="text-[26px]">{rsvp ? '💌' : '🎉'}</span>
                <span className="text-[24px] font-black leading-none">{rsvp ? 'FREE' : `${v.terms?.pct ?? 25}%`}</span>
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em]">{rsvp ? 'RSVP' : 'OFF'}</span>
              </div>
              <span aria-hidden className="absolute left-[30%] top-0 h-full border-l-2 border-dashed border-[#EFE7DD]" />
              <div className="min-w-0 flex-1 p-3.5">
                <p className="text-[14.5px] font-black text-[#1C1033]">{v.title}</p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-[var(--ink-3)]">{rsvp ? (v.terms?.what ?? 'Your first invitation') : welcomeFine}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={() => copy(v.code)} className="cx-code flex items-center gap-1 rounded-full border border-dashed border-[#D6CDE4] px-2.5 py-1 text-[11.5px] text-[#5B21B6]">{copied === v.code ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}{v.code}</button>
                  <span className="text-[11px] font-bold text-[var(--ink-3)]">{ok ? (daysLeft(v) != null ? `${daysLeft(v)} days left` : '') : v.status === 'used' ? 'Used' : 'Expired'}</span>
                </div>
                {ok && <button type="button" onClick={() => navigate(rsvp ? '/invites/new' : '/explore')} className="cx-press cx-cta mt-2.5 h-10 rounded-full px-4 text-[12.5px] font-extrabold" data-use-voucher={v.kind}>{rsvp ? 'Create my invitation' : 'Book my first celebration'}</button>}
                {!rsvp && ok && <p className="mt-1.5 text-[10.5px] font-semibold text-[var(--ink-3)]">Saved to your account for your first booking.</p>}
              </div>
            </div>
          )
        })}
      </div>

      <Link to="/refer" className="cx-press mx-3 mt-4 flex items-center gap-3 rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_#EFE7DD]">
        <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#F3ECFF] text-[#7C3AED]"><Ticket size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold">Refer & earn</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">Friends get 25% off and a free invitation</span></span>
        <ChevronRight size={18} className="text-[var(--brand)]" />
      </Link>
      <div className="mx-3 mt-2.5 flex items-center gap-3 rounded-[22px] bg-gradient-to-r from-[#FFF4DA] to-[#FDE2F0] p-4">
        <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-white text-[#B45309]"><Gift size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold text-[#5A3B12]">Gift cards</span><span className="block text-[12px] font-semibold text-[#8A5A1A]">Coming soon — gift a celebration to someone you love.</span></span>
      </div>
      <p className="mx-4 mt-3 text-center text-[11px] font-semibold text-[var(--ink-3)]">One welcome offer per person. <Link to="/legal/terms" className="font-extrabold text-[var(--brand)]">Offer terms</Link></p>
    </main>
  )
}
