import { useMutation } from '@tanstack/react-query'
import { venice, veniceBlob } from '../lib/venice-client'

export function useImageEdit() {
  return useMutation({
    mutationFn: async (req: { image: string; prompt: string; modelId?: string; aspect_ratio?: string }) => {
      const blob = await veniceBlob('/image/edit', req)
      return URL.createObjectURL(blob)
    },
  })
}

export function useImageUpscale() {
  return useMutation({
    mutationFn: async (req: { image: string; scale?: number; enhance?: boolean; enhanceCreativity?: number; enhancePrompt?: string; replication?: number }) => {
      const blob = await veniceBlob('/image/upscale', req)
      return URL.createObjectURL(blob)
    },
  })
}

export function useBackgroundRemove() {
  return useMutation({
    mutationFn: async (image: string) => {
      const blob = await veniceBlob('/image/background-remove', { image })
      return URL.createObjectURL(blob)
    },
  })
}
