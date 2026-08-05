import { BRAND } from '../../config/sambramo'
import SambramoMark from './SambramoMark'

/**
 * Mark + wordmark lockup.
 *
 * The wordmark stays a single colour. The old header split it as
 * "Sambr" + "amo" in saffron, which broke the name at an arbitrary point and
 * put the accent in competition with the mark; the saffron now lives only in
 * the pulli at the centre of the kolam, so the name reads as one word.
 */
export default function SambramoLogo({
  size    = 32,
  // 'onDark' for the plum navbar and footer, 'onLight' for cream and white.
  ground  = 'onDark',
  caption = false,
  className = '',
}) {
  const wordColor = ground === 'onDark' ? 'text-white' : 'text-plum-950'
  const capColor  = ground === 'onDark' ? 'text-plum-400' : 'text-plum-700'

  // Playfair at display weight already carries the name; the optical size of
  // the wordmark is tied to the mark so the lockup scales as one object.
  const wordSize = size >= 40 ? 'text-3xl' : size >= 30 ? 'text-xl' : 'text-lg'

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SambramoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold tracking-tight ${wordSize} ${wordColor}`}>
          {BRAND.name}
        </span>
        {caption && (
          <span className={`mt-1.5 text-[10px] font-medium tracking-[0.14em] uppercase ${capColor}`}>
            {BRAND.tagline}
          </span>
        )}
      </span>
    </span>
  )
}
