-- ════════════════════════════════════════════════════════════════════
-- 209 · Three corrections to 208, found by its live checks.
-- ════════════════════════════════════════════════════════════════════
--
-- APPLY BY HAND in Supabase → SQL Editor. Re-runnable. Needs 208.
-- Changes no data. Replaces two functions 208 created; nothing else.
--
-- 1 · sambramo_package_fit is callable by anyone (both apps need it). For
--     a package that is not LIVE it reported the status AND went on to
--     compare hours and inclusions — so a gap could hand out the duration
--     of a package that is under review, archived or sent back to the
--     partner: unpublished pricing, readable by anyone with the id. None of
--     today's 21 non-LIVE packages happened to produce such a gap (checked
--     2026-11-03), so nothing has leaked; this closes it before one does.
--     A non-LIVE package now answers "not live", and nothing else.
--
-- 2 · THE PHONE AND THE SERVER DISAGREED ON 10 ANCHORS. 208 read a
--     package's trade from sambramo_listing_versions.trade_id. 10 of the 11
--     live Anchor & MC listings have trade_id NULL and carry the trade only
--     by name (trade = 'Anchor & MC', the same as their vendor category).
--     The customer app finds partners by that name, so it matched all 11
--     anchors to "Host the Key Moments" — and the server then refused 10 of
--     them with a "wrong trade" gap. Found by scripts/check-experience-e2e
--     .mjs, which checks the phone and the server agree partner by partner.
--     Fixed here, in the function, by falling back to the registry id for
--     the listing's trade name — the rule 206 applies to booking lines. No
--     partner listing is edited. These are the only LIVE listings without a
--     trade_id (10 of 345).
--
-- 3 · sambramo_experience_tier_touch had no pinned search_path. It is not
--     security definer, so it was not exploitable, but every other function
--     in this series pins it and a trigger should not depend on the caller's.
-- ════════════════════════════════════════════════════════════════════

begin;

create or replace function public.sambramo_package_fit(
  p_package_id uuid, p_trade_id text, p_tier text, p_hours numeric default null)
returns table (qualifies boolean, gaps jsonb, tier_version integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_t public.sambramo_experience_tiers;
  v_status text; v_lv_trade text; v_ti jsonb; v_ci jsonb;
  v_gaps jsonb := '[]'::jsonb;
  v_need numeric; v_have numeric;
  v_inc text[];
  x text;
begin
  select * into v_t from public.sambramo_experience_tiers
   where trade_id = p_trade_id and tier = upper(p_tier) and active;
  if not found then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'experience', 'want', p_tier)), null::integer; return;
  end if;
  -- Décor and the like: no package can say it. The customer's intent goes
  -- with the request and the partner quotes against it.
  if v_t.model <> 'PARTNER_PACKAGE' then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'quote')), v_t.version; return;
  end if;

  -- The listing's trade: its id, or — for listings that only carry the
  -- name (10 of the 11 live Anchor & MC listings, 2026-11-03) — the
  -- registry id for that name, exactly as 206 does for booking lines.
  select p.status, coalesce(lv.trade_id, rg.id), p.trade_inputs, p.commercial_inputs into v_status, v_lv_trade, v_ti, v_ci
    from public.sambramo_trade_packages p
    join public.sambramo_listing_versions lv on lv.id = p.listing_version_id
    left join public.sambramo_trade_registry rg on rg.name = lv.trade
   where p.id = p_package_id;
  if not found then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'package')), v_t.version; return;
  end if;

  -- Not LIVE: say only that. Going on to compare hours would hand anyone
  -- holding the id the duration of a package that is under review,
  -- archived or sent back — a partner's unpublished pricing (209).
  if v_status <> 'LIVE' then
    return query select false, jsonb_build_array(jsonb_build_object('need', 'live', 'have', v_status)), v_t.version; return;
  end if;
  if v_lv_trade is distinct from p_trade_id then
    v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'trade', 'want', p_trade_id, 'have', v_lv_trade));
  end if;

  v_need := greatest(v_t.min_hours, coalesce(p_hours, 0));
  v_have := nullif(v_ti->>'duration_hours', '')::numeric;
  if v_have is null or v_have < v_need then
    v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'hours', 'want', v_need, 'have', v_have));
  end if;

  v_inc := array(select jsonb_array_elements_text(
    case when jsonb_typeof(v_ci->'inclusions') = 'array' then v_ci->'inclusions' else '[]'::jsonb end));
  foreach x in array v_t.required_inclusions loop
    if not (x = any(v_inc)) then
      v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('need', 'inclusion', 'want', x));
    end if;
  end loop;

  return query select jsonb_array_length(v_gaps) = 0, v_gaps, v_t.version;
end $$;
grant execute on function public.sambramo_package_fit(uuid, text, text, numeric) to anon, authenticated;

alter function public.sambramo_experience_tier_touch() set search_path = public;

commit;

-- VERIFY: node --env-file=.env scripts/check-experience-tiers-live.mjs
--   ("a not-LIVE package reveals nothing but its status")
-- Rollback: re-paste sambramo_package_fit from 208.
