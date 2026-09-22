-- ══════════════════════════════════════════════════════════════════════
-- 145 · A partner cannot verify themselves
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 144 first.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE STATE MACHINE BELONGS HERE, NOT IN REACT
-- ══════════════════════════════════════════════════════════════════════
--
-- A rule enforced in a component is enforced for people who use the
-- component. The partner app is a Capacitor WebView holding an anon key;
-- anybody who wants to can call PostgREST directly with it. So "only an
-- operator may mark a case verified" has to be a trigger, or it is a
-- suggestion.
--
-- 067 already established this for `vendors.is_verified` with
-- `guard_vendor_self_verify`, and 142 for `vendor_documents.provider_
-- status`. This does the same for the case.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE TRANSITIONS A PARTNER OWNS
-- ══════════════════════════════════════════════════════════════════════
--
--   in_progress     -> submitted        they finished filling it in
--   requires_action -> submitted        they fixed what was asked
--
-- That is the whole list. Everything else -- verifying, manual_review,
-- verified, rejected, requires_action -- is written by an operator or
-- by a SECURITY DEFINER function acting for the system.
--
-- Re-runnable.

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_case_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_owner UUID;
BEGIN
  -- An operator or the service role may do anything. The audit is what
  -- holds them to account, not this trigger.
  IF public.caller_is_operator() THEN RETURN NEW; END IF;

  SELECT v.profile_id INTO v_owner FROM public.vendors v WHERE v.id = NEW.vendor_id;

  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'That is not your verification case'
      USING HINT = 'See migration 145.';
  END IF;

  -- ── The two the partner owns ──────────────────────────────────────
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'in_progress' AND NEW.status = 'submitted') OR
      (OLD.status = 'requires_action' AND NEW.status = 'submitted')
    ) THEN
      RAISE EXCEPTION
        'A partner cannot move a case from % to %', OLD.status, NEW.status
        USING HINT = 'Only submitting is yours. See migration 145.';
    END IF;
  END IF;

  -- ── The fields that are never a partner's to write ────────────────
  --
  -- Listed explicitly rather than by omission: a column added later
  -- should default to FORBIDDEN, and the way to get that is to name
  -- what is allowed to change and restore everything else.
  NEW.decided_at    := OLD.decided_at;
  NEW.decided_by    := OLD.decided_by;
  NEW.decision_note := OLD.decision_note;
  NEW.risk_band     := OLD.risk_band;
  NEW.risk_score    := OLD.risk_score;
  NEW.review_due_at := OLD.review_due_at;
  NEW.attempt_no    := OLD.attempt_no;
  NEW.supersedes_id := OLD.supersedes_id;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_case_transitions ON public.verification_cases;
CREATE TRIGGER trg_guard_case_transitions
  BEFORE UPDATE ON public.verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.guard_case_transitions();

/* A case always starts at in_progress, whoever inserts it. A client
   creating one already `verified` is the shortest path past every
   check in this system. */
CREATE OR REPLACE FUNCTION public.new_case_starts_in_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.caller_is_operator() THEN RETURN NEW; END IF;
  NEW.status        := 'in_progress';
  NEW.decided_at    := NULL;
  NEW.decided_by    := NULL;
  NEW.decision_note := NULL;
  NEW.risk_band     := NULL;
  NEW.risk_score    := NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_new_case_starts_in_progress ON public.verification_cases;
CREATE TRIGGER trg_new_case_starts_in_progress
  BEFORE INSERT ON public.verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.new_case_starts_in_progress();

-- ══════════════════════════════════════════════════════════════════════
-- OPENING AND SUBMITTING
-- ══════════════════════════════════════════════════════════════════════

/**
 * Open a case, or return the one already open.
 *
 * Idempotent: a partner tapping twice, or two devices, get the same
 * case rather than a unique-violation. `uq_one_open_case_per_vendor`
 * is what makes that safe.
 */
CREATE OR REPLACE FUNCTION public.open_verification_case()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_case   public.verification_cases%ROWTYPE;
  v_prev   public.verification_cases%ROWTYPE;
  v_id     UUID;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_a_partner');
  END IF;

  SELECT * INTO v_case FROM public.verification_cases
  WHERE vendor_id = v_vendor.id AND status NOT IN ('verified', 'rejected')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true,
      'case_id', v_case.id, 'status', v_case.status);
  END IF;

  SELECT * INTO v_prev FROM public.verification_cases
  WHERE vendor_id = v_vendor.id
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.verification_cases (vendor_id, attempt_no, supersedes_id)
  VALUES (v_vendor.id, COALESCE(v_prev.attempt_no, 0) + 1, v_prev.id)
  RETURNING id INTO v_id;

  PERFORM public.write_verification_audit(
    'case_opened', v_vendor.id, v_id, NULL, NULL,
    jsonb_build_object('attempt_no', COALESCE(v_prev.attempt_no, 0) + 1), NULL);

  RETURN jsonb_build_object('ok', true, 'case_id', v_id, 'status', 'in_progress');
END $$;

/**
 * Submit it, and start the clock.
 *
 * Supersedes 142's `submit_for_review()` for the case-based flow, and
 * calls it so `vendors.verification_status` and `review_due_at` stay in
 * step -- the Jobs-tab countdown reads those, and two sources of truth
 * for one deadline is how a partner sees two different answers.
 */
CREATE OR REPLACE FUNCTION public.submit_verification_case()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_case   public.verification_cases%ROWTYPE;
  v_due    TIMESTAMPTZ;
  v_outer  JSONB;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_a_partner');
  END IF;

  SELECT * INTO v_case FROM public.verification_cases
  WHERE vendor_id = v_vendor.id AND status NOT IN ('verified', 'rejected')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_open_case',
      'says', 'Nothing to submit yet.');
  END IF;

  IF v_case.status IN ('submitted', 'verifying', 'manual_review') THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true,
      'case_id', v_case.id, 'review_due_at', v_case.review_due_at);
  END IF;

  v_due := now() + (public.review_sla_hours() || ' hours')::interval;

  UPDATE public.verification_cases
     SET status = 'submitted', submitted_at = COALESCE(submitted_at, now()),
         review_due_at = v_due, updated_at = now()
   WHERE id = v_case.id;

  -- Keep 142's columns in step, so the countdown on Jobs is right.
  v_outer := public.submit_for_review();

  PERFORM public.write_verification_audit(
    'case_submitted', v_vendor.id, v_case.id, NULL,
    jsonb_build_object('status', v_case.status),
    jsonb_build_object('status', 'submitted', 'review_due_at', v_due), NULL);

  RETURN jsonb_build_object('ok', true, 'case_id', v_case.id,
    'status', 'submitted', 'review_due_at', v_due);
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- THE OPERATOR DECISIONS
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.decide_verification_case(
  p_case_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_case public.verification_cases%ROWTYPE;
  v_status TEXT;
BEGIN
  IF NOT public.caller_is_operator() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_permitted');
  END IF;

  IF p_decision NOT IN ('verified', 'rejected', 'requires_action', 'manual_review') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_decision');
  END IF;

  -- A refusal or a request for changes must say why. A partner sent
  -- back with no reason has nothing to act on and will ring somebody.
  IF p_decision IN ('rejected', 'requires_action')
     AND (p_note IS NULL OR length(trim(p_note)) < 5) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_reason',
      'says', 'Say what needs to change. The partner reads this.');
  END IF;

  SELECT * INTO v_case FROM public.verification_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_case');
  END IF;

  UPDATE public.verification_cases
     SET status = p_decision,
         decision_note = p_note,
         decided_at = CASE WHEN p_decision IN ('verified','rejected') THEN now() ELSE NULL END,
         decided_by = auth.uid(),
         updated_at = now()
   WHERE id = p_case_id;

  /* The partner-facing status follows the case, through 112's own RPC
     so `is_verified`, `verified_by` and the listing promotion all keep
     happening in one place. */
  IF p_decision = 'verified' THEN
    PERFORM public.set_vendor_verification(v_case.vendor_id, 'approved', p_note);
  ELSIF p_decision = 'rejected' THEN
    PERFORM public.set_vendor_verification(v_case.vendor_id, 'rejected', p_note);
  END IF;

  v_status := CASE p_decision
    WHEN 'verified' THEN 'case_verified'
    WHEN 'rejected' THEN 'case_rejected'
    WHEN 'requires_action' THEN 'case_requires_action'
    ELSE 'case_reviewed' END;

  PERFORM public.write_verification_audit(
    v_status, v_case.vendor_id, p_case_id, NULL,
    jsonb_build_object('status', v_case.status),
    jsonb_build_object('status', p_decision), p_note);

  RETURN jsonb_build_object('ok', true, 'status', p_decision);
END $$;

/** Record one check. Called by the app and by the provider adapters. */
CREATE OR REPLACE FUNCTION public.record_verification_attempt(
  p_case_id UUID,
  p_kind TEXT,
  p_outcome TEXT,
  p_document_id UUID DEFAULT NULL,
  p_requirement_id TEXT DEFAULT NULL,
  p_provider_name TEXT DEFAULT NULL,
  p_provider_status TEXT DEFAULT NULL,
  p_provider_ref TEXT DEFAULT NULL,
  p_says TEXT DEFAULT NULL,
  p_detail JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_case public.verification_cases%ROWTYPE;
  v_id UUID;
BEGIN
  SELECT * INTO v_case FROM public.verification_cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_case');
  END IF;

  -- The owner or an operator. Nobody else writes to somebody's case.
  IF NOT public.caller_is_operator()
     AND NOT EXISTS (SELECT 1 FROM public.vendors v
                      WHERE v.id = v_case.vendor_id AND v.profile_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  INSERT INTO public.verification_attempts (
    case_id, vendor_id, document_id, requirement_id, kind, outcome,
    provider_name, provider_status, provider_ref, says, detail, created_by)
  VALUES (
    p_case_id, v_case.vendor_id, p_document_id, p_requirement_id, p_kind, p_outcome,
    p_provider_name, p_provider_status, p_provider_ref, p_says, p_detail, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'attempt_id', v_id);
END $$;

REVOKE ALL ON FUNCTION public.open_verification_case() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_verification_case() TO authenticated;

REVOKE ALL ON FUNCTION public.submit_verification_case() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_verification_case() TO authenticated;

REVOKE ALL ON FUNCTION public.decide_verification_case(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_verification_case(UUID, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_verification_attempt(
  UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_verification_attempt(
  UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;

COMMIT;
