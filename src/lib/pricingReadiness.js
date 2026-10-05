export function genericPackageReady(pkg) {
  if (!pkg) return false
  const base = Number(pkg?.commercial_inputs?.base_price ?? 0)
  const name = String(pkg?.name ?? '').trim()
  return !!name && base > 0 && !['ARCHIVED','PAUSED'].includes(pkg.status)
}

export function cateringPackageReady(pkg) {
  if (!pkg) return false
  const name = String(pkg?.name ?? '').trim()
  const bands = Array.isArray(pkg?.rate_bands) ? pkg.rate_bands : []
  const rated = bands.some(b => Number(b?.rate ?? b?.rate_paise ?? 0) > 0)
  return !!name && rated && !['ARCHIVED','PAUSED'].includes(pkg.status)
}

export function indexPricing(packages = [], cateringPackages = []) {
  const byService = {}
  for (const p of packages) {
    const id = p.vendor_service_id
    if (!id) continue
    const current = byService[id] ?? { packages: [], ready: false, live: 0, draft: 0, review: 0 }
    current.packages.push({ ...p, type: 'trade' })
    if (genericPackageReady(p)) current.ready = true
    if (p.status === 'LIVE') current.live += 1
    else if (p.status === 'UNDER_REVIEW' || p.status === 'ACTION_REQUIRED') current.review += 1
    else if (p.status === 'DRAFT') current.draft += 1
    byService[id] = current
  }
  for (const p of cateringPackages) {
    const id = p.vendor_service_id
    if (!id) continue
    const current = byService[id] ?? { packages: [], ready: false, live: 0, draft: 0, review: 0 }
    current.packages.push({ ...p, type: 'catering' })
    if (cateringPackageReady(p)) current.ready = true
    if (p.status === 'LIVE' || p.status === 'ACTIVE') current.live += 1
    else if (p.status === 'UNDER_REVIEW' || p.status === 'ACTION_REQUIRED') current.review += 1
    else if (p.status === 'DRAFT') current.draft += 1
    byService[id] = current
  }
  return byService
}
