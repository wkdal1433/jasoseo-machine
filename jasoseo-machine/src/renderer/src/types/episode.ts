import type { HRIntent } from './application'

export type EpisodeStatus = 'draft' | 'needs_review' | 'ready'

export interface Episode {
  id: string
  title: string
  fileName: string
  period: string
  role: string
  techStack: string[]
  hrIntents: HRIntent[]
  summary: string
  rawContent: string
  status: EpisodeStatus // 신호등 시스템용 상태
}
