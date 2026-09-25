-- ═══════════════════════════════════════════════════════════════════════
-- 154 · A campaign you can change without shipping an apk
-- ═══════════════════════════════════════════════════════════════════════
--
-- The partner app has no marketing surface at all. The obvious way to
-- add one is a card in Earnings.jsx with the copy and the reward in it,
-- and that is the version this migration exists to prevent.
--
-- ── Why a rupee value must never be in the bundle ────────────────────
-- A referral reward written into JSX is a number that:
--
--   · cannot be changed without a release, a review and a rollout, so
--     the campaign that ends on the 31st runs until somebody ships
--   · is DIFFERENT on every phone, because partners update when they
--     feel like it -- so two partners doing the same thing see two
--     different promises, and both of them are in writing
--   · is a commitment made by whoever edited a component
--
-- The last one is the real argument. ₹2,500 for 20 referrals is a
-- commercial decision. It belongs in a row an operator can change and
-- an auditor can read, not in a string a developer can typo.
--
-- ── What this is NOT ─────────────────────────────────────────────────
-- Not a CMS. There is no rich text, no scheduling UI, no segments
-- builder. It is a list of cards with a window, an audience predicate
-- and a route, which is the whole of what the Earnings carousel needs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_promotions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What kind of card this is, so the UI can pick an icon and the
  -- analytics can group without parsing the title.
  type        TEXT NOT NULL CHECK (type IN (
                'referral', 'calendar', 'profile', 'education',
                'seasonal', 'announcement')),

  title       TEXT NOT NULL CHECK (length(trim(title)) > 0),
  subtitle    TEXT,
  body        TEXT,

  cta_label   TEXT,
  -- An in-app path. Checked, because a promotion is operator-authored
  -- content that ends up as a tap target: an absolute URL here would be
  -- an open redirect wearing a Sambramo card.
  cta_route   TEXT CHECK (cta_route IS NULL OR cta_route LIKE '/%'),

  icon        TEXT,
  terms_url   TEXT,

  -- Higher shows first. Ties break on created_at so the order is stable
  -- between renders rather than whatever the planner felt like.
  priority    INTEGER NOT NULL DEFAULT 0,

  -- ── The window ─────────────────────────────────────────────────────
  -- NULL start means "already running", NULL end means "until somebody
  -- says stop". Both nullable because most campaigns have one edge.
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at),

  -- ── Who sees it ────────────────────────────────────────────────────
  -- A predicate evaluated in the CLIENT against facts it already holds,
  -- deliberately: the alternative is a per-partner query on every
  -- Earnings render to decide whether to show a marketing card, which
  -- is a real cost for a decorative one.
  --
  -- Keys are a closed list read by `promotionApplies()`. An unknown key
  -- makes the promotion not match, rather than match by accident --
  -- silence is the safe direction for something nobody reviewed.
  --
  --   {"lifecycle": ["LIVE"], "max_coverage_days": 120, "trades": [...]}
  audience    JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- ── The commercial terms ───────────────────────────────────────────
  -- Free-form because a referral campaign and a seasonal one do not
  -- have the same shape, and forcing them into shared columns produces
  -- five nullable ones nobody can interpret.
  --
  -- For a referral campaign, `qualification` carries the rule the
  -- lifecycle in 155 is measured against:
  --   {"minimum_referrals": 20, "requires": "first_eligible_event"}
  qualification JSONB NOT NULL DEFAULT '{}'::jsonb,

  reward_type   TEXT CHECK (reward_type IS NULL OR reward_type IN ('cash', 'credit', 'none')),
  -- Paise. Never rupees, and never a float: this is the same unit the
  -- rest of the money in this database uses, and mixing the two is how
  -- somebody eventually pays a hundredth of what they owe.
  reward_paise  BIGINT CHECK (reward_paise IS NULL OR reward_paise > 0),

  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redeemed_count  INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),

  dismissible BOOLEAN NOT NULL DEFAULT true,
  active      BOOLEAN NOT NULL DEFAULT false,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Defaults to INACTIVE, which is the important default. A row typed
-- half-way and left overnight must not be on a partner's screen in the
-- morning.
COMMENT ON COLUMN public.partner_promotions.active IS
  'Defaults false. A half-written campaign must never be live by accident.';
COMMENT ON COLUMN public.partner_promotions.reward_paise IS
  'Paise, like every other amount here. The frontend must never carry a rupee value.';

CREATE INDEX IF NOT EXISTS idx_partner_promotions_live
  ON public.partner_promotions (priority DESC, created_at DESC)
  WHERE active = true;

-- ── Dismissal is per partner ──────────────────────────────────────────
-- Not a column on the promotion: "this partner has seen enough of this
-- card" is a fact about a pair, and putting it on the campaign would
-- mean one partner dismissing it for everybody.
CREATE TABLE IF NOT EXISTS public.partner_promotion_dismissals (
  vendor_id    UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.partner_promotions(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, promotion_id)
);

ALTER TABLE public.partner_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_promotion_dismissals ENABLE ROW LEVEL SECURITY;

-- Every signed-in partner reads the LIVE ones. Not `anon`: a campaign
-- is not public, and the customer app has no business listing partner
-- incentives.
DROP POLICY IF EXISTS "partners read live promotions" ON public.partner_promotions;
CREATE POLICY "partners read live promotions"
  ON public.partner_promotions FOR SELECT TO authenticated
  USING (
    active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at   IS NULL OR end_at   >  now())
  );

DROP POLICY IF EXISTS "operators manage promotions" ON public.partner_promotions;
CREATE POLICY "operators manage promotions"
  ON public.partner_promotions FOR ALL TO authenticated
  USING (public.caller_is_operator()) WITH CHECK (public.caller_is_operator());

DROP POLICY IF EXISTS "partner manages own dismissals" ON public.partner_promotion_dismissals;
CREATE POLICY "partner manages own dismissals"
  ON public.partner_promotion_dismissals FOR ALL TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid()));

GRANT SELECT ON public.partner_promotions TO authenticated;
GRANT ALL    ON public.partner_promotions TO service_role;
GRANT SELECT, INSERT, DELETE ON public.partner_promotion_dismissals TO authenticated;
GRANT ALL    ON public.partner_promotion_dismissals TO service_role;

COMMIT;
