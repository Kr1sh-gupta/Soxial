import { describe, expect, it, vi } from 'vitest'
import {
  CredentialProbe,
  ProviderVerificationResult,
  classifyProviderProbeError,
  summarizeVerification,
  verifyCredential,
  zhipuBaseUrl,
} from '../electron/main/provider-verification'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/soxial-test' },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (buffer: Buffer) => buffer.toString(),
  },
}))

const okProbe: CredentialProbe = async () => {}
const failingProbe = (error: unknown): CredentialProbe => async () => { throw error }

describe('provider error classification', () => {
  it('treats 401/403 and rejected-key messages as invalid credentials', () => {
    for (const error of [
      { status: 401, message: 'unauthorized' },
      { status: 403, message: 'permission denied' },
      { message: 'API key not valid. Please pass a valid API key.' },
      { error: { status: 'PERMISSION_DENIED', message: 'denied' } },
    ]) {
      const result = classifyProviderProbeError(error)
      expect(result.code, JSON.stringify(error)).toBe('INVALID_CREDENTIALS')
      expect(result.valid).toBe(false)
    }
  })

  it('treats a rate-limited key as authenticated and usable', () => {
    for (const error of [
      { status: 429, message: 'too many requests' },
      { message: 'quota exceeded for this project' },
      { error: { status: 'RESOURCE_EXHAUSTED' } },
    ]) {
      const result = classifyProviderProbeError(error)
      expect(result.code, JSON.stringify(error)).toBe('RATE_LIMITED')
      expect(result.valid).toBe(true)
    }
  })

  it('distinguishes network failure from an invalid key', () => {
    const result = classifyProviderProbeError(new Error('fetch failed'))
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.valid).toBe(false)
    expect(result.message).not.toContain('rejected')
  })

  it('treats a missing model as an authenticated key', () => {
    const result = classifyProviderProbeError({ status: 404, message: 'model not found' })
    expect(result.code).toBe('MODEL_UNAVAILABLE')
    expect(result.valid).toBe(true)
  })

  it('falls back to a non-committal unknown error', () => {
    const result = classifyProviderProbeError(new Error('something strange happened'))
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.valid).toBe(false)
  })
})

describe('credential verification', () => {
  it('verifies a working Google key', async () => {
    const result = await verifyCredential({ provider: 'google', slot: 'primary' }, 'AIza-secret-key', { probe: okProbe })
    expect(result).toMatchObject({ provider: 'google', slot: 'primary', valid: true, code: 'VALID' })
  })

  it('verifies a working Z.AI key and selects the coding-plan endpoint', async () => {
    const seen: Array<{ provider: string; codingPlan?: boolean }> = []
    const probe: CredentialProbe = async (provider, _key, codingPlan) => { seen.push({ provider, codingPlan }) }

    await verifyCredential({ provider: 'zhipu', slot: 'primary' }, 'zhipu-secret', { probe, codingPlan: true })

    expect(seen).toEqual([{ provider: 'zhipu', codingPlan: true }])
    expect(zhipuBaseUrl(true)).toBe('https://api.z.ai/api/coding/paas/v4')
    expect(zhipuBaseUrl(false)).toBe('https://api.z.ai/api/paas/v4')
  })

  it('rejects an empty key without probing the provider', async () => {
    const probe = vi.fn(okProbe)
    const result = await verifyCredential({ provider: 'google', slot: 'primary' }, '   ', { probe })
    expect(result.valid).toBe(false)
    expect(result.code).toBe('INVALID_CREDENTIALS')
    expect(probe).not.toHaveBeenCalled()
  })

  it('never returns the raw key, only a masked suffix', async () => {
    const secret = 'AIzaSyVERYSECRETVALUE123'
    const result = await verifyCredential({ provider: 'google', slot: 'primary' }, secret, { probe: okProbe })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain(secret)
    expect(result.masked).not.toBe(secret)
  })

  it('does not leak the key when the provider rejects it', async () => {
    const secret = 'AIzaSyREJECTEDKEY456'
    const result = await verifyCredential(
      { provider: 'google', slot: 'primary' },
      secret,
      { probe: failingProbe({ status: 401, message: `invalid api key ${secret}` }) },
    )

    expect(result.valid).toBe(false)
    expect(JSON.stringify(result)).not.toContain(secret)
  })
})

describe('verification summary', () => {
  const result = (overrides: Partial<ProviderVerificationResult>): ProviderVerificationResult => ({
    provider: 'google',
    slot: 'primary',
    valid: true,
    code: 'VALID',
    message: 'Key verified.',
    masked: '…1234',
    ...overrides,
  })

  it('requires at least one key', () => {
    expect(summarizeVerification([])).toMatchObject({ ok: false })
  })

  it('passes when the entered key is valid', () => {
    expect(summarizeVerification([result({})]).ok).toBe(true)
  })

  it('passes when the key is valid but rate limited', () => {
    expect(summarizeVerification([result({ valid: true, code: 'RATE_LIMITED' })]).ok).toBe(true)
  })

  it('blocks when a newly entered key was rejected', () => {
    const summary = summarizeVerification([
      result({ valid: false, code: 'INVALID_CREDENTIALS', message: 'This API key was rejected by the provider.' }),
    ])
    expect(summary.ok).toBe(false)
    expect(summary.message).toContain('rejected')
  })

  it('blocks a mixed batch so a bad new key is never silently dropped', () => {
    const summary = summarizeVerification([
      result({ slot: 'primary', valid: true }),
      result({ slot: 'additional', index: 0, valid: false, code: 'INVALID_CREDENTIALS', message: 'Backup key rejected.' }),
    ])
    expect(summary.ok).toBe(false)
    expect(summary.message).toBe('Backup key rejected.')
  })

  it('blocks on network failure rather than assuming the key is good', () => {
    const summary = summarizeVerification([
      result({ valid: false, code: 'NETWORK_ERROR', message: 'Could not reach the provider.' }),
    ])
    expect(summary.ok).toBe(false)
  })

  it('still passes when only a stored key fails but an entered key works', () => {
    const summary = summarizeVerification([
      result({ slot: 'primary', valid: true }),
      result({ slot: 'stored', id: 7, valid: false, code: 'UNKNOWN_ERROR', message: 'Stored key failed.' }),
    ])
    expect(summary.ok).toBe(true)
  })
})
