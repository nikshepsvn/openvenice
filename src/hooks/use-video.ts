import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { venice, veniceFetch, VeniceAPIError } from '../lib/venice-client'
import type { VideoQueueRequest, VideoQueueResponse, VideoRetrieveResponse } from '../types/venice'

const POLL_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 200 // ~10 minutes

function isPermanentError(err: unknown): boolean {
  return err instanceof VeniceAPIError && err.status >= 400 && err.status < 500
}

export function useVideo() {
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[] | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const requestIdRef = useRef<string | null>(null)
  const modelRef = useRef<string | null>(null)
  const downloadUrlRef = useRef<string | null>(null)
  const videoUrlRef = useRef<string | null>(null)
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
        setError('Generation took too long. Cancel and try again, or check your Venice dashboard.')
        setStatus('failed')
        return
      }
      try {
        // /video/retrieve returns one of three things:
        //  - JSON {status:"PROCESSING"} while still processing
        //  - JSON {status:"COMPLETED",...} for VPS-backed models (fetch download_url)
        //  - binary video/mp4 for non-VPS models once complete
        // So we grab the raw Response and branch on Content-Type rather than
        // calling res.json() unconditionally (which breaks on the binary case).
        const res = await veniceFetch('/video/retrieve', {
          method: 'POST',
          body: JSON.stringify({ model: modelRef.current, queue_id: requestIdRef.current }),
        })
        const contentType = res.headers.get('content-type') ?? ''

        if (contentType.startsWith('video/')) {
          // Non-VPS model: the body IS the completed MP4.
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          videoUrlRef.current = url
          setVideoUrl(url)
          setStatus('completed')
          stopPolling()
          return
        }

        const result = (await res.json()) as VideoRetrieveResponse
        const s = result.status?.toLowerCase() as VideoRetrieveResponse['status'] | undefined
        setStatus(s ?? 'processing')

        if (s === 'completed') {
          // VPS-backed models return a download_url at queue time; the retrieve
          // response itself just signals completion.
          const url = result.video_url || downloadUrlRef.current
          if (url) {
            videoUrlRef.current = url
            setVideoUrl(url)
            stopPolling()
          } else {
            setError('Generation completed but no video URL was returned.')
            setStatus('failed')
            stopPolling()
          }
        } else if (s === 'failed') {
          setError(result.error ?? 'Video generation failed')
          stopPolling()
        }
      } catch (err) {
        // Permanent client errors (e.g. 400 "Model is required") must not be
        // retried for 10 minutes — surface them immediately.
        if (isPermanentError(err)) {
          stopPolling()
          setError(err instanceof Error ? err.message : 'Polling failed')
          setStatus('failed')
          return
        }
        // Transient failure — keep polling unless we've burned through too many attempts.
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setError(err instanceof Error ? err.message : 'Polling failed')
          stopPolling()
        }
      }
    }, POLL_INTERVAL_MS)
  }, [stopPolling])

  const queueMutation = useMutation({
    mutationFn: (req: VideoQueueRequest) =>
      venice<VideoQueueResponse>('/video/queue', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: (data) => {
      cancelledRef.current = false
      modelRef.current = data.model
      requestIdRef.current = data.queue_id || data.id || ''
      downloadUrlRef.current = data.download_url ?? null
      setStatus('queued')
      setVideoUrl(null)
      videoUrlRef.current = null
      setError(null)
      setSuggestedPrompt(null)
      setIssues(null)
      startPolling()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Queue failed')
      if (err instanceof VeniceAPIError) {
        setSuggestedPrompt(err.suggestedPrompt ?? null)
        setIssues(err.issues ?? null)
      } else {
        setSuggestedPrompt(null)
        setIssues(null)
      }
      setStatus('failed')
    },
  })

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stopPolling()
    setStatus('idle')
    setError(null)
    setSuggestedPrompt(null)
    setIssues(null)
    requestIdRef.current = null
    modelRef.current = null
    downloadUrlRef.current = null
    startedAtRef.current = null
    setElapsedMs(0)
    if (videoUrlRef.current && videoUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrlRef.current)
    }
    videoUrlRef.current = null
  }, [stopPolling])

  const reset = useCallback(() => {
    cancel()
    setVideoUrl(null)
  }, [cancel])

  return {
    queue: queueMutation.mutate,
    isQueueing: queueMutation.isPending,
    status,
    videoUrl,
    error,
    suggestedPrompt,
    issues,
    elapsedMs,
    cancel,
    reset,
  }
}
