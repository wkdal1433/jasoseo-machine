export type HRIntent = 'Execution' | 'Growth' | 'Stability' | 'Communication'
export type Strategy = 'Conservative' | 'Balanced' | 'Aggressive'
export type AppStatus = 'draft' | 'completed' | 'passed' | 'failed'
export type CLStatus = 'pending' | 'in_progress' | 'completed'

export interface HRIntentItem {
  type: HRIntent
  reason: string
}

export interface Application {
  id: string
  createdAt: string
  updatedAt: string
  currentDate: string // 작성 시점 (예: 2026-03-09)
  targetRecruitmentSeason: string // 목표 공채 시즌 (예: 2026년 상반기)
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy | null
  hrIntents: HRIntentItem[] | null
  status: AppStatus
  feedbackNote: string | null
  recruitmentContext?: RecruitmentContext // AI가 수집한 기업 정보 컨텍스트
}

export interface RecruitmentContext {
  foundLinks: string[]
  hiringValues: string[]
  preferredQualifications: string[]
  isConfirmed: boolean
  lastUpdated: string
}

export interface CoverLetter {
  id: string
  applicationId: string
  questionNumber: number
  question: string
  charLimit: number | null
  episodesUsed: string[] | null
  analysisResult: AnalysisResult | null
  finalText: string | null
  verificationResult: VerificationResult | null
  status: CLStatus
}

export interface AnalysisResult {
  hrIntents: HRIntentItem[]
  strategy: Strategy
  strategyReason: string
  questionReframe: string
  suggestedEpisodes: SuggestedEpisode[]
}

export interface SuggestedEpisode {
  episodeId: string
  reason: string
  angle: string
}

export interface VerificationResult {
  hallucinationCheck: {
    items: VerificationItem[]
    overallPassed: boolean
  }
  failPatternCheck: {
    items: VerificationItem[]
    overallPassed: boolean
    suggestions: string[]
  }
  dualCodingCheck: {
    items: VerificationItem[]
    overallPassed: boolean
  }
}

export interface VerificationItem {
  check: string
  passed: boolean
  detail: string
}

export interface QuestionInput {
  question: string
  charLimit: number
}
