/**
 * The customer storefront for the 33 engine trades.
 *
 * An adapter now: it turns the listing (`listing_public` / `listing_preview`
 * shape, or the legacy studio shape from buildLegacyTradeListing) into the
 * shared storefront model and renders <Storefront>, the same component
 * Anchor & MC renders. See storefront/storefrontModel.js for what is read
 * from where, and what is never shown to a customer.
 *
 * The props are unchanged, so every caller keeps working.
 */
import { useMemo } from 'react'
import Storefront from './storefront/Storefront'
import StoreAvatar from './storefront/StoreAvatar'
import { modelFromTradeListing } from './storefront/storefrontModel'

export default function TradeListingCard({ listing, tradeName, onPick, showBookingCtaPreview = false, media = [], avatarSlot = null, selectedId = null, onEditSection = null, tradeIcon = null, nearby = null, customerTerms = null }) {
  const model = useMemo(() => (listing ? modelFromTradeListing(listing, { tradeName, media }) : null), [listing, tradeName, media])
  if (!model) return null
  return (
    <Storefront
      model={model}
      avatarSlot={avatarSlot || <StoreAvatar src={model.avatarUrl} name={model.name} />}
      onPick={onPick}
      selectedId={selectedId}
      showBookingCtaPreview={showBookingCtaPreview}
      onEditSection={onEditSection}
      tradeIcon={tradeIcon}
      nearby={nearby}
      customerTerms={customerTerms}
    />
  )
}
