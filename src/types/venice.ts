export type ModelType = 'text' | 'image' | 'audio' | 'tts' | 'video' | 'music' | 'embedding' | 'upscale' | 'asr' | 'code'

export interface ImageConstraints {
  promptCharacterLimit?: number
  aspectRatios?: string[]
  defaultAspectRatio?: string
  resolutions?: string[]
  defaultResolution?: string
  steps?: { default: number; max: number }
  widthHeightDivisor?: number
}

export interface VideoConstraints {
  model_type: 'text-to-video' | 'image-to-video'
  aspect_ratios: string[]
  resolutions: string[]
  durations: string[]
  audio: boolean
  audio_configurable: boolean
  audio_input: boolean
  video_input: boolean
}

export interface VeniceModel {
  id: string
  object: string
  created: number
  owned_by: string
  model_spec?: {
    availableContextTokens?: number
    capabilities?: Record<string, unknown>
    traits?: string[]
    offline?: boolean
    name?: string
    constraints?: VideoConstraints | ImageConstraints
    model_sets?: string[]
  }
}

export interface ModelsResponse {
  object: string
  data: VeniceModel[]
}

export interface ContentPart {
  type: 'text' | 'image_url' | 'input_audio'
  text?: string
  image_url?: { url: string }
  input_audio?: { data: string; format: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
  reasoning_content?: string
}

export interface VeniceParameters {
  include_venice_system_prompt?: boolean
  character_slug?: string
  strip_thinking_response?: boolean
  disable_thinking?: boolean
  enable_web_search?: 'off' | 'on' | 'auto'
  enable_web_citations?: boolean
  include_search_results_in_stream?: boolean
  return_search_results_as_documents?: boolean
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  venice_parameters?: VeniceParameters
}

export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string; reasoning_content?: string }
    finish_reason: string | null
  }>
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

// Image types
export interface ImageGenerateRequest {
  prompt: string
  negative_prompt?: string
  model: string
  width?: number
  height?: number
  cfg_scale?: number
  steps?: number
  style_preset?: string
  seed?: number
  format?: 'jpeg' | 'png' | 'webp'
  variants?: number
  safe_mode?: boolean
  hide_watermark?: boolean
  aspect_ratio?: string
  resolution?: string
  lora_strength?: number
  enable_web_search?: boolean
}

export interface ImageGenerateResponse {
  images: Array<string | { b64_json: string }>
  id: string
  model: string
}

export interface ImageEditRequest {
  image: string
  prompt: string
  modelId?: string
  aspect_ratio?: string
}

export interface ImageUpscaleRequest {
  image: string
  scale?: number
  enhance?: boolean
  enhanceCreativity?: number
  enhancePrompt?: string
  replication?: number
}

export interface StylesResponse {
  data: string[]
}

// Audio types
export interface TTSRequest {
  model: string
  input: string
  voice: string
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
  speed?: number
}

// Music types
export interface MusicQueueRequest {
  model: string
  prompt: string
  lyrics_prompt?: string
  duration_seconds?: number
  force_instrumental?: boolean
  voice?: string
  language_code?: string
  speed?: number
}

export interface MusicQueueResponse {
  model: string
  queue_id: string
  status: string
}

export interface MusicRetrieveResponse {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'queued' | 'processing' | 'completed' | 'failed'
  audio_url?: string
  error?: string
}

// Video types
export interface VideoQueueRequest {
  model: string
  prompt: string
  negative_prompt?: string
  duration?: string
  aspect_ratio?: string
  resolution?: string
  image_url?: string
  end_image_url?: string
  audio?: boolean
  audio_url?: string
  video_url?: string
  reference_image_urls?: string[]
  scene_image_urls?: string[]
}

export interface VideoQueueResponse {
  model: string
  queue_id: string
  id?: string
}

export interface VideoRetrieveResponse {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  video_url?: string
  error?: string
}

// Embedding types
export interface EmbeddingRequest {
  model: string
  input: string | string[]
  encoding_format?: 'float' | 'base64'
}

export interface EmbeddingResponse {
  object: string
  data: Array<{ object: string; index: number; embedding: number[] }>
  model: string
  usage: { prompt_tokens: number; total_tokens: number }
}

// Character types
export interface Character {
  slug: string
  name: string
  description: string
  avatar_url?: string
  system_prompt?: string
  tags?: string[]
}

export interface CharactersResponse {
  data: Character[]
}

// Error types
export interface VeniceError {
  error: {
    message: string
    type: string
    code?: string
    suggested_prompt?: string
  }
}

// Conversation
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  model: string
  createdAt: number
}
