/**
 * Every celebration a customer can start from: Mohan's master catalogue,
 * 18 categories, each event pointing at the template that says what it
 * takes (templates.js). Names are his, in his order.
 *
 * `f` marks an event that gets its own photograph and can appear on the
 * home screen; the rest are reached through their category and search.
 * `o` overrides a template for one event when that event is the
 * exception (a 60th takes a priest; a beach wedding needs power).
 */
import { TEMPLATES, WHERE, BANDS } from './templates'
import { TRADE } from './trades'

const E = (name, tpl, o = {}) => ({ name, tpl, ...o })

export const CATEGORIES = [
  { id: 'life', label: 'Life’s milestones', short: 'Personal Celebrations', signature: 'cake_desserts', tone: '#FFE9F1', line: 'Birthdays, anniversaries, babies, new homes', events: [
    E('Birthday Party', 'birthday', { f: 1 }), E('First Birthday', 'firstBirthday', { f: 1 }), E('Kids’ Birthday Party', 'kidsParty', { f: 1 }),
    E('Teen Birthday Party', 'teenParty'), E('Milestone Birthday', 'milestoneBirthday', { o: { often: ['photography', 'priest_rituals', 'live_entertainment', 'anchor_mc', 'videography'] } }),
    E('Surprise Birthday Party', 'surprise'), E('Wedding Anniversary', 'anniversary', { f: 1 }), E('Silver Jubilee Anniversary', 'jubilee', { f: 1 }),
    E('Golden Jubilee Anniversary', 'jubilee'), E('Engagement Celebration', 'engagement'), E('Marriage Proposal', 'proposal', { f: 1 }),
    E('Valentine’s Day Celebration', 'romantic'), E('Baby Shower', 'babyShower', { f: 1 }), E('Gender Reveal Party', 'genderReveal'),
    E('Naming Ceremony', 'babyRite', { f: 1 }), E('Cradle Ceremony', 'babyRite'), E('Rice-Feeding Ceremony', 'babyRite'),
    E('Housewarming Ceremony', 'housewarming', { f: 1 }), E('Retirement Party', 'retirement'), E('Graduation Celebration', 'graduationParty'),
    E('Family Reunion', 'gathering'), E('Friends’ Get-Together', 'gathering'), E('Farewell Party', 'farewell'),
    E('Bachelor Party', 'bachelor'), E('Bachelorette Party', 'bachelor'), E('Bridal Shower', 'bridalShower'),
    E('Private Dinner Party', 'privateDinner'), E('Children’s Theme Party', 'kidsParty'), E('Pet Birthday Party', 'petParty'),
    E('Memorial Gathering', 'memorial'), E('Celebration of Life', 'memorial'),
  ] },
  { id: 'wedding', label: 'Weddings & ceremonies', short: 'Indian Weddings', signature: 'bridal_makeup_hair', tone: '#FFEDE3', line: 'Roka to reception, every ritual in between', events: [
    E('Roka Ceremony', 'roka'), E('Pre-Engagement Celebration', 'roka'), E('Engagement Ceremony', 'engagement', { f: 1 }),
    E('Haldi Ceremony', 'haldi', { f: 1 }), E('Mehendi Ceremony', 'mehendi', { f: 1 }), E('Sangeet Night', 'sangeet', { f: 1 }),
    E('Cocktail Party', 'cocktail'), E('Baraat Procession', 'baraat', { f: 1 }), E('Jaimala Ceremony', 'jaimala'),
    E('Wedding Ceremony', 'wedding', { f: 1 }), E('Muhurtham Ceremony', 'wedding', { f: 1 }), E('Pellikuthuru Ceremony', 'homeRite'),
    E('Pellikoduku Ceremony', 'homeRite'), E('Wedding Reception', 'reception', { f: 1 }), E('Post-Wedding Celebration', 'postWedding'),
    E('Destination Wedding', 'destinationWedding', { f: 1 }), E('Intimate Wedding', 'intimateWedding'), E('Bridal Entry', 'bridalEntry'),
    E('Griha Pravesh After Wedding', 'grihaPraveshAfterWedding'),
  ] },
  { id: 'festivals', label: 'Festivals & faith', short: 'Religious & Cultural', signature: 'priest_rituals', tone: '#FFF3DC', line: 'Poojas, pandals and the festivals of the year', events: [
    E('Diwali Celebration', 'diwali', { f: 1 }), E('Ganesh Chaturthi', 'homePooja', { f: 1 }), E('Navratri Celebration', 'communityPuja', { f: 1 }),
    E('Durga Puja', 'communityPuja'), E('Dussehra Celebration', 'communityPuja'), E('Holi Festival', 'holi', { f: 1 }),
    E('Ugadi Celebration', 'harvestNewYear'), E('Gudi Padwa', 'harvestNewYear'), E('Onam Celebration', 'harvestNewYear', { f: 1 }),
    E('Pongal Celebration', 'harvestNewYear'), E('Sankranti Festival', 'harvestNewYear'), E('Vishu Celebration', 'harvestNewYear'),
    E('Eid Celebration', 'eid', { f: 1 }), E('Ramadan Iftar Gathering', 'eid'), E('Christmas Celebration', 'christmas', { f: 1 }),
    E('New Year Celebration', 'newYear'), E('Gurpurab Celebration', 'gurpurab'), E('Janmashtami Celebration', 'homePooja'),
    E('Maha Shivaratri', 'homePooja'), E('Saraswati Puja', 'homePooja'), E('Independence Day Celebration', 'nationalDay'),
    E('Republic Day Celebration', 'nationalDay'), E('Regional Cultural Festival', 'culturalFest'), E('Traditional Community Festival', 'culturalFest'),
  ] },
  { id: 'school', label: 'School events', short: 'School Events', signature: 'anchor_mc', tone: '#E6F0FF', line: 'Annual days, sports days, graduations', events: [
    E('School Annual Day', 'schoolStage', { f: 1 }), E('School Sports Day', 'schoolSports', { f: 1 }), E('School Graduation', 'schoolGraduation'),
    E('Kindergarten Graduation', 'schoolGraduation'), E('School Farewell', 'schoolParty'), E('Freshers’ Welcome', 'schoolParty'),
    E('Teachers’ Day Celebration', 'schoolParty'), E('Children’s Day Celebration', 'schoolParty'), E('Science Exhibition', 'schoolExhibition'),
    E('Art and Craft Exhibition', 'schoolExhibition'), E('School Cultural Day', 'schoolStage'), E('School Talent Show', 'schoolStage'),
    E('School Debate Competition', 'schoolDebate'), E('School Awards Ceremony', 'schoolStage'), E('Parent-Teacher Gathering', 'schoolMeeting'),
    E('School Reunion', 'gathering'), E('School Fundraiser', 'schoolFair'), E('School Carnival', 'schoolFair'),
    E('Career Day', 'schoolMeeting'), E('School Project Exhibition', 'schoolExhibition'),
  ] },
  { id: 'college', label: 'College & university', short: 'College & University', signature: 'dj_music', tone: '#EAF2FF', line: 'Fests, convocations, hackathons', events: [
    E('College Fest', 'collegeFest', { f: 1 }), E('Freshers’ Party', 'collegeParty'), E('College Farewell', 'collegeParty'),
    E('Convocation Ceremony', 'convocation', { f: 1 }), E('Graduation Party', 'graduationParty'), E('Technical Fest', 'collegeFest'),
    E('Hackathon', 'hackathon', { f: 1 }), E('College Cultural Fest', 'collegeFest'), E('Intercollege Competition', 'collegeFest'),
    E('College Sports Meet', 'campusSports'), E('Alumni Meet', 'gathering', { o: { must: ['venue', 'catering_food', 'sound_av'] } }),
    E('College Concert', 'concert', { o: { where: 'campus' } }), E('College Fashion Show', 'fashionShow', { o: { where: 'campus' } }),
    E('Debate Competition', 'competition'), E('Student Awards Night', 'awardsNight', { o: { where: 'campus' } }),
    E('Entrepreneurship Summit', 'conference'), E('Campus Recruitment Event', 'recruitment', { o: { where: 'campus' } }),
    E('College Club Meetup', 'workshop', { o: { where: 'campus' } }), E('Innovation Showcase', 'exhibition'), E('Youth Festival', 'collegeFest'),
  ] },
  { id: 'corporate', label: 'Corporate & business', short: 'Corporate & Business', signature: 'sound_av', tone: '#E8EEFB', line: 'Conferences, launches, offsites, award nights', events: [
    E('Corporate Annual Day', 'awardsNight', { f: 1 }), E('Corporate Conference', 'conference', { f: 1 }), E('Business Summit', 'conference'),
    E('Product Launch', 'launch', { f: 1 }), E('Brand Launch', 'launch'), E('Store Opening', 'opening', { f: 1 }),
    E('Office Inauguration', 'opening'), E('Board Meeting', 'boardroom'), E('Annual General Meeting', 'conference'),
    E('Dealer Meet', 'conference'), E('Distributor Conference', 'conference'), E('Employee Awards Night', 'awardsNight'),
    E('Employee Appreciation Event', 'teamDay'), E('Team-Building Event', 'teamDay', { f: 1 }), E('Corporate Retreat', 'retreat'),
    E('Leadership Summit', 'conference'), E('Investor Meet', 'boardroom', { o: { scale: 'social' } }), E('Networking Event', 'networking'),
    E('Trade Partner Meet', 'conference'), E('Corporate Family Day', 'teamDay'), E('Corporate Sports Day', 'tournament'),
    E('Training Workshop', 'workshop'), E('Press Conference', 'pressMeet'), E('Media Launch', 'launch'),
    E('Business Expo', 'expo'), E('Industry Convention', 'conference'), E('Recruitment Drive', 'recruitment'),
    E('Company Milestone Celebration', 'awardsNight'), E('Corporate Town Hall', 'townHall'), E('Sales Kick-Off', 'conference'),
    E('Client Appreciation Event', 'awardsNight'), E('Franchise Meet', 'conference'), E('Business Anniversary', 'awardsNight'),
    E('Strategic Planning Offsite', 'retreat'), E('Partner Summit', 'conference'),
  ] },
  { id: 'nightlife', label: 'Live entertainment & nightlife', short: 'Live & Nightlife', signature: 'live_entertainment', tone: '#FBE6F4', line: 'Concerts, DJ nights, comedy, rooftops', events: [
    E('Live Concert', 'concert', { f: 1 }), E('DJ Night', 'clubNight', { f: 1 }), E('EDM Festival', 'concert'),
    E('Bollywood Night', 'clubNight'), E('Techno Night', 'clubNight'), E('Live Band Performance', 'liveMusic'),
    E('Acoustic Music Night', 'smallStage'), E('Karaoke Night', 'smallStage'), E('Stand-Up Comedy Show', 'smallStage', { f: 1 }),
    E('Open Mic Night', 'smallStage'), E('Poetry Night', 'smallStage'), E('Dance Performance', 'dance'),
    E('Celebrity Appearance', 'celebrity'), E('Pub Party', 'clubNight'), E('Brewery Event', 'clubNight'),
    E('Rooftop Party', 'clubNight', { f: 1 }), E('Pool Party', 'poolParty'), E('Lounge Night', 'clubNight'),
    E('Nightclub Theme Party', 'clubNight'), E('Silent Disco', 'silentDisco'), E('Music Festival', 'concert'),
    E('Battle of the Bands', 'concert'), E('Cultural Music Night', 'liveMusic'), E('Food and Music Night', 'foodMusic'),
    E('Live Orchestra', 'liveMusic'), E('Jazz Night', 'smallStage'), E('Tribute Concert', 'concert'),
    E('Comedy Festival', 'smallStage', { o: { scale: 'large' } }), E('Dance Battle', 'dance'), E('Underground Music Event', 'concert', { o: { scale: 'large' } }),
    E('College Music Night', 'concert', { o: { where: 'campus', scale: 'large' } }),
  ] },
  { id: 'public', label: 'Public shows & culture', short: 'Public Shows', signature: 'event_lighting', tone: '#F1E8FF', line: 'Premieres, exhibitions, carnivals, galas', events: [
    E('Public Festival', 'publicFestival'), E('Fashion Show', 'fashionShow', { f: 1 }), E('Film Premiere', 'premiere'),
    E('Film Screening', 'screening'), E('Theatre Performance', 'stageShow'), E('Art Exhibition', 'exhibition', { f: 1 }),
    E('Photography Exhibition', 'exhibition'), E('Flea Market', 'market'), E('Comic Convention', 'convention'),
    E('Gaming Convention', 'convention'), E('Auto Expo', 'expo'), E('Fireworks Show', 'showSafety'),
    E('Public Carnival', 'publicFestival'), E('Street Performance Festival', 'publicFestival'), E('Dance Festival', 'dance'),
    E('Literary Festival', 'bookLaunch', { o: { scale: 'large' } }), E('Book Launch', 'bookLaunch'), E('Awards Ceremony', 'gala'),
    E('Charity Gala', 'gala', { f: 1 }), E('Public Awareness Event', 'awareness'), E('Magic Show', 'stageShow'),
    E('Circus Performance', 'stageShow'), E('Cultural Showcase', 'stageShow'), E('Talent Competition', 'stageShow'),
    E('Light and Sound Show', 'showSafety'), E('Immersive Experience', 'immersive'), E('Fan Convention', 'convention'),
    E('Cosplay Event', 'convention'),
  ] },
  { id: 'sport', label: 'Sports, fitness & wellness', short: 'Sports & Wellness', signature: 'safety_facilities', tone: '#E5F6EC', line: 'Tournaments, runs, retreats', events: [
    E('Cricket Tournament', 'tournament', { f: 1 }), E('Football Tournament', 'tournament'), E('Badminton Tournament', 'tournament'),
    E('Marathon', 'race', { f: 1 }), E('Cycling Event', 'race'), E('Corporate Sports Tournament', 'tournament'),
    E('School Sports Competition', 'tournament'), E('Esports Tournament', 'esports'), E('Fitness Bootcamp', 'wellness'),
    E('Yoga Workshop', 'wellness', { f: 1 }), E('Meditation Retreat', 'wellness'), E('Wellness Retreat', 'wellness'),
    E('Martial Arts Competition', 'tournament'), E('Swimming Competition', 'tournament'), E('Sports Awards Ceremony', 'awardsNight'),
    E('Community Fitness Day', 'wellness', { o: { where: 'site', scale: 'large' } }), E('Basketball Tournament', 'tournament'),
    E('Volleyball Tournament', 'tournament'), E('Kabaddi Tournament', 'tournament'), E('Running Club Meetup', 'race', { o: { scale: 'social' } }),
    E('Adventure Sports Event', 'adventure'), E('Fitness Challenge', 'adventure'), E('Gym Launch Event', 'opening'),
    E('Sports Fan Gathering', 'fanGathering'), E('Charity Run', 'race'), E('Dance Fitness Workshop', 'wellness'),
  ] },
  { id: 'food', label: 'Food & dining', short: 'Food & Dining', signature: 'catering_food', tone: '#FFF0E0', line: 'Food festivals, chef’s tables, BBQs', events: [
    E('Food Festival', 'foodFestival', { f: 1 }), E('Street Food Festival', 'foodFestival'), E('Restaurant Opening', 'opening'),
    E('Restaurant Anniversary', 'awardsNight', { o: { where: 'premises', scale: 'social' } }), E('Chef’s Table Experience', 'chefTable', { f: 1 }),
    E('Wine and Food Evening', 'chefTable'), E('Culinary Workshop', 'workshop'), E('Bakery Launch', 'opening'),
    E('Food Tasting Event', 'tasting'), E('Pop-Up Dining Experience', 'chefTable'), E('BBQ Party', 'bbq', { f: 1 }),
    E('Brunch Gathering', 'bbq'), E('Private Chef Dinner', 'chefTable'), E('Coffee Festival', 'foodFestival'),
    E('Dessert Festival', 'foodFestival'), E('Cooking Competition', 'workshop', { o: { must: ['venue', 'event_equipment_rental', 'anchor_mc'] } }),
    E('Baking Workshop', 'workshop'), E('Brewery Tasting Event', 'tasting'), E('Farm-to-Table Dinner', 'chefTable'),
    E('Food Truck Festival', 'foodFestival'), E('Catering Showcase', 'tasting'), E('Hospitality Food Expo', 'expo'),
  ] },
  { id: 'retail', label: 'Retail, fashion & lifestyle', short: 'Retail & Fashion', signature: 'gifts_favours', tone: '#FDE7F0', line: 'Launches, pop-ups, expos, pageants', events: [
    E('Shopping Festival', 'market'), E('Retail Store Launch', 'storeLaunch', { f: 1 }), E('Shopping Mall Event', 'mallEvent'),
    E('Fashion Pop-Up', 'storeLaunch'), E('Fashion Exhibition', 'exhibition'), E('Luxury Brand Showcase', 'storeLaunch'),
    E('Designer Collection Launch', 'storeLaunch'), E('Jewellery Exhibition', 'exhibition', { f: 1 }), E('Beauty and Makeup Workshop', 'workshop'),
    E('Product Demonstration', 'productDemo'), E('Customer Appreciation Event', 'mallEvent'), E('Seasonal Sale Event', 'mallEvent'),
    E('Lifestyle Expo', 'expo'), E('Home Decor Exhibition', 'exhibition'), E('Interior Design Showcase', 'exhibition'),
    E('Artisan Market', 'market'), E('Handicraft Exhibition', 'exhibition'), E('Wedding Expo', 'expo'),
    E('Lifestyle Workshop', 'workshop'), E('Beauty Pageant', 'fashionShow', { o: { must: ['venue', 'sound_av', 'event_lighting', 'anchor_mc'] } }),
  ] },
  { id: 'property', label: 'Property & hospitality', short: 'Property & Hospitality', signature: 'venue', tone: '#E8F4EC', line: 'Launches, open houses, hotel openings', events: [
    E('Property Launch', 'propertyLaunch', { f: 1 }), E('Real Estate Exhibition', 'expo'), E('Property Open House', 'openHouse'),
    E('New Project Inauguration', 'propertyLaunch'), E('Hotel Opening', 'launch', { o: { where: 'premises' } }), E('Resort Launch', 'propertyLaunch'),
    E('Hospitality Awards Night', 'gala'), E('Luxury Property Showcase', 'openHouse'), E('Home Interior Reveal', 'openHouse'),
    E('Architecture Exhibition', 'exhibition'), E('Smart Home Showcase', 'openHouse'), E('Hotel Anniversary', 'awardsNight', { o: { where: 'premises' } }),
    E('Travel Trade Meet', 'conference'), E('Tourism Expo', 'expo'), E('Holiday Resort Celebration', 'destination'),
  ] },
  { id: 'community', label: 'Community & charity', short: 'Community & Charity', signature: 'guest_services', tone: '#EEF3E2', line: 'Drives, camps, fundraisers, civic days', events: [
    E('Government Inauguration', 'inauguration'), E('Public Consultation', 'publicMeeting'), E('Civic Awareness Campaign', 'awareness'),
    E('Community Gathering', 'culturalFest', { o: { scale: 'large' } }), E('Community Cultural Day', 'culturalFest'), E('NGO Fundraiser', 'fundraiser'),
    E('Charity Auction', 'fundraiser'), E('Blood Donation Camp', 'bloodCamp', { f: 1 }), E('Volunteer Appreciation Event', 'teamDay'),
    E('Environmental Awareness Event', 'awareness'), E('Tree-Planting Drive', 'drive'), E('Community Service Day', 'drive'),
    E('Public Health Awareness Event', 'awareness'), E('Social Impact Summit', 'conference'), E('Fundraising Gala', 'gala'),
    E('Community Cleanup Drive', 'drive'), E('Disaster Relief Fundraiser', 'fundraiser'), E('Public Grievance Meeting', 'publicMeeting'),
    E('Local Residents’ Association Meeting', 'publicMeeting'), E('Community Sports Day', 'tournament', { o: { where: 'site' } }),
    E('Neighbourhood Festival', 'publicFestival', { o: { scale: 'large' } }), E('Civic Award Ceremony', 'gala'), E('Public Safety Awareness Programme', 'awareness'),
  ] },
  { id: 'industry', label: 'Industry & professional', short: 'Industry & Professional', signature: 'sound_av', tone: '#E7ECF7', line: 'Summits, symposiums, demo days, expos', events: [
    E('Technology Summit', 'conference', { f: 1 }), E('AI and Innovation Conference', 'conference'), E('Startup Demo Day', 'pitch', { f: 1 }),
    E('Investor Pitch Event', 'pitch'), E('Healthcare Conference', 'conference'), E('Medical Workshop', 'workshop'),
    E('Education Summit', 'conference'), E('Academic Conference', 'conference'), E('Research Symposium', 'conference'),
    E('Agriculture Expo', 'expo'), E('Manufacturing Expo', 'expo'), E('Logistics Summit', 'conference'),
    E('Automotive Conference', 'conference'), E('Banking and Finance Summit', 'conference'), E('Sustainability Conference', 'conference'),
    E('Architecture Conference', 'conference'), E('Legal Conference', 'conference'), E('Hospitality Industry Summit', 'conference'),
    E('Franchise Expo', 'expo'), E('Professional Networking Meet', 'networking'), E('Cybersecurity Conference', 'conference'),
    E('Data Science Conference', 'conference'), E('Developer Conference', 'conference'), E('Robotics Exhibition', 'exhibition', { o: { scale: 'large' } }),
    E('Clean Energy Summit', 'conference'), E('Biotechnology Conference', 'conference'), E('Supply Chain Conference', 'conference'),
    E('Aviation Expo', 'expo'), E('Pharmaceutical Conference', 'conference'), E('Telecommunications Summit', 'conference'),
    E('Mining and Infrastructure Expo', 'expo'),
  ] },
  { id: 'themed', label: 'Seasonal & themed parties', short: 'Themed Parties', signature: 'decoration_floral', tone: '#F7E6FB', line: 'Halloween, masquerades, garden parties', events: [
    E('Halloween Party', 'clubNight', { f: 1, o: { must: ['decoration_floral', 'dj_music', 'catering_food'], often: ['event_lighting', 'bar_beverages', 'photography', 'bridal_makeup_hair'] } }),
    E('Christmas Party', 'christmas'), E('New Year’s Eve Party', 'newYear', { f: 1 }), E('Valentine’s Party', 'clubNight'),
    E('Retro Theme Party', 'clubNight'), E('Masquerade Ball', 'gala', { f: 1 }), E('Black-Tie Gala', 'gala'),
    E('White Party', 'clubNight'), E('Neon Party', 'clubNight'), E('Costume Party', 'clubNight'),
    E('Garden Party', 'bbq', { f: 1, o: { must: ['catering_food', 'decoration_floral'], often: ['tent_furniture', 'bar_beverages', 'live_entertainment'] } }),
    E('Beach Party', 'poolParty'), E('Poolside Party', 'poolParty'), E('Casino Theme Night', 'clubNight', { o: { must: ['decoration_floral', 'live_entertainment', 'catering_food'] } }),
    E('Great Gatsby Party', 'gala'), E('Carnival Theme Party', 'clubNight'), E('Glow Party', 'clubNight'),
    E('Rooftop Celebration', 'clubNight'), E('Outdoor Movie Night', 'screening'), E('Summer Party', 'poolParty'),
    E('Winter Wonderland Party', 'clubNight'), E('Tropical Theme Party', 'clubNight'), E('Arabian Nights Theme Party', 'clubNight'),
    E('Space Theme Party', 'kidsParty'), E('Decades Theme Party', 'clubNight'),
    E('Murder Mystery Party', 'privateDinner', { o: { must: ['live_entertainment', 'catering_food', 'decoration_floral'], why: { live_entertainment: 'Actors and a host who run the mystery' } } }),
    E('Pajama Party', 'welcomeHome', { o: { must: ['decoration_floral', 'catering_food'], often: ['cake_desserts', 'photography'] } }),
    E('Silent Party', 'silentDisco'), E('Enchanted Garden Party', 'clubNight'),
  ] },
  { id: 'outdoor', label: 'Destination & outdoor', short: 'Travel & Outdoor', signature: 'tent_furniture', tone: '#E3F3F7', line: 'Beaches, resorts, camps, cruises', events: [
    E('Destination Celebration', 'destination', { f: 1 }), E('Beach Wedding', 'wedding', { f: 1, o: { must: ['venue', 'catering_food', 'decoration_floral', 'priest_rituals', 'photography', 'power_cooling'] } }),
    E('Garden Wedding', 'wedding'), E('Resort Celebration', 'destination'), E('Camping Gathering', 'outdoorStay', { f: 1 }),
    E('Adventure Club Meetup', 'adventure'), E('Outdoor Concert', 'concert', { o: { where: 'site' } }), E('Open-Air Cinema', 'screening'),
    E('Scenic Picnic Event', 'picnic'), E('Destination Birthday', 'destination'), E('Travel Community Meetup', 'gathering'),
    E('Outdoor Festival', 'publicFestival'), E('Heritage Celebration', 'culturalFest'), E('Cultural Tourism Event', 'culturalFest'),
    E('Mountain Retreat', 'outdoorStay'), E('Luxury Yacht Party', 'boat', { f: 1 }), E('Boat Cruise Celebration', 'boat'),
    E('Nature Retreat', 'outdoorStay'), E('Glamping Experience', 'outdoorStay'), E('Outdoor Adventure Challenge', 'adventure'),
    E('Destination Anniversary', 'destination'), E('Sunset Celebration', 'sunset'), E('Stargazing Gathering', 'outdoorStay'),
    E('Road Trip Meetup', 'gathering', { o: { must: ['passenger_transport', 'catering_food'] } }),
  ] },
  { id: 'online', label: 'Virtual & hybrid', short: 'Virtual & Hybrid', signature: 'videography', tone: '#ECE8FF', line: 'Livestreams, webinars, hybrid conferences', events: [
    E('Virtual Conference', 'virtual', { f: 1 }), E('Hybrid Conference', 'hybrid', { f: 1 }), E('Online Workshop', 'virtual'),
    E('Virtual Product Launch', 'virtual'), E('Webinar', 'virtual'), E('Virtual Awards Ceremony', 'virtual'),
    E('Hybrid Corporate Town Hall', 'hybrid'), E('Online Graduation Celebration', 'virtualSocial'), E('Virtual Family Reunion', 'virtualSocial'),
    E('Livestream Concert', 'livestream'), E('Virtual Networking Event', 'virtual'), E('Online Training Session', 'virtual'),
    E('Hybrid Trade Show', 'hybrid', { o: { must: ['tent_furniture', 'event_equipment_rental', 'videography', 'sound_av'] } }),
    E('Virtual Career Fair', 'virtual'), E('Online Hackathon', 'virtual'), E('Virtual Fundraiser', 'virtual'),
    E('Hybrid Wedding', 'wedding', { o: { must: ['venue', 'catering_food', 'decoration_floral', 'priest_rituals', 'photography', 'videography'],
      why: { videography: 'The livestream for family who cannot travel' } } }),
    E('Virtual Birthday Celebration', 'virtualSocial'), E('Online Community Meetup', 'virtual'), E('Livestream Product Demonstration', 'virtual'),
  ] },
  { id: 'special', label: 'Special & private', short: 'Special Occasions', signature: 'decoration_floral', tone: '#FFE7EC', line: 'Proposals, candlelight dinners, surprises', events: [
    E('Surprise Celebration', 'surprise', { f: 1 }), E('Romantic Dinner', 'romantic', { f: 1 }), E('Anniversary Dinner', 'romantic'),
    E('Proposal Setup', 'proposal'), E('Private Screening', 'screening', { o: { scale: 'intimate' } }), E('Luxury Picnic', 'picnic', { f: 1 }),
    E('Candlelight Dinner', 'romantic'), E('Personalised Theme Party', 'birthday'), E('VIP Celebration', 'gala', { o: { scale: 'social' } }),
    E('Exclusive House Party', 'houseParty'), E('Private Music Performance', 'liveMusic', { o: { where: 'home', scale: 'intimate' } }),
    E('Intimate Garden Dinner', 'romantic'), E('Luxury Rooftop Dinner', 'romantic'),
    E('Private Karaoke Party', 'houseParty', { o: { must: ['sound_av', 'catering_food'], often: ['bar_beverages', 'decoration_floral'] } }),
    E('Family Celebration Dinner', 'privateDinner'), E('Milestone Achievement Party', 'birthday'), E('Welcome Home Party', 'welcomeHome'),
    E('Going-Away Party', 'farewell'), E('Reunion Dinner', 'privateDinner'), E('Graduation Dinner', 'privateDinner'),
  ] },
]

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const AT_HOME = new Set(['home', 'newhome', 'online'])
function journeyFor(t) {
  if (t.where === 'online') return []
  const out = []
  if (t.scale !== 'intimate' && !AT_HOME.has(t.where)) out.push('passenger_transport')
  if (t.scale === 'large' || t.scale === 'massive') out.push('safety_facilities', 'loading_unloading_crew')
  return out
}

/* Resolve every event against its template once, at module load. */
const seen = new Set()
export const OCCASIONS = CATEGORIES.flatMap(c => c.events.map(e => {
  let id = slug(e.name)
  if (seen.has(id)) id = `${id}-${c.id}`
  seen.add(id)
  const base = TEMPLATES[e.tpl]
  if (!base) throw new Error(`occasions: no template ${e.tpl} for ${e.name}`)
  const t = { ...base, ...(e.o ?? {}), why: { ...base.why, ...(e.o?.why ?? {}) } }
  /* An override of `must` must not leave the same trade in `often` too.
     And a settled location is never offered a venue: "On campus" with a
     "Find a venue" row is the impossible-option defect, word for word. */
  const keep = x => t.where === 'ask' || x !== 'venue'
  const must = [...new Set(t.must)].filter(keep)
  const often = [...new Set(t.often)].filter(x => keep(x) && !must.includes(x))
  const extra = [...new Set(t.extra)].filter(x => keep(x) && !must.includes(x) && !often.includes(x))
  /* The end of the day is part of the plan too: getting everyone home, and
     clearing a big site. Offered, never pre-selected, and only where it is
     real — nobody books cabs for guests at their own house-warming. */
  for (const x of journeyFor(t)) if (!must.includes(x) && !often.includes(x) && !extra.includes(x)) extra.push(x)
  for (const x of [...must, ...often, ...extra]) if (!TRADE[x]) throw new Error(`occasions: unknown trade ${x} in ${e.name}`)
  /* "Where" is settled for most occasions. Only `ask` lets the customer say
     whether they need a venue, and only then is the venue a choice. */
  return {
    id, name: e.name, category: c.id, categoryLabel: c.label, categoryShort: c.short, tone: c.tone, featured: !!e.f, template: e.tpl,
    must, often, extra, why: t.why, where: t.where, whereLabel: WHERE[t.where], scale: t.scale, bands: BANDS[t.scale], people: t.people,
  }
}))

export const OCCASION = Object.fromEntries(OCCASIONS.map(o => [o.id, o]))
export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, { ...c, occasions: OCCASIONS.filter(o => o.category === c.id) }]))
export const FEATURED = OCCASIONS.filter(o => o.featured)

/** A short line under an occasion: "6 essentials · 50–250 guests". */
export function occasionLine(o) {
  const b = o.bands
  return `${o.must.length} essentials · ${o.whereLabel ?? `${b[0]}–${b[b.length - 1].toLocaleString('en-IN')} ${o.people.toLowerCase()}`}`
}

/** Season-aware picks for the home screen: what Bengaluru is planning now. */
export function inSeason(date = new Date()) {
  const m = date.getMonth() // 0 = Jan
  const by = {
    0: ['sankranti-festival', 'pongal-celebration', 'republic-day-celebration', 'wedding-reception'],
    1: ['wedding-ceremony', 'engagement-ceremony', 'valentines-day-celebration', 'maha-shivaratri'],
    2: ['holi-festival', 'ugadi-celebration', 'convocation-ceremony', 'wedding-reception'],
    3: ['vishu-celebration', 'housewarming-ceremony', 'school-graduation', 'wedding-ceremony'],
    4: ['housewarming-ceremony', 'wedding-ceremony', 'baby-shower', 'summer-party'],
    5: ['birthday-party', 'school-annual-day', 'naming-ceremony', 'corporate-conference'],
    6: ['birthday-party', 'corporate-conference', 'naming-ceremony', 'baby-shower'],
    7: ['independence-day-celebration', 'janmashtami-celebration', 'onam-celebration', 'ganesh-chaturthi'],
    8: ['ganesh-chaturthi', 'onam-celebration', 'navratri-celebration', 'teachers-day-celebration'],
    9: ['navratri-celebration', 'diwali-celebration', 'durga-puja', 'wedding-reception'],
    10: ['diwali-celebration', 'wedding-ceremony', 'sangeet-night', 'childrens-day-celebration'],
    11: ['christmas-celebration', 'new-years-eve-party', 'wedding-reception', 'corporate-annual-day'],
  }
  return (by[m] ?? []).map(id => OCCASION[id]).filter(Boolean)
}
