// Trade 4 — Cake & Desserts (spec Part 9, Trade 4)
import { q, screen, catalogue } from './schema'

export default {
  id: 'cake_desserts',
  serviceNoun: 'cake and dessert business',
  screens: [
    screen('profile', 'Your cakes & desserts', 'What you bake and how much notice you need.', [
      q.multi('product_types', 'What types of cakes and desserts do you make?', [
        'Celebration cakes', 'Wedding cakes', 'Cupcakes', 'Pastries', 'Dessert jars', 'Cookies', 'Dessert tables',
      ], { required: true, other: true }),
      q.multi('flavours', 'Which flavours do you offer?', [
        'Chocolate', 'Vanilla', 'Red velvet', 'Butterscotch', 'Black forest', 'Fruit', 'Coffee', 'Pineapple',
      ], { required: true, other: true }),
      q.multi('sizes', 'Which sizes or serving counts can customers order?', [
        '0.5 kg', '1 kg', '1.5 kg', '2 kg', '3 kg', '5 kg', 'Tiered', 'Single servings',
      ], { required: true, other: true }),
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
    q.text('name', 'Product name', { required: true, max: 60 }),
    q.single('product_type', 'Type', ['Celebration cake', 'Wedding cake', 'Cupcakes', 'Pastries', 'Dessert jar', 'Cookies', 'Dessert table'], { required: true, other: true }),
    q.text('flavour', 'Flavour', { required: true, max: 40 }),
    q.text('size', 'Size or weight', { required: true, max: 30, placeholder: 'e.g. 1 kg, 12 pieces' }),
    q.number('servings', 'Serves', { required: true, min: 1, max: 5000, suffix: 'people' }),
    q.money('price', 'Price', { required: true }),
    q.single('price_unit', 'Charged', ['Per cake', 'Per kg', 'Per piece', 'Per serving', 'Per dessert table'], { required: true }),
    q.number('min_order', 'Minimum order', { min: 1, max: 10000 }),
    q.text('allergens', 'Ingredients / allergens', { required: true, max: 160 }),
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
      q.multi('delivery_slots', 'Delivery time slots', ['Morning', 'Afternoon', 'Evening', 'Night'], { required: true }),
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
