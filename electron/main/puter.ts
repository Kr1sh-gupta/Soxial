import { GoogleGenAI } from '@google/genai'
import { init, getAuthToken } from '@heyputer/puter.js/src/init.cjs'
import { getProfile, updateProfile, getApiKeys, updateApiKeyLastUsed } from './db'
import { join } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { app } from 'electron'
import { logger } from './log'

let puterClient: any = null

/** Get the initialized Puter client. Throws if not signed in. */
export function getPuterClient(): any {
  if (puterClient) return puterClient
  const profile = getProfile()
  const token = profile?.puter_token
  if (!token) throw new Error('Not signed in to Puter. Complete sign-in first.')
  puterClient = init(token)
  return puterClient
}

/** Check whether a Puter token is stored. */
export function checkPuterAuth(): boolean {
  const profile = getProfile()
  return !!profile?.puter_token
}

/** Reset cached client (e.g. after token change). */
export function resetPuterClient() {
  puterClient = null
}

/** Open browser-based Puter sign-in, store token in profile. */
export async function puterSignIn(): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'No token received from Puter' }
    updateProfile({ puter_token: token })
    puterClient = init(token)
    logger.info('puter', 'signed in successfully')
    return { success: true }
  } catch (e: any) {
    logger.error('puter', 'sign-in failed', e.message)
    return { success: false, error: e.message }
  }
}

interface ApiKeyCandidate {
  id?: number
  name?: string
  api_key: string
  tier?: string
}

function getGoogleApiKeyCandidates(): ApiKeyCandidate[] {
  const candidates: ApiKeyCandidate[] = []
  const seen = new Set<string>()

  // 1. Keys from api_keys table (pro tier first, then active)
  try {
    const dbKeys = getApiKeys('google')
    const sortedDbKeys = [...dbKeys].sort((a, b) => {
      if (a.tier === 'pro' && b.tier !== 'pro') return -1
      if (b.tier === 'pro' && a.tier !== 'pro') return 1
      return 0
    })

    for (const k of sortedDbKeys) {
      if (k.api_key && !seen.has(k.api_key)) {
        seen.add(k.api_key)
        candidates.push({ id: k.id, name: k.name, api_key: k.api_key, tier: k.tier })
      }
    }
  } catch {}

  // 2. Profile key
  const profile = getProfile()
  if (profile?.gemini_api_key && !seen.has(profile.gemini_api_key)) {
    seen.add(profile.gemini_api_key)
    candidates.push({ api_key: profile.gemini_api_key, name: 'Profile Key' })
  }

  // 3. Environment variable key
  if (process.env.GEMINI_API_KEY && !seen.has(process.env.GEMINI_API_KEY)) {
    seen.add(process.env.GEMINI_API_KEY)
    candidates.push({ api_key: process.env.GEMINI_API_KEY, name: '.env Key' })
  }

  return candidates
}

async function generateGeminiImage(prompt: string, filename: string): Promise<string> {
  const keyCandidates = getGoogleApiKeyCandidates()
  if (keyCandidates.length === 0) {
    throw new Error('No Google AI Studio API key configured for image generation')
  }

  logger.info('gemini-image', `generating: "${prompt.slice(0, 80)}" -> ${filename} (evaluating ${keyCandidates.length} Google key(s))`)

  const candidateModels = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image']
  let lastError: any = null

  for (const keyItem of keyCandidates) {
    const ai = new GoogleGenAI({ apiKey: keyItem.api_key })

    for (const model of candidateModels) {
      try {
        const interaction = await ai.interactions.create({
          model,
          store: false,
          input: [{ type: 'user_input', content: [{ type: 'text', text: prompt }] }],
        } as any)

        // The SDK exposes the last generated image via output_image.
        const out = (interaction as any).output_image
        const data = out?.data
        if (data) {
          const base64 = data.includes(',') ? data.split(',')[1] : data
          const buffer = Buffer.from(base64, 'base64')
          if (keyItem.id) updateApiKeyLastUsed(keyItem.id)
          logger.info('gemini-image', `saved to ${filename} (${buffer.length} bytes) using ${model} with key ${keyItem.name || keyItem.id || 'primary'}`)
          return saveImage(buffer, filename)
        }

        // Fall back to scanning steps for an image content block.
        for (const s of (interaction as any).steps || []) {
          for (const c of s?.content || []) {
            if (c?.type === 'image' && c.data) {
              const buffer = Buffer.from(c.data, 'base64')
              if (keyItem.id) updateApiKeyLastUsed(keyItem.id)
              logger.info('gemini-image', `saved to ${filename} (${buffer.length} bytes) using ${model} with key ${keyItem.name || keyItem.id || 'primary'}`)
              return saveImage(buffer, filename)
            }
          }
        }
      } catch (err: any) {
        lastError = err
        logger.warn('gemini-image', `key ${keyItem.name || keyItem.id || 'primary'} with model ${model} failed: ${err.message}`)
      }
    }
  }

  throw lastError || new Error('Gemini image generation returned no image')
}

function saveImage(buffer: Buffer, filename: string): string {
  const mediaDir = join(app.getPath('userData'), 'media')
  mkdirSync(mediaDir, { recursive: true })
  const outputPath = join(mediaDir, filename)
  writeFileSync(outputPath, buffer)
  return outputPath
}

async function generatePuterImage(prompt: string, filename: string, model?: string): Promise<string> {
  let client: any
  try {
    client = getPuterClient()
  } catch {
    logger.info('puter', 'no stored auth found, starting sign-in before image generation')
    const authPromise = puterSignIn()
    const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Puter sign-in timed out. Please complete sign-in in your browser or sign in to Puter to enable image generation.' }), 15000)
    )
    const auth = await Promise.race([authPromise, timeoutPromise])
    if (!auth.success) throw new Error(auth.error || 'Not signed in to Puter')
    client = getPuterClient()
  }

  logger.info('puter', `generating: "${prompt.slice(0, 80)}" -> ${filename} (model: ${model || 'gpt-image-2'})`)

  const options: Record<string, any> = { prompt }
  if (model) options.model = model
  else options.model = 'gpt-image-2'
  const result = await client.ai.txt2img(options)

  let dataUrl: string
  if (typeof result === 'string') {
    dataUrl = result
  } else if (result?.src) {
    dataUrl = result.src
  } else if (result?.data) {
    dataUrl = result.data
  } else {
    throw new Error(`Unexpected Puter.js txt2img response: ${typeof result}`)
  }

  const base64 = dataUrl.split(',')[1]
  if (!base64) throw new Error('Invalid data URL from Puter.js')

  const buffer = Buffer.from(base64, 'base64')
  const path = saveImage(buffer, filename)
  logger.info('puter', `saved to ${path} (${buffer.length} bytes)`)
  return path
}

/** Generate an image with Gemini by default, falling back to Puter.js if Gemini fails. */
export async function generateImage(prompt: string, filename: string, _mainWindow?: any, model?: string): Promise<string> {
  let geminiError: string | null = null
  try {
    return await generateGeminiImage(prompt, filename)
  } catch (e: any) {
    geminiError = e.message || String(e)
    logger.warn('gemini-image', `Gemini image failed, falling back to Puter.js: ${geminiError}`)
  }

  try {
    return await generatePuterImage(prompt, filename, model)
  } catch (e: any) {
    logger.error('image-gen', `Both Gemini and Puter image generation failed. Gemini: ${geminiError}; Puter: ${e.message}`)
    if (geminiError && (geminiError.includes('quota') || geminiError.includes('429') || geminiError.includes('limit: 0'))) {
      throw new Error(`Image generation failed: Google Gemini API key has 0 image quota on free tier (requires pay-as-you-go billing in Google AI Studio). Puter.js fallback also failed: ${e.message}`)
    }
    throw new Error(`Image generation failed: ${geminiError || e.message}`)
  }
}
