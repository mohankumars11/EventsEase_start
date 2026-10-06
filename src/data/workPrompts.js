/**
 * What "show your work" means, trade by trade.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE COPY IS PER TRADE AND NOT ONE SENTENCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Add photographs of your work" is true for all 26 and useful to none.
 * A venue owner reading it photographs the front gate; a family choosing
 * a hall wants the room full, the parking, and where the bride changes.
 * A transporter photographs a lorry; what wins them the job is the load
 * secured and the crew who tied it.
 *
 * The prompt is the whole difference between eight useful photographs
 * and eighty useless ones, and it costs nothing to write it properly.
 *
 * Each entry names the SHOTS, in the partner's own words. Nothing here
 * is required — see WorkUpload; a partner on a weak connection has to be
 * able to finish and come back.
 */

const DEFAULT = {
  photoTitle: 'Photographs of your work',
  photoHint: 'Jobs you have already done. This is what a family looks at '
    + 'before they choose, and ticks cannot do it for you.',
  videoTitle: 'A short video',
  videoHint: 'Thirty seconds is plenty. Under 40 MB.',
  captionHint: 'What is this? (optional)',
}

const BY_TRADE = {
  'Venue': {
    photoTitle: 'Photographs of the property',
    photoHint: 'The hall empty AND set up for a function, the dining area, '
      + 'the parking, the changing rooms, the entrance. A family picks a '
      + 'venue on these and almost nothing else.',
    videoTitle: 'A walk-through video',
    videoHint: 'Walk in from the gate and through the hall. Thirty seconds '
      + 'answers more than twenty photographs, and it is the one thing no '
      + 'form can capture. Under 40 MB.',
    captionHint: 'Which space is this? (optional)',
  },

  'Catering & Food': {
    photoTitle: 'Photographs of your food and your setup',
    photoHint: 'A laid buffet, a leaf meal served, your counters, your team '
      + 'in uniform. Your printed menu card goes on the next screen.',
    videoTitle: 'A short video',
    videoHint: 'A counter running, or a buffet at a real function. Under 40 MB.',
    captionHint: 'What event was this? (optional)',
  },

  'Photography': {
    photoTitle: 'Your portfolio',
    photoHint: 'Your best twelve, not your last hundred. Candid, posed, '
      + 'whatever you want to be judged on — this IS the hiring decision.',
    videoTitle: 'A reel',
    videoHint: 'If you have one cut already. Under 40 MB.',
    captionHint: 'What shoot was this? (optional)',
  },

  'Videography': {
    photoTitle: 'Stills and your kit',
    photoHint: 'Frames from your films, and your rig if you want it seen.',
    videoTitle: 'A showreel',
    videoHint: 'The thing you would send a couple who asked. Under 40 MB — '
      + 'a trimmed 30 second cut, not the full film.',
    captionHint: 'Which wedding? (optional)',
  },

  'Decoration & Floral': {
    photoTitle: 'Setups you have built',
    photoHint: 'Mandaps, stages, entrances, photo corners. Wide shots of a '
      + 'finished setup — a close-up of a flower could be anybody.',
    videoTitle: 'A walk-through of a setup',
    videoHint: 'A pan across a finished stage. Under 40 MB.',
    captionHint: 'Where and what? (optional)',
  },

  'Tent & Furniture': {
    photoTitle: 'Your stock, and it set up',
    photoHint: 'The chairs, the shamiana, a hall you have laid out. A '
      + 'customer is buying the look of the room, not the item list.',
    videoTitle: 'A short video',
    videoHint: 'A laid-out hall before the guests arrive. Under 40 MB.',
    captionHint: 'What is this? (optional)',
  },

  'Bridal Makeup & Hair': {
    photoTitle: 'Brides you have done',
    photoHint: 'Faces and hair, in daylight if you can. This is the whole '
      + 'decision — nobody books a makeup artist from a description.',
    videoTitle: 'A short video',
    videoHint: 'A finished look turning in daylight. Under 40 MB.',
    captionHint: 'Which look? (optional)',
  },

  'Mehendi Artist': {
    photoTitle: 'Designs you have drawn',
    photoHint: 'Hands and feet, close and clear. Bridal and guest work both, '
      + 'if you do both.',
    videoTitle: 'A short video',
    videoHint: 'A cone in your hand, drawing. Under 40 MB.',
    captionHint: 'Bridal or guest? (optional)',
  },

  'Transportation': {
    photoTitle: 'Your vehicles',
    photoHint: 'Each vehicle you listed, and a loaded one if you move '
      + 'equipment. A customer wants to see the condition, and a decorator '
      + 'wants to see how you tie a load.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'Which vehicle? (optional)',
  },

  'Live Entertainment': {
    photoTitle: 'Your troupe performing',
    photoHint: 'On stage or in a procession, in costume. Numbers matter: '
      + 'show the whole group.',
    videoTitle: 'A performance clip',
    videoHint: 'The single most useful thing you can add. Thirty seconds of '
      + 'the real thing. Under 40 MB.',
    captionHint: 'Which act? (optional)',
  },

  'DJ & Music': {
    photoTitle: 'Your setup and your crowd',
    photoHint: 'The rig, and a full dance floor. One shows what you own, '
      + 'the other shows whether it works.',
    videoTitle: 'A clip from a night',
    videoHint: 'Under 40 MB.',
    captionHint: 'Which event? (optional)',
  },

  'Sound & AV': {
    photoTitle: 'Your equipment, rigged',
    photoHint: 'A stack at a real event rather than in the godown. Line '
      + 'array, LED wall, console — whatever you listed.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'What is this? (optional)',
  },

  'Event Lighting': {
    photoTitle: 'Lighting you have done',
    photoHint: 'At night, which is when it exists. Wide enough to see the '
      + 'whole room.',
    videoTitle: 'A short video',
    videoHint: 'Moving heads and effects only make sense moving. Under 40 MB.',
    captionHint: 'Where was this? (optional)',
  },

  'Cake & Desserts': {
    photoTitle: 'Cakes you have made',
    photoHint: 'Your own work, photographed whole. Tiered, themed, whatever '
      + 'you are proud of.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'What was the occasion? (optional)',
  },

  'Invitation & Printing': {
    photoTitle: 'Cards you have printed',
    photoHint: 'Flat and open, so the print and the paper are visible. '
      + 'Regional script work if you do it.',
    videoTitle: 'A short video',
    videoHint: 'An animated invite you have made. Under 40 MB.',
    captionHint: 'What is this? (optional)',
  },

  'Priest & Rituals': {
    photoTitle: 'Ceremonies you have conducted',
    photoHint: 'Only if the families were happy for them to be taken. '
      + 'A homa set up, a mantap. Never a photograph of a family who did '
      + 'not agree to it.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'Which ceremony? (optional)',
  },

  'Wedding Planning': {
    photoTitle: 'Events you have run',
    photoHint: 'The finished event, and your running sheet if you are '
      + 'willing to show it — planners are hired on organisation as much '
      + 'as on taste.',
    videoTitle: 'A short video',
    videoHint: 'An event you managed end to end. Under 40 MB.',
    captionHint: 'Which event? (optional)',
  },

  'Trousseau & Gift Packing': {
    photoTitle: 'Trays and hampers you have packed',
    photoHint: 'Close and well lit. The finish is the entire product.',
    videoTitle: 'A short video',
    videoHint: 'A full order laid out. Under 40 MB.',
    captionHint: 'What order was this? (optional)',
  },

  'Power & Cooling': {
    photoTitle: 'Your generators and units',
    photoHint: 'The actual machines, and a silent canopy beside a mandap '
      + 'if you have done one.',
    videoTitle: 'A short video',
    videoHint: 'A silent set running, if you claim it is quiet. Under 40 MB.',
    captionHint: 'Which unit? (optional)',
  },

  'Guest Services': {
    photoTitle: 'Your team at work',
    photoHint: 'In uniform, at a real event. Hospitality is judged on how '
      + 'a team looks and carries itself.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'Which event? (optional)',
  },

  'Security Services': {
    photoTitle: 'Your team',
    photoHint: 'Uniformed, at an event. Women staff too, if you supply them.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'Which event? (optional)',
  },

  'Valet Parking': {
    photoTitle: 'Your crew and your system',
    photoHint: 'Uniformed drivers, the key board, the signage. A family is '
      + 'handing over their car keys and wants to see who to.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'Which venue? (optional)',
  },

  'Safety & Facilities': {
    photoTitle: 'Your units',
    photoHint: 'Inside and out. A restroom trailer is bought on the inside '
      + 'photograph and nothing else.',
    videoTitle: 'A short video',
    videoHint: 'Inside a trailer. Under 40 MB.',
    captionHint: 'Which unit? (optional)',
  },

  'Bar & Beverages': {
    photoTitle: 'Your counters',
    photoHint: 'A set-up bar, your glassware, your bartenders working.',
    videoTitle: 'A short video',
    videoHint: 'Flair, if you do it — it does not read as a photograph. '
      + 'Under 40 MB.',
    captionHint: 'Which event? (optional)',
  },

  'Anchor & MC': {
    photoTitle: 'You, hosting',
    photoHint: 'On stage with a mic, in front of a real crowd.',
    videoTitle: 'A clip of you hosting',
    videoHint: 'The most useful thing on this screen for an anchor — a '
      + 'family is hiring your voice and your presence. Under 40 MB.',
    captionHint: 'Which event? (optional)',
  },

  'Gifts & Favours': {
    photoTitle: 'What you supply',
    photoHint: 'Your actual stock, photographed clearly, and a packed order '
      + 'if you have one.',
    videoTitle: 'A short video',
    videoHint: 'Optional. Under 40 MB.',
    captionHint: 'What is this? (optional)',
  },
}

/** The prompts for a trade, falling back to something honest. */
export const workPromptsFor = trade => ({ ...DEFAULT, ...(BY_TRADE[trade] ?? {}) })

/** Every trade with its own prompts, for the guard that checks coverage. */
export const TRADES_WITH_PROMPTS = Object.keys(BY_TRADE)
