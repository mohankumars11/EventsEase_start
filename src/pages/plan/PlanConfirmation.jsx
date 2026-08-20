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
    <div className="a-canvas min-h-screen px-5 py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* ── Hero ────────────────────────────────────────────────────
            The emoji sits in the brand's light rather than on the bare
            page — this is the one screen whose whole job is to feel like
            something just landed safely. */}
        <div className="a-stagger mb-9 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[32px] text-5xl a-aurora">
            <span className="drop-shadow-sm">{eventType?.emoji ?? '🎉'}</span>
          </div>
          <h1 className="font-serif text-[34px] font-extrabold leading-[1.1] tracking-tight text-ink lg:text-[42px]">
            Your celebration is in our hands
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            We've received your request. Your concierge will contact you within{' '}
            <span className="font-extrabold text-ink">24 hours</span>.
          </p>
        </div>

        {/* ── Event summary ───────────────────────────────────────────
            Was `bg-blue-500/20 text-blue-300` on a status chip and
            `text-saffron-400` on the reference — both dark-theme
            leftovers that fail contrast badly on a lit ground. The
            reference is the thing somebody quotes back to us on the
            phone, so it is now the most legible element on the card. */}
        {event && (
          <div className="a-card a-rail mb-7 overflow-hidden p-6 pt-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="type-overline text-ink-mute">Your reference</p>
                <p className="mt-1 font-mono text-[22px] font-extrabold tracking-tight text-ink">
                  #{eventId?.slice(0, 8)?.toUpperCase()}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/[0.1] px-3 py-1.5 text-[11.5px] font-extrabold text-accent ring-1 ring-accent/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Request received
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-ink/[0.07] pt-5">
              {eventType && (
                <div>
                  <dt className="text-[11.5px] text-ink-mute">Celebration</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-ink">{eventType.emoji} {eventType.label}</dd>
                </div>
              )}
              {event.event_date && (
                <div>
                  <dt className="text-[11.5px] text-ink-mute">Date</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-ink">
                    {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </dd>
                </div>
              )}
              {event.city && (
                <div>
                  <dt className="text-[11.5px] text-ink-mute">City</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-ink">{event.city}</dd>
                </div>
              )}
              {event.guest_count && (
                <div>
                  <dt className="text-[11.5px] text-ink-mute">Guests</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-ink">~{event.guest_count} guests</dd>
                </div>
              )}
              {(event.budget_text || event.budget_label) && (
                <div>
                  <dt className="text-[11.5px] text-ink-mute">Budget</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-ink">{event.budget_text ?? event.budget_label}</dd>
                </div>
              )}
              {event.customer_name && (
                <div>
                  <dt className="text-[11.5px] text-ink-mute">Name</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-ink">{event.customer_name}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────────
            The inactive dots were `bg-white/10 text-plum-300`: white at
            10% on a white ground is nothing at all, so every step after
            the first was an invisible circle with unreadable text beside
            it. They are drawn in ink now, and the rail connecting them
            is a real hairline. */}
        <div className="a-card mb-7 p-6">
          <h2 className="font-serif text-[19px] font-extrabold tracking-tight text-ink">What happens next</h2>
          <ol className="mt-5">
            {CUSTOMER_TIMELINE.map((item, i) => (
              <li key={item.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center self-stretch">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] ${
                    i === 0 ? 'bg-saffron-400 text-plum-950' : 'bg-ink/[0.07] text-ink-soft'
                  }`}>
                    {item.icon}
                  </div>
                  {i < CUSTOMER_TIMELINE.length - 1 && (
                    <div className={`mt-1 min-h-[22px] w-0.5 flex-1 rounded-full ${i === 0 ? 'bg-saffron-400/45' : 'bg-ink/[0.08]'}`} />
                  )}
                </div>
                <p className={`pb-5 pt-2 text-[14px] font-bold leading-snug ${i === 0 ? 'text-ink' : 'text-ink-soft'}`}>
                  {item.label}
                </p>
              </li>
            ))}
          </ol>
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
        <div className="mx-auto mb-7 max-w-md">
          <PriceLock
            reference={eventId}
            headline={`Hold your date for ${formatINR(LOCK_AMOUNT)}`}
            blurb="Your coordinator stops offering this date to anyone else while they price your request. Adjusted against your final invoice — and refunded in full if you decide not to go ahead."
            claimedBody={`UPI does not tell us automatically when money arrives, so a person is matching your ${formatINR(LOCK_AMOUNT)} against the bank. You will get a message once it is confirmed and your date is held. It is adjusted against your final invoice, and refundable.`}
            onClaim={claimLock}
            onSkip={() => navigate('/track')}
            skipLabel="Not now — just send the request"
            whatsappText={`Hi Sambramo, I'd like to hold my date (ref ${eventId?.slice(0, 8)?.toUpperCase() ?? ''}). Please send me payment details.`}
          />
        </div>

        {/* ── CTAs ────────────────────────────────────────────────────
            WhatsApp keeps its own green. It is the one place in the app
            where an outside brand's colour is correct: the button is a
            promise about which app is going to open, and recolouring it
            to ours would make that promise quieter for no gain. */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn flex-1 bg-[#25D366] text-white"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </a>
          <a
            href={`tel:${BRAND.supportPhone}`}
            className="a-btn-ghost flex-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
            </svg>
            Call Us
          </a>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/track" className="a-btn-quiet flex-1">
            Track this celebration
          </Link>
          <Link to="/" className="a-btn-quiet flex-1">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
