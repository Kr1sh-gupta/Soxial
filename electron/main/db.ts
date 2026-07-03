import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { seedDatabase } from './seed'
import { logger } from './log'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'soxial.db')
  logger.info('db', `opening database: ${dbPath}`)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  seedDatabase(db)

  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      twitter_handle TEXT,
      reddit_username TEXT,
      timezone TEXT,
      has_premium INTEGER DEFAULT 0,
      niche TEXT,
      specialization TEXT,
      superpower TEXT,
      primary_goal TEXT,
      target_audience TEXT,
      voice_description TEXT,
      avoid_words TEXT,
      brand_primary_color TEXT DEFAULT '#3b82f6',
      brand_secondary_color TEXT DEFAULT '#1c1c1c',
      brand_accent_color TEXT DEFAULT '#60a5fa',
      style_preset TEXT DEFAULT 'Modern Clean',
      zai_api_key TEXT,
      gemini_api_key TEXT,
      openai_api_key TEXT,
      onboarding_complete INTEGER DEFAULT 0,
      branding_strategy TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      platform TEXT,
      title TEXT,
      content TEXT,
      data_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rank INTEGER NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      why_it_works TEXT,
      template TEXT,
      niche_examples TEXT,
      performance_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voice_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS algorithm_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      signal TEXT NOT NULL,
      weight TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS content_pillars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      structure TEXT,
      frequency TEXT,
      platform_adaptations TEXT
    );

    CREATE TABLE IF NOT EXISTS target_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      tier TEXT,
      why TEXT,
      strategy TEXT
    );

    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      type TEXT,
      text TEXT,
      media_path TEXT,
      hashtags TEXT,
      first_reply TEXT,
      scheduled_time TEXT,
      status TEXT DEFAULT 'draft',
      result_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_name TEXT,
      tool_args TEXT,
      tool_result TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT 'New Chat',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      attachments_json TEXT, -- TODO: move large attachments to file-backed storage if DB size becomes an issue
      reasoning TEXT,
      tool_calls_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS growth_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      metric TEXT NOT NULL,
      value TEXT,
      note TEXT,
      recorded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quick_actions (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      suggestions TEXT NOT NULL,
      generated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      content_type TEXT NOT NULL,
      external_id TEXT NOT NULL,
      author_handle TEXT,
      subreddit TEXT,
      title TEXT,
      text TEXT,
      metrics_json TEXT,
      data_json TEXT NOT NULL,
      posted_at TEXT,
      fetched_at TEXT DEFAULT (datetime('now')),
      UNIQUE(platform, content_type, external_id)
    );

    CREATE INDEX IF NOT EXISTS idx_social_content_platform_type
      ON social_content(platform, content_type, posted_at DESC);
  `)

  // Migration: add context_summary if missing
  const cols = db.pragma('table_info(chat_sessions)') as any[]
  if (!cols.some((c: any) => c.name === 'context_summary')) {
    db.exec('ALTER TABLE chat_sessions ADD COLUMN context_summary TEXT')
  }

  // Migration: persist chat attachments for image-augmented messages
  const messageCols = db.pragma('table_info(chat_messages)') as any[]
  if (!messageCols.some((c: any) => c.name === 'attachments_json')) {
    db.exec('ALTER TABLE chat_messages ADD COLUMN attachments_json TEXT')
  }

  // Migration: add puter_token if missing
  const profileCols = db.pragma('table_info(user_profile)') as any[]
  if (!profileCols.some((c: any) => c.name === 'puter_token')) {
    db.exec('ALTER TABLE user_profile ADD COLUMN puter_token TEXT')
  }

  // Migration: add growth_strategy if missing
  if (!profileCols.some((c: any) => c.name === 'growth_strategy')) {
    db.exec('ALTER TABLE user_profile ADD COLUMN growth_strategy TEXT')
  }

  const MISSING_COLS = ['tools_stack', 'monetization_goals', 'growth_target', 'portfolio_status', 'tone_balance', 'branding_strategy']
  for (const col of MISSING_COLS) {
    if (!profileCols.some((c: any) => c.name === col)) {
      db.exec(`ALTER TABLE user_profile ADD COLUMN ${col} TEXT`)
    }
  }
}

export function getProfile() {
  return getDb().prepare('SELECT * FROM user_profile WHERE id = 1').get() as any
}

export function updateProfile(data: Record<string, any>) {
  const db = getDb()
  const existing = db.prepare('SELECT COUNT(*) as c FROM user_profile WHERE id = 1').get() as any
  if (existing.c === 0) {
    db.prepare('INSERT INTO user_profile (id) VALUES (1)').run()
  }
  const keys = Object.keys(data).filter(k => data[k] !== undefined)
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  if (sets) {
    db.prepare(`UPDATE user_profile SET ${sets} WHERE id = 1`).run(data)
  }
  return getProfile()
}

export function queryAll(table: string, where?: string, params?: any[]) {
  const sql = where ? `SELECT * FROM ${table} WHERE ${where}` : `SELECT * FROM ${table}`
  return getDb().prepare(sql).all(...(params || []))
}

export function insertRow(table: string, data: Record<string, any>) {
  const keys = Object.keys(data)
  const placeholders = keys.map(k => `@${k}`).join(', ')
  const columns = keys.join(', ')
  const result = getDb().prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`).run(data)
  return result.lastInsertRowid
}

export function createChatSession(title?: string) {
  const db = getDb()
  const result = db.prepare('INSERT INTO chat_sessions (title) VALUES (?)').run(title || 'New Chat')
  return result.lastInsertRowid
}

export function getChatSessions() {
  return getDb().prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as msg_count
    FROM chat_sessions s ORDER BY s.updated_at DESC
  `).all()
}

export function getChatMessages(sessionId: number) {
  return getDb().prepare(`
    SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC
  `).all(sessionId)
}

export function addChatMessage(
  sessionId: number,
  role: string,
  content: string,
  reasoning?: string,
  toolCallsJson?: string,
  attachmentsJson?: string,
) {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO chat_messages (session_id, role, content, attachments_json, reasoning, tool_calls_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, role, content, attachmentsJson || null, reasoning || null, toolCallsJson || null)
  db.prepare('UPDATE chat_sessions SET updated_at = datetime(\'now\') WHERE id = ?').run(sessionId)
  return result.lastInsertRowid
}

export function updateChatSessionTitle(id: number, title: string) {
  getDb().prepare('UPDATE chat_sessions SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, id)
}

export function getChatSessionContextSummary(sessionId: number): string | null {
  const row = getDb().prepare('SELECT context_summary FROM chat_sessions WHERE id = ?').get(sessionId) as any
  return row?.context_summary || null
}

export function updateChatSessionContextSummary(sessionId: number, summary: string) {
  getDb().prepare('UPDATE chat_sessions SET context_summary = ?, updated_at = datetime(\'now\') WHERE id = ?').run(summary, sessionId)
}

export function deleteChatSession(id: number) {
  getDb().prepare('DELETE FROM chat_messages WHERE session_id = ?').run(id)
  getDb().prepare('DELETE FROM chat_sessions WHERE id = ?').run(id)
}

export function getQuickActions(): { suggestions: string[]; generated_at: string } | null {
  const row = getDb().prepare('SELECT suggestions, generated_at FROM quick_actions WHERE id = 1').get() as any
  if (!row) return null
  try {
    return { suggestions: JSON.parse(row.suggestions), generated_at: row.generated_at }
  } catch {
    return null
  }
}

export function setQuickActions(suggestions: string[]) {
  const db = getDb()
  const json = JSON.stringify(suggestions)
  db.prepare(`INSERT INTO quick_actions (id, suggestions, generated_at) VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET suggestions = excluded.suggestions, generated_at = excluded.generated_at`).run(json)
}

export function getQuickActionsContext(): string {
  const profile = getDb().prepare('SELECT * FROM user_profile WHERE id = 1').get() as any
  const hooks = getDb().prepare('SELECT name, category, description FROM hooks ORDER BY rank LIMIT 6').all() as any[]
  const pillars = getDb().prepare('SELECT name, description, structure FROM content_pillars LIMIT 4').all() as any[]
  const voice = getDb().prepare('SELECT type, content FROM voice_rules LIMIT 8').all() as any[]
  const targets = getDb().prepare('SELECT platform, handle, tier, strategy FROM target_accounts LIMIT 6').all() as any[]
  const memory = getDb().prepare('SELECT type, title, content FROM memory_entries ORDER BY created_at DESC LIMIT 5').all() as any[]
  const scheduled = getDb().prepare('SELECT COUNT(*) as count FROM scheduled_posts WHERE status = \'draft\'').get() as any
  const lines: string[] = []
  if (profile?.name) lines.push(`User: ${profile.name}`)
  if (profile?.niche) lines.push(`Niche: ${profile.niche}`)
  if (profile?.specialization) lines.push(`Specialization: ${profile.specialization}`)
  if (profile?.voice_description) lines.push(`Voice: ${profile.voice_description}`)
  if (profile?.primary_goal) lines.push(`Goal: ${profile.primary_goal}`)
  if (profile?.target_audience) lines.push(`Target audience: ${profile.target_audience}`)
  if (profile?.twitter_handle) lines.push(`Twitter: ${profile.twitter_handle}`)
  if (profile?.reddit_username) lines.push(`Reddit: ${profile.reddit_username}`)
  if (hooks.length > 0) lines.push(`Hooks: ${hooks.map(h => `${h.name} (${h.category})`).join(', ')}`)
  if (pillars.length > 0) lines.push(`Content pillars: ${pillars.map(p => p.name).join(', ')}`)
  if (voice.length > 0) lines.push(`Voice rules: ${voice.map(v => `${v.type}: ${v.content.slice(0, 60)}`).join(' | ')}`)
  if (targets.length > 0) lines.push(`Target accounts: ${targets.map(t => `${t.platform}/${t.handle} (${t.tier || 'no tier'})`).join(', ')}`)
  if (memory.length > 0) lines.push(`Recent memories: ${memory.map(m => m.title || m.content?.slice(0, 60)).join(' | ')}`)
  if (scheduled?.count > 0) lines.push(`Draft posts pending: ${scheduled.count}`)
  return lines.length > 0 ? lines.join('\n') : 'New user — no profile data yet.'
}

export interface SocialContentRow {
  platform: string
  content_type: string
  external_id: string
  author_handle?: string | null
  subreddit?: string | null
  title?: string | null
  text?: string | null
  metrics_json?: string | null
  data_json: string
  posted_at?: string | null
}

export function upsertSocialContent(items: SocialContentRow[]): { inserted: number; updated: number } {
  if (items.length === 0) return { inserted: 0, updated: 0 }
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO social_content (
      platform, content_type, external_id, author_handle, subreddit, title, text, metrics_json, data_json, posted_at, fetched_at
    ) VALUES (
      @platform, @content_type, @external_id, @author_handle, @subreddit, @title, @text, @metrics_json, @data_json, @posted_at, datetime('now')
    )
    ON CONFLICT(platform, content_type, external_id) DO UPDATE SET
      author_handle = excluded.author_handle,
      subreddit = excluded.subreddit,
      title = excluded.title,
      text = excluded.text,
      metrics_json = excluded.metrics_json,
      data_json = excluded.data_json,
      posted_at = excluded.posted_at,
      fetched_at = datetime('now')
  `)
  let inserted = 0
  let updated = 0
  const check = db.prepare(
    'SELECT id FROM social_content WHERE platform = ? AND content_type = ? AND external_id = ?'
  )
  const tx = db.transaction((rows: SocialContentRow[]) => {
    for (const row of rows) {
      const existed = check.get(row.platform, row.content_type, row.external_id)
      stmt.run(row)
      if (existed) updated++
      else inserted++
    }
  })
  tx(items)
  return { inserted, updated }
}

export function getSocialContent(options: {
  platform?: string
  content_type?: string
  author_handle?: string
  subreddit?: string
  limit?: number
  include_raw?: boolean
}) {
  const limit = Math.min(options.limit || 50, 200)
  const cols = options.include_raw
    ? 'id, platform, content_type, external_id, author_handle, subreddit, title, text, metrics_json, data_json, posted_at, fetched_at'
    : 'id, platform, content_type, external_id, author_handle, subreddit, title, text, metrics_json, posted_at, fetched_at'
  let sql = `SELECT ${cols} FROM social_content WHERE 1=1`
  const params: any[] = []
  if (options.platform) { sql += ' AND platform = ?'; params.push(options.platform) }
  if (options.content_type) { sql += ' AND content_type = ?'; params.push(options.content_type) }
  if (options.author_handle) {
    sql += ' AND author_handle = ?'
    params.push(options.author_handle.replace(/^@/, ''))
  }
  if (options.subreddit) {
    sql += ' AND subreddit = ?'
    params.push(options.subreddit.replace(/^r\//, ''))
  }
  sql += ' ORDER BY datetime(COALESCE(posted_at, fetched_at)) DESC, id DESC'
  sql += ` LIMIT ${limit}`
  const rows = getDb().prepare(sql).all(...params) as any[]
  return rows.map(row => {
    const out: Record<string, any> = {
      id: row.id,
      platform: row.platform,
      content_type: row.content_type,
      external_id: row.external_id,
      author_handle: row.author_handle,
      subreddit: row.subreddit,
      title: row.title,
      text: row.text,
      posted_at: row.posted_at,
      fetched_at: row.fetched_at,
      metrics: row.metrics_json ? JSON.parse(row.metrics_json) : null,
    }
    if (options.include_raw && row.data_json) {
      try { out.raw = JSON.parse(row.data_json) } catch { out.raw = row.data_json }
    }
    return out
  })
}

export function countSocialContent(options?: { platform?: string; content_type?: string }) {
  let sql = 'SELECT platform, content_type, COUNT(*) as count FROM social_content WHERE 1=1'
  const params: any[] = []
  if (options?.platform) { sql += ' AND platform = ?'; params.push(options.platform) }
  if (options?.content_type) { sql += ' AND content_type = ?'; params.push(options.content_type) }
  sql += ' GROUP BY platform, content_type ORDER BY platform, content_type'
  return getDb().prepare(sql).all(...params)
}
