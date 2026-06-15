// Pure env-detection helpers — NO `ai` / `@ai-sdk/*` imports, so the package
// barrel can read them without dragging the Vercel AI SDK's type surface into
// consumers. The model construction that needs the SDK lives in `./live/model`.

/** True when a Claude API key is present. */
export const hasAnthropicKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);
/** True when OpenAI is both keyed and explicitly selected via AI_PROVIDER=openai. */
export const wantsOpenAI = (): boolean =>
  Boolean(process.env.OPENAI_API_KEY) && process.env.AI_PROVIDER === 'openai';

/** True when any live (non-offline) provider is configured. */
export const hasLiveProvider = (): boolean => hasAnthropicKey() || wantsOpenAI();
