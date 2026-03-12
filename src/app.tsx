import { useState, useEffect, lazy, Suspense } from 'react'
import { useSettingsStore, type Tab } from './stores/settings-store'
import { useChatStore } from './stores/chat-store'
import { Sidebar } from './components/layout/sidebar'
import { Header } from './components/layout/header'
import { ApiKeyDialog } from './components/layout/api-key-dialog'
import { ChatView } from './components/chat/chat-view'
import { ImagePage } from './components/image/image-page'
import { AudioView } from './components/audio/audio-view'
import { MusicView } from './components/music/music-view'
import { VideoView } from './components/video/video-view'
import { EmbeddingsView } from './components/embeddings/embeddings-view'

const LazyWorkflowsView = lazy(() => import('./components/workflows/workflows-view').then((m) => ({ default: m.WorkflowsView })))
function WorkflowsView() {
  return <Suspense fallback={<div className="flex items-center justify-center h-full text-[12px] text-white/15">Loading workflows...</div>}><LazyWorkflowsView /></Suspense>
}

const views = {
  chat: ChatView,
  image: ImagePage,
  audio: AudioView,
  music: MusicView,
  video: VideoView,
  embeddings: EmbeddingsView,
  workflows: WorkflowsView,
} as const

const TAB_ORDER: Tab[] = ['chat', 'image', 'audio', 'music', 'video', 'embeddings', 'workflows']

export function App() {
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const activeTab = useSettingsStore((s) => s.activeTab)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)
  const ActiveView = views[activeTab]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (!isMeta) return

      if (e.key === 'n') {
        e.preventDefault()
        setActiveTab('chat')
        useChatStore.getState().setActiveConversation(null)
        return
      }

      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= TAB_ORDER.length) {
        e.preventDefault()
        setActiveTab(TAB_ORDER[num - 1])
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveTab])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header onOpenApiKey={() => setApiKeyOpen(true)} />
        <main className="flex-1 min-h-0 overflow-hidden">
          <ActiveView />
        </main>
      </div>
      <ApiKeyDialog open={apiKeyOpen} onClose={() => setApiKeyOpen(false)} />
    </div>
  )
}
