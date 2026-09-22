import { compareNames, MATCH } from './matching'
import { daysUntil } from './satisfaction'

/**
 * How worried should a reviewer be about this application?
 *
 * ══════════════════════════════════════════════════════════════════════
 * A SCORE ROUTES, IT NEVER PUNISHES
 * ══════════════════════════════════════════════════════════════════════
 *
 * HIGH sends an application to a human. It does not suspend anybody, it
 * does not reject anything, and it is never shown to the partner as an
 * accusation. That is not squeamishness — every signal below has an
 * innocent explanation, and several of them are COMMON:
 *
 *   two accounts on one bank account   a husband and wife working the
 *                                      same trade from one household
 *   two accounts on one phone          a shared family handset
 *   one identity on two accounts       somebody who forgot they had
 *                                      already signed up
 *
 * A system that auto-banned on any of these would be banning real
 * partners weekly. What they justify is a person looking, which is
 * exactly what `MANUAL_REVIEW` means.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PURE: FACTS IN, SIGNALS OUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing here queries. The caller gathers the facts — which is a
 * handful of SQL counts — and this decides what they mean, so the whole
 * ladder is testable without a database.
 */

export const RISK = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' }

/**
 * Every signal, with its weight and its innocent explanation.
 *
 * `weight` is deliberately coarse. A finely-tuned score implies a
 * precision this has no way to earn, and invites somebody to treat 71
 * as meaningfully different from 68.
 */
export const SIGNALS = {
  DUPLICATE_DOCUMENT: {
    weight: 40,
    label: 'This document number is already on another account',
    innocent: 'A partner who signed up twice and forgot.',
  },
  SHARED_BANK: {
    weight: 25,
    label: 'This bank account is used by another partner',
    innocent: 'A household sharing one account — common with spouses in the same trade.',
  },
  SHARED_PHONE: {
    weight: 15,
    label: 'This phone number is on another identity',
    innocent: 'A shared family handset.',
  },
  NAME_MISMATCH: {
    /* Strong enough to reach HIGH alone, and deliberately so. This is
       an IDENTITY document not matching the person presenting it --
       the one signal here that goes to whether they are who they say.

       The "trades under a different name" explanation belongs to
       BUSINESS_NAME_MISMATCH below, which is a different fact and
       weighted far lower. Borrowing it here was the reason this sat at
       35, one point under the threshold, and let a mismatched Aadhaar
       through on a MEDIUM.

       Note the matcher is already generous: initials, reordering,
       mononyms and transliteration all return PARTIAL, not MISMATCH,
       so reaching this signal at all means the names genuinely differ. */
    weight: 40,
    label: 'The name entered does not match the identity document',
    innocent: 'A married name, or a legal name that differs from the one they are known by.',
  },
  OCR_DISAGREES: {
    weight: 20,
    label: 'What was typed does not match what was read off the document',
    innocent: 'A misread photograph — OCR is not evidence on its own.',
  },
  IMPOSSIBLE_DOB: {
    weight: 45,
    label: 'The date of birth is not possible',
    innocent: 'A typed year, or a date entered in the wrong order.',
  },
  EXPIRED_DOCUMENT: {
    weight: 20,
    label: 'A document is out of date',
    innocent: 'A renewal in progress.',
  },
  REPEATED_FAILURES: {
    weight: 30,
    label: 'Verification has failed several times',
    innocent: 'A bad camera and a lot of patience.',
  },
  RAPID_SIGNUPS: {
    weight: 25,
    label: 'Several accounts created from here in a short window',
    innocent: 'An agency onboarding its own staff.',
  },
  BUSINESS_NAME_MISMATCH: {
    weight: 15,
    label: 'The business name does not match the registration',
    innocent: 'A trading name that differs from the registered one.',
  },
}

/**
 * Turn facts into signals.
 *
 * @param facts {
 *   duplicateDocumentAccounts, sharedBankAccounts, sharedPhoneAccounts,
 *   enteredName, documentName, businessName, registeredName,
 *   ocrFields, enteredFields, dateOfBirth,
 *   expiredDocuments, failedAttempts, accountsFromDeviceLast24h,
 * }
 */
export function collectSignals(facts = {}) {
  const hits = []
  const add = (key, detail) => hits.push({ key, ...SIGNALS[key], detail })

  if ((facts.duplicateDocumentAccounts ?? 0) > 0) {
    add('DUPLICATE_DOCUMENT', `${facts.duplicateDocumentAccounts} other account(s)`)
  }
  if ((facts.sharedBankAccounts ?? 0) > 0) {
    add('SHARED_BANK', `${facts.sharedBankAccounts} other account(s)`)
  }
  if ((facts.sharedPhoneAccounts ?? 0) > 0) {
    add('SHARED_PHONE', `${facts.sharedPhoneAccounts} other identity(ies)`)
  }

  if (facts.enteredName && facts.documentName) {
    const m = compareNames(facts.enteredName, facts.documentName)
    if (m.result === MATCH.MISMATCH) add('NAME_MISMATCH', m.says ?? '')
  }

  if (facts.businessName && facts.registeredName) {
    const m = compareNames(facts.businessName, facts.registeredName)
    if (m.result === MATCH.MISMATCH) add('BUSINESS_NAME_MISMATCH', '')
  }

  /* OCR disagreeing is a WEAK signal and weighted as one. A misread
     photograph is far more likely than a forged document, which is why
     this never reaches HIGH on its own. */
  if (facts.ocrFields && facts.enteredFields) {
    const differing = Object.keys(facts.enteredFields).filter(k => {
      const a = facts.enteredFields[k]
      const b = facts.ocrFields[k]
      if (!a || !b) return false
      return String(a).trim().toUpperCase() !== String(b).trim().toUpperCase()
    })
    if (differing.length) add('OCR_DISAGREES', differing.join(', '))
  }

  if (facts.dateOfBirth) {
    const age = yearsSince(facts.dateOfBirth)
    if (age === null || age < 18 || age > 100) {
      add('IMPOSSIBLE_DOB', age === null ? 'unreadable' : `${age} years old`)
    }
  }

  if ((facts.expiredDocuments ?? 0) > 0) {
    add('EXPIRED_DOCUMENT', `${facts.expiredDocuments} document(s)`)
  }
  if ((facts.failedAttempts ?? 0) >= 3) {
    add('REPEATED_FAILURES', `${facts.failedAttempts} attempts`)
  }
  if ((facts.accountsFromDeviceLast24h ?? 0) >= 3) {
    add('RAPID_SIGNUPS', `${facts.accountsFromDeviceLast24h} in 24 hours`)
  }

  return hits
}

function yearsSince(dateISO) {
  const days = daysUntil(dateISO)
  if (days === null) return null
  return Math.floor(-days / 365.25)
}

/**
 * The band, and what it means operationally.
 *
 * Thresholds are set so that NO SINGLE weak signal reaches HIGH — a
 * shared phone or a disagreeing OCR read must be joined by something
 * else before a person is pulled in. One strong signal does, because
 * "this Aadhaar is on another account" genuinely wants looking at.
 */
export function scoreRisk(signals = []) {
  const score = signals.reduce((n, s) => n + (s.weight ?? 0), 0)
  const band = score >= 40 ? RISK.HIGH : score >= 20 ? RISK.MEDIUM : RISK.LOW

  return {
    score,
    band,
    signals,
    /* The only automatic consequence. Never a suspension, never a
       rejection -- a score is a reason to look, not a verdict. */
    requiresManualReview: band === RISK.HIGH,
    says: band === RISK.HIGH
      ? 'Sent for a closer look before going live.'
      : null,
  }
}

/** Facts in, band out. */
export function assessRisk(facts = {}) {
  return scoreRisk(collectSignals(facts))
}

/**
 * What an operator reads.
 *
 * Every line carries its innocent explanation alongside the signal,
 * because a queue that lists only suspicions trains whoever reads it to
 * assume the worst of people who are usually fine.
 */
export function explainRisk(assessment) {
  return (assessment?.signals ?? []).map(s => ({
    label: s.label,
    detail: s.detail,
    innocent: s.innocent,
    weight: s.weight,
  }))
}
