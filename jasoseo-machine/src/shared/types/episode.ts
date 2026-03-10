import type { HRIntentItem } from './application'

export type EpisodeStatus = 'draft' | 'needs_review' | 'ready'

export interface Episode {
  id: string
  title: string
  fileName: string
  period: string
  role: string
  techStack: string[]
  hrIntents: string[] // Simplification for shared use
  summary: string
  rawContent: string
  status: EpisodeStatus
}
