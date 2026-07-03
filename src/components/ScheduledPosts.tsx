import { useState, useEffect } from 'react'
import { ArrowLeft, CalendarClock, Send } from 'lucide-react'
import { TweetCard } from 'src/components/ui/tweet-card'
import { RedditPostCard } from 'src/components/ui/reddit-post-card'

interface ScheduledPost {
  id: number
  platform: string
  type: string | null
  text: string | null
  media_path: string | null
  hashtags: string | null
  first_reply: string | null
  scheduled_time: string | null
  status: string
  result_json: string | null
  created_at: string
}

function formatScheduled(time: string | null): string {
  if (!time) return 'Not scheduled'
  const d = new Date(time.replace(' ', 'T') + (time.endsWith('Z') ? '' : 'Z'))
  if (isNaN(d.getTime())) return time
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function parseRedditContent(text: string): { title: string; selftext: string } {
  const lines = text.split('\n')
  if (lines.length <= 1) return { title: text, selftext: '' }
  return { title: lines[0], selftext: lines.slice(1).join('\n') }
}

export default function ScheduledPosts({ profile, onBack }: { profile: any; onBack: () => void }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.dbQuery('scheduled_posts', 'status = ? OR status = ?', ['draft', 'scheduled']).then((data: any) => {
      setPosts(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-muted-foreground/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-12">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Scheduled posts</h1>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {posts.length === 0 ? 'No posts scheduled yet.' : `${posts.length} post${posts.length !== 1 ? 's' : ''} scheduled`}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CalendarClock className="size-10 text-muted-foreground/60 mb-3" />
            <h2 className="text-base font-medium text-muted-foreground">Nothing scheduled</h2>
            <p className="text-sm text-muted-foreground/60 mt-1">Ask the AI to draft and schedule posts in chat.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => {
              const isTwitter = post.platform === 'twitter'
              const text = post.text || ''
              const scheduledLabel = formatScheduled(post.scheduled_time)

              return (
                <div key={post.id}>
                  {/* Post meta bar */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isTwitter ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {isTwitter ? 'X' : 'Reddit'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                      <CalendarClock className="size-3" />
                      {scheduledLabel}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      post.status === 'scheduled' ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground/60'
                    }`}>
                      {post.status}
                    </span>
                  </div>

                  {/* Post preview card */}
                  {isTwitter ? (
                    <TweetCard
                      preview
                      content={text}
                      authorName={profile?.name}
                      authorHandle={profile?.twitter_handle}
                      timestamp={scheduledLabel}
                    />
                  ) : (
                    <RedditPostCard
                      preview
                      author={profile?.reddit_username}
                      {...parseRedditContent(text)}
                    />
                  )}

                  {/* Hashtags */}
                  {post.hashtags && (
                    <div className="text-xs text-blue-400 mt-1.5 px-1">{post.hashtags}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
