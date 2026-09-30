// What goes with what, and what to ask when somebody picks it.
//
// ══════════════════════════════════════════════════════════════════════
// THE PROBLEM
// ══════════════════════════════════════════════════════════════════════
//
// `cuisineMenus.js` is a good catalogue and a bad conversation. It shows the
// whole spread — seven courses, forty-odd dishes — and asks the customer to
// tick. That is exactly how a caterer's order form works and exactly how no
// family in this country actually decides a menu.
//
// A family decides in pairs. Somebody says "chapati", and the immediate next
// sentence is "then what gravy?" — because a chapati with nothing beside it is
// not a dish, it is a problem. Nobody says "chapati" and then independently,
// four courses later, says "paneer butter masala". The two are one decision
// and a form that splits them makes the customer do work the caterer should
// have done.
//
// So: tapping a dish opens what it needs. Chapati opens every gravy in this
// cuisine, with the four that actually go with it named first. Mutton biryani
// opens raita and mirchi ka salan, because a biryani served without them gets
// a comment. Ragi mudde opens bassaru and saaru, because there is exactly one
// right answer and a Kannada family will notice if it is missing.
//
// ══════════════════════════════════════════════════════════════════════
// WHY IT ALSO SHOWS EVERYTHING
// ══════════════════════════════════════════════════════════════════════
//
// The recommendation names four. The sheet then lists every remaining dish in
// that course underneath, expanded on one tap. A recommender that hides the
// rest of the menu is a recommender the customer stops trusting the first time
// their own family's dish is missing from it — and in a country with this many
// regional variations, that is the first time.
//
// So the rule is: lead with what a caterer would put on the plate, and never
// stand between somebody and the rest of the list.
//
// ══════════════════════════════════════════════════════════════════════
// HOW IT IS ORGANISED
// ══════════════════════════════════════════════════════════════════════
//
// By FAMILY, not by dish. "Anything that is a flatbread wants a thick gravy"
// is one rule covering twenty-eight dishes across twelve cuisines; writing it
// out per dish would be twenty-eight chances for one of them to drift.
//
// Suggested companions are given as dish ids and resolved against the cuisine
// actually chosen — an id that does not exist in this cuisine is dropped
// silently rather than rendered as a dead option. That is what lets one rule
// serve Karnataka, Mughlai and Bengali at once: `paneer-butter-masala` appears
// for the cuisines that have it and simply does not for the ones that do not,
// and the course-wide list underneath covers the gap either way.
//
// Ids here are the slugs `cuisineMenus.js` generates from dish names. They are
// checked in `scripts/` — a typo is a suggestion that silently never appears,
// which is the failure mode this comment exists to warn about.

import { COURSES, dishesFor } from './cuisineMenus'

/* ── The families ──────────────────────────────────────────────────────
   Order matters: the first family whose `dishes` contains the tapped id
   wins, so put the specific ones (biryani, mudde) above the general ones
   (rice, flatbread). */

const FAMILIES = [
  {
    id: 'mudde',
    dishes: ['ragi-mudde'],
    line: 'Mudde has one right answer, and every Kannada family in the room knows what it is.',
    prompts: [
      {
        course: 'curries',
        label: 'What is it being eaten with?',
        hint: 'Bassaru or a hot saaru. Anything else and the elders will say so.',
        suggest: ['bassaru', 'saaru-rasam', 'saaru', 'hurali-saaru', 'huli-sambar', 'huli'],
      },
      {
        course: 'accompaniments',
        label: 'And on the side',
        suggest: ['uppinakayi-pickle', 'uppinakayi', 'mosaru-curd', 'mosaru', 'tuppa-ghee', 'tuppa'],
      },
    ],
  },
  {
    id: 'biryani',
    dishes: [
      'mutton-biryani', 'chicken-biryani', 'veg-biryani', 'fish-biryani', 'veg-dum-biryani',
      'subz-dum-biryani', 'chettinad-chicken-biryani', 'hyderabadi-chicken-dum-biryani',
      'mutton-dum-biryani', 'malabar-chicken-biryani', 'thalassery-mutton-biryani',
      'murgh-dum-biryani', 'gosht-dum-biryani', 'chingri-pulao',
    ],
    line: 'A biryani served without its two companions gets a comment. Every time.',
    prompts: [
      {
        course: 'accompaniments',
        label: 'The two that must go with it',
        hint: 'Raita and a salan. This is not optional in most kitchens.',
        suggest: ['mirchi-ka-salan', 'boondi-raita', 'burhani-raita', 'raita', 'mixed-veg-raita', 'onion-raita', 'laccha-onion', 'kachumber', 'kachumber-salad', 'onion-lachha'],
      },
      {
        course: 'curries',
        label: 'A gravy alongside, if the crowd is large',
        hint: 'Not everybody eats biryani. A dal or a paneer gravy covers the rest of the table.',
        suggest: ['dal-tadka', 'dal-makhani', 'paneer-butter-masala', 'mixed-vegetable-kurma', 'kadai-paneer'],
      },
      {
        course: 'sweets',
        label: 'And after',
        suggest: ['double-ka-meetha', 'qubani-ka-meetha', 'phirni', 'shahi-tukda', 'gulab-jamun', 'jamoon'],
      },
    ],
  },
  {
    id: 'flatbread',
    dishes: [
      'chapati', 'poori', 'roti', 'tandoori-roti', 'butter-naan', 'laccha-paratha',
      'missi-roti', 'roomali-roti', 'warqi-paratha', 'sheermal', 'taftan',
      'malabar-parotta', 'parotta', 'akki-roti', 'jolada-rotti', 'thepla', 'bhakri',
      'bhakri-jowar-or-bajra', 'bajra-rotla', 'luchi', 'radhaballabhi', 'puran-poli',
      'kori-rotti-veg', 'idiyappam', 'appam', 'neer-dosa', 'pundi-rice-dumplings',
      'kadubu', 'puttu', 'pesarattu',
    ],
    line: 'This needs something to go with it — that is the next decision, and it is the one guests remember.',
    prompts: [
      {
        course: 'curries',
        label: 'Which gravies?',
        hint: 'Two is the usual answer — one rich, one lighter. Pick as many as you like.',
        suggest: [
          'paneer-butter-masala', 'dal-tadka', 'dal-makhani', 'mixed-vegetable-kurma',
          'kadai-paneer', 'shahi-paneer', 'palak-paneer', 'chana-masala', 'malai-kofta',
          'coconut-kurma', 'veg-kurma', 'gojju', 'gojju-mango-or-tomato', 'kootu',
          'butter-chicken', 'kadai-chicken', 'chicken-gassi', 'meen-gassi-fish-curry',
          'vegetable-stew', 'nadan-kozhi-curry', 'chicken-chettinad', 'aloo-gobi',
          'bhindi-masala', 'mix-veg-jalfrezi',
        ],
      },
      {
        course: 'accompaniments',
        label: 'On the side',
        hint: 'Pickle, curd, a salad. Cheap, and their absence is noticed before anything else.',
        suggest: [
          'raita', 'onion-raita', 'mixed-veg-raita', 'green-salad', 'salad', 'kachumber',
          'papad', 'appalam', 'pappadam', 'papad-roasted-or-fried', 'masala-papad',
          'uppinakayi-pickle', 'pickle', 'mixed-pickle', 'mint-chutney', 'green-chutney',
          'mosaru-curd', 'curd', 'thayir-curd', 'perugu-curd',
        ],
      },
    ],
  },
  {
    id: 'ricebath',
    dishes: [
      'bisi-bele-bath', 'vangi-bath', 'puliyogare', 'puliyodarai', 'pulihora',
      'chitranna-lemon-rice', 'lemon-rice', 'coconut-rice', 'masale-bhat', 'khichuri',
      'khichdi-with-kadhi', 'ven-pongal', 'sambar-sadam',
    ],
    line: 'A rice bath is a complete dish on its own — what it needs is the crunch and the cool beside it.',
    prompts: [
      {
        course: 'accompaniments',
        label: 'The things that go with it',
        hint: 'Kosambari, happala, a spoon of curd. This is what makes it a meal rather than a plate of rice.',
        suggest: [
          'sandige-happala', 'happala-sandige', 'sandige', 'appalam', 'papad',
          'gasagase-carrot-kosambari', 'hesarubele-kosambari', 'kosambari-two-kinds',
          'mosaru-curd', 'mosaru', 'curd', 'thayir-curd', 'raita',
          'uppinakayi-pickle', 'uppinakayi', 'nimbe-uppinakayi', 'tuppa-ghee', 'tuppa',
          'beans-palya', 'cabbage-palya', 'palya-three-kinds',
        ],
      },
      {
        course: 'sweets',
        label: 'To finish',
        suggest: ['obbattu-holige', 'obbattu-with-tuppa', 'mysore-pak', 'kesari-bath', 'payasa-semiya-or-shavige', 'shavige-payasa', 'payasam'],
      },
    ],
  },
  {
    id: 'plainrice',
    dishes: [
      'steamed-rice', 'boiled-rice', 'steamed-basmati', 'jeera-rice', 'ghee-rice',
      'steamed-rice-saaru', 'kuthari-choru-red-rice', 'varan-bhaat', 'ghee-bhaat',
      'chicken-ghee-rice', 'basanti-pulao', 'veg-pulao', 'vegetable-pulao',
      'kashmiri-pulao', 'zafrani-pulao', 'bagara-rice', 'vegetable-stew-rice',
      'malvani-chicken-rassa-rice', 'mutton-kolhapuri-rice', 'rajma-chawal',
    ],
    line: 'Plain rice is the base. What goes over it is the meal.',
    prompts: [
      {
        course: 'curries',
        label: 'What is going over it?',
        hint: 'A saaru or rasam first, then a huli or sambar, then anything richer.',
        suggest: [
          'saaru-rasam', 'saaru', 'rasam', 'charu-rasam', 'huli-sambar', 'huli', 'sambar',
          'dalitoy', 'pappu-dal', 'parippu-curry', 'dal-tadka', 'dal-makhani', 'gujarati-dal',
          'cholar-dal', 'panchmel-dal', 'amti', 'majjige-huli', 'mor-kuzhambu',
          'vatha-kuzhambu', 'kootu', 'aviyal', 'avial', 'olan', 'erissery',
          'mutton-curry', 'chicken-gassi', 'meen-kuzhambu', 'macher-jhol', 'kosha-mangsho',
        ],
      },
      {
        course: 'accompaniments',
        label: 'And beside the leaf',
        suggest: [
          'beans-palya', 'cabbage-palya', 'beans-poriyal', 'thoran-cabbage-or-beans',
          'palya-three-kinds', 'gasagase-carrot-kosambari', 'hesarubele-kosambari',
          'kosambari-two-kinds', 'sandige-happala', 'appalam', 'papad', 'pappadam',
          'uppinakayi-pickle', 'uppinakayi', 'pickle', 'avakaya-pickle', 'naranga-achar',
          'mosaru-curd', 'mosaru', 'curd', 'perugu-curd', 'tuppa-ghee', 'tuppa', 'ghee',
        ],
      },
    ],
  },
  {
    id: 'curdrice',
    dishes: ['curd-rice'],
    line: 'Curd rice closes a South Indian meal. It goes out last, and it goes out with pickle.',
    prompts: [
      {
        course: 'accompaniments',
        label: 'What goes with it',
        suggest: ['uppinakayi-pickle', 'uppinakayi', 'nimbe-uppinakayi', 'avakaya-pickle', 'appe-midi-pickle', 'sandige-happala', 'sandige', 'happala-sandige'],
      },
    ],
  },
  {
    id: 'dalbaati',
    dishes: ['dal-baati'],
    line: 'Dal baati is three things or it is nothing: the baati, the panchmel dal, and the churma.',
    prompts: [
      { course: 'curries', label: 'The dal', suggest: ['panchmel-dal', 'gatte-ki-sabzi', 'ker-sangri', 'kadhi'] },
      { course: 'sweets', label: 'And the churma', suggest: ['churma-laddu', 'mohanthal', 'ghevar', 'malpua-with-rabri'] },
    ],
  },
  {
    id: 'starter',
    dishes: [], // matched by course, see `pairingFor`
    line: 'Starters go round while people are still arriving — they want something to dip into.',
    prompts: [
      {
        course: 'accompaniments',
        label: 'Chutneys and dips',
        hint: 'Passed with the starters, not left on a table.',
        suggest: [
          'coconut-chutney', 'mint-chutney', 'pudina-chutney', 'green-chutney',
          'green-chutney-no-garlic', 'meetha-chutney', 'garlic-chutney', 'lehsun-chutney',
          'schezwan-chutney', 'chilli-vinegar', 'soy-garlic-dip', 'assorted-dips',
          'assorted-chutneys', 'tomato-khejur-chutney',
        ],
      },
      {
        course: 'welcome',
        label: 'And something in their hand',
        hint: 'A drink at the door is the cheapest hospitality there is.',
        suggest: [
          'panaka-jaggery-lemon', 'majjige-spiced-buttermilk', 'majjige', 'buttermilk',
          'tender-coconut-water', 'tender-coconut', 'nimbe-pani-fresh-lime', 'fresh-lime',
          'nimbu-pani', 'masala-chaas', 'chaas', 'jal-jeera', 'aam-panna',
          'mocktail-bar-three-mocktails', 'fresh-juice-counter', 'filter-coffee-tea',
        ],
      },
    ],
  },
]

/* ── Course-level fallbacks ────────────────────────────────────────────
   A dish nobody wrote a rule for still opens something useful, because a
   sheet that sometimes says "no suggestions" teaches people not to tap.
   Keyed by the course the dish came from. */

const BY_COURSE = {
  welcome: {
    line: 'A drink in the hand at the door. It costs almost nothing and it is the first thing a guest feels.',
    prompts: [{ course: 'starters', label: 'Something passed round with it', suggest: [] }],
  },
  starters: null, // handled by the 'starter' family above
  mains: {
    line: 'This is the base of the meal. What goes with it is the next decision.',
    prompts: [
      { course: 'curries', label: 'What is it eaten with?', suggest: [] },
      { course: 'accompaniments', label: 'On the side', suggest: [] },
    ],
  },
  curries: {
    line: 'A gravy needs something under it.',
    prompts: [
      { course: 'mains', label: 'Rice or bread with this?', hint: 'One of each is the safe answer for a mixed crowd.', suggest: [] },
      { course: 'accompaniments', label: 'And on the side', suggest: [] },
    ],
  },
  accompaniments: {
    line: 'Good. These are the small things guests notice by their absence.',
    prompts: [{ course: 'mains', label: 'What is it going beside?', suggest: [] }],
  },
  sweets: {
    line: 'The last thing they eat, and the one they mention on the way out.',
    prompts: [
      { course: 'counters', label: 'Serve it live?', hint: 'A chef making it in front of the queue turns a sweet into an attraction.', suggest: ['live-obbattu-counter', 'live-jalebi-counter', 'ice-cream-counter', 'live-chiroti-counter', 'kulfi-counter', 'live-rosogolla-counter'] },
    ],
  },
  counters: {
    line: 'A live counter is where the queue forms and the photographs happen.',
    prompts: [{ course: 'starters', label: 'What else is going round?', suggest: [] }],
  },
}

/**
 * What to open when this dish is tapped.
 *
 * Returns `{ line, prompts }` where each prompt is a course, a heading, and
 * the ordered ids to lead with. Suggestions are NOT filtered here — the sheet
 * resolves them against the cuisine and the diet, because both can change
 * after this is computed.
 */
export function pairingFor(dish, courseId) {
  if (!dish) return null
  if (courseId === 'starters') {
    const starters = FAMILIES.find(f => f.id === 'starter')
    return { id: 'starter', line: starters.line, prompts: starters.prompts }
  }
  const family = FAMILIES.find(f => f.dishes.includes(dish.id))
  if (family) return { id: family.id, line: family.line, prompts: family.prompts }
  const fallback = BY_COURSE[courseId]
  if (!fallback) return null
  return { id: `course_${courseId}`, line: fallback.line, prompts: fallback.prompts }
}

/**
 * Resolve one prompt against the cuisine actually chosen.
 *
 * `lead` is the suggested dishes that genuinely exist in this cuisine, in the
 * order the rule named them. `rest` is everything else in that course. The
 * split is the whole design: lead with a caterer's answer, and never hide the
 * catalogue behind it.
 */
export function resolvePrompt(prompt, cuisine, { vegOnly = false } = {}) {
  const available = dishesFor(cuisine, prompt.course, { vegOnly })
  const byId = new Map(available.map(d => [d.id, d]))
  const lead = (prompt.suggest ?? []).map(id => byId.get(id)).filter(Boolean)
  const leadIds = new Set(lead.map(d => d.id))
  // No rule for this course, or none of its suggestions exist here: the
  // catalogue's own order is already most-recommended-first, so the top few
  // are a better answer than nothing.
  const head = lead.length ? lead : available.slice(0, 4)
  const headIds = new Set(head.map(d => d.id))
  return {
    course: COURSES.find(c => c.id === prompt.course) ?? { id: prompt.course, label: prompt.course },
    label: prompt.label,
    hint: prompt.hint ?? null,
    lead: head,
    rest: available.filter(d => !headIds.has(d.id) && !leadIds.has(d.id)),
  }
}

/* ══════════════════════════════════════════════════════════════════════
   "Anything special?"
   ══════════════════════════════════════════════════════════════════════

   The second half of the sheet, and the half that does the emotional work.

   A menu form can hold what is being served. It cannot hold "my mother-in-law
   cannot take garlic", "the Jain family are six people and they will not eat
   from the same counter", "less chilli, the children are small", "my father is
   diabetic and will still eat three sweets if you let him". Those are the
   sentences a family says to a caterer in the first two minutes of the
   conversation, and until now this app had a 500-character box at the bottom
   of a long page for all of them.

   So they are offered as chips, at the moment the dish they concern is being
   chosen, and each one appends a plain sentence to the kitchen note. A chip is
   easier than a sentence, and a note in the caterer's words is more useful
   than a tick in a database.

   `scope` decides where a chip appears: 'always' on every sheet, or a course
   id for the ones that only make sense there. */

export const SPECIAL_REQUESTS = [
  { id: 'less_spice', scope: 'always', emoji: '🌶️', label: 'Less spice', note: 'Keep the spice mild across the menu — children and elders eating.' },
  { id: 'no_onion_garlic', scope: 'always', emoji: '🧅', label: 'No onion or garlic', note: 'No onion or garlic in any dish (madi / satvik).' },
  { id: 'jain_counter', scope: 'always', emoji: '🪷', label: 'A separate Jain counter', note: 'A separate Jain counter — no root vegetables, cooked and served apart.' },
  { id: 'diabetic', scope: 'always', emoji: '🩺', label: 'Something for diabetics', note: 'Include a sugar-free sweet and an unsweetened drink for diabetic guests.' },
  { id: 'nut_allergy', scope: 'always', emoji: '🥜', label: 'A nut allergy in the family', note: 'Nut allergy in the family — label anything containing nuts, and keep one sweet nut-free.' },
  { id: 'elders_soft', scope: 'always', emoji: '🧓', label: 'Softer food for the elders', note: 'Cook the rice and vegetables softer for elderly guests; keep one dish very lightly spiced.' },
  { id: 'kids_plain', scope: 'always', emoji: '🧒', label: 'Something plain for the children', note: 'Something plain for the children — curd rice, chapati and a mild vegetable.' },
  { id: 'jaggery', scope: 'sweets', emoji: '🟤', label: 'Jaggery, not sugar', note: 'Use jaggery rather than sugar in the sweets where the recipe allows it.' },
  { id: 'extra_ghee', scope: 'mains', emoji: '🧈', label: 'Ghee served separately', note: 'Serve ghee separately at the leaf rather than pre-mixed.' },
  { id: 'hot_rotis', scope: 'mains', emoji: '🔥', label: 'Rotis made fresh at the counter', note: 'Rotis and pooris to be made fresh at a live counter, not stacked in advance.' },
  { id: 'family_recipe', scope: 'always', emoji: '📝', label: 'We have a family recipe', note: 'We have a family recipe for one dish — we will share it with the cook before the day.' },
  { id: 'second_serving', scope: 'always', emoji: '🍽️', label: 'Plan for second helpings', note: 'Plan quantities for second and third helpings — this crowd eats well.' },
  { id: 'no_beef_pork', scope: 'always', emoji: '🚫', label: 'No beef or pork', note: 'No beef or pork anywhere on the menu or in the kitchen used.' },
  { id: 'separate_veg', scope: 'always', emoji: '🥬', label: 'Veg cooked completely separately', note: 'Vegetarian food to be cooked, stored and served completely separately from non-veg.' },
]

/** The chips worth showing on this particular sheet. */
export function specialsFor(courseId) {
  return SPECIAL_REQUESTS.filter(s => s.scope === 'always' || s.scope === courseId)
}
