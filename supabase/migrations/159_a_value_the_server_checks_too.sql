-- ═══════════════════════════════════════════════════════════════════════
-- 159 · A value the server checks too
-- ═══════════════════════════════════════════════════════════════════════
--
-- Forward-only, safe to paste twice. No table, column, row or grant is
-- dropped or changed; this adds two functions and some triggers.
--
-- ══════════════════════════════════════════════════════════════════════
-- WHY
-- ══════════════════════════════════════════════════════════════════════
--
-- Every rule a partner meets on screen lives in src/lib/validation/
-- fieldRules.js. None of them existed anywhere a request could not step
-- around: a partner's own session can PATCH /rest/v1/vendors directly,
-- and PostgREST will store a phone number of "hello", a pincode of
-- "abcdef", a business name that is a <script> tag, or a daily capacity
-- of 0 -- all of which the screens refuse.
--
-- ══════════════════════════════════════════════════════════════════════
-- THE SHAPE
-- ══════════════════════════════════════════════════════════════════════
--
--   partner_field_error(field, value, row)
--       The server copy of the rules, keyed by the same field ids as
--       fieldRules.js. Returns NULL, or {field, rule, says}. ERRORS ONLY:
--       a warning in the app ("there is a number in your business name")
--       is advice, and the server never refuses what the app would let
--       through. check-field-validation-server.mjs runs every case in
--       the rule catalogue through both and fails if the server is ever
--       stricter than the screen.
--
--       Deliberately NOT here: the Unicode character-class checks on
--       names. Postgres's [[:alpha:]] depends on the database locale, and
--       a server that refused a Kannada name the app accepted would be a
--       worse bug than the one this fixes. The server refuses what is
--       unambiguous -- control characters, markup, digits in a person's
--       name, lengths, formats of phones, pincodes, bank and tax ids.
--
--   _validate_partner_fields()   one BEFORE INSERT OR UPDATE trigger
--       function, given 'column:field' pairs per table. Columns are read
--       through to_jsonb(NEW), so a column that a pending migration has
--       not created yet on this database is skipped rather than breaking
--       every write to the table.
--
--       On UPDATE it checks only the columns that CHANGED, so a legacy row
--       holding an old value can still have its other fields edited, and
--       nothing already stored is touched.
--
--       It checks requests made by a partner (a JWT whose role is
--       authenticated), including through a SECURITY DEFINER function such
--       as set_partner_location, where current_user is the owner but the
--       caller is still the partner. It skips operators (caller_is_operator,
--       which includes the service role) and sessions with no JWT at all:
--       the SQL editor and pg_cron, which is how an operator corrects data.
--
--   The error: SQLSTATE 22023, MESSAGE 'invalid_field', DETAIL a JSON
--   object {field, rule, says, table, column}, HINT the sentence. The app
--   maps it back to the field (lib/validation/serverError.js). PostgREST
--   runs a request in one transaction, so a form with one bad field saves
--   nothing.
--
--   Values are never written to a log or echoed in a message: the says
--   of an account number or PAN names the shape, never the digits.

BEGIN;

CREATE OR REPLACE FUNCTION public.partner_field_error(p_field TEXT, p_value TEXT, p_row JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v        TEXT := p_value;
  n        INTEGER;
  d        TEXT;
  num      NUMERIC;
  -- Invisible characters, built from code points so this file itself
  -- contains none: C0 controls, DEL, C1, zero-width and bidi overrides,
  -- word joiners and the BOM.
  inv_all   TEXT := format('[%s-%s%s-%s%s-%s%s-%s%s-%s%s]',
                     chr(1), chr(31), chr(127), chr(159), chr(8203), chr(8207),
                     chr(8232), chr(8238), chr(8288), chr(8303), chr(65279));
  inv_prose TEXT := format('[%s-%s%s%s%s-%s%s-%s%s-%s%s-%s%s-%s%s]',
                     chr(1), chr(9), chr(11), chr(12), chr(14), chr(31), chr(127), chr(159),
                     chr(8203), chr(8207), chr(8232), chr(8238), chr(8288), chr(8303), chr(65279));
  emoji     TEXT := format('[%s-%s%s-%s%s]', chr(126976), chr(129791), chr(9728), chr(10175), chr(65039));
  markup    TEXT := '<\s*/?\s*[a-z!?][^>]*>|<\s*script|javascript\s*:|\mon[a-z]{3,}\s*=';
  r        TEXT := NULL;   -- rule id
  s        TEXT := NULL;   -- the sentence
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;

  -- ── Shared guards, by kind of field ────────────────────────────────
  IF p_field IN ('business_name', 'area', 'full_name', 'account_name', 'doc_holder_name',
                 'doc_authority', 'availability_note', 'reason_detail', 'caption',
                 'testimonial_by', 'testimonial_about', 'space_name', 'venue_name', 'venue_area')
  THEN
    IF v ~ inv_all THEN RETURN jsonb_build_object('field', p_field, 'rule', 'control',
         'says', 'There is an invisible character in there, usually from pasting. Please retype it.'); END IF;
    IF v ~* markup THEN RETURN jsonb_build_object('field', p_field, 'rule', 'markup',
         'says', 'That looks like code or a web tag. Please use plain words.'); END IF;
  ELSIF p_field IN ('description', 'closure_reason', 'testimonial_body', 'chat_message', 'partner_message') THEN
    IF v ~ inv_prose THEN RETURN jsonb_build_object('field', p_field, 'rule', 'control',
         'says', 'There is an invisible character in there, usually from pasting. Please retype it.'); END IF;
    IF v ~* markup THEN RETURN jsonb_build_object('field', p_field, 'rule', 'markup',
         'says', 'That looks like code or a web tag. Please use plain words.'); END IF;
  END IF;

  n := char_length(v);

  CASE p_field

  -- ── Names of things ────────────────────────────────────────────────
  WHEN 'business_name' THEN
    IF btrim(v) = '' THEN r := 'required'; s := 'A business name cannot be blank.';
    ELSIF v ~ emoji THEN r := 'emoji'; s := 'Please use words, not emoji, in a business name.';
    ELSIF n < 3 THEN r := 'short'; s := 'A business name needs at least 3 characters.';
    ELSIF n > 80 THEN r := 'long'; s := 'A business name can be at most 80 characters.';
    ELSIF v ~ '^[0-9]+$' THEN r := 'numeric'; s := 'A business name needs words in it.';
    END IF;

  WHEN 'venue_name' THEN
    IF btrim(v) = '' THEN r := 'required'; s := 'A venue needs a name.';
    ELSIF n < 3 OR n > 80 THEN r := 'length'; s := 'A venue name is 3 to 80 characters.';
    ELSIF v ~ '^[0-9]+$' THEN r := 'numeric'; s := 'A venue name needs words in it.';
    END IF;

  WHEN 'space_name' THEN
    IF btrim(v) = '' THEN r := 'required'; s := 'A space needs a name.';
    ELSIF n < 2 OR n > 60 THEN r := 'length'; s := 'A space name is 2 to 60 characters.';
    END IF;

  WHEN 'area', 'venue_area' THEN
    IF v = '' THEN NULL;
    ELSIF v ~ emoji THEN r := 'emoji'; s := 'Please use words for the area.';
    ELSIF n < 3 OR n > 60 THEN r := 'length'; s := 'An area name is 3 to 60 characters.';
    ELSIF v ~ '^[0-9]+$' THEN r := 'digits'; s := 'That is a number, not an area.';
    END IF;

  -- ── A person's name: no digits, in any script ──────────────────────
  WHEN 'full_name', 'account_name', 'doc_holder_name', 'testimonial_by' THEN
    IF btrim(v) = '' THEN
      IF p_field IN ('full_name', 'account_name') THEN r := 'required'; s := 'A name cannot be blank.'; END IF;
    ELSIF v ~ '[0-9]' THEN r := 'digit'; s := 'A person''s name does not have a number in it.';
    ELSIF v ~ emoji THEN r := 'emoji'; s := 'Please use letters, not emoji, in a name.';
    ELSIF n < 2 THEN r := 'short'; s := 'That is too short to be a name.';
    ELSIF n > (CASE WHEN p_field = 'doc_holder_name' THEN 80 ELSE 60 END) THEN r := 'long'; s := 'That name is too long.';
    END IF;

  -- ── Phones: the app's canonical form, and the +91 forms it accepts ──
  WHEN 'contact_phone', 'whatsapp_phone', 'owner_phone' THEN
    d := regexp_replace(v, '[\s-]', '', 'g');
    IF d = '' THEN
      IF p_field = 'contact_phone' AND v <> '' THEN r := 'required'; s := 'A phone number cannot be blank.'; END IF;
    ELSE
      IF d LIKE '+91%' THEN d := substr(d, 4);
      ELSIF d LIKE '0091%' THEN d := substr(d, 5);
      ELSIF d ~ '^91[0-9]{10}$' THEN d := substr(d, 3);
      ELSIF d ~ '^0[0-9]{10}$' THEN d := substr(d, 2);
      END IF;
      IF d !~ '^[0-9]+$' THEN r := 'nondigit'; s := 'A phone number is digits only.';
      ELSIF char_length(d) <> 10 THEN r := 'length'; s := 'An Indian mobile number has 10 digits.';
      ELSIF d !~ '^[6-9]' THEN r := 'series'; s := 'An Indian mobile number starts with 6, 7, 8 or 9.';
      ELSIF d ~ '^(\d)\1{9}$' OR d IN ('1234567890', '9876543210') THEN r := 'fake'; s := 'That is not a real mobile number.';
      END IF;
    END IF;

  WHEN 'contact_email' THEN
    IF v = '' THEN NULL;
    ELSIF v ~ '\s' OR v ~ inv_all THEN r := 'space'; s := 'An email address has no spaces or hidden characters.';
    ELSIF n > 254 THEN r := 'long'; s := 'That is longer than any email address can be.';
    ELSIF v !~ '^[^@]+@[^@]+$' THEN r := 'at'; s := 'An email address has exactly one @ with something on each side.';
    ELSIF split_part(v, '@', 2) !~ '\.' THEN r := 'dot'; s := 'The part after the @ needs a dot.';
    ELSIF split_part(v, '@', 2) ~ '(^\.|\.$|\.\.)' THEN r := 'dot_edge'; s := 'The part after the @ has a misplaced dot.';
    END IF;

  WHEN 'website_url' THEN
    IF v = '' THEN NULL;
    ELSIF v ~ '\s' THEN r := 'space'; s := 'A web address has no spaces in it.';
    ELSIF v ~* '^(javascript|data|vbscript|file):' THEN r := 'scheme'; s := 'That is not a web address.';
    ELSIF n > 200 THEN r := 'long'; s := 'That web address is too long.';
    END IF;

  WHEN 'instagram_url' THEN
    IF v = '' THEN NULL;
    ELSE
      d := regexp_replace(regexp_replace(btrim(v), '^(https?://)?(www\.)?(instagram\.com/)?@?', '', 'i'), '[/?].*$', '');
      IF v ~* '^(https?://|www\.|instagram\.com/)' THEN NULL; ELSE d := regexp_replace(btrim(v), '^@', ''); END IF;
      IF d ~ '\s' THEN r := 'space'; s := 'An Instagram handle has no spaces in it.';
      ELSIF char_length(d) > 30 THEN r := 'long'; s := 'An Instagram handle is at most 30 characters.';
      ELSIF d !~ '^[A-Za-z0-9_.]+$' THEN r := 'charset'; s := 'An Instagram handle is letters, numbers, dots and underscores.';
      END IF;
    END IF;

  -- ── Prose ──────────────────────────────────────────────────────────
  WHEN 'description' THEN
    IF n > 600 THEN r := 'long'; s := 'Please keep it under 600 characters.';
    ELSIF v ~ '(^|[^0-9])[6-9]([ -]?[0-9]){9}([^0-9]|$)' THEN r := 'contact'; s := 'There is a phone number in there. Contact details are shared once a job is confirmed.';
    ELSIF v ~ '\S+@\S+\.\S+' THEN r := 'contact'; s := 'There is an email address in there. Contact details are shared once a job is confirmed.';
    END IF;

  WHEN 'closure_reason' THEN
    IF n > 500 THEN r := 'long'; s := 'Please keep it under 500 characters.'; END IF;

  WHEN 'testimonial_body' THEN
    IF n > 500 THEN r := 'long'; s := 'A quote can be at most 500 characters.'; END IF;

  WHEN 'chat_message' THEN
    IF btrim(v) = '' THEN r := 'required'; s := 'A message cannot be empty.';
    ELSIF n > 2000 THEN r := 'long'; s := 'A message can be at most 2000 characters.'; END IF;

  WHEN 'partner_message' THEN
    IF btrim(v) = '' THEN r := 'required'; s := 'A message cannot be empty.';
    ELSIF n > 4000 THEN r := 'long'; s := 'A message can be at most 4000 characters.'; END IF;

  WHEN 'caption' THEN
    IF n > 140 THEN r := 'long'; s := 'A caption can be at most 140 characters.'; END IF;

  WHEN 'testimonial_about', 'doc_authority' THEN
    IF n > 80 THEN r := 'long'; s := 'That can be at most 80 characters.'; END IF;

  WHEN 'availability_note' THEN
    IF n > 200 THEN r := 'long'; s := 'A note can be at most 200 characters.'; END IF;

  WHEN 'reason_detail' THEN
    IF n > 60 THEN r := 'long'; s := 'The reason can be at most 60 characters.'; END IF;

  -- ── Numbers, with the ranges the screens use ───────────────────────
  WHEN 'years_active', 'daily_capacity', 'daily_slots', 'lead_time_days', 'starting_price',
       'item_price', 'service_radius_km', 'venue_capacity' THEN
    IF v !~ '^[0-9]+(\.[0-9]+)?$' THEN r := 'number'; s := 'That is not a number.';
    ELSE
      num := v::numeric;
      IF p_field = 'years_active' AND num > 75 THEN r := 'range'; s := 'Years in business is at most 75.';
      ELSIF p_field IN ('daily_capacity', 'daily_slots') AND (num < 1 OR num > 12) THEN r := 'range'; s := 'Jobs a day is 1 to 12.';
      ELSIF p_field = 'lead_time_days' AND num > 90 THEN r := 'range'; s := 'Notice is at most 90 days.';
      ELSIF p_field IN ('starting_price', 'item_price') AND (num < 1 OR num > 9999999) THEN r := 'range'; s := 'A price is ₹1 to ₹99,99,999.';
      ELSIF p_field = 'service_radius_km' AND (num < 1 OR num > 200) THEN r := 'range'; s := 'A service radius is 1 to 200 km.';
      ELSIF p_field = 'venue_capacity' AND (num < 1 OR num > 50000) THEN r := 'range'; s := 'Guests is 1 to 50,000.';
      ELSIF num <> trunc(num) THEN r := 'whole'; s := 'That is a whole number.';
      END IF;
    END IF;

  -- ── Places, bank and tax, in their stored (canonical) form ─────────
  WHEN 'pincode' THEN
    IF v = '' THEN NULL;
    ELSIF v !~ '^[1-8][0-9]{5}$' THEN r := 'pincode'; s := 'An Indian pincode is 6 digits and does not start with 0 or 9.';
    END IF;

  WHEN 'upi_id' THEN
    IF v = '' THEN NULL;
    ELSIF v !~ '^[a-z0-9._-]{2,50}@[a-z]{2,}$' THEN r := 'upi'; s := 'A UPI id looks like yourname@okhdfcbank.';
    END IF;

  WHEN 'account_number' THEN
    IF v = '' THEN NULL;
    ELSIF v !~ '^[0-9]{9,18}$' THEN r := 'account'; s := 'An Indian account number is 9 to 18 digits.';
    ELSIF v ~ '^(\d)\1+$' THEN r := 'repeated'; s := 'That is the same digit repeated.';
    END IF;

  WHEN 'ifsc' THEN
    IF v = '' THEN NULL;
    ELSIF v !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN r := 'ifsc'; s := 'An IFSC is 11 characters, like HDFC0001234.';
    END IF;

  WHEN 'pan' THEN
    IF v = '' THEN NULL;
    ELSIF v !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' THEN r := 'pan'; s := 'A PAN is 10 characters, like ABCDE1234F.';
    END IF;

  -- ── Dates and times ────────────────────────────────────────────────
  WHEN 'doc_issue_date' THEN
    BEGIN
      IF v::date > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN r := 'future'; s := 'A document cannot have been issued in the future.'; END IF;
    EXCEPTION WHEN OTHERS THEN r := 'date'; s := 'That is not a real date.';
    END;

  WHEN 'doc_expiry_date' THEN
    BEGIN
      IF v::date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN r := 'expired'; s := 'This document has already expired.';
      ELSIF (p_row ->> 'issue_date') IS NOT NULL AND v::date <= (p_row ->> 'issue_date')::date THEN
        r := 'order'; s := 'The expiry date has to be after the date it was issued.';
      END IF;
    EXCEPTION WHEN OTHERS THEN r := 'date'; s := 'That is not a real date.';
    END;

  WHEN 'time_to' THEN
    IF (p_row ->> 'start_time') IS NOT NULL AND left(v, 5) = left(p_row ->> 'start_time', 5) THEN
      r := 'same'; s := 'The start and end are the same time.';
    END IF;

  -- ── A trade is one of the 26 ───────────────────────────────────────
  WHEN 'trade_name' THEN
    IF v <> '' AND NOT EXISTS (SELECT 1 FROM public.listing_trades WHERE name = v AND is_active) THEN
      r := 'trade'; s := 'That is not one of the trades on Sambramo.';
    END IF;

  ELSE NULL;
  END CASE;

  IF r IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('field', p_field, 'rule', r, 'says', s);
END $$;

REVOKE ALL ON FUNCTION public.partner_field_error(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_field_error(TEXT, TEXT, JSONB) TO authenticated, service_role;

COMMENT ON FUNCTION public.partner_field_error(TEXT, TEXT, JSONB) IS
  'Server copy of the ERROR rules in src/lib/validation/fieldRules.js. Never stricter than the app: check-field-validation-server.mjs enforces that.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- The trigger: every partner write, checked at the boundary
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public._validate_partner_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n     JSONB := to_jsonb(NEW);
  o     JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  who   TEXT  := coalesce(auth.role(), '');
  col   TEXT;
  fld   TEXT;
  e     JSONB;
BEGIN
  /* Who is checked: a partner's request. Operators and the service role
     correct data; the SQL editor and pg_cron carry no JWT at all. */
  IF who NOT IN ('authenticated', 'anon') OR public.caller_is_operator() THEN
    RETURN NEW;
  END IF;

  /* profiles is shared with customers: only a partner's row is in scope.
     Messages: only what a partner sends. */
  IF TG_TABLE_NAME = 'profiles' AND coalesce(n ->> 'role', '') <> 'vendor' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME IN ('partner_messages', 'line_messages') AND coalesce(n ->> 'sender', '') <> 'partner' THEN
    RETURN NEW;
  END IF;

  FOR i IN 0 .. TG_NARGS - 1 LOOP
    col := split_part(TG_ARGV[i], ':', 1);
    fld := split_part(TG_ARGV[i], ':', 2);
    -- A column a pending migration has not created on this database.
    CONTINUE WHEN NOT (n ? col);
    -- Only what this write changes: legacy values elsewhere stay editable.
    CONTINUE WHEN TG_OP = 'UPDATE' AND (n -> col) IS NOT DISTINCT FROM (o -> col);
    e := public.partner_field_error(fld, n ->> col, n);
    IF e IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'invalid_field',
        DETAIL  = (e || jsonb_build_object('table', TG_TABLE_NAME, 'column', col))::text,
        HINT    = e ->> 'says';
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public._validate_partner_fields() FROM PUBLIC, anon, authenticated;

-- ── Where it runs, and which column is which rule ('column:field') ───

DROP TRIGGER IF EXISTS validate_partner_fields ON public.vendors;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'business_name:business_name', 'contact_phone:contact_phone', 'whatsapp_phone:whatsapp_phone',
    'contact_email:contact_email', 'description:description', 'instagram_url:instagram_url',
    'website_url:website_url', 'years_active:years_active', 'years_experience:years_active',
    'starting_price:starting_price', 'area:area', 'daily_capacity:daily_capacity',
    'service_radius_km:service_radius_km', 'lead_time_days:lead_time_days', 'pincode:pincode',
    'closure_reason:closure_reason', 'category:trade_name');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.profiles;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'full_name:full_name', 'phone:owner_phone');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.vendor_payout_details;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.vendor_payout_details
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'upi_id:upi_id', 'account_name:account_name', 'account_number:account_number',
    'ifsc:ifsc', 'pan:pan');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.vendor_documents;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'holder_name:doc_holder_name', 'issuing_authority:doc_authority',
    'issue_date:doc_issue_date', 'expires_on:doc_expiry_date');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.vendor_services;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields('price:item_price');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.vendor_availability;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.vendor_availability
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'note:availability_note', 'reason_detail:reason_detail', 'slots_total:daily_slots');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.vendor_weekly_rules;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.vendor_weekly_rules
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields('end_time:time_to');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.partner_work;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.partner_work
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'caption:caption', 'body:testimonial_body', 'said_by:testimonial_by', 'said_about:testimonial_about');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.partner_messages;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.partner_messages
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields('body:partner_message');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.line_messages;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.line_messages
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields('body:chat_message');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.venue_spaces;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.venue_spaces
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'space_name:space_name', 'floating_capacity:venue_capacity', 'seated_capacity:venue_capacity');

DROP TRIGGER IF EXISTS validate_partner_fields ON public.venues;
CREATE TRIGGER validate_partner_fields
  BEFORE INSERT OR UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_fields(
    'name:venue_name', 'area_label:venue_area', 'pincode:pincode');

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- OPERATIONS
-- ═══════════════════════════════════════════════════════════════════════
--
-- Check it took (twelve tables):
--   SELECT event_object_table FROM information_schema.triggers
--    WHERE trigger_name = 'validate_partner_fields' GROUP BY 1 ORDER BY 1;
--   SELECT public.partner_field_error('pincode', '5600a1');   -- {field, rule, says}
--   SELECT public.partner_field_error('pincode', '560001');   -- NULL
--
-- An operator correcting a value writes it as the service role or from
-- the SQL editor, which this does not check.
--
-- Rolling back (nothing stored is changed by removing it):
--   DROP TRIGGER validate_partner_fields ON public.<each table above>;
--   DROP FUNCTION public._validate_partner_fields();
--   DROP FUNCTION public.partner_field_error(TEXT, TEXT, JSONB);
