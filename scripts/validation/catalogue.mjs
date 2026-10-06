/**
 * The test categories, and the concrete cases for every rule.
 *
 * Categories are the brief's 27, numbered as it numbers them. Each is
 * proved at the layer where it means something:
 *
 *   rules    1-20, 23   every case below, through validateField, in Node
 *   server   21, 22     direct PostgREST writes as a partner, and parity
 *                       with partner_field_error (check-field-validation-server)
 *   ui       15, 22-24  a real browser: typing, pasting, blur, submit
 *                       (tests/selenium)
 *   e2e      25-27      save, reopen, and nothing else changed
 *                       (tests/selenium, against the database)
 *
 * A case is [category, input, expect, note?, ctx?]:
 *
 *   'ok'    no error (a warning is allowed: warnings never block)
 *   'err'   an error that blocks the save
 *   'warn'  exactly a warning
 *   '=x'    no error, and the stored value is exactly x (normalisation)
 *
 * Categories that do not apply to a kind of field are listed in NA with
 * the reason, so "not tested" is always a decision someone can read.
 */

export const CATEGORIES = {
  1: 'Valid normal value', 2: 'Empty value', 3: 'Whitespace-only value',
  4: 'Minimum allowed', 5: 'Maximum allowed', 6: 'One below minimum', 7: 'One above maximum',
  8: 'Invalid alphabetic input', 9: 'Invalid numeric input', 10: 'Special characters', 11: 'Emoji',
  12: 'Unicode / regional script', 13: 'Leading/trailing whitespace', 14: 'Repeated internal whitespace',
  15: 'Copy/paste', 16: 'Very long pasted string', 17: 'HTML/script injection string',
  18: 'SQL-injection-shaped string', 19: 'Control characters / newlines', 20: 'Invalid format',
  21: 'Direct API submission bypassing the app', 22: 'Backend rejection mapped to the field',
  23: 'Valid correction after an invalid value', 24: 'Submit prevented while invalid',
  25: 'Successful save of a valid value', 26: 'Persistence after leaving and reopening',
  27: 'No unintended change to other fields',
}

export const LAYER_OF = c => (c <= 20 ? 'rules' : c === 21 || c === 22 ? 'server' : c <= 24 ? 'ui' : 'e2e')

const LONG = 'a'.repeat(5000)
const XSS = '<script>alert(1)</script>'
const XSS_IMG = '<img src=x onerror=alert(1)>'
const SQL = "Robert'); DROP TABLE vendors;--"
const CTRL = 'Anna\u0007Ruchi'
const ZW = 'Anna\u200BRuchi'

/* ── Generators, one per kind of field ─────────────────────────────── */

function personName({ max = 60, required = true } = {}) {
  return [
    [1, 'Anna Ramesh', 'ok'],
    [2, '', required ? 'err' : 'ok', required ? 'required' : 'optional'],
    [3, '   ', required ? 'err' : 'ok'],
    [4, 'Al', 'ok', 'two letters'],
    [5, 'A' + 'b'.repeat(max - 1).replace(/(.{9})/g, '$1 ').slice(0, max - 1), 'ok', `${max} characters`],
    [6, 'A', 'err', 'one letter'],
    [7, 'A' + ' bcdefghij'.repeat(Math.ceil(max / 10)).slice(0, max), 'err', `${max + 1} characters`],
    [8, 'Kiran', 'ok', 'letters are the point of a name'],
    [9, 'Anna 2', 'err', 'a digit in a person\'s name'],
    [10, 'Anna@Ramesh', 'err', 'symbol'],
    [10, "D'Souza-Rao", 'ok', 'apostrophe and hyphen are real names'],
    [10, 'K. S. Anand', 'ok', 'initials with full stops'],
    [11, 'Anna 🙂', 'err'],
    [12, 'ಅನ್ನಾ ರಮೇಶ್', 'ok', 'Kannada'],
    [12, 'अन्ना', 'ok', 'Devanagari'],
    [13, '  Anna Ramesh  ', '=Anna Ramesh', 'trimmed'],
    [14, 'Anna    Ramesh', '=Anna Ramesh', 'collapsed'],
    [15, 'Anna Ramesh\n', '=Anna Ramesh', 'pasted with a trailing newline'],
    [16, LONG, 'err'],
    [17, XSS, 'err'], [17, XSS_IMG, 'err'],
    [18, SQL, 'err', 'semicolon and brackets are not in a name'],
    [19, CTRL, 'err'], [19, ZW, 'err', 'zero-width space'],
    [20, 'ravi@gmail.com', 'err', 'an email in a name box'],
  ]
}

function phone({ required }) {
  return [
    [1, '9845000000', '=9845000000'],
    [2, '', required ? 'err' : 'ok'],
    [3, '   ', required ? 'err' : 'ok'],
    [4, '6000000001', 'ok', 'lowest series, 6'],
    [5, '9999999998', 'ok', 'highest series, 9'],
    [6, '984500000', 'err', '9 digits'],
    [7, '98450000001', 'err', '11 digits'],
    [8, 'ninefourfive', 'err'],
    [9, '5845000000', 'err', 'starts with 5'],
    [10, '98450*0000', 'err', 'asterisk, not dropped'],
    [10, '(984) 500-0000', 'err', 'brackets are not an accepted format'],
    [11, '98450😀0000', 'err'],
    [12, '९८४५०००००००', 'err', 'Devanagari digits are not accepted'],
    [13, ' 9845000000 ', '=9845000000'],
    [14, '98450   00000', '=9845000000', 'spaces are formatting'],
    [15, '+91 98450-00000', '=9845000000', 'pasted with country code'],
    [15, '09845000000', '=9845000000', 'leading zero'],
    [15, '0091 9845000000', '=9845000000'],
    [16, '9'.repeat(5000), 'err'],
    [17, XSS, 'err'],
    [18, "9845000000' OR '1'='1", 'err'],
    [19, '98450\u000700000', 'err'],
    [20, '+1 4155550100', 'err', 'another country code'],
    [20, '+91 91 9845000000', 'err', 'country code twice is not quietly fixed'],
    [20, '98x4500000 0', 'err', 'a letter is refused, never dropped'],
    [20, '9999999999', 'err', 'same digit ten times'],
  ]
}

function email({ required }) {
  return [
    [1, 'ravi@example.com', 'ok'],
    [2, '', required ? 'err' : 'ok'],
    [3, '   ', required ? 'err' : 'ok'],
    [4, 'a@b.in', 'ok'],
    [5, `${'a'.repeat(64)}@${'b'.repeat(60)}.com`, 'ok'],
    [6, '@b.in', 'err', 'nothing before the @'],
    [7, `${'a'.repeat(65)}@b.com`, 'err', 'local part over 64'],
    [8, 'ravi', 'err', 'no @'],
    [9, '12345', 'err'],
    [10, 'ra vi@example.com', 'err', 'space'],
    [10, 'ravi@exa$mple.com', 'err'],
    [11, 'ravi🙂@example.com', 'err'],
    [12, 'रवि@example.com', 'err', 'the app accepts ASCII addresses'],
    [13, '  Ravi@Example.com  ', '=ravi@example.com'],
    [14, 'ravi@@example.com', 'err', 'two @'],
    [15, 'ravi@example.com\n', '=ravi@example.com'],
    [16, LONG + '@x.com', 'err'],
    [17, `${XSS}@x.com`, 'err'],
    [18, "ravi'--@x.com", 'err'],
    [19, 'ravi\u0007@example.com', 'err'],
    [20, 'ravi@example', 'err', 'no dot'], [20, 'ravi@example..com', 'err'], [20, 'ravi@.example.com', 'err'],
  ]
}

function wholeNumber({ min, max, zero = 'err', required = false, warnAbove = null }) {
  const cases = [
    [1, String(min === 0 ? 2 : min + 1), 'ok'],
    [2, '', required ? 'err' : 'ok'],
    [3, '   ', required ? 'err' : 'ok'],
    [4, String(min), min === 0 ? 'ok' : 'ok'],
    [5, String(max), warnAbove !== null && max > warnAbove ? 'warn' : 'ok'],
    [7, String(max + 1), 'err'],
    [8, 'five', 'err'],
    [9, '-1', 'err', 'negative'],
    [9, '3.5', 'err', 'fraction'],
    [9, '1e3', 'err', 'exponent, never read as 1000'],
    [9, '007', 'ok', 'leading zeros are the same number'],
    [10, '5!', 'err'],
    [11, '5🙂', 'err'],
    [12, '५', 'err', 'Devanagari digit'],
    [13, ` ${min + 1} `, `=${min + 1}`],
    [16, '9'.repeat(5000), 'err'],
    [17, XSS, 'err'],
    [18, '1; DROP TABLE vendors', 'err'],
    [19, `${min + 1}\u0007`, 'err'],
    [20, '1,000', 'err', 'a separator in a count'],
    [20, 'Infinity', 'err'], [20, 'NaN', 'err'],
  ]
  if (min > 0) cases.push([6, String(min - 1), zero])
  return cases
}

function amount({ min = 1, max, decimals = false, required = false }) {
  return [
    [1, '4500', 'ok'],
    [2, '', required ? 'err' : 'ok'],
    [3, '   ', required ? 'err' : 'ok'],
    [4, String(min), 'ok'],
    [5, String(max), 'ok'],
    [6, String(min - 1), 'err', 'zero'],
    [7, String(max + 1), 'err'],
    [8, 'five thousand', 'err'],
    [9, '-500', 'err', 'negative'],
    [9, decimals ? '450.50' : '450.50', decimals ? 'ok' : 'err', decimals ? 'paise allowed' : 'whole rupees'],
    [9, '450.555', 'err', 'three decimals'],
    [9, '1e5', 'err', 'exponent'],
    [9, '0450', 'ok', 'leading zero'],
    [10, '450$', 'err'],
    [10, '₹4,500', '=4500', 'rupee sign and Indian grouping are formatting'],
    [10, '1,00,000', '=100000'],
    [11, '450🙂', 'err'],
    [12, '४५०', 'err'],
    [13, ' 4500 ', '=4500'],
    [16, '9'.repeat(5000), 'err'],
    [17, XSS, 'err'],
    [18, '1; DROP TABLE vendor_services', 'err'],
    [19, '45\u000700', 'err'],
    [20, '1.000,50', 'err', 'European separators'],
    [20, 'Infinity', 'err'],
  ]
}

function shortText({ max, min = 1, required = false, allowContact = true, prose = false }) {
  const valid = prose ? 'Pure vegetarian catering for weddings since 2011.' : 'Grand Ballroom'
  const floor = (cases) => cases.map(c =>
    (c[2] === 'ok' && c[1].trim() && [...c[1].trim()].length < min && c[0] !== 4)
      ? [c[0], c[1], 'err', `shorter than this field's minimum of ${min}`] : c)
  return floor([
    [1, valid, 'ok'],
    [2, '', required ? 'err' : 'ok'],
    [3, '   ', required ? 'err' : 'ok'],
    [4, 'x'.repeat(Math.max(min, 1)).replace(/^x/, 'A'), 'ok', `${min} characters`],
    [5, ('Hall ' + 'abcd ').repeat(Math.ceil(max / 10)).slice(0, max).trimEnd().padEnd(max, 'z'), 'ok', `${max} characters`],
    ...(min > 1 ? [[6, 'A'.repeat(min - 1), 'err', `${min - 1} characters`]] : []),
    [7, ('Hall ' + 'abcd ').repeat(Math.ceil(max / 5)).slice(0, max + 1).replace(/ $/, 'z'), 'err', `${max + 1} characters`],
    [8, 'Only words here', 'ok'],
    [9, '12345', allowContact ? 'ok' : 'ok', 'digits are allowed in text'],
    [10, "Chef's special — 2 hrs, ₹ extra (approx.)", 'ok', 'ordinary punctuation'],
    [11, 'Lovely 🙂', prose ? 'ok' : 'err', prose ? 'prose may have emoji' : 'short labels do not'],
    [12, 'ಮದುವೆ ಊಟ', 'ok', 'Kannada'],
    [13, `  ${valid}  `, `=${valid}`],
    [14, 'Grand    Ballroom', prose ? '=Grand Ballroom' : '=Grand Ballroom'],
    [15, prose ? 'Line one\nLine two' : 'Pasted value\t', prose ? 'ok' : '=Pasted value'],
    [16, LONG, 'err'],
    [17, XSS, 'err'], [17, XSS_IMG, 'err'], [17, 'javascript:alert(1)', 'err'],
    [18, SQL, 'ok', 'text, stored as text by a parameterised API; nothing executes it'],
    [19, 'A\u0007B', 'err'], [19, 'A\u202EB', 'err', 'bidi override'],
    ...(allowContact ? [] : [[20, 'Call 98450 00000', 'err', 'phone number in the text'], [20, 'mail ravi@x.com', 'err']]),
  ])
}

function pincode({ required }) {
  return [
    [1, '560001', 'ok'], [2, '', required ? 'err' : 'ok'], [3, '   ', required ? 'err' : 'ok'],
    [4, '110001', 'ok', 'zone 1'], [5, '855117', 'ok', 'zone 8'],
    [6, '56000', 'err', '5 digits'], [7, '5600011', 'err', '7 digits'],
    [8, 'ABCDEF', 'err'], [9, '060001', 'err', 'zone 0'], [9, '960001', 'err', 'zone 9'],
    [10, '560-001', 'err', 'hyphen is not pincode formatting'], [11, '56🙂001', 'err'],
    [12, '५६०००१', 'err'], [13, ' 560001 ', '=560001'], [14, '560 001', '=560001'],
    [15, '560001\n', '=560001'], [16, '5'.repeat(5000), 'err'], [17, XSS, 'err'],
    [18, "560001' OR 1=1", 'err'], [19, '560\u0007001', 'err'],
    [20, '5600a01', 'err', 'a letter is refused, never dropped'],
  ]
}

function digits({ required, min, max, noun }) {
  const ok1 = '000111224417'
  return [
    [1, ok1, 'ok'], [2, '', required ? 'err' : 'ok'], [3, '   ', required ? 'err' : 'ok'],
    [4, '123456789', 'ok', `${min} digits`], [5, '1'.repeat(max - 1) + '2', 'ok', `${max} digits`],
    [6, '12345678', 'err'], [7, '1'.repeat(max) + '2', 'err'],
    [8, 'HDFC0001234', 'err', 'an IFSC in the wrong box'], [9, '1111111111', 'err', 'same digit'],
    [10, '0001-1122-4417', '=000111224417', 'hyphens are formatting'], [10, '000111#224417', 'err'],
    [11, '000111🙂224417', 'err'], [12, '०००१११२२४४१७', 'err'],
    [13, ` ${ok1} `, `=${ok1}`], [14, '0001 1122 4417', '=000111224417'],
    [15, `${ok1}\n`, `=${ok1}`], [16, '1'.repeat(5000), 'err'], [17, XSS, 'err'],
    [18, "1; DROP TABLE vendor_payout_details", 'err'], [19, '000111\u0007224417', 'err'],
    [20, '12345abc6789', 'err', `${noun}: letters refused, never dropped`],
  ]
}

/* ── Rule → cases. Every rule in FIELD_RULES that the inventory uses. ─ */

export const CASES = {
  business_name: [
    [1, 'Anna Ruchi Caterers', 'ok'], [2, '', 'err'], [3, '   ', 'err'],
    [4, 'Abc', 'ok', '3 characters'], [5, 'Anna Ruchi Caterers '.repeat(4).trim().padEnd(80, 's').slice(0, 80), 'ok'],
    [6, 'Ab', 'err'], [7, 'Anna Ruchi Caterers '.repeat(5).slice(0, 81), 'err'],
    [8, 'Kalyan Decorators', 'ok'], [9, '12345', 'err', 'only numbers'],
    [9, 'Hotel 7 Hills', 'warn', 'a digit is part of real names; warned, not refused'],
    [10, 'Anna & Sons (Pvt.) Ltd.', 'ok'], [10, 'Anna#Ruchi', 'err'],
    [11, 'Anna Ruchi 🍛', 'err'], [12, 'ಅನ್ನ ರುಚಿ ಕ್ಯಾಟರರ್ಸ್', 'ok'],
    [13, '  Anna Ruchi  ', '=Anna Ruchi'], [14, 'Anna    Ruchi', '=Anna Ruchi'],
    [15, 'Anna Ruchi\n', '=Anna Ruchi'], [16, LONG, 'err'],
    [17, XSS, 'err'], [17, XSS_IMG, 'err'], [18, SQL, 'err'],
    [19, CTRL, 'err'], [19, ZW, 'err'],
    [20, 'ravi@gmail.com', 'err', 'an email in the name box'], [20, 'Aaaaaaaa', 'err', 'keyboard mash'],
  ],
  contact_phone: phone({ required: true }),
  whatsapp_phone: phone({ required: false }),
  owner_phone: phone({ required: false }),
  contact_email: email({ required: false }),
  login_email: email({ required: true }),
  years_active: wholeNumber({ min: 0, max: 75, warnAbove: 50 }),
  lead_time_days: wholeNumber({ min: 0, max: 90, warnAbove: 30 }),
  daily_capacity: wholeNumber({ min: 1, max: 12, warnAbove: 4 }),
  daily_slots: wholeNumber({ min: 1, max: 12, warnAbove: 6 }),
  exact_quantity: wholeNumber({ min: 1, max: 100000 }),
  venue_capacity: wholeNumber({ min: 1, max: 50000 }),
  service_radius_km: wholeNumber({ min: 1, max: 200 }),
  starting_price: amount({ min: 1, max: 9999999 }).map(c =>
    // below 500 and above 5 lakh are warnings on this field, by product decision
    c[0] === 4 ? [4, '1', 'warn', 'accepted, with a low-price warning'] :
    c[0] === 5 ? [5, '9999999', 'warn', 'accepted, with a check-the-zeros warning'] :
    c[0] === 1 ? [1, '4500', 'ok'] : c),
  item_price: amount({ min: 1, max: 9999999 }),
  rate_amount: amount({ min: 1, max: 999999 }),
  description: [
    ...shortText({ max: 600, prose: true, allowContact: false }).filter(c => ![4, 11].includes(c[0])),
    [4, 'A'.repeat(20).replace(/(.{5})/g, '$1 ').trim(), 'ok'],
    [4, 'Short', 'warn', 'under 20 characters: advised, not refused'],
    [11, 'Lovely food 🙂', 'ok', 'prose may have emoji'],
  ],
  closure_reason: shortText({ max: 500, prose: true }),
  catering_note: shortText({ max: 300, prose: true, allowContact: false }),
  venue_note: shortText({ max: 300, prose: true, allowContact: false }),
  testimonial_body: shortText({ max: 500, min: 5, required: true, prose: true, allowContact: false }),
  chat_message: shortText({ max: 2000, required: true, prose: true }),
  partner_message: shortText({ max: 4000, required: true, prose: true }),
  cancel_reason: shortText({ max: 500, min: 10, required: true, prose: true }),
  caption: shortText({ max: 140, allowContact: false }),
  other_choice: shortText({ max: 80, allowContact: false }),
  testimonial_about: shortText({ max: 80 }),
  availability_note: [
    ...shortText({ max: 200 }),
    [5, 'Ramesh wedding, Jayanagar. '.repeat(5).slice(0, 120), 'ok', '120 characters where the box allows 120', { max: 120 }],
    [7, 'Ramesh wedding, Jayanagar. '.repeat(5).slice(0, 121), 'err', '121 characters where the box allows 120', { max: 120 }],
  ],
  reason_detail: shortText({ max: 60 }),
  doc_authority: shortText({ max: 80, min: 2 }),
  space_name: shortText({ max: 60, min: 2, required: true }),
  venue_area: shortText({ max: 60, min: 3 }),
  venue_name: [
    ...shortText({ max: 80, min: 3, required: true }).filter(c => c[0] !== 9),
    [9, '12345', 'err', 'only numbers'],
  ],
  area: [
    [1, 'Jayanagar', 'ok'], [2, '', 'ok'], [3, '   ', 'ok'], [4, 'BTM', 'ok'], [5, 'Koramangala 5th Block, near the water tank road'.padEnd(60, 'x').slice(0, 60), 'ok'],
    [6, 'JP', 'err'], [7, 'x'.repeat(61), 'err'], [9, '560001', 'err', 'a number is not an area'],
    [10, "St. Mark's Road", 'ok'], [11, 'Jayanagar 🙂', 'err'], [12, 'ಜಯನಗರ', 'ok'],
    [13, '  Jayanagar ', '=Jayanagar'], [14, 'Jaya   nagar', '=Jaya nagar'], [16, LONG, 'err'],
    [17, XSS, 'err'], [19, 'Jaya\u0007nagar', 'err'],
    [20, 'Jayanagar 560041', 'warn', 'a pincode in the area'],
  ],
  full_name: personName({ max: 60, required: true }),
  account_name: personName({ max: 60, required: true }).map(c =>
    c[0] === 1 ? [1, 'Anna Ramesh', 'ok'] : c[1] === 'Kiran' ? [8, 'Kiran', 'warn', 'one word: warned to match the passbook'] : c),
  doc_holder_name: personName({ max: 80, required: false }),
  testimonial_by: personName({ max: 60, required: false }),
  signature_name: personName({ max: 80, required: true }),
  instagram_url: [
    [1, 'annaruchi', 'ok'], [2, '', 'ok'], [5, 'a'.repeat(30), 'ok'], [7, 'a'.repeat(31), 'err'],
    [10, 'anna_ruchi.events', 'ok'], [10, 'anna!ruchi', 'err'], [11, 'anna🙂', 'err'],
    [13, '  @annaruchi ', '=annaruchi'], [14, 'anna ruchi', 'err', 'a space in a handle'],
    [15, 'https://www.instagram.com/annaruchi/?hl=en', '=annaruchi', 'pasted as a link'],
    [16, LONG, 'err'], [17, XSS, 'err'], [19, 'anna\u0007', 'err'],
    [20, 'anna/ruchi', 'err', 'a slash is not quietly cut'],
  ],
  website_url: [
    [1, 'https://annaruchi.in', 'ok'], [2, '', 'ok'], [7, `https://${'a'.repeat(200)}.in`, 'err'],
    [10, 'https://anna ruchi.in', 'err'], [13, ' https://annaruchi.in ', '=https://annaruchi.in'],
    [15, 'annaruchi.in', 'warn', 'no https: warned, treated as https'],
    [17, 'javascript:alert(1)', 'err'], [17, 'data:text/html,<b>x</b>', 'err'],
    [20, 'annaruchi', 'err', 'no dot'], [20, 'https://annaruchi.', 'err'],
  ],
  pincode: pincode({ required: true }),
  venue_pincode: pincode({ required: false }),
  account_number: digits({ required: true, min: 9, max: 18, noun: 'account number' }),
  upi_id: [
    [1, 'annaruchi@okhdfcbank', 'ok'], [2, '', 'err'], [3, '   ', 'err'],
    [4, 'ab@ybl', 'ok'], [6, 'a@ybl', 'err', 'one-character handle'],
    [7, `${'a'.repeat(51)}@ybl`, 'err'], [8, 'annaruchi', 'err', 'no @'],
    [9, '9845000000', 'err', 'a phone number'], [10, 'anna#ruchi@ybl', 'err'],
    [11, 'anna🙂@ybl', 'err'], [13, '  Anna.Ruchi@YBL ', '=anna.ruchi@ybl'],
    [14, 'anna ruchi@ybl', '=annaruchi@ybl', 'spaces are removed: a UPI id has none'],
    [16, LONG, 'err'], [17, XSS, 'err'], [18, "a'--@ybl", 'err'], [19, 'anna\u0007@ybl', 'err'],
    [20, 'anna@gmail.com', 'err', 'an email, not a UPI id'], [20, 'a@b@ybl', 'err'],
  ],
  ifsc: [
    [1, 'HDFC0001234', 'ok'], [2, '', 'err'], [6, 'HDFC000123', 'err', '10 characters'],
    [7, 'HDFC00012345', 'err', '12 characters, never cut to 11'],
    [9, '12340001234', 'err'], [10, 'HDFC-001234', 'err'], [13, ' hdfc0001234 ', '=HDFC0001234'],
    [16, LONG, 'err'], [17, XSS, 'err'], [19, 'HDFC\u00070001234', 'err'],
    [20, 'HDFC1001234', 'err', 'fifth character is always 0'],
  ],
  payout_pan: [
    [1, 'ABCPE1234F', 'ok'], [2, '', 'ok', 'optional here'], [6, 'ABCPE1234', 'err'],
    [7, 'ABCPE1234FG', 'err', '11 characters, never cut to 10'], [13, ' abcpe1234f ', '=ABCPE1234F'],
    [17, XSS, 'err'], [20, '1234567890', 'err'],
  ],
  account_number_confirm: [
    [1, '000111224417', 'ok', 'matches', { account_number: '000111224417' }],
    [2, '', 'err', 'required'],
    [20, '000111224418', 'err', 'does not match', { account_number: '000111224417' }],
  ],
  doc_number: [
    [1, 'KA0120190012345', 'ok', 'a driving licence', { kind: 'dl' }],
    [2, '', 'ok', 'optional unless the requirement says so', {}],
    [20, 'ABCPE1234F', 'ok', 'a PAN checked as a PAN, not as an Aadhaar', { kind: 'pan' }],
    [20, 'ABCPE1234F', 'err', 'a PAN typed where an Aadhaar is asked for', { kind: 'aadhaar' }],
    [17, XSS, 'err', 'markup', {}], [19, 'AB\u00071234', 'err', 'control', {}],
    [10, 'AB#1234', 'err', 'charset, no kind', {}],
  ],
  doc_issue_date: [
    [1, '2020-05-01', 'ok'], [2, '', 'ok'], [20, '2020-02-30', 'err', 'not a real date'],
    [20, '2999-01-01', 'err', 'in the future'], [20, '01/05/2020', 'err', 'not the picker format'],
  ],
  doc_expiry_date: [
    [1, '2099-05-01', 'ok'], [2, '', 'ok', 'optional', {}],
    [2, '', 'err', 'required when the document expires', { required: true }],
    [20, '2020-01-01', 'err', 'already expired'],
    [20, '2030-01-01', 'err', 'before it was issued', { doc_issue_date: '2031-01-01' }],
  ],
  date_from: [
    [1, '2099-01-01', 'ok'], [2, '', 'err'], [20, '2020-01-01', 'err', 'in the past', { today: '2026-09-28' }],
    [20, '2026-13-01', 'err', 'no thirteenth month'],
  ],
  date_to: [
    [1, '2099-01-02', 'ok', '', { date_from: '2099-01-01' }], [2, '', 'ok'],
    [20, '2098-12-31', 'err', 'before the start', { date_from: '2099-01-01' }],
    [20, '2101-01-01', 'err', 'more than a year', { date_from: '2099-01-01' }],
  ],
  time_from: [[1, '09:00', 'ok'], [20, '25:00', 'err'], [20, '9am', 'err']],
  time_to: [
    [1, '22:00', 'ok', '', { time_from: '09:00' }],
    [1, '01:00', 'ok', 'an evening past midnight is allowed', { time_from: '18:00' }],
    [20, '09:00', 'err', 'same as the start', { time_from: '09:00' }], [20, '24:30', 'err'],
  ],
  otp_code: [
    [1, '123456', 'ok'], [2, '', 'err'], [6, '12345', 'err'], [7, '1234567', 'err', 'never cut to six'],
    [8, 'abcdef', 'err'], [13, ' 123 456 ', '=123456'], [15, 'Your code: 123456', 'err', 'not quietly extracted'],
  ],
  invite_code: [
    [1, 'KTM4RZ', 'ok'], [1, 'PHTK7M2Q', 'ok'], [2, '', 'err'], [6, 'KTM4R', 'err'], [7, 'KTM4RZ234', 'err'],
    [13, ' ktm4rz ', '=KTM4RZ'], [20, 'KTM0RZ', 'err', 'zero is never in a code'], [20, 'KTM-4RZ', 'err'],
  ],
  trade_name: [[1, 'Photography', 'ok'], [2, '', 'ok'], [20, 'Plumbing', 'err', 'not one of the 26'], [17, XSS, 'err']],
  min_order: [
    [1, '100', 'ok'], [1, 'one function, any size', 'ok'], [2, '', 'ok'], [6, '0', 'err'],
    [9, '-5', 'err'], [9, '1e3', 'err'], [7, '100001', 'err'], [17, XSS, 'err'], [16, LONG, 'err'],
  ],
}

/* Why a category is not tested for a kind of field. */
export const NA = {
  select: { all: 'A select offers only its own options; a crafted value is tested as 20 (invalid format).' },
  slider: { all: 'A range slider cannot produce text; the value is still range-checked (4-7, 20).' },
  date: { 8: 'A date picker', 11: 'A date picker', 12: 'A date picker', 14: 'A date picker', 16: 'A date picker' },
  time: { 8: 'A time picker', 11: 'A time picker', 12: 'A time picker', 14: 'A time picker', 16: 'A time picker' },
  file: { all: 'A file picker; files are checked by the upload path, not by a text rule.' },
  search: { all: 'Filters a list on the device and is never saved; nothing to validate.' },
  confirm: { 4: 'Compared with the first box', 5: 'Compared with the first box', 12: 'Digits only' },
  code: { 12: 'Codes are ASCII by design', 14: 'Spaces are removed from codes' },
}
