-- ══════════════════════════════════════════════════════════════════════
-- 087 · A vendors row means the profile is a vendor
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND.
--
-- sambramo.partner1.test@gmail.com signed up as a partner, completed
-- onboarding, and got a `vendors` row — with `profiles.role` left at
-- 'customer'.
--
-- Everything downstream then behaved correctly and uselessly: the ⋮ menu
-- offered Services & packages and My Orders, `/` rendered the customer
-- home, and RootScreen never redirected to the partner dashboard —
-- because every one of those reads the ROLE, and the role said customer.
--
-- The partner saw the customer app and reported it as nonsense. It was.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY A TRIGGER RATHER THAN ANOTHER FIX IN THE SIGN-UP CODE
-- ══════════════════════════════════════════════════════════════════════
--
-- The role has now gone wrong twice by two different routes: once when
-- a signup form overwrote an established vendor back to 'customer', and
-- once when it was never raised at all. Both were fixed in the client,
-- and the client is exactly where this keeps going wrong — it is three
-- screens, two OAuth paths and a race with fetchProfile.
--
-- The database holds the fact that settles it. A row in `vendors`
-- pointing at a profile is somebody who applied to be a partner and was
-- given a vendor record. There is no reading of that where they are a
-- customer.
--
-- So the trigger states it once, close to the data, where no client path
-- can miss it.
--
-- ── It only ever promotes ───────────────────────────────────────────
-- 'admin' is left alone. An operator with a vendor row for testing must
-- not be demoted to vendor and lose the console — the same
-- promote-never-demote rule the client's mergeRole() follows, in the one
-- place it cannot be bypassed.
--
-- Re-runnable, like every migration in this series.

BEGIN;

CREATE OR REPLACE FUNCTION public.profile_is_vendor_when_vendor_row_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NULL THEN
    RETURN NEW;            -- a seeded partner with no login
  END IF;

  UPDATE profiles
     SET role = 'vendor'
   WHERE id = NEW.profile_id
     AND role IS DISTINCT FROM 'vendor'
     AND role IS DISTINCT FROM 'admin';   -- never demote an operator

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_row_sets_role ON vendors;
CREATE TRIGGER trg_vendor_row_sets_role
  AFTER INSERT OR UPDATE OF profile_id ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.profile_is_vendor_when_vendor_row_exists();

-- ══════════════════════════════════════════════════════════════════════
-- And repair the profiles this has already happened to
-- ══════════════════════════════════════════════════════════════════════
UPDATE profiles p
   SET role = 'vendor'
 WHERE p.role NOT IN ('vendor', 'admin')
   AND EXISTS (SELECT 1 FROM vendors v WHERE v.profile_id = p.id);

COMMIT;
