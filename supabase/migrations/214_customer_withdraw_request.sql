-- ══════════════════════════════════════════════════════════════════════
-- 214 · A customer can withdraw an unanswered price request
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Re-runnable. Verification at the end.
--
-- 1. customer_withdraw_quote(request_id)
--    Mohan, 2026-11-15: "cancel or delete this booking". A request that
--    went to a master as a price request (the quote lane, migration 164)
--    had no way back: its state check has no customer-closed value and
--    the customer has no UPDATE policy on the table. This adds the state
--    CUSTOMER_WITHDRAWN and ONE function that may set it — only on the
--    caller's own request, only while it is still waiting
--    (VENDOR_QUOTE / QUOTE_ACTION_REQUIRED), and never after a reply has
--    been accepted. A reply already sent is marked DECLINED, so the master
--    sees it closed. Nothing is paid on a waiting request, so nothing is
--    refunded; a booked line is still cancelled through cancel_line.
--
-- Partner locations are NEVER exposed (Mohan, 2026-11-15: "location should
-- never be revealed of the partners — only the customer's"). An earlier draft
-- of this file added public_listing_points; it was removed before applying.
-- The DROP below makes sure it does not exist even if a draft was pasted.

BEGIN;

-- ── 1 · the state ───────────────────────────────────────────────────
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_constraint
   WHERE conrelid = 'public.sambramo_quote_requests'::regclass AND conname = 'sambramo_quote_requests_state_check';
  IF d IS NOT NULL AND d NOT LIKE '%CUSTOMER_WITHDRAWN%' THEN
    EXECUTE 'ALTER TABLE public.sambramo_quote_requests DROP CONSTRAINT sambramo_quote_requests_state_check';
    EXECUTE 'ALTER TABLE public.sambramo_quote_requests ADD CONSTRAINT sambramo_quote_requests_state_check '
      || regexp_replace(d, 'ARRAY\[', 'ARRAY[''CUSTOMER_WITHDRAWN''::text, ');
  END IF;
END $$;

-- ── 1 · the function ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.customer_withdraw_quote(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.sambramo_quote_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'Sign in first'); END IF;
  SELECT * INTO r FROM public.sambramo_quote_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR r.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not your request');
  END IF;
  IF r.state = 'CUSTOMER_WITHDRAWN' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  IF r.state NOT IN ('VENDOR_QUOTE', 'QUOTE_ACTION_REQUIRED') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This request is no longer waiting — cancel the booking instead');
  END IF;
  IF EXISTS (SELECT 1 FROM public.sambramo_quote_responses x WHERE x.quote_request_id = r.id AND x.status = 'ACCEPTED') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'You already accepted a reply — cancel the booking instead');
  END IF;
  UPDATE public.sambramo_quote_responses SET status = 'DECLINED' WHERE quote_request_id = r.id AND status = 'SUBMITTED';
  UPDATE public.sambramo_quote_requests SET state = 'CUSTOMER_WITHDRAWN' WHERE id = r.id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.customer_withdraw_quote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_withdraw_quote(uuid) TO authenticated;

-- ── 2 · no partner points, ever ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.public_listing_points(text);

COMMIT;

-- ── verify ───────────────────────────────────────────────────────────
-- Expect: the constraint mentions CUSTOMER_WITHDRAWN, the withdraw function
-- exists, and there is NO public_listing_points.
SELECT pg_get_constraintdef(oid) LIKE '%CUSTOMER_WITHDRAWN%' AS withdraw_state
  FROM pg_constraint WHERE conname = 'sambramo_quote_requests_state_check';
SELECT proname FROM pg_proc WHERE proname IN ('customer_withdraw_quote', 'public_listing_points') ORDER BY 1;
