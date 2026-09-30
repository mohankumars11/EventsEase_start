import { MockProvider } from './mock'
import { VisionProvider } from './vision'

/**
 * The seam a licensed verification provider plugs into.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY AN ABSTRACTION BEFORE THERE IS ANYTHING TO ABSTRACT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Sambramo has no contract with Signzy, Karza, IDfy, Surepass or
 * Cashfree, and will have exactly one. Writing the onboarding screens
 * directly against whichever is signed would mean rebuilding them the
 * first time the price changes or the coverage turns out to be wrong —
 * which in this market is a when, not an if.
 *
 * So the screens talk to `VerificationService`, the service talks to
 * four contracts, and a provider is a file that implements them. The
 * mock implements them too, which is what lets the whole flow be built
 * and tested today.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DEFAULT IS not_checked, AND THAT IS THE POINT
 * ══════════════════════════════════════════════════════════════════════
 *
 * With no provider configured, every method returns `not_checked`. Not
 * `verified`, not `unavailable`, not an optimistic pass. A screen
 * reading `not_checked` says "checked" at most — the offline checksum —
 * and never "verified".
 *
 * The mock is only reachable when it is asked for explicitly. It cannot
 * be reached by accident in a production build: `resolveProvider` reads
 * an allow-list, and `MockProvider` is not in it unless
 * VITE_VERIFY_PROVIDER says `mock`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FOUR CONTRACTS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   IdentityProvider   Aadhaar / PAN / DL — a person
 *   BusinessProvider   GSTIN / FSSAI / Udyam — an entity
 *   DocumentProvider   OCR, quality, tamper signals — a file
 *   BankProvider       penny-drop — an account and the name on it
 *
 * Every method returns the same envelope so a caller never has to know
 * which one answered:
 *
 *   { providerStatus, provider, reference, fields?, confidence?, says }
 *
 * `providerStatus` is migration 142's vocabulary verbatim:
 *   not_checked | pending | verified | mismatch | not_found |
 *   unavailable | error
 *
 * `unavailable` NEVER means invalid. A provider being down says nothing
 * about a document, and a system that conflates the two rejects real
 * partners on the day an API has an outage.
 */

export const PROVIDER_STATUS = {
  NOT_CHECKED: 'not_checked',
  PENDING: 'pending',
  VERIFIED: 'verified',
  MISMATCH: 'mismatch',
  NOT_FOUND: 'not_found',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error',
}

/** The answer when nothing is configured. Honest, and the default. */
export function notChecked(reason = 'No verification provider is configured.') {
  return {
    providerStatus: PROVIDER_STATUS.NOT_CHECKED,
    provider: null,
    reference: null,
    says: reason,
  }
}

/**
 * A provider that does nothing, truthfully.
 *
 * Every real provider implements this shape. Anything it does not
 * implement falls through to `not_checked` rather than throwing, so
 * signing with a provider that covers PAN but not FSSAI does not
 * require a code change to avoid crashing on FSSAI.
 */
export const NullProvider = {
  name: null,
  async verifyIdentity() { return notChecked() },
  async verifyBusiness() { return notChecked() },
  async readDocument() { return notChecked('No OCR provider is configured.') },
  async matchFace() { return notChecked('No face-match provider is configured.') },
  async verifyBankAccount() { return notChecked('No bank verification provider is configured.') },
}

/* ── Which provider, and who may ask for it ──────────────────────────
   An allow-list rather than a lookup, so a typo in an env var produces
   the null provider — which is safe — instead of an undefined one,
   which throws in front of a partner mid-upload. */
const REGISTRY = {
  mock: () => MockProvider,
  none: () => NullProvider,
  /* Reads a photograph and says what it is. Extraction only -- it
     implements readDocument and nothing else, so verifyIdentity and the
     rest still fall through to NullProvider's honest not_checked. See
     the header of ./vision.js for why that matters. */
  vision: () => VisionProvider,
}

export function resolveProvider(name) {
  const key = String(name ?? '').trim().toLowerCase()
  const make = REGISTRY[key]
  if (!make) return NullProvider
  return make()
}

/** Read once. `import.meta.env` is compiled in, so this is a constant. */
function configuredName() {
  try {
    return import.meta.env?.VITE_VERIFY_PROVIDER ?? 'none'
  } catch {
    return 'none'
  }
}

/**
 * The one object the app talks to.
 *
 * Every method catches. A provider throwing — a network failure, a
 * malformed response, an expired key — must surface as `unavailable`,
 * because the alternative is an exception in the middle of a partner
 * uploading a photograph, and nothing about that tells them what to do.
 */
export class VerificationService {
  constructor(provider) {
    this.provider = provider ?? resolveProvider(configuredName())
  }

  get name() { return this.provider?.name ?? null }
  get configured() { return !!this.provider?.name }

  async #call(method, args, what) {
    const fn = this.provider?.[method]
    if (typeof fn !== 'function') return notChecked()
    try {
      const out = await fn.call(this.provider, args)
      return out ?? notChecked()
    } catch (e) {
      return {
        providerStatus: PROVIDER_STATUS.UNAVAILABLE,
        provider: this.provider?.name ?? null,
        reference: null,
        /* Deliberately not "invalid". We do not know that. */
        says: `We could not check your ${what} just now. It has been sent for review instead.`,
        error: e?.message ?? String(e),
      }
    }
  }

  verifyIdentity(args) { return this.#call('verifyIdentity', args, 'identity document') }
  verifyBusiness(args) { return this.#call('verifyBusiness', args, 'registration') }
  readDocument(args) { return this.#call('readDocument', args, 'document') }
  matchFace(args) { return this.#call('matchFace', args, 'photo') }
  verifyBankAccount(args) { return this.#call('verifyBankAccount', args, 'bank account') }
}

/** The shared instance the app uses. */
export const verification = new VerificationService()

/**
 * What a document row should be written with, given a provider answer.
 *
 * Kept here rather than at the call site so the mapping from a provider
 * envelope to migration 142's columns exists once. `checksum_ok` is
 * NOT touched — that is the offline tier and it is write-once.
 */
export function providerColumns(result) {
  if (!result) return {}
  return {
    provider_status: result.providerStatus ?? PROVIDER_STATUS.NOT_CHECKED,
    provider_name: result.provider ?? null,
    provider_ref: result.reference ?? null,
    provider_at: result.providerStatus && result.providerStatus !== PROVIDER_STATUS.NOT_CHECKED
      ? new Date().toISOString()
      : null,
  }
}
