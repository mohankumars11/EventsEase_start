import { useState } from 'react'
import { Star } from 'lucide-react'

export function StarDisplay({ rating = 0, size = 14, className = '' }) {
  const rounded = Math.round(Number(rating))
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
        />
      ))}
    </div>
  )
}

export function StarInput({ value = 0, onChange, size = 30 }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="focus:outline-none transition-transform hover:scale-110"
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={i <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
          />
        </button>
      ))}
    </div>
  )
}
