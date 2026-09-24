import { checkIdentity } from './identity'

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

/**
 * The raw text, before this field's own normaliser touched it.
 *
 * ── The bug this closes ─────────────────────────────────────────────
 * `contact_phone` normalises by stripping every non-digit. So an email
 * address typed into the phone box arrived at `validate` as the empty
 * string, and the rule answered "it cannot be blank" — about a field the
 * partner had just filled in. The most confusing message on the form,
 * and produced by the field that most needed a clear one.
 *
 * `validateField` now threads the untouched input through the context,
 * so a rule whose normaliser can empty a non-empty value can look at
 * what was actually typed and say the useful thing instead.
 */
function rawOf(ctx, fallback) {
  const r = ctx && typeof ctx.__raw === 'string' ? ctx.__raw : null
  return (r ?? fallback ?? '').trim()
}

/**
 * "You typed something, and this box turned it into nothing."
 * Returns an error naming what it looked like, or null.
 */
function strippedAway(value, ctx, wants) {
  if (value) return null
  const raw = rawOf(ctx, '')
  if (!raw) return null
  const wrong = misplaced(raw, [])
  return err('misplaced', wrong
    ? `That is ${wrong.noun}. This box wants ${wants}.`
    : `"${raw.length > 24 ? raw.slice(0, 24) + '…' : raw}" has nothing in it this box can use. It wants ${wants}.`)
}

/* ── Shared shapes ───────────────────────────────────────────────── */

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
/* Devanagari, Kannada, Tamil, Telugu, Malayalam, Bengali, Gujarati,
   Gurmukhi, Odia — a partner is entitled to their own script. */
const INDIC = /[ऀ-෿]/
/* Digits ARE allowed by the character class. "Hotel 7 Hills" and "A1
   Decorators" are real businesses, and a charset rule that rejected them
   would never reach the softer `has_digit` warning below it. Fields that
   genuinely must not contain a digit — a person's name on a bank
   account — test for one themselves, before this. */
const NAME_OK = /^[\p{L}\p{M}\d][\p{L}\p{M}\d\s.'&,\-/()]*$/u

export const FIELD_RULES = {

  /* ═══════════════ STEP 2 · Partner details ═══════════════ */

  business_name: {
    step: 'details',
    label: 'Business name',
    required: true,
    max: 80,
    /* Trimmed, and inner runs of whitespace collapsed. "Anna   Ruchi"
       and "Anna Ruchi" are the same business and must not become two
       rows that a search can only find one of. */
    normalise: v => String(v ?? '').replace(/\s+/g, ' ').trim(),
    validate(v) {
      if (!v) return err('required', 'A customer sees this name on your offer. It cannot be blank.')

      const wrong = misplaced(v, [])
      if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants the name of your business.`)

      if (EMOJI.test(v)) return err('emoji', 'Emoji do not print on an invoice. Please use words.')
      if (v.length < 3) return err('short', `"${v}" is ${v.length} character${v.length === 1 ? '' : 's'}. A business name needs at least 3.`)
      if (v.length > 80) return err('long', `That is ${v.length} characters. Please keep it under 80.`)

      if (/^\d+$/.test(v)) return err('numeric', 'That is only numbers. A business name needs words in it.')

      if (!NAME_OK.test(v) && !INDIC.test(v)) {
        const bad = [...v].find(c => !/[\p{L}\p{M}\s.'&,\-/()0-9]/u.test(c))
        return err('charset', bad
          ? `"${bad}" is not something a business name usually has in it.`
          : 'That has characters a business name does not usually have.')
      }

      /* A digit is NOT an error. "Hotel 7 Hills", "24 Carat Events" and
         "A1 Decorators" are real businesses. It is worth one look, not a
         refusal -- which is the whole reason `warn` exists. */
      if (/\d/.test(v)) {
        return warn('has_digit', 'There is a number in your business name. That is fine if it is really part of it — just checking.')
      }

      if (/(.)\1{4,}/.test(v)) return err('mashed', 'That looks like a slip of the keyboard.')
      return ok()
    },
  },

  contact_phone: {
    step: 'details',
    label: 'Phone number',
    required: true,
    /* Everything a person might paste: +91, 0091, a leading 0, spaces,
       dashes, brackets. Stripped to the ten that matter. */
    normalise: v => {
      let d = String(v ?? '').replace(/\D/g, '')
      if (d.startsWith('0091')) d = d.slice(4)
      else if (d.startsWith('91') && d.length === 12) d = d.slice(2)
      else if (d.startsWith('0') && d.length === 11) d = d.slice(1)
      return d
    },
    validate(v, ctx = {}) {
      const stripped = strippedAway(v, ctx, 'a 10-digit mobile number')
      if (stripped) return stripped
      if (!v) return err('required', 'This is the number a customer rings on the day. It cannot be blank.')
      if (!/^\d+$/.test(v)) return err('nondigit', 'A phone number is digits only.')
      if (v.length < 10) return err('short', `That is ${v.length} digit${v.length === 1 ? '' : 's'}. An Indian mobile number has 10.`)
      if (v.length > 10) return err('long', `That is ${v.length} digits. An Indian mobile number has 10 — drop the country code if you added it.`)
      /* TRAI allocates mobile numbers starting 6, 7, 8 or 9. A landline
         in this box is a real mistake: the app sends OTPs and job alerts
         by SMS. */
      if (!/^[6-9]/.test(v)) {
        return err('series', `An Indian mobile number starts with 6, 7, 8 or 9. Yours starts with ${v[0]} — is that a landline?`)
      }
      if (/^(\d)\1{9}$/.test(v)) return err('repeated', 'That is the same digit ten times.')
      if (v === '1234567890' || v === '9876543210') {
        return err('sequence', 'That is a test number, not a real one.')
      }
      return ok()
    },
  },

  contact_email: {
    step: 'details',
    label: 'Email',
    required: false,
    normalise: v => String(v ?? '').trim().toLowerCase(),
    validate(v) {
      if (!v) return ok()
      if (/\s/.test(v)) return err('space', 'An email address has no spaces in it.')
      if (!v.includes('@')) return err('at', 'An email address needs an @ in it.')
      const parts = v.split('@')
      if (parts.length > 2) return err('at_many', 'That has more than one @ in it.')
      const [local, domain] = parts
      if (!local) return err('local', 'There is nothing before the @.')
      if (!domain) return err('domain', 'There is nothing after the @.')
      if (!domain.includes('.')) return err('dot', `"${domain}" has no dot in it — did you mean ${domain}.com?`)
      if (domain.startsWith('.') || domain.endsWith('.')) return err('dot_edge', 'The part after the @ cannot start or end with a dot.')
      if (/\.\./.test(v)) return err('dot_double', 'There are two dots together.')
      const tld = domain.split('.').pop()
      if (tld.length < 2) return err('tld', `".${tld}" is too short to be a real ending.`)
      if (!/^[a-z]{2,}$/.test(tld)) return err('tld_shape', `".${tld}" is not an ending we recognise.`)
      if (!/^[\w.+-]+$/.test(local)) return err('local_charset', 'The part before the @ has an unusual character in it.')

      /* The four that account for most mistyped addresses in India. */
      const TYPO = {
        'gmail.co': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
        'gnail.com': 'gmail.com', 'yahoo.co': 'yahoo.co.in', 'hotmai.com': 'hotmail.com',
        'rediffmai.com': 'rediffmail.com', 'outlok.com': 'outlook.com',
      }
      if (TYPO[domain]) return warn('typo', `Did you mean ${local}@${TYPO[domain]}?`)
      return ok()
    },
  },

  years_active: {
    step: 'details',
    label: 'Years doing this',
    required: false,
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    validate(v) {
      if (!v) return ok()
      const n = Number(v)
      if (!Number.isFinite(n)) return err('nan', 'Please enter a number of years.')
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
    normalise: v => String(v ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
    validate(v) {
      if (!v) return ok()
      if (v.length < 20) return warn('thin', `${v.length} characters is not much to go on. A customer choosing between two partners reads this.`)
      if (v.length > 600) return err('long', `That is ${v.length} characters. Please keep it under 600.`)
      /* A phone number or email in the description is how a partner
         gets taken off-platform, which is also how they lose the escrow
         protection they are being promised. Said plainly. */
      /* Stripping the separators first and then asking for a word
         boundary does not work: "Call me on 9845000000 for rates"
         becomes "Callmeon9845000000forrates", where the number is
         surrounded by letters and \b never matches. Look for a run of
         ten digits with optional separators in the ORIGINAL text, then
         confirm the run itself is a mobile number. */
      const run = v.match(/(?:^|\D)((?:[6-9])(?:[\s-]?\d){9})(?:\D|$)/)
      if (run && /^[6-9]\d{9}$/.test(run[1].replace(/[\s-]/g, ''))) {
        return err('contact', 'There is a phone number in there. Customers get your number when a job is confirmed — it does not go in your description.')
      }
      if (/\S+@\S+\.\S+/.test(v)) {
        return err('contact', 'There is an email address in there. Please take it out — contact details are shared once a job is confirmed.')
      }
      if (/(.)\1{6,}/.test(v)) return err('mashed', 'That looks like a slip of the keyboard.')
      return ok()
    },
  },

  instagram_url: {
    step: 'details',
    label: 'Instagram',
    required: false,
    /* People paste the whole URL, the handle, or the handle with an @.
       All three become a handle.

       The trailing path is stripped ONLY when the input actually looked
       like a URL. Stripping it unconditionally turned "anna/ruchi!" into
       "anna" — a silent truncation that then validated cleanly, so the
       partner saw a different handle from the one they typed and was
       never told. A slash in something that is not a URL is an error,
       and it should say so. */
    normalise: v => {
      const raw = String(v ?? '').trim()
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
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    validate(v, ctx = {}) {
      const stripped = strippedAway(v, ctx, 'a 6-digit pincode')
      if (stripped) return stripped
      if (!v) return err('required', 'We need a pincode to know which jobs to send you.')
      if (v.length < 6) return err('short', `That is ${v.length} digit${v.length === 1 ? '' : 's'}. An Indian pincode has 6.`)
      if (v.length > 6) return err('long', `That is ${v.length} digits. An Indian pincode has 6.`)
      /* The first digit is the postal zone, 1-8. 0 and 9 are not issued. */
      if (v[0] === '0' || v[0] === '9') {
        return err('zone', `No Indian pincode starts with ${v[0]}.`)
      }
      return ok()
    },
  },

  /**
   * How many jobs a partner will take on one day.
   *
   * `min` and `max` on a number input are decoration: a phone keypad
   * will happily type 0 or 50 and the browser accepts both silently.
   * Three screens carried this field with three different ceilings --
   * 20, 20 and 12 -- so the same partner could say something on one
   * screen that another would have refused.
   *
   * The floor is the part that matters. A LIMITED day with a limit of
   * zero is a blocked day that does not look blocked: `match_partners`
   * stops offering, the calendar shows amber rather than red, and the
   * partner has no way to tell why the work stopped. That is the
   * nonsense option this refuses outright rather than quietly clamping.
   */
  daily_slots: {
    step: 'availability',
    label: 'Jobs a day',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v) {
      if (!v) return ok()
      if (!/^\d+$/.test(v)) return err('shape', 'Enter a whole number of jobs.')
      const n = Number(v)
      if (n === 0) {
        return err('zero',
          'Zero jobs is a blocked day. Choose Blocked instead, so you can see why the work stopped.')
      }
      if (n > 12) {
        return err('ceiling',
          `${n} jobs in one day is more than anyone can turn up to. The most is 12.`)
      }
      if (n > 6) {
        return warn('many',
          `${n} in one day is a lot. Missing one you accepted costs a strike.`)
      }
      return ok()
    },
  },

  /**
   * The lowest a partner will turn out for, in rupees.
   *
   * Not validated before, and the two ends are both real. Nothing
   * stopped `50`, which is below the cost of getting to the job and
   * reads to a customer as a mistake or a scam. Nothing stopped
   * `2500000` either -- a partner typing paise, or adding a zero --
   * which silently removes them from every search a real customer runs.
   *
   * Warned, not refused, at both ends. A premium decorator really may
   * start at two lakh, and this field is theirs to set.
   */
  starting_price: {
    step: 'details',
    label: 'Starting price',
    required: false,
    normalise: v => String(v ?? '').replace(/[,\s₹]/g, '').trim(),
    validate(v) {
      if (!v) return ok()
      if (!/^\d+(\.\d{1,2})?$/.test(v)) return err('shape', 'Enter an amount in rupees, like 5000.')
      const n = Number(v)
      if (n === 0) return err('zero', 'A starting price of zero reads as a mistake. Leave it blank if you would rather not say.')
      if (n < 500) return warn('low', `₹${n} is below what most partners charge to turn up at all. Is that the whole job?`)
      if (n > 500000) return warn('high', `₹${n.toLocaleString('en-IN')} is a very high starting price. Check you have not added a zero.`)
      return ok()
    },
  },

  /**
   * The neighbourhood a partner works out of.
   *
   * Free text on purpose -- Bengaluru's areas are not a closed list and
   * a dropdown would be wrong within a month. What this catches is the
   * thing people actually type here: a full postal address, which
   * belongs in the pincode and address fields and which this one
   * publishes to customers.
   */
  area: {
    step: 'details',
    label: 'Area',
    required: false,
    normalise: v => String(v ?? '').trim().replace(/\s+/g, ' '),
    validate(v) {
      if (!v) return ok()
      if (v.length < 3) return err('short', 'That is too short to be an area name.')
      if (v.length > 60) return err('long', 'Just the area — Jayanagar, Indiranagar, Whitefield.')
      if (/^\d+$/.test(v)) return err('digits', 'That is a number. Which area is it — Jayanagar, Koramangala?')
      if (/\d{6}/.test(v)) return warn('pincode', 'That looks like a pincode. There is a separate box for it below.')
      if (v.split(',').length > 2) return warn('address', 'This is just the area, not the full address. Customers see it before they see anything else.')
      return ok()
    },
  },

  /**
   * How many jobs this partner can genuinely do on one date.
   *
   * The hint on the field already says it: "one decorator with one van
   * is not two decorators". Nothing enforced it, and this number goes
   * straight into dispatch -- a partner who types 10 because it sounds
   * ambitious is offered ten jobs on one Saturday, accepts them, and
   * collects strikes for the ones they cannot reach.
   */
  daily_capacity: {
    step: 'details',
    label: 'Jobs a day',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v) {
      if (!v) return ok()
      if (!/^\d+$/.test(v)) return err('shape', 'Enter a whole number.')
      const n = Number(v)
      if (n === 0) return err('zero', 'Zero means you are never offered anything. Pause the listing instead if that is what you want.')
      if (n > 12) return err('ceiling', `${n} jobs on one date is more than anyone can turn up to. The most is 12.`)
      if (n > 4) return warn('many', `${n} on one date means we may offer you all ${n}. Missing one you accepted costs a strike.`)
      return ok()
    },
  },

  /**
   * A website, if there is one.
   *
   * The common mistake is not a malformed URL -- it is an Instagram
   * handle typed here instead of in the Instagram box directly below,
   * or a bare domain with no scheme, which renders as a dead relative
   * link wherever it is shown.
   */
  website_url: {
    step: 'details',
    label: 'Website',
    required: false,
    normalise: v => String(v ?? '').trim(),
    validate(v) {
      if (!v) return ok()
      if (/\s/.test(v)) return err('space', 'A web address has no spaces in it.')
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
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    validate(v) {
      if (!v) return ok()
      const n = Number(v)
      if (n > 90) return err('long', `${n} days of notice means you would miss almost every instant booking.`)
      if (n > 30) return warn('high', `${n} days is a lot of notice. You will see far fewer jobs.`)
      return ok()
    },
  },

  /* ═══════════════ STEP 5 · Bank ═══════════════ */

  upi_id: {
    step: 'bank',
    label: 'UPI id',
    required: true,
    normalise: v => String(v ?? '').trim().toLowerCase().replace(/\s/g, ''),
    validate(v) {
      if (!v) return err('required', 'This is where your money goes. It cannot be blank.')
      if (/^\d{10}$/.test(v)) {
        return err('phone', 'That is a phone number. A UPI id has an @ in it, like 9845000000@ybl.')
      }
      if (!v.includes('@')) return err('at', 'A UPI id has an @ in it, like yourname@okhdfcbank.')
      const [handle, psp] = v.split('@')
      if (!handle) return err('handle', 'There is nothing before the @.')
      if (!psp) return err('psp', 'There is nothing after the @ — that is the bank or app, like ybl or okaxis.')
      if (psp.includes('.')) {
        return err('email', 'That looks like an email address. A UPI id ends in the app name, like @ybl or @okhdfcbank.')
      }
      if (!/^[\w.\-]{2,}$/.test(handle)) return err('handle_charset', 'The part before the @ has an unusual character in it.')
      if (!/^[a-z]{2,}$/.test(psp)) return err('psp_charset', 'The part after the @ is letters only, like ybl, paytm or okicici.')
      return ok()
    },
  },

  account_name: {
    step: 'bank',
    label: 'Name on the account',
    required: true,
    normalise: v => String(v ?? '').replace(/\s+/g, ' ').trim(),
    validate(v) {
      if (!v) return err('required', 'The bank checks this against the account. It cannot be blank.')
      const wrong = misplaced(v, [])
      if (wrong) return err('misplaced', `That is ${wrong.noun}. This box wants the name on the bank account.`)
      if (/\d/.test(v)) return err('digit', 'There is a number in there. A person\'s name does not have one — this is the name printed on the account.')
      if (EMOJI.test(v)) return err('emoji', 'The bank will not match a name with an emoji in it.')
      if (v.length < 2) return err('short', 'That is too short to be a name.')
      if (v.length > 60) return err('long', `That is ${v.length} characters. Bank names are at most 60.`)
      if (!NAME_OK.test(v) && !INDIC.test(v)) return err('charset', 'That has characters a name does not usually have.')
      /* A single name is normal in much of India and must not be
         refused. It is flagged only because a mismatch here delays a
         payout, and it is worth one glance. */
      if (!v.includes(' ')) return warn('single', 'One word — make sure that is exactly how it is printed on the account.')
      return ok()
    },
  },

  account_number: {
    step: 'bank',
    label: 'Account number',
    required: true,
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    validate(v, ctx = {}) {
      const stripped = strippedAway(v, ctx, 'the digits of your account number')
      if (stripped) return stripped
      if (!v) return err('required', 'This is where your money goes. It cannot be blank.')
      if (v.length < 9) return err('short', `That is ${v.length} digit${v.length === 1 ? '' : 's'}. Indian account numbers are 9 to 18.`)
      if (v.length > 18) return err('long', `That is ${v.length} digits. Indian account numbers are at most 18.`)
      if (/^(\d)\1+$/.test(v)) return err('repeated', 'That is the same digit repeated. Please check the number.')
      return ok()
    },
  },

  account_number_confirm: {
    step: 'bank',
    label: 'Account number again',
    required: true,
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    /* Typed twice on purpose. A wrong account number is the one mistake
       on this screen that sends real money to a stranger, and it is not
       recoverable. */
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
    normalise: v => String(v ?? '').toUpperCase().replace(/\s/g, ''),
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
    normalise: v => String(v ?? '').toUpperCase().replace(/\s/g, ''),
    validate(v, ctx = {}) {
      if (!v) return err('required', 'Your PAN decides whether tax is deducted from your payouts. Without it we must deduct more.')
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
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    validate(v, ctx = {}) {
      const stripped = strippedAway(v, ctx, 'the 12 digits from your Aadhaar card')
      if (stripped) return stripped
      if (!v) return err('required', 'We need to know who you are before a customer lets you into their home.')
      const r = checkIdentity('aadhaar', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  gst: {
    step: 'compliance',
    label: 'GSTIN',
    required: false,
    normalise: v => String(v ?? '').toUpperCase().replace(/\s/g, ''),
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
    normalise: v => String(v ?? '').replace(/\D/g, ''),
    validate(v) {
      if (!v) return ok()
      const r = checkIdentity('fssai', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },

  dl: {
    step: 'compliance',
    label: 'Driving licence',
    required: false,
    normalise: v => String(v ?? '').toUpperCase().replace(/[\s-]/g, ''),
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
    normalise: v => String(v ?? '').toUpperCase().replace(/[\s-]/g, ''),
    validate(v) {
      if (!v) return ok()
      const r = checkIdentity('rc', v)
      return r.ok ? ok() : err(r.reason, r.says)
    },
  },
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
  /* The untouched input travels with the context so a rule whose own
     normaliser can empty a non-empty value still knows what was typed.
     See strippedAway(). */
  const result = rule.validate(value, { ...ctx, __raw: String(raw ?? '') })
  return { ...result, value }
}

/**
 * Check a whole step.
 *
 * `blocking` is what Continue looks at, and it counts ERRORS only —
 * plus any required field left empty. A warning never stops anybody.
 */
export function validateStep(step, values = {}) {
  const fields = Object.entries(FIELD_RULES).filter(([, r]) => r.step === step)
  const results = {}
  const ctx = {}

  for (const [name] of fields) ctx[name] = normalise(name, values[name])

  let errors = 0, warnings = 0
  for (const [name, rule] of fields) {
    /* An untouched optional field is not an error and not a warning. */
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

/** Every field belonging to a step, in declaration order. */
export function fieldsFor(step) {
  return Object.entries(FIELD_RULES)
    .filter(([, r]) => r.step === step)
    .map(([name, r]) => ({ name, ...r }))
}
