/**
 * What an occasion takes, by kind of occasion.
 *
 * Every event in occasions.js points at one of these. A template says
 * which services the occasion cannot happen without (`must`), which most
 * families add (`often`), and which are a nice touch (`extra`) — plus
 * where it happens and how many people it usually has.
 *
 * ── Nothing impossible is offered ───────────────────────────────────
 * The rule is the one the partner app learnt the hard way: an option
 * that cannot apply to the occasion tells a family the app does not know
 * what it sells. So a housewarming never asks for a venue (it is the new
 * house, by definition), a memorial never suggests a DJ, a webinar never
 * suggests a tent, and a board meeting never gets a dance floor. Where
 * exactly one answer is honest it is stated (`where: 'home'` reads
 * "At your new home") rather than offered as a choice of one.
 *
 * `why` overrides the trade's generic line where the occasion changes
 * what the service is FOR — the entertainer at a kids' party is a
 * magician, at a baraat it is the dhol.
 */
const VEN = 'venue', CAT = 'catering_food', DEC = 'decoration_floral', PHO = 'photography', VID = 'videography',
  CAK = 'cake_desserts', DJ = 'dj_music', ENT = 'live_entertainment', ANC = 'anchor_mc', SND = 'sound_av',
  LGT = 'event_lighting', TNT = 'tent_furniture', PRI = 'priest_rituals', MKP = 'bridal_makeup_hair',
  MEH = 'mehendi_artist', INV = 'invitation_printing', GFT = 'gifts_favours', BEV = 'bar_beverages',
  PAX = 'passenger_transport', VAL = 'valet_parking', SEC = 'security_services', SAF = 'safety_facilities',
  GST = 'guest_services', PWR = 'power_cooling', EQP = 'event_equipment_rental', MAT = 'event_materials_supplier',
  LOG = 'end_to_end_event_logistics', CRW = 'loading_unloading_crew', GDS = 'medium_large_goods_vehicle',
  STO = 'warehouse_storage', TRS = 'trousseau_gift_packing', WPL = 'wedding_planning'

/** Where an occasion happens. `ask` is the only one that asks about a venue. */
export const WHERE = {
  ask: null,
  home: 'At your home',
  newhome: 'At your new home',
  school: 'At the school',
  campus: 'On campus',
  premises: 'At your premises',
  site: 'On your site',
  online: 'Online',
  route: 'On the procession route',
  venue_known: 'At your wedding venue',
}

/** Guest bands a customer picks from, by scale. The first is never zero. */
export const BANDS = {
  intimate: [2, 6, 12, 20, 35],
  social: [25, 50, 100, 150, 250],
  large: [100, 250, 500, 1000, 2000],
  massive: [500, 1000, 2500, 5000, 10000],
}

const T = (must, often = [], extra = [], o = {}) => ({ must, often, extra, where: 'ask', scale: 'social', people: 'Guests', why: {}, ...o })

export const TEMPLATES = {
  /* ── Personal ─────────────────────────────────────────────── */
  birthday: T([DEC, CAK, CAT], [PHO, VEN, ENT], [DJ, GFT, ANC, SND, BEV]),
  firstBirthday: T([DEC, CAK, CAT, PHO], [VEN, ENT, GFT, VID], [ANC, INV, SND, LGT],
    { why: { [ENT]: 'A magician, puppets or a games host for the little guests', [GFT]: 'Return gifts for every child' } }),
  kidsParty: T([DEC, CAK, ENT], [CAT, PHO, GFT], [VEN, SND, ANC],
    { why: { [ENT]: 'A magician or games host keeps the kids busy', [GFT]: 'Return gifts for every child', [CAT]: 'Kid-friendly snacks and a meal for parents' } }),
  teenParty: T([DEC, CAK, DJ], [CAT, PHO, VEN], [ENT, LGT, BEV]),
  milestoneBirthday: T([VEN, CAT, DEC, CAK], [PHO, ENT, ANC, VID], [INV, GFT, PAX, SND], { scale: 'large' }),
  surprise: T([DEC, CAK], [CAT, PHO, ENT], [GFT, LGT, VEN], { scale: 'intimate', why: { [DEC]: 'Set up quietly, before they arrive' } }),
  anniversary: T([DEC, CAK, CAT], [PHO, VEN, ENT], [DJ, VID, GFT, ANC]),
  jubilee: T([VEN, CAT, DEC, PHO], [CAK, PRI, VID, ENT, ANC, INV], [GFT, PAX, MKP, SND], { scale: 'large',
    why: { [PRI]: 'Many families renew vows with a small pooja', [ENT]: 'A live singer for the songs they danced to' } }),
  proposal: T([DEC, PHO], [ENT, CAT, LGT], [VEN, CAK, GFT, VID], { scale: 'intimate',
    why: { [PHO]: 'Hidden, so the moment is captured as it happens', [ENT]: 'A violinist or singer for the question' } }),
  romantic: T([DEC, CAT], [ENT, PHO, CAK], [VEN, LGT, GFT], { scale: 'intimate', why: { [CAT]: 'A private chef, or a set menu for two', [ENT]: 'A live musician at the table' } }),
  babyShower: T([DEC, CAT, CAK], [PHO, GFT, ANC], [VEN, MKP, MEH, ENT], { why: { [ANC]: 'Someone to run the games', [MKP]: 'A look for the mother-to-be' } }),
  genderReveal: T([DEC, CAK], [PHO, CAT, VID], [VEN, GFT], { why: { [CAK]: 'A reveal cake — only the baker knows', [VID]: 'The reveal, filmed' } }),
  babyRite: T([PRI, DEC, CAT], [PHO, GFT], [VID, INV, TNT], { where: 'home',
    why: { [PRI]: 'Performs the rite as your family does it', [DEC]: 'Cradle, backdrop and flowers', [CAT]: 'The meal after the ceremony' } }),
  housewarming: T([PRI, CAT, DEC], [PHO, GFT, TNT], [SND, INV, PWR, VID], { where: 'newhome',
    why: { [PRI]: 'Griha pravesha pooja and homa, samagri included', [DEC]: 'Toran, marigold and mango leaves at the door', [TNT]: 'A shamiana outside if guests spill over' } }),
  gathering: T([VEN, CAT], [DEC, PHO, DJ], [ENT, PAX, GFT, BEV]),
  retirement: T([VEN, CAT], [DEC, CAK, PHO, ANC], [SND, GFT, ENT, VID]),
  graduationParty: T([DEC, CAT, CAK], [PHO, DJ, VEN], [GFT, SND]),
  farewell: T([CAT, DEC], [CAK, PHO, VEN, GFT], [DJ, ANC, SND]),
  bachelor: T([VEN, BEV, DJ], [CAT, DEC, PAX], [PHO, ENT, SEC], { why: { [PAX]: 'A ride there and back for the group' } }),
  bridalShower: T([DEC, CAT, CAK], [PHO, MKP, ENT, GFT], [VEN, BEV]),
  privateDinner: T([CAT], [DEC, BEV, ENT], [PHO, VEN, LGT, GST], { scale: 'intimate', why: { [CAT]: 'A private chef or a plated menu' } }),
  petParty: T([DEC, CAK], [PHO], [VEN, GFT], { scale: 'intimate', why: { [CAK]: 'A pet-safe cake — ask the baker', [GFT]: 'Treat bags for the other pets' } }),
  memorial: T([VEN, CAT, DEC], [PRI, SND, PHO], [TNT, PAX, INV], { people: 'People attending',
    why: { [DEC]: 'A floral tribute and a stand for the photograph', [CAT]: 'A simple meal for those who came', [SND]: 'So everyone can hear the words said', [PHO]: 'Only if the family wants it remembered' } }),
  houseParty: T([CAT, DJ, BEV], [DEC, LGT], [PHO, SEC], { where: 'home' }),
  welcomeHome: T([DEC, CAK], [CAT, PHO], [GFT], { where: 'home', scale: 'intimate' }),

  /* ── Weddings & ceremonies ───────────────────────────────── */
  roka: T([CAT, DEC, PHO], [VEN, PRI, MKP, TRS], [DJ, GFT, INV], { why: { [TRS]: 'Seer trays for both families' } }),
  engagement: T([VEN, CAT, DEC, PHO], [MKP, VID, DJ, TRS, CAK], [PRI, ANC, INV, GFT, LGT], { scale: 'large',
    why: { [TRS]: 'Ring platter and seer trays', [MKP]: 'Looks for the couple' } }),
  haldi: T([DEC, CAT], [PHO, ENT, DJ], [VEN, TNT, SND], { why: { [DEC]: 'Marigold, a swing or a floor seating setup', [ENT]: 'Dhol for the dancing' } }),
  mehendi: T([MEH, DEC, CAT], [PHO, DJ, ENT], [VEN, MKP, TNT, BEV], { why: { [MEH]: 'Bridal mehendi, and guest mehendi by the hand' } }),
  sangeet: T([VEN, DJ, SND, LGT, CAT], [ANC, ENT, PHO, VID, DEC, MKP], [BEV, VAL, SEC], { scale: 'large',
    why: { [ENT]: 'A choreographer for the family performances', [ANC]: 'Runs the order of performances' } }),
  cocktail: T([VEN, BEV, CAT, DJ], [DEC, LGT, PHO, VAL], [ENT, SEC, VID], { scale: 'large' }),
  baraat: T([ENT, PAX], [PHO, VID, LGT, SEC], [SND, DEC], { where: 'route', scale: 'large',
    why: { [ENT]: 'Dhol or a brass band to lead the procession', [PAX]: 'A decorated or vintage car for the groom', [LGT]: 'Light-bearers along the route', [DEC]: 'Flowers for the car' } }),
  jaimala: T([DEC, PHO, VID], [LGT, ENT, SND], [EQP], { where: 'venue_known', why: { [DEC]: 'The varmala stage', [EQP]: 'A revolving platform or lift' } }),
  wedding: T([VEN, CAT, DEC, PRI, PHO, MKP], [VID, WPL, INV, ENT, LGT, SND, VAL, GST, PAX, MEH, TRS], [SEC, PWR, TNT, GFT, LOG], { scale: 'large',
    why: { [PRI]: 'Conducts the muhurtham in your tradition', [ENT]: 'Nadaswaram or shehnai for the ceremony', [DEC]: 'Mandap, stage and entrance', [GST]: 'Welcome desk and ushers for elders' } }),
  homeRite: T([PRI, DEC, CAT], [PHO, MKP, ENT], [TNT, VID], { where: 'home', why: { [ENT]: 'Mangala vadyam for the rite' } }),
  reception: T([VEN, CAT, DEC, PHO, MKP], [VID, DJ, ENT, ANC, LGT, SND, CAK, VAL, GST], [SEC, BEV, PWR, PAX, GFT], { scale: 'large' }),
  postWedding: T([VEN, CAT], [DEC, PHO, DJ], [ENT, CAK]),
  destinationWedding: T([VEN, WPL, CAT, DEC, PHO, PAX], [VID, MKP, PRI, ENT, GST, LGT], [MEH, DJ, INV, TRS, LOG], { scale: 'large',
    why: { [PAX]: 'Getting every guest there and back', [WPL]: 'Someone on the ground who knows the place' } }),
  intimateWedding: T([VEN, PRI, CAT, DEC, PHO], [MKP, VID, ENT], [INV, MEH, CAK]),
  bridalEntry: T([DEC, LGT, VID], [ENT, SND, PHO], [EQP], { where: 'venue_known', why: { [EQP]: 'A phoolon ki chaadar frame or a cold-pyro rig' } }),
  grihaPraveshAfterWedding: T([PRI, DEC], [CAT, PHO], [ENT], { where: 'home', scale: 'intimate', why: { [PRI]: 'The bride’s first entry, with the rite' } }),

  /* ── Festivals & faith ───────────────────────────────────── */
  diwali: T([DEC, LGT], [CAT, CAK, GFT, PRI], [PHO, ENT], { where: 'home', why: { [CAK]: 'Sweets for the family and to give', [PRI]: 'Lakshmi pooja', [LGT]: 'Diyas, fairy lights and lanterns' } }),
  homePooja: T([PRI, DEC], [CAT, PHO, SND], [TNT, LGT, ENT], { where: 'home', why: { [DEC]: 'Flowers and the mandap for the deity', [CAT]: 'Prasadam and a meal for visitors' } }),
  communityPuja: T([TNT, SND, LGT, DEC], [CAT, PRI, ENT, SEC, SAF, PWR], [PHO, ANC, GST, VAL], { scale: 'massive', people: 'Visitors',
    why: { [TNT]: 'The pandal', [ENT]: 'Garba, dhunuchi or a cultural evening', [SAF]: 'First aid and fire safety for the crowd' } }),
  holi: T([DJ, SND, CAT], [SAF, SEC, BEV, TNT], [PHO, ENT], { scale: 'large', why: { [SAF]: 'Washrooms, changing space and first aid' } }),
  harvestNewYear: T([CAT, DEC], [PRI, ENT, PHO], [TNT, SND], { where: 'home',
    why: { [CAT]: 'The festival meal, the way it is made at home', [DEC]: 'Rangoli or pookalam, flowers and mango leaves' } }),
  eid: T([CAT, VEN], [DEC, TNT, GFT], [PHO, SND, GST], { why: { [CAT]: 'Biryani, haleem and sheer khurma, or a full iftar spread' } }),
  christmas: T([DEC, CAK, CAT], [ENT, PHO, GFT], [LGT, SND, VEN], { why: { [ENT]: 'Carol singers or a Santa for the children', [CAK]: 'Plum cake and a dessert table' } }),
  newYear: T([VEN, DJ, CAT, BEV], [LGT, DEC, SEC, VAL], [ENT, PHO, SND], { scale: 'large' }),
  gurpurab: T([CAT, TNT, SND], [DEC, GST, SAF], [PHO, PWR], { scale: 'large', why: { [CAT]: 'Langar for everyone who comes' } }),
  nationalDay: T([SND, DEC], [ANC, ENT, TNT, CAT], [PHO, GFT], { where: 'site', scale: 'large', people: 'People attending',
    why: { [DEC]: 'Tricolour flowers and the flag post', [ENT]: 'A patriotic programme' } }),
  culturalFest: T([TNT, SND, LGT], [ENT, CAT, DEC, SEC, SAF, PWR], [ANC, PHO, VID, GST], { scale: 'massive', people: 'Visitors' }),

  /* ── Schools & colleges ──────────────────────────────────── */
  schoolStage: T([SND, LGT, DEC], [ANC, PHO, VID, TNT, CAT], [SEC, PWR, EQP, GFT], { where: 'school', scale: 'large', people: 'Audience',
    why: { [DEC]: 'The stage backdrop', [CAT]: 'Snacks for performers and parents' } }),
  schoolSports: T([TNT, SND, SAF], [EQP, CAT, PHO, GFT], [ANC, SEC, PWR], { where: 'school', scale: 'large', people: 'Participants',
    why: { [GFT]: 'Medals and trophies', [SAF]: 'First aid on the ground', [TNT]: 'Shade for spectators' } }),
  schoolGraduation: T([DEC, SND, PHO], [VID, CAT, ANC, GFT], [TNT, CAK], { where: 'school', why: { [GFT]: 'Caps, scrolls or keepsakes' } }),
  schoolParty: T([DEC, SND, CAT], [DJ, ANC, PHO, ENT], [CAK, GFT], { where: 'school' }),
  schoolExhibition: T([EQP, LGT], [TNT, SND, PHO], [PWR, MAT], { where: 'school', people: 'Visitors', why: { [EQP]: 'Display tables, boards and stands' } }),
  schoolDebate: T([SND], [ANC, PHO, GFT], [CAT], { where: 'school', people: 'Audience', why: { [GFT]: 'Trophies and certificates' } }),
  schoolMeeting: T([SND, CAT], [TNT, GST], [PHO, EQP], { where: 'school', people: 'Parents' }),
  schoolFair: T([TNT, SND, CAT], [ENT, DEC, SEC, SAF], [PWR, EQP, PHO], { where: 'school', scale: 'large', people: 'Visitors' }),
  collegeFest: T([SND, LGT, TNT, SEC], [DJ, ENT, ANC, SAF, PWR, CAT, PHO, VID], [EQP, CRW, VAL, GST], { where: 'campus', scale: 'massive', people: 'Attendees' }),
  collegeParty: T([DEC, DJ, SND, CAT], [ANC, PHO, LGT], [VEN, VID, GFT], { where: 'campus' }),
  convocation: T([TNT, SND, DEC, PHO], [VID, CAT, GST, SEC], [ANC, PWR, VAL], { where: 'campus', scale: 'large', why: { [VID]: 'Livestream for families who cannot come' } }),
  hackathon: T([VEN, CAT, PWR], [SND, EQP, GST, PHO], [GFT, BEV], { people: 'Participants', why: { [CAT]: 'Meals and midnight snacks', [PWR]: 'Backup power so nobody loses work' } }),
  campusSports: T([TNT, SND, SAF], [EQP, CAT, PHO, GFT, ANC], [SEC, PWR], { where: 'campus', scale: 'large', people: 'Participants' }),
  competition: T([SND], [ANC, PHO, GFT], [CAT], { where: 'campus', people: 'Audience', why: { [GFT]: 'Trophies and certificates' } }),

  /* ── Business ────────────────────────────────────────────── */
  conference: T([VEN, SND, CAT], [GST, PHO, VID, ANC, INV, LGT, PAX, VAL], [SEC, PWR, GFT, EQP], { scale: 'large', people: 'Attendees',
    why: { [GST]: 'Registration desk and badges', [INV]: 'Badges, banners and printed agendas', [PAX]: 'Shuttles from hotels' } }),
  boardroom: T([VEN, CAT], [SND], [GST, PAX], { scale: 'intimate', people: 'Attendees', why: { [VEN]: 'A private meeting room', [CAT]: 'Working lunch and tea service' } }),
  launch: T([VEN, SND, LGT, DEC], [ANC, PHO, VID, CAT, GST, ENT], [SEC, VAL, GFT, BEV], { scale: 'large', people: 'Attendees', why: { [DEC]: 'Branded stage and the reveal' } }),
  pressMeet: T([VEN, SND], [PHO, VID, CAT, GST], [DEC], { people: 'Press & guests', why: { [SND]: 'Mics and a press feed' } }),
  opening: T([DEC, CAT], [PRI, SND, PHO, ENT], [TNT, SEC, GFT, ANC], { where: 'premises', people: 'Guests',
    why: { [PRI]: 'An opening pooja, if you want one', [DEC]: 'Ribbon, flowers and the entrance', [ENT]: 'Dhol for the opening' } }),
  awardsNight: T([VEN, SND, LGT, CAT, ANC], [DEC, PHO, VID, ENT, DJ, GFT], [VAL, BEV, SEC], { scale: 'large', people: 'Attendees', why: { [GFT]: 'Trophies and mementos' } }),
  teamDay: T([VEN, CAT], [ENT, PHO, SND, PAX], [EQP, SAF, GFT, DEC], { people: 'Team members', why: { [ENT]: 'Games and activities that include everyone' } }),
  retreat: T([VEN, CAT, PAX], [SND, PHO, ENT], [GST, EQP], { people: 'Team members' }),
  townHall: T([VEN, SND], [CAT, VID], [GST], { scale: 'large', people: 'Attendees', why: { [VID]: 'A livestream for remote teams' } }),
  expo: T([TNT, EQP, LGT, PWR], [SND, SEC, SAF, CRW, GDS, GST, CAT], [STO, LOG, VAL, PHO], { scale: 'massive', people: 'Visitors',
    why: { [EQP]: 'Stalls, panels and counters', [GDS]: 'Getting exhibits in and out' } }),
  networking: T([VEN, CAT], [BEV, SND, PHO], [GST, DEC], { people: 'Attendees' }),
  pitch: T([VEN, SND], [CAT, VID, PHO, ANC], [GST, BEV], { people: 'Attendees', why: { [SND]: 'Projector, clicker and mics for each pitch' } }),
  recruitment: T([VEN, SND], [GST, CAT, EQP], [SEC, PHO], { scale: 'large', people: 'Candidates', why: { [GST]: 'Registration and queue management' } }),
  workshop: T([VEN, SND], [CAT, EQP], [PHO, MAT], { people: 'Participants' }),

  /* ── Entertainment & public ──────────────────────────────── */
  concert: T([VEN, SND, LGT, SEC], [PWR, SAF, BEV, CAT, CRW, VAL, TNT], [VID, PHO, EQP, GST, LOG], { scale: 'massive', people: 'Audience' }),
  clubNight: T([DJ, SND, LGT], [BEV, DEC, SEC], [PHO, VAL, CAT], { people: 'Guests' }),
  smallStage: T([VEN, SND], [LGT, BEV, CAT, ENT], [PHO, ANC], { people: 'Audience' }),
  liveMusic: T([ENT, SND], [LGT, VEN, CAT], [PHO, BEV], { why: { [ENT]: 'The band, singer or ensemble itself' } }),
  dance: T([SND, LGT, VEN], [DJ, ANC, PHO, VID], [SEC, GFT], { scale: 'large', people: 'Audience' }),
  celebrity: T([VEN, SEC, SND], [GST, PHO, VID, LGT, VAL], [PAX], { scale: 'large', people: 'Audience', why: { [SEC]: 'Close protection and crowd barriers' } }),
  poolParty: T([DJ, BEV, CAT], [DEC, SEC, SND], [PHO, LGT]),
  silentDisco: T([SND, DJ], [LGT, BEV], [CAT], { why: { [SND]: 'Wireless headphones for every guest' } }),
  foodMusic: T([CAT, SND, ENT], [LGT, TNT, BEV], [DEC], { scale: 'large' }),
  publicFestival: T([TNT, SND, SEC, SAF], [LGT, PWR, ENT, CAT, CRW], [GST, VAL, PHO], { where: 'site', scale: 'massive', people: 'Visitors' }),
  screening: T([SND], [VEN, CAT, BEV, LGT], [TNT, DEC, SEC], { why: { [SND]: 'Projector or LED screen, and the sound' } }),
  premiere: T([VEN, SND, SEC, PHO], [GST, LGT, DEC, VAL, BEV], [VID, CAT], { scale: 'large', why: { [DEC]: 'The red carpet and photo wall' } }),
  stageShow: T([VEN, SND, LGT], [ANC, ENT, PHO, SEC], [VID, GST], { scale: 'large', people: 'Audience' }),
  exhibition: T([VEN, LGT, EQP], [SEC, CAT, PHO, GST], [SND, DEC], { people: 'Visitors', why: { [EQP]: 'Display panels, plinths and stands' } }),
  convention: T([VEN, SND, LGT, SEC, PWR], [ENT, CAT, SAF, GST, EQP], [PHO, VID], { scale: 'massive', people: 'Visitors' }),
  showSafety: T([SAF, SEC, SND, LGT], [PWR, TNT], [VID, PHO], { where: 'site', scale: 'massive', people: 'Audience',
    why: { [SAF]: 'Fire safety and a cordon for the show' } }),
  market: T([TNT, EQP], [SND, LGT, SEC, SAF, PWR], [CAT, DEC], { where: 'site', scale: 'large', people: 'Visitors', why: { [EQP]: 'Stalls, tables and counters' } }),
  bookLaunch: T([VEN, SND], [CAT, PHO, ANC], [DEC, GFT], { people: 'Guests' }),
  gala: T([VEN, CAT, DEC, SND, LGT], [ANC, ENT, BEV, PHO, VID, VAL], [SEC, GST, GFT, INV], { scale: 'large' }),
  awareness: T([TNT, SND], [MAT, PHO, GST, ANC], [PWR, CAT], { where: 'site', scale: 'large', people: 'People attending', why: { [MAT]: 'Banners, standees and handouts' } }),
  immersive: T([VEN, SND, LGT, EQP], [SEC, GST], [PHO], { scale: 'large', people: 'Visitors' }),

  /* ── Sport & wellness ────────────────────────────────────── */
  tournament: T([TNT, SND, SAF], [CAT, PHO, GFT, ANC, EQP], [SEC, PWR, PAX, VID], { scale: 'large', people: 'Players & spectators',
    why: { [GFT]: 'Trophies and medals', [ANC]: 'Commentary and the prize distribution', [TNT]: 'Shade for players and spectators' } }),
  race: T([SAF, SEC, SND, TNT], [GST, BEV, PHO, GFT, CAT], [PWR, CRW, LOG, ANC], { where: 'site', scale: 'massive', people: 'Runners',
    why: { [SAF]: 'Medical teams along the route', [BEV]: 'Water and electrolyte stations', [GFT]: 'Finisher medals' } }),
  esports: T([VEN, PWR, SND, EQP], [LGT, CAT, SEC, VID], [ANC, GFT], { scale: 'large', people: 'Players & audience', why: { [VID]: 'A stream of the finals' } }),
  wellness: T([VEN, SND], [CAT, PHO, PAX], [DEC, BEV], { people: 'Participants', why: { [CAT]: 'Light, healthy meals' } }),
  adventure: T([SAF, TNT], [CAT, PAX, PHO, SND], [GFT, PWR], { where: 'site', people: 'Participants' }),
  fanGathering: T([VEN, SND], [CAT, BEV, SEC], [DEC], { scale: 'large', why: { [SND]: 'A big screen and the commentary' } }),

  /* ── Food ────────────────────────────────────────────────── */
  foodFestival: T([TNT, PWR, SND, SAF], [SEC, DEC, LGT, ENT, EQP], [CRW, GDS, GST, PHO], { where: 'site', scale: 'massive', people: 'Visitors', why: { [SAF]: 'Water, washing points and waste handling' } }),
  chefTable: T([CAT, DEC], [BEV, ENT, PHO], [VEN, LGT, GST], { scale: 'intimate', why: { [CAT]: 'A chef who cooks in front of the table' } }),
  bbq: T([CAT], [BEV, DEC, DJ], [TNT, PHO]),
  tasting: T([DEC, GST], [PHO, SND], [INV], { where: 'premises', why: { [GST]: 'Hosts who walk guests through the tasting' } }),

  /* ── Retail & property ───────────────────────────────────── */
  storeLaunch: T([DEC, SND, LGT], [ANC, PHO, CAT, ENT, GST], [SEC, BEV, VAL], { where: 'premises' }),
  mallEvent: T([DEC, SND, ANC], [ENT, LGT, SEC], [GFT, PHO], { where: 'premises', scale: 'large', people: 'Shoppers' }),
  productDemo: T([SND, EQP], [ANC, GST, PHO], [CAT], { where: 'premises', people: 'Visitors' }),
  fashionShow: T([VEN, SND, LGT, EQP], [MKP, ANC, PHO, VID, DEC], [SEC, GST, BEV], { scale: 'large', people: 'Audience', why: { [EQP]: 'The ramp', [MKP]: 'Backstage makeup for the models' } }),
  propertyLaunch: T([TNT, DEC, SND, CAT], [PRI, ANC, PHO, VID, LGT, VAL, GST], [ENT, SEC, PWR], { where: 'site', scale: 'large', why: { [PRI]: 'Bhoomi pooja, if you want one' } }),
  openHouse: T([DEC, CAT], [GST, SND, PHO], [LGT], { where: 'site', people: 'Visitors', why: { [CAT]: 'Coffee and snacks for visitors' } }),

  /* ── Community ───────────────────────────────────────────── */
  inauguration: T([TNT, SND, DEC, SEC], [ANC, PHO, VID, CAT, PWR], [GST, VAL], { where: 'site', scale: 'large', people: 'People attending' }),
  publicMeeting: T([TNT, SND], [CAT], [GST, PWR], { where: 'site', people: 'Residents', why: { [CAT]: 'Tea and biscuits' } }),
  fundraiser: T([VEN, SND, CAT], [ANC, DEC, PHO], [GST, INV]),
  bloodCamp: T([TNT, CAT], [SAF, SND, GST], [PHO, PWR], { where: 'site', people: 'Donors', why: { [CAT]: 'Juice and snacks for donors', [TNT]: 'Beds, chairs and shade' } }),
  drive: T([MAT], [CAT, PAX, PHO], [TNT, SND], { where: 'site', people: 'Volunteers', why: { [MAT]: 'Gloves, bags, saplings and tools', [PAX]: 'A bus for the volunteers' } }),

  /* ── Outdoor & destination ───────────────────────────────── */
  destination: T([VEN, CAT, DEC, PAX], [PHO, DJ, ENT], [VID, GST, MKP]),
  outdoorStay: T([TNT, CAT], [PAX, PWR, LGT, SAF], [ENT, PHO], { where: 'site', people: 'People', why: { [TNT]: 'Tents, bedding and seating', [LGT]: 'Lanterns and campfire lighting' } }),
  boat: T([VEN, CAT, DJ], [BEV, DEC, PHO], [SEC], { why: { [VEN]: 'The yacht or the boat itself' } }),
  sunset: T([DEC, CAT], [PHO, ENT], [VEN], { scale: 'intimate' }),
  picnic: T([DEC, CAT], [PHO, ENT], [GFT], { scale: 'intimate', why: { [DEC]: 'Rugs, cushions and a low table set up for you' } }),

  /* ── Online ──────────────────────────────────────────────── */
  virtual: T([VID, SND], [LGT, ANC, INV], [GFT, DEC], { where: 'online', scale: 'large', people: 'Viewers',
    why: { [VID]: 'Multi-camera livestream to your platform', [SND]: 'Clean audio for every speaker', [GFT]: 'Kits couriered to attendees' } }),
  hybrid: T([VEN, VID, SND, CAT], [LGT, GST, ANC, PHO], [INV, PAX], { scale: 'large', people: 'Attendees', why: { [VID]: 'The livestream for those joining online' } }),
  virtualSocial: T([ENT, GFT], [CAK, VID, DEC], [ANC], { where: 'online', people: 'People joining',
    why: { [ENT]: 'An online host, magician or quiz master', [GFT]: 'A box delivered to every home', [CAK]: 'A cake delivered to the guest of honour' } }),
  livestream: T([SND, LGT, VID], [EQP], [DEC], { where: 'online', scale: 'massive', people: 'Viewers' }),
}
