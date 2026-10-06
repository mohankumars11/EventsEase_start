/**
 * A provider that answers deterministically, for development.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DETERMINISTIC, NOT RANDOM
 * ══════════════════════════════════════════════════════════════════════
 *
 * A mock that returns a random outcome makes a test suite that fails
 * one run in eight and is therefore ignored. Every answer here is a
 * pure function of its input: the same name or number always produces
 * the same verdict, so a guard can assert "this one is a mismatch" and
 * mean it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEVER A REAL DOCUMENT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The triggers are names, not numbers scraped from anybody's card. A
 * real Aadhaar in a test file is a real Aadhaar in the repository, in
 * every clone of it, forever.
 *
 * Trigger on the HOLDER NAME so the same seven cases work across every
 * document type without needing seven valid-checksum numbers per type:
 *
 *   TEST_IDENTITY_VALID      verified
 *   TEST_IDENTITY_MISMATCH   the number exists, the name does not match
 *   TEST_DOCUMENT_EXPIRED    found, but past its validity
 *   TEST_DOCUMENT_BLURRY     unreadable — the document tier, not identity
 *   TEST_FACE_MISMATCH       face does not match the portrait
 *   TEST_PROVIDER_TIMEOUT    unavailable — NOT invalid
 *   TEST_MANUAL_REVIEW       inconclusive, route to a human
 *
 * Anything else verifies, so a developer filling the form in normally
 * sees the happy path without having to know any of this.
 */

import { PROVIDER_STATUS, notChecked } from './index'

export const TEST_IDENTITIES = {
  TEST_IDENTITY_VALID: 'valid',
  TEST_IDENTITY_MISMATCH: 'mismatch',
  TEST_DOCUMENT_EXPIRED: 'expired',
  TEST_DOCUMENT_BLURRY: 'blurry',
  TEST_FACE_MISMATCH: 'face_mismatch',
  TEST_PROVIDER_TIMEOUT: 'timeout',
  TEST_MANUAL_REVIEW: 'manual',
}

/** Which scenario a set of inputs selects. Case and spacing tolerant. */
export function scenarioFor(input = {}) {
  const probe = [input.holderName, input.name, input.number, input.reference]
    .filter(Boolean)
    .map(v => String(v).toUpperCase().replace(/[\s_-]/g, ''))

  for (const [key, scenario] of Object.entries(TEST_IDENTITIES)) {
    const flat = key.replace(/_/g, '')
    if (probe.some(p => p.includes(flat))) return scenario
  }
  return 'valid'
}

/* A stable pseudo-reference, so a replay of the same input produces the
   same provider_ref and a test can assert on it. */
function referenceFor(prefix, input) {
  const basis = JSON.stringify([input?.kind, input?.number, input?.holderName])
  let h = 0
  for (let i = 0; i < basis.length; i++) h = (h * 31 + basis.charCodeAt(i)) >>> 0
  return `${prefix}_${h.toString(16).padStart(8, '0').toUpperCase()}`
}

const envelope = (providerStatus, input, prefix, says, extra = {}) => ({
  providerStatus,
  provider: 'mock',
  reference: providerStatus === PROVIDER_STATUS.UNAVAILABLE ? null : referenceFor(prefix, input),
  says,
  ...extra,
})

export const MockProvider = {
  name: 'mock',

  async verifyIdentity(input = {}) {
    switch (scenarioFor(input)) {
      case 'mismatch':
        return envelope(PROVIDER_STATUS.MISMATCH, input, 'IDN',
          'The number is registered to a different name.')
      case 'expired':
        return envelope(PROVIDER_STATUS.NOT_FOUND, input, 'IDN',
          'That document is no longer valid at the issuer.')
      case 'timeout':
        return envelope(PROVIDER_STATUS.UNAVAILABLE, input, 'IDN',
          'The issuer did not respond. Sent for review instead.')
      case 'manual':
        return envelope(PROVIDER_STATUS.PENDING, input, 'IDN',
          'This one needs a person to look at it.')
      case 'blurry':
        /* A blurry photo is a DOCUMENT problem. The identity tier has
           no opinion about it, and pretending otherwise would tell a
           partner their Aadhaar is wrong when their camera was. */
        return notChecked('The photo could not be read, so the number was not checked.')
      default:
        return envelope(PROVIDER_STATUS.VERIFIED, input, 'IDN', 'Identity verified.')
    }
  },

  async verifyBusiness(input = {}) {
    switch (scenarioFor(input)) {
      case 'mismatch':
        return envelope(PROVIDER_STATUS.MISMATCH, input, 'BIZ',
          'That registration belongs to a different business name.')
      case 'expired':
        return envelope(PROVIDER_STATUS.NOT_FOUND, input, 'BIZ',
          'That registration is cancelled or lapsed.')
      case 'timeout':
        return envelope(PROVIDER_STATUS.UNAVAILABLE, input, 'BIZ',
          'The registry did not respond. Sent for review instead.')
      case 'manual':
        return envelope(PROVIDER_STATUS.PENDING, input, 'BIZ', 'Sent for review.')
      default:
        return envelope(PROVIDER_STATUS.VERIFIED, input, 'BIZ', 'Business registration verified.')
    }
  },

  /**
   * OCR. Returns FIELDS, never a verdict.
   *
   * Extraction is not verification, and this is the layer where that is
   * easiest to get wrong. A successful read means some text came off a
   * photograph; it says nothing about whether the document is real or
   * belongs to the person holding it.
   */
  async readDocument(input = {}) {
    const scenario = scenarioFor(input)
    if (scenario === 'blurry') {
      return envelope(PROVIDER_STATUS.ERROR, input, 'OCR',
        'The photo was too unclear to read. Please upload a clearer one.',
        { fields: null, confidence: 0.1 })
    }
    if (scenario === 'timeout') {
      return envelope(PROVIDER_STATUS.UNAVAILABLE, input, 'OCR',
        'We could not read the document just now.', { fields: null })
    }
    return envelope(PROVIDER_STATUS.VERIFIED, input, 'OCR', 'Document read.', {
      /* Deliberately echoes what it was given rather than inventing a
         name. A mock that returned "Ravi Kumar" would make every
         name-match test pass for the wrong reason. */
      fields: {
        name: input.holderName ?? null,
        number: input.number ?? null,
        expiryDate: scenario === 'expired' ? '2020-01-01' : (input.expiryDate ?? null),
        issuingAuthority: input.issuingAuthority ?? null,
      },
      confidence: 0.94,
    })
  },

  async matchFace(input = {}) {
    switch (scenarioFor(input)) {
      case 'face_mismatch':
        return envelope(PROVIDER_STATUS.MISMATCH, input, 'FAC',
          'Your selfie could not be matched confidently with the uploaded identity document. Please try again in good lighting.',
          { confidence: 0.21 })
      case 'timeout':
        return envelope(PROVIDER_STATUS.UNAVAILABLE, input, 'FAC',
          'The check did not complete. Sent for review instead.')
      case 'manual':
        return envelope(PROVIDER_STATUS.PENDING, input, 'FAC',
          'The match was not clear enough to decide automatically.', { confidence: 0.58 })
      default:
        return envelope(PROVIDER_STATUS.VERIFIED, input, 'FAC', 'Photo matched.', { confidence: 0.96 })
    }
  },

  /**
   * Penny-drop.
   *
   * The real one credits ₹1 and reads back the name the bank holds.
   * The mock returns the same envelope so the calling code, and the
   * name-match that follows it, are exercised now rather than written
   * blind on the day a provider is signed.
   */
  async verifyBankAccount(input = {}) {
    switch (scenarioFor(input)) {
      case 'mismatch':
        return envelope(PROVIDER_STATUS.MISMATCH, input, 'BNK',
          'The bank returned a different name for that account.',
          { accountName: 'SOMEBODY ELSE' })
      case 'expired':
      case 'manual':
        return envelope(PROVIDER_STATUS.NOT_FOUND, input, 'BNK',
          'The bank did not recognise that account number.')
      case 'timeout':
        return envelope(PROVIDER_STATUS.UNAVAILABLE, input, 'BNK',
          'The bank did not respond. Your payout details are saved and will be checked shortly.')
      default:
        return envelope(PROVIDER_STATUS.VERIFIED, input, 'BNK', 'Bank account verified.',
          { accountName: input.holderName ?? input.name ?? null })
    }
  },
}
