import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Check, Plus, Trash2 } from 'lucide-react'
import { cn } from 'src/lib/utils'

export default function Profile({ profile, onBack }: { profile: any; onBack: () => void }) {
  const [data, setData] = useState<Record<string, any[]>>({})
  const [primaryApiKey, setPrimaryApiKey] = useState(profile?.gemini_api_key || '')
  const [extras, setExtras] = useState<Array<{ id?: number; value: string }>>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.dbQuery('content_pillars'),
      window.api.dbQuery('hooks'),
      window.api.dbQuery('target_accounts'),
      window.api.dbQuery('voice_rules'),
      window.api.getApiKeys(),
    ]).then(([pillars, hooks, targets, voice, keys]) => {
      setData({
        pillars: pillars as any[],
        hooks: (hooks as any[])?.sort((a, b) => a.rank - b.rank),
        targets: targets as any[],
        voice: voice as any[],
      })
      setExtras((keys as any[]).filter(k => k.name !== 'Primary').map(k => ({ id: k.id, value: k.api_key })))
      if (profile?.gemini_api_key) setPrimaryApiKey(profile.gemini_api_key)
    })
  }, [])

  const bannedPhrases = data.voice?.filter(v => v.type === 'banned_phrase') ?? []
  const bannedStructures = data.voice?.filter(v => v.type === 'banned_structure') ?? []
  const naturalElements = data.voice?.filter(v => v.type === 'natural_element') ?? []
  const twTargets = data.targets?.filter(t => t.platform === 'twitter') ?? []
  const rdTargets = data.targets?.filter(t => t.platform === 'reddit') ?? []
  const hookCategories = groupHooks(data.hooks ?? [])
  const brands = [profile?.brand_primary_color, profile?.brand_secondary_color, profile?.brand_accent_color].filter(Boolean)

  const meta = [
    profile?.primary_goal && ['Goal', profile.primary_goal],
    profile?.target_audience && ['Audience', profile.target_audience],
    profile?.superpower && ['Superpower', profile.superpower],
    profile?.timezone && ['Timezone', profile.timezone],
  ].filter(Boolean) as [string, string][]

  const hasStrategy = profile?.growth_strategy || data.pillars?.length || data.hooks?.length
  const hasGuardrails = meta.length > 0 || bannedPhrases.length > 0 || naturalElements.length > 0 || data.targets?.length > 0

  const updateExtra = (i: number, value: string) =>
    setExtras(prev => prev.map((k, idx) => idx === i ? { ...k, value } : k))
  const addExtra = () => setExtras(prev => [...prev, { value: '' }])
  const removeExtra = (i: number) => setExtras(prev => prev.filter((_, idx) => idx !== i))

  const handleSaveKeys = async () => {
    setSaving(true)
    try {
      if (primaryApiKey.trim()) {
        await window.api.updateProfile({ gemini_api_key: primaryApiKey.trim() })
      }
      const existing = ((await window.api.getApiKeys()) as any[]).filter(k => k.name !== 'Primary')
      const keptIds = new Set(extras.filter(e => e.id).map(e => e.id))
      for (const k of existing) {
        if (!keptIds.has(k.id)) await window.api.removeApiKey(k.id)
      }
      for (const e of extras) {
        if (!e.id && e.value.trim()) await window.api.addApiKey(e.value.trim())
      }
      await window.api.detectApiTier(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      console.error('Failed to save API keys:', err)
      alert('Failed to save API keys. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto selection:bg-foreground selection:text-background pb-32">
      <div className="max-w-[760px] mx-auto px-6 md:px-12 py-16">
        
        {/* Navigation */}
        <button 
          onClick={onBack} 
          className="group flex items-center gap-2 text-xs font-medium text-muted-foreground/50 hover:text-foreground transition-colors mb-20 tracking-wide uppercase"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" /> Back to Chat
        </button>

        {/* Identity Header */}
        <header className="mb-32">
          {brands.length > 0 && (
            <div className="flex items-center gap-1.5 mb-10">
              {brands.map((c, i) => (
                <div key={i} className="size-2.5 rounded-sm" style={{ background: c }} />
              ))}
            </div>
          )}
          <h1 className="text-[2.75rem] font-medium text-foreground tracking-tight leading-[1.1] mb-6">
            {profile?.name || 'Anonymous User'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium tracking-wide">
            {profile?.niche && (
              <span className="text-foreground/80">{profile.niche}</span>
            )}
            {profile?.niche && (profile?.twitter_handle || profile?.reddit_username) && (
              <span className="text-muted-foreground/20">/</span>
            )}
            {profile?.twitter_handle && (
              <span className="text-muted-foreground/60">@{profile.twitter_handle}</span>
            )}
            {profile?.reddit_username && (
              <span className="text-muted-foreground/60">u/{profile.reddit_username}</span>
            )}
          </div>
        </header>

        {!hasStrategy ? (
          <div className="h-40 flex items-center border-t border-white/[0.04]">
            <p className="text-muted-foreground/40 text-sm">No strategy data initialized.</p>
          </div>
        ) : (
          <div className="space-y-32">
            
            {/* Core Strategy */}
            {profile?.growth_strategy && (
              <section className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-8 border-t border-white/[0.04] pt-12">
                <SectionHeading>Strategy</SectionHeading>
                <div className="prose prose-invert prose-p:leading-[1.8] prose-p:text-foreground/70 prose-p:text-[15px] prose-p:font-light max-w-none">
                  {profile.growth_strategy.split('\n\n').map((paragraph: string, i: number) => (
                    <p key={i} className="mb-6 last:mb-0">{paragraph}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Pillars Grid */}
            {data.pillars?.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-8 border-t border-white/[0.04] pt-12">
                <SectionHeading>Pillars</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.pillars.map((p, i) => (
                    <div key={i} className="group relative p-6 bg-white/[0.015] hover:bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[15px] font-medium text-foreground/90 leading-tight">{p.name}</h3>
                          {p.frequency && (
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium shrink-0 pt-0.5">{p.frequency}</span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-[13px] text-muted-foreground/60 leading-relaxed font-light">{p.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hook Architecture */}
            {data.hooks?.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-8 border-t border-white/[0.04] pt-12">
                <SectionHeading>Hooks</SectionHeading>
                <div className="space-y-16">
                  {hookCategories.map(({ category, hooks }) => (
                    <div key={category} className="space-y-6">
                      <h3 className="text-[11px] font-medium text-foreground/40 uppercase tracking-widest border-b border-white/[0.04] pb-4 mb-6">{category}</h3>
                      <div className="space-y-8">
                        {hooks.map((h) => (
                          <div key={h.rank} className="group flex flex-col sm:flex-row items-baseline gap-4 sm:gap-6">
                            <span className="text-[11px] font-mono text-muted-foreground/30 w-6 shrink-0 pt-1">
                              {h.rank.toString().padStart(2, '0')}
                            </span>
                            <div className="flex-1 space-y-2">
                              <h4 className="text-[15px] font-medium text-foreground/80">{h.name}</h4>
                              {h.template && (
                                <p className="text-[14px] text-muted-foreground/50 leading-relaxed font-light font-mono selection:bg-muted-foreground/20">{h.template}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Brand Guardrails */}
            {hasGuardrails && (
              <section className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-8 border-t border-white/[0.04] pt-12">
                <SectionHeading>Guardrails</SectionHeading>
                <div className="space-y-16">
                  
                  {/* Meta Profile */}
                  {meta.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      {meta.map(([label, value]) => (
                        <div key={label} className="space-y-2">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">{label}</div>
                          <div className="text-[14px] text-foreground/80 font-light leading-snug">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voice Rules */}
                  {(naturalElements.length > 0 || bannedPhrases.length > 0 || bannedStructures.length > 0) && (
                    <div className="space-y-8">
                      {naturalElements.length > 0 && <TagGroup label="Natural Flow" items={naturalElements.map(v => v.content)} />}
                      {bannedPhrases.length > 0 && <TagGroup label="Banned Lexicon" items={bannedPhrases.map(v => v.content)} muted />}
                      {bannedStructures.length > 0 && <TagGroup label="Banned Structures" items={bannedStructures.map(v => v.content)} muted />}
                    </div>
                  )}

                  {/* Targets */}
                  {data.targets?.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Engagement Targets</div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {twTargets.map((t, i) => (
                          <TargetBadge key={`tw${i}`} prefix="@" handle={t.handle} tier={t.tier} />
                        ))}
                        {rdTargets.map((t, i) => (
                          <TargetBadge key={`rd${i}`} prefix="r/" handle={t.handle} tier={t.tier} />
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </section>
            )}
          </div>
        )}

        {/* API Key Settings */}
        <section className="mt-32 border-t border-white/[0.04] pt-12">
          <SectionHeading>API Settings</SectionHeading>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Primary API key</div>
              <input
                type="password"
                value={primaryApiKey}
                onChange={(e) => setPrimaryApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-white/[0.12] transition-colors"
              />
            </div>

            {extras.map((k, i) => (
              <div key={k.id ?? `new-${i}`} className="flex gap-2">
                <input
                  type="password"
                  value={k.value}
                  onChange={(e) => updateExtra(i, e.target.value)}
                  placeholder="AIza..."
                  className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-white/[0.12] transition-colors"
                />
                <button
                  onClick={() => removeExtra(i)}
                  aria-label="Remove key"
                  className="px-3 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}

            <button
              onClick={addExtra}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              Add more API key
            </button>

            <div className="pt-2">
              <button
                onClick={handleSaveKeys}
                disabled={saving || (!primaryApiKey.trim() && !extras.some(e => e.value.trim()))}
                className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="animate-pulse">Saving...</span>
                ) : saved ? (
                  <><Check className="size-4" /> Saved</>
                ) : (
                  <><Save className="size-4" /> Save</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        {profile?.created_at && (
          <div className="mt-32 pt-8 border-t border-white/[0.04] text-[11px] tracking-wide text-muted-foreground/30 font-medium uppercase">
            Initialized {new Date(profile.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

function groupHooks(hooks: any[]) {
  const map = new Map<string, any[]>()
  for (const h of hooks) {
    const cat = h.category || 'General'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(h)
  }
  return Array.from(map, ([category, hooks]) => ({ category, hooks }))
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium text-foreground/40 uppercase tracking-widest pt-1">
      {children}
    </h2>
  )
}

function TagGroup({ label, items, muted = false }: { label: string; items: string[]; muted?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">{label}</div>
      <div className="flex flex-wrap gap-2 pt-1">
        {items.map((item, i) => (
          <span 
            key={i} 
            className={cn(
              "text-[12px] font-light px-3 py-1.5 rounded-sm",
              muted 
                ? "bg-white/[0.02] text-muted-foreground/60 border border-white/[0.03]" 
                : "bg-white/[0.04] text-foreground/70 border border-white/[0.06]"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function TargetBadge({ prefix, handle, tier }: { prefix: string, handle: string, tier?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/[0.04] rounded-sm transition-colors hover:bg-white/[0.04]">
      <span className="text-[13px] font-medium text-foreground/70">
        <span className="text-muted-foreground/40 mr-[1px]">{prefix}</span>{handle}
      </span>
      {tier && (
        <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/30">
          {tier}
        </span>
      )}
    </span>
  )
}
