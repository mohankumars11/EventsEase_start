import { useState } from 'react'
import { Star } from 'lucide-react'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

export default function StarRatingInput({ value, onChange, size = 36 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value

  return (
    <div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={size}
              className={n <= shown ? 'text-amber-400' : 'text-gray-200'}
              fill="currentColor"
              strokeWidth={0}
            />
          </button>
        ))}
      </div>
      {shown > 0 && <p className="text-xs text-amber-600 mt-1.5 font-medium">{LABELS[shown]}</p>}
    </div>
  )
}
