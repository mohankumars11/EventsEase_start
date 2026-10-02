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



/*
 * Full trade-specific pricing matrix.
 * Every value is a partner-facing controlled choice unless the control is
 * explicitly currency/stepper. Those controls expose a "Custom value" fallback.
 * This is pricing-tab configuration only; the authoritative rate remains in the
 * vendor_service_id-scoped pricing RPC.
 */
const choice = (key, label, options, extra = {}) => ({
  key, label, control: 'choice', options, ...extra,
})
const stepper = (key, label, presets, extra = {}) => ({
  key, label, control: 'stepper', presets, ...extra,
})
const currency = (key, label, presets = [100, 250, 500, 1000, 2500, 5000], extra = {}) => ({
  key, label, control: 'currency', presets, ...extra,
})

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Birthday', 'Baby shower', 'Housewarming', 'Corporate event', 'Product launch', 'Festival / cultural event', 'Concert / large gathering', 'Private celebration', 'Other event']
const LANGUAGES = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Bilingual', 'Multilingual', 'Other']
const QUALITY_LEVELS = ['Basic', 'Standard', 'Premium', 'Luxury', 'Custom']
const DELIVERY_WINDOWS = ['Same day', '24 hours', '48 hours', '2–3 days', '5–7 days', '7–14 days', '14–30 days', 'Custom']
const SETUP_WINDOWS = ['Included', '1 hour', '2 hours', '4 hours', 'Overnight setup', 'Custom']
const COMMON_LOCATION = ['Within service area', 'Bengaluru city', 'Bengaluru + outskirts', 'Intercity', 'Customer pickup', 'Custom']
const TRADE_PRICING_FIELDS = {
  E01: [
    choice('event_type', 'Event type', EVENT_TYPES), choice('meal_type', 'Meal / service', ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'High tea', 'Full-day catering', 'Reception service', 'Custom']),
    choice('cuisine', 'Cuisine', ['South Indian', 'North Indian', 'Multi-cuisine', 'Continental', 'Asian', 'Regional / Traditional', 'International', 'Custom']),
    stepper('guests', 'Guest quantity', [25,50,75,100,150,200,300,500,750,1000,1500,2000]),
    choice('service_style', 'Service style', ['Buffet', 'Plated service', 'Family style', 'Live counters', 'Cocktail / reception', 'Banquet service', 'Custom']),
    choice('dietary_mix', 'Dietary mix', ['Vegetarian', 'Non-vegetarian', 'Mixed', 'Jain option', 'Special dietary request', 'Custom']),
    stepper('live_counters', 'Live counters', [0,1,2,3,4,5,6,8,10], { required: false }),
    stepper('staff_count', 'Service staff', [2,4,6,8,10,15,20,30], { required: false }),
    currency('extra_guest_rate', 'Additional guest rate', [50,75,100,150,200,250,300,500]),
  ],
  E02: [
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('photo_style', 'Photography style', ['Candid', 'Traditional', 'Documentary', 'Portrait', 'Editorial', 'Fashion', 'Corporate', 'Product', 'Food', 'Mixed / custom']),
    choice('coverage', 'Coverage window', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','Full day','Multi-day']),
    stepper('photographers', 'Photographers', [1,2,3,4,5,6],),
    choice('deliverables', 'Photo deliverables', ['Edited photos', 'Edited + raw photos', 'Highlight selection', 'Same-day previews', 'Online gallery', 'Prints + digital gallery', 'Custom']),
    choice('album', 'Album', ['No album','Standard album','Premium album','Luxury album','Digital album','Custom']),
    choice('editing', 'Editing level', ['Basic correction','Standard professional edit','Advanced retouching','Premium retouching','Editorial retouching','Custom']),
    choice('delivery', 'Delivery timeline', DELIVERY_WINDOWS),
    choice('drone', 'Drone coverage', ['Not available','Available as add-on','Included','Venue permission required']),
    stepper('locations', 'Locations covered', [1,2,3,4,5], { required: false }),
    currency('extra_hour_rate', 'Additional hour rate', [500,1000,1500,2500,5000,7500,10000], { required: false }),
    currency('extra_photographer_rate', 'Additional photographer rate', [1000,2500,5000,7500,10000,15000], { required: false }),
  ],
  E03: [
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('production_style', 'Video style', ['Documentary', 'Cinematic', 'Traditional', 'Highlight film', 'Corporate film', 'Product film', 'Social-first reels', 'Mixed / custom']),
    choice('coverage', 'Coverage window', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','Full day','Multi-day']),
    stepper('videographers', 'Videographers', [1,2,3,4,5,6]),
    choice('deliverables', 'Video deliverables', ['Highlight film','Full event film','Ceremony film','Social reels','Trailer / teaser','Raw footage','Multiple edited films','Custom']),
    choice('highlight', 'Highlight film length', ['Not included','1–2 min','3–5 min','5–8 min','8–15 min','Custom']),
    choice('editing', 'Post-production level', ['Basic','Professional','Cinematic','Premium colour grade','Advanced sound design','Custom']),
    choice('drone', 'Drone coverage', ['Not available','Available as add-on','Included','Venue permission required']),
    choice('delivery', 'Delivery timeline', DELIVERY_WINDOWS),
    stepper('reels', 'Short-form reels', [0,1,2,3,5,8,10], { required: false }),
    currency('extra_hour_rate', 'Additional hour rate', [1000,2500,5000,7500,10000,15000], { required: false }),
  ],
  E04: [
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('decor_style', 'Decor style', ['Minimal','Classic','Traditional','Contemporary','Floral','Royal','Luxury','Theme-based','Custom']),
    choice('scope', 'Decor scope', ['Stage only','Stage + backdrop','Mandap + stage','Entrance + stage','Dining + stage','Complete venue','Complete wedding decor','Custom']),
    choice('stage', 'Stage setup', ['Not included','Basic stage','Standard stage','Premium stage','Custom stage']),
    choice('backdrop', 'Backdrop', ['Not included','Fabric','Floral','LED','Premium custom backdrop']),
    choice('flowers', 'Floral level', ['Artificial','Fresh seasonal','Premium fresh','Imported / premium','Mixed floral','Custom floral']),
    choice('lighting', 'Decor lighting', ['None','Ambient','Decorative','Stage lighting','Premium lighting','Custom']),
    choice('ceiling', 'Ceiling decor', ['Not included','Fabric drape','Floral ceiling','Hanging decor','Premium ceiling','Custom'], { required: false }),
    choice('entrance', 'Entrance decor', ['Not included','Basic entrance','Floral entrance','Theme entrance','Premium entrance']),
    choice('venue_size', 'Venue size', ['Small','Medium','Large','Very large','Site survey required']),
    choice('setup_window', 'Setup window', SETUP_WINDOWS),
    currency('extra_area_rate', 'Additional decor scope rate', [2500,5000,10000,25000,50000,100000], { required: false }),
  ],
  E05: [
    choice('venue_type', 'Venue type', ['Banquet hall','Wedding hall','Lawn','Hotel ballroom','Convention centre','Studio','Outdoor venue','Private property','Other']),
    stepper('capacity', 'Guest capacity', [50,100,150,200,300,500,750,1000,1500,2000,3000]),
    choice('booking_slot', 'Booking slot', ['Morning','Afternoon','Evening','Night','Half day','Full day','Custom']),
    choice('air_conditioning', 'AC availability', ['Fully air-conditioned','Partially air-conditioned','Non-AC','Outdoor','Climate controlled']),
    stepper('parking_spaces', 'Parking capacity', [0,10,20,30,50,75,100,150,250,500], { required: false }),
    choice('facilities', 'Included facilities', ['Venue only','Furniture + power','Furniture + AC + parking','Basic event facilities','Full venue facilities','Premium facilities','Custom']),
    choice('catering_policy', 'Catering policy', ['In-house only','Outside catering allowed','Partner catering only','Kitchen access','No catering','Custom']),
    choice('decor_policy', 'Decoration policy', ['Basic decoration allowed','Outside decorators allowed','Approved decorators only','No open flame','Venue-specific rules','Custom']),
    choice('rental_model', 'Rental model', ['Venue rental','Half-day rental','Full-day rental','Minimum spend','Per plate','Custom quote']),
    currency('overtime_rate', 'Extra hour rate', [1000,2500,5000,7500,10000,25000], { required: false }),
  ],
  E06: [
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('setup_type', 'DJ setup', ['DJ only','DJ + sound','DJ + sound + lighting','DJ + LED','Complete production','Custom']),
    choice('sound_size', 'Sound system size', ['Small (up to 100 pax)','Medium (100–300 pax)','Large (300–750 pax)','Festival / large event','Concert-grade','Custom']),
    stepper('djs', 'Number of DJs', [1,2,3,4], { required: false }),
    choice('lighting', 'Lighting package', ['None','Basic','Ambient','Stage lighting','Moving heads','Premium lighting','Custom']),
    choice('led', 'LED / visual setup', ['None','LED backdrop','LED screen','LED wall','Premium LED wall','Custom'], { required: false }),
    choice('microphones', 'Microphones', ['1 wired','2 wired','1 wireless','2 wireless','4+ wireless','Custom']),
    choice('duration', 'Performance duration', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','Full event']),
    choice('power', 'Power requirement', ['Standard venue power','Dedicated circuit','Three phase','Generator required','Partner power included','Custom']),
    currency('overtime_rate', 'Additional hour rate', [500,1000,1500,2500,5000,7500,10000], { required: false }),
  ],
  E07: [
    choice('act_type', 'Entertainment type', ['Solo artist','Duo / trio','Live band','Dance troupe','DJ act','Cultural performance','Celebrity / premium act','Custom']),
    choice('genre', 'Genre / style', ['Bollywood','Regional','Western','Classical','Fusion','Rock / pop','Folk / cultural','Custom']),
    stepper('performers', 'Performers', [1,2,3,4,5,8,10,12,20]),
    choice('performance_duration', 'Performance duration', ['30 min','60 min','90 min','2 hours','3 hours','4 hours','Custom']),
    stepper('sets', 'Number of sets', [1,2,3,4,5,6], { required: false }),
    choice('technical', 'Technical rider', ['Basic','Standard','Professional','Venue-specific','Custom rider']),
    choice('sound', 'Sound requirement', ['Partner provides','Venue sound accepted','Dedicated PA required','Production included','Custom']),
    choice('rehearsal', 'Rehearsal', ['Not included','1 rehearsal','Venue rehearsal','Multiple rehearsals','Custom'], { required: false }),
    choice('travel', 'Travel coverage', COMMON_LOCATION),
    currency('extra_set_rate', 'Additional set rate', [2500,5000,10000,25000,50000], { required: false }),
  ],
  E08: [
    choice('function', 'Function', ['Wedding day','Engagement','Reception','Mehendi','Haldi','Sangeet','Pre-wedding','Family makeup','Other event']),
    choice('makeup', 'Makeup type', ['Traditional','HD','Airbrush','Natural / soft glam','Premium editorial','Luxury bridal']),
    choice('hair', 'Hair styling', ['Basic styling','Blow-dry + styling','Curls / waves','Updo','Premium styling','Custom']),
    choice('draping', 'Draping', ['Not included','Standard saree drape','Pleated drape','Designer drape','Custom draping']),
    stepper('people', 'People covered', [1,2,3,4,5,6,8,10,12]),
    choice('trial', 'Trial session', ['Not included','Makeup trial','Hair trial','Makeup + hair trial','On-location trial'], { required: false }),
    choice('products', 'Product level', ['Standard professional','Premium professional','Luxury / pro kit','Customer products','Custom']),
    choice('travel', 'Travel coverage', COMMON_LOCATION),
    choice('duration', 'Service duration', ['1 hour','2 hours','3 hours','4 hours','6 hours','8 hours']),
  ],
  E09: [
    choice('planning_scope', 'Planning scope', ['Day-of coordination','Wedding week','Partial planning','Full planning','Destination planning','End-to-end planning']),
    choice('event_type', 'Event type', EVENT_TYPES),
    stepper('functions', 'Functions covered', [1,2,3,4,5,6,8,10]),
    stepper('guests', 'Guest count', [25,50,100,150,200,300,500,750,1000,1500,2000]),
    stepper('venues', 'Venues covered', [1,2,3,4,5,6], { required: false }),
    choice('coordination', 'Coordination depth', ['Vendor coordination','Guest coordination','Timeline management','Full event command centre','Custom']),
    choice('planning_deliverables', 'Planning deliverables', ['Budget plan','Vendor plan','Run sheet','Guest logistics','Decor plan','Complete planning pack','Custom']),
    choice('meetings', 'Included planning meetings', ['1','2','3','4','5','Unlimited / agreed cadence'], { required: false }),
    choice('travel', 'Service location', COMMON_LOCATION),
  ],
  E10: [
    choice('tent_type', 'Tent type', ['Open lawn canopy','Waterproof canopy','Pagoda tent','Air-cooled tent','Premium themed tent','Custom']),
    stepper('chairs', 'Chairs', [25,50,75,100,150,200,300,500,750,1000]),
    stepper('tables', 'Tables', [5,10,15,20,30,40,50,75,100]),
    choice('furniture_level', 'Furniture level', ['Basic','Standard','Premium','Luxury','Custom']),
    choice('area', 'Covered area', ['100–250 sq ft','250–500 sq ft','500–1,000 sq ft','1,000–2,000 sq ft','2,000+ sq ft','Site measurement required']),
    choice('flooring', 'Flooring', ['None','Carpet','Wooden platform','Raised flooring','Premium flooring','Custom'], { required: false }),
    choice('cooling', 'Cooling', ['None','Fans','Coolers','Air cooling','Climate controlled','Custom'], { required: false }),
    stepper('rental_days', 'Rental period', [1,2,3,4,5,7,14]),
    choice('setup', 'Installation', ['Partner setup','Customer setup','Setup + dismantling','Overnight setup','Custom']),
    currency('extra_chair_rate', 'Additional chair rate', [20,25,30,50,75,100], { required: false }),
  ],
  E11: [
    choice('product', 'Print product', ['Wedding invitation','Birthday invitation','Corporate invitation','Save-the-date','Thank-you card','Menu card','Welcome board','Invitation box','Custom']),
    stepper('quantity', 'Order quantity', [25,50,100,150,200,300,500,750,1000,1500,2000]),
    choice('paper', 'Paper / GSM', ['80 GSM','100 GSM','120 GSM','170 GSM','250 GSM','300 GSM','Luxury board','Custom']),
    choice('finish', 'Finish', ['Matte','Gloss','Textured','Foil','Embossed','Spot UV','Premium custom']),
    choice('printing', 'Printing method', ['Digital','Offset','Letterpress','Foil printing','Screen print','Custom']),
    choice('design', 'Design service', ['Customer artwork','Basic design included','Premium design','Custom design','Designer-assisted']),
    choice('proofing', 'Proofing', ['Digital proof','2 proof rounds','Printed proof','Premium proofing','Custom']),
    choice('delivery', 'Delivery', ['Pickup','Local delivery','Doorstep delivery','Express delivery','Delivery + setup']),
    currency('extra_unit_rate', 'Additional quantity rate', [10,15,20,25,50,75,100], { required: false }),
  ],
  E12: [
    choice('vehicle', 'Vehicle', ['Sedan','SUV','Tempo Traveller','Minibus','Luxury vehicle','Premium guest shuttle','Custom']),
    choice('vehicle_condition', 'Vehicle tier', ['Standard','Executive','Premium','Luxury','Vintage / wedding special']),
    stepper('seats', 'Seats', [4,6,7,9,12,16,25,35,49]),
    choice('ac', 'AC / comfort', ['AC','Non-AC','AC on request','Climate controlled']),
    stepper('included_km', 'Included kilometres', [5,10,20,30,50,75,100,150,250,500]),
    stepper('included_hours', 'Included hours', [1,2,4,6,8,10,12,24]),
    choice('waiting', 'Waiting allowance', ['30 min included','60 min included','90 min included','2 hours included','Charged after included time']),
    choice('driver', 'Driver arrangement', ['Professional driver included','Premium chauffeur','Self-drive where permitted','Custom']),
    choice('route', 'Route coverage', COMMON_LOCATION),
    currency('extra_km', 'Additional km rate', [8,10,12,15,20,25,30,40,50], { required: false }),
  ],
  E13: [
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('lighting_type', 'Lighting category', ['Ambient','Stage','Wedding decor','Architectural','Concert','Outdoor','Corporate','Custom']),
    stepper('fixtures', 'Fixture quantity', [4,8,16,32,64,100,150,200]),
    choice('fixture_mix', 'Fixture mix', ['Basic LED wash','PAR + profile','Moving heads','Hybrid lighting','Full production lighting','Custom']),
    choice('coverage', 'Coverage area', ['Stage','Head table / stage','Small venue','Medium venue','Large venue','Full venue','Outdoor area']),
    choice('operator', 'Operator', ['Not included','1 operator','2 operators','Dedicated operator team']),
    choice('power', 'Power requirement', ['Standard venue power','Single phase','Three phase','Dedicated power','Generator required']),
    choice('setup', 'Setup / dismantling', ['Partner setup','Setup + dismantling','Overnight setup','Customer setup','Custom']),
    currency('extra_fixture_rate', 'Additional fixture rate', [100,250,500,750,1000,2500], { required: false }),
  ],
  E14: [
    choice('product_type', 'Product type', ['Celebration cake','Wedding cake','Tier cake','Cupcake set','Dessert table','Brownie / dessert box','Custom']),
    choice('weight', 'Cake weight', ['0.5 kg','1 kg','1.5 kg','2 kg','3 kg','5 kg','10 kg+']),
    stepper('servings', 'Servings', [2,4,6,8,10,12,20,30,50,75,100]),
    choice('flavour', 'Flavour', ['Vanilla','Chocolate','Red velvet','Butterscotch','Fresh fruit','Pineapple','Coffee','Regional / custom']),
    choice('tiers', 'Tiers', ['1 tier','2 tiers','3 tiers','4 tiers','5 tiers','6+ tiers']),
    choice('filling', 'Filling', ['Basic cream','Chocolate ganache','Fresh cream','Fruit filling','Premium mousse','Custom']),
    choice('customization', 'Customization', ['Standard design','Name / message','Theme matched','Photo / print','Premium sugar work','Fully custom']),
    choice('delivery', 'Delivery', ['Pickup','Local delivery','Doorstep delivery','Event venue delivery','Express delivery']),
    currency('extra_kg_rate', 'Additional kg rate', [500,750,1000,1500,2000,2500,5000], { required: false }),
  ],
  E15: [
    choice('coverage', 'Coverage', ['Bridal only','Bridal + family','Family / guests','Small group','Venue-wide','Custom']),
    stepper('artists', 'Artists', [1,2,3,4,5,8,10]),
    stepper('guests', 'Guest count', [5,10,20,30,50,75,100,150]),
    choice('style', 'Mehendi style', ['Arabic','Indian traditional','Minimal','Bridal full-hand','Rajasthani','Fusion','Custom']),
    choice('coverage_area', 'Application coverage', ['Hands only','Hands + feet','Bridal full hands + feet','Family applications','Guest express mehendi']),
    choice('duration', 'Service duration', ['1 hour','2 hours','3 hours','4 hours','6 hours','8 hours']),
    choice('design_complexity', 'Design complexity', ['Simple','Medium','Detailed','Bridal detailed','Premium custom']),
    choice('travel', 'Travel coverage', COMMON_LOCATION),
    currency('extra_artist_rate', 'Additional artist rate', [500,1000,2500,5000,7500,10000], { required: false }),
  ],
  E16: [
    choice('language', 'Language', LANGUAGES),
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('hosting_style', 'Hosting style', ['Formal MC','Energetic anchor','Wedding host','Corporate host','Bilingual host','Celebrity-style','Custom']),
    choice('duration', 'Hosting duration', ['1 hour','2 hours','3 hours','4 hours','6 hours','8 hours','Full event']),
    stepper('audience', 'Audience size', [25,50,100,150,200,300,500,750,1000,1500,2000]),
    choice('rehearsal', 'Rehearsal', ['Not included','1 rehearsal','2 rehearsals','Venue rehearsal','Custom']),
    choice('script', 'Script support', ['Customer script','Basic script included','Full script writing','Show flow + script','Custom']),
    choice('interaction', 'Audience interaction', ['Announcements only','Games + interaction','Full audience engagement','Corporate moderation','Custom']),
    choice('travel', 'Travel coverage', COMMON_LOCATION),
  ],
  E17: [
    choice('event_type', 'Event type', EVENT_TYPES),
    choice('production_scope', 'AV scope', ['Sound only','Sound + microphones','Sound + LED','AV presentation setup','Full AV production','Custom']),
    stepper('audience', 'Audience size', [25,50,100,150,200,300,500,750,1000,1500,2000]),
    stepper('speakers', 'Speakers', [2,4,6,8,10,12,16,24]),
    stepper('mics', 'Microphones', [1,2,4,6,8,12,16]),
    choice('led', 'LED / display', ['Not included','Projector','LED screen','LED wall','Premium LED wall','Custom'], { required: false }),
    choice('operator', 'AV operator', ['Not included','1 operator','2 operators','Dedicated operator team']),
    choice('power', 'Power', ['Venue power','Dedicated circuit','Three phase','Generator required','Custom']),
    choice('setup', 'Setup', SETUP_WINDOWS),
    currency('extra_hour_rate', 'Additional hour rate', [500,1000,2500,5000,7500,10000,15000], { required: false }),
  ],
  E18: [
    choice('parking_type', 'Parking service', ['Valet only','Valet + parking management','Car park management','Event traffic control','Premium valet']),
    stepper('vehicles', 'Expected vehicles', [10,25,50,75,100,150,200,300,500]),
    stepper('attendants', 'Attendants', [1,2,3,4,6,8,10,12,20]),
    choice('duration', 'Service duration', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','Full day']),
    choice('parking_distance', 'Parking distance', ['On-site','Up to 100 m','100–250 m','250–500 m','Off-site shuttle needed']),
    choice('access', 'Access control', ['Single entry','Multiple entry points','QR / ticketed','Guest list managed','Custom']),
    choice('vehicle_handling', 'Vehicle handling', ['Basic valet','Premium valet','Covered parking coordination','Shuttle coordination','Custom']),
    choice('staff_benefits', 'Included staff support', ['Attendants only','Supervisor included','Supervisor + marshals','Full parking team']),
    currency('extra_vehicle_rate', 'Additional vehicle rate', [20,30,50,75,100,150,250], { required: false }),
  ],
  E19: [
    choice('security_type', 'Security service', ['General event security','Wedding security','Crowd control','VIP protection','Gate security','Premium security team']),
    stepper('guards', 'Security guards', [1,2,3,4,6,8,10,12,20,30]),
    stepper('supervisors', 'Supervisors', [0,1,2,3,4], { required: false }),
    choice('shift_hours', 'Shift duration', ['4 hours','6 hours','8 hours','10 hours','12 hours','24 hours']),
    stepper('entry_points', 'Entry points', [1,2,3,4,5,6,8]),
    choice('equipment', 'Equipment level', ['Uniform + communication','Metal detector','Bag check','Barricade support','Full security kit','Custom']),
    choice('crowd_size', 'Expected crowd', ['Up to 100','100–300','300–750','750–1500','1500–3000','3000+']),
    choice('vip', 'VIP protection', ['Not included','Escort team','Dedicated protection','Separate VIP zone']),
    currency('extra_guard_rate', 'Additional guard rate', [500,1000,1500,2500,5000,7500], { required: false }),
  ],
  E20: [
    choice('beverage_scope', 'Beverage service', ['Welcome drinks','Mocktail package','Fresh juice service','Live beverage counter','Non-alcoholic bar','Full beverage service','Custom']),
    choice('menu', 'Menu type', ['Fixed menu','Customer-selected menu','Premium beverage menu','Seasonal menu','Custom']),
    stepper('guests', 'Guests', [25,50,75,100,150,200,300,500,750,1000]),
    stepper('servings', 'Servings per person', [1,2,3,4,5,6]),
    stepper('bartenders', 'Service staff', [1,2,3,4,5,6,8], { required: false }),
    choice('counter', 'Counter setup', ['Basic counter','Decorated counter','Live counter','Premium bar setup','Custom']),
    choice('ice', 'Ice / chilling', ['Not included','Standard ice','Ice + chilling','Premium chilling','Custom']),
    choice('compliance', 'Compliance status', ['Compliant / ready','Documents available','Approval required','Customer venue compliance','Custom review']),
    currency('extra_guest_rate', 'Additional guest rate', [50,75,100,150,200,250,500], { required: false }),
  ],
  E21: [
    choice('service_type', 'Guest service type', ['Registration','Welcome desk','Usher team','Guest hospitality','Concierge','VIP concierge','Custom']),
    stepper('staff', 'Staff count', [1,2,3,4,5,8,10,12,20]),
    choice('hours', 'Service duration', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','Full day']),
    choice('language', 'Language support', LANGUAGES),
    choice('dress_code', 'Staff presentation', ['Standard formal','Event uniform','Traditional','Theme attire','Premium concierge attire']),
    choice('supervisor', 'Supervisor', ['Not included','1 supervisor','2 supervisors','Dedicated supervisor'], { required: false }),
    choice('scope', 'Support scope', ['Greeting only','Registration + greeting','Guest assistance','Full hospitality desk','Concierge coordination']),
    currency('extra_staff_rate', 'Additional staff rate', [500,1000,1500,2500,5000], { required: false }),
  ],
  E22: [
    choice('equipment_type', 'Power / cooling type', ['Diesel generator','Silent generator','Portable generator','Air cooler','Industrial cooler','Generator + cooling','Custom']),
    choice('capacity', 'Power capacity', ['5 kVA','10 kVA','15 kVA','25 kVA','40 kVA','50 kVA','75 kVA','100+ kVA']),
    choice('runtime', 'Runtime', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','24 hours','Multi-day']),
    choice('operator', 'Operator', ['Not included','1 operator','2 operators','Dedicated operator team']),
    choice('cable', 'Cable length', ['10 m','25 m','50 m','75 m','100 m','150 m','200 m','Custom']),
    choice('fuel', 'Fuel policy', ['Fuel included','Fuel billed separately','Fuel by runtime','Customer provides fuel','Custom']),
    choice('cooling_scope', 'Cooling scope', ['None','Local cooling','Stage cooling','Venue cooling','Full venue cooling'], { required: false }),
    choice('setup', 'Installation', ['Drop-off only','Setup included','Setup + dismantling','Dedicated technician','Custom']),
    currency('extra_hour_rate', 'Additional runtime rate', [500,1000,1500,2500,5000,7500], { required: false }),
  ],
  E23: [
    choice('facility_type', 'Facility type', ['Portable toilets','Wash stations','Waste bins','First-aid support','Safety desk','Combined facilities','Custom']),
    stepper('toilets', 'Portable toilets', [1,2,3,4,6,8,10,12,20,30], { required: false }),
    choice('quality', 'Facility tier', ['Standard','Premium','Accessible','Executive / VIP','Custom']),
    choice('waste', 'Waste service', ['No waste service','Basic bins','Collection + disposal','Segregated waste handling','Full waste plan']),
    choice('first_aid', 'First aid', ['Not included','Basic first-aid kit','Medic on call','Dedicated first-aid desk','Medical support team']),
    choice('duration', 'Service duration', ['2 hours','4 hours','6 hours','8 hours','10 hours','12 hours','24 hours']),
    choice('cleaning', 'Cleaning / servicing', ['Included','Periodic servicing','After-event cleaning','Dedicated cleaner','Custom']),
    choice('setup', 'Setup', ['Drop-off','Placement','Setup + servicing','Full facility management']),
    currency('extra_unit_rate', 'Additional unit rate', [250,500,1000,1500,2500,5000], { required: false }),
  ],
  E24: [
    choice('ritual', 'Ritual / ceremony', ['Puja','Wedding rituals','Engagement rituals','Housewarming','Naming ceremony','Traditional wedding','Custom ritual']),
    choice('tradition', 'Tradition', ['South Indian','North Indian','Kannada','Tamil','Telugu','Malayali','Pan-Indian','Custom tradition']),
    choice('language', 'Ceremony language', ['Kannada','Sanskrit','English','Hindi','Tamil','Telugu','Bilingual','Custom']),
    stepper('priests', 'Priests', [1,2,3,4,5,7,10]),
    choice('samagri', 'Samagri', ['Customer supplied','Basic samagri included','Complete samagri included','Partner supplied premium kit','Custom']),
    choice('setup', 'Setup support', ['Ritual only','Basic puja setup','Full ritual setup','Decoration + ritual setup','Custom']),
    choice('duration', 'Ceremony duration', ['1 hour','2 hours','3 hours','4 hours','6 hours','8 hours']),
    choice('travel', 'Travel coverage', COMMON_LOCATION),
    currency('extra_priest_rate', 'Additional priest rate', [1000,2500,5000,7500,10000], { required: false }),
  ],
  E25: [
    choice('product', 'Gift / favour type', ['Budget favour','Classic gift','Premium gift','Luxury gift','Corporate gift','Personalized favour','Custom']),
    stepper('quantity', 'Order quantity', [10,25,50,100,150,200,300,500,750,1000,1500,2000]),
    choice('packaging', 'Packaging', ['Standard pack','Premium pack','Luxury pack','Corporate pack','Custom packaging']),
    choice('personalization', 'Personalization', ['None','Name / initials','Message card','Logo / branding','Theme personalization','Fully custom']),
    choice('product_material', 'Material / finish', ['Paper','Wood','Metal','Glass','Fabric','Mixed premium material','Custom']),
    choice('design', 'Design service', ['Customer artwork','Basic design','Premium design','Designer-assisted','Custom']),
    choice('delivery', 'Delivery', ['Pickup','Local delivery','Doorstep delivery','Bulk event delivery','Express delivery']),
    choice('proofing', 'Proofing', ['No proof','Digital proof','2 proof rounds','Physical proof','Custom']),
    currency('extra_item_rate', 'Additional item rate', [50,100,150,250,500,750,1000], { required: false }),
  ],
  E26: [
    choice('packing_type', 'Packing type', ['Gift wrap','Box packing','Hamper packing','Trousseau packing','Premium presentation','Luxury presentation']),
    choice('box', 'Box type', ['Cardboard','Rigid box','Magnetic box','Wooden box','Luxury custom box']),
    stepper('items', 'Item count', [5,10,20,30,50,75,100,150,200]),
    choice('material', 'Material', ['Paper','Cardboard','Fabric','Wood','Metal','Mixed premium material']),
    choice('personalization', 'Personalization', ['None','Name / initials','Message card','Logo / branding','Theme personalization','Fully custom']),
    choice('lining', 'Inner lining', ['None','Paper lining','Fabric lining','Velvet lining','Premium custom']),
    choice('assembly', 'Assembly', ['Packing only','Packing + labelling','Full presentation setup','On-site assembly']),
    choice('delivery', 'Delivery', ['Pickup','Local delivery','Doorstep delivery','Event venue delivery','Express']),
    currency('extra_item_rate', 'Additional item rate', [50,100,150,250,500,750,1000], { required: false }),
  ],
  L01: [
    choice('vehicle', 'Vehicle class', ['Mini pickup','Single-cab pickup','Closed mini truck','Open mini truck','Pickup with canopy','Custom']),
    choice('payload', 'Payload capacity', ['250 kg','500 kg','750 kg','1 T','1.5 T','2 T']),
    choice('route', 'Route type', ['Local Bengaluru','Within city limits','Bengaluru + outskirts','Intercity','Route survey required']),
    stepper('included_km', 'Included kilometres', [5,10,20,30,50,75,100,150,250,500]),
    stepper('included_hours', 'Included hours', [2,4,6,8,10,12,24]),
    choice('loading', 'Loading arrangement', ['Driver only','Partner loading support','Crew available as add-on','Loading + unloading included']),
    choice('fuel_policy', 'Fuel policy', ['Fuel included','Fuel extra','Fuel by route','Customer-provided fuel']),
    choice('waiting', 'Waiting allowance', ['30 min','60 min','90 min','2 hours','Charged after included time']),
    currency('extra_km_rate', 'Additional km rate', [8,10,12,15,20,25,30,40], { required: false }),
  ],
  L02: [
    choice('vehicle_class', 'Vehicle class', ['LCV','Medium truck','Large truck','Container vehicle','Dedicated event freight']),
    choice('tonnage', 'Tonnage', ['1 T','2 T','5 T','7.5 T','10 T','16 T','20 T','25 T']),
    choice('payload', 'Payload', ['500 kg','1 T','2 T','5 T','7.5 T','10 T','15 T+']),
    choice('route', 'Route', ['Local Bengaluru','Within city limits','Bengaluru + outskirts','Intercity','Route survey required']),
    choice('fuel_policy', 'Fuel policy', ['Fuel included','Fuel extra','Fuel by route','Customer-provided fuel']),
    choice('loading', 'Loading / unloading', ['Vehicle only','Loading support','Unloading support','Loading + unloading crew','Full handling']),
    choice('waiting', 'Waiting allowance', ['30 min','60 min','90 min','2 hours','Charged after included time']),
    choice('permit', 'Road / permit handling', ['Partner handles standard permits','Customer handles permits','Permit charge extra','Route-specific review']),
    currency('extra_km_rate', 'Additional km rate', [12,15,20,25,30,40,50,75], { required: false }),
  ],
  L03: [
    choice('vehicle', 'Vehicle type', ['Sedan','SUV','Tempo Traveller','Minibus','Premium coach','Luxury guest shuttle']),
    choice('seats', 'Seat capacity', ['9','12','16','25','35','49']),
    choice('ac', 'AC / comfort', ['AC','Non-AC','AC on request','Climate controlled']),
    stepper('included_km', 'Included kilometres', [5,10,20,30,50,75,100,150,250,500]),
    stepper('included_hours', 'Included hours', [1,2,4,6,8,10,12,24]),
    choice('waiting', 'Waiting allowance', ['30 min included','60 min included','90 min included','2 hours included','Charged after included time']),
    choice('driver', 'Driver', ['Professional driver included','Premium chauffeur','Driver + coordinator','Custom']),
    choice('route', 'Route', ['Local Bengaluru','Bengaluru + outskirts','Intercity','Multi-city','Route survey required']),
    choice('luggage', 'Luggage capacity', ['Standard','Large','Extra luggage support','Trailer / support vehicle','Custom']),
    currency('extra_km_rate', 'Additional km rate', [8,10,12,15,20,25,30,40], { required: false }),
  ],
  L04: [
    choice('equipment', 'Equipment category', ['Furniture','Stage equipment','AV equipment','Lighting equipment','Decor equipment','Power equipment','Mixed event equipment']),
    choice('condition', 'Equipment tier', ['Standard','Professional','Premium','Luxury','Custom']),
    stepper('quantity', 'Quantity', [1,5,10,25,50,100,250,500]),
    choice('rental_period', 'Rental period', ['4 hours','8 hours','1 day','2 days','3 days','1 week','Custom period']),
    choice('delivery', 'Delivery', ['Pickup','Local delivery','Doorstep delivery','Delivery + setup','Dedicated delivery vehicle']),
    choice('installation', 'Installation', ['Not included','Setup included','Setup + dismantling','Dedicated technician','Custom']),
    choice('deposit', 'Security deposit', ['No deposit','10%','20%','30%','50%','Custom deposit']),
    choice('damage_policy', 'Damage / loss policy', ['Standard deposit policy','Replacement cost','Partner insurance','Case-by-case','Custom']),
    currency('extra_day_rate', 'Additional day rate', [250,500,1000,2500,5000,10000,25000], { required: false }),
  ],
  L05: [
    choice('crew_size', 'Crew size', ['1–2 staff','3–4 staff','5–8 staff','9–12 staff','Dedicated event crew']),
    choice('crew_skill', 'Crew skill', ['General labour','Event handling crew','Skilled handlers','Heavy handling team','Senior supervisors + crew']),
    choice('shift', 'Shift duration', ['4 hours','6 hours','8 hours','10 hours','12 hours','24 hours']),
    choice('handling', 'Handling scope', ['Loading','Unloading','Loading + unloading','On-site placement','Fragile handling','Heavy handling']),
    choice('equipment', 'Handling equipment', ['Manual only','Trolley','Hand pallet truck','Dolly / cart','Forklift arrangement']),
    choice('overtime', 'Overtime', ['Not available','Hourly overtime','30-minute blocks','After-shift premium','Custom']),
    choice('supervisor', 'Supervisor', ['Not included','1 supervisor','2 supervisors','Dedicated supervisor'], { required: false }),
    choice('travel', 'Service area', COMMON_LOCATION),
    currency('extra_hour_rate', 'Additional hour rate', [250,500,750,1000,1500,2500], { required: false }),
  ],
  L06: [
    choice('storage_type', 'Storage type', ['Indoor warehouse','Covered storage','Pallet storage','Racked storage','Climate-controlled','Open yard','Secure dedicated bay']),
    choice('capacity', 'Storage capacity', ['Up to 100 sq ft','100–250 sq ft','250–500 sq ft','500–1,000 sq ft','1,000–2,000 sq ft','2,000+ sq ft','Custom capacity']),
    choice('duration', 'Storage duration', ['1–7 days','8–30 days','1–3 months','3–6 months','6–12 months','12+ months','Custom duration']),
    choice('handling', 'Handling support', ['Storage only','Loading support','Unloading support','Loading & unloading','Inventory placement','Full handling']),
    choice('security', 'Security level', ['Standard','CCTV monitored','Guarded','Restricted access','High-security / dedicated bay']),
    choice('access', 'Access model', ['Business hours','Extended hours','24/7 access','Scheduled access','Restricted access']),
    choice('inventory', 'Inventory service', ['Storage only','Basic inventory log','Barcode / SKU tracking','Inventory reporting','Full inventory management'], { required: false }),
    choice('insurance', 'Storage protection', ['Standard terms','Partner insurance','Customer insurance','Declared-value cover','Custom']),
    currency('extra_sqft_rate', 'Additional sq ft rate', [2,5,8,10,15,20,25,50], { required: false }),
  ],
  L07: [
    choice('product', 'Material category', ['Event consumables','Decor materials','Printing materials','Branded materials','Packaging materials','AV / technical materials','Custom sourced material']),
    choice('unit', 'Supply unit', ['Per piece','Per item','Per set','Per box','Per bundle','Per batch']),
    stepper('moq', 'Minimum order quantity', [1,5,10,25,50,100,250,500,1000]),
    stepper('stock', 'Typical stock level', [0,10,25,50,100,250,500,1000,2500,5000], { required: false }),
    choice('quality', 'Material quality', ['Standard','Commercial','Premium','Luxury','Custom']),
    choice('delivery', 'Delivery', ['Pickup','Local delivery','Doorstep delivery','Express delivery','Delivery + setup']),
    choice('lead_time', 'Standard lead time', ['Same day','1 day','2–3 days','5–7 days','7–14 days','Custom']),
    choice('bulk_discount', 'Bulk pricing', ['No bulk pricing','2–5% volume tier','5–10% volume tier','10–20% volume tier','Custom']),
    currency('unit_price', 'Base unit price', [10,25,50,100,250,500,1000,2500],),
  ],
  L08: [
    choice('project_type', 'Logistics scope', ['Small event logistics','Wedding day logistics','Multi-vendor coordination','Event-day logistics','Full event supply chain','Custom project']),
    choice('event_type', 'Event type', EVENT_TYPES),
    stepper('functions', 'Functions covered', [1,2,3,4,5,6,8,10]),
    stepper('venues', 'Venues covered', [1,2,3,4,5,6], { required: false }),
    stepper('stops', 'Stops / handoffs', [1,2,3,4,5,6,8,10,15,20]),
    choice('fleet', 'Fleet requirement', ['Partner vehicle','2–3 vehicles','4–6 vehicles','7–10 vehicles','Dedicated event fleet','Customer fleet + coordination']),
    choice('crew', 'Manpower', ['1–2 staff','3–4 staff','5–8 staff','9–12 staff','Dedicated event crew']),
    choice('coordination', 'Coordination scope', ['Transport only','Vendor movement','Load / unload coordination','Full event logistics command','End-to-end coordination']),
    choice('route', 'Route complexity', ['Simple local route','Multiple local stops','Cross-city','Intercity','Route survey required']),
    choice('sla', 'Service SLA', ['Standard','Priority','Same-day support','Dedicated event-day command','Custom SLA']),
    currency('project_base_rate', 'Base project rate', [5000,10000,25000,50000,100000,250000],),
  ],
}

export function getTradePricingFields(config) {
  const id = config?.trade_id
  const specific = TRADE_PRICING_FIELDS[id]
  if (specific?.length) return specific
  return (config?.fields ?? []).map(field => getFieldSchema(field, config))
}
