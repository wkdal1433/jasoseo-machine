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
  autoRegenerate?: boolean  // 검증 화면에서 "피드백 반영 재생성" 클릭 시 Step3 마운트 시 자동 실행
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
  strategyConfidence: number | null
  hrIntents: HRIntentItem[] | null
  alternativeIntents: HRIntentItem[] | null
  recruitmentContext: RecruitmentContext | null
  questions: WizardQuestion[]
  activeQuestionIndex: number
  step0Completed: boolean
  isGenerating: boolean
  isVerifying: boolean
  activePatternIds: string[]
  useDefaultPatterns: boolean
  setupDraft: SetupDraft | null
  // 스트림 전역 상태 — 페이지 이동해도 유지
  generatingQuestionIndex: number | null
  streamError: string | null
  generationCompleteNotification: string | null
}
