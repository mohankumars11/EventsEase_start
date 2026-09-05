import { supabase } from '../lib/supabase'

// What an operator has added to the catalogue since the last deploy.
//
// ── The shape of the compromise ─────────────────────────────────────────
// The 840 dishes stay in source, because they are read on a screen a
// partner opens standing in a kitchen on a weak connection and a network
// call for a dish list would be a worse app. Migration 103's table is the
// growing edge: an operator who learns that a caterer makes Kaipuli Gojju
// adds it in the admin console and it appears in the funnel on the next
// load, with no deploy and no engineer.
//
// ── Every failure here is silent, and that is deliberate ────────────────
// The table being unreachable — offline, RLS, a migration nobody has
// applied yet — must never stop the funnel rendering. A caterer filling in
// their listing on a patchy connection should get the 840 dishes we
// already have, not an error. So every path returns [] and the merge is a
// no-op.
//
// The cost of that choice is real: an addition can silently not appear.
// It is the right trade anyway, because the failure mode of the other
// choice is a partner staring at a blank screen mid-listing.

/** Rows for the whole catalogue, or [] on any failure whatsoever. */
export async function fetchAdditions() {
  try {
    const { data, error } = await supabase
      .from('catalogue_additions')
      .select('id, kind, cuisine_id, course_id, name, note')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) return []
    return data ?? []
  } catch {
    /* 103 not applied yet, offline, anything. See above. */
    return []
  }
}

/**
 * Fold additions into a course list the funnel already built.
 *
 * `courses` is what coursesForCuisine() returned: [{ id, label, dishes }].
 * Additions land in the course they name. One naming a course that does
 * not exist for this cuisine is DROPPED rather than creating a course out
 * of thin air — a course with one dish in it, appearing only for the
 * caterers unlucky enough to load after a typo, is worse than the
 * addition being missing.
 */
export function mergeAdditions(courses, additions, cuisineId) {
  if (!additions?.length) return courses

  const mine = additions.filter(a => a.kind === 'dish' && a.cuisine_id === cuisineId)
  if (!mine.length) return courses

  return courses.map(c => {
    const add = mine
      .filter(a => a.course_id === c.id)
      .map(a => a.name)
      /* A dish the code list already carries is not added twice. An
         operator cannot be expected to have read all 840. */
      .filter(n => !c.dishes.some(d => d.toLowerCase() === n.toLowerCase()))

    return add.length ? { ...c, dishes: [...c.dishes, ...add] } : c
  })
}

/** Normalise before writing, so the unique index has a fair chance. */
export function tidyName(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}
