import { useState, useRef } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useAuthStore } from '../../stores/auth-store'
import { useTTS, useTranscription } from '../../hooks/use-audio'
import { Select } from '../ui/select'
import { Label, TextArea, PrimaryButton, ErrorText, EmptyState } from '../ui/shared'
import { cn } from '../../lib/utils'

const VOICES = [
  // American Female
  'af_alloy', 'af_aoede', 'af_bella', 'af_heart', 'af_jessica', 'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky',
  // American Male
  'am_adam', 'am_echo', 'am_eric', 'am_fable', 'am_liam', 'am_michael', 'am_onyx',
  // British Female
  'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily',
  // British Male
  'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis',
  // Chinese
  'zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxuan', 'zf_xiaoyan', 'zf_xiaoyi',
  'zm_yunjian', 'zm_yunxi', 'zm_yunxia', 'zm_yunyang',
  // Japanese
  'jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro',
  'jm_kumo',
  // French
  'ff_siwis',
  // Hindi
  'hf_alpha', 'hf_beta',
  'hm_omega', 'hm_psi',
  // Italian
  'if_sara',
  'im_nicola',
  // Portuguese (Brazil)
  'pf_dora',
  'pm_alex', 'pm_santa',
  // Spanish
  'ef_dora',
  'em_alex', 'em_santa',
]
const FORMATS = ['mp3', 'opus', 'aac', 'flac', 'wav'] as const

export function AudioView() {
  const apiKey = useAuthStore((s) => s.apiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModels.audio)
  const { data: models } = useModels('tts')
  const model = selectedModel || models?.[0]?.id || 'tts-kokoro'

  const [tab, setTab] = useState<'tts' | 'transcribe'>('tts')
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('af_heart')
  const [speed, setSpeed] = useState(1)
  const [format, setFormat] = useState<string>('mp3')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const tts = useTTS()
  const transcription = useTranscription()

  const voiceOptions = VOICES.map((v) => {
    const prefix = v.slice(0, 2)
    const langMap: Record<string, string> = { af: '🇺🇸 F', am: '🇺🇸 M', bf: '🇬🇧 F', bm: '🇬🇧 M', zf: '🇨🇳 F', zm: '🇨🇳 M', jf: '🇯🇵 F', jm: '🇯🇵 M', ff: '🇫🇷 F', hf: '🇮🇳 F', hm: '🇮🇳 M', if: '🇮🇹 F', im: '🇮🇹 M', pf: '🇧🇷 F', pm: '🇧🇷 M', ef: '🇪🇸 F', em: '🇪🇸 M' }
    const tag = langMap[prefix] || ''
    const name = v.slice(3)
    return { value: v, label: tag ? `${tag} · ${name}` : v }
  })
  const formatOptions = FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))

  const handleTTS = () => {
    if (!text.trim()) return
    tts.mutate(
      { model, input: text.trim(), voice, speed, response_format: format as typeof FORMATS[number] },
      { onSuccess: (url) => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(url) } },
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div className="flex gap-px bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.04]">
          {(['tts', 'transcribe'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              'flex-1 px-3 py-1.5 text-[12px] font-medium rounded-[7px] transition-all duration-150',
              tab === t ? 'bg-white text-black' : 'text-white/25 hover:text-white/45',
            )}>
              {t === 'tts' ? 'Text to Speech' : 'Transcription'}
            </button>
          ))}
        </div>

        {tab === 'tts' ? (
          <>
            <div>
              <Label>Text</Label>
              <TextArea value={text} onChange={setText} placeholder="Enter text to convert to speech..." rows={5} />
              <span className="text-[10px] text-white/10 mt-1 block">{text.length}/4096</span>
            </div>
            <div><Label>Voice</Label><Select value={voice} onChange={setVoice} options={voiceOptions} searchable /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Format</Label><Select value={format} onChange={setFormat} options={formatOptions} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Speed</Label>
                  <span className="text-[10px] text-white/30 font-mono">{speed}x</span>
                </div>
                <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <PrimaryButton onClick={handleTTS} disabled={!text.trim() || !apiKey} loading={tts.isPending}>Generate Speech</PrimaryButton>
            {tts.error && <ErrorText>{tts.error.message}</ErrorText>}
          </>
        ) : (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-white/[0.08] hover:border-white/[0.15] rounded-lg p-8 text-center cursor-pointer transition-colors"
            >
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="text-[12px] text-white/20">{file ? file.name : 'Click to select audio file'}</p>
            </div>
            <PrimaryButton onClick={() => { if (file) transcription.mutate(file, { onSuccess: (d) => setTranscript(d.text) }) }} disabled={!file || !apiKey} loading={transcription.isPending}>
              Transcribe
            </PrimaryButton>
            {transcription.error && <ErrorText>{transcription.error.message}</ErrorText>}
          </>
        )}
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col min-w-0">
        {tab === 'tts' ? (
          audioUrl ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label>Output</Label>
                <a href={audioUrl} download={`venice-speech.${format}`} className="text-[11px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                  Download
                </a>
              </div>
              <audio controls src={audioUrl} className="w-full" />
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                <p className="text-[12px] text-white/30 leading-relaxed">{text}</p>
              </div>
            </div>
          ) : (
            <EmptyState>Audio output appears here</EmptyState>
          )
        ) : (
          transcript ? (
            <div className="flex flex-col gap-3 animate-fade-in">
              <Label>Transcript</Label>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-5 text-[13px] text-white/60 whitespace-pre-wrap leading-relaxed">
                {transcript}
              </div>
            </div>
          ) : (
            <EmptyState>Transcript appears here</EmptyState>
          )
        )}
      </div>
    </div>
  )
}
