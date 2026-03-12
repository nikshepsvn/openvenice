import { useMutation } from '@tanstack/react-query'
import { venice } from '../lib/venice-client'
import type { ImageGenerateRequest, ImageGenerateResponse } from '../types/venice'

export function useImageGenerate() {
  return useMutation({
    mutationFn: (req: ImageGenerateRequest) =>
      venice<ImageGenerateResponse>('/image/generate', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  })
}
