/**
 * Trade Pricing Profiles
 *
 * A config-driven pattern for trades that use server-generated tier packages
 * instead of per-item pricing. Each profile declares baseline inputs, tier rules,
 * add-on catalogue, and hard-exception triggers.
 *
 * When a partner onboards a trade with a profile, they answer baseline questions,
 * the server generates Essential/Signature/VIP packages via an RPC, all packages
 * are stored in sambramo_trade_packages with status UNDER_REVIEW, and the customer
 * sees LIVE packages only in instant quotes.
 *
 * Add new trades by adding an entry here, not a new component.
 * Anchor & MC (emcee) is the pilot; the pattern scales to all 34 trades.
 */

/**
 * Anchor & MC: the pilot trade for server-generated tier packages.
 *
 * A partner specifies their take-home rate per hour, and the server generates:
 *   Essential = take_home * min_hrs / 0.92
 *   Signature = Essential * 1.75 (requires 2x min duration)
 *   VIP = Essential * vip_multiplier (uses max duration)
 *
 * The 0.92 divisor is the 8% platform fee: price = partner_take_home / (1 - 0.08).
 *
 * Hard exceptions (multi-day, crosses midnight, audience over declared max,
 * over max duration, outstation with no flat fee, add-on not offered) route to
 * the custom quote lane.
 */
export const ANCHOR_MC_PROFILE = {
  trade_id: 'emcee',
  trade_name: 'Anchor & MC',
  mode: 'PACKAGE',
  tier_mode: 'EXPERT_GENERATED', // Server generates tiers, not partner

  // ── Baseline Inputs (what the partner answers during onboarding) ────────
  baseline_inputs: {
    take_home_per_hour: {
      label: 'What do you want to take home per hour?',
      unit: '₹',
      type: 'number',
      required: true,
      hint: 'We add our 8% fee on top. You always receive this amount.',
      example: 5000,
    },
    min_duration_hours: {
      label: 'Shortest booking you will accept',
      type: 'select',
      options: [1, 2, 3, 4],
      required: true,
      default: 2,
    },
    max_duration_hours: {
      label: 'Longest single event you will do',
      type: 'select',
      options: [4, 6, 8, 10, 12],
      required: true,
      default: 8,
    },
    vip_multiplier: {
      label: 'Effort of a VIP/premium event',
      type: 'select',
      options: [2, 3, 4, 5, 6],
      required: true,
      default: 4,
      hint: 'A VIP package will be Essential × this number',
    },
    overtime_rate_per_hour: {
      label: 'Overtime rate per hour (if applicable)',
      unit: '₹',
      type: 'number',
      required: false,
    },
    max_audience_size: {
      label: 'Maximum audience size you will handle',
      type: 'select',
      options: [100, 250, 500, 1000, 2000, 5000],
      required: false,
      hint: 'Larger events will be routed to custom quotes',
    },
    min_notice_days: {
      label: 'Minimum notice required (days)',
      type: 'select',
      options: [0, 1, 3, 7, 14],
      required: false,
      default: 1,
    },
  },

  // ── Tier Rules (Essential, Signature, VIP generation math) ─────────────
  tier_rules: {
    ESSENTIAL: {
      label: 'Essential',
      badge: null,
      duration_rule: 'min',
      price_multiplier: 1.0,
      description: 'Single anchor or MC for your event',
    },
    SIGNATURE: {
      label: 'Signature',
      badge: 'MOST POPULAR',
      duration_rule: '2x_min',
      price_multiplier: 1.75,
      description: 'Anchor or MC with added services',
      min_duration_requirement: '2x_min',
      // Signature requires at least 2x the min duration
    },
    VIP: {
      label: 'VIP',
      badge: null,
      duration_rule: 'max',
      price_multiplier_input: 'vip_multiplier',
      description: 'Premium anchor/MC experience',
    },
  },

  // ── Add-on Catalogue (canonical add-on ids and fees) ──────────────────
  addons: [
    {
      id: 'custom_script',
      label: 'Custom script & research',
      description: 'Personalized opening, jokes, and event-specific content',
      type: 'toggle',
      fee_paise: null,
      fee_field: 'custom_script_fee', // Partner sets this
    },
    {
      id: 'pre_event_call',
      label: 'Pre-event call',
      description: 'Planning call with the family before the event',
      type: 'toggle',
      fee_paise: null,
      fee_field: 'pre_event_call_fee',
    },
    {
      id: 'wireless_mic',
      label: 'Wireless mic (your own)',
      description: 'High-quality wireless mic and backup',
      type: 'toggle',
      fee_paise: 0, // No extra charge if provided
    },
    {
      id: 'co_anchor',
      label: 'Co-anchor / Duo',
      description: 'Additional anchor for large events',
      type: 'toggle',
      fee_paise: null,
      fee_field: 'co_anchor_fee',
    },
    {
      id: 'rehearsal_session',
      label: 'Rehearsal session',
      description: 'Run-through before the main event',
      type: 'toggle',
      fee_paise: null,
      fee_field: 'rehearsal_fee',
    },
  ],

  // ── Hard-Exception Triggers (route to custom quote lane) ──────────────
  exceptions: {
    multi_day_event: {
      description: 'Event spans more than one day',
      action: 'CUSTOM_QUOTE',
    },
    crosses_midnight: {
      description: 'Event ends after midnight or crosses into next day',
      action: 'CUSTOM_QUOTE',
    },
    audience_over_max: {
      description: 'Guest count exceeds declared maximum',
      action: 'CUSTOM_QUOTE',
    },
    duration_over_max: {
      description: 'Duration exceeds declared maximum',
      action: 'CUSTOM_QUOTE',
    },
    insufficient_notice: {
      description: 'Event is sooner than minimum notice period',
      action: 'CUSTOM_QUOTE',
    },
    addon_not_offered: {
      description: 'Customer requested add-on not offered',
      action: 'CUSTOM_QUOTE',
    },
  },

  // ── Package Generation (server-side RPC will read these settings) ──────
  generation: {
    platform_fee_rate: 0.08, // 8% fee; price = partner_take_home / (1 - 0.08)
    round_to_paise: 10, // ₹0.10; matches serviceCost rounding
    automatic_addons_by_tier: {
      SIGNATURE: ['pre_event_call'], // Pre-event call is included in Signature
      VIP: ['custom_script', 'pre_event_call'],
    },
  },

  // ── Customer-facing display ───────────────────────────────────────────
  display: {
    category: 'Event Management',
    icon: 'Music2',
    show_duration: true,
    duration_unit: 'hours',
    show_guests: false,
  },

  // ── Feature flags ─────────────────────────────────────────────────────
  features: {
    supports_packages: true,
    supports_custom_quotes: true,
    supports_draft_resume: true,
    supports_revision_history: true,
  },
}

/**
 * Map of all trade profiles by trade_id.
 * Add new trades here as you enable the pattern for them.
 */
/* Keyed by the trade NAME, because that is what AddItemFlow, vendor_services.category
   and the trade picker all carry. Keying by 'emcee' meant getProfile('Anchor & MC')
   returned null and the profile flow never opened. */
export const TRADE_PRICING_PROFILES = {
  'Anchor & MC': ANCHOR_MC_PROFILE,
  // Photography, Catering, Decoration, etc. will be added here
  // as each trade is ported to the new pattern.
}

/**
 * Check if a trade uses the new server-generated tier package pattern.
 * @param {string} tradeId - The trade identifier (e.g., 'emcee')
 * @returns {boolean}
 */
export function hasProfileFor(tradeId) {
  return !!TRADE_PRICING_PROFILES[tradeId]
}

/**
 * Get the pricing profile for a trade.
 * @param {string} tradeId - The trade identifier
 * @returns {object|null} The profile, or null if the trade doesn't use it yet
 */
export function getProfile(tradeId) {
  return TRADE_PRICING_PROFILES[tradeId] ?? null
}
