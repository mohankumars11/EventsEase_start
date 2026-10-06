// Recognizable, brand-colored icons for the UPI apps customers can pay
// with. Kept as inline SVG (not hotlinked images) so the checkout button
// never depends on a third-party asset host being reachable.

export function GooglePayIcon({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#ffffff" stroke="#e5e7eb" />
      <g transform="translate(7,11)">
        <path d="M12.94 6.14c0-.5-.04-.98-.13-1.44H6.6v2.73h3.56a3.04 3.04 0 0 1-1.32 2v1.66h2.14c1.25-1.15 1.96-2.85 1.96-4.95z" fill="#4285F4" />
        <path d="M6.6 12.6c1.79 0 3.29-.59 4.38-1.6l-2.14-1.66c-.6.4-1.36.63-2.24.63-1.72 0-3.18-1.16-3.7-2.72H.68v1.71a6.6 6.6 0 0 0 5.92 3.64z" fill="#34A853" />
        <path d="M2.9 7.25a3.96 3.96 0 0 1 0-2.5V3.04H.68a6.6 6.6 0 0 0 0 5.92L2.9 7.25z" fill="#FBBC05" />
        <path d="M6.6 2.03c.97 0 1.85.34 2.53.99l1.9-1.9C9.87.42 8.38 0 6.6 0A6.6 6.6 0 0 0 .68 3.04L2.9 4.75c.52-1.56 1.98-2.72 3.7-2.72z" fill="#EA4335" />
        <path d="M16.02 6.85c0-.35-.03-.68-.08-1H14v1.9h1.15a.99.99 0 0 1-.43.65v.87h.7c.4-.37.6-.92.6-2.42z" fill="#4285F4" />
        <path d="M14.68 10.6c.6 0 1.1-.2 1.47-.53l-.7-.55c-.2.13-.46.21-.77.21-.6 0-1.1-.4-1.28-.94h-.72v.57a2.3 2.3 0 0 0 2 1.24z" fill="#34A853" />
        <path d="M13.4 9.79a1.4 1.4 0 0 1 0-.87v-.57h-.72a2.3 2.3 0 0 0 0 2.01l.72-.57z" fill="#FBBC05" />
        <path d="M14.68 8.4c.34 0 .64.12.88.35l.61-.6a2.16 2.16 0 0 0-1.49-.58 2.3 2.3 0 0 0-2 1.24l.72.57c.18-.54.68-.98 1.28-.98z" fill="#EA4335" />
      </g>
      <text x="20" y="30" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fontWeight="600" fill="#5f6368">Pay</text>
    </svg>
  )
}

export function PhonePeIcon({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#5F259F" />
      <circle cx="20" cy="18" r="10.5" fill="none" stroke="#ffffff" strokeWidth="1.6" />
      <path
        d="M15.5 13.5h6c1.66 0 3 1.34 3 3s-1.34 3-3 3h-3.3l4.3 4.6h-2.6l-4.9-5.3v-1.3h6.5c.72 0 1.3-.58 1.3-1.3s-.58-1.3-1.3-1.3h-6v-1.4z"
        fill="#ffffff"
      />
      <text x="20" y="34.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="700" fill="#ffffff" letterSpacing="0.3">PhonePe</text>
    </svg>
  )
}

export function PaytmIcon({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#002E6E" />
      <circle cx="20" cy="15.5" r="6.2" fill="#00BAF2" />
      <text x="20" y="18.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700" fill="#ffffff">₹</text>
      <text x="20" y="31" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" fill="#ffffff">paytm</text>
    </svg>
  )
}

export function UpiIcon({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#ffffff" stroke="#e5e7eb" />
      <text x="20" y="24" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" fill="#0f766e">UPI</text>
    </svg>
  )
}
