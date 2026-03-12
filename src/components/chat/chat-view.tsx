import { useEffect, useRef } from 'react'
import { useChatStore } from '../../stores/chat-store'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useChat } from '../../hooks/use-chat'
import { useAuthStore } from '../../stores/auth-store'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'
import { VeniceParams } from './venice-params'
import { VeniceLogo } from '../ui/logo'

export function ChatView() {
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const conversation = useChatStore((s) => {
    const id = s.activeConversationId
    return id ? s.conversations.find((c) => c.id === id) : undefined
  })
  const apiKey = useAuthStore((s) => s.apiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModels.chat)
  const { data: models } = useModels('text')
  const model = selectedModel || models?.[0]?.id || 'llama-3.3-70b'
  const { send, stop, regenerate, isStreaming } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const messageCount = conversation?.messages.length ?? 0
  const lastContent = conversation?.messages[messageCount - 1]?.content
  const lastLen = typeof lastContent === 'string' ? lastContent.length : 0
  // Scroll on new messages + periodically during streaming (every ~200 chars)
  const scrollTrigger = `${messageCount}-${Math.floor(lastLen / 200)}`
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [scrollTrigger])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <VeniceLogo size={28} className="mb-4 opacity-60" />
            <p className="text-[12px] text-white/15 mb-4">Select a model and start typing.</p>
            <VeniceParams />
          </div>
        ) : (
          <>
            <div className="border-b border-white/[0.04]">
              <VeniceParams />
            </div>
            <div className="w-full max-w-[840px] mx-auto py-5 px-5 flex flex-col gap-5">
              {conversation.messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  index={i}
                  onCopy={() => {}}
                  onDelete={() => { if (conversation) deleteMessage(conversation.id, i) }}
                  onRegenerate={msg.role === 'assistant' && i === conversation.messages.length - 1 ? () => regenerate(model) : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>
      <ChatInput onSend={(msg, images) => send(msg, model, images)} onStop={stop} isStreaming={isStreaming} disabled={!apiKey} />
    </div>
  )
}
