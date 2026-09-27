-- ══════════════════════════════════════════════════════════════════════
-- 099 · An approved partner locked out of the partner app
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT HAPPENS
-- ══════════════════════════════════════════════════════════════════════
--
-- `profiles.role` and `vendors` are two records of the same fact and
-- nothing keeps them in step. Found on a live account:
--
--   profiles  Mohana                    role = 'customer'
--   vendors   Mohan events              status = APPROVED, is_verified
--
-- ProtectedRoute in src/App.jsx guards /dashboard/vendor with
-- allowedRoles={['vendor']} and sends everyone else to
-- /dashboard/customer. So this partner -- approved, verified, with jobs
-- and a payout account -- opens the partner app and lands on the
-- customer home. Every tab in the bottom bar bounces them back.
--
-- There is no error. Nothing is logged. From their side the partner app
-- simply does not work, and the only thing they can do about it is stop
-- opening it.
--
-- ══════════════════════════════════════════════════════════════════════
-- HOW AN ACCOUNT GETS INTO THAT STATE
-- ══════════════════════════════════════════════════════════════════════
--
-- Signing up through the partner flow sets role = 'vendor' and creates
-- the vendors row together, so that path is fine. Every OTHER path is
-- not:
--
--   · somebody signs up as a customer first, then registers a business
--   · an operator creates the vendor row from the admin console
--   · a Google sign-in creates the profile with the default role and the
--     vendor row is added afterwards
--
-- The last one matters now that Google sign-in works in the APK: the
-- profile is created by a trigger with the DEFAULT role, which is
-- 'customer'.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE FIX IS IN THE DATABASE, NOT THE ROUTE GUARD
-- ══════════════════════════════════════════════════════════════════════
--
-- Loosening the guard to "role is vendor OR they own a vendors row"
-- would need a query the router does not have, on every navigation, and
-- would leave the underlying record still wrong for everything else that
-- reads it -- RLS policies, the admin console, dispatch.
--
-- So the record is made true and kept true. Owning a vendors row IS
-- being a vendor; that is what the word means.

BEGIN;

-- ── 1 · Everyone already in that state ───────────────────────────────

UPDATE public.profiles p
SET role = 'vendor'
WHERE p.role = 'customer'
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.profile_id = p.id);

-- ── 2 · So it cannot happen again ────────────────────────────────────
--
-- Admins are never demoted or promoted by this. An operator who also
-- runs a business keeps their admin role, because losing the console is
-- a worse failure than the one being fixed -- and admins reach the
-- vendor dashboard through the console anyway.

CREATE OR REPLACE FUNCTION public.vendor_row_implies_vendor_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET role = 'vendor'
  WHERE id = NEW.profile_id
    AND role = 'customer';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vendor_implies_role ON public.vendors;
CREATE TRIGGER trg_vendor_implies_role
  AFTER INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.vendor_row_implies_vendor_role();

COMMENT ON FUNCTION public.vendor_row_implies_vendor_role() IS
  'Owning a vendors row IS being a vendor. Without this a partner who signed up as a customer first is locked out of /dashboard/vendor with no error.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- WHAT THIS DELIBERATELY DOES NOT DO
-- ══════════════════════════════════════════════════════════════════════
--
-- It does not demote anybody. A profile with role = 'vendor' and no
-- vendors row is left alone: that is somebody mid-signup, and taking
-- their role away would drop them out of the flow they are standing in.
--
-- It does not fire on DELETE either. A vendor row removed by an operator
-- should not silently turn that person back into a customer while they
-- are looking at the screen; that is a decision for whoever removed it.
