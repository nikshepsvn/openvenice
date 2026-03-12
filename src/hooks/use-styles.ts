import { useQuery } from '@tanstack/react-query'
import { venice } from '../lib/venice-client'
import type { StylesResponse } from '../types/venice'

export function useStyles() {
  return useQuery({
    queryKey: ['image-styles'],
    queryFn: () => venice<StylesResponse>('/image/styles', { noAuth: true }),
    staleTime: 10 * 60 * 1000,
    select: (data) => data.data,
  })
}
