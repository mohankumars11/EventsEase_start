/**
 * Indian identity and registration numbers, checked properly.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS CAN HONESTLY CLAIM, AND WHAT IT CANNOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every function here is OFFLINE. It proves a number is well-formed and
 * that its own check digit agrees with the rest of it. That is a real
 * and useful thing: an Aadhaar with a Verhoeff checksum has a 1-in-10
 * chance of passing by accident, so a mistyped digit, a transposed pair
 * and a number somebody invented on the spot are all caught here,
 * instantly, before anybody is asked to look at a photograph.
 *
 * It is NOT proof the number belongs to a real person, and this module
 * must never be described as if it were.
 *
 *   checksum   the number is internally consistent      <- this file
 *   provider   UIDAI / NSDL / GSTN say it exists and
 *              the name matches                          <- needs a
 *                                                           licensed
 *                                                           provider
 *   accepted   a human at Sambramo read the document     <- migration 093
 *
 * Going from the first to the second is a commercial decision, not a
 * coding one: Aadhaar authentication requires AUA/KUA licensing from
 * UIDAI, PAN verification goes through NSDL, and GST through GSTN. In
 * practice that means an aggregator -- Signzy, Karza, IDfy, Surepass,
 * Cashfree Verification. `src/lib/validation/verifyProvider.js` is the
 * seam they plug into, and until one is configured the app says
 * "checked" and not "verified", because saying otherwise on a screen a
 * partner trusts is the same class of lie as a fake payout confirmation.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AADHAAR NUMBERS ARE NOT STORED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The Aadhaar Act restricts storing the full number, and migration 093
 * already got this right: `vendor_documents.number_last4` is the only
 * column, and there is deliberately no `number`. These functions take a
 * number, answer, and the caller keeps the last four. Nothing here
 * persists anything.
 */

/* ══════════════════════════════════════════════════════════════════════
   AADHAAR · 12 digits, Verhoeff check digit
   ══════════════════════════════════════════════════════════════════════

   Verhoeff is a dihedral-group checksum. Unlike a simple mod-10 it
   catches ALL single-digit errors and ALL adjacent transpositions --
   which are the two mistakes a person actually makes copying twelve
   digits off a card. That is why UIDAI chose it and why implementing it
   properly matters more than a length check. */

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

export function verhoeffOk(digits) {
  let c = 0
  const rev = String(digits).split('').reverse()
  for (let i = 0; i < rev.length; i++) {
    const d = Number(rev[i])
    if (!Number.isInteger(d)) return false
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][d]]
  }
  return c === 0
}

export const digitsOnly = s => String(s ?? '').replace(/\D/g, '')

/**
 * @returns {{ ok, reason, last4, says }}
 *
 * `says` is the sentence shown to the partner. Every failure names what
 * is wrong with THIS number rather than repeating the format -- "that is
 * 11 digits" is actionable, "invalid Aadhaar" is not.
 */
export function checkAadhaar(input) {
  const n = digitsOnly(input)

  if (!n) return fail('empty', 'Enter the 12 digits from your Aadhaar card.')
  if (n.length < 12) return fail('short', `That is ${n.length} digit${n.length === 1 ? '' : 's'}. An Aadhaar number has 12.`)
  if (n.length > 12) return fail('long', `That is ${n.length} digits. An Aadhaar number has 12.`)

  /* UIDAI never issues a number starting 0 or 1 -- the first digit is
     the only structural rule besides the checksum, and it catches a
     whole class of made-up numbers instantly. */
  if (n[0] === '0' || n[0] === '1') {
    return fail('leading', 'An Aadhaar number never starts with 0 or 1. Check the first digit.')
  }

  if (/^(\d)\1{11}$/.test(n)) {
    return fail('repeated', 'That is the same digit twelve times. Please enter the real number.')
  }

  if (!verhoeffOk(n)) {
    return fail('checksum',
      'Those 12 digits do not check out. One is usually mistyped, or two are swapped — please read it off the card again.')
  }

  return { ok: true, reason: null, last4: n.slice(-4), says: 'Checks out.' }
}

/* ══════════════════════════════════════════════════════════════════════
   PAN · AAAAA 9999 A, and the fourth letter means something
   ══════════════════════════════════════════════════════════════════════ */

/** The 4th character is the holder type. Getting it wrong is the
    commonest real error: an individual typing their firm's PAN. */
export const PAN_HOLDER = {
  P: 'an individual', C: 'a company', H: 'a Hindu Undivided Family',
  F: 'a firm', A: 'an association of persons', T: 'a trust',
  B: 'a body of individuals', L: 'a local authority',
  J: 'an artificial juridical person', G: 'a government body',
}

export function checkPan(input, { expectHolder = null, surname = null } = {}) {
  const p = String(input ?? '').toUpperCase().replace(/\s/g, '')

  if (!p) return fail('empty', 'Enter the 10 characters from your PAN card.')
  if (p.length !== 10) {
    return fail('length', `That is ${p.length} character${p.length === 1 ? '' : 's'}. A PAN has exactly 10.`)
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) {
    return fail('shape',
      'A PAN is five letters, then four digits, then one letter — like ABCDE1234F. Check the order.')
  }

  const holder = p[3]
  if (!PAN_HOLDER[holder]) {
    return fail('holder',
      `The fourth character, "${holder}", is not one a PAN uses. For a person it is P.`)
  }
  if (expectHolder && holder !== expectHolder) {
    return fail('holder_mismatch',
      `This PAN belongs to ${PAN_HOLDER[holder]}. We need the one for ${PAN_HOLDER[expectHolder]}.`)
  }

  /* The fifth letter is the first letter of the surname for an
     individual, or of the entity name otherwise. Checked only when we
     have a name to check it against, and reported as a QUESTION rather
     than a rejection -- legal names and display names differ often
     enough that refusing outright would be wrong. */
  if (surname) {
    const initial = String(surname).trim().toUpperCase()[0]
    if (initial && /[A-Z]/.test(initial) && p[4] !== initial) {
      return {
        ok: true, soft: true, reason: 'surname_mismatch', last4: p.slice(-4),
        says: `The fifth letter of a PAN is usually the first letter of the surname — this one is ${p[4]}, and you entered a name starting ${initial}. Worth a second look.`,
      }
    }
  }

  return { ok: true, reason: null, last4: p.slice(-4), holder, says: 'Checks out.' }
}

/* ══════════════════════════════════════════════════════════════════════
   GSTIN · 15 characters that contain the PAN and a mod-36 check digit
   ══════════════════════════════════════════════════════════════════════ */

const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** State codes 01-38 are the real ones; 97 is "other territory". */
export const GST_STATE = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim',
  12: 'Arunachal Pradesh', 13: 'Nagaland', 14: 'Manipur', 15: 'Mizoram',
  16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal',
  20: 'Jharkhand', 21: 'Odisha', 22: 'Chhattisgarh', 23: 'Madhya Pradesh',
  24: 'Gujarat', 25: 'Daman & Diu', 26: 'Dadra & Nagar Haveli',
  27: 'Maharashtra', 28: 'Andhra Pradesh (old)', 29: 'Karnataka',
  30: 'Goa', 31: 'Lakshadweep', 32: 'Kerala', 33: 'Tamil Nadu',
  34: 'Puducherry', 35: 'Andaman & Nicobar', 36: 'Telangana',
  37: 'Andhra Pradesh', 38: 'Ladakh', 97: 'Other territory',
}

export function gstCheckDigit(first14) {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const v = GST_CHARS.indexOf(first14[i])
    if (v < 0) return null
    const product = v * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return GST_CHARS[(36 - (sum % 36)) % 36]
}

export function checkGstin(input, { pan = null } = {}) {
  const g = String(input ?? '').toUpperCase().replace(/\s/g, '')

  if (!g) return fail('empty', 'Enter the 15 characters of your GSTIN.')
  if (g.length !== 15) {
    return fail('length', `That is ${g.length} character${g.length === 1 ? '' : 's'}. A GSTIN has exactly 15.`)
  }
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/.test(g)) {
    return fail('shape',
      'A GSTIN is two digits, then a PAN, then one character, then Z, then one check character.')
  }

  const state = g.slice(0, 2)
  if (!GST_STATE[state]) {
    return fail('state', `"${state}" is not a state code we recognise. Karnataka is 29.`)
  }

  const expect = gstCheckDigit(g.slice(0, 14))
  if (expect && g[14] !== expect) {
    return fail('checksum',
      'The last character does not match the other fourteen. One character is usually mistyped.')
  }

  /* The GSTIN contains the PAN. If we already hold the PAN, they must
     agree -- this catches somebody pasting a colleague's GSTIN. */
  const embedded = g.slice(2, 12)
  if (pan) {
    const clean = String(pan).toUpperCase().replace(/\s/g, '')
    if (clean && clean !== embedded) {
      return fail('pan_mismatch',
        `This GSTIN belongs to PAN ${embedded}, but you gave ${clean}. They have to be the same business.`)
    }
  }

  return {
    ok: true, reason: null, last4: g.slice(-4), state: GST_STATE[state], pan: embedded,
    says: `Checks out — registered in ${GST_STATE[state]}.`,
  }
}

/* ══════════════════════════════════════════════════════════════════════
   IFSC · four letters, a zero, six more
   ══════════════════════════════════════════════════════════════════════ */

export function checkIfsc(input) {
  const s = String(input ?? '').toUpperCase().replace(/\s/g, '')
  if (!s) return fail('empty', 'Enter your branch IFSC.')
  if (s.length !== 11) {
    return fail('length', `That is ${s.length} character${s.length === 1 ? '' : 's'}. An IFSC has exactly 11.`)
  }
  /* The fifth character is ALWAYS 0 -- reserved by RBI. It is the single
     most useful structural rule, and the one people get wrong when they
     type the letter O. */
  if (s[4] !== '0') {
    return fail('fifth',
      s[4] === 'O'
        ? 'The fifth character is the digit zero, not the letter O.'
        : 'The fifth character of an IFSC is always 0.')
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s)) {
    return fail('shape', 'An IFSC is four letters, then 0, then six letters or digits — like HDFC0001234.')
  }
  return { ok: true, reason: null, bank: s.slice(0, 4), says: 'Checks out.' }
}

/* ══════════════════════════════════════════════════════════════════════
   The trade-specific ones
   ══════════════════════════════════════════════════════════════════════ */

/** FSSAI licence · 14 digits, first digit 1 (registration) or 2 (licence). */
export function checkFssai(input) {
  const n = digitsOnly(input)
  if (!n) return fail('empty', 'Enter the 14-digit number printed on your FSSAI certificate.')
  if (n.length !== 14) {
    return fail('length', `That is ${n.length} digit${n.length === 1 ? '' : 's'}. An FSSAI number has 14.`)
  }
  if (n[0] !== '1' && n[0] !== '2') {
    return fail('leading', 'An FSSAI number starts with 1 or 2. Check the first digit.')
  }
  return { ok: true, reason: null, last4: n.slice(-4), says: 'Checks out.' }
}

/** Driving licence · state, RTO, year, serial. Formats vary by state,
    so this is deliberately permissive about separators. */
export function checkDrivingLicence(input) {
  const s = String(input ?? '').toUpperCase().replace(/[\s-]/g, '')
  if (!s) return fail('empty', 'Enter the licence number, including the state letters.')
  if (!/^[A-Z]{2}[0-9]{2}/.test(s)) {
    return fail('state', 'A licence number starts with two state letters and two RTO digits — like KA05.')
  }
  if (s.length < 10 || s.length > 16) {
    return fail('length', `That is ${s.length} characters. A licence number is between 10 and 16.`)
  }
  const year = s.match(/^[A-Z]{2}[0-9]{2}((?:19|20)[0-9]{2})/)
  if (year) {
    const y = Number(year[1])
    const now = new Date().getFullYear()
    if (y > now) return fail('future', `That says it was issued in ${y}, which has not happened yet.`)
    if (y < 1950) return fail('old', `That says it was issued in ${y}. Please check the year.`)
  }
  return { ok: true, reason: null, last4: s.slice(-4), says: 'Checks out.' }
}

/** Vehicle registration · KA 01 AB 1234, with BH-series tolerated. */
export function checkVehicleRc(input) {
  const s = String(input ?? '').toUpperCase().replace(/[\s-]/g, '')
  if (!s) return fail('empty', 'Enter the number plate, like KA01AB1234.')
  const classic = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/
  const bharat = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/
  if (!classic.test(s) && !bharat.test(s)) {
    return fail('shape',
      'That does not look like a number plate. Most are two letters, two digits, one to three letters, four digits — like KA01AB1234.')
  }
  return { ok: true, reason: null, last4: s.slice(-4), says: 'Checks out.' }
}

/** Udyam (MSME) · UDYAM-KR-03-0000000 */
export function checkUdyam(input) {
  const s = String(input ?? '').toUpperCase().replace(/\s/g, '')
  if (!s) return fail('empty', 'Enter your Udyam registration number.')
  if (!/^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(s)) {
    return fail('shape', 'A Udyam number looks like UDYAM-KR-03-0000000.')
  }
  return { ok: true, reason: null, last4: s.slice(-4), says: 'Checks out.' }
}

function fail(reason, says) {
  return { ok: false, reason, says, last4: null }
}

/* ══════════════════════════════════════════════════════════════════════
   The registry the app and the guards both read
   ══════════════════════════════════════════════════════════════════════ */

export const ID_CHECKS = {
  aadhaar:  { label: 'Aadhaar number',        check: checkAadhaar,        mask: '0000 0000 0000' },
  pan:      { label: 'PAN',                   check: checkPan,            mask: 'ABCDE1234F' },
  gst:      { label: 'GSTIN',                 check: checkGstin,          mask: '29ABCDE1234F1Z5' },
  ifsc:     { label: 'IFSC',                  check: checkIfsc,           mask: 'HDFC0001234' },
  fssai:    { label: 'FSSAI licence',         check: checkFssai,          mask: '10012345678901' },
  dl:       { label: 'Driving licence',       check: checkDrivingLicence, mask: 'KA0520110012345' },
  rc:       { label: 'Vehicle registration',  check: checkVehicleRc,      mask: 'KA01AB1234' },
  udyam:    { label: 'Udyam registration',    check: checkUdyam,          mask: 'UDYAM-KR-03-0000000' },
}

/** One entry point, so a caller never has to know which function. */
export function checkIdentity(kind, value, opts = {}) {
  const entry = ID_CHECKS[kind]
  if (!entry) return { ok: true, reason: 'unknown_kind', says: '' }
  return entry.check(value, opts)
}
