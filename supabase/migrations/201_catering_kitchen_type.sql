-- 201 — "What kind of food business are you?" (Mohan, 2026-11-02: hire a
-- caterer, hire a cook, order from a restaurant — restaurants are a kind of
-- caterer that delivers itself, not a 35th trade).
--
-- The answer already lives in each listing's own answers, which is what
-- customer matching reads; this adds the typed column the generated profile
-- table mirrors it into (src/lib/tradeProfileWriter.js). After pasting, run
--   node scripts/build-onboarding-field-map.mjs
--   node scripts/build-trade-profile-schema.mjs
--   node scripts/check-trade-profile-schema.mjs
-- so the writer's allowlist includes the column. Additive; safe to re-run.

alter table public.partner_catering_food_profiles
  add column if not exists kitchen_type text[];

comment on column public.partner_catering_food_profiles.kitchen_type is
  'What kind of food business are you? (catering service / restaurant or cloud kitchen that delivers / cook or chef at the customer''s place)';

select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'partner_catering_food_profiles' and column_name = 'kitchen_type';
