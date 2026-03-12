import { memo, useCallback, useState } from 'react'
import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react'
import type { VeniceNodeData, VeniceNodeType } from '../../stores/workflow-store'
import { useWorkflowStore } from '../../stores/workflow-store'
import { useModels } from '../../hooks/use-models'
import { Select } from '../ui/select'
import { cn } from '../../lib/utils'

function InputIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 9 8 12 2 12" /></svg>
}
function ChatIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
}
function ImageIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
}
function SpeakerIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
}
function MusicIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
}
function VideoIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
}

function OutputIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8M12 8v8" /></svg>
}

// Map node types to API model type filters
const MODEL_TYPE_MAP: Record<VeniceNodeType, string | undefined> = {
  textInput: undefined,
  output: undefined,
  chat: 'text',
  imageGen: 'image',
  tts: 'tts',
  music: 'music',
  video: 'video',
}

const NODE_CONFIG: Record<VeniceNodeType, { label: string; Icon: () => React.JSX.Element; color: string; hasInput: boolean; hasOutput: boolean }> = {
  textInput: { label: 'Input', Icon: InputIcon, color: 'border-blue-500/30', hasInput: false, hasOutput: true },
  chat: { label: 'LLM', Icon: ChatIcon, color: 'border-purple-500/30', hasInput: true, hasOutput: true },
  imageGen: { label: 'Image Gen', Icon: ImageIcon, color: 'border-pink-500/30', hasInput: true, hasOutput: true },
  tts: { label: 'Text to Speech', Icon: SpeakerIcon, color: 'border-green-500/30', hasInput: true, hasOutput: true },
  music: { label: 'Music Gen', Icon: MusicIcon, color: 'border-yellow-500/30', hasInput: true, hasOutput: true },
  video: { label: 'Video Gen', Icon: VideoIcon, color: 'border-orange-500/30', hasInput: true, hasOutput: true },
  output: { label: 'Output', Icon: OutputIcon, color: 'border-white/20', hasInput: true, hasOutput: false },
}

const selectCls = 'nodrag bg-white/[0.03] border border-white/[0.06] rounded px-1.5 py-0.5 text-[9px] text-white/40 outline-none'
const inputCls = 'nodrag w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1 text-[10px] text-white/60 outline-none placeholder:text-white/15'

type WorkflowNode = Node<VeniceNodeData>

function ModelSelect({ nodeType, value, onChange }: { nodeType: VeniceNodeType; value: string; onChange: (v: string) => void }) {
  const modelType = MODEL_TYPE_MAP[nodeType]
  const { data: models } = useModels(modelType)
  const options = models?.map((m) => ({ value: m.id, label: m.model_spec?.name || m.id })) ?? []

  return (
    <div className="nodrag">
      <Select
        value={value}
        onChange={onChange}
        options={options}
        searchable
        placeholder="Select model..."
        className="w-full [&_button]:!py-1 [&_button]:!text-[10px] [&_button]:!px-2"
      />
    </div>
  )
}

function WorkflowNodeComponent({ id, data }: NodeProps<WorkflowNode>) {
  const config = NODE_CONFIG[data.nodeType]
  const result = useWorkflowStore((s) => s.runResults[id])
  const { setNodes } = useReactFlow()
  const [outputExpanded, setOutputExpanded] = useState(false)

  const updateNode = useCallback((updates: Partial<VeniceNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
    )
  }, [id, setNodes])

  const deleteNode = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
  }, [id, setNodes])

  return (
    <div
      className={cn(
        'rounded-xl border-2 bg-[#111] shadow-xl min-w-[240px] max-w-[280px]',
        config.color,
        result?.status === 'running' && 'ring-2 ring-white/20 animate-pulse',
        result?.status === 'done' && 'ring-2 ring-green-500/30',
        result?.status === 'error' && 'ring-2 ring-red-500/30',
      )}
    >
      {config.hasInput && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white/30 !border-2 !border-[#111]" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <span className="text-white/30"><config.Icon /></span>
        <span className="text-[11px] font-medium text-white/60">{config.label}</span>
        {result?.status === 'running' && <span className="text-[9px] text-white/30 ml-auto mr-1">Running...</span>}
        {result?.status === 'done' && <span className="text-[9px] text-green-400/60 ml-auto mr-1">Done</span>}
        {result?.status === 'error' && <span className="text-[9px] text-red-400/60 ml-auto mr-1">Error</span>}
        {!result?.status && <span className="ml-auto" />}
        <button
          onClick={deleteNode}
          className="nodrag text-white/10 hover:text-red-400/60 transition-colors p-0.5"
          title="Delete node"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {data.nodeType === 'output' ? (
          // Output node — displays upstream result
          result?.status === 'done' && result.output ? (
            <div className="min-h-[60px]">
              {result.output.startsWith('[audio:') ? (
                <audio src={result.output.slice(7, -1)} controls className="w-full h-8" />
              ) : result.output.startsWith('[video:') ? (
                <a href={result.output.slice(7, -1)} target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 underline">Open video</a>
              ) : result.output.startsWith('[image:') ? (
                <img src={result.output.slice(7, -1)} alt="Generated" className="w-full rounded-lg border border-white/[0.06]" />
              ) : (
                <p className={cn('text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap', !outputExpanded && 'line-clamp-8')} onClick={() => setOutputExpanded(!outputExpanded)}>
                  {result.output}
                </p>
              )}
            </div>
          ) : result?.status === 'running' ? (
            <div className="min-h-[40px] flex items-center justify-center">
              <span className="text-[10px] text-white/20">Waiting for input...</span>
            </div>
          ) : result?.status === 'error' ? (
            <p className="text-[10px] text-red-400/60">{result.error}</p>
          ) : (
            <div className="min-h-[40px] flex items-center justify-center">
              <span className="text-[10px] text-white/10">Run workflow to see output</span>
            </div>
          )
        ) : data.nodeType === 'textInput' ? (
          <textarea
            value={data.inputText ?? ''}
            onChange={(e) => updateNode({ inputText: e.target.value })}
            placeholder="Enter starting text..."
            rows={3}
            className="nodrag nowheel w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1.5 text-[11px] text-white/70 outline-none resize-none placeholder:text-white/15"
          />
        ) : (
          <>
            <ModelSelect
              nodeType={data.nodeType}
              value={data.model}
              onChange={(v) => updateNode({ model: v })}
            />
            <textarea
              value={data.prompt}
              onChange={(e) => updateNode({ prompt: e.target.value })}
              placeholder="Instructions for this step..."
              rows={2}
              className="nodrag nowheel w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1.5 text-[11px] text-white/70 outline-none resize-none placeholder:text-white/15"
            />

            {/* Chat params */}
            {data.nodeType === 'chat' && (
              <div className="flex flex-wrap gap-1.5">
                <select
                  value={data.webSearch ?? 'off'}
                  onChange={(e) => updateNode({ webSearch: e.target.value as 'off' | 'on' | 'auto' })}
                  className={selectCls}
                >
                  <option value="off">Search off</option>
                  <option value="on">Search on</option>
                  <option value="auto">Search auto</option>
                </select>
                <input
                  type="number"
                  value={data.temperature ?? 0.7}
                  onChange={(e) => updateNode({ temperature: parseFloat(e.target.value) })}
                  step={0.1}
                  min={0}
                  max={2}
                  className={cn(selectCls, 'w-14')}
                  title="Temperature"
                />
                <input
                  type="number"
                  value={data.maxTokens ?? 4096}
                  onChange={(e) => updateNode({ maxTokens: parseInt(e.target.value) })}
                  step={256}
                  min={64}
                  max={32768}
                  className={cn(selectCls, 'w-[72px]')}
                  title="Max tokens"
                />
              </div>
            )}

            {/* Image params */}
            {data.nodeType === 'imageGen' && (
              <>
                <input
                  value={data.negativePrompt ?? ''}
                  onChange={(e) => updateNode({ negativePrompt: e.target.value })}
                  placeholder="Negative prompt..."
                  className={inputCls}
                />
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <label className="text-[8px] text-white/20 mb-0.5 block">Steps</label>
                    <input
                      type="number"
                      value={data.steps ?? 20}
                      onChange={(e) => updateNode({ steps: parseInt(e.target.value) })}
                      min={1}
                      max={50}
                      className={selectCls + ' w-full'}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] text-white/20 mb-0.5 block">Size</label>
                    <select
                      value={`${data.width ?? 1024}x${data.height ?? 1024}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split('x').map(Number)
                        updateNode({ width: w, height: h })
                      }}
                      className={selectCls + ' w-full'}
                    >
                      <option value="512x512">512</option>
                      <option value="768x768">768</option>
                      <option value="1024x1024">1024</option>
                      <option value="1280x1280">1280</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={data.style ?? ''}
                    onChange={(e) => updateNode({ style: e.target.value })}
                    placeholder="Style preset..."
                    className={cn(inputCls, 'flex-1')}
                  />
                  <label className="nodrag flex items-center gap-1 text-[9px] text-white/30 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={data.hideWatermark ?? true}
                      onChange={(e) => updateNode({ hideWatermark: e.target.checked })}
                      className="nodrag w-3 h-3 accent-white/50"
                    />
                    No WM
                  </label>
                </div>
              </>
            )}

            {/* TTS params */}
            {data.nodeType === 'tts' && (
              <div className="flex flex-wrap gap-1.5">
                <div className="flex-1 min-w-[80px]">
                  <label className="text-[8px] text-white/20 mb-0.5 block">Voice</label>
                  <input
                    value={data.voice ?? 'af_sky'}
                    onChange={(e) => updateNode({ voice: e.target.value })}
                    placeholder="Voice ID"
                    className={inputCls}
                  />
                </div>
                <div className="w-14">
                  <label className="text-[8px] text-white/20 mb-0.5 block">Speed</label>
                  <input
                    type="number"
                    value={data.speed ?? 1}
                    onChange={(e) => updateNode({ speed: parseFloat(e.target.value) })}
                    step={0.25}
                    min={0.25}
                    max={4}
                    className={selectCls + ' w-full'}
                  />
                </div>
                <div className="w-16">
                  <label className="text-[8px] text-white/20 mb-0.5 block">Format</label>
                  <select
                    value={data.responseFormat ?? 'mp3'}
                    onChange={(e) => updateNode({ responseFormat: e.target.value })}
                    className={selectCls + ' w-full'}
                  >
                    <option value="mp3">MP3</option>
                    <option value="opus">Opus</option>
                    <option value="aac">AAC</option>
                    <option value="flac">FLAC</option>
                    <option value="wav">WAV</option>
                  </select>
                </div>
              </div>
            )}

            {/* Music params */}
            {data.nodeType === 'music' && (
              <>
                <textarea
                  value={data.lyrics ?? ''}
                  onChange={(e) => updateNode({ lyrics: e.target.value })}
                  placeholder="Lyrics (optional)..."
                  rows={2}
                  className="nodrag nowheel w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1.5 text-[11px] text-white/70 outline-none resize-none placeholder:text-white/15"
                />
                <div className="flex gap-1.5 items-end">
                  <div className="flex-1">
                    <label className="text-[8px] text-white/20 mb-0.5 block">Duration (s)</label>
                    <input
                      type="number"
                      value={data.duration ?? 30}
                      onChange={(e) => updateNode({ duration: parseInt(e.target.value) })}
                      min={5}
                      max={120}
                      step={5}
                      className={selectCls + ' w-full'}
                    />
                  </div>
                  <label className="nodrag flex items-center gap-1 text-[9px] text-white/30 cursor-pointer pb-0.5">
                    <input
                      type="checkbox"
                      checked={data.instrumental ?? false}
                      onChange={(e) => updateNode({ instrumental: e.target.checked })}
                      className="nodrag w-3 h-3 accent-white/50"
                    />
                    Instrumental
                  </label>
                </div>
              </>
            )}

            {/* Video params */}
            {data.nodeType === 'video' && (
              <div className="flex flex-wrap gap-1.5">
                <div className="flex-1 min-w-[60px]">
                  <label className="text-[8px] text-white/20 mb-0.5 block">Aspect</label>
                  <select
                    value={data.videoAspectRatio ?? '16:9'}
                    onChange={(e) => updateNode({ videoAspectRatio: e.target.value })}
                    className={selectCls + ' w-full'}
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[60px]">
                  <label className="text-[8px] text-white/20 mb-0.5 block">Duration</label>
                  <select
                    value={data.videoDuration ?? ''}
                    onChange={(e) => updateNode({ videoDuration: e.target.value })}
                    className={selectCls + ' w-full'}
                  >
                    <option value="">Default</option>
                    <option value="5s">5s</option>
                    <option value="10s">10s</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[60px]">
                  <label className="text-[8px] text-white/20 mb-0.5 block">Resolution</label>
                  <select
                    value={data.videoResolution ?? ''}
                    onChange={(e) => updateNode({ videoResolution: e.target.value })}
                    className={selectCls + ' w-full'}
                  >
                    <option value="">Default</option>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {/* Output preview */}
        {result?.status === 'done' && result.output && (
          <div
            className="mt-1 p-2 rounded-lg bg-green-500/[0.04] border border-green-500/[0.08] cursor-pointer"
            onClick={() => setOutputExpanded(!outputExpanded)}
          >
            <div className="flex items-center gap-1 mb-1">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-green-400/40">
                <polyline points={outputExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
              </svg>
              <span className="text-[8px] text-green-400/40 uppercase tracking-wider font-medium">Output</span>
            </div>
            {result.output.startsWith('[audio:') ? (
              <audio src={result.output.slice(7, -1)} controls className="w-full h-7" onClick={(e) => e.stopPropagation()} />
            ) : result.output.startsWith('[video:') ? (
              <a href={result.output.slice(7, -1)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 underline" onClick={(e) => e.stopPropagation()}>
                Open video
              </a>
            ) : result.output.startsWith('[image:') ? (
              <img src={result.output.slice(7, -1)} alt="Generated" className="w-full rounded border border-white/[0.06]" />
            ) : (
              <p className={cn('text-[10px] text-white/50 leading-relaxed whitespace-pre-wrap', !outputExpanded && 'line-clamp-3')}>
                {result.output}
              </p>
            )}
          </div>
        )}
        {result?.status === 'error' && (
          <div className="mt-1 p-2 rounded-lg bg-red-500/[0.04] border border-red-500/[0.08]">
            <span className="text-[8px] text-red-400/40 uppercase tracking-wider font-medium">Error</span>
            <p className="text-[10px] text-red-400/60 mt-0.5">{result.error}</p>
          </div>
        )}
      </div>

      {config.hasOutput && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-white/30 !border-2 !border-[#111]" />
      )}
    </div>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
