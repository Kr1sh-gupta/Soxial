import { useState, useEffect } from 'react'
import Onboarding from './components/Onboarding'
import Chat from './components/Chat'

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
