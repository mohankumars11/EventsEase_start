export function genericPackageReady(pkg, priceBook = null) {
  if (!pkg || ['ARCHIVED','PAUSED'].includes(pkg.status)) return false
  const name = String(pkg?.name ?? '').trim()
  const unit = String(priceBook?.unit ?? pkg?.commercial_inputs?.pricing_unit ?? '').toLowerCase()
  const rate = Number(priceBook?.rate_paise ?? pkg?.commercial_inputs?.base_price_paise ?? 0)
  return !!name && !!priceBook && (rate > 0 || unit === 'custom quote')
}

export function cateringPackageReady(pkg) {
  if (!pkg || ['ARCHIVED','PAUSED'].includes(pkg.status)) return false
  const name = String(pkg?.name ?? '').trim()
  const bands = Array.isArray(pkg?.rate_bands) ? pkg.rate_bands : []
  const rated = bands.some(b => Number(b?.rate ?? 0) > 0 || Number(b?.rate_paise ?? 0) > 0)
  return !!name && rated
}

export function indexPricing(packages = [], cateringPackages = [], priceBooks = []) {
  const byService = {}
  const bookByPackage = {}
  for (const p of priceBooks) {
    const key = String(p.offering_id ?? '')
    if (key && !bookByPackage[key]) bookByPackage[key] = p
  }
  for (const p of packages) {
    const id = p.vendor_service_id
    if (!id) continue
    const row = byService[id] ?? { packages: [], ready: false, live: 0, draft: 0, review: 0 }
    const priceBook = bookByPackage[String(p.id)] ?? null
    row.packages.push({ ...p, type: 'trade', price_book: priceBook })
    if (genericPackageReady(p, priceBook)) row.ready = true
    if (p.status === 'LIVE') row.live += 1
    else if (p.status === 'UNDER_REVIEW' || p.status === 'ACTION_REQUIRED') row.review += 1
    else if (p.status === 'DRAFT') row.draft += 1
    byService[id] = row
  }
  for (const p of cateringPackages) {
    const id = p.vendor_service_id
    if (!id) continue
    const row = byService[id] ?? { packages: [], ready: false, live: 0, draft: 0, review: 0 }
    row.packages.push({ ...p, type: 'catering' })
    if (cateringPackageReady(p)) row.ready = true
    if (p.status === 'LIVE' || p.status === 'ACTIVE') row.live += 1
    else if (p.status === 'UNDER_REVIEW' || p.status === 'ACTION_REQUIRED') row.review += 1
    else if (p.status === 'DRAFT') row.draft += 1
    byService[id] = row
  }
  return byService
}
