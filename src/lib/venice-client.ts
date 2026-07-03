import type { VeniceError } from '../types/venice'
import { useAuthStore } from '../stores/auth-store'

const ENV_BASE = (import.meta.env.VITE_VENICE_BASE_URL as string | undefined)?.replace(/\/$/, '')
export const BASE_URL = ENV_BASE || (import.meta.env.DEV ? '/venice/api/v1' : 'https://api.venice.ai/api/v1')

const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 2

export class VeniceAPIError extends Error {
  status: number
  code?: string
  suggestedPrompt?: string

  constructor(message: string, status: number, code?: string, suggestedPrompt?: string) {
    super(message)
    this.name = 'VeniceAPIError'
    this.status = status
    this.code = code
    this.suggestedPrompt = suggestedPrompt
  }
}

function getApiKey(): string {
  const key = useAuthStore.getState().apiKey
  if (!key) throw new VeniceAPIError('API key not set. Click "API Key" in the header to connect.', 401)
  return key
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function backoffDelay(attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const secs = Number(retryAfter)
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, 30_000)
  }
  // Exponential backoff with jitter: 500, 1000, 2000 ms (+/- 25%)
  const base = 500 * 2 ** attempt
  return base + Math.random() * base * 0.25
}

async function parseError(res: Response): Promise<VeniceAPIError> {
  let message = `HTTP ${res.status}`
  let code: string | undefined
  let suggestedPrompt: string | undefined
  try {
    const err = (await res.json()) as VeniceError
    message = err.error?.message ?? message
    code = err.error?.code
    suggestedPrompt = err.error?.suggested_prompt
  } catch {
    /* keep default */
  }
  return new VeniceAPIError(message, res.status, code, suggestedPrompt)
}

interface VeniceFetchOptions extends RequestInit {
  stream?: boolean
  noAuth?: boolean
  retries?: number
}

async function veniceFetch(path: string, options: VeniceFetchOptions): Promise<Response> {
  const { stream, noAuth, retries = MAX_RETRIES, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)
  if (!noAuth) headers.set('Authorization', `Bearer ${getApiKey()}`)
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers })
      if (res.ok) return res

      // Don't retry client errors (auth, validation) or terminal failures
      if (!RETRY_STATUSES.has(res.status) || attempt === retries) throw await parseError(res)

      // Drain body so connection can be reused
      try { await res.arrayBuffer() } catch { /* noop */ }
      await sleep(backoffDelay(attempt, res.headers.get('Retry-After')))
      continue
    } catch (err) {
      lastErr = err
      // Network error: retry up to limit
      if (err instanceof VeniceAPIError) throw err
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      if (attempt === retries) break
      await sleep(backoffDelay(attempt))
    }
    void stream // suppress unused-var lint (kept for future per-call overrides)
  }
  throw lastErr instanceof Error ? lastErr : new VeniceAPIError('Network error', 0)
}

export async function venice<T>(path: string, options: VeniceFetchOptions = {}): Promise<T> {
  const res = await veniceFetch(path, options)
  if (options.stream) return res.body as unknown as T
  return res.json() as Promise<T>
}

export async function veniceFormData<T>(path: string, formData: FormData, init: { signal?: AbortSignal } = {}): Promise<T> {
  const res = await veniceFetch(path, {
    method: 'POST',
    body: formData,
    signal: init.signal,
  })
  return res.json() as Promise<T>
}

export async function veniceBlob(path: string, body: object, init: { signal?: AbortSignal } = {}): Promise<Blob> {
  const res = await veniceFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: init.signal,
  })
  return res.blob()
}
