export type NormalizedQuestion = {
  id: string
  text: string
  type: 'single' | 'multi' | 'text'
  options?: string[]
}

const TYPE_TOKEN = '","type":"'
const OPTIONS_TOKEN = '","options":['

function stripQuestionNoise(text: string): string {
  return text
    .trim()
    .replace(/^[{"]+/, '')
    .replace(/[}"]+$/, '')
    .trim()
}

function normalizeOptions(raw: string): string[] | undefined {
  const cleaned = raw.trim().replace(/^\[/, '').replace(/\]$/, '')
  if (!cleaned) return undefined
  try {
    const parsed = JSON.parse(`[${cleaned}]`)
    if (Array.isArray(parsed)) {
      const values = parsed.filter((v): v is string => typeof v === 'string')
      return values.length > 0 ? values : undefined
    }
  } catch {
    return undefined
  }
  return undefined
}

function parseMalformedQuestion(rawText: string): Partial<NormalizedQuestion> | null {
  const typeIdx = rawText.indexOf(TYPE_TOKEN)
  if (typeIdx === -1) return null

  const optionsIdx = rawText.indexOf(OPTIONS_TOKEN, typeIdx + TYPE_TOKEN.length)
  if (optionsIdx === -1) return null

  const text = stripQuestionNoise(rawText.slice(0, typeIdx))
  const type = rawText
    .slice(typeIdx + TYPE_TOKEN.length, optionsIdx)
    .trim() as NormalizedQuestion['type']
  const optionsEnd = rawText.lastIndexOf(']')
  if (optionsEnd === -1 || optionsEnd <= optionsIdx) return { text, type }

  const optionsRaw = rawText
    .slice(optionsIdx + OPTIONS_TOKEN.length, optionsEnd)
    .trim()
  const options = normalizeOptions(optionsRaw)
  return { text, type, options }
}

export function normalizeQuestion<T extends NormalizedQuestion>(question: T): T {
  const rawText = (question.text || '').trim()
  if (!rawText) return question

  if (rawText.startsWith('{') && rawText.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawText)
      if (parsed && typeof parsed === 'object') {
        const text = typeof parsed.text === 'string' ? stripQuestionNoise(parsed.text) : question.text
        const type = parsed.type === 'single' || parsed.type === 'multi' || parsed.type === 'text'
          ? parsed.type
          : question.type
        const options = Array.isArray(parsed.options)
          ? parsed.options.filter((v: any): v is string => typeof v === 'string')
          : question.options
        return {
          ...question,
          text,
          type,
          options: options && options.length > 0 ? options : undefined,
        }
      }
    } catch {
      // fall through to fragment parsing
    }
  }

  const parsed = parseMalformedQuestion(rawText)
  if (!parsed) return question

  return {
    ...question,
    text: parsed.text || question.text,
    type: parsed.type || question.type,
    options: parsed.options || question.options,
  }
}
