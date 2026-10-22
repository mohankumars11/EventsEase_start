// Trade 23 — Priest & Rituals (spec Part 9, Trade 23)
import { q, screen, catalogue } from './schema'

export default {
  id: 'priest_rituals',
  serviceNoun: 'ritual service',
  screens: [
    screen('profile', 'Your rituals', 'Ceremonies, traditions and languages.', [
      q.multi('ceremonies', 'Ceremonies you perform', [
        'Engagement', 'Wedding', 'Housewarming', 'Naming ceremony', 'Blessing', 'Anniversary', 'Memorial',
        'Upanayana / thread ceremony', 'Seemantha / baby shower', 'Annaprashana', 'Ayushya homa (first birthday)',
        'Ganapathi homa', 'Navagraha shanti', 'Satyanarayana puja', 'Lakshmi puja', 'Vastu shanti', 'Bhoomi puja',
        'Rudrabhisheka', 'Chandi homa', 'Shashtiabdapurthi (60th birthday)', 'Shraddha / tithi', 'Shop / office opening', 'Vehicle puja',
      ], { required: true, other: true }),
      q.multi('traditions', 'Traditions', ['Vedic', 'Smarta', 'Vaishnava', 'Shaiva', 'Madhwa', 'Arya Samaj', 'Jain', 'Christian', 'Islamic', 'Sikh',
        'Sri Vaishnava', 'Lingayat / Veerashaiva', 'Kerala tantric', 'North Indian (pandit)', 'Bengali (purohit)', 'Buddhist'], { required: true, other: true }),
      q.multi('languages', 'Languages', ['Sanskrit', 'Kannada', 'Telugu', 'Tamil', 'Hindi', 'English', 'Malayalam', 'Marathi', 'Tulu', 'Konkani', 'Gujarati', 'Bengali', 'Odia', 'Punjabi'], { required: true, other: true }),
      q.toggle('customisation', 'You customise rituals to family tradition'),
      q.toggle('muhurta', 'You fix muhurta (auspicious time)'),
      q.single('materials', 'Puja materials & offerings', ['We bring everything', 'We bring some (list shared)', 'Family arranges'], { required: true }),
      q.toggle('assistants', 'Assistant priests available'),
      q.number('years', 'Years performing ceremonies', { min: 0, max: 70, suffix: 'years' }),
      q.toggle('online_puja', 'Online / video-call puja for families abroad'),
      q.toggle('horoscope', 'Horoscope matching'),
      q.toggle('prasadam_cook', 'You can arrange a cook for prasadam'),
    ]),
  ],
  catalogue: catalogue('ceremonies', 'Your ceremonies', 'ceremony', 'ceremonies', [
    q.single('ceremony', 'Ceremony', ['Engagement', 'Wedding', 'Housewarming', 'Naming ceremony', 'Blessing', 'Anniversary', 'Memorial', 'Satyanarayana puja', 'Homa / havan',
      'Upanayana / thread ceremony', 'Seemantha / baby shower', 'Annaprashana', 'Ayushya homa (first birthday)', 'Ganapathi homa',
      'Navagraha shanti', 'Lakshmi puja', 'Vastu shanti', 'Bhoomi puja', 'Rudrabhisheka', 'Chandi homa',
      'Shashtiabdapurthi (60th birthday)', 'Shraddha / tithi', 'Shop / office opening', 'Vehicle puja'], { required: true, other: true }),
    q.text('description', 'Short description', { max: 160 }),
    q.number('minutes', 'Duration', { required: true, min: 15, max: 1440, suffix: 'minutes' }),
    q.number('priests', 'Priests needed', { required: true, min: 1, max: 20 }),
    q.money('fee', 'Dakshina / fee', { required: true }),
    q.money('materials_fee', 'Materials (shown separately)', { hint: 'Leave empty if the family arranges materials.' }),
  ]),
  pricing: {
    kinds: ['catalogue', 'session', 'full_day', 'fixed', 'quote'],
    fields: [q.money('extra_function', 'Each additional function on the same day'), q.money('extra_priest', 'Each assistant priest')],
    note: 'The fee and the materials are always shown to the customer as separate lines.',
  },
  addons: [{ id: 'materials_kit', label: 'Full materials kit', unit: 'per_event' }, { id: 'homa', label: 'Homa / havan setup', unit: 'per_event' }],
  resources: { model: 'staff', title: 'Priests & time', fields: [
    q.number('max_per_day', 'Most ceremonies per day', { required: true, min: 1, max: 10 }),
    q.number('prep_minutes', 'Preparation before each ceremony', { min: 0, max: 600, suffix: 'minutes' }),
    q.number('min_notice_days', 'Minimum notice', { required: true, min: 0, max: 90, suffix: 'days' }),
    q.single('travel_stay', 'Out-of-town travel & stay', ['Customer arranges', 'Charged separately', 'Not available']),
  ] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'custom_ritual', label: 'Ritual not in your list' }, { id: 'multi_day', label: 'Multi-day ceremonies' }],
  quoteTemplate: ['Ceremony fee', 'Assistant priests', 'Materials', 'Travel & stay'],
  readiness: ['At least one ceremony priced with a duration', 'Notice, preparation and daily limit set'],
}
