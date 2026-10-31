/**
 * The 34 trades, as a customer reads them.
 *
 * The registry (src/data/trades/registry.js) names a trade the way a
 * partner signs up for it — "Beverages, Ice Cream & Cold Storage",
 * "Medium / Large Goods Vehicle". Those names are stored and matched on,
 * so they cannot change. A customer scanning a list needs the short word
 * they would say out loud instead, plus one line on why they might want
 * it. This file is that translation and nothing else: ids are the
 * registry's, so a customer tile and a partner listing always agree.
 */
import {
  Mic, CupSoda, Brush, Cake, Utensils, Disc3, Sparkles, ClipboardList, Armchair, Lightbulb, Boxes, Gift,
  HandHeart, Mail, Music, HardHat, Container, Hand, Truck, Bus, Camera, PlugZap, Flame, LifeBuoy,
  ShieldCheck, Speaker, Tent, Route, PackageOpen, SquareParking, Building2, Video, Warehouse, HeartHandshake,
} from 'lucide-react'
import { TRADE_BY_ID } from '../../data/trades/registry'

const t = (id, label, why, icon, group) => ({ id, label, why, icon, group, name: TRADE_BY_ID[id].name, archetype: TRADE_BY_ID[id].archetype })

export const TRADES = [
  t('catering_food', 'Catering', 'Food for every guest, cooked and served hot', Utensils, 'food'),
  t('cake_desserts', 'Cakes & desserts', 'The cake, and a dessert table if you want one', Cake, 'food'),
  t('bar_beverages', 'Drinks & ice cream', 'Mocktail, coffee and ice-cream counters', CupSoda, 'food'),
  t('venue', 'Venue', 'Halls, lawns and terraces for your guest count', Building2, 'space'),
  t('decoration_floral', 'Décor & flowers', 'Stage, entrance and flowers, set up and removed', Sparkles, 'space'),
  t('tent_furniture', 'Tents & furniture', 'Shamiana, hangar, chairs and sofas', Tent, 'space'),
  t('event_lighting', 'Lighting', 'Fairy lights to stage rigs, with operators', Lightbulb, 'space'),
  t('photography', 'Photography', 'Every ritual and every relative, captured', Camera, 'media'),
  t('videography', 'Videography', 'A film of the day, drone and livestream too', Video, 'media'),
  t('dj_music', 'DJ & music', 'A dance floor that stays full', Disc3, 'stage'),
  t('live_entertainment', 'Live entertainment', 'Nadaswaram, dhol, bands, magicians, dancers', Music, 'stage'),
  t('anchor_mc', 'Anchor & emcee', 'Someone to run the stage and keep it moving', Mic, 'stage'),
  t('sound_av', 'Sound & AV', 'Speakers, mics, LED walls and projectors', Speaker, 'stage'),
  t('bridal_makeup_hair', 'Makeup & hair', 'Bridal and family looks, draping included', Brush, 'rituals'),
  t('mehendi_artist', 'Mehendi', 'Bridal and guest mehendi', Hand, 'rituals'),
  t('priest_rituals', 'Priest & rituals', 'Pooja, homa and rites, done your family’s way', Flame, 'rituals'),
  t('trousseau_gift_packing', 'Trousseau packing', 'Saree trays and seer platters, beautifully packed', PackageOpen, 'rituals'),
  t('wedding_planning', 'Wedding planner', 'One person who runs every vendor for you', ClipboardList, 'plan'),
  t('end_to_end_event_logistics', 'Event logistics', 'Trucks, crew and set-up for big events', HeartHandshake, 'plan'),
  t('guest_services', 'Hosts & ushers', 'Welcome desk, ushers and hostesses', HandHeart, 'guests'),
  t('passenger_transport', 'Guest transport', 'Cars, Tempo Travellers and coaches', Bus, 'guests'),
  t('valet_parking', 'Valet parking', 'Uniformed valets so arrivals stay smooth', SquareParking, 'guests'),
  t('security_services', 'Security', 'Guards and bouncers at the door', ShieldCheck, 'guests'),
  t('safety_facilities', 'Clean-up & safety', 'Cleaning crew, washrooms, first aid and fire safety', LifeBuoy, 'guests'),
  t('gifts_favours', 'Return gifts', 'Favours your guests actually keep', Gift, 'gifts'),
  t('invitation_printing', 'Invitations', 'Printed cards, boxed invites and e-invites', Mail, 'gifts'),
  t('event_materials_supplier', 'Event supplies', 'Plates, banners, pooja items in bulk', Boxes, 'gifts'),
  t('event_equipment_rental', 'Equipment rental', 'Tables, chafing dishes, stages, podiums', Armchair, 'move'),
  t('power_cooling', 'Power & cooling', 'Silent gensets and AC for tents and halls', PlugZap, 'move'),
  t('transportation', 'Transport coordination', 'Every vehicle on the day, coordinated', Route, 'move'),
  t('mini_truck_pickup', 'Mini truck', 'Same-day runs for décor, cakes and stock', Truck, 'move'),
  t('medium_large_goods_vehicle', 'Goods truck', '14–32 ft trucks for heavy loads', Container, 'move'),
  t('loading_unloading_crew', 'Loading crew', 'Careful hands for heavy lifting', HardHat, 'move'),
  t('warehouse_storage', 'Storage', 'Secure space for décor and stock', Warehouse, 'move'),
]

export const TRADE = Object.fromEntries(TRADES.map(x => [x.id, x]))

/** How the Services shelf is grouped. Order is the order on screen. */
export const TRADE_GROUPS = [
  { id: 'food', label: 'Food & dining', chip: 'Food' },
  { id: 'space', label: 'Venue & décor', chip: 'Venue & décor' },
  { id: 'media', label: 'Moments · photo & film', chip: 'Moments' },
  { id: 'stage', label: 'Music & stage', chip: 'Music' },
  { id: 'rituals', label: 'Beauty & rituals', chip: 'Beauty' },
  { id: 'plan', label: 'Planning', chip: 'Planning' },
  { id: 'guests', label: 'Guests & safety', chip: 'Guests' },
  { id: 'gifts', label: 'Gifts & print', chip: 'Gifts' },
  { id: 'move', label: 'Power, transport & rentals', chip: 'Transport' },
].map(g => ({ ...g, trades: TRADES.filter(x => x.group === g.id) }))
