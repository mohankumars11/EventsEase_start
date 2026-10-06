import { supabase } from './supabase'

/**
 * What the partner has agreed to, and what they can take back.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REFUSING MUST COST NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every caller of this module has to behave the same way when the answer
 * is no: carry on. A face match that is refused means an operator
 * compares the photographs by eye, which is what happened before any of
 * this existed and works perfectly well.
 *
 * That is not politeness. Consent under the DPDP Act 2023 has to be
 * FREELY given, and consent you must give to keep earning is not freely
 * given — so a refusal that blocked onboarding would make every other
 * consent in the app worthless too.
 *
 * Migration 150 leaves the record append-only for the same reason:
 * withdrawal is a new row, so "they agreed in September and withdrew in
 * March" stays readable, which an overwrite would destroy.
 */

/** Purposes, matching 150's CHECK. A new purpose is a new asking. */
export const CONSENT = {
  FACE_MATCH: 'face_match',
  BACKGROUND_CHECK: 'background_check',
  DOCUMENT_SHARING: 'document_sharing',
}

/** Bump when the WORDING changes. Consent to v1 is not consent to v2. */
export const CONSENT_VERSION = 'v1'

const missingRelation = error =>
  error?.code === '42P01' || error?.code === 'PGRST202' ||
  /does not exist|not find the function/i.test(error?.message ?? '')

/**
 * The current position for every purpose.
 *
 * Returns `{ consents, unavailable }`. A missing table is `unavailable`
 * and every purpose reads false — which is correct, not a degradation:
 * no record means nobody agreed to anything.
 */
export async function fetchConsents(vendorId) {
  if (!vendorId) return { consents: {}, unavailable: false }

  const { data, error } = await supabase
    .from('partner_consents')
    .select('purpose, granted, version, at')
    .eq('vendor_id', vendorId)
    .order('at', { ascending: false })

  if (error) {
    if (missingRelation(error)) return { consents: {}, unavailable: true }
    return { consents: {}, unavailable: true, error: error.message }
  }

  /* Latest row per purpose wins; the list arrives newest first, so the
     first sighting of a purpose is the current answer. */
  const consents = {}
  for (const row of data ?? []) {
    if (consents[row.purpose] === undefined) {
      consents[row.purpose] = { granted: !!row.granted, version: row.version, at: row.at }
    }
  }
  return { consents, unavailable: false }
}

/** Is this one live, at the version currently being shown? */
export function hasConsent(consents, purpose) {
  const c = consents?.[purpose]
  return !!c?.granted && c.version === CONSENT_VERSION
}

/**
 * Record a decision. `granted: false` is a withdrawal.
 *
 * Goes through the RPC rather than an INSERT, so the timestamp is the
 * server's clock and the caller is the real caller. 150 gives the table
 * no INSERT policy at all, so a direct write would be refused anyway.
 */
export async function setConsent(vendorId, purpose, granted) {
  const { data, error } = await supabase.rpc('set_consent', {
    p_vendor: vendorId,
    p_purpose: purpose,
    p_granted: granted,
    p_version: CONSENT_VERSION,
  })
  if (error) {
    if (missingRelation(error)) {
      /* 150 is not applied. Saying "yes, saved" would be a lie, and
         saying nothing would leave the partner pressing a dead button. */
      throw new Error('We cannot record that just now. Nothing has changed.')
    }
    throw new Error(error.message)
  }
  return data
}
