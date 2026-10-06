begin;

update public.sambramo_catering_packages p
set rate_bands = coalesce(
  nullif(p.rate_bands, '[]'::jsonb),
  (
    select jsonb_build_array(
      jsonb_build_object(
        'min_guests', pv.minimum_guests,
        'max_guests', pv.maximum_guests,
        'rate_paise', pv.supply_rate_paise
      )
    )
    from public.sambramo_catering_price_versions pv
    where pv.package_id = p.id
    order by pv.version desc
    limit 1
  ),
  '[]'::jsonb
)
where p.rate_bands = '[]'::jsonb;

update public.sambramo_catering_price_versions pv
set rate_bands = jsonb_build_array(
  jsonb_build_object(
    'min_guests', pv.minimum_guests,
    'max_guests', pv.maximum_guests,
    'rate_paise', pv.supply_rate_paise
  )
)
where pv.rate_bands = '[]'::jsonb
  and pv.supply_rate_paise > 0;

create or replace function public.save_sambramo_catering_package(
  p_vendor_service_id uuid,
  p_package_id uuid default null,
  p_package jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_rate jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_package_id uuid;
  v_service_specs jsonb;
  v_listing_cuisines text[] := '{}';
  v_listing_dish_ids text[] := '{}';
  v_listing_kitchen text;
  v_status text := coalesce(p_package->>'status','DRAFT');
  v_name text := nullif(trim(p_package->>'name'),'');
  v_package_cuisines text[] := '{}';
  v_kitchen text := coalesce(nullif(p_package->>'kitchen_type',''),'pure_veg');
  v_service_style text := coalesce(nullif(p_package->>'service_style',''),'buffet');
  v_sourcing_mode text := coalesce(nullif(p_package->>'sourcing_mode',''),'full');
  v_min integer := greatest(1, coalesce((p_package->>'min_guests')::integer, 1));
  v_max integer := nullif(p_package->>'max_guests','')::integer;
  v_hours numeric := coalesce((p_package->>'service_hours')::numeric, 3);
  v_staff integer := greatest(0, coalesce((p_package->>'included_staff')::integer, 0));
  v_rate bigint := coalesce((p_rate->>'supply_rate_paise')::bigint, 0);
  v_rate_bands jsonb := coalesce(p_rate->'rate_bands','[]'::jsonb);
  v_band jsonb;
  v_band_min integer;
  v_band_max integer;
  v_band_rate bigint;
  v_prev_max integer := null;
  v_band_count integer := 0;
  v_version integer;
  v_item jsonb;
  v_addon jsonb;
  v_dish record;
begin
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Menu dishes must be an array.'; end if;
  if jsonb_typeof(p_addons) <> 'array' then raise exception 'Menu add-ons must be an array.'; end if;
  if jsonb_typeof(p_package) <> 'object' then raise exception 'Catering package data is invalid.'; end if;
  if jsonb_typeof(coalesce(p_package->'cuisine_ids','[]'::jsonb)) <> 'array' then raise exception 'Package cuisines must be an array.'; end if;
  if jsonb_typeof(v_rate_bands) <> 'array' then raise exception 'Guest pricing bands must be an array.'; end if;

  select v.id, coalesce(s.specs,'{}'::jsonb)
    into v_vendor_id, v_service_specs
  from public.vendors v
  join public.vendor_services s on s.vendor_id=v.id
  where s.id=p_vendor_service_id and s.category='Catering & Food' and v.profile_id=(select auth.uid())
  limit 1;

  if v_vendor_id is null then raise exception 'You can only price your own Catering & Food listing.'; end if;

  if jsonb_typeof(coalesce(v_service_specs->'cuisines','[]'::jsonb))='array' then
    v_listing_cuisines := coalesce(array(select jsonb_array_elements_text(v_service_specs->'cuisines')),'{}');
  end if;
  if jsonb_typeof(coalesce(v_service_specs->'dish_ids','[]'::jsonb))='array' then
    v_listing_dish_ids := coalesce(array(select jsonb_array_elements_text(v_service_specs->'dish_ids')),'{}');
  end if;
  v_listing_kitchen := coalesce(nullif(v_service_specs->>'kitchen_type',''),'pure_veg');

  if v_status not in ('DRAFT','ACTIVE','PAUSED','ARCHIVED') then raise exception 'Unsupported catering package status.'; end if;
  if v_name is null then raise exception 'Give this menu package a name.'; end if;
  if length(v_name)>80 then raise exception 'Menu package names can be up to 80 characters.'; end if;

  v_package_cuisines := coalesce(array(select jsonb_array_elements_text(coalesce(p_package->'cuisine_ids','[]'::jsonb))),'{}');
  if cardinality(v_package_cuisines)=0 then raise exception 'Select at least one cuisine for this menu.'; end if;
  if cardinality(v_listing_cuisines)=0 then raise exception 'Complete the cuisines on your Catering & Food listing before pricing a menu.'; end if;
  if exists(select 1 from unnest(v_package_cuisines) c where not(c=any(v_listing_cuisines))) then raise exception 'A menu can only use cuisines already declared on your Catering & Food listing.'; end if;

  if v_kitchen not in ('pure_veg','pure_nonveg','both') then raise exception 'Unsupported kitchen type.'; end if;
  if v_kitchen<>v_listing_kitchen then raise exception 'Kitchen type is inherited from your catering listing and cannot be changed here.'; end if;
  if v_service_style not in ('plantain_leaf','buffet','plated','packed_meals','live_counters','mixed','custom') then raise exception 'Unsupported catering service style.'; end if;
  if v_sourcing_mode not in ('full','family_provisions','family_cook','family_kitchen') then raise exception 'Unsupported food sourcing mode.'; end if;
  if v_max is not null and v_max<v_min then raise exception 'Maximum guests cannot be below the minimum.'; end if;
  if v_hours<=0 or v_hours>24 then raise exception 'Service duration must be between 0 and 24 hours.'; end if;
  if v_staff<0 or v_staff>500 then raise exception 'Included staff is outside the supported range.'; end if;

  if v_status='ACTIVE' then
    for v_band in select value from jsonb_array_elements(v_rate_bands) loop
      v_band_count := v_band_count+1;
      begin
        v_band_min := (v_band->>'min_guests')::integer;
        v_band_max := nullif(v_band->>'max_guests','')::integer;
        v_band_rate := (v_band->>'rate_paise')::bigint;
      exception when invalid_text_representation then
        raise exception 'Guest pricing bands contain a non-numeric value.';
      end;

      if v_band_min is null or v_band_min<v_min then raise exception 'Every pricing band must start at or above the menu minimum.'; end if;
      if v_band_count=1 and v_band_min<>v_min then raise exception 'The first pricing band must start at the menu minimum.'; end if;
      if v_band_count>1 and (v_prev_max is null or v_band_min<>v_prev_max+1) then raise exception 'Guest pricing bands must be contiguous with no gaps or overlaps.'; end if;
      if v_band_max is not null and v_band_max<v_band_min then raise exception 'A pricing band maximum must be at least its minimum.'; end if;
      if v_band_count < jsonb_array_length(v_rate_bands) and v_band_max is null then raise exception 'Only the final pricing band can have no maximum.'; end if;
      if v_band_rate is null or v_band_rate<=0 then raise exception 'Every pricing band needs a supply rate greater than zero.'; end if;
      if v_max is not null and v_band_max is not null and v_band_max>v_max then raise exception 'A pricing band cannot exceed the menu maximum.'; end if;
      v_prev_max := v_band_max;
    end loop;

    if v_band_count=0 then raise exception 'Add at least one guest-volume price band.'; end if;
    if v_max is not null and v_prev_max<>v_max then raise exception 'Pricing bands must cover the full menu guest range.'; end if;
    if v_max is null and v_prev_max is not null then raise exception 'With no menu maximum, the final pricing band must have no maximum.'; end if;
    v_rate := (v_rate_bands->0->>'rate_paise')::bigint;

    if v_rate<=0 then raise exception 'Enter a supply rate greater than zero.'; end if;
    if cardinality(v_listing_dish_ids)=0 then raise exception 'Add and save the dishes you can cook on your Catering & Food listing before activating menu pricing.'; end if;
    if jsonb_array_length(p_items)=0 then raise exception 'Add at least one dish before activating this menu.'; end if;
  elsif v_rate<0 then
    raise exception 'Supply rate cannot be negative.';
  end if;

  if p_package_id is not null then
    if not exists(select 1 from public.sambramo_catering_packages p where p.id=p_package_id and p.vendor_id=v_vendor_id and p.vendor_service_id=p_vendor_service_id) then
      raise exception 'That catering package does not belong to this listing.';
    end if;
    v_package_id:=p_package_id;
    update public.sambramo_catering_packages
       set name=v_name,cuisine_ids=v_package_cuisines,kitchen_type=v_kitchen,
           service_style=v_service_style,sourcing_mode=v_sourcing_mode,
           rate_bands=v_rate_bands,min_guests=v_min,max_guests=v_max,
           service_hours=v_hours,included_staff=v_staff,
           notes=nullif(trim(coalesce(p_package->>'notes','')),''),status=v_status
     where id=v_package_id;
  else
    insert into public.sambramo_catering_packages(
      vendor_id,vendor_service_id,name,cuisine_ids,kitchen_type,service_style,
      sourcing_mode,rate_bands,min_guests,max_guests,service_hours,
      included_staff,notes,status
    )
    values(
      v_vendor_id,p_vendor_service_id,v_name,v_package_cuisines,v_kitchen,
      v_service_style,v_sourcing_mode,v_rate_bands,v_min,v_max,v_hours,
      v_staff,nullif(trim(coalesce(p_package->>'notes','')),''),v_status
    )
    returning id into v_package_id;
  end if;

  delete from public.sambramo_catering_package_items where package_id=v_package_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(trim(v_item->>'dish_id'),'')='' then raise exception 'Every menu item needs a dish.'; end if;
    select d.id,d.cuisine_id,d.diet,d.is_active into v_dish from public.catalogue_dishes d where d.id=v_item->>'dish_id';
    if not found or not coalesce(v_dish.is_active,true) then raise exception 'One of the selected dishes is no longer available in the catalogue.'; end if;
    if v_status='ACTIVE' and not(v_item->>'dish_id'=any(v_listing_dish_ids)) then raise exception 'This menu includes a dish that is not declared on your Catering & Food listing.'; end if;
    if not(v_dish.cuisine_id=any(v_package_cuisines)) then raise exception 'Every dish in a menu must belong to one of the menu cuisines.'; end if;
    if v_kitchen='pure_veg' and v_dish.diet<>'veg' then raise exception 'A pure-vegetarian menu cannot contain a non-vegetarian dish.'; end if;
    if v_kitchen='pure_nonveg' and v_dish.diet<>'nonveg' then raise exception 'This non-vegetarian menu is restricted to non-vegetarian dishes.'; end if;
    if coalesce(v_item->>'section','') not in ('welcome','starters','soup','salad','breads','mains','curries','rice','accompaniments','sweets','dessert','beverages','live_counter','other') then raise exception 'One of the menu sections is not supported.'; end if;
    if coalesce(v_item->>'selection_type','included') not in ('included','optional','replacement') then raise exception 'One of the menu item types is not supported.'; end if;
    if coalesce(v_item->>'selection_type','included')='replacement' and nullif(trim(coalesce(v_item->>'choice_group','')),'') is null then raise exception 'Replacement dishes need a replacement group.'; end if;
    insert into public.sambramo_catering_package_items(package_id,dish_id,section,selection_type,choice_group,sort_order)
    values(v_package_id,v_item->>'dish_id',coalesce(v_item->>'section','mains'),coalesce(v_item->>'selection_type','included'),nullif(trim(coalesce(v_item->>'choice_group','')),''),greatest(0,coalesce((v_item->>'sort_order')::integer,0)));
  end loop;

  delete from public.sambramo_catering_package_addons where package_id=v_package_id;
  for v_addon in select value from jsonb_array_elements(p_addons) loop
    if coalesce(trim(v_addon->>'name'),'')='' then raise exception 'Every add-on needs a name.'; end if;
    if length(trim(v_addon->>'name'))>100 then raise exception 'Add-on names can be up to 100 characters.'; end if;
    if coalesce((v_addon->>'rate_paise')::bigint,0)<0 then raise exception 'An add-on rate cannot be negative.'; end if;
    if coalesce((v_addon->>'minimum_quantity')::integer,1)<1 then raise exception 'Add-on minimum quantity must be at least 1.'; end if;
    if nullif(v_addon->>'maximum_quantity','') is not null and (v_addon->>'maximum_quantity')::integer<(v_addon->>'minimum_quantity')::integer then raise exception 'An add-on maximum cannot be below its minimum.'; end if;
    if coalesce((v_addon->>'included_quantity')::integer,0)<0 then raise exception 'Add-on included quantity cannot be negative.'; end if;
    if nullif(v_addon->>'maximum_quantity','') is not null and coalesce((v_addon->>'included_quantity')::integer,0)>(v_addon->>'maximum_quantity')::integer then raise exception 'Add-on included quantity cannot exceed its maximum.'; end if;
    if coalesce(v_addon->>'unit','') not in ('per_guest','per_counter','per_staff','per_hour','per_event','per_set','per_item','per_trip') then raise exception 'One of the add-on units is not supported.'; end if;
    insert into public.sambramo_catering_package_addons(package_id,name,unit,rate_paise,minimum_quantity,maximum_quantity,included_quantity,notes,active,sort_order)
    values(v_package_id,trim(v_addon->>'name'),v_addon->>'unit',coalesce((v_addon->>'rate_paise')::bigint,0),greatest(1,coalesce((v_addon->>'minimum_quantity')::integer,1)),nullif(v_addon->>'maximum_quantity','')::integer,greatest(0,coalesce((v_addon->>'included_quantity')::integer,0)),nullif(trim(coalesce(v_addon->>'notes','')),''),coalesce((v_addon->>'active')::boolean,true),greatest(0,coalesce((v_addon->>'sort_order')::integer,0)));
  end loop;

  if v_status='ACTIVE' then
    select coalesce(max(version),0)+1 into v_version from public.sambramo_catering_price_versions where package_id=v_package_id;
    update public.sambramo_catering_price_versions set status='SUPERSEDED',effective_to=now() where package_id=v_package_id and status='ACTIVE';
    insert into public.sambramo_catering_price_versions(
      package_id,version,supply_rate_paise,unit,minimum_guests,maximum_guests,
      service_hours,included_staff,sourcing_mode,rate_bands,status
    )
    values(
      v_package_id,v_version,v_rate,'per_guest',v_min,v_max,v_hours,v_staff,
      v_sourcing_mode,v_rate_bands,'ACTIVE'
    );
  end if;

  return jsonb_build_object(
    'package_id',v_package_id,
    'version',coalesce(v_version,(select max(version) from public.sambramo_catering_price_versions where package_id=v_package_id),0),
    'status',v_status,'sourcing_mode',v_sourcing_mode,'rate_bands',v_rate_bands
  );
end
$$;

revoke all on function public.save_sambramo_catering_package(uuid,uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_sambramo_catering_package(uuid,uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;

commit;