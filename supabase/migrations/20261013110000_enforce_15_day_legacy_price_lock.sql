-- Apply the configured published-price protection to legacy trade and
-- catering package revision RPCs. Changes to non-price listing content remain
-- possible; package rates, units and optional extras cannot be repriced early.
-- This migration intentionally does not alter live data.
begin;

create or replace function public.create_sambramo_trade_package_revision(
  p_parent_package_id uuid,
  p_package jsonb default '{}'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_pricing jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_parent public.sambramo_trade_packages%rowtype;
  v_package jsonb := p_package;
  v_new jsonb;
  v_base public.sambramo_partner_price_books%rowtype;
  v_lock_days integer := 15;
  v_locked_until timestamptz;
  v_current_addons jsonb := '[]'::jsonb;
  v_proposed_addons jsonb := '[]'::jsonb;
  v_formula jsonb := '{}'::jsonb;
  v_base_paise bigint;
  v_minimum_quantity numeric;
  v_included_quantity numeric;
  v_included_duration numeric;
  v_additional_unit_rate numeric;
  v_additional_duration_rate numeric;
  v_setup_fee numeric;
  v_teardown_fee numeric;
begin
  select * into v_parent
    from public.sambramo_trade_packages p
   where p.id = p_parent_package_id
     and p.vendor_id = (select v.id from public.vendors v where v.profile_id = auth.uid())
   limit 1;

  if not found then
    raise exception 'The pricing package does not belong to your partner account.';
  end if;
  if v_parent.status <> 'LIVE' then
    raise exception 'Only a live package can create a pricing revision.';
  end if;

  select coalesce(c.price_lock_days, 15) into v_lock_days
    from public.sambramo_pricing_config c
   limit 1;
  v_lock_days := greatest(1, coalesce(v_lock_days, 15));

  select * into v_base
    from public.sambramo_partner_price_books b
   where b.vendor_service_id = v_parent.vendor_service_id
     and b.offering_id = v_parent.id::text
     and b.component_id = 'base'
     and b.status = 'active'
   order by b.version desc
   limit 1;

  if found then
    v_locked_until := greatest(
      coalesce(v_parent.price_locked_until, '-infinity'::timestamptz),
      coalesce(coalesce(v_base.effective_from, v_base.created_at) + make_interval(days => v_lock_days), '-infinity'::timestamptz)
    );

    if v_locked_until > now() then
      v_formula := coalesce(v_base.quantity_formula, '{}'::jsonb);
      v_base_paise := case
        when p_pricing ? 'base_price'
          then round(coalesce(nullif(trim(p_pricing->>'base_price'), '')::numeric, 0) * 100)::bigint
        else v_base.rate_paise
      end;
      v_minimum_quantity := case
        when p_pricing ? 'minimum_order'
          then greatest(1, coalesce(nullif(trim(p_pricing->>'minimum_order'), '')::numeric, 1))
        else v_base.minimum_quantity
      end;
      v_included_quantity := case
        when p_pricing ? 'included_quantity'
          then greatest(0, coalesce(nullif(trim(p_pricing->>'included_quantity'), '')::numeric, 0))
        else v_base.included_quantity
      end;
      v_included_duration := case
        when p_pricing ? 'included_duration' then nullif(trim(p_pricing->>'included_duration'), '')::numeric
        else nullif(trim(v_formula->>'included_duration'), '')::numeric
      end;
      v_additional_unit_rate := case
        when p_pricing ? 'additional_unit_rate' then coalesce(nullif(trim(p_pricing->>'additional_unit_rate'), '')::numeric, 0)
        else coalesce(nullif(trim(v_formula->>'additional_unit_rate'), '')::numeric, 0)
      end;
      v_additional_duration_rate := case
        when p_pricing ? 'additional_duration_rate' then coalesce(nullif(trim(p_pricing->>'additional_duration_rate'), '')::numeric, 0)
        else coalesce(nullif(trim(v_formula->>'additional_duration_rate'), '')::numeric, 0)
      end;
      v_setup_fee := case
        when p_pricing ? 'setup_fee' then coalesce(nullif(trim(p_pricing->>'setup_fee'), '')::numeric, 0)
        else coalesce(nullif(trim(v_formula->>'setup_fee'), '')::numeric, 0)
      end;
      v_teardown_fee := case
        when p_pricing ? 'teardown_fee' then coalesce(nullif(trim(p_pricing->>'teardown_fee'), '')::numeric, 0)
        else coalesce(nullif(trim(v_formula->>'teardown_fee'), '')::numeric, 0)
      end;

      if v_base_paise is distinct from v_base.rate_paise
         or coalesce(nullif(trim(coalesce(p_pricing->>'pricing_unit', p_pricing->>'unit')), ''), v_base.unit) is distinct from v_base.unit
         or v_minimum_quantity is distinct from v_base.minimum_quantity
         or v_included_quantity is distinct from v_base.included_quantity
         or v_included_duration is distinct from nullif(trim(v_formula->>'included_duration'), '')::numeric
         or v_additional_unit_rate is distinct from coalesce(nullif(trim(v_formula->>'additional_unit_rate'), '')::numeric, 0)
         or v_additional_duration_rate is distinct from coalesce(nullif(trim(v_formula->>'additional_duration_rate'), '')::numeric, 0)
         or v_setup_fee is distinct from coalesce(nullif(trim(v_formula->>'setup_fee'), '')::numeric, 0)
         or v_teardown_fee is distinct from coalesce(nullif(trim(v_formula->>'teardown_fee'), '')::numeric, 0)
      then
        raise exception 'Published prices are protected until %. Rates and price units cannot change during the configured price-lock window.', v_locked_until::date;
      end if;

      select coalesce(jsonb_agg(jsonb_build_object(
        'name', trim(a.name),
        'unit', a.unit,
        'rate_paise', a.rate_paise,
        'minimum_quantity', a.minimum_quantity,
        'included_quantity', a.included_quantity,
        'active', a.active
      ) order by lower(trim(a.name))), '[]'::jsonb)
        into v_current_addons
        from public.sambramo_trade_package_addons a
       where a.package_id = v_parent.id;

      select coalesce(jsonb_agg(jsonb_build_object(
        'name', trim(a.value->>'name'),
        'unit', coalesce(nullif(trim(a.value->>'unit'), ''), 'per_event'),
        'rate_paise', greatest(0, coalesce(nullif(trim(a.value->>'rate_paise'), '')::bigint, 0)),
        'minimum_quantity', greatest(1, coalesce(nullif(trim(a.value->>'minimum_quantity'), '')::numeric, 1)),
        'included_quantity', greatest(0, coalesce(nullif(trim(a.value->>'included_quantity'), '')::numeric, 0)),
        'active', coalesce((a.value->>'active')::boolean, true)
      ) order by lower(trim(a.value->>'name'))), '[]'::jsonb)
        into v_proposed_addons
        from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) a(value)
       where coalesce(trim(a.value->>'name'), '') <> '';

      if v_current_addons is distinct from v_proposed_addons then
        raise exception 'Published add-on prices are protected until %. Add-on rates and quantities cannot change during the configured price-lock window.', v_locked_until::date;
      end if;
    end if;
  end if;

  v_package := jsonb_set(
    coalesce(v_package,'{}'::jsonb),
    '{status}',
    to_jsonb(case when coalesce(v_package->>'status','DRAFT') = 'UNDER_REVIEW' then 'UNDER_REVIEW' else 'DRAFT' end),
    true
  );
  v_package := jsonb_set(
    v_package,
    '{revision_round}',
    to_jsonb(v_parent.revision_round + 1),
    true
  );

  v_new := public.save_sambramo_trade_package(
    v_parent.vendor_service_id,
    null,
    v_package,
    p_addons,
    p_pricing
  );

  update public.sambramo_trade_packages
     set parent_package_id = v_parent.id
   where id = (v_new->>'package_id')::uuid;

  return v_new || jsonb_build_object(
    'revision_of', v_parent.id,
    'revision_round', v_parent.revision_round + 1,
    'status', v_package->>'status'
  );
end;
$function$;


create or replace function public.create_sambramo_catering_package_revision(
  p_parent_package_id uuid,
  p_package jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_rate jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_parent public.sambramo_catering_packages%rowtype;
  v_package jsonb := p_package;
  v_new jsonb;
  v_new_id uuid;
  v_current_rate public.sambramo_catering_price_versions%rowtype;
  v_lock_days integer := 15;
  v_locked_until timestamptz;
  v_current_bands jsonb := '[]'::jsonb;
  v_proposed_bands jsonb := '[]'::jsonb;
  v_current_addons jsonb := '[]'::jsonb;
  v_proposed_addons jsonb := '[]'::jsonb;
begin
  select * into v_parent
    from public.sambramo_catering_packages p
   where p.id = p_parent_package_id
     and p.vendor_id = (select v.id from public.vendors v where v.profile_id = auth.uid())
   limit 1;

  if not found then
    raise exception 'The catering package does not belong to your partner account.';
  end if;
  if v_parent.status not in ('LIVE','ACTIVE') then
    raise exception 'Only a live catering package can create a pricing revision.';
  end if;

  select coalesce(c.price_lock_days, 15) into v_lock_days
    from public.sambramo_pricing_config c
   limit 1;
  v_lock_days := greatest(1, coalesce(v_lock_days, 15));

  select * into v_current_rate
    from public.sambramo_catering_price_versions r
   where r.package_id = v_parent.id
     and r.status = 'ACTIVE'
   order by r.version desc
   limit 1;

  v_locked_until := greatest(
    coalesce(v_parent.price_locked_until, '-infinity'::timestamptz),
    coalesce(coalesce(v_current_rate.effective_from, v_current_rate.created_at) + make_interval(days => v_lock_days), '-infinity'::timestamptz)
  );

  if v_locked_until > now() then
    v_current_bands := coalesce(v_current_rate.rate_bands, v_parent.rate_bands, '[]'::jsonb);
    v_proposed_bands := coalesce(p_rate->'rate_bands', '[]'::jsonb);

    if coalesce((p_rate->>'supply_rate_paise')::bigint, 0) is distinct from coalesce(v_current_rate.supply_rate_paise, 0)
       or v_proposed_bands is distinct from v_current_bands then
      raise exception 'Published catering rates are protected until %. Guest price bands cannot change during the configured price-lock window.', v_locked_until::date;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'name', trim(a.name),
      'unit', a.unit,
      'rate_paise', a.rate_paise,
      'minimum_quantity', a.minimum_quantity,
      'maximum_quantity', a.maximum_quantity,
      'included_quantity', a.included_quantity,
      'active', a.active
    ) order by lower(trim(a.name))), '[]'::jsonb)
      into v_current_addons
      from public.sambramo_catering_package_addons a
     where a.package_id = v_parent.id
       and a.active is true;

    select coalesce(jsonb_agg(jsonb_build_object(
      'name', trim(a.value->>'name'),
      'unit', a.value->>'unit',
      'rate_paise', greatest(0, coalesce(nullif(trim(a.value->>'rate_paise'), '')::bigint, 0)),
      'minimum_quantity', greatest(1, coalesce(nullif(trim(a.value->>'minimum_quantity'), '')::integer, 1)),
      'maximum_quantity', nullif(trim(a.value->>'maximum_quantity'), '')::integer,
      'included_quantity', greatest(0, coalesce(nullif(trim(a.value->>'included_quantity'), '')::integer, 0)),
      'active', coalesce((a.value->>'active')::boolean, true)
    ) order by lower(trim(a.value->>'name'))), '[]'::jsonb)
      into v_proposed_addons
      from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) a(value)
     where coalesce(trim(a.value->>'name'), '') <> ''
       and coalesce((a.value->>'active')::boolean, true);

    if v_current_addons is distinct from v_proposed_addons then
      raise exception 'Published catering add-on prices are protected until %. Add-on rates and quantities cannot change during the configured price-lock window.', v_locked_until::date;
    end if;
  end if;

  -- The package saver only accepts DRAFT/ACTIVE/PAUSED/ARCHIVED. Save the
  -- revision as draft, then put it into the review queue if requested.
  v_package := jsonb_set(coalesce(v_package,'{}'::jsonb), '{status}', '"DRAFT"'::jsonb, true);

  v_new := public.save_sambramo_catering_package(
    v_parent.vendor_service_id,
    null,
    v_package,
    p_items,
    p_addons,
    p_rate
  );
  v_new_id := (v_new->>'package_id')::uuid;

  update public.sambramo_catering_packages
     set parent_package_id = v_parent.id,
         status = case when coalesce(p_package->>'status','DRAFT') = 'UNDER_REVIEW'
                       then 'UNDER_REVIEW' else 'DRAFT' end
   where id = v_new_id;

  return v_new || jsonb_build_object(
    'revision_of', v_parent.id,
    'revision_round', 1 + (
      select count(*) from public.sambramo_catering_packages
       where parent_package_id = v_parent.id
    ),
    'status', case when coalesce(p_package->>'status','DRAFT') = 'UNDER_REVIEW'
                   then 'UNDER_REVIEW' else 'DRAFT' end
  );
end;
$function$;

commit;
