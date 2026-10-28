-- 193 — Policy consent, welcome vouchers, city interest (Mohan, 2026-10-28)
--
--   policy_acceptances  the evidence that a customer accepted the terms:
--                       who, which policy version, when, from which app and
--                       device. Written by the app right after OTP sign-in.
--                       Append-only for the customer (insert + read own).
--   customer_vouchers   rewards a customer holds — the welcome scratch cards
--                       (a free first RSVP, 25% off the first booking) and,
--                       later, referral credit. Claimed and redeemed only
--                       through the functions below, never written directly.
--   city_interest       "Notify me when you're in my city" — from anyone,
--                       signed in or not. Insert-only; staff read it.
--
-- The 25% voucher is a RECORD here; taking it off a payment is a separate,
-- server-side change to api/create-booking-payment.js once the owner has
-- decided who funds it and its cap (see docs/PENDING.md).
--
-- Rollback:
--   drop function if exists public.claim_welcome_vouchers(), public.redeem_voucher(uuid, text);
--   drop table if exists public.city_interest, public.customer_vouchers, public.policy_acceptances;

BEGIN;

CREATE TABLE IF NOT EXISTS public.policy_acceptances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  version     TEXT NOT NULL CHECK (char_length(version) BETWEEN 1 AND 40),
  policies    TEXT[] NOT NULL DEFAULT '{terms,cancellation,privacy,supply}',
  surface     TEXT NOT NULL DEFAULT 'customer' CHECK (surface IN ('customer', 'partner')),
  method      TEXT NOT NULL DEFAULT 'otp' CHECK (char_length(method) <= 40),
  app_version TEXT CHECK (char_length(app_version) <= 60),
  user_agent  TEXT CHECK (char_length(user_agent) <= 400),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS policy_acceptances_user_idx ON public.policy_acceptances (user_id, accepted_at DESC);
ALTER TABLE public.policy_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own acceptances: read" ON public.policy_acceptances;
CREATE POLICY "own acceptances: read" ON public.policy_acceptances FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own acceptances: record" ON public.policy_acceptances;
CREATE POLICY "own acceptances: record" ON public.policy_acceptances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin reads acceptances" ON public.policy_acceptances;
CREATE POLICY "admin reads acceptances" ON public.policy_acceptances FOR SELECT TO authenticated USING (public.get_my_role() = 'admin');
GRANT SELECT, INSERT ON public.policy_acceptances TO authenticated;
-- Evidence is never edited or removed by the customer: no UPDATE / DELETE grant or policy.

CREATE TABLE IF NOT EXISTS public.customer_vouchers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('free_rsvp', 'welcome_pct', 'referral_credit')),
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  terms       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  used_at     TIMESTAMPTZ,
  used_on     TEXT CHECK (char_length(used_on) <= 80)
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_vouchers_welcome_once ON public.customer_vouchers (user_id, kind) WHERE kind IN ('free_rsvp', 'welcome_pct');
ALTER TABLE public.customer_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own vouchers: read" ON public.customer_vouchers;
CREATE POLICY "own vouchers: read" ON public.customer_vouchers FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admin vouchers" ON public.customer_vouchers;
CREATE POLICY "admin vouchers" ON public.customer_vouchers FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
GRANT SELECT ON public.customer_vouchers TO authenticated;

-- The two welcome scratch cards, once per customer. Safe to call again:
-- it returns what the customer already holds.
CREATE OR REPLACE FUNCTION public.claim_welcome_vouchers()
RETURNS SETOF public.customer_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_tag TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  v_tag := upper(substr(replace(v_uid::text, '-', ''), 1, 5));
  INSERT INTO public.customer_vouchers (user_id, kind, code, title, terms, expires_at)
  VALUES (v_uid, 'free_rsvp', 'RSVPFREE-' || v_tag, 'Your first invitation is on us',
          jsonb_build_object('what', 'Premium invitation with live RSVP, guest care and style circles', 'uses', 1), now() + interval '90 days')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.customer_vouchers (user_id, kind, code, title, terms, expires_at)
  VALUES (v_uid, 'welcome_pct', 'WELCOME25-' || v_tag, '25% off your first booking',
          jsonb_build_object('pct', 25, 'cap_paise', 150000, 'min_paise', 200000, 'uses', 1, 'first_booking_only', true), now() + interval '30 days')
  ON CONFLICT DO NOTHING;
  UPDATE public.customer_vouchers SET status = 'expired' WHERE user_id = v_uid AND status = 'available' AND expires_at < now();
  RETURN QUERY SELECT * FROM public.customer_vouchers WHERE user_id = v_uid ORDER BY claimed_at;
END $$;

-- Use a voucher on something (an invitation id, a booking id). Once only.
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_id UUID, p_on TEXT)
RETURNS public.customer_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.customer_vouchers;
BEGIN
  UPDATE public.customer_vouchers SET status = 'used', used_at = now(), used_on = left(p_on, 80)
   WHERE id = p_id AND user_id = auth.uid() AND status = 'available' AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO v;
  IF v.id IS NULL THEN RAISE EXCEPTION 'This voucher is not available'; END IF;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.claim_welcome_vouchers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_voucher(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_welcome_vouchers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(UUID, TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.city_interest (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city       TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  area       TEXT CHECK (char_length(area) <= 120),
  contact    TEXT CHECK (char_length(contact) <= 120),
  user_id    UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.city_interest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone registers interest" ON public.city_interest;
CREATE POLICY "anyone registers interest" ON public.city_interest FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "admin reads interest" ON public.city_interest;
CREATE POLICY "admin reads interest" ON public.city_interest FOR SELECT TO authenticated USING (public.get_my_role() = 'admin');
GRANT INSERT ON public.city_interest TO anon, authenticated;
GRANT SELECT ON public.city_interest TO authenticated;

COMMIT;
