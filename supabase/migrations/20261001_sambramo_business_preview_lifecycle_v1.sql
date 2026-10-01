-- 20261001 · Sambramo business preview + immutable submission lifecycle v1
-- Reuses verification_cases as the review state machine and adds an
-- append-only customer-facing snapshot for the exact version reviewed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.sambramo_business_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  verification_case_id uuid REFERENCES public.verification_cases(id) ON DELETE SET NULL,
  revision_no integer NOT NULL CHECK (revision_no BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'UNDER_REVIEW'
    CHECK (status IN ('SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED','APPROVED','REJECTED','PUBLISHED','SUPERSEDED')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_preview_version integer NOT NULL DEFAULT 1,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  review_note text,
  supersedes_id uuid REFERENCES public.sambramo_business_submissions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sambramo_business_submissions_vendor
  ON public.sambramo_business_submissions(vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sambramo_business_submissions_case
  ON public.sambramo_business_submissions(verification_case_id, revision_no);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sambramo_business_submission_round
  ON public.sambramo_business_submissions(vendor_id, verification_case_id, revision_no);

ALTER TABLE public.sambramo_business_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner can read own business submissions"
  ON public.sambramo_business_submissions;

CREATE POLICY "partner can read own business submissions"
  ON public.sambramo_business_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = sambramo_business_submissions.vendor_id
        AND v.profile_id = (SELECT auth.uid())
    )
    OR public.caller_is_operator()
  );

REVOKE INSERT, UPDATE, DELETE ON public.sambramo_business_submissions FROM authenticated;
GRANT SELECT ON public.sambramo_business_submissions TO authenticated;
GRANT ALL ON public.sambramo_business_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.sambramo_build_business_snapshot(p_vendor_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'preview_version', 1,
    'vendor', jsonb_build_object(
      'business_name', v.business_name,
      'category', v.category,
      'description', v.description,
      'city', v.city,
      'area', v.area,
      'price_range_min', v.price_range_min,
      'price_range_max', v.price_range_max,
      'starting_price', v.starting_price,
      'service_areas', v.service_areas,
      'website_url', v.website_url,
      'instagram_url', v.instagram_url,
      'accepting_bookings', v.accepting_bookings,
      'lead_time_days', v.lead_time_days,
      'max_events_per_day', v.max_events_per_day,
      'service_radius_km', v.service_radius_km
    ),
    'listings', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pl.id,
          'trade', pl.trade,
          'trade_id', pl.trade_id,
          'status', pl.status,
          'review_note', pl.review_note,
          'offerings', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', vs.id,
                'name', vs.name,
                'category', vs.category,
                'description', vs.description,
                'price', vs.price,
                'unit', vs.unit,
                'min_quantity', vs.min_quantity,
                'lead_time_days', vs.lead_time_days,
                'is_active', vs.is_active,
                'specs', vs.specs,
                'match_profile', vs.match_profile
              )
              ORDER BY vs.sort_order, vs.created_at
            )
            FROM public.vendor_services vs
            WHERE vs.vendor_id = p_vendor_id
              AND (
                vs.listing_id = pl.id
                OR (vs.listing_id IS NULL AND vs.category = pl.trade)
              )
          ), '[]'::jsonb)
        )
        ORDER BY pl.trade
      )
      FROM public.partner_listings pl
      WHERE pl.vendor_id = p_vendor_id
    ), '[]'::jsonb)
  )
  FROM public.vendors v
  WHERE v.id = p_vendor_id;
$$;

REVOKE ALL ON FUNCTION public.sambramo_build_business_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sambramo_build_business_snapshot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_sambramo_business()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_case public.verification_cases%ROWTYPE;
  v_open jsonb;
  v_submitted jsonb;
  v_revision integer;
  v_payload jsonb;
  v_previous uuid;
  v_id uuid;
  v_case_id uuid;
BEGIN
  SELECT *
  INTO v_vendor
  FROM public.vendors
  WHERE profile_id = (SELECT auth.uid())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_a_partner');
  END IF;

  v_open := public.open_verification_case();

  IF COALESCE(v_open->>'ok', 'false') <> 'true' THEN
    RETURN v_open;
  END IF;

  v_case_id := NULLIF(v_open->>'case_id', '')::uuid;

  SELECT *
  INTO v_case
  FROM public.verification_cases
  WHERE id = v_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_case');
  END IF;

  -- A submission already in the review queue is idempotent.
  IF v_case.status IN ('submitted', 'verifying', 'manual_review') THEN
    SELECT *
    INTO v_revision
    FROM (
      SELECT revision_no
      FROM public.sambramo_business_submissions
      WHERE verification_case_id = v_case.id
      ORDER BY revision_no DESC
      LIMIT 1
    ) q;

    RETURN jsonb_build_object(
      'ok', true,
      'replayed', true,
      'case_id', v_case.id,
      'revision_no', COALESCE(v_revision, 1),
      'status', v_case.status,
      'review_due_at', v_case.review_due_at
    );
  END IF;

  -- A partner may correct and resubmit only a bounded number of times.
  SELECT COUNT(*) + 1
  INTO v_revision
  FROM public.sambramo_business_submissions
  WHERE verification_case_id = v_case.id;

  IF v_revision > 3 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'revision_limit_reached',
      'says', 'This review cycle has reached its correction limit. Please contact Sambramo support for the next review cycle.'
    );
  END IF;

  v_payload := public.sambramo_build_business_snapshot(v_vendor.id);

  SELECT id
  INTO v_previous
  FROM public.sambramo_business_submissions
  WHERE vendor_id = v_vendor.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- First submission or a correction submission. The case RPC owns the
  -- verification deadline and the transition itself.
  v_submitted := public.submit_verification_case();

  IF COALESCE(v_submitted->>'ok', 'false') <> 'true' THEN
    RETURN v_submitted;
  END IF;

  INSERT INTO public.sambramo_business_submissions (
    vendor_id,
    verification_case_id,
    revision_no,
    status,
    payload,
    customer_preview_version,
    submitted_at,
    supersedes_id,
    created_by
  )
  VALUES (
    v_vendor.id,
    v_case.id,
    v_revision,
    'UNDER_REVIEW',
    v_payload,
    1,
    now(),
    v_previous,
    (SELECT auth.uid())
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'submission_id', v_id,
    'case_id', v_case.id,
    'revision_no', v_revision,
    'status', 'UNDER_REVIEW',
    'review_due_at', v_submitted->'review_due_at'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_sambramo_business() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_sambramo_business() TO authenticated;

-- Do not let an operator publish a submission before the declared minimum
-- review window. The countdown remains informational; this trigger makes
-- the publication gate non-bypassable.
CREATE OR REPLACE FUNCTION public.sambramo_guard_min_review_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verified'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.review_due_at IS NOT NULL
     AND now() < NEW.review_due_at THEN
    RAISE EXCEPTION 'Minimum Sambramo review window has not elapsed'
      USING HINT = 'The business can be published only after review_due_at.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sambramo_guard_min_review_window
  ON public.verification_cases;

CREATE TRIGGER trg_sambramo_guard_min_review_window
  BEFORE UPDATE OF status ON public.verification_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.sambramo_guard_min_review_window();

-- Keep the reviewed/published snapshot synchronized with the existing
-- verification case decisions. This is deliberately DB-side: an admin
-- UI is not a security boundary.
CREATE OR REPLACE FUNCTION public.sambramo_sync_submission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_latest uuid;
BEGIN
  SELECT id
  INTO v_latest
  FROM public.sambramo_business_submissions
  WHERE verification_case_id = NEW.id
  ORDER BY revision_no DESC, created_at DESC
  LIMIT 1;

  IF v_latest IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'verified' THEN
    UPDATE public.sambramo_business_submissions
       SET status = 'SUPERSEDED',
           reviewed_at = COALESCE(reviewed_at, now())
     WHERE vendor_id = NEW.vendor_id
       AND status = 'PUBLISHED'
       AND id <> v_latest;

    UPDATE public.sambramo_business_submissions
       SET status = 'PUBLISHED',
           reviewed_at = COALESCE(NEW.decided_at, now()),
           published_at = COALESCE(published_at, now()),
           review_note = NEW.decision_note
     WHERE id = v_latest;

  ELSIF NEW.status = 'requires_action' THEN
    UPDATE public.sambramo_business_submissions
       SET status = 'ACTION_REQUIRED',
           reviewed_at = now(),
           review_note = NEW.decision_note
     WHERE id = v_latest;

  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.sambramo_business_submissions
       SET status = 'REJECTED',
           reviewed_at = now(),
           review_note = NEW.decision_note
     WHERE id = v_latest;

  ELSIF NEW.status IN ('verifying', 'manual_review', 'submitted') THEN
    UPDATE public.sambramo_business_submissions
       SET status = 'UNDER_REVIEW'
     WHERE id = v_latest;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sambramo_sync_submission_status
  ON public.verification_cases;

CREATE TRIGGER trg_sambramo_sync_submission_status
  AFTER UPDATE OF status, decision_note, decided_at ON public.verification_cases
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.decision_note IS DISTINCT FROM NEW.decision_note)
  EXECUTE FUNCTION public.sambramo_sync_submission_status();

COMMENT ON TABLE public.sambramo_business_submissions IS
  'Immutable partner storefront snapshots submitted to Sambramo for review. Three revisions max per verification cycle.';

COMMIT;
