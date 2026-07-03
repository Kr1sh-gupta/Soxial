import { app, BrowserWindow, ipcMain, shell, protocol, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { config } from 'dotenv'
config()
import { getDb, getProfile, updateProfile, queryAll, insertRow, createChatSession, getChatSessions, getChatMessages, addChatMessage, updateChatSessionTitle, getChatSessionContextSummary, updateChatSessionContextSummary, deleteChatSession, getQuickActions, setQuickActions, getQuickActionsContext } from './db'
import { ensureCliInstalled, ensureRdtAuth, ensureTwitterAuth, checkCli, checkCliAuth, runCli } from './cli'
import { gatherOnboardingSocialData } from './social-content'
import { runAgent, generateText, ONBOARDING_SYSTEM_PROMPT, createOnboardingTools, installOnboardingAnswerListener, clearPendingQuestions, createChatTools, installChatAnswerListener, clearPendingChatQuestions } from './agent'
import { logger } from './log'

type Message = { role: string; content: string | null; parts?: any[]; tool_call_id?: string; tool_calls?: any[]; attachments_json?: string | null }

// Fedora 44 / Wayland fixes — must be before app.whenReady
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations')
app.setName('Soxial')
if (process.platform === 'win32') app.setAppUserModelId('com.soxial.desktop')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'twimg',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function getIconPath() {
  const candidates = [
    join(process.resourcesPath, 'icons/icon.png'),
    join(app.getAppPath(), 'resources/icons/icon.png'),
    join(app.getAppPath(), 'src/assets/logo.png'),
  ]
  return candidates.find((path) => existsSync(path)) ?? candidates[0]
}

function getTrayIconPath() {
  const candidates = [
    join(process.resourcesPath, 'icons/tray.png'),
    join(app.getAppPath(), 'resources/icons/tray.png'),
    getIconPath(),
  ]
  return candidates.find((path) => existsSync(path)) ?? candidates[0]
}

function syncMacDockIcon() {
  if (process.platform !== 'darwin') return
  const dock = app.dock
  if (!dock) return
  const dockIcon = nativeImage.createFromPath(getIconPath())
  if (!dockIcon.isEmpty()) dock.setIcon(dockIcon)
}

function setupTray() {
  const icon = nativeImage.createFromPath(getTrayIconPath())
  if (icon.isEmpty()) return

  if (tray) {
    tray.destroy()
    tray = null
  }

  tray = new Tray(icon)
  tray.setToolTip('Soxial')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open Soxial',
      click: () => {
        if (!mainWindow) return
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]))

  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })
}

function createWindow() {
  logger.info('main', 'creating window')
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    title: 'Soxial',
    icon: getIconPath(),
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  logger.info('main', 'app ready — initializing')

  // ponytail: Twitter video CDN 403s requests with non-Twitter Referer.
  // Custom protocol proxies through Node.js fetch (no Referer restriction).
  protocol.handle('twimg', async (request) => {
    const actualUrl = request.url.replace(/^twimg:\/\//, 'https://')
    const range = request.headers.get('range')
    const res = await fetch(actualUrl, {
      headers: {
        'Referer': 'https://x.com/',
        'Origin': 'https://x.com',
        ...(range ? { Range: range } : {}),
      }
    })
    const headers = new Headers()
    for (const name of ['accept-ranges', 'content-length', 'content-range', 'content-type']) {
      const value = res.headers.get(name)
      if (value) headers.set(name, value)
    }
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream')
    headers.set('Access-Control-Allow-Origin', '*')
    return new Response(res.body, { status: res.status, headers })
  })

  getDb()
  installOnboardingAnswerListener()
  installChatAnswerListener()
  setupIpc()
  syncMacDockIcon()
  if (process.platform !== 'darwin') setupTray()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function setupIpc() {
  logger.info('main', 'registering IPC handlers')

  ipcMain.handle('db:getProfile', () => {
    const p = getProfile()
    logger.debug('main', 'db:getProfile', { id: p?.id, name: p?.name })
    return p
  })

  ipcMain.handle('db:updateProfile', (_e, data) => {
    logger.info('main', 'db:updateProfile', Object.keys(data))
    return updateProfile(data)
  })

  ipcMain.handle('db:query', (_e, table: string, where?: string, params?: any[]) => {
    logger.debug('main', `db:query ${table}`, { where, params })
    return queryAll(table, where, params)
  })

  ipcMain.handle('db:insert', (_e, table: string, data: Record<string, any>) => {
    logger.debug('main', `db:insert ${table}`, Object.keys(data))
    return insertRow(table, data)
  })

  ipcMain.handle('cli:check', (_e, name: 'twitter' | 'rdt') => checkCli(name))

  ipcMain.handle('cli:install', (_e, name: 'twitter' | 'rdt') => ensureCliInstalled(name))

  ipcMain.handle('cli:checkAuth', async (_e, name: 'twitter' | 'rdt') => {
    logger.info('main', `cli:checkAuth ${name}`)
    const result = await checkCliAuth(name)
    logger.info('main', `cli:checkAuth ${name} result`, { ok: result.ok, error: result.error })
    return result
  })

  ipcMain.handle('cli:twitterTweet', async (_e, tweetId: string, max?: number) => {
    logger.info('main', `cli:twitterTweet ${tweetId}`)
    const args = ['tweet', tweetId, '--json']
    if (max) args.push('-n', String(max))
    return runCli('twitter', args)
  })

  ipcMain.handle('cli:redditRead', async (_e, postId: string, maxComments?: number) => {
    logger.info('main', `cli:redditRead ${postId}`)
    const args = ['read', postId, '--json']
    if (maxComments) args.push('-n', String(maxComments))
    return runCli('rdt', args)
  })

  ipcMain.handle('onboarding:run', async (_e, profileData: Record<string, any>) => {
    logger.info('main', 'onboarding:run started', Object.keys(profileData))
    updateProfile(profileData)
    const profile = getProfile()
    clearPendingQuestions()

    const sendChunk = (text: string) => mainWindow?.webContents.send('onboarding:chunk', text)
    const sendToolCall = (name: string, args: any) => mainWindow?.webContents.send('onboarding:toolCall', { name, args })
    const sendToolResult = (name: string, result: any) => mainWindow?.webContents.send('onboarding:toolResult', { name, result })
    const sendQuestions = (payload: { batchId: string; questions: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }[] }) =>
      mainWindow?.webContents.send('onboarding:question', payload)

    // ─── Phase 1: Auto-gather data ───────────────────────────────────────────
    // Allow UI to render before starting heavy work
    await new Promise(resolve => setTimeout(resolve, 10))
    sendChunk('PHASE:gather')
    
    // Install CLIs and send tool calls immediately
    sendToolCall('install_twitter_cli', {})
    sendToolCall('install_rdt_cli', {})
    
    // Install CLIs and wait for completion
    let rdtAuthResult: Awaited<ReturnType<typeof ensureRdtAuth>> | undefined
    let twitterAuthResult: Awaited<ReturnType<typeof ensureTwitterAuth>> | undefined
    try {
      await Promise.all([ensureCliInstalled('twitter'), ensureCliInstalled('rdt')])
      sendToolResult('install_twitter_cli', { ok: true })
      sendToolResult('install_rdt_cli', { ok: true })

      if (profile?.twitter_handle) {
        sendToolCall('twitter_status', {})
        twitterAuthResult = await ensureTwitterAuth()
        sendToolResult('twitter_status', twitterAuthResult)
      }

      if (profile?.reddit_username) {
        sendToolCall('rdt_login', {})
        rdtAuthResult = await ensureRdtAuth()
        sendToolResult('rdt_login', rdtAuthResult)
      }
    } catch (err) {
      logger.error('main', 'CLI installation failed', err)
      sendToolResult('install_twitter_cli', { ok: false, error: (err as Error).message })
      sendToolResult('install_rdt_cli', { ok: false, error: (err as Error).message })
    }

    const profileSafe = (({ zai_api_key, gemini_api_key, openai_api_key, puter_token, ...rest }) => rest)(profile || {})
    const gathered: Record<string, any> = { profile: profileSafe }

    if (rdtAuthResult) gathered.rdt_login = rdtAuthResult
    if (twitterAuthResult) gathered.twitter_status = twitterAuthResult

    const socialData = await gatherOnboardingSocialData(profile || {}, {
      onToolCall: sendToolCall,
      onToolResult: sendToolResult,
    })
    Object.assign(gathered, socialData)

    const db = getDb()
    gathered.algorithm_rules = db.prepare('SELECT * FROM algorithm_rules').all()
    gathered.voice_rules = db.prepare('SELECT * FROM voice_rules').all()
    gathered.hooks = db.prepare('SELECT * FROM hooks ORDER BY rank ASC').all()
    gathered.content_pillars = db.prepare('SELECT * FROM content_pillars').all()

    // ─── Phase 2: Interactive AI onboarding ──────────────────────────────────
    sendChunk('PHASE:interview')

    const compacted = compactGatheredData(gathered)
    const snippets: string[] = ['=== AUTO-GATHERED DATA ===\nAnalyze this data, then ask ALL your interview questions in a single ask_user_questions tool call.\n']
    for (const [key, val] of Object.entries(compacted)) {
      snippets.push(`--- ${key} ---\n${JSON.stringify(val, null, 2)}`)
    }
    snippets.push(`\nIMPORTANT: The user already told you their name is "${profile?.name || 'unknown'}", X handle is "${profile?.twitter_handle || 'not set'}", Reddit is "u/${profile?.reddit_username || 'not set'}". DO NOT re-ask these. Call ask_user_questions ONCE with all questions you genuinely need, then build their full strategy profile using bulk save tools.`)

    const onboardingTools = createOnboardingTools(sendQuestions)
    const messages: { role: string; content: string | null; tool_call_id?: string; tool_calls?: any[] }[] = [
      { role: 'user', content: snippets.join('\n\n') }
    ]

    const msgSize = snippets.join('\n\n').length
    logger.info('main', `starting interactive onboarding agent (message size: ${(msgSize / 1024).toFixed(1)}KB)`)
    const result = await new Promise<{ text: string; error?: string }>((resolve) => {
      runAgent(
        messages,
        (chunk) => sendChunk(chunk),
        (name, args) => sendToolCall(name, args),
        (name, result) => sendToolResult(name, result),
        (text) => resolve({ text }),
        (error) => resolve({ text: '', error }),
        (text) => mainWindow?.webContents.send('onboarding:reasoning', text),
        { maxSteps: 60 },
        onboardingTools,
        ONBOARDING_SYSTEM_PROMPT
      )
    })

    if (result.error) {
      logger.error('main', `onboarding failed: ${result.error}`)
      return { success: false, error: result.error }
    }

    logger.info('main', `onboarding complete (${result.text.length} chars)`)
    updateProfile({ onboarding_complete: 1 })
    generateQuickActions().catch(() => {})
    return { success: true, summary: result.text }
  })


  ipcMain.handle('onboarding:reset', async () => {
    logger.info('main', 'onboarding:reset')
    updateProfile({ onboarding_complete: 0 })
    return { success: true }
  })

  ipcMain.handle('onboarding:saveConversation', async (_e, messages: { role: string; content: string; steps?: any[] }[]) => {
    const sessionId = Number(createChatSession('Onboarding'))
    for (const msg of messages) {
      const stepsJson = msg.steps?.length ? JSON.stringify(msg.steps) : undefined
      addChatMessage(sessionId, msg.role, msg.content, stepsJson)
    }
    logger.info('main', `onboarding conversation saved to session ${sessionId} (${messages.length} messages)`)
    return sessionId
  })

  let chatAbortController: AbortController | null = null
  let chatInjectedMessages: Message[] = []

  ipcMain.handle('chat:send', async (_e, messages: Message[], options?: { model?: string; effort?: string }) => {
    logger.info('main', `chat:send — ${messages.length} messages`, options)

    chatAbortController = new AbortController()
    chatInjectedMessages = []
    clearPendingChatQuestions()
    const chunks: string[] = []

    const sendChatQuestion = (q: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }) =>
      mainWindow?.webContents.send('chat:question', q)
    const chatTools = createChatTools(sendChatQuestion)

    await new Promise<void>((resolve) => {
      runAgent(
        messages,
        (chunk) => {
          chunks.push(chunk)
          mainWindow?.webContents.send('chat:chunk', chunk)
        },
        (name, args) => { if (name !== 'ask_user') mainWindow?.webContents.send('chat:toolCall', { name, args }) },
        (name, result) => { if (name !== 'ask_user') mainWindow?.webContents.send('chat:toolResult', { name, result }) },
        () => resolve(),
        (error) => {
          mainWindow?.webContents.send('chat:error', error)
          resolve()
        },
        (text) => mainWindow?.webContents.send('chat:reasoning', text),
        options,
        chatTools,
        undefined,
        chatAbortController ?? undefined,
        () => {
          const injected = chatInjectedMessages
          chatInjectedMessages = []
          return injected
        },
        (injected) => {
          chunks.length = 0
          mainWindow?.webContents.send('chat:injected', injected)
        }
      )
    })

    chatAbortController = null
    chatInjectedMessages = []
    logger.info('main', `chat:send done — ${chunks.join('').length} chars`)
    return { fullText: chunks.join('') }
  })

  ipcMain.handle('chat:inject', async (_e, payload: string | { content: string; attachments?: { name: string; mimeType: string; data: string }[] }) => {
    const content = typeof payload === 'string' ? payload : payload.content
    const attachments = typeof payload === 'string' ? [] : payload.attachments || []
    const trimmed = content.trim()
    if (!trimmed && attachments.length === 0) return { success: false, error: 'empty' }
    if (!chatAbortController || chatAbortController.signal.aborted) {
      return { success: false, error: 'no active chat run' }
    }
    chatInjectedMessages.push({
      role: 'user',
      content: trimmed,
      parts: attachments.length
        ? [
            ...(trimmed ? [{ text: trimmed }] : []),
            ...attachments.map((att) => ({
              inlineData: {
                mimeType: att.mimeType || 'image/png',
                data: att.data,
              },
            })),
          ]
        : undefined,
    })
    logger.info('main', `chat:inject queued (${trimmed.length} chars, ${attachments.length} attachment(s))`)
    return { success: true }
  })

  ipcMain.handle('chat:stop', async () => {
    logger.info('main', 'chat:stop')
    chatAbortController?.abort()
    return { success: true }
  })

  ipcMain.handle('chat:createSession', () => {
    return createChatSession()
  })

  ipcMain.handle('chat:getSessions', () => {
    return getChatSessions()
  })

  ipcMain.handle('chat:getMessages', (_e, sessionId: number) => {
    return getChatMessages(sessionId)
  })

  ipcMain.handle('chat:addMessage', (_e, sessionId: number, role: string, content: string, reasoning?: string, toolCallsJson?: string, attachmentsJson?: string) => {
    return addChatMessage(sessionId, role, content, reasoning, toolCallsJson, attachmentsJson)
  })

  ipcMain.handle('get:media', (_e, filename: string) => {
    const mediaDir = join(app.getPath('userData'), 'media')
    const filePath = join(mediaDir, filename)
    try {
      const data = readFileSync(filePath)
      return { success: true, data: data.toString('base64'), mime: 'image/png' }
    } catch {
      return { success: false, error: 'File not found' }
    }
  })

  ipcMain.handle('link:preview', async (_e, url: string) => {
    if (!/^https?:\/\//i.test(url)) return { success: false, error: 'Invalid URL' }
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      })
      const html = await res.text()
      const pick = (...patterns: RegExp[]) => {
        for (const pattern of patterns) {
          const m = html.match(pattern)
          if (m?.[1]) return m[1].trim()
        }
        return ''
      }
      const decode = (value: string) => value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')

      const title = decode(pick(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i
      ))
      const description = decode(pick(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
      ))
      const image = decode(pick(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
      ))
      return { success: true, data: { url, title, description, image } }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to fetch preview' }
    }
  })

  ipcMain.handle('chat:updateTitle', (_e, sessionId: number, title: string) => {
    updateChatSessionTitle(sessionId, title)
    return { success: true }
  })

  ipcMain.handle('chat:deleteSession', (_e, sessionId: number) => {
    deleteChatSession(sessionId)
    return { success: true }
  })

  ipcMain.handle('chat:generateTitle', async (_e, sessionId: number, messages: { role: string; content: string }[]) => {
    logger.info('main', 'chat:generateTitle')
    try {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 3000)
      const title = await generateText([
        { role: 'user', content: `Generate a brief (under 6 words) title for this conversation:\n\n${text}` }
      ], 'You generate concise conversation titles. Return only the title, no explanation, no quotes.')
      const clean = title.replace(/["'"]/g, '').trim().slice(0, 60)
      updateChatSessionTitle(sessionId, clean || 'New Chat')
      return { success: true, title: clean }
    } catch (e: any) {
      logger.error('main', 'chat:generateTitle error', e.message)
      return { success: false, title: null }
    }
  })

  ipcMain.handle('chat:generateSummary', async (_e, sessionId: number, messages: { role: string; content: string }[]) => {
    logger.info('main', 'chat:generateSummary')
    try {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n').slice(-8000)
      const summary = await generateText([
        { role: 'user', content: `Summarize the key points and decisions from this conversation:\n\n${text}` }
      ], 'You generate concise conversation summaries. Capture key decisions, context, and goals. 2-4 sentences.')
      updateChatSessionContextSummary(sessionId, summary)
      return { success: true, summary }
    } catch (e: any) {
      logger.error('main', 'chat:generateSummary error', e.message)
      return { success: false, summary: null }
    }
  })

  ipcMain.handle('chat:getSessionSummary', (_e, sessionId: number) => {
    return getChatSessionContextSummary(sessionId)
  })

  ipcMain.handle('chat:reTitle', async (_e, sessionId: number, messages: { role: string; content: string }[]) => {
    logger.info('main', 'chat:reTitle')
    try {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n').slice(-4000)
      const title = await generateText([
        { role: 'user', content: `Generate a brief (under 6 words) title capturing the current topic of this conversation:\n\n${text}` }
      ], 'You generate concise conversation titles. Return only the title, no explanation, no quotes.')
      const clean = title.replace(/["'"]/g, '').trim().slice(0, 60)
      if (clean) updateChatSessionTitle(sessionId, clean)
      return { success: true, title: clean }
    } catch (e: any) {
      logger.error('main', 'chat:reTitle error', e.message)
      return { success: false }
    }
  })

  ipcMain.handle('chat:generateQuickActions', async () => {
    try {
      const suggestions = await generateQuickActions()
      return { success: true, suggestions }
    } catch {
      const cached = getQuickActions()
      if (cached) return { success: true, suggestions: cached.suggestions }
      return { success: false, suggestions: FALLBACK_ACTIONS }
    }
  })
}

const FALLBACK_ACTIONS = [
  'Analyze my X profile and suggest improvements',
  'Find trending topics in my niche on Reddit',
  'Create a content strategy for this week',
  'Draft a high-engagement tweet thread',
  'Review and optimize my reply voice'
]

async function generateQuickActions(): Promise<string[]> {
  const cached = getQuickActions()
  if (cached) {
    const ageHours = (Date.now() - new Date(cached.generated_at + 'Z').getTime()) / 3600000
    if (ageHours < 24) {
      logger.info('main', `returning cached quick actions (${ageHours.toFixed(1)}h old)`)
      return cached.suggestions
    }
    logger.info('main', `cached quick actions expired (${ageHours.toFixed(1)}h)`)
  }

  const context = getQuickActionsContext()
  const text = await generateText([
    { role: 'user', content: `Based on this profile and strategy context, suggest 5 specific, actionable things the user could ask their social media AI agent to do right now. Each suggestion must be a single concise sentence under 10 words. Return them as a JSON array of strings, no markdown, no numbering.\n\nContext:\n${context}` }
  ], 'You generate personalized quick-action suggestions for a social media AI agent app.')
  let suggestions: string[]
  try {
    const parsed = JSON.parse(text)
    suggestions = Array.isArray(parsed) ? parsed.slice(0, 5) : FALLBACK_ACTIONS
  } catch {
    suggestions = FALLBACK_ACTIONS
  }
  setQuickActions(suggestions)
  logger.info('main', 'quick actions generated')
  return suggestions
}

function extractItems(val: any): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (Array.isArray(val.data)) return val.data
  if (val.data?.children && Array.isArray(val.data.children)) return val.data.children.map((c: any) => c.data ?? c)
  if (val.data?.data && Array.isArray(val.data.data)) return val.data.data
  return []
}

function compactGatheredData(gathered: Record<string, any>): Record<string, any> {
  const compacted: Record<string, any> = {}
  let rawSize = 0, compactSize = 0

  for (const [key, val] of Object.entries(gathered)) {
    const valStr = JSON.stringify(val)
    rawSize += valStr.length

    if (!val) { compacted[key] = val; continue }

    if (key === 'twitter_user_posts' || key === 'twitter_replies') {
      const items = extractItems(val)
      const compact = items.slice(0, 30).map((t: any) => ({
        text: (t.text || '').slice(0, 280),
        author: typeof t.author === 'string' ? t.author : t.author?.screenName,
        likes: t.metrics?.likes ?? t.likes ?? 0,
        retweets: t.metrics?.retweets ?? t.rts ?? 0,
        replies: t.metrics?.replies ?? t.replies ?? 0,
        bookmarks: t.metrics?.bookmarks ?? t.bookmarks ?? 0,
        createdAt: t.createdAtISO || t.createdAt || t.time,
      }))
      compacted[key] = { ok: val.ok ?? true, data: compact, totalCount: items.length }
    }
    else if (key === 'twitter_following') {
      const items = extractItems(val)
      const compact = items.slice(0, 50).map((u: any) => ({
        screenName: u.screenName || u.username,
        name: u.name,
        followers: u.followersCount || u.followers_count,
        description: (u.description || '').slice(0, 150),
        verified: u.verified,
      }))
      compacted[key] = { ok: val.ok ?? true, data: compact }
    }
    else if (key === 'twitter_likes' || key === 'twitter_bookmarks') {
      const items = extractItems(val)
      const compact = items.slice(0, 20).map((t: any) => ({
        text: (t.text || '').slice(0, 280),
        author: t.author?.screenName,
        likes: t.metrics?.likes || 0,
      }))
      compacted[key] = { ok: val.ok ?? true, data: compact }
    }
    else if (key === 'rdt_user_posts' || key === 'rdt_feed') {
      const items = extractItems(val)
      const compact = items.slice(0, 25).map((p: any) => ({
        title: p.title,
        subreddit: p.subreddit,
        author: p.author,
        score: p.score,
        numComments: p.num_comments,
        selftext: (p.selftext || '').slice(0, 200),
      }))
      compacted[key] = { ok: val.ok ?? true, data: compact, totalCount: items.length }
    }
    else if (key === 'rdt_user_comments') {
      const items = extractItems(val)
      const compact = items.slice(0, 30).map((c: any) => ({
        body: (c.body || '').slice(0, 300),
        subreddit: c.subreddit,
        score: c.score ?? c.ups,
        linkTitle: c.link_title,
      }))
      compacted[key] = { ok: val.ok ?? true, data: compact, totalCount: items.length }
    }
    else if (key === 'twitter_whoami' || key === 'twitter_user') {
      const d = val.data || val
      compacted[key] = {
        ok: val.ok ?? true,
        data: {
          screenName: d.screenName || d.username || d.user?.screenName,
          name: d.name || d.user?.name,
          followersCount: d.followersCount || d.followers_count || d.user?.followersCount,
          followingCount: d.followingCount || d.friends_count || d.user?.followingCount,
          statusesCount: d.statusesCount || d.statuses_count || d.user?.statusesCount,
          description: (d.description || d.user?.description || '').slice(0, 300),
          verified: d.verified || d.user?.verified,
          createdAt: d.createdAt || d.created_at,
        }
      }
    }
    else {
      compacted[key] = val
    }

    compactSize += JSON.stringify(compacted[key]).length
  }

  logger.info('main', `gathered data compacted: ${(rawSize / 1024).toFixed(1)}KB → ${(compactSize / 1024).toFixed(1)}KB`)
  return compacted
}
