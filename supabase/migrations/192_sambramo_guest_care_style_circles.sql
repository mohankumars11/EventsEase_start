-- 192 — Guest care & style circles (Mohan, 2026-10-28)
--
-- Guest care: the RSVP grows past "coming / not coming". A guest can say
-- how and when they arrive (flight, train, bus, car), from where, whether
-- they need a pickup and a room, and when they leave; the host gets an
-- arrivals board, the pickups and rooms to arrange, and can mark guests
-- VIP. The host can tell guests where they are staying (the hotel, the
-- map, arrival tips), shown on the guest's page.
--
--   invitation_guests.travel  jsonb — the guest's own answer, written only
--                             through rsvp_travel(token, …), every field
--                             length-checked there
--   invitation_guests.vip     boolean — the host's flag
--   invitations.care          jsonb — { ask_travel, stay: {name, address,
--                             map, notes}, tips, contact }
--
-- Style circles: a few guests (cousins, the bride's friends) agree what to
-- wear. A circle has a chat; a message can carry an outfit card (what I'm
-- wearing: the outfit, its colours). Guests reach circles with their RSVP
-- token, never directly; a circle's join link lets a relative who is not
-- on the list join — they are added as a guest (source 'circle') and get
-- their own RSVP link.
--
--   invitation_circles          name, note, colours, join_token
--   invitation_circle_members   who is in it
--   invitation_circle_messages  the chat (guest_id null = the host)
--
-- RLS: the host owns everything under their invitation (same rule as 191).
-- Guests only through the SECURITY DEFINER functions below, by token.
--
-- Rollback:
--   drop function if exists public.rsvp_travel(text, jsonb), public.circle_feed(text, timestamptz),
--     public.circle_create(text, text, text, text[]), public.circle_join(text, text), public.circle_post(text, uuid, text, jsonb),
--     public.circle_welcome(text), public.circle_enter(text, text, text);
--   drop table if exists invitation_circle_messages, invitation_circle_members, invitation_circles cascade;
--   alter table invitation_guests drop column if exists travel, drop column if exists vip;
--   alter table invitations drop column if exists care;
--   (and re-run 191's rsvp_view)

BEGIN;

-- ── Guest care columns ────────────────────────────────────────────────
ALTER TABLE public.invitation_guests ADD COLUMN IF NOT EXISTS vip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.invitation_guests ADD COLUMN IF NOT EXISTS travel JSONB;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS care JSONB;
ALTER TABLE public.invitation_guests DROP CONSTRAINT IF EXISTS invitation_guests_travel_size;
ALTER TABLE public.invitation_guests ADD CONSTRAINT invitation_guests_travel_size CHECK (travel IS NULL OR pg_column_size(travel) <= 2000);
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_care_size;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_care_size CHECK (care IS NULL OR pg_column_size(care) <= 4000);
-- A relative who joins through a style circle's link is a guest too.
ALTER TABLE public.invitation_guests DROP CONSTRAINT IF EXISTS invitation_guests_source_check;
ALTER TABLE public.invitation_guests ADD CONSTRAINT invitation_guests_source_check CHECK (source IN ('host', 'open_link', 'circle'));

-- ── Style circles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitation_circles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  note          TEXT CHECK (char_length(note) <= 300),
  colors        TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(colors) <= 6),
  join_token    TEXT NOT NULL UNIQUE DEFAULT public.sambramo_token(),
  created_by    UUID REFERENCES public.invitation_guests(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitation_circles_inv_idx ON public.invitation_circles (invitation_id, created_at);

CREATE TABLE IF NOT EXISTS public.invitation_circle_members (
  circle_id UUID NOT NULL REFERENCES public.invitation_circles(id) ON DELETE CASCADE,
  guest_id  UUID NOT NULL REFERENCES public.invitation_guests(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, guest_id)
);

CREATE TABLE IF NOT EXISTS public.invitation_circle_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID NOT NULL REFERENCES public.invitation_circles(id) ON DELETE CASCADE,
  guest_id   UUID REFERENCES public.invitation_guests(id) ON DELETE SET NULL,
  author     TEXT NOT NULL CHECK (char_length(author) BETWEEN 1 AND 100),
  body       TEXT CHECK (char_length(body) <= 1000),
  look       JSONB CHECK (look IS NULL OR pg_column_size(look) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR look IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS invitation_circle_messages_idx ON public.invitation_circle_messages (circle_id, created_at);

ALTER TABLE public.invitation_circles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_circle_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_circle_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "host owns circles" ON public.invitation_circles;
CREATE POLICY "host owns circles" ON public.invitation_circles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id AND i.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id AND i.host_id = auth.uid()));

DROP POLICY IF EXISTS "host owns circle members" ON public.invitation_circle_members;
CREATE POLICY "host owns circle members" ON public.invitation_circle_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invitation_circles c JOIN public.invitations i ON i.id = c.invitation_id WHERE c.id = circle_id AND i.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invitation_circles c JOIN public.invitations i ON i.id = c.invitation_id WHERE c.id = circle_id AND i.host_id = auth.uid()));

DROP POLICY IF EXISTS "host owns circle messages" ON public.invitation_circle_messages;
CREATE POLICY "host owns circle messages" ON public.invitation_circle_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invitation_circles c JOIN public.invitations i ON i.id = c.invitation_id WHERE c.id = circle_id AND i.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invitation_circles c JOIN public.invitations i ON i.id = c.invitation_id WHERE c.id = circle_id AND i.host_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_circles, public.invitation_circle_members, public.invitation_circle_messages TO authenticated;

-- ── rsvp_view, now with the guest's travel and the host's care notes ──
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
      'occasion', inv.occasion_id, 'closed', inv.status = 'closed', 'care', inv.care),
    'functions', fns,
    'guest', CASE WHEN g.id IS NULL THEN NULL ELSE jsonb_build_object('name', g.name, 'limit', g.party_limit, 'status', g.status,
      'adults', g.adults, 'kids', g.kids, 'meal', g.meal, 'note', g.note, 'responded_at', g.responded_at,
      'travel', g.travel, 'vip', g.vip) END,
    'open', g.id IS NULL
  );
END $$;

-- ── rsvp_travel: the guest's arrival, stay and departure ──────────────
-- Only known keys survive, each trimmed to a sane length.
CREATE OR REPLACE FUNCTION public.rsvp_travel(p_token TEXT, p_travel JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
  t JSONB := COALESCE(p_travel, '{}'::jsonb);
  clean JSONB;
BEGIN
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid'; END IF;
  clean := jsonb_strip_nulls(jsonb_build_object(
    'mode',      CASE WHEN t->>'mode' IN ('flight', 'train', 'bus', 'car', 'local') THEN t->>'mode' END,
    'ref',       left(NULLIF(trim(t->>'ref'), ''), 40),
    'from',      left(NULLIF(trim(t->>'from'), ''), 80),
    'point',     left(NULLIF(trim(t->>'point'), ''), 120),
    'arrive_at', left(NULLIF(trim(t->>'arrive_at'), ''), 25),
    'depart_at', left(NULLIF(trim(t->>'depart_at'), ''), 25),
    'pickup',    CASE WHEN jsonb_typeof(t->'pickup') = 'boolean' THEN t->'pickup' END,
    'drop',      CASE WHEN jsonb_typeof(t->'drop') = 'boolean' THEN t->'drop' END,
    'stay',      CASE WHEN jsonb_typeof(t->'stay') = 'boolean' THEN t->'stay' END,
    'rooms',     CASE WHEN (t->>'rooms') ~ '^[0-9]{1,2}$' THEN LEAST((t->>'rooms')::int, 20) END,
    'nights',    CASE WHEN (t->>'nights') ~ '^[0-9]{1,2}$' THEN LEAST((t->>'nights')::int, 30) END,
    'needs',     left(NULLIF(trim(t->>'needs'), ''), 300)
  ));
  UPDATE public.invitation_guests SET travel = NULLIF(clean, '{}'::jsonb), opened_at = COALESCE(opened_at, now()) WHERE id = g.id;
  RETURN jsonb_build_object('ok', TRUE, 'travel', clean);
END $$;

-- ── Circles, for guests (by their RSVP token) ─────────────────────────
-- Every circle of this invitation the guest is in, with members and the
-- latest messages (or those after p_since, for polling).
CREATE OR REPLACE FUNCTION public.circle_feed(p_token TEXT, p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
BEGIN
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('me', g.id, 'circles', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'note', c.note, 'colors', c.colors, 'join', c.join_token,
      'members', (SELECT COALESCE(jsonb_agg(x.name ORDER BY m2.joined_at), '[]'::jsonb) FROM public.invitation_circle_members m2 JOIN public.invitation_guests x ON x.id = m2.guest_id WHERE m2.circle_id = c.id),
      'messages', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', z.id, 'mine', z.guest_id = g.id, 'host', z.guest_id IS NULL, 'author', z.author,
                     'body', z.body, 'look', z.look, 'at', z.created_at) ORDER BY z.created_at), '[]'::jsonb)
                   FROM (SELECT * FROM public.invitation_circle_messages mm
                          WHERE mm.circle_id = c.id AND (p_since IS NULL OR mm.created_at > p_since)
                          ORDER BY mm.created_at DESC LIMIT 80) z)
    ) ORDER BY c.created_at)
    FROM public.invitation_circles c
    JOIN public.invitation_circle_members m ON m.circle_id = c.id AND m.guest_id = g.id
   WHERE c.invitation_id = g.invitation_id), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.circle_create(p_token TEXT, p_name TEXT, p_note TEXT DEFAULT NULL, p_colors TEXT[] DEFAULT '{}')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
  c public.invitation_circles;
BEGIN
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid'; END IF;
  IF char_length(trim(COALESCE(p_name, ''))) < 2 THEN RAISE EXCEPTION 'Give your circle a name'; END IF;
  IF (SELECT count(*) FROM public.invitation_circles WHERE invitation_id = g.invitation_id) >= 200 THEN RAISE EXCEPTION 'This invitation has enough circles already'; END IF;
  INSERT INTO public.invitation_circles (invitation_id, name, note, colors, created_by)
  VALUES (g.invitation_id, left(trim(p_name), 60), left(NULLIF(trim(COALESCE(p_note, '')), ''), 300),
          COALESCE((SELECT array_agg(e.v) FROM unnest(p_colors[1:6]) AS e(v) WHERE e.v ~ '^#[0-9A-Fa-f]{6}$'), '{}'), g.id)
  RETURNING * INTO c;
  INSERT INTO public.invitation_circle_members (circle_id, guest_id) VALUES (c.id, g.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('id', c.id, 'join', c.join_token);
END $$;

CREATE OR REPLACE FUNCTION public.circle_join(p_token TEXT, p_join TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
  c public.invitation_circles;
BEGIN
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid'; END IF;
  SELECT * INTO c FROM public.invitation_circles WHERE join_token = p_join AND invitation_id = g.invitation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This circle link is not valid'; END IF;
  INSERT INTO public.invitation_circle_members (circle_id, guest_id) VALUES (c.id, g.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('id', c.id);
END $$;

CREATE OR REPLACE FUNCTION public.circle_post(p_token TEXT, p_circle UUID, p_body TEXT, p_look JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.invitation_guests;
  v_look JSONB;
  v_id UUID;
BEGIN
  SELECT * INTO g FROM public.invitation_guests WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invitation_circle_members WHERE circle_id = p_circle AND guest_id = g.id) THEN
    RAISE EXCEPTION 'Join the circle first';
  END IF;
  IF (SELECT count(*) FROM public.invitation_circle_messages WHERE guest_id = g.id AND created_at > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'Slow down a little — try again in a minute';
  END IF;
  IF p_look IS NOT NULL THEN
    v_look := jsonb_strip_nulls(jsonb_build_object(
      'outfit', left(NULLIF(trim(p_look->>'outfit'), ''), 40),
      'colors', (SELECT jsonb_agg(e.v) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_look->'colors') = 'array' THEN p_look->'colors' ELSE '[]'::jsonb END) AS e(v) WHERE e.v ~ '^#[0-9A-Fa-f]{6}$'),
      'vote',   CASE WHEN jsonb_typeof(p_look->'vote') = 'boolean' THEN p_look->'vote' END));
    IF v_look = '{}'::jsonb THEN v_look := NULL; END IF;
  END IF;
  IF NULLIF(trim(COALESCE(p_body, '')), '') IS NULL AND v_look IS NULL THEN RAISE EXCEPTION 'Say something first'; END IF;
  INSERT INTO public.invitation_circle_messages (circle_id, guest_id, author, body, look)
  VALUES (p_circle, g.id, g.name, left(NULLIF(trim(COALESCE(p_body, '')), ''), 1000), v_look)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id);
END $$;

-- A circle's join link, opened by someone not yet on the list: what it is.
CREATE OR REPLACE FUNCTION public.circle_welcome(p_join TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.invitation_circles;
  inv public.invitations;
BEGIN
  IF p_join IS NULL OR length(p_join) < 20 THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.invitation_circles WHERE join_token = p_join;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO inv FROM public.invitations WHERE id = c.invitation_id;
  IF inv.status = 'closed' THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('circle', jsonb_build_object('name', c.name, 'note', c.note, 'colors', c.colors,
      'members', (SELECT count(*) FROM public.invitation_circle_members WHERE circle_id = c.id)),
    'invitation', jsonb_build_object('title', inv.title, 'hosts', inv.hosts_line, 'date', inv.event_date, 'time', inv.start_time,
      'venue', inv.venue_name, 'theme', inv.theme, 'occasion', inv.occasion_id));
END $$;

-- …and joining through it: found by phone if already a guest, else added
-- as one (source 'circle'), then into the circle. Returns their RSVP token.
CREATE OR REPLACE FUNCTION public.circle_enter(p_join TEXT, p_name TEXT, p_phone TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.invitation_circles;
  inv public.invitations;
  g public.invitation_guests;
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'), '');
BEGIN
  SELECT * INTO c FROM public.invitation_circles WHERE join_token = p_join;
  IF NOT FOUND THEN RAISE EXCEPTION 'This circle link is not valid'; END IF;
  SELECT * INTO inv FROM public.invitations WHERE id = c.invitation_id;
  IF inv.status = 'closed' THEN RAISE EXCEPTION 'RSVPs for this invitation are closed'; END IF;
  IF char_length(trim(COALESCE(p_name, ''))) < 2 THEN RAISE EXCEPTION 'Please tell us your name'; END IF;
  IF v_phone IS NOT NULL AND length(regexp_replace(v_phone, '\D', '', 'g')) = 10 THEN v_phone := '+91' || regexp_replace(v_phone, '\D', '', 'g'); END IF;
  IF v_phone IS NOT NULL THEN SELECT * INTO g FROM public.invitation_guests WHERE invitation_id = inv.id AND phone = v_phone; END IF;
  IF g.id IS NULL THEN
    IF (SELECT count(*) FROM public.invitation_guests WHERE invitation_id = inv.id AND source IN ('open_link', 'circle')) >= inv.max_open_guests THEN
      RAISE EXCEPTION 'This invitation is full';
    END IF;
    INSERT INTO public.invitation_guests (invitation_id, name, phone, source, party_limit)
    VALUES (inv.id, left(trim(p_name), 100), v_phone, 'circle', 6) RETURNING * INTO g;
  END IF;
  INSERT INTO public.invitation_circle_members (circle_id, guest_id) VALUES (c.id, g.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('token', g.token, 'circle', c.id);
END $$;

REVOKE ALL ON FUNCTION public.rsvp_travel(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.circle_feed(TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.circle_create(TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.circle_join(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.circle_post(TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.circle_welcome(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.circle_enter(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_travel(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circle_feed(TEXT, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circle_create(TEXT, TEXT, TEXT, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circle_join(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circle_post(TEXT, UUID, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circle_welcome(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circle_enter(TEXT, TEXT, TEXT) TO anon, authenticated;

COMMIT;
