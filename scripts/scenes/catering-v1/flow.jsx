/**
 * The real ListingOnboardingFlow for Catering & Food, embedded, filled with a
 * realistic caterer — including Badam Alva carried over from the old form
 * with its "per counter" price, so the review card shows.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import ListingOnboardingFlow from '../../../src/components/vendor/listing/ListingOnboardingFlow'

const P = 100
export const SAMPLE = {
  _schema: 2,
  basics: { display_name: 'Annapoorna Caterers', tagline: 'Udupi & Karnataka wedding feasts since 1998', bio: 'Third-generation Udupi cooks. We cater weddings, upanayanas and corporate lunches across Bengaluru.', legal_name: 'Annapoorna Catering Services' },
  location: { lat: 12.925, lng: 77.5938, source: 'gps', confirmed: true, formatted_address: 'Jayanagar 4th Block, Bengaluru', locality: 'Jayanagar', city: 'Bengaluru', postal_code: '560011', state: 'Karnataka', travel_scope: '50' },
  cuisines: ['ka_udupi', 'ka_traditional', 'ka_brahmin_veg', 'ka_wedding', 'sp_pure_veg', 'sp_jain', 'custom:Havyaka cuisine'],
  answers: { services: ['Wedding catering', 'Traditional wedding meals', 'Corporate catering', 'Live food counters'], prep_location: 'At both locations',
    service_styles: ['Traditional banana-leaf meal', 'Buffet', 'Live cooking'], service_area: '50',
    max_guests: 1200, guests_per_day: 2000, events_per_day: 2, staff: 45, staff_per_100: 4, service_hours: 4, min_billable_guests: 150, child_policy: 'per_menu',
    fssai: { type: 'state_licence', number: '11219999000123', expiry: '2027-03-31', premises: 'Central kitchen, 9th Cross, Jayanagar', responsible: 'K. Raghavendra Rao' },
    declarations: ['dietary_accurate', 'allergens_shared', 'hygiene', 'temperature', 'special_requests'] },
  dishes: [
    { item_key: 'menu_lx1', name: 'Badam Alva', category_id: 'ds_halwa', diet: 'veg', serving: { qty: 100, unit: 'g', legacy_text: '100 g' }, allergens: ['Nuts (tree nuts)', 'Milk / dairy'], allergen_note: 'Almonds, milk, ghee', menu_eligible: true, standalone: { on: false }, active: true, pricing_status: 'needs_review', legacy: { counter_price_paise: 4500 * P, needs_review: true } },
    { item_key: 'd2', name: 'Bisi Bele Bath', master_dish_id: 'SBM-MD-bisi-bele-bath', category_id: 'rc_flavoured', cuisine_ids: ['ka_traditional'], diet: 'veg', serving: { qty: 200, unit: 'g' }, allergens: ['Milk / dairy'], menu_eligible: true, standalone: { on: true, unit: 'per_kg', price_paise: 380 * P, min_qty: 5 }, active: true },
    { item_key: 'd3', name: 'Kosambari', category_id: 'ac_kosambari', diet: 'veg', serving: { qty: 60, unit: 'g' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
    { item_key: 'd4', name: 'Majjige Huli', category_id: 'ml_component', diet: 'veg', serving: { qty: 150, unit: 'ml' }, allergens: ['Milk / dairy', 'Coconut'], menu_eligible: true, standalone: { on: false }, active: true },
    { item_key: 'd5', name: 'Holige', category_id: 'ds_holige', diet: 'veg', serving: { qty: 1, unit: 'piece' }, allergens: ['Gluten / wheat'], menu_eligible: true, standalone: { on: true, unit: 'per_piece', price_paise: 35 * P, min_qty: 50 }, active: true },
    { item_key: 'd6', name: 'Masala Dosa', category_id: 'bf_dosa', diet: 'veg', serving: { qty: 1, unit: 'piece' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
    { item_key: 'd7', name: 'Saaru', category_id: 'sp_rasam', diet: 'veg', serving: { qty: 150, unit: 'ml' }, allergens: [], menu_eligible: true, standalone: { on: false }, active: true },
    { item_key: 'd8', name: 'Mosaranna', category_id: 'rc_curd', diet: 'veg', serving: { qty: 150, unit: 'g' }, allergens: ['Milk / dairy'], menu_eligible: true, standalone: { on: false }, active: true },
  ],
  menus: [
    { menu_key: 'm1', name: 'Udupi Wedding Lunch', description: 'Banana-leaf meal, 18 items', diet: 'veg', cuisine_ids: ['ka_udupi'], event_types: ['Weddings', 'Receptions'], min_guests: 150, max_guests: 1200, lead_days: 7,
      price_model: 'per_person', price_paise: 520 * P, child_price_paise: 300 * P, included_services: ['serving_staff', 'buffet_setup', 'water_station'], status: 'active',
      items: [{ dish_key: 'd3', course_group: 'salads', sort: 0, included: true }, { dish_key: 'd2', course_group: 'rice_biryani', sort: 1, included: true },
        { dish_key: 'd4', course_group: 'meal_components', sort: 2, included: true }, { dish_key: 'd7', course_group: 'soups', sort: 3, included: true },
        { dish_key: 'd8', course_group: 'rice_biryani', sort: 4, included: true }, { dish_key: 'd5', course_group: 'desserts', sort: 5, included: true },
        { dish_key: 'menu_lx1', course_group: 'desserts', sort: 6, included: false, extra_paise: 40 * P }] },
    { menu_key: 'm2', name: 'Corporate Lunch Box', diet: 'veg', min_guests: 50, price_model: 'fixed', price_paise: 30000 * P, fixed_scope: { guests: 100, hours: 2 }, extra_guest_paise: 280 * P, status: 'active',
      items: [{ dish_key: 'd2', course_group: 'rice_biryani', sort: 0, included: true }, { dish_key: 'd8', course_group: 'rice_biryani', sort: 1, included: true }] },
  ],
  counters: [{ counter_key: 'c1', name: 'Live Dosa Counter', counter_type: 'Dosa Counter', dish_keys: ['d6'], price_model: 'per_event', price_paise: 9000 * P, duration_hours: 3, included_servings: 250,
    extra_serving_paise: 35 * P, extra_hour_paise: 2500 * P, chefs: 2, available_qty: 2, equipment: '2 dosa tawas, gas', power_water: '1 water point', indoor_outdoor: 'both', status: 'active' }],
  packages: [{ key: 'pkg_classic', name: 'Classic Udupi Wedding', tier: 'SIGNATURE', menu_keys: ['m1'], counter_keys: ['c1'], included_addons: ['crockery'], included_services: ['serving_staff', 'buffet_setup'],
    exclusions: 'Venue, decoration', guest_min: 300, guest_max: 800, hours: 5, staff: 20, price_model: 'per_guest', price_paise: 650 * P, extra_guest_paise: 600 * P, status: 'active' }],
  extras: [{ id: 'extra_staff', label: 'Additional serving staff', unit: 'per_staff_hour', on: true, take_home_paise: 250 * P },
    { id: 'crockery', label: 'Crockery and cutlery', unit: 'per_guest', on: true, take_home_paise: 25 * P },
    { id: 'transport', label: 'Food transport', unit: 'per_trip', on: true, take_home_paise: 1800 * P },
    { id: 'premium_crockery', label: 'Premium crockery', unit: 'per_guest', on: false }],
  availability: { min_notice_days: 7, horizon_months: 12, menu_freeze_days: 5, guest_confirm_days: 3, setup_minutes: 90, teardown_minutes: 60, travel_buffer_minutes: 60, travel_model: 'per_km', travel_per_km_paise: 25 * P },
  booking: { instant: true, advance_pct: 30, cancellation: 'moderate', custom_quotes: true, quote_hours: 12 },
}

export default function Flow({ stage = 'cat_profile' }) {
  return (
    <MemoryRouter>
      <div style={{ width: 390, margin: '0 auto' }}>
        <ListingOnboardingFlow embedded trade="Catering & Food" vendorId={null} initialStep={stage} initialAnswers={SAMPLE} />
      </div>
    </MemoryRouter>
  )
}
