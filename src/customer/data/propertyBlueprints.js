/**
 * Property & Hospitality Events — one blueprint per occasion.
 *
 * Fifteen occasions where the thing being shown is a building, or the
 * promise of one. That makes two risks particular to this category:
 *
 *   · We make no claim about any property. Not a price, not a payment
 *     plan, not a completion or possession date, not an approval or
 *     registration status, and never a return on investment. Every one
 *     of those is the developer's or the operator's to state, in their
 *     own material, and we will not write or imply any of them.
 *   · A site under construction is a construction site. Protective
 *     equipment, marked routes, a safety briefing and the contractor's
 *     own permission come before a single guest walks onto it.
 *
 * Beyond that: a show home must be reachable by someone who uses a
 * wheelchair, a ceremony at an inauguration is the owner's own choice
 * and never assumed, and nobody's contact details leave an event
 * except to the party they agreed to be passed to.
 *
 * Builders and the repeating questions live in data/blueprintKit.js.
 */
import {
  B, Q, S, X, ans, notAns, has, some, from, checkTrades,
  PHOTOS, THEME, DRESS_CODE, CHIEF_GUEST, AWARDS, DIET_ONLY, ALLERGY_ONLY,
  WHEN_PRINTED, WHEN_TROPHY, UNLESS_PHOTO,
} from './blueprintKit'

/* ── The questions a property occasion asks ─────────────────────── */

const VISITORS = Q('visitors', 'How many people are expected?', 'select', {
  options: [['40', 'Up to 40'], ['200', 'Up to 200'], ['800', 'Up to 800'], ['4000', 'Up to 4000'], ['15000', 'More than 4000']],
})
const PLACE = Q('place', 'Where is it held?', 'one', {
  options: [['site', 'At the site or project'], ['gallery', 'A sales gallery or show unit'], ['hotel', 'A hotel or resort'], ['venue', 'An event venue'], ['hall', 'An exhibition hall'], ['find', 'Please find somewhere']],
})

/** A site under construction is a construction site, not a venue. */
const SITE_STATUS = Q('site_status', 'What is the state of the property?', 'one', {
  options: [['construction', 'Under construction'], ['finishing', 'Structurally complete, finishing'], ['complete', 'Complete'], ['showunit', 'A show unit only'], ['notbuilt', 'Not built — plans and models']],
  help: 'If guests go onto a live site, protective equipment, marked routes and the contractor’s permission come before anything else.',
})
const AUDIENCE = Q('audience', 'Who is coming?', 'many', {
  options: [['buyers', 'Prospective buyers'], ['investors', 'Investors'], ['brokers', 'Brokers and channel partners'], ['press', 'Press'], ['existing', 'Existing owners or guests'], ['trade', 'Trade and industry']],
})
const SITE_SAFETY = Q('site_safety', 'Is the site safety arrangement in hand?', 'one', {
  optional: true, when: [ans('site_status', 'construction', 'finishing')],
  options: [['yes', 'Yes, with the contractor'], ['no', 'Not yet'], ['help', 'We need help with this']],
})
const MATERIAL = Q('material', 'What is being shown?', 'many', {
  options: [['model', 'A scale model'], ['showunit', 'A show unit'], ['walkthrough', 'A virtual walkthrough'], ['plans', 'Plans and drawings'], ['samples', 'Material samples'], ['siteview', 'The site itself']],
})
const BRANDING = Q('branding', 'Do you need branding and signage?', 'yesno')
const ENQUIRIES = Q('enquiries', 'Are enquiries or bookings taken?', 'one', {
  options: [['bookings', 'Bookings on the day'], ['enquiries', 'Enquiries only'], ['appointments', 'Follow-up appointments'], ['none', 'Nothing taken']],
})
const STAFF = Q('staff', 'What staff do you need?', 'many', {
  optional: true,
  options: [['hosts', 'Hosts and greeters'], ['sales', 'Sales team support'], ['guides', 'Site guides'], ['registration', 'A registration desk'], ['concierge', 'Concierge']],
})
const GUARD = Q('security', 'Do you need security?', 'yesno', { optional: true })
const AV = Q('av', 'What does it need technically?', 'many', {
  optional: true, options: [['mics', 'Microphones'], ['screens', 'Screens or LED'], ['lights', 'Lighting'], ['stage', 'A stage'], ['music', 'Music'], ['stream', 'Streaming']],
})
const TRANSPORT = Q('transport', 'Do guests need transport to the site?', 'yesno', { optional: true })
const FOOD = Q('food', 'Refreshments', 'one', {
  optional: true, options: [['meal', 'A meal'], ['canapes', 'Canapés and drinks'], ['counters', 'Counters or a café'], ['tea', 'Tea and coffee'], ['none', 'Nothing needed']],
})
const SIGNAGE = Q('signage', 'Do you need printed material?', 'yesno', { optional: true })
const SEATS = Q('seating', 'Do you need seating?', 'yesno', { optional: true })
const PARKING = Q('parking', 'Do you need parking or valet managed?', 'yesno', { optional: true })
const CLEAN = Q('cleanup', 'Should we arrange clean-up afterwards?', 'yesno', { optional: true })

const WHEN_LIVE_SITE = [ans('site_status', 'construction', 'finishing')]
const WHEN_ONSITE = [ans('place', 'site')]
const WHEN_MODEL = [ans('material', 'model', 'plans')]
const WHEN_SHOWUNIT = [ans('material', 'showunit')]
const WHEN_WALK = [ans('material', 'siteview')]
const WHEN_DIGITAL = [ans('material', 'walkthrough')]
const WHEN_BRAND = [ans('branding', 'yes')]
const WHEN_LEADS = [ans('enquiries', 'bookings', 'enquiries', 'appointments')]
const WHEN_STAFFED = [has('staff')]
const WHEN_DESK = [ans('staff', 'registration', 'hosts')]
const WHEN_GUIDES = [ans('staff', 'guides')]
const WHEN_GUARD = [ans('security', 'yes')]
const WHEN_AV = [has('av')]
const WHEN_PA = [ans('av', 'mics')]
const WHEN_SCREENS = [ans('av', 'screens', 'stream')]
const WHEN_LIT = [ans('av', 'lights')]
const WHEN_STAGE = [ans('av', 'stage')]
const WHEN_MUSIC = [ans('av', 'music')]
const WHEN_RIDE = [ans('transport', 'yes')]
const WHEN_FOOD = [ans('food', 'meal', 'canapes', 'counters', 'tea')]
const WHEN_MEAL = [ans('food', 'meal')]
const WHEN_SIGNED = [ans('signage', 'yes')]
const WHEN_SEATS = [ans('seating', 'yes')]
const WHEN_PARK = [ans('parking', 'yes')]
const WHEN_CLEAN = [ans('cleanup', 'yes')]
const WHEN_SHOT = [notAns('photos', 'no')]
const WHEN_FILM = [ans('photos', 'yes')]
const WHEN_FINDING = [ans('place', 'find', 'venue', 'hall')]
const WHEN_BIG = [ans('visitors', '800', '4000', '15000')]
const WHEN_PRESS = [ans('audience', 'press')]
const WHEN_SAFETY_HELP = [ans('site_safety', 'no', 'help')]

export const PROPERTY_BLUEPRINTS = [

  B('property-launch', 'Reveal it', 'A project sold before it exists, from a model and a drawing.', {
    about: 'Almost nothing is finished, so the model, the walkthrough and the sales gallery carry the whole launch. Everything that could be a claim about the project comes from the developer, never from us.',
    formats: ['venue', 'outdoor'],
    ask: [
      VISITORS, PLACE, SITE_STATUS, AUDIENCE, MATERIAL, SITE_SAFETY,
      Q('reveal', 'How is the project revealed?', 'one', { options: [['model', 'A model unveiling'], ['screen', 'On screen'], ['walkthrough', 'A virtual walkthrough'], ['siteview', 'A site visit'], ['none', 'No formal reveal']] }),
      BRANDING, ENQUIRIES, STAFF, AV, SEATS, GUARD, PHOTOS, FOOD, SIGNAGE, PARKING, TRANSPORT,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Stage it', 'The model plinth, the reveal, the stage and the gallery setup'),
      S('event_lighting', 'recommended', 'Light', 'Light on the model and the screen, which is what gets photographed'),
      S('sound_av', 'conditional', 'Show', 'Screens, the walkthrough and sound for the presentation', { when: [some(WHEN_SCREENS[0], WHEN_PA[0], WHEN_DIGITAL[0])] }),
      S('decoration_floral', 'recommended', 'Set', 'A room that matches what the project claims to be'),
      S('guest_services', 'recommended', 'Receive', 'Registration, hosts, and sales staff matched to visitors'),
      S('invitation_printing', 'conditional', 'Supply', 'Invitations, the developer’s own brochures, signage and enquiry forms', { when: [some(WHEN_SIGNED[0], WHEN_BRAND[0], WHEN_LEADS[0])] }),
      S('catering_food', 'conditional', 'Host', 'Refreshments, so people stay long enough to be talked to', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'The model, the room and the evening, for the developer to use', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Make safe', 'Protective equipment, marked routes and a briefing for any site walk', { when: [some(WHEN_LIVE_SITE[0], WHEN_WALK[0])] }),
      S('passenger_transport', 'conditional', 'Carry', 'Transport to the site, and back, for anyone visiting it', { when: [some(WHEN_RIDE[0], WHEN_WALK[0])] }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, because arriving is the first impression of the project', { when: WHEN_PARK }),
      S('security_services', 'conditional', 'Control', 'Access control, and cover for the model, which is expensive', { when: [some(WHEN_GUARD[0], WHEN_MODEL[0], WHEN_BIG[0])] }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the presentation and tables for conversations', { when: [some(WHEN_SEATS[0], WHEN_STAGE[0])] }),
      S('venue', 'conditional', 'Find', 'A sales gallery or venue near enough to the site to matter', { when: WHEN_FINDING }),
    ],
    addons: [
      X('model_lighting', 'Show the model', 'The model lit from above and within, which is most of its impact', 'lighting', { trade: 'event_lighting', when: WHEN_MODEL }),
      X('site_safety_brief', 'Make it safe', 'Hard hats, vests, marked routes and the contractor’s written permission', 'map', { trade: 'safety_facilities', when: [some(WHEN_LIVE_SITE[0], WHEN_SAFETY_HELP[0])] }),
      X('enquiry_routing', 'Capture it', 'Enquiries recorded with consent and routed to the sales team same day', 'budget', { trade: 'guest_services', when: WHEN_LEADS }),
      X('developer_material', 'Their words', 'Every figure, date and approval taken from the developer’s own material', 'invite', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We write no price, payment plan, completion date, approval status or return. All of those are the developer’s and appear only in the developer’s own material.' },
    timeline: {
      before: ['All project claims taken from the developer’s own approved material', 'Model delivered, installed and lit, with cover arranged', 'Site safety agreed in writing with the contractor if there is a site walk'],
      during: ['Reveal, then time at the model and the walkthrough', 'Site walks only with equipment, routes and a briefing', 'Enquiries recorded with consent'],
      after: ['Enquiries routed to the sales team the same day', 'Model returned or installed in the gallery', 'Images delivered to the developer'],
    },
    checklist: ['Claims taken from the developer’s material only', 'Model installed, lit and covered', 'Site safety agreed with the contractor', 'Enquiry consent and routing agreed'],
  }),

  B('real-estate-exhibition', 'Compare', 'A hall of developers, and visitors walking between competing projects.', {
    about: 'The exhibitors are competing for the same visitor, which makes the floor plan political and the lead data valuable. Every claim on every stand belongs to the developer who made it.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('exhibitors', 'How many developers or stands?', 'select', { options: [['10', 'Up to 10'], ['40', 'Up to 40'], ['120', 'Up to 120'], ['300', 'More than 120']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Longer']] }),
      Q('features', 'What else is on?', 'many', { optional: true, options: [['seminars', 'Seminars'], ['finance', 'Finance and loan desks'], ['legal', 'Legal advice desks'], ['models', 'Scale models'], ['offers', 'Exhibition-only offers']] }),
      SITE_STATUS, MATERIAL, BRANDING, ENQUIRIES, STAFF, GUARD, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Construct', 'Shell scheme, stands, model plinths, seminar rooms and the aisles'),
      S('guest_services', 'recommended', 'Register', 'Registration with consent, badges and footfall counting'),
      S('invitation_printing', 'recommended', 'Direct', 'Floor plan, stand numbers, badges, the visitor guide and signage'),
      S('power_cooling', 'conditional', 'Supply', 'Power per stand, screens and cooling across a full hall', { when: [some(WHEN_SCREENS[0], WHEN_BIG[0])] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting over the models and the stands', { when: [some(WHEN_LIT[0], WHEN_MODEL[0])] }),
      S('sound_av', 'conditional', 'Present', 'Seminar sound and screens, set so they do not bleed into the aisles', { when: [some(ans('features', 'seminars'), WHEN_PA[0])] }),
      S('security_services', 'conditional', 'Secure', 'Hall security overnight, and cover for the models', { when: [some(WHEN_GUARD[0], WHEN_MODEL[0], ans('days', '2', '3', '5'))] }),
      S('catering_food', 'conditional', 'Feed', 'A café for visitors and something for exhibitors on stands', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, aisle signage and the exhibition identity', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Document', 'Stands and the floor, for exhibitors and next year’s sell', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning through the days and the clear-up', { when: [some(WHEN_CLEAN[0], ans('days', '2', '3', '5'))] }),
      S('valet_parking', 'conditional', 'Park', 'Visitor parking and a separate exhibitor loading route', { when: WHEN_PARK }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Build-up, move-in and move-out across the days', { when: [ans('days', '2', '3', '5')] }),
      S('venue', 'conditional', 'Secure', 'A hall with floor loading for models and real loading access', { when: WHEN_FINDING }),
    ],
    addons: [
      X('floor_plan', 'Place them', 'A floor plan giving every stand usable footfall, not just a slot', 'map', { trade: 'invitation_printing' }),
      X('lead_consent', 'Ask properly', 'Visitor details collected with consent, shared only with chosen stands', 'invite', { experience: true, when: WHEN_LEADS }),
      X('claims_rule', 'Their claims', 'Every figure and approval on a stand is that developer’s, stated by them', 'schedule', { experience: true }),
      X('footfall_report', 'Prove it', 'Footfall and lead counts reported to every exhibitor', 'poll', { trade: 'guest_services' }),
    ],
    toolkit: { polls: ['date'], note: 'Every price, plan, date and approval on a stand belongs to that developer. We write none of them, and visitor details go only to the stands a visitor chose.' },
    timeline: {
      before: ['Floor plan drawn so every stand gets usable footfall', 'Consent wording agreed for visitor registration', 'Exhibitor manual issued with build rules and power limits'],
      during: ['Registration capturing details with explicit consent', 'Models secured and lit, cover present', 'Leads routed only to the stands a visitor selected'],
      after: ['Footfall and lead report to every exhibitor', 'Visitor data handled only as consented', 'Hall reinstated'],
    },
    checklist: ['Floor plan with usable footfall', 'Consent wording agreed', 'Model security and lighting', 'Lead routing by visitor choice'],
  }),

  B('property-open-house', 'Walk it', 'An empty property, open for a day, with strangers walking through it.', {
    about: 'The smallest occasion here and the one most exposed: an unoccupied property, open to anyone who turns up. Visitor logging, supervision in every room and securing the property afterwards are the plan.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, SITE_STATUS, AUDIENCE,
      Q('property_kind', 'What kind of property?', 'one', { options: [['apartment', 'An apartment'], ['villa', 'A villa or house'], ['plot', 'A plot'], ['commercial', 'Commercial space'], ['multiple', 'Several units']] }),
      Q('occupied', 'Is the property occupied or furnished?', 'one', { options: [['empty', 'Empty'], ['staged', 'Staged'], ['furnished', 'Furnished'], ['lived_in', 'Someone lives there']] }),
      Q('rooms_open', 'Is every room open to visitors?', 'yesno', { optional: true }),
      MATERIAL, BRANDING, ENQUIRIES, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, PARKING, CLEAN,
    ],
    plan: [
      S('guest_services', 'recommended', 'Receive', 'A desk logging every visitor in and out, and a host in the property'),
      S('event_equipment_rental', 'conditional', 'Stage it', 'Furniture and styling, because an empty room shows badly', { when: [ans('occupied', 'empty', 'staged')] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting in rooms with poor light, which is most of them', { when: [some(WHEN_LIT[0], ans('occupied', 'empty'))] }),
      S('invitation_printing', 'conditional', 'Inform', 'Floor plans, the developer’s own detail sheet and enquiry forms', { when: [some(WHEN_SIGNED[0], WHEN_LEADS[0])] }),
      S('decoration_floral', 'conditional', 'Soften', 'Flowers and simple dressing, which change how a room reads', { when: [some(WHEN_BRAND[0], ans('occupied', 'staged', 'empty'))] }),
      S('catering_food', 'conditional', 'Offer', 'Tea or refreshments, in one room rather than throughout', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'The property, with the owner’s permission if someone lives there', { when: WHEN_SHOT }),
      S('security_services', 'conditional', 'Watch', 'Cover at the door and in the property while it is open', { when: [some(WHEN_GUARD[0], ans('occupied', 'furnished', 'lived_in'))] }),
      S('safety_facilities', 'conditional', 'Clean', 'The property cleaned before and after, and secured at the end', { when: [some(WHEN_CLEAN[0], ans('occupied', 'empty', 'staged'))] }),
      S('valet_parking', 'conditional', 'Park', 'Parking, because visitors will otherwise block the neighbours', { when: WHEN_PARK }),
      S('sound_av', 'conditional', 'Show', 'A screen for the walkthrough or the wider project', { when: [some(WHEN_SCREENS[0], WHEN_DIGITAL[0])] }),
      S('venue', 'conditional', 'Base', 'A nearby base if the property cannot hold a registration desk', { when: WHEN_FINDING }),
    ],
    addons: [
      X('visitor_log', 'Log them', 'Every visitor logged in and out, which is both security and leads', 'poll', { trade: 'guest_services' }),
      X('room_hosts', 'Watch the rooms', 'A host in every open room, not one person at the door', 'group', { trade: 'guest_services', when: [ans('rooms_open', 'yes')] }),
      X('occupier_consent', 'Ask them', 'Written consent and a valuables plan where someone lives there', 'heart', { experience: true, when: [ans('occupied', 'lived_in', 'furnished')] }),
      X('secure_after', 'Lock it', 'The property checked room by room and secured at the end', 'map', { experience: true }),
    ],
    toolkit: { polls: ['date'], note: 'We state no price, no completion date and no approval status — all of those come from the developer or the agent. Where someone lives in the property, their consent and their valuables come first.' },
    timeline: {
      before: ['Property cleaned and staged, with valuables removed if occupied', 'Visitor log and consent wording prepared', 'Hosts briefed on which rooms are open and which are not'],
      during: ['Every visitor logged in and out', 'A host in each open room, nobody wandering unaccompanied', 'Enquiries recorded with consent'],
      after: ['Property checked room by room and locked', 'Leads routed to the agent or developer the same day', 'Staging removed or left as agreed'],
    },
    checklist: ['Visitor log in and out', 'Host in every open room', 'Occupier consent and valuables plan', 'Property secured room by room after'],
  }),

  B('new-project-inauguration', 'Break ground', 'A ceremony on a site that is still a site.', {
    about: 'Half formal occasion, half construction site. The ceremony is the owner’s own decision; the hard hats, the marked route and the contractor’s permission are not optional either way.',
    formats: ['outdoor', 'venue'],
    ask: [
      VISITORS, PLACE, SITE_STATUS, AUDIENCE, SITE_SAFETY,
      Q('ceremony', 'What happens?', 'many', { options: [['groundbreaking', 'Ground-breaking'], ['ceremony_rite', 'A ceremony'], ['plaque', 'A plaque or foundation stone'], ['speeches', 'Speeches'], ['tour', 'A site tour'], ['press_meet', 'A press interaction']] }),
      Q('ceremony_kind', 'If there is a ceremony, who leads it?', 'one', {
        optional: true, when: [ans('ceremony', 'ceremony_rite')],
        options: [['find', 'Please find a practitioner'], ['own', 'We have our own'], ['none', 'No practitioner needed']],
        help: 'Entirely the owner’s choice. We never assume a ceremony, a faith or who should lead it.',
      }),
      CHIEF_GUEST, BRANDING, ENQUIRIES, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, PARKING, TRANSPORT,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Make safe', 'Hard hats, vests, marked routes, first aid and the clear-up after'),
      S('event_equipment_rental', 'recommended', 'Build', 'A platform, seating, shade and the foundation-stone setting'),
      S('tent_furniture', 'recommended', 'Shelter', 'Shade and seating — a site has neither, and guests are dressed up'),
      S('sound_av', 'conditional', 'Carry', 'A PA that works outdoors next to machinery', { when: [some(WHEN_PA[0], ans('ceremony', 'speeches', 'press_meet'))] }),
      S('priest_rituals', 'conditional', 'Lead', 'A practitioner, only because the owner asked for one', { when: [ans('ceremony_kind', 'find')] }),
      S('event_materials_supplier', 'conditional', 'Supply', 'Ceremony materials, exactly as the owner specifies them', { when: [ans('ceremony_kind', 'find', 'own')] }),
      S('decoration_floral', 'conditional', 'Dress', 'The platform, the stone and a backdrop that reads against a site', { when: WHEN_BRAND }),
      S('photography', 'recommended', 'Record', 'The turning of the turf and the stone, which is the only moment', { unless: UNLESS_PHOTO }),
      S('guest_services', 'conditional', 'Marshal', 'Hosts routing guests on and off the site, safely and in order', { when: [some(WHEN_STAFFED[0], ans('ceremony', 'tour'))] }),
      S('catering_food', 'conditional', 'Host', 'Refreshments, in a clean area away from the working site', { when: WHEN_FOOD }),
      S('power_cooling', 'conditional', 'Power', 'A generator, because a site has no usable power for a PA', { when: [some(WHEN_ONSITE[0], WHEN_PA[0])] }),
      S('passenger_transport', 'conditional', 'Carry', 'Transport onto a site a guest’s own car should not drive onto', { when: WHEN_RIDE }),
      S('invitation_printing', 'conditional', 'Mark', 'Invitations, the plaque or stone, signage and safety notices', { when: [some(WHEN_SIGNED[0], ans('ceremony', 'plaque'))] }),
      S('videography', 'conditional', 'Film', 'The ceremony filmed, for the project record and for press', { when: [some(WHEN_FILM[0], WHEN_PRESS[0])] }),
      S('security_services', 'conditional', 'Control', 'Site access controlled, with nobody wandering into the works', { when: [some(WHEN_GUARD[0], WHEN_LIVE_SITE[0])] }),
    ],
    addons: [
      X('site_safety_brief', 'Brief them', 'Hard hats, vests, a marked route and a briefing before anyone steps on', 'map', { trade: 'safety_facilities', when: [some(WHEN_LIVE_SITE[0], WHEN_SAFETY_HELP[0])] }),
      X('contractor_permission', 'Clear it', 'The contractor’s written permission to bring guests onto the site', 'schedule', { experience: true, when: WHEN_LIVE_SITE }),
      X('foundation_stone', 'Set it', 'A stone or plaque made properly, with the wording checked', 'craft', { trade: 'invitation_printing', when: [ans('ceremony', 'plaque')] }),
      X('clean_zone', 'Keep it clean', 'A surfaced, clean area for guests, separate from the working site', 'tent', { trade: 'tent_furniture', when: WHEN_ONSITE }),
    ],
    toolkit: { polls: ['date'], note: 'Whether there is a ceremony, and of what kind, is the owner’s own decision — never inferred. A live site needs the contractor’s written permission and protective equipment for every guest.' },
    timeline: {
      before: ['Contractor’s written permission obtained, and the route walked', 'Protective equipment counted for every expected guest', 'Clean guest area surfaced and shaded, away from the works'],
      during: ['Safety briefing before anyone steps onto the site', 'Ceremony or ground-breaking, short, in the clean area', 'Guests routed on and off, never unaccompanied'],
      after: ['Site handed back to the contractor', 'Plaque or stone left correctly set', 'Images delivered for the project record'],
    },
    checklist: ['Contractor permission in writing', 'Protective equipment for every guest', 'Clean guest area away from the works', 'Ceremony decided by the owner'],
  }),

  B('hotel-opening', 'Open the doors', 'A hotel on its first night, with every department running for the first time together.', {
    about: 'The building is finished; the operation is not. Front desk, kitchen, housekeeping and service have never worked a full house at once, so a soft opening before the real one is worth more than the party.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('hotel_kind', 'What kind of property?', 'one', { options: [['business', 'Business hotel'], ['luxury', 'Luxury'], ['boutique', 'Boutique'], ['resort_hotel', 'A resort'], ['budget', 'Mid-market'], ['serviced', 'Serviced apartments']] }),
      Q('soft_open', 'Has there been a soft opening?', 'yesno', { help: 'A trial run with real guests is the best preparation a hotel opening can have.' }),
      Q('day_one', 'What is on?', 'many', { options: [['ribbon', 'A ribbon or ceremony'], ['tours', 'Property tours'], ['dinner', 'A dinner'], ['press_meet', 'A press interaction'], ['entertainment', 'Entertainment'], ['stays', 'Complimentary stays']] }),
      Q('ceremony_kind', 'If there is a ceremony, who leads it?', 'one', {
        optional: true, when: [ans('day_one', 'ribbon')],
        options: [['find', 'Please find a practitioner'], ['own', 'We have our own'], ['none', 'No practitioner needed']],
      }),
      CHIEF_GUEST, DIET_ONLY, ALLERGY_ONLY, BRANDING, STAFF, AV, GUARD, TRANSPORT, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('catering_food', 'recommended', 'Serve', 'A menu cut to what the kitchen can send on its first full night'),
      S('decoration_floral', 'recommended', 'Dress', 'Lobby, entrance and public areas, which set the standard immediately'),
      S('photography', 'recommended', 'Shoot', 'Rooms, public areas and food — the images the hotel will sell with', { unless: UNLESS_PHOTO }),
      S('guest_services', 'recommended', 'Host', 'Arrivals, tours in small groups, and hosts who know every guest'),
      S('event_lighting', 'conditional', 'Light', 'Lighting for the evening and for the photographs, which differ', { when: [some(WHEN_LIT[0], WHEN_BRAND[0])] }),
      S('priest_rituals', 'conditional', 'Lead', 'A practitioner, only because the owner asked for one', { when: [ans('ceremony_kind', 'find')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a mic for the speeches, in a lobby with hard surfaces', { when: [some(WHEN_PA[0], WHEN_STAGE[0])] }),
      S('live_entertainment', 'conditional', 'Set the tone', 'Music at the level the hotel wants to be known for', { when: [some(ans('day_one', 'entertainment'), WHEN_MUSIC[0])] }),
      S('invitation_printing', 'conditional', 'Present', 'Invitations, menus with allergens, press kits and wayfinding', { when: [some(WHEN_SIGNED[0], WHEN_PRESS[0])] }),
      S('videography', 'conditional', 'Film', 'A property film, which is the asset that outlives the opening', { when: WHEN_FILM }),
      S('valet_parking', 'recommended', 'Receive', 'Valet, because the arrival is the hotel’s first impression forever'),
      S('event_equipment_rental', 'conditional', 'Add', 'The ribbon setup, a stage and extra service stations', { when: [some(ans('day_one', 'ribbon'), WHEN_STAGE[0])] }),
      S('passenger_transport', 'conditional', 'Collect', 'Airport and city transfers for travelling guests and press', { when: WHEN_RIDE }),
      S('security_services', 'conditional', 'Manage', 'Door control and crowd management at a busy opening', { when: [some(WHEN_GUARD[0], WHEN_BIG[0])] }),
    ],
    addons: [
      X('soft_opening', 'Run it first', 'A trial period with real guests before the opening night', 'bed', { experience: true, when: [ans('soft_open', 'no')] }),
      X('tour_groups', 'Walk them round', 'Property tours in small timed groups, with a host each', 'map', { trade: 'guest_services', when: [ans('day_one', 'tours')] }),
      X('press_stays', 'Let them stay', 'Complimentary stays for press and reviewers, after the opening not during', 'bed', { experience: true, when: [some(WHEN_PRESS[0], ans('day_one', 'stays'))] }),
      X('property_shoot', 'Shoot it properly', 'A full property shoot before the furniture moves, for the hotel to keep', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date'], note: 'Whether there is a ceremony, and of what kind, is the owner’s own decision. Allergens go on every menu in writing.' },
    timeline: {
      before: ['Soft opening run with real guests, and the menu cut from what it showed', 'Property shoot completed before the opening disturbs the rooms', 'Tour routes planned in small timed groups'],
      during: ['Arrivals staggered so the front desk is never overwhelmed', 'Tours in small groups, each with a host', 'Kitchen running the shortened menu'],
      after: ['Press stays offered after the opening, not during it', 'Images and film delivered to the hotel', 'Each department debriefed on what the night exposed'],
    },
    checklist: ['Soft opening completed', 'Menu cut for the first night', 'Property shot before the opening', 'Tours planned in timed groups'],
  }),

  B('resort-launch', 'Arrive', 'A property people have to travel to, which makes the journey part of the launch.', {
    about: 'Unlike a hotel in a city, guests cannot leave. Travel, transfers, the first night and the way back are all part of the event, and the first impression starts at the airport.',
    formats: ['outdoor', 'venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('nights', 'How many nights are guests staying?', 'select', { options: [['0', 'Day visit only'], ['1', 'One night'], ['2', 'Two nights'], ['3', 'Three or more']] }),
      Q('journey', 'How do guests get there?', 'many', { options: [['air', 'By air'], ['road', 'By road'], ['transfer', 'With transfers arranged'], ['own', 'Their own way']] }),
      Q('programme', 'What is in the programme?', 'many', { options: [['tours', 'Property tours'], ['dining', 'Dining experiences'], ['activities', 'Activities'], ['ceremony_r', 'A ceremony or ribbon'], ['press_r', 'A press interaction'], ['free', 'Free time']] }),
      CHIEF_GUEST, DIET_ONLY, ALLERGY_ONLY, BRANDING, STAFF, AV, SEATS, PHOTOS, FOOD, SIGNAGE, TRANSPORT,
    ],
    plan: [
      S('passenger_transport', 'recommended', 'Convey', 'Airport and road transfers, timed so nobody arrives unmet'),
      S('catering_food', 'recommended', 'Feed', 'Every meal across the stay, to every guest’s stated needs'),
      S('guest_services', 'recommended', 'Receive', 'Arrival, rooming, a host per group and a single contact throughout'),
      S('photography', 'recommended', 'Capture', 'The property and the experience, which is what the resort sells', { unless: UNLESS_PHOTO }),
      S('decoration_floral', 'conditional', 'Dress', 'Arrival, public areas and the dining settings', { when: WHEN_BRAND }),
      S('event_lighting', 'conditional', 'Light', 'Lighting for the grounds and the evening settings', { when: [some(WHEN_LIT[0], WHEN_BRAND[0])] }),
      S('live_entertainment', 'conditional', 'Programme', 'Evening programmes and activities across the stay', { when: [ans('programme', 'activities', 'dining')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a mic for the speeches and the programme', { when: [some(WHEN_PA[0], WHEN_STAGE[0])] }),
      S('videography', 'conditional', 'Film', 'A property film shot across the whole stay, not in one afternoon', { when: WHEN_FILM }),
      S('invitation_printing', 'conditional', 'Prepare', 'Invitations, itineraries, menus with allergens and room notes', { when: [some(WHEN_SIGNED[0], ans('nights', '1', '2', '3'))] }),
      S('event_equipment_rental', 'conditional', 'Set', 'Staging, outdoor setups and the ceremony or ribbon', { when: [some(ans('programme', 'ceremony_r'), WHEN_STAGE[0])] }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid on a property far from a hospital, and the route to one', { when: [ans('nights', '1', '2', '3')] }),
      S('tent_furniture', 'conditional', 'Furnish', 'Outdoor dining and lounge setups across the grounds', { when: [some(WHEN_SEATS[0], ans('programme', 'dining'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew, equipment and a programme across several days and locations', { when: [ans('nights', '2', '3')] }),
    ],
    addons: [
      X('arrival_experience', 'Start it early', 'The welcome beginning at the airport, not at the reception desk', 'bus', { trade: 'passenger_transport', when: [ans('journey', 'air', 'transfer')] }),
      X('medical_route', 'Know the way', 'The nearest hospital identified and the route timed, before guests arrive', 'map', { trade: 'safety_facilities', when: [ans('nights', '1', '2', '3')] }),
      X('free_time', 'Leave gaps', 'Genuinely unscheduled hours, so guests experience the property itself', 'schedule', { experience: true, when: [ans('programme', 'free')] }),
      X('return_transfers', 'See them off', 'Departure transfers planned before arrival, not on the last morning', 'bus', { trade: 'passenger_transport', when: WHEN_RIDE }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We make no claim about the property, its rates or its facilities beyond what the operator states. A remote property needs a medical route identified before guests arrive.' },
    timeline: {
      before: ['Transfers planned both ways before anyone travels', 'Dietary needs collected individually and confirmed to the kitchen', 'Nearest hospital identified and the route timed'],
      during: ['Guests met at the airport, not at reception', 'Programme with real free time in it', 'A single named contact available throughout'],
      after: ['Departure transfers run as planned', 'Film and images delivered across the whole stay', 'Press follow-up with assets'],
    },
    checklist: ['Transfers planned both ways', 'Dietary needs confirmed to the kitchen', 'Medical route identified', 'Free time protected in the programme'],
  }),

  B('hospitality-awards-night', 'Recognise', 'An industry judging itself, in front of itself.', {
    about: 'Everyone in the room is a professional host, which raises the standard of everything: the service, the food and the timing will all be noticed. The judging has to be defensible to the people it judges.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('categories', 'How many categories?', 'select', { options: [['10', 'Up to 10'], ['25', 'Up to 25'], ['50', 'Up to 50'], ['90', 'More than 50']] }),
      Q('judging', 'How are winners chosen?', 'one', { options: [['panel', 'A judging panel'], ['audit', 'Audited data'], ['vote', 'An industry vote'], ['mystery', 'Mystery visits'], ['mixed', 'A mix']] }),
      Q('shortlist', 'Is a shortlist published in advance?', 'yesno', { optional: true }),
      CHIEF_GUEST, AWARDS, DRESS_CODE, DIET_ONLY, ALLERGY_ONLY, BRANDING, STAFF, AV, SEATS, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('catering_food', 'recommended', 'Serve', 'A dinner judged by three hundred people who serve dinners for a living'),
      S('anchor_mc', 'recommended', 'Host', 'A host who knows the industry and can read fifty names correctly'),
      S('sound_av', 'recommended', 'Run', 'Mics, a nomination screen and cues that land on the right name'),
      S('event_lighting', 'recommended', 'Light', 'Stage lighting built for the handover and for the camera'),
      S('decoration_floral', 'recommended', 'Set', 'A room that stands up to an audience of professional hosts'),
      S('gifts_favours', 'conditional', 'Award', 'Trophies, engraved, checked and sorted in calling order', { when: WHEN_TROPHY }),
      S('guest_services', 'recommended', 'Seat', 'Table plan, check-in and service that will itself be reviewed'),
      S('invitation_printing', 'conditional', 'Publish', 'Invitations, the shortlist, table plan, citations and certificates', { when: [some(WHEN_PRINTED[0], ans('shortlist', 'yes'), WHEN_SIGNED[0])] }),
      S('photography', 'conditional', 'Capture', 'Every handover, plus a portrait of each winning team', { when: WHEN_SHOT }),
      S('videography', 'conditional', 'Film', 'The night filmed, with winners cut for the trade press', { when: WHEN_FILM }),
      S('event_equipment_rental', 'conditional', 'Build', 'Stage, podium, screen, a press wall and the route up and down', { when: WHEN_STAGE }),
      S('tent_furniture', 'conditional', 'Furnish', 'Round tables and a foyer for the arrivals', { when: WHEN_SEATS }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, for a room that will notice if arriving is badly handled', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'A venue that can serve this many covers to this standard', { when: WHEN_FINDING }),
    ],
    addons: [
      X('judging_published', 'Show the working', 'The method, the panel and the criteria published before entries close', 'poll', { experience: true }),
      X('winner_portraits', 'Portrait', 'A portrait of every winning team, taken and printed on the night', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
      X('service_standard', 'Match the room', 'Service briefed to a standard the audience would be happy to serve', 'chef', { trade: 'guest_services' }),
      X('runtime_budget', 'Time it', 'Ninety seconds per award, and the order built to that number', 'schedule', { experience: true }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'Publish the judging method and the panel before entries close. This audience will notice both the criteria and the service.' },
    timeline: {
      before: ['Judging method, panel and criteria published before entries', 'Menu and service briefed to a standard this audience will judge', 'Trophies engraved and names checked with each business'],
      during: ['Arrivals and seating by table plan', 'Awards in blocks, portraits as winners come off', 'Service held to standard all night, not just at the start'],
      after: ['Absent winners’ trophies delivered', 'Winner assets sent to the trade press', 'Venue and caterer debriefed'],
    },
    checklist: ['Judging method published', 'Menu and service briefed to standard', 'Trophies engraved and checked', 'Runtime budgeted per award'],
  }),

  B('luxury-property-showcase', 'Discreet', 'A single property, a handful of people, and absolute discretion.', {
    about: 'By appointment, by name, and with nothing published. The property, the owner and the viewers are all private, and the plan protects that before it does anything else.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, SITE_STATUS, AUDIENCE,
      Q('property_kind', 'What is being shown?', 'one', { options: [['villa_lux', 'A villa or estate'], ['penthouse', 'A penthouse'], ['heritage', 'A heritage property'], ['land', 'Land'], ['portfolio', 'A portfolio']] }),
      Q('appointments', 'Is it strictly by appointment?', 'yesno'),
      Q('discretion', 'Is the property or the owner confidential?', 'yesno', {
        help: 'If so, nothing is published, no address goes on an invitation, and the guest list stays closed.',
      }),
      MATERIAL, BRANDING, ENQUIRIES, STAFF, GUARD, AV, CLEAN, SEATS, PHOTOS, FOOD, SIGNAGE, PARKING, TRANSPORT,
    ],
    plan: [
      S('guest_services', 'recommended', 'Attend', 'One host per viewing, briefed on the property and on the viewer'),
      S('event_lighting', 'recommended', 'Light', 'Lighting that shows the property as it is meant to be seen'),
      S('decoration_floral', 'recommended', 'Prepare', 'The property dressed so it reads as a home rather than a listing'),
      S('security_services', 'conditional', 'Protect', 'Discreet cover, controlled access, and nothing published', { when: [some(WHEN_GUARD[0], ans('discretion', 'yes'))] }),
      S('catering_food', 'conditional', 'Offer', 'Something considered, served quietly during the viewing', { when: WHEN_FOOD }),
      S('photography', 'conditional', 'Record', 'Only with the owner’s written permission, and only what is agreed', { when: WHEN_SHOT }),
      S('passenger_transport', 'conditional', 'Convey', 'Cars for viewers, arranged rather than offered', { when: WHEN_RIDE }),
      S('valet_parking', 'conditional', 'Receive', 'Valet or a managed arrival, so nothing is parked on the street', { when: WHEN_PARK }),
      S('invitation_printing', 'conditional', 'Present', 'A discreet brochure with the agent’s own detail, and no address', { when: [some(WHEN_SIGNED[0], WHEN_LEADS[0])] }),
      S('sound_av', 'conditional', 'Show', 'A screen for plans or a walkthrough, set up out of the way', { when: [some(WHEN_SCREENS[0], WHEN_DIGITAL[0])] }),
      S('safety_facilities', 'conditional', 'Restore', 'The property cleaned and restored exactly as it was found', { when: WHEN_CLEAN }),
      S('tent_furniture', 'conditional', 'Settle', 'Somewhere to sit and talk, which is where a viewing turns serious', { when: WHEN_SEATS }),
    ],
    addons: [
      X('appointment_spacing', 'One at a time', 'Viewings spaced so no two parties ever meet', 'schedule', { trade: 'guest_services', when: [ans('appointments', 'yes')] }),
      X('owner_consent', 'Ask the owner', 'Written agreement on what may be photographed, said or published', 'heart', { experience: true }),
      X('no_address', 'Keep it quiet', 'No address on any invitation or material; given only on confirmation', 'invite', { experience: true, when: [ans('discretion', 'yes')] }),
      X('valuables_plan', 'Secure it', 'Valuables and personal items removed or locked before any viewing', 'map', { experience: true }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'Nothing about this property, its owner or its viewers is published. We state no price or valuation; those are the agent’s. Photography happens only with the owner’s written agreement.' },
    timeline: {
      before: ['Owner’s written agreement on photography, publication and access', 'Valuables and personal items removed or locked', 'Viewings spaced so no two parties overlap'],
      during: ['One host per viewing, nobody unaccompanied in the property', 'No address shared beyond confirmed viewers', 'Nothing photographed beyond what was agreed'],
      after: ['Property restored exactly as found and secured', 'Nothing published about the property or who viewed it', 'Enquiries passed only to the agent'],
    },
    checklist: ['Owner agreement in writing', 'Valuables removed or locked', 'Viewings spaced apart', 'No address on any material'],
  }),

  B('home-interior-reveal', 'Unveil it', 'A client seeing their own finished home for the first time.', {
    about: 'A private moment, usually filmed. The handover is the event: the house has to be finished, cleaned and styled, and the client should walk in to something complete rather than nearly complete.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, SITE_STATUS,
      Q('for_whom', 'Who is the reveal for?', 'one', { options: [['owner', 'The owner'], ['family', 'The family'], ['press_rev', 'Press and portfolio'], ['both', 'Owner and press, separately'], ['studio', 'A studio portfolio shoot']] }),
      Q('finished', 'Is the work genuinely finished?', 'one', {
        options: [['yes', 'Yes, complete'], ['snagging', 'Snagging remains'], ['partial', 'Partly complete']],
        help: 'A reveal of an unfinished house is the one thing that cannot be recovered. Better to move the date.',
      }),
      Q('elements', 'What is part of the reveal?', 'many', { optional: true, options: [['walkthrough_rev', 'A room-by-room walkthrough'], ['styling', 'Full styling'], ['gift', 'A handover gift'], ['film', 'A film of the reveal'], ['dinner_rev', 'A first meal in the house']] }),
      BRANDING, ENQUIRIES, STAFF, AV, PHOTOS, FOOD, SIGNAGE, CLEAN,
    ],
    plan: [
      S('safety_facilities', 'recommended', 'Finish it', 'A deep clean after the trades and before the client sees anything'),
      S('decoration_floral', 'recommended', 'Style', 'Full styling, room by room — a bare finished house reads unfinished'),
      S('event_lighting', 'conditional', 'Light', 'Lighting set and tested room by room, at the hour of the reveal', { when: [some(WHEN_LIT[0], WHEN_SHOT[0])] }),
      S('photography', 'recommended', 'Record', 'The house and the moment, which the studio and the family both want', { unless: UNLESS_PHOTO }),
      S('videography', 'conditional', 'Film', 'The reveal filmed, which is the asset the studio will use for years', { when: [some(WHEN_FILM[0], ans('elements', 'film'))] }),
      S('event_equipment_rental', 'conditional', 'Furnish', 'Styling props and any furniture not yet delivered', { when: [ans('elements', 'styling')] }),
      S('catering_food', 'conditional', 'Mark it', 'A first meal in the house, which is a better handover than a speech', { when: [some(ans('elements', 'dinner_rev'), WHEN_FOOD[0])] }),
      S('gifts_favours', 'conditional', 'Hand it over', 'A handover gift, with the keys and the manuals presented properly', { when: [ans('elements', 'gift')] }),
      S('guest_services', 'conditional', 'Guide', 'A host to walk the family through room by room, unhurried', { when: [some(WHEN_GUIDES[0], ans('elements', 'walkthrough_rev'))] }),
      S('invitation_printing', 'conditional', 'Document', 'A handover folder: finishes, suppliers, care notes and warranties', { when: WHEN_SIGNED }),
      S('sound_av', 'conditional', 'Set', 'Music in the house, low, for the first walkthrough', { when: [some(WHEN_MUSIC[0], WHEN_AV[0])] }),
      S('venue', 'conditional', 'Base', 'Somewhere nearby to gather before the reveal itself', { when: WHEN_FINDING }),
    ],
    addons: [
      X('snagging_first', 'Finish first', 'Snagging closed before the date, or the date moved', 'schedule', { experience: true, when: [ans('finished', 'snagging', 'partial')] }),
      X('room_by_room', 'Walk it slowly', 'A room-by-room walkthrough, unhurried, with the designer present', 'map', { experience: true, when: [ans('elements', 'walkthrough_rev')] }),
      X('handover_folder', 'Hand it over', 'Finishes, suppliers, care notes and warranties in one folder', 'album', { trade: 'invitation_printing' }),
      X('press_separately', 'Split them', 'Press and portfolio shoot on a different day from the family’s reveal', 'camera', { experience: true, when: [ans('for_whom', 'both', 'press_rev')] }),
    ],
    toolkit: { chat: 'organiser', polls: false, note: 'The home and the images belong to the client. Nothing is photographed or published without their written agreement, and the family’s reveal comes before any press.' },
    timeline: {
      before: ['Snagging closed, or the date moved rather than revealing unfinished work', 'Deep clean after every trade has left', 'Styling complete and lighting set at the hour of the reveal'],
      during: ['The family first, press and portfolio separately', 'Room by room, unhurried, with the designer present', 'Handover folder given, not emailed later'],
      after: ['Images released only as the client agreed', 'Styling props removed or gifted as arranged', 'Snagging follow-up scheduled'],
    },
    checklist: ['Snagging closed before the date', 'Deep clean after the trades', 'Styling complete room by room', 'Handover folder prepared'],
  }),

  B('architecture-exhibition', 'Draw it out', 'Drawings, models and photographs of buildings that cannot be brought indoors.', {
    about: 'The subject is absent by definition, so the representation is everything: models lit properly, drawings hung at reading height, and text that explains without lecturing.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('exhibits', 'What is being shown?', 'many', { options: [['models_arch', 'Models'], ['drawings_arch', 'Drawings'], ['photographs', 'Photographs'], ['film_arch', 'Film'], ['materials_arch', 'Materials'], ['vr_arch', 'Virtual walkthroughs']] }),
      Q('practices', 'How many practices or projects?', 'select', { options: [['3', 'Up to 3'], ['12', 'Up to 12'], ['40', 'Up to 40'], ['100', 'More than 40']] }),
      Q('days', 'How long is it open?', 'select', { options: [['1', 'One day'], ['7', 'A week'], ['30', 'A month'], ['90', 'Longer']] }),
      Q('talks_arch', 'Is there a talks programme?', 'yesno', { optional: true }),
      BRANDING, ENQUIRIES, STAFF, GUARD, AV, PHOTOS, FOOD, SIGNAGE, SEATS, CLEAN,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Mount', 'Model plinths, drawing panels, cases and hanging at reading height'),
      S('event_lighting', 'recommended', 'Light', 'Light on models from above and across, which is how they read'),
      S('invitation_printing', 'recommended', 'Explain', 'Panel text, project credits, a catalogue and exhibition signage'),
      S('sound_av', 'conditional', 'Project', 'Screens for film and walkthroughs, and sound for the talks', { when: [some(ans('exhibits', 'film_arch', 'vr_arch'), ans('talks_arch', 'yes'), WHEN_SCREENS[0])] }),
      S('guest_services', 'recommended', 'Invigilate', 'Someone in the room the whole time it is open, which models need'),
      S('security_services', 'conditional', 'Watch', 'Cover for models, including overnight across a long run', { when: [some(WHEN_GUARD[0], ans('exhibits', 'models_arch'), ans('days', '30', '90'))] }),
      S('photography', 'conditional', 'Document', 'The exhibition and each model, for the practices to reuse', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating for the talks and in the galleries', { when: [some(WHEN_SEATS[0], ans('talks_arch', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Set', 'An entrance and a thread connecting the projects', { when: WHEN_BRAND }),
      S('catering_food', 'conditional', 'Open it', 'Refreshments at the opening, away from the models', { when: WHEN_FOOD }),
      S('safety_facilities', 'conditional', 'Service', 'Cleaning through the run and the de-install afterwards', { when: [some(WHEN_CLEAN[0], ans('days', '7', '30', '90'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Handle', 'Models transported, crated and condition-checked in and out', { when: [ans('exhibits', 'models_arch')] }),
      S('power_cooling', 'conditional', 'Power', 'Power for screens and walkthroughs running all day, every day', { when: [some(ans('exhibits', 'film_arch', 'vr_arch'), WHEN_SCREENS[0])] }),
      S('venue', 'conditional', 'Find', 'A space with wall, controllable light and floor for plinths', { when: WHEN_FINDING }),
    ],
    addons: [
      X('model_crating', 'Move it safely', 'Models crated, transported and condition-checked in and out', 'move', { trade: 'end_to_end_event_logistics', when: [ans('exhibits', 'models_arch')] }),
      X('reading_height', 'Hang it right', 'Drawings hung at reading height, not gallery height', 'map', { experience: true, when: [ans('exhibits', 'drawings_arch')] }),
      X('project_credits', 'Credit everyone', 'Architect, client, engineer and photographer named on every panel', 'invite', { trade: 'invitation_printing' }),
      X('talks_programme', 'Say more', 'A talks programme with the architects, published with the exhibition', 'group', { trade: 'sound_av', when: [ans('talks_arch', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'Drawings, models and photographs are owned by the practices and photographers who made them. Credits and reproduction rights are agreed in writing before anything is hung.' },
    timeline: {
      before: ['Credits agreed with every practice, including photographers', 'Models crated and condition-checked on arrival', 'Drawings hung at reading height and models lit'],
      during: ['Invigilation whenever the galleries are open', 'Lighting rechecked through the run', 'Talks run to the published programme'],
      after: ['Models crated and returned, condition checked against arrival', 'Documentation given to the practices', 'Space made good'],
    },
    checklist: ['Credits agreed in writing', 'Models crated and condition-checked', 'Drawings at reading height', 'Model lighting set'],
  }),

  B('smart-home-showcase', 'Make it work', 'Technology demonstrated live, which means the network cannot drop.', {
    about: 'Everything on display depends on a connection. A demonstration that fails once is remembered, so the network, the power and a rehearsed reset are the entire technical plan.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, SITE_STATUS, AUDIENCE,
      Q('systems', 'What is being demonstrated?', 'many', { options: [['lighting_sys', 'Lighting control'], ['security_sys', 'Security and access'], ['climate', 'Climate'], ['entertainment_sys', 'Entertainment'], ['voice', 'Voice and automation'], ['energy', 'Energy management']] }),
      Q('network_need', 'What does the demonstration need?', 'many', { options: [['wifi', 'Reliable wifi'], ['wired', 'Wired network'], ['power_sys', 'Dedicated power'], ['internet', 'Internet uplink'], ['offline', 'It works offline']] }),
      Q('hands_on_sys', 'Do visitors try it themselves?', 'yesno'),
      Q('privacy', 'Does anything capture visitor data or images?', 'yesno', {
        help: 'Cameras, voice assistants and sensors in a demonstration are still collecting. Visitors are told, in writing, at the door.',
      }),
      MATERIAL, BRANDING, ENQUIRIES, STAFF, AV, GUARD, PHOTOS, FOOD, SIGNAGE, SEATS,
    ],
    plan: [
      S('power_cooling', 'recommended', 'Supply', 'Dedicated power and a network that will not drop mid-demonstration'),
      S('event_equipment_rental', 'recommended', 'Build', 'Demonstration rooms or zones, with a reset position out of sight'),
      S('sound_av', 'recommended', 'Show', 'Screens and audio for the systems, and a camera on the small gestures'),
      S('event_lighting', 'conditional', 'Demonstrate', 'Lighting that is itself part of the demonstration, and working light', { when: [some(ans('systems', 'lighting_sys'), WHEN_LIT[0])] }),
      S('guest_services', 'conditional', 'Demonstrate', 'Demonstrators who can run it repeatedly and recover when it fails', { when: [some(WHEN_STAFFED[0], ans('hands_on_sys', 'yes'))] }),
      S('invitation_printing', 'recommended', 'Disclose', 'Zone signage, system notes, enquiry forms and the data notice'),
      S('decoration_floral', 'conditional', 'Set', 'Room sets, so the technology reads as a home rather than a stand', { when: [some(WHEN_BRAND[0], WHEN_SHOWUNIT[0])] }),
      S('photography', 'conditional', 'Record', 'The spaces and the systems working, for the brand to reuse', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seating in the demonstration zones, since people stay to watch', { when: WHEN_SEATS }),
      S('catering_food', 'conditional', 'Refresh', 'Refreshments away from the equipment', { when: WHEN_FOOD }),
      S('security_services', 'conditional', 'Watch', 'Cover for equipment that is small, valuable and portable', { when: WHEN_GUARD }),
      S('venue', 'conditional', 'Find', 'A space with the power and the connection the systems actually need', { when: WHEN_FINDING }),
    ],
    addons: [
      X('network_test', 'Load-test it', 'The network tested with every device live and a hall full of phones', 'power_cooling', { trade: 'power_cooling', when: [ans('network_need', 'wifi', 'wired', 'internet')] }),
      X('offline_fallback', 'Plan for the drop', 'A demonstration path that still works if the connection fails', 'schedule', { experience: true }),
      X('data_notice', 'Tell them', 'A written notice at the door about any camera, sensor or voice capture', 'invite', { trade: 'invitation_printing', when: [ans('privacy', 'yes')] }),
      X('reset_routine', 'Run it again', 'A written reset between demonstrations, timed and rehearsed', 'poll', { experience: true, when: [ans('hands_on_sys', 'yes')] }),
    ],
    toolkit: { polls: ['date'], note: 'If anything on display captures images, voice or presence, visitors are told in writing at the door and nothing captured is kept. We make no claim about what any system does.' },
    timeline: {
      before: ['Network and power load-tested with every device live', 'An offline fallback path rehearsed for each demonstration', 'Data notice written for any capture device on display'],
      during: ['Data notice visible at the door, not buried in a brochure', 'Reset between demonstrations, out of sight', 'Fallback used immediately rather than troubleshooting in front of people'],
      after: ['Any captured data deleted, and visitors told it has been', 'Equipment reconciled', 'Enquiries routed with consent'],
    },
    checklist: ['Network load-tested with every device', 'Offline fallback rehearsed', 'Data notice at the door', 'Reset routine written'],
  }),

  B('hotel-anniversary', 'Mark the years', 'A hotel celebrating with the guests and staff who made it one.', {
    about: 'The long-serving staff and the regular guests are the story. A hotel that marks its anniversary by thanking its own people reads very differently from one that throws a party.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('years', 'How many years?', 'select', { options: [['5', 'Five'], ['10', 'Ten'], ['25', 'Twenty-five'], ['50', 'Fifty or more']] }),
      Q('elements', 'What is planned?', 'many', { options: [['staff_rec', 'Recognising long-serving staff'], ['regulars_hotel', 'Inviting regular guests'], ['history_hotel', 'A history display'], ['dinner_hotel', 'A dinner'], ['offers_hotel', 'An anniversary offer'], ['press_hotel', 'Press']] }),
      Q('history_have', 'What do you have from the history?', 'many', { optional: true, options: [['photos_hist', 'Old photographs'], ['registers', 'Old registers or menus'], ['staff_long', 'Long-serving staff'], ['founders_hotel', 'Founders or family'], ['guests_long', 'Guests who have come for years']] }),
      CHIEF_GUEST, DIET_ONLY, ALLERGY_ONLY, BRANDING, STAFF, AV, PHOTOS, FOOD, SIGNAGE, PARKING,
    ],
    plan: [
      S('catering_food', 'recommended', 'Serve', 'A menu that says something about the years, not a standard banquet'),
      S('decoration_floral', 'recommended', 'Tell it', 'A history display through the public areas, not one board in a corner'),
      S('photography', 'recommended', 'Record', 'The night, and portraits of the staff who have been here longest', { unless: UNLESS_PHOTO }),
      S('gifts_favours', 'conditional', 'Thank', 'Long-service recognition for staff, researched so nobody is missed', { when: [ans('elements', 'staff_rec')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound and a screen for the film and the speeches', { when: [some(WHEN_PA[0], WHEN_SCREENS[0])] }),
      S('videography', 'conditional', 'Chronicle', 'A film of the hotel’s years, which outlives the evening', { when: WHEN_FILM }),
      S('live_entertainment', 'conditional', 'Soften', 'Music at a level people can talk across', { when: [some(WHEN_MUSIC[0], ans('elements', 'dinner_hotel'))] }),
      S('invitation_printing', 'conditional', 'Publish', 'Invitations, the history panels, menus with allergens and signage', { when: [some(WHEN_SIGNED[0], ans('elements', 'history_hotel'))] }),
      S('guest_services', 'conditional', 'Welcome', 'Hosts who know which guests have been coming for twenty years', { when: [some(WHEN_DESK[0], ans('elements', 'regulars_hotel'))] }),
      S('event_lighting', 'conditional', 'Light', 'Lighting for the evening and for the display', { when: [some(WHEN_LIT[0], WHEN_BRAND[0])] }),
      S('event_equipment_rental', 'conditional', 'Build', 'A stage, screen and the structures the history is mounted on', { when: WHEN_STAGE }),
      S('valet_parking', 'conditional', 'Receive', 'Valet, which a hotel of all places should get right', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Extend', 'Additional space if more are invited than the ballroom holds', { when: WHEN_FINDING }),
    ],
    addons: [
      X('long_service', 'Name them', 'Long-serving staff researched properly, named and thanked publicly', 'gift', { trade: 'gifts_favours', when: [ans('elements', 'staff_rec')] }),
      X('history_display', 'Show the years', 'Old photographs, registers and menus displayed through the public areas', 'album', { trade: 'decoration_floral', when: [ans('history_have', 'photos_hist', 'registers')] }),
      X('regular_guests', 'Invite them', 'Long-standing guests traced and invited personally', 'phone', { experience: true, when: [ans('history_have', 'guests_long')] }),
      X('staff_portraits', 'Portrait', 'A portrait of every long-serving member of staff, printed and hung', 'camera', { trade: 'photography', unless: UNLESS_PHOTO }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'The long-serving staff are the story. A hotel anniversary that thanks only its guests has missed the people who made it.' },
    timeline: {
      before: ['Long-serving staff identified from records, not from memory', 'History collected — photographs, registers, menus — months ahead', 'Regular guests traced and invited personally'],
      during: ['Staff named and thanked in front of the room', 'History display open from arrival', 'Portraits of the people who have been here longest'],
      after: ['Portraits printed and hung in the hotel', 'History archived properly', 'Guests and staff thanked individually'],
    },
    checklist: ['Long-serving staff identified from records', 'History collected and displayed', 'Regular guests invited personally', 'Staff portraits planned'],
  }),

  B('travel-trade-meet', 'Deal', 'Agents, operators and properties, in a day of scheduled fifteen-minute meetings.', {
    about: 'A speed-meeting format where the schedule is the product. Buyers and sellers matched in advance, tables numbered, a bell on the clock — the hospitality is incidental.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('format_meet', 'What is the format?', 'one', { options: [['speed', 'Pre-scheduled table meetings'], ['open', 'Open networking'], ['presentations', 'Property presentations'], ['mixed_meet', 'A mix'], ['workshop_meet', 'A workshop format']] }),
      Q('tables', 'How many meeting tables?', 'select', { options: [['10', 'Up to 10'], ['40', 'Up to 40'], ['100', 'Up to 100'], ['250', 'More than 100']] }),
      Q('matching', 'Are meetings matched in advance?', 'one', {
        options: [['yes', 'Yes, pre-scheduled'], ['partly', 'Partly'], ['no', 'On the day']],
        help: 'Pre-matched meetings are what delegates pay for. Without them this is an expensive coffee morning.',
      }),
      Q('travel_in', 'Are delegates travelling in?', 'yesno', { optional: true }),
      BRANDING, ENQUIRIES, STAFF, AV, TRANSPORT, PHOTOS, FOOD, SIGNAGE, SEATS, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Lay out', 'Numbered meeting tables, chairs and a clear circulation route'),
      S('guest_services', 'recommended', 'Schedule', 'Registration, the meeting schedule, table allocation and a help desk'),
      S('invitation_printing', 'recommended', 'Publish', 'Schedules per delegate, table numbers, badges and the directory'),
      S('sound_av', 'conditional', 'Call time', 'A PA and a bell to move every table at the same moment', { when: [some(ans('format_meet', 'speed', 'mixed_meet'), WHEN_PA[0])] }),
      S('catering_food', 'conditional', 'Sustain', 'Lunch and breaks that run to the schedule rather than break it', { when: WHEN_FOOD }),
      S('tent_furniture', 'conditional', 'Seat', 'Meeting seating and a lounge for delegates between sessions', { when: WHEN_SEATS }),
      S('passenger_transport', 'conditional', 'Collect', 'Airport and hotel transfers for delegates travelling in', { when: [some(WHEN_RIDE[0], ans('travel_in', 'yes'))] }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, table branding and sponsor presence', { when: WHEN_BRAND }),
      S('photography', 'conditional', 'Record', 'The floor working, for the organiser and the next edition', { when: WHEN_SHOT }),
      S('power_cooling', 'conditional', 'Supply', 'Power at the tables, and cooling for a full hall of meetings', { when: [some(WHEN_BIG[0], ans('tables', '100', '250'))] }),
      S('valet_parking', 'conditional', 'Park', 'Parking for delegates arriving across the morning', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Find', 'A hall that takes the table count with room to walk between', { when: WHEN_FINDING }),
    ],
    addons: [
      X('matching_system', 'Match them', 'Meetings matched in advance and published before anyone travels', 'poll', { trade: 'guest_services', when: [ans('matching', 'partly', 'no')] }),
      X('bell_discipline', 'Keep time', 'One bell, every table moving at once, held to all day', 'schedule', { experience: true, when: [ans('format_meet', 'speed', 'mixed_meet')] }),
      X('delegate_directory', 'List them', 'A directory of every delegate with what they are buying or selling', 'album', { trade: 'invitation_printing' }),
      X('quiet_lounge', 'Let them breathe', 'A lounge away from the floor, which a day of meetings needs', 'bed', { trade: 'tent_furniture' }),
    ],
    toolkit: { polls: ['date'], note: 'Pre-matched meetings are what delegates paid for. Protect the schedule before anything on the programme.' },
    timeline: {
      before: ['Meetings matched and schedules published before anyone travels', 'Tables numbered and the layout drawn with walking room', 'Travel and hotels coordinated against the delegate list'],
      during: ['One bell, every table moving at the same moment', 'Help desk resolving no-shows and re-matching live', 'Breaks held to length so the schedule holds'],
      after: ['Meeting outcomes and contacts shared, with consent', 'Delegate feedback on match quality', 'Hall reinstated'],
    },
    checklist: ['Meetings matched in advance', 'Tables numbered and laid out', 'Bell discipline agreed', 'Travel coordinated to the list'],
  }),

  B('tourism-expo', 'Promote', 'Destinations, boards and operators selling places people have not been.', {
    about: 'Nations and states exhibit beside small operators, which makes protocol as real a requirement as power. Cultural presentation belongs to the people being presented, never to the organiser.',
    formats: ['venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('exhibitors_tour', 'How many exhibitors?', 'select', { options: [['20', 'Up to 20'], ['80', 'Up to 80'], ['250', 'Up to 250'], ['600', 'More than 250']] }),
      Q('days', 'How many days?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Longer']] }),
      Q('participants', 'Who is exhibiting?', 'many', { options: [['boards', 'Tourism boards'], ['operators', 'Tour operators'], ['hotels_exh', 'Hotels and resorts'], ['airlines', 'Airlines'], ['states', 'State pavilions'], ['crafts_exh', 'Craft and culture']] }),
      Q('cultural', 'Are there cultural performances?', 'yesno', {
        help: 'What is performed, and by whom, is decided by the community it belongs to. We arrange the stage, never the content.',
      }),
      BRANDING, ENQUIRIES, STAFF, GUARD, AV, CLEAN, PHOTOS, FOOD, SIGNAGE, SEATS, PARKING,
    ],
    plan: [
      S('event_equipment_rental', 'recommended', 'Construct', 'Shell scheme, pavilions, the stage, seminar rooms and the aisles'),
      S('guest_services', 'recommended', 'Receive', 'Trade and visitor registration, badges, and delegation protocol'),
      S('invitation_printing', 'recommended', 'Direct', 'Floor plan, pavilion signage, badges, the directory and the programme'),
      S('power_cooling', 'recommended', 'Supply', 'Power per stand and cooling across a hall full of screens'),
      S('sound_av', 'conditional', 'Stage', 'Stage sound and screens, set so pavilions do not fight each other', { when: [some(ans('cultural', 'yes'), WHEN_SCREENS[0], WHEN_STAGE[0])] }),
      S('live_entertainment', 'conditional', 'Present', 'Performances arranged with the communities whose forms they are', { when: [ans('cultural', 'yes')] }),
      S('catering_food', 'conditional', 'Feed', 'A food court, and regional food where states are exhibiting', { when: WHEN_FOOD }),
      S('decoration_floral', 'conditional', 'Brand', 'Entrance, aisle signage and the expo identity across the hall', { when: WHEN_BRAND }),
      S('security_services', 'conditional', 'Secure', 'Hall security, badge-checked entry and cover for official delegations', { when: [some(WHEN_GUARD[0], ans('participants', 'boards', 'states'), ans('days', '2', '3', '5'))] }),
      S('photography', 'conditional', 'Document', 'Pavilions, performances and the floor, with performers’ agreement', { when: WHEN_SHOT }),
      S('tent_furniture', 'conditional', 'Seat', 'Seminar seating, meeting tables and seating across the hall', { when: WHEN_SEATS }),
      S('safety_facilities', 'conditional', 'Service', 'Washrooms, cleaning across the days and the clear-up', { when: [some(WHEN_CLEAN[0], ans('days', '2', '3', '5'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Move', 'Build-up, move-in and move-out across several days and pavilions', { when: [ans('days', '2', '3', '5')] }),
      S('valet_parking', 'conditional', 'Park', 'Visitor parking and a separate route for official arrivals', { when: WHEN_PARK }),
      S('venue', 'conditional', 'Secure', 'A hall with the area, the power and the loading for pavilions', { when: WHEN_FINDING }),
    ],
    addons: [
      X('community_consent', 'Ask them', 'Performances arranged with the communities whose forms they are', 'heart', { experience: true, when: [ans('cultural', 'yes')] }),
      X('protocol_plan', 'Receive properly', 'A protocol plan for official delegations: arrival, seating, escorts', 'group', { trade: 'guest_services', when: [ans('participants', 'boards', 'states')] }),
      X('exhibitor_manual', 'Instruct', 'Move-in slots, build rules, power limits and deadlines, in advance', 'invite', { trade: 'invitation_printing' }),
      X('b2b_meetings', 'Match them', 'Scheduled buyer-seller meetings, which is why the trade comes', 'schedule', { experience: true, when: WHEN_LEADS }),
    ],
    toolkit: { polls: ['date'], note: 'Cultural performances belong to the communities whose forms they are. They decide what is presented and how; we arrange the stage and never the content.' },
    timeline: {
      before: ['Exhibitor manual issued with build rules, power limits and move-in slots', 'Protocol plan agreed for any official delegation', 'Performances arranged directly with the communities concerned'],
      during: ['Registration handling trade and public separately', 'Performances to the programme, filmed only as agreed', 'Cleaning and washrooms serviced across the days'],
      after: ['Move-out to slots', 'Footfall and meeting report to every exhibitor', 'Recordings given to the performing communities'],
    },
    checklist: ['Exhibitor manual issued', 'Protocol plan for delegations', 'Performances arranged with communities', 'Power sized per pavilion'],
  }),

  B('holiday-resort-celebration', 'Escape', 'A celebration held somewhere people have travelled to, over several days.', {
    about: 'Guests are away from home, which makes the plan a hospitality operation as much as an event: arrivals, rooms, meals, activities, the weather, and getting everybody home again.',
    formats: ['outdoor', 'venue'],
    ask: [
      VISITORS, PLACE, AUDIENCE,
      Q('occasion_for', 'What is being celebrated?', 'one', { options: [['new_year', 'New Year'], ['festival_res', 'A festival'], ['milestone_res', 'A milestone'], ['season', 'A season opening'], ['guest_event', 'A guest event'], ['other_res', 'Something else']] }),
      Q('nights', 'How many nights?', 'select', { options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Longer']] }),
      THEME('Is there a theme?', [['none', 'No theme'], ['local', 'Local culture'], ['tropical', 'Tropical'], ['formal_res', 'Black tie'], ['retro_res', 'Retro'], ['other_theme', 'Something else']]),
      Q('programme_res', 'What is in the programme?', 'many', { options: [['gala', 'A gala dinner'], ['music_res', 'Live music'], ['activities_res', 'Activities'], ['kids_res', 'A children’s programme'], ['wellness_res', 'Wellness'], ['fireworks_no', 'No fireworks — we do not arrange them']] }),
      DIET_ONLY, ALLERGY_ONLY, BRANDING, STAFF, AV, PHOTOS, FOOD, SIGNAGE, TRANSPORT, SEATS,
    ],
    plan: [
      S('catering_food', 'recommended', 'Feed', 'Every meal across every night, to each guest’s stated needs'),
      S('decoration_floral', 'recommended', 'Transform', 'Arrival, dining and the grounds, dressed for the theme'),
      S('event_lighting', 'recommended', 'Light', 'The grounds and the dining settings, which is most of the atmosphere'),
      S('live_entertainment', 'conditional', 'Programme', 'Music and activities across the nights, not just the gala', { when: [ans('programme_res', 'music_res', 'activities_res', 'gala')] }),
      S('sound_av', 'conditional', 'Carry', 'Sound outdoors, which a resort’s own system will not do', { when: [some(WHEN_PA[0], WHEN_MUSIC[0], ans('programme_res', 'gala', 'music_res'))] }),
      S('guest_services', 'recommended', 'Look after', 'Arrival, rooming, a host per group and a contact through the stay'),
      S('tent_furniture', 'conditional', 'Furnish', 'Outdoor dining, lounge settings, shade and a wet-weather option', { when: [some(WHEN_SEATS[0], ans('programme_res', 'gala'))] }),
      S('passenger_transport', 'conditional', 'Convey', 'Transfers in, out, and for anything away from the property', { when: WHEN_RIDE }),
      S('photography', 'conditional', 'Capture', 'The days and the nights, which guests will want afterwards', { when: WHEN_SHOT }),
      S('safety_facilities', 'conditional', 'Cover', 'First aid, a medical route, and the grounds cleared each morning', { when: [ans('nights', '2', '3', '5')] }),
      S('event_equipment_rental', 'conditional', 'Build', 'Staging, dance floors, outdoor setups and the children’s area', { when: [some(WHEN_STAGE[0], ans('programme_res', 'kids_res', 'gala'))] }),
      S('invitation_printing', 'conditional', 'Prepare', 'Itineraries, menus with allergens, room notes and signage', { when: [some(WHEN_SIGNED[0], ans('nights', '2', '3', '5'))] }),
      S('end_to_end_event_logistics', 'conditional', 'Coordinate', 'Crew and equipment across several days and several settings', { when: [ans('nights', '2', '3', '5')] }),
      S('venue', 'conditional', 'Find', 'A property that can hold the group, the programme and the nights', { when: WHEN_FINDING }),
    ],
    addons: [
      X('weather_fallback', 'Plan for rain', 'An indoor option for every outdoor setting, with a decision time', 'tent', { trade: 'tent_furniture' }),
      X('kids_programme', 'Occupy them', 'A supervised children’s programme, so the adults can actually relax', 'group', { trade: 'guest_services', when: [ans('programme_res', 'kids_res')] }),
      X('medical_route', 'Know the way', 'The nearest hospital identified and the route timed before arrival', 'map', { trade: 'safety_facilities', when: [ans('nights', '1', '2', '3', '5')] }),
      X('departure_plan', 'Get them home', 'Departure transfers planned before arrival, not on the last morning', 'bus', { trade: 'passenger_transport', when: WHEN_RIDE }),
    ],
    toolkit: { polls: ['date', 'food'], note: 'We do not arrange fireworks or flame effects. A remote property needs a medical route identified before guests arrive, and a weather fallback for every outdoor setting.' },
    timeline: {
      before: ['Transfers planned both ways before anyone travels', 'Dietary needs collected individually and confirmed to the kitchen', 'Weather fallback and a decision time agreed for every outdoor setting'],
      during: ['Guests met on arrival, rooming done before the first event', 'Weather watched against the agreed decision times', 'A named contact reachable at every hour'],
      after: ['Departure transfers run as planned', 'Grounds restored', 'Images shared with guests'],
    },
    checklist: ['Transfers planned both ways', 'Dietary needs confirmed', 'Weather fallback with decision times', 'Medical route identified'],
  }),
]

export const PROPERTY_BLUEPRINT = Object.fromEntries(PROPERTY_BLUEPRINTS.map(b => [b.id, b]))
checkTrades(PROPERTY_BLUEPRINTS, 'property')
