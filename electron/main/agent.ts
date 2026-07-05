import { GoogleGenAI } from '@google/genai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { getProfile, getApiTier, getAvailableApiKeyForModel, markModelExhausted, isModelExhaustedForAllKeys, updateApiKeyLastUsed, getChatSessionSteps, updateChatSessionSteps } from './db'
import { createTools } from './tools'
import { logger } from './log'
import { ipcMain } from 'electron'
import { z } from 'zod'
import { SOCIAL_FETCH_TOOLS } from './social-content'
import { SYSTEM_PROMPT } from './agent-system-prompt'
export { ONBOARDING_SYSTEM_PROMPT } from './onboarding-system-prompt'

const CHAT_MODEL = 'gemini-3.1-flash-lite'
const TITLE_MODEL = 'gemma-4-31b-it'

const MODEL_LABELS: Record<string, string> = {
  'Gemini 3.5 Flash': 'gemini-3.5-flash',
  'gemini-3.5-flash': 'gemini-3.5-flash',
  'Gemini 3.1 Pro': 'gemini-3.1-pro',
  'gemini-3.1-pro': 'gemini-3.1-pro',
  'Gemini 3.1 Flash Lite': 'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite': CHAT_MODEL,
}

// Fallback chain for different scenarios
export const ONBOARDING_MODEL_FALLBACK = ['gemini-3.5-flash', 'gemini-3.1-flash-lite']
export const CHAT_MODEL_FALLBACK_PRO = ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite']
export const CHAT_MODEL_FALLBACK_FREE = ['gemini-3.1-flash-lite', 'gemini-3.5-flash']


const EFFORT_MAP: Record<string, string> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  'Max Effort': 'high',
}

export interface AgentOptions {
  model?: string
  effort?: string
  maxSteps?: number
  fallbackChain?: string[]
  skipRateLimitCheck?: boolean
  onModelSwitch?: (model: string, index: number, total: number) => void
}

export interface AgentConfig {
  apiKey: string
  apiKeyId: number | null
  google: GoogleGenAI
  modelId: string
  thinkingLevel: string
  system: string
  tools: any
  profile: any
  tier: string
}

export function getApiKey(model?: string, excludeApiKeyId?: number): { apiKey: string; apiKeyId: number | null } {
  const profile = getProfile()

  if (model) {
    const requiredTier = model === 'gemini-3.1-pro' ? 'pro' : undefined
    const availableKey = getAvailableApiKeyForModel(model, requiredTier, excludeApiKeyId)
    if (availableKey) {
      updateApiKeyLastUsed(availableKey.id)
      logger.info('agent', `getApiKey: using API key ${availableKey.id} for model ${model}`)
      return { apiKey: availableKey.api_key, apiKeyId: availableKey.id }
    } else {
      logger.warn('agent', `getApiKey: no available API key found for model ${model} (tier: ${requiredTier}, exclude: ${excludeApiKeyId})`)
    }
  }

  const apiKey = profile?.gemini_api_key || process.env.GEMINI_API_KEY
  if (!apiKey)
    throw new Error(
      'No Google AI Studio API key configured. Set GEMINI_API_KEY in .env or add it during onboarding.',
    )
  logger.info('agent', `getApiKey: using fallback primary API key`)
  return { apiKey, apiKeyId: null }
}

export function getAgentConfig(options?: AgentOptions): AgentConfig {
  const profile = getProfile()
  const tier = getApiTier().tier

  let fallbackChain = options?.fallbackChain
  if (!fallbackChain) {
    fallbackChain = tier === 'pro' ? CHAT_MODEL_FALLBACK_PRO : CHAT_MODEL_FALLBACK_FREE
  }

  let modelId = options?.model ? MODEL_LABELS[options.model] : undefined
  if (!modelId) {
    for (const candidateModel of fallbackChain) {
      const requiredTier = candidateModel === 'gemini-3.1-pro' ? 'pro' : undefined
      if (!options?.skipRateLimitCheck && isModelExhaustedForAllKeys(candidateModel, requiredTier)) {
        logger.warn('agent', `model ${candidateModel} is exhausted for all ${requiredTier || 'eligible'} API keys, trying next in chain`)
        continue
      }
      modelId = candidateModel
      break
    }
    if (!modelId) modelId = fallbackChain[0]
  }

  const { apiKey, apiKeyId } = getApiKey(modelId, undefined)
  const google = new GoogleGenAI({ apiKey })

  const effortLabel = options?.effort || 'Medium'
  const thinkingLevel = EFFORT_MAP[effortLabel] || 'medium'

  let system = SYSTEM_PROMPT
  if (profile?.growth_strategy) {
    system += `\n\n=== PERSONALIZED GROWTH STRATEGY ===\nThis is the user's personalized growth strategy, created during onboarding. Follow it in all content creation and engagement:\n\n${profile.growth_strategy}`
  }

  return {
    apiKey,
    apiKeyId,
    google,
    modelId,
    thinkingLevel,
    system,
    tools: createTools({ defaultMax: 10 }),
    profile,
    tier
  }
}

// ─── ONBOARDING AGENT ───────────────────────────────────────────────────────

const pendingQuestionBatch = new Map<
  string,
  (answers: { id: string; answer: string | string[] }[]) => void
>()

export function clearPendingQuestions() {
  pendingQuestionBatch.clear()
}

let answerListenerInstalled = false
export function installOnboardingAnswerListener() {
  if (answerListenerInstalled) return
  answerListenerInstalled = true
  ipcMain.on(
    'onboarding:answer',
    (
      _e,
      {
        id,
        answers,
      }: { id: string; answers: { id: string; answer: string | string[] }[] },
    ) => {
      const resolve = pendingQuestionBatch.get(id)
      if (resolve) {
        pendingQuestionBatch.delete(id)
        resolve(answers)
      }
    },
  )
}

export function createOnboardingTools(
  sendQuestions: (payload: {
    batchId: string
    questions: {
      id: string
      text: string
      type: 'single' | 'multi' | 'text'
      options?: string[]
    }[]
  }) => void,
) {
  const base = createTools()
  return {
    ...base,
    ask_user_questions: {
      description:
        'Ask the user ALL interview questions at once. The UI shows them with prev/next navigation and submits all answers together. Call this ONCE with every question you need. Never call it more than once.',
      parameters: z.object({
        questions: z
          .array(
            z.object({
              id: z.string().describe('Unique short ID, e.g. "q_goal"'),
              text: z.string().describe('The question text'),
              type: z
                .enum(['single', 'multi', 'text'])
                .describe(
                  'single = one choice MCQ, multi = multiple choice, text = free input',
                ),
              options: z
                .array(z.string())
                .optional()
                .describe('Answer options for single/multi types'),
            }),
          )
          .describe('ALL questions to ask the user (5-8 recommended)'),
      }),
      execute: async ({
        questions,
      }: {
        questions: {
          id: string
          text: string
          type: 'single' | 'multi' | 'text'
          options?: string[]
        }[]
      }) => {
        return new Promise<{
          answers: {
            id: string
            question: string
            answer: string | string[]
          }[]
        }>((resolve) => {
          const batchId = `onb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          pendingQuestionBatch.set(batchId, (rawAnswers) => {
            const formatted = rawAnswers.map((a) => {
              const q = questions.find((qq) => qq.id === a.id)
              return { id: a.id, question: q?.text || a.id, answer: a.answer }
            })
            resolve({ answers: formatted })
          })
          sendQuestions({ batchId, questions })
          logger.info(
            'onboarding',
            `batch questions sent: ${questions.length} questions (id: ${batchId})`,
          )
        })
      },
    },
  }
}

// ─── CHAT QUESTION (ask_user) ───────────────────────────────────────────────

const pendingChatQuestions = new Map<
  string,
  (answer: string | string[]) => void
>()

export function clearPendingChatQuestions() {
  pendingChatQuestions.clear()
}

let chatAnswerListenerInstalled = false
export function installChatAnswerListener() {
  if (chatAnswerListenerInstalled) return
  chatAnswerListenerInstalled = true
  ipcMain.on(
    'chat:answer',
    (_e, { id, answer }: { id: string; answer: string | string[] }) => {
      const resolve = pendingChatQuestions.get(id)
      if (resolve) {
        pendingChatQuestions.delete(id)
        resolve(answer)
      }
    },
  )
}

function normalizeChatQuestion(input: {
  text: unknown
  type: unknown
  options?: unknown
}): {
  text: string
  type: 'single' | 'multi' | 'text'
  options?: string[]
} {
  let text = typeof input.text === 'string' ? input.text : String(input.text ?? '')
  let type: 'single' | 'multi' | 'text' =
    input.type === 'single' || input.type === 'multi' || input.type === 'text'
      ? input.type
      : 'text'
  let options = Array.isArray(input.options)
    ? input.options
        .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
        .map((o) => o.trim())
    : undefined

  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed.text === 'string') text = parsed.text
      if (parsed.type === 'single' || parsed.type === 'multi' || parsed.type === 'text') {
        type = parsed.type
      }
      if (Array.isArray(parsed.options)) {
        options = parsed.options
          .filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 0)
          .map((o: string) => o.trim())
      }
    } catch {
      /* recover below */
    }
  }

  const leakedType = text.match(/["']?\s*,\s*["']type["']\s*:\s*["'](single|multi|text)["']/)
  if (leakedType) {
    type = leakedType[1] as 'single' | 'multi' | 'text'
  }

  const leakedOptions = text.match(/["']?\s*,\s*["']options["']\s*:\s*(\[[\s\S]*?\])\s*}?$/)
  if (leakedOptions) {
    try {
      const parsed = JSON.parse(leakedOptions[1])
      if (Array.isArray(parsed)) {
        options = parsed
          .filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 0)
          .map((o: string) => o.trim())
      }
    } catch {
      /* keep existing options */
    }
  }

  text = text
    .replace(/["']?\s*,\s*["']type["']\s*:\s*["'](?:single|multi|text)["'][\s\S]*$/u, '')
    .replace(/^["']+|["']+$/g, '')
    .trim()

  if ((type === 'single' || type === 'multi') && (!options || options.length === 0)) {
    const lower = text.toLowerCase()
    if (lower.includes('approve') && lower.includes('edit') && lower.includes('skip')) {
      options = ['Approve', 'Edit', 'Skip']
    } else if (lower.includes('approve') && lower.includes('skip')) {
      options = ['Approve', 'Skip']
    } else if (/\b(yes|no)\b/.test(lower)) {
      options = ['Yes', 'No']
    } else {
      type = 'text'
    }
  }

  return {
    text: text || 'Please answer this question.',
    type,
    options: type === 'text' ? undefined : options,
  }
}

export function createChatTools(
  sendQuestion: (q: {
    id: string
    text: string
    type: 'single' | 'multi' | 'text'
    options?: string[]
  }) => void,
) {
  const base = createTools({ defaultMax: 10 })
  return {
    ...base,
    ask_user: {
      description:
        'Ask the user a question or request permission/clarification. The prompt input morphs into a question UI. Use type "single" for yes/no or MCQ, "multi" for multiple selections, "text" for open input. Always supply good options for single/multi.',
      parameters: z.object({
        text: z.string().describe('The question or request'),
        type: z.enum(['single', 'multi', 'text']).describe('Question type'),
        options: z
          .array(z.string())
          .optional()
          .describe('Options for single/multi'),
      }),
      execute: async ({
        text,
        type,
        options,
      }: {
        text: unknown
        type: unknown
        options?: unknown
      }) => {
        const normalized = normalizeChatQuestion({ text, type, options })
        const id = `chatq_${Date.now()}`
        return new Promise<{ answer: string | string[] }>((resolve) => {
          pendingChatQuestions.set(id, (answer) => resolve({ answer }))
          sendQuestion({ id, ...normalized })
          logger.info('chat', `ask_user: ${id} — ${normalized.text}`)
        })
      },
    },
  }
}

// ─── Tool conversion: zod params → Interactions API declarations ────────────
// CRITICAL for tool-result round-trip: declarations carry a plain JSON schema
// (`parameters`), while the local execute fns are kept in a separate map.
function schemaFromZod(schema: any): any {
  if (!schema) return { type: 'object', properties: {} }
  // zod-to-json-schema with $refStrategy:'none' produces a clean inline schema.
  const json = zodToJsonSchema(schema, { $refStrategy: 'none' })
  // strip $schema key (not accepted by the API)
  if (json && json.$schema) delete json.$schema
  return json
}

function buildToolDeclarations(tools: Record<string, any>): any[] {
  const decls: any[] = []
  for (const [name, t] of Object.entries(tools)) {
    const params = t.parameters || t.inputSchema
    decls.push({
      type: 'function',
      name,
      description: t.description || name,
      parameters: schemaFromZod(params),
    })
  }
  return decls
}

function buildExecuteMap(tools: Record<string, any>): Map<string, (args: any) => Promise<any>> {
  const m = new Map<string, (args: any) => Promise<any>>()
  for (const [name, t] of Object.entries(tools)) {
    if (typeof t.execute === 'function') m.set(name, t.execute)
  }
  return m
}

// ─── Message conversion (app format → Interactions API steps) ───────────────
// ponytail: across-turn history loaded from DB has no thought signatures, so
// we reconstruct a best-effort step list. Within a single runAgent call the
// authoritative server steps (with signatures) are preserved verbatim.

type AppMessage = {
  role: string
  content: string | null
  parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[]
  tool_call_id?: string
  tool_calls?: {
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }[]
}

function findToolName(messages: AppMessage[], toolCallId?: string): string {
  if (!toolCallId) return ''
  for (const msg of messages) {
    if (!msg.tool_calls) continue
    for (const tc of msg.tool_calls) {
      if (tc.id === toolCallId) return tc.function?.name || ''
    }
  }
  return ''
}

async function saveInlineImage(data: string, mimeType: string): Promise<string> {
  const { join } = await import('path')
  const { mkdirSync, writeFileSync } = await import('fs')
  const { app } = await import('electron')
  const ext = (mimeType.split('/')[1] || 'png').replace('svg+xml', 'svg')
  const filename = `chat_upload_${Date.now()}.${ext}`
  const mediaDir = join(app.getPath('userData'), 'media')
  mkdirSync(mediaDir, { recursive: true })
  const outputPath = join(mediaDir, filename)
  writeFileSync(outputPath, Buffer.from(data, 'base64'))
  return outputPath
}

async function toInteractionSteps(messages: AppMessage[]): Promise<any[]> {
  const steps: any[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    if (msg.role === 'system') continue

    if (msg.role === 'user') {
      const content: any[] = []
      if (msg.content) content.push({ type: 'text', text: msg.content })
      for (const part of msg.parts || []) {
        if (part.inlineData?.data) {
          content.push({
            type: 'image',
            data: part.inlineData.data,
            mime_type: part.inlineData.mimeType,
          })
          const savedPath = await saveInlineImage(part.inlineData.data, part.inlineData.mimeType)
          content.push({ type: 'text', text: `[Image saved to: ${savedPath}. Pass this path as image_path to twitter_post or twitter_reply if the user wants to post it.]` })
        } else if (part.text) {
          content.push({ type: 'text', text: part.text })
        }
      }
      steps.push({ type: 'user_input', content })
      continue
    }

    if (msg.role === 'assistant') {
      const content: any[] = []
      if (msg.content) content.push({ type: 'text', text: msg.content })
      if (content.length > 0) steps.push({ type: 'model_output', content })
      for (const tc of msg.tool_calls || []) {
        let args: any = {}
        try { args = JSON.parse(tc.function?.arguments || '{}') } catch { args = {} }
        steps.push({ type: 'function_call', id: tc.id, name: tc.function?.name || '', arguments: args })
      }
      continue
    }

    if (msg.role === 'tool') {
      const toolName = findToolName(messages, msg.tool_call_id)
      steps.push({
        type: 'function_result',
        call_id: msg.tool_call_id || '',
        name: toolName,
        result: [{ type: 'text', text: msg.content || '' }],
      })
      continue
    }
  }
  return steps
}

// ─── 400 fallback: collapse steps to text-only user_input/model_output ──────
// Drops thought steps (signatures may expire/invalid across turns) and
// function_call/function_result steps (ids may not survive DB round-trips).
function hasNonTextSteps(steps: any[]): boolean {
  return steps.some(s => s.type !== 'user_input' && s.type !== 'model_output')
}

function stripStepsToTextOnly(steps: any[]): any[] {
  const out: any[] = []
  for (const s of steps) {
    if (s.type === 'user_input') {
      const content = (s.content || []).filter((c: any) => c.type === 'text' || c.type === 'image')
      if (content.length > 0) out.push({ type: 'user_input', content })
    } else if (s.type === 'model_output') {
      const content = (s.content || []).filter((c: any) => c.type === 'text' && c.text)
      if (content.length > 0) out.push({ type: 'model_output', content })
    }
  }
  return out
}

function tryStringifyError(e: any): string {
  try {
    const own: Record<string, any> = {}
    for (const k of Object.getOwnPropertyNames(e)) {
      if (k === 'stack') continue
      try { own[k] = e[k] } catch { /* skip */ }
    }
    return JSON.stringify(own).slice(0, 2000)
  } catch {
    return String(e)
  }
}

// ─── Text generation (no tools, non-streaming) ─────────────────────────────

export async function generateText(
  messages: { role: string; content: string }[],
  system?: string,
  options?: { model?: string },
): Promise<string> {
  const { apiKey, google } = getAgentConfig({ model: options?.model })
  const ai = google
  const modelId = options?.model || TITLE_MODEL
  try {
    const input = messages.map((m) => ({
      type: m.role === 'assistant' ? 'model_output' : 'user_input',
      content: [{ type: 'text', text: m.content }],
    }))
    const interaction = await ai.interactions.create({
      model: modelId,
      store: false,
      input,
      ...(system ? { system_instruction: system } : {}),
    } as any)
    return (interaction as any).output_text || ''
  } catch (e: any) {
    logger.error('agent', `generateText error: ${e.message}`)
    throw e
  }
}

// ─── Rate-limit / fallback detection from a thrown error ───────────────────
function isRateLimitError(e: any): boolean {
  const errorMessage = e?.message || ''
  const statusCode = e?.status || e?.statusCode || e?.code
  const errorData = e?.error || e?.data?.error
  const errorStatus = errorData?.status || errorData?.code
  return (
    statusCode === 429 ||
    errorStatus === 'RESOURCE_EXHAUSTED' ||
    errorStatus === 429 ||
    errorMessage.includes('quota') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('429') ||
    errorMessage.includes('exceeded your current quota') ||
    (errorData && errorData.message && errorData.message.includes('quota'))
  )
}

// ─── Build a function_result step from a local execute result ──────────────
// If the tool output carries an image (inspect_image_url), include it as an
// image content block so the model can actually see it.
function buildFunctionResult(callId: string, name: string, output: any) {
  const blocks: any[] = []
  if (output && typeof output === 'object' && output.data && typeof output.mimeType === 'string' && output.mimeType.startsWith('image/')) {
    blocks.push({ type: 'text', text: `Image (${output.mimeType}, ${output.byteLength ?? output.data.length} bytes)` })
    blocks.push({ type: 'image', data: output.data, mime_type: output.mimeType })
  } else {
    blocks.push({ type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output) })
  }
  return { type: 'function_result', call_id: callId, name, result: blocks }
}

// ─── Main agent loop — Interactions API (stateless) ─────────────────────────
// Stateless mode: we resend the full step history each turn. The server
// returns authoritative steps (thought signatures + function_call ids); we
// push them VERBATIM and append our function_result steps with call_id matching
// the function_call.id. This is what makes the tool-result round-trip work.
export async function runAgent(
  messages: AppMessage[],
  onChunk: (text: string) => void,
  onToolCall: (name: string, args: any) => void,
  onToolResult: (name: string, result: any) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void,
  onReasoning?: (text: string) => void,
  options?: AgentOptions,
  toolsOverride?: Record<string, any>,
  systemPromptOverride?: string,
  abortController?: AbortController,
  drainInjectedMessages?: () => AppMessage[],
  onInjectedMessages?: (messages: AppMessage[]) => void,
  sessionId?: number,
) {
  let fullText = ''
  const fallbackChain = options?.fallbackChain || (getApiTier().tier === 'pro' ? CHAT_MODEL_FALLBACK_PRO : CHAT_MODEL_FALLBACK_FREE)

  async function attemptWithModel(modelIndex: number, currentSteps: any[]): Promise<{ success: boolean; updatedSteps: any[] }> {
    if (modelIndex >= fallbackChain.length) {
      return { success: false, updatedSteps: currentSteps }
    }

    const currentModel = fallbackChain[modelIndex]
    logger.info('agent', `attempting with model: ${currentModel} (${modelIndex + 1}/${fallbackChain.length})`)

    let steps = currentSteps
    let capturedApiKeyId: number | null = null

    try {
      const config = getAgentConfig({
        ...options,
        model: currentModel,
        fallbackChain: fallbackChain.slice(modelIndex),
        skipRateLimitCheck: false
      })
      const tools = toolsOverride || config.tools
      const system = systemPromptOverride || config.system
      const maxSteps = options?.maxSteps ?? 40
      // CRITICAL: `ai` and `capturedApiKeyId` must be mutable so key rotation
      // actually swaps the client + tracking. Previously these were const and
      // rotation silently kept hitting the original key forever.
      let ai = config.google
      capturedApiKeyId = config.apiKeyId
      const modelId = config.modelId
      const thinkingLevel = config.thinkingLevel
      const triedKeyIds = new Set<number | null>()
      triedKeyIds.add(config.apiKeyId)
      let keyAttempts = 0

      const toolDeclarations = buildToolDeclarations(tools)
      const executeMap = buildExecuteMap(tools)

      let stepCount = 0

      logger.info(
        'agent',
        `runAgent started with ${currentModel}, maxSteps=${maxSteps}, steps=${steps.length}, tools=${toolDeclarations.length}`,
      )

      while (stepCount < maxSteps) {
        if (abortController?.signal.aborted) {
          logger.info('agent', 'aborted before step')
          onDone(fullText)
          return { success: true, updatedSteps: steps }
        }

        stepCount++
        logger.info('agent', `step ${stepCount}/${maxSteps} — calling interactions.create with ${currentModel}`, {
          tools: toolDeclarations.length,
          steps: steps.length,
        })

        let modelSteps: any[] = []        // authoritative steps returned this turn
        let functionResults: any[] = []   // function_result steps we produce
        let hadFunctionCalls = false

        try {
          // Accumulators keyed by stream step index
          const captured = new Map<number, any>()   // index → step under construction
          const argBuf = new Map<number, string>()  // index → accumulated args string
          const textBuf = new Map<number, string>() // index → accumulated text
          let completedSteps: any[] | null = null   // from interaction.completed (if present)

          const stream = await ai.interactions.create({
            model: modelId,
            store: false,
            input: steps,
            tools: toolDeclarations,
            system_instruction: system,
            generation_config: {
              thinking_level: thinkingLevel,
              thinking_summaries: 'auto',
              temperature: 0.3,
              max_output_tokens: 8192,
            },
            stream: true,
          } as any)

          for await (const event of (stream as any)) {
            if (abortController?.signal.aborted) {
              logger.info('agent', 'aborted during stream')
              onDone(fullText)
              return { success: true, updatedSteps: steps }
            }

            const et = event.event_type
            if (et === 'error') {
              const msg = event.error?.message || 'stream error'
              throw Object.assign(new Error(msg), { status: event.error?.code })
            }

            if (et === 'interaction.completed') {
              const evSteps = event.interaction?.steps
              if (Array.isArray(evSteps) && evSteps.length > 0) completedSteps = evSteps
              continue
            }

            if (et === 'step.start') {
              captured.set(event.index, JSON.parse(JSON.stringify(event.step || {})))
              const s = event.step || {}
              if (s.type === 'function_call') argBuf.set(event.index, '')
              if (s.type === 'model_output') textBuf.set(event.index, '')
              continue
            }

            if (et === 'step.delta') {
              const idx = event.index
              const d = event.delta || {}
              switch (d.type) {
                case 'text': {
                  fullText += d.text || ''
                  textBuf.set(idx, (textBuf.get(idx) || '') + (d.text || ''))
                  onChunk(d.text || '')
                  break
                }
                case 'thought_summary': {
                  const t = d.content?.text
                  if (t) onReasoning?.(t)
                  break
                }
                case 'thought_signature': {
                  const ts = captured.get(idx)
                  if (ts && ts.type === 'thought' && d.signature) {
                    ts.signature = (ts.signature || '') + d.signature
                  }
                  break
                }
                case 'arguments_delta':
                case 'arguments': {
                  // SDK normalizes to arguments_delta.arguments; REST may use partial_arguments.
                  argBuf.set(idx, (argBuf.get(idx) || '') + (d.arguments || d.partial_arguments || ''))
                  break
                }
                default:
                  // image/audio/annotation deltas — not needed for text agent loop
                  break
              }
              continue
            }

            if (et === 'step.stop') {
              const idx = event.index
              const s = captured.get(idx)
              if (!s) continue
              if (s.type === 'model_output') {
                const txt = textBuf.get(idx)
                if (txt) s.content = [{ type: 'text', text: txt }]
              }
              if (s.type === 'function_call') {
                // finalize arguments from the delta buffer
                const buf = argBuf.get(idx)
                if (buf) {
                  try { s.arguments = JSON.parse(buf) } catch { /* keep step.start args */ }
                }
              }
              continue
            }
          }

          // Prefer server-authoritative steps; fall back to captured+merged.
          modelSteps = completedSteps && completedSteps.length > 0
            ? completedSteps
            : Array.from(captured.values())

          logger.info('agent', `stream done — ${modelSteps.length} steps (${completedSteps ? 'server' : 'captured'})`)
        } catch (e: any) {
          if (isRateLimitError(e)) {
            logger.warn('agent', `${currentModel} hit rate limit for API key ${capturedApiKeyId}, rotating`, {
              status: e?.status || e?.statusCode,
              message: (e?.message || '').substring(0, 200),
            })
            try { markModelExhausted(currentModel, capturedApiKeyId) } catch (err) { logger.error('agent', 'failed to mark model as exhausted', err) }
            triedKeyIds.add(capturedApiKeyId)
            keyAttempts++
            if (keyAttempts > 5) {
              logger.warn('agent', `key-attempt cap (5) reached for ${currentModel}, trying next model`)
              return { success: false, updatedSteps: steps }
            }

            const requiredTier = currentModel === 'gemini-3.1-pro' ? 'pro' : undefined
            // The exhaustion table already excludes rate-limited keys; the
            // exclude param + triedKeyIds guard against any re-offer.
            const candidate = getAvailableApiKeyForModel(currentModel, requiredTier, capturedApiKeyId ?? undefined)
            if (candidate && !triedKeyIds.has(candidate.id)) {
              logger.info('agent', `rotating to API key ${candidate.id} for ${currentModel}, retrying`)
              ai = new GoogleGenAI({ apiKey: candidate.api_key })
              capturedApiKeyId = candidate.id
              triedKeyIds.add(candidate.id)
              stepCount--
              continue
            }
            logger.warn('agent', `No more API keys available for ${currentModel}, trying next model`)
            return { success: false, updatedSteps: steps }
          }

          // 400 / INVALID_ARGUMENT — this is a malformed request, NOT a key
          // problem. Rotating keys cannot fix it (and previously caused an
          // infinite loop). Surface the real detail, then retry once with
          // text-only history (drops stale thought signatures / fragile ids);
          // if that also fails, fall through to the next model.
          const status = e?.status || e?.statusCode || e?.code
          const errorStatus = e?.error?.status || e?.error?.code
          if (status === 400 || errorStatus === 'INVALID_ARGUMENT' || status === 'FAILED_PRECONDITION' || status === 3) {
            logger.error('agent', '400 INVALID_ARGUMENT — full error detail', {
              currentModel,
              stepsCount: steps.length,
              status,
              errorStatus,
              message: (e?.message || '').substring(0, 500),
              body: typeof e?.body === 'string' ? e.body.slice(0, 1000) : tryStringifyError(e),
              cause: String(e?.cause || '').slice(0, 500),
            })
            if (hasNonTextSteps(steps)) {
              steps = stripStepsToTextOnly(steps)
              logger.warn('agent', `retrying ${currentModel} with text-only history (${steps.length} steps) after 400`)
              stepCount--
              continue
            }
            logger.warn('agent', '400 persists after text-only retry, switching model')
            return { success: false, updatedSteps: steps }
          }

          logger.warn('agent', `${currentModel} encountered error, trying next model`, {
            error: (e?.message || '').substring(0, 200), status
          })
          return { success: false, updatedSteps: steps }
        }

        // Push the model's returned steps verbatim (preserves thought signatures
        // and function_call ids — required for the next round-trip).
        steps.push(...modelSteps)

        // Execute any function_call steps and build matching function_result steps.
        for (const s of modelSteps) {
          if (s.type !== 'function_call') continue
          hadFunctionCalls = true
          onToolCall(s.name, s.arguments)
          logger.info('agent', `tool-call: ${s.name}`, s.arguments)
          let output: any
          try {
            const fn = executeMap.get(s.name)
            output = fn ? await fn(s.arguments || {}) : { error: `Tool ${s.name} has no execute` }
          } catch (err: any) {
            output = { error: err?.message || String(err) }
          }
          const fr = buildFunctionResult(s.id, s.name, output)
          functionResults.push(fr)

          // UI feedback (truncate large non-social results, drop raw image bytes)
          const isImageTool = s.name === 'inspect_image_url'
          const truncateLimit = SOCIAL_FETCH_TOOLS.has(s.name) || isImageTool ? Infinity : 15000
          let outputForUi: any = output
          if (isImageTool && outputForUi?.data) {
            outputForUi = { ...outputForUi, data: undefined, _note: 'Image sent to model via function_result image block' }
          }
          const resultStr = JSON.stringify(outputForUi)
          const truncated = resultStr.length > truncateLimit
            ? resultStr.slice(0, truncateLimit) + '...[truncated]'
            : outputForUi
          onToolResult(s.name, truncated)
          logger.info('agent', `tool-result: ${s.name}`)
        }

        if (functionResults.length > 0) steps.push(...functionResults)

        logger.info('agent', `step ${stepCount} done — toolCalls=${hadFunctionCalls}, textLen=${fullText.length}`)

        const injected = drainInjectedMessages?.() ?? []
        if (injected.length > 0) {
          const injectedSteps = await toInteractionSteps(injected)
          steps.push(...injectedSteps)
          onInjectedMessages?.(injected)
          logger.info('agent', `injected ${injected.length} message(s) into active run`)
          hadFunctionCalls = true // force another loop iteration to process injected input
        }

        if (!hadFunctionCalls) {
          logger.info('agent', `done — ${fullText.length} chars total`)
          onDone(fullText)
          return { success: true, updatedSteps: steps }
        }
      }

      logger.warn('agent', `reached max steps (${maxSteps})`)
      onDone(fullText + '\n\n[Reached max tool call steps]')
      return { success: true, updatedSteps: steps }
    } catch (e: any) {
      if (isRateLimitError(e)) {
        try { markModelExhausted(currentModel, capturedApiKeyId) } catch (err) { logger.error('agent', 'failed to mark exhausted (outer)', err) }
        logger.warn('agent', `${currentModel} hit error at attempt level, trying next model`, {
          error: (e?.message || '').substring(0, 200)
        })
        return { success: false, updatedSteps: steps }
      }
      if (abortController?.signal.aborted) {
        logger.info('agent', 'aborted by user')
        onDone(fullText)
        return { success: true, updatedSteps: steps }
      }
      logger.warn('agent', `${currentModel} unexpected error, trying next model`, {
        error: (e?.message || '').substring(0, 200)
      })
      return { success: false, updatedSteps: steps }
    }
  }

  try {
    const userCount = messages.filter(m => m.role === 'user').length
    let currentSteps: any[]

    // Reuse the authoritative server steps persisted last turn (preserves
    // thought signatures + function_call ids + function_result payloads) when
    // the incoming history is a clean append or a regenerate of the last turn.
    const stored = sessionId != null ? getChatSessionSteps(sessionId) : null
    const lastMsg = messages[messages.length - 1]
    if (stored && stored.steps.length > 0 && stored.userCount === userCount - 1 && lastMsg?.role === 'user') {
      // Clean append: add only the new user message to the stored steps.
      const newUserSteps = await toInteractionSteps([lastMsg])
      currentSteps = [...stored.steps, ...newUserSteps]
      logger.info('agent', `reusing ${stored.steps.length} stored steps + ${newUserSteps.length} new (userCount ${stored.userCount} → ${userCount})`)
    } else if (stored && stored.steps.length > 0 && stored.userCount === userCount) {
      // Regenerate / retry of the latest turn: reuse stored steps verbatim.
      currentSteps = stored.steps
      logger.info('agent', `reusing ${stored.steps.length} stored steps (same userCount ${userCount})`)
    } else {
      // First turn, or history was edited → rebuild from messages.
      currentSteps = await toInteractionSteps(messages)
      if (stored) logger.info('agent', `history mismatch (stored userCount ${stored.userCount} vs ${userCount}), rebuilding from messages`)
    }

    for (let i = 0; i < fallbackChain.length; i++) {
      const { success, updatedSteps } = await attemptWithModel(i, currentSteps)
      if (success) {
        // Persist the authoritative final steps for next turn.
        if (sessionId != null) {
          try { updateChatSessionSteps(sessionId, updatedSteps, userCount) } catch (e) { logger.error('agent', 'failed to persist steps', e) }
        }
        return
      }
      currentSteps = updatedSteps
      fullText = ''
      logger.info('agent', `model ${fallbackChain[i]} failed, trying next model with ${currentSteps.length} steps`)
    }

    logger.error('agent', 'all models in fallback chain failed')
    onError('All available models failed or hit rate limits. Please try again later or upgrade your API tier.')
  } catch (e: any) {
    logger.error('agent', `unexpected error: ${e.message}`)
    onError(e.message || 'An unexpected error occurred')
  }
}
