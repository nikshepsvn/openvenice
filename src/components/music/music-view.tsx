import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useAuthStore } from '../../stores/auth-store'
import { useMusic } from '../../hooks/use-music'
import { Label, TextArea, PrimaryButton, ErrorText } from '../ui/shared'
import { cn } from '../../lib/utils'
import type { MusicQueueRequest } from '../../types/venice'

// Model capabilities
interface MusicModelConfig {
  lyrics: boolean
  instrumental: boolean
  voice: boolean
  duration: boolean
}

const MODEL_CONFIGS: Record<string, MusicModelConfig> = {
  'ace-step-1.5': { lyrics: true, instrumental: true, voice: false, duration: true },
  'elevenlabs-music': { lyrics: true, instrumental: true, voice: true, duration: false },
  'minimax-music-2.0': { lyrics: true, instrumental: true, voice: false, duration: false },
  'stable-audio-2.5': { lyrics: false, instrumental: false, voice: false, duration: true },
  'elevenlabs-sound-effects': { lyrics: false, instrumental: false, voice: false, duration: true },
  'mmaudio-v2': { lyrics: false, instrumental: false, voice: false, duration: true },
}

function getConfig(modelId: string): MusicModelConfig {
  const key = Object.keys(MODEL_CONFIGS).find((k) => modelId.toLowerCase().includes(k))
  return key ? MODEL_CONFIGS[key] : { lyrics: false, instrumental: false, voice: false, duration: true }
}

export function MusicView() {
  const apiKey = useAuthStore((s) => s.apiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModels.music)
  const { data: models } = useModels('music')
  const model = selectedModel || models?.[0]?.id || ''
  const config = getConfig(model)

  const [prompt, setPrompt] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [duration, setDuration] = useState(30)
  const [instrumental, setInstrumental] = useState(false)

  const { queue, isQueueing, status, audioUrl, error, reset } = useMusic()
  const isProcessing = status === 'queued' || status === 'processing'

  const handleGenerate = () => {
    if (!prompt.trim()) return
    const req: MusicQueueRequest = {
      model,
      prompt: prompt.trim(),
    }
    if (config.lyrics && lyrics.trim()) req.lyrics_prompt = lyrics.trim()
    if (config.duration) req.duration_seconds = duration
    if (config.instrumental && instrumental) req.force_instrumental = true
    queue(req)
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div>
          <Label>Prompt</Label>
          <TextArea value={prompt} onChange={setPrompt} placeholder="An upbeat electronic track with a driving bassline and ethereal synths..." rows={4} />
        </div>

        {config.lyrics && (
          <div>
            <Label>Lyrics</Label>
            <TextArea value={lyrics} onChange={setLyrics} placeholder="Optional lyrics or vocal direction..." rows={3} />
          </div>
        )}

        {config.duration && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Duration</Label>
              <span className="text-[10px] text-white/30 font-mono">{duration}s</span>
            </div>
            <input type="range" min={5} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
          </div>
        )}

        {config.instrumental && (
          <div className="flex items-center justify-between">
            <Label>Instrumental only</Label>
            <button
              onClick={() => setInstrumental(!instrumental)}
              className={cn(
                'w-8 h-[18px] rounded-full transition-colors relative',
                instrumental ? 'bg-white' : 'bg-white/[0.08]',
              )}
            >
              <div className={cn(
                'absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all',
                instrumental ? 'left-[16px] bg-black' : 'left-[2px] bg-white/30',
              )} />
            </button>
          </div>
        )}

        {/* Model capabilities */}
        <div className="flex flex-wrap gap-1">
          {config.lyrics && <Tag>Lyrics</Tag>}
          {config.instrumental && <Tag>Instrumental</Tag>}
          {config.voice && <Tag>Voice</Tag>}
          {config.duration && <Tag>Custom Duration</Tag>}
        </div>

        <PrimaryButton
          onClick={handleGenerate}
          disabled={!prompt.trim() || !apiKey || isQueueing || isProcessing}
          loading={isQueueing || isProcessing}
        >
          {isProcessing ? (status === 'queued' ? 'Queued...' : 'Generating...') : 'Generate Music'}
        </PrimaryButton>
        {error && (
          <div className="flex items-center justify-between">
            <ErrorText>{error}</ErrorText>
            <button onClick={reset} className="text-[11px] text-white/20 hover:text-white/40 underline underline-offset-2 shrink-0 ml-2 transition-colors">Reset</button>
          </div>
        )}
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col min-w-0">
        {audioUrl ? (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <a href={audioUrl} download="venice-music.mp3" target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                Download
              </a>
            </div>
            <audio controls src={audioUrl} className="w-full" />
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <p className="text-[12px] text-white/30 leading-relaxed">{prompt}</p>
              {lyrics && <p className="text-[11px] text-white/15 mt-2 italic">{lyrics}</p>}
            </div>
            <button onClick={reset} className="self-start text-[11px] text-white/15 hover:text-white/35 transition-colors">Generate another</button>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-white/10 text-[13px]">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border border-white/[0.08] border-t-white/30 rounded-full animate-spin" />
                <span className="text-white/20">{status === 'queued' ? 'Queued...' : 'Generating music...'}</span>
              </div>
            ) : (
              'Generated music appears here'
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-white/20 bg-white/[0.03] border border-white/[0.04] rounded px-1.5 py-0.5">
      {children}
    </span>
  )
}
