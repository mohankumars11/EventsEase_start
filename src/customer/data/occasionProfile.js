/**
 * What kind of occasion this is — settled once, by its template, and read
 * everywhere a screen has to be specific (Mohan, 2026-11-12: "a Wedding
 * Anniversary was offered 'capture the haldi ceremony' … every preference,
 * every inclusion, must be as per the occasion. Nobody should be able to
 * point at it and say 'there is a mistake here'").
 *
 *   profileFor(occasion) → { family, fn, age, couple, milestone, who, noun }
 *
 * Before this, screens matched words in the name — and "Wedding
 * Anniversary" contains "wedding". The template is the truth about an
 * occasion (templates.js says what it takes), so the family is read from
 * the template first, a handful of names second, the category last.
 *
 *   family   the kind of day: wedding · anniversary · romance · birthday ·
 *            baby · home · faith · festival · memorial · nightlife ·
 *            gathering · dining · gala · corporate · campus · school ·
 *            public · sport · food · retail · property · community ·
 *            online · outdoor
 *   fn       the wedding function, when it is one (haldi, mehendi, …)
 *   age      kids · teen · adult · senior — who the day is for
 *   couple   the two of them are the centre of it
 *   milestone a 25th, a 50th, a 60th, a retirement
 *   who      how the headcount is asked (peopleAsk below)
 *   noun     one of the people who come: guest, attendee, visitor…
 *
 * peopleAsk(occasion) is the headcount question itself: a Valentine's
 * dinner asks "who's celebrating?" (just the two of us · with family …),
 * a conference asks for attendees, a memorial asks quietly, a kids' party
 * counts the grown-ups too. peopleLine(occasion, event) is the answer in
 * words, for the event card and every quotation.
 */
import { Heart, Home, PartyPopper, Users } from 'lucide-react'

/* ── Family by template ──────────────────────────────────────────── */
const T = {
  /* personal */
  birthday: 'birthday', firstBirthday: 'birthday', kidsParty: 'birthday', teenParty: 'birthday', milestoneBirthday: 'birthday', surprise: 'birthday', petParty: 'birthday',
  anniversary: 'anniversary', jubilee: 'anniversary',
  romantic: 'romance', proposal: 'romance',
  engagement: 'wedding', roka: 'wedding', haldi: 'wedding', mehendi: 'wedding', sangeet: 'wedding', cocktail: 'wedding', baraat: 'wedding', jaimala: 'wedding',
  wedding: 'wedding', reception: 'wedding', postWedding: 'wedding', destinationWedding: 'wedding', intimateWedding: 'wedding', bridalEntry: 'wedding',
  grihaPraveshAfterWedding: 'wedding', homeRite: 'wedding', bridalShower: 'wedding',
  bachelor: 'nightlife', houseParty: 'nightlife', clubNight: 'nightlife', silentDisco: 'nightlife', poolParty: 'nightlife', boat: 'nightlife', newYear: 'nightlife',
  babyShower: 'baby', genderReveal: 'baby', babyRite: 'baby',
  housewarming: 'home', welcomeHome: 'gathering',
  retirement: 'gathering', graduationParty: 'gathering', gathering: 'gathering', farewell: 'gathering', bbq: 'gathering', destination: 'outdoor',
  privateDinner: 'dining', chefTable: 'dining', tasting: 'food', foodFestival: 'food', foodMusic: 'food',
  memorial: 'memorial',
  /* faith and festivals */
  diwali: 'faith', homePooja: 'faith', harvestNewYear: 'faith', communityPuja: 'faith', gurpurab: 'faith', eid: 'faith',
  christmas: 'festival', holi: 'festival', nationalDay: 'public', culturalFest: 'public',
  /* school and campus */
  schoolStage: 'school', schoolSports: 'school', schoolGraduation: 'school', schoolParty: 'school', schoolExhibition: 'school', schoolDebate: 'school', schoolMeeting: 'school', schoolFair: 'school',
  collegeFest: 'campus', collegeParty: 'campus', convocation: 'campus', campusSports: 'campus', hackathon: 'campus', workshop: 'campus', competition: 'campus',
  /* business */
  conference: 'corporate', boardroom: 'corporate', launch: 'corporate', opening: 'corporate', awardsNight: 'corporate', teamDay: 'corporate', retreat: 'corporate',
  networking: 'corporate', pressMeet: 'corporate', expo: 'corporate', recruitment: 'corporate', townHall: 'corporate', pitch: 'corporate', productDemo: 'corporate', hybrid: 'corporate',
  storeLaunch: 'retail', mallEvent: 'retail', fashionShow: 'retail', openHouse: 'property', propertyLaunch: 'property', inauguration: 'public',
  gala: 'gala', premiere: 'gala',
  /* shows and the public */
  concert: 'public', dance: 'public', celebrity: 'public', stageShow: 'public', smallStage: 'public', liveMusic: 'public', screening: 'public', convention: 'public',
  showSafety: 'public', market: 'public', awareness: 'community', immersive: 'public', publicFestival: 'public', publicMeeting: 'community', exhibition: 'public', bookLaunch: 'public',
  /* sport, community, online, outdoors */
  tournament: 'sport', race: 'sport', esports: 'sport', wellness: 'sport', adventure: 'sport', fanGathering: 'sport',
  bloodCamp: 'community', drive: 'community', fundraiser: 'community',
  virtual: 'online', virtualSocial: 'online', livestream: 'online',
  outdoorStay: 'outdoor', picnic: 'outdoor', sunset: 'outdoor',
}
const CATEGORY = { life: 'gathering', wedding: 'wedding', festivals: 'festival', school: 'school', college: 'campus', corporate: 'corporate', nightlife: 'nightlife', public: 'public', sport: 'sport', food: 'food', retail: 'retail', property: 'property', community: 'community', industry: 'corporate', themed: 'nightlife', outdoor: 'outdoor', online: 'online', special: 'gathering' }

/* The wedding function, by its name — only inside the wedding family. */
const FN = [[/roka|pre-engagement/, 'roka'], [/engagement/, 'engagement'], [/haldi|pellik/, 'haldi'], [/mehendi/, 'mehendi'], [/sangeet/, 'sangeet'], [/cocktail/, 'cocktail'], [/baraat/, 'baraat'],
  [/reception|post-wedding/, 'reception'], [/bridal-shower/, 'shower'], [/bridal-entry|jaimala|muhurth|wedding/, 'wedding'], [/griha/, 'griha']]

const words = o => `${o?.id ?? ''} ${o?.name ?? ''}`.toLowerCase()

/** The profile of one occasion. Pure; safe to call every render. */
export function profileFor(o) {
  if (!o) return { family: 'gathering', fn: null, age: 'adult', couple: false, milestone: false, who: 'guests', noun: 'guest' }
  const w = words(o)
  let family = T[o.template] ?? CATEGORY[o.category] ?? 'gathering'
  /* A few names say more than their template. */
  if (/anniversar/.test(w) && !/business|hotel|restaurant|company|brand|store/.test(w)) family = 'anniversary'
  else if (o.where === 'campus' && !['wedding', 'anniversary', 'romance'].includes(family)) family = 'campus'
  else if (o.where === 'school' && !['wedding', 'anniversary', 'romance'].includes(family)) family = 'school'
  else if (/valentine|romantic|candlelight|propos/.test(w) && !/party/.test(w)) family = 'romance'
  else if (/destination-birthday/.test(w)) family = 'birthday'
  else if (/family-celebration|reunion-dinner|graduation-dinner/.test(w)) family = 'dining'
  const fn = family === 'wedding' ? (FN.find(([re]) => re.test(w))?.[1] ?? 'wedding') : null
  const age = /kid|child|first-birthday|kindergarten|pet-birthday|space-theme/.test(w) ? 'kids' : /teen|freshers|school-farewell|teachers|childrens-day/.test(w) ? 'teen'
    : /60th|retire|golden-jubilee|shashti/.test(w) ? 'senior' : 'adult'
  const milestone = /milestone|jubilee|retire|60th|25th|50th/.test(w)
  const couple = ['anniversary', 'romance'].includes(family) || (family === 'wedding' && !['shower'].includes(fn))
  const who = whoOf(o, family, age)
  return { family, fn, age, couple, milestone, who, noun: NOUN[who] ?? 'guest' }
}

/* ── The headcount question ──────────────────────────────────────── */
const PEOPLE = { Audience: 'audience', Visitors: 'visitors', Shoppers: 'visitors', Attendees: 'attendees', 'Press & guests': 'attendees', Participants: 'participants', 'Players & spectators': 'participants',
  'Players & audience': 'participants', Runners: 'participants', Donors: 'participants', Volunteers: 'participants', Candidates: 'participants', 'Team members': 'team', Viewers: 'online', 'People joining': 'online',
  Parents: 'people', Residents: 'people', People: 'people', 'People attending': 'people' }
function whoOf(o, family, age) {
  if (['anniversary', 'romance'].includes(family)) return 'couple'
  if (family === 'memorial') return 'quiet'
  if (o.people && o.people !== 'Guests') return PEOPLE[o.people] ?? 'people'
  if (['bachelor', 'houseParty'].includes(o.template)) return 'gang'
  if (age === 'kids' || age === 'teen') return 'kids'
  if (['home', 'newhome'].includes(o.where)) return 'home'
  if (o.scale === 'intimate') return 'close'
  return 'guests'
}
const NOUN = { couple: 'guest', quiet: 'person', audience: 'seat', visitors: 'visitor', attendees: 'attendee', participants: 'participant', team: 'person', online: 'viewer', people: 'person', gang: 'guest', kids: 'guest', home: 'guest', close: 'guest', guests: 'guest' }
const PLURAL = { person: 'people', seat: 'seats' }
export const nounPlural = (noun, n = 2) => (n === 1 ? noun : PLURAL[noun] ?? `${noun}s`)

/** "Just the two of us" and the rest — the company at a couple's occasion. */
export const COMPANY = [
  { id: 'two', label: 'Just the two of us', line: 'A table, a moment, nobody else', icon: Heart, guests: 2 },
  { id: 'family', label: 'With family', line: 'Parents, kids, the close ones', icon: Home, guests: 10 },
  { id: 'friends', label: 'With friends', line: 'The gang, a long evening', icon: PartyPopper, guests: 12 },
  { id: 'party', label: 'A proper party', line: 'Everyone who matters to us', icon: Users, guests: 50 },
]

/**
 * The headcount question for this occasion: what to call it, what to say,
 * the quick picks, and — for a couple — the company tiles first.
 */
export function peopleAsk(o) {
  const p = profileFor(o)
  const b = o?.bands ?? [25, 50, 100, 150, 250]
  const big = b[b.length - 1]
  const picks = (xs) => xs.filter((x, i, a) => a.indexOf(x) === i)
  switch (p.who) {
    case 'couple': return { who: p.who, kicker: 'Who’s celebrating', title: p.family === 'anniversary' ? 'Who’s celebrating with you?' : 'Who’s this for?', sub: 'Just the two of you, or everyone who matters — it changes what we set up.',
      company: COMPANY, countTitle: 'How many, roughly?', countSub: 'Count yourselves too.', picks: picks([4, 6, 10, 15, 25, 50]), noun: 'guest' }
    case 'quiet': return { who: p.who, kicker: 'The gathering', title: 'How many people will come?', sub: 'A rough number is enough. It only sizes the seating and the food.', picks: picks([20, 35, 50, 75, 100, 150]), noun: 'person' }
    case 'kids': return { who: p.who, kicker: 'The guests', title: 'How many guests, kids and grown-ups together?', sub: 'Count the parents too — the caterer, the chairs and the return gifts do.', picks: picks([15, 25, 40, 60, 100, 150]), noun: 'guest' }
    case 'home': return { who: p.who, kicker: 'The family', title: 'How many will come home?', sub: 'Family, neighbours and friends through the day — a good guess is fine.', picks: picks([15, 25, 40, 60, 100, 150]), noun: 'guest' }
    case 'close': return { who: p.who, kicker: 'The table', title: 'How many of you?', sub: 'A small, close gathering — count yourself in.', picks: picks([4, 6, 8, 10, 12, 20]), noun: 'guest' }
    case 'gang': return { who: p.who, kicker: 'The gang', title: 'How many in the gang?', sub: 'Everyone who is coming — it sizes the drinks, the ride and the room.', picks: picks([6, 10, 15, 20, 30, 50]), noun: 'guest' }
    case 'audience': return { who: p.who, kicker: 'The audience', title: 'How big is the audience?', sub: 'Seats to fill — the sound, the lights and the stage are sized to it.', picks: picks(b.length >= 6 ? b : [100, 250, 500, 1000, 2000, Math.max(big, 5000)]), noun: 'seat' }
    case 'visitors': return { who: p.who, kicker: 'The footfall', title: 'How many visitors do you expect?', sub: 'Across the whole event — it sizes the stalls, the toilets and the crowd team.', picks: picks([250, 500, 1000, 2500, 5000, 10000]), noun: 'visitor' }
    case 'attendees': return { who: p.who, kicker: 'The attendees', title: 'How many attendees?', sub: 'Registered or invited — a good estimate is fine.', picks: picks(b.length >= 6 ? b : [...b, big * 2]), noun: 'attendee' }
    case 'participants': return { who: p.who, kicker: 'The participants', title: 'How many participants?', sub: 'Everyone taking part — add the supporters if they stay for the day.', picks: picks([25, 50, 100, 250, 500, 1000]), noun: 'participant' }
    case 'team': return { who: p.who, kicker: 'The team', title: 'How many on the team?', sub: 'Everyone attending, families included if they are coming.', picks: picks([10, 25, 50, 100, 200, 500]), noun: 'person' }
    case 'online': return { who: p.who, kicker: 'The viewers', title: 'How many will join online?', sub: 'The stream, the platform and the support are sized to it.', picks: picks([50, 100, 250, 500, 1000, 5000]), noun: 'viewer' }
    case 'people': return { who: p.who, kicker: 'The turnout', title: 'How many people will attend?', sub: 'A good estimate is fine — it sizes the seating, the sound and the water.', picks: picks([50, 100, 250, 500, 1000, 2500]), noun: 'person' }
    default: return { who: p.who, kicker: 'The guests', title: 'How many guests?', sub: 'A good guess is fine — you can change it later.', picks: picks(b.length >= 6 ? b : [...b, big * 2]), noun: 'guest' }
  }
}

/** The headcount in words: "Just the two of us" · "120 attendees" · "8 guests". */
export function peopleLine(o, ev = {}) {
  const n = Number(ev.guests) || 0
  if (profileFor(o).who === 'couple' && ev.company) {
    const c = COMPANY.find(x => x.id === ev.company)
    if (ev.company === 'two') return 'Just the two of us'
    if (c) return `${n.toLocaleString('en-IN')} · ${c.label.toLowerCase()}`
  }
  const noun = peopleAsk(o).noun
  return `${n.toLocaleString('en-IN')} ${nounPlural(noun, n)}`
}

/** The word on the event card's headcount tile and the checkout fact. */
export function peopleWord(o) {
  const w = peopleAsk(o).who
  return w === 'couple' ? 'Who' : w === 'audience' ? 'Audience' : w === 'visitors' ? 'Visitors' : w === 'attendees' ? 'Attendees' : w === 'participants' ? 'Participants' : w === 'online' ? 'Viewers' : ['people', 'quiet', 'team'].includes(w) ? 'People' : 'Guests'
}

/* ── Predicates the specs read ───────────────────────────────────── */
export const isWedding = o => profileFor(o).family === 'wedding'
export const isAnniversary = o => profileFor(o).family === 'anniversary'
export const isRomance = o => profileFor(o).family === 'romance'
/** The two of them, alone: a romantic occasion, or an anniversary kept to the couple. */
export const isCouple = (o, ev = {}) => isRomance(o) || (isAnniversary(o) && ev.company === 'two')
export const isBirthday = o => profileFor(o).family === 'birthday'
export const isKids = o => ['kids', 'teen'].includes(profileFor(o).age)
export const isBaby = o => profileFor(o).family === 'baby'
export const isHome = o => profileFor(o).family === 'home'
export const isFaith = o => ['faith', 'home'].includes(profileFor(o).family)
export const isFestival = o => ['faith', 'festival'].includes(profileFor(o).family)
export const isMemorial = o => profileFor(o).family === 'memorial'
export const isNight = o => profileFor(o).family === 'nightlife'
export const isDining = o => ['dining', 'food'].includes(profileFor(o).family)
export const isMilestone = o => profileFor(o).milestone
export const isSchool = o => profileFor(o).family === 'school'
export const isCampus = o => ['school', 'campus'].includes(profileFor(o).family)
export const isCorp = o => ['corporate', 'gala', 'retail', 'property', 'online'].includes(profileFor(o).family)
export const isPublic = o => ['public', 'community', 'sport', 'food'].includes(profileFor(o).family)
export const isOutdoor = o => profileFor(o).family === 'outdoor'
export const isShow = o => ['public', 'gala'].includes(profileFor(o).family)
export const isSport = o => profileFor(o).family === 'sport'
export const isRetail = o => ['retail', 'property'].includes(profileFor(o).family)

/* ── When the day usually starts ─────────────────────────────────────
 * The time slide opens on the hour this kind of day is really held
 * (Mohan, 2026-11-13: "a naming ceremony nobody celebrates after 6 pm;
 * a bachelor party is evening; a team lunch is mid-noon"). [start, hours]. */
export function usualTime(o) {
  const p = profileFor(o)
  const w = `${o?.id ?? ''} ${o?.name ?? ''}`.toLowerCase()
  if (/breakfast|sunrise|yoga|marathon|run\b|walkathon|cyclothon/.test(w)) return ['06:30', 3]
  if (/lunch|brunch/.test(w)) return ['12:30', 3]
  if (/dinner|gala|awards-night|awards night|night|cocktail|sangeet|reception|bachelor|new-year|diwali/.test(w)) return ['19:00', 4]
  switch (p.family) {
    case 'home': case 'faith': case 'baby': case 'memorial': return ['10:00', 4]
    case 'wedding': return ({ roka: ['11:00', 3], engagement: ['11:00', 4], haldi: ['09:30', 3], mehendi: ['15:00', 5], sangeet: ['19:00', 5], cocktail: ['19:30', 4], reception: ['19:00', 4], baraat: ['17:00', 3], griha: ['10:00', 4], shower: ['16:00', 3] }[p.fn] ?? ['09:00', 6])
    case 'birthday': return p.age === 'kids' ? ['16:30', 3] : p.milestone ? ['12:00', 4] : ['19:00', 4]
    case 'anniversary': return ['19:30', 3]
    case 'romance': return ['19:30', 3]
    case 'nightlife': return ['20:00', 4]
    case 'dining': case 'food': return ['19:30', 3]
    case 'school': return ['10:00', 4]
    case 'campus': return ['10:00', 6]
    case 'corporate': case 'online': case 'property': return /team|offsite|retreat/.test(w) ? ['12:30', 4] : ['09:30', 6]
    case 'retail': return ['11:00', 6]
    case 'gala': return ['19:00', 4]
    case 'sport': return ['07:00', 5]
    case 'outdoor': return ['16:00', 4]
    case 'public': case 'community': return /concert|music|show|comedy|dj|edm|screening/.test(w) ? ['18:30', 4] : ['10:00', 6]
    case 'festival': return ['18:00', 4]
    default: return ['18:00', 4]
  }
}
