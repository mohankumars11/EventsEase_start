// Pooja / samagri items catalog — added straight to cart like any other
// service (pseudo-event id 'pooja-items'), same checkout path.
// Prices are researched market-rate ESTIMATES, for review.

export const POOJA_CATEGORIES = [
  {
    category: 'Essentials',
    emoji: '🪔',
    items: [
      { id: 'diya',        name: 'Diya (Oil Lamps, set of 12)',   emoji: '🪔', desc: 'Traditional clay oil lamps',            priceMin: 150,  priceMax: 400 },
      { id: 'agarbatti',   name: 'Agarbatti (Incense Sticks)',    emoji: '🕯️', desc: 'Assorted fragrance packs',              priceMin: 50,   priceMax: 200 },
      { id: 'kapoor',      name: 'Kapoor (Camphor)',              emoji: '🔥', desc: 'Pure camphor tablets for aarti',        priceMin: 40,   priceMax: 120 },
      { id: 'cotton_wick', name: 'Cotton Wicks (Batti)',          emoji: '🧵', desc: 'Hand-rolled cotton wicks',              priceMin: 30,   priceMax: 80 },
      { id: 'matchbox',    name: 'Matchbox (pack of 10)',         emoji: '🔥', desc: 'For lighting diyas & havan',            priceMin: 20,   priceMax: 50 },
    ],
  },
  {
    category: 'Flowers & Garlands',
    emoji: '🌺',
    items: [
      { id: 'marigold_garland', name: 'Marigold Garland (pair)',  emoji: '🌼', desc: 'Fresh genda phool garlands',            priceMin: 100,  priceMax: 300 },
      { id: 'rose_petals',      name: 'Rose Petals (500g)',       emoji: '🌹', desc: 'For decoration & offering',             priceMin: 80,   priceMax: 200 },
      { id: 'mixed_flowers',    name: 'Mixed Flower Basket',      emoji: '💐', desc: 'Seasonal flowers for pooja decor',      priceMin: 200,  priceMax: 600 },
      { id: 'tulsi_leaves',     name: 'Tulsi Leaves (bunch)',     emoji: '🌿', desc: 'Fresh holy basil for offerings',        priceMin: 20,   priceMax: 60 },
      { id: 'bilva_leaves',     name: 'Bilva Patra (Bael Leaves)', emoji: '🍃', desc: 'For Shiva pooja',                      priceMin: 30,   priceMax: 80 },
    ],
  },
  {
    category: 'Offerings & Prasad',
    emoji: '🍬',
    items: [
      { id: 'coconut',      name: 'Coconut (pair)',               emoji: '🥥', desc: 'Fresh coconuts for offering',           priceMin: 40,   priceMax: 100 },
      { id: 'bananas',      name: 'Bananas (dozen)',               emoji: '🍌', desc: 'Fresh bananas for prasad',              priceMin: 40,   priceMax: 90 },
      { id: 'sweets',       name: 'Prasad Sweets (Modak/Ladoo)',   emoji: '🍡', desc: '1kg box, fresh from local sweet shop',  priceMin: 300,  priceMax: 800 },
      { id: 'panchamrit',   name: 'Panchamrit Ingredients Kit',    emoji: '🥛', desc: 'Milk, curd, ghee, honey, sugar set',    priceMin: 150,  priceMax: 350 },
      { id: 'paan_supari',  name: 'Paan Supari Set',               emoji: '🍃', desc: 'Betel leaves, areca nut, cardamom',     priceMin: 60,   priceMax: 150 },
      { id: 'dry_fruits',   name: 'Dry Fruits for Prasad (500g)',  emoji: '🥜', desc: 'Mixed premium dry fruits',              priceMin: 250,  priceMax: 600 },
    ],
  },
  {
    category: 'Thali & Accessories',
    emoji: '🛕',
    items: [
      { id: 'pooja_thali',  name: 'Pooja Thali Set',               emoji: '🍽️', desc: 'Steel/brass thali with accessories',    priceMin: 300,  priceMax: 1500 },
      { id: 'kalash',       name: 'Kalash (Brass Pot)',            emoji: '🏺', desc: 'Traditional brass kalash with coconut',  priceMin: 400,  priceMax: 1200 },
      { id: 'bell',         name: 'Pooja Bell (Ghanti)',           emoji: '🔔', desc: 'Brass ceremonial bell',                  priceMin: 150,  priceMax: 500 },
      { id: 'aarti_plate',  name: 'Aarti Plate & Lamp',            emoji: '🪯', desc: 'Decorative brass aarti thali',           priceMin: 300,  priceMax: 900 },
      { id: 'asana',        name: 'Pooja Asana (Seating Mat)',     emoji: '🧘', desc: 'Wooden or cloth ritual seating',         priceMin: 150,  priceMax: 400 },
    ],
  },
  {
    category: 'Powders & Sacred Items',
    emoji: '🧡',
    items: [
      { id: 'kumkum',       name: 'Kumkum (Vermillion)',           emoji: '🔴', desc: 'Pure kumkum powder',                     priceMin: 20,   priceMax: 60 },
      { id: 'turmeric',     name: 'Haldi (Turmeric Powder)',       emoji: '🟡', desc: 'Pure turmeric for rituals',              priceMin: 20,   priceMax: 50 },
      { id: 'chandan',      name: 'Chandan (Sandalwood Paste)',    emoji: '🟤', desc: 'Pure sandalwood paste/powder',           priceMin: 60,   priceMax: 200 },
      { id: 'akshata',      name: 'Akshata (Sacred Rice)',         emoji: '🌾', desc: 'Turmeric-coated rice for blessings',     priceMin: 20,   priceMax: 50 },
      { id: 'yagna_samagri', name: 'Yagna/Havan Samagri Kit',      emoji: '🔥', desc: 'Complete havan kit with kund & ghee',    priceMin: 400,  priceMax: 1200 },
      { id: 'ghee',          name: 'Pure Ghee (500ml)',            emoji: '🧈', desc: 'For diyas and havan',                    priceMin: 250,  priceMax: 500 },
    ],
  },
  {
    category: 'Priest & Services',
    emoji: '🙏',
    items: [
      { id: 'pandit_booking', name: 'Pandit / Priest Booking',     emoji: '🙏', desc: 'Experienced purohit for your pooja',     priceMin: 2500, priceMax: 15000 },
      { id: 'pooja_setup',    name: 'Full Pooja Setup Service',    emoji: '🛕', desc: 'We arrange and set up everything for you', priceMin: 3000, priceMax: 10000 },
    ],
  },
]

export const POOJA_ITEMS = POOJA_CATEGORIES.flatMap(c => c.items.map(i => ({ ...i, category: c.category })))
