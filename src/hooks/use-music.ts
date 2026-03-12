import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { venice } from '../lib/venice-client'
import type { MusicQueueRequest, MusicQueueResponse, MusicRetrieveResponse } from '../types/venice'

export function useMusic() {
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const requestIdRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = undefined
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const queueMutation = useMutation({
    mutationFn: (req: MusicQueueRequest) =>
      venice<MusicQueueResponse>('/audio/queue', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: (data) => {
      requestIdRef.current = data.queue_id
      setStatus('queued')
      setAudioUrl(null)
      setError(null)

      pollRef.current = setInterval(async () => {
        try {
          const result = await venice<MusicRetrieveResponse>('/audio/retrieve', {
            method: 'POST',
            body: JSON.stringify({ id: requestIdRef.current }),
          })
          const s = result.status.toLowerCase() as 'queued' | 'processing' | 'completed' | 'failed'
          setStatus(s)
          if (s === 'completed' && result.audio_url) {
            setAudioUrl(result.audio_url)
            stopPolling()
          } else if (s === 'failed') {
            setError(result.error ?? 'Music generation failed')
            stopPolling()
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Polling failed')
          stopPolling()
        }
      }, 3000)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Queue failed')
      setStatus('failed')
    },
  })

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setAudioUrl(null)
    setError(null)
    requestIdRef.current = null
  }, [stopPolling])

  return {
    queue: queueMutation.mutate,
    isQueueing: queueMutation.isPending,
    status,
    audioUrl,
    error,
    reset,
  }
}
