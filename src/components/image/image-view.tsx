import { useState, useMemo } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useStyles } from '../../hooks/use-styles'
import { useImageGenerate } from '../../hooks/use-image'
import { useAuthStore } from '../../stores/auth-store'
import { Select } from '../ui/select'
import { Label, TextArea, PrimaryButton, PillGroup, ErrorText, ExamplePrompts } from '../ui/shared'
import { GenerationView } from '../ui/generation-view'
import { cn } from '../../lib/utils'
import type { ImageConstraints } from '../../types/venice'

const IMAGE_EXAMPLES = [
  'A serene mountain lake at golden hour, low fog over the water, painterly',
  'Macro photo of a dewdrop on a spider web, sunrise lighting',
  'Cyberpunk street market at night, neon signs reflecting in puddles',
  'Children\'s book illustration of a fox reading a book under a mushroom',
]

function toImageSrc(b64: string): string {
  if (b64.startsWith('data:')) return b64
  if (b64.startsWith('/9j/')) return `data:image/jpeg;base64,${b64}`
  if (b64.startsWith('iVBOR')) return `data:image/png;base64,${b64}`
  if (b64.startsWith('UklGR')) return `data:image/webp;base64,${b64}`
  return `data:image/png;base64,${b64}`
}

const DEFAULT_SIZES = [
  { value: '0', label: '512' },
  { value: '1', label: '768' },
  { value: '2', label: '1024' },
  { value: '3', label: '1280' },
]
const DEFAULT_SIZE_MAP = [
  { w: 512, h: 512 }, { w: 768, h: 768 }, { w: 1024, h: 1024 }, { w: 1280, h: 1280 },
]

export function ImageView() {
  const apiKey = useAuthStore((s) => s.apiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModels.image)
  const { data: models } = useModels('image')
  const { data: styles } = useStyles()
  const model = selectedModel || models?.[0]?.id || 'z-image-turbo'

  // Get constraints for the selected model
  const modelData = models?.find((m) => m.id === model)
  const constraints = modelData?.model_spec?.constraints as ImageConstraints | undefined
  const hasAspectRatios = constraints?.aspectRatios && constraints.aspectRatios.length > 0
  const hasResolutions = constraints?.resolutions && constraints.resolutions.length > 0
  const maxSteps = constraints?.steps?.max || 50
  const defaultSteps = constraints?.steps?.default || 20
  const promptLimit = constraints?.promptCharacterLimit || 4096

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [sizeIdx, setSizeIdx] = useState('2')
  const [aspectRatio, setAspectRatio] = useState('')
  const [resolution, setResolution] = useState('')
  const [style, setStyle] = useState('')
  const [steps, setSteps] = useState(defaultSteps)
  const [variants, setVariants] = useState(1)
  const [hideWatermark] = useState(true)
  const [safeMode, setSafeMode] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Build aspect ratio options from model constraints
  const aspectOptions = useMemo(() => {
    if (!hasAspectRatios) return []
    return [
      { value: '', label: 'Auto' },
      ...constraints!.aspectRatios!.map((a) => ({ value: a, label: a })),
    ]
  }, [constraints, hasAspectRatios])

  // Build resolution options from model constraints (some models support 1K/2K/4K)
  const resolutionOptions = useMemo(() => {
    if (!hasResolutions) return []
    return constraints!.resolutions!.map((r) => ({ value: r, label: r }))
  }, [constraints, hasResolutions])

  const downloadImage = (b64: string, index?: number) => {
    const a = document.createElement('a')
    a.href = toImageSrc(b64)
    a.download = `venice-image${index !== undefined ? `-${index + 1}` : ''}.png`
    a.click()
  }

  const mutation = useImageGenerate()
  const styleOptions = [{ value: '', label: 'None' }, ...(styles?.map((s) => ({ value: s, label: s })) ?? [])]

  const handleGenerate = () => {
    if (!prompt.trim()) return
    const size = DEFAULT_SIZE_MAP[Number(sizeIdx)]

    const req: Record<string, unknown> = {
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      model,
      style_preset: style || undefined,
      variants,
      hide_watermark: hideWatermark,
      safe_mode: safeMode,
      steps,
    }

    // Use aspect_ratio for models that support it, otherwise use width/height
    if (hasAspectRatios && aspectRatio) {
      req.aspect_ratio = aspectRatio
    } else if (!hasAspectRatios) {
      req.width = size.w
      req.height = size.h
    }

    // Resolution for models that support named resolutions
    if (hasResolutions && resolution) {
      req.resolution = resolution
    }

    mutation.mutate(
      req as unknown as Parameters<typeof mutation.mutate>[0],
      {
        onSuccess: (data) => {
          const newImages = data.images.map((img) => typeof img === 'string' ? img : img.b64_json)
          setImages((prev) => [...newImages, ...prev])
        },
      },
    )
  }

  const controls = (
    <>
      <div>
        <Label hint={`${prompt.length}/${promptLimit}`}>Prompt</Label>
        <TextArea value={prompt} onChange={setPrompt} placeholder="A serene mountain landscape at golden hour…" />
      </div>
      <div><Label>Negative prompt</Label><TextArea value={negativePrompt} onChange={setNegativePrompt} placeholder="blurry, low quality…" rows={2} /></div>

      {hasAspectRatios ? (
        <div><Label>Aspect Ratio</Label><PillGroup options={aspectOptions} value={aspectRatio} onChange={setAspectRatio} /></div>
      ) : (
        <div><Label>Size</Label><PillGroup options={DEFAULT_SIZES} value={sizeIdx} onChange={setSizeIdx} /></div>
      )}

      {hasResolutions && (
        <div><Label>Resolution</Label><PillGroup options={resolutionOptions} value={resolution || resolutionOptions[0]?.value || ''} onChange={setResolution} /></div>
      )}

      <div><Label>Style</Label><Select value={style} onChange={setStyle} options={styleOptions} searchable placeholder="None" /></div>

      <div>
        <Label hint={String(steps)}>Steps</Label>
        <input type="range" min={1} max={maxSteps} value={steps} onChange={(e) => setSteps(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <Label hint={String(variants)}>Variants</Label>
        <input type="range" min={1} max={4} value={variants} onChange={(e) => setVariants(Number(e.target.value))} className="w-full" />
      </div>

      <div className="flex items-center justify-between">
        <Label>Safe mode</Label>
        <button
          type="button"
          role="switch"
          aria-checked={safeMode}
          onClick={() => setSafeMode(!safeMode)}
          aria-label="Toggle safe mode"
          className={cn(
            'w-8 h-[18px] rounded-full transition-colors relative',
            safeMode ? 'bg-white' : 'bg-white/[0.08]',
          )}
        >
          <div className={cn(
            'absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all',
            safeMode ? 'left-[16px] bg-black' : 'left-[2px] bg-white/30',
          )} />
        </button>
      </div>

      <PrimaryButton onClick={handleGenerate} disabled={!prompt.trim() || !apiKey} loading={mutation.isPending} size="lg">
        {mutation.isPending ? 'Generating…' : 'Generate'}
      </PrimaryButton>
      {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
    </>
  )

  const output = (
    <>
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedImage(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={toImageSrc(selectedImage)} alt="Generated" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" />
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button onClick={() => downloadImage(selectedImage)} aria-label="Download" className="p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white/70 hover:text-white transition-colors backdrop-blur-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              </button>
              <button onClick={() => setSelectedImage(null)} aria-label="Close" className="p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white/70 hover:text-white transition-colors backdrop-blur-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {images.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          {mutation.isPending ? (
            <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
              <div className="w-8 h-8 border-2 border-white/[0.08] border-t-[var(--color-accent)] rounded-full animate-spin" />
              <span className="text-[13px] text-white/55">Generating…</span>
            </div>
          ) : (
            <ExamplePrompts items={IMAGE_EXAMPLES} onPick={setPrompt} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {mutation.isPending && Array.from({ length: variants }).map((_, i) => (
            <div key={`skel-${i}`} className="aspect-square rounded-xl skeleton" />
          ))}
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={toImageSrc(img)}
                alt={`Generated ${i + 1}`}
                className="w-full rounded-xl cursor-pointer border border-white/[0.05] hover:border-white/[0.18] transition-all duration-200"
                onClick={() => setSelectedImage(img)}
              />
              <button
                onClick={(e) => { e.stopPropagation(); downloadImage(img, i) }}
                aria-label="Download"
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 rounded-lg text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                title="Download"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return <GenerationView controls={controls} output={output} />
}
