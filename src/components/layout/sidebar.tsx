import { cn } from '../../lib/utils'
import { useSettingsStore, type Tab } from '../../stores/settings-store'
import { useChatStore } from '../../stores/chat-store'
import { VeniceLogo, VeniceWordmark } from '../ui/logo'

function ChatIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>)
}
function ImageIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>)
}
function AudioIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>)
}
function VideoIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>)
}
function MusicIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="15.5" r="2.5" /><path d="M8 17.5V5l12-2v12.5" /></svg>)
}
function EmbedIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>)
}

function WorkflowIcon() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M12 7v4M12 11l-6 6M12 11l6 6" /></svg>)
}

const tabs: Array<{ id: Tab; label: string; Icon: () => React.JSX.Element }> = [
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'image', label: 'Image', Icon: ImageIcon },
  { id: 'audio', label: 'Audio', Icon: AudioIcon },
  { id: 'music', label: 'Music', Icon: MusicIcon },
  { id: 'video', label: 'Video', Icon: VideoIcon },
  { id: 'embeddings', label: 'Embed', Icon: EmbedIcon },
  { id: 'workflows', label: 'Workflows', Icon: WorkflowIcon },
]

export function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen } = useSettingsStore()
  const { conversations, activeConversationId, setActiveConversation, createConversation, deleteConversation } = useChatStore()
  const selectedModel = useSettingsStore((s) => s.selectedModels.chat)

  return (
    <aside className={cn(
      'flex flex-col h-full bg-[#0a0a0a] border-r border-white/[0.06] transition-all duration-150 ease-out',
      sidebarOpen ? 'w-52' : 'w-11',
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2 h-11 shrink-0', sidebarOpen ? 'px-3' : 'px-2 justify-center')}>
        <VeniceLogo size={18} />
        {sidebarOpen && <VeniceWordmark className="text-[12px]" />}
      </div>

      {/* Nav tabs */}
      <nav className="flex flex-col gap-px px-1.5 pt-0.5">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-md text-[12px] transition-colors duration-100',
              sidebarOpen ? 'px-2 py-[5px]' : 'px-0 py-[5px] justify-center',
              activeTab === id
                ? 'bg-white/[0.06] text-white/80'
                : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]',
            )}
          >
            <Icon />
            {sidebarOpen && <span className="font-medium">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Chat history */}
      {sidebarOpen && activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0 mt-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[10px] font-medium text-white/15 uppercase tracking-[0.08em]">History</span>
            <button
              onClick={() => createConversation(selectedModel || 'llama-3.3-70b')}
              className="text-white/20 hover:text-white/60 transition-colors p-0.5"
              title="New chat (⌘N)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 pb-2">
            {conversations.length === 0 ? (
              <div className="px-2 py-5 text-[11px] text-white/8 text-center">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-1.5 px-2 py-[4px] rounded-md text-[11px] cursor-pointer transition-colors',
                    conv.id === activeConversationId
                      ? 'bg-white/[0.06] text-white/60'
                      : 'text-white/20 hover:text-white/45 hover:bg-white/[0.02]',
                  )}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                    className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-white/50 transition-all shrink-0 p-0.5"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom spacer for collapsed sidebar */}
      {!sidebarOpen && <div className="flex-1" />}

      {/* Keyboard shortcuts hint */}
      {sidebarOpen && (
        <div className="px-3 py-2.5 border-t border-white/[0.04]">
          <div className="text-[9px] text-white/8 space-y-px">
            <div className="flex justify-between"><span>New chat</span><kbd className="font-mono">⌘N</kbd></div>
            <div className="flex justify-between"><span>Switch tab</span><kbd className="font-mono">⌘1-7</kbd></div>
          </div>
        </div>
      )}
    </aside>
  )
}
