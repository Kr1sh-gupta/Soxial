// ponytail: SWR cache for ID-based post lookups. 2-week TTL, localStorage-backed.
// Fresh → instant display, zero API calls. Stale → instant display + background refresh.

const TTL = 14 * 24 * 60 * 60 * 1000

export function getCachedPost(key: string): { data: any, isStale: boolean } | null {
  try {
    const raw = localStorage.getItem(`pc:${key}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    return { data, isStale: Date.now() - ts > TTL }
  } catch { return null }
}

export function cachePost(key: string, data: any) {
  try {
    localStorage.setItem(`pc:${key}`, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* localStorage full — skip */ }
}
