// Test stub: the pure RSVP helpers never touch the network.
export const supabase = new Proxy({}, { get: () => () => { throw new Error('no network in unit tests') } })
