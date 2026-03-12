import { useMutation } from '@tanstack/react-query'
import { veniceBlob, veniceFormData } from '../lib/venice-client'
import type { TTSRequest } from '../types/venice'

export function useTTS() {
  return useMutation({
    mutationFn: async (req: TTSRequest) => {
      const blob = await veniceBlob('/audio/speech', req)
      return URL.createObjectURL(blob)
    },
  })
}

export function useTranscription() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('model', 'whisper-large-v3')
      return veniceFormData<{ text: string }>('/audio/transcriptions', formData)
    },
  })
}
