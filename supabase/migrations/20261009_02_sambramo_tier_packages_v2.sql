-- Tier package generation, v2.
--
-- v1 (20261009_sambramo_anchor_mc_package_generation_v1) inserted three
-- price-book rows directly, all as (vendor_service_id, 'base', version 1).
-- The price-book unique key is (vendor_service_id, component_id, version)
-- (see 20261001_02), so the very first call would have failed. It also
-- wrote source 'SAMBRAMO_GENERATED', which save_sambramo_trade_package
-- does not accept, and a second submit would have left the first three
-- packages behind as duplicates.
--
-- v2 computes the three tiers here and saves each one THROUGH
-- save_sambramo_trade_package, which already owns versioning, add-ons and
-- validation. The partner's edits from the Packages step are accepted as
-- the price, and the generated price is kept beside it in
-- calculation_snapshot so a reviewer can see both.
--
--   Essential  take_home * min_hrs / (1 - fee)                at min_hrs
--   Signature  Essential * 1.75                               at 2 * min_hrs
--   VIP        take_home * max_hrs * vip_multiplier / (1-fee)  at max_hrs
--
-- fee = 0.08. Everything is paise, rounded to 10. Mirrors src/lib/tierPackages.js.

begin;

drop function if exists public.generate_sambramo_tier_packages(uuid, jsonb, text);

create or replace function public.generate_sambramo_tier_packages(
  p_vendor_service_id uuid,
  p_baseline_inputs jsonb default '{}'::jsonb,
  p_trade_id text default 'Anchor & MC',
  p_overrides jsonb default '{}'::jsonb,   -- { "ESSENTIAL": { "price_paise", "duration_hours", "inclusions": [] }, ... }
  p_addons jsonb default '[]'::jsonb       -- [{ "id", "name", "rate_paise" }] the partner offers
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_fee numeric := 0.08;
  v_take bigint;
  v_min integer;
  v_max integer;
  v_mult numeric;
  v_round integer;
  v_tier text;
  v_gen bigint;
  v_final bigint;
  v_hours integer;
  v_inc jsonb;
  v_o jsonb;
  v_saved jsonb;
  v_out jsonb := '[]'::jsonb;
  v_ess bigint;
  v_names jsonb := '{"ESSENTIAL":"Essential","SIGNATURE":"Signature","VIP":"VIP"}';
  v_desc jsonb := '{"ESSENTIAL":"Anchor or MC for your event","SIGNATURE":"Anchor or MC with script and planning call","VIP":"Premium full-day anchor experience"}';
begin
  select v.id into v_vendor_id
    from public.vendors v
    join public.vendor_services s on s.vendor_id = v.id
   where s.id = p_vendor_service_id and v.profile_id = auth.uid();
  if v_vendor_id is null then
    raise exception 'This service does not belong to your account.';
  end if;

  v_take := coalesce((p_baseline_inputs->>'take_home_per_hour')::bigint, 0);
  v_min  := coalesce((p_baseline_inputs->>'min_duration_hours')::integer, 0);
  v_max  := coalesce((p_baseline_inputs->>'max_duration_hours')::integer, 0);
  v_mult := coalesce((p_baseline_inputs->>'vip_multiplier')::numeric, 0);

  if v_take <= 0 then raise exception 'Take-home rate must be greater than 0.'; end if;
  if v_min < 1 then raise exception 'Choose a minimum booking length.'; end if;
  if v_max < v_min * 2 then raise exception 'Longest event must be at least twice the minimum booking.'; end if;
  if v_mult < 1 or v_mult > 10 then raise exception 'VIP effort must be between 1x and 10x.'; end if;

  -- One more than any earlier generation for this service and trade.
  select coalesce(max((calculation_snapshot->>'generation_round')::integer), 0) + 1 into v_round
    from public.sambramo_trade_packages
   where vendor_service_id = p_vendor_service_id
     and calculation_snapshot->>'trade_id' = p_trade_id;

  -- Earlier generations that never went live are replaced, not kept beside.
  update public.sambramo_trade_packages
     set status = 'ARCHIVED', updated_at = now()
   where vendor_service_id = p_vendor_service_id
     and calculation_snapshot->>'trade_id' = p_trade_id
     and status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED');

  v_ess := round(v_take * 100 * v_min / (1 - v_fee) / 10)::bigint * 10;

  foreach v_tier in array array['ESSENTIAL','SIGNATURE','VIP'] loop
    v_gen := case v_tier
      when 'ESSENTIAL' then v_ess
      when 'SIGNATURE' then round(v_ess * 1.75 / 10)::bigint * 10
      else round(v_take * 100 * v_max / (1 - v_fee) * v_mult / 10)::bigint * 10
    end;
    v_hours := case v_tier when 'ESSENTIAL' then v_min when 'SIGNATURE' then v_min * 2 else v_max end;

    v_o := coalesce(p_overrides->v_tier, '{}'::jsonb);
    v_final := coalesce(nullif(v_o->>'price_paise','')::bigint, v_gen);
    if v_final <= 0 then raise exception '% price must be greater than 0.', v_names->>v_tier; end if;
    v_hours := least(greatest(coalesce(nullif(v_o->>'duration_hours','')::integer, v_hours), 1), 24);
    v_inc := coalesce(v_o->'inclusions', '[]'::jsonb);

    v_saved := public.save_sambramo_trade_package(
      p_vendor_service_id,
      null,
      jsonb_build_object(
        'name', v_names->>v_tier,
        'description', v_desc->>v_tier,
        'status', 'UNDER_REVIEW',
        'source', 'SAMBRAMO_TEMPLATE',
        'template_id', 'tier_v2:' || lower(v_tier),
        'commercial_inputs', jsonb_build_object(
          'tier', v_tier,
          'badge', case when v_tier = 'SIGNATURE' then 'Most popular' end,
          'inclusions', v_inc,
          'availability_policy', 'instant',
          'payment_policy', 'full',
          'pricing_unit', 'package'
        ),
        'trade_inputs', jsonb_build_object('duration_hours', v_hours)
      ),
      coalesce(p_addons, '[]'::jsonb),
      jsonb_build_object(
        'base_price', v_final / 100.0,
        'pricing_unit', 'package',
        'minimum_order', 1,
        'included_duration', v_hours
      )
    );

    update public.sambramo_trade_packages
       set calculation_snapshot = jsonb_build_object(
             'trade_id', p_trade_id,
             'generation_round', v_round,
             'generated_at', now(),
             'inputs', p_baseline_inputs,
             'platform_fee_rate', v_fee,
             'tier', v_tier,
             'generated_price_paise', v_gen,
             'final_price_paise', v_final,
             'edited_by_partner', v_final <> v_gen or p_overrides ? v_tier
           )
     where id = (v_saved->>'package_id')::uuid;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'id', v_saved->>'package_id', 'tier', v_tier, 'name', v_names->>v_tier,
      'duration_hours', v_hours, 'price_paise', v_final, 'generated_price_paise', v_gen
    ));
  end loop;

  return jsonb_build_object('ok', true, 'generation_round', v_round, 'packages', v_out);
end;
$$;

revoke all on function public.generate_sambramo_tier_packages(uuid, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.generate_sambramo_tier_packages(uuid, jsonb, text, jsonb, jsonb) to authenticated;

commit;
