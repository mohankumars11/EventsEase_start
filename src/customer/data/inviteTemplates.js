/**
 * Invitation designs — 62 of them. Each is drawn in code (gradients + SVG
 * ornaments + the app's own fonts), so it is crisp at any size, weighs
 * nothing, and the guest's browser renders exactly what the host picked.
 *
 * Stored on the invitation as `theme`: "<id>" or "<id>|art|live"
 *   art   show the occasion's illustration on the card
 *   live  the design's own animation (petals, confetti, snow, glow…)
 *
 * Every one of the app's occasions gets a ranked list: designs made for
 * its kind of day first (`kw` matches the occasion's name), then designs
 * for its category, then the rest. Solemn days (a memorial) only ever see
 * the quiet designs — never confetti.
 */
const T = (id, name, vibe, style, font, ornament, fx, bg, ink, soft, accent, forCats = [], kw = null, extra = {}) =>
  ({ id, name, vibe, style, font, ornament, fx, bg, ink, soft, accent, for: forCats, kw: kw ? new RegExp(kw, 'i') : null, ...extra })

const WED = ['wedding', 'special']
const FEST = ['festivals', 'life', 'special']
const KIDS = ['life', 'school', 'themed']
const WORK = ['corporate', 'industry', 'online', 'property', 'retail', 'community']

export const TEMPLATES = [
  /* ── Traditional & wedding ─────────────────────────────────────────── */
  T('royal', 'Royal Heritage', 'Maroon, gold, mandalas', 'traditional', 'script', 'mandala', 'sparkle',
    'radial-gradient(120% 80% at 50% 0%, #8B1E3F 0%, #5B0E1E 70%, #3D0814 100%)', '#FCEFD8', '#E8C77A', '#E8C77A', ['wedding', 'festivals', 'special'], 'wedding|reception|muhurtham|sangeet|baraat', { trending: true }),
  T('royal-emerald', 'Emerald Durbar', 'Deep green, antique gold', 'traditional', 'script', 'mandala', 'sparkle',
    'radial-gradient(120% 80% at 50% 0%, #0F5A45 0%, #083B2D 70%, #052A20 100%)', '#FBF3DC', '#E3C77B', '#E3C77B', WED, 'wedding|engagement|nikah|walima'),
  T('royal-navy', 'Navy & Gold Palace', 'Midnight blue, gilded rings', 'elegant', 'serif', 'mandala', 'sparkle',
    'radial-gradient(120% 80% at 50% 0%, #1E3A8A 0%, #102257 70%, #0A1638 100%)', '#FDF6E3', '#E8C77A', '#E8C77A', ['wedding', 'corporate', 'special'], 'reception|anniversary|gala'),
  T('temple', 'Temple Classic', 'South Indian, kolam border', 'traditional', 'serif', 'kolam', 'glow',
    'linear-gradient(180deg, #FFF7E0 0%, #FFEFC4 100%)', '#5B1A0E', '#7A4B1F', '#1F7A3A', ['wedding', 'festivals', 'life'], 'pooja|homa|upanayana|thread|naming|griha|housewarming|seemantha|pongal|ugadi', { trending: true }),
  T('temple-kumkum', 'Kumkum & Turmeric', 'Red, yellow, auspicious', 'traditional', 'serif', 'kolam', 'glow',
    'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)', '#7F1D1D', '#92400E', '#B91C1C', FEST, 'pooja|varamahalakshmi|haldi|ganesh|vratha|satyanarayana'),
  T('toran-marigold', 'Marigold Toran', 'Genda garland at the door', 'traditional', 'serif', 'toran', 'petals',
    'linear-gradient(180deg, #FFFDF5 0%, #FFF3D6 100%)', '#7C2D12', '#9A3412', '#EA580C', ['wedding', 'festivals', 'life'], 'housewarming|griha|haldi|mehendi|diwali|navratri|dussehra|ganesh', { trending: true, petal: '#F59E0B' }),
  T('toran-mango', 'Mango Leaf Toran', 'Fresh leaves, cream', 'traditional', 'serif', 'toran', 'petals',
    'linear-gradient(180deg, #F7FEE7 0%, #ECFCCB 100%)', '#365314', '#4D7C0F', '#CA8A04', FEST, 'housewarming|griha|ugadi|pongal|sankranti|onam|naming', { petal: '#84CC16' }),
  T('paisley-rani', 'Rani Pink Paisley', 'Hot pink, gold mango motifs', 'traditional', 'script', 'paisley', 'sparkle',
    'linear-gradient(170deg, #9D174D 0%, #701A3E 100%)', '#FFF1F7', '#FBCFE8', '#F9D27A', WED, 'mehendi|sangeet|bridal|bangle|engagement'),
  T('paisley-peacock', 'Peacock Paisley', 'Teal, emerald, plumes', 'traditional', 'script', 'paisley', 'sparkle',
    'linear-gradient(170deg, #0F766E 0%, #134E4A 100%)', '#F0FDFA', '#99F6E4', '#FCD34D', ['wedding', 'festivals', 'special'], 'sangeet|krishna|janmashtami|navratri|garba'),
  T('mehendi-night', 'Mehendi Night', 'Henna green, warm gold', 'traditional', 'script', 'paisley', 'glow',
    'linear-gradient(170deg, #3F6212 0%, #283F0B 100%)', '#FEFCE8', '#D9F99D', '#FACC15', WED, 'mehendi|henna'),
  T('haldi-sunshine', 'Haldi Sunshine', 'Turmeric yellow, marigolds', 'floral', 'script', 'florals', 'petals',
    'linear-gradient(170deg, #FFFBEB 0%, #FEF08A 100%)', '#713F12', '#A16207', '#EA580C', WED, 'haldi|pellikuthuru|turmeric', { trending: true, petal: '#F59E0B' }),
  T('lotus-pink', 'Pink Lotus', 'Lotus pond, blush', 'traditional', 'serif', 'lotus', 'petals',
    'linear-gradient(180deg, #FFF1F5 0%, #FCE7F3 100%)', '#831843', '#9D174D', '#DB2777', ['wedding', 'festivals', 'life'], 'naming|cradle|annaprashan|seemantha|baby|lakshmi|varamahalakshmi', { petal: '#F472B6' }),
  T('lotus-ivory', 'Ivory Lotus', 'White, gold, serene', 'elegant', 'serif', 'lotus', 'glow',
    'linear-gradient(180deg, #FFFFFF 0%, #FAF7EF 100%)', '#3F2D12', '#7A5C2E', '#B08A3E', ['wedding', 'festivals', 'special', 'life'], 'pooja|homa|satsang|bhajan|retirement|sashtiabdapoorthi|60th'),
  T('rings-gold', 'Golden Rings', 'Two rings, champagne', 'romantic', 'script', 'rings', 'sparkle',
    'linear-gradient(170deg, #FFFBF2 0%, #F8EBD3 100%)', '#4A3412', '#8A6A2F', '#C9A24B', ['wedding', 'life', 'special'], 'engagement|ring|roka|nischitartham|sagai|proposal', { trending: true }),
  T('rings-blush', 'Blush Promise', 'Rose gold, soft pink', 'romantic', 'script', 'rings', 'hearts',
    'linear-gradient(170deg, #FFF5F5 0%, #FDE2E4 100%)', '#7F1D3A', '#B45A6E', '#E0A3A3', ['wedding', 'life', 'special'], 'engagement|proposal|pre-engagement|anniversary'),

  /* ── Floral & garden ───────────────────────────────────────────────── */
  T('floral', 'Floral Blush', 'Soft pinks, blooms', 'floral', 'script', 'florals', 'petals',
    'linear-gradient(170deg, #FFF5F7 0%, #FFE4EC 60%, #FFD3E0 100%)', '#6B1438', '#A8456F', '#E85D8A', ['wedding', 'life', 'special'], 'bridal shower|baby shower|bride|girl', { trending: true }),
  T('floral-lavender', 'Lavender Bloom', 'Lilac blooms, white', 'floral', 'script', 'florals', 'petals',
    'linear-gradient(170deg, #FAF5FF 0%, #EDE9FE 100%)', '#4C1D95', '#7C3AED', '#A78BFA', ['wedding', 'life', 'special'], 'shower|brunch|tea|anniversary', { petal: '#C4B5FD', bloom: ['#C4B5FD', '#DDD6FE'] }),
  T('floral-peach', 'Peach Garden', 'Peach roses, sage', 'floral', 'serif', 'florals', 'petals',
    'linear-gradient(170deg, #FFF7ED 0%, #FFE4D6 100%)', '#7C2D12', '#C2410C', '#FB923C', ['life', 'wedding', 'special', 'outdoor'], 'garden|brunch|anniversary|mother', { petal: '#FDBA74', bloom: ['#FDBA74', '#FED7AA'] }),
  T('floral-midnight', 'Midnight Roses', 'Dark, moody, red roses', 'romantic', 'serif', 'florals', 'petals',
    'linear-gradient(170deg, #1F1027 0%, #12091A 100%)', '#FFF1F2', '#FDA4AF', '#E11D48', ['wedding', 'nightlife', 'special'], 'cocktail|reception|valentine|date night', { petal: '#E11D48', bloom: ['#E11D48', '#BE123C'] }),
  T('garden', 'Pastel Garden', 'Mint, lavender, leaves', 'floral', 'serif', 'leaves', 'petals',
    'linear-gradient(165deg, #ECFDF5 0%, #F5F3FF 100%)', '#14532D', '#4D7C6B', '#7C3AED', ['life', 'special', 'outdoor', 'sport'], 'garden|picnic|outdoor|lawn', { petal: '#86EFAC' }),
  T('garden-sage', 'Sage Greenery', 'Eucalyptus, cream', 'floral', 'serif', 'leaves', 'petals',
    'linear-gradient(170deg, #F6F8F2 0%, #E7EDDF 100%)', '#2F3E2C', '#5B6E55', '#7D9471', ['wedding', 'outdoor', 'life', 'community'], 'farm|eco|retreat|wellness|yoga', { petal: '#A3B899', leaf: ['#A3B899', '#C7D3BE'] }),

  /* ── Festivals ─────────────────────────────────────────────────────── */
  T('diya', 'Festive Diya', 'Warm lamps, marigold', 'festive', 'serif', 'diya', 'glow',
    'radial-gradient(110% 80% at 50% 100%, #B4530A 0%, #7A2E00 45%, #3B0A00 100%)', '#FFF3D6', '#FCD34D', '#F59E0B', ['festivals', 'life', 'special'], 'diwali|deepavali|karthika|lakshmi|dhanteras', { trending: true }),
  T('diya-marigold', 'Marigold Lights', 'Cream, saffron, lamps', 'festive', 'serif', 'diya', 'glow',
    'linear-gradient(180deg, #FFF8EB 0%, #FFE8C2 100%)', '#7C2D12', '#B45309', '#EA580C', FEST, 'diwali|navratri|dussehra|festival|pooja'),
  T('crescent', 'Eid Crescent', 'Emerald, moon, lanterns', 'festive', 'serif', 'crescent', 'glow',
    'radial-gradient(120% 90% at 50% 0%, #065F46 0%, #064E3B 60%, #022C22 100%)', '#F0FDF4', '#FDE68A', '#FBBF24', ['festivals', 'special', 'community'], 'eid|ramadan|iftar|nikah|walima|milad', { trending: true }),
  T('crescent-night', 'Lantern Night', 'Indigo sky, gold lanterns', 'festive', 'serif', 'crescent', 'glow',
    'radial-gradient(120% 90% at 50% 0%, #312E81 0%, #1E1B4B 70%)', '#EEF2FF', '#FDE68A', '#F59E0B', ['festivals', 'special', 'community', 'food'], 'iftar|ramadan|eid|lantern|night'),
  T('christmas', 'Christmas Joy', 'Red, pine, baubles', 'festive', 'display', 'tree', 'snow',
    'linear-gradient(180deg, #B91C1C 0%, #7F1D1D 100%)', '#FFFFFF', '#FECACA', '#FCD34D', ['festivals', 'themed', 'corporate', 'school'], 'christmas|xmas|santa|carol', { trending: true }),
  T('winter', 'Winter Wonderland', 'Ice blue, snowflakes', 'festive', 'serif', 'tree', 'snow',
    'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)', '#1E3A8A', '#3B5BA9', '#60A5FA', ['festivals', 'themed', 'special'], 'christmas|winter|new year|snow'),
  T('holi', 'Holi Colours', 'Gulal splashes, white', 'festive', 'display', 'brush', 'confetti',
    'linear-gradient(170deg, #FFFFFF 0%, #FFF7FB 100%)', '#701A75', '#A21CAF', '#F43F5E', ['festivals', 'themed', 'college', 'community'], 'holi|rang|colour|color', { trending: true, palette: ['#F43F5E', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7'] }),
  T('newyear', 'New Year Glam', 'Black, gold, fireworks', 'party', 'display', 'stars', 'confetti',
    'radial-gradient(120% 90% at 50% 0%, #27272A 0%, #09090B 70%)', '#FFFFFF', '#FDE68A', '#FACC15', ['themed', 'nightlife', 'corporate', 'festivals'], 'new year|countdown|nye|31st', { trending: true, palette: ['#FACC15', '#FDE68A', '#FFFFFF'] }),
  T('midnight', 'Midnight Gold', 'Navy night, gold stars', 'elegant', 'serif', 'stars', 'sparkle',
    'radial-gradient(100% 70% at 50% 10%, #1E2A5A 0%, #0B1026 75%)', '#FFFFFF', '#C9B37A', '#E3C46B', ['wedding', 'corporate', 'nightlife', 'special', 'life'], 'gala|dinner|night|reception|award'),
  T('midnight-rose', 'Rose Gold Night', 'Plum night, rose gold', 'elegant', 'serif', 'stars', 'sparkle',
    'radial-gradient(100% 70% at 50% 10%, #4A1942 0%, #22091F 75%)', '#FFF1F2', '#F4C2C2', '#E8B4A0', ['wedding', 'life', 'special', 'nightlife'], 'anniversary|cocktail|bachelorette|birthday'),

  /* ── Kids & parties ────────────────────────────────────────────────── */
  T('confetti', 'Confetti Pop', 'Bright, playful, party', 'party', 'display', 'confetti', 'confetti',
    'linear-gradient(160deg, #FFFFFF 0%, #FFF6E5 100%)', '#1C1033', '#5F5675', '#7C3AED', ['life', 'school', 'themed', 'college'], 'birthday|party|celebration', { trending: true }),
  T('confetti-candy', 'Candy Confetti', 'Bubblegum pink, sprinkles', 'kids', 'display', 'confetti', 'confetti',
    'linear-gradient(160deg, #FFF0F7 0%, #FFE1EF 100%)', '#831843', '#BE185D', '#EC4899', KIDS, 'kids|girl|princess|candy|first birthday|1st'),
  T('balloons', 'Balloon Party', 'Balloons, sunshine', 'kids', 'display', 'balloons', 'balloons',
    'linear-gradient(180deg, #F0F9FF 0%, #FFFBEB 100%)', '#0C4A6E', '#0369A1', '#F43F5E', KIDS, 'birthday|kids|first birthday|1st|surprise', { trending: true }),
  T('balloons-pastel', 'Pastel Balloons', 'Soft balloons, cloud white', 'kids', 'display', 'balloons', 'balloons',
    'linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 100%)', '#4C1D95', '#6D28D9', '#A78BFA', ['life', 'school', 'special'], 'first birthday|1st|baby|naming|kids', { palette: ['#C4B5FD', '#FBCFE8', '#BAE6FD', '#FDE68A'] }),
  T('bunting', 'Carnival Bunting', 'Flags, fun fair', 'kids', 'display', 'bunting', 'confetti',
    'linear-gradient(180deg, #FFFEF5 0%, #FFF7D6 100%)', '#1E3A8A', '#1D4ED8', '#EF4444', ['school', 'themed', 'community', 'life', 'public'], 'carnival|fair|fete|kids|sports day|annual day|children'),
  T('little-star-blue', 'Little Star Blue', 'Moon, stars, clouds', 'kids', 'serif', 'baby', 'sparkle',
    'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)', '#1E3A8A', '#3B5BA9', '#93C5FD', ['life', 'special'], 'baby|naming|cradle|shower|boy|welcome|1st|first'),
  T('little-star-pink', 'Little Star Pink', 'Blush moon, stars', 'kids', 'serif', 'baby', 'sparkle',
    'linear-gradient(180deg, #FFF1F5 0%, #FCE7F3 100%)', '#831843', '#BE185D', '#F9A8D4', ['life', 'special'], 'baby|naming|cradle|shower|girl|welcome|1st|first'),
  T('little-star-mint', 'Twinkle Mint', 'Mint, cream, stars', 'kids', 'serif', 'baby', 'sparkle',
    'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%)', '#14532D', '#15803D', '#86EFAC', ['life', 'special'], 'baby|shower|gender|naming|cradle'),
  T('hearts', 'Love Notes', 'Hearts, blush, sweet', 'romantic', 'script', 'hearts', 'hearts',
    'linear-gradient(170deg, #FFF5F7 0%, #FFE4E6 100%)', '#881337', '#BE123C', '#F43F5E', ['life', 'wedding', 'special'], 'anniversary|valentine|proposal|love|date', { trending: true }),
  T('hearts-red', 'Red Romance', 'Crimson, gold hearts', 'romantic', 'script', 'hearts', 'hearts',
    'linear-gradient(170deg, #9F1239 0%, #4C0519 100%)', '#FFF1F2', '#FECDD3', '#FCD34D', ['life', 'special', 'nightlife'], 'valentine|anniversary|proposal|jubilee'),
  T('jubilee', 'Silver & Gold Jubilee', 'Shimmer, years together', 'elegant', 'serif', 'rings', 'sparkle',
    'linear-gradient(170deg, #F8FAFC 0%, #E2E8F0 100%)', '#1E293B', '#475569', '#94A3B8', ['life', 'special', 'corporate'], 'silver|golden|jubilee|25th|50th|anniversary'),

  /* ── Modern & minimal ──────────────────────────────────────────────── */
  T('minimal', 'Modern Minimal', 'White, fine lines', 'modern', 'serif', 'frame', 'sparkle',
    'linear-gradient(180deg, #FFFFFF 0%, #F7F5F2 100%)', '#1A1A1A', '#6B6B6B', '#1A1A1A', ['corporate', 'industry', 'property', 'retail', 'wedding', 'life']),
  T('charcoal', 'Charcoal Luxe', 'Black card, gold rule', 'modern', 'serif', 'frame', 'sparkle',
    'linear-gradient(180deg, #1C1917 0%, #0C0A09 100%)', '#FAFAF9', '#D6D3D1', '#D4AF37', ['corporate', 'nightlife', 'retail', 'property', 'special'], 'launch|gala|dinner|fashion|vip'),
  T('deco-gold', 'Art Deco Gold', 'Gatsby fans, gold', 'elegant', 'serif', 'geo', 'sparkle',
    'linear-gradient(180deg, #111827 0%, #030712 100%)', '#FEF3C7', '#FCD34D', '#D4A017', ['nightlife', 'corporate', 'themed', 'special', 'wedding'], 'gatsby|gala|cocktail|award|retro|vintage', { trending: true }),
  T('geo-teal', 'Geometric Teal', 'Clean shapes, teal', 'modern', 'sans', 'geo', 'sparkle',
    'linear-gradient(180deg, #F0FDFA 0%, #CCFBF1 100%)', '#134E4A', '#0F766E', '#14B8A6', ['corporate', 'college', 'industry', 'online', 'community'], 'meetup|hackathon|workshop|seminar|tech'),
  T('watercolour', 'Watercolour Splash', 'Soft washes, artsy', 'modern', 'script', 'brush', 'petals',
    'linear-gradient(170deg, #FFFFFF 0%, #FDFBF7 100%)', '#3B0764', '#6B21A8', '#C084FC', ['life', 'special', 'public', 'retail', 'college'], 'art|exhibition|craft|brunch|shower', { palette: ['#C084FC', '#F9A8D4', '#93C5FD'] }),
  T('sunset', 'Sunset Wash', 'Coral, tangerine, gold', 'modern', 'serif', 'brush', 'sparkle',
    'linear-gradient(170deg, #FFF7ED 0%, #FFEDD5 100%)', '#7C2D12', '#C2410C', '#FB7185', ['outdoor', 'life', 'food', 'special'], 'sundowner|rooftop|terrace|beach|dinner', { palette: ['#FB7185', '#FDBA74', '#FDE047'] }),
  T('amethyst', 'Sambramo Amethyst', 'Our purple, clean', 'modern', 'serif', 'arch', 'sparkle',
    'linear-gradient(170deg, #FBF7FF 0%, #EFE4FF 100%)', '#2E1065', '#6D28D9', '#7C3AED', []),
  T('arch-blush', 'Blush Arch', 'Rounded arch, warm blush', 'modern', 'serif', 'arch', 'petals',
    'linear-gradient(170deg, #FFF8F5 0%, #FDE8E0 100%)', '#5B2333', '#9F4A5A', '#D9826F', ['wedding', 'life', 'special'], 'bridal|shower|engagement|brunch', { petal: '#F4B5A4' }),

  /* ── Nightlife, stage & shows ──────────────────────────────────────── */
  T('neon', 'Neon Night', 'Glow, music, late nights', 'party', 'display', 'neon', 'glow',
    'radial-gradient(120% 90% at 50% 0%, #2A0050 0%, #12002B 70%)', '#FFFFFF', '#F0ABFC', '#22D3EE', ['nightlife', 'themed', 'college', 'public'], 'dj|club|night|party|bachelor|bachelorette|rave', { trending: true }),
  T('neon-miami', 'Miami Neon', 'Pink & cyan glow', 'party', 'display', 'neon', 'glow',
    'radial-gradient(120% 90% at 50% 0%, #3B0764 0%, #1E0335 70%)', '#FFFFFF', '#F472B6', '#2DD4BF', ['nightlife', 'themed', 'college', 'life'], 'pool|beach|summer|retro|80s|90s'),
  T('spotlight', 'Spotlight Stage', 'Curtains, beams, applause', 'party', 'display', 'stage', 'glow',
    'radial-gradient(110% 80% at 50% 0%, #450A0A 0%, #1C0505 70%)', '#FFF7ED', '#FCD34D', '#F59E0B', ['public', 'nightlife', 'school', 'college', 'community'], 'concert|show|play|drama|recital|award|annual day|talent|tribute concert|premiere', { trending: true }),
  T('beach', 'Beach & Waves', 'Sea blue, sand, sun', 'party', 'display', 'waves', 'sparkle',
    'linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 60%, #FEF3C7 100%)', '#0C4A6E', '#0369A1', '#0EA5E9', ['outdoor', 'themed', 'life', 'wedding'], 'beach|pool|destination|island|resort|cruise|goa'),

  /* ── Work, college & sport ─────────────────────────────────────────── */
  T('corporate', 'Corporate Clean', 'Navy band, crisp type', 'corporate', 'sans', 'band', 'sparkle',
    'linear-gradient(180deg, #0F172A 0%, #0F172A 30%, #FFFFFF 30%, #FFFFFF 100%)', '#0F172A', '#475569', '#2563EB', WORK, 'conference|summit|meeting|agm|launch|offsite|town hall'),
  T('boardroom', 'Boardroom Green', 'Forest band, white', 'corporate', 'sans', 'band', 'sparkle',
    'linear-gradient(180deg, #14532D 0%, #14532D 30%, #FFFFFF 30%, #FFFFFF 100%)', '#14532D', '#3F6212', '#16A34A', WORK, 'csr|sustainab|green|agri|annual'),
  T('maroon-band', 'Heritage Band', 'Maroon band, ivory', 'corporate', 'serif', 'band', 'sparkle',
    'linear-gradient(180deg, #7F1D1D 0%, #7F1D1D 30%, #FFFBF5 30%, #FFFBF5 100%)', '#4C0519', '#7F1D1D', '#B45309', ['corporate', 'college', 'school', 'community', 'industry'], 'alumni|founders|anniversary|convocation|jubilee'),
  T('graduation', 'Graduation Gold', 'Cap, laurels, navy', 'elegant', 'serif', 'cap', 'confetti',
    'linear-gradient(180deg, #172554 0%, #0B1438 100%)', '#FFFFFF', '#FDE68A', '#FACC15', ['college', 'school', 'online', 'life'], 'graduat|convocation|farewell|alumni|degree|passing out', { trending: true, palette: ['#FACC15', '#FFFFFF', '#93C5FD'] }),
  T('scholar', 'Scholar White', 'Ivory, laurel, ink blue', 'modern', 'serif', 'cap', 'sparkle',
    'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)', '#1E3A8A', '#334155', '#2563EB', ['college', 'school', 'corporate', 'industry'], 'graduat|convocation|seminar|lecture|award|prize'),
  T('champion', 'Champion Sport', 'Laurel, energy, trophy gold', 'party', 'display', 'cap', 'confetti',
    'linear-gradient(170deg, #FFF7ED 0%, #FFEDD5 100%)', '#7C2D12', '#C2410C', '#F97316', ['sport', 'school', 'college', 'community'], 'sport|match|tournament|marathon|run|cricket|league|fitness|victory', { palette: ['#F97316', '#FACC15', '#22C55E'], laurelOnly: true }),

  /* ── Quiet, for days of remembrance ────────────────────────────────── */
  T('candle', 'Candle of Remembrance', 'Soft light, quiet', 'solemn', 'serif', 'candle', 'glow',
    'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)', '#292524', '#57534E', '#A8A29E', [], 'memorial|remembrance|celebration of life|tribute|condolence|prayer meet|shraddh', { solemn: true }),
  T('white-lily', 'White Lily', 'White lilies, grey', 'solemn', 'serif', 'lotus', 'glow',
    'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', '#334155', '#64748B', '#94A3B8', [], 'memorial|remembrance|celebration of life|tribute|prayer', { solemn: true }),
]
export const TEMPLATE = Object.fromEntries(TEMPLATES.map(t => [t.id, t]))

/* The filter row on the design picker. */
export const STYLES = [['all', 'All'], ['trending', '🔥 Trending'], ['traditional', 'Traditional'], ['floral', 'Floral'], ['festive', 'Festive'], ['romantic', 'Romantic'],
  ['kids', 'Kids & baby'], ['party', 'Party'], ['elegant', 'Elegant'], ['modern', 'Modern'], ['corporate', 'Corporate'], ['solemn', 'Remembrance']]

const SOLEMN = /memorial|remembrance|celebration-of-life|condolence|prayer-meet|shraddh/
export const isSolemn = occasion => !!occasion && SOLEMN.test(occasion.id)

/** How well one design suits one occasion. */
function fitScore(t, occasion) {
  if (!occasion) return t.solemn ? -100 : (t.trending ? 2 : 0)
  if (isSolemn(occasion)) return t.solemn ? 10 : t.id === 'minimal' || t.id === 'lotus-ivory' ? 4 : -100
  if (t.solemn) return -100
  const text = `${occasion.name} ${occasion.id.replace(/-/g, ' ')}`
  return (t.kw?.test(text) ? 6 : 0) + (t.for.includes(occasion.category) ? 3 : 0) + (t.trending ? 1 : 0)
}

/** Designs for an occasion, best fit first (then the rest). Never shows a party design for a memorial. */
export function templatesFor(occasion) {
  const scored = TEMPLATES.map((t, i) => ({ t, s: fitScore(t, occasion), i })).filter(x => x.s > -100)
  return scored.sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.t)
}
/** The ones genuinely made for this occasion (labelled "Made for this"). */
export const recommendedFor = occasion => new Set(TEMPLATES.filter(t => fitScore(t, occasion) >= 6).map(t => t.id))

export function parseTheme(theme, occasion) {
  const [id, ...flags] = String(theme ?? '').split('|')
  const t = TEMPLATE[id] ?? templatesFor(occasion)[0] ?? TEMPLATE.amethyst
  return { t, art: flags.includes('art'), live: flags.includes('live') }
}
export const themeString = (id, { art = false, live = false } = {}) => [id, art && 'art', live && 'live'].filter(Boolean).join('|')
