-- Sambramo onboarding policy: the first identity check is required now.
-- Apply after migration 146 creates verification_policy. Trade-specific
-- statutory requirements remain controlled by their existing dated rows.

begin;

insert into public.verification_policy
  (requirement_id, market, trade, service, mandatory_from, note)
values
  ('VER-ID-IDENTITY', null, null, null, date '2026-10-07',
   'Sambramo policy: every partner must complete one accepted identity check before approval. Aadhaar is recommended; other viable IDs remain available.')
on conflict (coalesce(market, '*'), coalesce(trade, '*'), coalesce(service, '*'), requirement_id)
do update set mandatory_from = least(public.verification_policy.mandatory_from, excluded.mandatory_from),
              note = excluded.note;

commit;
