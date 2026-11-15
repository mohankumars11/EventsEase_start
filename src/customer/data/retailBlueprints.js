/**
 * Retail & Shopping Events — one blueprint per occasion.
 *
 * Twenty occasions whose purpose is commercial, which changes what the
 * plan has to protect:
 *
 *   · We never write a price, an offer or a discount. What is being
 *     sold and for how much is the retailer's, and nothing here
 *     invents or implies either.
 *   · High-value stock — jewellery, luxury goods, designer pieces — is
 *     a security and insurance question before it is a display one.
 *     Cover, counts in and out, and the insurer's conditions stay on
 *     the plan.
 *   · Anything applied to a person's skin or hair needs hygiene: new
 *     or sanitised tools, single-use applicators, a patch test where
 *     the product calls for one. We make no claim about what any
 *     product does.
 *   · Footfall in a mall or on a street is somebody else's permission,
 *     and a queue is somebody else's pavement. Neither is assumed.
 *   · Where a competition judges people, consent, chaperoning for
 *     anyone under eighteen, and a published process come before the
 *     staging. We never set criteria about anyone's body.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, THEME, DRESS_CODE, CHIEF_GUEST, AWARDS,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a retail occasion asks ────────────────────────── */

const FOOTFALL = Q('footfall', 'How many visitors do you expect?', 'select', {
  options: [['80', 'Up to 80'], ['400', 'Up to 400'], ['2000', 'Up to 2000'], ['10000', 'Up to 10000'], ['30000', 'More than 10000']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['store', 'In the store'], ['mall', 'A mall or public building'], ['venue', 'An event venue'], ['street', 'A street or open space'], ['hall', 'An exhibition hall'], ['find', 'Please find somewhere']],
})
const ACCESS = Q('access_type', 'Who can come?', 'one', {
  options: [['public', 'Anyone'], ['ticket', 'Ticketed'], ['invite', 'By invitation'], ['customers', 'Existing customers'], ['trade', 'Trade only']],
})
const DISPLAY = Q('display', 'How is the product shown?', 'many', {
  options: [['tables', 'Tables and counters'], ['rails', 'Rails'], ['cases', 'Locked display cases'], ['mannequins', 'Mannequins'], ['vignettes', 'Room sets or vignettes'], ['screens', 'Screens']],
})
const STOCK_VALUE = Q('stock_value', 'How valuable is the stock on display?', 'one', {
  options: [['low', 'Ordinary retail stock'], ['high', 'High value'], ['very_high', 'Very high — jewellery or luxury'], ['samples', 'Samples only, not for sale']],
  help: 'High-value stock changes the security, the insurance and the counting. We will keep that on the plan.',
})
const BRANDING = Q('branding', 'Do you need branding, signage and visual merchandising?', 'yesno')
const SELLING = Q('selling', 'Is anything sold on the day?', 'one', {
  options: [['yes', 'Yes, on the spot'], ['orders', 'Orders taken'], ['leads', 'Enquiries only'], ['no', 'Nothing sold']],
})
const STAFF = Q('staff', 'Do you need event staff?', 'many', {
  optional: true,
  options: [['hosts', 'Hosts and greeters'], ['demo', 'Demonstrators'], ['sales', 'Sales support'], ['queue', 'Queue management'], ['stylists', 'Stylists or fitters']],
})
const GUARD = Q('security', 'Do you need security?', 'yesno')
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true, options: [['music', 'Music'], ['mics', 'Microphones'], ['screens', 'Screens'], ['lights', 'Display lighting'], ['stage', 'A stage or ramp']],
})
const PERMITS = Q('permits', 'Are the venue or public-space permissions in place?', 'one', {
  optional: true, options: [['yes', 'Yes'], ['no', 'Not yet'], ['help', 'We need help with this']],
})
const FOOD = Q('food', 'Refreshments', 'one', {
  optional: true, options: [['canapes', 'Canapés and drinks'], ['counters', 'A counter or café'], ['stalls', 'Food stalls'], ['none', 'Nothing needed']],
})
const SIGNAGE = Q('signage', 'Do you need printed material?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })
const PARKING = Q('parking', 'Do you need parking or valet managed?', 'yesno', { optional: true })
const SEATS = Q('seating', 'Do you need seating?', 'yesno', { optional: true })

const WHEN_HIGH_VALUE = [ans('stock_value', 'high', 'very_high')]
const WHEN_CASES = [ans('display', 'cases')]
const WHEN_BRAND = [ans('branding', 'yes')]
const WHEN_SELLING = [ans('selling', 'yes', 'orders')]
const WHEN_LEADS = [ans('selling', 'orders', 'leads')]
const WHEN_STAFFED = [has('staff')]
const WHEN_HOSTS = [ans('staff', 'hosts', 'queue')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_AV = [has('av')]
const WHEN_MUSIC = [ans('av', 'music')]
const WHEN_PA = [ans('av', 'mics')]
const WHEN_LIT = [ans('av', 'lights')]
const WHEN_SCREENS = [ans('av', 'screens')]
const WHEN_STAGE = [ans('av', 'stage')]
const WHEN_FOOD = [ans('food', 'canapes', 'counters', 'stalls')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_PARK = [ans('parking', 'yes')]
const WHEN_SEATS = [ans('seating', 'yes')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'venue', 'hall', 'street')]
const WHEN_PUBLIC_SPACE = [ans('place', 'mall', 'street')]
const WHEN_BIG = [ans('footfall', '2000', '10000', '30000')]
const WHEN_HUGE = [ans('footfall', '10000', '30000')]
const WHEN_OPEN = [ans('access_type', 'public', 'customers')]
const WHEN_TICKETED = [ans('access_type', 'ticket', 'trade')]
const WHEN_PERMIT_HELP = [ans('permits', 'no', 'help')]

export const RETAIL_BLUEPRINTS = [

  B('shopping-festival', 'Draw them in', 'A whole district or mall trading at once, for days.', {
    about: 'Dozens of independent retailers under one banner, which makes it a coordination problem: shared opening hours, shared marketing, shared crowd, and nobody in overall charge of the shops.',
    formats: ['outdoor', 'venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['7', 'A week'], ['30', 'Longer']] }),
      Q('retailers', 'How many retailers are taking part?', 'select', { options: [['10', 'Up to 10'], ['40', 'Up to 40'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      Q('draws', 'What brings people in?', 'many', { options: [['offers', 'Offers'], ['entertainment', 'Entertainment'], ['food', 'Food'], ['activities', 'Activities for families'], ['raffle', 'A raffle or prize'], ['late', 'Late opening']] }),
      PERMITS, STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Dress it', 'Gateways, street dressing and an identity across every shopfront'),
      S('invitation_printing', 'recommended', 'Point the way', 'Maps, participating-retailer lists, signage and window material'),
      S('security_services', 'conditional', 'Steward', 'Stewarding across the district and at the busiest crossings', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('live_entertainment', 'conditional', 'Animate', 'Performers moving through, which is what makes people stay', { when: [ans('draws', 'entertainment', 'activities')] }),
      S('event_lighting', 'conditional', 'Light', 'Street and façade lighting, especially for late opening', { when: [some(WHEN_LIT[0], ans('draws', 'late'))] }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls or counters placed where they create flow', { when: [some(ans('draws', 'food'), WHEN_FOOD[0])] }),
      S('guest_services', 'conditional', 'Welcome', 'Information points, and hosts who know which shops are taking part', { when: [some(WHEN_HOSTS[0], WHEN_BIG[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Music across the district and a PA for announcements', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Gateways, stages, stalls and the activity areas', { when: [some(WHEN_STAGE[0], ans('draws', 'activities', 'food'))] }),
      S('photography', 'conditional', 'Record', 'The district trading, for the retailers and for next year', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, waste and cleaning across the days', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('valet_parking', 'conditional', 'Park', 'Parking managed, which decides whether people come at all', { when: WHEN_PARK }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew across a district and across several days', { when: [ans('days', '7', '30')] }),
      S('venue', 'conditional', 'Secure', 'A street, ground or mall concourse with the permissions', { when: WHEN_FINDING }),
    ],
    addons: [
      X('retailer_pack', 'Align them', 'Opening hours, window material and rules, agreed with every retailer', 'invite', { trade: 'invitation_printing' }),
      X('district_map', 'Navigate', 'A printed and digital map of every participating shop', 'map', { trade: 'invitation_printing' }),
      X('footfall_count', 'Measure it', 'Footfall counted and reported back to the retailers', 'poll', { trade: 'guest_services' }),
      X('permission_pack', 'Clear it', 'Street, sound and trading permissions confirmed in writing', 'schedule', { experience: true, when: WHEN_PERMIT_HELP }),
    ],
    toolkit: { polls: ['date'], note: 'We never write a price or an offer. What each retailer discounts, and by how much, is theirs alone.' },
    timeline: {
      before: ['Permissions for the street, sound and trading confirmed in writing', 'Every participating retailer confirmed with opening hours in writing', 'Maps, window material and signage produced'],
      during: ['Stewarding and information points open before the shops do', 'Entertainment rotated so crowds move through the district', 'Waste and washrooms serviced across the days'],
      after: ['Street dressing removed and the district reinstated', 'Footfall reported back to every retailer', 'Feedback collected for the next one'],
    },
    checklist: ['Permissions in writing', 'Retailers confirmed with hours', 'Maps and window material produced', 'Footfall measurement arranged'],
  }),

  B('retail-store-launch', 'Open the doors', 'A shutter going up, and whoever is on the street deciding whether to come in.', {
    about: 'The first hour is the event. Everything is designed to turn passers-by into people inside the shop, and the staff on the floor matter more than anything on the pavement.',
    formats: ['venue', 'outdoor'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('store_type', 'What kind of store?', 'one', { options: [['fashion', 'Fashion'], ['electronics', 'Electronics'], ['lifestyle', 'Lifestyle or home'], ['grocery', 'Grocery'], ['speciality', 'Speciality'], ['flagship', 'A flagship']] }),
      Q('day_one', 'What happens on the day?', 'many', { options: [['ribbon', 'A ribbon cutting'], ['ceremony', 'A ceremony'], ['offers', 'Opening offers'], ['performers', 'Performers'], ['gifting', 'Gifting for the first customers'], ['press', 'Press and creators']] }),
      Q('ceremony_kind', 'If there is a ceremony, who leads it?', 'one', {
        optional: true, when: [ans('day_one', 'ceremony')],
        options: [['find', 'Please find a practitioner'], ['own', 'We have our own'], ['none', 'No practitioner needed']],
        help: 'Entirely the owner’s choice. We never assume a ceremony or who should lead it.',
      }),
      PERMITS, STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('decoration_floral', 'recommended', 'Dress', 'Façade, entrance, window and in-store dressing, visible from the road'),
      S('guest_services', 'conditional', 'Draw them in', 'Hosts at the door turning passers-by into people inside', { when: [some(WHEN_HOSTS[0], WHEN_OPEN[0])] }),
      S('invitation_printing', 'conditional', 'Announce', 'Invitations, window vinyl, offer material and press kits', { when: [some(WHEN_BRAND[0], ans('day_one', 'press', 'offers'))] }),
      S('event_lighting', 'conditional', 'Light', 'Façade and window lighting, which is what stops people at night', { when: [some(WHEN_LIT[0], WHEN_BRAND[0])] }),
      S('priest_rituals', 'conditional', 'Lead', 'A practitioner, only because the owner asked for one', { when: [ans('ceremony_kind', 'find')] }),
      S('event_materials_supplier', 'conditional', 'Supply', 'Ceremony materials, exactly as the owner specifies', { when: [ans('ceremony_kind', 'find', 'own')] }),
      S('live_entertainment', 'conditional', 'Stop them', 'Performers outside, which makes people look twice', { when: [ans('day_one', 'performers')] }),
      S('photography', 'conditional', 'Record', 'The opening and the store, for the brand to use all year', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Manage', 'Door and queue management, and cover for the stock inside', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0], WHEN_BIG[0])] }),
      S('catering_food', 'conditional', 'Offer', 'Refreshments at the door or in store, as you chose', { when: WHEN_FOOD }),
      S('gifts_favours', 'conditional', 'Give', 'Something for the first customers, counted properly', { when: [ans('day_one', 'gifting')] }),
      S('sound_av', 'conditional', 'Play', 'In-store music and a mic for the opening', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('event_equipment_rental', 'conditional', 'Set', 'The ribbon setup, a small stage and outdoor furniture', { when: [some(ans('day_one', 'ribbon'), WHEN_STAGE[0])] }),
      S('valet_parking', 'conditional', 'Park', 'Parking managed so the frontage stays clear', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Overflow', 'A nearby space if the queue cannot be held on the street', { when: WHEN_FINDING }),
    ],
    addons: [
      X('window_reveal', 'Unveil', 'The window covered until the moment of opening, then revealed', 'craft', { trade: 'decoration_floral' }),
      X('first_hour_staffing', 'Staff the rush', 'The floor staffed for the first hour, not for the average one', 'group', { trade: 'guest_services' }),
      X('queue_plan', 'Hold the line', 'A queue line that does not block the neighbouring shops', 'map', { trade: 'security_services', when: WHEN_PUBLIC_SPACE }),
      X('street_permission', 'Clear it', 'Pavement, sound and frontage permissions confirmed before the day', 'schedule', { experience: true, when: WHEN_PERMIT_HELP }),
    ],
    toolkit: { polls: ['date'], note: 'Whether there is a ceremony, and of what kind, is the owner’s own decision. We never write an offer or a price.' },
    timeline: {
      before: ['Pavement, sound and frontage permissions confirmed', 'Window dressed and covered the night before', 'Floor staffed for the first-hour rush and briefed'],
      during: ['Ceremony or ribbon kept short', 'Doors open, hosts converting the pavement into footfall', 'Queue kept clear of the neighbours'],
      after: ['Frontage cleaned the same evening', 'Day-one footfall and sales reviewed', 'Images delivered for the brand to use'],
    },
    checklist: ['Permissions confirmed', 'Window dressed and covered', 'Floor staffed for the first hour', 'Queue line agreed'],
  }),

  B('shopping-mall-event', 'Activate', 'A concourse that belongs to the mall, filled for a weekend.', {
    about: 'Everything here is the mall’s: the floor, the power, the fire routes and the rules. The plan is as much about their approvals as about the activation itself.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('activation', 'What is the activation?', 'one', { options: [['brand', 'A brand activation'], ['seasonal', 'A seasonal installation'], ['performance', 'Performances'], ['kids', 'A children’s activity'], ['sampling', 'Product sampling'], ['competition', 'A competition']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['3', 'A weekend'], ['7', 'A week'], ['30', 'Longer']] }),
      Q('mall_rules', 'Are the mall’s approvals and rules in hand?', 'one', {
        options: [['yes', 'Yes, in writing'], ['verbal', 'Verbally agreed'], ['no', 'Not yet']],
        help: 'Build height, fire routes, power and load-in hours are all the mall’s. We plan to their rules, not around them.',
      }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'The installation, built to the mall’s height, weight and fire rules'),
      S('decoration_floral', 'recommended', 'Brand', 'The activation dressed so it reads from the floor above as well'),
      S('guest_services', 'conditional', 'Engage', 'Staff who can start a conversation with a passing shopper', { when: [some(WHEN_STAFFED[0], ans('activation', 'brand', 'sampling'))] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting that lifts the activation out of the mall’s flat light', { when: [some(WHEN_LIT[0], WHEN_BRAND[0])] }),
      S('sound_av', 'conditional', 'Carry', 'Sound at the level the mall permits, and screens if there are any', { when: [some(WHEN_MUSIC[0], WHEN_SCREENS[0], WHEN_PA[0])] }),
      S('live_entertainment', 'conditional', 'Perform', 'Performances on a schedule the mall has approved', { when: [ans('activation', 'performance', 'kids')] }),
      S('invitation_printing', 'conditional', 'Signpost', 'Signage, entry forms, sampling cards and wayfinding', { when: [some(WHEN_SIGNED[0], ans('activation', 'competition', 'sampling'))] }),
      S('security_services', 'conditional', 'Manage', 'Queue and crowd management on a concourse people walk through', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Record', 'The activation working, for the brand and for the mall', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating, which a concourse never has enough of', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Sample', 'Sampling or refreshments, to the mall’s food rules', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Clean', 'Cleaning through the day and the concourse reinstated', { when: [some(WHEN_CLEAN[0], ans('days', '3', '7', '30'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Load-in and load-out inside the mall’s permitted hours', { when: [ans('days', '7', '30')] }),
    ],
    addons: [
      X('mall_approvals', 'Get it in writing', 'Build height, fire routes, power and load-in hours, approved in writing', 'schedule', { experience: true, when: [ans('mall_rules', 'verbal', 'no')] }),
      X('overhead_view', 'Read from above', 'The installation designed to look right from the floors above', 'map', { trade: 'decoration_floral' }),
      X('night_loadin', 'Build overnight', 'Load-in and build during the mall’s permitted overnight window', 'move', { trade: 'end_to_end_event_logistics' }),
      X('footfall_report', 'Measure', 'Engagement counted and reported to the brand and the mall', 'poll', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'The concourse, the fire routes and the rules are the mall’s. We will not plan a build that has only been agreed verbally.' },
    timeline: {
      before: ['Mall approvals in writing: height, weight, fire routes, power, hours', 'Build designed to read from the upper floors', 'Load-in booked inside the permitted window'],
      during: ['Fire routes and walkways kept clear at all times', 'Sound held to the mall’s permitted level', 'Engagement counted through each day'],
      after: ['Load-out inside the permitted window', 'Concourse reinstated and cleaned', 'Report to the brand and the mall'],
    },
    checklist: ['Mall approvals in writing', 'Fire routes kept clear', 'Load-in window booked', 'Sound level agreed'],
  }),

  B('fashion-pop-up', 'Appear briefly', 'A shop that exists for ten days, in a space that was something else.', {
    about: 'A full retail operation built and struck inside a fortnight: fitting rooms, payment, stock control and security, all temporary. The fit-out and the stock count are the project.',
    formats: ['venue', 'outdoor'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('days', 'How long is it open?', 'select', { options: [['1', 'One day'], ['3', 'A weekend'], ['10', 'Up to ten days'], ['30', 'A month or more']] }),
      Q('fitout', 'What has to be built?', 'many', { options: [['rails', 'Rails and display'], ['fitting', 'Fitting rooms'], ['till', 'A payment point'], ['storage', 'Stock storage'], ['mirrors', 'Mirrors'], ['lighting', 'Lighting']] }),
      Q('stock_count', 'How is stock controlled?', 'one', { options: [['system', 'On a system'], ['manual', 'Counted manually'], ['consignment', 'On consignment'], ['samples', 'Samples only']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Fit out', 'Rails, fitting rooms, mirrors, a payment point and stock storage'),
      S('event_lighting', 'recommended', 'Light', 'Retail lighting — the biggest difference between a shop and a room'),
      S('decoration_floral', 'recommended', 'Brand', 'The space turned into the label’s own, inside and at the window'),
      S('guest_services', 'conditional', 'Sell', 'Staff who can style, fit and take payment', { when: [some(WHEN_STAFFED[0], WHEN_SELLING[0])] }),
      S('security_services', 'conditional', 'Protect', 'Cover for stock, overnight as well as during opening hours', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0], ans('days', '10', '30'))] }),
      S('invitation_printing', 'conditional', 'Tell', 'Window vinyl, swing tags, bags, signage and the opening invitation', { when: [some(WHEN_BRAND[0], WHEN_SIGNED[0])] }),
      S('photography', 'conditional', 'Shoot', 'The space and the collection in it, which is reusable content', { when: WHEN_SHOT }),
      S('sound_av', 'conditional', 'Set', 'A playlist and speakers, which change how long people browse', { when: [some(WHEN_MUSIC[0], WHEN_AV[0])] }),
      S('catering_food', 'conditional', 'Host', 'Drinks for the opening, and nothing on the trading days', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Keep it', 'Daily cleaning, and the space returned as found at the end', { when: [some(WHEN_CLEAN[0], ans('days', '10', '30'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Fit-out in, stock in, stock out, fit-out struck', { when: [ans('fitout', 'rails', 'fitting', 'storage')] }),
      S('venue', 'conditional', 'Find', 'A space with a window, power and a landlord who allows retail', { when: WHEN_FINDING }),
    ],
    addons: [
      X('fitting_rooms', 'Let them try', 'Proper fitting rooms with mirrors and light people look good in', 'dress', { trade: 'event_equipment_rental', when: [ans('fitout', 'fitting')] }),
      X('stock_count', 'Count it', 'Stock counted in and out daily, against the system or the sheet', 'poll', { experience: true }),
      X('payment_setup', 'Take money', 'A payment point tested before opening, with a fallback', 'budget', { trade: 'event_equipment_rental', when: [ans('fitout', 'till')] }),
      X('overnight_cover', 'Lock it', 'Overnight security or stock removal, for every night it is open', 'security_services', { trade: 'security_services', when: WHEN_HIGH_VALUE }),
    ],
    toolkit: { polls: ['date'], note: 'Stock counted in and out, every day. We never write a price — what the label charges is theirs.' },
    timeline: {
      before: ['Space secured with a landlord agreement that permits retail', 'Fit-out, lighting and payment tested before opening', 'Stock counted in against a sheet or a system'],
      during: ['Stock counted at open and close each day', 'Payment point checked each morning with a fallback ready', 'Overnight cover or stock removal, every night'],
      after: ['Final stock count and reconciliation', 'Fit-out struck and the space returned as found', 'Images delivered to the label'],
    },
    checklist: ['Landlord agreement permits retail', 'Fitting rooms and lighting built', 'Payment tested with a fallback', 'Daily stock count'],
  }),

  B('fashion-exhibition', 'Exhibit', 'Garments shown as objects rather than stock, which is a different craft.', {
    about: 'Not a shop and not a show: pieces on stands, lit and labelled, with nothing for sale. Conservation, mounting and lighting matter more than merchandising.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('pieces', 'How many pieces?', 'select', { options: [['15', 'Up to 15'], ['50', 'Up to 50'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      Q('era', 'What is being shown?', 'many', { options: [['contemporary', 'Contemporary'], ['archive', 'Archive or heritage'], ['textile', 'Textiles and craft'], ['couture', 'Couture'], ['student', 'Student work'], ['regional', 'Regional dress']] }),
      Q('mounting', 'How are pieces mounted?', 'many', { options: [['mannequins', 'Mannequins'], ['cases', 'Cases'], ['flat', 'Flat or framed'], ['hanging', 'Hanging'], ['conservation', 'Conservation mounts']] }),
      Q('days', 'How long is it open?', 'select', { options: [['1', 'One day'], ['7', 'A week'], ['30', 'A month'], ['90', 'Longer']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Mount', 'Mannequins, cases, plinths and conservation mounts'),
      S('event_lighting', 'recommended', 'Light', 'Gallery lighting at levels that will not fade a textile'),
      S('invitation_printing', 'recommended', 'Label', 'A label per piece — maker, date, material — plus the exhibition text'),
      S('security_services', 'conditional', 'Watch', 'Invigilation and cover, including overnight for a long run', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0], ans('days', '30', '90'))] }),
      S('guest_services', 'conditional', 'Guide', 'Invigilators who can also answer a question about a piece', { when: [some(WHEN_STAFFED[0], ans('days', '7', '30', '90'))] }),
      S('photography', 'conditional', 'Document', 'Every piece photographed properly, which outlives the exhibition', { when: WHEN_SHOT }),
      S('decoration_floral', 'conditional', 'Set', 'An entrance and a thread running through the rooms', { when: WHEN_BRAND }),
      S('tent_furniture', 'conditional', 'Rest', 'Seating in the galleries for visitors who cannot stand', { when: WHEN_SEATS }),
      S('sound_av', 'conditional', 'Add', 'Screens or audio where a piece needs context', { when: [some(WHEN_SCREENS[0], WHEN_AV[0])] }),
      S('catering_food', 'conditional', 'Open it', 'Refreshments at the private view only, never in the galleries', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Cleaning during the run and the de-install afterwards', { when: [some(WHEN_CLEAN[0], ans('days', '7', '30', '90'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Handle', 'Pieces transported, handled and condition-checked in and out', { when: [some(WHEN_HIGH_VALUE[0], ans('era', 'archive', 'couture'))] }),
      S('venue', 'conditional', 'Find', 'A space with controllable light and stable conditions', { when: WHEN_FINDING }),
    ],
    addons: [
      X('light_levels', 'Protect it', 'Lux levels set low enough that textiles do not fade over the run', 'lighting', { trade: 'event_lighting', when: [ans('era', 'archive', 'couture', 'textile')] }),
      X('condition_report', 'Record', 'A condition note for every piece, in and out, with photographs', 'album', { experience: true }),
      X('maker_credits', 'Credit', 'Every maker named on the label, and told they are being named', 'invite', { trade: 'invitation_printing' }),
      X('handling_protocol', 'Handle it', 'A written handling protocol, and gloves where the piece needs them', 'craft', { experience: true, when: WHEN_HIGH_VALUE }),
    ],
    toolkit: { polls: ['date'], note: 'Makers and lenders own their pieces. Condition, handling, lighting levels and reproduction are agreed with them in writing before anything is hung.' },
    timeline: {
      before: ['Condition noted and photographed for every piece on arrival', 'Light levels set for conservation, not for drama', 'Labels written and checked with the makers or lenders'],
      during: ['Light levels rechecked through the run', 'Invigilation whenever the galleries are open', 'Nothing touched without the handling protocol'],
      after: ['Every piece returned, condition checked against arrival', 'Documentation given to makers and lenders', 'Space made good'],
    },
    checklist: ['Condition reports in and out', 'Conservation light levels set', 'Labels checked with makers', 'Handling protocol written'],
  }),

  B('luxury-brand-showcase', 'Present', 'Few guests, high value, and a room where discretion is the product.', {
    about: 'The opposite of footfall. A small invited audience, pieces worth more than the event, and a security and insurance plan that has to be invisible to the guests but absolute.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('category', 'What category?', 'one', { options: [['watches', 'Watches'], ['jewellery', 'Jewellery'], ['fashion', 'Fashion'], ['auto', 'Automotive'], ['art', 'Art or objects'], ['other', 'Something else']] }),
      Q('appointments', 'Is it by appointment?', 'yesno'),
      Q('insurance', 'Is the stock insured for the event?', 'one', {
        options: [['yes', 'Yes, with the conditions in hand'], ['arranging', 'Being arranged'], ['no', 'Not yet']],
        help: 'The insurer’s conditions usually set the security. We plan to them rather than around them.',
      }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('security_services', 'recommended', 'Protect', 'Discreet cover, access control, and stock counted in and out'),
      S('event_lighting', 'recommended', 'Light', 'Lighting built for the product, which at this level is most of it'),
      S('event_equipment_rental', 'recommended', 'Display', 'Locked cases, plinths, viewing tables and a private viewing room'),
      S('decoration_floral', 'recommended', 'Compose', 'A room restrained enough that the product is the only loud thing'),
      S('guest_services', 'recommended', 'Attend', 'Hosts who know every guest by name before they arrive'),
      S('catering_food', 'conditional', 'Serve', 'Served discreetly, and never near the cases', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Shoot', 'Product and room, under an agreed rule about guests', { when: WHEN_SHOT }),
      S('invitation_printing', 'conditional', 'Invite', 'Invitations, appointment cards and product notes', { when: [some(WHEN_SIGNED[0], ans('appointments', 'yes'))] }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, because arrival is part of the experience at this level', { when: WHEN_PARK }),
      S('sound_av', 'conditional', 'Underlay', 'Music under conversation, and a screen only if one is needed', { when: [some(WHEN_MUSIC[0], WHEN_SCREENS[0])] }),
      S('passenger_transport', 'optional', 'Convey', 'Cars for guests, arranged rather than offered'),
      S('venue', 'conditional', 'Find', 'A private room with controlled access and no passing traffic', { when: WHEN_FINDING }),
    ],
    addons: [
      X('insurer_conditions', 'Comply', 'The insurer’s conditions read and met, line by line', 'schedule', { experience: true, when: [ans('insurance', 'arranging', 'no')] }),
      X('stock_count', 'Count it', 'Every piece counted in, during and out, by two people', 'poll', { experience: true }),
      X('appointment_flow', 'Space them', 'Appointments spaced so no two clients overlap in the viewing room', 'schedule', { trade: 'guest_services', when: [ans('appointments', 'yes')] }),
      X('discreet_security', 'Stay invisible', 'Security present and effective without being visible to guests', 'security_services', { trade: 'security_services' }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Guest lists and client names stay private. Stock is counted by two people in and out, and the insurer’s conditions set the security plan.' },
    timeline: {
      before: ['Insurer’s conditions read and the security plan built to them', 'Stock counted in by two people, with photographs', 'Guest list fixed and hosts briefed on every name'],
      during: ['Access controlled, nobody admitted who is not on the list', 'Cases locked except during a supervised viewing', 'Appointments spaced so clients never overlap'],
      after: ['Stock counted out by two people against the arrival count', 'Nothing published about who attended', 'Follow-up handled by the brand, personally'],
    },
    checklist: ['Insurer conditions met', 'Stock counted by two people', 'Guest list fixed and hosts briefed', 'Appointments spaced'],
  }),

  B('designer-collection-launch', 'Unveil', 'A collection seen for the first time, by buyers and press at once.', {
    about: 'Two audiences in one room with different needs: buyers want to touch and order, press want images and a story. The plan has to serve both without letting either ruin the other.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('audience_mix', 'Who is coming?', 'many', { options: [['buyers', 'Buyers'], ['press', 'Press'], ['creators', 'Creators'], ['clients', 'Private clients'], ['stylists', 'Stylists'], ['industry', 'Industry']] }),
      Q('format', 'How is the collection shown?', 'one', { options: [['presentation', 'A static presentation'], ['ramp', 'A ramp show'], ['appointment', 'Appointment viewings'], ['installation', 'An installation'], ['mixed', 'A mix']] }),
      Q('orders', 'Are orders taken at the launch?', 'yesno'),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Light', 'Lighting for fabric and colour, which photographs very differently'),
      S('event_equipment_rental', 'recommended', 'Present', 'Rails, mannequins, plinths, a ramp or the viewing setup'),
      S('decoration_floral', 'recommended', 'Set', 'A set that frames the collection rather than competing with it'),
      S('photography', 'recommended', 'Shoot', 'Look images and detail shots — the assets the season will run on', { unless: UNLESS_PHOTO }),
      S('guest_services', 'conditional', 'Separate', 'Buyers and press handled differently, by staff who know which is which', { when: [some(WHEN_STAFFED[0], ans('audience_mix', 'buyers', 'press'))] }),
      S('invitation_printing', 'conditional', 'Document', 'Invitations, line sheets, look books, press kits and order forms', { when: [some(WHEN_SIGNED[0], ans('orders', 'yes'), ans('audience_mix', 'press'))] }),
      S('bridal_makeup_hair', 'conditional', 'Style', 'Hair, makeup and dressers for a ramp or presentation', { when: [ans('format', 'ramp', 'presentation', 'mixed')] }),
      S('sound_av', 'conditional', 'Cue', 'Sound and cues for a ramp, or a playlist for a presentation', { when: [some(WHEN_MUSIC[0], WHEN_STAGE[0])] }),
      S('catering_food', 'conditional', 'Host', 'Canapés and drinks, away from the garments', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Protect', 'Cover for sample stock, which disappears easily', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for a show, or viewing tables for appointments', { when: [some(WHEN_SEATS[0], ans('format', 'ramp', 'appointment'))] }),
      S('videography', 'conditional', 'Film', 'A collection film, which is how the season travels', { when: WHEN_FILM }),
      S('venue', 'conditional', 'Find', 'A room with daylight or controllable light, and space to hang', { when: WHEN_FINDING }),
    ],
    addons: [
      X('line_sheets', 'Equip buyers', 'Line sheets with codes, materials and delivery dates — not prices from us', 'invite', { trade: 'invitation_printing', when: [ans('audience_mix', 'buyers')] }),
      X('press_assets', 'Supply press', 'Look images and detail shots released the same week', 'camera', { trade: 'photography', when: [ans('audience_mix', 'press', 'creators')] }),
      X('appointment_slots', 'Separate them', 'Buyer appointments scheduled apart from the press window', 'schedule', { experience: true, when: [ans('format', 'appointment', 'mixed')] }),
      X('sample_count', 'Count it', 'Samples counted in and out, piece by piece', 'poll', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We never write a price. Wholesale terms and retail pricing are the designer’s, and the line sheet carries them, not us.' },
    timeline: {
      before: ['Buyer and press windows scheduled apart', 'Samples counted in and steamed, with a condition note', 'Line sheets and press kits prepared by the designer'],
      during: ['Buyers given space and time to handle the collection', 'Press given images and a story, not a sales pitch', 'Samples watched and counted through the day'],
      after: ['Samples counted out against the arrival count', 'Press assets released the same week', 'Orders confirmed in writing by the designer'],
    },
    checklist: ['Buyer and press windows separated', 'Samples counted in and out', 'Line sheets prepared', 'Look images shot and released'],
  }),

  B('jewellery-exhibition', 'Secure it', 'Very high value in a public room, which makes this a security plan with a display attached.', {
    about: 'The most valuable stock in the catalogue, in a space the public walks into. The insurer sets the conditions, every piece is counted by two people, and the display is designed around the cases.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('pieces', 'How many pieces?', 'select', { options: [['30', 'Up to 30'], ['150', 'Up to 150'], ['500', 'Up to 500'], ['1500', 'More than 500']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['7', 'A week'], ['14', 'Longer']] }),
      Q('insurance', 'Is the stock insured for the exhibition?', 'one', {
        options: [['yes', 'Yes, with the conditions in hand'], ['arranging', 'Being arranged'], ['no', 'Not yet']],
        help: 'The insurer’s conditions set the cases, the cover and the overnight arrangement. We plan to them.',
      }),
      Q('overnight', 'Where does stock go overnight?', 'one', { options: [['safe', 'Into a safe on site'], ['removed', 'Removed each night'], ['cases', 'Stays in locked cases'], ['undecided', 'Not decided']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('security_services', 'essential', 'Guard', 'Cover on the floor, at the door and overnight, to the insurer’s terms'),
      S('event_equipment_rental', 'recommended', 'Case it', 'Locked cases, viewing tables, plinths and a secure viewing room'),
      S('event_lighting', 'recommended', 'Light', 'Lighting aimed for stones, which need angle more than brightness'),
      S('guest_services', 'recommended', 'Attend', 'A host at every case, because nothing is handled unaccompanied'),
      S('invitation_printing', 'conditional', 'Describe', 'Piece cards, the catalogue, appointment cards and signage', { when: [some(WHEN_SIGNED[0], WHEN_BRAND[0])] }),
      S('decoration_floral', 'conditional', 'Frame', 'A restrained room that does not compete with what is in the cases', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Shoot', 'Pieces photographed in controlled conditions, never casually', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Serve', 'Refreshments kept well away from the cases', { when: WHEN_FOOD }),
      S('valet_parking', 'conditional', 'Receive', 'Valet and a controlled arrival, which clients expect here', { when: WHEN_PARK }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Secure transport in and out, to the insurer’s requirements', { when: [some(ans('overnight', 'removed'), ans('days', '3', '7', '14'))] }),
      S('sound_av', 'conditional', 'Underlay', 'Quiet music, and screens for provenance where there are any', { when: [some(WHEN_MUSIC[0], WHEN_SCREENS[0])] }),
      S('venue', 'conditional', 'Find', 'A room that can be locked, alarmed and controlled at one entrance', { when: WHEN_FINDING }),
    ],
    addons: [
      X('two_person_count', 'Count twice', 'Every piece counted in, at each close and out, by two people', 'poll', { experience: true }),
      X('insurer_terms', 'Meet them', 'The insurer’s conditions read and met before a case is filled', 'schedule', { experience: true, when: [ans('insurance', 'arranging', 'no')] }),
      X('overnight_plan', 'Put it away', 'A written overnight plan: safe, removal, or alarmed cases with cover', 'security_services', { trade: 'security_services', when: [ans('overnight', 'undecided', 'cases')] }),
      X('viewing_protocol', 'Handle it', 'One piece out at a time, logged, with a host present throughout', 'invite', { trade: 'guest_services' }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Security here is a condition of the event, not a line item. Pieces are counted by two people at every stage and the insurer’s terms set the plan.' },
    timeline: {
      before: ['Insurer’s conditions read and the plan built to meet them', 'Every piece counted in and photographed, by two people', 'Overnight arrangement agreed in writing'],
      during: ['One piece out of a case at a time, logged, host present', 'Counts at every close, not only at the end', 'Cover on the floor and at the door all day'],
      after: ['Final count against the arrival count, by two people', 'Secure transport out to the insurer’s terms', 'Any discrepancy reported immediately'],
    },
    checklist: ['Insurer conditions met', 'Two-person counts at every stage', 'Overnight arrangement in writing', 'A host at every case'],
  }),

  B('beauty-and-makeup-workshop', 'Apply', 'Products on people’s skin, which makes hygiene the first line of the plan.', {
    about: 'Everything applied to a face is a hygiene question: new or sanitised tools, single-use applicators, and a patch test where the product calls for one. We make no claim about what any product does.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('focus', 'What is being taught?', 'one', { options: [['everyday', 'Everyday makeup'], ['bridal', 'Bridal'], ['skincare', 'Skincare routine'], ['hair', 'Hair'], ['professional', 'Professional technique'], ['product', 'A product range']] }),
      Q('hands_on', 'Is it hands-on?', 'one', { options: [['self', 'Participants work on themselves'], ['models', 'On models'], ['demo', 'Demonstration only'], ['both', 'Demonstration then hands-on']] }),
      Q('hygiene', 'How are tools and products handled?', 'one', {
        options: [['single', 'Single-use applicators throughout'], ['sanitised', 'Sanitised between people'], ['own', 'Everyone brings their own'], ['undecided', 'Not decided']],
        help: 'Anything touching skin is single-use or sanitised between people. We keep this on the plan.',
      }),
      Q('patch_test', 'Is a patch test needed for any product?', 'yesno', { optional: true }),
      BRANDING, SELLING, STAFF, AV, PHOTOS, FOOD, SIGNAGE, SEATS, CLEAN,
    ],
    plan: [
      S('bridal_makeup_hair', 'recommended', 'Teach', 'A qualified artist, with sanitised kit and single-use applicators'),
      S('event_equipment_rental', 'recommended', 'Set up', 'Stations with mirrors, lit properly, with a bin at every seat'),
      S('event_lighting', 'recommended', 'Light true', 'Daylight-balanced light — warm light changes how makeup reads'),
      S('safety_facilities', 'recommended', 'Keep clean', 'Handwashing, waste for used applicators, and the clear-up'),
      S('invitation_printing', 'conditional', 'Hand out', 'Step cards, ingredient and allergen notes, and the sign-up form', { when: [some(WHEN_SIGNED[0], WHEN_BRAND[0])] }),
      S('sound_av', 'conditional', 'Show', 'An overhead camera and a screen — nobody sees a brush from row three', { when: [some(WHEN_SCREENS[0], WHEN_PA[0])] }),
      S('guest_services', 'conditional', 'Assist', 'Assistants at the stations, and the patch-test process run properly', { when: [some(WHEN_STAFFED[0], ans('patch_test', 'yes'))] }),
      S('photography', 'conditional', 'Record', 'Before and after, only with each person asked individually', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating at mirror height, which a normal chair is not', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Refresh', 'Refreshments away from the products and the stations', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Dress', 'A set that photographs well, since this will be shared', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'A room with daylight, water and power at the stations', { when: WHEN_FINDING }),
    ],
    addons: [
      X('single_use', 'Keep it clean', 'Single-use applicators and sanitised brushes between every person', 'spa', { trade: 'bridal_makeup_hair', when: [ans('hygiene', 'undecided', 'sanitised')] }),
      X('patch_testing', 'Test first', 'Patch tests done in advance where a product calls for one', 'schedule', { experience: true, when: [ans('patch_test', 'yes')] }),
      X('overhead_camera', 'See it', 'An overhead camera on the artist’s hands, on a screen', 'media', { trade: 'sound_av', when: [ans('hands_on', 'demo', 'both')] }),
      X('ingredient_list', 'Declare', 'Ingredient lists available for every product used', 'invite', { trade: 'invitation_printing' }),
    ],
    toolkit: { polls: ['date'], note: 'Single-use or sanitised tools between people, always. We make no claim about what any product does to skin or hair, and nobody is photographed without being asked.' },
    timeline: {
      before: ['Hygiene standard agreed: single-use or sanitised between every person', 'Patch tests arranged where a product calls for one', 'Ingredient lists gathered for every product in use'],
      during: ['Applicators single-use, brushes sanitised between people', 'Ingredient lists available on request, in writing', 'Photography only with each person asked individually'],
      after: ['Used applicators disposed of properly', 'Stations cleaned and kit sanitised', 'Images shared only with those who agreed'],
    },
    checklist: ['Single-use or sanitised tools', 'Patch tests where needed', 'Ingredient lists available', 'Daylight-balanced lighting'],
  }),

  B('product-demonstration', 'Prove it', 'One product, shown doing the thing it claims to do, repeatedly.', {
    about: 'A demonstration lives on reliability: the same result, forty times, in front of strangers. Power, a reset routine and a spare unit are the plan.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('product_kind', 'What kind of product?', 'one', { options: [['appliance', 'An appliance'], ['tech', 'Technology'], ['beauty', 'Beauty or personal care'], ['food_product', 'A food product'], ['tool', 'A tool or equipment'], ['service', 'A service']] }),
      Q('demo_needs', 'What does the demonstration need?', 'many', { options: [['power', 'Power'], ['water', 'Water'], ['extraction', 'Ventilation'], ['bench', 'A bench or counter'], ['screen', 'A screen'], ['consumables', 'Consumables to use up']] }),
      Q('frequency', 'How often does it run?', 'one', { options: [['hourly', 'Hourly'], ['continuous', 'Continuously'], ['scheduled', 'At set times'], ['once', 'Once']] }),
      BRANDING, SELLING, STAFF, AV, PHOTOS, FOOD, SIGNAGE, SEATS, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Bench it', 'A demonstration counter, with a reset area out of sight'),
      S('power_cooling', 'conditional', 'Supply', 'Power, water and extraction, which a retail floor rarely has', { when: [ans('demo_needs', 'power', 'water', 'extraction')] }),
      S('event_lighting', 'recommended', 'Light', 'Light on the hands and the product, not on the demonstrator’s back'),
      S('guest_services', 'conditional', 'Demonstrate', 'Demonstrators who can run it forty times and still be convincing', { when: [some(WHEN_STAFFED[0], ans('frequency', 'hourly', 'continuous', 'scheduled'))] }),
      S('sound_av', 'conditional', 'Amplify', 'A headset mic and a screen, so a crowd three deep can follow', { when: [some(WHEN_PA[0], WHEN_SCREENS[0])] }),
      S('invitation_printing', 'conditional', 'Explain', 'Spec cards, demonstration times and signage — no claims we wrote', { when: [some(WHEN_SIGNED[0], WHEN_BRAND[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'The stand or counter dressed to the brand', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Record', 'The demonstration and the product, for the brand to reuse', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for a scheduled demonstration people watch through', { when: [some(WHEN_SEATS[0], ans('frequency', 'scheduled'))] }),
      S('catering_food', 'conditional', 'Sample', 'Tasting portions, with allergens written down', { when: [some(ans('product_kind', 'food_product'), WHEN_FOOD[0])] }),
      S('safety_facilities', 'conditional', 'Reset', 'Cleaning between runs, and the space cleared afterwards', { when: [some(WHEN_CLEAN[0], ans('frequency', 'hourly', 'continuous'))] }),
      S('venue', 'conditional', 'Find', 'A position with footfall, power and somewhere to reset out of sight', { when: WHEN_FINDING }),
    ],
    addons: [
      X('reset_routine', 'Run it again', 'A written reset routine, timed, so the next demonstration starts clean', 'schedule', { experience: true }),
      X('spare_unit', 'Insure it', 'A second unit, set up and ready, because one will fail', 'gift', { experience: true }),
      X('consumables_plan', 'Stock up', 'Consumables counted for the number of runs, with a buffer', 'budget', { trade: 'event_equipment_rental', when: [ans('demo_needs', 'consumables')] }),
      X('claims_check', 'Say only what is true', 'Every claim on the stand checked by the brand before it is printed', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We write no claim about what a product does. Everything on the stand comes from the brand and is theirs to stand behind.' },
    timeline: {
      before: ['Power, water and extraction confirmed at the position', 'Reset routine written and timed, spare unit prepared', 'Consumables counted against the number of runs'],
      during: ['Reset between every run, out of sight', 'Spare unit kept ready and swapped if anything hesitates', 'Allergens written down for any tasting'],
      after: ['Units and consumables reconciled', 'Position cleaned and reinstated', 'Engagement reported to the brand'],
    },
    checklist: ['Power and services at the position', 'Reset routine written', 'Spare unit ready', 'Consumables counted with a buffer'],
  }),

  B('customer-appreciation-event', 'Thank them', 'Your best customers in the shop after hours, with nothing to buy.', {
    about: 'A retail event that must not feel like a sale. The moment it becomes a promotion the people who came because they were invited stop feeling invited.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('customer_kind', 'Who is invited?', 'one', { options: [['top', 'Top customers'], ['loyalty', 'The loyalty list'], ['local', 'Local regulars'], ['trade', 'Trade customers'], ['all', 'Everyone on the list']] }),
      Q('shape', 'What shape is it?', 'one', { options: [['evening', 'An after-hours evening'], ['preview', 'A preview of new stock'], ['experience', 'An experience or workshop'], ['dinner', 'A dinner'], ['outing', 'An outing']] }),
      THEME('A theme?', [['none', 'No theme'], ['season', 'A season'], ['collection', 'A collection'], ['anniversary', 'An anniversary'], ['other', 'Something else']]),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, DISPLAY, PHOTOS, FOOD, SIGNAGE, SEATS, PARKING,
    ],
    plan: [
      S('catering_food', 'recommended', 'Host', 'Food and drink that make it an evening rather than an opening'),
      S('guest_services', 'recommended', 'Receive', 'Hosts who know every guest’s name and history before the door'),
      S('decoration_floral', 'recommended', 'Lift', 'The store dressed so it does not look like a trading day'),
      S('event_lighting', 'conditional', 'Warm', 'Lighting dropped from retail level to evening level', { when: [some(WHEN_LIT[0], WHEN_BRAND[0])] }),
      S('invitation_printing', 'conditional', 'Invite', 'Proper invitations, and nothing that reads as a promotion', { when: [some(WHEN_SIGNED[0], WHEN_BRAND[0])] }),
      S('live_entertainment', 'conditional', 'Soften', 'Music at a level people can talk across', { when: [some(WHEN_MUSIC[0], ans('shape', 'evening', 'dinner'))] }),
      S('photography', 'conditional', 'Record', 'Discreetly, and only where guests are comfortable', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Give', 'Something considered, not branded merchandise', { when: [ans('selling', 'no', 'leads')] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating, because a store has none and people will want to stay', { when: WHEN_SEATS }),
      S('event_equipment_rental', 'conditional', 'Clear it', 'Fixtures moved or covered so the floor becomes a room', { when: [some(ans('shape', 'evening', 'dinner', 'experience'), WHEN_CASES[0])] }),
      S('security_services', 'conditional', 'Watch', 'Discreet cover for stock while the shop is full after hours', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0])] }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, so arriving feels like being expected', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'Somewhere else, if the store cannot hold the list comfortably', { when: WHEN_FINDING }),
    ],
    addons: [
      X('personal_invite', 'Ask them properly', 'Each customer invited personally by the person who serves them', 'phone', { experience: true }),
      X('no_sell_rule', 'Hold back', 'An agreed rule that nobody is sold to during the evening', 'schedule', { experience: true }),
      X('preview_access', 'Show first', 'First sight of new stock, with nothing on the floor priced yet', 'gift', { experience: true, when: [ans('shape', 'preview')] }),
      X('follow_up', 'Afterwards', 'A personal note from the person who invited them, within the week', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'No selling during the evening. A customer appreciation event with a till open is a sale with canapés.' },
    timeline: {
      before: ['Customers invited personally by the people who serve them', 'The store dressed so it stops looking like a trading floor', 'Staff briefed on every guest, and on not selling'],
      during: ['Hosts greeting by name', 'No selling, no pitch, no till', 'Food and time to talk'],
      after: ['A personal note from each inviter within the week', 'Store reset for trading', 'Feedback on who came and who did not'],
    },
    checklist: ['Customers invited personally', 'Store dressed as a room, not a shop', 'No-sell rule agreed with staff', 'Personal follow-up planned'],
  }),

  B('seasonal-sale-event', 'Clear it', 'A queue before opening, and stock that has to move in three days.', {
    about: 'The crowd is the risk and the stock movement is the measure. Queue management, floor flow and enough till capacity decide whether a sale makes money or just makes a scene.',
    formats: ['venue', 'outdoor'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['7', 'A week'], ['30', 'Longer']] }),
      Q('expect_queue', 'Do you expect a queue before opening?', 'yesno'),
      Q('tills', 'How many payment points?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['6', 'Six'], ['12', 'More than six']] }),
      Q('stock_moves', 'How is stock replenished?', 'one', { optional: true, options: [['backroom', 'From a back room'], ['warehouse', 'From a warehouse'], ['fixed', 'Everything is on the floor'], ['rolling', 'Rolling deliveries']] }),
      PERMITS, STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PARKING, PHOTOS, SIGNAGE, CLEAN,
    ],
    plan: [
      S('security_services', 'recommended', 'Hold the line', 'Queue and door control, and watch on the floor and the tills'),
      S('guest_services', 'recommended', 'Move them', 'Queue management, door counting and floor staff who keep flow'),
      S('invitation_printing', 'recommended', 'Signpost', 'Queue signs, floor signage and offer cards written by you'),
      S('event_equipment_rental', 'conditional', 'Lay out', 'Extra rails, tables, queue barriers and additional payment points', { when: [some(ans('tills', '3', '6', '12'), ans('expect_queue', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Flag it', 'Window and façade treatment that reads from across the road', { when: WHEN_BRAND }),
      S('safety_facilities', 'conditional', 'Keep it', 'Cleaning through the day and the floor reset each night', { when: [some(WHEN_CLEAN[0], ans('days', '3', '7', '30'))] }),
      S('sound_av', 'conditional', 'Announce', 'Music and announcements, which control pace more than people think', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Full, bright retail lighting — a sale floor should not be moody', { when: WHEN_LIT }),
      S('photography', 'conditional', 'Record', 'The queue and the floor, which is the story for next season', { when: WHEN_SHOT }),
      S('loading_unloading_crew', 'conditional', 'Replenish', 'A crew moving stock from the back to the floor through the day', { when: [ans('stock_moves', 'backroom', 'warehouse', 'rolling')] }),
      S('mini_truck_pickup', 'conditional', 'Shuttle', 'Stock runs from the warehouse during trading hours', { when: [ans('stock_moves', 'warehouse', 'rolling')] }),
      S('valet_parking', 'conditional', 'Park', 'Parking and a drop-off that does not become the queue', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'Additional space if the sale will not fit in the store', { when: WHEN_FINDING }),
    ],
    addons: [
      X('queue_plan', 'Order it', 'A queue line drawn and barriered before the first person arrives', 'map', { trade: 'security_services', when: [ans('expect_queue', 'yes')] }),
      X('till_capacity', 'Take the money', 'Enough payment points for the peak, with a fallback for each', 'budget', { trade: 'event_equipment_rental', when: [ans('tills', '3', '6', '12')] }),
      X('door_counting', 'Count them', 'Door counting against a safe capacity, enforced', 'poll', { trade: 'guest_services', when: WHEN_BIG }),
      X('replenish_rota', 'Keep it full', 'A replenishment rota, so the floor never looks picked over', 'move', { trade: 'loading_unloading_crew', when: [ans('stock_moves', 'backroom', 'warehouse', 'rolling')] }),
    ],
    toolkit: { polls: ['date'], note: 'We never write a discount or a price. Door counting against a safe capacity stays on the plan when a queue is expected.' },
    timeline: {
      before: ['Queue line drawn and barriered, with permission for the pavement', 'Payment points tested, with a fallback for each', 'Replenishment rota agreed with the back room or warehouse'],
      during: ['Door counted against a safe capacity from before opening', 'Floor replenished on the rota so it never looks picked over', 'Tills watched, with staff moved to the peak'],
      after: ['Floor reset each night', 'Stock and takings reconciled daily', 'Queue area and pavement cleaned'],
    },
    checklist: ['Queue line drawn and permitted', 'Till capacity for the peak', 'Door counting enforced', 'Replenishment rota agreed'],
  }),

  B('lifestyle-expo', 'Gather brands', 'A hall of exhibitors who each paid for footfall past their stand.', {
    about: 'The exhibitors are the customers. The floor plan decides who gets seen, the visitor marketing decides whether anyone comes, and both are what gets judged afterwards.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('stands', 'How many stands?', 'select', { options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['500', 'More than 200']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Longer']] }),
      Q('sectors', 'What sectors?', 'many', { options: [['home', 'Home and interiors'], ['fashion', 'Fashion'], ['wellness', 'Wellness'], ['food_sector', 'Food'], ['tech', 'Technology'], ['travel', 'Travel']] }),
      Q('features', 'What else is on the floor?', 'many', { optional: true, options: [['stage', 'A stage programme'], ['demos', 'Demonstrations'], ['workshops', 'Workshops'], ['kids', 'A children’s area'], ['food_court', 'A food court']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Construct', 'Shell scheme, fascia, furniture, the stage and the aisles between'),
      S('power_cooling', 'recommended', 'Distribute', 'Metered power per stand, and cooling across a full hall'),
      S('guest_services', 'recommended', 'Admit', 'Visitor registration, badge printing and footfall counting'),
      S('invitation_printing', 'recommended', 'Direct', 'Floor plan, stand numbers, badges, signage and the visitor guide'),
      S('safety_facilities', 'recommended', 'Service', 'Washrooms, cleaning through the day and the clear-up'),
      S('sound_av', 'conditional', 'Stage', 'Sound and screens for the stage, set so it does not bleed into aisles', { when: [some(ans('features', 'stage', 'demos', 'workshops'), WHEN_STAGE[0])] }),
      S('security_services', 'conditional', 'Secure', 'Hall security overnight and badge-checked entry', { when: [some(WHEN_GUARD[0], ans('days', '2', '3', '5'))] }),
      S('catering_food', 'conditional', 'Feed', 'A food court for visitors and something for exhibitors on stands', { when: [some(ans('features', 'food_court'), WHEN_FOOD[0])] }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, aisle signage and the expo identity across the hall', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Document', 'Every stand and the floor, for exhibitors and next year’s sell', { when: WHEN_SHOT }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Build-up, move-in, move-out and crew across the days', { when: [ans('days', '2', '3', '5')] }),
      S('loading_unloading_crew', 'conditional', 'Lift', 'A crew for move-in and move-out, which is where days are lost', { when: [ans('stands', '200', '500')] }),
      S('valet_parking', 'conditional', 'Park', 'Visitor parking and a separate exhibitor loading route', { when: WHEN_PARK }),
      S('live_entertainment', 'conditional', 'Occupy', 'A children’s area, because consumers come as families and stay longer', { when: [ans('features', 'kids')] }),
      S('venue', 'conditional', 'Secure', 'A hall with the floor area, loading access and power', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_plan', 'Place them', 'A floor plan that gives every stand real footfall, not just a slot', 'map', { trade: 'invitation_printing' }),
      X('exhibitor_manual', 'Instruct', 'Move-in times, power limits, build rules and deadlines, in advance', 'invite', { trade: 'invitation_printing' }),
      X('visitor_marketing', 'Bring them', 'A visitor campaign, because footfall is what exhibitors actually bought', 'poll', { experience: true }),
      X('footfall_report', 'Prove it', 'Verified footfall and dwell data, reported to every exhibitor', 'poll', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'The exhibitors are the customers and footfall is what they bought. We will not trade floor plan or visitor marketing for decoration.' },
    timeline: {
      before: ['Floor plan drawn so every stand gets usable footfall', 'Exhibitor manual issued with move-in slots and power limits', 'Visitor campaign running well before the doors'],
      during: ['Move-in to slots so the hall is finished before doors', 'Footfall counted accurately at every entrance', 'Cleaning and washrooms serviced through the day'],
      after: ['Move-out to slots with the crew booked', 'Footfall and dwell report to every exhibitor', 'Hall reinstated'],
    },
    checklist: ['Floor plan with usable footfall', 'Exhibitor manual issued', 'Visitor campaign running', 'Footfall measurement in place'],
  }),

  B('home-decor-exhibition', 'Set the room', 'Furniture and objects shown as rooms rather than as stock.', {
    about: 'The vignette is the sales tool: a sofa in a room sells, a sofa in a row does not. Floor loading, heavy move-in and lighting that flatters textiles are the technical work.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('exhibitors', 'How many exhibitors?', 'select', { options: [['10', 'Up to 10'], ['40', 'Up to 40'], ['120', 'Up to 120'], ['250', 'More than 120']] }),
      Q('display_style', 'How is it shown?', 'one', { options: [['vignettes', 'Room sets'], ['stands', 'Conventional stands'], ['gallery', 'Gallery style'], ['mixed', 'A mix']] }),
      Q('heavy', 'Is there heavy or bulky furniture?', 'yesno', { help: 'Floor loading and lift access decide whether a piece can be shown at all.' }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['7', 'A week'], ['30', 'Longer']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build rooms', 'Vignette walls, flooring, plinths and the stand builds'),
      S('event_lighting', 'recommended', 'Flatter', 'Warm, layered lighting — overhead-only light kills fabric and wood'),
      S('loading_unloading_crew', 'conditional', 'Carry', 'A crew for heavy furniture, which is the main cost people forget', { when: [ans('heavy', 'yes')] }),
      S('invitation_printing', 'recommended', 'Label', 'Piece cards with maker and material, a floor plan and signage'),
      S('guest_services', 'conditional', 'Guide', 'Hosts on the floor, and an enquiry desk for orders', { when: [some(WHEN_STAFFED[0], WHEN_LEADS[0])] }),
      S('decoration_floral', 'conditional', 'Dress', 'Styling for the room sets — the part that makes them read as rooms', { when: [some(WHEN_BRAND[0], ans('display_style', 'vignettes', 'mixed'))] }),
      S('photography', 'conditional', 'Shoot', 'Each room set properly lit and shot, which the exhibitors will reuse', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Watch', 'Floor cover and overnight security for a run of several days', { when: [some(WHEN_GUARD[0], ans('days', '3', '7', '30'))] }),
      S('medium_large_goods_vehicle', 'conditional', 'Haul', 'Vehicles for move-in and move-out of large furniture', { when: [ans('heavy', 'yes')] }),
      S('catering_food', 'conditional', 'Refresh', 'A café, which lengthens the time people spend on the floor', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating that is not the exhibits, which visitors will otherwise use', { when: WHEN_SEATS }),
      S('sound_av', 'conditional', 'Soften', 'Low music, which changes how a room set feels', { when: [some(WHEN_MUSIC[0], WHEN_AV[0])] }),
      S('venue', 'conditional', 'Secure', 'A hall with floor loading, lift access and a wide get-in', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_loading', 'Check the floor', 'Floor loading and lift access confirmed before heavy pieces are booked', 'schedule', { experience: true, when: [ans('heavy', 'yes')] }),
      X('vignette_styling', 'Make it a room', 'Each set styled fully — rugs, lamps, objects — not just the furniture', 'craft', { trade: 'decoration_floral', when: [ans('display_style', 'vignettes', 'mixed')] }),
      X('maker_cards', 'Credit', 'A card per piece: maker, material, dimensions and lead time', 'invite', { trade: 'invitation_printing' }),
      X('enquiry_capture', 'Take the lead', 'An enquiry process that reaches the exhibitor the same day', 'budget', { trade: 'guest_services', when: WHEN_LEADS }),
    ],
    toolkit: { polls: ['date'], note: 'We never write a price or a lead time. Both come from the maker and go on their own card.' },
    timeline: {
      before: ['Floor loading and lift access confirmed against the heaviest piece', 'Vignette plan drawn and styling listed per set', 'Move-in slots issued with vehicle sizes'],
      during: ['Room sets fully styled before doors, not during', 'Lighting rechecked daily as bulbs shift', 'Enquiries captured and passed on the same day'],
      after: ['Move-out to slots with the crew and vehicles booked', 'Pieces reconciled against the manifest', 'Images delivered to each exhibitor'],
    },
    checklist: ['Floor loading confirmed', 'Vignettes fully styled', 'Maker cards on every piece', 'Enquiry capture working'],
  }),

  B('interior-design-showcase', 'Specify', 'Designers presenting to people who will actually commission them.', {
    about: 'Closer to a portfolio review than an exhibition. Materials, finishes and drawings are the content, and the conversations are the product — so meeting space matters more than floor area.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('presenters', 'How many designers or studios?', 'select', { options: [['5', 'Up to 5'], ['20', 'Up to 20'], ['50', 'Up to 50'], ['120', 'More than 50']] }),
      Q('shown', 'What is being shown?', 'many', { options: [['boards', 'Material and mood boards'], ['models', 'Models'], ['drawings', 'Drawings and plans'], ['vignettes', 'Built vignettes'], ['vr', 'Virtual walkthroughs'], ['portfolio', 'Portfolios']] }),
      Q('meetings', 'Are there client meetings or consultations?', 'yesno'),
      Q('talks', 'Is there a talks programme?', 'yesno', { optional: true }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Present', 'Display walls, board stands, model plinths and meeting tables'),
      S('event_lighting', 'recommended', 'Show true', 'Neutral light, because a material sample must read honestly'),
      S('invitation_printing', 'recommended', 'Credit', 'Studio cards, a directory, signage and the talks programme'),
      S('guest_services', 'conditional', 'Introduce', 'A desk matching visitors to the right studios, and booking meetings', { when: [some(ans('meetings', 'yes'), WHEN_STAFFED[0])] }),
      S('sound_av', 'conditional', 'Show', 'Screens for walkthroughs, and sound for the talks programme', { when: [some(ans('shown', 'vr'), ans('talks', 'yes'), WHEN_SCREENS[0])] }),
      S('tent_furniture', 'conditional', 'Sit them down', 'Meeting tables and seating, which is where this event works', { when: [some(WHEN_SEATS[0], ans('meetings', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Set', 'An entrance and a thread running through the studios', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Document', 'Each studio’s display, for them to reuse afterwards', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Host', 'Refreshments that keep visitors on the floor for longer', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Watch', 'Cover for models and samples, which walk', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0])] }),
      S('power_cooling', 'conditional', 'Supply', 'Power for screens, walkthroughs and lit displays', { when: [some(ans('shown', 'vr'), WHEN_SCREENS[0])] }),
      S('venue', 'conditional', 'Find', 'A space with neutral light, wall area and rooms for meetings', { when: WHEN_FINDING }),
    ],
    addons: [
      X('meeting_slots', 'Book them', 'Consultation slots booked in advance and signposted on the day', 'schedule', { trade: 'guest_services', when: [ans('meetings', 'yes')] }),
      X('material_lighting', 'Judge it', 'Neutral lighting at every board, so a finish reads as it will on site', 'lighting', { trade: 'event_lighting', when: [ans('shown', 'boards')] }),
      X('studio_directory', 'List them', 'A directory with every studio’s work, contacts and specialism', 'album', { trade: 'invitation_printing' }),
      X('lead_handover', 'Pass it on', 'Enquiries routed to the right studio the same day, with a record', 'phone', { experience: true, when: WHEN_LEADS }),
    ],
    toolkit: { polls: ['date'], note: 'The designers own their drawings and material boards. Photography and reproduction are agreed with each studio before the day.' },
    timeline: {
      before: ['Studio list confirmed with what each is displaying', 'Neutral lighting planned at every board position', 'Consultation slots opened and published'],
      during: ['Meetings to the slot sheet, with somewhere to actually sit', 'Material boards lit neutrally and rechecked', 'Enquiries recorded and routed the same day'],
      after: ['Leads handed to studios with a record', 'Models and samples returned and reconciled', 'Images delivered per studio'],
    },
    checklist: ['Studio displays confirmed', 'Neutral lighting at every board', 'Consultation slots published', 'Lead routing agreed'],
  }),

  B('artisan-market', 'Make and sell', 'Makers selling what they made, which changes how the market has to run.', {
    about: 'Every stallholder is a small business with no staff. Load-in help, payment, breaks and a pitch they can actually reach matter more than the branding above the gate.',
    formats: ['outdoor', 'venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('makers', 'How many makers?', 'select', { options: [['10', 'Up to 10'], ['35', 'Up to 35'], ['80', 'Up to 80'], ['200', 'More than 80']] }),
      Q('crafts', 'What crafts?', 'many', { options: [['textile', 'Textile and weaving'], ['ceramics', 'Ceramics'], ['jewellery_craft', 'Jewellery'], ['wood', 'Wood and metal'], ['paper', 'Paper and print'], ['food_craft', 'Preserves and food']] }),
      Q('demos', 'Are makers demonstrating their craft?', 'yesno', { optional: true }),
      Q('payments', 'How do makers take payment?', 'one', { optional: true, options: [['own', 'Their own'], ['central', 'A central till'], ['digital', 'Digital only'], ['cash', 'Cash']] }),
      PERMITS, STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, SEATS, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Pitch', 'Tables, canopies, marked pitches and demonstration space'),
      S('invitation_printing', 'recommended', 'Name them', 'Pitch numbers, maker cards, a market map and signage'),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, waste, water and the clear-up', { when: [some(WHEN_CLEAN[0], WHEN_BIG[0])] }),
      S('guest_services', 'conditional', 'Support', 'A help desk for makers, and cover so they can take a break', { when: [some(WHEN_STAFFED[0], ans('makers', '35', '80', '200'))] }),
      S('power_cooling', 'conditional', 'Supply', 'Power to the pitches that need it, and lighting if it runs late', { when: [some(ans('demos', 'yes'), ans('crafts', 'food_craft'))] }),
      S('loading_unloading_crew', 'conditional', 'Help them in', 'Load-in help for makers who are carrying their own stock alone', { when: [ans('makers', '35', '80', '200')] }),
      S('decoration_floral', 'conditional', 'Mark', 'A gateway, bunting and row signage', { when: WHEN_BRAND }),
      S('catering_food', 'conditional', 'Feed', 'Food stalls, and something for the makers who cannot leave a pitch', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Steward', 'Stewarding, and overnight cover if stock stays on site', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
      S('photography', 'conditional', 'Record', 'Makers and their work, images they can use themselves', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Shelter', 'Canopies and shade across the pitches, and seating for visitors', { when: [some(ans('place', 'street', 'find'), WHEN_SEATS[0])] }),
      S('sound_av', 'conditional', 'Play', 'Low music and a mic for announcements', { when: [some(WHEN_MUSIC[0], WHEN_PA[0])] }),
      S('venue', 'conditional', 'Secure', 'A ground or hall with access, water and permissions', { when: WHEN_FINDING }),
    ],
    addons: [
      X('maker_breaks', 'Cover them', 'Someone to mind a pitch so a maker can eat and use a washroom', 'group', { trade: 'guest_services' }),
      X('maker_cards', 'Tell their story', 'A card per maker: who they are, what they make and how', 'invite', { trade: 'invitation_printing' }),
      X('load_in_help', 'Carry it', 'Trolleys and a crew, because makers arrive alone with heavy stock', 'move', { trade: 'loading_unloading_crew' }),
      X('demo_corner', 'Show the making', 'A demonstration space, which is what makes this different from a market', 'craft', { trade: 'event_equipment_rental', when: [ans('demos', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'We never write a price. Makers set their own, and we never ask them to discount for the market.' },
    timeline: {
      before: ['Pitch plan drawn with fair footfall and access for carrying stock', 'Maker cards written with each maker, not about them', 'Load-in help and break cover arranged'],
      during: ['Load-in help at the gate from the first arrival', 'Pitch cover so every maker gets a break', 'Waste and water serviced through the day'],
      after: ['Load-out help, same as load-in', 'Ground cleared', 'Maker feedback and images shared with them'],
    },
    checklist: ['Pitch plan with fair footfall', 'Maker cards written with makers', 'Load-in help arranged', 'Break cover for every pitch'],
  }),

  B('handicraft-exhibition', 'Attribute', 'Work from craft traditions, shown with the makers named and present.', {
    about: 'Heritage craft deserves attribution. Provenance, the maker’s own words and fair terms are what separate an exhibition from an extraction, and they go on the plan before the lighting does.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('traditions', 'How many crafts or traditions?', 'select', { options: [['3', 'Up to 3'], ['10', 'Up to 10'], ['25', 'Up to 25'], ['60', 'More than 25']] }),
      Q('makers_present', 'Are the makers themselves present?', 'one', {
        options: [['yes', 'Yes, in person'], ['some', 'Some of them'], ['represented', 'Represented by a cooperative'], ['no', 'No']],
        help: 'Where makers travel, their stay, travel and fair terms are part of the plan.',
      }),
      Q('shown', 'What is shown?', 'many', { options: [['finished', 'Finished pieces'], ['process', 'Process and tools'], ['demos', 'Live demonstrations'], ['archive', 'Archive pieces'], ['film', 'Film about the craft']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['3', 'Three'], ['7', 'A week'], ['30', 'Longer']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Mount', 'Plinths, cases, demonstration benches and hanging for textiles'),
      S('event_lighting', 'recommended', 'Light', 'Light low enough for textile and dye, aimed to show the work'),
      S('invitation_printing', 'recommended', 'Attribute', 'A card per piece: maker, place, tradition, materials and technique'),
      S('guest_services', 'conditional', 'Interpret', 'Hosts who can explain a technique, and support for makers present', { when: [some(ans('makers_present', 'yes', 'some'), WHEN_STAFFED[0])] }),
      S('passenger_transport', 'conditional', 'Bring them', 'Travel for makers coming from their own regions', { when: [ans('makers_present', 'yes', 'some')] }),
      S('sound_av', 'conditional', 'Tell it', 'Film and audio about the craft, in the makers’ own words', { when: [some(ans('shown', 'film'), WHEN_SCREENS[0])] }),
      S('security_services', 'conditional', 'Watch', 'Cover for archive and high-value pieces, including overnight', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0], ans('days', '7', '30'))] }),
      S('photography', 'conditional', 'Document', 'Every piece and every maker, with images given back to them', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Host', 'Refreshments, and proper meals for makers who are here all day', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Set', 'A setting that does not impose one aesthetic on every tradition', { when: WHEN_BRAND }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for demonstrations and for visitors who need to sit', { when: [some(WHEN_SEATS[0], ans('shown', 'demos'))] }),
      S('safety_facilities', 'conditional', 'Service', 'Cleaning during the run and the de-install afterwards', { when: [some(WHEN_CLEAN[0], ans('days', '3', '7', '30'))] }),
      S('venue', 'conditional', 'Find', 'A space with wall, light control and room for demonstration', { when: WHEN_FINDING }),
    ],
    addons: [
      X('maker_attribution', 'Name them', 'Every maker named, with their place and tradition as they state it', 'invite', { trade: 'invitation_printing' }),
      X('fair_terms', 'Pay properly', 'Terms agreed with makers in writing before anything is shipped', 'budget', { experience: true }),
      X('maker_hosting', 'Look after them', 'Travel, stay and meals for makers who have come a long way', 'bed', { experience: true, when: [ans('makers_present', 'yes', 'some')] }),
      X('images_back', 'Give it back', 'Every photograph of a maker and their work given to them', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'Makers and their communities own their work, their techniques and their stories. Attribution, consent and fair terms are agreed in writing before anything is displayed or photographed.' },
    timeline: {
      before: ['Terms agreed in writing with every maker or cooperative', 'Attribution written with the makers, in their own description', 'Travel and stay arranged for makers coming in person'],
      during: ['Makers hosted properly, with meals and breaks', 'Attribution cards checked daily — they go missing', 'Nothing photographed or filmed beyond what was agreed'],
      after: ['Every piece returned or settled, against the agreement', 'Images and film given to the makers', 'Payment made promptly, not on the usual terms'],
    },
    checklist: ['Fair terms agreed in writing', 'Attribution written with makers', 'Travel and stay for makers present', 'Images given back to makers'],
  }),

  B('wedding-expo', 'Match them', 'Couples planning a wedding, and a hall of people who want the booking.', {
    about: 'The visitors are making the biggest purchase of their lives, often with family. The hall has to let them talk, compare and sit down — and the exhibitors are judged on leads, not footfall alone.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('exhibitors', 'How many exhibitors?', 'select', { options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['200', 'Up to 200'], ['400', 'More than 200']] }),
      Q('categories', 'Which categories?', 'many', { options: [['venues', 'Venues'], ['catering', 'Catering'], ['bridal', 'Bridal wear'], ['jewellery_cat', 'Jewellery'], ['photo', 'Photography'], ['decor', 'Décor and planning']] }),
      Q('features', 'What is on besides stands?', 'many', { optional: true, options: [['fashion', 'A fashion show'], ['tastings', 'Tastings'], ['talks', 'Planning talks'], ['consultations', 'Consultations'], ['competition', 'A prize draw']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three']] }),
      STOCK_VALUE, BRANDING, SELLING, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, SEATS, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Build', 'Shell scheme, consultation tables, a ramp and the seating areas'),
      S('guest_services', 'recommended', 'Register', 'Visitor registration that captures a wedding date and a budget band'),
      S('invitation_printing', 'recommended', 'Guide', 'Floor plan, category signage, a visitor guide and lead forms'),
      S('event_lighting', 'conditional', 'Light', 'Lighting for bridal wear and jewellery, which differ completely', { when: [some(WHEN_LIT[0], ans('categories', 'bridal', 'jewellery_cat'))] }),
      S('sound_av', 'conditional', 'Stage', 'Ramp sound and lighting, and sound for the talks programme', { when: [some(ans('features', 'fashion', 'talks'), WHEN_STAGE[0])] }),
      S('tent_furniture', 'conditional', 'Sit them down', 'Seating and consultation tables — couples come with family', { when: [some(WHEN_SEATS[0], ans('features', 'consultations'))] }),
      S('catering_food', 'conditional', 'Taste', 'Tasting counters for caterers, with allergens written down', { when: [some(ans('features', 'tastings'), WHEN_FOOD[0])] }),
      S('security_services', 'conditional', 'Secure', 'Cover for jewellery and bridal stock, overnight as well', { when: [some(WHEN_GUARD[0], WHEN_HIGH_VALUE[0], ans('categories', 'jewellery_cat'))] }),
      S('decoration_floral', 'conditional', 'Set', 'An entrance and set pieces that show what the hall is selling', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Document', 'Stands, the ramp and the floor, for exhibitors and next edition', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Supply', 'Power per stand and cooling for a full hall', { when: [some(WHEN_BIG[0], ans('days', '2', '3'))] }),
      S('valet_parking', 'conditional', 'Park', 'Parking, because couples arrive as families in several cars', { when: WHEN_PARK }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Build-up, move-in and move-out across the days', { when: [ans('days', '2', '3')] }),
      S('venue', 'conditional', 'Secure', 'A hall with the floor area, the power and the loading access', { when: WHEN_FINDING }),
    ],
    addons: [
      X('lead_capture', 'Capture it', 'A lead form with wedding date and category, routed the same day', 'budget', { trade: 'guest_services' }),
      X('consultation_area', 'Let them sit', 'A quiet consultation area away from the aisles', 'chair', { trade: 'event_equipment_rental', when: [ans('features', 'consultations')] }),
      X('tasting_hygiene', 'Serve safely', 'Cold storage, handwashing and written allergens at every tasting', 'chef', { trade: 'catering_food', when: [ans('features', 'tastings')] }),
      X('lead_report', 'Prove it', 'Leads and footfall reported to every exhibitor within the week', 'poll', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'We never write a price or a package. Visitor contact details are collected with consent and shared only with the exhibitors they chose.' },
    timeline: {
      before: ['Floor plan drawn by category, so couples can compare like with like', 'Lead capture agreed with consent wording', 'Tasting hygiene and cold storage arranged with caterers'],
      during: ['Registration capturing dates and categories, with consent', 'Consultation area kept quiet and available', 'Leads routed to exhibitors the same day'],
      after: ['Lead and footfall report to every exhibitor', 'Visitor data handled only as consented', 'Hall reinstated'],
    },
    checklist: ['Floor plan by category', 'Lead capture with consent', 'Tasting hygiene arranged', 'Consultation seating available'],
  }),

  B('lifestyle-workshop', 'Make it', 'Fifteen people, a table, and a skill they will go home having practised.', {
    about: 'Small and materials-led. Kits counted per person, a maker who can teach as well as make, and a result everyone takes home — those three decide whether people come back.',
    formats: ['venue', 'outdoor'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('subject', 'What is being taught?', 'one', { options: [['craft', 'A craft'], ['wellness_sub', 'Wellness'], ['styling', 'Styling'], ['plants', 'Plants and gardening'], ['home_skill', 'A home skill'], ['art', 'Art']] }),
      Q('materials', 'What do participants need?', 'many', { options: [['kit', 'A kit each'], ['tools', 'Shared tools'], ['tables', 'Work tables'], ['aprons', 'Aprons or protection'], ['water', 'Water or washing']] }),
      Q('take_home', 'Do they take something home?', 'yesno'),
      Q('sessions', 'How many sessions?', 'select', { optional: true, options: [['1', 'One'], ['3', 'A few'], ['8', 'A course'], ['ongoing', 'Ongoing']] }),
      BRANDING, SELLING, STAFF, AV, PHOTOS, FOOD, SIGNAGE, SEATS, CLEAN,
    ],
    plan: [
      S('event_materials_supplier', 'recommended', 'Kit them', 'A kit per person, counted against the sign-up list with spares'),
      S('event_equipment_rental', 'recommended', 'Set up', 'Work tables, shared tools, aprons and a demonstration position'),
      S('event_lighting', 'conditional', 'Light it', 'Light on the work surface, which a general room light is not', { when: [some(WHEN_LIT[0], ans('subject', 'craft', 'art'))] }),
      S('guest_services', 'conditional', 'Assist', 'An assistant on the floor, so the teacher is not the only one', { when: WHEN_STAFFED }),
      S('invitation_printing', 'conditional', 'Instruct', 'Step cards, a materials list and a take-home sheet', { when: [some(WHEN_SIGNED[0], ans('take_home', 'yes'))] }),
      S('sound_av', 'conditional', 'Show', 'An overhead camera and a screen, so the back of the room can see', { when: [some(WHEN_SCREENS[0], WHEN_PA[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating at table height, which an event chair is not', { when: WHEN_SEATS }),
      S('photography', 'conditional', 'Record', 'Participants and their work, with everyone asked first', { when: WHEN_SHOT }),
      S('catering_food', 'conditional', 'Refresh', 'Tea and something small, away from the materials', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Clear', 'Washing, waste for materials, and the space reset', { when: [some(WHEN_CLEAN[0], ans('materials', 'water'))] }),
      S('decoration_floral', 'conditional', 'Dress', 'A set that photographs well, since this will be shared', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'A room with tables, light, water and a floor that can take a mess', { when: WHEN_FINDING }),
    ],
    addons: [
      X('kit_count', 'Count them', 'Kits counted against the sign-up list, with spares for the day', 'craft', { trade: 'event_materials_supplier', when: [ans('materials', 'kit')] }),
      X('take_home_pack', 'Send it home', 'Packaging so the thing they made survives the journey', 'gift', { trade: 'invitation_printing', when: [ans('take_home', 'yes')] }),
      X('overhead_view', 'See the hands', 'An overhead camera, which is the only way a back row learns', 'media', { trade: 'sound_av' }),
      X('follow_on', 'Keep going', 'The next session announced before this one ends', 'schedule', { experience: true, when: [ans('sessions', '3', '8', 'ongoing')] }),
    ],
    toolkit: { polls: ['date'], note: 'Keep it small enough that everyone gets attention. A workshop that has become a demonstration has stopped being a workshop.' },
    timeline: {
      before: ['Sign-ups closed so kits can be counted properly', 'Kits made up per person, with spares', 'Tables, light and water checked in the room'],
      during: ['Kits on the tables before anyone arrives', 'An assistant on the floor throughout', 'Everyone finishes with something, even the slowest'],
      after: ['Work packed for the journey home', 'Space cleaned and reset', 'Next session announced'],
    },
    checklist: ['Kits counted with spares', 'Work-surface lighting', 'Assistant on the floor', 'Take-home packaging ready'],
  }),

  B('beauty-pageant', 'Judge fairly', 'People judged in public, which puts consent and safeguarding before the staging.', {
    about: 'A competition where the contestants are the subject. The published criteria, the chaperoning, the changing arrangements and the consent are not administration — they are what makes it defensible to run.',
    formats: ['venue'],
    ask: [
      FOOTFALL, PLACE, ACCESS,
      Q('contestants', 'How many contestants?', 'select', { options: [['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'Up to 50'], ['100', 'More than 50']] }),
      Q('rounds', 'What rounds are there?', 'many', { options: [['introduction', 'Introductions'], ['talent', 'Talent'], ['interview', 'Interview'], ['themed', 'A themed round'], ['final', 'A final question']] }),
      Q('minors', 'Is anyone under eighteen taking part?', 'yesno', {
        help: 'If so, guardian consent, chaperoning and a strict photography rule come before anything else on this plan.',
      }),
      Q('criteria', 'Are the judging criteria published?', 'one', {
        options: [['yes', 'Yes, before entries'], ['no', 'Not yet'], ['help', 'We need help with this']],
        help: 'We never write criteria about anyone’s body, measurements or appearance. The criteria are the organiser’s and are published.',
      }),
      Q('changing', 'How many changing rooms are needed?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['4', 'Four'], ['8', 'More than four']] }),
      CHIEF_GUEST, AWARDS, DRESS_CODE, BRANDING, STAFF, GUARD, AV, PHOTOS, SIGNAGE, SEATS,
    ],
    plan: [
      S('event_lighting', 'recommended', 'Light', 'Stage lighting even on every contestant, not flattering to some'),
      S('sound_av', 'recommended', 'Run', 'Mics, music cues and a screen, run to the published running order'),
      S('event_equipment_rental', 'recommended', 'Build', 'Stage, ramp, judges’ table, and secure, private changing rooms'),
      S('guest_services', 'recommended', 'Chaperone', 'Chaperones backstage, and access to the changing area controlled'),
      S('tent_furniture', 'conditional', 'House', 'Changing rooms with mirrors and rails, and audience seating', { when: [some(WHEN_SEATS[0], ans('changing', '2', '4', '8'))] }),
      S('bridal_makeup_hair', 'conditional', 'Prepare', 'Makeup and hair backstage, with sanitised tools between people', { when: [some(WHEN_STAFFED[0], ans('rounds', 'themed', 'introduction'))] }),
      S('anchor_mc', 'recommended', 'Host', 'A host who can run the rounds without making anyone a punchline'),
      S('invitation_printing', 'recommended', 'Publish', 'The criteria, score sheets, running order, numbers and certificates'),
      S('photography', 'conditional', 'Record', 'From agreed positions only, never backstage, never in changing areas', { when: WHEN_SHOT }),
      S('gifts_favours', 'conditional', 'Award', 'Crowns, sashes and prizes, and something for every finalist', { when: WHEN_TROPHY }),
      S('security_services', 'conditional', 'Control', 'Backstage access controlled, which is the most important door here', { when: [some(WHEN_GUARD[0], ans('minors', 'yes'))] }),
      S('videography', 'conditional', 'Film', 'From the front only, under the same consent as the photography', { when: WHEN_FILM }),
      S('decoration_floral', 'conditional', 'Set', 'A stage set and backdrop', { when: WHEN_BRAND }),
      S('venue', 'conditional', 'Find', 'A venue with a real stage and lockable, private changing rooms', { when: WHEN_FINDING }),
    ],
    addons: [
      X('guardian_consent', 'Protect them', 'Guardian consent, named chaperones and a photography rule for minors', 'heart', { experience: true, when: [ans('minors', 'yes')] }),
      X('published_criteria', 'State it', 'Criteria and judges published before entries, and nothing about bodies', 'poll', { experience: true, when: [ans('criteria', 'no', 'help')] }),
      X('backstage_control', 'Lock the door', 'Changing areas lockable, access logged, nobody unaccompanied', 'security_services', { trade: 'security_services' }),
      X('camera_rule', 'No cameras back there', 'A stated, enforced rule: no photography backstage or in changing areas', 'camera', { experience: true }),
    ],
    toolkit: { guardian: true, polls: false, note: 'Consent, chaperoning and controlled changing areas come before the staging. We never write criteria about anyone’s body, measurements or appearance, and no photography happens backstage.' },
    timeline: {
      before: ['Criteria and judges published before entries, with nothing about bodies', 'Guardian consent and named chaperones arranged for anyone under eighteen', 'Changing rooms confirmed lockable and private'],
      during: ['Backstage access controlled and logged, nobody unaccompanied', 'No photography backstage or in changing areas, enforced', 'Rounds run to the published criteria'],
      after: ['Results published with the criteria visible', 'Images released only as consented', 'Any concern raised backstage followed up properly'],
    },
    checklist: ['Criteria published, nothing about bodies', 'Guardian consent and chaperones', 'Lockable private changing rooms', 'No-camera rule backstage, enforced'],
  }),
]

export const RETAIL_BLUEPRINT = Object.fromEntries(RETAIL_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(RETAIL_BLUEPRINTS, 'retail')
