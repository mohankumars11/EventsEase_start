-- 212 — Trade #35: Restaurant & Dining (Mohan, 2026-11-11).
--
-- A restaurant books tables, private rooms, party halls and bulk orders,
-- priced per person — not a caterer who delivers (that stays kitchen_type
-- on Catering & Food). Mirrors src/data/trades/registry.js + restaurant.js.
--
-- ROWS ONLY, no DDL: applied over PostgREST by
--   node --env-file=.env scripts/apply-restaurant-trade.mjs
-- which upserts exactly these three rows. code_ref (202) is the word in a
-- requirement code: SBM-EVT-0001-RESTO-01. Paste here only if that script
-- cannot run. The typed admin profile table (partner_restaurant_profiles)
-- is DDL and comes from scripts/build-trade-profile-schema.mjs separately.
--
-- Rollback:
--   delete from public.verification_policy where trade = 'Restaurant & Dining';
--   delete from public.sambramo_trade_pricing_policy where trade_id = 'restaurant';
--   delete from public.sambramo_trade_registry where id = 'restaurant';

insert into public.sambramo_trade_registry
  (id, code, code_ref, name, sort_order, archetype, tiers, regulated, allowed_kinds, required_answers, resource_model, catalogue_key, compliance)
values (
  'restaurant', 'E27', 'RESTO', 'Restaurant & Dining', 35, 'PER_GUEST_FOOD', true, true,
  array['per_person','per_guest','fixed','quote']::text[],
  array['restaurant_name','cuisines','diet','dining_modes','meal_formats','photos','seating_capacity','advance_notice_hours']::text[],
  'capacity', 'packages',
  '[{"doc":"VER-TRADE-FSSAI","always":true,"when":null,"blocks_instant":true},{"doc":"VER-TRADE-LIQUOR","always":false,"when":{"q":"alcohol","truthy":true},"blocks_instant":false}]'::jsonb
)
on conflict (id) do update set
  code = excluded.code, code_ref = excluded.code_ref, name = excluded.name, sort_order = excluded.sort_order, archetype = excluded.archetype,
  tiers = excluded.tiers, regulated = excluded.regulated, allowed_kinds = excluded.allowed_kinds,
  required_answers = excluded.required_answers, resource_model = excluded.resource_model,
  catalogue_key = excluded.catalogue_key, compliance = excluded.compliance;

insert into public.sambramo_trade_pricing_policy (trade_id, platform_fee_rate)
values ('restaurant', 0.08)
on conflict (trade_id) do nothing;

-- Serving an event is food service under the FSS Act 2006 (only if 146 is applied).
do $$
begin
  if to_regclass('public.verification_policy') is null then return; end if;
  insert into public.verification_policy (requirement_id, market, trade, service, mandatory_from, note) values
    ('VER-TRADE-FSSAI', null, 'Restaurant & Dining', null, date '2026-11-01', 'A restaurant serving a celebration is food service under the FSS Act 2006.')
  on conflict (coalesce(market, '*'), coalesce(trade, '*'), coalesce(service, '*'), requirement_id)
  do update set mandatory_from = excluded.mandatory_from, note = excluded.note;
end $$;
