// Trade 14 — Invitation & Printing (spec Part 9, Trade 14)
import { q, screen, catalogue } from './schema'

export default {
  id: 'invitation_printing',
  serviceNoun: 'invitation & printing service',
  screens: [
    screen('profile', 'What you produce', 'Pick everything you make.', [
      q.multi('products', 'Which of these do you provide?', [
        'Printed invitations', 'Digital invitations', 'Custom graphic design', 'Save-the-date cards',
        'RSVP materials', 'Signage', 'Menus', 'Event programmes', 'Labels and tags',
      ], { required: true, other: true }),
      q.multi('languages', 'Languages / scripts you can typeset', ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Sanskrit'], { required: true, other: true }),
      q.number('revisions', 'Design revisions included', { required: true, min: 0, max: 10 }),
      q.toggle('proof_required', 'You send a proof for approval before production'),
    ]),
  ],
  catalogue: catalogue('products', 'Your products', 'product', 'products', [
    q.text('name', 'Product', { required: true, max: 60 }),
    q.single('format', 'Format', ['Printed', 'Digital'], { required: true }),
    q.text('size', 'Size / dimensions', { max: 30, showWhen: { q: 'format', in: ['printed'] } }),
    q.text('paper', 'Paper / material', { max: 40, showWhen: { q: 'format', in: ['printed'] } }),
    q.single('process', 'Printing process', ['Digital print', 'Offset', 'Foil', 'Embossed', 'Letterpress', 'Screen print'], { other: true, showWhen: { q: 'format', in: ['printed'] } }),
    q.number('colours', 'Number of colours', { min: 1, max: 8, showWhen: { q: 'format', in: ['printed'] } }),
    q.multi('file_formats', 'File formats delivered', ['PDF', 'PNG / JPG', 'Video (MP4)', 'Web link'], { showWhen: { q: 'format', in: ['digital'] } }),
    q.single('delivery_method', 'Delivered via', ['WhatsApp', 'Email', 'Link'], { showWhen: { q: 'format', in: ['digital'] } }),
    q.money('design_fee', 'Design fee'),
    q.money('per_piece', 'Price per piece', { required: true }),
    q.number('min_qty', 'Minimum quantity', { min: 1, max: 100000 }),
    q.text('quantity_tiers', 'Quantity tiers', { placeholder: 'e.g. 300+: ₹42', max: 120 }),
    q.text('envelope_accessories', 'Envelope / accessories', { max: 80 }),
    q.number('lead_days', 'Lead time after approval', { required: true, min: 0, max: 60, suffix: 'days' }),
  ]),
  pricing: { kinds: ['catalogue', 'fixed'], fields: [q.money('rush_fee', 'Rush order fee (only if the customer picks it)')],
    note: 'Design, printing, finishing, packaging, delivery and rush are separate lines.' },
  addons: [{ id: 'envelope', label: 'Envelopes', unit: 'per_piece' }, { id: 'assembly', label: 'Assembly & inserts', unit: 'per_piece' }, { id: 'delivery', label: 'Delivery', unit: 'per_trip' }],
  resources: { model: 'production', title: 'Production', fields: [q.number('pieces_per_day', 'Pieces you can produce per day', { required: true, min: 1, max: 1000000 })] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'bespoke', label: 'Bespoke design or unusual material' }, { id: 'rush_beyond', label: 'Date sooner than your lead time' }],
  quoteTemplate: ['Design', 'Printing', 'Finishing', 'Envelopes & accessories', 'Delivery', 'Rush'],
  readiness: ['Products priced', 'Proof step set', 'Production capacity for the date'],
  rules: { proofBeforeProduction: true },
}
