/**
 * Which AI service the catalogue tools talk to, and what each one can do.
 *
 * ── Why this is a table and not a hard-coded client ──────────────────────
 * The thing being asked of the model here — read this price list, return these
 * fields — is not exotic. Half a dozen services will do it, they differ by an
 * order of magnitude in price, and the good open-weight models change every
 * few months. Wiring one vendor's SDK into the endpoint would mean a code
 * change every time that calculus moves.
 *
 * So the endpoint speaks the OpenAI-compatible chat-completions shape, which
 * OpenRouter, Groq, Together, Cerebras and most others all serve, and this
 * file records what is actually different between them. Switching provider is
 * then an environment variable, not a deploy.
 *
 * ── Capabilities are declared, not assumed ───────────────────────────────
 * The differences that matter are not cosmetic. A provider that cannot parse a
 * PDF cannot do the main thing this feature is for, and finding that out as a
 * 400 in front of an admin holding a supplier catalogue is the wrong way to
 * learn it. Each entry states what it supports so the endpoint can say
 * "this provider can't read PDFs — send a photo, or switch provider" before
 * anything is uploaded.
 */

export const PROVIDERS = {
  /**
   * The default. One key, and it brokers ~400 models including the strong
   * open-weight ones — which means the shop is never locked to a vendor, and
   * upgrading from the free model to a better one is a one-line env change.
   *
   * It is also the only option here that keeps every part of this feature
   * working: PDF parsing and web search are plugins it runs itself, so they
   * work with whatever model is selected rather than only with models that
   * happen to ship those tools.
   */
  openrouter: {
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    /**
     * Free, open-weight (Gemma 4), reads images, honours a JSON schema, and
     * holds 262k tokens of context — verified against OpenRouter's own model
     * list rather than remembered. That combination is rarer than it sounds:
     * most free models are text-only, and a text-only model cannot read a
     * photograph of a price list, which is half of what this is for.
     *
     * Override with AI_MODEL when the free tier's queue or its accuracy on
     * messy scans starts to bite. Worth knowing, all open-weight and all
     * cheap enough to be rounding errors at this volume:
     *   qwen/qwen3-vl-32b-instruct    $0.10/$0.42 per M — best at messy scans
     *   qwen/qwen3.5-flash-02-23      $0.07/$0.26 per M — 1M context, fast
     *   google/gemma-4-26b-a4b-it     $0.07/$0.34 per M — the paid same model
     */
    defaultModel: 'google/gemma-4-26b-a4b-it:free',
    pdf: true,
    images: true,
    webSearch: 'plugin',
    jsonSchema: true,
  },

  /**
   * The fast one. Groq runs open-weight models on its own silicon at roughly
   * 500 tokens/second with 1,000 requests a minute on the free tier, which is
   * far more headroom than a catalogue import will ever need.
   *
   * The trade is that it takes no PDFs — Groq has no document parser, so a
   * supplier catalogue has to be a photo, a Word file or pasted text. Worth it
   * when the work is mostly typed lists; wrong when it is mostly PDFs.
   */
  groq: {
    label: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    pdf: false,
    images: false,        // gpt-oss is text-only; a vision model can be set via AI_MODEL
    // Groq has no search plugin. Its `groq/compound` system has web search
    // built in, so research mode swaps the model rather than adding a tool.
    webSearch: 'compound',
    searchModel: 'groq/compound',
    jsonSchema: true,
  },

  /**
   * Kept because it is the most accurate on the job this feature actually
   * does — reading a smudged, handwritten, photographed price list — and
   * because someone may want the good result on a one-off import of three
   * hundred products and the cheap one thereafter. It costs real money per
   * run; the two above do not.
   */
  anthropic: {
    label: 'Claude',
    url: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-opus-5',
    native: 'anthropic',   // not OpenAI-shaped; the endpoint branches on this
    pdf: true,
    images: true,
    webSearch: 'tool',
    jsonSchema: true,
  },
}

/**
 * Work out which provider to use.
 *
 * Auto-detects from whichever key is actually set, in preference order, so the
 * only setup step is "paste one key into Vercel" — nobody has to know that a
 * second variable exists. `AI_PROVIDER` overrides when more than one key is
 * present.
 */
export function resolveProvider(env = process.env) {
  const named = env.AI_PROVIDER?.trim().toLowerCase()
  if (named) {
    const chosen = PROVIDERS[named]
    if (!chosen) {
      return { error: `AI_PROVIDER is set to "${named}", which is not one of: ${Object.keys(PROVIDERS).join(', ')}.` }
    }
    if (!env[chosen.keyEnv]) {
      return { error: `AI_PROVIDER is "${named}" but ${chosen.keyEnv} is not set. Add it in the Vercel project settings and redeploy.` }
    }
    return { id: named, provider: chosen, key: env[chosen.keyEnv], model: env.AI_MODEL?.trim() || chosen.defaultModel }
  }

  for (const [id, provider] of Object.entries(PROVIDERS)) {
    if (env[provider.keyEnv]) {
      return { id, provider, key: env[provider.keyEnv], model: env.AI_MODEL?.trim() || provider.defaultModel }
    }
  }

  return {
    error:
      'AI is not switched on yet. Get a free key at openrouter.ai/keys, add it as OPENROUTER_API_KEY in the Vercel project settings, and redeploy.',
  }
}
