import { useState, useEffect, useRef } from 'react'
import { Check, Sparkles, ArrowRight, RefreshCw, ShieldAlert, Search as SearchIcon, Globe as GlobeIcon, Image as ImageIcon, AtSign, List, Eye, Send, CornerUpLeft, Newspaper, Heart, Repeat2, Bookmark, UserPlus, Info, Layers, BookOpen, MessageCircle, BadgeCheck, Flame, ThumbsUp, Database, Lightbulb, ShieldCheck, Gauge, Crosshair, SquarePen, RotateCcw, CalendarClock, Save, Download, Briefcase, Users, Package, Target, FileText, Trash2, TrendingUp, MessageSquare, Plus, Clock } from 'lucide-react'
import { Message, MessageContent } from 'src/components/ai-elements/message'
import { ChainOfThoughtStep } from 'src/components/ai-elements/chain-of-thought'
import {
  Conversation, ConversationContent, ConversationScrollButton
} from 'src/components/ai-elements/conversation'
import { RichContent } from 'src/components/rich-content'
import { Reasoning, ReasoningTrigger, ReasoningContent } from 'src/components/ai-elements/reasoning'
import { QuestionInput, QuestionData } from 'src/components/ui/question-input'
import { AppLogo } from 'src/components/ui/app-logo'

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

const GOALS = ['Client acquisition', 'Job hunting', 'Audience building', 'Thought leadership', 'Product promotion', 'Community building']

const GOAL_ICONS: Record<string, any> = {
  'Client acquisition': Briefcase,
  'Job hunting': SearchIcon,
  'Audience building': Users,
  'Thought leadership': Lightbulb,
  'Product promotion': Package,
  'Community building': Heart,
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function RedditLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.07 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z" />
    </svg>
  )
}

function BackgroundGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div
        className="absolute top-[-15%] left-[25%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 65%)', opacity: 0.04 }}
      />
      <div
        className="absolute bottom-[-10%] right-[12%] w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)', opacity: 0.03 }}
      />
    </div>
  )
}

export default function Onboarding({ onComplete }: { onComplete: (sessionId?: number) => void }) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    timezone: '',
    niche: '',
    superpower: '',
    primary_goal: '',
    voice_description: '',
    gemini_api_key: '',
    twitter_handle: '',
    reddit_username: '',
    target_audience: ''
  })

  const update = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }))

  return (
    <div className="flex h-full min-h-screen bg-background">
      <BackgroundGlow />

      <div className={`flex-1 flex flex-col ${step === 4 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div
          key={step}
          className={step === 4
            ? "flex-1 flex flex-col h-full relative overflow-hidden"
            : "max-w-xl mx-auto px-8 py-20 w-full animate-in fade-in slide-in-from-bottom-3 duration-700"
          }
          style={step !== 4 ? { animationTimingFunction: EASE } : undefined}
        >
          {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
          {step === 1 && <StepIdentity formData={formData} update={update} onNext={() => setStep(2)} />}
          {step === 2 && <StepApiKey formData={formData} update={update} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && <StepPlatforms formData={formData} update={update} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
          {step === 4 && <StepAiOnboarding formData={formData} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', hint }: any) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-muted-foreground mb-2 tracking-tight">{label}</label>
      <div
        className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 focus-within:ring-white/[0.15] focus-within:bg-white/[0.035]"
        style={{ transitionTimingFunction: EASE }}
      >
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
        />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground/50">{hint}</p>}
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, hint }: any) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-muted-foreground mb-2 tracking-tight">{label}</label>
      <div
        className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 focus-within:ring-white/[0.15] focus-within:bg-white/[0.035]"
        style={{ transitionTimingFunction: EASE }}
      >
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none"
        />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground/50">{hint}</p>}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled, className = '' }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center justify-center gap-3 rounded-full text-sm font-semibold disabled:opacity-25 disabled:cursor-not-allowed
      transition-all duration-500 active:scale-[0.98] hover:opacity-90 ${className}`}
      style={{ transitionTimingFunction: EASE }}
    >
      <span>{children}</span>
      <span
        className="w-7 h-7 rounded-full bg-current/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5"
        style={{ transitionTimingFunction: EASE }}
      >
        <ArrowRight className="size-3.5" />
      </span>
    </button>
  )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="mb-6">
        <AppLogo 
          showLabel={false} 
          iconClassName="size-16"
        />
      </div>
      <h1 className="text-[32px] font-semibold text-foreground tracking-tight leading-tight max-w-md">
        Hi, I&rsquo;m Soxial
      </h1>
      <p className="text-muted-foreground text-[15px] leading-relaxed mt-3 max-w-sm">
        A personal social media manager that studies your voice, audience, and current standing, then builds a growth system you approve before anything goes public.
      </p>

      <div className="flex items-center gap-8 mt-10 text-[13px] text-muted-foreground/60">
        <div className="flex items-center gap-2">
          <XLogo className="size-4" />
          <span>X / Twitter</span>
        </div>
        <div className="flex items-center gap-2">
          <RedditLogo className="size-4" />
          <span>Reddit</span>
        </div>
      </div>

      <PrimaryButton onClick={onNext} className="mt-10 bg-foreground text-background py-3.5 px-8">
        Get Started
      </PrimaryButton>

      <p className="text-[11px] text-muted-foreground/30 mt-6 leading-relaxed max-w-xs">
        One-time setup. Takes about 5 minutes. You&rsquo;ll answer a few questions and the AI builds your strategy.
      </p>
    </div>
  )
}

function StepIdentity({ formData, update, onNext }: any) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight">Tell me about you</h1>
        <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">Basic info to personalize your strategy.</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Input label="Name" value={formData.name} onChange={(v: string) => update('name', v)} placeholder="Jane Doe" />
        <Input label="Timezone" value={formData.timezone} onChange={(v: string) => update('timezone', v)} placeholder="UTC+1" />
      </div>
      <Input label="What do you do?" value={formData.niche} onChange={(v: string) => update('niche', v)} placeholder="e.g., Frontend developer specializing in motion UI" />
      <Input label="What makes you different?" value={formData.superpower} onChange={(v: string) => update('superpower', v)} placeholder="e.g., I combine design sense with deep technical knowledge" />

      <div>
        <label className="block text-[13px] font-medium text-muted-foreground mb-2.5 tracking-tight">Primary goal</label>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(g => {
            const Icon = GOAL_ICONS[g] || Target
            const selected = formData.primary_goal === g
            return (
              <button
                key={g}
                onClick={() => update('primary_goal', g)}
                className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl ring-1
                  transition-all duration-500 active:scale-[0.98] ${selected
                    ? 'bg-accent/10 ring-accent/30 text-foreground'
                    : 'bg-white/[0.02] ring-white/[0.06] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground hover:ring-white/[0.1]'}`}
                style={{ transitionTimingFunction: EASE }}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500
                  ${selected ? 'bg-accent/20 text-accent' : 'bg-white/[0.04] text-muted-foreground group-hover:text-foreground'}`}
                  style={{ transitionTimingFunction: EASE }}
                >
                  <Icon strokeWidth={1.5} className="size-4" />
                </div>
                <span className="text-[13px] font-medium tracking-tight">{g}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Textarea label="Describe your voice" value={formData.voice_description} onChange={(v: string) => update('voice_description', v)} placeholder="e.g., Casual but technical. I explain complex things simply." />

      <PrimaryButton onClick={onNext} disabled={!formData.name || !formData.niche} className="w-full bg-foreground text-background py-3.5">
        Continue
      </PrimaryButton>
    </div>
  )
}

function StepPlatforms({ formData, update, onBack, onNext }: any) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight">Connect your platforms</h1>
        <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">Enter your handles. The AI will investigate these during onboarding.</p>
      </div>

      {/* Twitter field with brand icon */}
      <div>
        <label className="block text-[13px] font-medium text-muted-foreground mb-2 tracking-tight">X / Twitter handle</label>
        <div
          className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 focus-within:ring-white/[0.15] focus-within:bg-white/[0.035] flex items-center"
          style={{ transitionTimingFunction: EASE }}
        >
          <div className="pl-4 pr-2 py-3 flex items-center gap-2.5">
            <XLogo className="size-4 text-muted-foreground/60" />
            <span className="text-sm text-muted-foreground/40">{'@'}</span>
          </div>
          <input
            value={formData.twitter_handle || ''}
            onChange={(e) => update('twitter_handle', e.target.value.replace('@', ''))}
            placeholder="yourhandle"
            className="w-full bg-transparent pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </div>
      </div>

      {/* Reddit field with brand icon */}
      <div>
        <label className="block text-[13px] font-medium text-muted-foreground mb-2 tracking-tight">Reddit username</label>
        <div
          className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 focus-within:ring-white/[0.15] focus-within:bg-white/[0.035] flex items-center"
          style={{ transitionTimingFunction: EASE }}
        >
          <div className="pl-4 pr-2 py-3 flex items-center gap-2.5">
            <RedditLogo className="size-4 text-muted-foreground/60" />
            <span className="text-sm text-muted-foreground/40">{'u/'}</span>
          </div>
          <input
            value={formData.reddit_username || ''}
            onChange={(e) => update('reddit_username', e.target.value)}
            placeholder="yourusername"
            className="w-full bg-transparent pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </div>
      </div>

      <Input label="Target audience" value={formData.target_audience} onChange={(v: string) => update('target_audience', v)} placeholder="e.g., Startup founders, indie developers" />

      <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50 leading-relaxed">
        <Check className="size-3.5 text-muted-foreground/40 shrink-0" strokeWidth={2} />
        <span>Make sure you're logged into x.com and reddit.com in your browser.</span>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-sm text-muted-foreground hover:text-foreground transition-all duration-500 active:scale-[0.98]"
          style={{ transitionTimingFunction: EASE }}
        >
          Back
        </button>
        <PrimaryButton onClick={onNext} disabled={!formData.twitter_handle && !formData.reddit_username} className="flex-1 bg-foreground text-background py-3.5">
          Start AI Onboarding
        </PrimaryButton>
      </div>
    </div>
  )
}

function StepApiKey({ formData, update, onBack, onNext }: any) {
  const [showAddKeyForm, setShowAddKeyForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyKey, setNewKeyKey] = useState('')
  const [addingKey, setAddingKey] = useState(false)
  const [apiKeys, setApiKeys] = useState<Array<{ id: number; name: string; api_key: string; tier: string; created_at: string; last_used_at: string | null }>>([])
  const [primaryApiKey, setPrimaryApiKey] = useState(formData.gemini_api_key || '')
  const [detectingTier, setDetectingTier] = useState(false)

  useEffect(() => {
    window.api.getApiKeys().then((keys: any[]) => {
      setApiKeys(keys || [])
    })
  }, [])

  const handleAddApiKey = async () => {
    if (!newKeyName.trim() || !newKeyKey.trim()) return
    
    setAddingKey(true)
    try {
      await window.api.addApiKey(newKeyName.trim(), newKeyKey.trim())
      const keys = await window.api.getApiKeys()
      setApiKeys(keys || [])
      setNewKeyName('')
      setNewKeyKey('')
      setShowAddKeyForm(false)
    } catch (err) {
      console.error('Failed to add API key:', err)
      alert('Failed to add API key. Please try again.')
    } finally {
      setAddingKey(false)
    }
  }

  const handleRemoveApiKey = async (id: number) => {
    try {
      await window.api.removeApiKey(id)
      const keys = await window.api.getApiKeys()
      setApiKeys(keys || [])
    } catch (err) {
      console.error('Failed to remove API key:', err)
      alert('Failed to remove API key. Please try again.')
    }
  }

  const handleDetectTier = async () => {
    setDetectingTier(true)
    try {
      await window.api.detectApiTier()
      const keys = await window.api.getApiKeys()
      setApiKeys(keys || [])
    } catch (err) {
      console.error('Failed to detect API tier:', err)
      alert('Failed to detect API tier. Please try again.')
    } finally {
      setDetectingTier(false)
    }
  }

  const handleContinue = () => {
    update('gemini_api_key', primaryApiKey.trim())
    onNext()
  }

  const hasAnyKey = primaryApiKey.trim() || apiKeys.length > 0

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight">Add your AI Studio keys</h1>
        <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
          Soxial uses your Google AI Studio keys for chat and onboarding. Add multiple keys to increase your rate limits.
        </p>
      </div>

      {/* Primary API Key */}
      <div className="space-y-4">
        <div className="text-[13px] font-medium text-muted-foreground">Primary API Key</div>
        <Input
          label="Google AI Studio API key"
          value={primaryApiKey}
          onChange={(v: string) => setPrimaryApiKey(v.trim())}
          placeholder="AIza..."
          type="password"
          hint="This will be your main API key. Create one at aistudio.google.com"
        />
      </div>

      {/* Additional API Keys */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium text-muted-foreground">Additional API Keys</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDetectTier}
              disabled={detectingTier}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {detectingTier ? (
                <span className="animate-pulse">Detecting...</span>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Detect Tiers
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddKeyForm(!showAddKeyForm)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              Add Key
            </button>
          </div>
        </div>

        {showAddKeyForm && (
          <div className="space-y-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Personal, Work)"
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-white/[0.12] transition-colors"
            />
            <input
              type="password"
              value={newKeyKey}
              onChange={(e) => setNewKeyKey(e.target.value)}
              placeholder="API key"
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-white/[0.12] transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddApiKey}
                disabled={addingKey || !newKeyName.trim() || !newKeyKey.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingKey ? <span className="animate-pulse">Adding...</span> : 'Add Key'}
              </button>
              <button
                onClick={() => {
                  setShowAddKeyForm(false)
                  setNewKeyName('')
                  setNewKeyKey('')
                }}
                className="px-4 py-2 text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {apiKeys.length > 0 ? (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`size-2 rounded-full ${key.tier === 'pro' ? 'bg-emerald-500' : key.tier === 'free' ? 'bg-amber-500' : 'bg-foreground/40'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-foreground/80">{key.name}</div>
                      {key.tier !== 'unknown' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${key.tier === 'pro' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {key.tier.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {key.last_used_at && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                          <Clock className="size-3" />
                          Used {new Date(key.last_used_at.replace(' ', 'T') + 'Z').toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveApiKey(key.id)}
                  className="p-2 text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground/40">
            No additional API keys. Add multiple keys to increase your rate limits.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.open('https://aistudio.google.com/apikey', '_blank', 'noopener,noreferrer')}
        className="flex items-center gap-2 text-[12px] text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        <ShieldAlert className="size-3.5" strokeWidth={1.75} />
        <span>Open AI Studio key page</span>
      </button>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-sm text-muted-foreground hover:text-foreground transition-all duration-500 active:scale-[0.98]"
          style={{ transitionTimingFunction: EASE }}
        >
          Back
        </button>
        <PrimaryButton onClick={handleContinue} disabled={!hasAnyKey} className="flex-1 bg-foreground text-background py-3.5">
          Continue
        </PrimaryButton>
      </div>
    </div>
  )
}

type StepItem = {
  type: 'reasoning'
  text: string
} | {
  type: 'tool'
  id: number
  name: string
  args: any
  result?: any
  status: 'calling' | 'complete'
} | {
  type: 'text'
  text: string
} | {
  type: 'question'
  id: string
  text: string
  qtype: 'single' | 'multi' | 'text'
  options?: string[]
  answer?: string | string[]
  status: 'asking' | 'answered'
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  steps?: StepItem[]
}

const toolIcons: Record<string, any> = {
  install_twitter_cli: Download, install_rdt_cli: Download,
  twitter_search: SearchIcon, twitter_user: AtSign, twitter_user_posts: List,
  twitter_status: BadgeCheck, twitter_whoami: BadgeCheck,
  twitter_followers: Users, twitter_following: Users, twitter_likes: Heart,
  twitter_article: FileText, twitter_list: List, twitter_delete: RotateCcw,
  twitter_tweet: Eye, twitter_post: Send, twitter_reply: CornerUpLeft, twitter_quote: Send,
  twitter_feed: Newspaper, twitter_like: Heart, twitter_retweet: Repeat2, twitter_bookmark: Bookmark, twitter_bookmarks: Bookmark,
  twitter_follow: UserPlus, twitter_replies: CornerUpLeft,
  rdt_search: SearchIcon, rdt_sub: Layers, rdt_sub_info: Info, rdt_read: BookOpen,
  rdt_user: AtSign, rdt_user_posts: List, rdt_user_comments: MessageCircle,
  rdt_login: BadgeCheck, rdt_whoami: BadgeCheck, rdt_feed: Newspaper, rdt_popular: Flame,
  rdt_all: GlobeIcon, rdt_saved: Bookmark, rdt_upvoted: ThumbsUp,
  rdt_comment: Send, rdt_upvote: ThumbsUp, rdt_save: Bookmark, rdt_subscribe: UserPlus,
  read_profile: AtSign, read_hooks: Lightbulb, read_voice_rules: MessageCircle,
  read_pillars: Layers, read_algorithm: Gauge, read_targets: Crosshair,
  read_replies: CornerUpLeft, read_social_content: Database, read_memory: Database,
  save_hook: Lightbulb, save_voice_rule: ShieldCheck, save_pillar: Save,
  save_algorithm_rule: Gauge, save_target: Crosshair, save_reply: CornerUpLeft,
  save_memory: Database, update_profile: SquarePen, reset_strategy_defaults: RotateCcw,
  delete_voice_rules: Trash2, delete_hooks: Trash2, delete_pillars: Trash2,
  delete_targets: Trash2, delete_algorithm_rules: Trash2, save_milestone: TrendingUp,
  generate_image: ImageIcon, schedule_post: CalendarClock, get_scheduled_posts: CalendarClock,
}
function getToolIcon(name: string) {
  return toolIcons[name] || GlobeIcon
}

function StepAiOnboarding({ formData, onComplete }: { formData: any; onComplete: (sessionId?: number) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [steps, setSteps] = useState<StepItem[]>([])
  const [streamText, setStreamText] = useState('')
  const [streaming, setStreaming] = useState(true)
  const [pendingQuestions, setPendingQuestions] = useState<QuestionData[] | null>(null)
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [savedConversationState, setSavedConversationState] = useState<any[] | null>(null)

  const stepsRef = useRef<StepItem[]>([])
  const stepCounter = useRef(0)
  const streamTextRef = useRef('')
  const [inputEl, setInputEl] = useState<HTMLDivElement | null>(null)
  const [inputAreaHeight, setInputAreaHeight] = useState(0)
  const [scrollbarW, setScrollbarW] = useState(6)

  useEffect(() => {
    if (!inputEl) return
    const update = () => setInputAreaHeight(inputEl.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(inputEl)
    return () => ro.disconnect()
  }, [inputEl])

  useEffect(() => {
    const sb = document.createElement('div')
    sb.style.cssText = 'width:50px;height:50px;overflow:scroll;position:absolute;opacity:0;'
    document.body.appendChild(sb)
    setScrollbarW(sb.offsetWidth - sb.clientWidth || 6)
    document.body.removeChild(sb)
  }, [])

  const commitStreamingMessage = () => {
    const text = streamTextRef.current.trim()
    const completedSteps = [...stepsRef.current]
    if (text || completedSteps.length > 0) {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: text,
        steps: completedSteps.length > 0 ? completedSteps : undefined,
      }])
    }
    streamTextRef.current = ''
    setStreamText('')
    stepsRef.current = []
    setSteps([])
  }

  const handleAllAnswers = (answers: { id: string; answer: string | string[] }[]) => {
    const display = answers.map(a => {
      const q = pendingQuestions?.find(qq => qq.id === a.id)
      const ansText = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer
      return `**Q:** ${q?.text || a.id}\n**A:** ${ansText}`
    }).join('\n\n')
    setMessages(prev => [...prev, { role: 'user' as const, content: display }])
    window.api.sendOnboardingAnswer(pendingBatchId || 'batch', answers)
    setPendingQuestions(null)
    setPendingBatchId(null)
  }

  const startOnboarding = () => {
    setMessages([])
    stepsRef.current = []
    stepCounter.current = 0
    streamTextRef.current = ''
    setSteps([]) // Clear the initial loading state
    setStreamText('')
    setStreaming(true)
    setPendingQuestions(null)
    setError(null)
    setComplete(false)
    setSavedConversationState(null) // Clear saved state on fresh start

    window.api.runOnboarding(formData)
      .then(result => {
        setStreaming(false)
        if (result?.success) {
          commitStreamingMessage()
          setComplete(true)
        } else {
          setError(result?.error || 'Failed to complete onboarding')
        }
      })
      .catch(err => {
        setStreaming(false)
        setError(err.message || 'An error occurred during onboarding')
        // Save conversation state for retry
        setSavedConversationState(messages.map(m => ({
          role: m.role,
          content: m.content,
          steps: m.steps
        })))
      })
  }

  const retryOnboarding = () => {
    // Preserve current state and retry
    setError(null)
    setStreaming(true)
    
    // Use saved conversation state if available, otherwise use current messages
    const messagesToContinue = savedConversationState || messages.map(m => ({
      role: m.role,
      content: m.content,
      steps: m.steps
    }))
    
    // Continue with current context - pass existing messages
    window.api.runOnboarding(formData, messagesToContinue)
      .then(result => {
        setStreaming(false)
        if (result?.success) {
          commitStreamingMessage()
          setComplete(true)
        } else {
          setError(result?.error || 'Failed to complete onboarding')
        }
      })
      .catch(err => {
        setStreaming(false)
        setError(err.message || 'An error occurred during onboarding')
        // Save conversation state for retry
        setSavedConversationState(messages.map(m => ({
          role: m.role,
          content: m.content,
          steps: m.steps
        })))
      })
  }

  useEffect(() => {
    // Show initial loading state immediately
    setSteps([{ type: 'reasoning', text: 'Initializing onboarding...' }])

    window.api.onOnboardingChunk((text) => {
    if (text === 'PHASE:gather' || text === 'PHASE:interview') return
    // Check for model fallback messages
    if (text.includes('Switching to')) {
      const stepsRefCurrent = stepsRef.current
      const last = stepsRefCurrent[stepsRefCurrent.length - 1]
      if (last && last.type === 'reasoning') {
        last.text = text
      } else {
        stepsRef.current.push({ type: 'reasoning', text })
      }
      setSteps([...stepsRef.current])
      return
    }
    streamTextRef.current += text
    setStreamText(streamTextRef.current)
  })

    window.api.onOnboardingReasoning((text) => {
      const s = stepsRef.current
      const last = s[s.length - 1]
      if (last && last.type === 'reasoning') {
        last.text += text
      } else {
        s.push({ type: 'reasoning', text })
      }
      setSteps([...s])
    })

    window.api.onOnboardingToolCall((data) => {
      if (data.name === 'ask_user_questions') return
      const tool: StepItem = { type: 'tool', id: stepCounter.current++, name: data.name, args: data.args, status: 'calling' }
      stepsRef.current = [...stepsRef.current, tool]
      setSteps(stepsRef.current)
    })

    window.api.onOnboardingToolResult((data) => {
      if (data.name === 'ask_user_questions') return
      let found = false
      stepsRef.current = stepsRef.current.map(s => {
        if (!found && s.type === 'tool' && s.name === data.name && s.status === 'calling') {
          found = true
          return { ...s, status: 'complete', result: data.result }
        }
        return s
      })
      setSteps([...stepsRef.current])
    })

    window.api.onOnboardingQuestion((payload: { batchId: string; questions: QuestionData[] }) => {
      commitStreamingMessage()
      setPendingBatchId(payload.batchId)
      setPendingQuestions(payload.questions)
    })

    // Start onboarding after a brief delay to allow UI to render
    const timer = setTimeout(() => {
      startOnboarding()
    }, 300)

    return () => {
      clearTimeout(timer)
      window.api.removeAllListeners('onboarding:chunk')
      window.api.removeAllListeners('onboarding:toolCall')
      window.api.removeAllListeners('onboarding:toolResult')
      window.api.removeAllListeners('onboarding:reasoning')
      window.api.removeAllListeners('onboarding:question')
    }
  }, [])

  const hasActivity = steps.length > 0
  const allToolsDone = steps.length > 0 && steps.every(s => s.type === 'tool' ? s.status === 'complete' : true)
  const hasNextAction = complete && messages.some(m => m.role === 'assistant' && m.content.includes('"nxan"'))

  const renderStep = (step: StepItem, key: number, isStreaming = false) => {
    const description =
      step.type === 'tool' && step.status === 'calling'
        ? JSON.stringify(step.args)
        : undefined

    if (step.type === 'reasoning') {
      return (
        <Reasoning key={key} isStreaming={isStreaming} defaultOpen={true}>
          <ReasoningTrigger />
          <ReasoningContent>{step.text}</ReasoningContent>
        </Reasoning>
      )
    }

    if (step.type === 'tool') {
      return (
        <ChainOfThoughtStep
          key={key}
          icon={getToolIcon(step.name)}
          label={step.name}
          description={description}
          status={step.status === 'calling' ? 'active' : 'complete'}
        />
      )
    }

    if (step.type === 'text') {
      return (
        <RichContent key={key} isAnimating={isStreaming}>
          {step.text}
        </RichContent>
      )
    }

    return (
      <ChainOfThoughtStep
        key={key}
        icon={MessageSquare}
        label={step.status === 'answered'
          ? `${step.text} → ${Array.isArray(step.answer) ? step.answer.join(', ') : step.answer}`
          : step.text}
        status={step.status === 'answered' ? 'complete' : 'active'}
      />
    )
  }

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className="max-w-3xl mx-auto w-full pt-16">
          {messages.map((msg, i) => (
            <Message key={i} from={msg.role}>
              <MessageContent>
                {msg.steps?.length ? (
                  <div className="flex flex-col gap-1.5 mb-2">
                    {msg.steps.map((step, si) => {
                      const hide =
                        (step.type === 'reasoning' || step.type === 'tool') &&
                        msg.steps!.some((s, idx) => idx > si && s.type === 'text')
                      if (hide) return null
                      return renderStep(step, si)
                    })}
                  </div>
                ) : null}
                {(!msg.steps || !msg.steps.some((s) => s.type === 'text')) && msg.content && (
                  <RichContent>{msg.content}</RichContent>
                )}
              </MessageContent>
            </Message>
          ))}

          {streaming && !pendingQuestions && (
            <Message from="assistant">
              <MessageContent>
                {hasActivity ? (
                  <div className="flex flex-col gap-1.5 mb-2">
                    {steps.map((step, si) => {
                      const hide =
                        (step.type === 'reasoning' || step.type === 'tool') &&
                        steps.some((s, idx) => idx > si && s.type === 'text')
                      if (hide) return null
                      return renderStep(step, si, si === steps.length - 1 && streaming)
                    })}
                    {allToolsDone && !streamText && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Continuing...</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {streamText && <RichContent isAnimating>{streamText}</RichContent>}

                {!hasActivity && !streamText && (
                  <div className="flex items-center gap-1 py-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </MessageContent>
            </Message>
          )}

          <div style={{ height: inputAreaHeight + 48 }} />
        </ConversationContent>
        {messages.length > 0 && <ConversationScrollButton bottomOffset={inputAreaHeight + 56} />}
      </Conversation>

      <div
        className="absolute bottom-0 left-0 px-4 pb-6 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none"
        style={{
          right: scrollbarW,
          paddingTop: Math.max(32, Math.round(inputAreaHeight * 0.25) || 48),
        }}
      >
        <div ref={setInputEl} className="max-w-3xl mx-auto flex justify-center">
          {error ? (
            <div
              className="flex items-center justify-between gap-3 w-full max-w-md rounded-2xl px-4 py-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationTimingFunction: EASE, background: 'rgba(239,68,68,0.04)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.15)' }}
            >
              <div className="flex items-center gap-2.5 text-destructive text-xs min-w-0">
                <ShieldAlert className="size-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{error}</span>
              </div>
              <button
                onClick={retryOnboarding}
                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all duration-500 active:scale-[0.96] shrink-0"
                style={{ transitionTimingFunction: EASE }}
              >
                <RefreshCw className="size-3" strokeWidth={2} /> Retry
              </button>
            </div>
          ) : complete ? (
            hasNextAction ? (
              <div className="flex items-center gap-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-500" style={{ animationTimingFunction: EASE }}>
                <button
                  onClick={() => onComplete()}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-sm text-muted-foreground hover:text-foreground transition-all duration-500 active:scale-[0.98]"
                  style={{ transitionTimingFunction: EASE }}
                >
                  Skip to Dashboard
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Strip tool call history — empty messages (silent tool calls) removed,
                      // steps dropped. Prevents chat agent from seeing onboarding-only tools
                      // (ask_user_questions, save_hook, etc.) and massive tool results that cause hallucinations.
                      const stripped = messages
                        .filter(m => m.content.trim())
                        .map(m => ({ role: m.role, content: m.content }))
                      const sessionId = await window.api.saveOnboardingConversation(stripped)
                      onComplete(sessionId)
                    } catch {
                      onComplete()
                    }
                  }}
                  className="group flex items-center gap-3 px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold transition-all active:scale-[0.98] hover:opacity-90"
                  style={{ transitionTimingFunction: EASE }}
                >
                  <span>Review Next Action</span>
                  <span
                    className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5"
                    style={{ transitionTimingFunction: EASE }}
                  >
                    <ArrowRight className="size-3" strokeWidth={2} />
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onComplete()}
                className="group flex items-center gap-3 px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold pointer-events-auto animate-in fade-in zoom-in-95 duration-500 transition-all active:scale-[0.98] hover:opacity-90"
                style={{ transitionTimingFunction: EASE, animationTimingFunction: EASE }}
              >
                <span>Continue to Dashboard</span>
                <span
                  className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5"
                  style={{ transitionTimingFunction: EASE }}
                >
                  <ArrowRight className="size-3" strokeWidth={2} />
                </span>
              </button>
            )
          ) : pendingQuestions ? (
            <QuestionInput questions={pendingQuestions} onSubmit={handleAllAnswers} />
          ) : null}
        </div>
      </div>
    </>
  )
}
