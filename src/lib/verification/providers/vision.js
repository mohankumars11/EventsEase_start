import { PROVIDER_STATUS, notChecked } from './index'

/**
 * The provider that looks at the photograph.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT ANSWERS AND WHAT IT DOES NOT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `readDocument` posts the image to /api/verify-document and comes back
 * with what the image APPEARS to be and what appears to be printed on
 * it. That is extraction, and extraction is the only thing on this
 * ladder that does not need a commercial contract.
 *
 * `verifyIdentity`, `verifyBusiness` and `verifyBankAccount` are
 * deliberately NOT implemented here. They fall through to the null
 * provider's `not_checked`, because answering them truthfully means
 * asking UIDAI, GSTN or a bank, and reading a card with a camera does
 * not do that. A provider that returned `verified` from a photograph
 * would be the single most damaging line of code in this repository:
 * every screen downstream believes that word.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE STATUS LADDER, AND THE RUNG THAT IS NOT ON IT
 * ══════════════════════════════════════════════════════════════════════
 *
 *   not_checked   nothing looked at it
 *   checked       read, and it is the document it was filed as
 *   mismatch      read, and it is NOT
 *   unavailable   we could not look; says nothing about the document
 *   verified      ← never returned here, by anybody, for any reason
 *
 * `unavailable` and `mismatch` being distinct is the whole point of the
 * design. An outage on our side must never render as the partner's
 * document being wrong.
 */

const ENDPOINT = '/api/verify-document'

/* Long enough for a slow model on a slow connection; short enough that
   a partner holding a card is not left watching a spinner. Past this, a
   human reviews it, which was always the fallback. */
const TIMEOUT_MS = 30_000

/**
 * A File to base64, without the data: prefix.
 *
 * FileReader rather than fetch+arrayBuffer+btoa: btoa on a large binary
 * string blows the argument limit on some Android WebViews, and the
 * failure looks like a corrupt image rather than a crash.
 */
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That photo could not be read on this device.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

export const VisionProvider = {
  name: 'vision',

  /**
   * @param {object}   input
   * @param {File}     input.file          the image the partner just chose
   * @param {string}   input.expectedType  what it was filed as, e.g. 'aadhaar'
   * @param {string}   input.requirementId
   * @param {string}   input.vendorId
   * @param {string}   input.accessToken   the partner's own Supabase token
   */
  async readDocument({ file, expectedType, requirementId, vendorId, accessToken }) {
    if (!file) return notChecked('There is no image to read.')
    if (!accessToken) return notChecked('Please sign in again.')

    const imageBase64 = await toBase64(file)

    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type,
        requirementId: requirementId ?? null,
        expectedType: expectedType ?? null,
        vendorId: vendorId ?? null,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    /* A non-200 is OUR failure. It is reported as such, in the partner's
       words, and it never touches the document's standing. */
    if (!r.ok) {
      return {
        providerStatus: PROVIDER_STATUS.UNAVAILABLE,
        provider: 'vision',
        reference: null,
        says: 'We could not check that just now. A person will look at it instead.',
      }
    }

    const json = await r.json()

    if (json.providerStatus === 'unavailable' || json.providerStatus === 'not_checked') {
      return {
        providerStatus: json.providerStatus,
        provider: 'vision',
        reference: null,
        says: json.says ?? 'A person will look at this.',
      }
    }

    return {
      providerStatus: 'checked',
      provider: 'vision',
      reference: null,
      documentType: json.documentType ?? null,
      confidence: typeof json.confidence === 'number' ? json.confidence : null,
      isDocument: json.isDocument !== false,
      whatYouSee: json.whatYouSee ?? null,
      legible: json.legible !== false,
      extracted: json.extracted ?? {},
      says: null,
    }
  },
}

/**
 * Below what confidence a reading is treated as "could not tell".
 *
 * Set where it is, rather than higher, on purpose. A laminated Aadhaar
 * card photographed at an angle in a kitchen is a genuinely hard image,
 * and refusing it would send a real partner round in circles with a real
 * document in their hand. Below this, nothing is asserted either way and
 * the document goes to a human — which is where an uncertain answer
 * belongs.
 */
export const CONFIDENT_ENOUGH = 0.55

/**
 * What to tell the partner, in their own terms.
 *
 * ── The refusal names what it saw ───────────────────────────────────
 * "Invalid document" teaches nobody anything and reads as an accusation.
 * "That looks like a laptop, not an Aadhaar card" is the same refusal
 * and it tells them exactly what to do next — which is the entire
 * difference between a check and an obstacle.
 *
 * Returns { ok, fatal, says }. `fatal` is the only thing that stops the
 * upload; everything else is said and then allowed through, because a
 * human still sees it and a false refusal costs more than a false pass.
 */
export function judgeReading(reading, requirement) {
  const expected = requirement?.detectAs ?? null
  const label = requirement?.label ?? 'this document'

  if (!reading || reading.providerStatus !== 'checked') {
    return { ok: true, fatal: false, says: reading?.says ?? null, uncertain: true }
  }

  /* Not a document at all. The clearest case, and the one that was
     silently accepted before any of this existed. */
  if (reading.isDocument === false) {
    const saw = reading.whatYouSee ? `That looks like ${reading.whatYouSee}` : 'That does not look like a document'
    return {
      ok: false,
      fatal: true,
      says: `${saw}, not ${label.toLowerCase()}. Please photograph the document itself.`,
    }
  }

  if (reading.legible === false) {
    return {
      ok: false,
      fatal: true,
      says: `We could not read ${label.toLowerCase()} in that photo. Try again in better light, with the whole document in frame.`,
    }
  }

  /* Nothing to compare against: the requirement did not declare what it
     should look like. Silence is correct — asserting a match we cannot
     check would be worse than asserting nothing. */
  if (!expected) return { ok: true, fatal: false, says: null }

  if ((reading.confidence ?? 0) < CONFIDENT_ENOUGH) {
    return {
      ok: true, fatal: false, uncertain: true,
      says: `We could not tell for certain that this is ${label.toLowerCase()}. A person will check it.`,
    }
  }

  const accepted = Array.isArray(expected) ? expected : [expected]
  if (!accepted.includes(reading.documentType)) {
    return {
      ok: false,
      fatal: true,
      says: `That looks like ${friendly(reading.documentType)}, not ${label.toLowerCase()}. Upload it under the right heading, or photograph the right document.`,
    }
  }

  return { ok: true, fatal: false, says: `That is ${label.toLowerCase()} — read successfully.` }
}

const FRIENDLY = {
  aadhaar: 'an Aadhaar card',
  pan: 'a PAN card',
  passport: 'a passport',
  voter_id: 'a voter ID',
  driving_licence: 'a driving licence',
  vehicle_rc: 'a vehicle registration certificate',
  gst_certificate: 'a GST certificate',
  fssai_licence: 'an FSSAI licence',
  shop_licence: 'a shop licence',
  udyam: 'an Udyam certificate',
  insurance_policy: 'an insurance policy',
  bank_statement: 'a bank statement',
  cancelled_cheque: 'a cancelled cheque',
  police_clearance: 'a police clearance certificate',
  psara_licence: 'a PSARA licence',
  selfie: 'a photograph of a person',
  other_document: 'a different document',
  not_a_document: 'something other than a document',
}

const friendly = type => FRIENDLY[type] ?? 'a different document'
