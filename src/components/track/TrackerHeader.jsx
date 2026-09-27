import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * The bar above a single tracked thing: one way back, and its name.
 *
 * It lived in pages/track/OrderTracker and was imported from there by
 * CelebrationTracker, which is the sort of arrangement that survives right up
 * until the file it lives in is deleted. Both trackers drew this identically
 * on purpose — a customer following a celebration and a customer following a
 * parcel were owed the same frame — and now that only the celebration remains,
 * the frame belongs with the other track components rather than inside a page.
 */
export default function TrackerHeader({ title }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-hairline/[0.06] bg-surface/90 px-3 py-3 backdrop-blur-md pt-safe">
      <Link
        to="/track"
        aria-label="Back to Track"
        className="tap-48 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk/[0.07]"
      >
        <ArrowLeft size={19} />
      </Link>
      <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">{title}</p>
    </header>
  )
}
