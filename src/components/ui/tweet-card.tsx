import { useState, useEffect } from 'react'
import { cn } from 'src/lib/utils'
import { Send, Loader2, Clock } from 'lucide-react'
import { PostAttachments, PostAttachment, extractTweetAttachments, expandTweetLinks } from 'src/components/ui/post-attachment'
import { getCachedPost, cachePost } from 'src/lib/post-cache'

const fetchCache = new Map<string, Promise<any>>()

// ponytail: strip trailing t.co media links from text when media is shown as attachment
function stripMediaLinks(text: string, media: any[]): string {
  if (!Array.isArray(media) || media.length === 0) return text
  return text.replace(/(\s*https:\/\/t\.co\/\S+)+\s*$/, '').trim()
}

function parseTweetData(raw: any): TweetCardProps {
  const author = typeof raw.author === 'object' && raw.author ? raw.author : null
  const authorStr = typeof raw.author === 'string' ? raw.author.replace(/^@/, '') : null
  const handle = author?.screenName || author?.username || authorStr || raw.screenName || raw.userName || raw.username
  const name = author?.name || author?.displayName || raw.name || raw.displayName || handle
  const metrics = raw.metrics || {}
  return {
    id: raw.id,
    authorName: name,
    authorHandle: handle,
    authorImage: author?.profileImageUrl || author?.profileImageURL || raw.profileImageUrl,
    content: stripMediaLinks(expandTweetLinks(raw.text || raw.full_text || '', raw), raw.media),
    likes: metrics.likes ?? raw.likes ?? 0,
    retweets: metrics.retweets ?? raw.rts ?? raw.retweets ?? 0,
    replies: metrics.replies ?? raw.replies ?? 0,
    bookmarks: metrics.bookmarks ?? raw.bookmarks ?? 0,
    timestamp: raw.createdAtLocal || raw.createdAtISO || raw.createdAt || raw.time,
    verified: author?.verified ?? raw.verified,
    attachments: extractTweetAttachments(raw),
  }
}

function pickTweetData(list: any[] | null | undefined, targetId?: string): any | null {
  if (!Array.isArray(list) || list.length === 0) return null
  if (!targetId) return list[0]
  return list.find((item) => String(item?.id) === String(targetId)) || list[0]
}

function dedupedFetch(id: string): Promise<any> {
  if (!fetchCache.has(id)) {
    fetchCache.set(id, window.api.twitterTweet(id))
    fetchCache.get(id)!.finally(() => fetchCache.delete(id))
  }
  return fetchCache.get(id)!
}

export interface TweetCardProps {
  id?: string
  tweetId?: string
  replyId?: string
  authorName?: string
  authorHandle?: string
  authorImage?: string
  content?: string
  likes?: number
  retweets?: number
  replies?: number
  bookmarks?: number
  timestamp?: string
  verified?: boolean
  replyTo?: { authorName: string; authorHandle: string }
  onPost?: () => void
  posting?: boolean
  className?: string
  repliesList?: TweetCardProps[]
  preview?: boolean
  attachments?: PostAttachment[]
  showPostButton?: boolean
}

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={cn('size-4 fill-current', className)} aria-label="Verified">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  )
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function TweetReplyNode({ reply, depth = 0 }: { reply: TweetCardProps; depth: number }) {
  const displayContent = reply.content || ''
  return (
    <div className="mt-3 pl-3.5 border-l border-border/60 hover:border-border transition-colors py-1">
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {reply.authorImage ? (
            <img src={reply.authorImage} alt={reply.authorName} className="size-full object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              {reply.authorName?.[0]}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="flex items-center gap-0.5 text-xs font-semibold text-foreground">
            {reply.authorName}
            {reply.verified && <VerifiedBadge className="text-[#1C9BF1] size-3" />}
          </span>
          <span className="text-[10px] text-muted-foreground -mt-0.5">@{reply.authorHandle}</span>
        </div>
        {reply.timestamp && (
          <span className="text-[10px] text-muted-foreground ml-auto">{reply.timestamp}</span>
        )}
      </div>

      <p className="mt-1 text-[13.5px] leading-snug text-foreground whitespace-pre-wrap">{displayContent}</p>

      <PostAttachments attachments={reply.attachments} className="mt-1" />

      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
        {(reply.likes !== undefined && reply.likes > 0) && <span><strong>{fmt(reply.likes)}</strong> Likes</span>}
        {(reply.retweets !== undefined && reply.retweets > 0) && <span><strong>{fmt(reply.retweets)}</strong> Reposts</span>}
      </div>

      {reply.repliesList && reply.repliesList.length > 0 && (
        <div className="mt-1 space-y-1">
          {reply.repliesList.map((child, i) => (
            <TweetReplyNode key={child.id || i} reply={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TweetCard({
  id, tweetId, replyId, authorName, authorHandle, authorImage, content, likes = 0, retweets = 0,
  replies = 0, bookmarks = 0, timestamp, verified, replyTo, onPost, posting, className, repliesList, preview,
  attachments, showPostButton
}: TweetCardProps) {
  const [loadedData, setLoadedData] = useState<TweetCardProps | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedReply, setLoadedReply] = useState<TweetCardProps | null>(null)

  const activeId = tweetId || id

  useEffect(() => {
    if (!activeId || content) return
    const cacheKey = `tw:${activeId}`
    const cached = getCachedPost(cacheKey)

    const cachedTweet = pickTweetData(cached?.data, activeId)
    if (cachedTweet) {
      setLoadedData(parseTweetData(cachedTweet))
      setLoading(false)
      if (cached?.isStale) {
        dedupedFetch(activeId).then((res: any) => {
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
            cachePost(cacheKey, res.data)
            const freshTweet = pickTweetData(res.data, activeId)
            if (freshTweet) setLoadedData(parseTweetData(freshTweet))
          }
        }).catch(() => {})
      }
      return
    }

    setLoading(true)
    setError(null)
    dedupedFetch(activeId)
      .then((res: any) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          cachePost(cacheKey, res.data)
          const tweet = pickTweetData(res.data, activeId)
          if (tweet) setLoadedData(parseTweetData(tweet))
        } else if (res.error?.code === 'rate_limited') {
          setError('Rate limited. Try again in a few minutes.')
        } else {
          setError('Failed to fetch tweet details')
        }
        setLoading(false)
      })
      .catch((err: any) => {
        setError(err.message || 'Error loading tweet')
        setLoading(false)
      })
  }, [activeId, content])

  useEffect(() => {
    if (!replyId) { setLoadedReply(null); return }
    const cacheKey = `tw:${replyId}`
    const cached = getCachedPost(cacheKey)

    const cachedReply = pickTweetData(cached?.data, replyId)
    if (cachedReply) {
      setLoadedReply(parseTweetData(cachedReply))
      if (cached?.isStale) {
        dedupedFetch(replyId).then((res: any) => {
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
            cachePost(cacheKey, res.data)
            const freshReply = pickTweetData(res.data, replyId)
            if (freshReply) setLoadedReply(parseTweetData(freshReply))
          }
        }).catch(() => {})
      }
      return
    }

    dedupedFetch(replyId).then((res: any) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        cachePost(cacheKey, res.data)
        const reply = pickTweetData(res.data, replyId)
        if (reply) setLoadedReply(parseTweetData(reply))
      }
    }).catch(() => {})
  }, [replyId])

  if (loading) {
    return (
      <div className={cn('w-full max-w-[560px] rounded-xl p-6 bg-card border border-border flex flex-col items-center justify-center min-h-[140px] gap-2.5', className)}>
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Loading tweet thread...</span>
      </div>
    )
  }

  if (error) {
    const isRateLimit = error === 'Rate limited. Try again in a few minutes.'
    return (
      <div className={cn('w-full max-w-[560px] rounded-xl p-4 bg-card border border-destructive/30 text-destructive text-sm', className)}>
        <div className="flex items-center gap-2 mb-1">
          {isRateLimit && <Clock className="size-4 shrink-0" />}
          <p className="font-semibold">{isRateLimit ? 'Rate limited' : 'Failed to load tweet'}</p>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  const displayData = loadedData || {
    authorName, authorHandle, authorImage, content, likes, retweets,
    replies, bookmarks, timestamp, verified, replyTo, onPost, posting, repliesList, attachments, showPostButton
  }

  const resolvedReplies = loadedReply
    ? [loadedReply, ...(displayData.repliesList || [])]
    : displayData.repliesList

  const tweetUrl = `https://x.com/${displayData.authorHandle}/status`

  return (
    <div className={cn(
      'w-full max-w-[560px] rounded-xl p-4',
      'bg-card border border-border shadow-sm',
      className
    )}>
      {displayData.replyTo && (
        <div className="text-xs text-muted-foreground mb-2">
          Replying to @{displayData.replyTo.authorHandle}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {displayData.authorImage
              ? <img src={displayData.authorImage} alt={displayData.authorName} className="size-full object-cover" />
              : <div className="size-full flex items-center justify-center text-sm font-medium text-muted-foreground">{displayData.authorName?.[0]}</div>
            }
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
              {displayData.authorName}
              {displayData.verified && <VerifiedBadge className="text-[#1C9BF1]" />}
            </span>
            <span className="-mt-0.5 text-[13px] text-muted-foreground">@{displayData.authorHandle}</span>
          </div>
        </div>
        {!preview && (
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        )}
      </div>

      <p className="mt-3 text-[15px] leading-6 text-foreground whitespace-pre-wrap">{displayData.content}</p>

      <PostAttachments attachments={displayData.attachments} className="mt-2" />

      {displayData.timestamp && (
        <div className="mt-3 text-[13px] text-muted-foreground">{displayData.timestamp}</div>
      )}

      <div className="mt-3 flex items-center gap-5 border-t border-border pt-3 text-[13px] text-muted-foreground">
        {displayData.replies !== undefined && displayData.replies > 0 && <span><strong className="text-foreground">{fmt(displayData.replies)}</strong> Replies</span>}
        {displayData.retweets !== undefined && displayData.retweets > 0 && <span><strong className="text-foreground">{fmt(displayData.retweets)}</strong> Reposts</span>}
        {displayData.likes !== undefined && displayData.likes > 0 && <span><strong className="text-foreground">{fmt(displayData.likes)}</strong> Likes</span>}
        {displayData.bookmarks !== undefined && displayData.bookmarks > 0 && <span><strong className="text-foreground">{fmt(displayData.bookmarks)}</strong> Bookmarks</span>}
        {showPostButton && onPost && (
          <button onClick={onPost} disabled={posting} className="ml-auto flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
            {posting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Post
          </button>
        )}
      </div>

      {resolvedReplies && resolvedReplies.length > 0 && (
        <div className="mt-4 border-t border-border pt-2 space-y-1">
          {resolvedReplies.map((reply, i) => (
            <TweetReplyNode key={reply.id || i} reply={reply} depth={1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface TweetThreadProps {
  tweets: TweetCardProps[]
  className?: string
}

export function TweetThread({ tweets, className }: TweetThreadProps) {
  return (
    <div className={cn('w-full max-w-[560px] space-y-1', className)}>
      {tweets.map((tweet, i) => (
        <div key={i} className={cn(i < tweets.length - 1 && 'border-l-2 border-border pl-4 ml-4')}>
          <TweetCard {...tweet} />
        </div>
      ))}
    </div>
  )
}

interface TwitterReplyPreviewProps {
  original?: TweetCardProps
  originalId?: string
  replyContent?: string
  replyId?: string
  replyHandle?: string
  replyName?: string
  onPost?: () => void
  showPostButton?: boolean
  className?: string
}

export function TwitterReplyPreview({ original, originalId, replyContent, replyId, replyHandle, replyName, onPost, showPostButton, className }: TwitterReplyPreviewProps) {
  return (
    <div className={cn('w-full max-w-[560px]', className)}>
      {originalId ? <TweetCard tweetId={originalId} /> : <TweetCard {...original} />}
      <div className="ml-6 mt-1 border-l-2 border-border pl-4">
        <div className="rounded-xl bg-muted/50 border border-border p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {replyId ? 'Reply' : `Proposed reply ${replyName ? `as ${replyName}` : ''}`}
            </span>
            {showPostButton && onPost && (
              <button onClick={onPost} className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                <Send className="size-3.5" />
                Send
              </button>
            )}
          </div>
          {replyId ? <TweetCard tweetId={replyId} /> : <p className="text-[14px] leading-5 text-foreground whitespace-pre-wrap">{replyContent}</p>}
        </div>
      </div>
    </div>
  )
}

export const ReplyPreview = TwitterReplyPreview
