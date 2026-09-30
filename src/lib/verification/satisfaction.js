import { istTodayISO } from '../istTime'

/**
 * Is this requirement actually met?
 *
 * ══════════════════════════════════════════════════════════════════════
 * A FILE IS NOT A SATISFIED REQUIREMENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old test was `documents[r.documentKind]` — truthy if any row
 * existed under that kind. It was wrong three ways at once:
 *
 *   it counted a row under a SHARED kind, so one upload satisfied five
 *   different trade requirements (migration 143's whole subject)
 *
 *   it counted a document with no number, no holder name and no expiry
 *   date, even where the requirement declares all three
 *
 *   it counted an EXPIRED document, because nothing looked at the date
 *
 * So a partner could be marked compliant holding one photograph of an
 * out-of-date licence belonging to somebody else.
 *
 * This asks the requirement what it needs, then checks the row has it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * INCOMPLETE IS NOT REJECTED
 * ══════════════════════════════════════════════════════════════════════
 *
 * `missing` lists what is still wanted, so the screen can say "the back
 * of the card and its expiry date" rather than a red cross. A partner
 * who has uploaded a front and stopped has not failed; they have not
 * finished, and those read differently.
 */

export const DOC_STATE = {
  NONE: 'none',
  INCOMPLETE: 'incomplete',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
  PENDING: 'pending',
  VERIFIED: 'verified',
}

/** Days until an expiry date, in IST. Negative once past. */
export function daysUntil(dateISO, today = istTodayISO()) {
  if (!dateISO) return null
  const a = Date.parse(`${String(dateISO).slice(0, 10)}T00:00:00+05:30`)
  const b = Date.parse(`${today}T00:00:00+05:30`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((a - b) / 86_400_000)
}

/**
 * @param requirement from requirementsFor()
 * @param row         the vendor_documents row, or null
 * @returns { state, satisfied, missing[], expiresInDays, says, row }
 *
 * `row` is echoed back deliberately. Without it the two entry points
 * returned different shapes -- evaluateAll attached the row, this one
 * did not -- so a component written against one silently rendered an
 * empty upload slot when handed the other. That is exactly what
 * happened to DocumentCapture: a document with a stored front showed
 * "Add photo".
 */
export function evaluateRequirement(requirement, row, today = istTodayISO()) {
  if (!requirement) return { state: DOC_STATE.NONE, satisfied: false, missing: [], says: null }

  if (!row) {
    return {
      state: DOC_STATE.NONE,
      satisfied: false,
      missing: ['document'],
      expiresInDays: null,
      says: null,
      row: null,
    }
  }

  if (row.status === 'rejected') {
    return {
      state: DOC_STATE.REJECTED,
      satisfied: false,
      missing: [],
      expiresInDays: null,
      says: row.review_note || 'This was sent back. Please upload it again.',
      row,
    }
  }

  /* ── What the requirement declares, checked one at a time ──────────
     The order is the order a person would fix them in: the images
     first, because without those there is nothing to read the rest
     off. */
  const missing = []
  if (requirement.frontRequired && !row.storage_path) missing.push('front')
  if (requirement.backRequired && !row.back_path) missing.push('back')
  if (requirement.numberRequired && !row.number_last4) missing.push('number')
  if (requirement.holderNameRequired && !row.holder_name) missing.push('holder name')
  if (requirement.issuingAuthorityRequired && !row.issuing_authority) missing.push('issuing authority')
  if (requirement.expiryRequired && !row.expires_on) missing.push('expiry date')

  const expiresInDays = daysUntil(row.expires_on, today)

  if (missing.length) {
    return {
      state: DOC_STATE.INCOMPLETE,
      satisfied: false,
      missing,
      expiresInDays,
      says: `Still needs the ${missing.join(', the ')}.`,
      row,
    }
  }

  /* ── An expired document is not a document ─────────────────────────
     Checked AFTER completeness so a partner is told about a missing
     field rather than an expiry they cannot fix until they have the
     new one in hand. */
  if (expiresInDays !== null && expiresInDays < 0) {
    return {
      state: DOC_STATE.EXPIRED,
      satisfied: false,
      missing: [],
      expiresInDays,
      says: 'This has expired. Upload a current one.',
      row,
    }
  }

  /* `minimumValidityDays` is the requirement's own margin: an insurance
     certificate with three days left is technically valid and useless
     for an event next month. It warns, it does not block. */
  const thin = requirement.minimumValidityDays != null
    && expiresInDays !== null
    && expiresInDays < requirement.minimumValidityDays

  const verified = row.status === 'accepted' || row.provider_status === 'verified'

  return {
    state: verified ? DOC_STATE.VERIFIED : DOC_STATE.PENDING,
    satisfied: true,
    missing: [],
    expiresInDays,
    expiringSoon: thin,
    says: thin ? `Expires in ${expiresInDays} days — worth renewing before it does.` : null,
    row,
  }
}

/**
 * Every requirement for this partner, with its state.
 *
 * @param requirements  from requirementsFor()
 * @param byRequirement from fetchDocuments()
 */
export function evaluateAll(requirements = [], byRequirement = {}, today = istTodayISO()) {
  const results = {}
  let satisfied = 0
  let requiredTotal = 0
  let requiredSatisfied = 0

  for (const r of requirements) {
    /* A row written before 143 sits under `legacy:<kind>`. It is only
       accepted for a requirement whose kind is not shared, because
       'shop_licence' cannot be attributed to one of five. */
    const row = byRequirement[r.id] ?? legacyRow(r, byRequirement)
    const res = evaluateRequirement(r, row, today)
    results[r.id] = { ...res, requirement: r, row: row ?? null }
    if (res.satisfied) satisfied++
    if (r.required) {
      requiredTotal++
      if (res.satisfied) requiredSatisfied++
    }
  }

  return {
    results,
    satisfied,
    total: requirements.length,
    requiredTotal,
    requiredSatisfied,
    /* This is what Continue reads. With MANDATORY_FROM unset there are
       no required requirements, so it is true — enforcement is one
       switch, not a rewrite of this function. */
    canSubmit: requiredSatisfied === requiredTotal,
  }
}

const SHARED_KINDS = new Set(['shop_licence', 'other', 'insurance'])

function legacyRow(requirement, byRequirement) {
  if (SHARED_KINDS.has(requirement.kind)) return null
  return byRequirement[`legacy:${requirement.kind}`] ?? null
}
