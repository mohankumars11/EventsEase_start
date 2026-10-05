/* Must evaluate before the Supabase client is created. supabase-js captures
   the fetch implementation during createClient(), so patching window.fetch
   after importing a component is too late for this browser harness. */
const realFetch = globalThis.fetch.bind(globalThis)
globalThis.__PRICING_RPC__ = []

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url ?? ''
  if (!url.startsWith('http://127.0.0.1:9/stub')) return realFetch(input, init)

  const u = new URL(url)
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

  if (u.pathname.endsWith('/sambramo_trade_packages')) return json([])
  if (u.pathname.endsWith('/sambramo_partner_price_books')) return json([])
  if (u.pathname.endsWith('/sambramo_trade_package_addons')) return json([])

  if (u.pathname.endsWith('/rpc/save_sambramo_trade_package')) {
    const body = JSON.parse(init.body || '{}')
    globalThis.__PRICING_RPC__.push({ name: 'save_sambramo_trade_package', args: body })
    return json({ ok: true, package_id: 'test-package-photo-001', status: 'UNDER_REVIEW' })
  }

  if (u.pathname.endsWith('/rpc/create_sambramo_trade_package_revision')) {
    const body = JSON.parse(init.body || '{}')
    globalThis.__PRICING_RPC__.push({ name: 'create_sambramo_trade_package_revision', args: body })
    return json({ ok: true, package_id: 'test-package-photo-revision-001', status: 'UNDER_REVIEW' })
  }

  return json({ message: 'No pricing stub for ' + u.pathname }, 404)
}

window.__PRICING_RPC__ = globalThis.__PRICING_RPC__
