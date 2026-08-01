// SAMBRAMO Brand Configuration
export const BRAND = {
  name: 'Sambramo',
  tagline: 'Your Moment. Our Magic.',
  promise: 'You Celebrate. We Handle Everything.',
  supportPhone: '+91 98765 00001',
  supportEmail: 'hello@sambramo.in',
  whatsappNumber: '919876500001',
  primaryCity: 'Bengaluru',
  servicedCities: ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Surat'],
}

export const MVP_MODE = true  // Human-assisted concierge model

export const EVENT_TYPES = [
  { id: 'birthday',          label: 'Birthday',          emoji: '🎂', tagline: 'Another year. Another beautiful memory.' },
  { id: 'baby-shower',       label: 'Baby Shower',       emoji: '👶', tagline: 'Celebrating the little one before the big hello.' },
  { id: 'naming-ceremony',   label: 'Naming Ceremony',   emoji: '✨', tagline: 'A beautiful beginning deserves a beautiful celebration.' },
  { id: 'anniversary',       label: 'Anniversary',       emoji: '💍', tagline: 'Celebrate the journey. Relive the memories.' },
  { id: 'housewarming',      label: 'Housewarming',      emoji: '🏠', tagline: 'A new home. A new chapter.' },
  { id: 'engagement',        label: 'Engagement',        emoji: '💫', tagline: 'The beginning of forever.' },
  { id: 'wedding',           label: 'Wedding',           emoji: '👑', tagline: 'Your once-in-a-lifetime celebration, beautifully handled.' },
  { id: 'festival',          label: 'Festival',          emoji: '🪔', tagline: 'Bring tradition, family and celebration together.' },
  { id: 'get-together',      label: 'Get-Together',      emoji: '🥂', tagline: 'Because every reunion deserves to be special.' },
  { id: 'corporate',         label: 'Corporate Event',   emoji: '🏢', tagline: 'Professional events, beautifully executed.' },
  { id: 'other',             label: 'Other',             emoji: '🎊', tagline: 'Every celebration is unique — tell us yours.' },
]

export const BUDGET_OPTIONS = [
  { label: 'Under ₹10,000',         min: 0,       max: 10000  },
  { label: '₹10,000 – ₹25,000',     min: 10000,   max: 25000  },
  { label: '₹25,000 – ₹50,000',     min: 25000,   max: 50000  },
  { label: '₹50,000 – ₹1,00,000',   min: 50000,   max: 100000 },
  { label: '₹1,00,000 – ₹2,00,000', min: 100000,  max: 200000 },
  { label: '₹2,00,000 – ₹5,00,000', min: 200000,  max: 500000 },
  { label: '₹5,00,000+',            min: 500000,  max: null   },
  { label: 'Flexible',              min: null,    max: null   },
]

export const SERVICE_CATEGORIES = [
  {
    category: 'Venue',
    emoji: '🏛️',
    services: ['Venue', 'Party hall', 'Marriage hall', 'Restaurant', 'Resort', 'Home setup'],
  },
  {
    category: 'Decoration',
    emoji: '🎨',
    services: ['Birthday decoration', 'Baby shower decoration', 'Balloon decoration', 'Floral decoration', 'Stage', 'Backdrop', 'Theme decoration'],
  },
  {
    category: 'Food',
    emoji: '🍽️',
    services: ['Catering', 'Buffet', 'Snacks', 'Traditional food', 'Live counters', 'Cake', 'Sweets'],
  },
  {
    category: 'Entertainment',
    emoji: '🎵',
    services: ['DJ', 'Music', 'Anchor', 'Games', 'Magic show', 'Kids entertainment', 'Live music'],
  },
  {
    category: 'Photography',
    emoji: '📸',
    services: ['Photography', 'Videography', 'Pre-event shoot', 'Drone'],
  },
  {
    category: 'Personal',
    emoji: '💄',
    services: ['Makeup', 'Mehendi', 'Hair styling', 'Priest', 'Ritual services'],
  },
  {
    category: 'Rentals',
    emoji: '🪑',
    services: ['Chairs', 'Tables', 'Lighting', 'Sound', 'Pandal', 'Crockery'],
  },
  {
    category: 'Other',
    emoji: '🎁',
    services: ['Invitations', 'Return gifts', 'Transportation', 'Cleaning', 'Security', 'Custom requirement'],
  },
]

export const EVENT_STATUSES = {
  REQUEST_RECEIVED:          { label: 'Request Received',        color: 'blue',   icon: '📥' },
  UNDER_REVIEW:              { label: 'Under Review',            color: 'yellow', icon: '🔍' },
  CONTACTING_VENDORS:        { label: 'Contacting Vendors',      color: 'orange', icon: '📞' },
  QUOTES_COLLECTED:          { label: 'Quotes Collected',        color: 'amber',  icon: '📋' },
  PROPOSAL_PREPARED:         { label: 'Proposal Ready',         color: 'purple', icon: '📄' },
  PROPOSAL_SENT:             { label: 'Proposal Sent',           color: 'violet', icon: '📤' },
  CUSTOMER_REVIEW:           { label: 'Your Review Needed',      color: 'indigo', icon: '👀' },
  CUSTOMER_CHANGES_REQUESTED:{ label: 'Changes Requested',       color: 'rose',   icon: '✏️' },
  APPROVED:                  { label: 'Approved',                color: 'green',  icon: '✅' },
  CONFIRMED:                 { label: 'Confirmed',               color: 'green',  icon: '🎉' },
  IN_COORDINATION:           { label: 'In Coordination',         color: 'teal',   icon: '🤝' },
  EVENT_DAY:                 { label: 'Event Day',               color: 'pink',   icon: '🌟' },
  COMPLETED:                 { label: 'Completed',               color: 'gray',   icon: '✨' },
  CANCELLED:                 { label: 'Cancelled',               color: 'red',    icon: '❌' },
}

export const CUSTOMER_TIMELINE = [
  { key: 'submitted',   label: 'You told us your dream',         icon: '✨' },
  { key: 'reviewing',  label: 'Sambramo is reviewing',          icon: '🔍' },
  { key: 'sourcing',   label: 'Finding the right people',       icon: '🤝' },
  { key: 'proposal',   label: 'Your plan is being prepared',    icon: '📋' },
  { key: 'approved',   label: 'Celebration confirmed',          icon: '✅' },
  { key: 'event_day',  label: 'Event day',                      icon: '🎉' },
  { key: 'memories',   label: 'Memories made',                  icon: '💫' },
]

// CSS class mappings for status badges
export const STATUS_CSS = {
  REQUEST_RECEIVED:          { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  UNDER_REVIEW:              { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  CONTACTING_VENDORS:        { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  QUOTES_COLLECTED:          { bg: 'bg-purple-100',  text: 'text-purple-700'  },
  PROPOSAL_PREPARED:         { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  PROPOSAL_SENT:             { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  CUSTOMER_REVIEW:           { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  CUSTOMER_CHANGES_REQUESTED:{ bg: 'bg-rose-100',    text: 'text-rose-700'    },
  APPROVED:                  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CONFIRMED:                 { bg: 'bg-teal-100',    text: 'text-teal-700'    },
  IN_COORDINATION:           { bg: 'bg-cyan-100',    text: 'text-cyan-700'    },
  EVENT_DAY:                 { bg: 'bg-pink-100',    text: 'text-pink-700'    },
  COMPLETED:                 { bg: 'bg-gray-100',    text: 'text-gray-600'    },
  CANCELLED:                 { bg: 'bg-red-100',     text: 'text-red-600'     },
}

// Priority definitions
export const PRIORITIES = {
  URGENT: { label: 'Urgent', dot: 'bg-red-500',    text: 'text-red-600'    },
  HIGH:   { label: 'High',   dot: 'bg-orange-500', text: 'text-orange-600' },
  NORMAL: { label: 'Normal', dot: 'bg-blue-400',   text: 'text-blue-600'   },
  LOW:    { label: 'Low',    dot: 'bg-gray-400',   text: 'text-gray-500'   },
}

// Ordered workflow stages for progress bar
export const STATUS_ORDER = [
  'REQUEST_RECEIVED',
  'UNDER_REVIEW',
  'CONTACTING_VENDORS',
  'PROPOSAL_SENT',
  'CUSTOMER_REVIEW',
  'APPROVED',
  'CONFIRMED',
  'IN_COORDINATION',
  'COMPLETED',
]

// Quick emoji lookup keyed by event type string
export const EVENT_TYPE_EMOJIS = Object.fromEntries(
  EVENT_TYPES.map(e => [e.id, e.emoji])
)

// Tailwind gradient pairs by event type
export const EVENT_TYPE_GRADIENTS = {
  wedding:         'from-pink-400 to-rose-500',
  birthday:        'from-amber-400 to-orange-500',
  anniversary:     'from-rose-400 to-pink-600',
  engagement:      'from-purple-500 to-indigo-600',
  'baby-shower':   'from-blue-400 to-cyan-500',
  'naming-ceremony':'from-sky-400 to-blue-500',
  corporate:       'from-slate-500 to-gray-700',
  graduation:      'from-emerald-500 to-teal-600',
  festival:        'from-orange-400 to-amber-500',
  housewarming:    'from-green-500 to-emerald-600',
  'get-together':  'from-violet-500 to-purple-600',
  other:           'from-indigo-500 to-purple-600',
}

// Default tasks seeded when an event is first confirmed
export const DEFAULT_TASKS = [
  'Confirm venue',
  'Confirm decorator',
  'Confirm caterer',
  'Confirm photographer',
  'Confirm cake',
  'Collect advance payment',
  'Confirm vendor arrival times',
  'Event day coordination',
  'Collect final payment',
  'Post-event review',
]
