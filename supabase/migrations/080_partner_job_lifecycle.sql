-- ══════════════════════════════════════════════════════════════════════
-- 080 · The partner's side of a job, after they accept it
-- ══════════════════════════════════════════════════════════════════════
--
-- Everything up to "Accept" existed. Everything after it did not.
--
-- The offer inbox lists `dispatch_offers` where status = 'OFFERED', so
-- the moment a master accepted, the job VANISHED from their screen. No
-- date, no area, no customer, no way to say the work was done. A master
-- who cleared a Saturday had nothing on their phone to prove it.
--
-- Three things are missing and all three are here:
--
--   1. a view of the jobs they have won          partner_jobs
--   2. the customer's details, once paid          (booking_contact, 068)
--   3. a way to say the work is finished          mark_line_delivered
--
-- ── Why (3) needs a function and not a policy ────────────────────────
-- A partner must be able to move their own line from `paid` to
-- `delivered` and NOTHING else. An UPDATE policy on `booking_lines`
-- broad enough to allow that is broad enough to allow a partner to set
-- their own line to `settled` — which is the state `api/release-escrow`
-- reads before moving money.
--
-- So the transition is a SECURITY DEFINER function that hardcodes the
-- one legal move. There is no UPDATE policy for partners at all, and
-- there must not be.
--
-- Re-runnable, like every migration in this series.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- partner_jobs — what a master has actually won
-- ══════════════════════════════════════════════════════════════════════
--
-- Deliberately NOT `security_invoker`, for the same reason as
-- `partner_offer_feed` in migration 076: a partner has no policy on
-- `booking_requests`, so an invoker-rights view would return zero rows
-- to every partner and the screen would be empty and correct-looking.
-- The view scopes itself in its own WHERE clause instead.
--
-- ── What is absent, and stays absent ────────────────────────────────
-- `address_text`, the customer's name, and their phone. Those come from
-- `booking_contact()` (068), which refuses until the line is paid. A
-- view that carried them would hand a master the customer's address the
-- moment they tapped Accept, and disintermediation would be a comment
-- rather than a rule.
DROP VIEW IF EXISTS partner_jobs;

CREATE VIEW partner_jobs
WITH (security_invoker = off) AS
SELECT
  l.id                  AS line_id,
  o.id                  AS offer_id,
  o.vendor_id,
  v.profile_id          AS partner_profile_id,

  l.status,
  l.service_id,
  l.service_name,
  l.trade,
  l.spec_mode,
  l.customer_note,
  l.reference_photo_url,

  -- What the master earns, not what the customer pays. The difference
  -- is the platform fee and it is already deducted here, because a
  -- master who sees the customer's number and works out the fee
  -- themselves feels something was hidden from them.
  o.partner_amount_paise,
  l.quoted_amount_paise,

  o.distance_m,
  l.accepted_at,
  l.paid_at,
  l.delivered_at,

  r.id                  AS request_id,
  r.occasion_name,
  r.event_date,
  r.time_note,
  r.guest_count,
  r.area_label,         -- area only, never address_text
  r.city,

  -- Has the customer paid for THIS line? Escrow is per line, so one
  -- master being funded says nothing about another on the same booking.
  EXISTS (
    SELECT 1 FROM escrow_ledger e
    WHERE e.line_id = l.id AND e.kind = 'HOLD'
  ) AS is_funded

FROM dispatch_offers o
JOIN booking_lines    l ON l.id = o.line_id
JOIN booking_requests r ON r.id = l.request_id
JOIN vendors          v ON v.id = o.vendor_id
WHERE o.status = 'ACCEPTED'
  AND (
    v.profile_id = auth.uid()
    OR get_my_role() IN ('admin', 'event_coordinator')
  );

COMMENT ON VIEW partner_jobs IS
  'Jobs a master has won. Carries area, never address; the customer''s '
  'name and number come from booking_contact(), which refuses until the '
  'line is paid.';

REVOKE ALL ON partner_jobs FROM PUBLIC, anon;
GRANT SELECT ON partner_jobs TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- mark_line_delivered — the one transition a partner may make
-- ══════════════════════════════════════════════════════════════════════
--
-- Returns jsonb rather than raising, matching accept_offer/decline_offer
-- in migration 061: every refusal here is an ordinary thing that happens
-- to honest people on bad connections, and an exception in the browser
-- console is not an answer a master can act on.
CREATE OR REPLACE FUNCTION public.mark_line_delivered(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line    booking_lines%ROWTYPE;
  v_owns    BOOLEAN;
  v_event   DATE;
BEGIN
  SELECT * INTO v_line FROM booking_lines WHERE id = p_line_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- The caller must be the master who WON this line. Not merely a master
  -- who was offered it: `uq_offer_one_winner` (060) makes "won" a single
  -- unambiguous row, and this reads that row rather than trusting a
  -- vendor id from the client.
  SELECT EXISTS (
    SELECT 1
    FROM dispatch_offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.line_id = p_line_id
      AND o.status = 'ACCEPTED'
      AND v.profile_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns AND get_my_role() NOT IN ('admin', 'event_coordinator') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_yours');
  END IF;

  -- Already done. Not an error — a master who taps twice on a bad
  -- connection has not made a mistake.
  IF v_line.status IN ('delivered', 'settled') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'status', v_line.status);
  END IF;

  -- Unpaid work cannot be delivered.
  --
  -- Not pedantry: `delivered` starts the T+24h escrow release clock, and
  -- releasing money that was never held is the exact failure the
  -- solvency trigger in 062 exists to make impossible. Better to refuse
  -- here, where there is a person who can be told why.
  IF v_line.status NOT IN ('paid', 'in_progress') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'not_paid',
      'status', v_line.status,
      'scan', 'The customer has not paid for this yet'
    );
  END IF;

  -- Not before the day itself. A master cannot close a job that has not
  -- happened, and a delivered-then-cancelled line is a dispute nobody
  -- can adjudicate.
  SELECT r.event_date INTO v_event
    FROM booking_requests r WHERE r.id = v_line.request_id;

  IF v_event IS NOT NULL AND v_event > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'too_early',
      'event_date', v_event,
      'scan', 'You can mark this done on the day'
    );
  END IF;

  UPDATE booking_lines
     SET status = 'delivered',
         delivered_at = now()
   WHERE id = p_line_id;

  RETURN jsonb_build_object('ok', true, 'status', 'delivered');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_line_delivered(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_line_delivered(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- delivered_at, if 059 did not create it
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE booking_lines ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════════════
-- Realtime, so screens stop having to be told to look again
-- ══════════════════════════════════════════════════════════════════════
--
-- A table that is not in this publication is SILENT rather than loud:
-- the client's subscription succeeds and no event ever arrives. That is
-- why the admin console sat on data from the moment it was opened, and
-- why every screen in this app carries a polling floor underneath its
-- subscription.
--
-- The DO block is because ALTER PUBLICATION ... ADD TABLE errors if the
-- table is already a member, and this migration has to be re-runnable.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vendors', 'profiles', 'booking_requests', 'booking_lines',
    'dispatch_offers', 'escrow_ledger'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
