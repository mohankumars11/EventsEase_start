/**
 * What to ask about each service — and only what moves the price or the
 * match (Mohan, 2026-11-11: "we should not give every option to customers
 * … it becomes a complete directory. Understand the occasion. Every
 * preference should be priceable." 2026-11-12: "a Wedding Anniversary was
 * offered 'capture the haldi ceremony' … for a Valentine's Day, photography
 * should offer the Valentine's kind of coverage — candid, something
 * romantic — who cares for 'traditional'? Build this intelligence for all
 * 430+ occasions, with a clean audit").
 *
 *   specFor(occasion, tradeId, event) → { line, qs }
 *
 * Two to four questions a service, chosen for THIS kind of occasion
 * (data/occasionProfile — the template says what the day is, not the
 * words in its name), each one of:
 *
 *   hours    how long they work — multiplies an hourly rate, picks a package
 *   count    how many (people, chairs, cards, vehicles) — sized from the
 *            headcount, shown as "we sized it for N", adjustable
 *   one/many a choice the partner declared in onboarding (`map: true`):
 *            the key and option ids are the partner app's own, so the pick
 *            narrows the match honestly; `pick` is the short list that
 *            fits this occasion, in order. An entry is an id, or
 *            [id, label, line] when the customer should read it in the
 *            occasion's own words ("Couple portraits" is the partner's
 *            "Portrait" — the id is what matches, the label is what sells)
 *   extras   add-ons a master prices separately (album, drone, staff…)
 *   moments  the décor set-ups for this occasion (data/decorMoments)
 *   menu     the catering menu card (ui/MenuPick)
 *   text     words for the master (a name on the cake) — never a filter
 *
 * Every tile question can be typed instead (`other`), so a customer with
 * an answer we did not list still gets to say it; typed words travel in
 * the brief and never filter who is matched.
 *
 * Nothing here invents a partner option: every pick id is checked against
 * src/data/trades/*.js for every one of the 438 occasions by
 * scripts/audit-occasion-services.mjs, which also writes the audit.
 */
import { Baby, Briefcase, Building2, Car, Church, Clock3, Crown, Flame, Flower2, Gem, Gift, Heart, Home, Layers, Music2, PartyPopper, Star, Truck, Users, UtensilsCrossed } from 'lucide-react'
import { CAKES } from './visualCatalogue'
import { profileFor, isOutdoor, isWedding, isAnniversary, isRomance, isCouple, isBirthday, isKids, isBaby, isHome, isFaith, isFestival, isMemorial, isNight, isDining, isMilestone, isSchool, isCampus, isCorp, isPublic, isSport, isRetail, peopleAsk, nounPlural } from './occasionProfile'

/* ── Builders ─────────────────────────────────────────────────────── */
const hours = (label, picks, def, x = {}) => ({ k: '$hours', type: 'hours', label, picks, def, price: 'hours', ...x })
const count = (label, unit, def, x = {}) => ({ k: '$qty', type: 'count', label, unit, def, price: 'qty', min: 1, max: 5000, step: 1, ...x })
/** A partner question, many answers. */
const own = (k, label, pick, x = {}) => ({ k, type: 'many', map: true, label, pick, other: true, price: 'match', ...x })
/** A partner question, one answer. */
const one = (k, label, pick, x = {}) => ({ k, type: 'one', map: true, label, pick, other: true, price: 'match', ...x })
/** Our own question — words for the master, never a filter. */
const choose = (k, label, options, x = {}) => ({ k, type: 'one', label, options, other: true, price: 'note', ...x })
const extras = (label, options, x = {}) => ({ k: '$extras', type: 'many', label, options, other: 'Anything else to include', price: 'extras', optional: true, ...x })
const text = (k, label, placeholder, x = {}) => ({ k, type: 'text', label, placeholder, price: 'note', optional: true, ...x })
const yesno = (k, label, x = {}) => ({ k, type: 'yesno', label, price: 'note', ...x })
const O = (id, label, line = null, icon = null) => ({ id, label, line, icon })
/**
 * Several things, each with its own count (Mohan, 2026-11-13: "how can a
 * customer choose 15 photo booths, 15 tables, 15 shamianas? … wherever it
 * needs the partner's input, give a 'partner can answer this' button").
 * The pick is the partner's own question (so the match holds); the counts
 * live in `$items` — a number sized from the headcount, or 'master' when
 * the customer leaves it to the professional. `sizes(ev)` is the default
 * for each option; 'master' means the master should size it.
 */
const items = (k, label, pick, x = {}) => ({ k, type: 'items', map: true, label, pick, sizes: SIZES, other: true, price: 'qty', ...x })
const per = (n, by, min = 1) => Math.max(min, Math.ceil((Number(n) || 0) / by))
const SIZES = ev => {
  const g = Number(ev.guests) || 50
  return {
    /* tents & furniture */
    chairs: ceil(g, 10), tables: per(g, 8), tables_chairs: per(g, 8), dining_furniture: per(g, 8), sofas_lounge: per(g, 40), lounge_seating: per(g, 30), cocktail_tables: per(g, 10, 2),
    bar_counters: 1, buffet_tables: per(g, 50, 2), counters: per(g, 60, 2), tents_canopies: per(g, 100), shamiana: 1, pagoda_tents: per(g, 50), german_hangars: 1,
    mandap_structures: 1, stage_platform: 1, stage_thrones: 2, carpets_and_flooring: 'master', partitioning: 'master', kids_furniture: per(g, 4), chair_covers_sashes: ceil(g, 10),
    /* equipment */
    photo_booth: 1, staging: 1, screens_projectors: 1, led_screens: 1, podiums_and_lecterns: 1, red_carpet_and_stanchions: 1, mist_fans_coolers: per(g, 40, 2), kids_zone_inflatables: 1,
    barricades: 'master', stage_and_truss: 1, umbrellas_and_canopies: per(g, 25, 2), display_stands: 4, lighting: 'master', audio_equipment: 1, heaters: per(g, 30, 2),
    power_equipment: 1, cooling_equipment: per(g, 40, 2), decorative_equipment: 'master', catering_equipment: 'master',
    /* power & cooling */
    generators: 1, silent_dg_sets: 1, power_distribution: 'master', lighting_towers: 2, fans_air_coolers: per(g, 40, 2), misting_systems: 'master', air_conditioning: 'master',
  }
}
/** A partner option in the customer's words. */
const L = (id, label, line = null) => [id, label, line]
const ceil = (n, by = 1) => Math.max(by, Math.ceil(n / by) * by)
const fn = o => profileFor(o).fn
const pre = o => ['roka', 'engagement', 'haldi', 'mehendi', 'sangeet'].includes(fn(o)) // before the wedding day
const people = (o, n) => `${Number(n).toLocaleString('en-IN')} ${nounPlural(peopleAsk(o).noun, Number(n))}`

/* ── The specs ───────────────────────────────────────────────────── */
const SPECS = {
  photography: (o, ev) => {
    const f = fn(o)
    const pick = isWedding(o)
      ? (['haldi', 'mehendi'].includes(f) ? [L('haldi_and_mehendi', f === 'haldi' ? 'The haldi rituals' : 'The mehendi afternoon', 'Turmeric, cones and the laughter'), L('candid', 'Candid moments', 'Natural, unposed'), L('traditional', 'Family portraits', 'Posed groups, everyone in'), L('drone_photography', 'Drone shots')]
        : ['roka', 'engagement'].includes(f) ? [L('engagement', 'The ring moment'), L('candid', 'Candid moments'), L('pre_wedding', 'Pre-wedding shoot', 'A separate session, before the day'), L('traditional', 'Family portraits')]
          : f === 'sangeet' || f === 'cocktail' ? [L('candid', 'Candid moments'), L('traditional', 'Stage & group photos', 'Performances and posed groups'), L('drone_photography', 'Drone shots')]
            : f === 'shower' ? [L('candid', 'Candid moments'), L('portrait', 'Bride-to-be portraits')]
              : f === 'griha' ? [L('candid', 'Candid moments'), L('traditional', 'The rite, step by step')]
                : [L('candid', 'Candid moments', 'Natural, unposed'), L('traditional', 'Rituals & family portraits', 'Every step, every relative'), L('drone_photography', 'Drone shots'), ...(f === 'wedding' ? [L('pre_wedding', 'Pre-wedding shoot', 'A separate session, before the day')] : [])])
      : isRomance(o) || isCouple(o, ev) ? [L('candid', 'Candid moments', 'Natural, unposed — the evening as it happens'), L('portrait', 'Couple portraits', 'The two of you, softly posed'), L('drone_photography', 'Drone shots', 'The spot from above')]
        : isAnniversary(o) ? [L('candid', 'Candid moments', 'Natural, unposed'), L('portrait', 'Couple portraits', 'The two of you, then and now'), L('traditional', 'Family portraits', 'Three generations in one frame'), L('drone_photography', 'Drone shots')]
          : isBaby(o) ? (/shower|seemantha/.test(o.id) ? [L('maternity_newborn', 'Maternity portraits'), L('candid', 'Candid moments'), L('traditional', 'Family portraits')] : [L('candid', 'Candid moments'), L('baby_and_kids', 'The baby, close up'), L('traditional', 'The ritual, step by step')])
            : isKids(o) && isBirthday(o) ? [L('candid', 'Candid moments'), L('baby_and_kids', 'Kids’ moments', 'Games, mess, delight'), L('birthday', 'The cake moment'), L('portrait', 'Family portraits')]
                : isSchool(o) ? [L('event_conference', 'Stage & prize moments'), L('candid', 'Candid moments'), L('baby_and_kids', 'The kids, close up')]
              : isBirthday(o) ? [L('candid', 'Candid moments'), L('birthday', 'The cake & the toast'), L('portrait', 'Portraits with guests'), ...(isMilestone(o) ? [L('traditional', 'Family group portraits')] : [])]
                : isMemorial(o) ? [L('candid', 'Quiet, candid coverage', 'Unobtrusive'), L('traditional', 'A family portrait')]
                  : isFaith(o) || isFestival(o) ? [L('candid', 'Candid moments'), L('traditional', 'The rituals & family portraits'), L('drone_photography', 'Drone shots')]
                    : isNight(o) ? [L('candid', 'Candid party shots'), L('portrait', 'Group & portrait shots')]
                      : isRetail(o) ? [L('product', 'Product shots'), L('fashion', 'Fashion & lookbook'), L('real_estate_venue', 'The space, styled'), L('event_conference', 'The event itself')]
                        : isCorp(o) ? [L('event_conference', 'Stage & sessions', 'Speakers, audience, the room'), L('corporate', 'Headshots & team photos'), L('candid', 'Candid networking'), L('product', 'Product shots')]
                          : isCampus(o) ? [L('event_conference', 'Stage & prize moments'), L('candid', 'Candid moments'), L('drone_photography', 'Drone shots of the ground')]
                            : isDining(o) ? [L('food', 'Food shots'), L('candid', 'Candid moments'), L('event_conference', 'The evening, start to finish')]
                              : isSport(o) || isPublic(o) ? [L('event_conference', 'The event, start to finish'), L('candid', 'Crowd & candid'), L('drone_photography', 'Drone shots')]
                                : [L('candid', 'Candid moments', 'Natural, unposed'), L('portrait', 'Group portraits'), L('drone_photography', 'Drone shots')]
    return [
      hours('How long should they shoot?', [2, 4, 6, 8, 12], ev.hours),
      own('specialties', 'What should they capture?', pick, { sub: isCouple(o, ev) ? 'Pick any — most couples take candid' : 'Pick any — candid is the natural, unposed style' }),
      count('How many photographers?', 'photographers', ev.guests >= 200 ? 2 : 1, { max: 6, sub: ev.guests >= 200 ? 'Two cover both sides of a big crowd' : 'One is plenty for a close gathering' }),
      extras('Add to the package', [O('album', 'Printed album'), O('prints', 'Instant prints'), ...(isCorp(o) || isCampus(o) ? [O('same_day', 'Same-day edit for social')] : [O('same_day', 'Same-day slideshow')]), O('reels', 'Reels for Instagram')]),
    ]
  },
  videography: (o, ev) => [
    hours('How long should they film?', [2, 4, 6, 8, 12], ev.hours),
    own('deliverables', 'What should you get?', isWedding(o) ? ['highlight_film', 'full_length_film', 'teaser_about_1_min', 'instagram_reels', 'drone_shots', 'same_day_edit', ...(pre(o) ? ['save_the_date_video'] : [])]
      : isCouple(o, ev) || isAnniversary(o) ? [L('highlight_film', 'A short film of the evening'), 'instagram_reels', 'drone_shots', ...(isAnniversary(o) ? ['full_length_film'] : [])]
        : isMemorial(o) ? [L('full_length_film', 'A full recording'), L('live_stream_link', 'A stream for family far away')]
          : isCorp(o) || isCampus(o) ? [L('highlight_film', 'Event aftermovie'), L('full_length_film', 'Full session recordings'), 'live_stream_link', 'instagram_reels', 'drone_shots']
            : isFaith(o) ? ['full_length_film', 'highlight_film', 'live_stream_link']
              : isPublic(o) ? ['highlight_film', 'full_length_film', 'live_stream_link', 'drone_shots']
                : ['highlight_film', 'instagram_reels', 'teaser_about_1_min', 'full_length_film', 'drone_shots']),
    count('How many cameras?', 'videographers', ev.guests >= 200 ? 2 : 1, { max: 4 }),
  ],
  decoration_floral: (o, ev) => [
    { k: 'services', type: 'moments', label: 'What should we set up?', sub: 'The moments of your day — your decorator quotes for exactly these', price: 'qty', other: true },
    choose('$scale', 'How grand?', [O('simple', 'Simple', 'Neat and warm', Star), O('standard', 'Standard', 'The full look', Layers), O('grand', 'Grand', 'Statement pieces, more flowers', Crown)], { other: false, price: 'tier' }),
    one('flowers', 'Fresh or artificial flowers?', ['fresh', 'artificial', 'both'], { other: false }),
    { k: '$colours', type: 'colours', label: 'Colours', sub: 'Pick up to two', price: 'note', optional: true },
    text('$nameText', isCorp(o) ? 'Words on the backdrop' : 'Name on the backdrop', isKids(o) ? 'e.g. Aarav turns 1' : isWedding(o) ? 'e.g. Ananya & Rahul' : isAnniversary(o) ? 'e.g. 25 years · Amma & Appa' : isCouple(o, ev) ? 'e.g. Always, R & P' : isCorp(o) ? 'e.g. the launch tagline' : isMemorial(o) ? 'e.g. In loving memory' : 'e.g. Welcome home'),
  ],
  cake_desserts: (o, ev) => {
    const two = isCouple(o, ev)
    const guests = Number(ev.guests) || 20
    const kg = Math.max(0.5, Math.round((guests / 10) * 2) / 2)
    /* A design is a photograph where we have one (data/visualCatalogue CAKES). */
    const pic = id => CAKES.find(c => c.id === ({ theme: 'fondant', reveal: 'fondant', logo: 'minimal', heart: 'floral' }[id] ?? id))?.photo ?? null
    const withPics = list => list.map(x => ({ ...x, photo: pic(x.id) }))
    /* Weights, each saying who it feeds; the one for this headcount is marked. */
    const KG = [['0_5_kg', 0.5], ['1_kg', 1], ['1_5_kg', 1.5], ['2_kg', 2], ['3_kg', 3], ['5_kg', 5]]
    const best = (KG.find(([, w]) => w >= kg) ?? KG[KG.length - 1])[0]
    const sizePick = (two ? KG.slice(0, 3) : KG).map(([id, w]) => L(id, `${w === 0.5 ? 'Half' : w} kg`, id === best ? `Right for your ${guests} · serves ~${Math.round(w * 10)}` : `Serves ~${Math.round(w * 10)}`))
      .concat(two || guests < 60 ? [] : [L('tiered', 'Tiered', 'Two or three tiers, for a crowd')])
    const start = String(ev.time ?? '18:00').split(':').map(Number)
    const by = (() => { const m = Math.max(0, start[0] * 60 + (start[1] || 0) - 120); const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` })()
    const design = isKids(o) ? [O('theme', 'Theme fondant'), O('photo', 'Photo cake'), O('number', 'Number shape'), O('floral', 'Floral cream'), O('tiered', 'Tiered')]
      : two ? [O('heart', 'Heart shaped'), O('minimal', 'Minimal, one tier'), O('floral', 'Floral cream'), O('photo', 'Photo cake')]
        : isAnniversary(o) ? [O('number', 'The years, in numbers'), O('floral', 'Floral cream'), O('photo', 'Photo cake'), O('tiered', 'Tiered'), O('minimal', 'Minimal white')]
          : isWedding(o) ? [O('tiered', 'Tiered'), O('floral', 'Floral cream'), O('minimal', 'Minimal white'), O('theme', 'Theme fondant')]
            : isCorp(o) || isCampus(o) ? [O('logo', 'Logo / brand cake'), O('minimal', 'Minimal'), O('tiered', 'Tiered'), O('photo', 'Photo cake')]
              : isBaby(o) ? [O('theme', 'Theme fondant'), O('floral', 'Pastel cream'), O('photo', 'Photo cake'), O('reveal', 'Colour-reveal inside')]
                : [O('theme', 'Theme fondant'), O('photo', 'Photo cake'), O('floral', 'Floral cream'), O('minimal', 'Minimal white'), O('number', 'Number shape'), O('tiered', 'Tiered')]
    return [
      { k: 'dietary', type: 'egg', label: 'Egg or eggless?', sub: 'Most families here order eggless — every baker marks theirs', price: 'match' },
      one('sizes', 'How big?', sizePick, { price: 'qty', unit: 'kg', cols: 3, other: 'Type the weight in kg', sub: two ? 'Half a kilo is a generous cake for two' : `About ${kg} kg gives ${people(o, guests)} a slice each`,
        /* A dessert table only where there is a crowd to feed. */
        also: !two && guests >= 40 ? { k: '$more', label: 'Add to the dessert table', options: [O('cupcakes', 'Cupcakes'), O('dessert_jars', 'Dessert jars'), O('brownies', 'Brownies'), O('mithai', 'Mithai box'), O('table', 'Full dessert table')] } : null }),
      one('flavours', 'Favourite flavour?', two || isAnniversary(o) ? ['red_velvet', 'chocolate', 'truffle', 'strawberry', 'butterscotch', 'rasmalai', 'blueberry', 'vanilla'] : ['chocolate', 'truffle', 'red_velvet', 'butterscotch', 'black_forest', 'mango', 'rasmalai', 'vanilla']),
      choose('$design', 'The look', withPics(design), { sub: 'Samples — the baker sends their own photos, or copy yours below',
        words: { k: '$cakeText', placeholder: isKids(o) ? 'e.g. Happy 1st Birthday Aarav' : two ? 'e.g. Always, R & P' : isAnniversary(o) ? 'e.g. Happy 25th, Amma & Appa' : isWedding(o) ? 'e.g. Ananya & Rahul' : isCorp(o) ? 'e.g. Congratulations, Team' : isBaby(o) ? 'e.g. Welcome, little one' : 'e.g. Happy Birthday' } }),
      choose('$handover', 'How should it reach you?', [O('deliver', 'Delivered to the venue', `By ${by}, two hours before`, Truck), O('pickup', 'I’ll pick it up', 'From the bakery, boxed and chilled')]),
    ].filter(Boolean)
  },
  catering_food: () => [{ k: '$menu', type: 'menu', label: 'Your menu', price: 'plate' }],
  restaurant: (o, ev) => {
    const w = peopleAsk(o).who
    return [
      own('dining_modes', 'How would you like it?', isCouple(o, ev) ? [L('table_booking', 'A table for two'), L('private_dining_room', 'A private corner')]
        : w === 'gang' || isNight(o) ? ['party_hall', 'private_dining_room', 'table_booking', 'bulk_order_delivered']
          : isCorp(o) ? ['private_dining_room', 'bulk_order_delivered', 'party_hall', 'table_booking']
            : ['table_booking', 'private_dining_room', 'party_hall', 'bulk_order_delivered'], { sub: 'Dine there, or have it delivered' }),
      own('cuisines', 'Which cuisine?', ['south_indian', 'north_indian', 'biryani_and_kebabs', 'chinese', 'continental', 'multi_cuisine', 'street_food_and_chaat']),
      one('meal_formats', 'What kind of meal?', isCouple(o, ev) ? ['la_carte', 'set_menu_per_person'] : ['set_menu_per_person', 'buffet', 'la_carte', 'party_platters', 'live_counters'], { price: 'tier' }),
      extras('Make it an occasion', [O('cake_cutting', 'Cake cutting arranged'), O('decor_setup', isCouple(o, ev) ? 'Candles & flowers on the table' : 'Table décor & balloons'), O('extra_course', 'An extra course')]),
    ]
  },
  bar_beverages: (o, ev) => [
    own('service_lines', 'What should they serve?', isKids(o) ? ['juice_and_soft_drinks', 'mocktails', 'ice_cream_counter', 'live_ice_cream_station', 'milkshakes_and_smoothies', 'kulfi_cart']
      : isCouple(o, ev) ? [L('mocktails', 'Mocktails for two'), L('tea_and_coffee_service', 'Coffee & dessert service'), 'live_ice_cream_station']
        : isNight(o) ? [L('mobile_beverage_bar', 'Mobile bar counter'), 'mocktails', 'beverage_counters', 'ice_supply', 'softy_soft_serve_machine']
          : isFaith(o) || isMemorial(o) ? ['traditional_drinks', 'tea_and_coffee_service', 'packaged_water_supply', 'juice_and_soft_drinks', 'kulfi_cart']
            : isSport(o) ? ['packaged_water_supply', 'juice_and_soft_drinks', 'ice_supply', 'beverage_counters']
              : isCorp(o) || isCampus(o) ? ['tea_and_coffee_service', 'beverage_counters', 'mocktails', 'packaged_water_supply', 'ice_cream_counter']
                : isPublic(o) ? ['beverage_counters', 'packaged_water_supply', 'softy_soft_serve_machine', 'juice_and_soft_drinks', 'kulfi_cart']
                  : ['mocktails', 'juice_and_soft_drinks', 'tea_and_coffee_service', 'traditional_drinks', 'ice_cream_counter', 'kulfi_cart', 'live_ice_cream_station']),
    hours('For how long?', [2, 3, 4, 6, 8], ev.hours),
  ],
  dj_music: (o, ev) => {
    const f = fn(o)
    return [
      one('performance_kinds', 'What kind of music act?', isWedding(o)
        ? (f === 'sangeet' ? ['sangeet_night', 'dj', 'dhol_with_dj', 'dj_with_live_musician'] : f === 'baraat' ? ['baraat_dj_on_a_vehicle', 'dhol_with_dj'] : ['haldi', 'mehendi'].includes(f) ? ['dhol_with_dj', 'dj', 'live_musician']
          : [L('ceremony_music', 'Soft music through the rituals'), 'dj', 'live_musician', 'dj_with_live_musician', 'dhol_with_dj'])
        : isCouple(o, ev) ? [L('live_musician', 'A musician at your table', 'Violin, guitar or a singer'), L('background_music', 'Soft background music')]
          : isAnniversary(o) ? [L('live_musician', 'A live musician', 'Songs you both know'), 'dj', 'background_music', 'karaoke_night']
            : isKids(o) ? [L('dj', 'A DJ who plays for kids'), 'background_music', 'karaoke_night']
              : isBirthday(o) ? ['dj', 'karaoke_night', 'live_band', 'silent_disco', 'live_musician']
                : isNight(o) ? ['dj', 'silent_disco', 'live_band', 'dj_with_live_musician']
                  : isCorp(o) ? ['background_music', 'dj', 'live_band', 'karaoke_night', 'live_musician']
                    : isCampus(o) ? ['dj', 'live_band', 'silent_disco']
                      : isFestival(o) ? ['dj', 'live_band', 'background_music', 'live_musician']
                        : isSport(o) || isPublic(o) ? ['dj', 'live_band', 'background_music']
                          : ['dj', 'background_music', 'live_musician', 'karaoke_night', 'silent_disco', 'live_band']),
      hours('How long should they play?', [2, 3, 4, 5, 6], Math.min(ev.hours || 4, 6)),
      own('styles', isCouple(o, ev) ? 'The mood' : 'Music that gets your crowd dancing', isCouple(o, ev) ? ['lounge_chill', 'sufi', 'retro', 'jazz', 'instrumental', 'bollywood']
        : isAnniversary(o) || isMilestone(o) ? ['retro', '90s_bollywood', 'bollywood', 'kannada_south_indian', 'lounge_chill', 'sufi']
          : isNight(o) ? ['commercial', 'bollywood', 'edm', 'techno', 'hip_hop', 'punjabi', 'house']
            : isFestival(o) ? ['gujarati_garba', 'bollywood', 'punjabi', 'kannada_south_indian', 'devotional', 'bhangra']
              : isKids(o) ? ['bollywood', 'western_pop', 'commercial']
                : isCorp(o) ? ['lounge_chill', 'commercial', 'bollywood', 'western_pop', 'jazz']
                  : ['bollywood', 'kannada_south_indian', 'punjabi', '90s_bollywood', 'edm', 'retro', 'commercial', 'tamil'], { optional: true }),
      one('own_equipment', 'Should they bring sound & lights?', ['sound_and_lighting', 'sound_only', 'neither'], { other: false, price: 'extras' }),
    ]
  },
  live_entertainment: (o, ev) => {
    const f = fn(o)
    return [
      own('act_types', 'What would you love?', isWedding(o)
        ? (['haldi', 'mehendi'].includes(f) ? ['chenda_melam_dhol_troupe', 'folk_dance_dollu_kunitha_yakshagana', 'singer', 'caricature_artist'] : f === 'sangeet' ? [L('bollywood_dance', 'Choreographer & dance troupe'), 'singer', 'band', 'dance_troupe', 'emcee_supported_act']
          : f === 'baraat' ? ['chenda_melam_dhol_troupe', 'folk_dance_dollu_kunitha_yakshagana', 'band'] : f === 'cocktail' ? ['band', 'singer', 'bartender_flair_show', 'ghazal_sufi_singer']
            : ['nadaswaram_shehnai', 'singer', 'chenda_melam_dhol_troupe', 'dance_troupe', 'ghazal_sufi_singer', 'band'])
        : isCouple(o, ev) ? [L('instrumentalist', 'Violin or saxophone at the table'), L('singer', 'A singer, your songs'), L('caricature_artist', 'A caricature of the two of you')]
          : isAnniversary(o) ? [L('singer', 'A singer', 'Your songs, live'), 'instrumentalist', 'ghazal_sufi_singer', 'band', 'stand_up_comedy', 'caricature_artist']
            : isKids(o) ? ['magician', 'kids_entertainer', 'puppet_show', 'caricature_artist', 'mimicry', 'dance_troupe']
              : isSchool(o) ? ['magician', 'puppet_show', 'dance_troupe', 'mimicry', 'specialty_act']
                : isBirthday(o) ? ['singer', 'band', 'stand_up_comedy', 'magician', 'mentalist', 'bollywood_dance']
                  : isBaby(o) ? ['singer', 'instrumentalist', 'caricature_artist', L('magician', 'A magician for the little guests')]
                    : isMemorial(o) ? [L('instrumentalist', 'Soft instrumental', 'A flute or a violin'), L('singer', 'Bhajans, sung')]
                      : isFaith(o) ? ['traditional_performance', 'nadaswaram_shehnai', 'classical_dance_bharatanatyam_kathak', 'folk_dance_dollu_kunitha_yakshagana', L('singer', 'Bhajan singer')]
                        : isFestival(o) ? ['folk_dance_dollu_kunitha_yakshagana', 'dance_troupe', 'band', 'singer', 'traditional_performance']
                          : isNight(o) ? ['stand_up_comedy', 'band', 'bartender_flair_show', 'fire_led_act', 'bollywood_dance', 'mentalist']
                            : isCampus(o) ? ['band', 'stand_up_comedy', 'dance_troupe', 'playback_celebrity_singer', 'fire_led_act']
                              : profileFor(o).family === 'gala' ? ['band', 'playback_celebrity_singer', 'acrobats_aerial_act', 'emcee_supported_act', 'mentalist', 'stand_up_comedy']
                                : isCorp(o) ? ['emcee_supported_act', 'stand_up_comedy', 'band', 'mentalist', 'instrumentalist', 'singer']
                                  : isDining(o) ? ['instrumentalist', 'singer', 'band', 'ghazal_sufi_singer']
                                    : isSport(o) || isPublic(o) ? ['band', 'dance_troupe', 'folk_dance_dollu_kunitha_yakshagana', 'acrobats_aerial_act', 'fire_led_act']
                                      : ['singer', 'band', 'stand_up_comedy', 'magician', 'dance_troupe', 'instrumentalist']),
      hours('For how long?', [1, 2, 3, 4], Math.min(ev.hours || 2, 3)),
    ]
  },
  anchor_mc: (o, ev) => [
    hours('How long should they host?', [2, 3, 4, 6], Math.min(ev.hours || 3, 6)),
    choose('$tone', 'What kind of hosting?', isCorp(o) || isCampus(o) ? [O('warm', 'Formal', 'Agenda, speakers, awards in order'), O('fun', 'Energetic', 'Keeps the room awake and playing'), O('both', 'A bit of both')]
      : isMemorial(o) ? [O('warm', 'Gentle & formal', 'Tributes and the order of the gathering')]
        : [O('warm', 'Warm & formal', 'Speeches, rituals, order of events'), O('fun', 'Fun & games', 'Keeps the crowd playing'), O('both', 'A bit of both')]),
    { k: '$languages', type: 'many', label: 'Languages', options: [O('kannada', 'Kannada'), O('english', 'English'), O('hindi', 'Hindi'), O('tamil', 'Tamil'), O('telugu', 'Telugu')], other: true, price: 'note' },
  ],
  sound_av: (o, ev) => [
    own('groups', 'What should they bring?', isCorp(o) ? ['microphones', 'speakers', 'projectors_and_screens', 'led_walls_video', 'podium_mics', 'operators']
      : isCampus(o) || isPublic(o) ? ['speakers', 'microphones', 'line_arrays', 'stage_monitors', 'led_walls_video', 'operators']
        : isMemorial(o) || isFaith(o) ? ['speakers', 'microphones', 'operators']
          : ['speakers', 'microphones', 'projectors_and_screens', 'led_walls_video', 'dj_setup', 'operators']),
    hours('For how long?', [2, 4, 6, 8, 12], ev.hours),
  ],
  event_lighting: (o, ev) => {
    const f = fn(o)
    return [
      own('service_types', 'What should glow?', isWedding(o)
        ? (f === 'wedding' ? ['mandap_lighting', 'stage_lighting', 'fairy_string_lights', 'uplighting', 'pathway_and_entrance_lighting'] : ['haldi', 'mehendi'].includes(f) ? ['fairy_string_lights', 'decorative_lighting', 'tree_and_garden_lighting', 'uplighting']
          : ['stage_lighting', 'uplighting', 'fairy_string_lights', 'dance_floor_lighting', 'pathway_and_entrance_lighting', 'chandeliers'])
        : isCouple(o, ev) || isAnniversary(o) ? ['fairy_string_lights', 'uplighting', 'decorative_lighting', 'pathway_and_entrance_lighting', 'chandeliers']
          : isNight(o) ? ['dance_floor_lighting', 'laser_show', 'moving_lights', 'uplighting', 'pixel_led_effects']
            : isMemorial(o) ? ['basic_event_lighting', 'pathway_and_entrance_lighting']
              : isFaith(o) || isFestival(o) ? ['decorative_lighting', 'fairy_string_lights', 'facade_lighting', 'tree_and_garden_lighting', 'pathway_and_entrance_lighting']
                : isRetail(o) ? ['architectural_venue_lighting', 'facade_lighting', 'uplighting', 'custom_lighting_design']
                  : isCorp(o) ? ['stage_lighting', 'uplighting', 'projection_mapping', 'moving_lights', 'basic_event_lighting']
                    : isCampus(o) ? ['stage_lighting', 'basic_event_lighting', 'outdoor_lighting', 'moving_lights']
                      : isSport(o) ? ['outdoor_lighting', 'basic_event_lighting', 'stage_lighting']
                        : isPublic(o) ? ['stage_lighting', 'moving_lights', 'laser_show', 'outdoor_lighting', 'projection_mapping']
                          : ['decorative_lighting', 'fairy_string_lights', 'stage_lighting', 'uplighting', 'dance_floor_lighting', 'outdoor_lighting']),
      choose('$scale', 'How much?', [O('warm', 'Warm & simple'), O('full', 'The full room'), O('show', 'A light show')], { other: false, price: 'tier' }),
    ]
  },
  tent_furniture: o => [
    items('groups', 'What do you need?', isWedding(o) ? ['chairs', 'tables', 'shamiana', 'mandap_structures', 'stage_platform', 'stage_thrones', 'sofas_lounge', 'carpets_and_flooring']
      : isNight(o) ? ['bar_counters', 'lounge_seating', 'cocktail_tables', 'chairs', 'tents_canopies', 'stage_platform']
        : isKids(o) ? ['kids_furniture', 'chairs', 'tables', 'tents_canopies', 'carpets_and_flooring']
          : isMemorial(o) || isFaith(o) ? ['chairs', 'tents_canopies', 'shamiana', 'carpets_and_flooring', 'tables']
            : isCorp(o) ? ['chairs', 'tables', 'pagoda_tents', 'counters', 'partitioning', 'stage_platform', 'sofas_lounge']
              : isPublic(o) || isSport(o) ? ['german_hangars', 'tents_canopies', 'chairs', 'stage_platform', 'counters', 'carpets_and_flooring']
                : ['chairs', 'tables', 'tents_canopies', 'shamiana', 'sofas_lounge', 'stage_platform', 'carpets_and_flooring', 'buffet_tables']),
  ],
  priest_rituals: o => {
    const f = fn(o), w = o.id
    return [
      one('ceremonies', 'Which ceremony?', isHome(o) ? ['housewarming', 'vastu_shanti', 'satyanarayana_puja', 'ganapathi_homa']
        : isBaby(o) ? (/naming|cradle/.test(w) ? ['naming_ceremony', 'blessing'] : /rice/.test(w) ? ['annaprashana'] : ['seemantha_baby_shower', 'blessing'])
          : isWedding(o) ? (['roka', 'engagement'].includes(f) ? ['engagement', 'blessing'] : f === 'wedding' ? ['wedding'] : f === 'griha' ? ['housewarming', 'blessing'] : ['blessing', 'ganapathi_homa'])
            : isAnniversary(o) ? ['anniversary', 'satyanarayana_puja', 'blessing']
              : isMilestone(o) ? ['shashtiabdapurthi_60th_birthday', 'satyanarayana_puja', 'blessing']
                : isMemorial(o) ? ['memorial', 'shraddha_tithi']
                  : isKids(o) ? ['ayushya_homa_first_birthday', 'blessing']
                    : isCorp(o) || isRetail(o) ? ['shop_office_opening', 'bhoomi_puja', 'vastu_shanti', 'ganapathi_homa']
                      : isFaith(o) ? (/diwali/.test(w) ? ['lakshmi_puja', 'ganapathi_homa'] : /ganesh/.test(w) ? ['ganapathi_homa'] : /shivaratri/.test(w) ? ['rudrabhisheka'] : /navratri|durga|dussehra/.test(w) ? ['chandi_homa', 'satyanarayana_puja'] : ['satyanarayana_puja', 'ganapathi_homa', 'blessing'])
                        : ['blessing', 'ganapathi_homa', 'satyanarayana_puja']),
      one('traditions', 'Which tradition does your family follow?', ['vedic', 'smarta', 'madhwa', 'sri_vaishnava', 'lingayat_veerashaiva', 'north_indian_pandit', 'arya_samaj', 'jain']),
      one('languages', 'Mantras and guidance in', ['kannada', 'sanskrit', 'telugu', 'tamil', 'hindi', 'english', 'malayalam']),
      yesno('$kit', 'Should he bring the pooja materials?', { price: 'extras', sub: 'Flowers, fruits, samagri — or you arrange them' }),
    ]
  },
  bridal_makeup_hair: (o, ev) => [
    own('who', isWedding(o) ? 'Who needs a look?' : 'Who’s getting ready?', isWedding(o) ? (fn(o) === 'shower' ? [L('bride', 'The bride-to-be'), 'family', 'guests'] : ['bride', 'groom', 'family', 'guests'])
      : isAnniversary(o) ? [L('family', 'The two of you & family'), 'guests'] : ['family', 'guests']),
    count('How many looks?', 'looks', 1, { max: 40, sub: 'One per person made up' }),
    one('styles', 'Which style?', isWedding(o) ? ['traditional', 'natural', 'glam', 'hd', 'airbrush'] : isCorp(o) || isRetail(o) ? ['natural', 'hd', 'editorial', 'glam'] : ['natural', 'glam', 'hd', 'traditional', 'airbrush']),
    yesno('$trial', 'A trial before the day?', { price: 'extras' }),
  ],
  mehendi_artist: (o, ev) => [
    own('who', 'Mehendi for whom?', isWedding(o) ? ['bridal', 'family_guest'] : ['family_guest', 'casual']),
    count('How many people?', 'people', Math.max(1, Math.round(ev.guests * 0.15)), { max: 500, sub: 'Family and guests who want it' }),
    one('styles', 'Which design style?', isWedding(o) ? ['rajasthani', 'arabic', 'indo_arabic', 'floral_and_leafy', 'traditional_karnataka', 'mandala', 'bride_and_groom_portrait'] : ['arabic', 'minimal', 'floral_and_leafy', 'indo_arabic', 'mandala']),
    one('coverage', 'How much coverage?', isWedding(o) ? ['full_hand', 'up_to_elbow', 'full_arms', 'feet', 'half_hand'] : ['half_hand', 'full_hand', 'up_to_elbow']),
  ],
  venue: () => [{ k: '$venue', type: 'venue', label: 'Your venue', price: 'match' }],
  guest_services: (o, ev) => [
    own('roles', 'Who do you need at the door?', isWedding(o) ? ['welcome_and_aarti_team', 'ushers', 'hostesses', 'elderly_assistance', 'shoe_stand_and_cloakroom', 'gift_distribution']
      : isMemorial(o) ? ['guest_reception', 'elderly_assistance', 'ushers', 'shoe_stand_and_cloakroom']
        : isCorp(o) ? ['registration_desk', 'hostesses', 'ushers', 'hospitality_desk', 'vip_protocol_escort']
          : isSchool(o) ? ['registration_desk', 'ushers', 'guest_guidance', 'kids_zone_attendants']
            : isCampus(o) ? ['registration_desk', 'ushers', 'hospitality_desk', 'guest_guidance']
              : isOutdoor(o) ? ['guest_reception', 'hostesses', 'event_concierge', 'luggage_desk', 'hotel_check_in_desk']
              : isPublic(o) || isSport(o) ? ['registration_desk', 'queue_management', 'guest_guidance', 'ushers', 'hospitality_desk']
                : isNight(o) || isDining(o) ? ['hostesses', 'guest_reception', 'event_concierge']
                  : ['guest_reception', 'ushers', 'hostesses', 'elderly_assistance', 'gift_distribution', ...(isKids(o) || isBirthday(o) ? ['kids_zone_attendants'] : [])]),
    count('How many people?', 'staff', Math.max(2, Math.ceil(ev.guests / 50)), { max: 200, sub: 'One for every fifty guests' }),
    hours('For how long?', [4, 6, 8, 12], Math.max(ev.hours || 4, 4)),
  ],
  security_services: (o, ev) => [
    own('services', 'What should they handle?', isNight(o) ? ['bouncers', 'guest_access_control', 'lady_guards', 'parking_security', 'bag_screening']
      : isCorp(o) ? ['guest_access_control', 'vip_close_protection', 'parking_security', 'bag_screening', 'cctv_monitoring']
        : isPublic(o) || isSport(o) || isCampus(o) ? ['crowd_control', 'entry_exit_management', 'queue_management', 'bag_screening', 'parking_security', 'fire_marshals']
          : ['guest_access_control', 'parking_security', 'gift_and_cash_counter_guarding', 'crowd_control', 'lady_guards', 'vip_close_protection']),
    count('How many guards?', 'guards', Math.max(2, Math.ceil(ev.guests / 75)), { max: 300, sub: 'One for every seventy-five guests' }),
    hours('For how long?', [4, 6, 8, 12], Math.max(ev.hours || 4, 4)),
  ],
  valet_parking: (o, ev) => [
    own('services', 'What do you need?', ['valet_drivers', 'parking_management', 'marshals', 'supervisors', 'signage']),
    count('How many cars do you expect?', 'cars', ceil(ev.guests / 3, 10), { step: 10, max: 5000, sub: 'About one car for every three guests' }),
    hours('For how long?', [3, 4, 6, 8], Math.max(ev.hours || 4, 3)),
  ],
  safety_facilities: (o, ev) => [
    own('kit', 'What should be on site?', isPublic(o) || isSport(o) || isCampus(o) ? ['first_aid_kits', 'fire_extinguishers', 'portable_toilets', 'barricades', 'hand_wash_stations', 'waste_bins_and_liners', 'aed_defibrillator']
      : ['first_aid_kits', 'fire_extinguishers', 'waste_bins_and_liners', 'sanitiser_stations', 'hand_wash_stations', 'portable_toilets']),
    count('Cleaning staff', 'staff', Math.max(1, Math.ceil(ev.guests / 100)), { max: 100, sub: 'One for every hundred guests' }),
    hours('For how long?', [4, 6, 8, 12], Math.max(ev.hours || 4, 4)),
  ],
  passenger_transport: (o, ev) => [
    own('vehicle_services', 'What should they drive?', isWedding(o) ? ['decorated_wedding_cars', 'vintage_classic_cars', 'tempo_travellers', 'mini_buses', 'buses', 'luxury_cars']
      : isCouple(o, ev) || isAnniversary(o) ? ['luxury_cars', 'premium_cars', 'vintage_classic_cars', 'tempo_travellers']
        : isNight(o) ? [L('tempo_travellers', 'A Tempo Traveller for the gang'), 'suvs', 'vans', 'luxury_cars', 'cars']
          : isCorp(o) ? ['shuttle_service', 'buses', 'airport_and_station_transfers', 'cars', 'luxury_coaches']
            : isSchool(o) || isCampus(o) ? ['buses', 'mini_buses', 'tempo_travellers']
              : isPublic(o) || isSport(o) ? ['shuttle_service', 'buses', 'mini_buses']
                : ['cars', 'suvs', 'tempo_travellers', 'mini_buses', 'buses', 'shuttle_service']),
    count('How many vehicles?', 'vehicles', Math.max(1, Math.ceil(ev.guests / 14)), { max: 200, sub: 'A Tempo Traveller seats about fourteen' }),
    choose('$trip', 'What kind of trip?', [O('round', 'Round trip'), O('oneway', 'One way'), O('hourly', 'At our disposal, by the hour')], { other: false }),
  ],
  gifts_favours: (o, ev) => [
    own('gift_types', 'What kind of gift?', isKids(o) ? ['kids_party_favours', 'chocolate_boxes', 'customised_mugs_and_frames', 'personalized_items']
      : isWedding(o) ? ['return_gifts', 'tambula_pooja_return_gifts', 'sweets_and_dry_fruit_boxes', 'silver_and_brass_gifts', 'gift_hampers']
        : isCouple(o, ev) ? [L('personalized_items', 'A personalised keepsake'), 'gift_hampers', 'chocolate_boxes']
          : isAnniversary(o) ? [L('personalized_items', 'Personalised keepsakes'), 'return_gifts', 'gift_hampers', 'chocolate_boxes', 'customised_mugs_and_frames', ...(isMilestone(o) ? ['silver_and_brass_gifts'] : [])]
            : isMemorial(o) ? [L('plants_and_eco_gifts', 'A sapling in their memory')]
              : isCorp(o) ? ['corporate_gifts', 'welcome_gifts', 'gift_hampers', 'plants_and_eco_gifts', 'personalized_items']
                : isBaby(o) ? ['baby_shower_favours', 'return_gifts', 'chocolate_boxes', 'tambula_pooja_return_gifts']
                  : isFaith(o) || isFestival(o) ? ['tambula_pooja_return_gifts', 'sweets_and_dry_fruit_boxes', 'return_gifts', 'plants_and_eco_gifts']
                    : isSchool(o) || isCampus(o) ? ['customised_mugs_and_frames', 'chocolate_boxes', 'plants_and_eco_gifts', 'personalized_items']
                      : isSport(o) ? ['personalized_items', 'welcome_gifts', 'gift_hampers']
                        : isNight(o) ? ['guest_favours', 'personalized_items', 'chocolate_boxes']
                          : ['return_gifts', 'gift_hampers', 'chocolate_boxes', 'plants_and_eco_gifts', 'personalized_items']),
    count('How many?', 'gifts', ceil(ev.guests, 5), { step: 5, max: 10000, sub: 'One for every guest' }),
    choose('$each', 'Budget per gift', [O('u100', 'Under ₹100'), O('100', '₹100 – ₹250'), O('250', '₹250 – ₹500'), O('500', '₹500 and above')], { price: 'tier' }),
  ],
  invitation_printing: (o, ev) => [
    own('products', 'What do you need?', isWedding(o) ? ['boxed_wedding_cards', 'printed_invitations', 'e_invites_with_an_rsvp_page', 'video_invitations', ...(pre(o) ? ['save_the_date_cards'] : []), 'scroll_invitations']
      : isMemorial(o) ? [L('printed_invitations', 'A simple printed card'), 'digital_invitations', 'thank_you_cards']
        : isCorp(o) ? ['digital_invitations', 'printed_invitations', 'signage', 'event_programmes', 'welcome_boards']
          : isCampus(o) || isPublic(o) ? ['digital_invitations', 'event_programmes', 'signage', 'itinerary_booklets']
            : ['printed_invitations', 'digital_invitations', 'e_invites_with_an_rsvp_page', 'video_invitations', 'caricature_invites', 'thank_you_cards']),
    count('How many cards?', 'cards', ceil(ev.guests / 2.5, 10), { step: 10, max: 20000, sub: 'One card for every family' }),
  ],
  event_materials_supplier: (o, ev) => [
    own('supplies', 'What should they supply?', isFaith(o) || isBaby(o) ? ['pooja_materials', 'candles_and_diyas', 'disposable_serving_items', 'water_bottles_and_cups', 'artificial_flowers']
      : isMemorial(o) ? ['disposable_serving_items', 'water_bottles_and_cups', 'candles_and_diyas', 'tissues_and_napkins']
        : isCorp(o) || isCampus(o) ? ['signage_materials', 'stationery_and_name_cards', 'water_bottles_and_cups', 'disposable_serving_items', 'table_accessories']
          : isPublic(o) || isSport(o) ? ['water_bottles_and_cups', 'signage_materials', 'cleaning_and_hygiene_supplies', 'garbage_bags', 'disposable_serving_items']
            : ['disposable_serving_items', 'water_bottles_and_cups', 'balloons_and_party_supplies', 'tissues_and_napkins', 'decorations', 'garbage_bags']),
    count('For how many guests?', 'guests', ev.guests, { step: 10, max: 100000 }),
  ],
  trousseau_gift_packing: o => [
    own('types', 'What should be packed?', isWedding(o) ? ['saree_trays', 'dry_fruit_platters', 'sweet_boxes', 'coconut_and_tambula_decoration', 'ring_platters', 'wedding_trousseau', 'haldi_and_mehendi_kits']
      : isBaby(o) ? ['baby_shower_baskets', 'sweet_boxes', 'dry_fruit_platters', 'gift_boxes']
        : isCorp(o) ? ['corporate_gifts', 'hampers', 'premium_decorative_packing', 'gift_boxes']
          : ['gift_boxes', 'hampers', 'sweet_boxes', 'dry_fruit_platters', 'return_favours']),
    count('How many pieces?', 'pieces', 10, { max: 2000 }),
  ],
  event_equipment_rental: o => [
    items('equipment_types', 'What do you need?', isKids(o) ? ['kids_zone_inflatables', 'photo_booth', 'tables_chairs', 'mist_fans_coolers']
      : isCorp(o) || isCampus(o) ? ['staging', 'screens_projectors', 'podiums_and_lecterns', 'led_screens', 'tables_chairs', 'red_carpet_and_stanchions']
        : isNight(o) ? ['photo_booth', 'lighting', 'audio_equipment', 'tables_chairs', 'mist_fans_coolers']
          : isPublic(o) || isSport(o) ? ['barricades', 'stage_and_truss', 'tables_chairs', 'umbrellas_and_canopies', 'display_stands', 'led_screens']
            : ['tables_chairs', 'staging', 'screens_projectors', 'photo_booth', 'red_carpet_and_stanchions', 'mist_fans_coolers']),
    choose('$days', 'For how long?', [O('1', '1 day'), O('2', '2 days'), O('3', '3 days')], { price: 'qty', unit: 'days', other: 'Type the number of days' }),
  ],
  power_cooling: (o, ev) => [
    items('services', 'What do you need?', isPublic(o) || isSport(o) || isCampus(o) ? ['generators', 'silent_dg_sets', 'power_distribution', 'lighting_towers', 'fans_air_coolers', 'misting_systems']
      : ['silent_dg_sets', 'generators', 'air_conditioning', 'fans_air_coolers', 'misting_systems']),
    hours('For how long?', [4, 6, 8, 12, 24], Math.max(ev.hours || 4, 4)),
  ],
  wedding_planning: () => [
    one('services', 'How much planning do you need?', ['full_planning', 'partial_planning', 'day_of_coordination', 'vendor_coordination', 'design_theme'], { other: false }),
    one('budget_band', 'Your event budget', ['under_10_l', '10_25_l', '25_50_l', '50_l_1_cr', 'above_1_cr'], { other: false }),
  ],
  end_to_end_event_logistics: () => [
    own('scope', 'What should they run?', ['setup_coordination', 'material_transport', 'setup_and_teardown_crews', 'on_site_logistics_management', 'complete_logistics_management', 'waste_removal_and_cleanup']),
    text('$notes', 'Anything they should know', 'e.g. a third-floor hall with no lift'),
  ],
  mini_truck_pickup: () => [
    own('loads', 'What is being moved?', ['decor', 'chairs_and_tables', 'catering_vessels', 'flowers', 'sound_and_lighting_gear', 'return_gifts', 'cartons']),
    count('How many trips?', 'trips', 1, { max: 50 }),
  ],
  medium_large_goods_vehicle: () => [
    own('loads', 'What is being moved?', ['event_equipment', 'tents_and_shamiana', 'staging_and_truss', 'chairs_and_tables_in_bulk', 'decor', 'generators']),
    count('How many trips?', 'trips', 1, { max: 50 }),
  ],
  loading_unloading_crew: () => [
    own('work', 'What work?', ['loading', 'unloading'], { other: false }),
    count('How many people?', 'crew', 4, { max: 100 }),
    hours('For how long?', [2, 4, 6, 8], 4),
  ],
  warehouse_storage: () => [
    own('item_types', 'What needs storing?', ['decor', 'furniture', 'event_equipment', 'cartons']),
    count('For how many days?', 'days', 3, { max: 365 }),
    { ...count('How much space?', 'sq ft', 200, { step: 50, max: 50000 }), k: '$sqft' },
  ],
  transportation: () => [
    one('service_type', 'What do you need coordinated?', ['guest_transport_coordination', 'item_movement', 'scheduled_shuttle_coordination'], { other: false }),
  ],
}

/* One line under the title: why this service, for this occasion. */
const LINE = {
  photography: (o, ev) => (isWedding(o) ? 'Every ritual and every relative, kept.' : isCouple(o, ev) ? 'The evening, kept — without anyone in the way.' : isAnniversary(o) ? 'The two of you, and everyone who came for you.' : isKids(o) ? 'Every first smile and the cake moment.' : isMemorial(o) ? 'Quiet coverage, for the family.' : isCorp(o) ? 'The stage, the room and the people in it.' : 'The faces you will want to see again.'),
  decoration_floral: (o, ev) => (isCouple(o, ev) ? 'A moment set up, not a hall decorated.' : isAnniversary(o) ? 'Your years, on the wall and the table.' : isFaith(o) ? 'Torana, rangoli and flowers, done the traditional way.' : isMemorial(o) ? 'White flowers, arranged quietly.' : isCorp(o) ? 'Your brand on the stage and the room.' : 'The look your guests walk into.'),
  catering_food: () => 'Sambramo writes the menu for your occasion; every caterer who fits quotes for exactly it.',
  restaurant: (o, ev) => (isCouple(o, ev) ? 'A table for two, booked — or dinner brought home.' : 'Book a table or order in — restaurants near you, priced per person.'),
  cake_desserts: (o, ev) => (isCouple(o, ev) ? 'A small one, in your flavour, with your words on it.' : 'Sized for your guests, in your flavour, with their name on it.'),
  live_entertainment: (o, ev) => (isKids(o) ? 'Keeps the little guests busy and laughing.' : isCouple(o, ev) ? 'Music at the table, for the two of you.' : 'Something to remember on stage.'),
  dj_music: (o, ev) => (isCouple(o, ev) ? 'Soft, live, and only yours.' : isWedding(o) ? 'From the rituals to the dance floor.' : 'The sound of the night.'),
}

/**
 * The questions for one service at one event. `ev` needs guests and hours
 * (and `company`, for a couple's occasion). Unknown trades get nothing
 * here; the panel falls back to the partner's one required question
 * (data/requiredAnswers) plus a count.
 */
export function specFor(o, tradeId, ev = {}) {
  const e = { guests: Number(ev.guests) || 50, hours: Number(ev.hours) || 4, company: ev.company ?? null }
  const qs = (SPECS[tradeId]?.(o, e) ?? []).map(q => ({ ...q, pick: typeof q.pick === 'function' ? q.pick(o) : q.pick }))
  return { line: LINE[tradeId]?.(o, e) ?? null, qs }
}
export const hasSpec = tradeId => !!SPECS[tradeId]
/**
 * What the three levels mean for THIS occasion, when the model's own lines
 * would read wrong — "stage and entrance" means nothing at a table for two.
 */
export function tierLines(o, tradeId, ev = {}) {
  const two = isCouple(o, ev)
  if (tradeId === 'decoration_floral') {
    if (two) return { ESSENTIAL: 'The table, set', SIGNATURE: 'The table and the space around it', VIP: 'The whole evening, staged' }
    if (isMemorial(o)) return { ESSENTIAL: 'Flowers and the photograph', SIGNATURE: 'The hall, quietly dressed', VIP: 'Everything, arranged with care' }
    if (isHome(o) || isFaith(o)) return { ESSENTIAL: 'The door and the pooja place', SIGNATURE: 'Every room the family will sit in', VIP: 'The whole house, dressed for the day' }
    return null
  }
  if (two) return { ESSENTIAL: 'The essentials, done well', SIGNATURE: 'The full service, just for the two of you', VIP: 'Everything, with the extras included' }
  return null
}
/** A pick entry's id — an id, or the first of [id, label, line]. */
export const pickId = x => (Array.isArray(x) ? x[0] : x)
export const ICONS = { Baby, Briefcase, Building2, Car, Church, Clock3, Flame, Flower2, Gem, Gift, Heart, Home, Music2, PartyPopper, Truck, Users, UtensilsCrossed }

/* ── Choose your experience ──────────────────────────────────────────
 * Three levels only where a service really comes in levels (Mohan,
 * 2026-11-13: "how does Essential / Signature / VIP make sense for a cake,
 * a restaurant or travel? … it should be dynamic per service and per
 * occasion"). A cake is priced by its size and design, a vehicle by its
 * trips, a rental by its items — those ask their own questions and show no
 * levels. Where levels exist, each one says what you actually get, in the
 * occasion's words. [name, what you get] per level. */
const XP = {
  photography: o => ({ ESSENTIAL: ['Key moments', isCouple(o) ? 'The two of you, edited photos' : 'The rituals, edited photos'], SIGNATURE: ['Full story', isWedding(o) ? 'Candid + traditional, an album' : 'Every moment, candids included'], VIP: ['Cinematic', 'Extra shooters, album, drone'] }),
  videography: o => ({ ESSENTIAL: ['Highlights', 'A short highlight film'], SIGNATURE: ['Full film', isWedding(o) ? 'The whole function, edited' : 'The event, start to end'], VIP: ['Cinematic', 'Teaser, reels and drone'] }),
  decoration_floral: o => ({ ESSENTIAL: ['Simple & fresh', isHome(o) || isFaith(o) ? 'The door and the pooja place' : isCouple(o) ? 'The table, set' : 'The key spots, dressed'], SIGNATURE: ['Themed', isHome(o) || isFaith(o) ? 'Every room guests sit in' : 'Stage and entrance, styled'], VIP: ['Grand', 'The whole venue, transformed'] }),
  dj_music: o => ({ ESSENTIAL: ['Music & mic', 'A DJ, speakers and a mic'], SIGNATURE: ['Party set', 'DJ, lights and a dance floor'], VIP: ['Club night', isWedding(o) ? 'DJ, dhol and an LED wall' : 'DJ, effects and an LED wall'] }),
  live_entertainment: o => ({ ESSENTIAL: ['One act', isKids(o) ? 'A magician or a clown' : 'A performer, one set'], SIGNATURE: ['More acts', 'Performances timed to the day'], VIP: ['A show', 'A headline act, staged'] }),
  anchor_mc: () => ({ ESSENTIAL: ['Hosts it', 'Welcome, flow and thanks'], SIGNATURE: ['Runs it', 'Games, cues and the order'], VIP: ['Celebrity', 'A known face, scripted'] }),
  sound_av: () => ({ ESSENTIAL: ['Clear sound', 'Speakers and mics'], SIGNATURE: ['Stage sound', 'A mixer, monitors, an operator'], VIP: ['Full AV', 'Sound, screens and a live feed'] }),
  event_lighting: () => ({ ESSENTIAL: ['Warm glow', 'Fairy lights and uplights'], SIGNATURE: ['Styled', 'Stage and decor lit to theme'], VIP: ['A light show', 'Moving heads, effects, a designer'] }),
  bridal_makeup_hair: o => ({ ESSENTIAL: ['Classic', isWedding(o) ? 'Makeup and hair, one look' : 'One look, makeup and hair'], SIGNATURE: ['HD', 'HD makeup, draping, touch-ups'], VIP: ['Airbrush', 'Airbrush, more looks, on call'] }),
  mehendi_artist: () => ({ ESSENTIAL: ['Simple', 'Hands to the wrist'], SIGNATURE: ['Bridal-style', 'Full hands, detailed'], VIP: ['Bridal', 'Hands and feet, the full story'] }),
  bar_beverages: o => ({ ESSENTIAL: ['Mocktails', isKids(o) || isFaith(o) ? 'Juices and mocktails' : 'A mocktail counter'], SIGNATURE: ['Full bar', 'Bartenders and a menu'], VIP: ['Signature bar', 'Mixologists and a themed bar'] }),
  guest_services: () => ({ ESSENTIAL: ['Welcome', 'Greeters at the door'], SIGNATURE: ['Hosted', 'Greeters, seating and help'], VIP: ['Concierge', 'Hosts for every guest'] }),
  end_to_end_event_logistics: () => ({ ESSENTIAL: ['Set-up', 'Set-up and teardown'], SIGNATURE: ['Run the day', 'Crews, transport and timing'], VIP: ['Fully managed', 'Everything moved and run'] }),
}
/** The three levels for a service at this occasion — or null where levels make no sense. */
export function experienceFor(o, tradeId, ev = {}) {
  const f = XP[tradeId]
  if (!f) return null
  const x = f(o, ev)
  if (isMemorial(o) && ['dj_music', 'live_entertainment', 'bar_beverages'].includes(tradeId)) return null
  return x
}
