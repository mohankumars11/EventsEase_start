begin;

create or replace function public.approve_sambramo_partner_application(
  p_vendor_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vendor public.vendors%rowtype;
  v_submitted_pricing integer := 0;
  v_pricing_live integer := 0;
  v_listings_live integer := 0;
  v_partner_listings_live integer := 0;
  v_missing text[] := '{}';
  v_result jsonb;
begin
  if not public.caller_is_operator() then
    return jsonb_build_object('ok',false,'reason','not_permitted');
  end if;

  select * into v_vendor
    from public.vendors
   where id=p_vendor_id
   for update;

  if not found then
    return jsonb_build_object('ok',false,'reason','not_found');
  end if;

  if v_vendor.verification_status <> 'submitted' then
    return jsonb_build_object('ok',false,'reason','not_submitted','status',v_vendor.verification_status);
  end if;

  if coalesce(v_vendor.business_name,'')='' then
    v_missing := array_append(v_missing,'business_name');
  end if;
  if v_vendor.location is null or coalesce(v_vendor.city,'')='' or coalesce(v_vendor.pincode,'')='' or coalesce(v_vendor.service_radius_km,0)<=0 then
    v_missing := array_append(v_missing,'service_area');
  end if;
  if not exists (select 1 from public.vendor_services s where s.vendor_id=p_vendor_id and s.is_active=true) then
    v_missing := array_append(v_missing,'services');
  end if;
  if not exists (select 1 from public.vendor_payout_details p where p.vendor_id=p_vendor_id) then
    v_missing := array_append(v_missing,'payout');
  end if;
  if not exists (
    select 1 from public.vendor_weekly_rules r where r.vendor_id=p_vendor_id
  ) then
    v_missing := array_append(v_missing,'calendar');
  end if;

  -- Every active listing needs an initial customer-ready pricing object.
  if exists (
    select 1 from public.vendor_services s
     where s.vendor_id=p_vendor_id and s.is_active=true
       and not (
         exists (
           select 1 from public.sambramo_trade_packages tp
            where tp.vendor_service_id=s.id
              and tp.vendor_id=p_vendor_id
              and tp.parent_package_id is null
              and tp.status in ('UNDER_REVIEW','LIVE','ACTIVE')
         )
         or exists (
           select 1 from public.sambramo_catering_packages cp
            where cp.vendor_service_id=s.id
              and cp.vendor_id=p_vendor_id
              and cp.parent_package_id is null
              and cp.status in ('UNDER_REVIEW','LIVE','ACTIVE')
         )
       )
  ) then
    v_missing := array_append(v_missing,'pricing');
  end if;

  if coalesce(array_length(v_missing,1),0)>0 then
    return jsonb_build_object('ok',false,'reason','missing_requirements','missing',v_missing);
  end if;

  -- First approve the vendor and all under-review vendor services in the
  -- same transaction. Existing triggers/RLS remain the guardrail.
  v_result := public.set_vendor_verification(p_vendor_id,'approved',p_note);
  if coalesce((v_result->>'ok')::boolean,false) is not true then
    raise exception 'Vendor approval failed: %', coalesce(v_result->>'reason','unknown');
  end if;
  v_listings_live := coalesce((v_result->>'listings_made_live')::integer,0);

  -- Promote only initial onboarding pricing. Live revisions (parent_package_id
  -- not null) remain in the separate Pricing Review queue.
  update public.sambramo_trade_packages
     set status='LIVE',
         reviewed_at=now(),
         review_note=nullif(trim(coalesce(p_note,'')),''),
         updated_at=now()
   where vendor_id=p_vendor_id
     and parent_package_id is null
     and status='UNDER_REVIEW';
  get diagnostics v_pricing_live = row_count;

  update public.sambramo_partner_price_books pb
     set status='active',
         effective_from=coalesce(pb.effective_from,now()),
         updated_at=now()
   where pb.vendor_id=p_vendor_id
     and pb.status='draft'
     and exists (
       select 1 from public.sambramo_trade_packages tp
        where tp.id::text=pb.offering_id
          and tp.vendor_id=p_vendor_id
          and tp.parent_package_id is null
          and tp.status='LIVE'
     );

  update public.sambramo_catering_packages
     set status='LIVE',
         updated_at=now()
   where vendor_id=p_vendor_id
     and parent_package_id is null
     and status='UNDER_REVIEW';
  get diagnostics v_submitted_pricing = row_count;
  v_pricing_live := v_pricing_live + v_submitted_pricing;

  update public.sambramo_catering_price_versions pv
     set status='ACTIVE',
         effective_from=coalesce(pv.effective_from,now())
   where pv.status='DRAFT'
     and exists (
       select 1 from public.sambramo_catering_packages cp
        where cp.id=pv.package_id
          and cp.vendor_id=p_vendor_id
          and cp.parent_package_id is null
          and cp.status='LIVE'
     );

  -- Keep the customer-facing partner listing container in sync when it has
  -- a status column; this is intentionally constrained to known review states.
  if to_regclass('public.partner_listings') is not null then
    execute 'update public.partner_listings set status = ''live'', updated_at = now() where vendor_id = $1 and status in (''draft'',''under_review'')'
      using p_vendor_id;
    get diagnostics v_partner_listings_live = row_count;
  end if;

  return jsonb_build_object(
    'ok',true,
    'status','approved',
    'listings_made_live',v_listings_live,
    'pricing_made_live',v_pricing_live,
    'partner_listings_made_live',v_partner_listings_live
  );
exception
  when others then
    raise;
end;
$$;

revoke all on function public.approve_sambramo_partner_application(uuid,text) from public;
grant execute on function public.approve_sambramo_partner_application(uuid,text) to authenticated;

commit;