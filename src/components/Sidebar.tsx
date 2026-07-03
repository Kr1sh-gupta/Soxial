import { useState, useEffect } from 'react'
import { Plus, CalendarClock, Settings, PanelLeftClose, Trash2 } from 'lucide-react'
import { AppLogo } from 'src/components/ui/app-logo'

interface ChatSession {
  id: number
  title: string
  msg_count: number
  updated_at: string
}

export type View = 'chat' | 'scheduled' | 'profile'

interface SidebarProps {
  sessions: ChatSession[]
  currentSessionId: number | null
  currentView: View
  streaming: boolean
  profile: any
  scheduledCount: number
  onNewChat: () => void
  onSelectSession: (id: number) => void
  onDeleteSession: (id: number) => void
  onNavigate: (view: View) => void
  onToggleSidebar: () => void
}

function parseDate(s: string): Date {
  return new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z'))
}

function groupByDate(sessions: ChatSession[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 6 * 86400000)

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const s of sessions) {
    const d = parseDate(s.updated_at)
    if (d >= today) groups[0].items.push(s)
    else if (d >= yesterday) groups[1].items.push(s)
    else if (d >= weekAgo) groups[2].items.push(s)
    else groups[3].items.push(s)
  }

  return groups.filter(g => g.items.length > 0)
}

export default function Sidebar({
  sessions, currentSessionId, currentView, streaming, profile, scheduledCount,
  onNewChat, onSelectSession, onDeleteSession, onNavigate, onToggleSidebar
}: SidebarProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; sessionId: number } | null>(null)
  const groups = groupByDate(sessions)

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const timer = setTimeout(() => {
      document.addEventListener('click', close)
      document.addEventListener('contextmenu', close)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', close)
      document.removeEventListener('contextmenu', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [ctxMenu])

  const handleContextMenu = (e: React.MouseEvent, sessionId: number) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, sessionId })
  }

  return (
    <>
      <div className="w-60 flex-shrink-0 flex flex-col bg-sidebar border-r border-[hsl(var(--sidebar-border))] relative">
        {/* Ambient grain */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '256px 256px' }} />

        <div className="relative z-0 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <AppLogo showLabel iconClassName="size-8" labelClassName="text-[13px]" />
            <button onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.04] transition-premium-fast">
              <PanelLeftClose className="size-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="px-2 pb-3 space-y-0.5">
            <button onClick={onNewChat} disabled={streaming}
              className="btn-capsule w-full justify-between disabled:opacity-40"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
              <span className="flex items-center gap-2"><Plus className="size-3.5" /> New chat</span>
              <span className="btn-icon"><Plus className="size-3" /></span>
            </button>
            <button onClick={() => onNavigate('scheduled')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-premium-fast ${
                currentView === 'scheduled'
                  ? 'bg-white/[0.06] text-foreground'
                  : 'text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground'
              }`}>
              <CalendarClock className="size-3.5" />
              <span className="flex-1 text-left font-medium">Scheduled</span>
              {scheduledCount > 0 && (
                <span className="text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-semibold"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                  {scheduledCount}
                </span>
              )}
            </button>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <div className="text-[10px] text-muted-foreground/30 font-medium uppercase tracking-[0.12em] px-3 pb-1">History</div>
            {groups.map(group => (
              <div key={group.label} className="mb-3">
                <div className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.08em] px-3 pt-2 pb-0.5 font-medium">{group.label}</div>
                {group.items.map(s => {
                  const active = s.id === currentSessionId && currentView === 'chat'
                  return (
                    <div key={s.id}
                      className={`flex items-center px-3 py-2 mb-0.5 rounded-xl cursor-pointer text-sm transition-premium-fast ${
                        active
                          ? 'bg-white/[0.06] text-foreground'
                          : 'text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground'
                      }`}
                      onClick={() => onSelectSession(s.id)}
                      onContextMenu={(e) => handleContextMenu(e, s.id)}>
                      <span className="flex-1 truncate font-medium">{s.title}</span>
                    </div>
                  )
                })}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground/30 font-medium">No conversations yet</div>
            )}
          </div>

          {/* Profile footer — double-bezel */}
          <div className="p-2 border-t border-[hsl(var(--sidebar-border))]">
            <div className="double-bezel-subtle">
              <div className="double-bezel-subtle-inner">
                <button onClick={() => onNavigate('profile')}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-[calc(1rem-1px)] transition-premium-fast ${
                    currentView === 'profile' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                  }`}>
                  <div className="size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 inset-glow"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                    {profile?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm text-foreground/90 truncate font-medium">{profile?.name || 'User'}</div>
                    <div className="text-[11px] text-muted-foreground/50 truncate font-medium">
                      {profile?.twitter_handle && `@${profile.twitter_handle}`}
                      {profile?.twitter_handle && profile?.reddit_username && ' · '}
                      {profile?.reddit_username && `u/${profile.reddit_username}`}
                    </div>
                  </div>
                  <Settings className="size-3.5 text-muted-foreground/30 shrink-0 transition-premium-fast group-hover:text-muted-foreground/60" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-xl border border-[hsl(var(--sidebar-border))] bg-sidebar shadow-2xl py-1 backdrop-blur-xl"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { onDeleteSession(ctxMenu.sessionId); setCtxMenu(null) }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/8 transition-premium-fast flex items-center gap-2.5 rounded-lg mx-1 my-0.5"
            style={{ color: '#f87171' }}>
            <Trash2 className="size-3.5" />
            Delete chat
          </button>
        </div>
      )}
    </>
  )
}
