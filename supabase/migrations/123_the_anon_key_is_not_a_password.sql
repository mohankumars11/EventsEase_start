-- ══════════════════════════════════════════════════════════════════════
-- 123 · The anon key is not a password
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. URGENT. Re-runnable.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT IS TRUE OF PRODUCTION RIGHT NOW
-- ══════════════════════════════════════════════════════════════════════
--
-- Found on 2026-09-14 while writing the partner-isolation suite, by
-- asking the live database as an ordinary client rather than reading
-- the migrations:
--
--   a client holding ONLY the public anon key, with no session at all,
--   can UPDATE any row of `profiles` and any row of `vendors`.
--
-- Including:
--
--   UPDATE profiles SET role = 'admin' WHERE id = <anyone>
--
-- That is total compromise, not a leak. The anon key is compiled into
-- the client bundle and served from sambramoh.vercel.app to anybody who
-- opens the site; it identifies the project, it does not authenticate a
-- caller. Every rule this codebase enforces — who may approve a
-- listing, who may verify a partner, what an operator can see — is
-- downstream of `profiles.role`.
--
-- It was verified and reverted immediately in each case. No row was
-- left changed.
--
-- ── Why no amount of reading the migrations found it ────────────────
-- Every policy in this repo is correct. 027 scopes the vendor UPDATE to
-- `profile_id = auth.uid()`; 006 scopes the profiles policies properly.
-- The permissive grant is not in any file here — it was made against
-- the live database, outside the repo, and the repo has no record of
-- it. Which is exactly why this file drops policies BY ENUMERATION
-- rather than by name: a `DROP POLICY IF EXISTS "..."` list can only
-- remove the policies somebody remembered to write down.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHAT THIS FILE DOES
-- ══════════════════════════════════════════════════════════════════════
--
--   1 · turns RLS on, in case it is off
--   2 · removes EVERY policy on profiles and vendors, whatever it is
--       called and whoever made it
--   3 · puts back the intended set, which is the set this repo has
--       always described
--   4 · adds the one guard a row policy cannot express: you may edit
--       your own profile, and you may not make yourself an operator
BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · RLS on, and everything currently attached taken off
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('profiles', 'vendors')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · profiles — your own row, and operators
-- ══════════════════════════════════════════════════════════════════════
--
-- Anonymous read of this table returned all 23 rows: every name, every
-- email address, every role. Nothing in the app needs that. Checked
-- before writing this — every client read of `profiles` is already
-- `.eq('id', <the caller>)`, and the admin console reads vendors, not
-- profiles.
CREATE POLICY "profile_read_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "operators_read_profiles" ON public.profiles
  FOR SELECT USING (public.get_my_role() IN ('admin', 'event_coordinator'));

CREATE POLICY "profile_write_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- The signup path writes this row itself (AuthContext upserts it when a
-- session first lands), so the INSERT has to stay open to the owner.
CREATE POLICY "profile_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "operators_write_profiles" ON public.profiles
  FOR ALL USING (public.get_my_role() IN ('admin', 'event_coordinator'));

-- ══════════════════════════════════════════════════════════════════════
-- 3 · vendors — public to READ, owner to write
-- ══════════════════════════════════════════════════════════════════════
--
-- The public read stays, and is deliberate: this is the marketplace
-- catalogue, and a customer browsing masters is reading exactly this
-- table. It was never the problem. The problem was that the same
-- openness applied to UPDATE.
CREATE POLICY "public_reads_vendors" ON public.vendors
  FOR SELECT USING (TRUE);

CREATE POLICY "vendor_writes_own" ON public.vendors
  FOR UPDATE
  USING      (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "vendor_inserts_own" ON public.vendors
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "operators_all_vendors" ON public.vendors
  FOR ALL USING (public.get_my_role() IN ('admin', 'event_coordinator'));

-- Deliberately NO delete policy for partners. Closing an account is a
-- flow that already exists (116) and goes through an operator; a
-- DELETE a client can issue would take the listings, the calendar and
-- the job history with it.

-- ══════════════════════════════════════════════════════════════════════
-- 4 · You may edit your profile. You may not promote yourself.
-- ══════════════════════════════════════════════════════════════════════
--
-- The policy above lets somebody write their own row, and `role` is a
-- column on that row — so the policy alone still permits
--
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid()
--
-- which is the same compromise arriving by a slightly longer route.
-- Row-level security is row level; this is a column rule, so it is a
-- trigger.
--
-- ── Why not freeze `role` outright ─────────────────────────────────
-- Because the app legitimately writes it. A person who signs up on the
-- partner surface is promoted customer -> vendor by AuthContext as
-- their first session lands (see mergeRole). Freezing the column would
-- break every new partner signing up, which is worse than the hole for
-- as long as it takes somebody to notice.
--
-- So the rule is the narrow, true one: customer and vendor are the
-- app's to set, operator roles are not.
CREATE OR REPLACE FUNCTION public.no_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  /* An operator role may only be conferred, never claimed. Reverted in
     silence rather than raised, so the legitimate part of the same
     statement — a phone number, a city — still saves. */
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role NOT IN ('customer', 'vendor') THEN
    NEW.role := OLD.role;
  END IF;

  /* And nobody demotes an operator from the client either. */
  IF OLD.role IN ('admin', 'event_coordinator')
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_self_promotion ON public.profiles;
CREATE TRIGGER trg_no_self_promotion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.no_self_promotion();

-- An INSERT can carry a role too, and the signup path inserts.
CREATE OR REPLACE FUNCTION public.no_self_promotion_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;
  IF NEW.role IS NULL OR NEW.role NOT IN ('customer', 'vendor') THEN
    NEW.role := 'customer';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_self_promotion_insert ON public.profiles;
CREATE TRIGGER trg_no_self_promotion_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.no_self_promotion_on_insert();

-- ══════════════════════════════════════════════════════════════════════
-- 5 · vendor_subscriptions — nobody else's business
-- ══════════════════════════════════════════════════════════════════════
--
-- Found by the same sweep: anon reads all 231 rows. Which partner is on
-- which plan is commercial information about somebody else's business,
-- and no screen needs it — a partner's own tier is read from
-- `vendors.subscription_plan`, on their own row.
ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'vendor_subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendor_subscriptions', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "partner_reads_own_subscription" ON public.vendor_subscriptions
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid())
  );

CREATE POLICY "operators_all_subscriptions" ON public.vendor_subscriptions
  FOR ALL USING (public.caller_is_operator());

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- AFTERWARDS — run these, in this order
-- ══════════════════════════════════════════════════════════════════════
--
--   node scripts/check-anon-access.mjs        -> must be 9/9
--   node scripts/check-partner-isolation.mjs  -> no leaks
--   node scripts/check-onboarding-walk.mjs    -> signup still works
--
-- The onboarding one matters most here: this file rewrites the policies
-- on `profiles`, which is the table a brand-new account is created in.
-- If it were wrong, the symptom would be that nobody can sign up.
--
-- ── Still open after this, and deliberately not fixed here ──────────
-- `vendor_services` is public by design — it IS the customer-visible
-- catalogue — and it carries `review_note` too. No row has one yet, so
-- nothing is leaking today, but the same latent exposure exists. Row
-- policies cannot hide a column, so the fix is a view over the safe
-- columns and a narrowed grant. That is a change to the customer-facing
-- read path and does not belong in an emergency hardening file.
