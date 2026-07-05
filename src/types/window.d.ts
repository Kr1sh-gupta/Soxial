interface Window {
  api: {
    getProfile: () => Promise<any>
    updateProfile: (data: Record<string, any>) => Promise<any>
    dbQuery: (table: string, where?: string, params?: any[]) => Promise<any>
    dbInsert: (table: string, data: Record<string, any>) => Promise<any>
    checkCli: (name: 'twitter' | 'rdt') => Promise<any>
    installCli: (name: 'twitter' | 'rdt') => Promise<any>
    checkCliAuth: (name: 'twitter' | 'rdt') => Promise<any>
    twitterTweet: (tweetId: string, max?: number) => Promise<any>
    redditRead: (postId: string, maxComments?: number) => Promise<any>
    runOnboarding: (profileData: Record<string, any>, continueFromMessages?: any[]) => Promise<any>
    resetOnboarding: () => Promise<any>
    onOnboardingChunk: (cb: (text: string) => void) => void
    onOnboardingToolCall: (cb: (data: { name: string, args: any }) => void) => void
    onOnboardingToolResult: (cb: (data: { name: string, result: any }) => void) => void
    onOnboardingReasoning: (cb: (text: string) => void) => void
    onOnboardingQuestion: (cb: (payload: { batchId: string; questions: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }[] }) => void) => void
    sendOnboardingAnswer: (id: string, answers: { id: string; answer: string | string[] }[]) => void
    saveOnboardingConversation: (messages: { role: string; content: string; steps?: any[] }[]) => Promise<number>
    chatSend: (messages: any[], options?: { model?: string; effort?: string }, sessionId?: number) => Promise<any>
    chatInject: (content: string | { content: string; attachments?: { name: string; mimeType: string; data: string }[] }) => Promise<any>
    chatStop: () => Promise<any>
    onChatQuestion: (cb: (q: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }) => void) => void
    sendChatAnswer: (id: string, answer: string | string[]) => void
    createSession: () => Promise<number>
    getSessions: () => Promise<any[]>
    getMessages: (sessionId: number) => Promise<any[]>
    addMessage: (sessionId: number, role: string, content: string, reasoning?: string, toolCallsJson?: string, attachmentsJson?: string) => Promise<number>
    updateSessionTitle: (sessionId: number, title: string) => Promise<any>
    deleteSession: (sessionId: number) => Promise<any>
    generateTitle: (sessionId: number, messages: { role: string; content: string | null }[]) => Promise<any>
    generateSummary: (sessionId: number, messages: { role: string; content: string | null }[]) => Promise<any>
    getSessionSummary: (sessionId: number) => Promise<string | null>
    reTitle: (sessionId: number, messages: { role: string; content: string | null }[]) => Promise<any>
    generateQuickActions: () => Promise<any>
    getMedia: (filename: string) => Promise<any>
    fetchLinkPreview: (url: string) => Promise<any>
    onChatChunk: (cb: (text: string) => void) => void
    onChatToolCall: (cb: (data: { name: string; args: any }) => void) => void
    onChatToolResult: (cb: (data: { name: string; result: any }) => void) => void
    onChatError: (cb: (error: string) => void) => void
    onChatReasoning: (cb: (text: string) => void) => void
    onChatInjected: (cb: (messages: { role: string; content: string | null; attachments?: { name: string; mimeType: string; data: string }[] }[]) => void) => void
    getTier: () => Promise<{ tier: string }>
    getAvailableModels: () => Promise<string[]>
    getDefaultModel: () => Promise<string>
    getApiKeys: () => Promise<Array<{ id: number; name: string; api_key: string; provider: string; tier: string; is_active: number; created_at: string; last_used_at: string | null }>>
    addApiKey: (name: string, apiKey: string) => Promise<number>
    removeApiKey: (id: number) => Promise<void>
    getModelExhaustionStatus: (model: string) => Promise<{ exhausted: boolean; availableAt: string | null }>
    detectApiTier: () => Promise<'free' | 'pro'>
    removeAllListeners: (channel: string) => void
  }
}