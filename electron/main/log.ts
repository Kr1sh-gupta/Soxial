const PREFIX = '[soxial]'

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const
const currentLevel = (process.env.LOG_LEVEL || 'info') as keyof typeof levels

function log(level: keyof typeof levels, tag: string, msg: string, data?: any) {
  if (levels[level] < levels[currentLevel]) return
  const ts = new Date().toISOString().slice(11, 23)
  const prefix = `${PREFIX}[${tag}]`
  if (data !== undefined) {
    console[level === 'error' ? 'error' : 'log'](`${ts} ${prefix} ${msg}`, data)
  } else {
    console[level === 'error' ? 'error' : 'log'](`${ts} ${prefix} ${msg}`)
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: any) => log('debug', tag, msg, data),
  info: (tag: string, msg: string, data?: any) => log('info', tag, msg, data),
  warn: (tag: string, msg: string, data?: any) => log('warn', tag, msg, data),
  error: (tag: string, msg: string, data?: any) => log('error', tag, msg, data),
}
