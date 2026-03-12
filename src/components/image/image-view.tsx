import { useState, useMemo } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useStyles } from '../../hooks/use-styles'
import { useImageGenerate } from '../../hooks/use-image'
import { useAuthStore } from '../../stores/auth-store'
import { Select } from '../ui/select'
import { Label, TextArea, PrimaryButton, PillGroup, ErrorText, EmptyState } from '../ui/shared'
import type { ImageConstraints } from '../../types/venice'

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
  const [hideWatermark, setHideWatermark] = useState(true)
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
      req as Parameters<typeof mutation.mutate>[0],
      {
        onSuccess: (data) => {
          const newImages = data.images.map((img) => typeof img === 'string' ? img : img.b64_json)
          setImages((prev) => [...newImages, ...prev])
        },
      },
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div>
          <Label>Prompt</Label>
          <TextArea value={prompt} onChange={setPrompt} placeholder="A serene mountain landscape at golden hour..." />
          <span className="text-[10px] text-white/10 mt-1 block">{prompt.length}/{promptLimit}</span>
        </div>
        <div><Label>Negative prompt</Label><TextArea value={negativePrompt} onChange={setNegativePrompt} placeholder="blurry, low quality..." rows={2} /></div>

        {/* Show aspect ratio pills for models that support them */}
        {hasAspectRatios ? (
          <div><Label>Aspect Ratio</Label><PillGroup options={aspectOptions} value={aspectRatio} onChange={setAspectRatio} /></div>
        ) : (
          <div><Label>Size</Label><PillGroup options={DEFAULT_SIZES} value={sizeIdx} onChange={setSizeIdx} /></div>
        )}

        {/* Named resolutions for models like Nano Banana */}
        {hasResolutions && (
          <div><Label>Resolution</Label><PillGroup options={resolutionOptions} value={resolution || resolutionOptions[0]?.value || ''} onChange={setResolution} /></div>
        )}

        <div><Label>Style</Label><Select value={style} onChange={setStyle} options={styleOptions} searchable placeholder="None" /></div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Steps</Label>
            <span className="text-[10px] text-white/30 font-mono">{steps}</span>
          </div>
          <input type="range" min={1} max={maxSteps} value={steps} onChange={(e) => setSteps(Number(e.target.value))} className="w-full" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Variants</Label>
            <span className="text-[10px] text-white/30 font-mono">{variants}</span>
          </div>
          <input type="range" min={1} max={4} value={variants} onChange={(e) => setVariants(Number(e.target.value))} className="w-full" />
        </div>

        <PrimaryButton onClick={handleGenerate} disabled={!prompt.trim() || !apiKey} loading={mutation.isPending}>Generate</PrimaryButton>
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
      </div>

      <div className="flex-1 p-5 overflow-y-auto min-w-0">
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <img src={toImageSrc(selectedImage)} alt="Generated" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
              <div className="absolute top-3 right-3 flex gap-1.5">
                <button onClick={() => downloadImage(selectedImage)} className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/60 hover:text-white transition-colors backdrop-blur-sm" title="Download">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                </button>
                <button onClick={() => setSelectedImage(null)} className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/60 hover:text-white transition-colors backdrop-blur-sm" title="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}
        {images.length === 0 ? (
          <EmptyState>Generated images appear here</EmptyState>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={toImageSrc(img)}
                  alt={`Generated ${i + 1}`}
                  className="w-full rounded-lg cursor-pointer border border-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
                  onClick={() => setSelectedImage(img)}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); downloadImage(img, i) }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-md text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                  title="Download"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
