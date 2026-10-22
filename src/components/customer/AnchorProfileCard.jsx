/**
 * The customer storefront for Anchor & MC.
 *
 * Still one component for the customer page (AnchorBook) and the
 * partner's full-screen preview, so the two cannot drift. What changed is
 * underneath: it builds the shared storefront model and renders the same
 * <Storefront> every other trade renders, so all 34 trades now look like
 * one product instead of two.
 *
 * Props are unchanged. `selectedTier` and `onPick` still drive package
 * selection on the booking page.
 */
import { useMemo } from 'react'
import Storefront from './storefront/Storefront'
import StoreAvatar from './storefront/StoreAvatar'
import { modelFromAnchor } from './storefront/storefrontModel'

export default function AnchorProfileCard({
  profile = {}, packages = [], city, rating, reviewCount = 0, verified = false,
  onPick, selectedTier, showBookingCtaPreview = false, instantBookEnabled = true,
  media = [], avatarSlot = null, pricingModels = [], extras = [], bookingDetails = [], isLive, onEditSection = null,
}) {
  const model = useMemo(() => modelFromAnchor({
    profile, packages, pricingModels, extras, bookingDetails, city, rating, reviewCount, verified, media, instantBookEnabled, isLive,
  }), [profile, packages, pricingModels, extras, bookingDetails, city, rating, reviewCount, verified, media, instantBookEnabled, isLive])
  return (
    <Storefront
      model={model}
      avatarSlot={avatarSlot || <StoreAvatar src={model.avatarUrl} name={model.name} />}
      onPick={onPick}
      selectedId={selectedTier ?? null}
      showBookingCtaPreview={showBookingCtaPreview}
      onEditSection={onEditSection}
    />
  )
}
