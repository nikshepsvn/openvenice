import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useModels } from '../../hooks/use-models'
import { useAuthStore } from '../../stores/auth-store'
import { useEmbeddings } from '../../hooks/use-embeddings'
import { Label, TextArea, PrimaryButton, ErrorText, EmptyState } from '../ui/shared'

const PREVIEW_COUNT = 100

export function EmbeddingsView() {
  const apiKey = useAuthStore((s) => s.apiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModels.embeddings)
  const { data: models } = useModels('embedding')
  const model = selectedModel || models?.[0]?.id || 'bge-m3'

  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const mutation = useEmbeddings()
  const data = mutation.data

  const embedding = data?.data[0]?.embedding
  const dims = embedding?.length ?? 0
  const displayValues = expanded ? embedding : embedding?.slice(0, PREVIEW_COUNT)

  const handleCopyVector = () => {
    if (embedding) navigator.clipboard.writeText(JSON.stringify(embedding))
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div><Label>Input text</Label><TextArea value={input} onChange={setInput} placeholder="Enter text to embed..." rows={6} /></div>
        <PrimaryButton onClick={() => { mutation.mutate({ model, input: input.trim() }); setExpanded(false) }} disabled={!input.trim() || !apiKey} loading={mutation.isPending}>
          Generate Embeddings
        </PrimaryButton>
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col min-w-0">
        {data ? (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="flex items-center gap-5 text-[11px]">
              <Stat label="Model" value={data.model} />
              <Stat label="Dimensions" value={String(dims)} />
              <Stat label="Tokens" value={String(data.usage.prompt_tokens)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Vector ({dims} dimensions)</Label>
                <button onClick={handleCopyVector} className="text-[10px] text-white/20 hover:text-white/40 transition-colors">Copy</button>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 max-h-[calc(100vh-240px)] overflow-y-auto">
                <code className="text-[11px] text-white/35 font-mono break-all leading-loose">
                  [{displayValues?.map((n, i) => (
                    <span key={i}>
                      <span className="text-white/50">{n.toFixed(6)}</span>
                      {i < (displayValues.length) - 1 && <span className="text-white/15">, </span>}
                    </span>
                  ))}
                  {!expanded && dims > PREVIEW_COUNT && <span className="text-white/15">, ...</span>}]
                </code>
              </div>
              {dims > PREVIEW_COUNT && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] text-white/20 hover:text-white/40 mt-2 transition-colors"
                >
                  {expanded ? `Show first ${PREVIEW_COUNT}` : `Show all ${dims} values`}
                </button>
              )}
            </div>
          </div>
        ) : (
          <EmptyState>Embedding vectors appear here</EmptyState>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/20">{label}</span>
      <span className="text-white/55 bg-white/[0.03] border border-white/[0.04] rounded px-2 py-0.5 font-mono text-[10px]">{value}</span>
    </div>
  )
}
