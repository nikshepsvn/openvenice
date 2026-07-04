import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useAuthStore } from '../../stores/auth-store'
import { useMusic } from '../../hooks/use-music'
import { Label, TextArea, PrimaryButton, ErrorText } from '../ui/shared'
import { GenerationView } from '../ui/generation-view'
import { cn } from '../../lib/utils'
import { toast } from '../../stores/toast-store'
import type { MusicQueueRequest } from '../../types/venice'

const MIN_PROMPT_LENGTH = 10

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

  const { queue, isQueueing, status, audioUrl, error, suggestedPrompt, issues, reset, cancel, elapsedMs } = useMusic()
  const isProcessing = status === 'queued' || status === 'processing'

  const promptTooShort = prompt.trim().length > 0 && prompt.trim().length < MIN_PROMPT_LENGTH

  const handleGenerate = () => {
    if (!prompt.trim()) return
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      toast.error('Prompt too short', `Must be at least ${MIN_PROMPT_LENGTH} characters.`)
      return
    }
    const req: MusicQueueRequest = {
      model,
      prompt: prompt.trim(),
    }
    if (config.lyrics && lyrics.trim()) req.lyrics_prompt = lyrics.trim()
    if (config.duration) req.duration_seconds = duration
    if (config.instrumental && instrumental) req.force_instrumental = true
    queue(req)
  }

  const useSuggestedPrompt = () => {
    if (!suggestedPrompt) return
    setPrompt(suggestedPrompt)
    reset()
  }

  const controls = (
    <>
      <div>
        <Label hint={`${prompt.trim().length}/${MIN_PROMPT_LENGTH}+ chars`}>Prompt</Label>
        <TextArea value={prompt} onChange={setPrompt} placeholder="An upbeat electronic track with a driving bassline and ethereal synths…" rows={4} />
        {promptTooShort && (
          <p className="text-[12px] text-amber-300/70 mt-1.5">Prompt must be at least {MIN_PROMPT_LENGTH} characters.</p>
        )}
      </div>

      {config.lyrics && (
        <div>
          <Label>Lyrics</Label>
          <TextArea value={lyrics} onChange={setLyrics} placeholder="Optional lyrics or vocal direction…" rows={3} />
        </div>
      )}

      {config.duration && (
        <div>
          <Label hint={`${duration}s`}>Duration</Label>
          <input type="range" min={5} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
        </div>
      )}

      {config.instrumental && (
        <div className="flex items-center justify-between">
          <Label>Instrumental only</Label>
          <button
            onClick={() => setInstrumental(!instrumental)}
            aria-pressed={instrumental}
            className={cn('w-9 h-5 rounded-full transition-colors relative', instrumental ? 'bg-[var(--color-accent)]' : 'bg-white/[0.1]')}
          >
            <div className={cn('absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white transition-all', instrumental ? 'left-[20px]' : 'left-[2px]')} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {config.lyrics && <Tag>Lyrics</Tag>}
        {config.instrumental && <Tag>Instrumental</Tag>}
        {config.voice && <Tag>Voice</Tag>}
        {config.duration && <Tag>Custom Duration</Tag>}
      </div>

      <PrimaryButton
        onClick={handleGenerate}
        disabled={!prompt.trim() || promptTooShort || !apiKey || isQueueing || isProcessing}
        loading={isQueueing || isProcessing}
        size="lg"
      >
        {isProcessing ? (status === 'queued' ? 'Queued…' : 'Generating…') : 'Generate Music'}
      </PrimaryButton>
      {error && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <ErrorText>{error}</ErrorText>
            <button onClick={reset} className="text-[13px] text-white/55 hover:text-white underline underline-offset-2 shrink-0 transition-colors">Reset</button>
          </div>
          {issues && issues.length > 0 && (
            <ul className="text-[12.5px] text-amber-300/70 leading-relaxed list-disc pl-4">
              {issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          )}
          {suggestedPrompt && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-white/40 font-semibold mb-1">Suggested prompt</p>
              <p className="text-[13.5px] text-white/70 leading-relaxed">{suggestedPrompt}</p>
              <button
                onClick={useSuggestedPrompt}
                className="mt-2 text-[12.5px] font-medium text-[var(--color-accent)] hover:underline underline-offset-2"
              >
                Use this prompt
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )

  const output = (
    <div className="flex flex-col h-full">
        {audioUrl ? (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label>Output</Label>
              <a href={audioUrl} download="venice-music.mp3" target="_blank" rel="noopener noreferrer" className="text-[14px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                Download
              </a>
            </div>
            <audio controls src={audioUrl} className="w-full" />
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <p className="text-[15px] text-white/30 leading-relaxed">{prompt}</p>
              {lyrics && <p className="text-[14px] text-white/15 mt-2 italic">{lyrics}</p>}
            </div>
            <button onClick={reset} className="self-start text-[14px] text-white/15 hover:text-white/35 transition-colors">Generate another</button>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-white/30 text-[15px]">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
                <div className="w-7 h-7 border border-white/[0.08] border-t-white/40 rounded-full animate-spin" />
                <span className="text-white/55 text-center">
                  {status === 'queued' ? 'Queued — waiting for a slot' : 'Composing your track'}
                  {elapsedMs > 0 && (
                    <span className="block text-[12px] text-white/30 font-mono mt-1">
                      {formatElapsedMusic(elapsedMs)} · typically 20s–90s
                    </span>
                  )}
                </span>
                <button
                  onClick={cancel}
                  className="text-[13px] text-white/35 hover:text-white/65 underline underline-offset-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : !prompt ? (
              <div className="max-w-md w-full flex flex-col gap-2">
                <div className="text-[12px] uppercase tracking-[0.08em] text-white/35 font-medium text-left">Try one of these</div>
                {MUSIC_EXAMPLES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="text-left px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all text-[14px] text-white/65 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/40"
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : (
              <span>Press Generate to create your track</span>
            )}
          </div>
        )}
    </div>
  )

  return <GenerationView controls={controls} output={output} />
}

const MUSIC_EXAMPLES = [
  'Lo-fi hip-hop beat with vinyl crackle and rain — 80 bpm, mellow',
  'Cinematic orchestral build — slow strings rising into triumphant brass',
  'Synthwave with retro arpeggios, warm pads, gated reverb drums — 105 bpm',
  'Acoustic folk fingerpicking, soft female vocals, intimate room sound',
]

function formatElapsedMusic(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] text-white/55 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
      {children}
    </span>
  )
}
