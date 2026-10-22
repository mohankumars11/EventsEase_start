/**
 * The storefront, one trade per shot: ?s=photo | dj | venue | catering | anchor | empty
 *
 * Real components (TradeListingCard, AnchorProfileCard) fed the shape
 * listing_preview / listing_public return, with answers keyed exactly as
 * the trade files key them. The media are the repo's own artwork copied
 * into dist/_preview: portrait posters, a square mascot and a landscape
 * splash, which is the point — a grid that stays aligned across mixed
 * aspect ratios is what is being checked.
 */
import React from 'react'
import TradeListingCard from '../../src/components/customer/TradeListingCard'
import AnchorProfileCard from '../../src/components/customer/AnchorProfileCard'

const photo = (n, extra = {}) => ({ id: 'm' + n, kind: 'photo', url: `/_preview/m${n}.webp`, review_status: 'live', ...extra })
const MEDIA = [photo(1), photo(2), photo(3), photo(4, { review_status: 'pending' }), photo(5), photo(6), photo(7), photo(8), photo(9), photo(10), photo(11)]

const LISTINGS = {
  photo: {
    trade_id: 'photography', status: 'UNDER_REVIEW', is_live: false, city: 'Jayanagar, Bengaluru', rating: 4.8, review_count: 23, is_verified: true,
    profile: {
      display_name: 'Lumen Frames Studio', tagline: 'Candid wedding stories, told in natural light',
      bio: 'We are a team of four photographers who have covered more than 300 weddings across Karnataka and Tamil Nadu since 2016. We blend unobtrusive candid coverage with the traditional family portraits elders expect, and every family gets a private online gallery within three days of the wedding.\n\nWe travel with backup bodies, licensed drones and our own lighting.',
      instagram: 'https://instagram.com/lumenframes',
    },
    answers: {
      specialties: ['candid', 'traditional', 'pre_wedding', 'drone_photography', 'haldi_and_mehendi', 'baby_and_kids'],
      events: ['weddings', 'engagements', 'receptions', 'haldi_and_mehendi', 'sangeet', 'baby_shower'],
      styles: ['documentary', 'cinematic_stills', 'bright_and_airy', 'other'], styles_other: 'Temple-light portraits',
      years: 9, equipment: ['full_frame_bodies', 'backup_body', 'prime_lenses', 'drone_licensed'],
      formats: ['online_gallery', 'printed_album', 'photo_book'], service_radius_km: 150,
      languages: ['english', 'kannada', 'hindi', 'tamil'], sneak_peek_days: 3, same_day_edit: true, outstation: true,
      gallery_link: 'https://lumen.example/gallery', team: 4, events_per_day: 2, edits_per_month: 12,
    },
    packages: [
      { key: 'essential', name: 'Essential', hours: 6, customer_paise: 4500000, inclusions: ['album'] },
      { key: 'signature', name: 'Signature', hours: 10, customer_paise: 7800000, inclusions: ['album', 'same_day', 'prints'] },
      { key: 'vip', name: 'VIP', hours: 14, customer_paise: 12500000, inclusions: ['album', 'same_day', 'prints', 'drone'] },
    ],
    rules: [{ kind: 'hour', label: 'Per hour', unit: 'hour', customer_paise: 650000, min_qty: 3 }],
    catalogue: [{ item_key: 'c1', name: 'Full-day wedding coverage', unit: 'package', customer_paise: 8500000,
      attributes: { coverage: 'full_day', hours: 12, photographers: 2, edited_images: 800, retouch: 'advanced_skin_and_detail', album: 'premium_leather_album', delivery_days: 30, raw: true } }],
    addons: [
      { addon_id: 'album', label: 'Printed album', unit: 'per_item', customer_paise: 1800000 },
      { addon_id: 'drone', label: 'Drone shots', unit: 'per_event', customer_paise: 1200000 },
      { addon_id: 'same_day', label: 'Same-day edit slideshow', unit: 'per_event', customer_paise: 900000 },
    ],
    terms: { advance_pct: '30', cancellation: 'moderate', min_notice_days: '7', instant: 'true', travel_model: 'per_km', travel_scope: '50',
      charges: [{ label: 'Travel beyond 50 km', customer_paise: 250000 }] },
  },
  dj: {
    trade_id: 'dj_music', status: 'DRAFT', is_live: false, city: 'Indiranagar, Bengaluru',
    profile: { display_name: 'DJ Arjun Rao', tagline: 'Sangeet nights and receptions that stay on the floor', bio: 'Bollywood, Punjabi and Kannada sets for weddings since 2014.' },
    answers: {
      performance_kinds: ['dj', 'dj_with_live_musician', 'sangeet_night', 'baraat_dj_on_a_vehicle'],
      event_types: ['weddings', 'sangeet', 'receptions', 'private_parties', 'corporate_events'],
      styles: ['bollywood', 'punjabi', 'kannada_south_indian', '90s_bollywood', 'commercial'],
      performers: 2, own_equipment: 'sound_and_lighting', sound_covers: '500_guests', settings: ['indoor_hall', 'open_lawn', 'moving_baraat_vehicle'],
      languages: ['english', 'hindi', 'kannada'], emcee: true,
      formats: ['solo_dj_set', 'dj_dhol'], duration_options: ['3_hours', '4_hours', '5_hours'], setup_minutes: 90, song_requests: true,
      max_hours: 6, min_notice_days: 3,
    },
    rules: [{ kind: 'hour', label: 'Per hour', unit: 'hour', customer_paise: 450000, min_qty: 3, included_hours: 3 }],
    addons: [{ addon_id: 'fog', label: 'Fog / haze machine', unit: 'per_event', customer_paise: 350000 }, { addon_id: 'dhol', label: 'Dhol player', unit: 'per_hour', customer_paise: 300000 }],
    terms: { cancellation: 'flexible', min_notice_days: '3', instant: 'false' },
  },
  venue: {
    trade_id: 'venue', status: 'LIVE', is_live: true, city: 'Basavanagudi, Bengaluru', rating: 4.6, review_count: 61,
    profile: { display_name: 'Sri Lakshmi Kalyana Mantapa', tagline: 'A 1,200-seat mantapa with its own dining hall', bio: 'Family-run since 1987, two minutes from the metro.' },
    answers: {
      venue_name: 'Sri Lakshmi Kalyana Mantapa', venue_type: 'kalyana_mantapa', events: ['weddings', 'receptions', 'naming_ceremony', 'religious_functions'],
      max_capacity: 1200, recommended_capacity: 900, parking: 80, two_wheeler_parking: 250, rooms: 12,
      facilities: ['power_backup', 'air_conditioning', 'bridal_room', 'kitchen', 'dining_hall', 'lift', 'cctv'], accessibility: ['step_free_entry', 'lift'],
      dining_capacity: 450, early_muhurtha: true, overnight_stay: true,
      catering_rule: 'outside_allowed_with_a_fee', decor_rule: 'approved_list_only', sound_cutoff: '22:00', alcohol: false,
      setup_hours: 6, cleanup_hours: 3, setup_charging: 'beyond_the_included_hours',
    },
    catalogue: [
      { item_key: 's1', name: 'Main hall', unit: 'slot', customer_paise: 18500000, attributes: { setting: 'indoor', capacity: 1200, layouts: ['theatre', 'mandap_with_seating'], slots: ['morning', 'full_day'], amenities: ['ac', 'stage'], included_hours: 12 } },
      { item_key: 's2', name: 'Terrace lawn', unit: 'slot', customer_paise: 7500000, attributes: { setting: 'outdoor', capacity: 300, layouts: ['cocktail', 'round_tables'], slots: ['evening'], included_hours: 5 } },
    ],
    terms: { cancellation: 'strict', min_notice_days: '14', instant: 'true', advance_pct: '25' },
  },
  catering: {
    trade_id: 'catering_food', status: 'LIVE', is_live: true, city: 'Malleshwaram, Bengaluru', rating: 4.9, review_count: 112,
    profile: { display_name: 'Annapoorna Caterers', tagline: 'Traditional Karnataka wedding meals, served on banana leaf' },
    answers: { services: ['wedding_catering', 'traditional_wedding_meals', 'buffet_catering'], prep_location: 'at_both_locations', max_guests: 2500, guests_per_day: 4000 },
    menus: [{ name: 'Kalyana bhojana', diet: 'veg', price_model: 'per_guest', customer_paise: 65000, min_guests: 200, max_guests: 2500,
      items: [{ course_group: 'sweets', name: 'Chiroti' }, { course_group: 'sweets', name: 'Holige' }, { course_group: 'rice', name: 'Bisi bele bath' },
        { course_group: 'rice', name: 'Puliyogare' }, { course_group: 'curries', name: 'Majjige huli' }, { course_group: 'curries', name: 'Palya' },
        { course_group: 'curries', name: 'Kosambari' }, { course_group: 'curries', name: 'Gojju' }] },
      { name: 'Reception buffet', diet: 'veg', price_model: 'per_guest', customer_paise: 85000, min_guests: 150,
        items: [{ course_group: 'starters', name: 'Paneer tikka' }, { course_group: 'main_course', name: 'Veg biryani' }, { course_group: 'desserts', name: 'Gulab jamun' }] }],
    terms: { cancellation: 'moderate', min_notice_days: '10', instant: 'true' },
  },
  empty: {
    trade_id: 'mehendi_artist', status: 'DRAFT', is_live: false, profile: { display_name: 'Henna by Noor' }, answers: {}, terms: {},
  },
}

const ANCHOR = {
  profile: {
    stage_name: 'Kavya Rao', role: 'both', years: '6–10', tagline: 'Bilingual anchor for weddings and corporate stages',
    bio: 'Kannada and English hosting for 400+ events, from sangeet nights to dealer meets.',
    languages: [{ name: 'Kannada', level: 'native' }, { name: 'English', level: 'fluent' }, { name: 'Hindi', level: 'conversational' }],
    events: ['sangeet', 'reception', 'conference', 'awards', 'birthday'], events_other: { weddings: ['Bride entry'] },
    styles: ['Funny & entertaining', 'Bilingual / multilingual'], max_audience: 2500, formats: ['Indoor', 'Outdoor', 'Hybrid'],
    video_url: 'https://youtube.com/watch?v=x',
  },
  packages: [
    { tier: 'essential', name: 'Essential', hours: 3, customer_paise: 2500000, inclusions: ['Pre-event planning call'] },
    { tier: 'signature', name: 'Signature', hours: 5, customer_paise: 4000000, inclusions: ['Pre-event planning call', 'Custom script writing & research'] },
    { tier: 'vip', name: 'VIP', hours: 8, customer_paise: 6500000, inclusions: ['Pre-event planning call', 'Custom script writing & research', 'Co-anchor / duo partner'] },
  ],
  pricingModels: [{ name: 'Per hour', price: '₹9,000 /hr', rules: 'Minimum 2 hours' }, { name: 'Per event', price: '₹30,000 per event', rules: 'Up to 4 hours' }],
  extras: [{ name: 'Thematic wardrobe', price: '₹5,000 per event' }, { name: 'Games & audience props', price: '₹2,500 per event' }],
  bookingDetails: [{ label: 'Cancellation', value: 'Moderate' }, { label: 'Travel', value: 'Included within 25 km' }],
}

export default function Scene() {
  const s = new URLSearchParams(location.search).get('s') || 'photo'
  const media = s === 'photo' ? MEDIA : s === 'venue' ? MEDIA.slice(4, 7) : s === 'anchor' ? MEDIA.slice(0, 2) : []
  return (
    <div style={{ width: 390 }} data-scene={s} data-ready>
      {s === 'anchor'
        ? <AnchorProfileCard {...ANCHOR} city="Bengaluru" rating="4.7" reviewCount={38} verified media={media} selectedTier="signature" onPick={() => {}} isLive={false} />
        : <TradeListingCard listing={LISTINGS[s]} media={media} onPick={() => {}} />}
    </div>
  )
}
