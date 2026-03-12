import { useState, useRef } from 'react'
import { useAuthStore } from '../../stores/auth-store'
import { useImageEdit, useImageUpscale, useBackgroundRemove } from '../../hooks/use-image-tools'
import { Select } from '../ui/select'
import { Label, TextArea, PrimaryButton, ErrorText, EmptyState } from '../ui/shared'
import { cn } from '../../lib/utils'

type Tool = 'edit' | 'upscale' | 'remove-bg'

const EDIT_MODELS = [
  { value: 'qwen-edit', label: 'Qwen Edit' },
  { value: 'qwen-image-2-edit', label: 'Qwen Image 2 Edit' },
  { value: 'qwen-image-2-pro-edit', label: 'Qwen Image 2 Pro Edit' },
  { value: 'flux-2-max-edit', label: 'Flux 2 Max Edit' },
  { value: 'gpt-image-1-5-edit', label: 'GPT Image 1.5 Edit' },
  { value: 'grok-imagine-edit', label: 'Grok Imagine Edit' },
  { value: 'nano-banana-2-edit', label: 'Nano Banana 2 Edit' },
  { value: 'nano-banana-pro-edit', label: 'Nano Banana Pro Edit' },
  { value: 'seedream-v4-edit', label: 'Seedream V4 Edit' },
  { value: 'seedream-v5-lite-edit', label: 'Seedream V5 Lite Edit' },
]

export function ImageTools() {
  const apiKey = useAuthStore((s) => s.apiKey)
  const [tool, setTool] = useState<Tool>('edit')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageName, setImageName] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editPrompt, setEditPrompt] = useState('')
  const [editModel, setEditModel] = useState('qwen-edit')

  // Upscale state
  const [scale, setScale] = useState(2)
  const [enhance, setEnhance] = useState(false)
  const [enhanceCreativity, setEnhanceCreativity] = useState(0.5)
  const [enhancePrompt, setEnhancePrompt] = useState('')

  const editMutation = useImageEdit()
  const upscaleMutation = useImageUpscale()
  const bgRemoveMutation = useBackgroundRemove()

  const handleFileSelect = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setImageData(reader.result as string)
      setImageName(file.name)
      setResultUrl(null)
    }
    reader.readAsDataURL(file)
  }

  const handleProcess = () => {
    if (!imageData) return
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setResultUrl(null)

    if (tool === 'edit') {
      editMutation.mutate(
        { image: imageData, prompt: editPrompt.trim(), modelId: editModel },
        { onSuccess: setResultUrl },
      )
    } else if (tool === 'upscale') {
      upscaleMutation.mutate(
        { image: imageData, scale, enhance, enhanceCreativity: enhance ? enhanceCreativity : undefined, enhancePrompt: enhance && enhancePrompt.trim() ? enhancePrompt.trim() : undefined },
        { onSuccess: setResultUrl },
      )
    } else {
      bgRemoveMutation.mutate(imageData, { onSuccess: setResultUrl })
    }
  }

  const isLoading = editMutation.isPending || upscaleMutation.isPending || bgRemoveMutation.isPending
  const error = editMutation.error || upscaleMutation.error || bgRemoveMutation.error

  const downloadResult = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `venice-${tool}-result.png`
    a.click()
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        {/* Tool selector */}
        <div className="flex gap-px bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.04]">
          {([['edit', 'Edit'], ['upscale', 'Upscale'], ['remove-bg', 'Remove BG']] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setTool(id); setResultUrl(null) }} className={cn(
              'flex-1 px-2 py-1.5 text-[11px] font-medium rounded-[7px] transition-all duration-150',
              tool === id ? 'bg-white text-black' : 'text-white/25 hover:text-white/45',
            )}>
              {label}
            </button>
          ))}
        </div>

        {/* Image upload */}
        <div>
          <Label>Source image</Label>
          {imageData ? (
            <div className="relative group">
              <img src={imageData} alt="Source" className="w-full rounded-lg border border-white/[0.06]" />
              <button
                onClick={() => { setImageData(null); setImageName(''); setResultUrl(null) }}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <span className="text-[10px] text-white/15 mt-1 block truncate">{imageName}</span>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-white/[0.08] hover:border-white/[0.15] rounded-lg py-8 text-center cursor-pointer transition-colors"
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }} />
              <p className="text-[11px] text-white/15">Click to upload image</p>
            </div>
          )}
        </div>

        {/* Tool-specific controls */}
        {tool === 'edit' && (
          <>
            <div><Label>Edit prompt</Label><TextArea value={editPrompt} onChange={setEditPrompt} placeholder="Change the background to a sunset beach..." rows={3} /></div>
            <div><Label>Model</Label><Select value={editModel} onChange={setEditModel} options={EDIT_MODELS} searchable /></div>
          </>
        )}

        {tool === 'upscale' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Scale</Label>
                <span className="text-[10px] text-white/30 font-mono">{scale}x</span>
              </div>
              <input type="range" min={1} max={4} step={1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Enhance</Label>
              <button
                onClick={() => setEnhance(!enhance)}
                className={cn(
                  'w-8 h-[18px] rounded-full transition-colors relative',
                  enhance ? 'bg-white' : 'bg-white/[0.08]',
                )}
              >
                <div className={cn(
                  'absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all',
                  enhance ? 'left-[16px] bg-black' : 'left-[2px] bg-white/30',
                )} />
              </button>
            </div>
            {enhance && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Creativity</Label>
                    <span className="text-[10px] text-white/30 font-mono">{enhanceCreativity.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={enhanceCreativity} onChange={(e) => setEnhanceCreativity(Number(e.target.value))} className="w-full" />
                </div>
                <div><Label>Enhance prompt</Label><TextArea value={enhancePrompt} onChange={setEnhancePrompt} placeholder="Make it more vibrant..." rows={2} /></div>
              </>
            )}
          </>
        )}

        <PrimaryButton
          onClick={handleProcess}
          disabled={!imageData || !apiKey || isLoading || (tool === 'edit' && !editPrompt.trim())}
          loading={isLoading}
        >
          {tool === 'edit' ? 'Edit Image' : tool === 'upscale' ? 'Upscale Image' : 'Remove Background'}
        </PrimaryButton>
        {error && <ErrorText>{error.message}</ErrorText>}
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col min-w-0">
        {resultUrl ? (
          <div className="animate-fade-in flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Result</Label>
              <button onClick={downloadResult} className="text-[11px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                Download
              </button>
            </div>
            <img src={resultUrl} alt="Result" className={cn('w-full rounded-lg border border-white/[0.04]', tool === 'remove-bg' && 'bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#111_0%_50%)_0_0/20px_20px]')} />
          </div>
        ) : (
          <EmptyState>{tool === 'edit' ? 'Edited image appears here' : tool === 'upscale' ? 'Upscaled image appears here' : 'Result appears here'}</EmptyState>
        )}
      </div>
    </div>
  )
}
