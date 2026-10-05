begin;

-- Pricing lifecycle: an edit to a live package is a new revision.
alter table public.sambramo_trade_packages
  add column if not exists parent_package_id uuid references public.sambramo_trade_packages(id) on delete set null;
create index if not exists sambramo_trade_packages_parent_idx
  on public.sambramo_trade_packages(parent_package_id);

alter table public.sambramo_catering_packages
  add column if not exists parent_package_id uuid references public.sambramo_catering_packages(id) on delete set null;
create index if not exists sambramo_catering_packages_parent_idx
  on public.sambramo_catering_packages(parent_package_id);

alter table public.sambramo_catering_packages
  drop constraint if exists sambramo_catering_packages_status_check;
alter table public.sambramo_catering_packages
  add constraint sambramo_catering_packages_status_check
  check (status in ('DRAFT','UNDER_REVIEW','ACTION_REQUIRED','APPROVED','LIVE','ACTIVE','PAUSED','ARCHIVED'));

-- A partner may never mutate a live pricing object in place.
create or replace function public.guard_live_pricing_package_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.get_my_role() = 'vendor'
     and old.status in ('LIVE','ACTIVE')
     and (
       new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.commercial_inputs is distinct from old.commercial_inputs
       or new.trade_inputs is distinct from old.trade_inputs
       or new.status is distinct from old.status
       or new.rate_bands is distinct from old.rate_bands
       or new.cuisine_ids is distinct from old.cuisine_ids
       or new.service_style is distinct from old.service_style
       or new.min_guests is distinct from old.min_guests
       or new.max_guests is distinct from old.max_guests
       or new.service_hours is distinct from old.service_hours
       or new.included_staff is distinct from old.included_staff
       or new.notes is distinct from old.notes
       or new.source is distinct from old.source
       or new.template_id is distinct from old.template_id
     ) then
    raise exception 'Live pricing cannot be edited in place. Create a pricing revision instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_live_trade_package_update on public.sambramo_trade_packages;
create trigger trg_guard_live_trade_package_update
before update on public.sambramo_trade_packages
for each row execute function public.guard_live_pricing_package_update();

drop trigger if exists trg_guard_live_catering_package_update on public.sambramo_catering_packages;
create trigger trg_guard_live_catering_package_update
before update on public.sambramo_catering_packages
for each row execute function public.guard_live_pricing_package_update();

-- Partner-side revision creator for generic trades.
create or replace function public.create_sambramo_trade_package_revision(
  p_parent_package_id uuid,
  p_package jsonb default '{}'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_pricing jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_parent public.sambramo_trade_packages%rowtype;
  v_package jsonb := p_package;
  v_new jsonb;
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
$$;

revoke all on function public.create_sambramo_trade_package_revision(uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.create_sambramo_trade_package_revision(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Partner-side revision creator for catering. The existing catering saver
-- remains the validation engine; this wrapper keeps a live menu untouched.
create or replace function public.create_sambramo_catering_package_revision(
  p_parent_package_id uuid,
  p_package jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb,
  p_addons jsonb default '[]'::jsonb,
  p_rate jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_parent public.sambramo_catering_packages%rowtype;
  v_package jsonb := p_package;
  v_new jsonb;
  v_new_id uuid;
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

  -- The existing saver only accepts DRAFT/ACTIVE/PAUSED/ARCHIVED. Save the
  -- new object as a draft first, then put it into the review queue.
  v_package := jsonb_set(coalesce(v_package,'{}'::jsonb), '{status}', '"DRAFT"', true);

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
$$;

revoke all on function public.create_sambramo_catering_package_revision(uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.create_sambramo_catering_package_revision(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;

-- Unified operator action for generic and catering pricing revisions.
-- Existing live packages remain customer-visible until approval.
create or replace function public.review_sambramo_pricing_revision(
  p_package_type text,
  p_package_id uuid,
  p_decision text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.get_my_role();
  v_parent_id uuid;
  v_old_status text;
begin
  if v_role not in ('admin') then
    raise exception 'Only a Sambramo operator can review pricing revisions.';
  end if;
  if p_decision not in ('approve','request_changes') then
    raise exception 'Unsupported pricing review decision.';
  end if;

  if p_package_type = 'trade' then
    select parent_package_id, status into v_parent_id, v_old_status
      from public.sambramo_trade_packages
     where id = p_package_id
     for update;
    if v_old_status is null then raise exception 'Pricing package not found.'; end if;
    if v_old_status not in ('UNDER_REVIEW','ACTION_REQUIRED') then
      raise exception 'That pricing package is not waiting for review.';
    end if;

    if p_decision = 'approve' then
      if v_parent_id is not null then
        update public.sambramo_trade_packages
           set status='ARCHIVED', updated_at=now()
         where id=v_parent_id and status='LIVE';
        update public.sambramo_partner_price_books
           set status='expired', effective_to=now(), updated_at=now()
         where offering_id=v_parent_id::text and status='active';
      end if;

      update public.sambramo_trade_packages
         set status='LIVE', reviewed_at=now(), review_note=nullif(trim(coalesce(p_note,'')),'')
       where id=p_package_id;

      update public.sambramo_partner_price_books
         set status='active', effective_from=coalesce(effective_from,now())
       where offering_id=p_package_id::text and status='draft';

    else
      update public.sambramo_trade_packages
         set status='ACTION_REQUIRED', reviewed_at=now(), review_note=nullif(trim(coalesce(p_note,'')),'')
       where id=p_package_id;
    end if;

  elsif p_package_type = 'catering' then
    select parent_package_id, status into v_parent_id, v_old_status
      from public.sambramo_catering_packages
     where id = p_package_id
     for update;
    if v_old_status is null then raise exception 'Catering pricing package not found.'; end if;
    if v_old_status not in ('UNDER_REVIEW','ACTION_REQUIRED') then
      raise exception 'That catering package is not waiting for review.';
    end if;

    if p_decision = 'approve' then
      if v_parent_id is not null then
        update public.sambramo_catering_packages
           set status='ARCHIVED', updated_at=now()
         where id=v_parent_id and status in ('LIVE','ACTIVE');
      end if;

      update public.sambramo_catering_price_versions
         set status='SUPERSEDED', effective_to=now()
       where package_id = p_package_id and status='ACTIVE';

      update public.sambramo_catering_packages
         set status='LIVE', updated_at=now(), notes=notes
       where id=p_package_id;

      update public.sambramo_catering_price_versions
         set status='SUPERSEDED', effective_to=now()
       where package_id <> p_package_id
         and package_id in (
           select id from public.sambramo_catering_packages where parent_package_id = v_parent_id
         )
         and status='ACTIVE';

      -- The new package has no ACTIVE price version until operator approval;
      -- promote its draft price version now if present, otherwise the operator
      -- is told the package was approved but still has no active price.
      update public.sambramo_catering_price_versions
         set status='ACTIVE', effective_from=coalesce(effective_from,now())
       where package_id=p_package_id and status='DRAFT';

    else
      update public.sambramo_catering_packages
         set status='ACTION_REQUIRED', updated_at=now()
       where id=p_package_id;
    end if;

  else
    raise exception 'Unsupported pricing package type.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'package_type', p_package_type,
    'package_id', p_package_id,
    'decision', p_decision
  );
end;
$$;

revoke all on function public.review_sambramo_pricing_revision(text,uuid,text,text) from public;
grant execute on function public.review_sambramo_pricing_revision(text,uuid,text,text) to authenticated;

commit;