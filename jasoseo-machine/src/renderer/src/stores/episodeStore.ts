import { create } from 'zustand'
import type { Episode } from '../types/episode'
import { parseEpisodeMd } from '../lib/md-parser'

interface EpisodeState {
  episodes: Episode[]
  isLoading: boolean
  loadEpisodes: () => Promise<void>
}

export const useEpisodeStore = create<EpisodeState>((set) => ({
  episodes: [],
  isLoading: false,

  loadEpisodes: async () => {
    set({ isLoading: true })
    try {
      const files = await window.api.episodesLoad()
      const episodes = (files as { fileName: string; content: string }[])
        .map((f) => parseEpisodeMd(f.fileName, f.content))
        .sort((a, b) => a.id.localeCompare(b.id))
      set({ episodes, isLoading: false })
    } catch {
      set({ episodes: [], isLoading: false })
    }
  }
}))
