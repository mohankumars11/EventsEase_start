/**
 * Décor as moments, not themes (Mohan, 2026-11-11: "a bachelor party was
 * showing a happy-birthday theme … Valentine's Day does not require
 * decoration, it requires a moment set-up. Design the moments, so that
 * maps to the decoration trade and they can execute it").
 *
 *   momentsFor(occasion) → [{ id, svc, label, line, icon }]
 *
 * `svc` is the decorator's OWN service, word for word from
 * src/data/trades/decoration_floral.js SERVICES — so a chosen moment
 * narrows the match to decorators who said they do that work, and the
 * brief names a job the decorator recognises. The customer reads the
 * moment ("Rose-petal pathway"); the decorator reads the service
 * ("Pathway / aisle decoration"). scripts/check-pref-specs.mjs proves
 * every `svc` here exists in the partner's list.
 */
import { profileFor } from './occasionProfile'
import { Baby, Cake, Camera, Car, Church, Crown, DoorOpen, Flame, Flower2, Gift, Heart, Lamp, LampCeiling, Image, Leaf, Lightbulb, Monitor, PartyPopper, Shapes, Sofa, Sprout, Star, Type, Utensils, Wine } from 'lucide-react'

const M = (id, svc, label, line, icon) => ({ id, svc, label, line, icon })

const ROMANCE = [
  M('candle_table', 'Table styling', 'Candlelit table for two', 'Linen, candles and flowers on the table', Utensils),
  M('petal_path', 'Pathway / aisle decoration', 'Rose-petal pathway', 'A path of petals to the spot', Heart),
  M('balloon_room', 'Balloon decoration', 'Balloon surprise room', 'Balloons, hearts, a filled room', PartyPopper),
  M('flower_wall', 'Flower wall', 'Flower wall backdrop', 'For the photographs', Flower2),
  M('neon_words', 'LED letters and neon signs', 'Words in light', '"Marry me", a name, a date', Type),
  M('lanterns', 'Candle and lantern styling', 'Candles & fairy lights', 'A warm glow, indoors or on a terrace', Lamp),
  M('car', 'Car decoration', 'The car, decorated', 'Flowers and a message on the car', Car),
  M('bouquet', 'Bouquets and bunches', 'A bouquet to hand over', 'Fresh, in their favourite flowers', Gift),
]
/* An anniversary with the family in the room — the years on the wall, a
   stage for the two of them. Kept to the couple, it is ROMANCE instead. */
const ANNIVERSARY = [
  M('years_backdrop', 'Backdrop', 'The years, on the wall', '“25 years” and your names, behind the cake table', Type),
  M('stage', 'Stage decoration', 'A stage for the two of you', 'Flowers and a backdrop for the photographs', Crown),
  M('entrance', 'Entrance arch', 'Entrance arch', 'The welcome every guest walks through', DoorOpen),
  M('flower_wall', 'Flower wall', 'Flower wall', 'For the family photographs', Flower2),
  M('centre', 'Centrepieces', 'Table centrepieces', 'On every dining table', Utensils),
  M('cake_table', 'Table styling', 'Cake table', 'Styled for the cutting moment', Cake),
  M('lanterns', 'Candle and lantern styling', 'Candles & fairy lights', 'A warm glow after dark', Lamp),
  M('photo_story', 'Photo booth / selfie point', 'Your story, in photographs', 'Old photographs strung along a wall', Camera),
]
/* A private dinner: the table is the décor. */
const DINNER = [
  M('candle_table', 'Table styling', 'The table, styled', 'Linen, candles and flowers down the middle', Utensils),
  M('centre', 'Centrepieces', 'Centrepieces', 'Low, so everyone can talk across', Flower2),
  M('lanterns', 'Candle and lantern styling', 'Candles & lanterns', 'A warm glow through the evening', Lamp),
  M('flower_wall', 'Flower wall', 'Flower wall', 'A corner for the photographs', Camera),
  M('welcome', 'Welcome board / nameplate', 'Welcome board', 'The occasion, at the door', Type),
]
const NIGHT = [
  M('neon_wall', 'LED letters and neon signs', 'Neon party wall', 'A glowing sign for the night', Type),
  M('bar_styling', 'Table styling', 'Bar counter styling', 'The drinks counter, dressed', Wine),
  M('balloon_ceiling', 'Balloon decoration', 'Balloon ceiling', 'Chrome and black, overhead', PartyPopper),
  M('booth', 'Photo booth / selfie point', 'Photo booth', 'Props, a backdrop, a corner to pose', Camera),
  M('lounge', 'Lounge / sofa setup', 'Lounge seating', 'Sofas and low tables', Sofa),
  M('props', 'Theme props and cutouts', 'Theme props', 'Cut-outs and props for the theme', Star),
  M('fairy', 'Candle and lantern styling', 'Fairy-light terrace', 'Strings of light overhead', Lightbulb),
]
const BIRTHDAY = [
  M('backdrop', 'Backdrop', 'Theme backdrop', 'The wall behind the cake table', Image),
  M('arch', 'Balloon decoration', 'Balloon arch', 'An arch or garland of balloons', PartyPopper),
  M('cake_table', 'Table styling', 'Cake table', 'Styled for the cutting moment', Cake),
  M('entrance', 'Entrance arch', 'Entrance arch', 'The first thing guests walk through', DoorOpen),
  M('name_board', 'Welcome board / nameplate', 'Welcome board', 'Their name, their age, at the door', Type),
  M('cutouts', 'Theme props and cutouts', 'Character cut-outs', 'The theme, standing in the room', Star),
  M('booth', 'Photo booth / selfie point', 'Photo corner', 'A spot for every family photo', Camera),
  M('ceiling', 'Ceiling decoration and drapes', 'Ceiling décor', 'Drapes, hangings, overhead colour', LampCeiling),
]
const BABY = [
  M('cradle', 'Naming ceremony (naamkarana)', 'Flower cradle', 'The cradle dressed in flowers', Baby),
  M('seemantha', 'Seemantha / baby shower', 'Seemantha stage', 'A seat of honour for the mother-to-be', Crown),
  M('backdrop', 'Backdrop', 'Name backdrop', 'The name, revealed on the wall', Type),
  M('pastel', 'Balloon decoration', 'Pastel balloons', 'Soft colours, soft shapes', PartyPopper),
  M('pooja', 'Pooja / homa setup', 'Pooja set-up', 'The mandap and the deity’s place', Flame),
  M('torana', 'Torana and banana stems', 'Entrance torana', 'Mango leaves and banana stems at the door', Leaf),
  M('garlands', 'Fresh flower garlands', 'Garlands', 'For the family and the deity', Flower2),
]
const WEDDING = [
  M('mandap', 'Mandap / mantap decoration', 'The mandap', 'Where the ceremony happens', Church),
  M('stage', 'Stage decoration', 'The stage', 'The couple’s stage, flowers and backdrop', Crown),
  M('entrance', 'Entrance arch', 'Entrance arch', 'The welcome every guest walks through', DoorOpen),
  M('pathway', 'Pathway / aisle decoration', 'Pathway', 'From the gate to the mandap', Heart),
  M('centre', 'Centrepieces', 'Table centrepieces', 'On every dining table', Utensils),
  M('car', 'Car decoration', 'Car décor', 'The couple’s car', Car),
  M('shower', 'Flower shower arrangement', 'Flower shower', 'Petals on the couple at the right moment', Flower2),
  M('garlands', 'Fresh flower garlands', 'Garlands', 'Jaimala and the family’s', Leaf),
]
const BY_FUNCTION = {
  haldi: [M('haldi', 'Haldi decoration', 'Haldi set-up', 'Marigold, yellow, a seat and a swing', Flower2), M('floor', 'Pathway / aisle decoration', 'Floor seating & rangoli', 'Low seating for the family', Leaf), ...WEDDING.filter(m => ['entrance', 'garlands'].includes(m.id))],
  mehendi: [M('mehendi', 'Mehendi decoration', 'Mehendi set-up', 'Green and pink, swings and cushions', Flower2), M('lounge', 'Lounge / sofa setup', 'Lounge seating', 'For the artists and the guests', Sofa), ...WEDDING.filter(m => ['entrance', 'booth'].includes(m.id)), M('booth', 'Photo booth / selfie point', 'Photo corner', 'A spot for the photographs', Camera)],
  sangeet: [M('sangeet', 'Sangeet decoration', 'Sangeet stage', 'A stage for the performances', Crown), M('neon', 'LED letters and neon signs', 'Names in light', 'The couple’s names, glowing', Type), M('lounge', 'Lounge / sofa setup', 'Lounge seating', 'Sofas around the dance floor', Sofa), M('ceiling', 'Ceiling decoration and drapes', 'Ceiling drapes', 'Fabric and lights overhead', LampCeiling), ...WEDDING.filter(m => ['entrance'].includes(m.id))],
  engagement: [M('engagement', 'Engagement decoration', 'Engagement stage', 'The ring moment, framed', Crown), ...WEDDING.filter(m => ['entrance', 'centre', 'garlands'].includes(m.id)), M('booth', 'Photo booth / selfie point', 'Photo corner', 'For the family photographs', Camera)],
  reception: [M('reception', 'Reception stage', 'Reception stage', 'The couple’s stage for the evening', Crown), M('couple_seat', 'Lounge / sofa setup', 'Couple seating', 'A sofa fit for the two of them', Sofa), ...WEDDING.filter(m => ['entrance', 'centre', 'pathway'].includes(m.id)), M('booth', 'Photo booth / selfie point', 'Photo booth', 'Where guests queue to pose', Camera)],
}
const TRADITIONAL = [
  M('torana', 'Torana and banana stems', 'Torana & banana stems', 'Mango leaves at every door', Leaf),
  M('rangoli', 'Rangoli', 'Flower rangoli', 'At the entrance and the pooja room', Sprout),
  M('pooja', 'Pooja / homa setup', 'Pooja set-up', 'The mandap and the deity’s place', Flame),
  M('festival', 'Festival decoration', 'Festival décor', 'The season’s colours through the home', Shapes),
  M('diyas', 'Candle and lantern styling', 'Diyas & lanterns', 'Lamps along the steps and sills', Lamp),
  M('garlands', 'Fresh flower garlands', 'Garlands', 'For the deity and the door', Flower2),
  M('home', 'Housewarming (gruhapravesha)', 'Griha pravesha set-up', 'The threshold, the kalasha, the pooja', DoorOpen),
]
const CORPORATE = [
  M('brand_stage', 'Corporate stage and backdrop', 'Branded stage', 'Your brand on the backdrop', Monitor),
  M('welcome', 'Welcome board / nameplate', 'Welcome & registration board', 'The first thing attendees see', Type),
  M('lounge', 'Lounge / sofa setup', 'Lounge', 'Seating for conversations', Sofa),
  M('booth', 'Photo booth / selfie point', 'Photo wall', 'Branded, for the social posts', Camera),
  M('centre', 'Centrepieces', 'Table centrepieces', 'On every table at the dinner', Utensils),
  M('reveal', 'Balloon decoration', 'Reveal moment', 'Balloons or a drop for the launch', PartyPopper),
  M('display', 'Exhibition / retail display', 'Display stands', 'Product on show', Star),
]
const CAMPUS = [
  M('stage', 'Stage decoration', 'The stage', 'Backdrop, flowers, the school’s name', Crown),
  M('backdrop', 'Backdrop', 'Backdrop', 'For the speeches and the prizes', Image),
  M('entrance', 'Entrance arch', 'Entrance arch', 'A welcome for parents and guests', DoorOpen),
  M('balloons', 'Balloon decoration', 'Balloon décor', 'Colour along the hall', PartyPopper),
  M('welcome', 'Welcome board / nameplate', 'Welcome board', 'The event’s name at the gate', Type),
  M('pathway', 'Pathway / aisle decoration', 'Pathway', 'From the gate to the hall', Leaf),
]
const MEMORIAL = [
  M('tribute', 'Bouquets and bunches', 'Floral tribute', 'White flowers, arranged quietly', Flower2),
  M('photo_stand', 'Backdrop', 'A stand for the photograph', 'Simple, with a garland', Image),
  M('garlands', 'Fresh flower garlands', 'Garlands', 'For the photograph and the family', Leaf),
  M('candles', 'Candle and lantern styling', 'Candles & diyas', 'A row of lamps', Lamp),
  M('seating', 'Lounge / sofa setup', 'Seating for the family', 'Comfortable, close to the front', Sofa),
]
const GENERAL = [
  M('stage', 'Stage decoration', 'Stage & backdrop', 'Where everything happens', Crown),
  M('entrance', 'Entrance arch', 'Entrance arch', 'The welcome every guest walks through', DoorOpen),
  M('balloons', 'Balloon decoration', 'Balloon décor', 'Arches, garlands, colour', PartyPopper),
  M('table', 'Table styling', 'Table styling', 'Linen, flowers and the cake table', Utensils),
  M('booth', 'Photo booth / selfie point', 'Photo booth', 'A corner to pose in', Camera),
  M('lights', 'Candle and lantern styling', 'Candles & fairy lights', 'A warm glow after dark', Lamp),
  M('props', 'Theme props and cutouts', 'Theme props', 'Cut-outs for the theme', Star),
  M('welcome', 'Welcome board / nameplate', 'Welcome board', 'The name at the door', Type),
]

const words = o => `${o?.id ?? ''} ${o?.name ?? ''} ${o?.template ?? ''}`.toLowerCase()

/**
 * The set-ups this kind of occasion asks a decorator for — by the
 * occasion's profile (data/occasionProfile), never by words in its name:
 * a "Wedding Anniversary" is an anniversary. `ev.company` tells a
 * couple's anniversary apart from one with the family in the room.
 */
export function momentsFor(o, ev = {}) {
  const p = profileFor(o)
  switch (p.family) {
    case 'wedding': return BY_FUNCTION[p.fn] ?? (p.fn === 'roka' ? BY_FUNCTION.engagement : p.fn === 'cocktail' ? NIGHT : p.fn === 'shower' ? BIRTHDAY.filter(m => ['backdrop', 'arch', 'cake_table', 'booth', 'ceiling'].includes(m.id)) : p.fn === 'griha' ? TRADITIONAL : WEDDING)
    case 'anniversary': return ev.company === 'two' ? ROMANCE : ANNIVERSARY
    case 'romance': return ROMANCE
    case 'nightlife': return NIGHT
    case 'memorial': return MEMORIAL
    case 'baby': return BABY
    case 'birthday': return BIRTHDAY
    case 'home': case 'faith': case 'festival': return TRADITIONAL
    case 'corporate': case 'retail': case 'property': case 'online': case 'gala': return CORPORATE
    case 'school': case 'campus': return CAMPUS
    case 'dining': return DINNER
    default: return GENERAL
  }
}
export const MOMENT_FAMILIES = { ROMANCE, ANNIVERSARY, DINNER, NIGHT, BIRTHDAY, BABY, WEDDING, TRADITIONAL, CORPORATE, CAMPUS, MEMORIAL, GENERAL }
