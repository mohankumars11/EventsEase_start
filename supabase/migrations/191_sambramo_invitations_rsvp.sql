-- 191 — Invitations & RSVP
--
-- A host (any signed-in customer) makes an invitation for a celebration,
-- adds guests, and sends each a personal link (WhatsApp / any share sheet).
-- The guest opens it in a browser — no app, no sign-in — and answers:
-- coming / maybe / can't, how many adults and children, meal preference,
-- which functions (haldi, mehendi, sangeet, reception …), a note.
-- The host sees a live headcount and can feed it into the celebration plan.
--
--   invitations            one per celebration (host-owned)
--   invitation_functions   the sub-events, each with its own RSVP
--   invitation_guests      the guest list; each row has a secret token
--   invitation_guest_functions  which function a guest is invited to, and their answer
--
-- Guests never touch these tables. They reach two SECURITY DEFINER
-- functions with a token: rsvp_view (read the card, mark it opened) and
-- rsvp_submit (answer). An invitation's open link (open_token) lets
-- anyone with the link add themselves, capped at max_open_guests.
--
-- Rollback:
--   drop function if exists public.rsvp_view(text), public.rsvp_submit(text, text, int, int, text, text, jsonb, text, text);
--   drop table if exists invitation_guest_functions, invitation_guests, invitation_functions, invitations cascade;

BEGIN;

CREATE OR REPLACE FUNCTION public.sambramo_token() RETURNS TEXT LANGUAGE sql VOLATILE AS $$
  SELECT replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
$$;

CREATE TABLE IF NOT EXISTS public.invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  occasion_id     TEXT REFERENCES public.occasions(id),
  event_plan_id   UUID REFERENCES public.event_plans(id) ON DELETE SET NULL,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  hosts_line      TEXT CHECK (char_length(hosts_line) <= 160),
  message         TEXT CHECK (char_length(message) <= 1200),
  event_date      DATE,
  start_time      TIME,
  venue_name      TEXT CHECK (char_length(venue_name) <= 160),
  venue_address   TEXT CHECK (char_length(venue_address) <= 400),
  map_url         TEXT CHECK (map_url IS NULL OR map_url ~* '^https://'),
  cover_key       TEXT,
  theme           TEXT NOT NULL DEFAULT 'amethyst',
  dress_code      TEXT CHECK (char_length(dress_code) <= 120),
  rsvp_by         DATE,
  ask_meal        BOOLEAN NOT NULL DEFAULT TRUE,
  allow_kids      BOOLEAN NOT NULL DEFAULT TRUE,
  open_token      TEXT UNIQUE DEFAULT public.sambramo_token(),
  open_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  max_open_guests INT NOT NULL DEFAULT 300 CHECK (max_open_guests BETWEEN 0 AND 5000),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitations_host_idx ON public.invitations (host_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.invitation_functions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  event_date    DATE,
  start_time    TIME,
  venue_name    TEXT CHECK (char_length(venue_name) <= 160),
  sort          INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS invitation_functions_inv_idx ON public.invitation_functions (invitation_id, sort);

CREATE TABLE IF NOT EXISTS public.invitation_guests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  phone         TEXT CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{8,15}$'),
  side          TEXT CHECK (char_length(side) <= 60),
  party_limit   INT NOT NULL DEFAULT 2 CHECK (party_limit BETWEEN 1 AND 50),
  token         TEXT NOT NULL UNIQUE DEFAULT public.sambramo_token(),
  source        TEXT NOT NULL DEFAULT 'host' CHECK (source IN ('host', 'open_link')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attending', 'maybe', 'declined')),
  adults        INT NOT NULL DEFAULT 0 CHECK (adults BETWEEN 0 AND 50),
  kids          INT NOT NULL DEFAULT 0 CHECK (kids BETWEEN 0 AND 50),
  meal          TEXT CHECK (meal IN ('veg', 'non_veg', 'jain', 'vegan', 'no_preference')),
  note          TEXT CHECK (char_length(note) <= 500),
  sent_at       TIMESTAMPTZ,
  reminded_at   TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  responded_at  TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitation_guests_inv_idx ON public.invitation_guests (invitation_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS invitation_guests_phone_uq ON public.invitation_guests (invitation_id, phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invitation_guest_functions (
  guest_id    UUID NOT NULL REFERENCES public.invitation_guests(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES public.invitation_functions(id) ON DELETE CASCADE,
  attending   BOOLEAN,
  PRIMARY KEY (guest_id, function_id)
);

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['invitations', 'invitation_guests'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%1$s ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER touch_%1$s BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
  END LOOP;
END $$;

-- ── RLS: the host owns everything under their invitation ──────────────
ALTER TABLE public.invitations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_functions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_guest_functions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "host owns invitation" ON public.invitations;
CREATE POLICY "host owns invitation" ON public.invitations FOR ALL TO authenticated
  USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "host owns functions" ON public.invitation_functions;
CREATE POLICY "host owns functions" ON public.invitation_functions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id AND i.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id AND i.host_id = auth.uid()));

DROP POLICY IF EXISTS "host owns guests" ON public.invitation_guests;
CREATE POLICY "host owns guests" ON public.invitation_guests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id AND i.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id AND i.host_id = auth.uid()));

DROP POLICY IF EXISTS "host owns guest functions" ON public.invitation_guest_functions;
CREATE POLICY "host owns guest functions" ON public.invitation_guest_functions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invitation_guests g JOIN public.invitations i ON i.id = g.invitation_id WHERE g.id = guest_id AND i.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invitation_guests g JOIN public.invitations i ON i.id = g.invitation_id WHERE g.id = guest_id AND i.host_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations, public.invitation_functions, public.invitation_guests, public.invitation_guest_functions TO authenticated;

-- ── Guest access: by token only ───────────────────────────────────────
-- rsvp_view(token): the card, the functions this guest is invited to, and
-- their answer so far. A guest token marks the invitation opened.
-- Never returns other guests, phone numbers or the host's id.
CREATE OR REPLACE FUNCTION public.rsvp_view(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
  inv public.invitations;
  fns JSONB;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN RETURN NULL; END IF;
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF FOUND THEN
    SELECT * INTO inv FROM public.invitations WHERE id = g.invitation_id;
    UPDATE public.invitation_guests SET opened_at = COALESCE(opened_at, now()) WHERE id = g.id;
  ELSE
    SELECT * INTO inv FROM public.invitations WHERE open_token = p_token AND open_enabled;
    IF NOT FOUND THEN RETURN NULL; END IF;
  END IF;
  IF inv.status = 'draft' AND g.id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'date', f.event_date, 'time', f.start_time,
           'venue', f.venue_name, 'attending', gf.attending) ORDER BY f.sort, f.event_date, f.start_time), '[]'::jsonb)
    INTO fns
    FROM public.invitation_functions f
    LEFT JOIN public.invitation_guest_functions gf ON gf.function_id = f.id AND gf.guest_id = g.id
   WHERE f.invitation_id = inv.id
     AND (g.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.invitation_guest_functions x WHERE x.guest_id = g.id)
          OR gf.guest_id IS NOT NULL);

  RETURN jsonb_build_object(
    'invitation', jsonb_build_object('title', inv.title, 'hosts', inv.hosts_line, 'message', inv.message, 'date', inv.event_date,
      'time', inv.start_time, 'venue', inv.venue_name, 'address', inv.venue_address, 'map', inv.map_url, 'cover', inv.cover_key,
      'theme', inv.theme, 'dress', inv.dress_code, 'rsvp_by', inv.rsvp_by, 'ask_meal', inv.ask_meal, 'allow_kids', inv.allow_kids,
      'occasion', inv.occasion_id, 'closed', inv.status = 'closed'),
    'functions', fns,
    'guest', CASE WHEN g.id IS NULL THEN NULL ELSE jsonb_build_object('name', g.name, 'limit', g.party_limit, 'status', g.status,
      'adults', g.adults, 'kids', g.kids, 'meal', g.meal, 'note', g.note, 'responded_at', g.responded_at) END,
    'open', g.id IS NULL
  );
END $$;

-- rsvp_submit: one answer. With a guest token it updates that guest; with
-- an open token it adds (or, by phone, updates) a guest of that invitation.
CREATE OR REPLACE FUNCTION public.rsvp_submit(p_token TEXT, p_status TEXT, p_adults INT, p_kids INT, p_meal TEXT, p_note TEXT,
  p_functions JSONB DEFAULT '[]'::jsonb, p_name TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
  inv public.invitations;
  n_open INT;
  f JSONB;
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'), '');
BEGIN
  IF p_status NOT IN ('attending', 'maybe', 'declined') THEN RAISE EXCEPTION 'Choose coming, maybe or can''t come'; END IF;
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF FOUND THEN
    SELECT * INTO inv FROM public.invitations WHERE id = g.invitation_id;
  ELSE
    SELECT * INTO inv FROM public.invitations WHERE open_token = p_token AND open_enabled;
    IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid'; END IF;
    IF char_length(trim(COALESCE(p_name, ''))) < 2 THEN RAISE EXCEPTION 'Please tell us your name'; END IF;
    IF v_phone IS NOT NULL THEN SELECT * INTO g FROM public.invitation_guests WHERE invitation_id = inv.id AND phone = v_phone; END IF;
    IF g.id IS NULL THEN
      SELECT count(*) INTO n_open FROM public.invitation_guests WHERE invitation_id = inv.id AND source = 'open_link';
      IF n_open >= inv.max_open_guests THEN RAISE EXCEPTION 'This invitation is full'; END IF;
      INSERT INTO public.invitation_guests (invitation_id, name, phone, source, party_limit)
      VALUES (inv.id, left(trim(p_name), 100), v_phone, 'open_link', 10) RETURNING * INTO g;
    END IF;
  END IF;
  IF inv.status = 'closed' THEN RAISE EXCEPTION 'RSVPs for this invitation are closed'; END IF;

  p_adults := GREATEST(0, COALESCE(p_adults, 0)); p_kids := CASE WHEN inv.allow_kids THEN GREATEST(0, COALESCE(p_kids, 0)) ELSE 0 END;
  IF p_status = 'declined' THEN p_adults := 0; p_kids := 0;
  ELSIF p_adults + p_kids < 1 THEN p_adults := 1; END IF;
  IF p_adults + p_kids > g.party_limit THEN RAISE EXCEPTION 'This invitation is for up to % people', g.party_limit; END IF;
  IF p_meal IS NOT NULL AND p_meal NOT IN ('veg', 'non_veg', 'jain', 'vegan', 'no_preference') THEN p_meal := NULL; END IF;

  UPDATE public.invitation_guests SET status = p_status, adults = p_adults, kids = p_kids, meal = p_meal,
         note = left(NULLIF(trim(COALESCE(p_note, '')), ''), 500), responded_at = now(), opened_at = COALESCE(opened_at, now())
   WHERE id = g.id;

  FOR f IN SELECT * FROM jsonb_array_elements(COALESCE(p_functions, '[]'::jsonb)) LOOP
    IF EXISTS (SELECT 1 FROM public.invitation_functions WHERE id = (f->>'id')::uuid AND invitation_id = inv.id) THEN
      INSERT INTO public.invitation_guest_functions (guest_id, function_id, attending)
      VALUES (g.id, (f->>'id')::uuid, CASE WHEN p_status = 'declined' THEN FALSE ELSE (f->>'attending')::boolean END)
      ON CONFLICT (guest_id, function_id) DO UPDATE SET attending = EXCLUDED.attending;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', TRUE, 'token', g.token, 'status', p_status);
END $$;

REVOKE ALL ON FUNCTION public.rsvp_view(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rsvp_submit(TEXT, TEXT, INT, INT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_view(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rsvp_submit(TEXT, TEXT, INT, INT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;

COMMIT;
