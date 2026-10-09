begin;

-- Add calculation_snapshot to track how packages were generated (inputs, formula, outputs).
-- This creates an audit trail so we can reconcile generated vs. vendor-edited prices.
alter table public.sambramo_trade_packages
  add column if not exists calculation_snapshot jsonb;

comment on column public.sambramo_trade_packages.calculation_snapshot is 'Server-generated packages store their generation inputs and math here for auditability.';

create index if not exists sambramo_trade_packages_calculation_snapshot_idx
  on public.sambramo_trade_packages(vendor_service_id, status)
  where calculation_snapshot is not null;

-- Generate tier packages (Essential, Signature, VIP) for trades that use the new pattern.
-- Called by the client after the partner fills the pricing step (baseline inputs).
--
-- Generation math:
--   platform_fee_rate = 0.08 (8%), so price = partner_take_home / (1 - 0.08) = take_home / 0.92
--
--   Essential = take_home * min_duration / 0.92
--   Signature = Essential * 1.75 at (2 * min_duration) [requires 2x min duration to be available]
--   VIP = Essential * vip_multiplier at max_duration
--
-- All are generated with status UNDER_REVIEW (not LIVE). The admin reviews and approves.
-- The calculation_snapshot stores:
--   - inputs: baseline answers from the partner
--   - platform_fee_rate: the fee used
--   - generated_packages: the three tier names and price multipliers
--   - generated_at: timestamp
--   - generation_round: incremental counter for regenerations
create or replace function public.generate_sambramo_tier_packages(
  p_vendor_service_id uuid,
  p_baseline_inputs jsonb default '{}'::jsonb,
  p_trade_id text default 'emcee'
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_vendor_service_id uuid;
  v_service_trade_id text;
  v_take_home_per_hour bigint;
  v_min_duration_hours integer;
  v_max_duration_hours integer;
  v_vip_multiplier numeric;
  v_overtime_rate_per_hour bigint;
  v_max_audience integer;
  v_min_notice_days integer;
  v_platform_fee_rate numeric := 0.08;
  v_round_to numeric := 0.10;
  v_essential_paise bigint;
  v_signature_paise bigint;
  v_vip_paise bigint;
  v_calculation_snapshot jsonb;
  v_snapshot jsonb;
  v_existing_round integer;
  v_new_round integer;
  v_essential_id uuid;
  v_signature_id uuid;
  v_vip_id uuid;
  v_result jsonb := '[]'::jsonb;
begin
  -- Validate the calling partner owns this vendor service
  select v.id, s.category
    into v_vendor_id, v_service_trade_id
    from public.vendors v
    join public.vendor_services s on s.vendor_id = v.id
   where s.id = p_vendor_service_id
     and v.profile_id = auth.uid();

  if v_vendor_id is null then
    raise exception 'This service does not belong to your account.';
  end if;

  -- Parse baseline inputs
  v_take_home_per_hour := greatest(0, coalesce((p_baseline_inputs->>'take_home_per_hour')::bigint, 0));
  v_min_duration_hours := greatest(1, coalesce((p_baseline_inputs->>'min_duration_hours')::integer, 2));
  v_max_duration_hours := greatest(v_min_duration_hours, coalesce((p_baseline_inputs->>'max_duration_hours')::integer, 8));
  v_vip_multiplier := greatest(1.0, coalesce((p_baseline_inputs->>'vip_multiplier')::numeric, 4.0));
  v_overtime_rate_per_hour := greatest(0, coalesce((p_baseline_inputs->>'overtime_rate_per_hour')::bigint, 0));
  v_max_audience := coalesce((p_baseline_inputs->>'max_audience_size')::integer, 5000);
  v_min_notice_days := greatest(0, coalesce((p_baseline_inputs->>'min_notice_days')::integer, 1));

  -- Validate inputs
  if v_take_home_per_hour <= 0 then
    raise exception 'Take-home rate must be greater than 0.';
  end if;

  if v_min_duration_hours > v_max_duration_hours then
    raise exception 'Min duration cannot exceed max duration.';
  end if;

  if v_vip_multiplier <= 0 then
    raise exception 'VIP multiplier must be positive.';
  end if;

  -- Compute tier prices in paise (₹1 = 100 paise), rounded to ₹0.10 (10 paise)
  v_essential_paise := round(
    (v_take_home_per_hour * 100 * v_min_duration_hours) / (1 - v_platform_fee_rate) / 10
  )::bigint * 10;

  v_signature_paise := round(
    v_essential_paise * 1.75 / 10
  )::bigint * 10;

  v_vip_paise := round(
    (v_take_home_per_hour * 100 * v_max_duration_hours) / (1 - v_platform_fee_rate) * v_vip_multiplier / 10
  )::bigint * 10;

  -- Find the generation round (for re-generations, increment it)
  select coalesce(max((calculation_snapshot->>'generation_round')::integer), 0)
    into v_existing_round
    from public.sambramo_trade_packages
   where vendor_service_id = p_vendor_service_id
     and (calculation_snapshot->>'trade_id') = p_trade_id;

  v_new_round := v_existing_round + 1;

  -- Build the calculation snapshot for auditability
  v_calculation_snapshot := jsonb_build_object(
    'trade_id', p_trade_id,
    'generation_round', v_new_round,
    'generated_at', now()::text,
    'inputs', jsonb_build_object(
      'take_home_per_hour', v_take_home_per_hour,
      'min_duration_hours', v_min_duration_hours,
      'max_duration_hours', v_max_duration_hours,
      'vip_multiplier', v_vip_multiplier,
      'overtime_rate_per_hour', v_overtime_rate_per_hour,
      'max_audience_size', v_max_audience,
      'min_notice_days', v_min_notice_days
    ),
    'platform_fee_rate', v_platform_fee_rate,
    'formula', jsonb_build_object(
      'essential', jsonb_build_object(
        'description', 'take_home * min_hrs / (1 - fee_rate)',
        'paise', v_essential_paise
      ),
      'signature', jsonb_build_object(
        'description', 'essential * 1.75 at 2x min duration',
        'paise', v_signature_paise
      ),
      'vip', jsonb_build_object(
        'description', 'take_home * max_hrs * vip_multiplier / (1 - fee_rate)',
        'paise', v_vip_paise
      )
    )
  );

  -- Archive any previous DRAFT generation packages (keep LIVE ones to track history)
  update public.sambramo_trade_packages
     set status = 'ARCHIVED', updated_at = now()
   where vendor_service_id = p_vendor_service_id
     and status = 'DRAFT'
     and (calculation_snapshot->>'trade_id') = p_trade_id;

  -- Generate the three tier packages
  -- Essential
  insert into public.sambramo_trade_packages (
    vendor_id, vendor_service_id, source, name, description, status,
    commercial_inputs, trade_inputs, revision_round, submitted_at, calculation_snapshot
  ) values (
    v_vendor_id, p_vendor_service_id, 'SAMBRAMO_GENERATED', 'Essential',
    'Single anchor or MC for your event', 'UNDER_REVIEW',
    jsonb_build_object(
      'tier', 'ESSENTIAL',
      'availability_policy', 'instant',
      'payment_policy', 'full'
    ),
    jsonb_build_object(
      'duration_hours', v_min_duration_hours
    ),
    0, now(), v_calculation_snapshot
  )
  returning id into v_essential_id;

  -- Signature (requires 2x min duration to be available)
  insert into public.sambramo_trade_packages (
    vendor_id, vendor_service_id, source, name, description, status,
    commercial_inputs, trade_inputs, revision_round, submitted_at, calculation_snapshot
  ) values (
    v_vendor_id, p_vendor_service_id, 'SAMBRAMO_GENERATED', 'Signature',
    'Anchor or MC with added services (MOST POPULAR)', 'UNDER_REVIEW',
    jsonb_build_object(
      'tier', 'SIGNATURE',
      'badge', 'MOST POPULAR',
      'availability_policy', 'instant',
      'payment_policy', 'full',
      'inclusions', array['pre_event_call']
    ),
    jsonb_build_object(
      'duration_hours', v_min_duration_hours * 2
    ),
    0, now(), v_calculation_snapshot
  )
  returning id into v_signature_id;

  -- VIP
  insert into public.sambramo_trade_packages (
    vendor_id, vendor_service_id, source, name, description, status,
    commercial_inputs, trade_inputs, revision_round, submitted_at, calculation_snapshot
  ) values (
    v_vendor_id, p_vendor_service_id, 'SAMBRAMO_GENERATED', 'VIP',
    'Premium anchor/MC experience', 'UNDER_REVIEW',
    jsonb_build_object(
      'tier', 'VIP',
      'availability_policy', 'instant',
      'payment_policy', 'full'
    ),
    jsonb_build_object(
      'duration_hours', v_max_duration_hours
    ),
    0, now(), v_calculation_snapshot
  )
  returning id into v_vip_id;

  -- Save price books for each tier (partner-side supply rates)
  insert into public.sambramo_partner_price_books (
    vendor_id, vendor_service_id, trade_id, offering_id, component_id, component_type,
    unit, rate_paise, minimum_quantity, included_quantity, inclusions, exclusions,
    quantity_formula, effective_from, status, version
  ) values
    (v_vendor_id, p_vendor_service_id, v_service_trade_id, v_essential_id::text, 'base', 'base',
     'per event', v_essential_paise, 1, 0, '[]'::jsonb, '[]'::jsonb,
     jsonb_build_object('included_duration', v_min_duration_hours), now(), 'draft', 1),
    (v_vendor_id, p_vendor_service_id, v_service_trade_id, v_signature_id::text, 'base', 'base',
     'per event', v_signature_paise, 1, 0, '["pre_event_call"]'::jsonb, '[]'::jsonb,
     jsonb_build_object('included_duration', v_min_duration_hours * 2), now(), 'draft', 1),
    (v_vendor_id, p_vendor_service_id, v_service_trade_id, v_vip_id::text, 'base', 'base',
     'per event', v_vip_paise, 1, 0, '[]'::jsonb, '[]'::jsonb,
     jsonb_build_object('included_duration', v_max_duration_hours), now(), 'draft', 1);

  return jsonb_build_object(
    'ok', true,
    'generation_round', v_new_round,
    'packages', jsonb_build_array(
      jsonb_build_object(
        'id', v_essential_id,
        'tier', 'ESSENTIAL',
        'name', 'Essential',
        'duration_hours', v_min_duration_hours,
        'price_paise', v_essential_paise,
        'price_display', '₹' || (v_essential_paise / 100)::integer
      ),
      jsonb_build_object(
        'id', v_signature_id,
        'tier', 'SIGNATURE',
        'name', 'Signature',
        'duration_hours', v_min_duration_hours * 2,
        'price_paise', v_signature_paise,
        'price_display', '₹' || (v_signature_paise / 100)::integer
      ),
      jsonb_build_object(
        'id', v_vip_id,
        'tier', 'VIP',
        'name', 'VIP',
        'duration_hours', v_max_duration_hours,
        'price_paise', v_vip_paise,
        'price_display', '₹' || (v_vip_paise / 100)::integer
      )
    ),
    'calculation', jsonb_build_object(
      'platform_fee_rate', v_platform_fee_rate,
      'take_home_per_hour_display', '₹' || (v_take_home_per_hour / 100)::integer
    )
  );
end;
$$;

revoke all on function public.generate_sambramo_tier_packages(uuid,jsonb,text) from public;
grant execute on function public.generate_sambramo_tier_packages(uuid,jsonb,text) to authenticated;

commit;
