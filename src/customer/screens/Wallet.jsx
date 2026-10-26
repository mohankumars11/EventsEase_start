/**
 * Celebration Wallet (Mohan's reference: Blinkit Money, 2026-10-26).
 *
 * The screen is ready; the money behind it is not. There is no customer
 * wallet ledger yet — payments go straight through Razorpay into escrow
 * and refunds return to the original method — so the balance reads ₹0,
 * the benefits are labelled as coming, and Add Money says so instead of
 * taking money it has nowhere to keep. When the ledger exists, `balance`
 * and `addMoney` are the only two things to wire.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, IndianRupee, RotateCcw, Smartphone, Wallet as WalletIcon } from 'lucide-react'

const PERKS = [
  [Smartphone, 'Single-tap payments', 'Pay for a master without waiting for an OTP.'],
  [RotateCcw, 'Instant refunds', 'Cancellations come back to your wallet in seconds.'],
  [Gift, 'Gift cards', 'Gift a celebration — they spend it on any master.'],
]

export default function Wallet() {
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const balance = 0

  return (
    <main className="cx-enter min-h-[100dvh] bg-gradient-to-b from-[#EBDDFF] via-[#F4ECFF] to-white pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
      <header className="cx-safe-top flex items-center justify-between px-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white/80 text-[var(--ink)]"><ArrowLeft size={20} /></button>
      </header>

      <section className="flex flex-col items-center px-6 pt-2 text-center">
        <span className="grid h-24 w-24 rotate-[-8deg] place-items-center rounded-[28px] bg-gradient-to-br from-[#8B5CF6] to-[#5B21B6] text-white shadow-[0_22px_40px_-18px_rgba(91,33,182,.9)]">
          <WalletIcon size={46} strokeWidth={1.8} />
        </span>
        <p className="mt-5 text-[13px] font-extrabold uppercase tracking-[0.3em] text-[#5B21B6]">Celebration</p>
        <h1 className="text-[44px] font-black leading-none tracking-[0.06em] text-[#1C1033]">WALLET</h1>
        <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">Balance</p>
        <p className="cx-num flex items-center text-[34px] font-black tracking-[-0.03em]"><IndianRupee size={26} strokeWidth={3} />{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      </section>

      <section className="mt-6 space-y-2.5 px-4">
        <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7C3AED]">Coming to your wallet</p>
        {PERKS.map(([I, t, d]) => (
          <div key={t} className="flex items-center gap-3.5 rounded-[20px] bg-white/80 p-3.5 shadow-[0_0_0_1px_#EADFFB]">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-white text-[#5B21B6] shadow-[0_6px_16px_-10px_rgba(91,33,182,.6)]"><I size={26} strokeWidth={1.8} /></span>
            <span><span className="block text-[16px] font-extrabold tracking-[-0.02em]">{t}</span><span className="block text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">{d}</span></span>
          </div>
        ))}
      </section>

      <div className="px-4 pt-6">
        <button type="button" onClick={() => setNote('Wallet top-ups open soon. Until then, pay at checkout — refunds go back to the way you paid.')}
          className="cx-press flex h-14 w-full items-center justify-center rounded-[16px] bg-[#0C831F] text-[16px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(12,131,31,.9)]" data-add-money>Add Money</button>
        {note && <p className="mt-3 rounded-[14px] bg-[#E9F8EF] px-3.5 py-2.5 text-center text-[12.5px] font-bold text-[#0B6B3D]">{note}</p>}
        <button type="button" onClick={() => setNote('Gift cards arrive with the wallet.')} className="cx-press mt-3 flex w-full items-center gap-3 rounded-[18px] bg-white p-3.5 text-left shadow-[0_0_0_1px_#EEE6FA]">
          <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[#FFF1E6] text-[#EA580C]"><Gift size={20} /></span>
          <span className="flex-1"><span className="block text-[14.5px] font-extrabold">Claim gift card</span><span className="block text-[12px] font-semibold text-[var(--ink-3)]">Enter a gift card to add it to your wallet</span></span>
        </button>
      </div>
      <p className="mt-10 px-6 text-center text-[30px] font-black leading-tight tracking-[-0.04em] text-[#E6DDF6]">Celebrate with<br />one tap.</p>
    </main>
  )
}
