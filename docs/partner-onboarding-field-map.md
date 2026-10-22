# Partner onboarding field map

**Generated** by `scripts/build-onboarding-field-map.mjs` from `src/data/trades/*.js`.
Do not edit by hand — re-run the script after changing a trade spec.

## Totals

- Trades: **34**
- Onboarding questions (profile screens): **381**
- Catalogue sub-form fields (repeating items): **250**
- Required questions: **158**
- Conditional questions: **17**
- Trades with a catalogue sub-form: **24**

## Where answers live today

Every answer on every trade is stored in one of two JSONB columns:

| Stage | Table | Column |
|---|---|---|
| In progress | `sambramo_listing_drafts` | `data` (jsonb) |
| Submitted | `vendor_services` | `specs` (jsonb) |

There is no typed column for any of them. `sambramo_canonical_fields` types only 17
field ids and those are **booking-time** fields (`guest_count`, `duration_hours`), not
onboarding answers.

## Per trade

### anchor_mc

`anchor_mc.js` · 0 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|

### bar_beverages

`bar_beverages.js` · 17 profile questions · 11 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `display_name` | What name should customers see? | text | `TEXT` | yes | max 60 |  |
| profile | `service_lines` | Which of these do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `supply_scope` | Do you supply the goods, the staff, the equipment, or a combination? | single | `TEXT` | yes |  |  |
| profile | `supply_scope_custom` | Describe your combination | textarea | `TEXT` |  | max 300 | supply_scope in [custom_combination] |
| profile | `events` | Which events do you serve? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `guests_per_hour` | How many guests can you serve per hour? | number | `NUMERIC` | yes | min 10, max 5000, unit guests / hour |  |
| setup | `counters` | How many counters or stations can you supply? | number | `NUMERIC` | yes | min 0, max 50 |  |
| setup | `staff` | How many staff can you provide? | number | `NUMERIC` | yes | min 0, max 200 |  |
| setup | `glassware_included` | Are glasses, cups or bowls included? | toggle | `BOOLEAN` |  |  |  |
| setup | `ice_included` | Is ice included? | toggle | `BOOLEAN` |  |  |  |
| setup | `garnish_included` | Are garnishes or toppings included? | toggle | `BOOLEAN` |  |  |  |
| setup | `setup_teardown_included` | Is setup and teardown included? | toggle | `BOOLEAN` |  |  |  |
| setup | `needs_water_power` | Is a water supply or power source required at the venue? | toggle | `BOOLEAN` |  |  |  |
| setup | `own_cold_storage` | Do you have your own cold storage facility? | toggle | `BOOLEAN` |  |  |  |
| setup | `freezer_capacity_litres` | Freezer capacity you can bring | number | `NUMERIC` |  | min 0, max 100000, unit litres | own_cold_storage is set |
| setup | `backup_power` | Do you bring backup power for the cold chain? | toggle | `BOOLEAN` |  |  |  |
| setup | `cold_hold_hours` | How long can you hold goods cold at a venue? | number | `NUMERIC` |  | min 0, max 72, unit hours |  |
| catalogue/items | `name` | Item name | text | `TEXT` |  | max 60 |  |
| catalogue/items | `category` | Category | single | `TEXT` | yes | allows "other" |  |
| catalogue/items | `description` | Description | textarea | `TEXT` |  | max 200 |  |
| catalogue/items | `serving_size` | Serving or unit size | text | `TEXT` | yes | max 40 |  |
| catalogue/items | `unit_price` | Price per serving or unit | money | `BIGINT` | yes |  |  |
| catalogue/items | `min_order` | Minimum order | number | `NUMERIC` |  | min 0, max 100000 |  |
| catalogue/items | `allergens` | Ingredients / allergens | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/items | `qty_available` | How many you can supply per event | number | `NUMERIC` |  | min 1, max 1000000 |  |
| catalogue/items | `prep_minutes` | Preparation or serving time | number | `NUMERIC` |  | min 0, max 240, unit minutes |  |
| catalogue/items | `staff_equipment_included` | Staff and equipment included in this price? | toggle | `BOOLEAN` |  |  |  |
| catalogue/items | `needs_freezer` | Does this item need freezing or chilling at the venue? | toggle | `BOOLEAN` |  |  |  |

### bridal_makeup_hair

`bridal_makeup_hair.js` · 6 profile questions · 9 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services_offered` | What makeup and hair services do you offer? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `styles` | Which styles can customers choose? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `who` | Do you offer bridal, family and guest services? | multi | `TEXT[]` | yes |  |  |
| profile | `people_per_day` | How many people can you serve on the same day? | number | `NUMERIC` | yes | min 1, max 100 |  |
| profile | `travels_to_venue` | Do you travel to the customer's venue? | toggle | `BOOLEAN` |  |  |  |
| profile | `trial_available` | Do you provide a trial session? | toggle | `BOOLEAN` |  |  |  |
| catalogue/services | `service` | Service | single | `TEXT` | yes | allows "other" |  |
| catalogue/services | `duration_minutes` | How long it takes | number | `NUMERIC` | yes | min 10, max 600, unit minutes |  |
| catalogue/services | `deliverables` | What the customer gets | multi | `TEXT[]` | yes | allows "other" |  |
| catalogue/services | `materials_included` | Products included | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/services | `customisations` | What can the customer ask you to change? | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/services | `artists` | Artists needed | number | `NUMERIC` | yes | min 1, max 10 |  |
| catalogue/services | `travel_applies` | Travel charge applies to this service? | toggle | `BOOLEAN` |  |  |  |
| catalogue/services | `price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/services | `price_unit` | Charged | single | `TEXT` | yes |  |  |

### cake_desserts

`cake_desserts.js` · 12 profile questions · 11 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `product_types` | What types of cakes and desserts do you make? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `flavours` | Which flavours do you offer? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `sizes` | Which sizes or serving counts can customers order? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `dietary` | Which dietary options can you support? | multi | `TEXT[]` |  | allows "other" |  |
| profile | `lead_days` | How many days in advance do you need an order? | number | `NUMERIC` | yes | min 0, max 60, unit days |  |
| customisation | `design_choice` | Can customers choose a design or theme? | toggle | `BOOLEAN` |  |  |  |
| customisation | `reference_upload` | Can they upload reference images? | toggle | `BOOLEAN` |  |  |  |
| customisation | `name_message` | Can they add a name or message? | toggle | `BOOLEAN` |  |  |  |
| customisation | `figurines` | Are figurines or special decorations available? | toggle | `BOOLEAN` |  |  |  |
| customisation | `tasting` | Is a tasting session available? | toggle | `BOOLEAN` |  |  |  |
| customisation | `custom_design_fee` | Do you charge a custom design fee? | toggle | `BOOLEAN` |  |  |  |
| customisation | `custom_design_fee_amount` | Custom design fee | money | `BIGINT` |  |  | custom_design_fee is set |
| catalogue/products | `name` | Product name | text | `TEXT` |  | max 60 |  |
| catalogue/products | `product_type` | Type | single | `TEXT` | yes | allows "other" |  |
| catalogue/products | `flavour` | Flavour | multi | `TEXT[]` | yes | allows "other" |  |
| catalogue/products | `size` | Size or weight | single | `TEXT` | yes | allows "other" |  |
| catalogue/products | `servings` | Serves | number | `NUMERIC` | yes | min 1, max 5000, unit people |  |
| catalogue/products | `price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/products | `price_unit` | Charged | single | `TEXT` | yes |  |  |
| catalogue/products | `min_order` | Minimum order | number | `NUMERIC` |  | min 1, max 10000 |  |
| catalogue/products | `allergens` | Ingredients / allergens | multi | `TEXT[]` | yes | allows "other" |  |
| catalogue/products | `lead_days` | Production lead time | number | `NUMERIC` | yes | min 0, max 60, unit days |  |
| catalogue/products | `photos` | Photos | photos | `TEXT[]` |  | min 1, max 4 |  |

### catering_food

`catering_food.js` · 12 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services` | What catering services do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `prep_location` | Where is your food prepared? | single | `TEXT` | yes |  |  |
| profile | `service_styles` | How do you serve food? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `service_area` | Where can you provide catering? | single | `TEXT` |  |  |  |
| capacity | `max_guests` | Most guests at one event | number | `NUMERIC` | yes | min 10, max 100000 |  |
| capacity | `guests_per_day` | Total guests you can cook for in a day | number | `NUMERIC` | yes | min 10, max 100000 |  |
| capacity | `events_per_day` | Events you can cater on the same day | number | `NUMERIC` | yes | min 1, max 20 |  |
| capacity | `staff` | Serving staff available | number | `NUMERIC` | yes | min 1, max 2000 |  |
| capacity | `staff_per_100` | Serving staff per 100 guests | number | `NUMERIC` |  | min 0, max 50 |  |
| capacity | `service_hours` | Service hours included per event | number | `NUMERIC` |  | min 1, max 24, unit hours |  |
| pricing_rules | `min_billable_guests` | Minimum billable guests | number | `NUMERIC` | yes | min 1, max 10000 |  |
| pricing_rules | `child_policy` | Children | single | `TEXT` | yes |  |  |

### decoration_floral

`decoration_floral.js` · 21 profile questions · 16 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services` | What decoration work do you take on? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `themes` | Which themes and styles do you offer? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Which events do you decorate? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `flowers` | Do you use fresh flowers, artificial flowers or both? | single | `TEXT` | yes |  |  |
| profile | `flower_types` | Which flowers do you work with? | multi | `TEXT[]` |  | allows "other" | flowers in [fresh\|both] |
| profile | `flower_sourcing` | Where do your flowers come from? | single | `TEXT` |  | allows "other" | flowers in [fresh\|both] |
| profile | `props` | What do you build with? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `custom_designs` | Do you offer custom designs? | toggle | `BOOLEAN` |  |  |  |
| profile | `setup_dismantle` | Do you handle setup and dismantling? | toggle | `BOOLEAN` |  |  |  |
| profile | `site_visit` | Do you do a site visit before the event? | toggle | `BOOLEAN` |  |  |  |
| profile | `design_mockup` | Do you share a design or mock-up before the day? | toggle | `BOOLEAN` |  |  |  |
| scale | `venues` | Which venues do you work in? | multi | `TEXT[]` | yes | allows "other" |  |
| scale | `max_area_sqft` | Largest area you can decorate | number | `NUMERIC` | yes | min 100, max 500000, unit sq ft |  |
| scale | `max_stage_sqft` | Largest stage you can build | number | `NUMERIC` |  | min 0, max 20000, unit sq ft |  |
| scale | `max_height_ft` | Tallest structure you can put up | number | `NUMERIC` |  | min 0, max 200, unit ft |  |
| scale | `install_hours_before` | How long before the event do you need the venue? | number | `NUMERIC` | yes | min 1, max 120, unit hours |  |
| scale | `overnight_install` | Can you install overnight? | toggle | `BOOLEAN` |  |  |  |
| scale | `same_day_turnaround` | Can you set up and clear on the same day? | toggle | `BOOLEAN` |  |  |  |
| scale | `access_needs` | What do you need at the venue? | multi | `TEXT[]` |  | allows "other" |  |
| scale | `travel_radius_km` | How far do you travel? | number | `NUMERIC` |  | min 0, max 2000, unit km |  |
| scale | `outstation` | Do you take outstation and destination events? | toggle | `BOOLEAN` |  |  |  |
| catalogue/packages | `name` | Name | text | `TEXT` |  | max 60 |  |
| catalogue/packages | `kind` | What is this? | single | `TEXT` | yes | allows "other" |  |
| catalogue/packages | `areas` | Areas included | multi | `TEXT[]` |  | allows "other" | kind in [full_package] |
| catalogue/packages | `includes` | What the customer gets | multi | `TEXT[]` | yes | allows "other" |  |
| catalogue/packages | `flowers` | Flowers used | single | `TEXT` | yes |  |  |
| catalogue/packages | `flower_types` | Which flowers | multi | `TEXT[]` |  | allows "other" | flowers in [fresh\|mixed] |
| catalogue/packages | `size` | Size | dimensions | `JSONB` |  |  |  |
| catalogue/packages | `guest_capacity` | Suits up to | number | `NUMERIC` |  | min 10, max 100000, unit guests |  |
| catalogue/packages | `price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/packages | `price_unit` | Charged | single | `TEXT` | yes |  |  |
| catalogue/packages | `min_order` | Minimum order | number | `NUMERIC` |  | min 1, max 10000 |  |
| catalogue/packages | `setup_hours` | Setup time | number | `NUMERIC` | yes | min 1, max 72, unit hours |  |
| catalogue/packages | `crew_needed` | Crew needed | number | `NUMERIC` |  | min 1, max 200 |  |
| catalogue/packages | `lead_days` | Notice you need for this | number | `NUMERIC` |  | min 0, max 90, unit days |  |
| catalogue/packages | `dismantle_included` | Dismantling included in this price? | toggle | `BOOLEAN` |  |  |  |
| catalogue/packages | `photos` | Photos of this setup | photos | `TEXT[]` |  | min 1, max 6 |  |

### dj_music

`dj_music.js` · 17 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `performance_kinds` | What kind of music performances do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `event_types` | Which event types do you support? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `styles` | Which music styles do you play? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `performers` | How many performers can you provide? | number | `NUMERIC` | yes | min 1, max 30 |  |
| profile | `own_equipment` | Do you supply your own sound and lighting equipment? | single | `TEXT` | yes |  |  |
| profile | `sound_covers` | Your own sound system covers up to | single | `TEXT` |  |  | own_equipment in [sound_and_lighting\|sound_only] |
| profile | `settings` | Where you can play | multi | `TEXT[]` |  | allows "other" |  |
| profile | `languages` | Languages you can host and take requests in | multi | `TEXT[]` |  | allows "other" |  |
| profile | `emcee` | You can also host / emcee the night | toggle | `BOOLEAN` |  |  |  |
| performance | `formats` | Performance format | multi | `TEXT[]` | yes | allows "other" |  |
| performance | `duration_options` | Duration options | multi | `TEXT[]` | yes |  |  |
| performance | `setup_minutes` | Setup / soundcheck time | number | `NUMERIC` | yes | min 0, max 300, unit minutes |  |
| performance | `equipment_included` | Equipment included | textarea | `TEXT` |  | max 300 |  |
| performance | `power_needs` | Power requirements | text | `TEXT` |  | max 80 |  |
| performance | `space_needs` | Space / stage requirements | text | `TEXT` |  | max 80 |  |
| performance | `song_requests` | Takes playlist / custom song requests | toggle | `BOOLEAN` |  |  |  |
| performance | `special_production` | Special production requirements | textarea | `TEXT` |  | max 200 |  |

### end_to_end_event_logistics

`end_to_end_event_logistics.js` · 10 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| scope | `scope` | What parts of event logistics can you manage? | multi | `TEXT[]` | yes | allows "other" |  |
| scope | `delivered_by` | Who performs this work? | single | `TEXT` | yes |  |  |
| scope | `own_vehicles` | Vehicles you operate | number | `NUMERIC` |  | min 0, max 500 |  |
| scope | `own_staff` | Staff you employ | number | `NUMERIC` |  | min 0, max 5000 |  |
| scope | `max_concurrent_projects` | Projects you can run at the same time | number | `NUMERIC` | yes | min 1, max 100 |  |
| scope | `max_guests` | Largest event you have run logistics for | number | `NUMERIC` |  | min 10, max 500000, unit guests |  |
| scope | `vehicle_types` | Vehicles you can deploy | multi | `TEXT[]` |  | allows "other" |  |
| scope | `service_radius_km` | How far you take projects | number | `NUMERIC` |  | min 5, max 3000, unit km |  |
| scope | `overnight_setup` | Overnight setup and teardown | toggle | `BOOLEAN` |  |  |  |
| scope | `transit_insurance` | Goods-in-transit insurance | toggle | `BOOLEAN` |  |  |  |

### event_equipment_rental

`event_equipment_rental.js` · 13 profile questions · 11 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `equipment_types` | Which equipment types are available? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Events you rent for | multi | `TEXT[]` |  | allows "other" |  |
| profile | `delivery_radius_km` | How far you deliver | number | `NUMERIC` |  | min 0, max 1000, unit km |  |
| profile | `lead_hours` | Notice you need before delivery | number | `NUMERIC` |  | min 0, max 720, unit hours |  |
| profile | `same_day` | Same-day delivery possible | toggle | `BOOLEAN` |  |  |  |
| terms | `min_period` | Minimum rental period | single | `TEXT` | yes |  |  |
| terms | `max_period` | Maximum rental period | single | `TEXT` |  |  |  |
| terms | `handover` | Delivery / pickup options | multi | `TEXT[]` | yes |  |  |
| terms | `setup_offered` | You offer setup and dismantling | toggle | `BOOLEAN` |  |  |  |
| terms | `deposit` | Security deposit (refundable) | money | `BIGINT` |  |  |  |
| terms | `damage_policy` | Damage / loss policy | textarea | `TEXT` | yes | max 400 |  |
| terms | `late_fee` | Late-return charge per day | money | `BIGINT` |  |  |  |
| terms | `cleaning_fee` | Cleaning fee | money | `BIGINT` |  |  |  |
| catalogue/items | `name` | Item name | text | `TEXT` | yes | max 60 |  |
| catalogue/items | `sku` | SKU / code | text | `TEXT` |  | max 30 |  |
| catalogue/items | `description` | Description | textarea | `TEXT` |  | max 200 |  |
| catalogue/items | `photos` | Photo | photos | `TEXT[]` |  | min 1, max 4 |  |
| catalogue/items | `total_qty` | Total quantity | number | `NUMERIC` | yes | min 1, max 100000 |  |
| catalogue/items | `condition` | Condition | single | `TEXT` | yes |  |  |
| catalogue/items | `rate` | Rental rate | money | `BIGINT` | yes |  |  |
| catalogue/items | `rate_period` | Per | single | `TEXT` | yes |  |  |
| catalogue/items | `replacement_value` | Replacement value | money | `BIGINT` |  |  |  |
| catalogue/items | `delivery_restrictions` | Delivery restrictions | text | `TEXT` |  | max 100 |  |
| catalogue/items | `needs_operator` | Needs an operator / installer | toggle | `BOOLEAN` |  |  |  |

### event_lighting

`event_lighting.js` · 14 profile questions · 7 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `service_types` | Which lighting services do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Events you light | multi | `TEXT[]` |  | allows "other" |  |
| profile | `suitability` | Indoor / outdoor | multi | `TEXT[]` | yes |  |  |
| profile | `coverage_sqft` | Largest area you can light | number | `NUMERIC` |  | min 100, max 1000000, unit sq ft |  |
| profile | `rigging` | You handle rigging (truss, hanging) | toggle | `BOOLEAN` |  |  |  |
| profile | `power_needs` | Power requirements | text | `TEXT` | yes | max 80 |  |
| profile | `controllers` | Controller / console options | multi | `TEXT[]` |  | allows "other" |  |
| profile | `operator` | Operator available | toggle | `BOOLEAN` |  |  |  |
| profile | `setup_dismantle` | Setup and dismantling included | toggle | `BOOLEAN` |  |  |  |
| profile | `safety` | Safety measures | textarea | `TEXT` |  | max 200 |  |
| profile | `transport` | You transport the equipment | toggle | `BOOLEAN` |  |  |  |
| profile | `setup_hours` | Setup time you need before the event | number | `NUMERIC` |  | min 0, max 72, unit hours |  |
| profile | `backup_power` | You bring backup power for the lights | toggle | `BOOLEAN` |  |  |  |
| profile | `service_radius_km` | How far you work from your base | number | `NUMERIC` |  | min 5, max 3000, unit km |  |
| catalogue/fixtures | `name` | Fixture | text | `TEXT` | yes | max 60 |  |
| catalogue/fixtures | `total_qty` | Quantity | number | `NUMERIC` | yes | min 1, max 10000 |  |
| catalogue/fixtures | `suitability` | Use | single | `TEXT` | yes |  |  |
| catalogue/fixtures | `watts` | Power draw | number | `NUMERIC` |  | min 0, max 100000, unit W |  |
| catalogue/fixtures | `rate` | Rental rate | money | `BIGINT` | yes |  |  |
| catalogue/fixtures | `rate_period` | Per | single | `TEXT` | yes |  |  |
| catalogue/fixtures | `photos` | Photo | photos | `TEXT[]` |  | max 3 |  |

### event_materials_supplier

`event_materials_supplier.js` · 7 profile questions · 12 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `supplies` | What supplies do you sell or supply for events? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `fulfilment` | How customers receive orders | multi | `TEXT[]` | yes |  |  |
| profile | `bulk` | You take bulk orders (1,000+ units) | toggle | `BOOLEAN` |  |  |  |
| profile | `same_day` | Same-day orders possible | toggle | `BOOLEAN` |  |  |  |
| profile | `gst_invoice` | You give a GST invoice | toggle | `BOOLEAN` |  |  |  |
| profile | `returns_unused` | Unopened stock can be returned | toggle | `BOOLEAN` |  |  |  |
| profile | `prep_hours` | Order preparation time | number | `NUMERIC` | yes | min 0, max 720, unit hours |  |
| catalogue/products | `sku` | SKU | text | `TEXT` |  | max 30 |  |
| catalogue/products | `name` | Name | text | `TEXT` | yes | max 60 |  |
| catalogue/products | `description` | Description | textarea | `TEXT` |  | max 200 |  |
| catalogue/products | `photos` | Photo | photos | `TEXT[]` |  | min 1, max 4 |  |
| catalogue/products | `unit` | Unit of sale | single | `TEXT` | yes | allows "other" |  |
| catalogue/products | `unit_price` | Unit price | money | `BIGINT` | yes |  |  |
| catalogue/products | `stock` | Available stock | number | `NUMERIC` | yes | min 0, max 10000000 |  |
| catalogue/products | `min_order` | Minimum order | number | `NUMERIC` |  | min 1, max 1000000 |  |
| catalogue/products | `quantity_breaks` | Quantity breaks | text | `TEXT` |  | max 120 |  |
| catalogue/products | `customisable` | Can be customised / branded | toggle | `BOOLEAN` |  |  |  |
| catalogue/products | `lead_days` | Lead time | number | `NUMERIC` |  | min 0, max 90, unit days |  |
| catalogue/products | `return_conditions` | Return conditions | text | `TEXT` |  | max 120 |  |

### gifts_favours

`gifts_favours.js` · 7 profile questions · 13 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `gift_types` | What types of gifts or favours do you offer? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `occasions` | Occasions you make gifts for | multi | `TEXT[]` |  | allows "other" |  |
| profile | `personalisation_methods` | Personalisation you can do | multi | `TEXT[]` |  | allows "other" |  |
| profile | `message_card` | You add a printed message card | toggle | `BOOLEAN` |  |  |  |
| profile | `packaging_personalisation` | Can customers choose packaging and personalization? | toggle | `BOOLEAN` |  |  |  |
| profile | `min_order` | What is the minimum order quantity? | number | `NUMERIC` | yes | min 1, max 100000 |  |
| profile | `prep_days` | How much time do you need to prepare an order? | number | `NUMERIC` | yes | min 0, max 90, unit days |  |
| catalogue/products | `name` | Name | text | `TEXT` | yes | max 60 |  |
| catalogue/products | `material` | Material | text | `TEXT` |  | max 40 |  |
| catalogue/products | `dimensions` | Dimensions | dimensions | `JSONB` |  |  |  |
| catalogue/products | `unit_price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/products | `unit` | Per | single | `TEXT` | yes |  |  |
| catalogue/products | `quantity_tiers` | Quantity tiers | text | `TEXT` |  | max 120 |  |
| catalogue/products | `packaging` | Packaging | text | `TEXT` |  | max 60 |  |
| catalogue/products | `personalisation` | Personalisation available | toggle | `BOOLEAN` |  |  |  |
| catalogue/products | `personalisation_fee` | Personalisation per item | money | `BIGINT` |  |  | personalisation is set |
| catalogue/products | `proof_required` | Proof approval before production | toggle | `BOOLEAN` |  |  |  |
| catalogue/products | `stock` | In stock (0 if made to order) | number | `NUMERIC` |  | min 0, max 1000000 |  |
| catalogue/products | `lead_days` | Lead time | number | `NUMERIC` | yes | min 0, max 90, unit days |  |
| catalogue/products | `photos` | Photos | photos | `TEXT[]` |  | min 1, max 4 |  |

### guest_services

`guest_services.js` · 5 profile questions · 13 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `roles` | Which services do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `languages` | Languages your staff speak | multi | `TEXT[]` |  | allows "other" |  |
| profile | `attire` | Attire you can provide | multi | `TEXT[]` |  | allows "other" |  |
| profile | `max_event_guests` | Largest event you have staffed | number | `NUMERIC` |  | min 10, max 200000, unit guests |  |
| profile | `grooming` | Grooming and a pre-event briefing for every staff member | toggle | `BOOLEAN` |  |  |  |
| catalogue/role_specs | `role` | Role | single | `TEXT` | yes | allows "other" |  |
| catalogue/role_specs | `min_staff` | Minimum staff | number | `NUMERIC` | yes | min 1, max 500 |  |
| catalogue/role_specs | `max_staff` | Maximum staff | number | `NUMERIC` | yes | min 1, max 2000 |  |
| catalogue/role_specs | `languages` | Languages | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/role_specs | `dress_code` | Dress code | text | `TEXT` |  | max 60 |  |
| catalogue/role_specs | `uniform` | Uniform provided | toggle | `BOOLEAN` |  |  |  |
| catalogue/role_specs | `experience` | Experience | single | `TEXT` | yes |  |  |
| catalogue/role_specs | `briefing_minutes` | Briefing time | number | `NUMERIC` |  | min 0, max 240, unit minutes |  |
| catalogue/role_specs | `shift_hours` | Shift length | number | `NUMERIC` | yes | min 2, max 16, unit hours |  |
| catalogue/role_specs | `break_policy` | Break policy | text | `TEXT` |  | max 80 |  |
| catalogue/role_specs | `supervisor_required` | Needs a supervisor | toggle | `BOOLEAN` |  |  |  |
| catalogue/role_specs | `rate` | Rate | money | `BIGINT` | yes |  |  |
| catalogue/role_specs | `rate_unit` | Per | single | `TEXT` | yes |  |  |

### invitation_printing

`invitation_printing.js` · 8 profile questions · 14 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `products` | Which of these do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `languages` | Languages / scripts you can typeset | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `card_styles` | Card styles you make | multi | `TEXT[]` |  | allows "other" |  |
| profile | `revisions` | Design revisions included | number | `NUMERIC` | yes | min 0, max 10 |  |
| profile | `proof_required` | You send a proof for approval before production | toggle | `BOOLEAN` |  |  |  |
| profile | `min_order` | Smallest printed order you take | number | `NUMERIC` |  | min 1, max 100000, unit cards |  |
| profile | `home_delivery` | You deliver the printed cards to the family | toggle | `BOOLEAN` |  |  |  |
| profile | `guest_distribution` | You can courier or hand-deliver cards to guests | toggle | `BOOLEAN` |  |  |  |
| catalogue/products | `name` | Product | text | `TEXT` | yes | max 60 |  |
| catalogue/products | `format` | Format | single | `TEXT` | yes |  |  |
| catalogue/products | `size` | Size / dimensions | text | `TEXT` |  | max 30 | format in [printed] |
| catalogue/products | `paper` | Paper / material | text | `TEXT` |  | max 40 | format in [printed] |
| catalogue/products | `process` | Printing process | single | `TEXT` |  | allows "other" | format in [printed] |
| catalogue/products | `colours` | Number of colours | number | `NUMERIC` |  | min 1, max 8 | format in [printed] |
| catalogue/products | `file_formats` | File formats delivered | multi | `TEXT[]` |  | allows "other" | format in [digital] |
| catalogue/products | `delivery_method` | Delivered via | single | `TEXT` |  | allows "other" | format in [digital] |
| catalogue/products | `design_fee` | Design fee | money | `BIGINT` |  |  |  |
| catalogue/products | `per_piece` | Price per piece | money | `BIGINT` | yes |  |  |
| catalogue/products | `min_qty` | Minimum quantity | number | `NUMERIC` |  | min 1, max 100000 |  |
| catalogue/products | `quantity_tiers` | Quantity tiers | text | `TEXT` |  | max 120 |  |
| catalogue/products | `envelope_accessories` | Envelope / accessories | text | `TEXT` |  | max 80 |  |
| catalogue/products | `lead_days` | Lead time after approval | number | `NUMERIC` | yes | min 0, max 60, unit days |  |

### live_entertainment

`live_entertainment.js` · 5 profile questions · 13 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `act_types` | Which acts are provided? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Events you perform at | multi | `TEXT[]` |  | allows "other" |  |
| profile | `own_sound` | You bring your own sound system | toggle | `BOOLEAN` |  |  |  |
| profile | `shows_per_day` | Most shows you can do in one day | number | `NUMERIC` |  | min 1, max 10 |  |
| profile | `service_radius_km` | How far you travel for a show | number | `NUMERIC` |  | min 5, max 3000, unit km |  |
| catalogue/acts | `name` | Act name | text | `TEXT` | yes | max 60 |  |
| catalogue/acts | `description` | Description | textarea | `TEXT` | yes | max 300 |  |
| catalogue/acts | `performers` | Performers | number | `NUMERIC` | yes | min 1, max 100 |  |
| catalogue/acts | `durations` | Duration options | multi | `TEXT[]` | yes |  |  |
| catalogue/acts | `format` | Performance format | single | `TEXT` | yes | allows "other" |  |
| catalogue/acts | `setup_minutes` | Setup / soundcheck | number | `NUMERIC` |  | min 0, max 300, unit minutes |  |
| catalogue/acts | `stage_space` | Stage space needed | dimensions | `JSONB` |  |  |  |
| catalogue/acts | `tech_rider` | Equipment & technical rider | textarea | `TEXT` |  | max 300 |  |
| catalogue/acts | `languages` | Languages | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/acts | `audience` | Audience suitability | single | `TEXT` | yes | allows "other" |  |
| catalogue/acts | `price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/acts | `price_unit` | Per | single | `TEXT` | yes |  |  |
| catalogue/acts | `showreel` | Showreel link | url | `TEXT` |  |  |  |

### loading_unloading_crew

`loading_unloading_crew.js` · 18 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `work` | Loading, unloading or both? | multi | `TEXT[]` | yes |  |  |
| profile | `materials` | What kinds of materials do you handle? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `access` | Access you can work with | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `tools` | Lifting tools you bring | multi | `TEXT[]` |  | allows "other" |  |
| profile | `max_item_kg` | Heaviest single item you will lift | number | `NUMERIC` | yes | min 10, max 2000, unit kg |  |
| profile | `packing` | You pack and wrap items | toggle | `BOOLEAN` |  |  |  |
| profile | `assembly` | You assemble and dismantle furniture and stages | toggle | `BOOLEAN` |  |  |  |
| profile | `same_day` | Same-day crew possible | toggle | `BOOLEAN` |  |  |  |
| profile | `service_radius_km` | How far your crew travels | number | `NUMERIC` |  | min 2, max 1000, unit km |  |
| crew | `workers` | Workers available per day | number | `NUMERIC` | yes | min 1, max 1000 |  |
| crew | `skills` | Skills | multi | `TEXT[]` |  | allows "other" |  |
| crew | `supervisor` | Supervisor available | toggle | `BOOLEAN` |  |  |  |
| crew | `min_crew` | Minimum crew size | number | `NUMERIC` | yes | min 1, max 100 |  |
| crew | `min_paid_hours` | Minimum paid hours | number | `NUMERIC` | yes | min 1, max 12 |  |
| crew | `shifts` | Shift options | multi | `TEXT[]` | yes |  |  |
| crew | `breaks` | Breaks | text | `TEXT` |  | max 60 |  |
| crew | `safety_equipment` | Safety equipment | multi | `TEXT[]` |  | allows "other" |  |
| crew | `travel` | Crew travel | single | `TEXT` | yes |  |  |

### medium_large_goods_vehicle

`medium_large_goods_vehicle.js` · 10 profile questions · 9 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `loads` | Which loads do your trucks move? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `handling` | Special handling | multi | `TEXT[]` |  | allows "other" |  |
| profile | `routes` | Routes you run | multi | `TEXT[]` | yes |  |  |
| profile | `permit_scope` | Goods-carriage permit | single | `TEXT` | yes |  |  |
| profile | `service_radius_km` | Furthest you will go for one booking | number | `NUMERIC` | yes | min 5, max 3000, unit km |  |
| profile | `part_load` | You take part loads (shared truck) | toggle | `BOOLEAN` |  |  |  |
| profile | `night_movement` | You run at night when city entry is restricted by day | toggle | `BOOLEAN` |  |  |  |
| profile | `loading_crew` | You can send a loading crew | toggle | `BOOLEAN` |  |  |  |
| profile | `transit_insurance` | Goods-in-transit insurance | toggle | `BOOLEAN` |  |  |  |
| profile | `notice` | Shortest notice you need | single | `TEXT` | yes |  |  |
| catalogue/vehicles | `category` | Vehicle type | single | `TEXT` | yes | allows "other" |  |
| catalogue/vehicles | `payload_kg` | Load capacity | number | `NUMERIC` | yes | min 500, max 50000, unit kg |  |
| catalogue/vehicles | `load_dimensions` | Load space (L × W × H) | dimensions | `JSONB` | yes |  |  |
| catalogue/vehicles | `body` | Body type | single | `TEXT` | yes | allows "other" |  |
| catalogue/vehicles | `features` | Loading features | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/vehicles | `driver_included` | Driver included | toggle | `BOOLEAN` |  |  |  |
| catalogue/vehicles | `registration` | Registration number (private) | text | `TEXT` | yes | max 15 |  |
| catalogue/vehicles | `photos` | Vehicle photos | photos | `TEXT[]` |  | min 1, max 4 |  |
| catalogue/vehicles | `count` | How many of this vehicle | number | `NUMERIC` | yes | min 1, max 500 |  |

### mehendi_artist

`mehendi_artist.js` · 12 profile questions · 5 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `who` | Bridal, family / guest or casual mehendi? | multi | `TEXT[]` | yes |  |  |
| profile | `styles` | Which styles are offered? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `coverage` | Coverage levels | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Events you do mehendi for | multi | `TEXT[]` |  | allows "other" |  |
| profile | `intricate_bridal` | Intricate bridal work available | toggle | `BOOLEAN` |  |  |  |
| profile | `cone` | Is natural / cone material provided? | single | `TEXT` | yes |  |  |
| profile | `trial_designs` | Trial designs available | toggle | `BOOLEAN` |  |  |  |
| profile | `references` | Customers can share design references | toggle | `BOOLEAN` |  |  |  |
| profile | `bridal_hours` | Time for a full bridal mehendi | number | `NUMERIC` |  | min 1, max 12, unit hours |  |
| profile | `guests_per_hour` | Guests one artist covers in an hour (simple design) | number | `NUMERIC` |  | min 1, max 30 |  |
| profile | `home_visit` | Home visits | toggle | `BOOLEAN` |  |  |  |
| profile | `aftercare` | You give aftercare for a deep colour | toggle | `BOOLEAN` |  |  |  |
| catalogue/services | `service` | Service | single | `TEXT` | yes | allows "other" |  |
| catalogue/services | `coverage` | Coverage | single | `TEXT` | yes | allows "other" |  |
| catalogue/services | `minutes` | Time per person | number | `NUMERIC` | yes | min 5, max 600, unit minutes |  |
| catalogue/services | `price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/services | `price_unit` | Per | single | `TEXT` | yes |  |  |

### mini_truck_pickup

`mini_truck_pickup.js` · 9 profile questions · 9 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `service_radius_km` | How far from your base will you take a trip? | number | `NUMERIC` | yes | min 2, max 500, unit km |  |
| profile | `loads` | What do your mini trucks usually carry? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `helpers` | You can send helpers for loading | toggle | `BOOLEAN` |  |  |  |
| profile | `same_day` | You take same-day, on-demand trips | toggle | `BOOLEAN` |  |  |  |
| profile | `notice` | Shortest notice you need | single | `TEXT` | yes |  |  |
| profile | `night_trips` | Night trips (after 10 pm) | toggle | `BOOLEAN` |  |  |  |
| profile | `multi_stop` | Multi-stop trips (pick up from several shops) | toggle | `BOOLEAN` |  |  |  |
| profile | `outstation` | Outstation trips | toggle | `BOOLEAN` |  |  |  |
| profile | `fragile` | You handle fragile loads (glass, cakes, decor) | toggle | `BOOLEAN` |  |  |  |
| catalogue/vehicles | `category` | Vehicle | single | `TEXT` | yes | allows "other" |  |
| catalogue/vehicles | `payload_kg` | Load capacity | number | `NUMERIC` | yes | min 100, max 5000, unit kg |  |
| catalogue/vehicles | `load_dimensions` | Load space | dimensions | `JSONB` | yes |  |  |
| catalogue/vehicles | `body` | Body | single | `TEXT` | yes | allows "other" |  |
| catalogue/vehicles | `count` | How many | number | `NUMERIC` | yes | min 1, max 200 |  |
| catalogue/vehicles | `driver_included` | Driver included | toggle | `BOOLEAN` |  |  |  |
| catalogue/vehicles | `registration` | Registration number (private) | text | `TEXT` | yes | max 15 |  |
| catalogue/vehicles | `access` | Loading access requirements | text | `TEXT` |  | max 80 |  |
| catalogue/vehicles | `photos` | Vehicle photos | photos | `TEXT[]` |  | min 1, max 4 |  |

### passenger_transport

`passenger_transport.js` · 8 profile questions · 8 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `vehicle_services` | What do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `service_radius_km` | Service area radius | number | `NUMERIC` | yes | min 5, max 3000, unit km |  |
| profile | `driver_type` | Drivers | single | `TEXT` | yes |  |  |
| profile | `airport_station` | Flight / train coordination | toggle | `BOOLEAN` |  |  |  |
| profile | `languages` | Languages your drivers speak | multi | `TEXT[]` |  | allows "other" |  |
| profile | `uniformed` | Drivers in uniform | toggle | `BOOLEAN` |  |  |  |
| profile | `outstation` | Outstation trips | toggle | `BOOLEAN` |  |  |  |
| profile | `late_night` | Late-night pickups (after 11 pm) | toggle | `BOOLEAN` |  |  |  |
| catalogue/vehicles | `category` | Vehicle | single | `TEXT` | yes | allows "other" |  |
| catalogue/vehicles | `seats` | Passenger capacity | number | `NUMERIC` | yes | min 1, max 80 |  |
| catalogue/vehicles | `bags` | Luggage capacity (bags) | number | `NUMERIC` |  | min 0, max 100 |  |
| catalogue/vehicles | `accessibility` | Accessibility features | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/vehicles | `ac` | Air-conditioned | toggle | `BOOLEAN` |  |  |  |
| catalogue/vehicles | `count` | How many | number | `NUMERIC` | yes | min 1, max 500 |  |
| catalogue/vehicles | `registration` | Registration number (private) | text | `TEXT` | yes | max 15 |  |
| catalogue/vehicles | `photos` | Photos | photos | `TEXT[]` |  | min 1, max 4 |  |

### photography

`photography.js` · 13 profile questions · 9 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `specialties` | Specialties | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Event categories | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `styles` | Styles | multi | `TEXT[]` |  | allows "other" |  |
| profile | `years` | Years of experience | number | `NUMERIC` | yes | min 0, max 60, unit years |  |
| profile | `portfolio` | Portfolio | photos | `TEXT[]` | yes | min 6, max 30 |  |
| profile | `gallery_link` | Online gallery link | url | `TEXT` |  |  |  |
| profile | `equipment` | Equipment | multi | `TEXT[]` |  | allows "other" |  |
| profile | `formats` | Delivery formats | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `service_radius_km` | Service area radius | number | `NUMERIC` | yes | min 5, max 3000, unit km |  |
| profile | `languages` | Languages you speak with families | multi | `TEXT[]` |  | allows "other" |  |
| profile | `sneak_peek_days` | Sneak-peek photos delivered within | number | `NUMERIC` |  | min 0, max 30, unit days |  |
| profile | `same_day_edit` | Same-day edit slideshow at the reception | toggle | `BOOLEAN` |  |  |  |
| profile | `outstation` | You travel for destination / outstation shoots | toggle | `BOOLEAN` |  |  |  |
| catalogue/packages | `coverage` | Coverage type | single | `TEXT` | yes | allows "other" |  |
| catalogue/packages | `hours` | Hours of coverage | number | `NUMERIC` | yes | min 1, max 72, unit hours |  |
| catalogue/packages | `photographers` | Photographers | number | `NUMERIC` | yes | min 1, max 20 |  |
| catalogue/packages | `edited_images` | Edited images delivered | number | `NUMERIC` | yes | min 10, max 5000 |  |
| catalogue/packages | `retouch` | Retouching level | single | `TEXT` | yes |  |  |
| catalogue/packages | `album` | Album / prints | single | `TEXT` | yes | allows "other" |  |
| catalogue/packages | `delivery_days` | Delivery timeline | number | `NUMERIC` | yes | min 1, max 180, unit days |  |
| catalogue/packages | `raw` | RAW files included | toggle | `BOOLEAN` |  |  |  |
| catalogue/packages | `price` | Your price for this package | money | `BIGINT` | yes |  |  |

### power_cooling

`power_cooling.js` · 8 profile questions · 13 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services` | What do you provide? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `operators` | You supply operators / technicians | toggle | `BOOLEAN` |  |  |  |
| profile | `fuel_policy` | Fuel policy | single | `TEXT` | yes |  |  |
| profile | `service_radius_km` | Service radius | number | `NUMERIC` | yes | min 5, max 1000, unit km |  |
| profile | `largest_kva` | Largest generator you can supply | number | `NUMERIC` |  | min 1, max 5000, unit kVA |  |
| profile | `parallel` | You can run generators in sync (parallel) | toggle | `BOOLEAN` |  |  |  |
| profile | `silent_canopy` | CPCB-compliant silent canopies | toggle | `BOOLEAN` |  |  |  |
| profile | `setup_hours` | Setup time you need before the event | number | `NUMERIC` |  | min 0, max 48, unit hours |  |
| catalogue/items | `type` | Type | single | `TEXT` | yes | allows "other" |  |
| catalogue/items | `model` | Make / model | text | `TEXT` |  | max 40 |  |
| catalogue/items | `capacity` | Rated capacity | number | `NUMERIC` | yes | min 0.1, max 5000, unit kVA / ton |  |
| catalogue/items | `quantity` | Quantity owned | number | `NUMERIC` | yes | min 1, max 1000 |  |
| catalogue/items | `power_source` | Fuel / power | single | `TEXT` | yes | allows "other" |  |
| catalogue/items | `runtime_hours` | Runtime on one fill | number | `NUMERIC` |  | min 1, max 72, unit hours |  |
| catalogue/items | `placement` | Indoor / outdoor | single | `TEXT` | yes |  |  |
| catalogue/items | `cabling` | Cabling included | toggle | `BOOLEAN` |  |  |  |
| catalogue/items | `installation` | Installation included | toggle | `BOOLEAN` |  |  |  |
| catalogue/items | `rate` | Rental rate | money | `BIGINT` | yes |  |  |
| catalogue/items | `rate_period` | Per | single | `TEXT` | yes |  |  |
| catalogue/items | `last_service` | Last maintenance | date | `DATE` |  |  |  |
| catalogue/items | `photos` | Photos | photos | `TEXT[]` |  | min 1, max 4 |  |

### priest_rituals

`priest_rituals.js` · 11 profile questions · 6 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `ceremonies` | Ceremonies you perform | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `traditions` | Traditions | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `languages` | Languages | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `customisation` | You customise rituals to family tradition | toggle | `BOOLEAN` |  |  |  |
| profile | `muhurta` | You fix muhurta (auspicious time) | toggle | `BOOLEAN` |  |  |  |
| profile | `materials` | Puja materials & offerings | single | `TEXT` | yes |  |  |
| profile | `assistants` | Assistant priests available | toggle | `BOOLEAN` |  |  |  |
| profile | `years` | Years performing ceremonies | number | `NUMERIC` |  | min 0, max 70, unit years |  |
| profile | `online_puja` | Online / video-call puja for families abroad | toggle | `BOOLEAN` |  |  |  |
| profile | `horoscope` | Horoscope matching | toggle | `BOOLEAN` |  |  |  |
| profile | `prasadam_cook` | You can arrange a cook for prasadam | toggle | `BOOLEAN` |  |  |  |
| catalogue/ceremonies | `ceremony` | Ceremony | single | `TEXT` | yes | allows "other" |  |
| catalogue/ceremonies | `description` | Short description | text | `TEXT` |  | max 160 |  |
| catalogue/ceremonies | `minutes` | Duration | number | `NUMERIC` | yes | min 15, max 1440, unit minutes |  |
| catalogue/ceremonies | `priests` | Priests needed | number | `NUMERIC` | yes | min 1, max 20 |  |
| catalogue/ceremonies | `fee` | Dakshina / fee | money | `BIGINT` | yes |  |  |
| catalogue/ceremonies | `materials_fee` | Materials (shown separately) | money | `BIGINT` |  |  |  |

### safety_facilities

`safety_facilities.js` · 14 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| subtype | `subtype` | Service type | single | `TEXT` | yes |  |  |
| subtype | `description` | Describe the service | textarea | `TEXT` | yes | max 500 |  |
| subtype | `sites` | Sites / event types | multi | `TEXT[]` | yes | allows "other" |  |
| capacity | `max_attendees` | Largest event you can support | number | `NUMERIC` | yes | min 10, max 200000, unit people |  |
| capacity | `staff` | Staff available | number | `NUMERIC` | yes | min 1, max 2000 |  |
| capacity | `kit` | Equipment | multi | `TEXT[]` |  | allows "other" |  |
| capacity | `shift_hours` | Standard shift | number | `NUMERIC` | yes | min 2, max 24, unit hours |  |
| capacity | `setup_included` | Setup included | toggle | `BOOLEAN` |  |  |  |
| capacity | `emergency_response` | Emergency response capability | toggle | `BOOLEAN` |  |  |  |
| capacity | `ambulance` | Ambulance on standby available | toggle | `BOOLEAN` |  |  |  |
| capacity | `medical_staff` | Paramedic or nurse on site available | toggle | `BOOLEAN` |  |  |  |
| capacity | `permissions_help` | You help with fire and police permissions | toggle | `BOOLEAN` |  |  |  |
| capacity | `setup_hours` | Setup time you need before the event | number | `NUMERIC` |  | min 0, max 48, unit hours |  |
| capacity | `restrictions` | Restrictions | textarea | `TEXT` |  |  |  |

### security_services

`security_services.js` · 14 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services` | Services | multi | `TEXT[]` | yes |  |  |
| profile | `other_service` | Anything else (reviewed before it is shown) | textarea | `TEXT` |  |  |  |
| profile | `venues` | Venue types | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `max_visitors` | Largest visitor volume handled | number | `NUMERIC` | yes | min 10, max 200000, unit people |  |
| profile | `police_liaison` | You coordinate with local police for the event | toggle | `BOOLEAN` |  |  |  |
| team | `guards` | Guards available | number | `NUMERIC` | yes | min 1, max 5000 |  |
| team | `supervisors` | Supervisors available | number | `NUMERIC` | yes | min 0, max 500 |  |
| team | `shifts` | Shifts | multi | `TEXT[]` | yes | allows "other" |  |
| team | `uniform` | Uniform | multi | `TEXT[]` | yes | allows "other" |  |
| team | `lady_guards` | Lady guards available | number | `NUMERIC` |  | min 0, max 2000 |  |
| team | `ex_servicemen` | Ex-servicemen on your team | toggle | `BOOLEAN` |  |  |  |
| team | `equipment` | Equipment | multi | `TEXT[]` |  | allows "other" |  |
| team | `briefing` | Pre-event briefing included | toggle | `BOOLEAN` |  |  |  |
| team | `relief` | Break relief guards provided | toggle | `BOOLEAN` |  |  |  |

### sound_av

`sound_av.js` · 8 profile questions · 9 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `groups` | Equipment groups | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `capabilities` | You can also handle | multi | `TEXT[]` |  | allows "other" |  |
| profile | `max_audience` | Largest audience you can cover | number | `NUMERIC` | yes | min 10, max 100000, unit people |  |
| profile | `brands` | Brands in your inventory | multi | `TEXT[]` |  | allows "other" |  |
| profile | `events` | Events you supply for | multi | `TEXT[]` |  | allows "other" |  |
| profile | `backup` | A backup mixer and mics stay on site | toggle | `BOOLEAN` |  |  |  |
| profile | `setup_hours` | Setup time you need before the event | number | `NUMERIC` |  | min 0, max 48, unit hours |  |
| profile | `service_radius_km` | How far you work from your base | number | `NUMERIC` |  | min 5, max 3000, unit km |  |
| catalogue/items | `group` | Group | single | `TEXT` | yes | allows "other" |  |
| catalogue/items | `model` | Make / model | text | `TEXT` | yes | max 60 |  |
| catalogue/items | `quantity` | Quantity | number | `NUMERIC` | yes | min 1, max 10000 |  |
| catalogue/items | `condition` | Condition | single | `TEXT` | yes |  |  |
| catalogue/items | `power_watts` | Power draw | number | `NUMERIC` |  | min 0, max 200000, unit W |  |
| catalogue/items | `setup_minutes` | Setup time | number | `NUMERIC` |  | min 0, max 1440, unit minutes |  |
| catalogue/items | `rate` | Rental rate | money | `BIGINT` | yes |  |  |
| catalogue/items | `rate_period` | Per | single | `TEXT` | yes |  |  |
| catalogue/items | `photos` | Photo | photos | `TEXT[]` |  | min 1, max 4 |  |

### tent_furniture

`tent_furniture.js` · 10 profile questions · 11 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `groups` | What do you supply? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `surfaces` | Surfaces you can install on | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `largest_structure_sqft` | Largest structure you can put up | number | `NUMERIC` |  | min 100, max 500000, unit sq ft |  |
| profile | `max_seated_guests` | Most guests you can seat | number | `NUMERIC` |  | min 10, max 100000, unit guests |  |
| profile | `setup_hours` | Setup time you need | number | `NUMERIC` |  | min 0, max 96, unit hours |  |
| profile | `fire_retardant` | Fire-retardant fabric | toggle | `BOOLEAN` |  |  |  |
| profile | `ac_tents` | Air-conditioned tents available | toggle | `BOOLEAN` |  |  |  |
| profile | `weatherproof` | Weather-proof tents available | toggle | `BOOLEAN` |  |  |  |
| profile | `deposit` | Security deposit (refundable) | money | `BIGINT` |  |  |  |
| profile | `damage_policy` | Damage policy | textarea | `TEXT` | yes | max 400 |  |
| catalogue/items | `group` | Type | single | `TEXT` | yes | allows "other" |  |
| catalogue/items | `name` | Name | text | `TEXT` | yes | max 60 |  |
| catalogue/items | `size` | Dimensions | dimensions | `JSONB` |  |  |  |
| catalogue/items | `capacity` | Seats / people covered | number | `NUMERIC` |  | min 0, max 10000 |  |
| catalogue/items | `material` | Material | text | `TEXT` |  | max 40 |  |
| catalogue/items | `quantity` | Quantity | number | `NUMERIC` | yes | min 1, max 100000 |  |
| catalogue/items | `condition` | Condition | single | `TEXT` | yes |  |  |
| catalogue/items | `rate` | Rental rate | money | `BIGINT` | yes |  |  |
| catalogue/items | `rate_period` | Per | single | `TEXT` | yes |  |  |
| catalogue/items | `assembly_minutes` | Assembly time | number | `NUMERIC` |  | min 0, max 2880, unit minutes |  |
| catalogue/items | `photos` | Photo | photos | `TEXT[]` |  | min 1, max 4 |  |

### transportation

`transportation.js` · 8 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| scope | `service_type` | Service type | single | `TEXT` | yes |  |  |
| scope | `other_description` | Describe it | textarea | `TEXT` | yes |  | service_type in [other] |
| scope | `operation` | How do you operate? | single | `TEXT` | yes |  |  |
| scope | `routes` | Areas / routes you cover | textarea | `TEXT` | yes |  |  |
| scope | `vehicles` | Vehicles you can arrange | number | `NUMERIC` | yes | min 1, max 1000 |  |
| scope | `vehicle_types` | Vehicle types you can arrange | multi | `TEXT[]` |  | allows "other" |  |
| scope | `service_radius_km` | How far you operate from your base | number | `NUMERIC` |  | min 5, max 3000, unit km |  |
| scope | `live_tracking` | Live vehicle tracking shared with the customer | toggle | `BOOLEAN` |  |  |  |

### trousseau_gift_packing

`trousseau_gift_packing.js` · 9 profile questions · 7 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `types` | What do you pack? | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `materials` | Materials you use | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `customisation` | Customisation | multi | `TEXT[]` |  | allows "other" |  |
| profile | `customer_materials` | You pack customer-supplied items | toggle | `BOOLEAN` |  |  |  |
| profile | `proof` | You share a sample / photo proof before the full order | toggle | `BOOLEAN` |  |  |  |
| profile | `handover` | Pickup / delivery | multi | `TEXT[]` | yes |  |  |
| profile | `min_order_sets` | Smallest order you take | number | `NUMERIC` |  | min 1, max 1000, unit sets |  |
| profile | `rental_trays` | Returnable rental trays and baskets | toggle | `BOOLEAN` |  |  |  |
| profile | `venue_display` | You arrange the trousseau display at the venue | toggle | `BOOLEAN` |  |  |  |
| catalogue/products | `name` | Name | text | `TEXT` | yes | max 60 |  |
| catalogue/products | `type` | Type | single | `TEXT` | yes | allows "other" |  |
| catalogue/products | `size` | Dimensions | dimensions | `JSONB` |  |  |  |
| catalogue/products | `price` | Price | money | `BIGINT` | yes |  |  |
| catalogue/products | `price_unit` | Per | single | `TEXT` | yes |  |  |
| catalogue/products | `materials_included` | Box / materials included in price | toggle | `BOOLEAN` |  |  |  |
| catalogue/products | `photos` | Photo | photos | `TEXT[]` |  | min 1, max 4 |  |

### valet_parking

`valet_parking.js` · 10 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services` | Services | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `valets` | Valet drivers available | number | `NUMERIC` | yes | min 1, max 1000 |  |
| profile | `supervisors` | Supervisors available | number | `NUMERIC` | yes | min 0, max 200 |  |
| profile | `cars_per_hour` | Cars your team can take per hour at peak | number | `NUMERIC` | yes | min 5, max 5000 |  |
| profile | `insurance` | Vehicle damage insurance | toggle | `BOOLEAN` |  |  |  |
| profile | `max_cars` | Most cars handled at one event | number | `NUMERIC` |  | min 10, max 20000 |  |
| profile | `luxury_trained` | Drivers trained for luxury, automatic and EV cars | toggle | `BOOLEAN` |  |  |  |
| profile | `key_tracking` | Digital key tracking (token or app) | toggle | `BOOLEAN` |  |  |  |
| profile | `remote_shuttle` | Shuttle from a remote parking lot | toggle | `BOOLEAN` |  |  |  |
| profile | `customer_duties` | What the host must provide | textarea | `TEXT` |  |  |  |

### venue

`venue.js` · 24 profile questions · 11 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `venue_name` | Venue name | text | `TEXT` | yes | max 80 |  |
| profile | `venue_type` | Venue type | single | `TEXT` | yes | allows "other" |  |
| profile | `events` | Events you host | multi | `TEXT[]` |  | allows "other" |  |
| profile | `photos` | Photos | photos | `TEXT[]` | yes | min 5, max 30 |  |
| profile | `video` | Walkthrough video link | url | `TEXT` |  |  |  |
| profile | `max_capacity` | Maximum capacity | number | `NUMERIC` | yes | min 10, max 50000, unit guests |  |
| profile | `recommended_capacity` | Recommended capacity | number | `NUMERIC` | yes | min 10, max 50000, unit guests |  |
| profile | `accessibility` | Accessibility | multi | `TEXT[]` |  | allows "other" |  |
| profile | `parking` | Parking spaces | number | `NUMERIC` | yes | min 0, max 10000 |  |
| profile | `rooms` | Rooms on site | number | `NUMERIC` |  | min 0, max 1000 |  |
| profile | `facilities` | Included facilities | multi | `TEXT[]` |  | allows "other" |  |
| profile | `dining_capacity` | Dining capacity (seated at one time) | number | `NUMERIC` |  | min 0, max 50000, unit guests |  |
| profile | `two_wheeler_parking` | Two-wheeler parking | number | `NUMERIC` |  | min 0, max 20000 |  |
| profile | `early_muhurtha` | Early-morning muhurtha bookings (before 6 am) | toggle | `BOOLEAN` |  |  |  |
| profile | `overnight_stay` | Guests can stay overnight | toggle | `BOOLEAN` |  |  |  |
| rules | `catering_rule` | Catering | single | `TEXT` | yes |  |  |
| rules | `outside_catering_fee` | Outside catering fee | money | `BIGINT` |  |  | catering_rule in [outside_allowed_with_a_fee] |
| rules | `decor_rule` | Decoration | single | `TEXT` | yes |  |  |
| rules | `decor_restrictions` | Decoration restrictions (fire, nails, confetti…) | textarea | `TEXT` |  |  |  |
| rules | `sound_cutoff` | Amplified sound must stop by | time | `TIME` | yes |  |  |
| rules | `alcohol` | Alcohol permitted | toggle | `BOOLEAN` |  |  |  |
| rules | `setup_hours` | Setup time before the event | number | `NUMERIC` | yes | min 0, max 48, unit hours |  |
| rules | `cleanup_hours` | Cleanup time after | number | `NUMERIC` | yes | min 0, max 24, unit hours |  |
| rules | `setup_charging` | When does setup / cleanup time start being charged? | single | `TEXT` | yes |  |  |
| catalogue/spaces | `name` | Space name | text | `TEXT` | yes | max 60 |  |
| catalogue/spaces | `setting` | Indoor / outdoor | single | `TEXT` | yes |  |  |
| catalogue/spaces | `capacity` | Capacity | number | `NUMERIC` | yes | min 5, max 50000, unit guests |  |
| catalogue/spaces | `size` | Dimensions | dimensions | `JSONB` |  |  |  |
| catalogue/spaces | `layouts` | Layouts | multi | `TEXT[]` | yes | allows "other" |  |
| catalogue/spaces | `slots` | Bookable slots | multi | `TEXT[]` | yes |  |  |
| catalogue/spaces | `combinable` | Booking | single | `TEXT` | yes |  |  |
| catalogue/spaces | `amenities` | Amenities | multi | `TEXT[]` |  | allows "other" |  |
| catalogue/spaces | `base_rate` | Base rate | money | `BIGINT` | yes |  |  |
| catalogue/spaces | `included_hours` | Hours included | number | `NUMERIC` | yes | min 1, max 48 |  |
| catalogue/spaces | `photos` | Photos | photos | `TEXT[]` |  | min 1, max 8 |  |

### videography

`videography.js` · 11 profile questions · 12 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `specialties` | Specialties | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `events` | Events | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `years` | Years of experience | number | `NUMERIC` | yes | min 0, max 60, unit years |  |
| profile | `showreel` | Showreel link | url | `TEXT` | yes |  |  |
| profile | `portfolio` | Portfolio stills | photos | `TEXT[]` |  | min 3, max 20 |  |
| profile | `equipment` | Equipment | multi | `TEXT[]` |  | allows "other" |  |
| profile | `service_radius_km` | Service area radius | number | `NUMERIC` | yes | min 5, max 3000, unit km |  |
| profile | `deliverables` | Deliverables you offer | multi | `TEXT[]` |  | allows "other" |  |
| profile | `languages` | Languages you speak with families | multi | `TEXT[]` |  | allows "other" |  |
| profile | `same_day_edit` | Same-day edit shown at the reception | toggle | `BOOLEAN` |  |  |  |
| profile | `outstation` | You travel for destination / outstation shoots | toggle | `BOOLEAN` |  |  |  |
| catalogue/offerings | `service` | Service | single | `TEXT` | yes | allows "other" |  |
| catalogue/offerings | `hours` | Hours of filming | number | `NUMERIC` | yes | min 1, max 72 |  |
| catalogue/offerings | `videographers` | Videographers | number | `NUMERIC` | yes | min 1, max 20 |  |
| catalogue/offerings | `cameras` | Cameras | number | `NUMERIC` | yes | min 1, max 30 |  |
| catalogue/offerings | `resolution` | Resolution | single | `TEXT` | yes | allows "other" |  |
| catalogue/offerings | `edit_level` | Edit level | single | `TEXT` | yes | allows "other" |  |
| catalogue/offerings | `highlight_minutes` | Highlight length | number | `NUMERIC` |  | min 0, max 30, unit minutes |  |
| catalogue/offerings | `full_film` | Full-length film included | toggle | `BOOLEAN` |  |  |  |
| catalogue/offerings | `raw` | Raw footage included | toggle | `BOOLEAN` |  |  |  |
| catalogue/offerings | `delivery_days` | Delivery timeline | number | `NUMERIC` | yes | min 1, max 180, unit days |  |
| catalogue/offerings | `revisions` | Revisions included | number | `NUMERIC` |  | min 0, max 10 |  |
| catalogue/offerings | `price` | Price | money | `BIGINT` | yes |  |  |

### warehouse_storage

`warehouse_storage.js` · 21 profile questions · no catalogue

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `item_types` | Item types accepted | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `custom_category` | Another category (reviewed before it is shown) | textarea | `TEXT` |  |  |  |
| profile | `storage_kind` | Storage | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `climate` | Climate-controlled area | toggle | `BOOLEAN` |  |  |  |
| profile | `hazardous_excluded` | Hazardous goods are refused | toggle | `BOOLEAN` | yes |  |  |
| profile | `smallest` | Smallest item accepted | text | `TEXT` |  | max 40 |  |
| profile | `largest` | Largest item accepted | text | `TEXT` |  | max 40 |  |
| facility | `area_sqft` | Usable area | number | `NUMERIC` | yes | min 50, max 2000000, unit sq ft |  |
| facility | `pallet_positions` | Pallet positions | number | `NUMERIC` |  | min 0, max 100000 |  |
| facility | `available_sqft` | Area available to Sambramo customers | number | `NUMERIC` | yes | min 10, max 2000000, unit sq ft |  |
| facility | `access_hours` | Access hours | text | `TEXT` | yes | max 40 |  |
| facility | `security` | Security | multi | `TEXT[]` | yes | allows "other" |  |
| facility | `ceiling_ft` | Clear ceiling height | number | `NUMERIC` |  | min 6, max 80, unit ft |  |
| facility | `truck_access` | A truck can reach the loading door | toggle | `BOOLEAN` |  |  |  |
| facility | `round_clock_access` | Access at any hour | toggle | `BOOLEAN` |  |  |  |
| facility | `inventory_online` | Inventory list and photos shared online | toggle | `BOOLEAN` |  |  |  |
| facility | `equipment` | Loading equipment | multi | `TEXT[]` |  | allows "other" |  |
| facility | `inspection` | Inbound inspection & photo log | toggle | `BOOLEAN` |  |  |  |
| facility | `min_period` | Minimum storage period | single | `TEXT` | yes |  |  |
| facility | `max_period` | Maximum storage period | single | `TEXT` |  |  |  |
| facility | `collection` | You collect and deliver | toggle | `BOOLEAN` |  |  |  |

### wedding_planning

`wedding_planning.js` · 9 profile questions · 11 catalogue fields

| Section | Field key | Label | Type | SQL | Req | Validation | Conditional |
|---|---|---|---|---|---|---|---|
| profile | `services` | Services | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `cities` | Cities / destinations | multi | `TEXT[]` | yes | allows "other" |  |
| profile | `years` | Years planning weddings | number | `NUMERIC` | yes | min 0, max 60, unit years |  |
| profile | `portfolio` | Weddings you planned | photos | `TEXT[]` | yes | min 4, max 30 |  |
| profile | `budget_band` | Typical wedding budget you handle | single | `TEXT` | yes |  |  |
| profile | `wedding_styles` | Wedding traditions you plan | multi | `TEXT[]` |  | allows "other" |  |
| profile | `max_guests` | Largest wedding you have planned | number | `NUMERIC` |  | min 10, max 100000, unit guests |  |
| profile | `languages` | Languages your team works in | multi | `TEXT[]` |  | allows "other" |  |
| profile | `vendor_network` | You bring your own trusted vendor network | toggle | `BOOLEAN` |  |  |  |
| catalogue/packages | `name` | Package name | text | `TEXT` | yes | max 60 |  |
| catalogue/packages | `functions` | Functions covered | number | `NUMERIC` | yes | min 1, max 20 |  |
| catalogue/packages | `planning_months` | Planning period | number | `NUMERIC` | yes | min 0, max 24, unit months |  |
| catalogue/packages | `onsite_days` | Onsite days | number | `NUMERIC` | yes | min 1, max 15 |  |
| catalogue/packages | `onsite_hours` | Onsite hours per day | number | `NUMERIC` |  | min 1, max 24 |  |
| catalogue/packages | `coordinators` | Coordinators onsite | number | `NUMERIC` | yes | min 1, max 50 |  |
| catalogue/packages | `vendor_categories` | Vendors you coordinate | multi | `TEXT[]` | yes | allows "other" |  |
| catalogue/packages | `deliverables` | Deliverables | textarea | `TEXT` | yes | max 400 |  |
| catalogue/packages | `exclusions` | Not included | textarea | `TEXT` | yes | max 400 |  |
| catalogue/packages | `change_limit` | Scope changes included | number | `NUMERIC` |  | min 0, max 20 |  |
| catalogue/packages | `price` | Package fee | money | `BIGINT` | yes |  |  |
