import { useMemo } from 'react'
import PromoDeck from '../home/PromoDeck'

/*
 * Earnings-only marketing deck.
 * This is intentionally self-contained: it does not depend on promotion
 * rows or invent earnings. The financial figures remain owned by Earnings.
 */
const SLIDES = [
  {
    key: 'paid-after-event',
    background: 'linear-gradient(135deg,#32105f 0%,#5c18b5 58%,#7b2cff 100%)',
    art: '₹',
    eyebrow: 'GET PAID AFTER EVERY EVENT',
    title: 'AFTER EVERY EVENT',
    body: 'Money becomes available after the event and flows to your registered bank account.',
    cta: 'Learn how it works',
  },
  {
    key: 'razorpay-payouts',
    background: 'linear-gradient(135deg,#111827 0%,#2d1b69 55%,#6d28d9 100%)',
    art: 'R',
    eyebrow: 'SECURE PAYOUTS WITH RAZORPAY',
    title: 'RAZORPAY PAYOUTS',
    body: 'Track payouts toward your registered bank account in one clear place.',
    cta: 'View payout details',
  },
  {
    key: 'transparent-earnings',
    background: 'linear-gradient(135deg,#24103f 0%,#6b21a8 55%,#9333ea 100%)',
    art: '₹',
    eyebrow: 'TRANSPARENT EARNINGS & TAX',
    title: 'KNOW WHAT YOU EARN',
    body: 'See customer billing, SAMBRAMO commission and your tax statement clearly.',
    cta: 'View your statement',
  },
  {
    key: 'grow-with-sambramo',
    background: 'linear-gradient(135deg,#2e1065 0%,#581c87 58%,#8b5cf6 100%)',
    art: '↗',
    eyebrow: 'GROW MORE WITH SAMBRAMO',
    title: 'KEEP YOUR SERVICES CURRENT',
    body: 'Keep your services and calendar current to stay eligible for relevant event work.',
    cta: 'Open your account',
  },
]

export default function PartnerMarketingCarousel() {
  const slides = useMemo(() => SLIDES.map(s => ({
    ...s,
    to: s.key === 'razorpay-payouts'
      ? '#your-account'
      : s.key === 'transparent-earnings'
        ? '#your-statement'
        : s.key === 'grow-with-sambramo'
          ? '#your-account'
          : '#earnings-over-time',
  })), [])

  return (
    <section aria-label="Earnings information" data-promotions={slides.length}>
      <PromoDeck slides={slides} interval={5500} />
    </section>
  )
}
