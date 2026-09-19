/**
 * The honesty gate.
 *
 * Sambramo is pre-launch, operates in Bengaluru only, has one real partner
 * and no customers. This site is engineered to be quoted by AI assistants,
 * which makes it the worst possible place to publish a claim the company
 * cannot stand behind: a normal marketing exaggeration becomes a sentence a
 * model repeats to strangers as fact.
 *
 * Two source files already say this in the product's own words, and this
 * script is those rules made executable:
 *
 *   src/components/layout/EventFooter.jsx:27-33
 *     "no vendor counts, no years in business, no star ratings and no
 *      testimonials. An invented review is the fastest possible way to lose
 *      the trust this whole block is trying to earn."
 *
 *   src/config/sambramo.js
 *     Records that "India's" and "first" were removed from the category
 *     lines because an unverifiable superlative is what the ASCI code and
 *     the Consumer Protection Act 2019 treat as a misleading claim.
 *
 * If the build stopped here, the fix is the copy. Deleting a rule below is
 * only correct when the underlying fact has changed — a real review, a real
 * second city — and then the fact belongs in content/ anyway.
 *
 * ── A CLAIM IS SOMETHING SAMBRAMO SAYS ABOUT ITSELF ──────────────────────
 *
 * That distinction is the whole design of this file, and the first version
 * got it wrong. It flagged "Pan-India" where a Diwali page describes where
 * Diwali is celebrated, and "Delhi" inside "Regional style
 * (Hyderabadi/Lucknawi/Delhi)" on an Eid menu. Both are facts about the
 * world. Neither is a claim about the company.
 *
 * So every rule is evaluated per sentence, and the coverage and superlative
 * rules additionally require the sentence to be about Sambramo. A checker
 * that cries wolf is a checker the next person deletes, which costs more
 * than the false negatives this precision allows.
 */
import { readFileSync } from 'node:fs'
import { htmlFiles, pathOf, fail, report } from './_lib.mjs'

const brand = JSON.parse(readFileSync(new URL('../content/brand.json', import.meta.url), 'utf8'))

const ABOUT_US = /\b(sambramo|we|our|us)\b/i
const NEGATED = /\b(no|not|never|without|nor|neither|refuses?|cannot)\b/i

/** Claims about the company, checked only in sentences about the company. */
const SELF_RULES = [
  [/\bIndia'?s\s+(first|only|largest|best|leading|top|biggest|no\.?\s*1|number\s+one)\b/i,
   'unverifiable national superlative'],
  [/\b(is|are)\s+(the\s+)?(first|only|largest|best|leading|biggest)\s+(event|celebration|concierge|wedding|planner|planning|service|company|platform)/i,
   'unverifiable superlative about Sambramo'],
  [/\bpan[-\s]?india\b/i, 'pan-India coverage claim'],
  [/\bnationwide\b/i, 'nationwide coverage claim'],
  [/\b(all\s+over|across|throughout)\s+india\b/i, 'all-India coverage claim'],
  [/\btrusted by\b/i, 'social proof that does not exist'],
  [/\b\d+\+?\s*years?\s+(of\s+)?(experience|in business)\b/i, 'years in business'],
  [/\baward[-\s]?winning\b/i, 'an award'],
  [/\b(market|industry)\s+leader\b/i, 'a leadership claim'],
  [/\bISO[\s-]?\d{4}\b/i, 'a certification'],
]

/** Checked anywhere, because nothing legitimate on this site says them. */
const ANY_RULES = [
  [/\b\d(\.\d)?\s*(star\b|\/\s*5\b|out of 5\b)/i, 'a star rating'],
  [/\b(hurry|act now|last chance|limited time only)\b/i, 'false urgency — legal.js dark pattern #1'],
  [/\bonly\s+\d+\s+(left|remaining|slots?|spots?)\b/i, 'invented scarcity — legal.js dark pattern #1'],
]

/**
 * Counts of things the company does not have.
 *
 * Deliberately NOT a bare number-plus-noun. The taxonomy counts on this site
 * are real and load-bearing — "26 supplier trades", "25 occasions", "60
 * services" — and a rupee band in one table cell sitting beside a heading in
 * the next reads as "30,000 Wedding" once the tags are stripped. So this
 * matches only counts of PEOPLE or of work completed, and never a figure
 * that is money.
 */
const FAKE_COUNT = /(?<![₹\d,.])\b\d{1,3}(,\d{3})*\+?\s+(happy\s+)?(customers?|clients?|families|reviews?|testimonials?|(weddings?|events?|celebrations?)\s+(delivered|completed|planned))\b/i

/* Coverage is Bengaluru only. Mysore and Mysuru are named explicitly because
   src/config/cities.js still has Mysore live:true and the app's own copy says
   "Bengaluru & Mysore" in three places — a content refresh that reintroduced
   it must fail here rather than ship. */
const OTHER_CITIES = /\b(mysore|mysuru|mumbai|delhi|hyderabad|chennai|pune|kolkata|jaipur|ahmedabad|surat|gurgaon|noida|kochi)\b/i

/* "live" and "deliver" are deliberately absent. "Live kebab stations" and
   "delivered to your door" are not coverage statements, and including them
   made this check fire on a biryani menu. */
const COVERAGE_VERB = /\b(serves?|serving|covers?|covering|operates?|operating|available\s+in|launch(?:ed|ing)?\s+in|based\s+in)\b/i

/* A sentence does not run across an element boundary. Splitting on this
   marker as well as on punctuation is what stops a price in one cell and a
   heading in the next from forming a "sentence" that says neither. */
const BOUNDARY = ' @@ '

const files = htmlFiles()

for (const f of files) {
  const html = readFileSync(f, 'utf8')
  const url = pathOf(f)

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, BOUNDARY)
    .replace(/<style[\s\S]*?<\/style>/gi, BOUNDARY)
    .replace(/<[^>]+>/g, BOUNDARY)
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')

  const sentences = text
    .split(/@@|(?<=[.!?])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  for (const s of sentences) {
    const negated = NEGATED.test(s)

    if (ABOUT_US.test(s) && !negated) {
      for (const [re, why] of SELF_RULES) {
        if (re.test(s)) fail(`${url} — ${why}: "${s.slice(0, 130)}"`)
      }
      const c = s.match(OTHER_CITIES)
      if (c && COVERAGE_VERB.test(s)) {
        fail(`${url} — coverage claim naming ${c[0]}: "${s.slice(0, 130)}"`)
      }
    }

    if (!negated) {
      for (const [re, why] of ANY_RULES) {
        const m = s.match(re)
        if (m) fail(`${url} — ${why}: "${m[0]}" in "${s.slice(0, 110)}"`)
      }
      const fc = s.match(FAKE_COUNT)
      if (fc) fail(`${url} — a count the company does not have: "${fc[0]}"`)
    }
  }

  /* NAP: the phone number, byte-identical, everywhere it is rendered. A model
     resolves "Sambramo" to one entity by seeing one number; a second format
     is a second candidate entity. */
  const digits = brand.supportPhone.replace(/\D/g, '')
  const flat = text.split('@@').join(' ').replace(/\s+/g, ' ')
  for (const m of flat.matchAll(/\+?9\s?1[\s\-()]?\d[\d\s\-()]{8,14}\d/g)) {
    if (m[0].replace(/\D/g, '') === digits && m[0].trim() !== brand.supportPhone) {
      fail(`${url} — phone rendered "${m[0].trim()}", must be exactly "${brand.supportPhone}"`)
    }
  }
}

report('check-claims', files.length)
