import { supabase } from './supabase'

/**
 * Reading and writing venues.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A VENUE IS NOT A `vendor_service` ROW
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everywhere else in this app a partner's offering is a row in
 * `vendor_services` with a name, a price and a trade, matched by
 * `match_partners` inside a radius. A venue breaks both halves of that:
 *
 *   · A customer in Indiranagar will drive to Yelahanka for the right
 *     hall. Radius is the wrong filter for the one service people
 *     genuinely travel across the city for.
 *
 *   · `vendor_availability` holds one row per vendor per day. A hotel
 *     with a boardroom, a cluster banquet and a ballroom cannot say the
 *     ballroom is gone and the boardroom is free — and that sentence is
 *     the entire product a venue manager is signing up for.
 *
 * So 094 gives venues their own spine — venues, venue_spaces,
 * venue_slots, venue_managers — and 095 gives them their own matching
 * that takes no radius at all.
 */

export const VENUE_KINDS = [
  { id: 'mantapa',    label: 'Kalyana mantapa',  scan: 'Choultry, wedding hall' },
  { id: 'convention', label: 'Convention centre', scan: 'Exhibition or conference hall' },
  { id: 'hotel',      label: 'Hotel banquet',     scan: 'Banquet inside a hotel' },
  { id: 'lawn',       label: 'Lawn or party plot', scan: 'Open ground, farmhouse' },
  { id: 'rooftop',    label: 'Rooftop or restaurant', scan: 'Terrace, party zone' },
  { id: 'resort',     label: 'Resort',            scan: 'Weekend getaway property' },
  { id: 'clubhouse',  label: 'Clubhouse or auditorium', scan: 'Community or institutional' },
  { id: 'hall',       label: 'Other hall',        scan: 'Anything else' },
]

export const KIND_LABEL = Object.fromEntries(VENUE_KINDS.map(k => [k.id, k.label]))

/* Morning and evening, because a mantapa routinely runs a wedding and a
   reception on one day and they are two separate bookings. A day-only
   calendar refuses the second, which takes half a Saturday's revenue off
   a venue that was willing to list with us. */
export const SESSIONS = [
  { id: 'morning',  label: 'Morning',  scan: 'Muhurta, lunch functions' },
  { id: 'evening',  label: 'Evening',  scan: 'Reception, dinner' },
  { id: 'full_day', label: 'Full day', scan: 'Both, one booking' },
]

/** Venues this partner manages, with their spaces. */
export async function myVenues(vendorId) {
  if (!vendorId) return []
  const { data, error } = await supabase
    .from('venue_managers')
    .select(`
      role,
      venue:venues (
        id, name, venue_kind, area_label, pincode, address_line, status,
        spaces:venue_spaces ( id, space_name, floating_capacity, seated_capacity,
                              is_ac, has_stage, floor_type, attributes, is_active, sort_order )
      )
    `)
    .eq('vendor_id', vendorId)
  if (error) throw error
  return (data ?? [])
    .filter(r => r.venue)
    .map(r => ({ ...r.venue, myRole: r.role }))
}

/**
 * Type-ahead over venues nobody manages yet.
 *
 * A claimed venue is never offered. It belongs to somebody, and putting
 * it in a search box invites a second manager to try — which
 * `uq_venue_one_owner` would refuse, but only after they had typed their
 * whole business into a form.
 */
export async function searchUnclaimed(term) {
  const q = String(term ?? '').trim()
  if (q.length < 2) return []
  /* Unclaimed, OR a pending one nobody owns.
   *
   * The second case exists because of a real row: "TTD kalyana" was
   * proposed by a partner, its venue_managers insert failed silently, and
   * the venue became invisible to everybody -- including the person who
   * had just added it, because this search only looked at 'unclaimed'.
   *
   * 100 makes that failure impossible going forward. This makes the row
   * it already produced reachable, so whoever added it finds it by typing
   * its name instead of adding it a second time. */
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, venue_kind, area_label, pincode, status, managers:venue_managers(id)')
    .in('status', ['unclaimed', 'pending_review'])
    .ilike('name', `%${q}%`)
    .limit(20)
  if (error) throw error
  return (data ?? [])
    .filter(v => v.status === 'unclaimed' || !(v.managers ?? []).length)
    .slice(0, 12)
}

/**
 * Claim a seeded venue.
 *
 * The 23505 branch is the whole reason this is worth a wrapper. Two
 * managers at one hotel both tapping claim is not a rare race, it is the
 * normal first day, and `uq_venue_one_owner` settles it in the database.
 * What reaches the person who lost is a sentence, not a Postgres code.
 */
export async function claimVenue(vendorId, venueId) {
  const { error } = await supabase
    .from('venue_managers')
    .insert({ vendor_id: vendorId, venue_id: venueId, role: 'OWNER' })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Somebody at this venue has already claimed it. Ask them to add you, or tell us and we will sort it out.')
    }
    throw error
  }

  /* The venue becomes live only now. Until somebody owns it there is no
     calendar and nobody to ring, so `venues_available()` will not return
     it — offering a booking we cannot honour is worse than not listing. */
  const { error: upErr } = await supabase
    .from('venues').update({ status: 'claimed' }).eq('id', venueId)
  if (upErr) throw upErr
}

/**
 * Propose a venue that is not in the list.
 *
 * OSM is thin on exactly the venues this market cares most about, so this
 * is not an edge case — it is half the supply. It lands in
 * `pending_review` and RLS will not let a partner write any other status,
 * which is what stops the venue table rotting back into the free-text
 * mess the dropdown exists to prevent.
 */
export async function proposeVenue(vendorId, { name, venue_kind, area_label, pincode, address_line, lat, lng }) {
  /* One RPC, one transaction.
   *
   * This was two inserts from the browser -- the venue, then the claim --
   * and the second one's error was never checked. It failed on a live
   * account and the app said "Sent for checking" anyway, leaving a venue
   * nobody owned and a manager who believed they had listed it.
   *
   * Checking that error would have surfaced the bug. It would not have
   * prevented it: a phone that loses signal between two requests produces
   * the same orphan, and no amount of client error handling makes two
   * statements atomic. See migration 100. */
  const { data, error } = await supabase.rpc('propose_venue', {
    p_vendor_id: vendorId,
    p_name: name,
    p_venue_kind: venue_kind,
    p_area_label: area_label || null,
    p_pincode: pincode || null,
    p_address_line: address_line || null,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('This venue is already on Sambramo. Search for it by name above.')
    }
    if (/not your business/i.test(error.message)) {
      throw new Error('We could not tell which business this is for. Reopen the app and try again.')
    }
    throw error
  }
  return data
}

export async function saveSpace(space) {
  const { id, ...rest } = space
  const { error } = id
    ? await supabase.from('venue_spaces').update(rest).eq('id', id)
    : await supabase.from('venue_spaces').insert(rest)
  if (error) throw error
}

export async function removeSpace(spaceId) {
  const { error } = await supabase.from('venue_spaces').delete().eq('id', spaceId)
  if (error) throw error
}

/** Every exception on this space in a date window. */
export async function slotsFor(spaceId, fromISO, toISO) {
  const { data, error } = await supabase
    .from('venue_slots')
    .select('id, slot_date, session, status, note')
    .eq('space_id', spaceId)
    .gte('slot_date', fromISO)
    .lte('slot_date', toISO)
  if (error) throw error
  return data ?? []
}

/**
 * Block or unblock one session.
 *
 * Upsert on the unique key rather than read-then-write: a manager tapping
 * dates quickly on a slow connection would otherwise race themselves, and
 * `venue_slots_one_per_session` is what makes a single statement safe.
 * The same reasoning `vendor_availability` already uses.
 */
export async function setSlot(spaceId, dateISO, session, blocked, note = null) {
  if (!blocked) {
    const { error } = await supabase
      .from('venue_slots').delete()
      .eq('space_id', spaceId).eq('slot_date', dateISO).eq('session', session)
      /* Only ever remove a block. A BOOKED row means money is held
         against that date, and a manager tapping a green square must not
         be able to un-sell somebody's wedding. */
      .eq('status', 'BLOCKED')
    if (error) throw error
    return
  }
  const { error } = await supabase.from('venue_slots').upsert(
    { space_id: spaceId, slot_date: dateISO, session, status: 'BLOCKED', note },
    { onConflict: 'space_id,slot_date,session' },
  )
  if (error) throw error
}

/** Every bookable hall in Bengaluru on a date. No radius — see 095. */
export async function availableVenues({ date, session = 'full_day', minCapacity = 0, kinds = null, limit = 60 }) {
  const { data, error } = await supabase.rpc('venues_available', {
    p_date: date, p_session: session,
    p_min_capacity: minCapacity, p_kinds: kinds, p_limit: limit,
  })
  if (error) throw error
  return data ?? []
}

/** The nearest comparable halls that are free, when the chosen one is not. */
export async function alternativesFor(spaceId, date, session = 'full_day') {
  const { data, error } = await supabase.rpc('venue_alternatives', {
    p_space_id: spaceId, p_date: date, p_session: session, p_limit: 3,
  })
  if (error) throw error
  return data ?? []
}
