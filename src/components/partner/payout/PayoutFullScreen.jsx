/**
 * Payouts, full screen, behind VITE_FF_PAYOUT_FULLSCREEN.
 *
 * Two separate things, never blurred: whether Razorpay can pay this
 * partner (Route linked-account setup), and where each rupee of their
 * earnings is. Every state shown is one the backend recorded from a
 * Razorpay response; nothing here says "paid" because a screen animated.
 */
import RazorpayBadge from './RazorpayBadge'
import { ArrowLeft, Check, Landmark, CircleAlert, Hourglass, Banknote, ArrowLeftRight, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { rupees } from '../../../lib/tierPackages'

const SETUP = ['started', 'kyc', 'bank', 'active']
const SETUP_LABEL = { started: 'Started', kyc: 'Verification', bank: 'Bank', active: 'Active' }

export default function PayoutFullScreen({ setup, account, earnings, onBack, onFix, embedded }) {
  const at = SETUP.indexOf(setup.step)
  return (
    <div className={`${embedded ? 'relative' : 'fixed inset-0 z-[96] overflow-y-auto'} bg-[#fbfaff]`}>
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white/90 px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] backdrop-blur-xl ring-1 ring-ink/[0.05]">
        <button type="button" onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70"><ArrowLeft size={20} /></button>
        <p className="flex-1 text-[16px] font-extrabold text-ink">Payouts</p>
      </header>

      <div className="space-y-3 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4">
        <div className="rounded-[22px] bg-white p-4 ring-1 ring-ink/[0.07]">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/45">Payout setup</p>
          <div className="relative mt-4 flex justify-between">
            <div className="absolute left-4 right-4 top-[13px] h-[3px] rounded-full bg-ink/[0.08]">
              <motion.div className="h-full rounded-full bg-forest-500" animate={{ width: `${(Math.max(at, 0) / (SETUP.length - 1)) * 100}%` }} />
            </div>
            {SETUP.map((s, i) => (
              <div key={s} className="relative flex w-16 flex-col items-center">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${i < at || (i === at && setup.step === 'active') ? 'bg-forest-600 text-white' : i === at ? 'bg-plum-700 text-white ring-4 ring-plum-100' : 'bg-white text-ink/40 ring-2 ring-ink/10'}`}>
                  {i < at || (i === at && setup.step === 'active') ? <Check size={14} strokeWidth={3.5} /> : i + 1}
                </span>
                <span className="mt-1 text-[10px] font-bold text-ink/55">{SETUP_LABEL[s]}</span>
              </div>
            ))}
          </div>
          {account && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#faf9fd] p-3 ring-1 ring-ink/[0.05]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><Landmark size={18} /></span>
              <div className="flex-1">
                <p className="text-[13.5px] font-extrabold">{account.bank} ••••{account.last4}</p>
                <p className="flex items-center gap-1 text-[11.5px] font-bold text-forest-700"><ShieldCheck size={12} /> {account.verified_by}</p>
              </div>
            </div>
          )}
          {setup.action && (
            <button type="button" onClick={onFix} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-amber-50 p-3 text-left ring-1 ring-amber-200">
              <CircleAlert size={16} className="shrink-0 text-amber-700" />
              <span className="flex-1 text-[12.5px] font-bold text-amber-900">{setup.action}</span>
              <span className="text-[12px] font-extrabold text-amber-800">Fix ›</span>
            </button>
          )}
        </div>

        <div className="rounded-[22px] bg-gradient-to-br from-plum-800 to-plum-950 p-4 text-white">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-200">Your earnings</p>
          <p className="mt-2 text-[30px] font-extrabold leading-none">{rupees(earnings.recorded)}</p>
          <p className="mt-1 text-[12px] text-plum-200">earned from {rupees(earnings.collected)} customers paid</p>
        </div>

        <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.07]">
          {[
            [Hourglass, 'Not yet eligible', earnings.not_eligible, 'Released after the event is delivered', 'text-ink/60'],
            [Check, 'Eligible for payout', earnings.eligible, 'Will be sent in the next transfer', 'text-forest-700'],
            [ArrowLeftRight, 'Transfer in progress', earnings.in_transfer, 'With Razorpay, usually 1–2 working days', 'text-plum-700'],
            [Banknote, 'Paid to your bank', earnings.paid, 'Confirmed by Razorpay', 'text-forest-700'],
            [CircleAlert, 'Failed, action needed', earnings.failed, 'Check your bank details', 'text-rose-600'],
          ].map(([Icon, label, paise, note, tint]) => (
            <div key={label} className="flex items-center gap-3 border-b border-ink/[0.05] px-4 py-3 last:border-0">
              <Icon size={17} className={tint} />
              <div className="flex-1"><p className="text-[13.5px] font-bold text-ink">{label}</p><p className="text-[11px] text-ink/45">{note}</p></div>
              <span className={`text-[14px] font-extrabold ${paise ? 'text-ink' : 'text-ink/30'}`}>{rupees(paise)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center"><RazorpayBadge /></div>
        <p className="px-2 text-center text-[11.5px] leading-snug text-ink/45">Payouts are made by Razorpay to your linked bank account. Timing depends on Razorpay and your bank.</p>
      </div>
    </div>
  )
}
