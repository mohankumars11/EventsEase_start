import { useState } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/** Compact referral card — shown on the customer home page. Renders
 * nothing until a referral_code exists on the profile (migration 019). */
export default function ReferAndEarn() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  if (!profile?.referral_code) return null

  const link = `${window.location.origin}/signup?ref=${profile.referral_code}`

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({ title: 'Sambramo', text: 'Plan celebrations & shop gifts with Sambramo — use my link to get started:', url: link }).catch(() => {})
    } else {
      copyLink()
    }
  }

  return (
    <section className="bg-gradient-to-br from-saffron-500 to-amber-600 rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-surface-sunk/[0.07] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-surface-sunk/[0.07] flex items-center justify-center shrink-0">
          <Gift size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">Refer a friend, earn 15% off</h2>
          <p className="text-ink-soft text-sm mt-0.5">
            Share your link — when their first order is delivered, you get 15% off your next one.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block bg-surface-sunk/[0.07] rounded-xl px-3 py-2 text-xs font-mono truncate max-w-[180px]">
            {link.replace(/^https?:\/\//, '')}
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 bg-white text-amber-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-amber-50 transition-colors"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={shareLink}
            className="sm:hidden flex items-center justify-center bg-surface-sunk/[0.07] hover:bg-surface-sunk/[0.10] p-2.5 rounded-xl transition-colors"
            aria-label="Share"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </section>
  )
}
