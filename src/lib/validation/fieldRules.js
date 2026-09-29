import { checkIdentity } from './identity'
import { VENDOR_CATEGORIES } from '../../config/vendor'

/**
 * Every text box a partner can type into, and what belongs in it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE REGISTRY, READ BY THE SCREEN AND BY THE TESTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The six setup steps had, between them, exactly two pieces of
 * validation: `.replace(/\D/g, '')` on two numeric fields. Everything
 * else -- the business name, the phone, the description, the UPI id, the
 * account number -- took whatever was typed and wrote it to the
 * database. A partner could submit a name of "1", a phone number of
 * "hello", and a nine-digit account number, and nothing anywhere would
 * say a word until a customer could not reach them.
 *
 * The rules live here rather than in the components because three
 * different things need the same answer:
 *
 *   the input      to show the message as somebody types
 *   the step       to decide whether Continue is allowed
 *   the test suite to prove all of it, without a browser
 *
 * A rule written in a component can only ever be checked by a human
 * looking at a screen. `check-partner-input-rules.mjs` runs every case
 * below in about a second.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MESSAGE IS THE FEATURE
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Invalid input" tells somebody they are wrong and nothing else. Every
 * message here names what was ACTUALLY typed and what to do instead:
 *
 *   "That is 9 digits. An Indian mobile number has 10."
 *   "There is a number in there. A business name should not have one."
 *   "That is an email address. This box wants a phone number."
 *
 * The last kind matters most: somebody who has put the right thing in
 * the wrong box does not need to be told the format, they need to be
 * told they are in the wrong box.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE SEVERITIES, NOT TWO
 * ══════════════════════════════════════════════════════════════════════
 *
 *   error    blocks Continue. The data would be wrong.
 *   warn     does not block. The data is unusual but might be right --
 *            a mononym, a 40-year-old business, a name with a number in
 *            it that is genuinely part of the name ("Hotel 7 Hills").
 *   ok
 *
 * Blocking on `warn` is how a validator starts refusing real people.
 * Indian names in particular defeat most western validators: single
 * names, initials with full stops, matronyms, and businesses whose
 * legal name contains digits are all normal here.
 */

export const SEVERITY = { OK: 'ok', WARN: 'warn', ERROR: 'error' }

const ok = () => ({ severity: SEVERITY.OK, says: null, rule: null })
const err = (rule, says) => ({ severity: SEVERITY.ERROR, says, rule })
const warn = (rule, says) => ({ severity: SEVERITY.WARN, says, rule })

/* ── Things people put in the wrong box ───────────────────────────────
   Detected FIRST, everywhere, because "that is an email address" is a
   better message than any format complaint. */
const LOOKS_LIKE = [
  { id: 'email', test: v => /\S+@\S+\.\S+/.test(v), noun: 'an email address' },
  { id: 'url', test: v => /^(https?:\/\/|www\.)/i.test(v), noun: 'a web address' },
  { id: 'ifsc', test: v => /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v.replace(/\s/g, '')), noun: 'an IFSC code' },
  { id: 'pan', test: v => /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(v.replace(/\s/g, '')), noun: 'a PAN' },
  { id: 'upi', test: v => /^[\w.\-]{2,}@[a-z]{3,}$/i.test(v.trim()), noun: 'a UPI id' },
  { id: 'pincode', test: v => /^\d{6}$/.test(v.replace(/\s/g, '')), noun: 'a pincode' },
  { id: 'phone', test: v => /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')), noun: 'a phone number' },
]

function misplaced(value, exceptIds = []) {
  const v = String(value).trim()
  for (const c of LOOKS_LIKE) {
    if (exceptIds.includes(c.id)) continue
    if (c.test(v)) return c
  }
  return null
}

/* ══════════════════════════════════════════════════════════════════════
   NOTHING TYPED IS QUIETLY TURNED INTO SOMETHING ELSE
   ══════════════════════════════════════════════════════════════════════

   Every numeric field used to normalise with `.replace(/\D/g, '')`, which
   is a rewrite, not a clean-up: "98x4500000 0" became 9845000000, a valid
   number the partner never typed; "5600a01" became 560001; "-5" years
   became 5 and "1e3" became 13. The field then showed a tick.

   Now a normaliser removes only what the field's own contract calls
   formatting (spaces and hyphens; for a phone, the +91 / 0091 / 0
   prefixes the old rule documented), and anything else stays in the
   value, where the rule refuses it and names the character. */
const stripSeparators = (v, re = /[\s-]/g) => String(v ?? '').normalize('NFC').trim().replace(re, '')

function describeChar(c) {
  if (/\s/u.test(c)) return 'a space'
  if (/[\u{0}-\u{1F}\u{7F}-\u{9F}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}-\u{206F}\u{FEFF}]/u.test(c)) return 'an invisible character'
  return `"${c}"`
}

/* The first character that is not a digit, said so a person can find
   it. Never the whole value: in an Aadhaar or account box that would put
   an identity or bank number into an error message. */
function nonDigit(v, noun) {
  const bad = [...v].find(c => !/[0-9]/.test(c))
  if (bad === undefined) return null
  const d = describeChar(bad)
  return err('nondigit', `${d[0].toUpperCase()}${d.slice(1)} is not a digit. ${noun} is digits only.`)
}

/* ── Guards every free-text field shares ─────────────────────────────
   Control characters arrive by paste (a PDF, a spreadsheet, a chat app)
   and are invisible on screen but not in a database, a CSV or an SMS.
   Markup is refused because these values are shown to customers and to
   operators; React renders it inert, but an operator's CSV export or a
   future email template might not, and no real business name, note or
   caption needs a tag. Ordinary prose punctuation is untouched. */
const CONTROL_ANY = /[\u{0}-\u{1F}\u{7F}-\u{9F}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}-\u{206F}\u{FEFF}]/u
const CONTROL_PROSE = /[\u{0}-\u{9}\u{B}\u{C}\u{E}-\u{1F}\u{7F}-\u{9F}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}-\u{206F}\u{FEFF}]/u
const MARKUP = /<\s*\/?\s*[a-z!?][^>]*>|<\s*script|javascript\s*:|\bon[a-z]{3,}\s*=/i

export function textGuard(v, { prose = false } = {}) {
  if ((prose ? CONTROL_PROSE : CONTROL_ANY).test(v)) {
    return err('control', 'There is an invisible character in there, usually from pasting. Please retype it.')
  }
  if (MARKUP.test(v)) return err('markup', 'That looks like code or a web tag. Please use plain words.')
  return null
}

/* One line: runs of spaces become one, ends trimmed. Prose keeps its
   paragraph breaks but not a wall of empty lines. NFC throughout, so a
   Kannada or accented name typed on two keyboards is stored one way. */
const SPACES = /[ \t\u{A0}]+/gu
const cleanLine = v => String(v ?? '').normalize('NFC').replace(SPACES, ' ').trim()
const cleanProse = v => String(v ?? '').normalize('NFC').replace(/\r\n?/g, '\n').replace(SPACES, ' ')
  .replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()

/** Characters, not UTF-16 units. */
export const charLength = v => [...String(v ?? '')].length

/* ── Shared shapes ───────────────────────────────────────────────── */

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u
/* Devanagari through Sinhala: Kannada, Tamil, Telugu, Malayalam,
   Bengali, Gujarati, Gurmukhi, Odia. A partner is entitled to their own
   script. */
const INDIC = /[\u{900}-\u{DFF}]/u
/* Digits ARE allowed by the character class. "Hotel 7 Hills" and "A1
   Decorators" are real businesses, and a charset rule that rejected them
   would never reach the softer `has_digit` warning below it. Fields that
   genuinely must not contain a digit (a person's name) test for one
   themselves, before this. */
const NAME_OK = /^[\p{L}\p{M}\d][\p{L}\p{M}\d\s.'&,\-/()]*$/u
const PERSON_OK = /^[\p{L}\p{M}][\p{L}\p{M}\s.'\-]*$/u

/* ── Phones ──────────────────────────────────────────────────────── */

/* What the phone boxes have always accepted: spaces, hyphens, +91,
   0091, a bare 91 on a twelve-digit number, a leading 0. Nothing else is
   removed, so a letter in the middle is refused rather than dropped. */
function normalisePhone(v) {
  let d = String(v ?? '').normalize('NFC').trim().replace(/[\s-]/g, '')
  if (d.startsWith('+91')) d = d.slice(3)
  else if (d.startsWith('0091')) d = d.slice(4)
  else if (/^91\d{10}$/.test(d)) d = d.slice(2)
  else if (/^0\d{10}$/.test(d)) d = d.slice(1)
  return d
}

function phoneShape(v, ctx = {}) {
  if (!/^\d+$/.test(v)) {
    const raw = String(ctx.__raw ?? v).trim()
    const wrong = misplaced(raw, ['phone', 'pincode'])
    if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants a 10-digit mobile number.`)
    if (/^\+/.test(v)) return err('country', 'Only Indian mobile numbers (+91) can be used here.')
    if (/^[^\d]+$/.test(v)) return err('nondigit', 'That has no digits in it. This box wants a 10-digit mobile number.')
    return nonDigit(v, 'A phone number')
  }
  if (v.length < 10) return err('short', `That is ${v.length} digit${v.length === 1 ? '' : 's'}. An Indian mobile number has 10.`)
  if (v.length > 10) return err('long', `That is ${v.length} digits. An Indian mobile number has 10 — drop the country code if you added it.`)
  /* TRAI allocates mobile numbers starting 6, 7, 8 or 9. A landline in
     this box is a real mistake: the app sends OTPs and job alerts by SMS. */
  if (!/^[6-9]/.test(v)) {
    return err('series', `An Indian mobile number starts with 6, 7, 8 or 9. Yours starts with ${v[0]} — is that a landline?`)
  }
  if (/^(\d)\1{9}$/.test(v)) return err('repeated', 'That is the same digit ten times.')
  if (v === '1234567890' || v === '9876543210') return err('sequence', 'That is a test number, not a real one.')
  return ok()
}

/* ── Whole numbers ───────────────────────────────────────────────── */

/* A whole number, written as digits. Refuses "-5", "5.5", "1e3", "٣",
   "12abc" and "Infinity" by name rather than quietly keeping the digits. */
function wholeNumber(v, noun) {
  if (/^[+-]/.test(v)) return err('sign', `${noun} cannot be negative or signed. Enter just the number.`)
  if (/^\d+[.,]\d+$/.test(v)) return err('decimal', `${noun} is a whole number, not a fraction.`)
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(v)) return err('exponent', 'Please type the number out in full.')
  const bad = nonDigit(v, noun)
  if (bad) return bad
  if (v.length > 7) return err('huge', 'That number is far too long.')
  return null
}

/* An amount in rupees: digits, with the Indian comma grouping and a ₹
   allowed as formatting, and up to two decimals. */
function normaliseAmount(v) {
  return String(v ?? '').normalize('NFC').trim().replace(/^₹\s*/, '').replace(/,(?=\d)/g, '').replace(/\s+/g, '')
}

function rupees(v, { noun = 'An amount', min = 1, max = 9999999, decimals = true } = {}) {
  if (/^-/.test(v)) return err('negative', `${noun} cannot be negative.`)
  if (/e/i.test(v) && /^\d/.test(v)) return err('exponent', 'Please type the amount out in full, like 5000.')
  const shape = decimals ? /^\d+(\.\d{1,2})?$/ : /^\d+$/
  if (!shape.test(v)) {
    if (/^\d+\.\d{3,}$/.test(v)) return err('precision', 'Rupees and paise only — at most two digits after the point.')
    if (decimals === false && /^\d+\.\d+$/.test(v)) return err('decimal', `${noun} is in whole rupees.`)
    return err('shape', 'Enter an amount in rupees, like 5000.')
  }
  const n = Number(v)
  if (!Number.isFinite(n)) return err('shape', 'Enter an amount in rupees, like 5000.')
  if (n < min) return err(n === 0 ? 'zero' : 'min', n === 0 ? `${noun} of zero reads as a mistake.` : `${noun} must be at least ₹${min.toLocaleString('en-IN')}.`)
  if (n > max) return err('max', `₹${n.toLocaleString('en-IN')} is above the most this box takes, ₹${max.toLocaleString('en-IN')}. Check you have not added a zero.`)
  return null
}

/* ── Short free text: a note, a caption, a name of a thing ───────────── */

function shortText(v, { noun, max, min = 1, required = false, prose = false, allowContact = true }) {
  if (!v) return required ? err('required', `${noun} cannot be blank.`) : ok()
  const guard = textGuard(v, { prose })
  if (guard) return guard
  if (EMOJI.test(v) && !prose) return err('emoji', `Please use words, not emoji, in ${noun.toLowerCase()}.`)
  const n = charLength(v)
  if (n < min) return err('short', `${noun} needs at least ${min} characters.`)
  if (n > max) return err('long', `That is ${n} characters. ${noun} can be at most ${max}.`)
  if (!allowContact) {
    const run = v.match(/(?:^|\D)((?:[6-9])(?:[\s-]?\d){9})(?:\D|$)/)
    if (run) return err('contact', 'There is a phone number in there. Contact details are shared once a job is confirmed.')
    if (/\S+@\S+\.\S+/.test(v)) return err('contact', 'There is an email address in there. Contact details are shared once a job is confirmed.')
  }
  if (/(.)\1{9,}/u.test(v)) return err('mashed', 'That looks like a slip of the keyboard.')
  return ok()
}

/* A person's name: letters in any script, spaces, full stops for
   initials, apostrophes and hyphens. No digits. A single name is normal
   in much of India and is never refused. */
function personName(v, { noun = 'A name', max = 60, required = true } = {}) {
  if (!v) return required ? err('required', `${noun} cannot be blank.`) : ok()
  const guard = textGuard(v)
  if (guard) return guard
  const wrong = misplaced(v, [])
  if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants a person's name.`)
  if (/\d/.test(v)) return err('digit', 'There is a number in there. A person\'s name does not have one.')
  if (EMOJI.test(v)) return err('emoji', 'Please use letters, not emoji, in a name.')
  const n = charLength(v)
  if (n < 2) return err('short', 'That is too short to be a name.')
  if (n > max) return err('long', `That is ${n} characters. Please keep a name under ${max}.`)
  if (!PERSON_OK.test(v)) {
    const bad = [...v].find(c => !/[\p{L}\p{M}\s.'\-]/u.test(c))
    return err('charset', bad ? `${describeChar(bad)} is not something a name has in it.` : 'That has characters a name does not usually have.')
  }
  return ok()
}

/* ── Dates, as the pickers produce them ──────────────────────────────── */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* A real calendar date: "2026-02-30" is refused, not rolled into March. */
function realDate(v) {
  const m = ISO_DATE.exec(v)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 1900 && y <= 2100
}

function dateShape(v, noun) {
  if (!realDate(v)) return err('date', `That is not a real date. Pick ${noun} from the calendar.`)
  return null
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

/* A digits-only field: say "that is an email" before "that is a letter". */
function digitsOnly(v, ctx, noun, wants, own = []) {
  if (/^\d+$/.test(v)) return null
  const raw = String(ctx?.__raw ?? v).trim()
  const wrong = misplaced(raw, own)
  if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants ${wants}.`)
  if (/^[^\d]+$/.test(v)) return err('nondigit', `That has no digits in it. This box wants ${wants}.`)
  return nonDigit(v, noun)
}

export const FIELD_RULES = {

  /* ═══════════════ STEP 2 · Partner details ═══════════════ */

  business_name: {
    step: 'details',
    label: 'Business name',
    required: true,
    max: 80,
    /* Trimmed, inner runs of spaces collapsed, NFC. "Anna   Ruchi" and
       "Anna Ruchi" are the same business and must not become two rows a
       search can only find one of. */
    normalise: cleanLine,
    validate(v) {
      if (!v) return err('required', 'A customer sees this name on your offer. It cannot be blank.')
      const guard = textGuard(v)
      if (guard) return guard

      const wrong = misplaced(v, [])
      if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants the name of your business.`)

      if (EMOJI.test(v)) return err('emoji', 'Emoji do not print on an invoice. Please use words.')
      const n = charLength(v)
      if (n < 3) return err('short', `"${v}" is ${n} character${n === 1 ? '' : 's'}. A business name needs at least 3.`)
      if (n > 80) return err('long', `That is ${n} characters. Please keep it under 80.`)

      if (/^\d+$/.test(v)) return err('numeric', 'That is only numbers. A business name needs words in it.')

      if (!NAME_OK.test(v) && !INDIC.test(v)) {
        const bad = [...v].find(c => !/[\p{L}\p{M}\s.'&,\-/()0-9]/u.test(c))
        return err('charset', bad
          ? `${describeChar(bad)} is not something a business name usually has in it.`
          : 'That has characters a business name does not usually have.')
      }

      /* A digit is NOT an error. "Hotel 7 Hills", "24 Carat Events" and
         "A1 Decorators" are real businesses. It is worth one look, not a
         refusal -- which is the whole reason `warn` exists. */
      if (/\d/.test(v)) {
        return warn('has_digit', 'There is a number in your business name. That is fine if it is really part of it — just checking.')
      }

      if (/(.)\1{4,}/u.test(v)) return err('mashed', 'That looks like a slip of the keyboard.')
      return ok()
    },
  },

  contact_phone: {
    step: 'details',
    label: 'Phone number',
    required: true,
    normalise: normalisePhone,
    validate(v, ctx = {}) {
      if (!v) return err('required', 'This is the number a customer rings on the day. It cannot be blank.')
      return phoneShape(v, ctx)
    },
  },

  contact_email: {
    step: 'details',
    label: 'Email',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim().toLowerCase(),
    validate: v => (v ? emailShape(v) : ok()),
  },

  years_active: {
    step: 'details',
    label: 'Years doing this',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'Years')
      if (bad) return bad
      const n = Number(v)
      if (n > 75) return err('impossible', `${n} years is longer than almost any business has existed. Did you type the year instead?`)
      if (n > 50) return warn('long', `${n} years is a long time — that is worth saying on your profile.`)
      return ok()
    },
  },

  description: {
    step: 'details',
    label: 'About your work',
    required: false,
    max: 600,
    normalise: cleanProse,
    validate(v) {
      if (!v) return ok()
      const guard = textGuard(v, { prose: true })
      if (guard) return guard
      const n = charLength(v)
      if (n > 600) return err('long', `That is ${n} characters. Please keep it under 600.`)
      /* A phone number or email in the description is how a partner gets
         taken off-platform, which is also how they lose the escrow
         protection they are being promised. Said plainly. Looked for in
         the original text, because stripping separators first glues the
         number to the words around it and \b never matches. */
      const run = v.match(/(?:^|\D)((?:[6-9])(?:[\s-]?\d){9})(?:\D|$)/)
      if (run && /^[6-9]\d{9}$/.test(run[1].replace(/[\s-]/g, ''))) {
        return err('contact', 'There is a phone number in there. Customers get your number when a job is confirmed — it does not go in your description.')
      }
      if (/\S+@\S+\.\S+/.test(v)) {
        return err('contact', 'There is an email address in there. Please take it out — contact details are shared once a job is confirmed.')
      }
      if (/(.)\1{6,}/u.test(v)) return err('mashed', 'That looks like a slip of the keyboard.')
      if (n < 20) return warn('thin', `${n} characters is not much to go on. A customer choosing between two partners reads this.`)
      return ok()
    },
  },

  instagram_url: {
    step: 'details',
    label: 'Instagram',
    required: false,
    /* People paste the whole URL, the handle, or the handle with an @.
       All three become a handle. The trailing path is stripped ONLY when
       the input actually looked like a URL; a slash in something that is
       not a URL is an error, and it says so. */
    normalise: v => {
      const raw = String(v ?? '').normalize('NFC').trim()
      const wasUrl = /^(https?:\/\/|www\.|instagram\.com\/)/i.test(raw)
      const bare = raw
        .replace(/^https?:\/\//i, '').replace(/^www\./i, '')
        .replace(/^instagram\.com\//i, '').replace(/^@/, '')
      return (wasUrl ? bare.replace(/[/?].*$/, '') : bare).trim()
    },
    validate(v) {
      if (!v) return ok()
      if (/\s/.test(v)) return err('space', 'An Instagram handle has no spaces in it.')
      if (v.length > 30) return err('long', 'An Instagram handle is at most 30 characters.')
      if (!/^[\w.]+$/.test(v)) return err('charset', 'An Instagram handle is letters, numbers, dots and underscores.')
      return ok()
    },
  },

  /* ═══════════════ STEP 3 · Service area ═══════════════ */

  pincode: {
    step: 'area',
    label: 'Pincode',
    required: true,
    normalise: v => stripSeparators(v, /\s/g),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'We need a pincode to know which jobs to send you.')
      const shape = digitsOnly(v, ctx, 'A pincode', 'a 6-digit pincode', ['pincode'])
      if (shape) return shape
      if (v.length < 6) return err('short', `That is ${v.length} digit${v.length === 1 ? '' : 's'}. An Indian pincode has 6.`)
      if (v.length > 6) return err('long', `That is ${v.length} digits. An Indian pincode has 6.`)
      /* The first digit is the postal zone, 1-8. 0 and 9 are not issued. */
      if (v[0] === '0' || v[0] === '9') return err('zone', `No Indian pincode starts with ${v[0]}.`)
      return ok()
    },
  },

  /**
   * How many jobs a partner will take on one day. The floor is the part
   * that matters: a LIMITED day with a limit of zero is a blocked day
   * that does not look blocked. Refused, not clamped.
   */
  daily_slots: {
    step: 'availability',
    label: 'Jobs a day',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'Jobs a day')
      if (bad) return bad
      const n = Number(v)
      if (n === 0) return err('zero', 'Zero jobs is a blocked day. Choose Blocked instead, so you can see why the work stopped.')
      if (n > 12) return err('ceiling', `${n} jobs in one day is more than anyone can turn up to. The most is 12.`)
      if (n > 6) return warn('many', `${n} in one day is a lot. Missing one you accepted costs a strike.`)
      return ok()
    },
  },

  /**
   * The lowest a partner will turn out for, in rupees. Warned, not
   * refused, at both ordinary ends -- a premium decorator really may
   * start at two lakh -- but a number no booking could carry is refused.
   */
  starting_price: {
    step: 'details',
    label: 'Starting price',
    required: false,
    normalise: normaliseAmount,
    validate(v) {
      if (!v) return ok()
      /* Whole rupees: `vendors.starting_price` is an INTEGER column, so
         paise typed here would be refused or rounded on the way in. */
      const bad = rupees(v, { noun: 'A starting price', min: 1, max: 9999999, decimals: false })
      if (bad) {
        if (bad.rule === 'zero') return err('zero', 'A starting price of zero reads as a mistake. Leave it blank if you would rather not say.')
        return bad
      }
      const n = Number(v)
      if (n < 500) return warn('low', `₹${n} is below what most partners charge to turn up at all. Is that the whole job?`)
      if (n > 500000) return warn('high', `₹${n.toLocaleString('en-IN')} is a very high starting price. Check you have not added a zero.`)
      return ok()
    },
  },

  /**
   * The neighbourhood a partner works out of. Free text on purpose; what
   * this catches is a full postal address, which this field publishes.
   */
  area: {
    step: 'details',
    label: 'Area',
    required: false,
    normalise: cleanLine,
    validate(v) {
      if (!v) return ok()
      const guard = textGuard(v)
      if (guard) return guard
      if (EMOJI.test(v)) return err('emoji', 'Please use words for the area.')
      const n = charLength(v)
      if (n < 3) return err('short', 'That is too short to be an area name.')
      if (n > 60) return err('long', 'Just the area — Jayanagar, Indiranagar, Whitefield.')
      if (/^\d+$/.test(v)) return err('digits', 'That is a number. Which area is it — Jayanagar, Koramangala?')
      if (/\d{6}/.test(v)) return warn('pincode', 'That looks like a pincode. There is a separate box for it below.')
      if (v.split(',').length > 2) return warn('address', 'This is just the area, not the full address. Customers see it before they see anything else.')
      return ok()
    },
  },

  daily_capacity: {
    step: 'details',
    label: 'Jobs a day',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'Jobs a day')
      if (bad) return bad
      const n = Number(v)
      if (n === 0) return err('zero', 'Zero means you are never offered anything. Pause the listing instead if that is what you want.')
      if (n > 12) return err('ceiling', `${n} jobs on one date is more than anyone can turn up to. The most is 12.`)
      if (n > 4) return warn('many', `${n} on one date means we may offer you all ${n}. Missing one you accepted costs a strike.`)
      return ok()
    },
  },

  website_url: {
    step: 'details',
    label: 'Website',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      if (/\s/.test(v)) return err('space', 'A web address has no spaces in it.')
      if (/^(javascript|data|vbscript|file):/i.test(v)) return err('scheme', 'That is not a web address.')
      if (v.length > 200) return err('long', 'That web address is too long.')
      if (/^@/.test(v) || /instagram\.com/i.test(v)) {
        return warn('instagram', 'That is Instagram — there is a box for it just below, where it will link properly.')
      }
      const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
      let host
      try { host = new URL(withScheme).hostname } catch { return err('shape', 'That does not look like a web address.') }
      if (!host.includes('.')) return err('dot', 'A web address needs a dot in it, like yourname.com.')
      if (host.endsWith('.')) return err('dot_edge', 'That ends in a dot.')
      const tld = host.split('.').pop()
      if (!/^[a-z]{2,}$/i.test(tld)) return err('tld', `".${tld}" is not an ending we recognise.`)
      if (!/^https?:\/\//i.test(v)) return warn('scheme', `We will treat that as ${withScheme}`)
      return ok()
    },
  },

  lead_time_days: {
    step: 'area',
    label: 'Notice you need',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'Days of notice')
      if (bad) return bad
      const n = Number(v)
      if (n > 90) return err('long', `${n} days of notice means you would miss almost every instant booking.`)
      if (n > 30) return warn('high', `${n} days is a lot of notice. You will see far fewer jobs.`)
      return ok()
    },
  },

  /* ═══════════════ STEP 5 · Bank, and More → Bank & payments ═══════════════ */

  upi_id: {
    step: 'bank',
    label: 'UPI id',
    required: true,
    normalise: v => String(v ?? '').normalize('NFC').trim().toLowerCase().replace(/\s/g, ''),
    validate(v) {
      if (!v) return err('required', 'This is where your money goes. It cannot be blank.')
      if (/^\d{10}$/.test(v)) return err('phone', 'That is a phone number. A UPI id has an @ in it, like 9845000000@ybl.')
      if (!v.includes('@')) return err('at', 'A UPI id has an @ in it, like yourname@okhdfcbank.')
      if (v.split('@').length > 2) return err('at_many', 'A UPI id has exactly one @.')
      const [handle, psp] = v.split('@')
      if (!handle) return err('handle', 'There is nothing before the @.')
      if (!psp) return err('psp', 'There is nothing after the @ — that is the bank or app, like ybl or okaxis.')
      if (psp.includes('.')) return err('email', 'That looks like an email address. A UPI id ends in the app name, like @ybl or @okhdfcbank.')
      if (!/^[\w.\-]{2,}$/.test(handle)) return err('handle_charset', 'The part before the @ has an unusual character in it.')
      if (handle.length > 50) return err('long', 'The part before the @ is too long.')
      if (!/^[a-z]{2,}$/.test(psp)) return err('psp_charset', 'The part after the @ is letters only, like ybl, paytm or okicici.')
      return ok()
    },
  },

  account_name: {
    step: 'bank',
    label: 'Name on the account',
    required: true,
    normalise: cleanLine,
    validate(v) {
      if (!v) return err('required', 'The bank checks this against the account. It cannot be blank.')
      const guard = textGuard(v)
      if (guard) return guard
      const wrong = misplaced(v, [])
      if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants the name on the bank account.`)
      if (/\d/.test(v)) return err('digit', 'There is a number in there. A person\'s name does not have one — this is the name printed on the account.')
      if (EMOJI.test(v)) return err('emoji', 'The bank will not match a name with an emoji in it.')
      const n = charLength(v)
      if (n < 2) return err('short', 'That is too short to be a name.')
      if (n > 60) return err('long', `That is ${n} characters. Bank names are at most 60.`)
      if (!NAME_OK.test(v) && !INDIC.test(v)) return err('charset', 'That has characters a name does not usually have.')
      /* A single name is normal in much of India and must not be refused.
         Flagged only because a mismatch here delays a payout. */
      if (!v.includes(' ')) return warn('single', 'One word — make sure that is exactly how it is printed on the account.')
      return ok()
    },
  },

  account_number: {
    step: 'bank',
    label: 'Account number',
    required: true,
    normalise: v => stripSeparators(v),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'This is where your money goes. It cannot be blank.')
      const shape = digitsOnly(v, ctx, 'An account number', 'the digits of your account number')
      if (shape) return shape
      if (v.length < 9) return err('short', `That is ${v.length} digit${v.length === 1 ? '' : 's'}. Indian account numbers are 9 to 18.`)
      if (v.length > 18) return err('long', `That is ${v.length} digits. Indian account numbers are at most 18.`)
      if (/^(\d)\1+$/.test(v)) return err('repeated', 'That is the same digit repeated. Please check the number.')
      return ok()
    },
  },

  /* Typed twice on purpose. A wrong account number is the one mistake on
     this screen that sends real money to a stranger, and it is not
     recoverable. */
  account_number_confirm: {
    step: 'bank',
    label: 'Account number again',
    required: true,
    normalise: v => stripSeparators(v),
    validate(v, { account_number } = {}) {
      if (!v) return err('required', 'Please type the account number a second time.')
      if (account_number && v !== account_number) {
        return err('mismatch', 'These two do not match. Money sent to the wrong account cannot be brought back.')
      }
      return ok()
    },
  },

  ifsc: {
    step: 'bank',
    label: 'IFSC',
    required: true,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/\s/g, ''),
    validate(v) {
      if (!v) return err('required', 'The IFSC tells us which branch to send it to.')
      const r = checkIdentity('ifsc', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  /* ═══════════════ STEP 4 · Identity and compliance ═══════════════ */

  pan: {
    step: 'compliance',
    label: 'PAN',
    required: true,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/\s/g, ''),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'Your PAN decides whether tax is deducted from your payouts. Without it we must deduct more.')
      const r = checkIdentity('pan', v, { surname: ctx.account_name ?? null })
      if (!r.ok) return err(r.reason, r.says)
      if (r.soft) return warn(r.reason, r.says)
      return ok()
    },
  },

  /* More → Bank & payments asks for a PAN "optional for now". The same
     checks as the compliance PAN, once something is typed. */
  payout_pan: {
    step: 'payout',
    label: 'PAN',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/\s/g, ''),
    validate(v, ctx = {}) {
      if (!v) return ok()
      const r = checkIdentity('pan', v, { surname: ctx.account_name ?? null })
      if (!r.ok) return err(r.reason, r.says)
      if (r.soft) return warn(r.reason, r.says)
      return ok()
    },
  },

  aadhaar: {
    step: 'compliance',
    label: 'Aadhaar number',
    required: true,
    normalise: v => stripSeparators(v),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'We need to know who you are before a customer lets you into their home.')
      const shape = digitsOnly(v, ctx, 'An Aadhaar number', 'the 12 digits from your Aadhaar card')
      if (shape) return shape
      const r = checkIdentity('aadhaar', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  gst: {
    step: 'compliance',
    label: 'GSTIN',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/\s/g, ''),
    validate(v, ctx = {}) {
      if (!v) return ok()
      const r = checkIdentity('gst', v, { pan: ctx.pan ?? null })
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  fssai: {
    step: 'compliance',
    label: 'FSSAI licence',
    required: false,
    normalise: v => stripSeparators(v, /\s/g),
    validate(v, ctx = {}) {
      if (!v) return ok()
      const shape = digitsOnly(v, ctx, 'An FSSAI licence number', 'the 14 digits of your FSSAI licence')
      if (shape) return shape
      const r = checkIdentity('fssai', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  dl: {
    step: 'compliance',
    label: 'Driving licence',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/[\s-]/g, ''),
    validate(v) {
      if (!v) return ok()
      const r = checkIdentity('dl', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  rc: {
    step: 'compliance',
    label: 'Vehicle registration',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/[\s-]/g, ''),
    validate(v) {
      if (!v) return ok()
      const r = checkIdentity('rc', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  /* Document capture (step 4 and More → Verification). The number's
     shape comes from the requirement's own `checksumKind`, so an
     Aadhaar rule is never applied to a PAN. `ctx.kind` carries it. */
  doc_number: {
    step: 'compliance',
    label: 'Document number',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').toUpperCase().replace(/[\s-]/g, ''),
    validate(v, ctx = {}) {
      if (!v) return ctx.required ? err('required', 'Please type the number printed on the document.') : ok()
      const guard = textGuard(v)
      if (guard) return guard
      if (ctx.kind) {
        const r = checkIdentity(ctx.kind, v)
        if (!r.ok && r.reason !== 'unknown_kind') return err(r.reason, r.says)
        if (r.ok && r.reason !== 'unknown_kind') return r.soft ? warn(r.reason, r.says) : ok()
      }
      if (!/^[A-Z0-9/.]+$/.test(v)) {
        const bad = [...v].find(c => !/[A-Z0-9/.]/.test(c))
        return err('charset', `${describeChar(bad)} is not part of a document number. Use the letters and digits printed on it.`)
      }
      if (v.length < 4) return err('short', 'That is too short to be a document number.')
      if (v.length > 30) return err('long', 'That is longer than any document number we accept.')
      return ok()
    },
  },

  doc_holder_name: {
    step: 'compliance',
    label: 'Name on the document',
    required: false,
    normalise: cleanLine,
    validate: (v, ctx = {}) => personName(v, { noun: 'The name on the document', required: !!ctx.required, max: 80 }),
  },

  doc_authority: {
    step: 'compliance',
    label: 'Issued by',
    required: false,
    normalise: cleanLine,
    validate: (v, ctx = {}) => shortText(v, { noun: 'The issuing authority', max: 80, min: 2, required: !!ctx.required }),
  },

  doc_issue_date: {
    step: 'compliance',
    label: 'Issued on',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v, ctx = {}) {
      if (!v) return ok()
      const bad = dateShape(v, 'the date it was issued')
      if (bad) return bad
      if (v > (ctx.today ?? todayKey())) return err('future', 'A document cannot have been issued in the future.')
      return ok()
    },
  },

  doc_expiry_date: {
    step: 'compliance',
    label: 'Valid until',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v, ctx = {}) {
      if (!v) return ctx.required ? err('required', 'This document has an expiry date. Please add it.') : ok()
      const bad = dateShape(v, 'the expiry date')
      if (bad) return bad
      if (ctx.doc_issue_date && v <= ctx.doc_issue_date) return err('order', 'The expiry date has to be after the date it was issued.')
      if (v < (ctx.today ?? todayKey())) return err('expired', 'This document has already expired. Please upload a current one.')
      return ok()
    },
  },

  /* ═══════════════ More · Profile, contact, closing ═══════════════ */

  /* The owner's own name. It used the bank-account rule, whose messages
     talk about "the name printed on the account". */
  full_name: {
    step: 'more',
    label: 'Your name',
    required: true,
    normalise: cleanLine,
    validate: v => (v ? personName(v, { noun: 'Your name' }) : err('required', 'We need a name to put on your account.')),
  },

  /* The same number rules, for the boxes that may be left empty: the
     WhatsApp number on Contact and the owner's own phone on Profile.
     They used the required rule and said "cannot be blank" about a box
     labelled optional. */
  whatsapp_phone: {
    step: 'more',
    label: 'WhatsApp number',
    required: false,
    normalise: normalisePhone,
    validate: (v, ctx = {}) => (v ? phoneShape(v, ctx) : ok()),
  },

  owner_phone: {
    step: 'more',
    label: 'Your phone',
    required: false,
    normalise: normalisePhone,
    validate: (v, ctx = {}) => (v ? phoneShape(v, ctx) : ok()),
  },

  closure_reason: {
    step: 'more',
    label: 'Why you are leaving',
    required: false,
    normalise: cleanProse,
    validate: v => shortText(v, { noun: 'The reason', max: 500, prose: true }),
  },

  /* ═══════════════ Listing · a service and its price ═══════════════ */

  item_price: {
    step: 'business',
    label: 'Price',
    required: false,
    normalise: normaliseAmount,
    validate(v) {
      if (!v) return ok()
      const bad = rupees(v, { noun: 'A price', min: 1, max: 9999999, decimals: false })
      if (bad) return bad
      return ok()
    },
  },

  /* A per-kilometre, per-plate or per-hour rate typed beside a preset. */
  rate_amount: {
    step: 'business',
    label: 'Rate',
    required: false,
    normalise: normaliseAmount,
    validate: v => (v ? rupees(v, { noun: 'A rate', min: 1, max: 999999, decimals: false }) ?? ok() : ok()),
  },

  percentage: {
    step: 'business',
    label: 'Percentage',
    required: false,
    normalise: normaliseAmount,
    validate(v) {
      if (!v) return ok()
      const bad = rupees(v, { noun: 'A percentage', min: 0, max: 100, decimals: true })
      return bad ?? ok()
    },
  },

  /* "Minimum order" is a number of plates or guests, or a sentence
     ("one function, any size"). A number is checked as a number. */
  min_order: {
    step: 'business',
    label: 'Minimum order',
    required: false,
    normalise: cleanLine,
    validate(v) {
      if (!v) return ok()
      /* "1e3" is not a sentence anybody writes; it is a number in
         scientific notation, and refused as one would be. */
      if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(v)) return err('exponent', 'Please type the number out in full, like 100.')
      if (/^[\d\s.,+-]+$/.test(v)) {
        const bad = wholeNumber(v.replace(/\s/g, ''), 'A minimum order')
        if (bad) return bad
        const n = Number(v.replace(/\s/g, ''))
        if (n === 0) return err('zero', 'A minimum of zero is no minimum. Leave it blank instead.')
        if (n > 100000) return err('max', 'That minimum is far larger than any order.')
        return ok()
      }
      return shortText(v, { noun: 'A minimum order', max: 80 })
    },
  },

  exact_quantity: {
    step: 'business',
    label: 'Exact number',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'The number')
      if (bad) return bad
      if (Number(v) === 0) return err('zero', 'Zero is not an answer here. Leave it blank or pick an option.')
      if (Number(v) > 100000) return err('max', 'That is far larger than any event.')
      return ok()
    },
  },

  /* "Something else? Type it here" on every listing question. */
  other_choice: {
    step: 'business',
    label: 'Something else',
    required: false,
    normalise: cleanLine,
    validate: v => shortText(v, { noun: 'Your answer', max: 80, allowContact: false }),
  },

  catering_note: {
    step: 'business',
    label: 'Your specialities',
    required: false,
    normalise: cleanProse,
    validate: v => shortText(v, { noun: 'This note', max: 300, prose: true, allowContact: false }),
  },

  /* ═══════════════ Venue ═══════════════ */

  space_name: {
    step: 'business',
    label: 'Space name',
    required: true,
    normalise: cleanLine,
    validate: v => shortText(v, { noun: 'The name of the space', max: 60, min: 2, required: true }),
  },

  venue_capacity: {
    step: 'business',
    label: 'Guests',
    required: false,
    normalise: v => String(v ?? '').normalize('NFC').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'The number of guests')
      if (bad) return bad
      if (Number(v) === 0) return err('zero', 'A space for zero guests is not a space. Leave it blank if it does not apply.')
      if (Number(v) > 50000) return err('max', 'That is more guests than any venue in the city holds.')
      return ok()
    },
  },

  venue_name: {
    step: 'business',
    label: 'Venue name',
    required: true,
    normalise: cleanLine,
    validate(v) {
      if (!v) return err('required', 'What is the venue called?')
      const r = shortText(v, { noun: 'The venue name', max: 80, min: 3, required: true })
      if (r.severity !== SEVERITY.OK) return r
      if (/^\d+$/.test(v)) return err('numeric', 'That is only numbers. A venue name needs words in it.')
      return ok()
    },
  },

  /* "Pincode (optional)" on a venue proposal: the pincode rules, once
     something is typed. */
  venue_pincode: {
    step: 'business',
    label: 'Pincode',
    required: false,
    normalise: v => stripSeparators(v, /\s/g),
    validate: (v, ctx = {}) => (v ? FIELD_RULES.pincode.validate(v, ctx) : ok()),
  },

  venue_area: {
    step: 'business',
    label: 'Area',
    required: false,
    normalise: cleanLine,
    validate: v => shortText(v, { noun: 'The area', max: 60, min: 3 }),
  },

  venue_note: {
    step: 'business',
    label: 'Anything else you charge',
    required: false,
    normalise: cleanProse,
    validate: v => shortText(v, { noun: 'This note', max: 300, prose: true, allowContact: false }),
  },

  /* ═══════════════ Availability ═══════════════ */

  availability_note: {
    step: 'availability',
    label: 'Note',
    required: false,
    normalise: cleanLine,
    validate: (v, ctx = {}) => shortText(v, { noun: 'A note', max: ctx.max ?? 200 }),
  },

  reason_detail: {
    step: 'availability',
    label: 'Reason',
    required: false,
    normalise: cleanLine,
    validate: v => shortText(v, { noun: 'The reason', max: 60 }),
  },

  date_from: {
    step: 'availability',
    label: 'From',
    required: true,
    normalise: v => String(v ?? '').trim(),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'Pick the first day.')
      const bad = dateShape(v, 'the first day')
      if (bad) return bad
      if (!ctx.allowPast && v < (ctx.today ?? todayKey())) return err('past', 'That day has already gone. Pick today or later.')
      return ok()
    },
  },

  date_to: {
    step: 'availability',
    label: 'Until',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v, ctx = {}) {
      if (!v) return ctx.required ? err('required', 'Pick the last day.') : ok()
      const bad = dateShape(v, 'the last day')
      if (bad) return bad
      if (ctx.date_from && v < ctx.date_from) return err('order', 'The last day cannot be before the first.')
      if (ctx.date_from && realDate(ctx.date_from)) {
        const days = (Date.parse(v) - Date.parse(ctx.date_from)) / 86400000
        if (days > 366) return err('span', 'That is more than a year. Please choose a shorter range.')
      }
      return ok()
    },
  },

  time_from: {
    step: 'availability',
    label: 'Start time',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate: v => (!v || TIME.test(v) ? ok() : err('time', 'That is not a time of day.')),
  },

  time_to: {
    step: 'availability',
    label: 'End time',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v, ctx = {}) {
      if (!v) return ok()
      if (!TIME.test(v)) return err('time', 'That is not a time of day.')
      /* Not "end after start": an evening that runs past midnight
         (18:00 to 01:00) is ordinary for a DJ or a caterer, and nothing
         in the product forbids it (131 only asks for both or neither).
         The same time twice is a window of nothing. */
      if (ctx.time_from && v.slice(0, 5) === String(ctx.time_from).slice(0, 5)) {
        return err('same', 'The start and end are the same time. Choose when you finish.')
      }
      return ok()
    },
  },

  /* ═══════════════ Portfolio ═══════════════ */

  caption: {
    step: 'more',
    label: 'Caption',
    required: false,
    normalise: cleanLine,
    validate: v => shortText(v, { noun: 'A caption', max: 140, allowContact: false }),
  },

  testimonial_body: {
    step: 'more',
    label: 'What they said',
    required: true,
    normalise: cleanProse,
    validate: v => shortText(v, { noun: 'What they said', max: 500, min: 5, required: true, prose: true, allowContact: false }),
  },

  testimonial_by: {
    step: 'more',
    label: 'Who said it',
    required: false,
    normalise: cleanLine,
    validate: v => personName(v, { noun: 'The name', required: false }),
  },

  testimonial_about: {
    step: 'more',
    label: 'At what event',
    required: false,
    normalise: cleanLine,
    validate: v => shortText(v, { noun: 'The event', max: 80 }),
  },

  /* ═══════════════ Messages ═══════════════ */

  chat_message: {
    step: 'more',
    label: 'Message',
    required: true,
    normalise: cleanProse,
    validate: (v, ctx = {}) => shortText(v, { noun: 'A message', max: ctx.max ?? 2000, required: true, prose: true }),
  },

  /* The partner inbox takes a longer message than a job chat. */
  partner_message: {
    step: 'more',
    label: 'Message',
    required: true,
    normalise: cleanProse,
    validate: v => shortText(v, { noun: 'A message', max: 4000, required: true, prose: true }),
  },

  /* A slider, 1 to 100 on screen and clamped to 1 to 200 by the form
     that types it. Listed so the server's range has a client twin. */
  service_radius_km: {
    step: 'area',
    label: 'How far you travel',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v) {
      if (!v) return ok()
      const bad = wholeNumber(v, 'Kilometres')
      if (bad) return bad
      if (Number(v) < 1 || Number(v) > 200) return err('range', 'Choose between 1 and 200 km.')
      return ok()
    },
  },

  /* The trade on Business profile, a select of the 26. A value from
     anywhere else (a crafted request) is not a trade. */
  trade_name: {
    step: 'more',
    label: 'Trade',
    /* Optional here, as the form has always saved it (`category || null`). */
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate: v => (!v || VENDOR_CATEGORIES.includes(v) ? ok() : err('trade', 'That is not one of the trades on Sambramo.')),
  },

  /* Withdrawing from an accepted job. partner_cancel_line (083) already
     refuses fewer than 10 characters; this says so before the round trip
     and adds the ceiling and the paste guards. */
  cancel_reason: {
    step: 'jobs',
    label: 'Why you cannot do it',
    required: true,
    normalise: cleanProse,
    validate: v => shortText(v, { noun: 'The reason', min: 10, max: 500, required: true, prose: true }),
  },

  /* The name typed under a hold-to-sign: the partner terms, and a
     listing's signature. It was cut at 80 characters without a word. */
  signature_name: {
    step: 'review',
    label: 'Your full name',
    required: true,
    normalise: cleanLine,
    validate: v => (v ? personName(v, { noun: 'Your name', max: 80 }) : err('required', 'Type your full name to sign.')),
  },

  /* ═══════════════ Signing in, and invitations ═══════════════ */

  login_email: {
    step: 'entry',
    label: 'Email',
    required: true,
    normalise: v => String(v ?? '').normalize('NFC').trim().toLowerCase(),
    validate: v => (v ? emailShape(v) : err('required', 'Type the email address we should send your code to.')),
  },

  otp_code: {
    step: 'entry',
    label: 'Code',
    required: true,
    normalise: v => stripSeparators(v, /\s/g),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'Type the code from the email.')
      const shape = nonDigit(v, 'The code')
      if (shape) return shape
      const want = ctx.length ?? 6
      if (v.length !== want) return err('length', `The code is ${want} digits. That is ${v.length}.`)
      return ok()
    },
  },

  invite_code: {
    step: 'entry',
    label: 'Invitation code',
    required: true,
    normalise: v => String(v ?? '').normalize('NFC').replace(/\s/g, '').toUpperCase(),
    validate(v) {
      if (!v) return err('required', 'Type the code you were sent.')
      if (/[01OIL]/.test(v)) return err('confusable', 'Sambramo codes never use 0, 1, O, I or L. Check the letters against the message you were sent.')
      if (!/^[A-Z2-9]+$/.test(v)) return err('charset', 'A code is letters and digits only.')
      if (v.length !== 6 && v.length !== 8) return err('length', 'A Sambramo code is 6 or 8 characters.')
      return ok()
    },
  },
}

/* ── Email, shared by the contact email and sign-in ─────────────────── */
function emailShape(v) {
  if (/\s/.test(v)) return err('space', 'An email address has no spaces in it.')
  if (CONTROL_ANY.test(v)) return err('control', 'There is an invisible character in there, usually from pasting. Please retype it.')
  if (v.length > 254) return err('long', 'That is longer than any email address can be.')
  if (!v.includes('@')) return err('at', 'An email address needs an @ in it.')
  const parts = v.split('@')
  if (parts.length > 2) return err('at_many', 'That has more than one @ in it.')
  const [local, domain] = parts
  if (!local) return err('local', 'There is nothing before the @.')
  if (!domain) return err('domain', 'There is nothing after the @.')
  if (local.length > 64) return err('local_long', 'The part before the @ is too long.')
  if (!domain.includes('.')) return err('dot', `"${domain}" has no dot in it — did you mean ${domain}.com?`)
  if (domain.startsWith('.') || domain.endsWith('.')) return err('dot_edge', 'The part after the @ cannot start or end with a dot.')
  if (/\.\./.test(v)) return err('dot_double', 'There are two dots together.')
  if (!/^[a-z0-9.-]+$/.test(domain)) return err('domain_charset', 'The part after the @ has an unusual character in it.')
  const tld = domain.split('.').pop()
  if (tld.length < 2) return err('tld', `".${tld}" is too short to be a real ending.`)
  if (!/^[a-z]{2,}$/.test(tld)) return err('tld_shape', `".${tld}" is not an ending we recognise.`)
  if (!/^[\w.+-]+$/.test(local)) return err('local_charset', 'The part before the @ has an unusual character in it.')
  if (local.startsWith('.') || local.endsWith('.')) return err('local_dot', 'The part before the @ cannot start or end with a dot.')
  /* The mistypes that account for most wrong addresses here. Syntax is
     all this checks: it never claims an address exists. */
  const TYPO = {
    'gmail.co': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'yahoo.co': 'yahoo.co.in', 'hotmai.com': 'hotmail.com',
    'rediffmai.com': 'rediffmail.com', 'outlok.com': 'outlook.com',
  }
  if (TYPO[domain]) return warn('typo', `Did you mean ${local}@${TYPO[domain]}?`)
  return ok()
}

/* ══════════════════════════════════════════════════════════════════════
   The three things a caller needs
   ══════════════════════════════════════════════════════════════════════ */

/** Clean a raw value the way the rule wants it stored. */
export function normalise(field, raw) {
  const rule = FIELD_RULES[field]
  if (!rule) return String(raw ?? '')
  return rule.normalise ? rule.normalise(raw) : String(raw ?? '').trim()
}

/**
 * Check one field.
 * @param ctx other already-normalised values, for cross-field rules
 * @returns {{ severity, says, rule, value }}
 */
export function validateField(field, raw, ctx = {}) {
  const rule = FIELD_RULES[field]
  if (!rule) return { ...ok(), value: raw }
  const value = normalise(field, raw)
  const result = rule.validate(value, { ...ctx, __raw: String(raw ?? '') })
  return { ...result, value }
}

/**
 * Check a whole step. `blocking` counts ERRORS only, plus any required
 * field left empty. A warning never stops anybody.
 */
export function validateStep(step, values = {}) {
  const fields = Object.entries(FIELD_RULES).filter(([, r]) => r.step === step)
  const results = {}
  const ctx = {}

  for (const [name] of fields) ctx[name] = normalise(name, values[name])

  let errors = 0, warnings = 0
  for (const [name, rule] of fields) {
    const raw = values[name]
    const touched = raw !== undefined && raw !== null && String(raw) !== ''
    if (!touched && !rule.required) { results[name] = ok(); continue }

    const r = validateField(name, raw, ctx)
    results[name] = r
    if (r.severity === SEVERITY.ERROR) errors++
    if (r.severity === SEVERITY.WARN) warnings++
  }

  return { results, errors, warnings, canContinue: errors === 0 }
}

/**
 * Check an arbitrary set of fields: `{ key: { field, value, ctx } }`.
 * For forms whose inputs are not one step — More's screens, the sheets.
 * @returns {{ results, errors, first }} `first` is the first key in error
 */
export function validateForm(entries) {
  const results = {}
  let errors = 0, first = null
  for (const [key, { field, value, ctx = {} }] of Object.entries(entries)) {
    const r = validateField(field, value, ctx)
    results[key] = r
    if (r.severity === SEVERITY.ERROR) { errors++; first ??= key }
  }
  return { results, errors, first, canSave: errors === 0 }
}

/** Every field belonging to a step, in declaration order. */
export function fieldsFor(step) {
  return Object.entries(FIELD_RULES)
    .filter(([, r]) => r.step === step)
    .map(([name, r]) => ({ name, ...r }))
}
