export type HRIntent = 'Execution' | 'Growth' | 'Stability' | 'Communication'
export type Strategy = 'Conservative' | 'Balanced' | 'Aggressive'
export type AppStatus = 'draft' | 'completed' | 'passed' | 'failed'
export type CLStatus = 'draft' | 'analysis' | 'ready' | 'verified'

export interface HRIntentItem {
  intent: HRIntent
  reason: string
}

export interface Application {
  id: string
  createdAt: string
  updatedAt: string
  currentDate: string
  targetRecruitmentSeason: string
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy | null
  hrIntents: HRIntentItem[] | null
  status: AppStatus
  feedbackNote: string | null
  recruitmentContext?: RecruitmentContext
}

export interface RecruitmentContext {
  foundLinks: { title: string; url: string }[]
  hiringValues: string[]
  preferredQualifications: string[]
  isConfirmed: boolean
  lastUpdated: string
}
