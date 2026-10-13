import { Camera, CheckCircle2, CircleAlert, Clock3, PackageCheck, ShieldCheck } from 'lucide-react'

function itemState(ok, pending) {
  if (ok) return { label: 'Ready', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' }
  if (pending) return { label: 'In review', icon: Clock3, tone: 'text-amber-800 bg-amber-50' }
  return { label: 'Needed', icon: CircleAlert, tone: 'text-rose-700 bg-rose-50' }
}

/**
 * Input audit shown before the partner storefront preview. It reports missing
 * data honestly and routes the partner to the existing editor for each item.
 */
export default function StorefrontReadiness({ vendor, draft = {}, packages = [], media = [], onEditStep, onManageMedia }) {
  const avatar = vendor?.avatar_url || draft?.trade_inputs?.avatar_url || draft?.trade_inputs?.profile_photo_url || draft?.profile?.avatar_url
  const approvedMedia = media.filter(row => row.review_status === 'live')
  const pendingMedia = media.filter(row => row.review_status !== 'live' && row.review_status !== 'rejected')
  const price = Number(draft?.base_price ?? draft?.price ?? draft?.rate ?? 0) > 0
    || packages.some(pkg => Number(pkg?.base_price ?? pkg?.price?.rate_paise ?? pkg?.trade_inputs?.customer_paise ?? 0) > 0)
  const namedPackage = Boolean(String(draft?.name || '').trim() || packages.some(pkg => String(pkg?.name || '').trim()))
  const packagePending = String(draft?.status || '').toUpperCase() === 'UNDER_REVIEW' || packages.some(pkg => ['UNDER_REVIEW', 'ACTION_REQUIRED'].includes(String(pkg?.status || '').toUpperCase()))
  const terms = Boolean(draft?.availability_policy || draft?.commercial_inputs?.availability_policy || draft?.payment_policy || draft?.commercial_inputs?.payment_policy || draft?.cancellation_policy)
  const checks = [
    { key: 'profile', title: 'Partner profile photo', note: avatar ? 'A profile image is saved' : 'Add a real partner or business photo', state: itemState(Boolean(avatar), false), icon: Camera, action: () => onEditStep?.('details') },
    { key: 'portfolio', title: 'Portfolio gallery', note: approvedMedia.length ? approvedMedia.length + ' approved item(s) ready' : pendingMedia.length ? pendingMedia.length + ' item(s) waiting for review' : 'Add photos or videos from your own work', state: itemState(approvedMedia.length > 0, pendingMedia.length > 0), icon: ShieldCheck, action: () => onManageMedia?.() },
    { key: 'package', title: 'Packages and prices', note: namedPackage && price ? 'Package name and a price are present' : 'Add a package name, price and inclusions', state: itemState(namedPackage && price, packagePending), icon: PackageCheck, action: () => onEditStep?.('package') },
    { key: 'terms', title: 'Booking terms', note: terms ? 'Booking or payment rules are configured' : 'Confirm booking mode, payment and cancellation', state: itemState(terms, false), icon: ShieldCheck, action: () => onEditStep?.('pricing') },
  ]
  const ready = checks.filter(check => check.state.label === 'Ready').length
  return (
    <section className="sfr-card" aria-label="Storefront content readiness">
      <div className="sfr-head">
        <div>
          <p className="sfr-kicker">Before you publish</p>
          <h3>Storefront content check</h3>
          <p>Real assets and accurate terms build customer confidence.</p>
        </div>
        <div className="sfr-score"><strong>{ready}/4</strong><span>ready</span></div>
      </div>
      <div className="sfr-progress" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow={ready}><span style={{ width: (ready / 4 * 100) + '%' }} /></div>
      <div className="sfr-list">
        {checks.map(check => {
          const Icon = check.icon
          const StateIcon = check.state.icon
          return (
            <button type="button" className="sfr-row" key={check.key} onClick={check.action}>
              <span className="sfr-icon"><Icon size={17} /></span>
              <span className="sfr-copy"><strong>{check.title}</strong><small>{check.note}</small></span>
              <span className={'sfr-status ' + (check.state.tone || '')}><StateIcon size={11} /> {check.state.label}</span>
            </button>
          )
        })}
      </div>
      <p className="sfr-foot">Unapproved media can be previewed here with its review status, but must not be presented as published customer content.</p>
    </section>
  )
}
