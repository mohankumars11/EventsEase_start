/**
 * Catering & Food — the fixed choices the screens offer. The food catalogue
 * itself (cuisines, categories, 2,000+ dishes) lives in the database
 * (migration 20261010_12, scripts/import-food-catalogue.mjs); only the small
 * taxonomy seed is bundled, as an offline fallback.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import CUISINE_SEED from '../../../../../supabase/seed/food-catalogue/v1/cuisines.json'
import CATEGORY_SEED from '../../../../../supabase/seed/food-catalogue/v1/categories.json'

export const SERVICES = ['Wedding catering', 'Corporate catering', 'Home functions', 'Birthday parties', 'Religious ceremonies',
  'Traditional wedding meals', 'Breakfast catering', 'Lunch or dinner catering', 'Buffet catering', 'Plated meals', 'Packed meals',
  'Live food counters', 'Dessert catering', 'Beverage catering', 'Institutional or bulk catering']
export const PREP_LOCATIONS = ['At my kitchen or catering facility', "At the customer's venue", 'At both locations']
export const SERVICE_STYLES = ['Buffet', 'Traditional banana-leaf meal', 'Seated / plated service', 'Family-style serving', 'Packed meals',
  'Food counters', 'Live cooking', 'Mixed service styles']
export const SERVICE_AREAS = [['10', 'Within 10 km'], ['25', 'Within 25 km'], ['50', 'Within 50 km'], ['100', 'Within 100 km'],
  ['state', 'Throughout Karnataka'], ['india', 'Across India'], ['custom', 'Custom service area']]

export const DIETS = [['veg', 'Vegetarian'], ['non_veg', 'Non-vegetarian'], ['egg', 'Contains egg'], ['vegan', 'Vegan'], ['jain', 'Jain'], ['other', 'Other / custom']]
export const DIET_LABEL = Object.fromEntries(DIETS)
export const MENU_DIETS = [['veg', 'Pure vegetarian'], ['non_veg', 'Non-vegetarian'], ['mixed', 'Veg + non-veg'], ['vegan', 'Vegan'], ['jain', 'Jain']]

export const SERVING_UNITS = [['g', 'grams'], ['kg', 'kg'], ['ml', 'ml'], ['l', 'litre'], ['piece', 'pieces'], ['cup', 'cup'], ['glass', 'glass'], ['portion', 'portion']]
export const STANDALONE_UNITS = [['per_serving', 'Per serving / person'], ['per_piece', 'Per piece'], ['per_kg', 'Per kg'], ['per_100g', 'Per 100 g'],
  ['per_litre', 'Per litre'], ['per_cup', 'Per cup / glass'], ['per_tray', 'Per tray'], ['per_box', 'Per box / pack'], ['per_fixed_qty', 'Per fixed quantity']]
export const ALLERGENS = ['Milk / dairy', 'Nuts (tree nuts)', 'Peanuts', 'Gluten / wheat', 'Soy', 'Egg', 'Fish', 'Shellfish', 'Sesame', 'Mustard',
  'Celery', 'Sulphites', 'Coconut', 'Garlic', 'Onion']

export const EVENT_TYPES = ['Weddings', 'Receptions', 'Engagements', 'Corporate events', 'Birthday parties', 'House functions',
  'Religious ceremonies', 'Festivals', 'Conferences', 'Private parties']
export const INCLUDED_SERVICES = [['serving_staff', 'Serving staff'], ['crockery', 'Crockery & cutlery'], ['buffet_setup', 'Buffet setup'],
  ['chafing', 'Chafing dishes'], ['water_station', 'Water station'], ['cleanup', 'Cleanup'], ['transport', 'Food transport']]

export const COUNTER_TEMPLATES = [
  ['Indian breakfast & tiffin', ['Dosa Counter', 'Live Appam Counter', 'Idli / Vada Counter', 'Poori Counter']],
  ['Chaat', ['Pani Puri Counter', 'Bhel / Sev Puri Counter', 'Dahi Puri / Dahi Bhalla Counter', 'Aloo Tikki Counter']],
  ['Indian mains', ['Roti / Naan Counter', 'Chaat and Tawa Counter', 'Rice / Biryani Counter', 'Tandoor Counter']],
  ['Indo-Chinese & international', ['Pasta Counter', 'Pizza Counter', 'Noodle Counter', 'Stir-Fry Counter']],
  ['Desserts & sweets', ['Jalebi Counter', 'Live Halwa Counter', 'Waffle / Pancake Counter', 'Ice Cream Counter', 'Kulfi Counter']],
  ['Beverages', ['Fresh Juice Counter', 'Mocktail Counter', 'Tea / Coffee Counter', 'Filter Coffee Counter']],
]
export const COUNTER_PRICE_MODELS = [['per_event', 'Per counter per event'], ['per_hour', 'Per counter per hour'], ['per_guest', 'Per guest'],
  ['per_serving', 'Per serving'], ['fixed', 'Fixed counter package'], ['quote', 'Custom quote']]

export const ADDON_TEMPLATES = [
  ['extra_staff', 'Additional serving staff', 'per_staff_hour'], ['extra_counter', 'Extra buffet counter', 'per_counter'],
  ['live_station', 'Live cooking station', 'per_event'], ['crockery', 'Crockery and cutlery', 'per_guest'], ['premium_crockery', 'Premium crockery', 'per_guest'],
  ['buffet_setup', 'Table and buffet setup', 'per_event'], ['serving_equipment', 'Serving equipment', 'per_event'], ['transport', 'Food transport', 'per_trip'],
  ['chafing', 'Chafing dishes', 'per_item'], ['water_station', 'Water / refreshment station', 'per_event'], ['extra_hours', 'Additional service hours', 'per_hour'],
  ['extra_setup', 'Extra setup / teardown time', 'per_hour'], ['packaging', 'Special packaging', 'per_box'], ['late_night', 'Late-night service', 'per_event'],
  ['customisation', 'Meal customisation', 'per_guest'],
]
export const ADDON_UNIT_LABEL = { per_event: 'per event', per_guest: 'per guest', per_staff_hour: 'per staff per hour', per_counter: 'per counter',
  per_trip: 'per trip', per_item: 'per item', per_hour: 'per hour', per_box: 'per box', per_staff: 'per staff', per_counter_hour: 'per counter per hour' }

/** Cuisines and food categories: the database, else the bundled seed. */
export function useFoodTaxonomy() {
  const fallback = {
    groups: CUISINE_SEED.groups.map(g => ({ id: g.id, name: g.name, styles: g.styles.map(([id, name]) => ({ id, name })) })),
    courses: CATEGORY_SEED.course_groups.map(([id, name]) => ({ id, name })),
    categories: CATEGORY_SEED.parents.flatMap(p => p.children.map(([id, name, course]) => ({ id, name, parent: p.name, course: course ?? p.course }))),
    source: 'seed',
  }
  const [tax, setTax] = useState(fallback)
  useEffect(() => {
    let live = true
    Promise.all([
      supabase.from('sambramo_cuisines').select('id, group_id, group_name, name, sort').eq('active', true).order('sort'),
      supabase.from('sambramo_food_categories').select('id, parent_name, name, course_group, sort').order('sort'),
    ]).then(([c, f]) => {
      if (!live || c.error || f.error || !c.data?.length) return
      const groups = []
      for (const r of c.data) {
        let g = groups.find(x => x.id === r.group_id)
        if (!g) groups.push(g = { id: r.group_id, name: r.group_name, styles: [] })
        g.styles.push({ id: r.id, name: r.name })
      }
      setTax(t => ({ ...t, groups, categories: f.data.map(r => ({ id: r.id, name: r.name, parent: r.parent_name, course: r.course_group })), source: 'db' }))
    }, () => {})
    return () => { live = false }
  }, [])
  return tax
}

export const slugKey = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
export const toR = p => (p === undefined || p === null || p === '' ? '' : String(Math.round(Number(p) / 100)))
export const toP = r => (r === '' || r === undefined ? null : Math.round(Number(String(r).replace(/[^\d.]/g, '')) * 100) || null)
export const inr = p => `₹${Math.round((Number(p) || 0) / 100).toLocaleString('en-IN')}`
export const customer = (take, fee) => Math.round(Number(take || 0) / (1 - fee) / 10) * 10
