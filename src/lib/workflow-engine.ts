import type { Node, Edge } from '@xyflow/react'
import type { VeniceNodeData, NodeResult } from '../stores/workflow-store'
import { venice, veniceBlob } from './venice-client'
import type { ChatCompletionResponse, ImageGenerateResponse, MusicQueueResponse, MusicRetrieveResponse, VideoQueueResponse, VideoRetrieveResponse } from '../types/venice'

// Topological sort — determines execution order
function topoSort(nodes: Node<VeniceNodeData>[], edges: Edge[]): string[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }
  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adj.get(id) ?? []) {
      const d = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  return order
}

// Get all input values for a node from parent outputs
function getInputs(nodeId: string, edges: Edge[], outputs: Map<string, string>): string {
  const parentEdges = edges.filter((e) => e.target === nodeId)
  const inputs = parentEdges.map((e) => outputs.get(e.source) ?? '').filter(Boolean)
  return inputs.join('\n\n')
}

// Resolve prompt template — replace {{input}} with actual input, or just use input
function resolvePrompt(template: string, input: string): string {
  if (!template) return input
  if (template.includes('{{input}}')) return template.replace(/\{\{input\}\}/g, input)
  // If no placeholder, append input after prompt
  return input ? `${template}\n\n${input}` : template
}

// Poll for async job completion (music/video)
async function pollUntilDone<T>(
  path: string,
  id: string,
  getStatus: (r: T) => string,
  getResult: (r: T) => string | undefined,
  getError: (r: T) => string | undefined,
  maxAttempts = 60,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const result = await venice<T>(path, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    const status = getStatus(result).toLowerCase()
    if (status === 'completed') {
      const url = getResult(result)
      if (url) return url
      throw new Error('Completed but no output URL')
    }
    if (status === 'failed') {
      throw new Error(getError(result) ?? 'Generation failed')
    }
  }
  throw new Error('Timed out waiting for generation')
}

export async function executeWorkflow(
  nodes: Node<VeniceNodeData>[],
  edges: Edge[],
  onUpdate: (nodeId: string, result: Partial<NodeResult>) => void,
): Promise<void> {
  const order = topoSort(nodes, edges)
  const outputs = new Map<string, string>()

  for (const nodeId of order) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) continue
    const data = node.data

    onUpdate(nodeId, { status: 'running', output: undefined, error: undefined })

    try {
      const input = getInputs(nodeId, edges, outputs)
      let output = ''

      switch (data.nodeType) {
        case 'textInput': {
          output = data.inputText ?? ''
          break
        }

        case 'output': {
          output = input
          break
        }

        case 'chat': {
          const prompt = resolvePrompt(data.prompt, input)
          const resp = await venice<ChatCompletionResponse>('/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
              model: data.model || 'llama-3.3-70b',
              messages: [{ role: 'user', content: prompt }],
              temperature: data.temperature ?? 0.7,
              max_tokens: data.maxTokens ?? 4096,
              venice_parameters: {
                enable_web_search: data.webSearch ?? 'off',
              },
            }),
          })
          output = resp.choices[0]?.message?.content ?? ''
          break
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
          })
          const img = resp.images[0]
          const b64 = typeof img === 'string' ? img : img.b64_json
          const prefix = b64.startsWith('/9j/') ? 'data:image/jpeg;base64,' : b64.startsWith('iVBOR') ? 'data:image/png;base64,' : 'data:image/png;base64,'
          output = `[image:${prefix}${b64}]`
          break
        }

        case 'tts': {
          const text = resolvePrompt(data.prompt, input)
          const blob = await veniceBlob('/audio/speech', {
            model: data.model || 'tts-kokoro',
            input: text,
            voice: data.voice || 'af_sky',
            speed: data.speed ?? 1,
            response_format: data.responseFormat || 'mp3',
          })
          const url = URL.createObjectURL(blob)
          output = `[audio:${url}]`
          break
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
          })
          output = await pollUntilDone<MusicRetrieveResponse>(
            '/audio/retrieve',
            queueResp.queue_id,
            (r) => r.status,
            (r) => r.audio_url,
            (r) => r.error,
          )
          output = `[audio:${output}]`
          break
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
          })
          const videoId = queueResp.queue_id || queueResp.id || ''
          output = await pollUntilDone<VideoRetrieveResponse>(
            '/video/retrieve',
            videoId,
            (r) => r.status,
            (r) => r.video_url,
            (r) => r.error,
          )
          output = `[video:${output}]`
          break
        }
      }

      outputs.set(nodeId, output)
      onUpdate(nodeId, { status: 'done', output })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      onUpdate(nodeId, { status: 'error', error: message })
      return
    }
  }
}
