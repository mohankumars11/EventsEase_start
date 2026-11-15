/**
 * The colours of an event card — warm, emotional, and the occasion's own
 * (Mohan, 2026-11-11: "Valentine's Day, amazing red; bachelor party, that
 * specific kind of card … a contrasting colour for every occasion").
 *
 * 438 occasions cannot each be coloured by hand, so the theme is read off
 * the occasion's words first (a proposal is rose, a haldi is turmeric, a
 * bachelor party is midnight and gold) and then its category. Every theme
 * is one set: the band the name sits on, the paper under the details, the
 * ink, the metal of the frame, and a soft tint for the rows.
 */
const T = (band, paper, ink, accent, soft, frame, script = 'Great Vibes') => ({ band, paper, ink, accent, soft, frame, script })
const GOLD = ['#F6D88B', '#C9962E', '#F7E6B0', '#B8860B']
const ROSEGOLD = ['#F7C9B9', '#C97B5E', '#FBE3D6', '#B4613F']
const SILVER = ['#F1F3F7', '#A9B1C2', '#FFFFFF', '#8B95A8']
const COPPER = ['#F3C9A3', '#B9733A', '#F9E2CB', '#9A5A26']

export const THEMES = {
  rose:       T(['#C8102E', '#7A0A24'], '#FFF6F6', '#4A0A18', '#D4AF37', '#FDE6E9', GOLD),
  midnight:   T(['#1B1333', '#0B0716'], '#FBFAFF', '#1B1333', '#E8B64B', '#F0ECFA', GOLD),
  pastel:     T(['#F9A8C9', '#F472B6'], '#FFF9FB', '#5B2140', '#7FC8A9', '#FDEFF5', ROSEGOLD),
  haldi:      T(['#F5B301', '#D98E04'], '#FFFBEA', '#5A3A00', '#1B7F4A', '#FFF1C2', GOLD),
  mehendi:    T(['#2E7D32', '#1B5E20'], '#F7FBF4', '#173D1A', '#D4AF37', '#E6F3E0', GOLD),
  sangeet:    T(['#C2185B', '#7B1240'], '#FFF6FA', '#4A0E2A', '#FFC845', '#FCE4EF', GOLD),
  maroon:     T(['#8E0E2A', '#5A0718'], '#FFF8F3', '#4A0A18', '#D4AF37', '#F9E7DE', GOLD),
  evergreen:  T(['#0F5132', '#0B3D25'], '#F8FBF7', '#0B3D25', '#C8102E', '#E3F1E6', GOLD),
  emerald:    T(['#0B7A5C', '#064E3B'], '#F4FBF8', '#053D2E', '#E8B64B', '#DDF2EA', GOLD),
  holi:       T(['#FF3D7F', '#7C3AED'], '#FFFBF5', '#3B1670', '#FFC845', '#FFEDE1', GOLD),
  saffron:    T(['#F26B1D', '#B53C06'], '#FFF8F0', '#5A2300', '#7A1E1E', '#FFE9D6', GOLD),
  candy:      T(['#FF4FA3', '#7C3AED'], '#FFF8FC', '#3B1670', '#FFC845', '#FBE7F3', GOLD),
  terracotta: T(['#C2552A', '#8A3514'], '#FFF8F2', '#4A1E0C', '#2E7D32', '#FBE8DC', COPPER),
  coral:      T(['#FF6B57', '#D63A2A'], '#FFF8F5', '#5A1C13', '#0F766E', '#FFE7E1', COPPER),
  navy:       T(['#1E3A8A', '#0F1F4D'], '#F7F9FF', '#0F1F4D', '#C9A24A', '#E8EDFB', SILVER),
  royal:      T(['#2563EB', '#1E3A8A'], '#F6F9FF', '#12245E', '#F59E0B', '#E6EEFF', SILVER),
  amber:      T(['#F59E0B', '#B45309'], '#FFFBF2', '#4A2A00', '#1E3A8A', '#FFF0D0', GOLD),
  olive:      T(['#6B8E23', '#3F5A12'], '#FAFCF5', '#2A3B0C', '#C2552A', '#EDF3DF', COPPER),
  forest:     T(['#2F855A', '#1C4D36'], '#F6FBF7', '#153A28', '#F59E0B', '#E1F0E7', COPPER),
  cobalt:     T(['#3B5BDB', '#1F3A93'], '#F7F8FF', '#162A6B', '#22C55E', '#E7EAFB', SILVER),
  teal:       T(['#0F766E', '#115E59'], '#F4FBFA', '#0B3F3A', '#F59E0B', '#DDF2EF', GOLD),
  plum:       T(['#7C3AED', '#4C1D95'], '#FBF8FF', '#2E1065', '#D4AF37', '#F1E9FF', GOLD),
}

const BY_WORDS = [
  [/valentine|romantic|propos|anniversar|date night|honeymoon/, 'rose'],
  [/bachelor|bachelorette|cocktail|club night|nightlife|rave|after-?party|pub|bar night/, 'midnight'],
  [/haldi/, 'haldi'], [/mehendi|mehndi/, 'mehendi'], [/sangeet/, 'sangeet'],
  [/baby|naming|cradle|rice-?feed|gender reveal|shower|annaprashan|mundan/, 'pastel'],
  [/wedding|engagement|roka|reception|muhurth|jaimala|baraat|bridal|nikah|vivah|pellik/, 'maroon'],
  [/christmas|xmas/, 'evergreen'], [/eid|iftar|ramadan/, 'emerald'], [/holi\b/, 'holi'],
  [/diwali|deepavali|pooja|puja|navratri|durga|dussehra|ganesh|onam|pongal|ugadi|gudi|vishu|sankranti|festival|temple|gurpurab|shivaratri|janmashtami|saraswati/, 'saffron'],
  [/birthday|kids|children|teen|surprise|theme party/, 'candy'],
  [/house ?warming|griha|new home|home blessing/, 'terracotta'],
  [/graduat|convocation|farewell|retire|reunion|get-?together|friends|family|kitty|alumni|meet-?up/, 'coral'],
]
const BY_CATEGORY = { life: 'candy', wedding: 'maroon', festivals: 'saffron', school: 'royal', college: 'royal', corporate: 'navy', industry: 'navy', property: 'terracotta', retail: 'navy',
  nightlife: 'midnight', public: 'teal', community: 'teal', sport: 'amber', food: 'olive', outdoor: 'forest', online: 'cobalt', themed: 'plum', special: 'plum' }

/** The theme for an occasion: its words first, then its category. */
export function cardTheme(o) {
  const s = `${o?.id ?? ''} ${o?.name ?? ''} ${o?.template ?? ''}`.toLowerCase().replace(/-/g, ' ')
  for (const [re, k] of BY_WORDS) if (re.test(s)) return { key: k, ...THEMES[k] }
  const k = BY_CATEGORY[o?.category] ?? 'plum'
  return { key: k, ...THEMES[k] }
}
