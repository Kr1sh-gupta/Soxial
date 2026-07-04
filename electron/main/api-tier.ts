import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText as sdkGenerateText } from 'ai'
import { getApiKey } from './agent'
import { getApiTier, setApiTier } from './db'
import { logger } from './log'

export async function detectApiTier(): Promise<'free' | 'pro'> {
  const currentTier = getApiTier()
  
  // If we detected it recently (within last 24 hours), trust it
  if (currentTier.last_verified_at) {
    const lastVerified = new Date(currentTier.last_verified_at)
    const hoursSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60)
    if (hoursSince < 24) {
      logger.info('api-tier', `using cached tier: ${currentTier.tier} (verified ${hoursSince.toFixed(1)}h ago)`)
      return currentTier.tier as 'free' | 'pro'
    }
  }

  logger.info('api-tier', 'detecting API tier with test request to gemini-3.1-pro')
  
  try {
    const apiKey = getApiKey()
    const google = createGoogleGenerativeAI({ apiKey })
    
    // Make a minimal test request to gemini-3.1-pro
    // If this succeeds, it's a pro key. If it fails with rate limit, it's free.
    const result = await sdkGenerateText({
      model: google('gemini-3.1-pro'),
      messages: [
        { role: 'user', content: 'Respond with just "OK"' }
      ],
      maxTokens: 2
    })

    if (result.text && result.text.trim()) {
      logger.info('api-tier', 'API key detected as PRO tier')
      setApiTier('pro')
      return 'pro'
    } else {
      logger.warn('api-tier', 'gemini-3.1-pro returned empty response, assuming free tier')
      setApiTier('free')
      return 'free'
    }
  } catch (error: any) {
    // Check if it's a rate limit error (429) or quota exceeded
    const errorMessage = error?.message || ''
    const statusCode = error?.statusCode || error?.status
    
    if (statusCode === 429 || 
        errorMessage.includes('quota') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('429')) {
      logger.info('api-tier', 'gemini-3.1-pro hit rate limit, API key is FREE tier')
      setApiTier('free')
      return 'free'
    }
    
    // If it's a different error (auth, etc), log it but assume free for safety
    logger.warn('api-tier', `gemini-3.1-pro test failed with non-rate-limit error: ${errorMessage}, assuming free tier`)
    setApiTier('free')
    return 'free'
  }
}

export async function verifyApiTier(): Promise<'free' | 'pro'> {
  logger.info('api-tier', 'verifying API tier')
  const tier = await detectApiTier()
  logger.info('api-tier', `verified API tier: ${tier}`)
  return tier
}