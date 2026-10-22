-- Beverages could not be submitted at all.
--
-- sambramo_trade_registry.required_answers for bar_beverages still names
-- the keys of the questionnaire's first draft -- beverage_types,
-- bar_stations, bartenders. src/data/trades/bar_beverages.js has asked
-- service_lines, counters and staff ever since, so submit_listing_version
-- refused every Beverages listing with 'Answer "beverage types" before
-- submitting.' -- a question the partner app never shows.
--
-- Found 2026-10-22 when all ten synthetic Beverages partners failed in
-- scripts/seed-synthetic-marketplace.mjs while the other 33 trades passed.
-- Rows only, no DDL. Applied over PostgREST the same day.
--
-- Rollback:
--   update public.sambramo_trade_registry
--      set required_answers = array['display_name','beverage_types','supply_scope','events','guests_per_hour','bar_stations','bartenders']
--    where id = 'bar_beverages';

update public.sambramo_trade_registry
   set required_answers = array['display_name','service_lines','supply_scope','events','guests_per_hour','counters','staff']
 where id = 'bar_beverages';
