// Trade 1 — Anchor & MC. Its questionnaire is the existing 11-stage
// AnchorOnboardingFlow (src/components/vendor/anchor), which keeps working
// unchanged; this entry only tells the shared engine what it prices and
// reserves, so the Control Center, Calendar and admin can treat it like
// every other trade.
import { STAGES, PRICING_MODELS } from '../../components/vendor/anchor/options'

export default {
  id: 'anchor_mc',
  serviceNoun: 'anchoring service',
  legacyFlow: 'anchor',
  stages: STAGES.map(s => s.id),
  screens: [],
  catalogue: null,
  pricing: {
    kinds: PRICING_MODELS.map(m => m.id),
    packages: { label: 'Essential / Signature / VIP', fields: ['hours', 'functions'] },
  },
  addons: [],
  resources: { model: 'staff', title: 'You (and your team) per event', fields: [] },
  compliance: { conditional: [] },
  quoteTriggers: [{ id: 'unpriced_model', label: 'The event needs a pricing model you have not set' }],
  quoteTemplate: ['Performance fee', 'Additional hours', 'Travel', 'Stay', 'Rehearsal', 'Script'],
  readiness: ['Packages approved', 'Calendar open', 'Payout account ready'],
}
