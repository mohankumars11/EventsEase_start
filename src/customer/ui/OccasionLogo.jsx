/**
 * The occasion's own logo — a flat mark on a gradient badge, for the
 * cards of the event-details flow (Mohan, 2026-11-10: "use the specific
 * logo for that event … but not the 3D one — have it on the card itself").
 *
 * 438 occasions cannot each be drawn, so the mark is read off the
 * occasion's name first (a birthday is a cake, a housewarming a house, a
 * get-together a group of friends) and falls back to its category; the
 * badge always takes the category's colours, so a family of occasions
 * reads as a family.
 */
import {
  Baby, Backpack, Briefcase, Building2, Cake, Camera, Drama, Dumbbell, Factory, Flame, Flower2, Gem, Gift, GraduationCap, Hand, Heart,
  HeartHandshake, Home, Landmark, Mic2, MonitorPlay, Music2, Palette, PartyPopper, Plane, Rocket, ShoppingBag, Zap, Sun, Tent, Ticket,
  TreePine, Trophy, Users, UtensilsCrossed, Wine,
} from 'lucide-react'

const BY_NAME = [
  [/birthday|turns|first year|1st/, Cake],
  [/baby|naming|cradle|annaprashan|mundan|gender reveal|shower/, Baby],
  [/haldi|mehendi|mehndi/, Flower2],
  [/wedding|marriage|reception|sangeet|engagement|roka|nikah|vivah/, Gem],
  [/anniversar|propos|valentine|date night|romantic/, Heart],
  [/house ?warming|griha|new home|home blessing/, Home],
  [/get-?together|reunion|friends|kitty|alumni|meet-?up|bachelor/, Users],
  [/dinner|lunch|brunch|food|bbq|barbecue|chef|tasting|feast/, UtensilsCrossed],
  [/cocktail|wine|bar night/, Wine],
  [/christmas|xmas/, TreePine],
  [/holi|colour|color/, Palette],
  [/diwali|deepavali|pooja|puja|havan|homa|temple|festival|navratri|ganesh|onam|pongal|eid|iftar/, Flame],
  [/graduat|convocation|farewell|freshers/, GraduationCap],
  [/retire|send-?off|goodbye/, Hand],
  [/launch|startup|demo day|unveil/, Rocket],
  [/conference|summit|seminar|corporate|offsite|annual day|town ?hall|meeting|award/, Briefcase],
  [/concert|dj|music|band|gig|rave/, Music2],
  [/comedy|open mic|stand-?up|talk show/, Mic2],
  [/theatre|theater|drama|masquerade|halloween|costume|themed/, Drama],
  [/exhibition|expo|museum|gallery|heritage/, Landmark],
  [/tournament|match|marathon|run|race|sports|league|championship/, Trophy],
  [/yoga|fitness|wellness|retreat/, Dumbbell],
  [/camp|trek|hike/, Tent],
  [/beach|pool|summer/, Sun],
  [/destination|cruise|trip|travel/, Plane],
  [/photo|shoot/, Camera],
  [/webinar|livestream|virtual|online|hybrid/, MonitorPlay],
  [/fashion|pop-?up|sale|store|retail|shopping/, ShoppingBag],
  [/surprise|party|celebration/, PartyPopper],
  [/gift|hamper/, Gift],
]

const BY_CATEGORY = {
  life: Cake, wedding: Gem, festivals: Flame, school: Backpack, college: GraduationCap, corporate: Briefcase,
  nightlife: Music2, public: Ticket, sport: Trophy, food: UtensilsCrossed, retail: ShoppingBag, property: Building2,
  community: HeartHandshake, industry: Factory, themed: Drama, outdoor: Tent, online: MonitorPlay, special: Gift,
}

/** [light, deep] — the badge gradient for each category. */
export const CATEGORY_GRADIENT = {
  life: ['#FF7DB6', '#D6246E'], wedding: ['#FFB547', '#D97706'], festivals: ['#FF9A3C', '#D9480F'], school: ['#5FA8FF', '#2563EB'],
  college: ['#8B7CFF', '#5B3DF5'], corporate: ['#6F91C2', '#33507A'], nightlife: ['#C26BFF', '#7E22CE'], public: ['#FF7A59', '#D9381E'],
  sport: ['#FFC23A', '#C27C00'], food: ['#34C79A', '#0B8A63'], retail: ['#FF6FA3', '#C2185B'], property: ['#4CC071', '#15803D'],
  community: ['#4BA5EA', '#1D6FB8'], industry: ['#8B9BB0', '#475569'], themed: ['#8B63FF', '#5B21B6'], outdoor: ['#5CB76A', '#22743A'],
  online: ['#5F8BFF', '#2948C8'], special: ['#FF7A7A', '#C62828'],
}

export function occasionIcon(o) {
  const s = `${o?.id ?? ''} ${o?.name ?? ''}`.toLowerCase().replace(/-/g, ' ')
  for (const [re, icon] of BY_NAME) if (re.test(s)) return icon
  return BY_CATEGORY[o?.category] ?? Zap
}

export default function OccasionLogo({ occasion, size = 52, className = '' }) {
  const Icon = occasionIcon(occasion)
  const [a, b] = CATEGORY_GRADIENT[occasion?.category] ?? ['#8B5CF6', '#5B21B6']
  return (
    <span className={'relative grid shrink-0 place-items-center overflow-hidden text-white ' + className} aria-hidden data-occasion-logo
      style={{ width: size, height: size, borderRadius: size * 0.32, background: `linear-gradient(140deg, ${a} 0%, ${b} 100%)`, boxShadow: `0 10px 22px -12px ${b}` }}>
      <span className="absolute inset-x-0 top-0 h-1/2 bg-white/15" />
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} className="relative" />
    </span>
  )
}
