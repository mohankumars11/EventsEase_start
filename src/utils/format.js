export function formatINR(amount) {
  if (amount == null || amount === '') return '—'
  return '₹' + Number(amount).toLocaleString('en-IN')
}

export function formatINRRange(min, max) {
  if (!min && !max) return 'Price on request'
  if (!max) return `From ${formatINR(min)}`
  if (!min) return `Up to ${formatINR(max)}`
  if (Number(min) === Number(max)) return formatINR(min)
  return `${formatINR(min)} – ${formatINR(max)}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}
