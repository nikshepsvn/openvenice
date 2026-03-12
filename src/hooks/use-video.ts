import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { venice } from '../lib/venice-client'
import type { VideoQueueRequest, VideoQueueResponse, VideoRetrieveResponse } from '../types/venice'

export function useVideo() {
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
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
    mutationFn: (req: VideoQueueRequest) =>
      venice<VideoQueueResponse>('/video/queue', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: (data) => {
      requestIdRef.current = data.queue_id || data.id || ''
      setStatus('queued')
      setVideoUrl(null)
      setError(null)

      pollRef.current = setInterval(async () => {
        try {
          const result = await venice<VideoRetrieveResponse>('/video/retrieve', {
            method: 'POST',
            body: JSON.stringify({ id: requestIdRef.current }),
          })
          setStatus(result.status)
          if (result.status === 'completed' && result.video_url) {
            setVideoUrl(result.video_url)
            stopPolling()
          } else if (result.status === 'failed') {
            setError(result.error ?? 'Video generation failed')
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
    setVideoUrl(null)
    setError(null)
    requestIdRef.current = null
  }, [stopPolling])

  return {
    queue: queueMutation.mutate,
    isQueueing: queueMutation.isPending,
    status,
    videoUrl,
    error,
    reset,
  }
}
