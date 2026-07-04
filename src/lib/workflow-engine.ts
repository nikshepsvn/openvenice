import type { Node, Edge } from '@xyflow/react'
import type { VeniceNodeData, NodeResult } from '../stores/workflow-store'
import { NODE_SCHEMAS, type IOKind } from './workflow-schema'
import { validateWorkflow } from './workflow-validator'
import { venice, veniceBlob, veniceFetch } from './venice-client'
import type { ChatCompletionResponse, ImageGenerateResponse, MusicQueueResponse, MusicRetrieveResponse, VideoQueueResponse, VideoRetrieveResponse } from '../types/venice'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 200 // ~10 minutes per node

export class WorkflowExecutionError extends Error {
  nodeId?: string
  constructor(message: string, nodeId?: string) {
    super(message)
    this.name = 'WorkflowExecutionError'
    this.nodeId = nodeId
  }
}

// Group nodes into topological "levels" — nodes within a level have no dependency
// on each other and can run in parallel. Returns null on cycle.
function topoLevels(nodes: Node<VeniceNodeData>[], edges: Edge[]): string[][] | null {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of edges) {
    if (!inDegree.has(e.source) || !inDegree.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }
  const levels: string[][] = []
  let frontier = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)
  let visited = 0
  while (frontier.length > 0) {
    levels.push(frontier)
    visited += frontier.length
    const next: string[] = []
    for (const id of frontier) {
      for (const child of adj.get(id) ?? []) {
        const d = (inDegree.get(child) ?? 1) - 1
        inDegree.set(child, d)
        if (d === 0) next.push(child)
      }
    }
    frontier = next
  }
  return visited === nodes.length ? levels : null
}

function getInputs(nodeId: string, edges: Edge[], outputs: Map<string, string>): string {
  const parentEdges = edges.filter((e) => e.target === nodeId)
  const inputs = parentEdges.map((e) => outputs.get(e.source) ?? '').filter(Boolean)
  return inputs.join('\n\n')
}

function resolvePrompt(template: string, input: string): string {
  if (!template) return input
  if (template.includes('{{input}}')) return template.replace(/\{\{input\}\}/g, input)
  return input ? `${template}\n\n${input}` : template
}

interface PollOptions<T> {
  path: string
  model: string
  id: string
  getStatus: (r: T) => string
  getResult: (r: T) => string | undefined
  getError: (r: T) => string | undefined
  signal?: AbortSignal
}

async function pollUntilDone<T>({ path, model, id, getStatus, getResult, getError, signal }: PollOptions<T>): Promise<string> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, POLL_INTERVAL_MS)
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    })
    // /video/retrieve and /audio/retrieve both return JSON while processing
    // and a binary media body (video/mp4 / audio/mpeg) once complete. Branch
    // on Content-Type rather than calling res.json() unconditionally, which
    // would break on the binary case and spin forever on a completed job.
    const res = await veniceFetch(path, {
      method: 'POST',
      body: JSON.stringify({ model, queue_id: id, delete_media_on_completion: true }),
      signal,
    })
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    }
    const result = (await res.json()) as T
    const status = getStatus(result).toLowerCase()
    if (status === 'completed') {
      const url = getResult(result)
      if (url) return url
      throw new Error('Completed but no output URL returned')
    }
    if (status === 'failed') {
      throw new Error(getError(result) ?? 'Generation failed')
    }
  }
  throw new Error(`Generation timed out after ${(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`)
}

async function executeNode(
  node: Node<VeniceNodeData>,
  input: string,
  signal?: AbortSignal,
): Promise<string> {
  const data = node.data
  switch (data.nodeType) {
    case 'textInput':
      return data.inputText ?? ''

    case 'output':
      return input

    case 'chat': {
      const prompt = resolvePrompt(data.prompt, input)
      const resp = await venice<ChatCompletionResponse>('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: data.model || 'llama-3.3-70b',
          messages: [{ role: 'user', content: prompt }],
          temperature: data.temperature ?? 0.7,
          max_tokens: data.maxTokens ?? 4096,
          venice_parameters: { enable_web_search: data.webSearch ?? 'off' },
        }),
        signal,
      })
      return resp.choices[0]?.message?.content ?? ''
    }

    case 'imageGen': {
      const prompt = resolvePrompt(data.prompt, input)
      const body: Record<string, unknown> = {
        model: data.model || 'z-image-turbo',
        prompt,
        negative_prompt: data.negativePrompt || undefined,
        steps: data.steps ?? 20,
        style_preset: data.style || undefined,
        width: data.width ?? 1024,
        height: data.height ?? 1024,
        hide_watermark: data.hideWatermark ?? true,
      }
      if (data.aspectRatio) body.aspect_ratio = data.aspectRatio
      const resp = await venice<ImageGenerateResponse>('/image/generate', {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
      })
      const img = resp.images[0]
      const b64 = typeof img === 'string' ? img : img.b64_json
      const mime = b64.startsWith('/9j/') ? 'image/jpeg'
        : b64.startsWith('iVBOR') ? 'image/png'
        : b64.startsWith('UklGR') ? 'image/webp'
        : 'image/png'
      return `[image:data:${mime};base64,${b64}]`
    }

    case 'tts': {
      const text = resolvePrompt(data.prompt, input)
      const blob = await veniceBlob('/audio/speech', {
        model: data.model || 'tts-kokoro',
        input: text,
        voice: data.voice || 'af_sky',
        speed: data.speed ?? 1,
        response_format: data.responseFormat || 'mp3',
      }, { signal })
      return `[audio:${URL.createObjectURL(blob)}]`
    }

    case 'music': {
      const prompt = resolvePrompt(data.prompt, input)
      const body: Record<string, unknown> = {
        model: data.model || 'stable-audio',
        prompt,
        duration_seconds: data.duration ?? 30,
        force_instrumental: data.instrumental ?? false,
      }
      if (data.lyrics) body.lyrics_prompt = data.lyrics
      const queueResp = await venice<MusicQueueResponse>('/audio/queue', {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
      })
      const url = await pollUntilDone<MusicRetrieveResponse>({
        path: '/audio/retrieve',
        model: queueResp.model,
        id: queueResp.queue_id,
        getStatus: (r) => r.status,
        getResult: (r) => r.audio_url,
        getError: (r) => r.error,
        signal,
      })
      return `[audio:${url}]`
    }

    case 'video': {
      const prompt = resolvePrompt(data.prompt, input)
      const body: Record<string, unknown> = {
        model: data.model || 'wan-2.1',
        prompt,
        aspect_ratio: data.videoAspectRatio || '16:9',
      }
      if (data.videoDuration) body.duration = data.videoDuration
      if (data.videoResolution) body.resolution = data.videoResolution
      const queueResp = await venice<VideoQueueResponse>('/video/queue', {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
      })
      const videoId = queueResp.queue_id || queueResp.id || ''
      const url = await pollUntilDone<VideoRetrieveResponse>({
        path: '/video/retrieve',
        model: queueResp.model,
        id: videoId,
        getStatus: (r) => r.status,
        getResult: (r) => r.video_url,
        getError: (r) => r.error,
        signal,
      })
      return `[video:${url}]`
    }
  }
}

export interface ExecuteOptions {
  signal?: AbortSignal
  onUpdate: (nodeId: string, result: Partial<NodeResult>) => void
}

export async function executeWorkflow(
  nodes: Node<VeniceNodeData>[],
  edges: Edge[],
  arg: ExecuteOptions | ((nodeId: string, result: Partial<NodeResult>) => void),
): Promise<void> {
  // Backwards-compatible: accept either an options bag or a bare onUpdate function.
  const opts: ExecuteOptions = typeof arg === 'function' ? { onUpdate: arg } : arg
  const { signal, onUpdate } = opts

  const validation = validateWorkflow({ nodes, edges })
  if (!validation.ok) {
    const first = validation.errors[0]
    throw new WorkflowExecutionError(first?.message ?? 'Workflow has validation errors.', first?.nodeId)
  }

  const levels = topoLevels(nodes, edges)
  if (!levels) throw new WorkflowExecutionError('Workflow contains a cycle.')

  const outputs = new Map<string, string>()
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (const level of levels) {
    if (signal?.aborted) return
    // Run all nodes at this dependency level in parallel.
    await Promise.all(level.map(async (nodeId) => {
      const node = nodeMap.get(nodeId)
      if (!node) return
      onUpdate(nodeId, { status: 'running', output: undefined, error: undefined })
      try {
        const input = getInputs(nodeId, edges, outputs)
        const output = await executeNode(node, input, signal)
        outputs.set(nodeId, output)
        const kind = NODE_SCHEMAS[node.data.nodeType]?.output as IOKind | undefined
        const outputKind = kind && kind !== 'none' ? (kind as NodeResult['outputKind']) : undefined
        onUpdate(nodeId, { status: 'done', output, outputKind })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          onUpdate(nodeId, { status: 'error', error: 'Cancelled' })
          throw err
        }
        const message = err instanceof Error ? err.message : 'Unknown error'
        onUpdate(nodeId, { status: 'error', error: message })
        throw new WorkflowExecutionError(message, nodeId)
      }
    }))
  }
}
