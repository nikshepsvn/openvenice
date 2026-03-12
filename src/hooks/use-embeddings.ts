import { useMutation } from '@tanstack/react-query'
import { venice } from '../lib/venice-client'
import type { EmbeddingRequest, EmbeddingResponse } from '../types/venice'

export function useEmbeddings() {
  return useMutation({
    mutationFn: (req: EmbeddingRequest) =>
      venice<EmbeddingResponse>('/embeddings', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  })
}
