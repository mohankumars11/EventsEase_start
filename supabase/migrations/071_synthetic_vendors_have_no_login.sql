-- ============================================================
-- 071 · A seeded partner has no account, and must not have one
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 057 FIRST (it adds
-- `is_synthetic`). Small and re-runnable — one column relaxed, one
-- constraint added, no data touched.
--
-- ── The problem this removes ─────────────────────────────────────────
-- `vendors.profile_id` is NOT NULL and references `profiles(id)`, which
-- in turn references `auth.users(id)`. So seeding a network of 200-plus
-- test partners would mean creating 200-plus REAL AUTHENTICATION
-- ACCOUNTS — for businesses that do not exist.
--
-- That is bad in three separate ways, and the third is the one that
-- matters:
--
--   1. It pollutes `auth.users`, the one table where every row is
--      supposed to be a person. "How many partners have signed up?"
--      stops being answerable.
--
--   2. Deleting the seed means deleting auth users, and a mistake in
--      that DELETE reaches real accounts.
--
--   3. Somebody could SIGN IN as "Sri Lakshmi Decorators" — a business
--      this platform invented — and from inside that session accept
--      jobs, read offers and open a payout account. A test fixture must
--      never be a usable identity.
--
-- ── Why a conditional NOT NULL rather than making it nullable ────────
-- A real partner without a profile is a bug: they could not log in, could
-- not be paid, and could not be contacted. Dropping NOT NULL outright
-- would permit that silently.
--
-- The CHECK says the actual rule — every partner has an account UNLESS
-- they are seeded test data — so the database refuses a real vendor with
-- no login while allowing a synthetic one, which is exactly the
-- distinction that exists in reality.
--
-- ── The RLS consequence is the good kind ─────────────────────────────
-- Every partner policy in this schema is of the form
-- `profile_id = auth.uid()`. With `profile_id IS NULL`, that comparison
-- is NULL — never true — for every caller. So a synthetic partner is
-- unownable and unreachable by construction, without one policy being
-- rewritten.
--
-- `vendors_profile_id_key` (migration 027) is a UNIQUE constraint, and
-- Postgres permits many NULLs under one. No conflict.
-- ============================================================

BEGIN;

ALTER TABLE vendors ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_real_partners_have_a_login;
ALTER TABLE vendors ADD CONSTRAINT vendors_real_partners_have_a_login
  CHECK (is_synthetic OR profile_id IS NOT NULL);

COMMENT ON COLUMN vendors.profile_id IS
  'The partner''s login. NULL only for is_synthetic seed rows, which have no account and cannot be signed in as.';

-- Seeded partners are unownable, so make sure nothing has accidentally
-- attached one to a real account already.
--
--   SELECT id, business_name FROM vendors
--    WHERE is_synthetic AND profile_id IS NOT NULL;
--
-- Expect zero rows. A row here is a real person's account attached to a
-- fake business.

COMMIT;
