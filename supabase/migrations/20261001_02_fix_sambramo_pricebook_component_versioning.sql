-- Fix service-scoped price-book versioning. The unique key is
-- (vendor_service_id, component_id, version), not package/offering scoped.
CREATE OR REPLACE FUNCTION public.save_sambramo_trade_package(
  p_vendor_service_id uuid,
  p_package_id uuid DEFAULT NULL,
  p_package jsonb DEFAULT '{}'::jsonb,
  p_addons jsonb DEFAULT '[]'::jsonb,
  p_pricing jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_vendor_id uuid;
  v_package_id uuid;
  v_name text := nullif(trim(p_package->>'name'),'');
  v_status text := coalesce(p_package->>'status','DRAFT');
  v_source text := coalesce(p_package->>'source','PARTNER_CUSTOM');
  v_template_id text := nullif(trim(p_package->>'template_id'),'');
  v_description text := nullif(trim(p_package->>'description'),'');
  v_revision integer := greatest(0,coalesce((p_package->>'revision_round')::integer,0));
  v_version integer;
  v_base numeric := greatest(0,coalesce((p_pricing->>'base_price')::numeric,0));
  v_unit text := coalesce(nullif(p_pricing->>'pricing_unit',''),'package');
  v_addon jsonb;
BEGIN
  IF p_vendor_service_id IS NULL THEN RAISE EXCEPTION 'Pricing must belong to a listed service.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_vendor_service_id::text, 0));

  SELECT v.id INTO v_vendor_id
  FROM public.vendors v
  JOIN public.vendor_services s ON s.vendor_id = v.id
  WHERE s.id = p_vendor_service_id AND v.profile_id = auth.uid();
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'You can only price a service listed under your own partner account.'; END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Give this package a customer-facing name.'; END IF;
  IF length(v_name) > 100 THEN RAISE EXCEPTION 'Package names can be up to 100 characters.'; END IF;
  IF v_source NOT IN ('SAMBRAMO_TEMPLATE','PARTNER_CUSTOM') THEN RAISE EXCEPTION 'Unsupported package source.'; END IF;
  IF v_status NOT IN ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','PAUSED','ARCHIVED') THEN RAISE EXCEPTION 'Partners cannot publish or approve pricing themselves.'; END IF;
  IF p_addons IS NULL OR jsonb_typeof(p_addons) <> 'array' THEN RAISE EXCEPTION 'Add-ons must be an array.'; END IF;
  IF p_pricing IS NULL OR jsonb_typeof(p_pricing) <> 'object' THEN RAISE EXCEPTION 'Pricing data is invalid.'; END IF;

  IF p_package_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sambramo_trade_packages p
      WHERE p.id = p_package_id AND p.vendor_id = v_vendor_id
        AND p.vendor_service_id = p_vendor_service_id AND p.status <> 'LIVE'
    ) THEN RAISE EXCEPTION 'That package does not belong to this listing or is already live.'; END IF;
    v_package_id := p_package_id;
    UPDATE public.sambramo_trade_packages
    SET template_id=v_template_id, source=v_source, name=v_name, description=v_description,
        commercial_inputs=coalesce(p_package->'commercial_inputs','{}'::jsonb),
        trade_inputs=coalesce(p_package->'trade_inputs','{}'::jsonb),
        status=v_status, revision_round=v_revision,
        submitted_at=CASE WHEN v_status='UNDER_REVIEW' THEN now() ELSE submitted_at END
    WHERE id=v_package_id;
  ELSE
    INSERT INTO public.sambramo_trade_packages(
      vendor_id,vendor_service_id,template_id,source,name,description,
      commercial_inputs,trade_inputs,status,revision_round,submitted_at
    ) VALUES (
      v_vendor_id,p_vendor_service_id,v_template_id,v_source,v_name,v_description,
      coalesce(p_package->'commercial_inputs','{}'::jsonb),
      coalesce(p_package->'trade_inputs','{}'::jsonb),v_status,v_revision,
      CASE WHEN v_status='UNDER_REVIEW' THEN now() ELSE NULL END
    ) RETURNING id INTO v_package_id;
  END IF;

  DELETE FROM public.sambramo_trade_package_addons WHERE package_id=v_package_id;
  FOR v_addon IN SELECT value FROM jsonb_array_elements(p_addons) LOOP
    IF coalesce(trim(v_addon->>'name'),'')='' THEN RAISE EXCEPTION 'Every add-on needs a name.'; END IF;
    IF coalesce((v_addon->>'rate_paise')::bigint,0)<0 THEN RAISE EXCEPTION 'Add-on rate cannot be negative.'; END IF;
    INSERT INTO public.sambramo_trade_package_addons(
      package_id,name,unit,rate_paise,minimum_quantity,included_quantity,active,sort_order
    ) VALUES (
      v_package_id,trim(v_addon->>'name'),coalesce(nullif(v_addon->>'unit',''),'per_event'),
      greatest(0,coalesce((v_addon->>'rate_paise')::bigint,0)),
      greatest(1,coalesce((v_addon->>'minimum_quantity')::numeric,1)),
      greatest(0,coalesce((v_addon->>'included_quantity')::numeric,0)),
      coalesce((v_addon->>'active')::boolean,true),coalesce((v_addon->>'sort_order')::integer,0)
    );
  END LOOP;

  IF v_base>0 THEN
    SELECT coalesce(max(version),0)+1 INTO v_version
    FROM public.sambramo_partner_price_books
    WHERE vendor_service_id=p_vendor_service_id AND component_id='base';

    UPDATE public.sambramo_partner_price_books
    SET status='expired',effective_to=now()
    WHERE vendor_service_id=p_vendor_service_id
      AND offering_id=v_package_id::text AND status IN ('active','draft');

    INSERT INTO public.sambramo_partner_price_books(
      vendor_id,vendor_service_id,trade_id,offering_id,component_id,component_type,
      unit,rate_paise,minimum_quantity,included_quantity,inclusions,exclusions,
      quantity_formula,effective_from,status,version
    ) VALUES (
      v_vendor_id,p_vendor_service_id,
      (SELECT s.category FROM public.vendor_services s WHERE s.id=p_vendor_service_id),
      v_package_id::text,'base','base',v_unit,round(v_base*100)::bigint,
      greatest(1,coalesce((p_pricing->>'minimum_order')::numeric,1)),
      greatest(0,coalesce((p_pricing->>'included_quantity')::numeric,0)),
      coalesce(p_package->'commercial_inputs'->'inclusions','[]'::jsonb),
      coalesce(p_package->'commercial_inputs'->'exclusions','[]'::jsonb),
      jsonb_build_object(
        'included_duration',p_pricing->>'included_duration',
        'additional_unit_rate',coalesce((p_pricing->>'additional_unit_rate')::numeric,0),
        'additional_duration_rate',coalesce((p_pricing->>'additional_duration_rate')::numeric,0),
        'setup_fee',coalesce((p_pricing->>'setup_fee')::numeric,0),
        'teardown_fee',coalesce((p_pricing->>'teardown_fee')::numeric,0),
        'travel_policy',p_pricing->>'travel_policy','lead_time',p_pricing->>'lead_time'
      ),now(),'draft',v_version
    );
  ELSIF v_status='UNDER_REVIEW' THEN
    RAISE EXCEPTION 'Add the supply-side base price before submitting this package.';
  END IF;

  IF v_status='UNDER_REVIEW' THEN
    UPDATE public.sambramo_trade_packages SET submitted_at=coalesce(submitted_at,now()) WHERE id=v_package_id;
  END IF;
  RETURN jsonb_build_object('ok',true,'package_id',v_package_id,'vendor_service_id',p_vendor_service_id,'version',coalesce(v_version,0),'status',v_status);
END;
$function$;