-- APPLY BY HAND in Supabase -> SQL Editor.
-- Prerequisites: 20261012_02 (the policy rows), 20261013_01 (the advance).
-- Safe to apply alone and re-runnable.
--
-- Which of the 34 trades can claim a materials advance.
--
-- ── The rule ───────────────────────────────────────────────────────
-- Does this trade buy consumable goods BEFORE the event day that are
-- used up at the event? Photography albums and prints are bought after,
-- so photography is not an advance case however much it spends.
--
-- The three-way classification from 20261012_02 (never / conditional /
-- common) was built for the BOM engine, which needed to know whether to
-- compute quantities. The advance has no such step: a human reads a
-- bill. So it collapses to eligible (classification 'common') and not
-- ('never'), and `advance_eligible()` reads exactly that.
--
-- ── This one ACTIVATES them ────────────────────────────────────────
-- Every row has been 'draft' since 20261012_02, which is why nothing
-- has ever been eligible. This is the migration that turns the feature
-- on, so it is the first one whose application a partner can notice.
-- Moving a trade afterwards is one UPDATE, not a release.
--
-- Rollback:
--   update public.sambramo_procurement_policy set status = 'draft';

begin;

-- ── Eligible: buys consumables before the event ────────────────────
update public.sambramo_procurement_policy p
   set classification = 'common',
       status = 'active',
       allow_incremental = false,          -- unused by the advance flow
       default_method = 'partner_supplier',
       allowed_methods = '{partner_supplier,partner_stock}',
       note = v.note
  from (values
    ('catering_food',            'Groceries, provisions, vegetables, dairy, disposables'),
    ('bar_beverages',            'Soft drinks, mixers, ice, garnishes, serving disposables'),
    ('decoration_floral',        'Flowers, fabric, balloons, ribbon, adhesives'),
    ('cake_desserts',            'Ingredients, fillings, boards, packaging'),
    ('priest_rituals',           'Puja supplies, flowers, fruit'),
    ('gifts_favours',            'Bulk gifts and customisation'),
    ('invitation_printing',      'Paper and print runs'),
    ('trousseau_gift_packing',   'Boxes, trays, fabric, ribbon'),
    ('mehendi_artist',           'Cones and consumables'),
    ('bridal_makeup_hair',       'Job-specific consumables and flowers, never the kit'),
    ('event_materials_supplier', 'Stock for the order'),
    ('tent_furniture',           'Fasteners and approved custom items, never reusable stock'),
    ('event_lighting',           'Consumables, never fixtures'),
    ('live_entertainment',       'Props, costumes, set items'),
    ('guest_services',           'Badges, welcome kits, amenities'),
    ('wedding_planning',         'Client-specific printed material and kits')
  ) as v(trade_id, note)
 where p.trade_id = v.trade_id and p.version = 1;

-- ── Not eligible: labour, own equipment, vehicles, or bought after ──
update public.sambramo_procurement_policy p
   set classification = 'never',
       status = 'active',
       allow_incremental = false,
       allowed_methods = '{}',
       note = v.note
  from (values
    ('anchor_mc',                  'Labour'),
    ('dj_music',                   'Labour and own equipment'),
    ('photography',                'Albums and prints are bought after the event'),
    ('videography',                'Albums and media are bought after the event'),
    ('sound_av',                   'Own equipment'),
    ('security_services',          'Staffing'),
    ('valet_parking',              'Staffing'),
    ('transportation',             'Vehicle hire'),
    ('passenger_transport',        'Vehicle hire'),
    ('mini_truck_pickup',          'Vehicle hire'),
    ('medium_large_goods_vehicle', 'Vehicle hire'),
    ('loading_unloading_crew',     'Labour; packing materials are the hiring trade''s cost'),
    ('warehouse_storage',          'Space, not goods'),
    ('power_cooling',              'Fuel is a measured operating cost, handled separately'),
    ('safety_facilities',          'Own equipment; safety is never delayed on a payment'),
    ('venue',                      'Space; setup materials sit with the decorator'),
    ('event_equipment_rental',     'Reusable stock they already own'),
    ('end_to_end_event_logistics', 'Coordination; each supplying trade claims its own')
  ) as v(trade_id, note)
 where p.trade_id = v.trade_id and p.version = 1;

-- Anything the two lists missed stays 'never' and is still activated,
-- so advance_eligible() always has a definite answer for all 34 and
-- never silently falls through because a trade was renamed.
update public.sambramo_procurement_policy
   set classification = 'never', status = 'active',
       note = coalesce(note, 'Unclassified - defaulted to not eligible')
 where version = 1 and status = 'draft';

do $$
declare v_yes integer; v_no integer;
begin
  select count(*) filter (where classification <> 'never'),
         count(*) filter (where classification = 'never')
    into v_yes, v_no
    from public.sambramo_procurement_policy where status = 'active' and version = 1;
  raise notice 'materials advance: % trades eligible, % not', v_yes, v_no;
  if v_yes + v_no <> 34 then
    raise exception 'expected 34 active policies, found %', v_yes + v_no;
  end if;
end $$;

commit;
