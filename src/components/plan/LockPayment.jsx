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
 *
 * ── Why every prop below has a default ──────────────────────────────────
 * This used to be reachable from exactly one screen: the builder's "Get this
 * confirmed". Every other way of finishing a request — adding a scale to the
 * enquiry cart and sending it, or completing the six-step wizard — ended on a
 * page that never mentioned the price lock at all, so seven of the eight
 * scales could be sent without ever being offered the thing that holds them.
 * It is now rendered from all of them through PriceLock, which means the
 * headline, the amount, the reference and the skip target all have to be
 * caller-supplied: the wizard has a date but no quote and must say "hold your
 * date", the builder has both and says "hold this price". The amount is a
 * prop rather than a hard-wired LOCK_AMOUNT for the same reason — it is one
 * number today, and the day it varies by scale it must vary in one place.
 */
export default function LockPayment({
  enquiryId,
  quote,
  onClaimed,
  onSkip,
  amount = LOCK_AMOUNT,
  headline,
  blurb,
  reference: referenceProp,
  skipLabel = 'Not now — just send the enquiry',
  whatsappText,
}) {
  const [links, setLinks] = useState(null)
  const [qr, setQr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const reference = referenceProp ?? (enquiryId ? enquiryId.slice(0, 8).toUpperCase() : '')

  useEffect(() => {
    if (!UPI_CONFIGURED || !enquiryId) return
    const built = buildAppUpiLinks({
      amount,
      note: `Sambramo hold ${reference}`,
      txnRef: enquiryId,
    })
    setLinks(built)
    generateQrDataUrl(built.upi).then(setQr).catch(() => setQr(null))
  }, [enquiryId, reference, amount])

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

  const waHref = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
    whatsappText
      ?? `Hi Sambramo, I'd like to hold my quote (ref ${reference}) — ${quote?.tier?.name ?? ''} for ${quote?.guests ?? ''} guests.`,
  )}`

  return (
    <div className="card overflow-hidden text-left">
      <div className="bg-gradient-to-br from-saffron-500 to-amber-500 px-5 py-5 text-white">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
          <ShieldCheck size={13} /> Optional
        </p>
        <h3 className="mt-1 text-xl font-extrabold leading-snug">
          {headline ?? `Hold this price for ${formatINR(amount)}`}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-white/85">
          {blurb
            ?? 'Your coordinator stops offering your date to anyone else and works this exact configuration up into a confirmed quote. Adjusted against your final invoice — and refunded in full if you decide not to go ahead.'}
        </p>
      </div>

      {/* The disclaimer sits ABOVE the payment buttons, not under them in grey
          six-point type. Somebody about to hand over money is entitled to read
          what the number actually is before they tap, not after. */}
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong>The quoted price is an estimate, not a final invoice.</strong> It is built from current
            {' '}{BRAND.pilotCities.join(' and ')} market rates and can vary slightly once your coordinator confirms the
            venue, the date and vendor availability — seasonal rates, venue access and last-minute changes all move it.
            Paying {formatINR(amount)} holds your slot and your configuration; it does not fix the final amount.
            You see and approve the confirmed quote before anything is booked.
          </span>
        </p>
      </div>

      {UPI_CONFIGURED && links ? (
        <div className="space-y-4 px-5 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-gray-600">Amount to pay now</span>
            <span className="text-2xl font-extrabold leading-none text-gray-900">{formatINR(amount)}</span>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">Pay with any UPI app</p>
            <div className="grid grid-cols-2 gap-2">
              <UpiButton href={links.gpay} icon={<GooglePayIcon />} label="Google Pay" />
              <UpiButton href={links.phonepe} icon={<PhonePeIcon />} label="PhonePe" />
              <UpiButton href={links.paytm} icon={<PaytmIcon />} label="Paytm" />
              <UpiButton href={links.upi} icon={<UpiIcon />} label="Other UPI app" />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border-2 border-gray-200 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-gray-500">Or send to this UPI ID</span>
              <span className="block truncate text-sm font-bold text-gray-900">{UPI_ID}</span>
            </span>
            <button
              type="button"
              onClick={copyId}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 text-xs font-bold text-gray-600 active:bg-gray-100"
            >
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>

          {/* QR is for desktop, where none of the app deep links can open
              anything. Hidden on phones, where it would just be a picture of
              a link the buttons above already are. */}
          {qr && (
            <div className="hidden flex-col items-center gap-2 pt-1 sm:flex">
              <img src={qr} alt={`UPI QR code to pay ${formatINR(amount)} to Sambramo`} className="h-40 w-40" />
              <p className="text-[11px] text-gray-500">Scan with any UPI app</p>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-gray-500">
            Reference <strong>{reference}</strong> is already in the payment note — please leave it there so we can
            match your payment to this enquiry.
          </p>

          <button
            type="button"
            onClick={claim}
            disabled={claiming}
            className="min-h-[52px] w-full rounded-xl bg-plum-700 font-bold text-white active:bg-plum-800 disabled:opacity-50"
          >
            {claiming ? 'Recording…' : "I've paid — tell my coordinator"}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            UPI gives us no automatic confirmation, so this flags your payment for a human to check against the bank.
            You will get a message once it is matched — usually within a couple of hours.
          </p>
        </div>
      ) : (
        // Never a fake success button. Same rule the shop follows when no
        // payment method is configured.
        <div className="space-y-3 px-5 py-5">
          <p className="text-sm leading-relaxed text-gray-600">
            Online payment is not switched on yet. Your enquiry is already saved — message us and a coordinator will
            hold your date and send payment details directly.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-green-600 font-bold text-white active:bg-green-700"
          >
            <MessageCircle size={17} /> Message us on WhatsApp
          </a>
        </div>
      )}

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full border-t border-gray-100 px-5 py-4 text-sm font-semibold text-gray-500 active:bg-gray-50"
        >
          {skipLabel}
        </button>
      )}
    </div>
  )
}

function UpiButton({ href, icon, label }) {
  return (
    <a
      href={href}
      className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-2 text-center text-[13px] font-bold text-gray-700 active:bg-gray-100"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  )
}
