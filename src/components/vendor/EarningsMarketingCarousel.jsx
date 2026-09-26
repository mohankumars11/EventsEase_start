import PromoDeck from '../home/PromoDeck'

const slides = [
  {
    key: 'get-paid',
    to: '/dashboard/vendor?tab=earnings#earnings-over-time',
    background: 'linear-gradient(135deg,#2e1065 0%,#5b21b6 55%,#7c3aed 100%)',
    art: '✓',
    eyebrow: 'AFTER EVERY EVENT',
    title: 'GET PAID AFTER EVERY EVENT',
    body: 'Money becomes available after the event and flows to your registered bank account.',
    cta: 'Learn how it works',
  },
  {
    key: 'razorpay-payouts',
    to: '/dashboard/vendor?tab=earnings#your-account',
    background: 'linear-gradient(135deg,#24104f 0%,#4c1d95 58%,#7c3aed 100%)',
    art: '₹',
    eyebrow: 'RAZORPAY PAYOUTS',
    title: 'SECURE PAYOUTS WITH RAZORPAY',
    body: 'Track payouts toward your registered bank account in one clear place.',
    cta: 'View payout details',
    brand: true,
  },
  {
    key: 'transparent-earnings',
    to: '/dashboard/vendor?tab=earnings#your-statement',
    background: 'linear-gradient(135deg,#32105f 0%,#6d28d9 55%,#8b5cf6 100%)',
    art: '%',
    eyebrow: 'KNOW WHAT YOU EARN',
    title: 'TRANSPARENT EARNINGS & TAX',
    body: 'See customer billing, SAMBRAMO commission and tax amounts in one clear statement.',
    cta: 'See your statement',
  },
  {
    key: 'grow-more',
    to: '/dashboard/vendor?tab=earnings#your-work',
    background: 'linear-gradient(135deg,#24104f 0%,#5b21b6 55%,#8b45f7 100%)',
    art: '↗',
    eyebrow: 'KEEP BUILDING',
    title: 'GROW MORE WITH SAMBRAMO',
    body: 'Keep your services and calendar current so you can stay eligible for relevant event work.',
    cta: 'View your work',
  },
]

export default function EarningsMarketingCarousel() {
  const decorated = slides.map(slide => ({
    ...slide,
    renderBrand: slide.brand ? (
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#161616] shadow-sm">
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-[#2f80ed] text-[9px] font-black text-white">R</span>
        Razorpay
      </span>
    ) : null,
  }))

  return (
    <section aria-label="Earnings information" className="px-0">
      <PromoDeck slides={decorated} interval={6500} />
    </section>
  )
}
