import { useState } from 'react'
import { ImageView } from './image-view'
import { ImageTools } from './image-tools'
import { cn } from '../../lib/utils'

type ImageTab = 'generate' | 'tools'

export function ImagePage() {
  const [tab, setTab] = useState<ImageTab>('generate')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-white/[0.04]">
        {(['generate', 'tools'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'text-[11px] font-medium px-2.5 py-[3px] rounded-full transition-all duration-150',
              tab === t ? 'bg-white text-black' : 'bg-white/[0.03] text-white/20 hover:text-white/40 hover:bg-white/[0.05]',
            )}
          >
            {t === 'generate' ? 'Generate' : 'Edit / Upscale / BG Remove'}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'generate' ? <ImageView /> : <ImageTools />}
      </div>
    </div>
  )
}
