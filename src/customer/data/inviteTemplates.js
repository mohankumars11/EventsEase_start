/**
 * Invitation designs. Each is drawn in code (gradients + SVG ornaments +
 * the app's own fonts), so it is crisp at any size, weighs nothing, and
 * the guest's browser renders exactly what the host picked.
 *
 * Stored on the invitation as `theme`: "<id>" or "<id>|art|live"
 *   art   show the occasion's illustration on the card
 *   live  gentle animated sparkle (the "live" digital invite)
 */

export const TEMPLATES = [
  { id: 'royal', name: 'Royal Heritage', vibe: 'Maroon, gold, mandalas', font: 'script',
    bg: 'radial-gradient(120% 80% at 50% 0%, #8B1E3F 0%, #5B0E1E 70%, #3D0814 100%)', ink: '#FCEFD8', soft: '#E8C77A', accent: '#E8C77A', ornament: 'mandala',
    for: ['wedding', 'festivals', 'special'] },
  { id: 'floral', name: 'Floral Blush', vibe: 'Soft pinks, blooms', font: 'script',
    bg: 'linear-gradient(170deg, #FFF5F7 0%, #FFE4EC 60%, #FFD3E0 100%)', ink: '#6B1438', soft: '#A8456F', accent: '#E85D8A', ornament: 'florals',
    for: ['wedding', 'life', 'special'] },
  { id: 'midnight', name: 'Midnight Gold', vibe: 'Navy night, gold stars', font: 'serif',
    bg: 'radial-gradient(100% 70% at 50% 10%, #1E2A5A 0%, #0B1026 75%)', ink: '#FFFFFF', soft: '#C9B37A', accent: '#E3C46B', ornament: 'stars',
    for: ['wedding', 'corporate', 'nightlife', 'special', 'life'] },
  { id: 'temple', name: 'Temple Classic', vibe: 'South Indian, kolam border', font: 'serif',
    bg: 'linear-gradient(180deg, #FFF7E0 0%, #FFEFC4 100%)', ink: '#5B1A0E', soft: '#7A4B1F', accent: '#1F7A3A', ornament: 'kolam',
    for: ['wedding', 'festivals', 'life'] },
  { id: 'confetti', name: 'Confetti Pop', vibe: 'Bright, playful, party', font: 'display',
    bg: 'linear-gradient(160deg, #FFFFFF 0%, #FFF6E5 100%)', ink: '#1C1033', soft: '#5F5675', accent: '#7C3AED', ornament: 'confetti',
    for: ['life', 'school', 'themed', 'college'] },
  { id: 'minimal', name: 'Modern Minimal', vibe: 'White, fine lines', font: 'serif',
    bg: 'linear-gradient(180deg, #FFFFFF 0%, #F7F5F2 100%)', ink: '#1A1A1A', soft: '#6B6B6B', accent: '#1A1A1A', ornament: 'frame',
    for: ['corporate', 'industry', 'property', 'retail', 'wedding', 'life'] },
  { id: 'neon', name: 'Neon Night', vibe: 'Glow, music, late nights', font: 'display',
    bg: 'radial-gradient(120% 90% at 50% 0%, #2A0050 0%, #12002B 70%)', ink: '#FFFFFF', soft: '#F0ABFC', accent: '#22D3EE', ornament: 'neon',
    for: ['nightlife', 'themed', 'college', 'public'] },
  { id: 'diya', name: 'Festive Diya', vibe: 'Warm lamps, marigold', font: 'serif',
    bg: 'radial-gradient(110% 80% at 50% 100%, #B4530A 0%, #7A2E00 45%, #3B0A00 100%)', ink: '#FFF3D6', soft: '#FCD34D', accent: '#F59E0B', ornament: 'diya',
    for: ['festivals', 'life', 'special'] },
  { id: 'corporate', name: 'Corporate Clean', vibe: 'Navy band, crisp type', font: 'sans',
    bg: 'linear-gradient(180deg, #0F172A 0%, #0F172A 30%, #FFFFFF 30%, #FFFFFF 100%)', ink: '#0F172A', soft: '#475569', accent: '#2563EB', ornament: 'band',
    for: ['corporate', 'industry', 'online', 'property', 'retail', 'community'] },
  { id: 'garden', name: 'Pastel Garden', vibe: 'Mint, lavender, leaves', font: 'serif',
    bg: 'linear-gradient(165deg, #ECFDF5 0%, #F5F3FF 100%)', ink: '#14532D', soft: '#4D7C6B', accent: '#7C3AED', ornament: 'leaves',
    for: ['life', 'special', 'outdoor', 'sport'] },
  { id: 'amethyst', name: 'Sambramo Amethyst', vibe: 'Our purple, clean', font: 'serif',
    bg: 'linear-gradient(170deg, #FBF7FF 0%, #EFE4FF 100%)', ink: '#2E1065', soft: '#6D28D9', accent: '#7C3AED', ornament: 'arch',
    for: [] },
]
export const TEMPLATE = Object.fromEntries(TEMPLATES.map(t => [t.id, t]))

/** Designs for an occasion, best fit first (then the rest). */
export function templatesFor(occasion) {
  const cat = occasion?.category
  const solemn = ['memorial-gathering', 'celebration-of-life'].includes(occasion?.id)
  const fit = TEMPLATES.filter(t => (solemn ? ['minimal', 'garden', 'midnight'].includes(t.id) : t.for.includes(cat)))
  return [...fit, ...TEMPLATES.filter(t => !fit.includes(t))]
}

export function parseTheme(theme, occasion) {
  const [id, ...flags] = String(theme ?? '').split('|')
  const t = TEMPLATE[id] ?? templatesFor(occasion)[0] ?? TEMPLATE.amethyst
  return { t, art: flags.includes('art'), live: flags.includes('live') }
}
export const themeString = (id, { art = false, live = false } = {}) => [id, art && 'art', live && 'live'].filter(Boolean).join('|')
