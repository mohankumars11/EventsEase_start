/**
 * Dishes for the cuisine-and-course cells the catalogue had nothing in.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Measured against the live catalogue on 2026-10-20: 636 of 805
 * cuisine-by-course cells were empty, which is why tapping Starters
 * listed nothing. Migration 183 fixes the half of that caused by too
 * narrow a filter. This file fixes the other half, which is simply that
 * the database held no Gujarati bread, no Bengali dal and no Assamese
 * starter at all.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WRITTEN PER REGION, NOT PER SUB-CUISINE
 * ══════════════════════════════════════════════════════════════════════
 *
 * With 183 in place a dish tagged `wi_gujarati` is offered to every
 * Western India sub-cuisine, with exact matches ranked first. So the
 * target is a region-and-course cell, not all 115 sub-cuisines — 49
 * cells rather than 805, and each dish is filed under the sub-cuisine it
 * genuinely belongs to rather than being tagged eleven ways to defeat a
 * filter.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEEDS REVIEW, AND SAYS SO
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every row lands with provenance `sambramo-curated:partJ` and
 * review_status `needs_review`. They are visible to partners
 * immediately, because an empty screen is the worse failure, and they
 * are flagged in admin so a human who knows the food can correct a
 * spelling or a diet before anyone cooks from them.
 *
 * A `diet` is a claim about a recipe, so where a dish is commonly made
 * both ways the veg reading is recorded and the partner can say
 * otherwise on their own listing.
 */

/* name, aliases, cuisine, category, diet */
const d = (name, cuisine, category, diet = 'veg', aliases = []) =>
  ({ name, cuisine_ids: [cuisine], category_id: category, suggested_diet: diet, aliases })

export const SEED = [
  /* ══════════════════════════════════════════════════════════════════
     WESTERN INDIA — had only main gravies and desserts
     ══════════════════════════════════════════════════════════════════ */

  // Welcome drinks
  d('Chaas', 'wi_gujarati', 'bev_buttermilk_lassi', 'veg', ['Chhaas', 'Masala chaas']),
  d('Gujarati masala chaas', 'wi_gujarati', 'bev_buttermilk_lassi'),
  d('Kokum sharbat', 'wi_konkani', 'bev_traditional', 'veg', ['Sol kadhi sharbat']),
  d('Sol kadhi', 'wi_malvani', 'bev_coconut', 'veg', ['Solkadhi']),
  d('Piyush', 'wi_maharashtrian', 'bev_milk', 'veg', ['Piyush shrikhand drink']),
  d('Kairi panha', 'wi_maharashtrian', 'bev_fruit_drinks', 'veg', ['Aam panna', 'Panha']),
  d('Rajasthani chaach', 'wi_rajasthani', 'bev_buttermilk_lassi'),
  d('Thandai', 'wi_marwari', 'bev_milk', 'veg', ['Sardai']),

  // Starters
  d('Methi muthiya', 'wi_gujarati', 'st_vegetable', 'veg', ['Muthia']),
  d('Dal dhokli vadi', 'wi_gujarati', 'st_regional'),
  d('Gujarati ragda patties', 'wi_gujarati', 'st_regional'),
  d('Kothimbir vadi', 'wi_maharashtrian', 'st_regional', 'veg', ['Kothambir wadi']),
  d('Batata vada', 'wi_maharashtrian', 'st_crispy', 'veg', ['Bataata vada']),
  d('Sabudana vada', 'wi_maharashtrian', 'st_crispy', 'veg', ['Sago vada']),
  d('Mirchi vada', 'wi_rajasthani', 'st_crispy', 'veg', ['Mirchi bada']),
  d('Pyaaz kachori', 'wi_marwari', 'st_crispy', 'veg', ['Onion kachori']),
  d('Goan rava fried fish', 'wi_goan', 'st_fish', 'non_veg', ['Rawa fried fish']),
  d('Prawn rissois', 'wi_goan', 'st_seafood', 'non_veg', ['Rissois de camarao']),
  d('Kolhapuri chicken sukka', 'wi_kathiawadi', 'st_chicken', 'non_veg'),

  // Soups
  d('Tomato saar', 'wi_maharashtrian', 'sp_regional', 'veg', ['Tomato sar']),
  d('Kokum saar', 'wi_konkani', 'sp_regional', 'veg', ['Sol saar']),
  d('Goan prawn curry soup', 'wi_goan', 'sp_nonveg', 'non_veg'),
  d('Dal shorba', 'wi_rajasthani', 'sp_indian_broth'),
  d('Malvani chicken shorba', 'wi_malvani', 'sp_nonveg', 'non_veg'),
  // Dal
  d('Panchmel dal', 'wi_rajasthani', 'gr_dal', 'veg', ['Panchratna dal']),
  d('Dal baati dal', 'wi_marwari', 'gr_dal'),
  d('Gujarati toor dal with jaggery', 'wi_gujarati', 'gr_dal'),
  d('Kathiawadi dal', 'wi_kathiawadi', 'gr_dal'),
  d('Varan', 'wi_maharashtrian', 'gr_dal', 'veg', ['Varan bhaat dal']),
  d('Goan dal curry', 'wi_goan', 'gr_dal'),

  // Rice & biryani
  d('Masala bhaat', 'wi_maharashtrian', 'rc_regional', 'veg', ['Masale bhaat']),
  d('Vagharelo bhaat', 'wi_gujarati', 'rc_flavoured', 'veg', ['Vaghareli khichdi']),
  d('Gujarati khichdi', 'wi_gujarati', 'rc_khichdi'),
  d('Rajasthani gatte ka pulao', 'wi_rajasthani', 'rc_pulao'),
  d('Goan prawn pulao', 'wi_goan', 'rc_pulao', 'non_veg'),
  d('Malvani mutton biryani', 'wi_malvani', 'rc_regional_biryani', 'non_veg'),
  d('Konkani ghee rice', 'wi_konkani', 'rc_flavoured'),

  // Breads
  d('Bajra rotla', 'wi_kathiawadi', 'br_rotti', 'veg', ['Bajri rotla']),
  d('Bhakri', 'wi_maharashtrian', 'br_rotti', 'veg', ['Jowar bhakri']),
  d('Kathiawadi bajra rotlo', 'wi_kathiawadi', 'br_rotti'),
  d('Rotlo', 'wi_kathiawadi', 'br_rotti', 'veg', ['Bajra rotlo']),
  d('Bajra roti', 'wi_rajasthani', 'br_rotti'),
  d('Missi roti', 'wi_marwari', 'br_chapati'),
  d('Goan poee', 'wi_goan', 'br_other', 'veg', ['Poi', 'Goan bread']),
  d('Vade', 'wi_malvani', 'br_poori', 'veg', ['Malvani vade']),

  // Accompaniments
  d('Chundo', 'wi_gujarati', 'ac_pickle', 'veg', ['Chhundo', 'Mango chundo']),
  d('Gujarati kadhi with pakora', 'wi_gujarati', 'ac_yogurt'),
  d('Methia keri pickle', 'wi_kathiawadi', 'ac_pickle'),
  d('Thecha', 'wi_maharashtrian', 'ac_chutney', 'veg', ['Jhunka thecha']),
  d('Goan tomato chutney', 'wi_goan', 'ac_chutney'),
  d('Papad', 'wi_rajasthani', 'ac_papad', 'veg', ['Papadum']),

  // Salads
  d('Kachumber', 'wi_maharashtrian', 'ac_salad', 'veg', ['Kachumbar']),
  d('Gujarati sambharo', 'wi_gujarati', 'ac_salad', 'veg', ['Sambharo']),
  d('Cucumber koshimbir', 'wi_maharashtrian', 'ac_salad'),
  d('Rajasthani onion salad', 'wi_rajasthani', 'ac_salad'),
  /* ══════════════════════════════════════════════════════════════════
     EASTERN & NORTHEASTERN INDIA — had main gravies and sweets only
     ══════════════════════════════════════════════════════════════════ */

  // Welcome drinks
  d('Aam pora shorbot', 'ei_bengali', 'bev_fruit_drinks', 'veg', ['Aam pora sharbat']),
  d('Gondhoraj ghol', 'ei_bengali', 'bev_buttermilk_lassi', 'veg', ['Gondhoraj lebu ghol']),
  d('Bel pana', 'ei_odia', 'bev_fruit_drinks', 'veg', ['Bela pana']),
  d('Sattu sharbat', 'ei_bihari', 'bev_traditional'),
  d('Assam red tea', 'ei_assamese', 'bev_tea', 'veg', ['Lal cha']),
  d('Nimbu paani', 'ei_jharkhandi', 'bev_lemon'),

  // Starters
  d('Beguni', 'ei_bengali', 'st_crispy', 'veg', ['Begun bhaja batter fried']),
  d('Mochar chop', 'ei_bengali', 'st_regional', 'veg', ['Banana flower cutlet']),
  d('Fish kabiraji cutlet', 'ei_bengali', 'st_cutlet', 'non_veg', ['Kobiraji cutlet']),
  d('Dhakai fish fry', 'ei_bengali', 'st_fish', 'non_veg'),
  d('Chhena poda bites', 'ei_odia', 'st_regional'),
  d('Dahi vada Odia style', 'ei_odia', 'st_regional', 'veg', ['Dahi bara']),
  d('Litti', 'ei_bihari', 'st_regional', 'veg', ['Litti chokha']),
  d('Pitika balls', 'ei_assamese', 'st_regional', 'veg', ['Aloo pitika']),
  d('Pork with bamboo shoot bites', 'ne_naga', 'st_regional', 'non_veg'),
  d('Kangshoi fritters', 'ne_manipuri', 'st_vegetable'),
  d('Jadoh bites', 'ne_meghalaya', 'st_regional', 'non_veg'),
  d('Bamboo steamed chicken', 'ne_mizo', 'st_chicken', 'non_veg'),

  // Soups
  d('Kangshoi', 'ne_manipuri', 'sp_regional', 'veg', ['Manipuri vegetable stew']),
  d('Bamboo shoot soup', 'ne_naga', 'sp_regional'),
  d('Bengali fish head soup', 'ei_bengali', 'sp_nonveg', 'non_veg', ['Muri ghonto broth']),
  d('Tungrymbai broth', 'ne_meghalaya', 'sp_regional'),
  d('Assamese khar broth', 'ei_assamese', 'sp_regional'),
  d('Bai', 'ne_mizo', 'sp_vegetable', 'veg', ['Mizo bai']),

  // Dal
  d('Musurir dal', 'ei_bengali', 'gr_dal', 'veg', ['Masoor dal Bengali']),
  d('Bhaja muger dal', 'ei_bengali', 'gr_dal', 'veg', ['Roasted moong dal']),
  d('Odia muga dali', 'ei_odia', 'gr_dal'),
  d('Bihari chana dal', 'ei_bihari', 'gr_dal'),
  d('Maah dali', 'ei_assamese', 'gr_dal', 'veg', ['Assamese black gram dal']),
  d('Jharkhandi arhar dal', 'ei_jharkhandi', 'gr_dal'),

  // Rice & biryani
  d('Kolkata chicken biryani', 'ei_bengali', 'rc_regional_biryani', 'non_veg', ['Calcutta biryani']),
  d('Ghee bhat', 'ei_odia', 'rc_flavoured', 'veg', ['Ghee rice Odia']),
  d('Bihari chura', 'ei_bihari', 'rc_regional'),
  d('Bengali ghee bhat', 'ei_bengali', 'rc_flavoured'),
  d('Odia kanika', 'ei_odia', 'rc_pulao', 'veg', ['Sweet pulao Odia']),
  d('Chak-hao kheer rice', 'ne_manipuri', 'rc_regional', 'veg', ['Black rice']),

  // Breads
  d('Odia poda pitha bread', 'ei_odia', 'br_other'),
  d('Bengali porota', 'ei_bengali', 'br_paratha', 'veg', ['Mughlai porota']),
  d('Makuni paratha', 'ei_bihari', 'br_paratha', 'veg', ['Sattu paratha']),
  d('Assamese rice roti', 'ei_assamese', 'br_rotti'),
  d('Naga rice bread', 'ne_naga', 'br_other'),

  // Accompaniments
  d('Kasundi', 'ei_bengali', 'ac_pickle', 'veg', ['Bengali mustard sauce']),
  d('Aam ka achar Bihari', 'ei_bihari', 'ac_pickle'),
  d('Odia tomato khatta', 'ei_odia', 'ac_chutney', 'veg', ['Khata']),
  d('Bamboo shoot pickle', 'ne_naga', 'ac_pickle'),
  d('Tungrymbai', 'ne_meghalaya', 'ac_other'),

  // Salads
  d('Bengali shosha salad', 'ei_bengali', 'ac_salad'),
  d('Manipuri yongchak salad', 'ne_manipuri', 'ac_salad'),
  d('Assamese raw papaya salad', 'ei_assamese', 'ac_salad'),
  d('Naga cucumber and chilli salad', 'ne_naga', 'ac_salad'),
  /* ══════════════════════════════════════════════════════════════════
     SPECIALIZED FOOD STYLES — 44 dishes across nine styles, and nothing
     at all in eight of the ten courses. These are not a cuisine; they
     are how a Jain, satvik or allergen-aware customer finds anybody,
     which is why an empty screen here loses the booking outright.
     ══════════════════════════════════════════════════════════════════ */

  // Welcome drinks
  d('Jain nimbu sharbat', 'sp_jain', 'bev_lemon', 'jain'),
  d('Satvik tulsi sharbat', 'sp_satvik', 'bev_traditional'),
  d('Vegan almond milk cooler', 'sp_vegan', 'bev_milk', 'vegan'),
  d('Tender coconut water', 'sp_healthy', 'bev_coconut'),
  d('Millet ragi malt drink', 'sp_millet', 'bev_traditional', 'veg', ['Ragi malt']),
  d('Fresh orange juice', 'sp_kids', 'bev_fresh_juice'),
  d('Nut-free fruit punch', 'sp_allergen_aware', 'bev_fruit_drinks'),
  d('Plain buttermilk, no onion no garlic', 'sp_no_onion_garlic', 'bev_buttermilk_lassi'),

  // Starters
  d('Jain paneer tikka', 'sp_jain', 'st_tikka', 'jain'),
  d('Jain corn cutlet', 'sp_jain', 'st_cutlet', 'jain'),
  d('Satvik paneer tikka', 'sp_satvik', 'st_tikka'),
  d('Vegan hara bhara kebab', 'sp_vegan', 'st_kebab', 'vegan'),
  d('Vegan tofu tikka', 'sp_vegan', 'st_tikka', 'vegan'),
  d('Ragi crispy fingers', 'sp_millet', 'st_crispy'),
  d('Baked vegetable cutlet', 'sp_healthy', 'st_cutlet'),
  d('Nut-free vegetable spring roll', 'sp_allergen_aware', 'st_spring_roll'),
  d('No onion no garlic paneer tikka', 'sp_no_onion_garlic', 'st_tikka'),

  // Soups
  d('Jain tomato soup', 'sp_jain', 'sp_tomato', 'jain'),
  d('Satvik vegetable clear soup', 'sp_satvik', 'sp_clear'),
  d('Vegan coconut vegetable soup', 'sp_vegan', 'sp_vegetable', 'vegan'),
  d('Millet and vegetable broth', 'sp_millet', 'sp_vegetable'),
  d('Dairy-free sweet corn soup', 'sp_allergen_aware', 'sp_sweet_corn'),
  d('Clear vegetable soup, no onion no garlic', 'sp_no_onion_garlic', 'sp_clear'),

  // Main gravies
  d('Jain kaju curry', 'sp_jain', 'gr_vegetable', 'jain'),
  d('Jain mixed vegetable curry', 'sp_jain', 'gr_vegetable', 'jain'),
  d('Satvik paneer curry', 'sp_satvik', 'gr_paneer'),
  d('Satvik aloo gobi', 'sp_satvik', 'gr_vegetable'),
  d('Vegan tofu curry', 'sp_vegan', 'gr_vegetable', 'vegan'),
  d('Vegan coconut vegetable korma', 'sp_vegan', 'gr_vegetable', 'vegan'),
  d('Millet vegetable curry', 'sp_millet', 'gr_vegetable'),
  d('No onion no garlic mixed vegetable', 'sp_no_onion_garlic', 'gr_vegetable'),
  d('Nut-free paneer curry', 'sp_allergen_aware', 'gr_paneer'),
  d('Kid-friendly mild paneer curry', 'sp_kids', 'gr_paneer'),

  // Dal
  d('Jain dal fry', 'sp_jain', 'gr_dal', 'jain'),
  d('Satvik toor dal', 'sp_satvik', 'gr_dal'),
  d('Vegan dal tadka in oil', 'sp_vegan', 'gr_dal', 'vegan'),
  d('Millet dal khichdi', 'sp_millet', 'gr_dal'),
  d('Dal without onion and garlic', 'sp_no_onion_garlic', 'gr_dal'),
  d('Plain yellow dal for children', 'sp_kids', 'gr_dal'),

  // Rice
  d('Jain jeera rice', 'sp_jain', 'rc_flavoured', 'jain'),
  d('Satvik ghee rice', 'sp_satvik', 'rc_flavoured'),
  d('Vegan lemon rice', 'sp_vegan', 'rc_flavoured', 'vegan'),
  d('Little millet lemon rice', 'sp_millet', 'rc_millet'),
  d('Plain steamed rice, no onion no garlic', 'sp_no_onion_garlic', 'rc_steamed'),
  d('Mild vegetable pulao for children', 'sp_kids', 'rc_pulao'),

  // Breads
  d('Jain roti', 'sp_jain', 'br_chapati', 'jain'),
  d('Jain poori', 'sp_jain', 'br_poori', 'jain'),
  d('Satvik phulka', 'sp_satvik', 'br_chapati'),
  d('Vegan whole wheat roti', 'sp_vegan', 'br_chapati', 'vegan'),
  d('Ragi roti', 'sp_millet', 'br_rotti', 'veg', ['Ragi rotti']),
  d('Jowar roti', 'sp_millet', 'br_rotti'),
  d('Gluten-free millet roti', 'sp_allergen_aware', 'br_rotti'),
  d('Butter-free chapati', 'sp_healthy', 'br_chapati'),

  // Accompaniments
  d('Jain green chutney', 'sp_jain', 'ac_chutney', 'jain'),
  d('Satvik coriander chutney', 'sp_satvik', 'ac_chutney'),
  d('Vegan coconut chutney', 'sp_vegan', 'ac_chutney', 'vegan'),
  d('Dairy-free mint chutney', 'sp_allergen_aware', 'ac_chutney'),
  d('Plain curd', 'sp_kids', 'ac_yogurt'),
  d('Papad, roasted', 'sp_healthy', 'ac_papad'),
  d('Chutney without onion and garlic', 'sp_no_onion_garlic', 'ac_chutney'),

  // Salads
  d('Jain cucumber salad', 'sp_jain', 'ac_salad', 'jain'),
  d('Satvik fruit and vegetable salad', 'sp_satvik', 'ac_salad'),
  d('Vegan sprouts salad', 'sp_vegan', 'ac_salad', 'vegan'),
  d('Millet and vegetable salad', 'sp_millet', 'ac_salad'),
  d('Green salad, no dressing', 'sp_healthy', 'ac_salad'),

  // Desserts
  d('Jain rava kesari', 'sp_jain', 'ds_halwa', 'jain'),
  d('Satvik sabudana kheer', 'sp_satvik', 'ds_payasam'),
  d('Vegan coconut milk payasam', 'sp_vegan', 'ds_payasam', 'vegan'),
  d('Ragi laddu', 'sp_millet', 'ds_laddu'),
  d('Dairy-free fruit custard', 'sp_allergen_aware', 'ds_fruit'),
  d('Fresh fruit bowl', 'sp_healthy', 'ds_fruit'),
  d('Mini gulab jamun for children', 'sp_kids', 'ds_syrup'),
  d('Kheer without nuts', 'sp_allergen_aware', 'ds_payasam'),
  /* ══════════════════════════════════════════════════════════════════
     KERALA · ANDHRA & TELANGANA · TAMIL NADU — thin at the edges of the
     meal rather than in the middle: no welcome drink, no salad, almost
     no bread or accompaniment.
     ══════════════════════════════════════════════════════════════════ */

  d('Sambharam', 'kl_sadya', 'bev_buttermilk_lassi', 'veg', ['Kerala spiced buttermilk']),
  d('Nannari sharbat', 'kl_travancore', 'bev_traditional', 'veg', ['Nannari sarbath']),
  d('Tender coconut, Kerala', 'kl_malabar', 'bev_coconut'),
  d('Sulaimani', 'kl_thalassery', 'bev_tea', 'veg', ['Sulaimani chai']),
  d('Kerala rasam shorba', 'kl_sadya', 'sp_rasam'),
  d('Malabar chicken soup', 'kl_malabar', 'sp_nonveg', 'non_veg'),
  d('Kerala sambar dal', 'kl_sadya', 'gr_dal'),
  d('Cherupayar curry', 'kl_travancore', 'gr_dal', 'veg', ['Green gram curry']),
  d('Kerala coconut chutney', 'kl_sadya', 'ac_chutney'),
  d('Kerala naranga achar', 'kl_sadya', 'ac_pickle', 'veg', ['Lemon pickle Kerala']),
  d('Pappadam', 'kl_sadya', 'ac_papad'),
  d('Kerala cucumber pachadi', 'kl_sadya', 'ac_pachadi'),
  d('Kerala kichadi', 'kl_travancore', 'ac_pachadi'),
  d('Kerala raw mango salad', 'kl_malabar', 'ac_salad'),
  d('Cabbage thoran salad', 'kl_sadya', 'ac_salad'),

  d('Andhra majjiga', 'ap_traditional', 'bev_buttermilk_lassi', 'veg', ['Majjiga']),
  d('Bellam panakam', 'ap_traditional', 'bev_traditional', 'veg', ['Panakam']),
  d('Nimmakaya juice', 'ap_coastal', 'bev_lemon'),
  d('Rose milk, Hyderabad style', 'tg_hyderabadi', 'bev_milk'),
  d('Andhra masala vada', 'ap_traditional', 'st_crispy'),
  d('Mirapakaya bajji', 'ap_rayalaseema', 'st_crispy', 'veg', ['Mirchi bajji']),
  d('Chicken 65, Andhra', 'ap_coastal', 'st_chicken', 'non_veg'),
  d('Andhra tomato charu', 'ap_traditional', 'sp_rasam', 'veg', ['Tomato charu']),
  d('Miriyala charu', 'ap_rayalaseema', 'sp_rasam', 'veg', ['Pepper rasam Andhra']),
  d('Andhra chapati', 'ap_traditional', 'br_chapati'),
  d('Telangana sajja rotte', 'tg_traditional', 'br_rotti'),
  d('Telangana makka rotte', 'tg_traditional', 'br_rotti'),
  d('Andhra onion salad', 'ap_traditional', 'ac_salad'),
  d('Telangana cucumber salad', 'tg_traditional', 'ac_salad'),

  d('Paneer soda', 'tn_chennai', 'bev_traditional', 'veg', ['Goli soda']),
  d('Nannari sarbath, Madurai', 'tn_madurai', 'bev_traditional'),
  d('Tamil neer mor', 'tn_traditional', 'bev_buttermilk_lassi', 'veg', ['Neer mor']),
  d('Parotta, Madurai', 'tn_madurai', 'br_parotta', 'veg', ['Madurai parotta']),
  d('Kal dosa', 'tn_tiffin', 'br_other'),
  d('Tamil chapati', 'tn_traditional', 'br_chapati'),
  d('Thengai thogayal', 'tn_traditional', 'ac_thogayal', 'veg', ['Coconut thogayal']),
  d('Manga thokku', 'tn_chettinad', 'ac_pickle', 'veg', ['Mango thokku']),
  d('Tamil appalam', 'tn_wedding', 'ac_papad', 'veg', ['Appalam']),
  d('Kathirikai pachadi', 'tn_traditional', 'ac_pachadi'),
  d('Vellarikkai kosumalli', 'tn_wedding', 'ac_kosambari', 'veg', ['Kosumalli']),
  d('Tamil carrot kosumalli', 'tn_traditional', 'ac_kosambari'),

  /* ══════════════════════════════════════════════════════════════════
     INTERNATIONAL · NORTH INDIA · OTHER INDIAN STYLES
     ══════════════════════════════════════════════════════════════════ */

  d('Virgin mojito', 'in_continental', 'bev_mocktail'),
  d('Iced peach tea', 'in_american', 'bev_mocktail'),
  d('Italian lemon soda', 'in_italian', 'bev_signature'),
  d('Turkish ayran', 'in_turkish', 'bev_buttermilk_lassi'),
  d('Thai lemongrass cooler', 'in_thai', 'bev_signature'),
  d('Minestrone', 'in_italian', 'sp_vegetable'),
  d('Cream of mushroom soup', 'in_continental', 'sp_mushroom'),
  d('Tom yum, vegetarian', 'in_thai', 'sp_asian'),
  d('Hot and sour soup', 'in_chinese', 'sp_asian'),
  d('Lentil shorba, Lebanese', 'in_lebanese', 'gr_dal'),
  d('Middle Eastern garlic toum', 'in_middle_eastern', 'ac_dip'),
  d('Labneh dip', 'in_lebanese', 'ac_dip'),
  d('Greek melitzanosalata', 'in_greek', 'ac_dip'),
  d('Salsa and guacamole', 'in_mexican', 'ac_dip'),
  d('Garden green salad', 'in_continental', 'ac_salad'),
  d('Caesar salad, vegetarian', 'in_american', 'ac_salad'),
  d('Greek salad', 'in_greek', 'ac_salad'),
  d('Lebanese tabbouleh', 'in_lebanese', 'ac_salad'),
  d('Thai raw papaya salad', 'in_thai', 'ac_salad', 'veg', ['Som tam']),

  d('Punjabi lassi', 'ni_punjabi', 'bev_buttermilk_lassi', 'veg', ['Sweet lassi']),
  d('Shikanji', 'ni_delhi', 'bev_lemon', 'veg', ['Nimbu shikanji']),
  d('Kashmiri kahwa', 'ni_kashmiri', 'bev_tea', 'veg', ['Kahwa']),
  d('Awadhi thandai', 'ni_awadhi', 'bev_milk'),

  d('Chana dal for street thali', 'oi_street_food', 'gr_dal'),
  d('Pav', 'oi_street_food', 'br_other', 'veg', ['Ladi pav']),
  d('Kulcha, street style', 'oi_snacks', 'br_kulcha'),
  d('Street style green chutney', 'oi_street_food', 'ac_chutney'),
  d('Sweet tamarind chutney', 'oi_street_food', 'ac_chutney', 'veg', ['Imli chutney']),
  d('Onion and lemon plate', 'oi_street_food', 'ac_salad'),
  d('Sprouts chaat salad', 'oi_snacks', 'ac_salad'),
]
