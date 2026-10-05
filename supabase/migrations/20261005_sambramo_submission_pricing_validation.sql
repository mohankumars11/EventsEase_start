create or replace function public.submit_sambramo_partner_application()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vendor public.vendors%rowtype;
  v_review jsonb;
  v_missing text[] := '{}';
  v_service_count integer := 0;
  v_priced_count integer := 0;
  v_week_count integer := 0;
  v_payout_count integer := 0;
begin
  select * into v_vendor from public.vendors where profile_id = auth.uid() limit 1;
  if not found then return jsonb_build_object('ok',false,'reason','not_a_partner'); end if;

  if coalesce(trim(v_vendor.business_name),'') = '' then
    v_missing := array_append(v_missing,'business_name');
  end if;

  if coalesce(trim(v_vendor.city),'') = '' or coalesce(trim(v_vendor.pincode),'') = ''
     or coalesce(v_vendor.service_radius_km,0) <= 0 then
    v_missing := array_append(v_missing,'service_area');
  end if;

  select count(*) into v_service_count
  from public.vendor_services s
  where s.vendor_id=v_vendor.id and coalesce(trim(s.category),'') <> '';
  if v_service_count=0 then v_missing:=array_append(v_missing,'services'); end if;

  select count(*) into v_week_count from public.vendor_weekly_rules r where r.vendor_id=v_vendor.id;
  if v_week_count=0 and v_vendor.calendar_reviewed_through is null then
    v_missing:=array_append(v_missing,'calendar');
  end if;

  select count(*) into v_payout_count from public.vendor_payout_details p where p.vendor_id=v_vendor.id;
  if v_payout_count=0 then v_missing:=array_append(v_missing,'payout'); end if;

  /*
    A service is priced only when there is a usable commercial object:
      generic trade: package + price book with positive rate OR explicit custom-quote unit
      catering: package + at least one positive rate band.
    This prevents a partner from submitting an empty package shell.
  */
  select count(*) into v_priced_count
  from public.vendor_services s
  where s.vendor_id=v_vendor.id
    and coalesce(trim(s.category),'') <> ''
    and (
      exists (
        select 1
        from public.sambramo_trade_packages tp
        join public.sambramo_partner_price_books pb
          on pb.vendor_service_id=tp.vendor_service_id
         and pb.offering_id=tp.id::text
        where tp.vendor_service_id=s.id
          and tp.status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','LIVE','ACTIVE')
          and pb.status in ('draft','active')
          and (coalesce(pb.rate_paise,0) > 0 or lower(coalesce(pb.unit,''))='custom quote')
      )
      or exists (
        select 1
        from public.sambramo_catering_packages cp
        where cp.vendor_service_id=s.id
          and cp.status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','LIVE','ACTIVE')
          and jsonb_typeof(cp.rate_bands)='array'
          and exists (
            select 1
            from jsonb_array_elements(cp.rate_bands) band
            where coalesce(nullif(band->>'rate_paise','')::numeric,0)
               + coalesce(nullif(band->>'rate','')::numeric,0) > 0
          )
      )
    );

  if v_priced_count < v_service_count then
    v_missing:=array_append(v_missing,'pricing');
  end if;

  if coalesce(array_length(v_missing,1),0)>0 then
    return jsonb_build_object('ok',false,'reason','missing_requirements','missing',v_missing);
  end if;

  v_review:=public.submit_for_review();
  if coalesce((v_review->>'ok')::boolean,false) is not true then return v_review; end if;

  update public.sambramo_trade_packages
     set status='UNDER_REVIEW', submitted_at=coalesce(submitted_at,now()), updated_at=now()
   where vendor_id=v_vendor.id and status='DRAFT';

  update public.sambramo_catering_packages
     set status='UNDER_REVIEW', updated_at=now()
   where vendor_id=v_vendor.id and status='DRAFT';

  return v_review || jsonb_build_object('application','submitted','pricing_included',true);
end;
$$;