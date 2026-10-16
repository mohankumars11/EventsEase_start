-- Instant Book & Pay needs a payout account Razorpay has ACTIVATED.
--
-- Every resolver (resolve_booking, resolve_catering, the Anchor resolver)
-- and listing_readiness asked
--     exists (... partner_payout_accounts pa ... pa.route_account_id is not null)
-- which is true the moment a Route linked account is CREATED — before
-- Razorpay has checked the PAN, the stakeholder or the settlement bank.
-- A partner whose account is still under review, needs clarification,
-- or was rejected or suspended was being offered instant bookings that
-- cannot be paid out.
--
-- The rule is now `pa.route_status = 'activated'`, the status
-- api/_lib/routeSetup.js reads back from Razorpay (never set by a client).
--
-- Applied in place: each function in `public` whose body contains the old
-- test is re-created from its own current definition with only that test
-- replaced, so this cannot regress anything else in those (long) bodies
-- and keeps their grants (CREATE OR REPLACE keeps the function's OID).
-- Re-runnable: a second run finds nothing to replace.
--
-- Today no partner_payout_accounts rows exist, so nobody's booking path
-- changes on the day this is applied.

begin;

do $$
declare
  f record;
  def text;
  n integer := 0;
begin
  for f in
    select p.oid, p.proname
      from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.prokind = 'f'
       and p.prosrc like '%pa.route_account_id is not null%'
  loop
    def := pg_get_functiondef(f.oid);
    def := replace(def, 'pa.route_account_id is not null', 'pa.route_status = ''activated''');
    execute def;
    n := n + 1;
    raise notice 'payout readiness now requires activation: %', f.proname;
  end loop;
  raise notice '% function(s) updated', n;
end $$;

commit;
