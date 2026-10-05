import React from 'react'
import {
  Archive, Armchair, BadgeAlert, BatteryCharging, BellRing, Boxes, Brush,
  Building2, CakeSlice, Camera, ClipboardCheck, ClipboardList, Flower2,
  Gift, HandHeart, HeartPulse, Lightbulb, Mail, Megaphone, Mic, Music,
  Package, PackageOpen, ParkingSquare, Printer, Shield, SprayCan, Speaker,
  Sparkles, Store, Tent, Bath, Truck, UserRound, UsersRound, Video,
  Warehouse, Zap,
} from 'lucide-react'
import './SambramoTradePictogram.css'

const ICONS = {
  'Anchor & MC': Mic,
  'Bar & Beverages': BellRing,
  'Bridal Makeup & Hair': Brush,
  'Cake & Desserts': CakeSlice,
  'Catering & Food': Store,
  'DJ & Music': Music,
  'Decoration & Floral': Flower2,
  'End-to-End Event Logistics': Truck,
  'Event Equipment Rental': Package,
  'Event Lighting': Lightbulb,
  'Event Materials Supplier': PackageOpen,
  'Gifts & Favours': Gift,
  'Guest Services': HandHeart,
  'Invitation & Printing': Mail,
  'Live Entertainment': Sparkles,
  'Loading & Unloading Crew': UsersRound,
  'Medium / Large Goods Vehicle': Truck,
  'Mehendi Artist': Brush,
  'Mini Truck / Pickup': Truck,
  'Passenger Transport': UsersRound,
  'Photography': Camera,
  'Power & Cooling': BatteryCharging,
  'Priest & Rituals': Sparkles,
  'Safety & Facilities': HeartPulse,
  'Security Services': Shield,
  'Sound & AV': Speaker,
  'Tent & Furniture': Tent,
  'Transportation': Truck,
  'Trousseau & Gift Packing': Gift,
  'Valet Parking': ParkingSquare,
  'Venue': Building2,
  'Videography': Video,
  'Warehouse / Storage': Warehouse,
  'Wedding Planning': ClipboardList,

  /* Common aliases kept intentionally: older rows can carry these names
     while the same canonical pictogram is already visible elsewhere. */
  'Event Planning & Coordination': ClipboardCheck,
  'Invitations & Print Media': Mail,
  'Security & Bouncers': Shield,
  'Cleaning & Housekeeping': SprayCan,
  'Medical & Safety': HeartPulse,
  'Fire Safety & Compliance': BadgeAlert,
  'Parking & Traffic Management': ParkingSquare,
  'Toilets & Sanitation': Bath,
  'Signage & Branding': Megaphone,
  'Live Counters & Food Stalls': Store,
}

const PALETTE = {
  purple: ['#7C3AED', '#4C1D95', '#C4B5FD'],
  orchid: ['#9333EA', '#581C87', '#E9D5FF'],
  indigo: ['#6366F1', '#312E81', '#C7D2FE'],
  sky: ['#0EA5E9', '#075985', '#BAE6FD'],
  rose: ['#EC4899', '#831843', '#FBCFE8'],
  amber: ['#F59E0B', '#92400E', '#FDE68A'],
}

const PALETTE_KEYS = Object.keys(PALETTE)

function paletteForTrade(trade) {
  let hash = 0
  for (const ch of String(trade ?? '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[PALETTE_KEYS[hash % PALETTE_KEYS.length]]
}

export function tradePictogramIcon(trade) {
  return ICONS[trade] ?? Package
}

export default function SambramoTradePictogram({
  trade,
  size = 'md',
  className = '',
  showSparkle = true,
  title = true,
}) {
  const Icon = tradePictogramIcon(trade)
  const [a, b, highlight] = paletteForTrade(trade)
  const titleText = String(trade ?? '').trim()

  return (
    <span
      className={'sambramo-trade-pictogram sambramo-trade-pictogram-' + size + ' ' + className}
      style={{ '--sam-a': a, '--sam-b': b, '--sam-highlight': highlight }}
      data-trade-pictogram={titleText || 'trade'}
      aria-label={title ? titleText : undefined}
      role={title ? 'img' : undefined}
    >
      <span className="sambramo-trade-pictogram-glow" />
      <span className="sambramo-trade-pictogram-sheen" />
      <span className="sambramo-trade-pictogram-depth" aria-hidden="true"><Icon /></span>
      <span className="sambramo-trade-pictogram-face" aria-hidden="true"><Icon /></span>
      {showSparkle ? <span className="sambramo-trade-pictogram-sparkle" aria-hidden="true">✦</span> : null}
    </span>
  )
}
