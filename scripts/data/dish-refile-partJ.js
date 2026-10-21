/**
 * Dishes that exist but are filed outside the course a partner taps.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WENT WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * 206 dishes sit in the `ml_*` categories, whose course_group is
 * `meal_components` — a course that appears on no chip and that nobody
 * taps. Luchi is a bread. Cholar Dal is a dal. Mangalore Rasam is a
 * rasam. All three were unreachable from the screen a caterer actually
 * uses, which is why the catalogue looked empty while holding 2,238
 * dishes.
 *
 * This is the third cause of the empty-picker report, and the cheapest
 * to fix: the dishes are already written, already carry permanent ids
 * and are already attached to the right cuisines. Only the shelf is
 * wrong.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FAMILIES FIRST, THEN NAMES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Four families account for most of them and can be moved by what they
 * are rather than one at a time — 45 kootu, 20 thambuli, the saarus and
 * the hulis. A kootu is a lentil-and-vegetable dish, so it belongs with
 * the dals; a thambuli is a yoghurt accompaniment; a saaru is a rasam;
 * a huli is sambar. Everything else is named explicitly, because a rule
 * broad enough to catch them would also catch something it should not.
 *
 * Anything this file does not mention stays exactly where it is. Not
 * being sure is a reason to leave a dish alone, not to guess at it.
 */

/* Matched against the dish name, in order; first hit wins. */
export const FAMILIES = [
  [/\bthambuli\b|\btambuli\b/i, 'ac_yogurt'],      // yoghurt accompaniment
  [/\bkootu\b|\bparchukutu\b/i, 'gr_dal'],         // lentils with a vegetable
  [/\brasam\b|\bsaaru\b|\bcharu\b/i, 'sp_rasam'],  // the soup course of a South Indian meal
  [/\bsambar\b|\bhuli\b|\bkuzhambu\b/i, 'gr_sambar'],
  [/\bthovve\b/i, 'gr_dal'],
  [/\bgassi\b|\bsagu\b|\bkurma\b|\bkorma\b/i, 'gr_vegetable'],
  [/\bennegayi\b|\byengai\b|\bengai\b/i, 'gr_vegetable'],
]

/* name -> category. Exact names as they appear in the catalogue. */
export const BY_NAME = {
  // Breads
  'Luchi': 'br_poori',
  'Radhaballavi': 'br_poori',
  'Kochuri (Bengali)': 'br_poori',
  'Thepla': 'br_paratha',
  'Methi Thepla': 'br_paratha',
  'Sattu Paratha': 'br_paratha',
  'Bajra No Rotlo': 'br_rotti',
  'Jonna Rotte': 'br_rotti',
  'Mandua Ki Roti': 'br_rotti',
  'Chilka Roti': 'br_rotti',
  'Malenadu Akki Rotti': 'br_rotti',
  'Siddu': 'br_other',
  'Puran Poli (Gujarati)': 'br_other',
  'Thalipeeth': 'br_rotti',
  'Pithla Bhakri': 'br_rotti',
  'Zunka Bhakar': 'br_rotti',
  'Dal Pitha': 'br_other',
  'Til Pitha': 'br_other',

  // Rice
  'Basanti Pulao': 'rc_pulao',
  'Masale Bhat': 'rc_regional',
  'Joha Rice': 'rc_steamed',
  'Pakhala Bhata': 'rc_regional',
  'Bengali Khichuri': 'rc_khichdi',
  'Vaghareli Khichdi': 'rc_khichdi',
  'Sabudana Khichdi': 'rc_khichdi',
  'Khichdi Kadhi': 'rc_khichdi',
  'Varan Bhaat': 'rc_steamed',
  'Arisi Paruppu Sadam': 'rc_regional',
  'Gojju Avalakki': 'rc_regional',
  'Poha (Kanda Poha)': 'rc_regional',
  'Ragi Mudde': 'rc_millet',
  'Ragi Kali': 'rc_millet',
  'Ulundhu Kali': 'rc_regional',
  'Mor Kali': 'rc_regional',

  // Dal
  'Cholar Dal': 'gr_dal',
  'Gujarati Dal': 'gr_dal',
  'Amti': 'gr_dal',
  'Dalma': 'gr_dal',
  'Ghugni': 'gr_dal',
  'Dal Dhokli': 'gr_dal',
  'Bhatt Ki Churkani': 'gr_dal',
  'Besara': 'gr_vegetable',

  // Desserts
  'Bal Mithai': 'ds_barfi',
  'Chhena Poda': 'ds_bengali',
  'Chhena Jhili': 'ds_bengali',
  'Khaja (Bihari)': 'ds_festival',
  'Khaja (Odia)': 'ds_festival',
  'Thekua': 'ds_festival',
  'Singori': 'ds_festival',
  'Narikol Laru': 'ds_laddu',
  'Kadubu': 'ds_festival',
  'Hittina Kadubu': 'ds_festival',

  // Accompaniments
  'Gujarati Kadhi': 'ac_yogurt',
  'Begun Bhaja': 'ac_other',
  'Aloo Pitika': 'ac_other',
  'Bonda Pachadi': 'ac_pachadi',
  'Keerai Masiyal': 'ac_other',
  'Vazhakkai Podimas': 'ac_other',
  'Phodi': 'ac_other',
  'Tendle Upkari': 'ac_other',
  'Batata Bhaji': 'ac_other',
  'Lasaniya Bataka': 'ac_other',
  'Aloo Ke Gutke': 'ac_other',
  'Beans Paruppu Usili': 'ac_other',

  // Welcome drinks
  'Sol Kadhi': 'bev_coconut',

  // Starters and street food
  'Dhuska': 'st_crispy',
  'Litti Chokha': 'st_regional',
  'Misal Pav': 'ch_pav',
  'Usal Pav': 'ch_pav',
  'Moode': 'bf_regional',
  'Undi': 'bf_regional',
  'Dahi Bara Aloo Dum': 'ch_dahi_bhalla',
  'Mochar Ghonto': 'st_regional',
  'Kesuvina Ele Patrode': 'st_regional',

  // Curries that are curries, just not "components"
  'Aviyal': 'gr_south',
  'Avial (Tamil style)': 'gr_south',
  'Avial (Udupi style)': 'gr_south',
  'Kadala Curry (Kerala Style)': 'gr_kerala',
  'Shukto': 'gr_bengali',
  'Labra': 'gr_bengali',
  'Dhokar Dalna': 'gr_bengali',
  'Chhanar Dalna': 'gr_bengali',
  'Echorer Dalna': 'gr_bengali',
  'Aloo Phulkopir Dalna': 'gr_bengali',
  'Aloo Posto': 'gr_bengali',
  'Ghanta Tarkari': 'gr_bengali',
  'Santula': 'gr_vegetable',
  'Undhiyu': 'gr_vegetable',
  'Ringan No Olo': 'gr_vegetable',
  'Sev Tameta Nu Shaak': 'gr_vegetable',
  'Bhinda Nu Shaak': 'gr_vegetable',
  'Bharli Vangi': 'gr_vegetable',
  'Madra': 'gr_north',
  'Chha Gosht': 'gr_mutton',
  'Kafuli': 'gr_vegetable',
  'Rugra': 'gr_mushroom',
  'Kumm Curry': 'gr_mushroom',
  'Bembla Curry': 'gr_vegetable',
  'Chekke Curry': 'gr_vegetable',
  'Kaipakka': 'gr_vegetable',
  'Kadle Manoli': 'gr_vegetable',
  'Kadle Balyar': 'gr_vegetable',
  'Alsande Ambat': 'gr_vegetable',
  'Sodhi': 'gr_south',
  'Thengai Paal Kuzhambu': 'gr_south',
  'Appe Huli': 'gr_sambar',
  'Pachi Pulusu': 'sp_rasam',
  'Masor Tenga (vegetarian)': 'sp_regional',
  'Khar': 'sp_regional',
  'Bassaru': 'sp_rasam',

  /* ────────────────────────────────────────────────────────────────────
     SECOND PASS
     ────────────────────────────────────────────────────────────────────
     The first pass named four ml_* categories and there are seventeen.
     54 dishes were left behind in ml_sadya, ml_rajasthani,
     ml_north_karnataka, ml_banana_leaf and ml_component.

     A correction to what the first pass claimed: meal_components IS a
     chip, called "Traditional Meal Components". So these were reachable,
     under a chip that does not describe them. A caterer tapping Indian
     Breads still did not find Luchi, which is the part that mattered,
     but "no chip at all" was wrong.

     The thalis, sadyas and ootas STAY in meal_components. A Kerala Sadya
     is a whole banana-leaf meal, not a course, and that chip is exactly
     where somebody selling one would look. */

  'Kerala Sambar': 'gr_sambar',
  'Parippu Curry': 'gr_dal',
  'Kootu Curry': 'gr_dal',
  'Moru Curry': 'gr_kerala',
  'Pulissery': 'gr_kerala',
  'Avial': 'gr_south',
  'Thoran (Cabbage)': 'dr_poriyal',
  'Beans Thoran': 'dr_poriyal',
  'Kichadi (Kerala)': 'ac_pachadi',
  'Pachadi (Pineapple)': 'ac_pachadi',
  'Sharkara Varatti': 'ac_papad',
  'Banana Chips (Kerala)': 'ac_papad',
  'Mango Pickle (Kerala)': 'ac_pickle',

  'Gatte Ki Sabzi': 'gr_vegetable',
  'Ker Sangri': 'gr_vegetable',
  'Panchkuta': 'gr_vegetable',
  'Papad Ki Sabzi': 'gr_vegetable',
  'Methi Dana Sabzi': 'gr_vegetable',
  'Rajasthani Kadhi': 'ac_yogurt',
  'Bajre Ki Roti': 'br_rotti',
  'Missi Roti (Rajasthani)': 'br_chapati',
  'Pyaz Kachori': 'st_crispy',
  'Mirchi Vada (Jodhpur)': 'st_crispy',
  'Bikaneri Bhujia': 'ac_other',
  'Dal Baati Churma': 'ml_rajasthani',

  'Ennegayi Palya': 'dr_poriyal',
  'Kalu Palya': 'dr_poriyal',
  'Jhunka': 'dr_regional_fry',
  'Huggi': 'rc_khichdi',
  'Girmit': 'ch_regional',
  'Mandakki Oggarane': 'ch_regional',
  'Mirchi Bajji (North Karnataka)': 'ch_bajji',
  'Madali': 'ds_festival',
  'Pundi Palle': 'bf_regional',
  'Agase Chutney': 'ac_chutney',
  'Gurellu Chutney': 'ac_chutney',
  'Shenga Chutney Pudi': 'ac_podi',
  'Kalu Saaru': 'sp_rasam',

  /* gr_other is the right COURSE for a gravy and the wrong one for a
     salad, a rice, a soup or a side. These are the ones that are not
     gravies at all. */
  'Som Tam': 'ac_salad',
  'Singju': 'ac_salad',
  'Eromba': 'ac_salad',
  'Thai Jasmine Rice': 'rc_steamed',
  'Thai Basil Fried Rice': 'rc_fried_rice',
  'Jadoh': 'rc_regional',
  'Galho': 'rc_regional',
  'Chak-hao Kheer': 'ds_payasam',
  'Thukpa': 'sp_asian',
  'Tom Kha Gai': 'sp_asian',
  'Bai (Mizo)': 'sp_vegetable',
  'Momos (Northeast)': 'st_regional',
  'Potato Wedges': 'st_crispy',
  'Mashed Potatoes': 'ac_other',
  'Grilled Vegetables': 'dr_other',
  'Sauteed Vegetables': 'dr_other',
  'Stir-Fried Vegetables': 'dr_other',
  'Bamboo Shoot Fry': 'dr_other',
  'Fish and Chips': 'st_fish',
  'Chicken Steak': 'dr_chicken',
  'Lamb Chops': 'dr_mutton',
  'Roast Chicken': 'dr_chicken',
  'Grilled Chicken with Herb Sauce': 'dr_chicken',
  'Grilled Fish with Lemon Butter': 'dr_fish',
  'Cottage Cheese Steak': 'dr_paneer',
  'Smoked Pork with Axone': 'dr_other',
  'Wahan Mosdeng': 'ac_salad',
  'Pika Pila': 'ac_pickle',
  'Mui Borok': 'ac_other',
  'Dohneiiong': 'gr_other',
}
