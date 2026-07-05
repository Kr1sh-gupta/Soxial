import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getProfile: () => ipcRenderer.invoke('db:getProfile'),
  updateProfile: (data: Record<string, any>) => ipcRenderer.invoke('db:updateProfile', data),
  dbQuery: (table: string, where?: string, params?: any[]) => ipcRenderer.invoke('db:query', table, where, params),
  dbInsert: (table: string, data: Record<string, any>) => ipcRenderer.invoke('db:insert', table, data),

  checkCli: (name: 'twitter' | 'rdt') => ipcRenderer.invoke('cli:check', name),
  installCli: (name: 'twitter' | 'rdt') => ipcRenderer.invoke('cli:install', name),
  checkCliAuth: (name: 'twitter' | 'rdt') => ipcRenderer.invoke('cli:checkAuth', name),
  twitterTweet: (tweetId: string, max?: number) => ipcRenderer.invoke('cli:twitterTweet', tweetId, max),
  redditRead: (postId: string, maxComments?: number) => ipcRenderer.invoke('cli:redditRead', postId, maxComments),

  runOnboarding: (profileData: Record<string, any>, continueFromMessages?: any[]) => ipcRenderer.invoke('onboarding:run', profileData, continueFromMessages),
  resetOnboarding: () => ipcRenderer.invoke('onboarding:reset'),
  onOnboardingChunk: (cb: (text: string) => void) => ipcRenderer.on('onboarding:chunk', (_e, text) => cb(text)),
  onOnboardingToolCall: (cb: (data: { name: string, args: any }) => void) => ipcRenderer.on('onboarding:toolCall', (_e, data) => cb(data)),
  onOnboardingToolResult: (cb: (data: { name: string, result: any }) => void) => ipcRenderer.on('onboarding:toolResult', (_e, data) => cb(data)),
  onOnboardingReasoning: (cb: (text: string) => void) => ipcRenderer.on('onboarding:reasoning', (_e, text) => cb(text)),
  onOnboardingQuestion: (cb: (payload: { batchId: string; questions: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }[] }) => void) =>
    ipcRenderer.on('onboarding:question', (_e, payload) => cb(payload)),
  sendOnboardingAnswer: (id: string, answers: { id: string; answer: string | string[] }[]) => ipcRenderer.send('onboarding:answer', { id, answers }),
  saveOnboardingConversation: (messages: { role: string; content: string; steps?: any[] }[]) => ipcRenderer.invoke('onboarding:saveConversation', messages),

  chatSend: (messages: any[], options?: { model?: string; effort?: string }, sessionId?: number) => ipcRenderer.invoke('chat:send', messages, options, sessionId),
  chatInject: (content: string) => ipcRenderer.invoke('chat:inject', content),
  chatStop: () => ipcRenderer.invoke('chat:stop'),
  onChatQuestion: (cb: (q: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }) => void) =>
    ipcRenderer.on('chat:question', (_e, q) => cb(q)),
  sendChatAnswer: (id: string, answer: string | string[]) => ipcRenderer.send('chat:answer', { id, answer }),
  createSession: () => ipcRenderer.invoke('chat:createSession'),
  getSessions: () => ipcRenderer.invoke('chat:getSessions'),
  getMessages: (sessionId: number) => ipcRenderer.invoke('chat:getMessages', sessionId),
  addMessage: (sessionId: number, role: string, content: string, reasoning?: string, toolCallsJson?: string, attachmentsJson?: string) => ipcRenderer.invoke('chat:addMessage', sessionId, role, content, reasoning, toolCallsJson, attachmentsJson),
  updateSessionTitle: (sessionId: number, title: string) => ipcRenderer.invoke('chat:updateTitle', sessionId, title),
  deleteSession: (sessionId: number) => ipcRenderer.invoke('chat:deleteSession', sessionId),
  generateTitle: (sessionId: number, messages: { role: string; content: string }[]) => ipcRenderer.invoke('chat:generateTitle', sessionId, messages),
  generateSummary: (sessionId: number, messages: { role: string; content: string }[]) => ipcRenderer.invoke('chat:generateSummary', sessionId, messages),
  getSessionSummary: (sessionId: number) => ipcRenderer.invoke('chat:getSessionSummary', sessionId),
  reTitle: (sessionId: number, messages: { role: string; content: string }[]) => ipcRenderer.invoke('chat:reTitle', sessionId, messages),
  generateQuickActions: () => ipcRenderer.invoke('chat:generateQuickActions'),
  getMedia: (filename: string) => ipcRenderer.invoke('get:media', filename),
  fetchLinkPreview: (url: string) => ipcRenderer.invoke('link:preview', url),
  onChatChunk: (cb: (text: string) => void) => ipcRenderer.on('chat:chunk', (_e, text) => cb(text)),
  onChatToolCall: (cb: (data: { name: string, args: any }) => void) => ipcRenderer.on('chat:toolCall', (_e, data) => cb(data)),
  onChatToolResult: (cb: (data: { name: string, result: any }) => void) => ipcRenderer.on('chat:toolResult', (_e, data) => cb(data)),
  onChatError: (cb: (error: string) => void) => ipcRenderer.on('chat:error', (_e, error) => cb(error)),
  onChatReasoning: (cb: (text: string) => void) => ipcRenderer.on('chat:reasoning', (_e, text) => cb(text)),
  onChatInjected: (cb: (messages: { role: string; content: string | null; attachments?: { name: string; mimeType: string; data: string }[] }[]) => void) => ipcRenderer.on('chat:injected', (_e, messages) => cb(messages)),

  getTier: () => ipcRenderer.invoke('api:getTier'),
  getAvailableModels: () => ipcRenderer.invoke('api:getAvailableModels'),
  getDefaultModel: () => ipcRenderer.invoke('api:getDefaultModel'),
  getApiKeys: () => ipcRenderer.invoke('api:getApiKeys'),
  addApiKey: (name: string, apiKey: string) => ipcRenderer.invoke('api:addApiKey', name, apiKey),
  removeApiKey: (id: number) => ipcRenderer.invoke('api:removeApiKey', id),
  getModelExhaustionStatus: (model: string) => ipcRenderer.invoke('api:getModelExhaustionStatus', model),
  detectApiTier: () => ipcRenderer.invoke('api:detectTier'),

  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
