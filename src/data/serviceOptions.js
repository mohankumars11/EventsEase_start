// What is actually inside a service, so the catalogue can stop being a list of
// buttons.
//
// ── The problem ─────────────────────────────────────────────────────────
// The occasion page used to render every service as one row: an emoji, a name,
// a one-line description and an "Add to Cart" button. "Catering & Buffet —
// Full buffet, live counters, multi-cuisine. [Add to Cart]" is not an offer, it
// is a placeholder for one. Somebody choosing a caterer is choosing the food,
// and the food was the one thing the page would not show them; somebody
// choosing decor wants to know whether a stage is included at their level, and
// the row could not say.
//
// So every service opens. Underneath the row sit the real choices — the
// cuisines and their dish lists, the decor levels and what each one installs,
// the coverage a photographer actually delivers — and "Add to Cart" becomes the
// last thing on the card rather than the only thing on it.
//
// ── Where the content comes from ────────────────────────────────────────
// Nothing here restates data that already exists. The three services with a
// real catalogue behind them delegate to it:
//
//   catering / cooks / menu / welcome drinks  → cuisineMenus.js  (kind: 'menu')
//   decor / stage / floral / balloon arch /
//   mandap / lighting / candle setup          → decorPackages.js (kind: 'decor')
//   cake                                      → cakeStyles + the cake shop
//
// Everything else carries a curated option list here, because there was no
// other home for it — a DJ's rig, a photographer's deliverables and a security
// crew's brief are real decisions with no data file of their own. They are
// written as things a coordinator would genuinely offer and are deliberately
// free of prices: the per-service rate comes from servicePricing.js, which is
// the one place a number is allowed to live.
//
// Same standing caveat as every other estimate in this app — pre-launch, no
// signed supplier behind any of it.

import { SERVICE_BY_ID } from './servicePricing'

/** Services whose options are the cuisine catalogue. */
export const MENU_SERVICES = new Set(['catering', 'cooks', 'menu', 'welcome_drinks'])

/** Services whose options are the decor ladder. */
export const DECOR_SERVICES = new Set([
  'decor', 'stage', 'floral', 'balloon_arch', 'mandap', 'lighting', 'candle_setup',
])

/**
 * The curated lists.
 *
 * `groups` is what the card renders: a heading, an optional hint, and the
 * options under it. Two to three groups each — the first is always "what you
 * are actually choosing between", the last is always "what comes with it or
 * what you can add", because that is the order the question gets asked in.
 */
const SERVICE_OPTIONS = {
  venue: {
    blurb: 'We hold the date, negotiate the rate and read the fine print before you sign anything.',
    groups: [
      {
        label: 'The kind of room',
        hint: 'Tell us the shape and we shortlist three that fit your date',
        items: [
          { name: 'Banquet hall, air-conditioned', note: 'The default for 100–400 guests' },
          { name: 'Community or kalyana mantapa', note: 'Traditional layout, own kitchen, usually the best value' },
          { name: 'Garden or lawn', note: 'Evenings and winter dates; we add a tent as backup' },
          { name: 'Rooftop or terrace', note: 'Up to about 120, best after sunset' },
          { name: 'Resort or farmhouse', note: 'Day-long events and out-of-town family' },
          { name: 'Hotel banquet', note: 'When rooms for guests matter as much as the hall' },
          { name: 'Your own home or apartment clubhouse', note: 'No hire charge — we work around your space' },
        ],
      },
      {
        label: 'What we check before recommending one',
        items: [
          { name: 'Whether outside catering is allowed', note: 'The single biggest cost difference between two halls' },
          { name: 'Parking, lift access and generator backup' },
          { name: 'The real capacity seated, not the brochure number' },
          { name: 'Sound curfew and decor restrictions' },
          { name: 'What the cancellation and postponement terms actually say' },
        ],
      },
      {
        label: 'Booked with the venue',
        items: [
          { name: 'Extra hours for setup the previous evening' },
          { name: 'A second room for the family to change and rest' },
          { name: 'Rooms for out-of-town guests, at the hall’s rate' },
        ],
      },
    ],
  },

  dining: {
    blurb: 'Seating, linen and the tableware — sized to your guest list, set before anyone arrives and cleared after.',
    groups: [
      {
        label: 'How your guests sit',
        items: [
          { name: 'Round tables of ten, seated', note: 'The standard reception layout' },
          { name: 'Long banquet rows', note: 'Traditional; more people per square foot' },
          { name: 'Banana-leaf pankti seating', note: 'Served in batches, the way a proper leaf meal is eaten' },
          { name: 'Buffet with high tables and standing rounds', note: 'Cocktail and get-together format' },
          { name: 'Floor seating with low tables', note: 'Poojas, seemantham, traditional ceremonies' },
          { name: 'Theatre rows plus a dining area', note: 'When there is a programme before the meal' },
        ],
      },
      {
        label: 'On the table',
        items: [
          { name: 'Steel thali service', note: 'Included as standard' },
          { name: 'Banana leaf with steel tumblers' },
          { name: 'Melamine or bone china for a formal sit-down', note: 'Adds to the per-seat rate' },
          { name: 'Table linen, runners and chair covers' },
          { name: 'Water bottles or copper jugs at each table' },
        ],
      },
      {
        label: 'Also arranged',
        items: [
          { name: 'A separate elders’ section with back-support chairs' },
          { name: 'High chairs for small children' },
          { name: 'Serving staff at the ratio the menu needs' },
          { name: 'Clearing and waste segregation after the meal' },
        ],
      },
    ],
  },

  cooks: {
    blurb: 'Cooks who come to your kitchen or set up at the venue, and cook the meal in front of you.',
  },

  cake: {
    blurb: 'Designed, baked and delivered chilled on the day — or picked straight off the cake shelf if you want it tomorrow.',
    groups: [
      {
        label: 'The kind of cake',
        items: [
          { name: 'Photo-print or edible-image cake', note: 'Your photo, printed in icing' },
          { name: 'Themed fondant cake', note: 'Characters, hobbies, a place — sculpted' },
          { name: 'Tiered celebration cake', note: 'Two to five tiers, for the cutting shot' },
          { name: 'Cream and fresh-fruit cake', note: 'The safest choice for a mixed crowd' },
          { name: 'Cupcake tower or dessert table', note: 'Nothing to slice, everyone takes one' },
          { name: 'Pull-me-up or bomb cake', note: 'For the video' },
        ],
      },
      {
        label: 'Flavour and diet',
        items: [
          { name: 'Chocolate truffle, red velvet, butterscotch, pineapple' },
          { name: 'Fresh fruit, blueberry, rasmalai, tender coconut' },
          { name: 'Eggless — say so and every option stays open', note: 'The default for most family orders' },
          { name: 'Sugar-free or millet-based sponge' },
          { name: 'Vegan, on request' },
        ],
      },
      {
        label: 'With the cake',
        items: [
          { name: 'Message and name piped on top' },
          { name: 'Candles, knife, plates and forks' },
          { name: 'Timed delivery to the venue, chilled' },
          { name: 'A second small cake for the cutting photo' },
        ],
      },
    ],
    deepLink: { label: 'Browse the cake shop', to: '/shop/Cakes' },
  },

  photography: {
    blurb: 'A shooter for the hours that matter, and the edited photographs afterwards — not a hard drive of 4,000 raw files.',
    groups: [
      {
        label: 'How it is covered',
        items: [
          { name: 'Candid coverage', note: 'The photographer stays out of the way and shoots what happens' },
          { name: 'Traditional coverage', note: 'Posed family groups, the stage, the rituals in order' },
          { name: 'Both, two shooters', note: 'What most families end up wanting' },
          { name: 'Pre-event or portrait session', note: 'Shot on a different day, at your pace' },
          { name: 'Drone stills', note: 'Outdoor venues only, subject to local permission' },
        ],
      },
      {
        label: 'What you get back',
        items: [
          { name: 'Every usable frame, colour-corrected' },
          { name: 'A set of fully edited hero images' },
          { name: 'A printed album, 30–100 sheets', note: 'Designed with you before printing' },
          { name: 'A same-day teaser for the family group' },
          { name: 'Online gallery your relatives can download from' },
        ],
      },
      {
        label: 'Worth deciding early',
        items: [
          { name: 'Which hours are covered, and when the shooter arrives' },
          { name: 'Whether the family portrait happens before or after the meal' },
          { name: 'A shot list of the people who must be photographed' },
        ],
      },
    ],
  },

  videography: {
    blurb: 'A film you will actually watch again, plus the full recording for the people who could not come.',
    groups: [
      {
        label: 'How it is shot',
        items: [
          { name: 'Single-camera coverage', note: 'The programme, end to end' },
          { name: 'Multi-camera with a switcher', note: 'For a stage event or a long ceremony' },
          { name: 'Cinematic team', note: 'Gimbal, second angle, and a story cut' },
          { name: 'Drone footage', note: 'Outdoor venues, weather and permission allowing' },
          { name: 'Live stream for family abroad', note: 'A private link, no download needed' },
        ],
      },
      {
        label: 'What you get back',
        items: [
          { name: 'A 3–5 minute highlights film' },
          { name: 'The full-length recording, chaptered' },
          { name: 'A vertical reel cut for phones' },
          { name: 'Same-day edit played at the venue', note: 'From the top two tiers upward' },
        ],
      },
    ],
  },

  photobooth: {
    blurb: 'A corner your guests queue at on their own, and go home holding something.',
    groups: [
      {
        label: 'The booth',
        items: [
          { name: 'Open booth with a printed backdrop' },
          { name: 'Mirror booth with on-screen prompts' },
          { name: '360° spinner platform', note: 'The one that ends up on everyone’s stories' },
          { name: 'Polaroid corner with a guestbook' },
        ],
      },
      {
        label: 'What guests take home',
        items: [
          { name: 'Instant prints, unlimited through the event' },
          { name: 'Prints branded with the names and date' },
          { name: 'A digital gallery sent by QR code' },
          { name: 'Props: signs, frames, hats, glasses' },
        ],
      },
    ],
  },

  memory_wall: {
    blurb: 'The wall people stand in front of for twenty minutes, pointing at photographs.',
    groups: [
      {
        label: 'The format',
        items: [
          { name: 'Printed timeline of the years', note: 'Retirements, milestone birthdays, anniversaries' },
          { name: 'Photo clothesline with pegs and fairy lights' },
          { name: 'Framed gallery wall, mixed sizes' },
          { name: 'Screen slideshow on loop' },
          { name: 'A message board guests write on', note: 'Yours to keep afterwards' },
        ],
      },
      {
        label: 'What we need from you',
        items: [
          { name: 'Photographs on WhatsApp — we scan and retouch prints' },
          { name: 'Names and years for the captions' },
        ],
      },
    ],
  },

  dj: {
    blurb: 'The rig sized to the room, an operator who reads it, and a playlist agreed before the night.',
    groups: [
      {
        label: 'The setup',
        items: [
          { name: 'Compact system for a home or terrace', note: 'Up to about 80 guests' },
          { name: 'Hall system with sub-woofers', note: 'The standard reception rig' },
          { name: 'Full club rig with lighting truss', note: 'Sangeet and large receptions' },
          { name: 'PA and mics only', note: 'When there are speeches but no dancing' },
          { name: 'Silent-disco headsets', note: 'For venues with a sound curfew' },
        ],
      },
      {
        label: 'The music',
        items: [
          { name: 'Kannada and regional' },
          { name: 'Bollywood and Punjabi' },
          { name: 'Retro and 90s' },
          { name: 'English club and EDM' },
          { name: 'Devotional and instrumental for the ritual hours' },
          { name: 'Your own playlist, played as given' },
        ],
      },
      {
        label: 'Also available',
        items: [
          { name: 'Wireless mics for the anchor and the speeches' },
          { name: 'Entry-song cue for the family walk-in' },
          { name: 'Dance-floor lighting and haze' },
        ],
      },
    ],
  },

  live_music: {
    blurb: 'Live players, matched to the hour of the day rather than to a genre list.',
    groups: [
      {
        label: 'What plays',
        items: [
          { name: 'Nadaswaram and thavil', note: 'The traditional welcome and the muhurat' },
          { name: 'Carnatic vocal or veena ensemble', note: 'Poojas, ceremonies, the dining hour' },
          { name: 'Sufi or ghazal duo', note: 'Evening receptions' },
          { name: 'Bollywood live band, 5–7 pieces' },
          { name: 'Folk troupe — dollu kunitha, veeragase' },
          { name: 'Acoustic duo for background', note: 'When conversation still has to be possible' },
          { name: 'Saxophone or flute soloist for the entry' },
        ],
      },
      {
        label: 'Booked with them',
        items: [
          { name: 'Sound reinforcement and monitors' },
          { name: 'A rehearsal slot at the venue' },
          { name: 'Two sets with a break for the meal' },
        ],
      },
    ],
  },

  drum: {
    blurb: 'The noise that tells the street something is happening.',
    groups: [
      {
        label: 'The troupe',
        items: [
          { name: 'Dollu kunitha', note: 'Karnataka drum troupe, 6–10 players' },
          { name: 'Nadaswaram and thavil pair' },
          { name: 'Punjabi dhol, one or two players' },
          { name: 'Chende and temple percussion' },
          { name: 'Band set for a procession' },
        ],
      },
      {
        label: 'When they play',
        items: [
          { name: 'The arrival at the gate' },
          { name: 'The procession from home to the hall' },
          { name: 'The entry onto the stage' },
        ],
      },
    ],
  },

  emcee: {
    blurb: 'Somebody whose job is the running order, so no uncle has to hold the mic and improvise.',
    groups: [
      {
        label: 'The host',
        items: [
          { name: 'Kannada and English' },
          { name: 'Hindi and English' },
          { name: 'Tamil, Telugu or Malayalam', note: 'On request, subject to date' },
          { name: 'Formal corporate compère' },
          { name: 'Games-and-energy host', note: 'Birthdays, sangeet, get-togethers' },
        ],
      },
      {
        label: 'What they run',
        items: [
          { name: 'A written running order, agreed with you beforehand' },
          { name: 'Introductions for the family and the speeches' },
          { name: 'Cake cutting, garlanding and the photo call' },
          { name: 'Games and audience segments' },
          { name: 'Cueing the DJ, the lights and the caterer' },
        ],
      },
    ],
  },

  entertainment: {
    blurb: 'The twenty minutes people talk about on the way home.',
    groups: [
      {
        label: 'The act',
        items: [
          { name: 'Classical dance — Bharatanatyam or Kathak' },
          { name: 'Folk troupe — yakshagana, kamsale, veeragase' },
          { name: 'Bollywood dance crew' },
          { name: 'Magician or close-up illusionist', note: 'Works between tables during the meal' },
          { name: 'Stilt walkers and welcome performers at the gate' },
          { name: 'Caricature artist or live portrait sketching' },
          { name: 'Stand-up or improv set', note: 'Corporate and milestone birthdays' },
          { name: 'Fire or LED dance act', note: 'Outdoors, after dark' },
        ],
      },
      {
        label: 'Practical',
        items: [
          { name: 'Stage size and floor surface the act needs' },
          { name: 'A changing room and a sound check slot' },
          { name: 'Slot length — most acts run 15 to 30 minutes' },
        ],
      },
    ],
  },

  choreography: {
    blurb: 'The family dance, rehearsed enough that nobody freezes on the night.',
    groups: [
      {
        label: 'What gets choreographed',
        items: [
          { name: 'The couple’s number' },
          { name: 'A group routine for cousins and siblings' },
          { name: 'A parents’ or elders’ segment', note: 'Kept simple on purpose' },
          { name: 'A surprise flash-mob entry' },
          { name: 'Kids’ performance' },
        ],
      },
      {
        label: 'How it runs',
        items: [
          { name: 'Four to eight rehearsals, at your home or a studio' },
          { name: 'Song selection and edit into a mix' },
          { name: 'A final run-through at the venue' },
          { name: 'Someone on the floor cueing on the night' },
        ],
      },
    ],
  },

  kids_play: {
    blurb: 'A corner the children stay in, which is the entire point.',
    groups: [
      {
        label: 'What goes in it',
        items: [
          { name: 'Bouncy castle or soft-play pit' },
          { name: 'Face painting and tattoo artist' },
          { name: 'Balloon modelling' },
          { name: 'Craft table — clay, beads, colouring' },
          { name: 'Puppet or magic show', note: 'A fixed 30-minute slot' },
          { name: 'Video-game or VR corner', note: 'Older children and teenagers' },
          { name: 'Trampoline or obstacle course', note: 'Outdoor venues' },
        ],
      },
      {
        label: 'Supervision',
        items: [
          { name: 'Trained supervisors, one per fifteen children' },
          { name: 'Soft flooring and padded edges' },
          { name: 'A snack and juice point inside the zone' },
        ],
      },
    ],
  },

  fireworks: {
    blurb: 'The moment at the end. Indoor-safe options included, because most halls will not allow the other kind.',
    groups: [
      {
        label: 'The effect',
        items: [
          { name: 'Cold pyro fountains', note: 'Indoor-safe, no smoke, no heat' },
          { name: 'Sparkler entry for the walk-in' },
          { name: 'Confetti and streamer cannons' },
          { name: 'Sky lanterns', note: 'Outdoor, wind and local permission allowing' },
          { name: 'Low-lying fog for the first dance' },
          { name: 'Outdoor aerial display', note: 'Farmhouse and open-ground venues only' },
        ],
      },
      {
        label: 'We handle',
        items: [
          { name: 'Venue permission and the fire-safety brief' },
          { name: 'A trained operator on the cue' },
          { name: 'Timing it to the music' },
        ],
      },
    ],
  },

  priest: {
    blurb: 'A purohit who performs the rite properly, in the language your family follows.',
    groups: [
      {
        label: 'Tradition',
        items: [
          { name: 'Smartha / Madhwa / Sri Vaishnava' },
          { name: 'Lingayat tradition' },
          { name: 'Tamil, Telugu or Malayalam vaidika' },
          { name: 'North Indian pandit' },
          { name: 'Jain or Buddhist officiant', note: 'On request, by date' },
        ],
      },
      {
        label: 'What is arranged with them',
        items: [
          { name: 'The muhurat, confirmed against your family calendar' },
          { name: 'The samagri list, procured and laid out beforehand' },
          { name: 'How long the rite runs, so the meal is timed to it' },
          { name: 'An assistant for longer ceremonies' },
        ],
      },
    ],
  },

  pooja: {
    blurb: 'Every item on the list, sourced and arranged before the muhurat — so nobody is sent out for camphor.',
    groups: [
      {
        label: 'Arranged for you',
        items: [
          { name: 'The full samagri set for your specific rite' },
          { name: 'Kalasha, thali, deepa and bell' },
          { name: 'Fresh flowers, mango leaves and banana stems' },
          { name: 'Coconuts, fruit and the naivedya items' },
          { name: 'Homa kunda, wood and ghee', note: 'When the rite includes a homa' },
          { name: 'Rangoli at the entrance, drawn that morning' },
        ],
      },
      {
        label: 'Set up before you wake',
        items: [
          { name: 'The pooja space laid out to the purohit’s instruction' },
          { name: 'Seating and mats for the family' },
          { name: 'Everything checked against his list the night before' },
        ],
      },
    ],
    deepLink: { label: 'Shop pooja essentials', to: '/shop/Pooja%20%26%20Essentials' },
  },

  mehendi: {
    blurb: 'Artists who can get through a whole family without the last cousin being done in the car.',
    groups: [
      {
        label: 'The design',
        items: [
          { name: 'Bridal — full hands and feet, 4–6 hours' },
          { name: 'Rajasthani and Marwari, dense figurative work' },
          { name: 'Arabic, bold and quick' },
          { name: 'Minimal and modern' },
          { name: 'Guest designs, 5–10 minutes each' },
          { name: 'Portrait mehendi', note: 'Faces and the story worked into the palm' },
        ],
      },
      {
        label: 'Practical',
        items: [
          { name: 'Organic cone, no chemical black', note: 'Stated up front — this is a skin-safety issue' },
          { name: 'Number of artists sized to the guest list' },
          { name: 'Seating, cushions and lighting for the session' },
        ],
      },
    ],
  },

  makeup: {
    blurb: 'A trial before the day, so the first time you see the look is not in the photographs.',
    groups: [
      {
        label: 'Who is being done',
        items: [
          { name: 'The bride or the person of honour' },
          { name: 'Mother, sisters and close family', note: 'Priced per person' },
          { name: 'Groom grooming and styling' },
          { name: 'Children' },
        ],
      },
      {
        label: 'The look',
        items: [
          { name: 'HD makeup', note: 'The standard for photography' },
          { name: 'Airbrush', note: 'Holds longest in heat' },
          { name: 'Traditional South Indian bridal' },
          { name: 'Soft glam or no-makeup makeup' },
          { name: 'Hairstyling, extensions and floral work' },
          { name: 'Saree draping and pleating' },
        ],
      },
      {
        label: 'Included',
        items: [
          { name: 'A trial session before the day' },
          { name: 'The artist stays for the first touch-up' },
        ],
      },
    ],
  },

  bridal_wear: {
    blurb: 'The styling team on the morning, so getting ready is calm rather than a scramble.',
    groups: [
      {
        label: 'What the team does',
        items: [
          { name: 'Makeup and hair for the bride or groom' },
          { name: 'Saree, lehenga or dhoti draping' },
          { name: 'Jewellery setting and floral work' },
          { name: 'Turban or pheta tying' },
          { name: 'Touch-ups through the ceremony' },
        ],
      },
      {
        label: 'Also arranged',
        items: [
          { name: 'A changing room at the venue' },
          { name: 'Steam and press on arrival' },
          { name: 'A second look for the reception' },
        ],
      },
    ],
  },

  transport: {
    blurb: 'Getting your guests there and back, which is the thing families most often forget to plan.',
    groups: [
      {
        label: 'The vehicles',
        items: [
          { name: 'Tempo traveller, 12–17 seats' },
          { name: 'Mini bus, 25–35 seats' },
          { name: 'Coach, 45+ seats' },
          { name: 'Cabs on call through the evening' },
          { name: 'A decorated car for the family' },
        ],
      },
      {
        label: 'Coordination',
        items: [
          { name: 'Pickup from the railway station or airport' },
          { name: 'A shuttle loop between the hotel and the venue' },
          { name: 'One person managing the pickups on WhatsApp' },
          { name: 'Parking marshals and a drop-off point at the gate' },
        ],
      },
    ],
  },

  bouncers: {
    blurb: 'Not muscle for show — the gift table, the gate and the car park, watched by someone whose job it is.',
    groups: [
      {
        label: 'Where they stand',
        items: [
          { name: 'Entrance and the guest list' },
          { name: 'The gift and envelope table', note: 'The single most-requested post' },
          { name: 'The car park and the drop-off lane' },
          { name: 'Backstage and the family changing room' },
          { name: 'Bar or late-night floor management' },
        ],
      },
      {
        label: 'How many',
        items: [
          { name: 'Two minimum, then roughly one per hundred guests' },
          { name: 'Uniformed or plain-clothes, your call' },
          { name: 'Female staff where the event needs them' },
        ],
      },
    ],
  },

  av_setup: {
    blurb: 'The screens and the microphones, tested before the room fills — not during the first speech.',
    groups: [
      {
        label: 'The kit',
        items: [
          { name: 'Projector and screen' },
          { name: 'LED video wall', note: 'Readable with the house lights on' },
          { name: 'Podium, lapel and handheld mics' },
          { name: 'Confidence monitor for the speaker' },
          { name: 'Recording and live-stream feed' },
          { name: 'Clicker and a technician on the deck' },
        ],
      },
      {
        label: 'Run for you',
        items: [
          { name: 'A rehearsal and a full tech check' },
          { name: 'Someone on the desk through the programme' },
          { name: 'Backup laptop and a spare mic, always' },
        ],
      },
    ],
  },

  tent: {
    blurb: 'A roof over an outdoor event, plus the floor, the sides and the power under it.',
    groups: [
      {
        label: 'The structure',
        items: [
          { name: 'Shamiana with traditional draping' },
          { name: 'German hangar / clear-span marquee', note: 'No poles in the middle of the floor' },
          { name: 'Pagoda tents for counters and the entrance' },
          { name: 'Transparent roof for an evening event' },
          { name: 'Waterproof cover as monsoon backup' },
        ],
      },
      {
        label: 'Underneath it',
        items: [
          { name: 'Raised and levelled flooring, carpeted' },
          { name: 'Side walls, fans or coolers' },
          { name: 'Generator and distribution boards' },
          { name: 'Portable toilets and a hand-wash point' },
        ],
      },
    ],
  },

  cleanup: {
    blurb: 'The part nobody wants to be doing at midnight in good clothes.',
    groups: [
      {
        label: 'What the crew clears',
        items: [
          { name: 'All decor, structures and rented material' },
          { name: 'Kitchen, serving area and leftover disposal' },
          { name: 'Floor washing and the hall handed back clean' },
          { name: 'Segregated waste, taken away' },
          { name: 'A lost-property sweep before the doors close' },
        ],
      },
      {
        label: 'Also arranged',
        items: [
          { name: 'Leftover food packed and donated', note: 'We can route it to a collection partner' },
          { name: 'Same-night clearing where the venue demands it' },
          { name: 'Toilets serviced through the event, not only after' },
        ],
      },
    ],
  },

  return_gifts: {
    blurb: 'One per guest, packed and labelled — and a count that matches the guest list rather than guessing.',
    groups: [
      {
        label: 'What goes in them',
        items: [
          { name: 'Sweets or dry-fruit boxes' },
          { name: 'Brass or silver-plated keepsakes', note: 'Weddings, namakarana, upanayanam' },
          { name: 'Plant saplings in printed pots', note: 'The one people keep' },
          { name: 'Steel or copper tumblers and lunch boxes' },
          { name: 'Kids’ toy or stationery packs' },
          { name: 'Candles, diyas and home fragrance' },
          { name: 'Snack or chocolate hampers' },
        ],
      },
      {
        label: 'Personalised',
        items: [
          { name: 'Names and date printed on the packaging' },
          { name: 'A thank-you card in each' },
          { name: 'Separate sets for children and elders' },
        ],
      },
    ],
    deepLink: { label: 'Browse gifting in the shop', to: '/shop/Gifts' },
  },

  gifting: {
    blurb: 'The heavier gift, for the people who travelled or the clients who came.',
    groups: [
      {
        label: 'The hamper',
        items: [
          { name: 'Dry fruit and premium sweets' },
          { name: 'Artisanal and regional produce' },
          { name: 'Brass, wood or terracotta keepsakes' },
          { name: 'Corporate hampers, GST invoiced' },
          { name: 'Welcome hampers for guest rooms', note: 'For out-of-town family' },
        ],
      },
      {
        label: 'Finishing',
        items: [
          { name: 'Custom boxes with your names or logo' },
          { name: 'Hand-written note cards' },
          { name: 'Delivered to hotel rooms before arrival' },
        ],
      },
    ],
    deepLink: { label: 'Browse gifting in the shop', to: '/shop/Gifts' },
  },

  invitations: {
    blurb: 'Digital first, printed where it matters — and the same design running through the venue signage.',
    groups: [
      {
        label: 'The invite',
        items: [
          { name: 'Digital card for WhatsApp', note: 'What most of your list will actually receive' },
          { name: 'Animated video invitation' },
          { name: 'Printed cards with envelopes' },
          { name: 'Traditional letterpress or foil' },
          { name: 'A save-the-date ahead of the card' },
        ],
      },
      {
        label: 'Matching the day',
        items: [
          { name: 'Welcome board at the entrance' },
          { name: 'Menu cards on the tables' },
          { name: 'Seating chart and table numbers' },
          { name: 'Directional signage and parking boards' },
        ],
      },
    ],
  },

  ice_cream: {
    blurb: 'A counter people go back to twice, which a tub on the buffet never achieves.',
    groups: [
      {
        label: 'The counter',
        items: [
          { name: 'Live ice cream with a server' },
          { name: 'Liquid-nitrogen ice cream', note: 'Made in front of the guest' },
          { name: 'Kulfi and falooda cart' },
          { name: 'Candy floss and popcorn cart' },
          { name: 'Waffle, pancake or brownie station' },
          { name: 'Fruit and dessert shot table' },
        ],
      },
      {
        label: 'Served as',
        items: [
          { name: 'Cones and cups with toppings' },
          { name: 'Traditional matka kulfi' },
          { name: 'Sugar-free and fruit-only options' },
        ],
      },
    ],
  },
}

/**
 * Options for one service on one occasion.
 *
 * Returns `null` for a service with nothing to open, so the card can render as
 * a plain row rather than an accordion that expands to nothing. `kind` tells
 * the card which renderer to use; `pricing` is the entry from
 * servicePricing.js, which is where every number comes from.
 */
export function serviceOptionsFor(serviceId) {
  if (MENU_SERVICES.has(serviceId)) {
    return {
      kind: 'menu',
      blurb: SERVICE_OPTIONS[serviceId]?.blurb ??
        'Pick a cuisine and the whole spread opens — every course, every dish, ticked or not.',
      pricing: SERVICE_BY_ID[serviceId] ?? null,
      deepLink: null,
    }
  }

  if (DECOR_SERVICES.has(serviceId)) {
    return {
      kind: 'decor',
      blurb: 'Choose how much decor, then how it looks — the price moves on the first question only.',
      pricing: SERVICE_BY_ID[serviceId] ?? null,
      deepLink: null,
    }
  }

  const entry = SERVICE_OPTIONS[serviceId]
  if (!entry?.groups?.length) return null

  return {
    kind: 'list',
    blurb: entry.blurb ?? null,
    groups: entry.groups,
    pricing: SERVICE_BY_ID[serviceId] ?? null,
    deepLink: entry.deepLink ?? null,
  }
}

/** How many distinct choices sit behind a service — the "12 options" count on the row. */
export function optionCountFor(serviceId) {
  const entry = SERVICE_OPTIONS[serviceId]
  if (!entry?.groups) return 0
  return entry.groups.reduce((sum, g) => sum + g.items.length, 0)
}
