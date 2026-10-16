-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisite: 20261010_09_resolve_booking_all_trades.sql (listing_public).
-- Safe to apply alone. Adds one function; changes nothing existing.
--
-- "Preview my customer listing", for a listing that is not live yet.
--
-- listing_public() joins `lv.status = 'LIVE'`, so it answers only for a
-- published listing. That is right for customers and wrong for the
-- partner's own preview: the moment a partner most wants to see what a
-- customer will see is BEFORE they submit, and while a change is in
-- review. Today the Pricing tab hides the Preview action unless a live
-- version exists, so a first-time partner never gets one at all.
--
-- This is listing_public's projection over the version the OWNER should
-- be looking at -- the pending one if there is one, otherwise the live
-- one -- plus the state so the UI can say which. It returns nothing at
-- all to anyone who is not the owner, so it cannot be used to read an
-- unpublished competitor's prices.
--
-- It deliberately does NOT widen listing_public. A customer-facing
-- function that sometimes returns a draft is one `or` away from showing
-- a draft to a customer.
--
-- Rollback: drop function public.listing_preview(uuid);

begin;

create or replace function public.listing_preview(p_vendor_service_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_version record;
  v_payload jsonb;
begin
  -- Ownership first, and by the same join the rest of the partner
  -- surface uses: vendor_services -> vendors -> profile_id.
  select v.profile_id into v_owner
    from public.vendor_services s
    join public.vendors v on v.id = s.vendor_id
   where s.id = p_vendor_service_id;

  if v_owner is null or v_owner <> auth.uid() then
    return null;
  end if;

  -- The version worth previewing: a pending one outranks the live one,
  -- because it is the thing the partner just changed.
  select lv.id, lv.status, lv.version, lv.published_at
    into v_version
    from public.sambramo_listing_versions lv
   where lv.vendor_service_id = p_vendor_service_id
     and lv.seasonal_window_id is null
   order by case lv.status
              when 'UNDER_REVIEW'    then 1
              when 'ACTION_REQUIRED' then 2
              when 'REJECTED'        then 3
              when 'DRAFT'           then 4
              when 'LIVE'            then 5
              else 6
            end,
            lv.version desc
   limit 1;

  if v_version.id is null then
    return jsonb_build_object('state', 'NONE');
  end if;

  -- The live listing, when there is one, is rendered by the function the
  -- customer page itself calls -- so what the partner sees in that case
  -- is not merely the same shape, it is the same answer.
  if v_version.status = 'LIVE' then
    v_payload := public.listing_public(p_vendor_service_id);
  else
    select jsonb_build_object(
      'vendor_service_id', s.id,
      'version_id', lv.id,
      'trade_id', lv.trade_id,
      'profile', lv.profile,
      'answers', lv.answers - coalesce((select array_agg(k) from jsonb_object_keys(lv.answers) k
                                         where k ~ '(registration|legal|private|bank|account)'), '{}'),
      'city', coalesce(nullif(v.area, ''), v.city),
      'rating', v.rating_avg,
      'terms', jsonb_build_object(
        'advance_pct', lv.booking_rules->>'advance_pct', 'cancellation', lv.booking_rules->>'cancellation',
        'min_notice_days', lv.booking_rules->>'min_notice_days', 'instant', lv.booking_rules->>'instant',
        'charges', (select coalesce(jsonb_agg(jsonb_build_object('label', c->>'label', 'role', c->>'role',
                      'customer_paise', public.sambramo_customer_paise_for((c->>'take_home_paise')::bigint, lv.trade_id))), '[]'::jsonb)
                    from jsonb_array_elements(coalesce(lv.booking_rules->'charges', '[]'::jsonb)) c),
        'travel_model', lv.travel_rules->>'model', 'travel_scope', lv.travel_rules->>'scope'),
      -- Every package on a pending version, not only LIVE ones: on a
      -- version that has never been published there are none.
      'packages', (select coalesce(jsonb_agg(jsonb_build_object(
          'key', p.commercial_inputs->>'tier', 'name', p.name, 'description', p.description,
          'hours', nullif(p.trade_inputs->>'duration_hours', '')::numeric,
          'customer_paise', (p.trade_inputs->>'customer_paise')::bigint,
          'inclusions', coalesce(p.commercial_inputs->'inclusions', '[]'::jsonb))
          order by (p.trade_inputs->>'take_home_paise')::bigint), '[]'::jsonb)
        from public.sambramo_trade_packages p
        where p.listing_version_id = lv.id and p.status <> 'ARCHIVED'),
      'catalogue', (select coalesce(jsonb_agg(jsonb_build_object(
          'item_key', c.item_key, 'collection', c.collection, 'name', c.name, 'category', c.category, 'unit', c.unit,
          'customer_paise', c.customer_paise, 'min_qty', c.min_qty, 'max_qty', c.max_qty, 'lead_days', c.lead_days,
          'deposit_paise', c.deposit_paise,
          'attributes', c.attributes - coalesce((select array_agg(k) from jsonb_object_keys(c.attributes) k
                                                   where k ~ '(registration|private)'), '{}'),
          'media', c.media) order by c.sort_order), '[]'::jsonb)
        from public.sambramo_catalogue_items c where c.listing_version_id = lv.id and c.active),
      'rules', (select coalesce(jsonb_agg(jsonb_build_object('kind', r.rule_kind, 'label', r.label, 'unit', r.unit,
          'customer_paise', r.customer_paise, 'min_qty', r.min_qty, 'max_qty', r.max_qty,
          'included_qty', r.included_qty, 'included_hours', r.included_hours)), '[]'::jsonb)
        from public.sambramo_rate_rules r where r.listing_version_id = lv.id),
      'addons', (select coalesce(jsonb_agg(jsonb_build_object('addon_id', a.addon_id, 'label', a.label,
          'unit', a.unit, 'customer_paise', a.customer_paise, 'included_in', a.included_in)), '[]'::jsonb)
        from public.sambramo_addon_rules a where a.listing_version_id = lv.id)
    )
    into v_payload
    from public.vendor_services s
    join public.vendors v on v.id = s.vendor_id
    join public.sambramo_listing_versions lv on lv.id = v_version.id
    where s.id = p_vendor_service_id;
  end if;

  return coalesce(v_payload, '{}'::jsonb) || jsonb_build_object(
    'state', v_version.status,
    'version', v_version.version,
    'published_at', v_version.published_at,
    'is_live', v_version.status = 'LIVE');
end;
$$;

revoke all on function public.listing_preview(uuid) from public, anon;
grant execute on function public.listing_preview(uuid) to authenticated;

commit;
