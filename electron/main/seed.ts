import type Database from 'better-sqlite3'

export function seedDatabase(db: Database.Database) {
  seedHooks(db)
  seedVoiceRules(db)
  seedAlgorithmRules(db)
  seedContentPillars(db)
}

function seedHooks(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM hooks').get() as any).c
  if (count > 0) return

  const hooks = [
    { rank: 1, category: 'showcase', name: 'Authority Anchor', description: 'Tag or reference the official creator of a tool, brand, or concept with a high-level technical opinion.', why_it_works: 'Bypasses low follower reach by appearing in the brand\'s "Engaged" feed. Instant credibility through association.', template: '"Hot take: [TOOL] is not a [common label]. It\'s a [reframed label]."' },
    { rank: 2, category: 'showcase', name: 'Negative Parallel', description: 'Call out a bad practice, then present the solution.', why_it_works: 'Negativity bias stops the scroll. The fix creates a knowledge gap that drives bookmarks.', template: '"Stop doing [bad practice]. Here\'s what experts do instead:"' },
    { rank: 3, category: 'showcase', name: 'Knowledge Gap', description: 'Tease expertise the reader does not have.', why_it_works: 'Curiosity gap drives thread expansion and session depth.', template: '"90% of professionals get [thing] wrong. Here\'s proof:"' },
    { rank: 4, category: 'showcase', name: 'Contrarian Take', description: 'Challenge conventional wisdom or share a relatable unpopular struggle.', why_it_works: 'Sparks debate, reply velocity, and the Author-Engaged Reply multiplier.', template: '"Unpopular opinion: [contrarian view]."' },
    { rank: 5, category: 'showcase', name: 'Showcase Reveal', description: 'Build tension around a visual showcase or achievement.', why_it_works: 'Media dwell time and technical specificity drive bookmarks.', template: '"This took me [time] to get right. Here\'s what I learned:"' },
    { rank: 6, category: 'showcase', name: 'Social Proof Drop', description: 'Lead with numbers and milestones.', why_it_works: 'Concrete numbers equal credibility. Questions drive replies.', template: '"Just hit [metric]. Here\'s what I learned about [topic]:"' },
    { rank: 7, category: 'community', name: 'Community Bait', description: 'Ask a question that is impossible to scroll past.', why_it_works: 'Low barrier to reply drives massive algorithmic boost.', template: '"What\'s the one [tool/technique] you can\'t live without?"' },
    { rank: 8, category: 'community', name: 'Debate Bomb', description: 'Drop a deliberately arguable statement to create comment wars.', why_it_works: 'Controversy drives reply velocity, algorithm sees important conversation.', template: '"[Group A] can become [Group B]. But [Group B] can never become [Group A]."' },
    { rank: 9, category: 'community', name: 'Trend Jacker', description: 'Ride a viral format by adapting it to your niche.', why_it_works: 'Pre-validated engagement patterns with your unique angle.', template: 'Adapt whatever is trending to your niche.' },
    { rank: 10, category: 'community', name: 'Spotlight Generosity', description: 'Share someone else\'s great work with your commentary.', why_it_works: 'Builds goodwill, spotlighted person engages, their audience sees you.', template: '"[Person] just shipped [thing] and it\'s genuinely impressive. Here\'s what I noticed:"' }
  ]

  const stmt = db.prepare('INSERT INTO hooks (rank, category, name, description, why_it_works, template) VALUES (@rank, @category, @name, @description, @why_it_works, @template)')
  for (const h of hooks) stmt.run(h)
}

function seedVoiceRules(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM voice_rules').get() as any).c
  if (count > 0) return

  const bannedPhrases = [
    'Great take!', 'This is fire', 'Love this!', 'Couldn\'t agree more',
    'This resonates with me', 'Spot on!', 'This hits different',
    'Here\'s the thing though...', 'Let me break this down',
    'As someone who...', 'I\'ve been saying this for years',
    'Absolutely!', 'Totally agree!', '100% this',
    'This is incredibly...', 'This is genuinely...',
    'I\'d love to see...', 'Would love to connect',
    'Thanks for sharing this!', 'Nailed it!', 'Chef\'s kiss',
    'Not gonna lie', 'Here\'s my two cents', 'Just stumbled upon this',
    'This is a game-changer', 'Super insightful', 'This is everything',
    'Couldn\'t have said it better myself'
  ]

  const bannedStructures = [
    'Numbered lists in replies (except Reddit long-form)',
    'Perfect grammar and punctuation throughout',
    'Intro -> Body -> Conclusion structure',
    'More than 1 emoji per reply (except Instagram)',
    'Mirroring the original poster\'s exact phrase structure',
    'Em dash abuse (more than once per reply)',
    'Compliment sandwich technique',
    'Semicolons in casual replies',
    'Parenthetical asides in every reply',
    'Overly balanced "on one hand... on the other hand"'
  ]

  const naturalElements = [
    'Natural contractions: gonna, don\'t, it\'s, can\'t',
    'Occasional lowercase starts',
    'Variable sentence length',
    'Direct questions without preamble',
    'Whitespace-heavy formatting',
    'Unpolished grammar when casual',
    'Blunt honesty without diplomatic hedging',
    'Personal anecdotes dropped casually',
    'Direct @mention tagging without Hey/Hi prefix'
  ]

  const stmt = db.prepare('INSERT INTO voice_rules (type, content) VALUES (@type, @content)')

  for (const p of bannedPhrases) stmt.run({ type: 'banned_phrase', content: p })
  for (const s of bannedStructures) stmt.run({ type: 'banned_structure', content: s })
  for (const n of naturalElements) stmt.run({ type: 'natural_element', content: n })
}

function seedAlgorithmRules(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM algorithm_rules').get() as any).c
  if (count > 0) return

  const rules = [
    { platform: 'twitter', signal: 'Author-Engaged Reply', weight: 'Exponential', description: 'Author replies back to someone who replied. Cascading reach.' },
    { platform: 'twitter', signal: 'Bookmark', weight: 'High', description: 'User saves it. Knowledge Node signal, high utility content.' },
    { platform: 'twitter', signal: 'Thread Expansion', weight: 'High', description: 'User clicks to read full thread. Session depth.' },
    { platform: 'twitter', signal: 'Substantive Reply', weight: 'Moderate-High', description: 'Reply with real content. Conversation signal.' },
    { platform: 'twitter', signal: 'Repost', weight: 'Moderate', description: 'Shares to followers. Out-of-network discovery.' },
    { platform: 'twitter', signal: 'Dwell Time (>3s)', weight: 'Moderate', description: 'User paused scrolling. Scroll-stopper worked.' },
    { platform: 'twitter', signal: 'Like', weight: 'Baseline (1x)', description: 'Necessary but not sufficient for reach.' },
    { platform: 'reddit', signal: 'Upvote Ratio', weight: 'Highest', description: 'Ratio of upvotes to total votes. Quality signal.' },
    { platform: 'reddit', signal: 'Early Upvotes', weight: 'Very High', description: 'First 10 upvotes matter as much as next 100.' },
    { platform: 'reddit', signal: 'Comment Count', weight: 'High', description: 'More comments = higher visibility.' },
    { platform: 'reddit', signal: 'Subreddit Fit', weight: 'Critical', description: 'Posts must match subreddit culture. Off-topic = downvotes.' },
    { platform: 'reddit', signal: 'Time Decay', weight: 'Progressive', description: 'Newer posts rise faster. Old posts decay.' }
  ]

  const stmt = db.prepare('INSERT INTO algorithm_rules (platform, signal, weight, description) VALUES (@platform, @signal, @weight, @description)')
  for (const r of rules) stmt.run(r)
}

function seedContentPillars(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM content_pillars').get() as any).c
  if (count > 0) return

  const pillars = [
    { name: 'Portfolio Piece', description: 'Short demos, screen recordings, screenshots, or case studies of the user\'s work.', frequency: '2-3x/week', structure: 'HOOK -> WHAT -> HOW -> SECRET -> QUESTION' },
    { name: 'Deep Dive', description: 'Threads or long-form posts explaining the WHY behind decisions.', frequency: '1-2x/week', structure: 'Hook + promise -> problem -> solution -> proof -> takeaway + CTA' },
    { name: 'Process Reveal', description: 'Show HOW you work — tools, workflow, decision-making process.', frequency: '1x/week', structure: 'Polarizing hook -> common way vs your way -> insight -> question' },
    { name: 'Social Proof Drop', description: 'Leverage stats, milestones, and achievements as content.', frequency: '1x/week', structure: 'Milestone -> context -> lesson -> list -> question' }
  ]

  const stmt = db.prepare('INSERT INTO content_pillars (name, description, frequency, structure) VALUES (@name, @description, @frequency, @structure)')
  for (const p of pillars) stmt.run(p)
}
