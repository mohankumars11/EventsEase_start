-- ============================================================
-- 073 · The scrubber stops eating the space in front of the number
--
-- APPLY BY HAND in Supabase → SQL Editor. Apply 068 FIRST.
-- One CREATE OR REPLACE. Cosmetic, and worth its own file anyway.
--
-- ── What was wrong ───────────────────────────────────────────────────
-- 068's phone pattern opened with an optional separator that was not
-- attached to anything:
--
--     (\+?91[[:space:]-]?)?[[:space:]-]?[6-9][0-9]{4}[[:space:]-]?[0-9]{5}
--                          ^^^^^^^^^^^^^^^ this one
--
-- It was there to catch "+91-98765 43210", but the `+91` group already
-- carries its own separator. So on a bare number it simply swallowed the
-- space before it:
--
--     "Call me on 98765 43210"   →   "Call me on[removed]"
--
-- ── Why a cosmetic bug in this particular string is worth fixing ─────
-- That sentence is shown to a master on the offer card, and it is one of
-- the few places the platform's redaction is VISIBLE to a user. A
-- redaction that reads as a typo makes the platform look broken exactly
-- where it is doing something careful — and "on[removed]" is the kind of
-- thing that gets screenshotted.
--
-- The scrubbing itself was correct. It removed the number, on write, so
-- the number never reached the column, the backups or the export. Only
-- the spacing was wrong.
--
-- ── The fix ─────────────────────────────────────────────────────────
-- Drop the orphan separator. `+91` keeps its own, so every form still
-- matches:
--
--     98765 43210          →  [removed]
--     9876543210           →  [removed]
--     +91 98765 43210      →  [removed]
--     +91-9876543210       →  [removed]
--     08012345678          →  [removed]   (the bare 10+ digit rule)
--
-- Still deliberately conservative, and 068's reasoning stands: perfect
-- interception is not achievable and is not the goal. The goal is that
-- the easy, accidental path does not work, while the terms of service
-- and the audit trail handle deliberate evasion.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.scrub_contacts(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN p_text IS NULL THEN NULL ELSE
    regexp_replace(
      regexp_replace(
        -- Email first: an address can contain digits that the phone
        -- rules below would otherwise chew into.
        regexp_replace(p_text, '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[removed]', 'gi'),
        -- Indian mobile, with or without a +91 that carries its own
        -- separator. No orphan separator in front — that was the bug.
        '(\+?91[[:space:]-]?)?[6-9][0-9]{4}[[:space:]-]?[0-9]{5}', '[removed]', 'g'),
      -- Any remaining run of ten or more digits: landlines with an STD
      -- code, numbers typed with no spaces at all.
      '[0-9]{10,}', '[removed]', 'g')
  END
$$;

COMMENT ON FUNCTION public.scrub_contacts IS
  'Removes phone numbers and emails from free text, on write. Conservative by design — see migration 068.';

-- ── Check it, in one statement ───────────────────────────────────────
--
--   SELECT scrub_contacts('Call me on 98765 43210 or ravi@example.com');
--   -- expect: Call me on [removed] or [removed]     ← note the space
--
--   SELECT scrub_contacts('+91 98765 43210 / +91-9876543210 / 08012345678');
--   -- expect: [removed] / [removed] / [removed]
--
--   SELECT scrub_contacts('Blue and silver, 20 balloons, table for 8');
--   -- expect: unchanged — small numbers are not contact details

COMMIT;
