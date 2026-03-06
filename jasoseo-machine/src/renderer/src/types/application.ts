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
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy | null
  hrIntents: HRIntentItem[] | null
  status: AppStatus
  feedbackNote: string | null
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
