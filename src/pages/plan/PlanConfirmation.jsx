import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BRAND, CUSTOMER_TIMELINE, EVENT_TYPES } from '../../config/sambramo'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'
import { formatINR } from '../../utils/format'
import PriceLock from '../../components/plan/PriceLock'

export default function PlanConfirmation() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const eventId = params.get('eventId')
  const [event, setEvent] = useState(null)

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
      .then(({ data }) => setEvent(data))
  }, [eventId])

  /**
   * Record the claim on the event row.
   *
   * Migration 038 adds these columns and is applied by hand in the Supabase
   * SQL editor — `git push` does not run it. Until it is applied Postgres
   * answers 42703 and this logs and moves on: the customer still gets the
   * honest "a person is checking for it" panel, and the coordinator still
   * reconciles by hand, which is what happens anyway since UPI tells this app
   * nothing. Never worth failing in front of somebody who has just paid.
   */
  async function claimLock() {
    if (!eventId) return
    const { error: err } = await supabase.from('events').update({
      lock_payment_status: 'claimed',
      lock_payment_amount: LOCK_AMOUNT,
      lock_payment_ref:    eventId,
      lock_claimed_at:     new Date().toISOString(),
    }).eq('id', eventId)
    if (err) console.warn('Price-lock claim not recorded (migration 038 applied?):', err.message)
  }

  const eventType = event ? EVENT_TYPES.find(et => et.id === event.event_type) : null

  const waMessage = encodeURIComponent(
    `Hi Sambramo! I just submitted my celebration plan${eventType ? ` for a ${eventType.label}` : ''}${event?.event_date ? ` on ${new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. My reference ID is ${eventId?.slice(0, 8)?.toUpperCase()}. Looking forward to hearing from you!`
  )

  return (
    <div className="min-h-screen bg-plum-950 flex flex-col items-center justify-start py-16 px-4">
      {/* Celebration glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-saffron-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">
            {eventType?.emoji ?? '🎉'}
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-3">
            Your celebration is in our hands!
          </h1>
          <p className="text-plum-300 text-lg leading-relaxed">
            We've received your request and our concierge team will contact you within <span className="text-saffron-400 font-semibold">24 hours</span>.
          </p>
        </div>

        {/* Event summary card */}
        {event && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-plum-400 text-xs uppercase tracking-widest mb-1">Your Reference ID</p>
                <p className="text-saffron-400 font-mono text-xl font-bold">#{eventId?.slice(0, 8)?.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-plum-400 text-xs uppercase tracking-widest mb-1">Status</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  Request Received
                </span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-3">
              {eventType && (
                <div>
                  <p className="text-plum-500 text-xs mb-0.5">Celebration</p>
                  <p className="text-white text-sm font-medium">{eventType.emoji} {eventType.label}</p>
                </div>
              )}
              {event.event_date && (
                <div>
                  <p className="text-plum-500 text-xs mb-0.5">Date</p>
                  <p className="text-white text-sm font-medium">
                    {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {event.city && (
                <div>
                  <p className="text-plum-500 text-xs mb-0.5">City</p>
                  <p className="text-white text-sm font-medium">{event.city}</p>
                </div>
              )}
              {event.guest_count && (
                <div>
                  <p className="text-plum-500 text-xs mb-0.5">Guests</p>
                  <p className="text-white text-sm font-medium">~{event.guest_count} guests</p>
                </div>
              )}
              {(event.budget_text || event.budget_label) && (
                <div>
                  <p className="text-plum-500 text-xs mb-0.5">Budget</p>
                  <p className="text-white text-sm font-medium">{event.budget_text ?? event.budget_label}</p>
                </div>
              )}
              {event.customer_name && (
                <div>
                  <p className="text-plum-500 text-xs mb-0.5">Name</p>
                  <p className="text-white text-sm font-medium">{event.customer_name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
          <h2 className="text-white font-display text-lg font-semibold mb-5">What happens next</h2>
          <div className="space-y-4">
            {CUSTOMER_TIMELINE.map((item, i) => (
              <div key={item.key} className="flex items-start gap-4">
                <div className="relative flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    i === 0 ? 'bg-saffron-500 text-white' : 'bg-white/10 text-plum-300'
                  }`}>
                    {item.icon}
                  </div>
                  {i < CUSTOMER_TIMELINE.length - 1 && (
                    <div className={`w-px flex-1 mt-1 min-h-[20px] ${i === 0 ? 'bg-saffron-500/40' : 'bg-white/10'}`} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-medium leading-snug ${i === 0 ? 'text-saffron-300' : 'text-plum-300'}`}>
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── The hold ─────────────────────────────────────────
            The wizard collects a date and a budget but never produces a
            quote, so this is framed on the date rather than on a price that
            does not exist yet — promising to "lock your price" on a screen
            that has never shown one would be selling a number nobody has
            calculated. The ₹1,000 is the same money doing the same job as in
            the builder: it stops the date being offered to anyone else while
            a coordinator prices the request. */}
        {/* max-w-md rather than the page's max-w-2xl: this is the same panel
            the builder and the cart end on, and at 672px its disclaimer runs
            to lines twice the length of theirs and the QR floats in a field of
            white. One width everywhere it appears. */}
        <div className="mx-auto mb-8 max-w-md">
          <PriceLock
            reference={eventId}
            headline={`Hold your date for ${formatINR(LOCK_AMOUNT)}`}
            blurb="Your coordinator stops offering this date to anyone else while they price your request. Adjusted against your final invoice — and refunded in full if you decide not to go ahead."
            claimedBody={`UPI does not tell us automatically when money arrives, so a person is matching your ${formatINR(LOCK_AMOUNT)} against the bank. You will get a message once it is confirmed and your date is held. It is adjusted against your final invoice, and refundable.`}
            onClaim={claimLock}
            onSkip={() => navigate('/dashboard/customer/events')}
            skipLabel="Not now — just send the request"
            whatsappText={`Hi Sambramo, I'd like to hold my date (ref ${eventId?.slice(0, 8)?.toUpperCase() ?? ''}). Please send me payment details.`}
          />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </a>
          <a
            href={`tel:${BRAND.supportPhone}`}
            className="flex-1 flex items-center justify-center gap-2 bg-plum-700 hover:bg-plum-600 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all border border-plum-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
            </svg>
            Call Us
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 text-center">
          <Link
            to="/dashboard/customer/events"
            className="flex-1 py-3 px-6 border border-white/20 rounded-2xl text-plum-300 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
          >
            View My Celebrations
          </Link>
          <Link
            to="/"
            className="flex-1 py-3 px-6 border border-white/20 rounded-2xl text-plum-300 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
