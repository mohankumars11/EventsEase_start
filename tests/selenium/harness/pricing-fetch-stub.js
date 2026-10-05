/* Browser-only Supabase transport stub for the pricing E2E harness.
   It returns deterministic rows and captures the save RPC without touching
   the real Sambramo project. */
const nativeFetch = window.fetch.bind(window)
window.__PRICING_RPC__ = []

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

window.fetch = async (input, init = {}) => {
  const url = String(typeof input === 'string' ? input : input?.url || '')
  const method = String(init.method || input?.method || 'GET').toUpperCase()

  if (url.includes('/rest/v1/sambramo_trade_packages')) return json([])
  if (url.includes('/rest/v1/sambramo_partner_price_books')) return json([])
  if (url.includes('/rest/v1/sambramo_trade_package_addons')) return json([])

  if (url.includes('/rest/v1/rpc/save_sambramo_trade_package') && method === 'POST') {
    const body = init.body ? JSON.parse(init.body) : {}
    window.__PRICING_RPC__.push({ name: 'save_sambramo_trade_package', args: body })
    const status = body?.p_package?.status || 'DRAFT'
    return json([{
      ok: true,
      package_id: body?.p_package_id || 'test-package-001',
      status,
    }])
  }

  if (url.includes('/rest/v1/rpc/create_sambramo_trade_package_revision') && method === 'POST') {
    const body = init.body ? JSON.parse(init.body) : {}
    window.__PRICING_RPC__.push({ name: 'create_sambramo_trade_package_revision', args: body })
    return json([{
      ok: true,
      package_id: 'test-package-revision-001',
      status: body?.p_package?.status || 'UNDER_REVIEW',
    }])
  }

  try {
    return await nativeFetch(input, init)
  } catch {
    return json({ message: 'stubbed network request' }, 200)
  }
}
