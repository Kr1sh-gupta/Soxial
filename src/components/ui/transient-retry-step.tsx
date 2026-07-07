import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  attempt: number
  maxAttempts: number
  backoffMs: number
  model: string
  onExpire: () => void
}

// Renders like a tool-call step (icon + label + inline muted description) with a
// live countdown. Auto-expires (onExpire) when the countdown hits 0 — i.e. when
// the retry actually fires — so the row is removed the moment the retry starts.
export function TransientRetryStep({ attempt, maxAttempts, backoffMs, model, onExpire }: Props) {
  const total = Math.max(1, Math.round(backoffMs / 1000))
  const [secondsLeft, setSecondsLeft] = useState(total)

  useEffect(() => {
    let elapsed = 0
    setSecondsLeft(total)
    const id = setInterval(() => {
      elapsed++
      const left = Math.max(0, total - elapsed)
      setSecondsLeft(left)
      if (left <= 0) {
        clearInterval(id)
        onExpire()
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-foreground fade-in-0 animate-in">
      <RefreshCw className="size-4 shrink-0 animate-spin text-muted-foreground" />
      <div className="truncate flex-1">
        {model}
        <span className="text-muted-foreground/60 ml-2 text-xs">
          high demand — retrying in {secondsLeft}s (attempt {attempt}/{maxAttempts})
        </span>
      </div>
    </div>
  )
}
