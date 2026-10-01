/**
 * Sambramo partner pricing UX catalog.
 *
 * This file is intentionally separate from authoritative pricing data.
 * It contains partner-facing controls, presets and copy suggestions.
 * Saved values still go through the existing vendor_service_id scoped RPC.
 */

export const ROYAL_AMETHYST = '#2A085C'

export const COMMON_PRICING_UNITS = [
  ['package', 'Package'],
  ['per event', 'Per event'],
  ['per hour', 'Per hour'],
  ['per day', 'Per day'],
  ['per trip', 'Per trip'],
  ['per km', 'Per km'],
  ['per person', 'Per person'],
  ['per guest', 'Per guest'],
  ['per item', 'Per item'],
  ['per piece', 'Per piece'],
  ['per batch', 'Per batch'],
  ['per function', 'Per function'],
  ['per project', 'Per project'],
  ['custom quote', 'Custom quote'],
]

const COMMON_SELECTS = {
  menu: ['Chef-curated menu', 'Customer-selected menu', 'Multi-cuisine menu', 'Fixed package menu', 'Custom menu'],
  cuisine: ['South Indian', 'North Indian', 'Multi-cuisine', 'Continental', 'Asian', 'Regional / Traditional', 'Custom'],
  service_style: ['Buffet', 'Plated service', 'Family style', 'Live counters', 'Cocktail / reception service', 'Custom'],
  coverage_hours: ['2', '4', '6', '8', '10', '12', 'Full day'],
  photographers: ['1', '2', '3', '4', '5+'],
  videographers: ['1', '2', '3', '4', '5+'],
  album: ['No album', 'Standard album', 'Premium album', 'Luxury album', 'Digital album'],
  reels: ['0', '1', '2', '3', '5', '8', '10+'],
  drone: ['Not included', 'Included', 'Available as add-on', 'Subject to venue permission'],
  highlight: ['Not included', 'Highlight film', '2–3 minute edit', '5–8 minute edit', 'Custom edit'],
  stage: ['Not included', 'Basic stage', 'Standard stage', 'Premium stage', 'Custom stage'],
  backdrop: ['Not included', 'Fabric backdrop', 'Floral backdrop', 'LED backdrop', 'Premium custom backdrop'],
  mandap: ['Not included', 'Basic mandap', 'Traditional mandap', 'Floral mandap', 'Premium custom mandap'],
  entrance: ['Not included', 'Basic entrance', 'Floral entrance', 'Theme entrance', 'Premium custom entrance'],
  flowers: ['Artificial', 'Fresh seasonal', 'Premium fresh', 'Mixed floral', 'Custom floral design'],
  lighting: ['Basic', 'Ambient', 'Decorative', 'Premium', 'Custom'],
  dimensions: ['Standard', 'Small venue', 'Medium venue', 'Large venue', 'Site measurement required'],
  slot: ['Morning', 'Afternoon', 'Evening', 'Night', 'Full day', 'Custom time slot'],
  rental: ['Venue rental', 'Per plate', 'Half-day rental', 'Full-day rental', 'Custom quote'],
  tent: ['Open lawn canopy', 'Waterproof canopy', 'Pagoda tent', 'Air-cooled tent', 'Premium themed tent'],
  paper: ['80 GSM', '100 GSM', '120 GSM', '170 GSM', '250 GSM', 'Luxury board'],
  finish: ['Matte', 'Gloss', 'Textured', 'Foil', 'Embossed', 'Premium custom'],
  delivery: ['Pickup', 'Local delivery', 'Doorstep delivery', 'Express delivery', 'Delivery + setup'],
  vehicle: ['Sedan', 'SUV', 'Tempo Traveller', 'Minibus', 'Luxury vehicle', 'Partner fleet / custom'],
  vehicle_class: ['Mini pickup', 'LCV', 'Medium truck', 'Large truck', 'Dedicated event freight'],
  fuel_policy: ['Fuel included', 'Fuel extra', 'Fuel by route', 'Customer-provided fuel'],
  route: ['Local Bengaluru', 'Within city limits', 'Bengaluru + outskirts', 'Intercity', 'Route survey required'],
  ac: ['AC', 'Non-AC', 'AC on request', 'Climate-controlled'],
  waiting: ['30 min included', '60 min included', '90 min included', '2 hours included', 'Charged after included time'],
  fixtures: ['4–8', '9–16', '17–32', '33–64', '65+'],
  coverage: ['Head table / stage', 'Small venue', 'Medium venue', 'Large venue', 'Outdoor area', 'Full venue'],
  operator: ['Not included', '1 operator', '2 operators', 'Dedicated operator team', 'Available as add-on'],
  power: ['Standard venue power', 'Single phase', 'Three phase', 'Dedicated power required', 'Generator required'],
  flavour: ['Vanilla', 'Chocolate', 'Red velvet', 'Butterscotch', 'Fresh fruit', 'Regional / custom'],
  customization: ['Standard design', 'Name / message', 'Theme matched', 'Photo / print', 'Fully custom'],
  coverage: ['Standard coverage', 'Bridal only', 'Bridal + family', 'Venue-wide', 'Custom'],
  function: ['Wedding', 'Engagement', 'Reception', 'Pre-wedding', 'Corporate', 'Other event'],
  makeup: ['Traditional', 'HD', 'Airbrush', 'Natural / soft glam', 'Premium editorial'],
  hair: ['Basic styling', 'Blow-dry + styling', 'Curls / waves', 'Updo', 'Premium styling'],
  draping: ['Not included', 'Standard saree drape', 'Pleated drape', 'Designer drape', 'Custom draping'],
  scope: ['Day-of coordination', 'Wedding week', 'Partial planning', 'Full planning', 'Destination planning'],
  product: ['Standard product', 'Premium product', 'Luxury product', 'Branded product', 'Custom product'],
  paper: ['80 GSM', '100 GSM', '120 GSM', '170 GSM', '250 GSM', 'Luxury board'],
  finish: ['Matte', 'Gloss', 'Textured', 'Foil', 'Embossed', 'Premium custom'],
  compliance: ['Compliant / ready', 'Documents available', 'Approval required', 'Customer venue compliance', 'Custom review'],
  technical: ['Basic rider', 'Standard rider', 'Professional rider', 'Venue-specific rider', 'Custom technical rider'],
  rehearsal: ['Not included', '1 rehearsal', '2 rehearsals', 'Venue rehearsal', 'Custom rehearsal plan'],
  language: ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Bilingual', 'Multilingual', 'Custom'],
  event_type: ['Wedding', 'Birthday', 'Corporate', 'Product launch', 'Reception', 'Private celebration', 'Custom event'],
  parking_distance: ['On-site', 'Up to 100 m', '100–250 m', '250–500 m', 'Off-site shuttle needed'],
  waste: ['No waste service', 'Basic bins', 'Collection + disposal', 'Segregated waste handling', 'Custom waste plan'],
  first_aid: ['Not included', 'Basic first-aid kit', 'Medic on call', 'Dedicated first-aid desk', 'Custom medical support'],
  ritual: ['Puja', 'Wedding rituals', 'Engagement rituals', 'Housewarming', 'Naming ceremony', 'Custom ritual'],
  tradition: ['South Indian', 'North Indian', 'Kannada', 'Tamil', 'Telugu', 'Malayali', 'Pan-Indian', 'Custom tradition'],
  samagri: ['Partner supplied', 'Customer supplied', 'Basic samagri included', 'Complete samagri included', 'Custom samagri list'],
  packaging: ['Standard pack', 'Premium pack', 'Luxury pack', 'Corporate pack', 'Custom packaging'],
  personalization: ['None', 'Name / initials', 'Message card', 'Logo / branding', 'Theme personalization', 'Fully custom'],
  packing_type: ['Gift wrap', 'Box packing', 'Hamper packing', 'Trousseau packing', 'Premium presentation'],
  box: ['Cardboard', 'Rigid box', 'Magnetic box', 'Wooden box', 'Luxury custom box'],
  material: ['Paper', 'Cardboard', 'Fabric', 'Wood', 'Metal', 'Mixed premium material'],
  inventory: ['Standard inventory', 'Event inventory', 'Furniture inventory', 'AV / technical inventory', 'Custom inventory'],
  equipment: ['Furniture', 'Stage equipment', 'AV equipment', 'Lighting equipment', 'Decor equipment', 'Custom equipment'],
  sku: ['Partner SKU entry', 'Catalog SKU', 'Custom SKU'],
  rental_period: ['4 hours', '8 hours', '1 day', '2 days', '3 days', '1 week', 'Custom period'],
  deposit: ['No deposit', '10%', '20%', '30%', '50%', 'Custom deposit'],
  overtime: ['Not available', 'Hourly overtime', '30-minute blocks', 'After-shift premium', 'Custom'],
  handling: ['Standard handling', 'Fragile handling', 'Heavy handling', 'Loading + unloading', 'On-site placement', 'Custom handling'],
  storage_type: ['Indoor storage', 'Covered storage', 'Pallet storage', 'Racked storage', 'Climate-controlled', 'Open yard'],
  security: ['Standard', 'CCTV monitored', 'Guarded', 'Restricted access', 'High-security / dedicated bay'],
  waste: ['No waste service', 'Basic bins', 'Collection + disposal', 'Segregated waste handling', 'Custom waste plan'],
  fleet: ['Partner vehicle', '2–3 vehicles', '4–6 vehicles', '7–10 vehicles', 'Dedicated event fleet'],
  crew: ['1–2 staff', '3–4 staff', '5–8 staff', '9–12 staff', 'Dedicated event crew'],
}

export const TRADE_FIELD_OPTIONS = {
  E01: { menu: ['Chef-curated menu','Customer-selected menu','Fixed package menu','Custom menu'], cuisine: ['South Indian','North Indian','Multi-cuisine','Continental','Asian','Regional / Traditional'], service_style: ['Buffet','Plated service','Family style','Live counters','Reception service'] },
  E02: { coverage_hours: ['2','4','6','8','10','12'], photographers: ['1','2','3','4','5+'], album: ['No album','Standard album','Premium album','Luxury album','Digital album'], reels: ['0','1','2','3','5','8','10+'], drone: ['Not included','Included','Available as add-on','Subject to venue permission'] },
  E03: { coverage_hours: ['2','4','6','8','10','12'], videographers: ['1','2','3','4','5+'], highlight: ['Not included','Highlight film','2–3 minute edit','5–8 minute edit','Custom edit'], reels: ['0','1','2','3','5','8','10+'], drone: ['Not included','Included','Available as add-on','Subject to venue permission'] },
  E04: { stage: ['Not included','Basic stage','Standard stage','Premium stage','Custom stage'], backdrop: ['Not included','Fabric backdrop','Floral backdrop','LED backdrop','Premium custom backdrop'], mandap: ['Not included','Basic mandap','Traditional mandap','Floral mandap','Premium custom mandap'], entrance: ['Not included','Basic entrance','Floral entrance','Theme entrance','Premium custom entrance'], flowers: ['Artificial','Fresh seasonal','Premium fresh','Mixed floral','Custom floral design'], lighting: ['Basic','Ambient','Decorative','Premium','Custom'], dimensions: ['Standard','Small venue','Medium venue','Large venue','Site measurement required'] },
  E05: { slot: ['Morning','Afternoon','Evening','Night','Full day'], rental: ['Venue rental','Half-day rental','Full-day rental','Custom quote'] },
  E06: { lighting: ['None','Basic','Ambient','Stage','Premium'], led: ['Not included','LED screen','LED wall','Premium LED wall'] },
  E07: { technical: ['Basic rider','Standard rider','Professional rider','Venue-specific rider','Custom technical rider'] },
  E08: { function: ['Wedding','Engagement','Reception','Pre-wedding','Other event'], makeup: ['Traditional','HD','Airbrush','Natural / soft glam','Premium editorial'], hair: ['Basic styling','Blow-dry + styling','Curls / waves','Updo','Premium styling'], draping: ['Not included','Standard saree drape','Pleated drape','Designer drape','Custom draping'] },
  E09: { scope: ['Day-of coordination','Wedding week','Partial planning','Full planning','Destination planning'] },
  E10: { tent: ['Open lawn canopy','Waterproof canopy','Pagoda tent','Air-cooled tent','Premium themed tent'] },
  E11: { product: ['Digital invitation','Printed invitation','Save-the-date','Thank-you card','Invitation box'], paper: ['80 GSM','100 GSM','120 GSM','170 GSM','250 GSM','Luxury board'], finish: ['Matte','Gloss','Textured','Foil','Embossed','Premium custom'], delivery: ['Pickup','Local delivery','Doorstep delivery','Express delivery','Delivery + assembly'] },
  E12: { vehicle: ['Sedan','SUV','Tempo Traveller','Minibus','Luxury vehicle'], ac: ['AC','Non-AC','AC on request'], waiting: ['30 min included','60 min included','90 min included','2 hours included','Charged after included time'] },
  E13: { fixtures: ['4–8','9–16','17–32','33–64','65+'], coverage: ['Stage','Head table / stage','Small venue','Medium venue','Large venue','Full venue'], operator: ['Not included','1 operator','2 operators','Dedicated operator team'], power: ['Standard venue power','Single phase','Three phase','Dedicated power required','Generator required'] },
  E14: { flavour: ['Vanilla','Chocolate','Red velvet','Butterscotch','Fresh fruit','Regional / custom'], customization: ['Standard design','Name / message','Theme matched','Photo / print','Fully custom'] },
  E15: { coverage: ['Bridal only','Bridal + family','Family / guests','Venue-wide','Custom'], duration: ['1','2','3','4','6','8'] },
  E16: { language: ['English','Kannada','Hindi','Tamil','Telugu','Malayalam','Bilingual','Multilingual'], event_type: ['Wedding','Birthday','Corporate','Product launch','Reception','Private celebration'], rehearsal: ['Not included','1 rehearsal','2 rehearsals','Venue rehearsal','Custom rehearsal plan'] },
  E17: { led: ['Not included','LED screen','LED wall','Premium LED wall'], operator: ['Not included','1 operator','2 operators','Dedicated operator team'] },
  E18: { parking_distance: ['On-site','Up to 100 m','100–250 m','250–500 m','Off-site shuttle needed'] },
  E19: { security: ['Standard','CCTV monitored','Guarded','Restricted access','High-security / dedicated bay'] },
  E20: { menu: ['Welcome drinks','Mocktails','Fresh juices','Non-alcoholic bar','Custom beverage menu'], compliance: ['Compliant / ready','Documents available','Approval required','Customer venue compliance','Custom review'] },
  E21: { language: ['English','Kannada','Hindi','Tamil','Telugu','Malayalam','Bilingual','Multilingual'], supervisor: ['Not included','1 supervisor','2 supervisors','Dedicated supervisor'] },
  E22: { operator: ['Not included','1 operator','2 operators','Dedicated operator team'], power: ['Single phase','Three phase','Dedicated power required','Generator required'] },
  E23: { waste: ['No waste service','Basic bins','Collection + disposal','Segregated waste handling','Custom waste plan'], first_aid: ['Not included','Basic first-aid kit','Medic on call','Dedicated first-aid desk','Custom medical support'] },
  E24: { ritual: ['Puja','Wedding rituals','Engagement rituals','Housewarming','Naming ceremony','Custom ritual'], tradition: ['South Indian','North Indian','Kannada','Tamil','Telugu','Malayali','Pan-Indian','Custom tradition'], language: ['English','Kannada','Hindi','Tamil','Telugu','Malayalam','Bilingual','Multilingual'], samagri: ['Partner supplied','Customer supplied','Basic samagri included','Complete samagri included','Custom samagri list'] },
  E25: { product: ['Budget favour','Classic gift','Premium gift','Corporate gift','Personalized favour'], packaging: ['Standard pack','Premium pack','Luxury pack','Corporate pack','Custom packaging'], personalization: ['None','Name / initials','Message card','Logo / branding','Theme personalization','Fully custom'] },
  E26: { packing_type: ['Gift wrap','Box packing','Hamper packing','Trousseau packing','Premium presentation'], box: ['Cardboard','Rigid box','Magnetic box','Wooden box','Luxury custom box'], material: ['Paper','Cardboard','Fabric','Wood','Metal','Mixed premium material'], personalization: ['None','Name / initials','Message card','Logo / branding','Theme personalization','Fully custom'] },
  L01: { vehicle: ['Mini pickup','Single-cab pickup','Closed mini truck','Open mini truck'], route: ['Local Bengaluru','Within city limits','Bengaluru + outskirts','Intercity','Route survey required'] },
  L02: { vehicle_class: ['LCV','Medium truck','Large truck','Dedicated event freight'], tonnage: ['1 T','2 T','5 T','7.5 T','10 T','16 T','20 T','25 T'], route: ['Local Bengaluru','Within city limits','Bengaluru + outskirts','Intercity','Route survey required'], fuel_policy: ['Fuel included','Fuel extra','Fuel by route','Customer-provided fuel'] },
  L03: { vehicle: ['Sedan','SUV','Tempo Traveller','Minibus','Luxury vehicle'], ac: ['AC','Non-AC','AC on request'], waiting: ['30 min included','60 min included','90 min included','2 hours included','Charged after included time'] },
  L04: { equipment: ['Furniture','Stage equipment','AV equipment','Lighting equipment','Decor equipment','Mixed event equipment'], rental_period: ['4 hours','8 hours','1 day','2 days','3 days','1 week'], deposit: ['No deposit','10%','20%','30%','50%','Custom deposit'] },
  L05: { overtime: ['Not available','Hourly overtime','30-minute blocks','After-shift premium','Custom'], handling: ['Standard handling','Fragile handling','Heavy handling','Loading + unloading','On-site placement','Custom handling'] },
  L06: { storage_type: ['Indoor warehouse','Covered storage','Pallet storage','Racked storage','Climate-controlled','Open yard'], duration: ['Short-term (1–30 days)','Medium-term (1–6 months)','Long-term (6–12 months)','Custom period'], handling: ['Self-service','Loading & unloading','Placement support','Full handling'], security: ['Standard','CCTV monitored','Guarded','Restricted access','High-security / dedicated bay'] },
  L07: { product: ['Event furniture','Decor materials','Printing materials','Packaging materials','AV / technical materials','Custom material'], unit: ['piece','item','set','box','batch'], delivery: ['Pickup','Local delivery','Doorstep delivery','Express delivery','Delivery + setup'] },
  L08: { fleet: ['Partner vehicle','2–3 vehicles','4–6 vehicles','7–10 vehicles','Dedicated event fleet'], crew: ['1–2 staff','3–4 staff','5–8 staff','9–12 staff','Dedicated event crew'] },
}

export const FIELD_OVERRIDES = {
  min_guests: { control: 'stepper', presets: [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000] },
  guests: { control: 'stepper', presets: [10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000] },
  people: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10, 12, 20] },
  performers: { control: 'stepper', presets: [1, 2, 3, 4, 5, 8, 10, 12] },
  sets: { control: 'stepper', presets: [1, 2, 3, 4, 5] },
  functions: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10] },
  venues: { control: 'stepper', presets: [1, 2, 3, 4, 5] },
  stops: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8, 10, 15, 20] },
  staff: { control: 'stepper', presets: [1, 2, 3, 4, 5, 8, 10, 12, 20] },
  guards: { control: 'stepper', presets: [1, 2, 3, 4, 6, 8, 10, 12, 20] },
  supervisors: { control: 'stepper', presets: [0, 1, 2, 3, 4] },
  attendants: { control: 'stepper', presets: [1, 2, 3, 4, 6, 8, 10, 12, 20] },
  entry_points: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6, 8] },
  vehicles: { control: 'stepper', presets: [1, 2, 3, 4, 5, 8, 10, 15, 20] },
  chairs: { control: 'stepper', presets: [25, 50, 75, 100, 150, 200, 300, 500] },
  tables: { control: 'stepper', presets: [5, 10, 15, 20, 30, 40, 50, 75] },
  area: { control: 'stepper', presets: [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000] },
  rental_days: { control: 'stepper', presets: [1, 2, 3, 4, 5, 7] },
  included_km: { control: 'stepper', presets: [5, 10, 20, 30, 50, 75, 100, 150, 250, 500] },
  included_hours: { control: 'stepper', presets: [1, 2, 4, 6, 8, 10, 12, 24] },
  extra_km: { control: 'currency', presets: [5, 8, 10, 12, 15, 20, 25, 30] },
  duration: { control: 'duration', presets: [1, 2, 3, 4, 6, 8, 10, 12] },
  coverage_hours: { control: 'duration', presets: [2, 4, 6, 8, 10, 12] },
  shift_hours: { control: 'duration', presets: [4, 6, 8, 10, 12, 24] },
  hours: { control: 'duration', presets: [2, 4, 6, 8, 10, 12] },
  shift: { control: 'duration', presets: [4, 6, 8, 10, 12] },
  runtime: { control: 'duration', presets: [2, 4, 6, 8, 10, 12, 24] },
  cable: { control: 'stepper', presets: [10, 25, 50, 75, 100, 150, 200] },
  fixtures: { control: 'choice', options: COMMON_SELECTS.fixtures },
  weight: { control: 'choice', options: ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '3 kg', '5 kg', '10 kg+'] },
  servings: { control: 'stepper', presets: [2, 4, 6, 8, 10, 12] },
  tiers: { control: 'stepper', presets: [1, 2, 3, 4, 5, 6] },
  quantity: { control: 'stepper', presets: [10, 25, 50, 100, 150, 200, 300, 500, 1000] },
  moq: { control: 'stepper', presets: [1, 5, 10, 25, 50, 100, 250, 500, 1000] },
  stock: { control: 'stepper', presets: [0, 10, 25, 50, 100, 250, 500, 1000] },
  mics: { control: 'stepper', presets: [1, 2, 4, 6, 8, 12, 16] },
  speakers: { control: 'stepper', presets: [2, 4, 6, 8, 10, 12, 16] },
  subwoofers: { control: 'stepper', presets: [0, 1, 2, 4, 6, 8] },
  audience: { control: 'stepper', presets: [25, 50, 100, 150, 200, 300, 500, 750, 1000] },
  payload: { control: 'stepper', presets: [250, 500, 750, 1000, 1500, 2500, 5000, 7500, 10000] },
  tonnage: { control: 'choice', options: ['1 T', '2 T', '5 T', '7.5 T', '10 T', '16 T', '20 T', '25 T'] },
  cable: { control: 'choice', options: ['10 m', '25 m', '50 m', '75 m', '100 m', '150 m', '200 m'] },
  capacity: { control: 'stepper', presets: [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000] },
  toilets: { control: 'stepper', presets: [1, 2, 3, 4, 6, 8, 10, 12, 20] },
  priests: { control: 'stepper', presets: [1, 2, 3, 4, 5, 7, 10] },
  items: { control: 'stepper', presets: [5, 10, 20, 30, 50, 75, 100] },
  packing_type: { control: 'choice', options: COMMON_SELECTS.packing_type },
  box: { control: 'choice', options: COMMON_SELECTS.box },
  storage_type: { control: 'choice', options: COMMON_SELECTS.storage_type },
  security: { control: 'choice', options: COMMON_SELECTS.security },
}

export const TRADE_ADDONS = {
  E01: ['Live counter station', 'Welcome drink station', 'Dessert counter', 'Service staff upgrade', 'Premium crockery / cutlery'],
  E02: ['Drone coverage', 'Same-day teaser', 'Extra photographer', 'Album upgrade', 'Photo booth'],
  E03: ['Drone coverage', 'Same-day highlight', 'Extra videographer', 'Vertical reel pack', 'Cinematic teaser'],
  E04: ['Fresh floral upgrade', 'LED backdrop', 'Entrance décor', 'Ceiling décor', 'Theme customization'],
  E05: ['Extra hour', 'Additional seating block', 'Cleaning support', 'Power backup', 'Venue décor coordination'],
  E06: ['Extra hour', 'LED wall', 'Uplighting package', 'Additional subwoofer', 'DJ console upgrade'],
  E07: ['Extra performance set', 'Backline / instruments', 'Costume support', 'Rehearsal session', 'Travel extension'],
  E08: ['Family makeup slot', 'HD upgrade', 'Airbrush upgrade', 'Draping service', 'Hair extension styling'],
  E09: ['Extra planning meeting', 'Guest RSVP management', 'Vendor coordination', 'On-site coordinator', 'Destination travel coordination'],
  E10: ['Premium chairs', 'Table linen upgrade', 'Stage upgrade', 'Cooling package', 'Installation support'],
  E11: ['Rush printing', 'Premium paper', 'Foil finish', 'Envelope upgrade', 'Delivery + assembly'],
  E12: ['Extra km', 'Extra hour', 'Airport / railway transfer', 'Meet-and-greet', 'Additional vehicle'],
  E13: ['Extra lighting zone', 'Operator upgrade', 'Power distribution', 'Rigging support', 'Site installation'],
  E14: ['Fondant design', 'Extra tier', 'Dessert table', 'Custom topper', 'Express delivery'],
  E15: ['Extra artist', 'Extended hours', 'Family henna slots', 'Premium bridal design', 'Travel extension'],
  E16: ['Bilingual hosting', 'Extended hosting time', 'Rehearsal', 'Games / crowd engagement', 'Additional event segment'],
  E17: ['LED wall', 'Extra microphone', 'Stage monitor', 'Operator upgrade', 'Recording / streaming'],
  E18: ['Additional attendant', 'Extended hours', 'Shuttle support', 'Premium vehicle handling', 'Late-night extension'],
  E19: ['Additional guard', 'Female security staff', 'Supervisor upgrade', 'Crowd barricade support', 'Extended shift'],
  E20: ['Welcome drink station', 'Mocktail bar', 'Live juice counter', 'Extra bartender', 'Glassware upgrade'],
  E21: ['Additional host staff', 'Registration desk', 'Usher team', 'Concierge upgrade', 'Extended hours'],
  E22: ['Additional kVA', 'Extended runtime', 'Cable extension', 'Cooling unit', 'Dedicated operator'],
  E23: ['Additional portable toilet', 'Waste collection', 'First-aid desk', 'Sanitation upgrade', 'Extended service'],
  E24: ['Complete samagri', 'Additional priest', 'Extended ritual support', 'Traditional instruments', 'Travel support'],
  E25: ['Premium packaging', 'Personalization', 'Branded insert', 'Gift assembly', 'Express delivery'],
  E26: ['Luxury box upgrade', 'Ribbon personalization', 'Branded tag', 'Assembly support', 'Pickup / delivery'],
  L01: ['Extra km', 'Extra hour', 'Loading support', 'Waiting time', 'Additional trip'],
  L02: ['Extra km', 'Loading support', 'Unloading support', 'Waiting time', 'Dedicated vehicle upgrade'],
  L03: ['Extra km', 'Extra hour', 'Waiting time', 'Additional vehicle', 'Driver overtime'],
  L04: ['Extra rental day', 'Installation support', 'Pickup / return handling', 'Premium equipment upgrade', 'Damage waiver'],
  L05: ['Extra crew member', 'Overtime block', 'Heavy handling', 'Night shift', 'Equipment handling'],
  L06: ['Extra storage volume', 'Extended storage day', 'Loading / unloading', 'Premium security', 'Dedicated bay'],
  L07: ['Branded packaging', 'Bulk delivery', 'Rush fulfillment', 'Assembly / packing', 'Custom material sourcing'],
  L08: ['Additional stop', 'Extra vehicle', 'Extra crew', 'Route survey', 'Event-day coordinator'],
}

const COMMON_DESCRIPTIONS = [
  ({ name, fieldNames }) => `Professional ${name} package with ${fieldNames[0] ?? 'defined scope'}, ${fieldNames[1] ?? 'clear inclusions'} and coordinated event-day service.`,
  ({ name, template }) => `${name} package based on the ${template ?? 'Sambramo starter'} structure, with transparent pricing and configurable extras.`,
  ({ name, fieldNames }) => `Flexible ${name} setup with ${fieldNames[0] ?? 'structured requirements'}, ${fieldNames[1] ?? 'clear service coverage'} and optional upgrades.`,
  ({ name }) => `Customer-ready ${name} package with defined capacity, service coverage and a clear commercial basis.`,
  ({ name }) => `End-to-end ${name} support with a simple package structure, optional add-ons and review-ready pricing.`,
]

export function getDescriptionSuggestions(config) {
  const fieldNames = (config?.fields ?? []).slice(0, 3).map(f => f.label.toLowerCase())
  const templates = config?.templates ?? []
  return COMMON_DESCRIPTIONS.map((builder, index) => builder({
    name: config?.name ?? 'service',
    fieldNames,
    template: templates[index]?.[1],
  }))
}

export function getPackageNameSuggestions(config) {
  return (config?.templates ?? []).slice(0, 5).map(t => t[1])
}

export function getAddonSuggestions(config) {
  return (TRADE_ADDONS[config?.trade_id] ?? [
    'Priority service upgrade',
    'Extended service time',
    'Additional resource',
    'Premium setup',
    'Custom requirement',
  ]).map((name, index) => ({
    id: `${config?.trade_id ?? 'trade'}-addon-${index}`,
    name,
    hint: 'Suggested for this trade',
    unit: defaultAddonUnit(config),
  }))
}

function defaultAddonUnit(config) {
  if (config?.mode === 'RATE_CARD') return 'per trip'
  if (config?.mode === 'CATALOG') return 'per item'
  if (config?.trade_id === 'E01') return 'per guest'
  return 'per event'
}


const TRADE_FIELD_OVERRIDES = {
  E02: { coverage_hours: ['duration',[2,4,6,8,10,12]], photographers: ['choice',['1 photographer','2 photographers','3 photographers','4 photographers','5+ photographers']], album: ['choice',['No album','Standard album','Premium album','Luxury album','Digital album']], reels: ['stepper',[0,1,2,3,5,8,10]], drone: ['choice',['Not included','Included','Available as add-on','Subject to venue permission']] },
  E03: { coverage_hours: ['duration',[2,4,6,8,10,12]], videographers: ['choice',['1 videographer','2 videographers','3 videographers','4 videographers','5+ videographers']], highlight: ['choice',['Not included','2–3 minute edit','5–8 minute edit','Highlight film','Custom edit']], reels: ['stepper',[0,1,2,3,5,8,10]], drone: ['choice',['Not included','Included','Available as add-on','Subject to venue permission']] },
  E04: { stage: ['choice',['Not included','Basic stage','Standard stage','Premium stage','Custom stage']], backdrop: ['choice',['Not included','Fabric backdrop','Floral backdrop','LED backdrop','Premium custom backdrop']], mandap: ['choice',['Not included','Basic mandap','Traditional mandap','Floral mandap','Premium custom mandap']], entrance: ['choice',['Not included','Basic entrance','Floral entrance','Theme entrance','Premium custom entrance']], flowers: ['choice',['Artificial','Fresh seasonal','Premium fresh','Mixed floral','Custom floral design']], lighting: ['choice',['Basic','Ambient','Decorative','Premium','Custom']], dimensions: ['choice',['Standard','Small venue','Medium venue','Large venue','Site measurement required']] },
  E05: { capacity: ['stepper',[50,100,150,200,300,500,750,1000]], slot: ['choice',['Morning','Afternoon','Evening','Night','Full day','Custom time slot']], rental: ['choice',['Venue rental','Per plate','Half-day rental','Full-day rental','Custom quote']], per_plate: ['currency',[500,750,1000,1500,2000,2500,5000]] },
  E06: { duration: ['duration',[2,4,6,8,10,12]], speakers: ['stepper',[2,4,6,8,10,12,16]], subwoofers: ['stepper',[0,1,2,4,6,8]], lighting: ['choice',['Not included','Basic','Ambient','Stage lighting','Premium']], led: ['choice',['Not included','LED backdrop','LED wall','Premium LED wall','Available as add-on']] },
  E07: { performers: ['stepper',[1,2,3,4,5,8,10,12]], duration: ['duration',[30,60,90,120,180,240]], sets: ['stepper',[1,2,3,4,5]], technical: ['choice',['Basic rider','Standard rider','Professional rider','Venue-specific rider','Custom technical rider']] },
  E08: { function: ['choice',['Wedding','Engagement','Reception','Pre-wedding','Corporate','Other event']], makeup: ['choice',['Traditional','HD','Airbrush','Natural / soft glam','Premium editorial']], hair: ['choice',['Basic styling','Blow-dry + styling','Curls / waves','Updo','Premium styling']], draping: ['choice',['Not included','Standard saree drape','Pleated drape','Designer drape','Custom draping']], people: ['stepper',[1,2,3,4,5,6,8,10,12]] },
  E09: { functions: ['stepper',[1,2,3,4,5,6,8,10]], guests: ['stepper',[25,50,100,150,200,300,500,750,1000]], venues: ['stepper',[1,2,3,4,5]], scope: ['choice',['Day-of coordination','Wedding week','Partial planning','Full planning','Destination planning']] },
  E10: { tent: ['choice',['Open lawn canopy','Waterproof canopy','Pagoda tent','Air-cooled tent','Premium themed tent']], chairs: ['stepper',[25,50,75,100,150,200,300,500]], tables: ['stepper',[5,10,15,20,30,40,50,75]], area: ['choice',['100–250 sq ft','250–500 sq ft','500–1,000 sq ft','1,000–2,000 sq ft','2,000+ sq ft','Site measurement required']], rental_days: ['stepper',[1,2,3,4,5,7]] },
  E11: { product: ['choice',['Digital invitation','Printed invitation','Wedding stationery','Corporate invitation','Custom print']], quantity: ['stepper',[25,50,100,150,200,300,500,750,1000]], paper: ['choice',['80 GSM','100 GSM','120 GSM','170 GSM','250 GSM','Luxury board']], finish: ['choice',['Matte','Gloss','Textured','Foil','Embossed','Premium custom']], delivery: ['choice',['Pickup','Local delivery','Doorstep delivery','Express delivery','Delivery + assembly']] },
  E12: { vehicle: ['choice',['Sedan','SUV','Tempo Traveller','Luxury vehicle','Premium guest shuttle']], seats: ['choice',['4 seats','6 seats','7 seats','12 seats','16 seats','25 seats','35+ seats']], included_km: ['stepper',[5,10,20,30,50,75,100,150,250]], included_hours: ['stepper',[1,2,4,6,8,10,12]], extra_km: ['currency',[5,8,10,12,15,20,25,30]] },
  E13: { fixtures: ['stepper',[4,8,16,32,64,100]], coverage: ['choice',['Head table / stage','Small venue','Medium venue','Large venue','Outdoor area','Full venue']], operator: ['choice',['Not included','1 operator','2 operators','Dedicated operator team','Available as add-on']], power: ['choice',['Standard venue power','Single phase','Three phase','Dedicated power required','Generator required']] },
  E14: { weight: ['choice',['0.5 kg','1 kg','1.5 kg','2 kg','3 kg','5 kg','10 kg+']], servings: ['stepper',[2,4,6,8,10,12,20,30]], flavour: ['choice',['Vanilla','Chocolate','Red velvet','Butterscotch','Fresh fruit','Regional / custom']], tiers: ['stepper',[1,2,3,4,5,6]], customization: ['choice',['Standard design','Name / message','Theme matched','Photo / print','Fully custom']] },
  E15: { coverage: ['choice',['Bridal only','Bridal + family','Small group','Venue-wide','Custom']], artists: ['stepper',[1,2,3,4,5,8,10]], guests: ['stepper',[5,10,20,30,50,75,100]], duration: ['duration',[1,2,3,4,6,8]] },
  E16: { language: ['choice',['English','Kannada','Hindi','Tamil','Telugu','Malayalam','Bilingual','Multilingual','Custom']], event_type: ['choice',['Wedding','Birthday','Corporate','Product launch','Reception','Private celebration','Custom event']], duration: ['duration',[1,2,3,4,6,8]], rehearsal: ['choice',['Not included','1 rehearsal','2 rehearsals','Venue rehearsal','Custom rehearsal plan']] },
  E17: { audience: ['stepper',[25,50,100,150,200,300,500,750,1000]], speakers: ['stepper',[2,4,6,8,10,12,16]], mics: ['stepper',[1,2,4,6,8,12,16]], led: ['choice',['Not included','LED backdrop','LED wall','Premium LED wall','Available as add-on']], operator: ['choice',['Not included','1 operator','2 operators','Dedicated operator team','Available as add-on']] },
  E18: { vehicles: ['stepper',[1,2,3,4,5,8,10,15,20]], attendants: ['stepper',[1,2,3,4,6,8,10,12,20]], duration: ['duration',[2,4,6,8,10,12]], parking_distance: ['choice',['On-site','Up to 100 m','100–250 m','250–500 m','Off-site shuttle needed']] },
  E19: { guards: ['stepper',[1,2,3,4,6,8,10,12,20]], supervisors: ['stepper',[0,1,2,3,4]], shift_hours: ['duration',[4,6,8,10,12,24]], entry_points: ['stepper',[1,2,3,4,5,6,8]] },
  E20: { menu: ['choice',['Welcome drinks','Mocktails','Fresh juices','Live beverage counter','Non-alcoholic bar','Custom beverage menu']], guests: ['stepper',[25,50,75,100,150,200,300,500,750,1000]], servings: ['stepper',[1,2,3,4,5,6]], bartenders: ['stepper',[1,2,3,4,5,6,8]], compliance: ['choice',['Compliant / ready','Documents available','Approval required','Customer venue compliance','Custom review']] },
  E21: { staff: ['stepper',[1,2,3,4,5,8,10,12,20]], hours: ['duration',[2,4,6,8,10,12]], language: ['choice',['English','Kannada','Hindi','Tamil','Telugu','Malayalam','Bilingual','Multilingual','Custom']], supervisor: ['choice',['Not included','1 supervisor','2 supervisors','Dedicated supervisor']] },
  E22: { capacity: ['choice',['5 kVA','10 kVA','15 kVA','25 kVA','40 kVA','50+ kVA']], runtime: ['duration',[2,4,6,8,10,12,24]], operator: ['choice',['Not included','1 operator','2 operators','Dedicated operator team']], cable: ['choice',['10 m','25 m','50 m','75 m','100 m','150 m','200 m']] },
  E23: { toilets: ['stepper',[1,2,3,4,6,8,10,12,20]], waste: ['choice',['No waste service','Basic bins','Collection + disposal','Segregated waste handling','Custom waste plan']], first_aid: ['choice',['Not included','Basic first-aid kit','Medic on call','Dedicated first-aid desk','Custom medical support']], duration: ['duration',[2,4,6,8,10,12,24]] },
  E24: { ritual: ['choice',['Puja','Wedding rituals','Engagement rituals','Housewarming','Naming ceremony','Custom ritual']], tradition: ['choice',['South Indian','North Indian','Kannada','Tamil','Telugu','Malayali','Pan-Indian','Custom tradition']], language: ['choice',['Kannada','Sanskrit','English','Hindi','Tamil','Telugu','Custom']], priests: ['stepper',[1,2,3,4,5,7,10]], samagri: ['choice',['Partner supplied','Customer supplied','Basic samagri included','Complete samagri included','Custom samagri list']] },
  E25: { product: ['choice',['Standard product','Premium product','Luxury product','Branded product','Custom product']], quantity: ['stepper',[10,25,50,100,150,200,300,500,1000]], packaging: ['choice',['Standard pack','Premium pack','Luxury pack','Corporate pack','Custom packaging']], personalization: ['choice',['None','Name / initials','Message card','Logo / branding','Theme personalization','Fully custom']], lead_time: ['stepper',[0,1,2,3,5,7,10,14,21,30]] },
  E26: { packing_type: ['choice',['Gift wrap','Box packing','Hamper packing','Trousseau packing','Premium presentation']], box: ['choice',['Cardboard','Rigid box','Magnetic box','Wooden box','Luxury custom box']], items: ['stepper',[5,10,20,30,50,75,100]], material: ['choice',['Paper','Cardboard','Fabric','Wood','Metal','Mixed premium material']], personalization: ['choice',['None','Name / initials','Message card','Logo / branding','Theme personalization','Fully custom']] },
  L01: { vehicle: ['choice',['Mini pickup','Pickup truck','LCV']], payload: ['choice',['250 kg','500 kg','750 kg','1 T','1.5 T','2 T']], included_km: ['stepper',[5,10,20,30,50,75,100,150,250]], included_hours: ['duration',[2,4,6,8,10,12]], extra_km: ['currency',[5,8,10,12,15,20,25,30]] },
  L02: { vehicle_class: ['choice',['Mini LCV','LCV','Medium truck','Large truck','Dedicated event freight']], tonnage: ['choice',['1 T','2 T','5 T','7.5 T','10 T','16 T','20 T','25 T']], payload: ['choice',['500 kg','1 T','2 T','5 T','7.5 T','10 T+']], route: ['choice',['Local Bengaluru','Within city limits','Bengaluru + outskirts','Intercity','Route survey required']], fuel_policy: ['choice',['Fuel included','Fuel extra','Fuel by route','Customer-provided fuel']] },
  L03: { vehicle: ['choice',['Sedan','SUV','Tempo Traveller','Minibus','Luxury vehicle','Partner fleet / custom']], seats: ['choice',['9','12','16','25','35','49']], ac: ['choice',['AC','Non-AC','AC on request','Climate-controlled']], included_km: ['stepper',[5,10,20,30,50,75,100,150,250]], waiting: ['choice',['30 min included','60 min included','90 min included','2 hours included','Charged after included time']] },
  L04: { equipment: ['choice',['Furniture','Stage equipment','AV equipment','Lighting equipment','Decor equipment','Custom equipment']], quantity: ['stepper',[1,5,10,25,50,100,250]], rental_period: ['choice',['4 hours','8 hours','1 day','2 days','3 days','1 week','Custom period']], deposit: ['currency',[0,500,1000,2500,5000,10000]] },
  L05: { crew_size: ['choice',['1–2 staff','3–4 staff','5–8 staff','9–12 staff','Dedicated event crew']], shift: ['duration',[4,6,8,10,12]], overtime: ['choice',['Not available','Hourly overtime','30-minute blocks','After-shift premium','Custom']], handling: ['choice',['Standard handling','Fragile handling','Heavy handling','Loading + unloading','On-site placement','Custom handling']] },
  L06: { storage_type: ['choice',['Pallet Storage','Indoor storage','Covered storage','Pallet + racked storage','Climate-controlled','Open yard']], capacity: ['choice',['Up to 100 sq ft','100–250 sq ft','250–500 sq ft','500–1,000 sq ft','1,000–2,000 sq ft','2,000+ sq ft']], duration: ['choice',['1–7 days','8–30 days','1–3 months','3–6 months','6–12 months','Custom duration']], handling: ['choice',['Storage only','Loading support','Unloading support','Loading & unloading','On-site placement','Custom handling']], security: ['choice',['Standard','CCTV monitored','Guarded','Restricted access','High-security / dedicated bay']] },
  L07: { product: ['choice',['Event consumables','Decor materials','Printing materials','Branded materials','Custom sourced materials']], unit: ['choice',['Per piece','Per item','Per set','Per box','Per bundle']], price: ['currency',[50,100,250,500,1000,2500,5000]], moq: ['stepper',[1,5,10,25,50,100,250,500]], stock: ['stepper',[0,10,25,50,100,250,500,1000]] },
  L08: { functions: ['stepper',[1,2,3,4,5,6,8,10]], venues: ['stepper',[1,2,3,4,5]], stops: ['stepper',[1,2,3,4,5,6,8,10,15,20]], fleet: ['choice',['Partner vehicle','2–3 vehicles','4–6 vehicles','7–10 vehicles','Dedicated event fleet']], crew: ['choice',['1–2 staff','3–4 staff','5–8 staff','9–12 staff','Dedicated event crew']] },
}

export function getFieldSchema(field, config) {
  const key = field?.key
  const tradeOptions = TRADE_FIELD_OPTIONS[config?.trade_id]?.[key]
  if (tradeOptions) return { ...field, control: 'choice', options: tradeOptions }
  const override = FIELD_OVERRIDES[key]
  if (override) return { ...field, ...override }
  if (COMMON_SELECTS[key]) return { ...field, control: 'choice', options: COMMON_SELECTS[key] }
  if (field?.type === 'currency') return { ...field, control: 'currency', presets: [50,100,250,500,1000,2500,5000,10000] }
  if (field?.type === 'number') return { ...field, control: 'stepper', presets: [1,2,3,4,5,6,8,10,12,20,25,50,100] }
  return { ...field, control: 'choice', options: ['Standard','Premium','Included','Available as add-on','Site-specific','Custom'] }
}

export function getNumericPresets({ key, config, kind = 'quantity' }) {
  const schema = getFieldSchema({ key, type: 'number', label: key }, config)
  if (kind === 'currency') return schema.presets ?? [100, 250, 500, 1000, 2500, 5000, 10000]
  if (kind === 'duration') return schema.presets ?? [1, 2, 4, 6, 8, 12]
  return schema.presets ?? [1, 2, 4, 5, 10, 25, 50, 100]
}

export function getMinimumOrderPresets(config, unit) {
  if (config?.trade_id === 'E01') return [25, 50, 75, 100, 150, 200, 300, 500]
  if (String(unit).includes('guest') || String(unit).includes('person')) return [10, 25, 50, 75, 100, 150, 200, 300]
  if (String(unit).includes('hour')) return [1, 2, 4, 6, 8]
  if (String(unit).includes('day')) return [1, 2, 3, 5, 7]
  if (String(unit).includes('trip')) return [1, 2, 3, 4, 5]
  if (String(unit).includes('item') || String(unit).includes('piece')) return [1, 5, 10, 25, 50, 100, 250]
  return [1, 2, 5, 10, 25]
}

export function getIncludedQuantityPresets(config, unit) {
  if (config?.trade_id === 'E01') return [25, 50, 75, 100, 150, 200, 300, 500]
  if (String(unit).includes('guest') || String(unit).includes('person')) return [10, 25, 50, 75, 100, 150, 200, 300]
  if (String(unit).includes('item') || String(unit).includes('piece')) return [1, 5, 10, 25, 50, 100]
  if (config?.mode === 'RATE_CARD') return [0, 1, 5, 10, 20, 30, 50, 100]
  return [0, 1, 2, 4, 5, 10, 20, 50]
}

export const LEAD_TIME_PRESETS = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30]

export const TRAVEL_POLICIES = [
  ['included', 'Included in package'],
  ['zone_based', 'Zone-based'],
  ['per_km', 'Per km'],
  ['customer_pickup', 'Customer pickup'],
  ['quote', 'Quote on request'],
]

export const PACKAGE_TIERS = [
  ['essential', 'Essential'],
  ['standard', 'Standard'],
  ['classic', 'Classic'],
  ['premium', 'Premium'],
  ['luxury', 'Luxury'],
  ['custom', 'Custom'],
]

export const PRICE_PRESETS = [250, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000]

export const INCLUSIONS_BY_MODE = {
  PACKAGE: ['Setup / service crew', 'Standard equipment', 'Basic coordination', 'Customer support'],
  RATE_CARD: ['Driver / operator', 'Standard loading support', 'Standard service window', 'Digital order updates'],
  CATALOG: ['Standard packing', 'Local delivery option', 'Basic quality check', 'Order confirmation'],
  HYBRID: ['Core service scope', 'Standard setup', 'Event-day coordination', 'Customer support'],
  CUSTOM: ['Scope discussion', 'Dedicated coordination', 'Custom requirements handling', 'Final quote before confirmation'],
}

export const EXCLUSIONS_BY_MODE = {
  PACKAGE: ['Extra time beyond included duration', 'Out-of-area travel', 'Special equipment', 'Customer-requested upgrades'],
  RATE_CARD: ['Waiting beyond included time', 'Toll / parking where applicable', 'Extra route distance', 'Special handling'],
  CATALOG: ['Rush fulfilment', 'Custom branding', 'Special delivery windows', 'Non-standard quantities'],
  HYBRID: ['Out-of-scope upgrades', 'Extra duration', 'Additional travel', 'Special site requirements'],
  CUSTOM: ['Third-party charges', 'Unapproved scope additions', 'Last-minute changes', 'Non-standard logistics'],
}
