-- 194 — The customer's referral tracker gets its own name (2026-10-28)
--
-- 193 created public.my_referrals() with no arguments. The partner
-- programme (158) already has public.my_referrals(p_trade_id, p_state,
-- p_id) with every argument defaulted, so a call with NO arguments now
-- matches both and PostgREST refuses it (PGRST203). The partner app is
-- not affected — it always names all three arguments — but the
-- customer's Refer page cannot reach its tracker.
--
-- So: drop the zero-argument overload and give the customer version its
-- own name. Same body as 193.
--
-- Rollback: drop function if exists public.my_customer_referrals();

BEGIN;

DROP FUNCTION IF EXISTS public.my_referrals();

CREATE OR REPLACE FUNCTION public.my_customer_referrals()
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
REVOKE ALL ON FUNCTION public.my_customer_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_customer_referrals() TO authenticated;

COMMIT;
