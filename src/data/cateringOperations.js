/**
 * How a caterer actually operates — the half of the business that is not
 * a dish list.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS AS IMPORTANT AS THE MENU
 * ══════════════════════════════════════════════════════════════════════
 *
 * Two caterers can cook the identical menu and be completely different
 * bookings. One arrives with vessels, burners, gas, twelve servers and a
 * cleaning crew. The other arrives with two cooks and expects a kitchen,
 * a gas connection and somebody else's staff.
 *
 * A customer booking a lawn function at a farmhouse needs the first. Send
 * them the second and the food never gets cooked — not because the
 * caterer was bad, but because nobody asked.
 *
 * Until now nothing in the app asked. The whole operational half of a
 * catering business lived in a phone call, and dispatch matched on trade
 * and distance alone.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE RULE EVERY QUESTION HERE PASSES
 * ══════════════════════════════════════════════════════════════════════
 *
 * It changes WHO SHOULD GET THE JOB, or it changes WHAT ARRIVES.
 *
 * "How many years have you been running" is in exactly one group —
 * `trust` — and only because a customer asks for it by name. Everything
 * that is merely true about a partner and changes no decision is left
 * out, because every extra screen is somebody who stops halfway.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SHAPE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Grouped into SCREENS, not one flat list. Each screen holds one or two
 * questions, because this is filled in on a phone by somebody standing
 * in a kitchen, and two questions on one screen means the second one is
 * answered wrong.
 */

export const OPERATION_SCREENS = [
  {
    id: 'scale',
    title: 'How big do you go?',
    why: 'So we never send you a job that is too small to be worth it, or too big to cook.',
    groups: [
      {
        id: 'guests_per_event',
        question: 'Largest event you can cook for',
        type: 'one',
        choices: [
          { id: '50',   label: 'Up to 50',      scan: 'House functions and poojas' },
          { id: '150',  label: 'Up to 150' },
          { id: '500',  label: 'Up to 500',     scan: 'A full wedding' },
          { id: '1500', label: 'Up to 1,500' },
          { id: '1500+',label: 'More than 1,500', scan: 'Convention scale' },
        ],
      },
      {
        id: 'events_per_day',
        question: 'How many events in one day?',
        /* A caterer who can only do one is a caterer dispatch must stop
           offering a second to, on a Saturday in wedding season, when
           every other request is for the same date. */
        type: 'one',
        choices: [
          { id: '1',  label: 'One' },
          { id: '2',  label: 'Two' },
          { id: '3+', label: 'Three or more' },
        ],
      },
    ],
  },

  {
    id: 'notice',
    title: 'How much notice do you need?',
    why: 'Instant bookings go to whoever can actually start in time.',
    groups: [
      {
        id: 'notice',
        question: 'Shortest notice you can take',
        type: 'one',
        choices: [
          { id: 'same_day', label: 'Same day',   scan: 'We can start today' },
          { id: '1',        label: 'One day' },
          { id: '3',        label: 'Three days' },
          { id: '7',        label: 'A week' },
          { id: '15',       label: 'Two weeks' },
        ],
      },
      {
        id: 'closed',
        question: 'Any time of year you do not work?',
        type: 'multi',
        choices: [
          { id: 'ashada',   label: 'Ashada',      scan: 'No weddings anyway' },
          { id: 'monsoon',  label: 'Heavy monsoon' },
          { id: 'festival', label: 'Big festivals' },
          { id: 'none',     label: 'We work all year' },
        ],
      },
    ],
  },

  {
    id: 'where',
    title: 'Where do you cook?',
    why: 'A lawn with no kitchen and a hall with a full one are different jobs.',
    groups: [
      {
        id: 'cook_where',
        question: 'Where does the cooking happen?',
        type: 'one',
        choices: [
          { id: 'on_site',   label: 'At the venue',   scan: 'We set up and cook there' },
          { id: 'transport', label: 'At our kitchen', scan: 'Cooked and brought hot' },
          { id: 'either',    label: 'Either way' },
        ],
      },
      {
        id: 'site_needs',
        question: 'What must the venue have?',
        hint: 'Say it now and you will never be sent somewhere that has none of it.',
        type: 'multi',
        choices: [
          { id: 'water',    label: 'Running water' },
          { id: 'drainage', label: 'Drainage' },
          { id: 'power',    label: 'A power point' },
          { id: 'shade',    label: 'Covered cooking area' },
          { id: 'nothing',  label: 'Nothing — we are self-contained' },
        ],
      },
    ],
  },

  {
    id: 'brings',
    title: 'What do you bring?',
    why: 'This is the question that decides whether a booking works at all.',
    groups: [
      {
        id: 'staff',
        question: 'People',
        type: 'multi',
        choices: [
          { id: 'head_cook', label: 'Head cook' },
          { id: 'cooks',     label: 'Cooks' },
          { id: 'helpers',   label: 'Kitchen helpers' },
          { id: 'servers',   label: 'Serving staff' },
          { id: 'cleaners',  label: 'Cleaning crew' },
          { id: 'supervisor',label: 'A supervisor on site' },
        ],
      },
      {
        id: 'equipment',
        question: 'Equipment and supplies',
        type: 'multi',
        choices: [
          { id: 'vessels',   label: 'Cooking vessels' },
          { id: 'burners',   label: 'Burners and stoves' },
          { id: 'gas',       label: 'Gas cylinders' },
          { id: 'chafing',   label: 'Chafing dishes' },
          { id: 'crockery',  label: 'Plates and crockery' },
          { id: 'cutlery',   label: 'Cutlery' },
          { id: 'glassware', label: 'Glasses' },
          { id: 'leaves',    label: 'Banana leaves' },
          { id: 'water',     label: 'Drinking water cans' },
          { id: 'waste',     label: 'Waste removal' },
          { id: 'transport', label: 'Our own transport' },
        ],
      },
    ],
  },

  {
    id: 'serving',
    title: 'How is it served?',
    why: 'A leaf meal and a buffet need different staff and a different room.',
    groups: [
      {
        id: 'service_style',
        question: 'Ways you can serve',
        type: 'multi',
        choices: [
          { id: 'leaf',     label: 'Plantain leaf',   scan: 'Seated, served in rows' },
          { id: 'buffet',   label: 'Buffet counters' },
          { id: 'plated',   label: 'Plated at the table' },
          { id: 'boxes',    label: 'Box meals' },
          { id: 'live',     label: 'Live counters' },
          { id: 'self',     label: 'Self service' },
        ],
      },
      {
        id: 'servers_per_100',
        question: 'How many servers per 100 guests?',
        type: 'one',
        choices: [
          { id: '2', label: '2' },
          { id: '4', label: '4' },
          { id: '6', label: '6 or more' },
          { id: 'na', label: 'We do not supply servers' },
        ],
      },
    ],
  },

  {
    id: 'limits',
    /* ══════════════════════════════════════════════════════════════════
       THE MOST VALUABLE SCREEN IN THE FLOW
       ══════════════════════════════════════════════════════════════════

       Everything else asks what a caterer CAN do. This asks what they
       will not, and it is the only question that stops a bad match dead.

       A pure-veg kitchen offered a chicken wedding declines, and a
       decline costs them nothing today — but three declines and they
       stop opening the app. A caterer who will not work past midnight
       accepts a reception, discovers at 11pm that dinner has not
       started, and somebody's wedding goes wrong.

       Nobody thinks to ask this. It is asked here, once, plainly. */
    title: 'What will you not do?',
    why: 'Say it once and you will never be asked again. Nothing here counts against you.',
    groups: [
      {
        id: 'wont_cook',
        question: 'Anything you will not cook',
        type: 'multi',
        choices: [
          { id: 'no_beef',    label: 'No beef' },
          { id: 'no_pork',    label: 'No pork' },
          { id: 'no_onion',   label: 'No onion or garlic' },
          { id: 'no_egg',     label: 'No egg' },
          { id: 'no_alcohol', label: 'No alcohol on the premises' },
          { id: 'none',       label: 'Nothing is off limits' },
        ],
      },
      {
        id: 'wont_work',
        question: 'Anywhere or any time you will not work',
        type: 'multi',
        choices: [
          { id: 'no_outdoor',  label: 'No outdoor kitchens' },
          { id: 'no_midnight', label: 'Nothing past midnight' },
          { id: 'no_early',    label: 'No 4am muhurta starts' },
          { id: 'no_travel',   label: 'Not outside Bengaluru' },
          { id: 'no_stairs',   label: 'No venues without lift access' },
          { id: 'none',        label: 'None of these' },
        ],
      },
    ],
  },

  {
    id: 'trust',
    title: 'Anything that proves you are established?',
    why: 'Customers ask for these by name. Every one is optional.',
    groups: [
      {
        id: 'certs',
        question: 'Registrations you hold',
        type: 'multi',
        choices: [
          { id: 'fssai',  label: 'FSSAI' },
          { id: 'gst',    label: 'GST registered' },
          { id: 'iso',    label: 'ISO 9001' },
          { id: 'haccp',  label: 'HACCP / ISO 22000' },
          { id: 'shop',   label: 'Shop and establishment licence' },
          { id: 'none',   label: 'None yet' },
        ],
      },
      {
        id: 'years',
        question: 'How long have you been catering?',
        /* The one "about you" question in this file. It is here because
           customers ask for it in words, not because it changes a match. */
        type: 'one',
        choices: [
          { id: '1',   label: 'Under a year' },
          { id: '3',   label: '1 to 3 years' },
          { id: '10',  label: '3 to 10 years' },
          { id: '10+', label: 'More than 10 years' },
        ],
      },
    ],
  },
]

/** Every group, flattened, for anything that needs to read one answer. */
export const OPERATION_GROUPS = OPERATION_SCREENS.flatMap(s => s.groups)

export const OPERATION_GROUP_BY_ID =
  Object.fromEntries(OPERATION_GROUPS.map(g => [g.id, g]))

/**
 * A one-line summary of what a caterer answered, for their listing row.
 * Only the facts a coordinator scans for — not all thirteen groups.
 */
export function describeOperations(specs = {}) {
  const bits = []
  const g = id => OPERATION_GROUP_BY_ID[id]
  const label = (id, v) => g(id)?.choices.find(c => c.id === v)?.label

  if (specs.guests_per_event) bits.push(label('guests_per_event', specs.guests_per_event))
  if (specs.cook_where)       bits.push(label('cook_where', specs.cook_where))
  if (Array.isArray(specs.service_style) && specs.service_style.length) {
    bits.push(specs.service_style.map(v => label('service_style', v)).filter(Boolean).join(', '))
  }
  return bits.filter(Boolean).join(' · ') || null
}
