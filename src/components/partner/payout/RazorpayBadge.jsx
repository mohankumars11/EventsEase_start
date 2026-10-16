import razorpayLogo from '../../../assets/brand/razorpay-logo.svg'

/**
 * "Payouts powered by Razorpay", with Razorpay's own logo (the official
 * file from cdn.razorpay.com, unmodified). Shown wherever a partner is
 * asked to trust us with where their money goes, because it is Razorpay
 * Route that verifies the account and moves the money.
 */
export default function RazorpayBadge({ label = 'Payouts powered by', className = '' }) {
  return (
    <span data-badge="razorpay" className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-ink/50 ${className}`}>
      {label}
      <img src={razorpayLogo} alt="Razorpay" width={74} height={16} className="h-4 w-auto" />
    </span>
  )
}
