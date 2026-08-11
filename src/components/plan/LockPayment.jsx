import { useState, useEffect } from 'react'
import { ShieldCheck, Copy, Check, AlertTriangle, MessageCircle } from 'lucide-react'
import {
  IS_CONFIGURED as UPI_CONFIGURED, UPI_ID, buildAppUpiLinks, generateQrDataUrl,
} from '../../lib/payment/upiProvider'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../shop/UpiAppIcons'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'
import { BRAND } from '../../config/sambramo'
import { formatINR } from '../../utils/format'

/**
 * Hold the quote and the date for ₹1,000.
 *
 * ── What this is careful about ──────────────────────────────────────────
 * There is no payment gateway in this app. UPI here is a deep link straight
 * to Sambramo's own UPI ID with no callback and no webhook, exactly as
 * lib/payment/upiProvider.js says on its first line — so nothing on this
 * screen can know whether money actually arrived. "I have paid" therefore
 * records a CLAIM, not a payment, and the copy says so: the enquiry moves to
 * `lock_payment_status = 'claimed'` and an admin confirms it against the bank
 * before anybody treats the date as held.
 *
 * Writing "Payment successful ✓" here would be a lie the app cannot verify,
 * and it is the same trap `testPaymentProvider` was disabled for in
 * production. Same rule, same reason.
 *
 * ── And what it refuses to do ───────────────────────────────────────────
 * If UPI is not configured, this shows an honest hand-off to WhatsApp rather
 * than a button that pretends. Sambramo is pre-launch with no signed supplier,
 * so the money is explicitly described as refundable and as adjusted against
 * the final invoice — if either stops being true, this copy and LOCK_AMOUNT
 * change together.
 */
export default function LockPayment({ enquiryId, quote, onClaimed, onSkip }) {
  const [links, setLinks] = useState(null)
  const [qr, setQr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const reference = enquiryId ? enquiryId.slice(0, 8).toUpperCase() : ''

  useEffect(() => {
    if (!UPI_CONFIGURED || !enquiryId) return
    const built = buildAppUpiLinks({
      amount: LOCK_AMOUNT,
      note: `Sambramo hold ${reference}`,
      txnRef: enquiryId,
    })
    setLinks(built)
    generateQrDataUrl(built.upi).then(setQr).catch(() => setQr(null))
  }, [enquiryId, reference])

  function copyId() {
    navigator.clipboard?.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function claim() {
    setClaiming(true)
    await onClaimed()
    setClaiming(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-5 bg-gradient-to-br from-saffron-500 to-amber-500 text-white">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/80 font-semibold">
          <ShieldCheck size={13} /> Optional
        </p>
        <h3 className="text-xl font-extrabold mt-1">Hold this price for {formatINR(LOCK_AMOUNT)}</h3>
        <p className="text-sm text-white/85 mt-1 leading-relaxed">
          Your coordinator stops offering your date to anyone else and works this exact configuration up into a
          confirmed quote. Adjusted against your final invoice — and refunded in full if you decide not to go ahead.
        </p>
      </div>

      {/* The disclaimer sits ABOVE the payment buttons, not under them in grey
          six-point type. Somebody about to hand over money is entitled to read
          what the number actually is before they tap, not after. */}
      <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
        <p className="flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong>The quoted price is an estimate, not a final invoice.</strong> It is built from current
            {' '}{BRAND.pilotCities.join(' and ')} market rates and can vary slightly once your coordinator confirms the
            venue, the date and vendor availability — seasonal rates, venue access and last-minute changes all move it.
            Paying {formatINR(LOCK_AMOUNT)} holds your slot and your configuration; it does not fix the final amount.
            You see and approve the confirmed quote before anything is booked.
          </span>
        </p>
      </div>

      {UPI_CONFIGURED && links ? (
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-gray-600">Amount to pay now</span>
            <span className="text-2xl font-extrabold text-gray-900">{formatINR(LOCK_AMOUNT)}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Pay with any UPI app</p>
            <div className="grid grid-cols-2 gap-2">
              <UpiButton href={links.gpay} icon={<GooglePayIcon />} label="Google Pay" />
              <UpiButton href={links.phonepe} icon={<PhonePeIcon />} label="PhonePe" />
              <UpiButton href={links.paytm} icon={<PaytmIcon />} label="Paytm" />
              <UpiButton href={links.upi} icon={<UpiIcon />} label="Other UPI app" />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border-2 border-gray-200 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-gray-400">Or send to this UPI ID</span>
              <span className="block text-sm font-bold text-gray-900 truncate">{UPI_ID}</span>
            </span>
            <button
              type="button"
              onClick={copyId}
              className="shrink-0 h-11 px-3 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-600 active:bg-gray-100 flex items-center gap-1.5"
            >
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>

          {/* QR is for desktop, where none of the app deep links can open
              anything. Hidden on phones, where it would just be a picture of
              a link the buttons above already are. */}
          {qr && (
            <div className="hidden sm:flex flex-col items-center gap-2 pt-1">
              <img src={qr} alt={`UPI QR code to pay ${formatINR(LOCK_AMOUNT)} to Sambramo`} className="w-40 h-40" />
              <p className="text-[11px] text-gray-400">Scan with any UPI app</p>
            </div>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Reference <strong>{reference}</strong> is already in the payment note — please leave it there so we can
            match your payment to this enquiry.
          </p>

          <button
            type="button"
            onClick={claim}
            disabled={claiming}
            className="w-full min-h-[52px] rounded-xl bg-plum-700 text-white font-bold active:bg-plum-800 disabled:opacity-50"
          >
            {claiming ? 'Recording…' : "I've paid — tell my coordinator"}
          </button>
          <p className="text-[11px] text-center text-gray-400 leading-relaxed">
            UPI gives us no automatic confirmation, so this flags your payment for a human to check against the bank.
            You will get a message once it is matched — usually within a couple of hours.
          </p>
        </div>
      ) : (
        // Never a fake success button. Same rule the shop follows when no
        // payment method is configured.
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Online payment is not switched on yet. Your enquiry is already saved — message us and a coordinator will
            hold your date and send payment details directly.
          </p>
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
              `Hi Sambramo, I'd like to hold my quote (ref ${reference}) — ${quote?.tier?.name ?? ''} for ${quote?.guests ?? ''} guests.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[52px] rounded-xl bg-green-600 text-white font-bold flex items-center justify-center gap-2 active:bg-green-700"
          >
            <MessageCircle size={17} /> Message us on WhatsApp
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="w-full px-5 py-4 border-t border-gray-100 text-sm font-semibold text-gray-500 active:bg-gray-50"
      >
        Not now — just send the enquiry
      </button>
    </div>
  )
}

function UpiButton({ href, icon, label }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-2 min-h-[52px] rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-700 active:bg-gray-100"
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      {label}
    </a>
  )
}
