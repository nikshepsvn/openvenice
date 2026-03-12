import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, images.length > 0 ? images : undefined)
    setValue('')
    setImages([])
    // Reset textarea height after clearing
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="px-5 pb-4 pt-1.5">
      <div className="w-full max-w-[840px] mx-auto">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <div key={i} className="relative group shrink-0">
                <img src={img} alt={`Attachment ${i + 1}`} className="h-16 rounded-lg border border-white/[0.06]" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-white/[0.12] transition-colors"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleImageUpload(e.dataTransfer.files) }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items
              if (!items) return
              for (const item of items) {
                if (item.type.startsWith('image/')) {
                  const file = item.getAsFile()
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => setImages((prev) => [...prev, reader.result as string])
                    reader.readAsDataURL(file)
                  }
                }
              }
            }}
            placeholder={disabled ? 'Connect API key to start...' : 'Message...'}
            rows={1}
            className="w-full bg-transparent px-4 pt-3 pb-1 text-[14px] text-white/85 outline-none resize-none max-h-40 placeholder:text-white/15"
            disabled={disabled}
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <div className="flex items-center">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                className="p-1 text-white/12 hover:text-white/30 transition-colors rounded-md hover:bg-white/[0.03] disabled:opacity-50"
                title="Attach image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              </button>
            </div>
            {isStreaming ? (
              <button onClick={onStop} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white/40 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-md transition-colors">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><rect width="8" height="8" rx="1" /></svg>
                Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150',
                  value.trim() && !disabled
                    ? 'bg-white text-black hover:bg-white/90 active:scale-95'
                    : 'bg-white/[0.04] text-white/15',
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
