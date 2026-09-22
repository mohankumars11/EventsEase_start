/**
 * Make sure the signed-in partner has a `vendors` row.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The four-step /onboarding/vendor wizard was the only thing in the app
 * that created this row. It was deleted, and every screen in the
 * /partner/setup flow calls `.update()` on a row it assumes is already
 * there -- so a new partner reached step 1, picked their trades, and was
 * bounced back to the intro because `vendorId` was null. Round and
 * round, with nothing written and nothing said.
 *
 * Creating the row is now its own small thing, called once when a
 * partner enters setup, rather than a side effect of a form four screens
 * long.
 *
 * ── Draft, not submitted ────────────────────────────────────────────
 * The wizard stamped `verification_status = 'submitted'` at creation,
 * because creation happened at the END of its form. Here the row is made
 * at the START, before the partner has entered anything -- so stamping
 * "submitted" would drop an empty profile into the operator's review
 * queue the moment somebody opened the app. It is created as `draft`.
 * ReviewPublishStep is what moves it to `submitted`, which is where that
 * decision belongs.
 *
 * ── business_name is NOT NULL ───────────────────────────────────────
 * So it needs a value before the partner has typed one. Their own name
 * is the least-wrong placeholder -- it is what an operator would read in
 * the queue anyway -- and PartnerDetailsStep overwrites it in step 2.
 *
 * ── Idempotent ──────────────────────────────────────────────────────
 * `onConflict: 'profile_id'` against the unique index from migration
 * 027, and `ignoreDuplicates` so a second call does NOT overwrite a real
 * business name with the placeholder. Safe to call on every entry to
 * setup, which is what makes it safe to call from a mount effect.
 *
 * RLS: `vendor_inserts_own` (migration 123) allows exactly this --
 * WITH CHECK (profile_id = auth.uid()) -- and nothing wider.
 */
import { supabase } from './supabase'
import { readSavedLocation, readSavedAddress } from './partnerLocation'

/**
 * Push the fix taken before the login onto the vendors row.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE LINK THAT WAS BROKEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * /partner/location-permission -> /partner/location -> confirmation all
 * run BEFORE the partner has an account, so they can only write to
 * localStorage. Something after the login has to move that onto the row,
 * because `vendors.location` is a geography column PostgREST cannot
 * write and `match_partners` matches on nothing else.
 *
 * That something was the deleted onboarding wizard. Without it the
 * partner completed three location screens, saw their address confirmed,
 * and their row still had no city, no pincode and no point -- so step 3
 * could never be completed and dispatch could never find them. Nothing
 * on screen said so, which is the same silent failure migration 079's
 * partner_readiness() was written to catch.
 *
 * Failing here is NOT fatal. The row exists either way and the partner
 * can set their location by hand from Account, so this reports rather
 * than throws.
 */
async function applySavedLocation(vendorId) {
  const fix  = readSavedLocation()
  const addr = readSavedAddress()

  /* The RPC needs a pincode; the fix alone cannot supply one. If the
     reverse lookup never produced a postcode there is nothing to send,
     and PartnerAccount's fold is where they finish it. */
  const pincode = addr?.postcode
  if (!vendorId || !pincode || !fix?.lat || !fix?.lng) {
    return { ok: false, reason: 'no_saved_fix' }
  }

  const { data, error } = await supabase.rpc('set_partner_location', {
    p_vendor_id: vendorId,
    p_pincode: String(pincode),
    p_lat: fix.lat,
    p_lng: fix.lng,
    p_area: addr.locality ?? addr.city ?? null,
  })

  if (error) return { ok: false, reason: error.message }
  if (!data?.ok) return { ok: false, reason: data?.reason ?? 'rejected' }
  return { ok: true }
}

export async function ensureVendorRow({ user, profile } = {}) {
  const uid = user?.id ?? profile?.id
  if (!uid) return { ok: false, reason: 'not_signed_in' }

  /* Read first. The common case by far is that the row exists, and a
     plain select costs less than an upsert that writes nothing. */
  const { data: found, error: readErr } = await supabase
    .from('vendors').select('id').eq('profile_id', uid).maybeSingle()

  if (readErr) return { ok: false, reason: readErr.message }
  if (found?.id) return { ok: true, id: found.id, created: false }


  const placeholder =
    (profile?.full_name ?? '').trim() || (user?.email ?? '').split('@')[0] || 'My business'

  const { error: insErr } = await supabase
    .from('vendors')
    .upsert(
      {
        profile_id: uid,
        business_name: placeholder,
        verification_status: 'draft',
      },
      { onConflict: 'profile_id', ignoreDuplicates: true },
    )

  if (insErr) return { ok: false, reason: insErr.message }

  /* Read it back rather than trusting the write. `ignoreDuplicates`
     returns no row, and a row that cannot be read back is the failure
     mode worth catching here -- the partner would otherwise walk into
     step 2 with a null id and every save would quietly do nothing. */
  const { data: saved, error: backErr } = await supabase
    .from('vendors').select('id').eq('profile_id', uid).maybeSingle()

  if (backErr) return { ok: false, reason: backErr.message }
  if (!saved?.id) return { ok: false, reason: 'row_not_readable' }

  /* Only on the row we just made. A returning partner has already had
     this applied, and re-sending a stale localStorage fix would move a
     partner who has since corrected their address in Account. */
  const located = await applySavedLocation(saved.id)

  return { ok: true, id: saved.id, created: true, located: located.ok, locateReason: located.reason }
}
