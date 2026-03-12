import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useAuthStore } from '../../stores/auth-store'
import { Select } from '../ui/select'

const modelTypeMap: Record<string, string> = {
  chat: 'text',
  image: 'image',
  audio: 'tts',
  music: 'music',
  video: 'video',
  embeddings: 'embedding',
}

const tabLabels: Record<string, string> = {
  chat: 'Chat',
  image: 'Image',
  audio: 'Audio',
  music: 'Music',
  video: 'Video',
  embeddings: 'Embeddings',
  workflows: 'Workflows',
}

const noModelSelector = new Set(['video', 'workflows'])

export function Header({ onOpenApiKey }: { onOpenApiKey: () => void }) {
  const { activeTab, selectedModels, setSelectedModel, toggleSidebar } = useSettingsStore()
  const apiKey = useAuthStore((s) => s.apiKey)
  const hasOwnSelector = noModelSelector.has(activeTab)
  const modelType = modelTypeMap[activeTab] || 'text'
  const { data: models } = useModels(hasOwnSelector ? undefined : modelType)
  const currentModel = hasOwnSelector ? '' : (selectedModels[activeTab] || models?.[0]?.id || '')
  const modelOptions = hasOwnSelector ? [] : (models?.map((m) => ({ value: m.id, label: m.model_spec?.name || m.id })) ?? [])

  return (
    <header className="flex items-center gap-2.5 h-10 px-2.5 border-b border-white/[0.06] bg-[#0a0a0a] shrink-0">
      <button onClick={toggleSidebar} className="text-white/20 hover:text-white/45 transition-colors p-1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <span className="text-[10px] font-medium text-white/15 uppercase tracking-[0.08em]">{tabLabels[activeTab]}</span>

      {!hasOwnSelector && (
        <>
          <div className="w-px h-4 bg-white/[0.06]" />
          <Select
            value={currentModel}
            onChange={(v) => setSelectedModel(activeTab, v)}
            options={modelOptions}
            searchable
            placeholder="Select model..."
            className="w-60"
          />
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={onOpenApiKey}
        className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border border-white/[0.05] hover:border-white/[0.1] transition-colors"
      >
        <div className={`w-1 h-1 rounded-full transition-colors ${apiKey ? 'bg-white/70' : 'bg-white/10'}`} />
        <span className={apiKey ? 'text-white/45' : 'text-white/20'}>
          {apiKey ? 'Connected' : 'API Key'}
        </span>
      </button>
    </header>
  )
}
