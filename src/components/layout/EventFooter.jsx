import { Link } from 'react-router-dom'
import {
  ClipboardCheck, UserRound, PhoneCall, ShieldCheck, Wallet, CalendarCheck,
  Phone, Mail, MessageCircle, MapPin, ArrowRight,
} from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { EVENT_LIST } from '../../data/eventServicesData'
import { LOCK_AMOUNT } from '../../data/celebrationTiers'
import { formatINR } from '../../utils/format'
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../common/UpiAppIcons'

/**
 * The end of an occasion page.
 *
 * ── Why the site footer was wrong here ──────────────────────────────────
 * The occasion page used to end in the marketing footer: a sitemap of every
 * shop shelf, a directory of celebrations, "Track an order", "Sign in". That is
 * the right footer for a landing page, whose job is to send you somewhere else.
 * It is the wrong one for the page where somebody has just read what a
 * celebration costs and is deciding whether to trust us with it — at that exact
 * moment they were handed eleven links to cakes, flowers and pooja samagri.
 *
 * The question at the bottom of this page is not "where else can I go". It is
 * "what actually happens if I press the button, and what happens if it goes
 * wrong". So this footer answers those, in that order: the four commitments,
 * then the five steps from enquiry to the day, then a human to call.
 *
 * ── Everything claimed here is enforced somewhere ───────────────────────
 * Sambramo is pre-launch with no signed supplier, so there are no vendor
 * counts, no years in business, no star ratings and no testimonials. An
 * invented review is the fastest possible way to lose the trust this whole
 * block is trying to earn.
 *
 * What is claimed is what the code does. The approval gate is real — an
 * enquiry sits at `open` until a coordinator prices it and the customer
 * accepts. The price lock is real and refundable (LOCK_AMOUNT, migration 034),
 * and a customer can only ever move it to `claimed`; confirming it needs an
 * admin who has seen the money. The pilot cities are the only ones the booking
 * flow accepts. If any of that stops being true, this file changes in the same
 * commit.
 */
const COMMITMENTS = [
  {
    icon: ClipboardCheck,
    title: 'Nothing is booked until you approve it',
    body: 'You see the priced plan first. No vendor is held, and no money moves, before you say yes.',
  },
  {
    icon: UserRound,
    title: 'One coordinator, first call to last guest',
    body: 'The same person throughout — not a ticket queue and not a different name every week.',
  },
  {
    icon: PhoneCall,
    title: 'One number when something goes wrong',
    body: 'Whoever we booked, you call us. Chasing the decorator is our job, not your family’s.',
  },
  {
    icon: Wallet,
    title: 'The price you approve is the price you pay',
    body: 'Every line itemised — food, decor, coordination, our fee and the tax on each. No day-of surprises.',
  },
]

const JOURNEY = [
  { icon: '✍️', title: 'You tell us the shape of it', body: 'Occasion, date, rough headcount. Two minutes, no account needed.' },
  { icon: '📞', title: 'A coordinator calls you back', body: 'A real person, to hear what you actually want before anything is priced.' },
  { icon: '📋', title: 'One plan, one price', body: 'Every line laid out. Change anything, as many times as you like.' },
  { icon: '🔒', title: 'Hold it if you want to', body: `${formatINR(LOCK_AMOUNT)} holds your quote and your date. Adjusted against the final bill, refundable if you walk away.` },
  { icon: '🎉', title: 'We run the day', body: 'Setup, vendors, timings and clearing. You are a guest at your own celebration.' },
]

export default function EventFooter({ eventId }) {
  // Three other occasions to look at, never this one — a "you might also want"
  // row that includes the page you are standing on is the classic tell that
  // nothing on it was chosen deliberately.
  const others = EVENT_LIST.filter(e => e.id !== eventId).slice(0, 6)

  return (
    <footer className="mt-10 border-t border-hairline/10 pb-10 pt-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">

        {/* ── What we commit to ───────────────────────────────── */}
        <section aria-labelledby="commitments-heading">
          <h2 id="commitments-heading" className="px-1 text-[15px] font-extrabold text-ink">
            Before you book anything, here is what we hold ourselves to
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {COMMITMENTS.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="event-glass rise-in flex items-start gap-2.5 p-3.5"
                style={{ '--rise-delay': `${i * 60}ms` }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.07] ring-1 ring-hairline/10"
                  style={{ color: 'var(--event-glow-ink)' }}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-extrabold leading-snug text-ink">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What happens next ───────────────────────────────── */}
        <section aria-labelledby="journey-heading" className="event-glass p-5">
          <h2 id="journey-heading" className="text-[15px] font-extrabold text-ink">
            What happens after you send it
          </h2>
          <p className="mt-1 text-[11px] text-ink-mute">
            Five steps. You can stop at any of them and owe nothing.
          </p>
          <ol className="relative mt-4 space-y-3.5">
            <span
              aria-hidden="true"
              className="absolute bottom-5 left-[17px] top-5 w-px"
              style={{ background: 'linear-gradient(180deg, var(--event-glow), rgba(255,255,255,0.15))' }}
            />
            {JOURNEY.map((s, i) => (
              <li key={s.title} className="relative flex gap-3">
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunk/[0.07] text-base ring-1 ring-hairline/10">
                  {s.icon}
                  <span
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-gray-900"
                    style={{ background: 'var(--event-glow)' }}
                  >
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[12.5px] font-bold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Where we are, honestly ──────────────────────────── */}
        <section className="event-glass flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <span className="flex items-center gap-2 text-[12px] text-ink-soft">
            <MapPin size={14} className="shrink-0" style={{ color: 'var(--event-glow-ink)' }} />
            Live in <strong className="font-extrabold text-ink">{BRAND.pilotCities.join(' & ')}</strong>
          </span>
          <span className="flex items-center gap-2 text-[12px] text-ink-soft">
            <ShieldCheck size={14} className="shrink-0 text-emerald-700" />
            We will tell you plainly if we cannot cover your date or your city
          </span>
        </section>

        {/* ── Talk to a person ────────────────────────────────── */}
        <section className="event-glass p-5">
          <h2 className="text-[15px] font-extrabold text-ink">Rather just talk to someone?</h2>
          <p className="mt-1 text-[11px] text-ink-mute">Mon–Sat, 9am–8pm. A coordinator, not a bot.</p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <a
              href={`tel:${BRAND.supportPhone}`}
              className="inline-flex items-center gap-2 rounded-xl bg-surface-sunk/[0.07] px-3.5 py-2.5 text-[12.5px] font-bold text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
            >
              <Phone size={14} /> {BRAND.supportPhone}
            </a>
            <a
              href={`https://wa.me/${BRAND.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3.5 py-2.5 text-[12.5px] font-bold text-white transition-transform active:scale-95"
            >
              <MessageCircle size={14} /> WhatsApp us
            </a>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="inline-flex items-center gap-2 rounded-xl bg-surface-sunk/[0.07] px-3.5 py-2.5 text-[12.5px] font-bold text-ink ring-1 ring-hairline/10 transition-transform active:scale-95"
            >
              <Mail size={14} /> Email
            </a>
            <Link
              to="/plan/custom"
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-extrabold text-gray-900 transition-transform active:scale-95"
              style={{ background: 'var(--event-glow)' }}
            >
              <CalendarCheck size={14} /> Tell us your plan
            </Link>
          </div>
        </section>

        {/* ── Other occasions ─────────────────────────────────── */}
        <section aria-labelledby="others-heading">
          <h2 id="others-heading" className="px-1 text-[13px] font-extrabold text-ink-soft">
            Planning something else too?
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {others.map(e => (
              <Link
                key={e.id}
                to={`/services/${e.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk/[0.06] px-3 py-1.5 text-[11.5px] font-bold text-ink-soft ring-1 ring-hairline/10 transition-colors hover:bg-surface-sunk/[0.07] hover:text-ink"
              >
                <span aria-hidden="true">{e.emoji}</span> {e.name}
              </Link>
            ))}
            <Link
              to="/services"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold"
              style={{ color: 'var(--event-glow-ink)' }}
            >
              Every occasion <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* ── Legal line ──────────────────────────────────────── */}
        <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-hairline/10 pt-5 text-[11px] text-ink-mute sm:flex-row">
          <p>© {new Date().getFullYear()} {BRAND.name}. Prices shown are estimates, not quotes.</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.1em] text-ink-mute">We accept</span>
            <span className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1.5">
              <GooglePayIcon className="h-4 w-4" />
              <PhonePeIcon className="h-4 w-4" />
              <PaytmIcon className="h-4 w-4" />
              <UpiIcon className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
