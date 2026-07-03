import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { init, getAuthToken } from '@heyputer/puter.js/src/init.cjs'
import { getProfile, updateProfile } from './db'
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

function getApiKey(): string {
  const profile = getProfile()
  const apiKey = profile?.gemini_api_key || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('No Google AI Studio API key configured for image generation')
  return apiKey
}

async function generateGeminiImage(prompt: string, filename: string): Promise<string> {
  const apiKey = getApiKey()
  const google = createGoogleGenerativeAI({ apiKey })

  logger.info('gemini-image', `generating: "${prompt.slice(0, 80)}" -> ${filename}`)

  const result = await generateText({
    model: google('gemini-3.1-flash-lite-image'),
    prompt,
    providerOptions: {
      google: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    },
  })

  for (const file of result.files || []) {
    if (file.mediaType?.startsWith('image/')) {
      const base64 = file.base64?.includes(',') ? file.base64.split(',')[1] : file.base64
      if (!base64) continue
      const buffer = Buffer.from(base64, 'base64')
      const mediaDir = join(app.getPath('userData'), 'media')
      mkdirSync(mediaDir, { recursive: true })
      const outputPath = join(mediaDir, filename)
      writeFileSync(outputPath, buffer)
      logger.info('gemini-image', `saved to ${outputPath} (${buffer.length} bytes)`)
      return outputPath
    }
  }

  throw new Error('Gemini image generation returned no image')
}

async function generatePuterImage(prompt: string, filename: string, model?: string): Promise<string> {
  let client: any
  try {
    client = getPuterClient()
  } catch {
    logger.info('puter', 'no stored auth found, starting sign-in before image generation')
    const auth = await puterSignIn()
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
  const mediaDir = join(app.getPath('userData'), 'media')
  mkdirSync(mediaDir, { recursive: true })
  const outputPath = join(mediaDir, filename)
  writeFileSync(outputPath, buffer)

  logger.info('puter', `saved to ${outputPath} (${buffer.length} bytes)`)
  return outputPath
}

/** Generate an image with Gemini by default, falling back to Puter.js if Gemini fails. */
export async function generateImage(prompt: string, filename: string, _mainWindow?: any, model?: string): Promise<string> {
  try {
    return await generateGeminiImage(prompt, filename)
  } catch (e: any) {
    logger.warn('gemini-image', `Gemini image failed, falling back to Puter.js: ${e.message}`)
    return generatePuterImage(prompt, filename, model)
  }
}
