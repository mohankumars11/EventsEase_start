/**
 * Does the name a partner typed match the name on the document?
 *
 * ══════════════════════════════════════════════════════════════════════
 * A MISMATCH IS EXPENSIVE IN BOTH DIRECTIONS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Too strict and the system rejects real people all day: "Rajesh Kumar"
 * against "Rajesh K." is the single commonest shape of a true match in
 * India, and a validator that calls it a mismatch will reject a large
 * fraction of an honest supply base.
 *
 * Too loose and the check does nothing, which is worse than not having
 * it — a marketplace that says "verified" on the strength of a fuzzy
 * match has told a customer something it does not know.
 *
 * So there are FOUR answers, not two, and the middle one routes to a
 * human rather than guessing:
 *
 *   MATCH          the same name, allowing for order and punctuation
 *   PARTIAL_MATCH  plausibly the same person; a reviewer should look
 *   MISMATCH       different people
 *   NOT_AVAILABLE  one side is missing; no opinion
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT INDIAN NAMES ACTUALLY DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * Most western name matchers break on all of these, and every one is
 * ordinary here:
 *
 *   initials        "R Kumar", "R. Kumar", "Rajesh K"
 *   expansions      "S Venkatesh" vs "Srinivasa Venkatesh"
 *   order           "Kumar Rajesh" vs "Rajesh Kumar" -- south Indian
 *                   names often lead with a family or village name
 *   mononyms        "Lakshmi" alone is a complete legal name
 *   patronymics     "Rajesh Kumar S/O Suresh"
 *   honorifics      Sri, Smt, Mr, Dr, Shri
 *   transliteration "Krishnan" / "Krishnnan", "Lakshmi" / "Laxmi"
 *
 * The last one is why a plain edit distance is not enough on its own:
 * two spellings of the same sound differ by more characters than two
 * different short names do.
 */

export const MATCH = {
  MATCH: 'MATCH',
  PARTIAL: 'PARTIAL_MATCH',
  MISMATCH: 'MISMATCH',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
}

/* Dropped before comparison. A document says SMT LAKSHMI DEVI and a
   partner types Lakshmi Devi; the honorific is not a difference. */
const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sri', 'shri', 'smt', 'smt.',
  'kum', 'thiru', 'selvi', 'md', 'mohd',
])

/* Relationship markers. Everything after one of these describes a
   PARENT, not the holder, so it is cut rather than compared. */
const RELATION = /\b(s\/o|d\/o|w\/o|c\/o|son of|daughter of|wife of)\b.*$/i

/**
 * Sound-alike spellings that differ in Latin but not in the source
 * script. Applied after the name is lowercased and stripped.
 *
 * Ordered longest-first so 'ksh' is tried before 'sh'.
 */
const TRANSLITERATION = [
  [/ksh/g, 'x'], [/aa/g, 'a'], [/ee/g, 'i'], [/oo/g, 'u'],
  [/ph/g, 'f'], [/bh/g, 'b'], [/dh/g, 'd'], [/gh/g, 'g'],
  [/jh/g, 'j'], [/kh/g, 'k'], [/th/g, 't'], [/ch/g, 'c'],
  [/sh/g, 's'], [/z/g, 's'], [/v/g, 'w'], [/y$/g, 'i'],
  [/(.)\1+/g, '$1'],
]

/** Strip to comparable words. */
export function normaliseName(raw) {
  if (raw == null) return []
  let s = String(raw)
    .replace(RELATION, ' ')
    .toLowerCase()
    /* Dots and hyphens carry no information here: "R.K. Sharma" and
       "R K Sharma" are the same name typed by two people. */
    /* An apostrophe JOINS, it does not separate. Stripping it to a
       space turned D’Souza into two words, so it matched DSouza
       only as an initial rather than as the same name. */
    .replace(/['‘’ʼ]/g, '')
    .replace(/[.\-_,]/g, ' ')
    .replace(/[^\p{L}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return s.split(' ').filter(w => w && !HONORIFICS.has(w))
}

/** The sound-alike form of one word. */
export function phonetic(word) {
  let w = String(word ?? '').toLowerCase()
  for (const [re, to] of TRANSLITERATION) w = w.replace(re, to)
  return w
}

/** Levenshtein, capped — we only care about small distances. */
export function editDistance(a, b, cap = 4) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      if (cur[j] < best) best = cur[j]
    }
    if (best > cap) return cap + 1
    prev = cur
  }
  return prev[b.length]
}

/** How two single words relate. */
function compareWord(a, b) {
  if (a === b) return 'same'

  /* An initial against a word starting with the same letter. This is
     the case that matters most: "R" vs "Rajesh". */
  if (a.length === 1 || b.length === 1) {
    const short = a.length === 1 ? a : b
    const long = a.length === 1 ? b : a
    return short[0] === long[0] ? 'initial' : 'different'
  }

  if (phonetic(a) === phonetic(b)) return 'sounds'

  /* ── Edit distance is the LAST resort, and a strict one ───────────
     The first version allowed 2 edits on any word of 6 or more, which
     made "Rajesh" and "Ramesh" the same person -- one substitution,
     six letters. That is the exact pair this matcher exists to tell
     apart, so the rule was worse than not having it.

     A single edit is only accepted on a long word, where one letter is
     a small share of the whole and a genuine typo is more likely than
     a different name. Short names are decided by spelling alone:
     "Ravi"/"Ram" and "Anil"/"Sunil" are different people.

     Sound-alike spellings are already handled above by `phonetic`,
     which is the right tool for transliteration -- this branch only
     has to catch a slipped finger. */
  const shortest = Math.min(a.length, b.length)
  if (shortest < 7) return 'different'
  return editDistance(a, b, 1) <= 1 ? 'close' : 'different'
}

/**
 * Compare two names.
 *
 * @returns { result, score, reasons[], says }
 */
export function compareNames(entered, onDocument) {
  const a = normaliseName(entered)
  const b = normaliseName(onDocument)

  if (!a.length || !b.length) {
    return {
      result: MATCH.NOT_AVAILABLE,
      score: 0,
      reasons: ['one side is missing'],
      says: null,
    }
  }

  /* Order-insensitive: south Indian names frequently lead with a
     family or village name, so "Kumar Rajesh" and "Rajesh Kumar" are
     the same person written by two conventions. */
  const remaining = [...b]
  const reasons = []
  let exact = 0
  let soft = 0
  let initials = 0

  for (const word of a) {
    let bestIdx = -1
    let bestKind = 'different'
    const rank = { same: 4, sounds: 3, close: 2, initial: 1, different: 0 }

    for (let i = 0; i < remaining.length; i++) {
      const kind = compareWord(word, remaining[i])
      if (rank[kind] > rank[bestKind]) { bestKind = kind; bestIdx = i }
      if (kind === 'same') break
    }

    if (bestKind === 'different') continue
    remaining.splice(bestIdx, 1)

    if (bestKind === 'same') exact++
    else if (bestKind === 'initial') { initials++; reasons.push(`${word} matched as an initial`) }
    else { soft++; reasons.push(`${word} matched by spelling`) }
  }

  const matched = exact + soft + initials
  const longer = Math.max(a.length, b.length)
  const shorter = Math.min(a.length, b.length)
  const score = matched / longer

  /* ── The ladder ───────────────────────────────────────────────────
     Every word accounted for, and none of them merely an initial:
     the same name. */
  if (matched === longer && initials === 0 && soft === 0) {
    return { result: MATCH.MATCH, score: 1, reasons: [], says: null }
  }

  /* Every word accounted for, but some by initial or spelling. A human
     would say yes; a machine should not say yes on its own. */
  if (matched === longer) {
    return {
      result: MATCH.PARTIAL,
      score,
      reasons,
      says: 'The names are close but not identical. A reviewer will check this.',
    }
  }

  /* Every word of the SHORTER name is accounted for -- a mononym or a
     dropped middle name against a fuller one. Common and legitimate. */
  if (matched === shorter && shorter > 0) {
    return {
      result: MATCH.PARTIAL,
      score,
      reasons: [...reasons, 'one name has more parts than the other'],
      says: 'One version of the name has more parts than the other. A reviewer will check this.',
    }
  }

  /* The surname alone agreeing is not enough. "Rajesh Kumar" against
     "Ramesh Kumar" shares a word and is two people. */
  return {
    result: MATCH.MISMATCH,
    score,
    reasons: reasons.length ? reasons : ['no parts of the name matched'],
    says: 'That name does not match the document. Check you have entered it as printed.',
  }
}

/**
 * What a match result should do to a document.
 *
 * Deliberately never auto-rejects. A MISMATCH sets REQUIRES_ACTION so
 * the partner can correct a typo; only a human marks something rejected.
 */
export function matchOutcome(result) {
  switch (result) {
    case MATCH.MATCH: return { blocks: false, review: false, requiresAction: false }
    case MATCH.PARTIAL: return { blocks: false, review: true, requiresAction: false }
    case MATCH.MISMATCH: return { blocks: true, review: true, requiresAction: true }
    default: return { blocks: false, review: false, requiresAction: false }
  }
}
