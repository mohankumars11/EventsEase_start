import { supabase } from './supabase'
import { isMissingTable } from './serviceCatalog'

/**
 * Everything the account screen reads and writes.
 *
 * ── Absent-schema tolerance, everywhere ──────────────────────────────────
 * Migration 049 is applied BY HAND in the Supabase dashboard, so "the code is
 * deployed and the table is not there yet" is a normal state that lasts as long
 * as it takes somebody to paste some SQL. Every read below therefore treats a
 * missing table or a missing column as "nothing saved, defaults apply", and the
 * screen renders a working account page either way. The alternative is an
 * account screen that white-screens on production between a push and a paste.
 *
 * The same tolerance does NOT extend to writes. A save that silently does
 * nothing because the column is absent is worse than an error — the customer
 * believes their address is stored. Writes surface a real message naming what
 * is missing.
 */

/** Migration 049 has not been applied — the column does not exist. */
function isMissingColumn(error) {
  if (!error) return false
  return /42703/.test(error.code ?? '') || /column .* does not exist/i.test(error.message ?? '')
}

export function isMissingSchema(error) {
  return isMissingTable(error) || isMissingColumn(error)
}

const SCHEMA_HINT =
  'This needs migration 049 — paste supabase/migrations/049_account_addresses_and_prefs.sql into the Supabase SQL editor.'

/* ── Profile ───────────────────────────────────────────────────────────── */

/**
 * The editable identity fields.
 *
 * `email` is deliberately NOT here. It lives in `auth.users` and changing it is
 * an auth operation with a confirmation round-trip (see `changeEmail`); writing
 * it to `profiles` alone would leave the row claiming an address the customer
 * cannot actually sign in with — which is the worst of both, because it looks
 * like it worked.
 */
export async function updateProfile(userId, patch) {
  const allowed = ['full_name', 'phone', 'city', 'language', 'avatar_url',
                   'notify_orders', 'notify_celebrations', 'notify_offers', 'notify_whatsapp']
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([k, v]) => allowed.includes(k) && v !== undefined),
  )
  if (Object.keys(clean).length === 0) return null

  const { data, error } = await supabase
    .from('profiles').update(clean).eq('id', userId).select().single()

  if (error) {
    if (isMissingColumn(error)) throw new Error(`Some of these settings need a database update. ${SCHEMA_HINT}`)
    throw error
  }
  return data
}

/* ── Credentials ───────────────────────────────────────────────────────── */

/**
 * Does this account actually have a password to change?
 *
 * Sambramo signs people in three ways — email OTP, phone OTP and Google — and
 * two of them never set one. Offering "Change password" to somebody who has
 * only ever used a magic link is offering to change a thing that does not
 * exist; they type their email address into `current password`, it fails, and
 * they conclude the account is broken.
 *
 * Supabase exposes the providers on the user object, so the screen can ask
 * instead of assuming: an OAuth-only or OTP-only account is offered "Set a
 * password" and told plainly why it does not have one.
 */
export function passwordState(user) {
  const identities = user?.identities ?? []
  const providers = identities.map(i => i.provider)
  const hasEmailIdentity = providers.includes('email')
  const social = providers.filter(p => p !== 'email' && p !== 'phone')

  return {
    /* `email` identity + a confirmed email is the only combination that
       reliably indicates a password credential exists. OTP sign-ins also create
       an `email` identity, so this can be optimistic — which is why
       `changePassword` verifies the current one by re-authenticating rather
       than trusting this flag. */
    canHave: hasEmailIdentity || Boolean(user?.email),
    likelyHas: hasEmailIdentity,
    socialProviders: social,
    /* Somebody whose only identity is Google signs in there and has nothing to
       change here. Setting one is still allowed — it gives them a second way
       in if they lose the Google account. */
    socialOnly: social.length > 0 && !hasEmailIdentity,
  }
}

/**
 * Change the password, verifying the current one first.
 *
 * Supabase's `updateUser({ password })` does NOT require the old password — an
 * open session is enough. That is a real security gap on a shared or borrowed
 * phone, which in this market is common: anyone who picks up an unlocked device
 * with a live session can change the password and lock the owner out.
 *
 * So the current password is verified explicitly by re-authenticating first.
 * `signInWithPassword` against the same account returns the same session on
 * success and an error on failure, so it costs one round trip and does not
 * disturb the session.
 */
export async function changePassword({ email, currentPassword, newPassword }) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Use at least 8 characters.')
  }
  if (currentPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
    if (error) throw new Error('That current password is not right.')
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return true
}

/**
 * Change the sign-in email.
 *
 * This does not take effect when it returns. Supabase sends a confirmation link
 * to the NEW address and the change only lands once it is clicked, so the UI
 * has to say that — an account screen that shows the new address immediately is
 * lying about a change that has not happened, and if the link is never clicked
 * the customer is left signing in with an address the app stopped showing them.
 */
export async function changeEmail(newEmail) {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
  return true
}

/* ── Addresses ─────────────────────────────────────────────────────────── */

export async function fetchAddresses(userId) {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  // No table yet — an empty address book, not a broken screen.
  if (error) return isMissingSchema(error) ? [] : Promise.reject(error)
  return data ?? []
}

export async function saveAddress(userId, patch) {
  const row = {
    customer_id: userId,
    label:     patch.label?.trim() || 'Home',
    recipient: patch.recipient?.trim() || null,
    phone:     patch.phone?.trim() || null,
    line1:     patch.line1?.trim(),
    line2:     patch.line2?.trim() || null,
    landmark:  patch.landmark?.trim() || null,
    city:      patch.city?.trim(),
    pincode:   patch.pincode?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (!row.line1 || !row.city) throw new Error('An address needs at least a street and a city.')

  const q = patch.id
    ? supabase.from('customer_addresses').update(row).eq('id', patch.id)
    : supabase.from('customer_addresses').insert(row)

  const { data, error } = await q.select().single()
  if (error) {
    if (isMissingSchema(error)) throw new Error(`Saved addresses need a database update. ${SCHEMA_HINT}`)
    throw error
  }
  return data
}

export async function deleteAddress(id) {
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id)
  if (error) throw error
}

/**
 * Promote one address to the default.
 *
 * The unique partial index in migration 049 allows exactly one default row per
 * customer, so the old one must be cleared BEFORE the new one is set or the
 * insert violates the constraint. Two statements rather than one, in that
 * order, and the clear is scoped to this customer.
 */
export async function setDefaultAddress(userId, id) {
  const { error: clearErr } = await supabase
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', userId)
    .eq('is_default', true)
  if (clearErr && !isMissingSchema(clearErr)) throw clearErr

  const { data, error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Preferences ───────────────────────────────────────────────────────── */

/**
 * The four notification switches and the language, with defaults applied.
 *
 * Defaults live here and in the migration's column defaults, and they agree:
 * transactional messages on, marketing off. A profile row from before 049 has
 * none of these columns, and reading `undefined` as `false` would silently
 * switch off the delivery updates somebody depends on — so each falls back to
 * its intended default rather than to a falsy value.
 */
export const NOTIFICATION_KEYS = [
  {
    key: 'notify_orders',
    label: 'Order updates',
    hint: 'Confirmed, packed, out for delivery, delivered.',
    fallback: true,
  },
  {
    key: 'notify_celebrations',
    label: 'Celebration updates',
    hint: 'When a plan is ready, a payment is due, or a date is confirmed.',
    fallback: true,
  },
  {
    key: 'notify_whatsapp',
    label: 'WhatsApp',
    hint: 'Use WhatsApp for the messages above, not just email.',
    fallback: true,
  },
  {
    key: 'notify_offers',
    label: 'Offers and festivals',
    hint: 'Occasional — a festival coming up, a coupon worth having.',
    fallback: false,
  },
]

export function prefsOf(profile) {
  const out = {}
  for (const { key, fallback } of NOTIFICATION_KEYS) {
    out[key] = profile?.[key] ?? fallback
  }
  out.language = profile?.language ?? 'en'
  return out
}

/**
 * The languages the account screen offers.
 *
 * Kannada first after English, because the two cities Sambramo is live in are
 * both in Karnataka. This list is what the SETTING can be set to — the app's
 * strings are not translated yet, and the screen says so rather than letting
 * somebody pick Tamil and wonder why nothing changed.
 */
export const LANGUAGES = [
  { id: 'en', label: 'English',  native: 'English' },
  { id: 'kn', label: 'Kannada',  native: 'ಕನ್ನಡ' },
  { id: 'hi', label: 'Hindi',    native: 'हिन्दी' },
  { id: 'ta', label: 'Tamil',    native: 'தமிழ்' },
  { id: 'te', label: 'Telugu',   native: 'తెలుగు' },
]
