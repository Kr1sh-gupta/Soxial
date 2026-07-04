import { streamText, generateText as sdkGenerateText, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getProfile, trackModelRequest, isModelRateLimited, getApiTier } from './db'
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

export function getApiKey(): string {
  const profile = getProfile()
  const apiKey = profile?.gemini_api_key || process.env.GEMINI_API_KEY
  if (!apiKey)
    throw new Error(
      'No Google AI Studio API key configured. Set GEMINI_API_KEY in .env or add it during onboarding.',
    )
  return apiKey
}

export function getAgentConfig(options?: AgentOptions) {
  const apiKey = getApiKey()
  const google = createGoogleGenerativeAI({ apiKey })
  const profile = getProfile()
  const tier = getApiTier().tier
  
  // Determine fallback chain based on scenario
  let fallbackChain = options?.fallbackChain
  if (!fallbackChain) {
    if (tier === 'pro') {
      fallbackChain = CHAT_MODEL_FALLBACK_PRO
    } else {
      fallbackChain = CHAT_MODEL_FALLBACK_FREE
    }
  }
  
  // Select model - either specified or first non-rate-limited in fallback chain
  let modelId = options?.model ? MODEL_LABELS[options.model] : undefined
  if (!modelId) {
    for (const candidateModel of fallbackChain) {
      if (!options?.skipRateLimitCheck && isModelRateLimited(candidateModel, tier)) {
        logger.warn('agent', `model ${candidateModel} is rate limited, trying next in chain`)
        continue
      }
      modelId = candidateModel
      break
    }
    // If all are rate limited, use the first one anyway and let it fail
    if (!modelId) {
      modelId = fallbackChain[0]
      logger.warn('agent', `all models in fallback chain are rate limited, using ${modelId} anyway`)
    }
  }
  
  const effortLabel = options?.effort || 'Medium'
  const thinkingLevel = EFFORT_MAP[effortLabel] || 'medium'

  let system = SYSTEM_PROMPT
  if (profile?.growth_strategy) {
    system += `\n\n=== PERSONALIZED GROWTH STRATEGY ===\nThis is the user's personalized growth strategy, created during onboarding. Follow it in all content creation and engagement:\n\n${profile.growth_strategy}`
  }
  
  // Track the request for the selected model
  if (!options?.skipRateLimitCheck) {
    trackModelRequest(modelId)
  }
  
  return {
    system,
    tools: createTools({ defaultMax: 10 }),
    maxSteps: options?.maxSteps ?? 40,
    model: google(modelId),
    thinkingLevel,
    modelId,
    tier,
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

// ─── Message conversion (app format → AI SDK model messages) ────────────────

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

// AI SDK v7 reads `inputSchema`, not `parameters`. Normalize all tools.
function normalizeTools(tools: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [name, t] of Object.entries(tools)) {
    out[name] = t.inputSchema ? t : { ...t, inputSchema: t.parameters || z.object({}) }
  }
  return out
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

async function toModelMessages(messages: AppMessage[]): Promise<any[]> {
  const result: any[] = []
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
            image: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          })
          const savedPath = await saveInlineImage(part.inlineData.data, part.inlineData.mimeType)
          content.push({ type: 'text', text: `[Image saved to: ${savedPath}. Pass this path as image_path to twitter_post or twitter_reply if the user wants to post it.]` })
        }
      }
      result.push({ role: 'user', content })
      continue
    }

    if (msg.role === 'assistant') {
      const content: any[] = []
      if (msg.content) content.push({ type: 'text', text: msg.content })
      for (const tc of msg.tool_calls || []) {
        let args: any = {}
        try {
          args = JSON.parse(tc.function?.arguments || '{}')
        } catch {
          args = {}
        }
        content.push({
          type: 'tool-call',
          toolCallId: tc.id,
          toolName: tc.function?.name || '',
          input: args,
        })
      }
      result.push({ role: 'assistant', content })
      continue
    }

    if (msg.role === 'tool') {
      const toolName = findToolName(messages, msg.tool_call_id)
      let output: { type: 'json'; value: any } | { type: 'text'; value: string }
      try {
        output = { type: 'json', value: JSON.parse(msg.content || '') }
      } catch {
        output = { type: 'text', value: msg.content || '' }
      }
      result.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: msg.tool_call_id || '',
            toolName,
            output,
          },
        ],
      })
      continue
    }
  }
  return result
}

// ─── Text generation (no tools, non-streaming) ─────────────────────────────

export async function generateText(
  messages: { role: string; content: string }[],
  system?: string,
  options?: { model?: string },
): Promise<string> {
  const apiKey = getApiKey()
  const google = createGoogleGenerativeAI({ apiKey })
  const modelId = options?.model || TITLE_MODEL
  try {
    const result = await sdkGenerateText({
      model: google(modelId),
      ...(system ? { system } : {}),
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    })
    return result.text || ''
  } catch (e: any) {
    logger.error('agent', `generateText error: ${e.message}`)
    throw e
  }
}

// ─── Main agent loop — AI SDK streamText with manual multi-step ────────────

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
) {
  let fullText = ''
  const fallbackChain = options?.fallbackChain || (getApiTier().tier === 'pro' ? CHAT_MODEL_FALLBACK_PRO : CHAT_MODEL_FALLBACK_FREE)
  
  async function attemptWithModel(modelIndex: number, currentModelMessages: any[]): Promise<{ success: boolean; updatedMessages: any[] }> {
    if (modelIndex >= fallbackChain.length) {
      return { success: false, updatedMessages: currentModelMessages }
    }
    
    const currentModel = fallbackChain[modelIndex]
    logger.info('agent', `attempting with model: ${currentModel} (${modelIndex + 1}/${fallbackChain.length})`)
    
    try {
      const config = getAgentConfig({
        ...options,
        model: currentModel,
        fallbackChain: fallbackChain.slice(modelIndex),
        skipRateLimitCheck: false
      })
      const tools = toolsOverride || config.tools
      const system = systemPromptOverride || config.system
      const maxSteps = config.maxSteps

      // Use the passed-in messages (accumulated from previous attempts or fresh start)
      let modelMessages = currentModelMessages

      let stepCount = 0
      let strippedToolHistory = false
      logger.info(
        'agent',
        `runAgent started with ${currentModel}, maxSteps=${maxSteps}, messages=${modelMessages.length}`,
      )

      while (stepCount < maxSteps) {
        if (abortController?.signal.aborted) {
          logger.info('agent', 'aborted before step')
          onDone(fullText)
          return { success: true, updatedMessages: modelMessages }
        }
        stepCount++
        logger.info('agent', `step ${stepCount}/${maxSteps} — calling streamText with ${currentModel}`, {
          tools: Object.keys(tools).length,
          messages: modelMessages.length,
        })

        let hasToolCalls = false
        let responseMessages: any[] = []

        try {
          const result = streamText({
            model: config.model,
            system,
            messages: modelMessages,
            tools: normalizeTools(tools),
            stopWhen: stepCountIs(1),
            onError: ({ error }) => {
              logger.error('agent', 'streamText error', error)
            },
            providerOptions: {
              google: {
                thinkingConfig: {
                  thinkingLevel: config.thinkingLevel,
                  includeThoughts: true,
                },
              },
            },
            ...(abortController?.signal
              ? { abortSignal: abortController.signal }
              : {}),
          })

          for await (const part of result.fullStream) {
            if (abortController?.signal.aborted) {
              logger.info('agent', 'aborted during stream')
              onDone(fullText)
              return { success: true, updatedMessages: modelMessages }
            }

            switch (part.type) {
              case 'text-delta':
                fullText += part.text
                onChunk(part.text)
                break
              case 'reasoning-delta':
                onReasoning?.(part.text)
                break
              case 'tool-call':
                hasToolCalls = true
                onToolCall(part.toolName, part.input)
                logger.info('agent', `tool-call: ${part.toolName}`, part.input)
                break
              case 'tool-result': {
                const isImageTool = part.toolName === 'inspect_image_url'
                const truncateLimit = SOCIAL_FETCH_TOOLS.has(part.toolName) || isImageTool
                  ? Infinity
                  : 15000
                let outputForUi = part.output
                if (isImageTool && outputForUi?.data) {
                  outputForUi = { ...outputForUi, data: undefined, _note: 'Image sent to model via toModelOutput' }
                }
                const resultStr = JSON.stringify(outputForUi)
                const truncated =
                  resultStr.length > truncateLimit
                    ? resultStr.slice(0, truncateLimit) + '...[truncated]'
                    : outputForUi
                onToolResult(part.toolName, truncated)
                logger.info('agent', `tool-result: ${part.toolName}`)
                break
              }
              case 'error':
                logger.error('agent', 'stream error part', part.error)
                break
            }
          }

          const response = await result.response
          responseMessages = response.messages || []
        } catch (e: any) {
          // Check for rate limit errors
          const errorMessage = e?.message || ''
          const statusCode = e?.statusCode || e?.status
          const errorData = e?.data?.error
          const errorStatus = errorData?.status
          
          // Comprehensive rate limit detection
          const isRateLimit = 
            statusCode === 429 || 
            errorStatus === 'RESOURCE_EXHAUSTED' ||
            errorMessage.includes('quota') || 
            errorMessage.includes('rate limit') ||
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            errorMessage.includes('429') ||
            errorMessage.includes('exceeded your current quota') ||
            (errorData && errorData.message && errorData.message.includes('quota'))
          
          if (isRateLimit) {
            logger.warn('agent', `${currentModel} hit rate limit, trying next model in chain`, { 
              statusCode, 
              errorMessage: errorMessage.substring(0, 200) 
            })
            return { success: false, updatedMessages: modelMessages }
          }
          
          if (!strippedToolHistory && (e.statusCode === 400 || errorData?.status === 'INVALID_ARGUMENT' || e.message?.includes('No output generated'))) {
            strippedToolHistory = true
            logger.warn('agent', '400 INVALID_ARGUMENT — stripping tool history and retrying')
            modelMessages = modelMessages.filter((m: any) => {
              if (m.role === 'tool') return false
              if (m.role === 'assistant' && Array.isArray(m.content)) {
                m.content = m.content.filter((c: any) => c.type !== 'tool-call')
                return m.content.length > 0
              }
              return true
            })
            stepCount--
            continue
          }
          
          // For any other error, also try fallback instead of throwing
          logger.warn('agent', `${currentModel} encountered error, trying next model in chain`, {
            error: errorMessage.substring(0, 200),
            statusCode
          })
          return { success: false, updatedMessages: modelMessages }
        }

        if (responseMessages.length > 0) {
          modelMessages.push(...responseMessages)
        }

        logger.info(
          'agent',
          `step ${stepCount} done — toolCalls=${hasToolCalls}, textLen=${fullText.length}`,
        )

        const injected = drainInjectedMessages?.() ?? []
        if (injected.length > 0) {
          const injectedModelMessages = await toModelMessages(injected)
          modelMessages.push(...injectedModelMessages)
          onInjectedMessages?.(injected)
          logger.info('agent', `injected ${injected.length} message(s) into active run`)
        }

        if (!hasToolCalls && injected.length === 0) {
          logger.info('agent', `done — ${fullText.length} chars total`)
          onDone(fullText)
          return { success: true, updatedMessages: modelMessages }
        }
      }

      logger.warn('agent', `reached max steps (${config?.maxSteps})`)
      onDone(fullText + '\n\n[Reached max tool call steps]')
      return { success: true, updatedMessages: modelMessages }
    } catch (e: any) {
      // Check for rate limit errors at the attempt level
      const errorMessage = e?.message || ''
      const statusCode = e?.statusCode || e?.status
      const errorData = e?.data?.error
      const errorStatus = errorData?.status
      
      // Comprehensive error detection for fallback
      const shouldFallback = 
        statusCode === 429 || 
        errorStatus === 'RESOURCE_EXHAUSTED' ||
        errorMessage.includes('quota') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('429') ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('No output generated') ||
        (errorData && errorData.message && errorData.message.includes('quota'))
      
      if (shouldFallback) {
        logger.warn('agent', `${currentModel} hit error at attempt level, trying next model`, {
          error: errorMessage.substring(0, 200),
          statusCode
        })
        return { success: false, updatedMessages: modelMessages }
      }
      
      if (abortController?.signal.aborted) {
        logger.info('agent', 'aborted by user')
        onDone(fullText)
        return { success: true, updatedMessages: modelMessages }
      }
      
      // For any other error, also try fallback as a last resort
      logger.warn('agent', `${currentModel} encountered unexpected error, trying next model`, {
        error: errorMessage.substring(0, 200)
      })
      return { success: false, updatedMessages: modelMessages }
    }
  }
  
  try {
    // Convert initial messages to model format
    let currentMessages = await toModelMessages(messages)
    
    // Try each model in the fallback chain until one succeeds
    for (let i = 0; i < fallbackChain.length; i++) {
      const { success, updatedMessages } = await attemptWithModel(i, currentMessages)
      if (success) {
        return // Success, exit
      }
      // Failed, use updated messages and try next model
      currentMessages = updatedMessages
      fullText = ''
      logger.info('agent', `model ${fallbackChain[i]} failed, trying next model with ${currentMessages.length} messages`)
    }
    
    // All models failed
    logger.error('agent', 'all models in fallback chain failed')
    onError('All available models failed or hit rate limits. Please try again later or upgrade your API tier.')
  } catch (e: any) {
    logger.error('agent', `unexpected error: ${e.message}`)
    onError(e.message || 'An unexpected error occurred')
  }
}
