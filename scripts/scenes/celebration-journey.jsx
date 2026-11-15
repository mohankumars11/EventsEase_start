/**
 * The Personal Celebrations journey, photographed screen by screen.
 *
 *   node scripts/shoot-components.mjs out.png --scenes scripts/scenes/celebration-journey.jsx --query screen=plan
 *
 * `?screen=` picks one: details | plan | addons | toolkit | timeline.
 *
 * ── Why a scene and not a route ───────────────────────────────────────
 * The customer app gates everything behind onboarding — a saved location
 * and a signed-in user — so a cold browser on /o/first-birthday renders
 * the carousel, not the screen. These are the real components out of
 * src/customer, mounted with the plan a real customer would have after
 * Event Details: a first birthday at home, 50 guests, 12 children, a
 * jungle theme, a caterer, and clean-up afterwards.
 *
 * Nothing is faked on the way in except the session. The blueprint, the
 * engine, the questions, the toolkit and the words are the shipped ones,
 * so what the photograph shows is what the app does. The price range is
 * the one honest gap: the harness points at a stub Supabase project, so
 * `planEstimate` finds no masters and the summary says "On request" —
 * which is exactly what it says in the app when nobody is listed nearby.
 */
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import { AuthProvider } from '../../src/context/AuthContext'
import { PlanProvider } from '../../src/customer/state/PlanContext'
import EventFlow from '../../src/customer/screens/EventFlow'
import EventPlan from '../../src/customer/screens/EventPlan'
import '../../src/customer/cx.css'

const ANSWERS = {
  child_name: 'Aarav', theme: 'jungle', kids: 12, adults: 38,
  food_way: 'catering', diet: 'both', cake: 'order',
  activities: ['games', 'storyteller'], baby_comfort: ['quiet', 'feeding'],
  photos: 'yes', share_photos: 'yes', return_gifts: 'yes', transport: 'no', cleanup: 'yes',
}

const EVENT = {
  occasionId: 'first-birthday', date: '2026-12-20', time: '17:00', hours: 4, guests: 50,
  venue: 'have', venueKind: null, venueChoice: 'home', venueOther: '', budget: '50k-1l',
  answers: ANSWERS, context: { venueType: 'home', budget: 'tight' },
}

const PLACE = { area: 'Jayanagar', lat: 12.9254, lng: 77.5832, city: 'Bengaluru', address: 'Jayanagar, Bengaluru' }

/* PlanProvider loads from localStorage on first render, so the plan has
   to be in place before it mounts — hence module scope, not an effect. */
function seed(withAnswers = true) {
  try {
    localStorage.setItem('sbm.cx.plan.v1', JSON.stringify({
      event: withAnswers ? EVENT : { ...EVENT, answers: {} },
      place: PLACE, picks: {}, answers: withAnswers ? { 'first-birthday': ANSWERS } : {},
      needs: {}, basket: [], saved: [], bookings: [],
    }))
    localStorage.setItem('sbm.cx.where.v1', JSON.stringify(PLACE))
    localStorage.setItem('sbm.cx.how.first-birthday', 'each')
  } catch { /* storage off */ }
}

/* A second celebration, so the two can be put side by side: a naming
   ceremony with the priest the family asked for, no theme, no games. */
const NAMING = {
  answers: {
    baby_name: 'Ira', format: 'home', priest: 'yes', ritual_language: 'kannada', ritual_kit: 'no',
    timing_given: 'between 10:30 and 11:15', food_way: 'catering', diet: 'veg',
    baby_comfort: ['quiet', 'feeding'], return_gifts: 'yes', photos: 'yes', transport: 'yes', cleanup: 'yes',
  },
  event: {
    occasionId: 'naming-ceremony', date: '2026-12-14', time: '10:00', hours: 4, guests: 60,
    venue: 'have', venueKind: null, venueChoice: 'home', venueOther: '', budget: '50k-1l',
    context: { venueType: 'home' },
  },
}

/* A wedding function, to show Category 2 running on the same engine:
   a Haldi where the family asked for no priest and leads it themselves. */
const HALDI = {
  answers: {
    for_whom: 'bride', format: 'traditional', lead: 'elders', priest: 'no',
    colour: 'yellow', dress_code: 'colour', food_way: 'catering', diet: 'veg',
    music: 'traditional', wash: 'yes', makeup: 'yes', photos: 'yes',
    photo_limits: 'Nothing during the blessing itself', transport: 'no', cleanup: 'yes',
  },
  event: {
    occasionId: 'haldi-ceremony', date: '2026-12-11', time: '09:00', hours: 4, guests: 80,
    venue: 'have', venueKind: null, venueChoice: 'home', venueOther: '', budget: '1l-1.5l',
    context: { venueType: 'home' },
  },
}

/* Category 4 — a school occasion, to prove the campus questions and the
   consent-gated photography reach the same plan screen. */
const ANNUAL = {
  answers: {
    classes: 'whole', parents: 'all', place: 'hall', items: '20', stage: 'build',
    av: ['mics', 'speakers', 'screen'], costumes: 'rent', stage_makeup: 'yes', backstage: 'yes',
    chief_guest: 'yes', seating: 'yes', awards: ['certificates', 'trophies'],
    photos: 'school', video: 'yes', refreshments: 'snacks', cleanup: 'yes',
  },
  event: {
    occasionId: 'school-annual-day', date: '2026-12-18', time: '17:00', hours: 4, guests: 600,
    venue: 'have', venueKind: null, venueChoice: 'have', venueOther: '', budget: '1l-1.5l',
    context: { venueType: 'venue' },
  },
}

/* Category 6 — a corporate occasion, to prove the confidentiality and
   hospitality questions reach the same plan screen. */
const LAUNCH = {
  answers: {
    attendees: '250', audience: 'mixed', place: 'venue', reveal: 'stage', demo: 'yes',
    press: 'yes', embargo: 'yes', av: ['mics', 'screen', 'stage'], seating: 'theatre',
    hospitality: 'breaks', branding: 'yes', photos: 'both', registration: 'yes', gifts: 'yes',
  },
  event: {
    occasionId: 'product-launch', date: '2027-01-22', time: '18:30', hours: 3, guests: 250,
    venue: 'need', venueKind: null, venueChoice: 'need', venueOther: '', budget: '5l-10l',
    context: { venueType: 'venue' },
  },
}

/* Category 9 — a sporting occasion, to prove the `essential` row (the
   lifeguard) and the medical questions reach the plan screen. */
const SWIM = {
  answers: {
    players: '300', spectators: '300', place: 'pool', events: ['freestyle', 'relay', 'age'],
    lifeguard: 'arrange', lanes: '8', timing: 'electronic',
    medical: ['firstaid', 'ambulance'], water: 'points', officials: 'yes', registration: 'advance',
    declarations: 'yes', equipment: ['play', 'scoreboard', 'seating', 'timing'],
    awards: ['medals', 'trophies'], av: ['pa', 'screen'], security: 'yes',
    photos: 'yes', food: 'snacks', signage: 'yes',
  },
  event: {
    occasionId: 'swimming-competition', date: '2027-02-14', time: '08:00', hours: 8, guests: 300,
    venue: 'have', venueKind: null, venueChoice: 'have', venueOther: '', budget: '1l-1.5l',
    context: { venueType: 'venue' },
  },
}

/* Category 10 — a food occasion, to prove the food-safety questions and
   the allergen add-ons reach the plan screen. */
const FOODFEST = {
  answers: {
    eaters: '1500', place: 'ground', service: 'stalls', stalls: '25',
    cuisines: ['regional', 'street', 'desserts'], diet: 'separate', allergens: 'written',
    kitchen: 'live', licence: 'yes', drinks: 'soft', waste: 'donate',
    av: ['music', 'mics', 'lights'], seating: 'yes', photos: 'yes', signage: 'yes',
    security: 'yes', cleanup: 'yes',
  },
  event: {
    occasionId: 'food-festival', date: '2027-03-06', time: '16:00', hours: 8, guests: 1500,
    venue: 'need', venueKind: null, venueChoice: 'need', venueOther: '', budget: '5l-10l',
    context: { venueType: 'outdoor' },
  },
}

/* Category 16 — on water, to prove the licensed-operator questions and
   the `essential` life-jacket row reach the plan screen. */
const YACHT = {
  answers: {
    guests_count: '40', operator: 'confirmed', weather_plan: 'cover',
    vessel_capacity: 'confirmed_c', duration_y: 'half_y', swimming: 'yes',
    alcohol_y: 'yes', diet: 'both', allergies: 'written', food: 'buffet_o',
    seating: 'yes', photos: 'yes', av: ['music_av', 'pa'], decor: 'focal',
    transfers: 'yes',
  },
  event: {
    occasionId: 'luxury-yacht-party', date: '2027-01-16', time: '15:00', hours: 5, guests: 40,
    venue: 'have', venueKind: null, venueChoice: 'have', venueOther: '', budget: '5l-10l',
    context: { venueType: 'outdoor' },
  },
}

/* Category 17 — a hybrid event, to prove the platform, consent and
   accessibility questions reach the plan screen. */
const HYBRID = {
  answers: {
    online_count: '600', platform: 'have', room: 'big', broadcast_from: 'venue_o',
    speakers: '8', remote_speakers: 'yes', record: 'share', registration: 'register',
    access: ['captions', 'transcript'], interaction: ['qa', 'polls_i'],
    tech: ['cameras', 'switcher', 'screens', 'graphics'], backup: ['internet', 'power_b'],
    room_food: 'meal_r', branding: 'yes',
  },
  event: {
    occasionId: 'hybrid-conference', date: '2027-02-04', time: '09:30', hours: 8, guests: 300,
    venue: 'need', venueKind: null, venueChoice: 'need', venueOther: '', budget: '5l-10l',
    context: { venueType: 'venue' },
  },
}

/* Category 18 — a private dinner, to prove the flame question defaults
   to enclosed candles and the privacy note reaches the plan screen. */
const CANDLE = {
  answers: {
    guests_count: '6', place: 'home', privacy: 'total', mood: 'romantic_m',
    food: 'chef', diet: 'both', drinks: 'wine', music: 'live_m',
    decor: 'focal_p', flame: 'enclosed', photos: 'short', service: 'yes',
  },
  event: {
    occasionId: 'candlelight-dinner', date: '2027-01-09', time: '20:00', hours: 3, guests: 6,
    venue: 'have', venueKind: null, venueChoice: 'have', venueOther: '', budget: '25k-50k',
    context: { venueType: 'home' },
  },
}

const Q = new URLSearchParams(location.search)
const SCREEN = Q.get('screen') ?? 'plan'
const OCCASION = Q.get('occasion') ?? 'first-birthday'
/* Every scripted occasion, so adding one is an entry rather than a branch. */
const SCENES = { 'haldi-ceremony': HALDI, 'naming-ceremony': NAMING, 'school-annual-day': ANNUAL, 'product-launch': LAUNCH, 'swimming-competition': SWIM, 'food-festival': FOODFEST, 'luxury-yacht-party': YACHT, 'hybrid-conference': HYBRID, 'candlelight-dinner': CANDLE }
const SCENE = SCENES[OCCASION]
if (SCENE) {
  try {
    localStorage.setItem('sbm.cx.plan.v1', JSON.stringify({
      event: { ...SCENE.event, answers: SCENE.answers }, place: PLACE, picks: {},
      answers: { [OCCASION]: SCENE.answers }, needs: {}, basket: [], saved: [], bookings: [],
    }))
    localStorage.setItem('sbm.cx.where.v1', JSON.stringify(PLACE))
    localStorage.setItem(`sbm.cx.how.${OCCASION}`, 'each')
  } catch { /* storage off */ }
} else {
  seed(SCREEN !== 'details-empty')
}

const ROUTE = SCREEN === 'details' ? `/o/${OCCASION}` : `/o/${OCCASION}/plan`

/* The add-ons, the toolkit detail and the timeline are below the fold on
   a 430-wide phone; the capture is full-height, so they are all in the
   one shot. `--query screen=…` only chooses which route is mounted. */
export default function Scenes() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <PlanProvider>
            <div className="cx" data-customer-app>
              {/* Real routes, so useParams gives the screens their occasion. */}
              <Routes>
                <Route path="/o/:occasionId" element={<EventFlow />} />
                <Route path="/o/:occasionId/plan" element={<EventPlan />} />
              </Routes>
            </div>
          </PlanProvider>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
