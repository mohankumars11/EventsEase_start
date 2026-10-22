// Trade 4 — Cake & Desserts (spec Part 9, Trade 4)
import { q, screen, catalogue } from './schema'
import { ALLERGEN_OPTIONS } from '../allergens'

/**
 * The catalogue was three free-text boxes: flavour, size, allergens.
 *
 * ═════════════════════════════════════════════════════════════════════
 * WHY TYPING IS THE WRONG ASK HERE
 * ═════════════════════════════════════════════════════════════════════
 *
 * A baker with twenty products typed twenty flavours, and no two bakers
 * spelt butterscotch, black forest or rasmalai the same way. Nothing
 * downstream could match on it: a customer filtering for eggless
 * chocolate found whoever happened to type those words.
 *
 * Allergens matter more than matching. A free-text allergen box is a
 * safety question answered in prose, which is the one form of that
 * answer nobody can filter, warn on, or act on.
 */
const PRODUCT_TYPES = [
  'Celebration cake', 'Wedding cake', 'Bento / mini cake', 'Photo cake',
  'Fondant cake', 'Pull-me-up cake', 'Tiered cake', 'Cupcakes',
  'Jar cakes', 'Brownies', 'Pastries', 'Cheesecake', 'Dessert jars',
  'Cookies', 'Macarons', 'Donuts', 'Muffins', 'Tarts',
  'Chocolates', 'Indian sweets / mithai', 'Dessert tables', 'Hampers',
]

const FLAVOURS = [
  'Chocolate', 'Dark chocolate', 'Truffle', 'Vanilla', 'Red velvet',
  'Butterscotch', 'Black forest', 'White forest', 'Pineapple', 'Mango',
  'Strawberry', 'Blueberry', 'Coffee', 'Caramel', 'Dry fruit',
  'Tender coconut', 'Rasmalai', 'Nutella / hazelnut', 'Lotus Biscoff',
  'Oreo', 'Cheesecake', 'Fruit / mixed fruit',
]

const SIZES = [
  '0.5 kg', '1 kg', '1.5 kg', '2 kg', '3 kg', '5 kg', 'Above 5 kg',
  'Tiered', 'Single servings', 'Box of 6', 'Box of 12', 'Per tray',
]


export default {
  id: 'cake_desserts',
  serviceNoun: 'cake and dessert business',
  screens: [
    screen('profile', 'Your cakes & desserts', 'What you bake and how much notice you need.', [
      q.multi('product_types', 'What types of cakes and desserts do you make?', PRODUCT_TYPES, { required: true, other: true }),
      q.multi('flavours', 'Which flavours do you offer?', FLAVOURS, { required: true, other: true }),
      q.multi('sizes', 'Which sizes or serving counts can customers order?', SIZES, { required: true, other: true }),
      q.multi('dietary', 'Which dietary options can you support?', [
        'Eggless', 'Vegan', 'Gluten-free, where safely supported', 'Sugar-reduced',
      ], { other: true }),
      q.number('lead_days', 'How many days in advance do you need an order?', { required: true, min: 0, max: 60, suffix: 'days' }),
    ]),
    screen('customisation', 'Customisation', 'What customers can personalise.', [
      q.toggle('design_choice', 'Can customers choose a design or theme?'),
      q.toggle('reference_upload', 'Can they upload reference images?'),
      q.toggle('name_message', 'Can they add a name or message?'),
      q.toggle('figurines', 'Are figurines or special decorations available?'),
      q.toggle('tasting', 'Is a tasting session available?'),
      q.toggle('custom_design_fee', 'Do you charge a custom design fee?'),
      q.money('custom_design_fee_amount', 'Custom design fee', { showWhen: { q: 'custom_design_fee', truthy: true } }),
    ]),
  ],
  catalogue: catalogue('products', 'Your products', 'product', 'products', [
    /* Optional: type, flavour and size already name the product, and
       payload.js composes exactly that when this is blank. A baker with
       twenty products should not have to invent twenty names, but one
       who calls a cake "Ammas Special" must be able to say so. */
    q.text('name', 'Product name', { max: 60, placeholder: 'Leave blank and we will name it from the details below' }),
    q.single('product_type', 'Type', PRODUCT_TYPES, { required: true, other: true }),
    q.multi('flavour', 'Flavour', FLAVOURS, { required: true, other: true }),
    q.single('size', 'Size or weight', SIZES, { required: true, other: true }),
    q.number('servings', 'Serves', { required: true, min: 1, max: 5000, suffix: 'people' }),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Charged', ['Per cake', 'Per kg', 'Per piece', 'Per serving', 'Per dessert table'], { required: true }),
    q.number('min_order', 'Minimum order', { min: 1, max: 10000 }),
    q.multi('allergens', 'Ingredients / allergens', ALLERGEN_OPTIONS, { required: true, other: true }),
    q.number('lead_days', 'Production lead time', { required: true, min: 0, max: 60, suffix: 'days' }),
    q.photos('photos', 'Photos', { min: 1, max: 4 }),
  ]),
  pricing: {
    kinds: ['catalogue', 'per_unit', 'fixed', 'quote'],
    unitLabels: { per_unit: ['per kg', 'per serving', 'per item'] },
    fields: [
      q.text('bulk_tiers', 'Bulk quantity discounts', { placeholder: 'e.g. 50+ cupcakes: 10% off', max: 120 }),
    ],
    note: 'A bespoke wedding cake whose design or structure needs its own estimate always goes to a custom quote, never priced by weight alone.',
  },
  addons: [
    { id: 'delivery', label: 'Delivery', unit: 'per_trip' },
    { id: 'setup', label: 'Dessert table setup', unit: 'per_event' },
    { id: 'topper', label: 'Cake topper / figurine', unit: 'per_item' },
    { id: 'message', label: 'Name or message', unit: 'per_item' },
  ],
  resources: {
    model: 'production',
    title: 'Production & delivery',
    fields: [
      q.number('capacity_per_day', 'Orders you can make per day', { required: true, min: 1, max: 1000 }),
      q.number('delivery_radius_km', 'Delivery radius', { min: 0, max: 200, suffix: 'km' }),
      q.multi('delivery_slots', 'Delivery time slots', ['Morning', 'Afternoon', 'Evening', 'Night', 'Midnight surprise (11 pm – 12:30 am)'], { required: true }),
      q.toggle('refrigeration', 'Needs refrigeration on arrival'),
      q.textarea('handling', 'Handling or setup requirements', { max: 200 }),
    ],
  },
  compliance: { conditional: [] },
  quoteTriggers: [
    { id: 'bespoke_design', label: 'Bespoke design or structure' },
    { id: 'beyond_capacity', label: 'More orders than you can make that day' },
    { id: 'unlisted_product', label: 'A product not in your catalogue' },
  ],
  quoteTemplate: ['Cake / desserts', 'Custom design', 'Toppers & decorations', 'Delivery', 'Setup'],
  readiness: ['Products priced with size and lead time', 'Production capacity for the date', 'Delivery rules set'],
}
