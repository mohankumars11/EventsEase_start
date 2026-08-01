-- ============================================================
-- Migration 007: Fix broken signup + anonymous event submission
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Fix handle_new_user() ──────────────────────────────
-- Every signup/login (OTP and Google) was failing with
-- "Database error saving new user" (Postgres error inside the
-- auth.users insert trigger). Unlike get_my_role() (added in
-- migration 006), this function never had `SET search_path`,
-- so `profiles` could fail to resolve inside the SECURITY
-- DEFINER context.
--
-- Also wrap it in an exception handler: this trigger is only a
-- safety net (the app itself creates the profile row in
-- AuthContext.fetchProfile), so it must never be allowed to
-- block a real signup again, regardless of the cause.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Allow anonymous "Plan My Celebration" submissions ──────
-- Migration 006 updated the events INSERT policy to allow
-- customer_id IS NULL for logged-out submitters, but the column
-- itself was still NOT NULL (set in migration 004) — so every
-- logged-out submission still failed with:
--   null value in column "customer_id" violates not-null constraint

ALTER TABLE events ALTER COLUMN customer_id DROP NOT NULL;
