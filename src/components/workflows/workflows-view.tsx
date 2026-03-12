import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore, type VeniceNodeData, type VeniceNodeType } from '../../stores/workflow-store'
import { WorkflowNode } from './workflow-node'
import { executeWorkflow } from '../../lib/workflow-engine'
import { generateId } from '../../lib/utils'
import { cn } from '../../lib/utils'

const nodeTypes = { venice: WorkflowNode }

function PaletteInputIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 9 8 12 2 12" /></svg>
}
function PaletteChatIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
}
function PaletteImageIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
}
function PaletteSpeakerIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /></svg>
}
function PaletteMusicIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
}
function PaletteVideoIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
}
function PaletteOutputIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8M12 8v8" /></svg>
}

const NODE_PALETTE: Array<{ type: VeniceNodeType; label: string; Icon: () => React.JSX.Element; color: string }> = [
  { type: 'textInput', label: 'Input', Icon: PaletteInputIcon, color: 'text-blue-400/50' },
  { type: 'chat', label: 'LLM', Icon: PaletteChatIcon, color: 'text-purple-400/50' },
  { type: 'imageGen', label: 'Image Gen', Icon: PaletteImageIcon, color: 'text-pink-400/50' },
  { type: 'tts', label: 'Text to Speech', Icon: PaletteSpeakerIcon, color: 'text-green-400/50' },
  { type: 'music', label: 'Music Gen', Icon: PaletteMusicIcon, color: 'text-yellow-400/50' },
  { type: 'video', label: 'Video Gen', Icon: PaletteVideoIcon, color: 'text-orange-400/50' },
  { type: 'output', label: 'Output', Icon: PaletteOutputIcon, color: 'text-white/40' },
]

const DEFAULT_MODELS: Record<VeniceNodeType, string> = {
  textInput: '',
  output: '',
  chat: 'llama-3.3-70b',
  imageGen: 'z-image-turbo',
  tts: 'tts-kokoro',
  music: 'stable-audio',
  video: 'wan-2.1',
}

const TEMPLATES: Array<{ name: string; desc: string; build: () => { nodes: Node<VeniceNodeData>[]; edges: Edge[] } }> = [
  {
    name: 'Write + Illustrate',
    desc: 'LLM expands a concept into an image prompt, then generates the image',
    build: () => {
      const ids = [generateId(), generateId(), generateId()]
      return {
        nodes: [
          { id: ids[0], type: 'venice', position: { x: 250, y: 50 }, data: { label: 'Input', nodeType: 'textInput' as const, model: '', prompt: '', inputText: 'A cozy coffee shop on a rainy day' } },
          { id: ids[1], type: 'venice', position: { x: 250, y: 220 }, data: { label: 'LLM', nodeType: 'chat' as const, model: 'llama-3.3-70b', prompt: 'Write a vivid, detailed image generation prompt based on this concept. Output only the prompt, no explanation.', temperature: 0.8 } },
          { id: ids[2], type: 'venice', position: { x: 250, y: 420 }, data: { label: 'Image Gen', nodeType: 'imageGen' as const, model: 'z-image-turbo', prompt: '', steps: 25 } },
        ],
        edges: [
          { id: `e-${ids[0]}-${ids[1]}`, source: ids[0], target: ids[1], animated: true },
          { id: `e-${ids[1]}-${ids[2]}`, source: ids[1], target: ids[2], animated: true },
        ],
      }
    },
  },
  {
    name: 'Research + Summarize',
    desc: 'Web search for a topic, then summarize into bullet points',
    build: () => {
      const ids = [generateId(), generateId(), generateId()]
      return {
        nodes: [
          { id: ids[0], type: 'venice', position: { x: 250, y: 50 }, data: { label: 'Input', nodeType: 'textInput' as const, model: '', prompt: '', inputText: 'Latest developments in quantum computing' } },
          { id: ids[1], type: 'venice', position: { x: 250, y: 220 }, data: { label: 'LLM', nodeType: 'chat' as const, model: 'llama-3.3-70b', prompt: 'Research the following topic thoroughly. Provide detailed findings with specific facts and sources.', webSearch: 'on' as const, temperature: 0.7 } },
          { id: ids[2], type: 'venice', position: { x: 250, y: 450 }, data: { label: 'LLM', nodeType: 'chat' as const, model: 'llama-3.3-70b', prompt: 'Summarize the following research into 5 concise bullet points.', temperature: 0.3 } },
        ],
        edges: [
          { id: `e-${ids[0]}-${ids[1]}`, source: ids[0], target: ids[1], animated: true },
          { id: `e-${ids[1]}-${ids[2]}`, source: ids[1], target: ids[2], animated: true },
        ],
      }
    },
  },
  {
    name: 'Write + Narrate',
    desc: 'LLM writes an explanation, then TTS reads it aloud',
    build: () => {
      const ids = [generateId(), generateId(), generateId()]
      return {
        nodes: [
          { id: ids[0], type: 'venice', position: { x: 250, y: 50 }, data: { label: 'Input', nodeType: 'textInput' as const, model: '', prompt: '', inputText: 'Explain how black holes form in simple terms' } },
          { id: ids[1], type: 'venice', position: { x: 250, y: 220 }, data: { label: 'LLM', nodeType: 'chat' as const, model: 'llama-3.3-70b', prompt: 'Write a clear, engaging explanation suitable for narration. Keep it under 200 words.', temperature: 0.7 } },
          { id: ids[2], type: 'venice', position: { x: 250, y: 450 }, data: { label: 'Text to Speech', nodeType: 'tts' as const, model: 'tts-kokoro', prompt: '', voice: 'af_sky' } },
        ],
        edges: [
          { id: `e-${ids[0]}-${ids[1]}`, source: ids[0], target: ids[1], animated: true },
          { id: `e-${ids[1]}-${ids[2]}`, source: ids[1], target: ids[2], animated: true },
        ],
      }
    },
  },
]

function WorkflowCanvas() {
  const { activeWorkflowId, workflows, updateWorkflow, updateNodeResult, setIsRunning, isRunning, clearResults } = useWorkflowStore()
  const workflow = workflows.find((w) => w.id === activeWorkflowId)

  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges ?? [])
  const { getNodes, getEdges } = useReactFlow()

  // Use a ref-based save to always get latest nodes/edges
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const debouncedSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (activeWorkflowId) {
        updateWorkflow(activeWorkflowId, { nodes: getNodes() as Node<VeniceNodeData>[], edges: getEdges() })
      }
    }, 200)
  }, [activeWorkflowId, updateWorkflow, getNodes, getEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
      debouncedSave()
    },
    [setEdges, debouncedSave],
  )

  const addNode = (nodeType: VeniceNodeType) => {
    const id = generateId()
    const newNode: Node<VeniceNodeData> = {
      id,
      type: 'venice',
      position: { x: 250 + Math.random() * 100, y: 100 + nodes.length * 180 },
      data: {
        label: nodeType,
        nodeType,
        model: DEFAULT_MODELS[nodeType],
        prompt: '',
        inputText: nodeType === 'textInput' ? '' : undefined,
      },
    }
    setNodes((nds) => [...nds, newNode])
    debouncedSave()
  }

  const handleRun = async () => {
    if (isRunning) return
    // Get current nodes/edges from React Flow (source of truth)
    const currentNodes = getNodes() as Node<VeniceNodeData>[]
    const currentEdges = getEdges()
    if (currentNodes.length === 0) return

    // Save to store first
    if (activeWorkflowId) {
      updateWorkflow(activeWorkflowId, { nodes: currentNodes, edges: currentEdges })
    }

    clearResults()
    setIsRunning(true)
    const initial: Record<string, { nodeId: string; status: 'pending'; output: undefined; error: undefined }> = {}
    for (const n of currentNodes) {
      initial[n.id] = { nodeId: n.id, status: 'pending', output: undefined, error: undefined }
    }
    useWorkflowStore.getState().setRunResults(initial)

    try {
      await executeWorkflow(currentNodes, currentEdges, updateNodeResult)
    } finally {
      setIsRunning(false)
    }
  }

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      debouncedSave()
    },
    [onNodesChange, debouncedSave],
  )

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      debouncedSave()
    },
    [onEdgesChange, debouncedSave],
  )

  const memoNodeTypes = useMemo(() => nodeTypes, [])

  if (!workflow) return null

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-44 border-r border-white/[0.06] bg-[#0a0a0a] flex flex-col shrink-0">
        <div className="p-3 border-b border-white/[0.06]">
          <span className="text-[10px] font-medium text-white/15 uppercase tracking-[0.08em]">Add Node</span>
        </div>
        <div className="p-2 flex flex-col gap-1">
          {NODE_PALETTE.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors text-left"
            >
              <span className={item.color}><item.Icon /></span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={handleRun}
            disabled={isRunning || nodes.length === 0}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all',
              isRunning
                ? 'bg-white/[0.06] text-white/30 cursor-wait'
                : 'bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed',
            )}
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Run Workflow
              </>
            )}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={memoNodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-[#080808]"
          defaultEdgeOptions={{ animated: true, style: { stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.03)" />
          <Controls className="!bg-[#111] !border-white/[0.06] !shadow-xl [&>button]:!bg-[#111] [&>button]:!border-white/[0.06] [&>button]:!text-white/30 [&>button:hover]:!bg-white/[0.06]" />
          <MiniMap
            nodeColor="rgba(255,255,255,0.1)"
            maskColor="rgba(0,0,0,0.8)"
            className="!bg-[#0a0a0a] !border-white/[0.06]"
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export function WorkflowsView() {
  const { workflows, activeWorkflowId, createWorkflow, deleteWorkflow, setActiveWorkflow } = useWorkflowStore()
  const [newName, setNewName] = useState('')

  const handleCreate = (name?: string, template?: (typeof TEMPLATES)[number]) => {
    const n = name?.trim() || 'Untitled Workflow'
    const id = createWorkflow(n)
    if (template) {
      const { nodes, edges } = template.build()
      useWorkflowStore.getState().updateWorkflow(id, { nodes, edges })
    }
    setNewName('')
  }

  if (activeWorkflowId && workflows.find((w) => w.id === activeWorkflowId)) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2.5 px-3 py-1.5 border-b border-white/[0.06] bg-[#0a0a0a] shrink-0">
          <button
            onClick={() => setActiveWorkflow(null)}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="w-px h-3.5 bg-white/[0.06]" />
          <span className="text-[11px] text-white/50 font-medium">
            {workflows.find((w) => w.id === activeWorkflowId)?.name}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <ReactFlowProvider>
            <WorkflowCanvas key={activeWorkflowId} />
          </ReactFlowProvider>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-[13px] text-white/60 font-medium mb-1">Workflows</h2>
        <p className="text-[10px] text-white/20 mb-6">Chain Venice models together visually</p>

        <div className="flex gap-2 mb-6">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate(newName)}
            placeholder="Workflow name..."
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none placeholder:text-white/15 focus:border-white/[0.12]"
          />
          <button
            onClick={() => handleCreate(newName)}
            className="text-[11px] font-medium px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 transition-colors"
          >
            New Workflow
          </button>
        </div>

        <h3 className="text-[10px] font-medium text-white/15 uppercase tracking-[0.08em] mb-3">Templates</h3>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => handleCreate(t.name, t)}
              className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-all text-left"
            >
              <div className="text-[12px] text-white/60 font-medium mb-1">{t.name}</div>
              <div className="text-[10px] text-white/20">{t.desc}</div>
            </button>
          ))}
        </div>

        {workflows.length > 0 && (
          <>
            <h3 className="text-[10px] font-medium text-white/15 uppercase tracking-[0.08em] mb-3">Saved Workflows</h3>
            <div className="flex flex-col gap-2">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all cursor-pointer"
                  onClick={() => setActiveWorkflow(wf.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white/60 font-medium truncate">{wf.name}</div>
                    <div className="text-[10px] text-white/15">{wf.nodes.length} nodes</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id) }}
                    className="text-[10px] text-white/15 hover:text-red-400/60 transition-colors px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
