import { useState, useEffect } from 'react'
import { CheckCircle2, Zap, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../utils/format'

const TIERS = [
  {
    id: 'free',
    name: 'Starter',
    emoji: '🌱',
    price: 0,
    billingNote: 'Free — forever for first 500 partners',
    badge: null,
    badgeColor: '',
    features: [
      'Listed in search results',
      'Up to 3 portfolio photos',
      'Receive up to 5 enquiries/month',
      'Basic partner profile page',
      'Customer reviews & ratings',
    ],
    cta: 'Current plan',
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    emoji: '🚀',
    price: 499,
    billingNote: '₹499/month · billed monthly',
    badge: '★ Popular',
    badgeColor: 'bg-saffron-500 text-white',
    features: [
      'Priority listing in search',
      'Up to 15 portfolio photos',
      'Unlimited enquiries',
      'Featured partner badge',
      'Appear in "Featured Partners" on home',
      'Customer reviews & ratings',
      'WhatsApp enquiry notifications',
    ],
    cta: 'Upgrade to Growth',
    ctaDisabled: false,
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    emoji: '👑',
    price: 999,
    billingNote: '₹999/month · billed monthly',
    badge: null,
    badgeColor: '',
    features: [
      'Top of search results',
      'Unlimited portfolio photos',
      'Unlimited enquiries',
      'Featured + Verified badge',
      'Analytics dashboard',
      'Dedicated account manager',
      'Priority customer support',
      'Custom profile URL',
    ],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    highlight: false,
  },
]

export default function VendorSubscription() {
  const [vendorCount, setVendorCount] = useState(null)
  const [upgrading, setUpgrading]     = useState(null)

  useEffect(() => {
    supabase.from('vendors').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setVendorCount(count ?? 0)
    })
  }, [])

  const slotsLeft = vendorCount !== null ? Math.max(0, 500 - vendorCount) : null

  function handleUpgrade(tierId) {
    setUpgrading(tierId)
    // Placeholder — integrate Razorpay / Stripe here
    setTimeout(() => {
      alert(`Payment gateway coming soon! You selected the ${tierId} plan.`)
      setUpgrading(null)
    }, 800)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Choose your plan</h1>
        <p className="text-gray-500 text-sm">
          Partner with Sambramo's concierge team. Cancel anytime.
        </p>

        {/* Free slots banner */}
        {slotsLeft !== null && (
          slotsLeft > 0 ? (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-semibold text-green-700">
              <Users size={15} />
              <span>🎉 <strong>{slotsLeft} free slots</strong> remaining — join now, pay nothing!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-plum-50 border border-plum-200 rounded-full text-sm font-semibold text-plum-700">
              <Zap size={15} />
              <span>All 500 free slots are taken — choose a paid plan to get listed.</span>
            </div>
          )
        )}
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {TIERS.map(tier => (
          <div
            key={tier.id}
            className={`rounded-2xl border p-6 flex flex-col gap-4 ${
              tier.highlight
                ? 'border-saffron-400 ring-2 ring-saffron-200 shadow-lg'
                : 'border-plum-100 bg-white shadow-sm'
            }`}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl">{tier.emoji}</span>
                {tier.badge && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tier.badgeColor}`}>
                    {tier.badge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
              <div className="mt-2">
                {tier.price === 0 ? (
                  <span className="text-3xl font-extrabold text-gray-900">Free</span>
                ) : (
                  <span className="text-3xl font-extrabold text-plum-700">
                    {formatINR(tier.price)}
                    <span className="text-base font-normal text-gray-400">/mo</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{tier.billingNote}</p>
            </div>

            {/* Features */}
            <ul className="space-y-2 flex-1">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => !tier.ctaDisabled && handleUpgrade(tier.id)}
              disabled={tier.ctaDisabled || upgrading === tier.id}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                tier.ctaDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : tier.highlight
                  ? 'bg-saffron-500 text-white hover:bg-saffron-600'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {upgrading === tier.id ? 'Redirecting…' : tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ strip */}
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-gray-800">Common questions</h3>
        {[
          {
            q: 'How does the free plan work?',
            a: 'The first 500 partners who sign up get a free account forever — no credit card required. Once those slots are taken, new partners choose a paid plan.',
          },
          {
            q: 'Can I switch plans?',
            a: 'Yes, upgrade or downgrade at any time. Changes take effect from the next billing cycle.',
          },
          {
            q: 'Is there a setup fee?',
            a: 'No setup fee. You only pay the monthly subscription amount.',
          },
          {
            q: 'How do I receive bookings?',
            a: "Bookings are coordinated through Sambramo's concierge team, who matches your services to the right celebrations and manages all customer communication on your behalf.",
          },
        ].map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800 list-none flex items-center justify-between gap-2">
              {q}
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
