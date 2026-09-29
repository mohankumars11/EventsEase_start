export const QUOTE_STATE = Object.freeze({
  INSTANT_BOOK: "INSTANT_BOOK", INSTANT_QUOTE: "INSTANT_QUOTE",
  PROVISIONAL_QUOTE: "PROVISIONAL_QUOTE", QUOTE_ACTION_REQUIRED: "QUOTE_ACTION_REQUIRED",
  UNAVAILABLE: "UNAVAILABLE",
});
const validAmount = n => Number.isFinite(n) && n >= 0;
export function evaluateQuote({
  eligible = true, capacityAvailable = true, complianceEligible = true,
  missingInputs = [], boundedUnknowns = [], quoteBased = false,
  components = [], confidence = 1, minConfidence = 0.75,
} = {}) {
  if (!eligible || !capacityAvailable || !complianceEligible)
    return { state: QUOTE_STATE.UNAVAILABLE, final: false, reason: "Eligibility, capacity, or compliance gate failed." };
  if (missingInputs.length)
    return { state: QUOTE_STATE.QUOTE_ACTION_REQUIRED, final: false, missingInputs };
  if (boundedUnknowns.length)
    return { state: QUOTE_STATE.PROVISIONAL_QUOTE, final: false, requiredActions: boundedUnknowns };
  if (!Array.isArray(components) || components.some(c => !validAmount(c.amountPaise)))
    return { state: QUOTE_STATE.QUOTE_ACTION_REQUIRED, final: false, missingInputs: ["validated_component_amounts"] };
  if (confidence < minConfidence)
    return { state: QUOTE_STATE.QUOTE_ACTION_REQUIRED, final: false, missingInputs: ["fresh_pricing_data"] };
  return {
    state: quoteBased ? QUOTE_STATE.INSTANT_QUOTE : QUOTE_STATE.INSTANT_BOOK,
    final: true, currency: "INR",
    totalPaise: components.reduce((sum, c) => sum + Math.round(c.amountPaise), 0),
    components: components.map(c => ({ ...c, amountPaise: Math.round(c.amountPaise) })),
  };
}
