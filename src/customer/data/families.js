/**
 * The 34 trades in the twelve families a customer shops by — the tiles
 * on Home's "Book a Service" door and the Services tab. Every trade is in
 * exactly one family (checked at load), so nothing a partner lists is
 * unreachable from here.
 */
import { TRADES } from './trades'

const F = (id, label, line, tone, trades) => ({ id, label, line, tone, trades })

export const FAMILIES = [
  F('photo', 'Photography', 'Candid · Traditional · Film', '#F3ECFF', ['photography', 'videography']),
  F('food', 'Catering', 'Veg · Non-veg · Live counters', '#FFF1E2', ['catering_food', 'bar_beverages']),
  F('decor', 'Decoration', 'Stage · Flowers · Lights', '#FFE9F1', ['decoration_floral', 'event_lighting']),
  F('venue', 'Venues', 'Halls · Lawns · Terraces', '#E8F1FF', ['venue']),
  F('beauty', 'Makeup & Mehendi', 'Bridal · Party · Family', '#E9F8EF', ['bridal_makeup_hair', 'mehendi_artist']),
  F('stage', 'Music & Entertainment', 'DJ · Anchors · Live bands · Sound', '#F6E8FF', ['dj_music', 'live_entertainment', 'anchor_mc', 'sound_av']),
  F('cake', 'Cakes & Desserts', 'Custom cakes · Dessert tables', '#FFEFF4', ['cake_desserts']),
  F('rituals', 'Priest & Rituals', 'Pooja · Homa · Trousseau', '#FFF5DD', ['priest_rituals', 'trousseau_gift_packing']),
  F('print', 'Invites & Gifting', 'Invites · Return gifts · Supplies', '#FDEBF3', ['invitation_printing', 'gifts_favours', 'event_materials_supplier']),
  F('setup', 'Tents, Power & Rentals', 'Shamiana · Gensets · Safety', '#FFF3E6', ['tent_furniture', 'power_cooling', 'event_equipment_rental', 'warehouse_storage', 'safety_facilities']),
  F('plan', 'Planners & Hosts', 'Full planning · Hosts · Security', '#EEF0FF', ['wedding_planning', 'end_to_end_event_logistics', 'guest_services', 'security_services']),
  F('move', 'Transport & Logistics', 'Cars · Tempo · Trucks · Crew', '#E6F6F8', ['passenger_transport', 'transportation', 'mini_truck_pickup', 'medium_large_goods_vehicle', 'loading_unloading_crew', 'valet_parking']),
]

export const FAMILY = Object.fromEntries(FAMILIES.map(f => [f.id, f]))

const placed = FAMILIES.flatMap(f => f.trades)
const missing = TRADES.map(t => t.id).filter(id => !placed.includes(id))
if (missing.length || placed.length !== TRADES.length) throw new Error(`families: unplaced ${missing.join(', ')}`)
