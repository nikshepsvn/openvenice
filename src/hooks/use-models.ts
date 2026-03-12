import { useQuery } from '@tanstack/react-query'
import { venice } from '../lib/venice-client'
import type { ModelsResponse, VeniceModel } from '../types/venice'

export function useModels(type?: string) {
  return useQuery({
    queryKey: ['models', type],
    queryFn: () =>
      venice<ModelsResponse>(
        `/models${type ? `?type=${type}` : ''}`,
        { noAuth: true },
      ),
    staleTime: 5 * 60 * 1000,
    select: (data) =>
      data.data
        .filter((m) => !m.model_spec?.offline)
        .sort((a, b) => a.id.localeCompare(b.id)),
  })
}

export interface VideoModelGroup {
  name: string
  textModel?: VeniceModel
  imageModel?: VeniceModel
  sets: string[]
}

export function useVideoModels() {
  const query = useModels('video')

  const groups: VideoModelGroup[] = []
  if (query.data) {
    const map = new Map<string, VideoModelGroup>()
    for (const m of query.data) {
      const c = m.model_spec?.constraints
      if (!c) continue
      const name = m.model_spec?.name || m.id
      const key = name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, { name, sets: m.model_spec?.model_sets || [] })
      }
      const group = map.get(key)!
      if (c.model_type === 'text-to-video') group.textModel = m
      else if (c.model_type === 'image-to-video') group.imageModel = m
      // Merge sets
      const newSets = m.model_spec?.model_sets || []
      for (const s of newSets) {
        if (!group.sets.includes(s)) group.sets.push(s)
      }
    }
    groups.push(...map.values())
  }

  return { ...query, groups }
}
