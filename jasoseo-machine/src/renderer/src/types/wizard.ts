import type {
  Strategy,
  HRIntentItem,
  AnalysisResult,
  VerificationResult,
  QuestionInput
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

export interface WizardState {
  applicationId: string
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy | null
  hrIntents: HRIntentItem[] | null
  questions: WizardQuestion[]
  activeQuestionIndex: number
  step0Completed: boolean
  isGenerating: boolean
  isVerifying: boolean
}
