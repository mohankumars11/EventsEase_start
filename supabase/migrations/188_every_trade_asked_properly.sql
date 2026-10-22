-- ════════════════════════════════════════════════════════════════════════
-- 188 — Every trade asked properly: the new questions' typed columns
-- ════════════════════════════════════════════════════════════════════════
--
-- Thirty-three trades gained the questions a customer asks before they
-- book and that decide whether a booking can be priced and confirmed
-- without a phone call: how far a partner travels, how big a job they
-- can take, how long they need to set up, which languages their team
-- speaks, what they deliver. 113 questions in all.
--
-- The ANSWERS do not depend on this migration. They travel in the
-- listing's own specs and in sambramo_listing_versions.answers, exactly
-- as every other answer does, and the admin workspace selects * from
-- these tables — so nothing breaks before this is applied. What this
-- adds is the typed column beside each one, so the answers can be
-- queried and filtered like the rest of the profile.
--
-- Generated from the field-map diff (docs/partner-onboarding-field-map.json),
-- the same source 173-178 were generated from, with the same reserved-word
-- rule. Do not edit by hand: change the trade file and regenerate.
--
-- SAFE ON DATA: additive only. "add column if not exists" throughout, so
-- it is re-runnable. Nothing is altered or dropped.

begin;

alter table public.partner_dj_music_profiles
  add column if not exists sound_covers TEXT,
  add column if not exists settings     TEXT[],
  add column if not exists languages    TEXT[],
  add column if not exists emcee        BOOLEAN;

comment on column public.partner_dj_music_profiles.sound_covers is 'Your own sound system covers up to';

comment on column public.partner_dj_music_profiles.settings is 'Where you can play';

comment on column public.partner_dj_music_profiles.languages is 'Languages you can host and take requests in';

comment on column public.partner_dj_music_profiles.emcee is 'You can also host / emcee the night';

alter table public.partner_end_to_end_event_logistics_profiles
  add column if not exists max_guests        NUMERIC,
  add column if not exists vehicle_types     TEXT[],
  add column if not exists service_radius_km NUMERIC,
  add column if not exists overnight_setup   BOOLEAN,
  add column if not exists transit_insurance BOOLEAN;

comment on column public.partner_end_to_end_event_logistics_profiles.max_guests is 'Largest event you have run logistics for';

comment on column public.partner_end_to_end_event_logistics_profiles.vehicle_types is 'Vehicles you can deploy';

comment on column public.partner_end_to_end_event_logistics_profiles.service_radius_km is 'How far you take projects';

comment on column public.partner_end_to_end_event_logistics_profiles.overnight_setup is 'Overnight setup and teardown';

comment on column public.partner_end_to_end_event_logistics_profiles.transit_insurance is 'Goods-in-transit insurance';

alter table public.partner_event_equipment_rental_profiles
  add column if not exists events             TEXT[],
  add column if not exists delivery_radius_km NUMERIC,
  add column if not exists lead_hours         NUMERIC,
  add column if not exists same_day           BOOLEAN;

comment on column public.partner_event_equipment_rental_profiles.events is 'Events you rent for';

comment on column public.partner_event_equipment_rental_profiles.delivery_radius_km is 'How far you deliver';

comment on column public.partner_event_equipment_rental_profiles.lead_hours is 'Notice you need before delivery';

comment on column public.partner_event_equipment_rental_profiles.same_day is 'Same-day delivery possible';

alter table public.partner_event_lighting_profiles
  add column if not exists events            TEXT[],
  add column if not exists setup_hours       NUMERIC,
  add column if not exists backup_power      BOOLEAN,
  add column if not exists service_radius_km NUMERIC;

comment on column public.partner_event_lighting_profiles.events is 'Events you light';

comment on column public.partner_event_lighting_profiles.setup_hours is 'Setup time you need before the event';

comment on column public.partner_event_lighting_profiles.backup_power is 'You bring backup power for the lights';

comment on column public.partner_event_lighting_profiles.service_radius_km is 'How far you work from your base';

alter table public.partner_event_materials_supplier_profiles
  add column if not exists bulk           BOOLEAN,
  add column if not exists same_day       BOOLEAN,
  add column if not exists gst_invoice    BOOLEAN,
  add column if not exists returns_unused BOOLEAN;

comment on column public.partner_event_materials_supplier_profiles.bulk is 'You take bulk orders (1,000+ units)';

comment on column public.partner_event_materials_supplier_profiles.same_day is 'Same-day orders possible';

comment on column public.partner_event_materials_supplier_profiles.gst_invoice is 'You give a GST invoice';

comment on column public.partner_event_materials_supplier_profiles.returns_unused is 'Unopened stock can be returned';

alter table public.partner_gifts_favours_profiles
  add column if not exists occasions               TEXT[],
  add column if not exists personalisation_methods TEXT[],
  add column if not exists message_card            BOOLEAN;

comment on column public.partner_gifts_favours_profiles.occasions is 'Occasions you make gifts for';

comment on column public.partner_gifts_favours_profiles.personalisation_methods is 'Personalisation you can do';

comment on column public.partner_gifts_favours_profiles.message_card is 'You add a printed message card';

alter table public.partner_guest_services_profiles
  add column if not exists languages        TEXT[],
  add column if not exists attire           TEXT[],
  add column if not exists max_event_guests NUMERIC,
  add column if not exists grooming         BOOLEAN;

comment on column public.partner_guest_services_profiles.languages is 'Languages your staff speak';

comment on column public.partner_guest_services_profiles.attire is 'Attire you can provide';

comment on column public.partner_guest_services_profiles.max_event_guests is 'Largest event you have staffed';

comment on column public.partner_guest_services_profiles.grooming is 'Grooming and a pre-event briefing for every staff member';

alter table public.partner_invitation_printing_profiles
  add column if not exists card_styles        TEXT[],
  add column if not exists min_order          NUMERIC,
  add column if not exists home_delivery      BOOLEAN,
  add column if not exists guest_distribution BOOLEAN;

comment on column public.partner_invitation_printing_profiles.card_styles is 'Card styles you make';

comment on column public.partner_invitation_printing_profiles.min_order is 'Smallest printed order you take';

comment on column public.partner_invitation_printing_profiles.home_delivery is 'You deliver the printed cards to the family';

comment on column public.partner_invitation_printing_profiles.guest_distribution is 'You can courier or hand-deliver cards to guests';

alter table public.partner_live_entertainment_profiles
  add column if not exists events            TEXT[],
  add column if not exists own_sound         BOOLEAN,
  add column if not exists shows_per_day     NUMERIC,
  add column if not exists service_radius_km NUMERIC;

comment on column public.partner_live_entertainment_profiles.events is 'Events you perform at';

comment on column public.partner_live_entertainment_profiles.own_sound is 'You bring your own sound system';

comment on column public.partner_live_entertainment_profiles.shows_per_day is 'Most shows you can do in one day';

comment on column public.partner_live_entertainment_profiles.service_radius_km is 'How far you travel for a show';

alter table public.partner_loading_unloading_crew_profiles
  add column if not exists packing           BOOLEAN,
  add column if not exists assembly          BOOLEAN,
  add column if not exists same_day          BOOLEAN,
  add column if not exists service_radius_km NUMERIC;

comment on column public.partner_loading_unloading_crew_profiles.packing is 'You pack and wrap items';

comment on column public.partner_loading_unloading_crew_profiles.assembly is 'You assemble and dismantle furniture and stages';

comment on column public.partner_loading_unloading_crew_profiles.same_day is 'Same-day crew possible';

comment on column public.partner_loading_unloading_crew_profiles.service_radius_km is 'How far your crew travels';

alter table public.partner_medium_large_goods_vehicle_profiles
  add column if not exists night_movement    BOOLEAN,
  add column if not exists loading_crew      BOOLEAN,
  add column if not exists transit_insurance BOOLEAN,
  add column if not exists notice            TEXT;

comment on column public.partner_medium_large_goods_vehicle_profiles.night_movement is 'You run at night when city entry is restricted by day';

comment on column public.partner_medium_large_goods_vehicle_profiles.loading_crew is 'You can send a loading crew';

comment on column public.partner_medium_large_goods_vehicle_profiles.transit_insurance is 'Goods-in-transit insurance';

comment on column public.partner_medium_large_goods_vehicle_profiles.notice is 'Shortest notice you need';

alter table public.partner_mehendi_artist_profiles
  add column if not exists events          TEXT[],
  add column if not exists bridal_hours    NUMERIC,
  add column if not exists guests_per_hour NUMERIC,
  add column if not exists home_visit      BOOLEAN,
  add column if not exists aftercare       BOOLEAN;

comment on column public.partner_mehendi_artist_profiles.events is 'Events you do mehendi for';

comment on column public.partner_mehendi_artist_profiles.bridal_hours is 'Time for a full bridal mehendi';

comment on column public.partner_mehendi_artist_profiles.guests_per_hour is 'Guests one artist covers in an hour (simple design)';

comment on column public.partner_mehendi_artist_profiles.home_visit is 'Home visits';

comment on column public.partner_mehendi_artist_profiles.aftercare is 'You give aftercare for a deep colour';

alter table public.partner_mini_truck_pickup_profiles
  add column if not exists night_trips BOOLEAN,
  add column if not exists multi_stop  BOOLEAN,
  add column if not exists outstation  BOOLEAN,
  add column if not exists fragile     BOOLEAN;

comment on column public.partner_mini_truck_pickup_profiles.night_trips is 'Night trips (after 10 pm)';

comment on column public.partner_mini_truck_pickup_profiles.multi_stop is 'Multi-stop trips (pick up from several shops)';

comment on column public.partner_mini_truck_pickup_profiles.outstation is 'Outstation trips';

comment on column public.partner_mini_truck_pickup_profiles.fragile is 'You handle fragile loads (glass, cakes, decor)';

alter table public.partner_passenger_transport_profiles
  add column if not exists languages  TEXT[],
  add column if not exists uniformed  BOOLEAN,
  add column if not exists outstation BOOLEAN,
  add column if not exists late_night BOOLEAN;

comment on column public.partner_passenger_transport_profiles.languages is 'Languages your drivers speak';

comment on column public.partner_passenger_transport_profiles.uniformed is 'Drivers in uniform';

comment on column public.partner_passenger_transport_profiles.outstation is 'Outstation trips';

comment on column public.partner_passenger_transport_profiles.late_night is 'Late-night pickups (after 11 pm)';

alter table public.partner_photography_profiles
  add column if not exists languages       TEXT[],
  add column if not exists sneak_peek_days NUMERIC,
  add column if not exists same_day_edit   BOOLEAN,
  add column if not exists outstation      BOOLEAN;

comment on column public.partner_photography_profiles.languages is 'Languages you speak with families';

comment on column public.partner_photography_profiles.sneak_peek_days is 'Sneak-peek photos delivered within';

comment on column public.partner_photography_profiles.same_day_edit is 'Same-day edit slideshow at the reception';

comment on column public.partner_photography_profiles.outstation is 'You travel for destination / outstation shoots';

alter table public.partner_power_cooling_profiles
  add column if not exists largest_kva   NUMERIC,
  add column if not exists parallel      BOOLEAN,
  add column if not exists silent_canopy BOOLEAN,
  add column if not exists setup_hours   NUMERIC;

comment on column public.partner_power_cooling_profiles.largest_kva is 'Largest generator you can supply';

comment on column public.partner_power_cooling_profiles.parallel is 'You can run generators in sync (parallel)';

comment on column public.partner_power_cooling_profiles.silent_canopy is 'CPCB-compliant silent canopies';

comment on column public.partner_power_cooling_profiles.setup_hours is 'Setup time you need before the event';

alter table public.partner_priest_rituals_profiles
  add column if not exists years         NUMERIC,
  add column if not exists online_puja   BOOLEAN,
  add column if not exists horoscope     BOOLEAN,
  add column if not exists prasadam_cook BOOLEAN;

comment on column public.partner_priest_rituals_profiles.years is 'Years performing ceremonies';

comment on column public.partner_priest_rituals_profiles.online_puja is 'Online / video-call puja for families abroad';

comment on column public.partner_priest_rituals_profiles.horoscope is 'Horoscope matching';

comment on column public.partner_priest_rituals_profiles.prasadam_cook is 'You can arrange a cook for prasadam';

alter table public.partner_safety_facilities_profiles
  add column if not exists ambulance        BOOLEAN,
  add column if not exists medical_staff    BOOLEAN,
  add column if not exists permissions_help BOOLEAN,
  add column if not exists setup_hours      NUMERIC;

comment on column public.partner_safety_facilities_profiles.ambulance is 'Ambulance on standby available';

comment on column public.partner_safety_facilities_profiles.medical_staff is 'Paramedic or nurse on site available';

comment on column public.partner_safety_facilities_profiles.permissions_help is 'You help with fire and police permissions';

comment on column public.partner_safety_facilities_profiles.setup_hours is 'Setup time you need before the event';

alter table public.partner_security_services_profiles
  add column if not exists police_liaison BOOLEAN,
  add column if not exists lady_guards    NUMERIC,
  add column if not exists ex_servicemen  BOOLEAN;

comment on column public.partner_security_services_profiles.police_liaison is 'You coordinate with local police for the event';

comment on column public.partner_security_services_profiles.lady_guards is 'Lady guards available';

comment on column public.partner_security_services_profiles.ex_servicemen is 'Ex-servicemen on your team';

alter table public.partner_sound_av_profiles
  add column if not exists brands            TEXT[],
  add column if not exists events            TEXT[],
  add column if not exists backup            BOOLEAN,
  add column if not exists setup_hours       NUMERIC,
  add column if not exists service_radius_km NUMERIC;

comment on column public.partner_sound_av_profiles.brands is 'Brands in your inventory';

comment on column public.partner_sound_av_profiles.events is 'Events you supply for';

comment on column public.partner_sound_av_profiles.backup is 'A backup mixer and mics stay on site';

comment on column public.partner_sound_av_profiles.setup_hours is 'Setup time you need before the event';

comment on column public.partner_sound_av_profiles.service_radius_km is 'How far you work from your base';

alter table public.partner_tent_furniture_profiles
  add column if not exists largest_structure_sqft NUMERIC,
  add column if not exists max_seated_guests      NUMERIC,
  add column if not exists setup_hours            NUMERIC,
  add column if not exists fire_retardant         BOOLEAN,
  add column if not exists ac_tents               BOOLEAN;

comment on column public.partner_tent_furniture_profiles.largest_structure_sqft is 'Largest structure you can put up';

comment on column public.partner_tent_furniture_profiles.max_seated_guests is 'Most guests you can seat';

comment on column public.partner_tent_furniture_profiles.setup_hours is 'Setup time you need';

comment on column public.partner_tent_furniture_profiles.fire_retardant is 'Fire-retardant fabric';

comment on column public.partner_tent_furniture_profiles.ac_tents is 'Air-conditioned tents available';

alter table public.partner_transportation_profiles
  add column if not exists vehicle_types     TEXT[],
  add column if not exists service_radius_km NUMERIC,
  add column if not exists live_tracking     BOOLEAN;

comment on column public.partner_transportation_profiles.vehicle_types is 'Vehicle types you can arrange';

comment on column public.partner_transportation_profiles.service_radius_km is 'How far you operate from your base';

comment on column public.partner_transportation_profiles.live_tracking is 'Live vehicle tracking shared with the customer';

alter table public.partner_trousseau_gift_packing_profiles
  add column if not exists min_order_sets NUMERIC,
  add column if not exists rental_trays   BOOLEAN,
  add column if not exists venue_display  BOOLEAN;

comment on column public.partner_trousseau_gift_packing_profiles.min_order_sets is 'Smallest order you take';

comment on column public.partner_trousseau_gift_packing_profiles.rental_trays is 'Returnable rental trays and baskets';

comment on column public.partner_trousseau_gift_packing_profiles.venue_display is 'You arrange the trousseau display at the venue';

alter table public.partner_valet_parking_profiles
  add column if not exists max_cars       NUMERIC,
  add column if not exists luxury_trained BOOLEAN,
  add column if not exists key_tracking   BOOLEAN,
  add column if not exists remote_shuttle BOOLEAN;

comment on column public.partner_valet_parking_profiles.max_cars is 'Most cars handled at one event';

comment on column public.partner_valet_parking_profiles.luxury_trained is 'Drivers trained for luxury, automatic and EV cars';

comment on column public.partner_valet_parking_profiles.key_tracking is 'Digital key tracking (token or app)';

comment on column public.partner_valet_parking_profiles.remote_shuttle is 'Shuttle from a remote parking lot';

alter table public.partner_venue_profiles
  add column if not exists events              TEXT[],
  add column if not exists dining_capacity     NUMERIC,
  add column if not exists two_wheeler_parking NUMERIC,
  add column if not exists early_muhurtha      BOOLEAN,
  add column if not exists overnight_stay      BOOLEAN;

comment on column public.partner_venue_profiles.events is 'Events you host';

comment on column public.partner_venue_profiles.dining_capacity is 'Dining capacity (seated at one time)';

comment on column public.partner_venue_profiles.two_wheeler_parking is 'Two-wheeler parking';

comment on column public.partner_venue_profiles.early_muhurtha is 'Early-morning muhurtha bookings (before 6 am)';

comment on column public.partner_venue_profiles.overnight_stay is 'Guests can stay overnight';

alter table public.partner_videography_profiles
  add column if not exists deliverables  TEXT[],
  add column if not exists languages     TEXT[],
  add column if not exists same_day_edit BOOLEAN,
  add column if not exists outstation    BOOLEAN;

comment on column public.partner_videography_profiles.deliverables is 'Deliverables you offer';

comment on column public.partner_videography_profiles.languages is 'Languages you speak with families';

comment on column public.partner_videography_profiles.same_day_edit is 'Same-day edit shown at the reception';

comment on column public.partner_videography_profiles.outstation is 'You travel for destination / outstation shoots';

alter table public.partner_warehouse_storage_profiles
  add column if not exists ceiling_ft         NUMERIC,
  add column if not exists truck_access       BOOLEAN,
  add column if not exists round_clock_access BOOLEAN,
  add column if not exists inventory_online   BOOLEAN;

comment on column public.partner_warehouse_storage_profiles.ceiling_ft is 'Clear ceiling height';

comment on column public.partner_warehouse_storage_profiles.truck_access is 'A truck can reach the loading door';

comment on column public.partner_warehouse_storage_profiles.round_clock_access is 'Access at any hour';

comment on column public.partner_warehouse_storage_profiles.inventory_online is 'Inventory list and photos shared online';

alter table public.partner_wedding_planning_profiles
  add column if not exists wedding_styles TEXT[],
  add column if not exists max_guests     NUMERIC,
  add column if not exists languages      TEXT[],
  add column if not exists vendor_network BOOLEAN;

comment on column public.partner_wedding_planning_profiles.wedding_styles is 'Wedding traditions you plan';

comment on column public.partner_wedding_planning_profiles.max_guests is 'Largest wedding you have planned';

comment on column public.partner_wedding_planning_profiles.languages is 'Languages your team works in';

comment on column public.partner_wedding_planning_profiles.vendor_network is 'You bring your own trusted vendor network';

commit;

-- ── verify ───────────────────────────────────────────────────────────
-- Expect 113.
select count(*) as new_columns
  from information_schema.columns
 where table_schema = 'public'
   and (table_name, column_name) in (
     ('partner_dj_music_profiles', 'sound_covers'),
     ('partner_dj_music_profiles', 'settings'),
     ('partner_dj_music_profiles', 'languages'),
     ('partner_dj_music_profiles', 'emcee'),
     ('partner_end_to_end_event_logistics_profiles', 'max_guests'),
     ('partner_end_to_end_event_logistics_profiles', 'vehicle_types'),
     ('partner_end_to_end_event_logistics_profiles', 'service_radius_km'),
     ('partner_end_to_end_event_logistics_profiles', 'overnight_setup'),
     ('partner_end_to_end_event_logistics_profiles', 'transit_insurance'),
     ('partner_event_equipment_rental_profiles', 'events'),
     ('partner_event_equipment_rental_profiles', 'delivery_radius_km'),
     ('partner_event_equipment_rental_profiles', 'lead_hours'),
     ('partner_event_equipment_rental_profiles', 'same_day'),
     ('partner_event_lighting_profiles', 'events'),
     ('partner_event_lighting_profiles', 'setup_hours'),
     ('partner_event_lighting_profiles', 'backup_power'),
     ('partner_event_lighting_profiles', 'service_radius_km'),
     ('partner_event_materials_supplier_profiles', 'bulk'),
     ('partner_event_materials_supplier_profiles', 'same_day'),
     ('partner_event_materials_supplier_profiles', 'gst_invoice'),
     ('partner_event_materials_supplier_profiles', 'returns_unused'),
     ('partner_gifts_favours_profiles', 'occasions'),
     ('partner_gifts_favours_profiles', 'personalisation_methods'),
     ('partner_gifts_favours_profiles', 'message_card'),
     ('partner_guest_services_profiles', 'languages'),
     ('partner_guest_services_profiles', 'attire'),
     ('partner_guest_services_profiles', 'max_event_guests'),
     ('partner_guest_services_profiles', 'grooming'),
     ('partner_invitation_printing_profiles', 'card_styles'),
     ('partner_invitation_printing_profiles', 'min_order'),
     ('partner_invitation_printing_profiles', 'home_delivery'),
     ('partner_invitation_printing_profiles', 'guest_distribution'),
     ('partner_live_entertainment_profiles', 'events'),
     ('partner_live_entertainment_profiles', 'own_sound'),
     ('partner_live_entertainment_profiles', 'shows_per_day'),
     ('partner_live_entertainment_profiles', 'service_radius_km'),
     ('partner_loading_unloading_crew_profiles', 'packing'),
     ('partner_loading_unloading_crew_profiles', 'assembly'),
     ('partner_loading_unloading_crew_profiles', 'same_day'),
     ('partner_loading_unloading_crew_profiles', 'service_radius_km'),
     ('partner_medium_large_goods_vehicle_profiles', 'night_movement'),
     ('partner_medium_large_goods_vehicle_profiles', 'loading_crew'),
     ('partner_medium_large_goods_vehicle_profiles', 'transit_insurance'),
     ('partner_medium_large_goods_vehicle_profiles', 'notice'),
     ('partner_mehendi_artist_profiles', 'events'),
     ('partner_mehendi_artist_profiles', 'bridal_hours'),
     ('partner_mehendi_artist_profiles', 'guests_per_hour'),
     ('partner_mehendi_artist_profiles', 'home_visit'),
     ('partner_mehendi_artist_profiles', 'aftercare'),
     ('partner_mini_truck_pickup_profiles', 'night_trips'),
     ('partner_mini_truck_pickup_profiles', 'multi_stop'),
     ('partner_mini_truck_pickup_profiles', 'outstation'),
     ('partner_mini_truck_pickup_profiles', 'fragile'),
     ('partner_passenger_transport_profiles', 'languages'),
     ('partner_passenger_transport_profiles', 'uniformed'),
     ('partner_passenger_transport_profiles', 'outstation'),
     ('partner_passenger_transport_profiles', 'late_night'),
     ('partner_photography_profiles', 'languages'),
     ('partner_photography_profiles', 'sneak_peek_days'),
     ('partner_photography_profiles', 'same_day_edit'),
     ('partner_photography_profiles', 'outstation'),
     ('partner_power_cooling_profiles', 'largest_kva'),
     ('partner_power_cooling_profiles', 'parallel'),
     ('partner_power_cooling_profiles', 'silent_canopy'),
     ('partner_power_cooling_profiles', 'setup_hours'),
     ('partner_priest_rituals_profiles', 'years'),
     ('partner_priest_rituals_profiles', 'online_puja'),
     ('partner_priest_rituals_profiles', 'horoscope'),
     ('partner_priest_rituals_profiles', 'prasadam_cook'),
     ('partner_safety_facilities_profiles', 'ambulance'),
     ('partner_safety_facilities_profiles', 'medical_staff'),
     ('partner_safety_facilities_profiles', 'permissions_help'),
     ('partner_safety_facilities_profiles', 'setup_hours'),
     ('partner_security_services_profiles', 'police_liaison'),
     ('partner_security_services_profiles', 'lady_guards'),
     ('partner_security_services_profiles', 'ex_servicemen'),
     ('partner_sound_av_profiles', 'brands'),
     ('partner_sound_av_profiles', 'events'),
     ('partner_sound_av_profiles', 'backup'),
     ('partner_sound_av_profiles', 'setup_hours'),
     ('partner_sound_av_profiles', 'service_radius_km'),
     ('partner_tent_furniture_profiles', 'largest_structure_sqft'),
     ('partner_tent_furniture_profiles', 'max_seated_guests'),
     ('partner_tent_furniture_profiles', 'setup_hours'),
     ('partner_tent_furniture_profiles', 'fire_retardant'),
     ('partner_tent_furniture_profiles', 'ac_tents'),
     ('partner_transportation_profiles', 'vehicle_types'),
     ('partner_transportation_profiles', 'service_radius_km'),
     ('partner_transportation_profiles', 'live_tracking'),
     ('partner_trousseau_gift_packing_profiles', 'min_order_sets'),
     ('partner_trousseau_gift_packing_profiles', 'rental_trays'),
     ('partner_trousseau_gift_packing_profiles', 'venue_display'),
     ('partner_valet_parking_profiles', 'max_cars'),
     ('partner_valet_parking_profiles', 'luxury_trained'),
     ('partner_valet_parking_profiles', 'key_tracking'),
     ('partner_valet_parking_profiles', 'remote_shuttle'),
     ('partner_venue_profiles', 'events'),
     ('partner_venue_profiles', 'dining_capacity'),
     ('partner_venue_profiles', 'two_wheeler_parking'),
     ('partner_venue_profiles', 'early_muhurtha'),
     ('partner_venue_profiles', 'overnight_stay'),
     ('partner_videography_profiles', 'deliverables'),
     ('partner_videography_profiles', 'languages'),
     ('partner_videography_profiles', 'same_day_edit'),
     ('partner_videography_profiles', 'outstation'),
     ('partner_warehouse_storage_profiles', 'ceiling_ft'),
     ('partner_warehouse_storage_profiles', 'truck_access'),
     ('partner_warehouse_storage_profiles', 'round_clock_access'),
     ('partner_warehouse_storage_profiles', 'inventory_online'),
     ('partner_wedding_planning_profiles', 'wedding_styles'),
     ('partner_wedding_planning_profiles', 'max_guests'),
     ('partner_wedding_planning_profiles', 'languages'),
     ('partner_wedding_planning_profiles', 'vendor_network')
   );
