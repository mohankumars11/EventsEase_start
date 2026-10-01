begin;

revoke all on table public.sambramo_trade_packages from anon;
revoke all on table public.sambramo_trade_package_addons from anon;
grant select on table public.sambramo_trade_packages to anon;
grant select on table public.sambramo_trade_package_addons to anon;
grant select, insert, update, delete on table public.sambramo_trade_packages to authenticated;
grant select, insert, update, delete on table public.sambramo_trade_package_addons to authenticated;

commit;
