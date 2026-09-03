/**
 * Questions for one OFFERING, not for a whole trade.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE TRADE-LEVEL QUESTIONS WERE NOT ENOUGH
 * ══════════════════════════════════════════════════════════════════════
 *
 * data/partnerSpecs.js asks one set of questions per trade, which is
 * right for a photographer — candid or posed is the same question whether
 * they are shooting a wedding or a naming ceremony.
 *
 * It is wrong for catering, and it showed. Tapping "Welcome drinks" asked
 * "Which cuisines can you cook?" and "Is your kitchen pure vegetarian?".
 * So did "Sweets & mithai". So did "Live food counters". Seven different
 * businesses, one questionnaire, and six of them answering something that
 * has nothing to do with what they sell.
 *
 * A partner filling that in learns two things: the app does not know what
 * they do, and the answers do not matter. Both are true at that point.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HOW THE TWO FIT TOGETHER
 * ══════════════════════════════════════════════════════════════════════
 *
 * A service asks its OWN questions if it has any, and its trade's
 * otherwise. Nothing asks both: the questions here already include
 * whatever from the trade set genuinely applies, because a partner who
 * answers "which cuisines" twice on one flow stops reading.
 *
 * The same rule as everywhere else in this file's neighbourhood: an
 * option earns its place only if it changes WHO GETS THE JOB or WHAT
 * ARRIVES.
 */

export const SPECS_BY_SERVICE = {

  /* ── Cook at your place ──────────────────────────────────────────
     Not a caterer. This is one or two cooks arriving at a house with
     their own hands and, usually, not their own vessels — which is the
     question that decides whether the booking works at all, and the one
     nobody thinks to ask until the morning of the pooja. */
  cooks: [
    {
      id: 'occasions',
      question: 'What do you cook for?',
      type: 'multi',
      choices: [
        { id: 'pooja',      label: 'Pooja and satyanarayana' },
        { id: 'housewarm',  label: 'Griha pravesha' },
        { id: 'naming',     label: 'Naming and cradle' },
        { id: 'birthday',   label: 'Birthdays at home' },
        { id: 'shraddha',   label: 'Shraddha and rituals' },
        { id: 'daily',      label: 'Everyday cooking' },
      ],
    },
    {
      id: 'cuisines',
      question: 'What style do you cook?',
      type: 'multi',
      choices: [
        { id: 'south_brahmin', label: 'Brahmin style', scan: 'No onion or garlic' },
        { id: 'south_general', label: 'Karnataka everyday' },
        { id: 'andhra',        label: 'Andhra' },
        { id: 'tamil',         label: 'Tamil' },
        { id: 'north',         label: 'North Indian' },
        { id: 'jain',          label: 'Jain' },
      ],
    },
    {
      id: 'vessels',
      question: 'Whose vessels and gas?',
      /* The single most common reason a home-cook booking falls apart on
         the morning. A cook who arrives expecting a kitchen, at a house
         that expected them to bring one, cannot start. */
      type: 'one',
      choices: [
        { id: 'host',  label: 'The family provides everything' },
        { id: 'mine',  label: 'I bring vessels and burners' },
        { id: 'part',  label: 'I bring vessels, family provides gas' },
      ],
    },
    {
      id: 'team',
      question: 'How many of you come?',
      type: 'one',
      choices: [
        { id: '1',   label: 'Just me' },
        { id: '2-3', label: '2 or 3' },
        { id: '4+',  label: '4 or more' },
      ],
    },
    {
      id: 'scale',
      question: 'How many people can you cook for?',
      type: 'one',
      choices: [
        { id: '15',  label: 'Up to 15', scan: 'A family pooja' },
        { id: '40',  label: 'Up to 40' },
        { id: '100', label: 'Up to 100' },
        { id: '100+',label: 'More than 100' },
      ],
    },
  ],

  /* ── Welcome drinks ──────────────────────────────────────────────── */
  welcome_drinks: [
    {
      id: 'drinks',
      question: 'What do you serve?',
      type: 'multi',
      choices: [
        { id: 'juice',     label: 'Fresh fruit juice' },
        { id: 'mocktail',  label: 'Mocktails' },
        { id: 'panaka',    label: 'Panaka and majjige', scan: 'Traditional' },
        { id: 'milkshake', label: 'Milkshakes' },
        { id: 'lassi',     label: 'Lassi' },
        { id: 'tender',    label: 'Tender coconut' },
        { id: 'filter',    label: 'Filter coffee and tea' },
        { id: 'soft',      label: 'Soft drinks' },
      ],
    },
    {
      id: 'how',
      question: 'How is it served?',
      type: 'multi',
      choices: [
        { id: 'counter', label: 'A counter guests walk to' },
        { id: 'tray',    label: 'Carried round on trays' },
        { id: 'live',    label: 'Made live in front of guests' },
      ],
    },
    {
      id: 'glassware',
      question: 'Do you bring the glasses?',
      type: 'one',
      choices: [
        { id: 'glass',   label: 'Yes, real glassware' },
        { id: 'disposable', label: 'Yes, disposable' },
        { id: 'no',      label: 'No, the venue provides' },
      ],
    },
  ],

  /* ── Dessert / ice cream counter ─────────────────────────────────── */
  ice_cream: [
    {
      id: 'kind',
      question: 'What kind of counter?',
      type: 'multi',
      choices: [
        { id: 'scoop',   label: 'Scooped ice cream' },
        { id: 'softy',   label: 'Softy machine' },
        { id: 'kulfi',   label: 'Kulfi' },
        { id: 'falooda', label: 'Falooda' },
        { id: 'waffle',  label: 'Waffles' },
        { id: 'jamoon',  label: 'Hot jamoon with ice cream' },
        { id: 'fruit',   label: 'Cut fruit' },
      ],
    },
    {
      id: 'flavours',
      question: 'How many flavours?',
      type: 'one',
      choices: [
        { id: '2', label: '2' },
        { id: '4', label: '3 or 4' },
        { id: '6', label: '5 or more' },
      ],
    },
    {
      id: 'power',
      question: 'What do you need on site?',
      /* A softy machine needs a plug and a stable one. Discovering that
         at a lawn function with a single generator is a counter that
         never opens. */
      type: 'multi',
      choices: [
        { id: 'power',  label: 'A power point' },
        { id: 'table',  label: 'A table' },
        { id: 'none',   label: 'Nothing, we are self-contained' },
      ],
    },
  ],

  /* ── Sweets & mithai distribution ────────────────────────────────── */
  sweets: [
    {
      id: 'kinds',
      question: 'What do you make or supply?',
      type: 'multi',
      choices: [
        { id: 'holige',   label: 'Holige and obbattu' },
        { id: 'mysorepak',label: 'Mysore pak' },
        { id: 'laddu',    label: 'Laddu' },
        { id: 'bengali',  label: 'Bengali sweets' },
        { id: 'dryfruit', label: 'Dry fruit sweets' },
        { id: 'halwa',    label: 'Halwa' },
        { id: 'jamoon',   label: 'Jamoon and jilebi' },
      ],
    },
    {
      id: 'packing',
      question: 'How is it handed over?',
      type: 'multi',
      choices: [
        { id: 'boxes',   label: 'Boxed, one per person' },
        { id: 'bulk',    label: 'In bulk trays' },
        { id: 'counter', label: 'A counter at the function' },
        { id: 'custom',  label: 'Custom printed boxes' },
      ],
    },
    {
      id: 'min',
      question: 'Smallest order you will take',
      type: 'one',
      choices: [
        { id: '25',  label: '25 boxes' },
        { id: '100', label: '100 boxes' },
        { id: '250', label: '250 boxes' },
        { id: '500', label: '500 or more' },
      ],
    },
  ],

  /* ── Live food counters ──────────────────────────────────────────── */
  live_counters: [
    {
      id: 'counters',
      question: 'Which counters do you run?',
      type: 'multi',
      choices: [
        { id: 'dosa',    label: 'Live dosa' },
        { id: 'chaat',   label: 'Chaat and pani puri' },
        { id: 'pasta',   label: 'Pasta' },
        { id: 'pizza',   label: 'Wood-fired pizza' },
        { id: 'grill',   label: 'Grill and tandoor' },
        { id: 'noodles', label: 'Noodles and Manchurian' },
        { id: 'chuski',  label: 'Chuski and gola' },
        { id: 'popcorn', label: 'Popcorn and candy floss' },
      ],
    },
    {
      id: 'staff',
      question: 'How many people run one counter?',
      type: 'one',
      choices: [
        { id: '1', label: '1' },
        { id: '2', label: '2' },
        { id: '3+', label: '3 or more' },
      ],
    },
    {
      id: 'brings',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'counter',  label: 'The counter itself' },
        { id: 'equipment',label: 'Cooking equipment' },
        { id: 'gas',      label: 'Gas' },
        { id: 'plates',   label: 'Plates and cutlery' },
      ],
    },
  ],

  /* ── Customised menu ─────────────────────────────────────────────── */
  menu: [
    {
      id: 'design',
      question: 'How far will you go on a custom menu?',
      type: 'one',
      choices: [
        { id: 'swap',   label: 'Swap dishes within our menus' },
        { id: 'build',  label: 'Build a menu from scratch with the family' },
        { id: 'region', label: 'Cook a family recipe they give us' },
      ],
    },
    {
      id: 'tasting',
      question: 'Do you offer a tasting?',
      type: 'one',
      choices: [
        { id: 'free',  label: 'Yes, free before booking' },
        { id: 'paid',  label: 'Yes, at a charge' },
        { id: 'no',    label: 'No' },
      ],
    },
    {
      id: 'diet',
      question: 'Which special diets can you cook?',
      type: 'multi',
      choices: [
        { id: 'jain',      label: 'Jain' },
        { id: 'no_onion',  label: 'No onion, no garlic' },
        { id: 'vegan',     label: 'Vegan' },
        { id: 'diabetic',  label: 'Sugar free' },
        { id: 'gluten',    label: 'Gluten free' },
        { id: 'satvik',    label: 'Satvik' },
      ],
    },
  ],
}

/** Does this service ask its own questions? */
export function hasServiceSpecs(serviceId) {
  return Array.isArray(SPECS_BY_SERVICE[serviceId]) && SPECS_BY_SERVICE[serviceId].length > 0
}

/**
 * The questions to ask for a chosen set of offerings.
 *
 * Several offerings can be picked at once, so their question sets are
 * merged — de-duplicated by group id, in the order they were asked for.
 * A caterer who ticks both "Live food counters" and "Welcome drinks"
 * answers each set once, not a merged soup with two "what do you bring"
 * questions in it.
 */
export function specsForServices(serviceIds = [], fallback = []) {
  const own = serviceIds.filter(hasServiceSpecs)
  if (!own.length) return fallback

  const seen = new Set()
  const out = []
  for (const id of serviceIds) {
    for (const g of SPECS_BY_SERVICE[id] ?? []) {
      const key = `${id}:${g.id}`
      if (seen.has(key)) continue
      seen.add(key)
      /* Namespaced, because two offerings can both have a `brings` group
         and their answers must not overwrite each other. */
      out.push({ ...g, id: key, forService: id })
    }
  }

  /* Offerings with no questions of their own still need the trade's --
     a caterer who ticks "Catering" and "Welcome drinks" must still be
     asked about cuisines. */
  const bare = serviceIds.filter(id => !hasServiceSpecs(id))
  if (bare.length) out.push(...fallback)

  return out
}
