/**
 * One tier vocabulary, one set of looks.
 *
 * There were three vocabularies and four card implementations. Anchor &
 * MC used ESSENTIAL/SIGNATURE/VIP in StepsCommercial, the 32 engine
 * trades had a plainer PackagesStage, catering said PREMIUM where
 * everyone else said VIP, and the Pricing Control Center drew its own
 * row a fourth time. A partner who lists two trades met two different
 * package screens.
 *
 * PREMIUM is kept as an alias rather than renamed: it is already stored
 * in submitted catering listings, and rewriting a published tier key to
 * tidy a lookup table is not worth a migration. It looks identical to
 * VIP, which is what it always meant.
 */
import { Award, Crown, Gem } from 'lucide-react'

export const TIER_LOOK = {
  ESSENTIAL: { icon: Award, from: 'from-amber-50', ring: 'ring-amber-200', tint: 'text-amber-700' },
  SIGNATURE: { icon: Crown, from: 'from-plum-50', ring: 'ring-plum-500', tint: 'text-plum-700' },
  VIP: { icon: Gem, from: 'from-sky-50', ring: 'ring-sky-200', tint: 'text-sky-700' },
  PREMIUM: { icon: Gem, from: 'from-sky-50', ring: 'ring-sky-200', tint: 'text-sky-700' },
}

/* A trade may ship a bundle that is not one of the three named tiers.
   It gets the neutral look rather than crashing on an unknown key. */
export const NEUTRAL_LOOK = { icon: Award, from: 'from-ink/[0.03]', ring: 'ring-ink/10', tint: 'text-plum-700' }

export const lookFor = key => TIER_LOOK[String(key ?? '').toUpperCase()] ?? NEUTRAL_LOOK

/** SIGNATURE is the only tier that gets the heavier ring. */
export const isFeatured = key => String(key ?? '').toUpperCase() === 'SIGNATURE'
