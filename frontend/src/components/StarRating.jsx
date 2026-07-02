import { useState } from 'react'

export default function StarRating({ value = 0, onChange, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(null)
  const dim = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className={`flex items-center gap-0.5 ${dim}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered ?? value) >= star
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            className={`leading-none transition-transform ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-125'
            } ${filled ? 'text-amber-400' : 'text-slate-300'}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
