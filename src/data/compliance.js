import {
  requirementsFor as engineRequirementsFor,
  ALL_REQUIREMENT_IDS as ENGINE_IDS,
  MANDATORY_FROM as ENGINE_MANDATORY_FROM,
  TRADE_TIERS, TIER, TIER_WHY, tiersFor, scopeFor,
} from '../lib/verification/requirements'

/**
 * What a partner has to show us, and which partners have to show it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS FILE IS NOW A SHIM. THE ENGINE MOVED.
 * ══════════════════════════════════════════════════════════════════════
 *
 * The rules live in `src/lib/verification/requirements.js` and the
 * document capture rules in `src/lib/verification/documentTypes.js`.
 * This module re-exports them so the existing callers —
 * `ComplianceStep.jsx`, `partnerOnboarding.js:169` and
 * `check-compliance-engine.mjs` — keep working unchanged.
 *
 * ── Why it moved ────────────────────────────────────────────────────
 * The old model was eight hand-written per-trade blocks with no shared
 * notion of WHY a document was being asked for, and five of them
 * collided on `documentKind: 'shop_licence'`. Because
 * `vendor_documents` had `UNIQUE (vendor_id, kind)` (093:169), a
 * partner listing Catering AND Venue could store only one of the two
 * documents — and `complianceDone` then reported BOTH as satisfied. A
 * tick where there should have been a gap.
 *
 * The engine replaces the blocks with risk TIERS, and migration 143
 * re-keys documents on `requirement_id` so two different documents can
 * coexist. See the plan for the rest.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REQUIREMENTS ARE DATA, WITH STABLE IDS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Each requirement has an id that never changes — a partner's document
 * row points at it, and a label is not a key.
 *
 * Two ids were renamed when the engine landed, because their meaning
 * narrowed from "some paper about this trade" to a named document:
 *
 *   VER-TRADE-FOOD       ->  VER-TRADE-FSSAI
 *   VER-TRADE-VENUE      ->  VER-TRADE-PROPERTY
 *   VER-TRADE-TRANSPORT  ->  VER-TRADE-DL / -RC / -INSURANCE / -PUC
 *   VER-TRADE-SECURITY   ->  VER-TRADE-PSARA
 *
 * Migration 143 backfills existing rows to `VER-BUSINESS-PROOF` rather
 * than guessing which of the five a `shop_licence` upload satisfied —
 * re-asking is the safe direction.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERYTHING IS OPTIONAL RIGHT NOW, AND THAT IS A SETTING
 * ══════════════════════════════════════════════════════════════════════
 *
 * `MANDATORY_FROM` is null, so nothing blocks a partner today. When it
 * is set to a date, requirements whose `enforceable` is true begin to
 * gate submission — the screens already read `required`, so that switch
 * is one line rather than a UI change.
 */

export const MANDATORY_FROM = ENGINE_MANDATORY_FROM
export const ALL_REQUIREMENT_IDS = ENGINE_IDS
export { TRADE_TIERS, TIER, TIER_WHY, tiersFor, scopeFor }

/**
 * Everything this partner is asked for, given the trades they have.
 *
 * @param trades  trade names, or the engine's richer
 *                `{ trades, answers, mandatoryFrom }`
 * @returns [{ id, documentKind, documentType, label, hint, required,
 *             enforceable, declinable, tier, trade, why, ...capture }]
 *
 * `documentKind` is kept alongside `documentType` for the screens that
 * still key uploads by kind. They are not the same thing: `documentType`
 * is the requirement's document ('liquor_permit'), `documentKind` is the
 * storable enum `vendor_documents.kind` accepts ('other'). Several
 * types share one kind, which is exactly why 143 re-keys on the
 * requirement id — a screen keying on `documentKind` will still confuse
 * two documents until it is moved over.
 */
export function requirementsFor(trades = []) {
  return engineRequirementsFor(trades).map(r => ({
    ...r,
    documentKind: r.kind,
  }))
}
