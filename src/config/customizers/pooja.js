import { scaledOptions } from './engine'

// Pooja & Essentials: the questions a purohit would ask you on the phone.
//
// This category is not decorative and it is not generic. A pooja kit that
// arrives after the muhurat has passed is worthless, samagri assembled for a
// North Indian rite is not what a Tamil household needs, and a sankalp cannot
// be performed without the name and gotra. Those are not preferences; they
// are the difference between a usable order and a wasted one.
//
// So the groups here are deliberately not the gift-shop set. There is no
// "colour theme". There is tradition, completeness, timing, and the one field
// that a family will notice is missing if we don't ask for it.

// Language decides the chants, and in practice which purohit we can send.
// Listed by what a customer would call it, not by linguistic family.
const TRADITIONS = [
  { id: 'north',     label: 'North Indian — Hindi and Sanskrit', price: 0, default: true },
  { id: 'tamil',     label: 'Tamil',      price: 0 },
  { id: 'telugu',    label: 'Telugu',     price: 0 },
  { id: 'kannada',   label: 'Kannada',    price: 0 },
  { id: 'malayalam', label: 'Malayalam',  price: 0 },
  { id: 'marathi',   label: 'Marathi',    price: 0 },
  { id: 'bengali',   label: 'Bengali',    price: 0 },
  { id: 'gujarati',  label: 'Gujarati',   price: 0 },
]

// Completeness, not "size" — the question is whether you already have the
// thali and the brass, or whether this is the first pooja in a new house.
const KIT_STEPS = [1, 2, 3]
const KIT_MULTIPLIER = { 1: 1, 2: 1.65, 3: 2.4 }
const KIT_LABEL = {
  1: 'Essentials only',
  2: 'Standard kit',
  3: 'Complete kit, including havan samagri',
}
const KIT_NOTE = {
  1: 'You already have the thali and vessels',
  2: 'Samagri, thali items and offerings',
  3: 'Everything, including the havan kund and ghee',
}

// The one that is genuinely time-critical. Priced where it costs more to
// staff, free where it doesn't.
const MUHURAT = [
  { id: 'brahma',  label: 'Brahma muhurat — 4am to 6am', price: 299,
    note: 'We deliver the night before so nothing is late' },
  { id: 'morning', label: 'Morning — 6am to 10am', price: 0, default: true },
  { id: 'midday',  label: 'Midday — 10am to 1pm',  price: 0 },
  { id: 'evening', label: 'Evening — 5pm to 8pm',  price: 0 },
]

const OFFERINGS = [
  { id: 'garland',  label: 'Marigold garland (pair)',        price: 100 },
  { id: 'petals',   label: 'Rose petals (500 g)',            price: 80 },
  { id: 'banana',   label: 'Banana leaves (set of 6)',       price: 120 },
  { id: 'coconut',  label: 'Coconuts (pair)',                price: 40 },
  { id: 'fruit',    label: 'Fresh fruit offering basket',    price: 450 },
  { id: 'prasad',   label: 'Prasad sweets box (1 kg)',       price: 350 },
  { id: 'panchamrit', label: 'Panchamrit ingredients kit',   price: 180 },
]

const SERVICES = [
  { id: 'pandit',   label: 'Book an experienced purohit',    price: 3500,
    note: 'Roughly two hours, in the language chosen above' },
  { id: 'setup',    label: 'We arrange the altar before you begin', price: 699 },
  { id: 'flowers',  label: 'Fresh flower rangoli at the entrance',  price: 549 },
]

// Only a kit can be more or less complete. A single brass bell cannot.
const KIT_APPLIES  = /kit|samagri|set|thali|combo|pooja|puja|havan|yagna/i
// A pandit is for a ceremony, not for a box of incense.
const RITUAL_APPLIES = /pooja|puja|havan|yagna|ceremony|pravesh|satyanarayan|abhishek|homa|vratham/i

export function buildPoojaOptionGroups(product) {
  const name   = `${product.name ?? ''} ${product.occasion ?? ''}`
  const groups = []

  groups.push({
    id: 'tradition',
    label: 'Which tradition?',
    hint: 'Decides the samagri, the chants and the purohit we send',
    type: 'single',
    required: true,
    role: 'spec',
    options: TRADITIONS,
  })

  if (KIT_APPLIES.test(name)) {
    groups.push({
      id: 'kit',
      label: 'How complete should the kit be?',
      type: 'single',
      required: true,
      role: 'spec',
      options: scaledOptions({
        steps: KIT_STEPS,
        multipliers: KIT_MULTIPLIER,
        current: 1,
        price: product.price,
        label: step => KIT_LABEL[step],
        note: step => KIT_NOTE[step],
      }),
    })
  }

  groups.push({
    id: 'muhurat',
    label: 'When is the muhurat?',
    hint: 'Everything reaches you at least two hours before it',
    type: 'single',
    required: true,
    role: 'schedule',
    options: MUHURAT,
  })

  // The field nobody else asks for, and the one a family notices is missing.
  // Without a name and gotra the purohit cannot perform the sankalp, and the
  // alternative is a phone call at 5am on the morning of the ceremony.
  if (RITUAL_APPLIES.test(name)) {
    groups.push({
      id: 'sankalp',
      label: 'Name and gotra for the sankalp',
      hint: 'Optional — but the purohit will need it, and asking now saves a call on the morning',
      type: 'text',
      role: 'note',
      maxLength: 70,
      placeholder: 'e.g. "Ramesh Kumar, Kashyapa gotra"',
    })

    groups.push({ id: 'services', label: 'Add a purohit or setup', type: 'multi', max: 3, role: 'addon', options: SERVICES })
  }

  groups.push({ id: 'offerings', label: 'Flowers, fruit and prasad', type: 'multi', max: 5, role: 'addon', options: OFFERINGS })

  groups.push({
    id: 'freshness',
    label: 'On freshness',
    type: 'info',
    text: 'Flowers, fruit and prasad are sourced the same morning. Dry samagri may arrive a day earlier so nothing depends on one delivery running late.',
  })

  return groups
}
