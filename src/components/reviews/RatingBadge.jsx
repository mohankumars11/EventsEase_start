import StarRating from './StarRating'
import { useReviewAggregate } from '../../hooks/useReviewAggregate'

/** Drop-in rating badge for catalog listings — one hook call per instance. */
export default function RatingBadge({ subjectType, subjectId, size = 'xs', className = '' }) {
  const { avgRating, count } = useReviewAggregate(subjectType, subjectId)
  if (count === 0) return null
  return <StarRating value={avgRating} count={count} size={size} className={className} />
}
