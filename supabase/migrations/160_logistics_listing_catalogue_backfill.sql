-- 160 · 34-trade logistics listing catalogue backfill
--
-- Adds the eight current logistics trades and their 24 capability question
-- groups / 109 answers that were introduced after catalogue migration 107.
-- Existing ids are not renamed or deleted.
--
-- Apply after the existing catalogue seed.

BEGIN;

INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-027', 'End-to-End Event Logistics', 7, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-028', 'Event Equipment Rental', 8, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-029', 'Event Materials Supplier', 10, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-030', 'Loading & Unloading Crew', 15, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-031', 'Medium / Large Goods Vehicle', 16, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-032', 'Mini Truck / Pickup', 18, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-033', 'Passenger Transport', 20, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_trades (id, name, sort_order, is_active) VALUES ('SBM-TRD-034', 'Warehouse / Storage', 31, TRUE)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-069', 'event_logistics', 'SBM-TRD-027', 'End-to-end event logistics', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-070', 'event_equipment', 'SBM-TRD-028', 'Event operations equipment rental', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-071', 'event_materials', 'SBM-TRD-029', 'Bulk event materials', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-072', 'loading_crew', 'SBM-TRD-030', 'Loading & unloading crew', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-073', 'goods_vehicle', 'SBM-TRD-031', 'Medium / large goods vehicle', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-074', 'mini_truck', 'SBM-TRD-032', 'Mini truck / pickup', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-075', 'passenger_transport', 'SBM-TRD-033', 'Group passenger transport', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_services (id, service_key, trade_id, name, sort_order, is_active) VALUES ('SBM-SVC-076', 'warehouse_storage', 'SBM-TRD-034', 'Warehouse / storage', 0, TRUE)
  ON CONFLICT (id) DO UPDATE SET service_key = EXCLUDED.service_key, trade_id = EXCLUDED.trade_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-627', 'service:mini_truck', 'vehicle_class', 'Which small vehicles do you operate?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-627', 'tata_ace', 'Tata Ace / mini truck', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-627', 'bolero_pickup', 'Bolero / pickup', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-627', 'closed_mini', 'Closed-body mini truck', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-627', 'other', 'Other small goods vehicle', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-628', 'service:mini_truck', 'payload', 'Maximum payload you accept', NULL, 'one', TRUE, 'kg', 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-628', '500', 'Up to 500 kg', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-628', '750', 'Up to 750 kg', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-628', '1500', 'Up to 1.5 tonnes', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-629', 'service:mini_truck', 'cargo_types', 'What event cargo do you carry?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-629', 'decor', 'Décor and floral', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-629', 'food', 'Packed food and catering equipment', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-629', 'av', 'AV and event equipment', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-629', 'furniture', 'Chairs, tables and furniture', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-629', 'materials', 'Bulk event materials', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-630', 'service:goods_vehicle', 'vehicle_class', 'Which goods vehicles do you operate?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-630', '14ft', '14 ft', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-630', '17ft', '17 ft', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-630', '19ft', '19–20 ft', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-630', 'container', 'Closed container', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-630', 'other', 'Other medium/large vehicle', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-631', 'service:goods_vehicle', 'payload', 'Maximum payload you accept', NULL, 'one', TRUE, 'kg', 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-631', '2000', 'Up to 2 tonnes', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-631', '4000', 'Up to 4 tonnes', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-631', '7000', 'Up to 7 tonnes', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-631', '10000', '10 tonnes or more', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-632', 'service:goods_vehicle', 'handling', 'What special handling can you support?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-632', 'fragile', 'Fragile / secured cargo', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-632', 'oversize', 'Oversized event structures', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-632', 'heavy', 'Heavy equipment', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-632', 'closed', 'Closed-body protection', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-632', 'tail_lift', 'Tail lift / loading equipment', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-633', 'service:passenger_transport', 'vehicle_class', 'Which passenger vehicles do you provide?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-633', 'tempo', 'Tempo traveller', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-633', 'urbania', 'Force Urbania', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-633', 'minibus', 'Mini bus', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-633', 'bus', 'Large bus', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-633', 'fleet', 'Mixed fleet', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-634', 'service:passenger_transport', 'seats', 'Largest vehicle you can provide', NULL, 'one', TRUE, 'seats', 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-634', '9', 'Up to 9 seats', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-634', '17', 'Up to 17 seats', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-634', '26', 'Up to 26 seats', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-634', '33', 'Up to 33 seats', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-634', '45', '45+ seats', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-635', 'service:passenger_transport', 'amenities', 'What can the passenger vehicle provide?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-635', 'ac', 'Air conditioning', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-635', 'luggage', 'Dedicated luggage space', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-635', 'charging', 'Charging points', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-635', 'first_aid', 'First-aid kit', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-635', 'gps', 'GPS tracking', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-636', 'service:event_equipment', 'asset_types', 'What general event equipment do you rent?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-636', 'barriers', 'Crowd barriers', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-636', 'queue', 'Queue stanchions', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-636', 'tables', 'Utility tables', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-636', 'trolleys', 'Transport trolleys', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-636', 'racks', 'Display / storage racks', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-636', 'other', 'Other reusable event equipment', NULL, 5)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-637', 'service:event_equipment', 'condition', 'How do you maintain rental equipment?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-637', 'checked', 'Checked before every dispatch', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-637', 'scheduled', 'Scheduled maintenance', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-637', 'both', 'Both', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-638', 'service:event_equipment', 'setup', 'Do you deliver and set up?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-638', 'delivery', 'Delivery only', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-638', 'setup', 'Delivery + setup', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-638', 'pickup', 'Customer pickup', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-638', 'all', 'Delivery + setup + pickup', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-639', 'service:loading_crew', 'roles', 'What handling work can your crew do?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-639', 'loading', 'Loading', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-639', 'unloading', 'Unloading', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-639', 'movement', 'Internal movement', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-639', 'setup', 'Event setup / strike', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-639', 'packing', 'Packing / consolidation', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-640', 'service:loading_crew', 'crew_size', 'Largest crew you can deploy for one shift', NULL, 'one', TRUE, 'people', 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-640', '2', '2 people', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-640', '5', '3–5 people', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-640', '10', '6–10 people', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-640', '20', '11–20 people', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-640', 'more', 'More than 20', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-641', 'service:loading_crew', 'tools', 'What handling tools can you provide?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-641', 'trolley', 'Trolleys', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-641', 'dolly', 'Platform dolly', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-641', 'straps', 'Straps / securing gear', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-641', 'forklift', 'Forklift', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-641', 'none', 'Manpower only', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-642', 'service:warehouse_storage', 'storage_type', 'What storage can you provide?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-642', 'warehouse', 'General warehouse', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-642', 'self_storage', 'Lockable storage unit', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-642', 'covered', 'Covered event-material storage', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-642', 'yard', 'Secured yard / open storage', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-643', 'service:warehouse_storage', 'capacity', 'Maximum storage capacity available to an event client', NULL, 'one', TRUE, 'sq ft', 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-643', '100', 'Up to 100 sq ft', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-643', '500', 'Up to 500 sq ft', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-643', '2000', 'Up to 2,000 sq ft', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-643', '5000', 'Up to 5,000 sq ft', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-643', 'more', 'More than 5,000 sq ft', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-644', 'service:warehouse_storage', 'conditions', 'What storage conditions do you support?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-644', 'dry', 'Dry / weather protected', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-644', 'cctv', 'CCTV monitored', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-644', 'restricted', 'Restricted access', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-644', 'temperature', 'Temperature controlled', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-645', 'service:event_materials', 'material_types', 'What event materials do you supply?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-645', 'packing', 'Packing materials', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-645', 'print_raw', 'Paper / print inputs', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-645', 'floral_raw', 'Floral / decoration inputs', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-645', 'fabric', 'Textile / soft goods', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-645', 'consumables', 'Event consumables', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-645', 'hardware', 'Fixtures / hardware', NULL, 5)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-646', 'service:event_materials', 'stock', 'How is stock fulfilled?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-646', 'own_stock', 'Own stock', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-646', 'warehouse', 'Warehouse stock', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-646', 'supplier_network', 'Supplier network', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-646', 'custom_source', 'Custom sourcing', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-647', 'service:event_materials', 'custom', 'Can you source or produce custom quantities?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-647', 'catalogue', 'Catalogue quantities only', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-647', 'bulk', 'Bulk custom quantities', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-647', 'bespoke', 'Bespoke sourcing / production', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-648', 'service:event_logistics', 'project_scope', 'What parts of event logistics can you coordinate?', NULL, 'multi', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'pickup', 'Vendor pickups', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'consolidation', 'Consolidation', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'storage', 'Temporary storage', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'delivery', 'Venue delivery', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'setup', 'Setup / placement', NULL, 4)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'strike', 'Strike / reverse pickup', NULL, 5)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-648', 'crew', 'Loading crew', NULL, 6)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-649', 'service:event_logistics', 'network', 'Which resources do you own versus coordinate?', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-649', 'own', 'Own vehicles / crew / storage', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-649', 'mixed', 'Own + partner network', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-649', 'coordination', 'Partner network coordinated by us', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_questions (id, scope, group_key, question, hint, answer_type, takes_exact, exact_unit, sort_order) VALUES ('SBM-SPG-650', 'service:event_logistics', 'project_scale', 'Largest event logistics project you manage', NULL, 'one', FALSE, NULL, 0)
  ON CONFLICT (id) DO UPDATE SET scope = EXCLUDED.scope, group_key = EXCLUDED.group_key, question = EXCLUDED.question, hint = EXCLUDED.hint, answer_type = EXCLUDED.answer_type, takes_exact = EXCLUDED.takes_exact, exact_unit = EXCLUDED.exact_unit, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-650', 'single', 'Single venue', NULL, 0)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-650', 'multi', 'Multiple vendors, one venue', NULL, 1)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-650', 'multi_site', 'Multiple sites', NULL, 2)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;
INSERT INTO public.listing_answers (id, question_id, answer_key, label, scan, sort_order) VALUES (NULL, 'SBM-SPG-650', 'complex', 'Large / complex event project', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, answer_key = EXCLUDED.answer_key, label = EXCLUDED.label, scan = EXCLUDED.scan, sort_order = EXCLUDED.sort_order;

COMMIT;

-- Expected additions: 8 trades, 8 services, 24 questions, 109 answers.
