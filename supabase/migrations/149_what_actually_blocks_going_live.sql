-- ══════════════════════════════════════════════════════════════════════
-- 149 · What actually blocks a partner going live
-- ══════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND. Apply 146 first — this is nothing but rows in the table
-- 146 creates.
--
-- ══════════════════════════════════════════════════════════════════════
-- READ THIS BEFORE PASTING. IT CHANGES WHO CAN WORK.
-- ══════════════════════════════════════════════════════════════════════
--
-- Every migration up to here has been able to claim it changed nothing
-- for anybody. This one cannot. `MANDATORY_FROM` has been null since the
-- requirement engine was written, so every requirement renders as
-- "Optional" and no document has ever stopped a partner going live.
--
-- These eight rows end that, on the date named in them. Until that date
-- passes, `requirement_is_mandatory()` still returns FALSE for all of
-- them and nothing changes — which is the point of the date being a
-- column rather than a deploy.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY THESE EIGHT AND NOT NINETEEN
-- ══════════════════════════════════════════════════════════════════════
--
-- The engine can generate nineteen requirements. Making all nineteen
-- blocking would be defensible on paper and wrong in practice: a mehendi
-- artist working from home does not have a fire NOC, a decorator does
-- not have public liability cover, and a tent supplier's "property
-- proof" is a rental agreement nobody has scanned. Demanding those on
-- day one does not make anybody safer; it empties the supply side and
-- teaches partners that the app asks for things it does not need.
--
-- So the line is drawn at two places:
--
--   IDENTITY   — a customer is letting this person into their home on a
--                day that matters to them, and the one thing Sambramo
--                must be able to say is that it knows who they are.
--
--   STATUTORY  — a licence the person is committing an OFFENCE to work
--                without. Serving food without FSSAI, driving a
--                commercial vehicle without a licence and registration,
--                or supplying guards without PSARA are not paperwork
--                preferences; they are the law, and a marketplace that
--                dispatched those jobs would be party to it.
--
-- Everything else stays advisory: collected, shown to the operator,
-- visible on the partner's own checklist, and not a gate.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE DATE
-- ══════════════════════════════════════════════════════════════════════
--
-- 2026-11-01, six weeks out. Not the launch date, deliberately.
--
-- A partner who onboarded in October under the old rules must not open
-- the app in November to find themselves non-compliant with no warning;
-- `mandatory_from` being in the future is what gives the app six weeks
-- to ask them nicely first. Move the date rather than deleting the row
-- if that needs to slip — the row is the decision, the date is the
-- timing, and they are worth keeping separate.
--
-- Re-runnable: ON CONFLICT updates, so pasting twice is a no-op and
-- changing a date here and re-running is how a date gets changed.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- EVERYBODY
-- ══════════════════════════════════════════════════════════════════════
--
-- NULL market, NULL trade, NULL service: the wildcards 146 defines.

INSERT INTO public.verification_policy
  (requirement_id, market, trade, service, mandatory_from, note)
VALUES
  ('VER-ID-IDENTITY', NULL, NULL, NULL, DATE '2026-11-01',
   'A customer is letting this person into their home. Aadhaar, passport, '
   'voter ID or driving licence — any one of them, the partner chooses.'),

  ('VER-TAX-PAN', NULL, NULL, NULL, DATE '2026-11-01',
   'Section 194-O requires TDS on marketplace payouts. Without a PAN the '
   'deduction is at the higher non-PAN rate, which costs the partner money '
   'they will not understand losing.')
ON CONFLICT (COALESCE(market, '*'), COALESCE(trade, '*'),
             COALESCE(service, '*'), requirement_id)
DO UPDATE SET mandatory_from = EXCLUDED.mandatory_from,
              note = EXCLUDED.note;

-- ══════════════════════════════════════════════════════════════════════
-- STATUTORY, BY TRADE
-- ══════════════════════════════════════════════════════════════════════
--
-- The trade strings must match `TRADE_TIERS` in
-- src/lib/verification/requirements.js exactly. A typo here does not
-- error — it produces a policy row that matches no trade and silently
-- enforces nothing, which is the worst possible failure mode for a file
-- like this. scripts/check-verification-policy.mjs compares the two.

INSERT INTO public.verification_policy
  (requirement_id, market, trade, service, mandatory_from, note)
VALUES
  ('VER-TRADE-FSSAI', NULL, 'Catering & Food', NULL, DATE '2026-11-01',
   'Serving food to the public without an FSSAI registration is an offence '
   'under the Food Safety and Standards Act 2006.'),

  ('VER-TRADE-FSSAI', NULL, 'Cake & Desserts', NULL, DATE '2026-11-01',
   'Same Act. A home baker needs the basic registration, not the full '
   'licence, and it costs Rs 100 a year.'),

  ('VER-TRADE-DL', NULL, 'Transportation', NULL, DATE '2026-11-01',
   'Driving without a valid licence is an offence under the Motor Vehicles '
   'Act, and no insurance responds to a claim behind one.'),

  ('VER-TRADE-RC', NULL, 'Transportation', NULL, DATE '2026-11-01',
   'The vehicle carrying a customer must be the registered vehicle.'),

  ('VER-TRADE-INSURANCE', NULL, 'Transportation', NULL, DATE '2026-11-01',
   'Third-party motor cover is compulsory. This is the one that decides '
   'whether an injured guest is compensated.'),

  ('VER-TRADE-PSARA', NULL, 'Security Services', NULL, DATE '2026-11-01',
   'Supplying security guards without a PSARA licence is an offence under '
   'the Private Security Agencies (Regulation) Act 2005.')
ON CONFLICT (COALESCE(market, '*'), COALESCE(trade, '*'),
             COALESCE(service, '*'), requirement_id)
DO UPDATE SET mandatory_from = EXCLUDED.mandatory_from,
              note = EXCLUDED.note;

-- ══════════════════════════════════════════════════════════════════════
-- DELIBERATELY ABSENT, AND WHY
-- ══════════════════════════════════════════════════════════════════════
--
-- Each of these was considered and left advisory. Written down so that
-- adding one later is a decision somebody makes on purpose rather than
-- an omission somebody notices.
--
--   VER-ID-SELFIE       Collected and compared, never blocking. It is
--                       biometric processing under DPDP 2023 and needs
--                       its own consent, which the partner may refuse
--                       without losing their livelihood.
--
--   VER-SAFETY-PCC      A police clearance certificate takes weeks to
--                       obtain in Karnataka and cannot be demanded at
--                       sign-up. It scopes a partner DOWN — out of
--                       childcare and in-home work — rather than out.
--
--   VER-TRADE-LIQUOR    Bar service: the licence is usually the VENUE's,
--                       not the supplier's, and blocking the supplier
--                       for the venue's paperwork is the wrong party.
--
--   VER-TRADE-PROPERTY  Venue: most are leased, and a lease is not a
--   VER-TRADE-OCCUPANCY scan anybody has to hand. Fire NOC and occupancy
--   VER-TRADE-FIRE      certificates genuinely matter for a venue with
--                       three hundred guests in it, and they are the
--                       strongest candidates to promote next. Left out
--                       today only because a venue that cannot list is
--                       a venue that lists somewhere else, and because
--                       this needs a conversation with the venues we
--                       already have rather than a migration.
--
--   VER-TRADE-ELECTRICAL  Power & Cooling. A generator at a wedding is a
--                       real hazard and this is the second candidate.
--
--   VER-BUSINESS-GST    Below the threshold most partners are not
--                       required to register at all. Demanding it would
--                       be demanding something the law does not.
--
-- To promote one, add a row here with a date. That is the whole change.

COMMIT;
