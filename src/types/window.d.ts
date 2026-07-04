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
    chatSend: (messages: any[], options?: { model?: string; effort?: string }) => Promise<any>
    chatInject: (content: string) => Promise<any>
    chatStop: () => Promise<any>
    onChatQuestion: (cb: (q: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }) => void) => void
    sendChatAnswer: (id: string, answer: string | string[]) => void
    createSession: () => Promise<number>
    getSessions: () => Promise<any[]>
    getMessages: (sessionId: number) => Promise<any[]>
    addMessage: (sessionId: number, role: string, content: string, reasoning?: string, toolCallsJson?: string, attachmentsJson?: string) => Promise<number>
    updateSessionTitle: (sessionId: number, title: string) => Promise<void>
    deleteSession: (sessionId: number) => Promise<void>
    generateTitle: (sessionId: number, messages: { role: string; content: string }[]) => Promise<void>
    generateSummary: (sessionId: number, messages: { role: string; content: string }[]) => Promise<void>
    getSessionSummary: (sessionId: number) => Promise<string>
    reTitle: (sessionId: number, messages: { role: string; content: string }[]) => Promise<void>
    generateQuickActions: () => Promise<any>
    getMedia: (filename: string) => Promise<any>
    fetchLinkPreview: (url: string) => Promise<any>
    onChatChunk: (cb: (text: string) => void) => void
    onChatToolCall: (cb: (data: { name: string; args: any }) => void) => void
    onChatToolResult: (cb: (data: { name: string; result: any }) => void) => void
    onChatError: (cb: (error: string) => void) => void
    onChatReasoning: (cb: (text: string) => void) => void
    onChatInjected: (cb: (messages: { role: string; content: string | null; attachments?: { name: string; mimeType: string; data: string }[] }[]) => void
    getTier: () => Promise<{ tier: string }>
    getAvailableModels: () => Promise<string[]>
    getDefaultModel: () => Promise<string>
    getModelUsage: (model: string) => Promise<{ usage: { rpm: number; rpd: number }; limits: { rpm: number; rpd: number } }>
    removeAllListeners: (channel: string) => void
  }
}