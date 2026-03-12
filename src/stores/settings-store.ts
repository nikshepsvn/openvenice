import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tab = 'chat' | 'image' | 'audio' | 'music' | 'video' | 'embeddings' | 'workflows'

interface SettingsState {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  selectedModels: Record<string, string>
  setSelectedModel: (tab: string, modelId: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeTab: 'chat',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      selectedModels: {},
      setSelectedModel: (tab, modelId) =>
        set((s) => ({ selectedModels: { ...s.selectedModels, [tab]: modelId } })),
    }),
    { name: 'venice-settings' },
  ),
)
