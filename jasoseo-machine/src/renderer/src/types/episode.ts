import type { HRIntent } from './application'

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
}
