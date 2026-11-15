-- 193 — Policy consent, welcome vouchers, city interest (Mohan, 2026-10-28)
--
--   policy_acceptances  the evidence that a customer accepted the terms:
--                       who, which policy version, when, from which app and
--                       device. Written by the app right after OTP sign-in.
--                       Append-only for the customer (insert + read own).
--   customer_vouchers   rewards a customer holds — the welcome scratch cards
--                       (a free first RSVP, 25% off the first booking) and
--                       the referrer's 25% + 5% once both events are done. Claimed and redeemed only
--                       through the functions below, never written directly.
--   city_interest       "Notify me when you're in my city" — from anyone,
--                       signed in or not. Insert-only; staff read it.
--
--   sambramo_margins    Sambramo's margin over the partner price, by trade and
--                       city (api/_lib/listPrice.js holds the defaults; a row
--                       here overrides one without an app update).
--   booking_line_discounts  what a voucher took off each booking line — read
--                       by the payment server so the balance never charges
--                       the saving back, and by Route so the partner's share
--                       is computed on what the customer actually owes.
--
-- Vouchers come off the amount charged (api/create-booking-payment.js
-- validates them; api/_lib/bookingCapture.js marks them used on capture).
-- They come only out of Sambramo's margin, never below the partner price.
--
-- Codes: SAMBRAMO-RSVP-XXXXXX, SAMBRAMO25-XXXXXX, SAMBRAMO-REF25-XXXXXX,
-- SAMBRAMO-REF5-XXXXXX — six random characters from an alphabet with no
-- 0/O/1/I, unique across every customer (a unique index, and a retry on
-- the one-in-a-billion collision). Redemption needs the owner's account,
-- so a code is a label, not a bearer token.
--
-- Rollback:
--   drop function if exists public.claim_welcome_vouchers(), public.redeem_voucher(uuid, text), public.my_referrals(),
--     public.claim_referral_rewards(), public.sambramo_issue_voucher(uuid, text, text, text, jsonb, timestamptz), public.sambramo_voucher_code(text);
--   drop table if exists public.booking_line_discounts, public.sambramo_margins, public.city_interest, public.customer_vouchers, public.policy_acceptances;

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
  kind        TEXT NOT NULL CHECK (kind IN ('free_rsvp', 'welcome_pct', 'referral_pct', 'referral_credit')),
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
CREATE UNIQUE INDEX IF NOT EXISTS customer_vouchers_code_unique ON public.customer_vouchers (code);
CREATE UNIQUE INDEX IF NOT EXISTS customer_vouchers_referral_once ON public.customer_vouchers (user_id, (terms->>'friend'), (terms->>'step')) WHERE kind = 'referral_pct';
ALTER TABLE public.customer_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own vouchers: read" ON public.customer_vouchers;
CREATE POLICY "own vouchers: read" ON public.customer_vouchers FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admin vouchers" ON public.customer_vouchers;
CREATE POLICY "admin vouchers" ON public.customer_vouchers FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
GRANT SELECT ON public.customer_vouchers TO authenticated;

-- SAMBRAMO-…-XXXXXX: six characters, no 0/O/1/I to misread.
CREATE OR REPLACE FUNCTION public.sambramo_voucher_code(p_prefix TEXT)
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT p_prefix || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    FROM generate_series(1, 6)
$$;

-- Internal: give a customer a voucher with a fresh unique code. A code
-- collision retries; any other uniqueness (they already hold this one) is
-- "nothing to do". Never callable from the app.
CREATE OR REPLACE FUNCTION public.sambramo_issue_voucher(p_user UUID, p_kind TEXT, p_prefix TEXT, p_title TEXT, p_terms JSONB, p_expires TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_try INT := 0;
  v_con TEXT;
BEGIN
  LOOP
    BEGIN
      INSERT INTO public.customer_vouchers (user_id, kind, code, title, terms, expires_at)
      VALUES (p_user, p_kind, public.sambramo_voucher_code(p_prefix), p_title, p_terms, p_expires);
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
      IF v_con IS DISTINCT FROM 'customer_vouchers_code_unique' THEN RETURN; END IF;
      v_try := v_try + 1;
      IF v_try >= 8 THEN RAISE EXCEPTION 'Could not issue a unique voucher code'; END IF;
    END;
  END LOOP;
END $$;

-- The two welcome scratch cards, once per customer. Safe to call again:
-- it returns what the customer already holds.
CREATE OR REPLACE FUNCTION public.claim_welcome_vouchers()
RETURNS SETOF public.customer_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  PERFORM public.sambramo_issue_voucher(v_uid, 'free_rsvp', 'SAMBRAMO-RSVP-', 'Your first invitation is on us',
    jsonb_build_object('what', 'Premium invitation with live RSVP, guest care and style circles', 'uses', 1), now() + interval '90 days');
  PERFORM public.sambramo_issue_voucher(v_uid, 'welcome_pct', 'SAMBRAMO25-', '25% off your first booking',
    jsonb_build_object('pct', 25, 'cap_paise', 250000, 'uses', 1, 'first_booking_only', true), now() + interval '30 days');
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
   WHERE id = p_id AND user_id = auth.uid() AND kind = 'free_rsvp' AND status = 'available' AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO v;
  IF v.id IS NULL THEN RAISE EXCEPTION 'This voucher is not available'; END IF;
  RETURN v;
END $$;

-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default, so REVOKE FROM PUBLIC alone leaves them callable: name all three.
REVOKE ALL ON FUNCTION public.sambramo_issue_voucher(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sambramo_voucher_code(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_welcome_vouchers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_voucher(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_vouchers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(UUID, TEXT) TO authenticated;

-- Referrals, followed (Mohan, 2026-10-28): every friend who joined with my
-- code, and how far they have got — joined, booked & paid, event done.
-- The referrer's reward (25% + 5% off their next event) is claimable only
-- when BOTH have completed a paid event: `eligible` says whether I have,
-- `done` counts friends who have. First names only; never a phone or email.
CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH f AS (
    SELECT p.id, split_part(COALESCE(NULLIF(trim(p.full_name), ''), 'Friend'), ' ', 1) AS first, p.created_at,
      EXISTS (SELECT 1 FROM public.booking_lines l JOIN public.booking_requests r ON r.id = l.request_id
               WHERE r.customer_id = p.id AND l.status IN ('paid', 'in_progress', 'delivered', 'settled')) AS paid,
      EXISTS (SELECT 1 FROM public.booking_lines l JOIN public.booking_requests r ON r.id = l.request_id
               WHERE r.customer_id = p.id AND l.status IN ('delivered', 'settled')) AS done
      FROM public.profiles p
     WHERE p.referred_by = auth.uid()
  )
  SELECT jsonb_build_object(
    'joined', (SELECT count(*) FROM f),
    'paid', (SELECT count(*) FROM f WHERE f.paid),
    'done', (SELECT count(*) FROM f WHERE f.done),
    'eligible', EXISTS (SELECT 1 FROM public.booking_lines l JOIN public.booking_requests r ON r.id = l.request_id
                         WHERE r.customer_id = auth.uid() AND l.status IN ('delivered', 'settled')),
    'claimed', (SELECT count(DISTINCT v.terms->>'friend') FROM public.customer_vouchers v WHERE v.user_id = auth.uid() AND v.kind = 'referral_pct'),
    'friends', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', f.first, 'joined_at', f.created_at,
                 'stage', CASE WHEN f.done THEN 'done' WHEN f.paid THEN 'paid' ELSE 'joined' END) ORDER BY f.created_at DESC) FROM f), '[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.my_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referrals() TO authenticated;

-- The referrer's reward, per friend, once BOTH have a completed paid event:
-- 25% off their next event (up to ₹2,500) and 5% off the one after (up to
-- ₹1,000) — two more bookings, one offer per booking. Safe to call again.
CREATE OR REPLACE FUNCTION public.claim_referral_rewards()
RETURNS SETOF public.customer_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  f RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF EXISTS (SELECT 1 FROM public.booking_lines l JOIN public.booking_requests r ON r.id = l.request_id
              WHERE r.customer_id = v_uid AND l.status IN ('delivered', 'settled')) THEN
    FOR f IN
      SELECT p.id FROM public.profiles p
       WHERE p.referred_by = v_uid AND p.id <> v_uid
         AND EXISTS (SELECT 1 FROM public.booking_lines l JOIN public.booking_requests r ON r.id = l.request_id
                      WHERE r.customer_id = p.id AND l.status IN ('delivered', 'settled'))
    LOOP
      PERFORM public.sambramo_issue_voucher(v_uid, 'referral_pct', 'SAMBRAMO-REF25-', '25% off your next event',
        jsonb_build_object('pct', 25, 'cap_paise', 250000, 'uses', 1, 'friend', f.id, 'step', 1), now() + interval '180 days');
      PERFORM public.sambramo_issue_voucher(v_uid, 'referral_pct', 'SAMBRAMO-REF5-', '5% off the event after',
        jsonb_build_object('pct', 5, 'cap_paise', 100000, 'uses', 1, 'friend', f.id, 'step', 2), now() + interval '365 days');
    END LOOP;
  END IF;
  RETURN QUERY SELECT * FROM public.customer_vouchers WHERE user_id = v_uid AND kind = 'referral_pct' ORDER BY claimed_at;
END $$;
REVOKE ALL ON FUNCTION public.claim_referral_rewards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_rewards() TO authenticated;

-- What each voucher took off each line. Written only by the payment server
-- (service role) when the payment is captured; the customer reads their own.
CREATE TABLE IF NOT EXISTS public.booking_line_discounts (
  line_id        UUID PRIMARY KEY REFERENCES public.booking_lines(id) ON DELETE RESTRICT,
  voucher_id     UUID REFERENCES public.customer_vouchers(id) ON DELETE SET NULL,
  voucher_code   TEXT NOT NULL,
  order_id       TEXT NOT NULL,
  discount_paise INTEGER NOT NULL CHECK (discount_paise >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_line_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own discounts: read" ON public.booking_line_discounts;
CREATE POLICY "own discounts: read" ON public.booking_line_discounts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.booking_lines l JOIN public.booking_requests r ON r.id = l.request_id
           WHERE l.id = booking_line_discounts.line_id AND r.customer_id = auth.uid()));
DROP POLICY IF EXISTS "admin reads discounts" ON public.booking_line_discounts;
CREATE POLICY "admin reads discounts" ON public.booking_line_discounts FOR SELECT TO authenticated USING (public.get_my_role() = 'admin');
GRANT SELECT ON public.booking_line_discounts TO authenticated;

-- Sambramo's margin over the partner price. Empty = the defaults in
-- api/_lib/listPrice.js (everyday 33%, mid 20%, big-ticket 10%). A row
-- overrides one trade in one city ('*' = every city). Public to read: the
-- app prices its cards with it, and the server charges with it.
CREATE TABLE IF NOT EXISTS public.sambramo_margins (
  trade_code TEXT NOT NULL CHECK (trade_code ~ '^[EL][0-9]{2}$'),
  city       TEXT NOT NULL DEFAULT '*',
  pct        NUMERIC(5, 4) NOT NULL CHECK (pct >= 0 AND pct <= 1),
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trade_code, city)
);
ALTER TABLE public.sambramo_margins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads margins" ON public.sambramo_margins;
CREATE POLICY "anyone reads margins" ON public.sambramo_margins FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin sets margins" ON public.sambramo_margins;
CREATE POLICY "admin sets margins" ON public.sambramo_margins FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
GRANT SELECT ON public.sambramo_margins TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sambramo_margins TO authenticated;

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
