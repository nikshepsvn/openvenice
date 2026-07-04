import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { venice, veniceFetch, VeniceAPIError } from '../lib/venice-client'
import type { MusicQueueRequest, MusicQueueResponse, MusicRetrieveResponse } from '../types/venice'

const POLL_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 120 // ~6 minutes

function isPermanentError(err: unknown): boolean {
  return err instanceof VeniceAPIError && err.status >= 400 && err.status < 500
}

export function useMusic() {
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const requestIdRef = useRef<string | null>(null)
  const modelRef = useRef<string | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const attemptsRef = useRef(0)
  const cancelledRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = undefined }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = undefined }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const startPolling = useCallback(() => {
    attemptsRef.current = 0
    startedAtRef.current = Date.now()
    setElapsedMs(0)

    tickRef.current = setInterval(() => {
      if (startedAtRef.current) setElapsedMs(Date.now() - startedAtRef.current)
    }, 1000)

    pollRef.current = setInterval(async () => {
      if (cancelledRef.current) return
      attemptsRef.current += 1
      if (attemptsRef.current > MAX_ATTEMPTS) {
        stopPolling()
        setError('Generation took too long. Cancel and try again.')
        setStatus('failed')
        return
      }
      try {
        // /audio/retrieve returns one of two things:
        //  - JSON {status:"PROCESSING"} while still processing
        //  - binary audio body (audio/mpeg, etc.) once complete
        // Branch on Content-Type rather than calling res.json()
        // unconditionally, which breaks on the binary case.
        const res = await veniceFetch('/audio/retrieve', {
          method: 'POST',
          body: JSON.stringify({ model: modelRef.current, queue_id: requestIdRef.current }),
        })
        const contentType = res.headers.get('content-type') ?? ''

        if (contentType.startsWith('audio/')) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          audioUrlRef.current = url
          setAudioUrl(url)
          setStatus('completed')
          stopPolling()
          return
        }

        const result = (await res.json()) as MusicRetrieveResponse
        const s = result.status.toLowerCase() as 'queued' | 'processing' | 'completed' | 'failed'
        setStatus(s)
        if (s === 'completed' && result.audio_url) {
          audioUrlRef.current = result.audio_url
          setAudioUrl(result.audio_url)
          stopPolling()
        } else if (s === 'failed') {
          setError(result.error ?? 'Music generation failed')
          stopPolling()
        }
      } catch (err) {
        // Permanent client errors (e.g. 400 "Model is required") must not be
        // retried for minutes — surface them immediately.
        if (isPermanentError(err)) {
          stopPolling()
          setError(err instanceof Error ? err.message : 'Polling failed')
          setStatus('failed')
          return
        }
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setError(err instanceof Error ? err.message : 'Polling failed')
          stopPolling()
        }
      }
    }, POLL_INTERVAL_MS)
  }, [stopPolling])

  const queueMutation = useMutation({
    mutationFn: (req: MusicQueueRequest) =>
      venice<MusicQueueResponse>('/audio/queue', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: (data) => {
      cancelledRef.current = false
      modelRef.current = data.model
      requestIdRef.current = data.queue_id
      setStatus('queued')
      setAudioUrl(null)
      audioUrlRef.current = null
      setError(null)
      startPolling()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Queue failed')
      setStatus('failed')
    },
  })

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stopPolling()
    setStatus('idle')
    setError(null)
    requestIdRef.current = null
    modelRef.current = null
    startedAtRef.current = null
    setElapsedMs(0)
    if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrlRef.current)
    }
    audioUrlRef.current = null
  }, [stopPolling])

  const reset = useCallback(() => {
    cancel()
    setAudioUrl(null)
  }, [cancel])

  return {
    queue: queueMutation.mutate,
    isQueueing: queueMutation.isPending,
    status,
    audioUrl,
    error,
    elapsedMs,
    cancel,
    reset,
  }
}
