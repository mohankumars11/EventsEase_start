-- ══════════════════════════════════════════════════════════════════════
-- 124 · A catalogue is not a case file
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 123 first. Re-runnable.
--
-- Two findings from the partner-isolation sweep, both on `vendors` and
-- `vendor_services`, neither of which 122 or 123 covered.
--
-- ══════════════════════════════════════════════════════════════════════
-- A · THE CATALOGUE HANDS OUT THE REVIEW FILE WITH IT
-- ══════════════════════════════════════════════════════════════════════
--
-- `vendor_services` is public on purpose — it IS the marketplace, and a
-- customer browsing masters is reading exactly this table (021).
--
-- But a row policy grants a ROW, and the row carries:
--
--   review_status   where the listing is in our queue
--   review_note     what an operator wrote when sending it back
--   specs           every answer the partner gave about their business
--   listing_id / listing_code / reviewed_at / revised_at
--
-- An anonymous client selects all of it today. `review_note` is NULL on
-- all 517 rows, so nothing has leaked yet — the exposure arrives with
-- the first note an operator writes, which is a thing that will happen
-- on an ordinary Tuesday and be noticed by nobody.
--
-- ── Why a view, and why the base table goes private ─────────────────
-- RLS cannot say "this row but not that column". A view can, and it is
-- the only construct that can: the public surface names the columns it
-- is prepared to hand out, and anything added to the base table later
-- is private by default rather than public by default. That is the
-- direction the mistake should fall in.
--
-- Checked before writing this, because it decides whether this is safe:
--
--   no client code reads vendor_services for a customer. Every read in
--   src/ is the partner's own list, the admin console, or the listing
--   flow — all authenticated, all covered by the partner/operator
--   policies, none of which this file touches.
--
--   dispatch does not need the policy either. `match_partners` is
--   LANGUAGE sql and NOT security definer, so it does run under the
--   caller's RLS — but its only caller is api/dispatch-waves.js, which
--   holds the SERVICE ROLE and bypasses RLS entirely. Verified by
--   reading the call site, not by assuming.
--
-- So dropping the public policy costs nothing that exists, and the view
-- is there for the customer surface when it is built.
BEGIN;

-- ── The customer-safe surface ────────────────────────────────────────
--
-- Columns chosen by asking what a catalogue needs to render a service:
-- what it is called, what kind of work it is, what it costs and in what
-- unit, the smallest order, and how much notice it needs.
--
-- Deliberately absent, and each for its own reason:
--   specs           the partner's own answers about their business
--   review_status   our queue, not the customer's business
--   review_note     an operator's private remark about somebody
--   reviewed_at     the same, by implication
--   revised_at      the same
--   listing_id      internal plumbing
--   listing_code    an internal reference
--   sort_order      the partner's arrangement of their own list
CREATE OR REPLACE VIEW public.public_vendor_services AS
SELECT
  s.id,
  s.vendor_id,
  s.name,
  s.category,
  s.description,
  s.price,
  s.unit,
  s.min_quantity,
  s.lead_time_days,
  s.created_at
FROM public.vendor_services s
JOIN public.vendors v ON v.id = s.vendor_id
WHERE s.is_active
  AND s.review_status = 'live'
  AND v.status = 'APPROVED';

COMMENT ON VIEW public.public_vendor_services IS
  'The customer-visible catalogue. The base table carries review notes, review status and the partner''s spec answers; those are not here and must never be added. See 124.';

-- ── The view runs as its owner, and that is the point ────────────────
--
-- Postgres 15 defaults a view to security_invoker = false, so this one
-- reads the base table with the OWNER's rights and is not blocked by
-- the policies below. That is exactly what is wanted: the WHERE clause
-- above IS the visibility rule for the public, written once, in the
-- open, where it can be read.
--
-- Stated explicitly rather than relied upon by default, because a
-- future Postgres that flips the default would silently empty the
-- catalogue.
ALTER VIEW public.public_vendor_services SET (security_invoker = false);

GRANT SELECT ON public.public_vendor_services TO anon, authenticated;

-- ── And the base table stops answering the public ────────────────────
--
-- This is the policy 021 created. Partner and operator access is
-- untouched: "vendor_manages_own_services" and "admins_all_vendor_services"
-- both stay exactly as they are.
DROP POLICY IF EXISTS "public_reads_approved_vendor_services" ON public.vendor_services;

-- ══════════════════════════════════════════════════════════════════════
-- B · A PARTNER CAN PUT THEMSELVES ON THE PAID TIER
-- ══════════════════════════════════════════════════════════════════════
--
-- Found as: an ordinary partner session ran
--
--   UPDATE vendors SET subscription_plan = 'pro' WHERE id = <their own>
--
-- and it stuck. 067's guard restores is_verified, verified_by,
-- verified_at, is_featured and is_synthetic on any partner-side write;
-- `subscription_plan` was never added to that list.
--
-- It is not cosmetic. `effectiveTier()` feeds `firstWave` — which wave
-- of dispatch a partner is reached in — and `photoLimit`. Server-side
-- dispatch does not read the column today, so nobody has jumped a
-- queue with it, but it is a paid tier that anybody can award
-- themselves from the browser console.
--
-- ── Extending the existing trigger rather than adding a second ──────
-- One function already answers "what may a partner not write on their
-- own vendors row". A second trigger would be a second answer, and the
-- next person would have to find both to know the rule.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE BODY BELOW IS 075's, NOT 067's, AND THAT DISTINCTION IS THE
-- WHOLE MIGRATION
-- ══════════════════════════════════════════════════════════════════════
--
-- The first draft of this file copied the body out of 067, because that
-- is where the function appears to live if you search for it and stop
-- at the first hit. It has been replaced since: 066 → 067 → 075, and
-- 075 changed the one line that matters most.
--
--   067:  IF get_my_role() IN ('admin','event_coordinator')
--   075:  IF public.caller_is_operator()
--
-- `caller_is_operator()` is `auth.role() = 'service_role' OR
-- get_my_role() IN (...)`, and `get_my_role()` is NULL for the service
-- role because there is no auth.uid() behind it. 075 is titled
-- "service_role_can_administer" and its header states the bug it was
-- written to fix in as many words: the guard "treats the platform as a
-- partner".
--
-- So a CREATE OR REPLACE carrying 067's body would have reverted 075
-- silently — no error, no warning, the function simply older than the
-- database it replaced. Every platform-side write to verification_status
-- would start raising "set by review, not by the partner", and writes to
-- is_verified and friends would be reverted without saying so.
--
-- Everything between BEGIN and the 124 additions below is 075's text,
-- unchanged, compared line by line.
CREATE OR REPLACE FUNCTION public.guard_vendor_self_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  -- A partner may move draft → submitted, and nothing else.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (OLD.verification_status IN ('draft','rejected')
            AND NEW.verification_status = 'submitted') THEN
      RAISE EXCEPTION
        'verification_status % is set by review, not by the partner', NEW.verification_status
        USING HINT = 'A partner may submit for review. Only an operator approves.';
    END IF;
    NEW.submitted_at := now();
  END IF;

  NEW.is_verified  := OLD.is_verified;
  NEW.verified_by  := OLD.verified_by;
  NEW.verified_at  := OLD.verified_at;
  NEW.is_featured  := OLD.is_featured;
  NEW.is_synthetic := OLD.is_synthetic;

  -- ── 124 adds these two, and nothing else ──────────────────────────

  -- What somebody is paying for is not theirs to declare. Pinned rather
  -- than compared against a list of tier names, so a plan added later is
  -- covered the day it is added: the rule is "not by the partner", not
  -- "not 'pro' or 'growth'".
  NEW.subscription_plan := OLD.subscription_plan;

  -- Not redundant, and not belt and braces — it closes a laundering
  -- path through the NEXT trigger.
  --
  -- `vendors_sync_verification` (077) runs after this one, because
  -- BEFORE triggers fire in name order and "sync" sorts after "self" —
  -- 077 documents that it relies on exactly this ordering. Its first
  -- branch translates a changed legacy `status` UP into
  -- `verification_status`:
  --
  --   IF NEW.status IS DISTINCT FROM OLD.status
  --      AND NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status
  --   THEN NEW.verification_status := CASE NEW.status WHEN 'APPROVED' ...
  --
  -- A partner writing `status = 'APPROVED'` never touches
  -- verification_status, so the check above lets it through untouched
  -- and 077 then derives an approval from it. Pinning status here means
  -- 077 sees it unchanged, does not translate, and derives status from
  -- the verification_status that review actually set.
  NEW.status := OLD.status;

  RETURN NEW;
END;
$$;

-- The trigger is the one 066/067 attached and 075 last replaced the body
-- of; CREATE OR REPLACE FUNCTION swaps the body under it, so no trigger
-- is created, dropped or reordered here.

COMMIT;
    