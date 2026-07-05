import { GoogleGenAI } from '@google/genai'
import { getApiKey } from './agent'
import { getApiTier, setApiTier, getApiKeys, updateApiKeyTier, getProfile } from './db'
import { logger } from './log'

async function testApiKeyTier(apiKey: string): Promise<'free' | 'pro'> {
  const ai = new GoogleGenAI({ apiKey })

  try {
    // Minimal probe: if gemini-3.1-pro succeeds, the key is pro tier.
    // A 429 / quota error means free tier.
    const interaction = await ai.interactions.create({
      model: 'gemini-3.1-pro',
      store: false,
      input: [{ type: 'user_input', content: [{ type: 'text', text: 'Respond with just "OK"' }] }],
      generation_config: { max_output_tokens: 2 },
    } as any)

    if ((interaction as any).output_text && (interaction as any).output_text.trim()) {
      return 'pro'
    }
    return 'free'
  } catch (error: any) {
    const errorMessage = error?.message || ''
    const status = error?.status || error?.statusCode || error?.code
    const errorStatus = error?.error?.status || error?.error?.code

    if (
      status === 429 ||
      errorStatus === 'RESOURCE_EXHAUSTED' ||
      errorStatus === 429 ||
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('429')
    ) {
      return 'free'
    }

    // Auth/other errors → assume free for safety
    return 'free'
  }
}

export async function detectApiTier(): Promise<'free' | 'pro'> {
  const currentTier = getApiTier()

  if (currentTier.last_verified_at) {
    const lastVerified = new Date(currentTier.last_verified_at)
    const hoursSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60)
    if (hoursSince < 24) {
      logger.info('api-tier', `using cached tier: ${currentTier.tier} (verified ${hoursSince.toFixed(1)}h ago)`)
      return currentTier.tier as 'free' | 'pro'
    }
  }

  logger.info('api-tier', 'detecting API tier for all keys')

  const apiKeys = getApiKeys()
  let hasProKey = false

  for (const key of apiKeys) {
    logger.info('api-tier', `testing tier for API key: ${key.name}`)
    const tier = await testApiKeyTier(key.api_key)
    logger.info('api-tier', `API key ${key.name} detected as ${tier} tier`)

    updateApiKeyTier(key.id, tier)

    if (tier === 'pro') hasProKey = true
  }

  const profile = getProfile()
  const primaryApiKey = profile?.gemini_api_key || process.env.GEMINI_API_KEY
  if (primaryApiKey) {
    logger.info('api-tier', 'testing tier for primary profile API key')
    const primaryTier = await testApiKeyTier(primaryApiKey)
    logger.info('api-tier', `Primary API key detected as ${primaryTier} tier`)

    if (primaryTier === 'pro') hasProKey = true
  }

  const globalTier = hasProKey ? 'pro' : 'free'
  setApiTier(globalTier)
  logger.info('api-tier', `global tier set to ${globalTier} based on key capabilities`)

  return globalTier
}

export async function verifyApiTier(): Promise<'free' | 'pro'> {
  logger.info('api-tier', 'verifying API tier')
  const tier = await detectApiTier()
  logger.info('api-tier', `verified API tier: ${tier}`)
  return tier
}
