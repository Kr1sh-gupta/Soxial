import { useState, useEffect } from 'react'
import Onboarding from './components/Onboarding'
import Chat from './components/Chat'

declare global {
  interface Window {
    api: {
      getProfile: () => Promise<any>
      updateProfile: (data: Record<string, any>) => Promise<any>
      dbQuery: (table: string, where?: string, params?: any[]) => Promise<any[]>
      dbInsert: (table: string, data: Record<string, any>) => Promise<any>
      checkCli: (name: 'twitter' | 'rdt') => Promise<boolean>
      installCli: (name: 'twitter' | 'rdt') => Promise<boolean>
      checkCliAuth: (name: 'twitter' | 'rdt') => Promise<any>
      twitterTweet: (tweetId: string, max?: number) => Promise<any>
      redditRead: (postId: string, maxComments?: number) => Promise<any>
      runOnboarding: (profileData: Record<string, any>) => Promise<any>
      resetOnboarding: () => Promise<any>
      onOnboardingChunk: (cb: (text: string) => void) => void
      onOnboardingToolCall: (cb: (data: any) => void) => void
      onOnboardingToolResult: (cb: (data: any) => void) => void
      onOnboardingReasoning: (cb: (text: string) => void) => void
      onOnboardingQuestion: (cb: (payload: { batchId: string; questions: { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }[] }) => void) => void
      sendOnboardingAnswer: (id: string, answers: { id: string; answer: string | string[] }[]) => void
      saveOnboardingConversation: (messages: { role: string; content: string; steps?: any[] }[]) => Promise<number>
      chatSend: (messages: any[], options?: { model?: string; effort?: string }) => Promise<any>
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
      onChatChunk: (cb: (text: string) => void) => void
      onChatToolCall: (cb: (data: any) => void) => void
      onChatToolResult: (cb: (data: any) => void) => void
      onChatError: (cb: (error: string) => void) => void
      onChatReasoning: (cb: (text: string) => void) => void
      onChatInjected: (cb: (messages: { role: string; content: string | null; attachments?: { name: string; mimeType: string; data: string }[] }[]) => void) => void
      removeAllListeners: (channel: string) => void
      getMedia: (filename: string) => Promise<any>
      fetchLinkPreview: (url: string) => Promise<any>
    }
  }
}

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [initialSessionId, setInitialSessionId] = useState<number | null>(null)

  useEffect(() => {
    checkOnboarding()
  }, [])

  function checkOnboarding() {
    window.api.getProfile().then((p) => {
      setOnboardingComplete(p?.onboarding_complete === 1)
    })
  }

  if (onboardingComplete === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground/60 text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {onboardingComplete ? <Chat initialSessionId={initialSessionId} /> : <Onboarding onComplete={(sessionId?: number) => { if (sessionId) setInitialSessionId(sessionId); checkOnboarding() }} />}
    </>
  )
}
