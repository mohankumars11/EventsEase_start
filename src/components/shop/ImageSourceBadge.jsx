import { Camera, ImageIcon } from 'lucide-react'

// Says, on the product itself, whether the photo above it is the thing
// that will actually turn up at the door.
//
// Sambramo is pre-launch: the catalogue is real (accurate names, weights,
// prices) but no bakery is confirmed, so every photo today is a licensed
// lookalike. Showing those unlabelled is how a shop ends up delivering a
// plain sponge against a photograph of a three-tier fondant cake, which
// is the single thing this feature exists to prevent.
//
// So the label is not decoration and it is not a disclaimer buried in
// terms — it sits on the image. `products.image_source` (migration 023)
// is the source of truth, and it flips to 'actual' the moment an admin
// uploads a real photo through the Catalog tab.
export default function ImageSourceBadge({ source, className = '', size = 'md' }) {
  const actual = source === 'actual'
  const Icon   = actual ? Camera : ImageIcon

  const sizing = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : 'text-[11px] px-2.5 py-1 gap-1.5'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-semibold border backdrop-blur-sm',
        sizing,
        actual
          ? 'bg-green-50/90 text-green-700 border-green-200'
          : 'bg-white/85 text-gray-500 border-gray-200',
        className,
      ].filter(Boolean).join(' ')}
      title={actual
        ? 'This is a photograph of the item we will deliver.'
        : 'A licensed photo of a similar item. The item delivered will match the name, size and description, but may differ in appearance.'}
    >
      <Icon size={size === 'sm' ? 10 : 12} />
      {actual ? 'Actual product photo' : 'Representative image'}
    </span>
  )
}
