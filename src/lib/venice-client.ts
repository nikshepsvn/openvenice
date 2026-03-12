import type { VeniceError } from '../types/venice'

const BASE_URL = '/venice/api/v1'

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
  const raw = localStorage.getItem('venice-auth')
  if (!raw) throw new VeniceAPIError('API key not set', 401)
  try {
    const parsed = JSON.parse(raw)
    const key = parsed?.state?.apiKey
    if (!key) throw new VeniceAPIError('API key not set', 401)
    return key
  } catch {
    throw new VeniceAPIError('API key not set', 401)
  }
}

export async function venice<T>(
  path: string,
  options: RequestInit & { stream?: boolean; noAuth?: boolean } = {},
): Promise<T> {
  const { stream, noAuth, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)

  if (!noAuth) {
    headers.set('Authorization', `Bearer ${getApiKey()}`)
  }
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    let code: string | undefined
    let suggestedPrompt: string | undefined
    try {
      const err = (await res.json()) as VeniceError
      errorMessage = err.error.message
      code = err.error.code
      suggestedPrompt = err.error.suggested_prompt
    } catch { /* use default */ }
    throw new VeniceAPIError(errorMessage, res.status, code, suggestedPrompt)
  }

  if (stream) {
    return res.body as unknown as T
  }

  return res.json() as Promise<T>
}

export async function veniceFormData<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const headers = new Headers({
    'Authorization': `Bearer ${getApiKey()}`,
  })

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as VeniceError
      errorMessage = err.error.message
    } catch { /* use default */ }
    throw new VeniceAPIError(errorMessage, res.status)
  }

  return res.json() as Promise<T>
}

export async function veniceBlob(
  path: string,
  body: object,
): Promise<Blob> {
  const headers = new Headers({
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  })

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as VeniceError
      errorMessage = err.error.message
    } catch { /* use default */ }
    throw new VeniceAPIError(errorMessage, res.status)
  }

  return res.blob()
}
