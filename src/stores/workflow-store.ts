import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Node, Edge } from '@xyflow/react'
import { generateId } from '../lib/utils'

export type VeniceNodeType = 'chat' | 'imageGen' | 'tts' | 'music' | 'video' | 'textInput' | 'output'

export interface VeniceNodeData extends Record<string, unknown> {
  label: string
  nodeType: VeniceNodeType
  model: string
  prompt: string
  // Chat-specific
  temperature?: number
  maxTokens?: number
  webSearch?: 'off' | 'on' | 'auto'
  // Image-specific
  negativePrompt?: string
  steps?: number
  style?: string
  aspectRatio?: string
  hideWatermark?: boolean
  width?: number
  height?: number
  // TTS-specific
  voice?: string
  speed?: number
  responseFormat?: string
  // Music-specific
  duration?: number
  instrumental?: boolean
  lyrics?: string
  // Video-specific
  videoDuration?: string
  videoResolution?: string
  videoAspectRatio?: string
  // Text input
  inputText?: string
}

export interface Workflow {
  id: string
  name: string
  nodes: Node<VeniceNodeData>[]
  edges: Edge[]
  createdAt: number
}

export type NodeResult = {
  nodeId: string
  status: 'pending' | 'running' | 'done' | 'error'
  output?: string
  error?: string
}

interface WorkflowState {
  workflows: Workflow[]
  activeWorkflowId: string | null
  runResults: Record<string, NodeResult>
  isRunning: boolean

  createWorkflow: (name: string) => string
  updateWorkflow: (id: string, updates: Partial<Pick<Workflow, 'name' | 'nodes' | 'edges'>>) => void
  deleteWorkflow: (id: string) => void
  setActiveWorkflow: (id: string | null) => void
  setRunResults: (results: Record<string, NodeResult>) => void
  updateNodeResult: (nodeId: string, result: Partial<NodeResult>) => void
  setIsRunning: (running: boolean) => void
  clearResults: () => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      workflows: [],
      activeWorkflowId: null,
      runResults: {},
      isRunning: false,

      createWorkflow: (name) => {
        const id = generateId()
        const workflow: Workflow = {
          id,
          name,
          nodes: [],
          edges: [],
          createdAt: Date.now(),
        }
        set((s) => ({
          workflows: [workflow, ...s.workflows],
          activeWorkflowId: id,
        }))
        return id
      },

      updateWorkflow: (id, updates) =>
        set((s) => ({
          workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        })),

      deleteWorkflow: (id) =>
        set((s) => ({
          workflows: s.workflows.filter((w) => w.id !== id),
          activeWorkflowId: s.activeWorkflowId === id ? null : s.activeWorkflowId,
        })),

      setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

      setRunResults: (results) => set({ runResults: results }),

      updateNodeResult: (nodeId, result) =>
        set((s) => ({
          runResults: { ...s.runResults, [nodeId]: { ...s.runResults[nodeId], ...result } as NodeResult },
        })),

      setIsRunning: (running) => set({ isRunning: running }),

      clearResults: () => set({ runResults: {} }),
    }),
    {
      name: 'venice-workflows',
      partialize: (state) => ({
        workflows: state.workflows.slice(0, 20),
        activeWorkflowId: state.activeWorkflowId,
      }),
    },
  ),
)
