import type {
  Strategy,
  HRIntentItem,
  AnalysisResult,
  VerificationResult,
  QuestionInput,
  RecruitmentContext
} from './application'

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface WizardQuestion {
  id: string
  questionNumber: number
  question: string
  charLimit: number
  currentStep: WizardStep
  analysisResult: AnalysisResult | null
  approvedEpisodes: string[]
  generatedText: string
  generatedSections: {
    opening: string
    body: string
    closing: string
  }
  verificationResult: VerificationResult | null
  status: 'pending' | 'in_progress' | 'completed'
}

export interface SetupDraft {
  mode: 'select' | 'manual' | 'smart' | 'job-select'
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy
  questions: QuestionInput[]
  smartUrl: string
  jobOptions: Array<{ jobTitle: string; jobPosting: string; questions: QuestionInput[] }>
  pendingCompanyName: string
}

export interface WizardState {
  applicationId: string
  boundProfileId: string // 작성 세션이 바인딩된 프로필 ID
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy | null
  hrIntents: HRIntentItem[] | null
  recruitmentContext: RecruitmentContext | null
  questions: WizardQuestion[]
  activeQuestionIndex: number
  step0Completed: boolean
  isGenerating: boolean
  isVerifying: boolean
  activePatternIds: string[]
  useDefaultPatterns: boolean
  setupDraft: SetupDraft | null
}
