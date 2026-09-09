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


  /* ══════════════════════════════════════════════════════════════════
     DECORATION & FLORAL — ten businesses, not one
     ══════════════════════════════════════════════════════════════════

     The trade set asked every one of these about tables, canopies and
     table centrepieces. A vehicle decorator was being asked about stage
     flooring and dry ice; a candle-setup artist about mandap pillars.
     Each of the ten below now asks about the thing it actually sells. */

  /* ── Vehicle decoration ──────────────────────────────────────────
     The vehicle is the whole question. A studio that does saloon cars
     and one that does a horse tonga are not substitutes, and a bride's
     brother ringing round on the morning cares about nothing else. */
  vehicle_decor: [
    {
      id: 'vehicles',
      question: 'Which vehicles do you decorate?',
      type: 'multi',
      choices: [
        { id: 'car',        label: 'Car or sedan' },
        { id: 'suv',        label: 'SUV or Innova' },
        { id: 'vintage',    label: 'Vintage car', scan: 'Do you supply it too?' },
        { id: 'open_jeep',  label: 'Open jeep or thar' },
        { id: 'bike',       label: 'Bike or scooter' },
        { id: 'tonga',      label: 'Horse cart or tonga' },
        { id: 'palanquin',  label: 'Palanquin or doli' },
        { id: 'traveller',  label: 'Tempo traveller' },
        { id: 'bus',        label: 'Bus' },
        { id: 'auto',       label: 'Auto rickshaw' },
      ],
    },
    {
      id: 'materials',
      question: 'What do you decorate it with?',
      type: 'multi',
      choices: [
        { id: 'fresh',      label: 'Fresh flowers' },
        { id: 'artificial', label: 'Artificial flowers' },
        { id: 'ribbon',     label: 'Ribbons and net' },
        { id: 'nameplate',  label: 'Name on the number plate' },
        { id: 'board',      label: '"Just married" board' },
        { id: 'interior',   label: 'Inside the car too' },
        { id: 'windscreen', label: 'Windscreen band' },
        { id: 'roof',       label: 'Roof arrangement' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you do the work?',
      /* Decides whether the family has to send the car anywhere, which
         on a wedding morning is the difference between yes and no. */
      type: 'multi',
      choices: [
        { id: 'home',   label: 'At the house' },
        { id: 'venue',  label: 'At the venue' },
        { id: 'mine',   label: 'They bring it to me' },
      ],
    },
    {
      id: 'notice',
      question: 'How early can you finish it?',
      type: 'one',
      choices: [
        { id: 'night',   label: 'The night before' },
        { id: 'early',   label: 'Early morning, before 7am' },
        { id: 'morning', label: 'Morning, 2 hours before' },
        { id: 'same',    label: 'An hour is enough' },
      ],
    },
  ],

  /* ── Flowers ─────────────────────────────────────────────────────
     A garland maker, a floral-jewellery artist and a stage florist are
     three businesses. Which flower matters too: mallige is priced and
     sourced nothing like an imported orchid. */
  floral: [
    {
      id: 'items',
      question: 'What do you make?',
      type: 'multi',
      choices: [
        { id: 'garland',   label: 'Garlands and haara' },
        { id: 'varamala',  label: 'Varamala pair', scan: 'The exchange garlands' },
        { id: 'gajra',     label: 'Hair flowers and gajra' },
        { id: 'jewellery', label: 'Floral jewellery' },
        { id: 'bouquet',   label: 'Bouquets' },
        { id: 'petals',    label: 'Loose petals and rangoli' },
        { id: 'backdrop',  label: 'Flower backdrops and walls' },
        { id: 'mandap',    label: 'Mandap and pillar flowers' },
        { id: 'table',     label: 'Table arrangements' },
        { id: 'car',       label: 'Car flowers' },
      ],
    },
    {
      id: 'flowers',
      question: 'Which flowers do you work with?',
      type: 'multi',
      choices: [
        { id: 'rose',        label: 'Rose' },
        { id: 'marigold',    label: 'Marigold and sevanthige' },
        { id: 'jasmine',     label: 'Mallige and jasmine' },
        { id: 'kanakambara', label: 'Kanakambara' },
        { id: 'tuberose',    label: 'Sugandharaja' },
        { id: 'lotus',       label: 'Lotus' },
        { id: 'orchid',      label: 'Orchid' },
        { id: 'lily',        label: 'Lily and carnation' },
        { id: 'imported',    label: 'Imported flowers', scan: 'Ordered ahead' },
        { id: 'leaves',      label: 'Mango leaves and banana stems' },
      ],
    },
    {
      id: 'fresh',
      question: 'Fresh or artificial?',
      type: 'one',
      choices: [
        { id: 'fresh_only', label: 'Fresh only' },
        { id: 'both',       label: 'Both' },
        { id: 'artificial', label: 'Artificial only' },
      ],
    },
    {
      id: 'onsite',
      question: 'Do you string and set up at the venue?',
      type: 'one',
      choices: [
        { id: 'yes',      label: 'Yes, we work on site' },
        { id: 'deliver',  label: 'We deliver ready-made' },
        { id: 'both',     label: 'Either' },
      ],
    },
  ],

  /* ── Stage and backdrop ──────────────────────────────────────────
     The span is the fact that decides it. A 12-foot reception backdrop
     and a 40-foot sangeet stage are different trucks and different
     crews, and "we do stages" tells a coordinator nothing. */
  stage: [
    {
      id: 'occasions',
      question: 'What do you build stages for?',
      type: 'multi',
      choices: [
        { id: 'wedding',   label: 'Wedding' },
        { id: 'reception', label: 'Reception' },
        { id: 'sangeet',   label: 'Sangeet and mehendi' },
        { id: 'naming',    label: 'Naming and cradle' },
        { id: 'birthday',  label: 'Birthday' },
        { id: 'corporate', label: 'Corporate and conference' },
        { id: 'pooja',     label: 'Pooja and homa' },
      ],
    },
    {
      id: 'builds',
      question: 'What do you actually build?',
      type: 'multi',
      choices: [
        { id: 'backdrop',  label: 'Backdrop panel' },
        { id: 'flowerwall',label: 'Flower wall' },
        { id: 'ring',      label: 'Ring or circle frame' },
        { id: 'arch',      label: 'Arch' },
        { id: 'drape',     label: 'Fabric draping' },
        { id: 'riser',     label: 'Raised platform and steps' },
        { id: 'carpet',    label: 'Carpet and pathway' },
        { id: 'ledwall',   label: 'LED screen backdrop' },
        { id: 'seating',   label: 'Couple seating and sofa' },
      ],
    },
    {
      id: 'span',
      question: 'What is the widest backdrop you have built?',
      type: 'one',
      choices: [
        { id: '12', label: 'Up to 12 feet', scan: 'A home function' },
        { id: '20', label: 'Up to 20 feet' },
        { id: '30', label: 'Up to 30 feet' },
        { id: '40', label: 'More than 30 feet' },
      ],
    },
    {
      id: 'strike',
      question: 'Do you clear it the same night?',
      /* Halls charge by the hour past midnight and the family pays it.
         A decorator who dismantles next morning changes the cost of the
         booking without anybody having discussed it. */
      type: 'one',
      choices: [
        { id: 'same',    label: 'Same night' },
        { id: 'morning', label: 'Next morning' },
        { id: 'either',  label: 'Whichever the venue needs' },
      ],
    },
  ],

  /* ── Mandap ──────────────────────────────────────────────────────
     Ritual, not decor. A mandap that cannot take a homa kunda is not a
     mandap for half the weddings in this city. */
  mandap: [
    {
      id: 'style',
      question: 'Which mandaps do you build?',
      type: 'multi',
      choices: [
        { id: 'four',      label: 'Four pillar' },
        { id: 'six',       label: 'Six or eight pillar' },
        { id: 'wooden',    label: 'Traditional wooden' },
        { id: 'floral',    label: 'Full floral' },
        { id: 'dome',      label: 'Dome or gazebo' },
        { id: 'open',      label: 'Open canopy' },
        { id: 'minimal',   label: 'Modern minimal' },
        { id: 'south',     label: 'South Indian temple style' },
      ],
    },
    {
      id: 'ritual',
      question: 'What does it have to take?',
      type: 'multi',
      choices: [
        { id: 'homa',      label: 'Homa kunda and fire', scan: 'Needs clearance above' },
        { id: 'couple',    label: 'Seating for the couple' },
        { id: 'priests',   label: 'Seating for priests' },
        { id: 'parents',   label: 'Space for both families' },
        { id: 'kalash',    label: 'Kalash and pooja shelf' },
        { id: 'banana',    label: 'Banana stems at the pillars' },
      ],
    },
    {
      id: 'install',
      question: 'How long do you need to install it?',
      type: 'one',
      choices: [
        { id: '2',   label: '2 hours' },
        { id: '4',   label: 'Half a day' },
        { id: 'day', label: 'A full day' },
        { id: 'prev',label: 'We need the previous evening' },
      ],
    },
    {
      id: 'indoor',
      question: 'Indoors, outdoors, or both?',
      type: 'one',
      choices: [
        { id: 'both',    label: 'Both' },
        { id: 'indoor',  label: 'Indoors only' },
        { id: 'outdoor', label: 'Outdoors only', scan: 'You handle wind and rain' },
      ],
    },
  ],

  /* ── General decoration ──────────────────────────────────────────
     What stayed of the old trade-level set, minus everything that
     belonged to one of the nine specialists around it. */
  decor: [
    {
      id: 'occasions',
      question: 'What do you decorate for?',
      type: 'multi',
      choices: [
        { id: 'wedding',    label: 'Weddings' },
        { id: 'reception',  label: 'Receptions' },
        { id: 'engagement', label: 'Engagement and nischitartha' },
        { id: 'naming',     label: 'Naming and cradle' },
        { id: 'housewarm',  label: 'Griha pravesha' },
        { id: 'birthday',   label: 'Birthdays' },
        { id: 'baby',       label: 'Baby shower and seemantha' },
        { id: 'corporate',  label: 'Corporate' },
        { id: 'home',       label: 'Small home functions' },
      ],
    },
    {
      id: 'areas',
      question: 'Which parts of the venue do you do?',
      type: 'multi',
      choices: [
        { id: 'entrance', label: 'Entrance and gate' },
        { id: 'pathway',  label: 'Pathway and aisle' },
        { id: 'stage',    label: 'Stage area' },
        { id: 'seating',  label: 'Guest seating' },
        { id: 'ceiling',  label: 'Ceiling and hanging' },
        { id: 'walls',    label: 'Walls and pillars' },
        { id: 'photo',    label: 'Photo corner' },
        { id: 'dining',   label: 'Dining area' },
        { id: 'room',     label: 'Bride or groom room' },
      ],
    },
    {
      id: 'styles',
      question: 'Which styles do you work in?',
      type: 'multi',
      choices: [
        { id: 'south',    label: 'Traditional South Indian' },
        { id: 'north',    label: 'North Indian' },
        { id: 'royal',    label: 'Royal and heritage' },
        { id: 'minimal',  label: 'Modern minimal' },
        { id: 'floral',   label: 'Floral heavy' },
        { id: 'rustic',   label: 'Rustic and boho' },
        { id: 'kids',     label: 'Cartoon and kids themes' },
      ],
    },
    {
      id: 'scale',
      question: 'What is the largest function you have decorated?',
      type: 'one',
      choices: [
        { id: '100',  label: 'Up to 100 guests' },
        { id: '300',  label: 'Up to 300' },
        { id: '700',  label: 'Up to 700' },
        { id: '1000', label: 'More than 700' },
      ],
    },
  ],

  /* ── Balloons ────────────────────────────────────────────────────
     Helium is the question. It is bought by the cylinder, it is often
     short in this city, and a decorator without it cannot make a single
     thing float — which is most of what a birthday parent wants. */
  balloon: [
    {
      id: 'makes',
      question: 'What do you make with balloons?',
      type: 'multi',
      choices: [
        { id: 'arch',      label: 'Arches and garlands' },
        { id: 'column',    label: 'Columns and pillars' },
        { id: 'ceiling',   label: 'Ceiling drop' },
        { id: 'wall',      label: 'Balloon wall' },
        { id: 'bouquet',   label: 'Balloon bouquets' },
        { id: 'numbers',   label: 'Foil numbers and letters' },
        { id: 'centre',    label: 'Table centrepieces' },
        { id: 'room',      label: 'Surprise room decoration' },
        { id: 'car',       label: 'Car boot surprise' },
      ],
    },
    {
      id: 'types',
      question: 'Which balloons do you stock?',
      type: 'multi',
      choices: [
        { id: 'latex',    label: 'Plain latex' },
        { id: 'chrome',   label: 'Chrome and metallic' },
        { id: 'confetti', label: 'Confetti filled' },
        { id: 'foil',     label: 'Foil shapes' },
        { id: 'bobo',     label: 'Bobo and transparent' },
        { id: 'led',      label: 'LED balloons' },
        { id: 'jumbo',    label: 'Jumbo 3 foot' },
      ],
    },
    {
      id: 'helium',
      question: 'Do you have helium?',
      type: 'one',
      choices: [
        { id: 'own',   label: 'Yes, my own cylinder' },
        { id: 'hire',  label: 'Yes, I hire a cylinder' },
        { id: 'no',    label: 'No, air-filled only' },
      ],
    },
    {
      id: 'occasions',
      question: 'What do you decorate for?',
      type: 'multi',
      choices: [
        { id: 'birthday',  label: 'Birthdays' },
        { id: 'baby',      label: 'Baby shower and naming' },
        { id: 'anniv',     label: 'Anniversaries' },
        { id: 'proposal',  label: 'Proposals' },
        { id: 'office',    label: 'Office and shop' },
        { id: 'farewell',  label: 'Farewell and retirement' },
      ],
    },
  ],

  /* ── Balloon arch ────────────────────────────────────────────────
     Listed separately from balloons because it is bought separately: a
     family wants one arch at the gate and nothing else, and the only
     facts that matter are how wide and whether it stands on its own. */
  balloon_arch: [
    {
      id: 'shapes',
      question: 'Which arches do you build?',
      type: 'multi',
      choices: [
        { id: 'organic', label: 'Organic garland', scan: 'The uneven modern one' },
        { id: 'classic', label: 'Classic even arch' },
        { id: 'half',    label: 'Half arch' },
        { id: 'round',   label: 'Full circle or ring' },
        { id: 'spiral',  label: 'Spiral column pair' },
        { id: 'double',  label: 'Double arch' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you put them?',
      type: 'multi',
      choices: [
        { id: 'entrance', label: 'Entrance or gate' },
        { id: 'stage',    label: 'Behind the stage' },
        { id: 'cake',     label: 'Over the cake table' },
        { id: 'car',      label: 'Around a car' },
        { id: 'pool',     label: 'Poolside or outdoors' },
        { id: 'indoor',   label: 'Indoors only' },
      ],
    },
    {
      id: 'span',
      question: 'How wide can you go?',
      type: 'one',
      choices: [
        { id: '6',  label: 'Up to 6 feet' },
        { id: '10', label: 'Up to 10 feet' },
        { id: '16', label: 'Up to 16 feet' },
        { id: '20', label: 'More than 16 feet' },
      ],
    },
    {
      id: 'stand',
      question: 'Do you bring your own frame?',
      /* A venue that will not take a nail in the wall is common, and an
         arch with no stand simply cannot be put up there. */
      type: 'one',
      choices: [
        { id: 'yes',   label: 'Yes, free standing' },
        { id: 'wall',  label: 'No, it fixes to the wall' },
        { id: 'both',  label: 'Either way' },
      ],
    },
  ],

  /* ── Memory wall ─────────────────────────────────────────────────
     Whether you print is the whole booking. A family that sends forty
     photos on WhatsApp at 9pm needs somebody with a printer. */
  memory_wall: [
    {
      id: 'shows',
      question: 'What goes on the wall?',
      type: 'multi',
      choices: [
        { id: 'prints',   label: 'Printed photographs' },
        { id: 'polaroid', label: 'Polaroid style on clips' },
        { id: 'frames',   label: 'Framed photos' },
        { id: 'fabric',   label: 'Fabric or jute board' },
        { id: 'lights',   label: 'Fairy lights and bulbs' },
        { id: 'screen',   label: 'Digital screen or slideshow' },
        { id: 'timeline', label: 'Timeline with dates' },
        { id: 'notes',    label: 'Guest notes and wishes' },
      ],
    },
    {
      id: 'printing',
      question: 'Do you print the photos?',
      type: 'one',
      choices: [
        { id: 'yes',      label: 'Yes, we print' },
        { id: 'same_day', label: 'Yes, even same day' },
        { id: 'no',       label: 'No, the family prints' },
      ],
    },
    {
      id: 'occasions',
      question: 'What is it usually for?',
      type: 'multi',
      choices: [
        { id: 'wedding',   label: 'Wedding and reception' },
        { id: 'birthday',  label: 'Milestone birthday' },
        { id: 'anniv',     label: 'Anniversary' },
        { id: 'farewell',  label: 'Farewell and retirement' },
        { id: 'memorial',  label: 'Remembrance' },
      ],
    },
    {
      id: 'size',
      question: 'How big can you make it?',
      type: 'one',
      choices: [
        { id: '6',  label: 'Up to 6 feet wide' },
        { id: '10', label: 'Up to 10 feet' },
        { id: '16', label: 'Up to 16 feet' },
        { id: 'any',label: 'Whatever the wall allows' },
      ],
    },
  ],

  /* ── Candlelight setup ───────────────────────────────────────────
     Almost always a proposal or an anniversary, almost always at a
     venue that has an opinion about open flame. Whether the candles are
     real is the first thing the venue asks. */
  candle_setup: [
    {
      id: 'settings',
      question: 'What do you set up?',
      type: 'multi',
      choices: [
        { id: 'proposal', label: 'Proposal setup' },
        { id: 'dinner',   label: 'Private dinner table' },
        { id: 'room',     label: 'Hotel room decoration' },
        { id: 'terrace',  label: 'Terrace or rooftop' },
        { id: 'pathway',  label: 'Candle pathway' },
        { id: 'pool',     label: 'Poolside' },
        { id: 'garden',   label: 'Garden or lawn' },
      ],
    },
    {
      id: 'uses',
      question: 'What do you light it with?',
      type: 'multi',
      choices: [
        { id: 'real',    label: 'Real candles' },
        { id: 'led',     label: 'LED candles', scan: 'For venues that ban flame' },
        { id: 'lantern', label: 'Lanterns' },
        { id: 'diya',    label: 'Diyas' },
        { id: 'fairy',   label: 'Fairy lights' },
        { id: 'petals',  label: 'Rose petals' },
        { id: 'letters', label: 'Light-up letters' },
      ],
    },
    {
      id: 'permission',
      question: 'Who handles the venue permission?',
      type: 'one',
      choices: [
        { id: 'me',     label: 'I speak to the venue' },
        { id: 'family', label: 'The family arranges it' },
        { id: 'led',    label: 'I use LED so it rarely comes up' },
      ],
    },
    {
      id: 'setup',
      question: 'How long do you need on site?',
      type: 'one',
      choices: [
        { id: '1',  label: 'About an hour' },
        { id: '2',  label: 'Two hours' },
        { id: '4',  label: 'Half a day' },
      ],
    },
  ],

  /* ── Shop and office inauguration ────────────────────────────────
     A different customer entirely — a shopkeeper opening on a muhurta,
     usually within a week, usually before 10am. */
  inauguration: [
    {
      id: 'includes',
      question: 'What do you arrange?',
      type: 'multi',
      choices: [
        { id: 'ribbon',    label: 'Ribbon and scissors' },
        { id: 'nameplate', label: 'Nameplate unveiling' },
        { id: 'arch',      label: 'Entrance arch' },
        { id: 'flowers',   label: 'Flower decoration' },
        { id: 'lamp',      label: 'Brass lamp and pooja setup' },
        { id: 'balloon',   label: 'Balloon drop' },
        { id: 'carpet',    label: 'Red carpet' },
        { id: 'sound',     label: 'Small sound system' },
        { id: 'drum',      label: 'Drum or band welcome' },
        { id: 'photo',     label: 'Photographer' },
      ],
    },
    {
      id: 'places',
      question: 'What kind of place?',
      type: 'multi',
      choices: [
        { id: 'shop',      label: 'Shop or showroom' },
        { id: 'office',    label: 'Office' },
        { id: 'clinic',    label: 'Clinic or hospital' },
        { id: 'restaurant',label: 'Restaurant or cafe' },
        { id: 'factory',   label: 'Factory or godown' },
        { id: 'salon',     label: 'Salon or gym' },
      ],
    },
    {
      id: 'muhurta',
      question: 'Can you work to a muhurta time?',
      /* An inauguration is booked for a minute, not a morning, and a
         decorator who arrives at 8:30 for an 8:15 muhurta has missed
         the whole event. */
      type: 'one',
      choices: [
        { id: 'any',   label: 'Yes, including before dawn' },
        { id: 'early', label: 'Yes, from 6am' },
        { id: 'normal',label: 'From 9am onwards' },
      ],
    },
    {
      id: 'notice',
      question: 'Shortest notice you can take?',
      type: 'one',
      choices: [
        { id: '1',  label: 'Next day' },
        { id: '2',  label: 'Two days' },
        { id: '7',  label: 'A week' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     TRANSPORTATION — five businesses that share nothing but a steering
     wheel. A wedding car studio and a house-shifting crew were being
     asked the same questions. The axle count is the fact that decides
     every one of them.
     ══════════════════════════════════════════════════════════════════ */

  /* ── Guest transport ─────────────────────────────────────────────── */
  transport: [
    {
      id: 'vehicles',
      question: 'What do you run?',
      type: 'multi',
      choices: [
        { id: 'hatch',     label: 'Hatchback', scan: '4 seats' },
        { id: 'sedan',     label: 'Sedan' },
        { id: 'suv',       label: 'SUV or Innova', scan: '6 to 7 seats' },
        { id: 'traveller', label: 'Tempo traveller', scan: '12 to 20 seats' },
        { id: 'minibus',   label: 'Mini bus', scan: '25 to 32 seats' },
        { id: 'bus',       label: 'Full bus', scan: '40 seats and above' },
        { id: 'luxury',    label: 'Luxury coach' },
        { id: 'auto',      label: 'Auto rickshaw' },
      ],
    },
    {
      id: 'jobs',
      question: 'What kind of runs do you take?',
      type: 'multi',
      choices: [
        { id: 'airport',  label: 'Airport pickups' },
        { id: 'station',  label: 'Railway station' },
        { id: 'shuttle',  label: 'Venue shuttle, back and forth' },
        { id: 'outstn',   label: 'Outstation' },
        { id: 'fullday',  label: 'Full day at the venue' },
        { id: 'baraat',   label: 'Baraat convoy' },
      ],
    },
    {
      id: 'fleet',
      question: 'How many vehicles can you send at once?',
      type: 'one',
      choices: [
        { id: '1',   label: 'One' },
        { id: '3',   label: 'Two or three' },
        { id: '6',   label: 'Four to six' },
        { id: '10+', label: 'More than six' },
      ],
    },
    {
      id: 'papers',
      question: 'What permits do you hold?',
      /* A private-plate car carrying paying guests is an offence and the
         family loses the vehicle at a check post, on the day. */
      type: 'multi',
      choices: [
        { id: 'commercial', label: 'Commercial yellow board' },
        { id: 'allindia',   label: 'All India tourist permit' },
        { id: 'insurance',  label: 'Passenger insurance' },
        { id: 'gps',        label: 'GPS tracking' },
      ],
    },
  ],

  /* ── Wedding car ─────────────────────────────────────────────────
     They are hiring the CAR, not a ride. Which model is the entire
     conversation, and whether it comes decorated is the second. */
  wedding_car: [
    {
      id: 'cars',
      question: 'Which cars do you have?',
      type: 'multi',
      choices: [
        { id: 'luxury_sedan', label: 'Luxury sedan', scan: 'Mercedes, BMW, Audi' },
        { id: 'premium',      label: 'Premium sedan', scan: 'Camry, Superb' },
        { id: 'suv',          label: 'Luxury SUV', scan: 'Fortuner, Endeavour' },
        { id: 'vintage',      label: 'Vintage car' },
        { id: 'convertible',  label: 'Convertible' },
        { id: 'open_jeep',    label: 'Open jeep or thar' },
        { id: 'limo',         label: 'Limousine' },
        { id: 'innova',       label: 'Innova or Crysta' },
      ],
    },
    {
      id: 'decor',
      question: 'Does it come decorated?',
      type: 'one',
      choices: [
        { id: 'included', label: 'Yes, flowers included' },
        { id: 'extra',    label: 'Yes, at extra cost' },
        { id: 'theirs',   label: 'No, their decorator does it' },
      ],
    },
    {
      id: 'driver',
      question: 'Who drives?',
      type: 'one',
      choices: [
        { id: 'uniform', label: 'My driver, in uniform' },
        { id: 'driver',  label: 'My driver' },
        { id: 'self',    label: 'Self drive is possible' },
      ],
    },
    {
      id: 'hours',
      question: 'How is the day charged?',
      type: 'multi',
      choices: [
        { id: 'hourly',  label: 'By the hour' },
        { id: 'half',    label: 'Half day' },
        { id: 'full',    label: 'Full day' },
        { id: 'oneway',  label: 'One way, venue to home' },
      ],
    },
  ],

  /* ── Goods movement ──────────────────────────────────────────────
     The porter question the brief named. A tempo and an eight-wheeler
     are not the same booking, and the tail lift decides whether one
     man can unload a fridge. */
  goods_move: [
    {
      id: 'vehicles',
      question: 'What do you drive?',
      type: 'multi',
      choices: [
        { id: 'two',    label: 'Two wheeler', scan: 'Documents, small parcels' },
        { id: 'three',  label: 'Three wheeler', scan: 'Up to 500 kg' },
        { id: 'tata_ace',label: 'Tata Ace or chota hathi', scan: 'Up to 750 kg' },
        { id: 'pickup', label: 'Pickup', scan: 'Up to 1.5 tonne' },
        { id: 'tempo',  label: '14 foot tempo', scan: 'Up to 3 tonne' },
        { id: 'six',    label: 'Six wheeler', scan: 'Up to 9 tonne' },
        { id: 'eight',  label: 'Eight wheeler and above' },
        { id: 'container', label: 'Closed container' },
      ],
    },
    {
      id: 'carries',
      question: 'What do you usually move?',
      type: 'multi',
      choices: [
        { id: 'furniture', label: 'Furniture' },
        { id: 'appliance', label: 'Fridge, washing machine, TV' },
        { id: 'catering',  label: 'Catering vessels and gas' },
        { id: 'decor',     label: 'Decoration material' },
        { id: 'sound',     label: 'Sound and light equipment' },
        { id: 'chairs',    label: 'Chairs and tables' },
        { id: 'fragile',   label: 'Fragile and glass' },
        { id: 'goods',     label: 'Shop stock and cartons' },
      ],
    },
    {
      id: 'labour',
      question: 'Do you bring loaders?',
      type: 'one',
      choices: [
        { id: 'yes2',   label: 'Yes, two men' },
        { id: 'yes',    label: 'Yes, on request' },
        { id: 'driver', label: 'Driver only, no loading' },
      ],
    },
    {
      id: 'access',
      question: 'What can you handle at the other end?',
      type: 'multi',
      choices: [
        { id: 'stairs',   label: 'Stairs, up to 3 floors' },
        { id: 'lift',     label: 'Lift buildings' },
        { id: 'tail',     label: 'Tail lift on the vehicle' },
        { id: 'narrow',   label: 'Narrow lanes' },
        { id: 'night',    label: 'Night loading' },
      ],
    },
  ],

  /* ── House shifting ──────────────────────────────────────────────
     Packing is the difference between a van and a service, and it is
     what the customer is actually deciding between. */
  house_shift: [
    {
      id: 'sizes',
      question: 'What size homes do you shift?',
      type: 'multi',
      choices: [
        { id: 'room',  label: 'A single room or PG' },
        { id: '1bhk',  label: '1 BHK' },
        { id: '2bhk',  label: '2 BHK' },
        { id: '3bhk',  label: '3 BHK' },
        { id: 'villa', label: 'Villa or 4 BHK and above' },
        { id: 'office',label: 'Office' },
      ],
    },
    {
      id: 'does',
      question: 'What is included?',
      type: 'multi',
      choices: [
        { id: 'pack',      label: 'Packing' },
        { id: 'material',  label: 'Packing material' },
        { id: 'dismantle', label: 'Dismantling beds and wardrobes' },
        { id: 'reassemble',label: 'Reassembling at the new house' },
        { id: 'appliance', label: 'Appliance uninstall and install' },
        { id: 'unpack',    label: 'Unpacking and arranging' },
        { id: 'insurance', label: 'Transit insurance' },
      ],
    },
    {
      id: 'distance',
      question: 'How far do you go?',
      type: 'one',
      choices: [
        { id: 'local',   label: 'Within Bengaluru' },
        { id: 'state',   label: 'Anywhere in Karnataka' },
        { id: 'south',   label: 'South India' },
        { id: 'india',   label: 'Anywhere in India' },
      ],
    },
    {
      id: 'crew',
      question: 'How many people come?',
      type: 'one',
      choices: [
        { id: '2', label: '2' },
        { id: '4', label: '3 or 4' },
        { id: '6', label: '5 or 6' },
        { id: '8', label: 'More than 6' },
      ],
    },
  ],

  /* ── Vehicle care ────────────────────────────────────────────────
     Bought before a wedding, at home, and the water supply is the fact
     that decides whether it can happen in an apartment basement. */
  vehicle_care: [
    {
      id: 'services',
      question: 'What do you do?',
      type: 'multi',
      choices: [
        { id: 'wash',      label: 'Wash and dry' },
        { id: 'interior',  label: 'Interior cleaning' },
        { id: 'polish',    label: 'Polish and wax' },
        { id: 'detail',    label: 'Full detailing' },
        { id: 'ceramic',   label: 'Ceramic coating' },
        { id: 'seat',      label: 'Seat and roof shampoo' },
        { id: 'engine',    label: 'Engine bay cleaning' },
        { id: 'odour',     label: 'Odour and sanitisation' },
      ],
    },
    {
      id: 'water',
      question: 'Do you bring your own water?',
      type: 'one',
      choices: [
        { id: 'own',      label: 'Yes, in the van' },
        { id: 'waterless',label: 'Waterless, dry wash only' },
        { id: 'theirs',   label: 'No, the house supplies it' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you work?',
      type: 'multi',
      choices: [
        { id: 'doorstep', label: 'At their doorstep' },
        { id: 'basement', label: 'Apartment basement' },
        { id: 'venue',    label: 'At the venue' },
        { id: 'shop',     label: 'They come to my shop' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     PHOTOGRAPHY AND VIDEOGRAPHY
     ══════════════════════════════════════════════════════════════════

     A stills photographer, a photo booth, a film team, a livestream
     operator and a drone pilot were sharing one questionnaire about
     candid versus posed. Four of the five do not shoot stills at all.
     ══════════════════════════════════════════════════════════════════ */

  photography: [
    {
      id: 'styles',
      question: 'How do you shoot?',
      type: 'multi',
      choices: [
        { id: 'candid',      label: 'Candid' },
        { id: 'traditional', label: 'Traditional and posed' },
        { id: 'photojourn',  label: 'Photojournalistic' },
        { id: 'fashion',     label: 'Fashion and editorial' },
        { id: 'documentary', label: 'Documentary, no direction' },
      ],
    },
    {
      id: 'shoots',
      question: 'What do you shoot?',
      type: 'multi',
      choices: [
        { id: 'wedding',   label: 'Wedding day' },
        { id: 'reception', label: 'Reception' },
        { id: 'engagement',label: 'Engagement' },
        { id: 'prewed',    label: 'Pre-wedding shoot' },
        { id: 'maternity', label: 'Maternity' },
        { id: 'newborn',   label: 'Newborn and naming' },
        { id: 'birthday',  label: 'Birthday' },
        { id: 'corporate', label: 'Corporate and product' },
        { id: 'pooja',     label: 'Pooja and rituals' },
      ],
    },
    {
      id: 'team',
      question: 'How many photographers come?',
      type: 'one',
      choices: [
        { id: '1', label: 'Just me' },
        { id: '2', label: 'Two' },
        { id: '3', label: 'Three or four' },
        { id: '5', label: 'A full team' },
      ],
    },
    {
      id: 'delivery',
      question: 'What do they get, and when?',
      type: 'multi',
      choices: [
        { id: 'raw',       label: 'All raw images' },
        { id: 'edited',    label: 'Edited selects' },
        { id: 'album',     label: 'Printed album' },
        { id: 'sameday',   label: 'Same-day teaser' },
        { id: 'week1',     label: 'Edited within a week' },
        { id: 'week4',     label: 'Edited within a month' },
        { id: 'drive',     label: 'Pen drive or hard disk' },
      ],
    },
  ],

  /* ── Photo booth ─────────────────────────────────────────────────
     A machine and an attendant, not a photographer. Whether it prints
     on the spot is what the guests remember. */
  photobooth: [
    {
      id: 'kinds',
      question: 'Which booths do you have?',
      type: 'multi',
      choices: [
        { id: 'classic',  label: 'Classic print booth' },
        { id: 'mirror',   label: 'Magic mirror' },
        { id: '360',      label: '360 degree spinner' },
        { id: 'gif',      label: 'GIF and boomerang' },
        { id: 'green',    label: 'Green screen' },
        { id: 'polaroid', label: 'Polaroid station' },
        { id: 'ai',       label: 'AI portrait booth' },
      ],
    },
    {
      id: 'prints',
      question: 'Does it print on the spot?',
      type: 'one',
      choices: [
        { id: 'unlimited', label: 'Yes, unlimited prints' },
        { id: 'limited',   label: 'Yes, up to a set number' },
        { id: 'digital',   label: 'No, digital copy only' },
      ],
    },
    {
      id: 'includes',
      question: 'What comes with it?',
      type: 'multi',
      choices: [
        { id: 'attendant', label: 'An attendant for the whole time' },
        { id: 'props',     label: 'Props box' },
        { id: 'backdrop',  label: 'Backdrop' },
        { id: 'custom',    label: 'Custom print design with their names' },
        { id: 'album',     label: 'Guest album' },
        { id: 'share',     label: 'Instant WhatsApp or QR sharing' },
        { id: 'gallery',   label: 'Online gallery afterwards' },
      ],
    },
    {
      id: 'power',
      question: 'What do you need from the venue?',
      /* A booth that needs 15 amps in a hall running on one generator
         is a booth that does not switch on. */
      type: 'multi',
      choices: [
        { id: 'power15',  label: 'A 15 amp point' },
        { id: 'power5',   label: 'An ordinary plug point is enough' },
        { id: 'space',    label: 'A 10 by 10 foot space' },
        { id: 'indoor',   label: 'Indoors or under cover only' },
        { id: 'table',    label: 'One table' },
      ],
    },
  ],

  /* ── Videography ─────────────────────────────────────────────────── */
  videography: [
    {
      id: 'outputs',
      question: 'What films do you make?',
      type: 'multi',
      choices: [
        { id: 'teaser',     label: 'Same-day teaser' },
        { id: 'highlight',  label: 'Highlight film', scan: '3 to 5 minutes' },
        { id: 'cinematic',  label: 'Cinematic film', scan: '15 to 30 minutes' },
        { id: 'full',       label: 'Full event coverage' },
        { id: 'traditional',label: 'Traditional documentation' },
        { id: 'reel',       label: 'Instagram reels' },
        { id: 'prewed',     label: 'Pre-wedding film' },
      ],
    },
    {
      id: 'gear',
      question: 'What do you shoot on?',
      type: 'multi',
      choices: [
        { id: 'cinema',  label: 'Cinema camera' },
        { id: 'mirror',  label: 'Mirrorless or DSLR' },
        { id: 'gimbal',  label: 'Gimbal' },
        { id: 'slider',  label: 'Slider or jimmy jib' },
        { id: 'lowlight',label: 'Low light rated', scan: 'Evening mandaps' },
        { id: 'audio',   label: 'Separate audio recording' },
        { id: 'lights',  label: 'Own lighting' },
      ],
    },
    {
      id: 'team',
      question: 'How many camera people come?',
      type: 'one',
      choices: [
        { id: '1', label: 'One' },
        { id: '2', label: 'Two' },
        { id: '3', label: 'Three or four' },
        { id: '5', label: 'A full crew' },
      ],
    },
    {
      id: 'turnaround',
      question: 'When is the film ready?',
      type: 'one',
      choices: [
        { id: 'sameday', label: 'Teaser the same night' },
        { id: 'week',    label: 'Within a week' },
        { id: 'month',   label: 'Within a month' },
        { id: 'two',     label: 'Six to eight weeks' },
      ],
    },
  ],

  /* ── Livestream ──────────────────────────────────────────────────
     Bought by a family with relatives abroad. The internet is the whole
     job: a hall with two bars of 4G is where these bookings fail. */
  livestream: [
    {
      id: 'platforms',
      question: 'Where can you stream to?',
      type: 'multi',
      choices: [
        { id: 'youtube', label: 'YouTube, private link' },
        { id: 'zoom',    label: 'Zoom' },
        { id: 'meet',    label: 'Google Meet' },
        { id: 'facebook',label: 'Facebook' },
        { id: 'insta',   label: 'Instagram' },
        { id: 'custom',  label: 'A private page of our own' },
      ],
    },
    {
      id: 'internet',
      question: 'How do you get the internet?',
      type: 'multi',
      choices: [
        { id: 'bonded',  label: 'Bonded multi-SIM router', scan: 'Survives one network dropping' },
        { id: 'dual',    label: 'Two SIMs on different networks' },
        { id: 'venue',   label: 'The venue wifi' },
        { id: 'wired',   label: 'A wired line if available' },
        { id: 'own',     label: 'I bring my own connection' },
      ],
    },
    {
      id: 'setup',
      question: 'What is in the setup?',
      type: 'multi',
      choices: [
        { id: 'multicam', label: 'Multiple cameras with a switcher' },
        { id: 'single',   label: 'Single camera' },
        { id: 'audio',    label: 'Feed from the sound desk' },
        { id: 'titles',   label: 'Names and titles on screen' },
        { id: 'record',   label: 'A recording afterwards' },
        { id: 'chat',     label: 'Somebody watching the chat' },
      ],
    },
    {
      id: 'hours',
      question: 'How long can you stream continuously?',
      type: 'one',
      choices: [
        { id: '2',  label: 'Up to 2 hours' },
        { id: '4',  label: 'Up to 4 hours' },
        { id: '8',  label: 'A full day' },
        { id: 'multi', label: 'Across several days' },
      ],
    },
  ],

  /* ── Drone ───────────────────────────────────────────────────────
     Regulated. Bengaluru has red zones around the airport and around
     several government buildings, and a pilot without the paperwork
     turns a wedding into a police matter. */
  drone: [
    {
      id: 'licence',
      question: 'What licences do you hold?',
      type: 'multi',
      choices: [
        { id: 'dgca',    label: 'DGCA remote pilot certificate' },
        { id: 'uin',     label: 'Drone registered with a UIN' },
        { id: 'insured', label: 'Third party insurance' },
        { id: 'none',    label: 'None yet', scan: 'We will tell you where you cannot fly' },
      ],
    },
    {
      id: 'shots',
      question: 'What do you shoot?',
      type: 'multi',
      choices: [
        { id: 'aerial',    label: 'Aerial establishing shots' },
        { id: 'entry',     label: 'Baraat and entry' },
        { id: 'crowd',     label: 'Crowd and venue sweep' },
        { id: 'couple',    label: 'Low altitude couple shots' },
        { id: 'fpv',       label: 'FPV, flying through' },
        { id: 'night',     label: 'Night flying' },
      ],
    },
    {
      id: 'zones',
      question: 'Where can you fly?',
      type: 'multi',
      choices: [
        { id: 'open',      label: 'Open lawns and farms' },
        { id: 'indoor',    label: 'Indoors, with a small drone' },
        { id: 'city',      label: 'Inside the city, green zone' },
        { id: 'permission',label: 'I arrange the permission where needed' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     LIVE ENTERTAINMENT — nine acts sharing one questionnaire
     ══════════════════════════════════════════════════════════════════

     A nadaswaram vidwan, a bouncy castle, a bhajan group and a baraat
     band were all being asked the same thing. What each one needs from
     the venue is different enough that the trade-level set could not
     have been right for more than one of them.
     ══════════════════════════════════════════════════════════════════ */

  /* ── Nadaswaram and thavil ───────────────────────────────────────
     Booked to a muhurta, played at specific moments in the ritual, and
     the number of players is what the family is choosing. */
  nadaswaram: [
    {
      id: 'ensemble',
      question: 'What is your ensemble?',
      type: 'one',
      choices: [
        { id: 'solo',   label: 'Nadaswaram alone' },
        { id: 'pair',   label: 'Nadaswaram and thavil' },
        { id: 'four',   label: 'Four piece', scan: 'With ottu and talam' },
        { id: 'full',   label: 'Full periya melam' },
      ],
    },
    {
      id: 'moments',
      question: 'Which parts do you play for?',
      type: 'multi',
      choices: [
        { id: 'muhurta',   label: 'Muhurta and tali kattu' },
        { id: 'entry',     label: 'Bride and groom entry' },
        { id: 'reception', label: 'Reception, through the evening' },
        { id: 'temple',    label: 'Temple rituals' },
        { id: 'homa',      label: 'Homa and havan' },
        { id: 'griha',     label: 'Griha pravesha' },
        { id: 'seemantha', label: 'Seemantha and naming' },
      ],
    },
    {
      id: 'timing',
      question: 'Will you play at brahma muhurta?',
      /* Between 4am and 6am, and it is when half of these are booked.
         An artist who does not start before 8 cannot take them. */
      type: 'one',
      choices: [
        { id: 'yes',   label: 'Yes, any hour' },
        { id: 'from5', label: 'From 5am' },
        { id: 'from8', label: 'From 8am' },
      ],
    },
    {
      id: 'sound',
      question: 'Do you need a mic and sound?',
      type: 'one',
      choices: [
        { id: 'none',  label: 'No, we play acoustic' },
        { id: 'venue', label: 'Yes, from the venue system' },
        { id: 'own',   label: 'We bring our own' },
      ],
    },
  ],

  /* ── Live music ──────────────────────────────────────────────────── */
  live_music: [
    {
      id: 'kind',
      question: 'What do you play?',
      type: 'multi',
      choices: [
        { id: 'carnatic',  label: 'Carnatic' },
        { id: 'hindustani',label: 'Hindustani' },
        { id: 'sufi',      label: 'Sufi and qawwali' },
        { id: 'bollywood', label: 'Bollywood' },
        { id: 'kannada',   label: 'Kannada film songs' },
        { id: 'western',   label: 'Western and pop' },
        { id: 'jazz',      label: 'Jazz and lounge' },
        { id: 'devotional',label: 'Devotional' },
        { id: 'fusion',    label: 'Fusion' },
      ],
    },
    {
      id: 'size',
      question: 'How many are in the act?',
      type: 'one',
      choices: [
        { id: 'solo', label: 'Solo' },
        { id: 'duo',  label: 'Duo' },
        { id: '4',    label: 'Three or four' },
        { id: '8',    label: 'Five to eight' },
        { id: 'big',  label: 'More than eight' },
      ],
    },
    {
      id: 'brings',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'instruments', label: 'Our own instruments' },
        { id: 'pa',          label: 'PA and speakers' },
        { id: 'mics',        label: 'Microphones' },
        { id: 'mixer',       label: 'Mixer and engineer' },
        { id: 'nothing',     label: 'Only ourselves' },
      ],
    },
    {
      id: 'sets',
      question: 'How long do you play?',
      type: 'one',
      choices: [
        { id: '45',  label: 'One set, about 45 minutes' },
        { id: '90',  label: 'Two sets, about 90 minutes' },
        { id: '3h',  label: 'Up to 3 hours' },
        { id: 'all', label: 'The whole evening' },
      ],
    },
  ],

  /* ── Drums ───────────────────────────────────────────────────────── */
  drum: [
    {
      id: 'style',
      question: 'What do you play?',
      type: 'multi',
      choices: [
        { id: 'dhol',     label: 'Dhol' },
        { id: 'nasik',    label: 'Nasik dhol tasha' },
        { id: 'chende',   label: 'Chende' },
        { id: 'tamate',   label: 'Tamate' },
        { id: 'band',     label: 'Brass band' },
        { id: 'dollu',    label: 'Dollu kunitha' },
        { id: 'african',  label: 'Djembe and African' },
      ],
    },
    {
      id: 'where',
      question: 'What are you booked for?',
      type: 'multi',
      choices: [
        { id: 'baraat',   label: 'Baraat procession' },
        { id: 'entry',    label: 'Entry at the venue' },
        { id: 'temple',   label: 'Temple procession' },
        { id: 'shop',     label: 'Shop opening' },
        { id: 'sangeet',  label: 'Sangeet' },
        { id: 'festival', label: 'Festival and jatre' },
      ],
    },
    {
      id: 'count',
      question: 'How many drummers?',
      type: 'one',
      choices: [
        { id: '2',   label: 'Two' },
        { id: '4',   label: 'Four' },
        { id: '8',   label: 'Six to eight' },
        { id: '12',  label: 'More than eight' },
      ],
    },
    {
      id: 'walk',
      question: 'Can you walk a procession?',
      type: 'one',
      choices: [
        { id: 'long',  label: 'Yes, a kilometre or more' },
        { id: 'short', label: 'Yes, a short distance' },
        { id: 'no',    label: 'No, we play in one place' },
      ],
    },
  ],

  /* ── Folk performance ────────────────────────────────────────────── */
  folk: [
    {
      id: 'forms',
      question: 'Which forms do you perform?',
      type: 'multi',
      choices: [
        { id: 'dollu',     label: 'Dollu kunitha' },
        { id: 'yakshagana',label: 'Yakshagana' },
        { id: 'veeragase', label: 'Veeragase' },
        { id: 'kamsale',   label: 'Kamsale' },
        { id: 'puja_kunitha', label: 'Puja kunitha' },
        { id: 'kolata',    label: 'Kolata' },
        { id: 'somana',    label: 'Somana kunitha' },
        { id: 'karagattam',label: 'Karagattam' },
        { id: 'lambani',   label: 'Lambani dance' },
        { id: 'stilt',     label: 'Stilt walkers' },
      ],
    },
    {
      id: 'troupe',
      question: 'How many performers?',
      type: 'one',
      choices: [
        { id: '4',  label: 'Up to 4' },
        { id: '8',  label: '5 to 8' },
        { id: '15', label: '9 to 15' },
        { id: '20', label: 'More than 15' },
      ],
    },
    {
      id: 'needs',
      question: 'What do you need at the venue?',
      type: 'multi',
      choices: [
        { id: 'open',    label: 'Open ground' },
        { id: 'stage',   label: 'A stage' },
        { id: 'height',  label: 'Height clearance', scan: 'For stilts and headgear' },
        { id: 'changing',label: 'A changing room' },
        { id: 'sound',   label: 'Sound support' },
        { id: 'none',    label: 'Nothing, we manage anywhere' },
      ],
    },
    {
      id: 'duration',
      question: 'How long is a performance?',
      type: 'one',
      choices: [
        { id: '15', label: '15 to 20 minutes' },
        { id: '30', label: 'About half an hour' },
        { id: '60', label: 'An hour' },
        { id: 'more', label: 'Longer, in parts' },
      ],
    },
  ],

  /* ── Bhajan and devotional ───────────────────────────────────────── */
  bhajan: [
    {
      id: 'traditions',
      question: 'Which tradition?',
      type: 'multi',
      choices: [
        { id: 'dasa',      label: 'Dasara padagalu' },
        { id: 'vachana',   label: 'Vachana and shivasharane' },
        { id: 'bhajan',    label: 'General bhajan' },
        { id: 'kirtan',    label: 'Kirtan' },
        { id: 'sai',       label: 'Sai bhajan' },
        { id: 'ayyappa',   label: 'Ayyappa bhajan' },
        { id: 'abhang',    label: 'Abhang' },
        { id: 'suprabhata',label: 'Suprabhata and stotra' },
      ],
    },
    {
      id: 'occasions',
      question: 'What are you called for?',
      type: 'multi',
      choices: [
        { id: 'satyanarayana', label: 'Satyanarayana pooja' },
        { id: 'griha',      label: 'Griha pravesha' },
        { id: 'wedding',    label: 'Wedding morning' },
        { id: 'shraddha',   label: 'Shraddha and memorial' },
        { id: 'temple',     label: 'Temple functions' },
        { id: 'festival',   label: 'Festivals' },
        { id: 'weekly',     label: 'Weekly group singing' },
      ],
    },
    {
      id: 'group',
      question: 'How many singers come?',
      type: 'one',
      choices: [
        { id: '1', label: 'One' },
        { id: '3', label: 'Two or three' },
        { id: '6', label: 'Four to six' },
        { id: '10',label: 'More than six' },
      ],
    },
    {
      id: 'instruments',
      question: 'What accompanies you?',
      type: 'multi',
      choices: [
        { id: 'harmonium', label: 'Harmonium' },
        { id: 'tabla',     label: 'Tabla or mridanga' },
        { id: 'tal',       label: 'Tala and cymbals' },
        { id: 'veena',     label: 'Veena' },
        { id: 'shruti',    label: 'Shruti box only' },
        { id: 'none',      label: 'Voice alone' },
      ],
    },
  ],

  /* ── Baraat ──────────────────────────────────────────────────────
     A procession on a public road. The police permission and the horse
     are the two things that decide it, and neither belongs on any other
     questionnaire in this trade. */
  baraat: [
    {
      id: 'includes',
      question: 'What do you provide?',
      type: 'multi',
      choices: [
        { id: 'band',      label: 'Brass band' },
        { id: 'dhol',      label: 'Dhol players' },
        { id: 'horse',     label: 'Horse or ghodi' },
        { id: 'chariot',   label: 'Chariot or buggy' },
        { id: 'elephant',  label: 'Elephant', scan: 'Needs forest department clearance' },
        { id: 'lights',    label: 'Carried lights' },
        { id: 'crackers',  label: 'Cold pyro and sparklers' },
        { id: 'dancers',   label: 'Dancers' },
        { id: 'umbrella',  label: 'Decorated umbrella and chatri' },
      ],
    },
    {
      id: 'distance',
      question: 'How far can the procession go?',
      type: 'one',
      choices: [
        { id: '200',  label: 'Around 200 metres' },
        { id: '500',  label: 'Up to half a kilometre' },
        { id: '1km',  label: 'A kilometre' },
        { id: 'more', label: 'More than a kilometre' },
      ],
    },
    {
      id: 'permission',
      question: 'Who arranges the road permission?',
      type: 'one',
      choices: [
        { id: 'me',     label: 'I do' },
        { id: 'family', label: 'The family does' },
        { id: 'private',label: 'We stay on private property' },
      ],
    },
    {
      id: 'timing',
      question: 'When do you do them?',
      type: 'multi',
      choices: [
        { id: 'morning', label: 'Morning' },
        { id: 'evening', label: 'Evening' },
        { id: 'night',   label: 'After dark' },
      ],
    },
  ],

  /* ── Choreography ────────────────────────────────────────────────
     Sold in rehearsals, not in hours. How many sessions and where they
     happen is the whole booking. */
  choreography: [
    {
      id: 'for',
      question: 'Who do you choreograph for?',
      type: 'multi',
      choices: [
        { id: 'couple',   label: 'The couple' },
        { id: 'family',   label: 'Family group dance' },
        { id: 'friends',  label: 'Friends and cousins' },
        { id: 'kids',     label: 'Children' },
        { id: 'elders',   label: 'Elders', scan: 'Simple, seated-friendly' },
        { id: 'sangeet',  label: 'A whole sangeet programme' },
      ],
    },
    {
      id: 'styles',
      question: 'Which styles?',
      type: 'multi',
      choices: [
        { id: 'bollywood',  label: 'Bollywood' },
        { id: 'classical',  label: 'Classical' },
        { id: 'folk',       label: 'Folk' },
        { id: 'western',    label: 'Western and hip hop' },
        { id: 'couple',     label: 'Couple and salsa' },
        { id: 'garba',      label: 'Garba and dandiya' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you rehearse?',
      type: 'multi',
      choices: [
        { id: 'home',    label: 'At their home' },
        { id: 'studio',  label: 'At my studio' },
        { id: 'venue',   label: 'At the venue' },
        { id: 'online',  label: 'Online' },
      ],
    },
    {
      id: 'sessions',
      question: 'How many sessions does a routine take?',
      type: 'one',
      choices: [
        { id: '3',  label: 'Two or three' },
        { id: '6',  label: 'Four to six' },
        { id: '10', label: 'Eight to ten' },
        { id: 'more',label: 'More, for a full programme' },
      ],
    },
  ],

  /* ── Kids play area ──────────────────────────────────────────────
     Bought by a parent whose real question is who is watching the
     children. An inflatable with nobody standing next to it is a
     liability, not a service. */
  kids_play: [
    {
      id: 'equipment',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'bouncy',    label: 'Bouncy castle' },
        { id: 'slide',     label: 'Inflatable slide' },
        { id: 'ballpit',   label: 'Ball pit' },
        { id: 'softplay',  label: 'Soft play for toddlers' },
        { id: 'trampoline',label: 'Trampoline' },
        { id: 'games',     label: 'Carnival games' },
        { id: 'craft',     label: 'Craft table' },
        { id: 'facepaint', label: 'Face painting' },
        { id: 'tattoo',    label: 'Temporary tattoos' },
        { id: 'magician',  label: 'Magician or clown' },
      ],
    },
    {
      id: 'supervision',
      question: 'Who supervises?',
      type: 'one',
      choices: [
        { id: 'staffed', label: 'My staff, the whole time' },
        { id: 'one',     label: 'One attendant' },
        { id: 'setup',   label: 'We set up and leave' },
      ],
    },
    {
      id: 'ages',
      question: 'Which ages is it for?',
      type: 'multi',
      choices: [
        { id: 'toddler', label: 'Under 3' },
        { id: '3to6',    label: '3 to 6' },
        { id: '7to12',   label: '7 to 12' },
        { id: 'teen',    label: 'Teenagers' },
      ],
    },
    {
      id: 'space',
      question: 'What do you need at the venue?',
      type: 'multi',
      choices: [
        { id: 'power',   label: 'A power point', scan: 'Blowers run continuously' },
        { id: 'flat',    label: 'Flat ground' },
        { id: 'indoor',  label: 'Indoors is fine' },
        { id: 'outdoor', label: 'Outdoors only' },
        { id: 'shade',   label: 'Shade or cover' },
      ],
    },
  ],

  /* ── Other entertainment ─────────────────────────────────────────── */
  entertainment: [
    {
      id: 'acts',
      question: 'What is your act?',
      type: 'multi',
      choices: [
        { id: 'magic',     label: 'Magic' },
        { id: 'mimicry',   label: 'Mimicry' },
        { id: 'standup',   label: 'Stand up comedy' },
        { id: 'puppet',    label: 'Puppet show' },
        { id: 'caricature',label: 'Caricature artist' },
        { id: 'tarot',     label: 'Tarot and palm reading' },
        { id: 'mentalist', label: 'Mentalism' },
        { id: 'fire',      label: 'Fire and LED performance' },
        { id: 'juggler',   label: 'Juggling and acrobatics' },
        { id: 'snake',     label: 'Bubble or laser show' },
      ],
    },
    {
      id: 'audience',
      question: 'Who is it for?',
      type: 'multi',
      choices: [
        { id: 'kids',    label: 'Children' },
        { id: 'family',  label: 'A family audience' },
        { id: 'adults',  label: 'Adults' },
        { id: 'corporate',label: 'Corporate' },
      ],
    },
    {
      id: 'format',
      question: 'How do you perform?',
      type: 'multi',
      choices: [
        { id: 'stage',   label: 'On a stage' },
        { id: 'roving',  label: 'Walking among the guests' },
        { id: 'table',   label: 'Table to table' },
        { id: 'corner',  label: 'From one corner' },
      ],
    },
    {
      id: 'length',
      question: 'How long is the act?',
      type: 'one',
      choices: [
        { id: '20', label: '20 minutes' },
        { id: '45', label: '45 minutes' },
        { id: '90', label: 'An hour and a half' },
        { id: 'roving', label: 'As long as they want, roving' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     BRIDAL MAKEUP, MEHENDI AND TROUSSEAU
     ══════════════════════════════════════════════════════════════════ */

  makeup: [
    {
      id: 'looks',
      question: 'Which looks do you do?',
      type: 'multi',
      choices: [
        { id: 'south_bridal', label: 'South Indian bridal' },
        { id: 'north_bridal', label: 'North Indian bridal' },
        { id: 'christian',    label: 'Christian bridal' },
        { id: 'muslim',       label: 'Muslim bridal' },
        { id: 'hd',           label: 'HD and airbrush' },
        { id: 'natural',      label: 'Natural and no-makeup' },
        { id: 'party',        label: 'Party and reception' },
        { id: 'engagement',   label: 'Engagement' },
      ],
    },
    {
      id: 'includes',
      question: 'What else do you do?',
      type: 'multi',
      choices: [
        { id: 'hair',      label: 'Hair styling' },
        { id: 'saree',     label: 'Saree draping' },
        { id: 'dupatta',   label: 'Dupatta and veil setting' },
        { id: 'jewellery', label: 'Jewellery setting' },
        { id: 'hairflower',label: 'Hair flowers and jadai' },
        { id: 'nails',     label: 'Nails' },
        { id: 'lashes',    label: 'Lash extensions' },
        { id: 'family',    label: 'Family and guest makeup' },
      ],
    },
    {
      id: 'products',
      question: 'What do you work with?',
      type: 'multi',
      choices: [
        { id: 'branded',   label: 'Branded high end products' },
        { id: 'sensitive', label: 'Sensitive skin range' },
        { id: 'vegan',     label: 'Vegan and cruelty free' },
        { id: 'trial',     label: 'I do a trial beforehand' },
        { id: 'ownkit',    label: 'I bring my full kit and lights' },
      ],
    },
    {
      id: 'timing',
      question: 'How early can you start?',
      /* A muhurta at 6am means the artist is at the house at 3. An
         artist who cannot is not a bridal artist for that wedding. */
      type: 'one',
      choices: [
        { id: '3am',  label: 'From 3am' },
        { id: '5am',  label: 'From 5am' },
        { id: '7am',  label: 'From 7am' },
        { id: '9am',  label: 'From 9am' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you work?',
      type: 'multi',
      choices: [
        { id: 'home',   label: 'At their home' },
        { id: 'venue',  label: 'At the venue' },
        { id: 'salon',  label: 'They come to my salon' },
        { id: 'outstn', label: 'Outstation, with stay' },
      ],
    },
  ],

  /* ── Mehendi ─────────────────────────────────────────────────────
     Priced per hand, booked by the hour, and the cone is the one thing
     that can go wrong: chemical black henna burns, and a family whose
     bridesmaid reacts remembers who applied it. */
  mehendi: [
    {
      id: 'styles',
      question: 'Which styles do you do?',
      type: 'multi',
      choices: [
        { id: 'rajasthani', label: 'Rajasthani' },
        { id: 'arabic',     label: 'Arabic' },
        { id: 'indo_arabic',label: 'Indo-Arabic' },
        { id: 'bridal',     label: 'Full bridal, hands and feet' },
        { id: 'portrait',   label: 'Portrait and figure work' },
        { id: 'minimal',    label: 'Minimal and modern' },
        { id: 'glitter',    label: 'Glitter and stones' },
        { id: 'white',      label: 'White henna' },
      ],
    },
    {
      id: 'cone',
      question: 'What is in your cone?',
      type: 'one',
      choices: [
        { id: 'natural', label: 'Only natural henna, made fresh' },
        { id: 'organic', label: 'Organic branded cones' },
        { id: 'market',  label: 'Market cones' },
      ],
    },
    {
      id: 'capacity',
      question: 'How many hands can you do in an hour?',
      type: 'one',
      choices: [
        { id: '4',  label: 'About 4 simple' },
        { id: '8',  label: 'About 8 simple' },
        { id: '15', label: 'More than 12, with a team' },
      ],
    },
    {
      id: 'bridal_time',
      question: 'How long does full bridal mehendi take you?',
      type: 'one',
      choices: [
        { id: '2',  label: 'About 2 hours' },
        { id: '4',  label: '3 to 4 hours' },
        { id: '6',  label: '5 to 6 hours' },
        { id: '8',  label: 'More than 6' },
      ],
    },
    {
      id: 'team',
      question: 'How many artists can you send?',
      type: 'one',
      choices: [
        { id: '1',  label: 'Just me' },
        { id: '3',  label: 'Two or three' },
        { id: '6',  label: 'Four to six' },
        { id: '10', label: 'More than six' },
      ],
    },
  ],

  /* ── Bridal wear ─────────────────────────────────────────────────
     Rent or sale is the entire question, and alteration time is what
     decides whether a booking three days out is possible. */
  bridal_wear: [
    {
      id: 'garments',
      question: 'What do you provide?',
      type: 'multi',
      choices: [
        { id: 'saree',    label: 'Bridal sarees' },
        { id: 'lehenga',  label: 'Lehenga' },
        { id: 'gown',     label: 'Gowns' },
        { id: 'sherwani', label: 'Sherwani' },
        { id: 'dhoti',    label: 'Dhoti and panche' },
        { id: 'kurta',    label: 'Kurta sets' },
        { id: 'blouse',   label: 'Blouse stitching' },
        { id: 'jewellery',label: 'Jewellery on hire' },
        { id: 'accessories', label: 'Accessories and footwear' },
      ],
    },
    {
      id: 'model',
      question: 'Rent or sale?',
      type: 'multi',
      choices: [
        { id: 'rent',   label: 'On rent' },
        { id: 'sale',   label: 'For sale' },
        { id: 'custom', label: 'Made to order' },
      ],
    },
    {
      id: 'alteration',
      question: 'How fast can you alter?',
      type: 'one',
      choices: [
        { id: 'same', label: 'Same day' },
        { id: '2',    label: 'Two days' },
        { id: 'week', label: 'A week' },
        { id: 'no',   label: 'I do not alter' },
      ],
    },
    {
      id: 'fitting',
      question: 'Where does the fitting happen?',
      type: 'multi',
      choices: [
        { id: 'shop', label: 'At my shop' },
        { id: 'home', label: 'I go to their home' },
        { id: 'video',label: 'Measurements over video' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     SOUND, LIGHT, POWER AND THE THINGS THAT PLUG IN
     ══════════════════════════════════════════════════════════════════

     Every one of these is decided by a number the trade set never
     asked: how many kilowatts, how many amps, how many hours.
     ══════════════════════════════════════════════════════════════════ */

  dj: [
    {
      id: 'genres',
      question: 'What do you play?',
      type: 'multi',
      choices: [
        { id: 'bollywood', label: 'Bollywood' },
        { id: 'kannada',   label: 'Kannada' },
        { id: 'punjabi',   label: 'Punjabi' },
        { id: 'tamil',     label: 'Tamil and Telugu' },
        { id: 'edm',       label: 'EDM and house' },
        { id: 'retro',     label: 'Retro' },
        { id: 'english',   label: 'English pop' },
        { id: 'devotional',label: 'Devotional, for the morning' },
      ],
    },
    {
      id: 'kit',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'console',  label: 'Console and laptop only' },
        { id: 'speakers', label: 'Speakers' },
        { id: 'sub',      label: 'Subwoofers' },
        { id: 'mics',     label: 'Wireless microphones' },
        { id: 'lights',   label: 'Dance floor lights' },
        { id: 'smoke',    label: 'Smoke or CO2' },
        { id: 'led',      label: 'LED wall' },
      ],
    },
    {
      id: 'crowd',
      question: 'What size crowd can your system cover?',
      type: 'one',
      choices: [
        { id: '100',  label: 'Up to 100' },
        { id: '300',  label: 'Up to 300' },
        { id: '700',  label: 'Up to 700' },
        { id: '1500', label: 'More than 700' },
      ],
    },
    {
      id: 'rules',
      question: 'What can you work within?',
      /* The 10pm noise rule is enforced in this city and a DJ who has
         not thought about it hands the family a police visit. */
      type: 'multi',
      choices: [
        { id: 'ten',      label: 'Stop by 10pm, no argument' },
        { id: 'limiter',  label: 'I can run a decibel limiter' },
        { id: 'silent',   label: 'Silent disco headphones' },
        { id: 'apartment',label: 'Apartment clubhouse volumes' },
      ],
    },
  ],

  /* ── Sound and AV ────────────────────────────────────────────────── */
  av_setup: [
    {
      id: 'provides',
      question: 'What do you supply?',
      type: 'multi',
      choices: [
        { id: 'pa',       label: 'PA system and speakers' },
        { id: 'mics',     label: 'Cordless and collar mics' },
        { id: 'mixer',    label: 'Mixer and engineer' },
        { id: 'monitor',  label: 'Stage monitors' },
        { id: 'projector',label: 'Projector and screen' },
        { id: 'ledwall',  label: 'LED wall' },
        { id: 'tv',       label: 'TV screens' },
        { id: 'podium',   label: 'Podium and lectern mic' },
        { id: 'record',   label: 'Recording the audio' },
      ],
    },
    {
      id: 'events',
      question: 'What do you do sound for?',
      type: 'multi',
      choices: [
        { id: 'wedding',   label: 'Weddings' },
        { id: 'conference',label: 'Conferences and seminars' },
        { id: 'concert',   label: 'Live music' },
        { id: 'school',    label: 'School and college functions' },
        { id: 'religious', label: 'Temple and religious' },
        { id: 'outdoor',   label: 'Outdoor and ground events' },
      ],
    },
    {
      id: 'crowd',
      question: 'Largest crowd you have covered?',
      type: 'one',
      choices: [
        { id: '150',  label: 'Up to 150' },
        { id: '500',  label: 'Up to 500' },
        { id: '1500', label: 'Up to 1500' },
        { id: '3000', label: 'More than 1500' },
      ],
    },
    {
      id: 'operator',
      question: 'Does an operator stay for the event?',
      type: 'one',
      choices: [
        { id: 'yes',    label: 'Yes, throughout' },
        { id: 'setup',  label: 'Setup and a check, then on call' },
        { id: 'drop',   label: 'We deliver and collect only' },
      ],
    },
  ],

  /* ── Lighting ────────────────────────────────────────────────────── */
  lighting: [
    {
      id: 'types',
      question: 'What lighting do you do?',
      type: 'multi',
      choices: [
        { id: 'ambient',   label: 'Ambient and warm wash' },
        { id: 'uplight',   label: 'Uplighting' },
        { id: 'fairy',     label: 'Fairy and string lights' },
        { id: 'chandelier',label: 'Chandeliers' },
        { id: 'par',       label: 'Par cans and stage wash' },
        { id: 'moving',    label: 'Moving heads and beams' },
        { id: 'gobo',      label: 'Gobo and name projection' },
        { id: 'facade',    label: 'Building and facade lighting' },
        { id: 'pathway',   label: 'Pathway and garden lights' },
        { id: 'neon',      label: 'Neon signs' },
      ],
    },
    {
      id: 'load',
      question: 'How much power does your rig draw?',
      /* Asked in the unit a venue understands. A rig that needs 20 kW
         at a hall with a 10 kW generator does not light up. */
      type: 'one',
      choices: [
        { id: '3',   label: 'Under 3 kW', scan: 'An ordinary house point' },
        { id: '10',  label: 'Up to 10 kW' },
        { id: '25',  label: 'Up to 25 kW' },
        { id: '50',  label: 'More than 25 kW' },
      ],
    },
    {
      id: 'brings',
      question: 'Do you bring your own power?',
      type: 'one',
      choices: [
        { id: 'gen',   label: 'Yes, my own generator' },
        { id: 'venue', label: 'No, from the venue supply' },
        { id: 'either',label: 'Either, tell me what is there' },
      ],
    },
    {
      id: 'outdoor',
      question: 'Can you rig outdoors?',
      type: 'multi',
      choices: [
        { id: 'lawn',    label: 'Lawns and open ground' },
        { id: 'rain',    label: 'Rain-protected fittings' },
        { id: 'height',  label: 'Truss and tower rigging' },
        { id: 'indoor',  label: 'Indoors only' },
      ],
    },
  ],

  /* ── Fireworks and pyro ──────────────────────────────────────────
     Licensed, and the licence is not optional. An operator without one
     is a criminal case waiting for the family that hired them. */
  fireworks: [
    {
      id: 'types',
      question: 'What do you do?',
      type: 'multi',
      choices: [
        { id: 'cold',     label: 'Cold pyro and indoor sparklers' },
        { id: 'sparkler', label: 'Sparkler fountains' },
        { id: 'aerial',   label: 'Aerial shells' },
        { id: 'ground',   label: 'Ground display' },
        { id: 'confetti', label: 'Confetti and streamer blasters' },
        { id: 'co2',      label: 'CO2 jets' },
        { id: 'smoke',    label: 'Coloured smoke' },
        { id: 'lanterns', label: 'Sky lanterns' },
      ],
    },
    {
      id: 'licence',
      question: 'What licence do you hold?',
      type: 'one',
      choices: [
        { id: 'peso',    label: 'PESO licensed operator' },
        { id: 'local',   label: 'Local police permission each time' },
        { id: 'cold',    label: 'Cold pyro only, no licence needed' },
      ],
    },
    {
      id: 'venue',
      question: 'Where can you fire?',
      type: 'multi',
      choices: [
        { id: 'open',    label: 'Open ground with clearance' },
        { id: 'indoor',  label: 'Indoors, cold pyro only' },
        { id: 'terrace', label: 'Terrace' },
        { id: 'water',   label: 'Over water' },
      ],
    },
    {
      id: 'safety',
      question: 'What safety do you bring?',
      type: 'multi',
      choices: [
        { id: 'extinguisher', label: 'Extinguishers on site' },
        { id: 'crew',    label: 'A trained crew, not just me' },
        { id: 'barrier', label: 'Barriers and a safety line' },
        { id: 'insured', label: 'Public liability insurance' },
      ],
    },
  ],

  /* ── Power ───────────────────────────────────────────────────────
     A generator is bought in kVA and by the hour. Nothing else about
     it matters, and the trade set asked about none of it. */
  power: [
    {
      id: 'sizes',
      question: 'What sizes do you have?',
      type: 'multi',
      choices: [
        { id: '5',    label: '5 kVA', scan: 'Lights and fans' },
        { id: '15',   label: '15 kVA' },
        { id: '25',   label: '25 kVA' },
        { id: '62',   label: '62 kVA' },
        { id: '125',  label: '125 kVA' },
        { id: '250',  label: '250 kVA and above' },
        { id: 'ups',  label: 'UPS and inverter backup' },
      ],
    },
    {
      id: 'silent',
      question: 'Are they silent sets?',
      /* A non-silent set outside a mandap drowns the mantras. Families
         find this out during the ceremony. */
      type: 'one',
      choices: [
        { id: 'all',   label: 'All silent canopy' },
        { id: 'some',  label: 'Some silent, some open' },
        { id: 'open',  label: 'Open sets only' },
      ],
    },
    {
      id: 'includes',
      question: 'What is included?',
      type: 'multi',
      choices: [
        { id: 'operator', label: 'An operator who stays' },
        { id: 'fuel',     label: 'Fuel' },
        { id: 'cable',    label: 'Cabling and distribution board' },
        { id: 'earthing', label: 'Earthing' },
        { id: 'standby',  label: 'A standby set' },
        { id: 'autostart',label: 'Auto start on mains failure' },
      ],
    },
    {
      id: 'hours',
      question: 'Minimum booking?',
      type: 'one',
      choices: [
        { id: '4',   label: '4 hours' },
        { id: '8',   label: '8 hours' },
        { id: '12',  label: '12 hours' },
        { id: 'day', label: 'A full day' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     THE REST OF FOOD AND DRINK
     ══════════════════════════════════════════════════════════════════ */

  /* ── Catering ────────────────────────────────────────────────────
     The trade-level questions belonged here all along — they were being
     asked of the sweet shop and the ice cream cart as well. */
  catering: [
    {
      id: 'service',
      question: 'How do you serve?',
      type: 'multi',
      choices: [
        { id: 'buffet',   label: 'Buffet' },
        { id: 'table',    label: 'Table service' },
        { id: 'banana',   label: 'Banana leaf, seated rows' },
        { id: 'plated',   label: 'Plated courses' },
        { id: 'boxed',    label: 'Boxed meals' },
        { id: 'counters', label: 'Live counters' },
      ],
    },
    {
      id: 'meals',
      question: 'Which meals do you take?',
      type: 'multi',
      choices: [
        { id: 'breakfast', label: 'Breakfast and tiffin' },
        { id: 'lunch',     label: 'Lunch' },
        { id: 'dinner',    label: 'Dinner' },
        { id: 'snacks',    label: 'Evening snacks' },
        { id: 'allday',    label: 'All day, a full wedding' },
      ],
    },
    {
      id: 'scale',
      question: 'How many plates can you do in one sitting?',
      type: 'one',
      choices: [
        { id: '50',   label: 'Up to 50' },
        { id: '200',  label: 'Up to 200' },
        { id: '500',  label: 'Up to 500' },
        { id: '1000', label: 'Up to 1000' },
        { id: '2000', label: 'More than 1000' },
      ],
    },
    {
      id: 'kitchen',
      question: 'Where do you cook?',
      type: 'one',
      choices: [
        { id: 'onsite',  label: 'At the venue, fresh' },
        { id: 'central', label: 'In my kitchen, transported hot' },
        { id: 'both',    label: 'Both, depending on the menu' },
      ],
    },
    {
      id: 'staff',
      question: 'Do you bring serving staff?',
      type: 'one',
      choices: [
        { id: 'full',    label: 'Yes, a full team in uniform' },
        { id: 'some',    label: 'Yes, cooks and a few servers' },
        { id: 'cook',    label: 'Cooks only' },
      ],
    },
    {
      id: 'fssai',
      question: 'Do you hold an FSSAI licence?',
      type: 'one',
      choices: [
        { id: 'licence',  label: 'Yes, a licence' },
        { id: 'registration', label: 'Yes, a registration' },
        { id: 'no',       label: 'Not yet' },
      ],
    },
  ],

  /* ── Bar and beverages ───────────────────────────────────────────
     Alcohol at an event in Karnataka needs a temporary excise permit.
     Whether the partner holds one, or expects the family to, is the
     first fact and it was being asked about cuisines instead. */
  bar: [
    {
      id: 'serves',
      question: 'What do you serve?',
      type: 'multi',
      choices: [
        { id: 'cocktail',  label: 'Cocktails' },
        { id: 'mocktail',  label: 'Mocktails only' },
        { id: 'beer',      label: 'Beer' },
        { id: 'wine',      label: 'Wine' },
        { id: 'spirits',   label: 'Spirits and IMFL' },
        { id: 'shots',     label: 'Shots and shooters' },
        { id: 'coffee',    label: 'Coffee and tea counter' },
        { id: 'juice',     label: 'Juices and coolers' },
      ],
    },
    {
      id: 'licence',
      question: 'Who arranges the excise permit?',
      type: 'one',
      choices: [
        { id: 'me',     label: 'I do, it is included' },
        { id: 'help',   label: 'I help the family apply' },
        { id: 'family', label: 'The family arranges it' },
        { id: 'dry',    label: 'I only do dry bars, no alcohol' },
      ],
    },
    {
      id: 'brings',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'counter',   label: 'The bar counter' },
        { id: 'bartender', label: 'Bartenders' },
        { id: 'flair',     label: 'Flair bartending' },
        { id: 'glassware', label: 'Glassware' },
        { id: 'ice',       label: 'Ice' },
        { id: 'mixers',    label: 'Mixers and garnish' },
        { id: 'stock',     label: 'The alcohol itself' },
        { id: 'byob',      label: 'We serve what the family supplies' },
      ],
    },
    {
      id: 'scale',
      question: 'How many guests can one bar of yours handle?',
      type: 'one',
      choices: [
        { id: '50',  label: 'Up to 50' },
        { id: '150', label: 'Up to 150' },
        { id: '400', label: 'Up to 400' },
        { id: 'more',label: 'More, with several counters' },
      ],
    },
  ],

  /* ── Cake ────────────────────────────────────────────────────────
     Egg or eggless is not a preference here, it is a hard requirement
     for most of the households that order, and the trade set never
     asked it. */
  cake: [
    {
      id: 'kinds',
      question: 'What do you make?',
      type: 'multi',
      choices: [
        { id: 'tiered',   label: 'Tiered wedding cakes' },
        { id: 'themed',   label: 'Themed and character cakes' },
        { id: 'photo',    label: 'Photo print cakes' },
        { id: 'cupcake',  label: 'Cupcakes' },
        { id: 'dessert',  label: 'Dessert tables' },
        { id: 'pastry',   label: 'Pastries and brownies' },
        { id: 'fondant',  label: 'Fondant work' },
        { id: 'pull',     label: 'Pull-me-up and bomb cakes' },
        { id: 'sugarfree',label: 'Sugar free' },
      ],
    },
    {
      id: 'egg',
      question: 'Egg or eggless?',
      type: 'one',
      choices: [
        { id: 'both',     label: 'Both' },
        { id: 'eggless',  label: 'Eggless only' },
        { id: 'egg',      label: 'With egg only' },
      ],
    },
    {
      id: 'diet',
      question: 'Any special requirements you can meet?',
      type: 'multi',
      choices: [
        { id: 'vegan',    label: 'Vegan' },
        { id: 'gluten',   label: 'Gluten free' },
        { id: 'nut_free', label: 'Nut free' },
        { id: 'jain',     label: 'Jain' },
        { id: 'diabetic', label: 'Diabetic friendly' },
      ],
    },
    {
      id: 'notice',
      question: 'How much notice do you need?',
      type: 'one',
      choices: [
        { id: 'same', label: 'Same day possible' },
        { id: '1',    label: 'One day' },
        { id: '3',    label: 'Three days' },
        { id: '7',    label: 'A week for tiered cakes' },
      ],
    },
    {
      id: 'delivery',
      question: 'Do you deliver and set up?',
      type: 'one',
      choices: [
        { id: 'setup',  label: 'Yes, delivered and assembled at the venue' },
        { id: 'deliver',label: 'Delivered, they set it up' },
        { id: 'pickup', label: 'Collection only' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     VENUE, TENT, FURNITURE AND THE GROUND ITSELF
     ══════════════════════════════════════════════════════════════════ */

  /* ── Venue ───────────────────────────────────────────────────────
     Seated capacity, parking and the outside-caterer rule. Those three
     decide almost every venue booking in this city and the trade set
     asked about none of them. */
  venue: [
    {
      id: 'kinds',
      question: 'What kind of place is it?',
      type: 'multi',
      choices: [
        { id: 'kalyana',   label: 'Kalyana mantapa' },
        { id: 'banquet',   label: 'Banquet hall' },
        { id: 'hotel',     label: 'Hotel banquet' },
        { id: 'lawn',      label: 'Lawn or garden' },
        { id: 'resort',    label: 'Resort' },
        { id: 'farmhouse', label: 'Farmhouse' },
        { id: 'rooftop',   label: 'Rooftop' },
        { id: 'clubhouse', label: 'Apartment clubhouse' },
        { id: 'convention',label: 'Convention centre' },
        { id: 'temple',    label: 'Temple hall' },
      ],
    },
    {
      id: 'capacity',
      question: 'How many can sit down to eat at once?',
      type: 'one',
      choices: [
        { id: '100',  label: 'Up to 100' },
        { id: '250',  label: 'Up to 250' },
        { id: '500',  label: 'Up to 500' },
        { id: '1000', label: 'Up to 1000' },
        { id: '2000', label: 'More than 1000' },
      ],
    },
    {
      id: 'catering',
      question: 'Can the family bring their own caterer?',
      /* The single most common reason a venue booking collapses after
         the deposit. */
      type: 'one',
      choices: [
        { id: 'free',   label: 'Yes, no charge' },
        { id: 'royalty',label: 'Yes, with a kitchen charge' },
        { id: 'inhouse',label: 'No, our kitchen only' },
      ],
    },
    {
      id: 'facilities',
      question: 'What does the venue have?',
      type: 'multi',
      choices: [
        { id: 'ac',        label: 'Air conditioning' },
        { id: 'rooms',     label: 'Rooms to stay' },
        { id: 'changing',  label: 'Bride and groom rooms' },
        { id: 'parking',   label: 'Parking' },
        { id: 'valet',     label: 'Valet' },
        { id: 'generator', label: 'Generator backup' },
        { id: 'lift',      label: 'Lift' },
        { id: 'stepfree',  label: 'Step-free access' },
        { id: 'homa',      label: 'Homa and fire allowed' },
        { id: 'kitchen',   label: 'A working kitchen' },
        { id: 'stage',     label: 'A built stage' },
        { id: 'dj',        label: 'Loud music allowed' },
      ],
    },
    {
      id: 'parking',
      question: 'How many cars can park?',
      type: 'one',
      choices: [
        { id: '10',  label: 'Under 10' },
        { id: '30',  label: 'Up to 30' },
        { id: '80',  label: 'Up to 80' },
        { id: '200', label: 'More than 80' },
      ],
    },
    {
      id: 'slots',
      question: 'How is the day sold?',
      type: 'multi',
      choices: [
        { id: 'morning', label: 'Morning slot' },
        { id: 'evening', label: 'Evening slot' },
        { id: 'fullday', label: 'Full day' },
        { id: 'twoday',  label: 'Two days, with the previous evening' },
        { id: 'hourly',  label: 'By the hour' },
      ],
    },
  ],

  /* ── Tent and shamiana ───────────────────────────────────────────── */
  tent: [
    {
      id: 'structures',
      question: 'What do you put up?',
      type: 'multi',
      choices: [
        { id: 'shamiana', label: 'Shamiana' },
        { id: 'german',   label: 'German hangar' },
        { id: 'pagoda',   label: 'Pagoda tents' },
        { id: 'canopy',   label: 'Small canopies' },
        { id: 'roof',     label: 'Waterproof roofing' },
        { id: 'walls',    label: 'Side walls and drapes' },
        { id: 'flooring', label: 'Flooring and carpet' },
        { id: 'stage',    label: 'Raised platform' },
        { id: 'entrance', label: 'Entrance gate' },
      ],
    },
    {
      id: 'area',
      question: 'What is the biggest area you can cover?',
      type: 'one',
      choices: [
        { id: '1000',  label: 'Up to 1,000 sq ft' },
        { id: '3000',  label: 'Up to 3,000 sq ft' },
        { id: '8000',  label: 'Up to 8,000 sq ft' },
        { id: '20000', label: 'More than 8,000 sq ft' },
      ],
    },
    {
      id: 'ground',
      question: 'What ground can you work on?',
      type: 'multi',
      choices: [
        { id: 'soil',     label: 'Soil, we can peg' },
        { id: 'concrete', label: 'Concrete, weighted, no pegs' },
        { id: 'slope',    label: 'Sloping ground' },
        { id: 'road',     label: 'A road or lane' },
        { id: 'terrace',  label: 'Terrace' },
      ],
    },
    {
      id: 'monsoon',
      question: 'Is it rain ready?',
      type: 'one',
      choices: [
        { id: 'full',   label: 'Fully waterproof with drainage' },
        { id: 'cover',  label: 'Waterproof roof, open sides' },
        { id: 'dry',    label: 'Dry weather only' },
      ],
    },
  ],

  /* ── Dining furniture ────────────────────────────────────────────── */
  dining: [
    {
      id: 'items',
      question: 'What do you hire out?',
      type: 'multi',
      choices: [
        { id: 'chairs',    label: 'Chairs' },
        { id: 'round',     label: 'Round tables' },
        { id: 'long',      label: 'Long banquet tables' },
        { id: 'cocktail',  label: 'Cocktail tables' },
        { id: 'sofa',      label: 'Sofas and lounge seating' },
        { id: 'mattress',  label: 'Floor seating and mattresses' },
        { id: 'buffet',    label: 'Buffet counters' },
        { id: 'linen',     label: 'Linen and covers' },
        { id: 'crockery',  label: 'Crockery and cutlery' },
        { id: 'chafing',   label: 'Chafing dishes' },
      ],
    },
    {
      id: 'chairs',
      question: 'How many chairs can you send?',
      type: 'one',
      choices: [
        { id: '50',   label: 'Up to 50' },
        { id: '150',  label: 'Up to 150' },
        { id: '400',  label: 'Up to 400' },
        { id: '1000', label: 'More than 400' },
      ],
    },
    {
      id: 'styles',
      question: 'What styles do you stock?',
      type: 'multi',
      choices: [
        { id: 'plastic',  label: 'Plastic moulded' },
        { id: 'banquet',  label: 'Banquet with covers' },
        { id: 'chiavari', label: 'Chiavari' },
        { id: 'cushioned',label: 'Cushioned VIP' },
        { id: 'wooden',   label: 'Wooden and rustic' },
        { id: 'kids',     label: 'Children sized' },
      ],
    },
    {
      id: 'logistics',
      question: 'Who moves and places it?',
      type: 'one',
      choices: [
        { id: 'place',  label: 'We deliver and arrange it as asked' },
        { id: 'drop',   label: 'We drop it at the gate' },
        { id: 'pickup', label: 'They collect from us' },
      ],
    },
  ],

  /* ── Cleanup ─────────────────────────────────────────────────────
     Bought at 1am by somebody who has to hand the hall back by 6. When
     the crew can arrive is the only fact that matters. */
  cleanup: [
    {
      id: 'work',
      question: 'What do you clear?',
      type: 'multi',
      choices: [
        { id: 'plates',   label: 'Leaf and plate clearing' },
        { id: 'waste',    label: 'Food waste' },
        { id: 'decor',    label: 'Decoration material' },
        { id: 'sweep',    label: 'Sweeping and mopping' },
        { id: 'washroom', label: 'Washrooms' },
        { id: 'kitchen',  label: 'Kitchen and vessels' },
        { id: 'segregate',label: 'Wet and dry segregation' },
        { id: 'dispose',  label: 'Taking the waste away' },
      ],
    },
    {
      id: 'timing',
      question: 'When can you work?',
      type: 'multi',
      choices: [
        { id: 'during',   label: 'During the event, continuously' },
        { id: 'after',    label: 'Straight after it ends' },
        { id: 'midnight', label: 'After midnight' },
        { id: 'dawn',     label: 'Before dawn' },
      ],
    },
    {
      id: 'crew',
      question: 'How many can you send?',
      type: 'one',
      choices: [
        { id: '2',  label: 'Two' },
        { id: '5',  label: 'Three to five' },
        { id: '10', label: 'Six to ten' },
        { id: '20', label: 'More than ten' },
      ],
    },
    {
      id: 'disposal',
      question: 'Do you take the waste off site?',
      type: 'one',
      choices: [
        { id: 'yes',   label: 'Yes, to an authorised point' },
        { id: 'bins',  label: 'We bag it and leave it at the bins' },
        { id: 'no',    label: 'No, the venue disposes' },
      ],
    },
  ],

  /* ── Portable washrooms ──────────────────────────────────────────── */
  washrooms: [
    {
      id: 'units',
      question: 'What units do you have?',
      type: 'multi',
      choices: [
        { id: 'basic',    label: 'Basic single cabin' },
        { id: 'western',  label: 'Western commode' },
        { id: 'indian',   label: 'Indian style' },
        { id: 'luxury',   label: 'Luxury trailer with a basin' },
        { id: 'ac',       label: 'Air conditioned' },
        { id: 'urinal',   label: 'Urinal bank' },
        { id: 'accessible', label: 'Wheelchair accessible' },
        { id: 'baby',     label: 'Baby changing' },
      ],
    },
    {
      id: 'count',
      question: 'How many units can you place?',
      type: 'one',
      choices: [
        { id: '2',  label: 'One or two' },
        { id: '6',  label: 'Three to six' },
        { id: '12', label: 'Seven to twelve' },
        { id: '20', label: 'More than twelve' },
      ],
    },
    {
      id: 'services',
      question: 'What comes with them?',
      type: 'multi',
      choices: [
        { id: 'water',    label: 'Water tank filled' },
        { id: 'pump',     label: 'Waste tank and pumping' },
        { id: 'attendant',label: 'An attendant who cleans through the event' },
        { id: 'consumables', label: 'Soap, paper and dustbins' },
        { id: 'light',    label: 'Lighting inside' },
      ],
    },
    {
      id: 'access',
      question: 'What does the site need?',
      type: 'multi',
      choices: [
        { id: 'truck',  label: 'Truck access to the spot' },
        { id: 'flat',   label: 'Flat ground' },
        { id: 'water',  label: 'A water point nearby' },
        { id: 'power',  label: 'A power point' },
        { id: 'none',   label: 'Self contained, nothing needed' },
      ],
    },
  ],

  /* ── Cooling ─────────────────────────────────────────────────────
     Coolers need water and a breeze; air conditioning needs an enclosed
     space and a lot of power. Getting the two confused is why a family
     spends on cooling and stays hot. */
  cooling: [
    {
      id: 'equipment',
      question: 'What do you supply?',
      type: 'multi',
      choices: [
        { id: 'pedestal', label: 'Pedestal fans' },
        { id: 'mist',     label: 'Mist fans' },
        { id: 'cooler',   label: 'Air coolers' },
        { id: 'duct',     label: 'Ducted portable AC' },
        { id: 'cassette', label: 'Cassette AC for tents' },
        { id: 'heater',   label: 'Patio heaters' },
        { id: 'exhaust',  label: 'Exhaust and ventilation' },
      ],
    },
    {
      id: 'space',
      question: 'What size space can you cool?',
      type: 'one',
      choices: [
        { id: '500',   label: 'Up to 500 sq ft' },
        { id: '2000',  label: 'Up to 2,000 sq ft' },
        { id: '5000',  label: 'Up to 5,000 sq ft' },
        { id: '10000', label: 'More than 5,000 sq ft' },
      ],
    },
    {
      id: 'needs',
      question: 'What do you need on site?',
      type: 'multi',
      choices: [
        { id: 'power',   label: 'A three phase point' },
        { id: 'single',  label: 'Ordinary single phase is enough' },
        { id: 'water',   label: 'A water supply' },
        { id: 'enclosed',label: 'An enclosed tent, for AC' },
        { id: 'gen',     label: 'I can bring a generator' },
      ],
    },
    {
      id: 'operator',
      question: 'Does somebody stay with it?',
      type: 'one',
      choices: [
        { id: 'yes',   label: 'Yes, a technician' },
        { id: 'oncall',label: 'On call within the hour' },
        { id: 'no',    label: 'No, delivered and set' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     PEOPLE — the ones who stand there all day
     ══════════════════════════════════════════════════════════════════

     Emcee, hospitality, nanny, valet, bouncer, medic. What they can each
     be asked to do is completely different, and the languages they speak
     matter more than anything the trade set was asking.
     ══════════════════════════════════════════════════════════════════ */

  emcee: [
    {
      id: 'languages',
      question: 'Which languages can you host in?',
      /* The one that decides it. A Kannada wedding with a Hindi-only
         emcee is a room that stops listening. */
      type: 'multi',
      choices: [
        { id: 'kannada',  label: 'Kannada' },
        { id: 'english',  label: 'English' },
        { id: 'hindi',    label: 'Hindi' },
        { id: 'tamil',    label: 'Tamil' },
        { id: 'telugu',   label: 'Telugu' },
        { id: 'malayalam',label: 'Malayalam' },
        { id: 'marathi',  label: 'Marathi' },
        { id: 'tulu',     label: 'Tulu or Konkani' },
        { id: 'urdu',     label: 'Urdu' },
      ],
    },
    {
      id: 'events',
      question: 'What do you host?',
      type: 'multi',
      choices: [
        { id: 'wedding',   label: 'Weddings' },
        { id: 'reception', label: 'Receptions' },
        { id: 'sangeet',   label: 'Sangeet and games' },
        { id: 'corporate', label: 'Corporate events' },
        { id: 'award',     label: 'Award nights' },
        { id: 'birthday',  label: 'Birthdays' },
        { id: 'school',    label: 'School and college' },
        { id: 'launch',    label: 'Product launches' },
      ],
    },
    {
      id: 'does',
      question: 'What do you take on?',
      type: 'multi',
      choices: [
        { id: 'script',   label: 'Writing the script' },
        { id: 'games',    label: 'Running games' },
        { id: 'flow',     label: 'Keeping the programme to time' },
        { id: 'coord',    label: 'Cueing the DJ and the lights' },
        { id: 'intro',    label: 'Family introductions' },
        { id: 'standup',  label: 'Comedy in between' },
        { id: 'sing',     label: 'Singing if needed' },
      ],
    },
    {
      id: 'hours',
      question: 'How long do you stay?',
      type: 'one',
      choices: [
        { id: '2',  label: 'Up to 2 hours' },
        { id: '4',  label: 'Up to 4 hours' },
        { id: '8',  label: 'A full day' },
        { id: 'multi', label: 'Several days' },
      ],
    },
  ],

  /* ── Hospitality staff ───────────────────────────────────────────── */
  hospitality: [
    {
      id: 'roles',
      question: 'What roles can you supply?',
      type: 'multi',
      choices: [
        { id: 'welcome',  label: 'Welcome and greeting' },
        { id: 'usher',    label: 'Ushers and seating' },
        { id: 'server',   label: 'Food and drink servers' },
        { id: 'gift',     label: 'Gift counter' },
        { id: 'reception',label: 'Reception desk' },
        { id: 'water',    label: 'Water and tea rounds' },
        { id: 'cloak',    label: 'Cloakroom' },
        { id: 'elders',   label: 'Helping elderly guests' },
      ],
    },
    {
      id: 'languages',
      question: 'Which languages do your staff speak?',
      type: 'multi',
      choices: [
        { id: 'kannada', label: 'Kannada' },
        { id: 'english', label: 'English' },
        { id: 'hindi',   label: 'Hindi' },
        { id: 'tamil',   label: 'Tamil' },
        { id: 'telugu',  label: 'Telugu' },
      ],
    },
    {
      id: 'count',
      question: 'How many can you send at once?',
      type: 'one',
      choices: [
        { id: '2',  label: 'Two' },
        { id: '6',  label: 'Three to six' },
        { id: '15', label: 'Seven to fifteen' },
        { id: '30', label: 'More than fifteen' },
      ],
    },
    {
      id: 'uniform',
      question: 'How do they turn up?',
      type: 'one',
      choices: [
        { id: 'uniform',    label: 'In our own uniform' },
        { id: 'traditional',label: 'Traditional dress if asked' },
        { id: 'formal',     label: 'Formal black and white' },
      ],
    },
  ],

  /* ── Nanny and childcare ─────────────────────────────────────────
     A stranger looking after somebody's child. Verification is not a
     nice-to-have here, it is the entire basis of the booking. */
  nanny: [
    {
      id: 'ages',
      question: 'Which ages can you look after?',
      type: 'multi',
      choices: [
        { id: 'infant',  label: 'Under 1' },
        { id: 'toddler',  label: '1 to 3' },
        { id: 'preschool',label: '3 to 6' },
        { id: 'school',   label: '6 to 12' },
      ],
    },
    {
      id: 'checks',
      question: 'What can you show us?',
      type: 'multi',
      choices: [
        { id: 'police',   label: 'Police verification' },
        { id: 'aadhaar',  label: 'Aadhaar and address proof' },
        { id: 'reference',label: 'References from families' },
        { id: 'firstaid', label: 'First aid training' },
        { id: 'creche',   label: 'Creche or nursing experience' },
      ],
    },
    {
      id: 'ratio',
      question: 'How many children to one of you?',
      type: 'one',
      choices: [
        { id: '1',  label: 'One at a time' },
        { id: '3',  label: 'Up to three' },
        { id: '6',  label: 'Up to six, in a play area' },
      ],
    },
    {
      id: 'does',
      question: 'What will you do?',
      type: 'multi',
      choices: [
        { id: 'watch',   label: 'Watch them at the venue' },
        { id: 'feed',    label: 'Feeding' },
        { id: 'nappy',   label: 'Nappy changing' },
        { id: 'play',    label: 'Games and activities' },
        { id: 'sleep',   label: 'Settling them to sleep' },
        { id: 'home',    label: 'At their home, not the venue' },
      ],
    },
  ],

  /* ── Valet parking ───────────────────────────────────────────────
     Somebody else driving a guest's car. Insurance and licences are the
     booking; the rest is logistics. */
  valet: [
    {
      id: 'cars',
      question: 'How many cars can you handle?',
      type: 'one',
      choices: [
        { id: '20',  label: 'Up to 20' },
        { id: '50',  label: 'Up to 50' },
        { id: '120', label: 'Up to 120' },
        { id: '250', label: 'More than 120' },
      ],
    },
    {
      id: 'staff',
      question: 'How many valets come?',
      type: 'one',
      choices: [
        { id: '2',  label: 'Two' },
        { id: '5',  label: 'Three to five' },
        { id: '10', label: 'Six to ten' },
        { id: '20', label: 'More than ten' },
      ],
    },
    {
      id: 'cover',
      question: 'What protects the guest and their car?',
      type: 'multi',
      choices: [
        { id: 'insured', label: 'Valet insurance cover' },
        { id: 'licence', label: 'Every driver licensed' },
        { id: 'tokens',  label: 'Numbered tokens' },
        { id: 'uniform', label: 'Uniformed and badged' },
        { id: 'log',     label: 'A written key log' },
        { id: 'damage',  label: 'A damage check before driving' },
      ],
    },
    {
      id: 'vehicles',
      question: 'What can your drivers handle?',
      type: 'multi',
      choices: [
        { id: 'manual',   label: 'Manual' },
        { id: 'automatic',label: 'Automatic' },
        { id: 'luxury',   label: 'Luxury cars' },
        { id: 'suv',      label: 'Large SUVs' },
        { id: 'two',      label: 'Two wheelers' },
      ],
    },
  ],

  /* ── Bouncers and security ───────────────────────────────────────── */
  bouncers: [
    {
      id: 'duties',
      question: 'What do you do?',
      type: 'multi',
      choices: [
        { id: 'gate',      label: 'Gate and guest list' },
        { id: 'crowd',     label: 'Crowd control' },
        { id: 'vip',       label: 'VIP escort' },
        { id: 'bar',       label: 'Bar and dance floor' },
        { id: 'gift',      label: 'Guarding the gift counter' },
        { id: 'night',     label: 'Overnight watch on the venue' },
        { id: 'female',    label: 'Female security staff' },
        { id: 'plain',     label: 'Plain clothes' },
      ],
    },
    {
      id: 'count',
      question: 'How many can you send?',
      type: 'one',
      choices: [
        { id: '2',  label: 'Two' },
        { id: '6',  label: 'Three to six' },
        { id: '15', label: 'Seven to fifteen' },
        { id: '30', label: 'More than fifteen' },
      ],
    },
    {
      id: 'credentials',
      question: 'What can you show?',
      type: 'multi',
      choices: [
        { id: 'psara',    label: 'PSARA licensed agency' },
        { id: 'police',   label: 'Police verified staff' },
        { id: 'trained',  label: 'Trained in crowd handling' },
        { id: 'exforces', label: 'Ex-forces or ex-police' },
        { id: 'firstaid', label: 'First aid trained' },
      ],
    },
    {
      id: 'hours',
      question: 'Shift lengths you work?',
      type: 'multi',
      choices: [
        { id: '4',     label: '4 hours' },
        { id: '8',     label: '8 hours' },
        { id: '12',    label: '12 hours' },
        { id: 'night', label: 'Overnight' },
      ],
    },
  ],

  /* ── Medical standby ─────────────────────────────────────────────
     What they are qualified to do is the whole question. A first aider
     with a box and a paramedic with an ambulance are not alternatives,
     and a family booking "medical" has no way to tell them apart. */
  medical: [
    {
      id: 'level',
      question: 'What are you qualified as?',
      type: 'one',
      choices: [
        { id: 'firstaid',  label: 'Certified first aider' },
        { id: 'nurse',     label: 'Registered nurse' },
        { id: 'paramedic', label: 'Paramedic' },
        { id: 'doctor',    label: 'Doctor' },
      ],
    },
    {
      id: 'brings',
      question: 'What do you bring?',
      type: 'multi',
      choices: [
        { id: 'kit',       label: 'First aid kit' },
        { id: 'oxygen',    label: 'Oxygen' },
        { id: 'aed',       label: 'Defibrillator' },
        { id: 'stretcher', label: 'Stretcher' },
        { id: 'ambulance', label: 'An ambulance' },
        { id: 'bls',       label: 'Basic life support ambulance' },
        { id: 'als',       label: 'Advanced life support ambulance' },
        { id: 'meds',      label: 'Common medicines' },
      ],
    },
    {
      id: 'handles',
      question: 'What can you deal with on site?',
      type: 'multi',
      choices: [
        { id: 'cuts',      label: 'Cuts and burns' },
        { id: 'fainting',  label: 'Fainting and dehydration' },
        { id: 'allergy',   label: 'Food allergy reactions' },
        { id: 'cardiac',   label: 'Cardiac emergency until transfer' },
        { id: 'elderly',   label: 'Elderly guests needing monitoring' },
        { id: 'children',  label: 'Children' },
        { id: 'transfer',  label: 'Transfer to a hospital' },
      ],
    },
    {
      id: 'hours',
      question: 'How long do you stand by?',
      type: 'one',
      choices: [
        { id: '4',  label: '4 hours' },
        { id: '8',  label: '8 hours' },
        { id: '12', label: '12 hours' },
        { id: 'multi', label: 'Across several days' },
      ],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════
     RITUALS, PRINT, GIFTS AND PLANNING — the last eleven
     ══════════════════════════════════════════════════════════════════ */

  /* ── Priest ──────────────────────────────────────────────────────
     Sampradaya is the question. A family does not want "a priest"; they
     want somebody who performs their tradition, in their language, and
     a mismatch is felt by every elder in the room. */
  priest: [
    {
      id: 'tradition',
      question: 'Which tradition do you perform?',
      type: 'multi',
      choices: [
        { id: 'smartha',    label: 'Smartha' },
        { id: 'madhwa',     label: 'Madhwa' },
        { id: 'srivaishnava', label: 'Srivaishnava' },
        { id: 'lingayat',   label: 'Lingayat and Veerashaiva' },
        { id: 'arya',       label: 'Arya Samaj' },
        { id: 'jain',       label: 'Jain' },
        { id: 'buddhist',   label: 'Buddhist' },
        { id: 'general',    label: 'General Hindu, any community' },
      ],
    },
    {
      id: 'ceremonies',
      question: 'Which ceremonies do you conduct?',
      type: 'multi',
      choices: [
        { id: 'wedding',    label: 'Wedding' },
        { id: 'engagement', label: 'Nischitartha' },
        { id: 'upanayana',  label: 'Upanayana' },
        { id: 'naming',     label: 'Namakarana and cradle' },
        { id: 'seemantha',  label: 'Seemantha' },
        { id: 'griha',      label: 'Griha pravesha' },
        { id: 'satyanarayana', label: 'Satyanarayana pooja' },
        { id: 'homa',       label: 'Homa and havan' },
        { id: 'shraddha',   label: 'Shraddha and tarpana' },
        { id: 'antyeshti',  label: 'Last rites' },
        { id: 'vahana',     label: 'Vehicle pooja' },
        { id: 'shanti',     label: 'Shanti and graha pooja' },
      ],
    },
    {
      id: 'languages',
      question: 'Which languages can you explain in?',
      /* The mantras are Sanskrit. What the couple is being asked to
         understand is not, and a priest who cannot explain in the
         family's language leaves them following along blindly. */
      type: 'multi',
      choices: [
        { id: 'kannada',  label: 'Kannada' },
        { id: 'sanskrit', label: 'Sanskrit' },
        { id: 'tamil',    label: 'Tamil' },
        { id: 'telugu',   label: 'Telugu' },
        { id: 'hindi',    label: 'Hindi' },
        { id: 'english',  label: 'English' },
        { id: 'marathi',  label: 'Marathi' },
        { id: 'tulu',     label: 'Tulu or Konkani' },
      ],
    },
    {
      id: 'samagri',
      question: 'Who brings the pooja samagri?',
      type: 'one',
      choices: [
        { id: 'me',     label: 'I bring everything' },
        { id: 'list',   label: 'I send a list, the family buys it' },
        { id: 'both',   label: 'Either, as they prefer' },
      ],
    },
    {
      id: 'timing',
      question: 'Will you start at brahma muhurta?',
      type: 'one',
      choices: [
        { id: 'any',   label: 'Yes, any hour' },
        { id: 'from4', label: 'From 4am' },
        { id: 'from7', label: 'From 7am' },
      ],
    },
  ],

  /* ── Pooja arrangements ──────────────────────────────────────────
     Not the priest. The person who brings the samagri, the kalash, the
     mango leaves and the fire pit — and it is a separate booking. */
  pooja: [
    {
      id: 'supplies',
      question: 'What do you arrange?',
      type: 'multi',
      choices: [
        { id: 'samagri',  label: 'Full pooja samagri kit' },
        { id: 'kalash',   label: 'Kalash and vessels' },
        { id: 'leaves',   label: 'Mango leaves and banana stems' },
        { id: 'flowers',  label: 'Flowers and garlands' },
        { id: 'fruits',   label: 'Fruits and coconut' },
        { id: 'homa',     label: 'Homa kunda and firewood' },
        { id: 'ghee',     label: 'Ghee, camphor and sambrani' },
        { id: 'idol',     label: 'Idols and framed photos' },
        { id: 'mats',     label: 'Mats and seating for the ritual' },
        { id: 'rangoli',  label: 'Rangoli' },
      ],
    },
    {
      id: 'occasions',
      question: 'Which functions do you supply for?',
      type: 'multi',
      choices: [
        { id: 'wedding',    label: 'Wedding' },
        { id: 'griha',      label: 'Griha pravesha' },
        { id: 'satyanarayana', label: 'Satyanarayana pooja' },
        { id: 'naming',     label: 'Naming and cradle' },
        { id: 'upanayana',  label: 'Upanayana' },
        { id: 'shraddha',   label: 'Shraddha' },
        { id: 'festival',   label: 'Festivals' },
        { id: 'vahana',     label: 'Vehicle pooja' },
      ],
    },
    {
      id: 'setup',
      question: 'Do you set it out too?',
      type: 'one',
      choices: [
        { id: 'setup',   label: 'Yes, arranged and ready' },
        { id: 'deliver', label: 'Delivered in a kit' },
        { id: 'both',    label: 'Either' },
      ],
    },
    {
      id: 'notice',
      question: 'Shortest notice you can take?',
      type: 'one',
      choices: [
        { id: 'hours', label: 'A few hours' },
        { id: '1',     label: 'Next day' },
        { id: '3',     label: 'Three days' },
      ],
    },
  ],

  /* ── Invitations ─────────────────────────────────────────────────── */
  invitations: [
    {
      id: 'formats',
      question: 'What do you make?',
      type: 'multi',
      choices: [
        { id: 'printed',   label: 'Printed cards' },
        { id: 'boxed',     label: 'Boxed invitations' },
        { id: 'scroll',    label: 'Scroll invitations' },
        { id: 'digital',   label: 'Digital cards' },
        { id: 'video',     label: 'Video invitations' },
        { id: 'caricature',label: 'Caricature and illustrated' },
        { id: 'website',   label: 'A wedding website' },
        { id: 'envelope',  label: 'Envelopes and inserts' },
        { id: 'seal',      label: 'Wax seals and ribbons' },
      ],
    },
    {
      id: 'languages',
      question: 'Which scripts can you set?',
      type: 'multi',
      choices: [
        { id: 'kannada', label: 'Kannada' },
        { id: 'english', label: 'English' },
        { id: 'hindi',   label: 'Hindi and Devanagari' },
        { id: 'tamil',   label: 'Tamil' },
        { id: 'telugu',  label: 'Telugu' },
        { id: 'urdu',    label: 'Urdu' },
        { id: 'sanskrit',label: 'Sanskrit shlokas' },
      ],
    },
    {
      id: 'moq',
      question: 'What is your smallest order?',
      type: 'one',
      choices: [
        { id: '1',   label: 'One, for digital' },
        { id: '25',  label: '25 cards' },
        { id: '50',  label: '50 cards' },
        { id: '100', label: '100 cards' },
      ],
    },
    {
      id: 'turnaround',
      question: 'How fast can you deliver?',
      type: 'one',
      choices: [
        { id: 'same', label: 'Same day, digital' },
        { id: '2',    label: 'Two days' },
        { id: '5',    label: 'Five days' },
        { id: '10',   label: 'Ten days or more' },
      ],
    },
  ],

  /* ── Signage ─────────────────────────────────────────────────────── */
  signage: [
    {
      id: 'items',
      question: 'What do you make?',
      type: 'multi',
      choices: [
        { id: 'welcome',   label: 'Welcome boards' },
        { id: 'nameboard', label: 'Name and monogram boards' },
        { id: 'seating',   label: 'Seating charts' },
        { id: 'table',     label: 'Table numbers' },
        { id: 'menu',      label: 'Menu boards' },
        { id: 'direction', label: 'Direction and parking signs' },
        { id: 'neon',      label: 'Neon signs' },
        { id: 'mirror',    label: 'Mirror and acrylic signs' },
        { id: 'standee',   label: 'Standees and flex' },
        { id: 'hashtag',   label: 'Hashtag and photo props' },
      ],
    },
    {
      id: 'materials',
      question: 'What do you print or cut on?',
      type: 'multi',
      choices: [
        { id: 'acrylic',  label: 'Acrylic' },
        { id: 'foam',     label: 'Foam board' },
        { id: 'flex',     label: 'Flex and vinyl' },
        { id: 'wood',     label: 'Wood' },
        { id: 'mirror',   label: 'Mirror' },
        { id: 'fabric',   label: 'Fabric' },
        { id: 'led',      label: 'LED and neon flex' },
      ],
    },
    {
      id: 'install',
      question: 'Do you install at the venue?',
      type: 'one',
      choices: [
        { id: 'yes',    label: 'Yes, we put them up' },
        { id: 'deliver',label: 'Delivered ready to stand' },
        { id: 'pickup', label: 'Collection only' },
      ],
    },
    {
      id: 'turnaround',
      question: 'How fast?',
      type: 'one',
      choices: [
        { id: 'same', label: 'Same day' },
        { id: '2',    label: 'Two days' },
        { id: '5',    label: 'Five days' },
      ],
    },
  ],

  /* ── Return gifts ────────────────────────────────────────────────
     A shop with stock. The minimum order and the per-piece budget are
     the only two things a family is deciding between. */
  return_gifts: [
    {
      id: 'kinds',
      question: 'What do you stock?',
      type: 'multi',
      choices: [
        { id: 'brass',     label: 'Brass and traditional items' },
        { id: 'silver',    label: 'Silver coated' },
        { id: 'sweets',    label: 'Sweet boxes' },
        { id: 'dryfruit',  label: 'Dry fruit boxes' },
        { id: 'plants',    label: 'Plants and saplings' },
        { id: 'eco',       label: 'Eco friendly and jute' },
        { id: 'kitchen',   label: 'Kitchen and household' },
        { id: 'kids',      label: 'Toys and children gifts' },
        { id: 'religious', label: 'Idols and pooja items' },
        { id: 'custom',    label: 'Personalised and printed' },
      ],
    },
    {
      id: 'budget',
      question: 'What per-piece range do you cover?',
      type: 'multi',
      choices: [
        { id: 'u50',    label: 'Under ₹50' },
        { id: '50_150', label: '₹50 to ₹150' },
        { id: '150_400',label: '₹150 to ₹400' },
        { id: '400_1000', label: '₹400 to ₹1,000' },
        { id: 'over',   label: 'Above ₹1,000' },
      ],
    },
    {
      id: 'moq',
      question: 'Smallest order you will take?',
      type: 'one',
      choices: [
        { id: '10',  label: '10 pieces' },
        { id: '25',  label: '25 pieces' },
        { id: '50',  label: '50 pieces' },
        { id: '100', label: '100 pieces' },
      ],
    },
    {
      id: 'extras',
      question: 'What else do you do?',
      type: 'multi',
      choices: [
        { id: 'wrap',     label: 'Gift wrapping' },
        { id: 'tag',      label: 'Name tags and thank you notes' },
        { id: 'bulk',     label: 'Bulk delivery to the venue' },
        { id: 'sample',   label: 'A sample before the order' },
        { id: 'return',   label: 'Unused pieces taken back' },
      ],
    },
  ],

  /* ── Corporate and bulk gifting ──────────────────────────────────
     A different customer from return gifts: an office buying 300 of one
     thing, with a logo on it, against an invoice. */
  gifting: [
    {
      id: 'kinds',
      question: 'What do you supply?',
      type: 'multi',
      choices: [
        { id: 'hamper',    label: 'Hampers' },
        { id: 'dryfruit',  label: 'Dry fruit and chocolate boxes' },
        { id: 'desk',      label: 'Desk and stationery sets' },
        { id: 'bottle',    label: 'Bottles and mugs' },
        { id: 'apparel',   label: 'T-shirts and apparel' },
        { id: 'tech',      label: 'Tech and gadgets' },
        { id: 'wellness',  label: 'Wellness and self-care' },
        { id: 'plants',    label: 'Plants' },
        { id: 'voucher',   label: 'Vouchers' },
        { id: 'artisan',   label: 'Handmade and artisan' },
      ],
    },
    {
      id: 'branding',
      question: 'Can you brand them?',
      type: 'multi',
      choices: [
        { id: 'print',   label: 'Printing' },
        { id: 'engrave', label: 'Laser engraving' },
        { id: 'embroid', label: 'Embroidery' },
        { id: 'box',     label: 'Custom printed boxes' },
        { id: 'card',    label: 'Personalised note cards' },
        { id: 'none',    label: 'No branding' },
      ],
    },
    {
      id: 'volume',
      question: 'What order sizes do you take?',
      type: 'one',
      choices: [
        { id: '25',   label: 'From 25' },
        { id: '100',  label: 'From 100' },
        { id: '500',  label: 'Up to 500' },
        { id: '1000', label: 'More than 500' },
      ],
    },
    {
      id: 'paperwork',
      question: 'What can you provide?',
      type: 'multi',
      choices: [
        { id: 'gst',      label: 'GST invoice' },
        { id: 'credit',   label: 'Credit terms' },
        { id: 'multi',    label: 'Delivery to several addresses' },
        { id: 'courier',  label: 'Courier to employees at home' },
        { id: 'po',       label: 'Working against a purchase order' },
      ],
    },
  ],

  /* ── Trousseau packing ───────────────────────────────────────────
     Paid for the hands, not for stock — which is the distinction the
     catalogue note already draws and the questions never did. */
  trousseau: [
    {
      id: 'items',
      question: 'What do you pack?',
      type: 'multi',
      choices: [
        { id: 'saree',     label: 'Sarees' },
        { id: 'clothes',   label: 'Clothes and lehenga' },
        { id: 'jewellery', label: 'Jewellery' },
        { id: 'sweets',    label: 'Sweets and fruits' },
        { id: 'pooja',     label: 'Pooja items' },
        { id: 'coconut',   label: 'Coconut and betel trays' },
        { id: 'cosmetics', label: 'Cosmetics and toiletries' },
        { id: 'gifts',     label: 'Gifts for the other family' },
      ],
    },
    {
      id: 'styles',
      question: 'What styles do you do?',
      type: 'multi',
      choices: [
        { id: 'tray',      label: 'Decorated trays' },
        { id: 'basket',    label: 'Baskets' },
        { id: 'box',       label: 'Boxes with sleeves' },
        { id: 'fold',      label: 'Fan and pleat saree folds' },
        { id: 'flower',    label: 'Fresh flower finishing' },
        { id: 'net',       label: 'Net and organza wrap' },
        { id: 'theme',     label: 'Colour themed to the function' },
      ],
    },
    {
      id: 'volume',
      question: 'How many trays can you do in a day?',
      type: 'one',
      choices: [
        { id: '10', label: 'Up to 10' },
        { id: '25', label: 'Up to 25' },
        { id: '50', label: 'Up to 50' },
        { id: 'more',label: 'More, with a team' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you work?',
      type: 'multi',
      choices: [
        { id: 'home',  label: 'At their home' },
        { id: 'mine',  label: 'At my place, then delivered' },
        { id: 'venue', label: 'At the venue' },
      ],
    },
  ],

  /* ── Gift packing ────────────────────────────────────────────────
     The counter at the venue, or the shop before it. Volume per hour is
     what a family with 200 gifts to wrap actually needs to know. */
  gift_packing: [
    {
      id: 'work',
      question: 'What do you wrap?',
      type: 'multi',
      choices: [
        { id: 'return',    label: 'Return gifts, in bulk' },
        { id: 'trousseau', label: 'Trousseau trays' },
        { id: 'sweets',    label: 'Sweet and dry fruit boxes' },
        { id: 'corporate', label: 'Corporate hampers' },
        { id: 'personal',  label: 'Individual presents' },
        { id: 'baskets',   label: 'Basket assembly' },
      ],
    },
    {
      id: 'finish',
      question: 'What finishing do you offer?',
      type: 'multi',
      choices: [
        { id: 'paper',   label: 'Printed gift paper' },
        { id: 'fabric',  label: 'Fabric and organza' },
        { id: 'jute',    label: 'Jute and eco wrap' },
        { id: 'ribbon',  label: 'Ribbon and bows' },
        { id: 'tag',     label: 'Name tags' },
        { id: 'seal',    label: 'Wax seal' },
        { id: 'flower',  label: 'Dried flower finishing' },
      ],
    },
    {
      id: 'rate',
      question: 'How many can you wrap in an hour?',
      type: 'one',
      choices: [
        { id: '15',  label: 'About 15' },
        { id: '40',  label: 'About 40' },
        { id: '80',  label: 'About 80' },
        { id: 'team',label: 'More, with a team' },
      ],
    },
    {
      id: 'where',
      question: 'Where do you work?',
      type: 'multi',
      choices: [
        { id: 'home',    label: 'At their home' },
        { id: 'mine',    label: 'At my place' },
        { id: 'venue',   label: 'A counter at the venue' },
        { id: 'material',label: 'They supply the material' },
      ],
    },
  ],

  /* ── Wedding planner ─────────────────────────────────────────────
     What they take responsibility FOR is the booking. "Full planning"
     and "on the day only" are different jobs at ten times the price
     difference, and the trade set asked about neither. */
  planner: [
    {
      id: 'scope',
      question: 'What do you take on?',
      type: 'multi',
      choices: [
        { id: 'full',     label: 'Full planning, start to finish' },
        { id: 'partial',  label: 'Partial, from a point onwards' },
        { id: 'onday',    label: 'On the day coordination only' },
        { id: 'venue',    label: 'Finding the venue' },
        { id: 'vendors',  label: 'Finding and managing suppliers' },
        { id: 'budget',   label: 'Budget planning and tracking' },
        { id: 'design',   label: 'Design and theme' },
        { id: 'guest',    label: 'Guest management and stay' },
        { id: 'destination', label: 'Destination weddings' },
      ],
    },
    {
      id: 'functions',
      question: 'Which functions do you handle?',
      type: 'multi',
      choices: [
        { id: 'engagement', label: 'Engagement' },
        { id: 'haldi',      label: 'Haldi and mehendi' },
        { id: 'sangeet',    label: 'Sangeet' },
        { id: 'wedding',    label: 'Wedding day' },
        { id: 'reception',  label: 'Reception' },
        { id: 'corporate',  label: 'Corporate events' },
        { id: 'birthday',   label: 'Birthdays and anniversaries' },
      ],
    },
    {
      id: 'team',
      question: 'How many of your people are on site that day?',
      type: 'one',
      choices: [
        { id: '1',  label: 'Just me' },
        { id: '3',  label: 'Two or three' },
        { id: '6',  label: 'Four to six' },
        { id: '10', label: 'More than six' },
      ],
    },
    {
      id: 'scale',
      question: 'What is the largest wedding you have run?',
      type: 'one',
      choices: [
        { id: '100',  label: 'Up to 100 guests' },
        { id: '300',  label: 'Up to 300' },
        { id: '700',  label: 'Up to 700' },
        { id: '1500', label: 'More than 700' },
      ],
    },
    {
      id: 'notice',
      question: 'How far ahead do you need to be booked?',
      type: 'one',
      choices: [
        { id: '1w',  label: 'A week is enough' },
        { id: '1m',  label: 'A month' },
        { id: '3m',  label: 'Three months' },
        { id: '6m',  label: 'Six months or more' },
      ],
    },
  ],

  /* ── Permits and clearances ──────────────────────────────────────
     Somebody who deals with offices on the family's behalf. Which
     office is the whole service — a person who can get a loudspeaker
     permission cannot necessarily get an excise licence. */
  permits: [
    {
      id: 'permits',
      question: 'Which permissions can you obtain?',
      type: 'multi',
      choices: [
        { id: 'loudspeaker', label: 'Loudspeaker permission' },
        { id: 'road',        label: 'Road and procession permission' },
        { id: 'excise',      label: 'Temporary excise licence' },
        { id: 'fire',        label: 'Fire department NOC' },
        { id: 'police',      label: 'Police NOC for a gathering' },
        { id: 'bbmp',        label: 'BBMP trade and event permission' },
        { id: 'drone',       label: 'Drone flying permission' },
        { id: 'fireworks',   label: 'Fireworks permission' },
        { id: 'parking',     label: 'Parking and traffic arrangement' },
        { id: 'marriage',    label: 'Marriage registration' },
      ],
    },
    {
      id: 'areas',
      question: 'Which authorities do you deal with?',
      type: 'multi',
      choices: [
        { id: 'bbmp',    label: 'BBMP' },
        { id: 'police',  label: 'Bengaluru city police' },
        { id: 'rural',   label: 'Bengaluru rural' },
        { id: 'excise',  label: 'Excise department' },
        { id: 'fire',    label: 'Fire and emergency services' },
        { id: 'pcb',     label: 'Pollution control board' },
        { id: 'subreg',  label: 'Sub-registrar office' },
      ],
    },
    {
      id: 'time',
      question: 'How long do you need?',
      type: 'one',
      choices: [
        { id: '3',   label: 'Three days' },
        { id: '7',   label: 'A week' },
        { id: '15',  label: 'Two weeks' },
        { id: '30',  label: 'A month' },
      ],
    },
    {
      id: 'terms',
      question: 'How do you charge?',
      /* Said plainly, because the government fee and the agent's fee
         being quoted as one number is where these arrangements go
         wrong and the family feels cheated. */
      type: 'one',
      choices: [
        { id: 'separate', label: 'My fee separate, government fees at cost' },
        { id: 'allin',    label: 'One all-inclusive figure' },
        { id: 'success',  label: 'Only if the permission comes through' },
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
