import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { WizardState, WizardQuestion, WizardStep, SetupDraft } from '../types/wizard'
import type { Strategy, HRIntentItem, AnalysisResult, VerificationResult, QuestionInput, RecruitmentContext } from '../types/application'

interface WizardActions {
  initWizard: (companyName: string, jobTitle: string, jobPosting: string, questions: QuestionInput[], strategy?: Strategy) => void
  restoreFromDraft: (savedState: Partial<WizardState>) => void
  setStep0Result: (hrIntents: HRIntentItem[], strategy: Strategy) => void
  setRecruitmentContext: (context: RecruitmentContext) => void
  setQuestionAnalysis: (questionIndex: number, analysis: AnalysisResult) => void
  approveEpisode: (questionIndex: number, episodeId: string) => void
  rejectEpisode: (questionIndex: number, episodeId: string) => void
  setGeneratedText: (questionIndex: number, text: string) => void
  appendGeneratedText: (questionIndex: number, chunk: string) => void
  setGeneratedSections: (questionIndex: number, sections: { opening: string; body: string; closing: string }) => void
  setVerificationResult: (questionIndex: number, result: VerificationResult) => void
  setQuestionStep: (questionIndex: number, step: WizardStep) => void
  setActiveQuestion: (index: number) => void
  setIsGenerating: (val: boolean) => void
  setIsVerifying: (val: boolean) => void
  setPatternConfig: (activePatternIds: string[], useDefaultPatterns: boolean) => void
  saveSetupDraft: (draft: Partial<SetupDraft>) => void
  clearSetupDraft: () => void
  completeQuestion: (questionIndex: number) => void
  reopenQuestion: (questionIndex: number) => void
  resetWizard: () => void
  getState: () => WizardState
}

const initialState: WizardState = {
  applicationId: '',
  boundProfileId: '',
  companyName: '',
  jobTitle: '',
  jobPosting: '',
  strategy: null,
  hrIntents: null,
  recruitmentContext: null,
  questions: [],
  activeQuestionIndex: 0,
  step0Completed: false,
  isGenerating: false,
  isVerifying: false,
  activePatternIds: [],
  useDefaultPatterns: true,
  setupDraft: null
}

export const useWizardStore = create<WizardState & WizardActions>((set, get) => ({
  ...initialState,

  initWizard: (companyName, jobTitle, jobPosting, questions, strategy) => {
    const appId = uuidv4()
    // 현재 활성화된 프로필 ID를 세션에 바인딩
    const currentProfileId = (window as any).api.userProfileGetSync?.()?.id || 'default'
    
    const wizardQuestions: WizardQuestion[] = questions.map((q, i) => ({
      id: uuidv4(),
      questionNumber: i + 1,
      question: q.question,
      charLimit: q.charLimit,
      currentStep: 0 as WizardStep,
      analysisResult: null,
      approvedEpisodes: [],
      generatedText: '',
      generatedSections: { opening: '', body: '', closing: '' },
      verificationResult: null,
      status: 'pending'
    }))

    set({
      applicationId: appId,
      boundProfileId: currentProfileId,
      companyName,
      jobTitle,
      jobPosting,
      strategy: strategy || null,
      hrIntents: null,
      recruitmentContext: null,
      questions: wizardQuestions,
      activeQuestionIndex: 0,
      step0Completed: false,
      isGenerating: false,
      isVerifying: false,
      activePatternIds: [],
      useDefaultPatterns: true
    })
  },

  setStep0Result: (hrIntents, strategy) => {
    set((state) => ({
      hrIntents,
      strategy,
      step0Completed: true,
      questions: state.questions.map((q) =>
        q.currentStep === 0 ? { ...q, currentStep: 1 as WizardStep } : q
      )
    }))
  },

  setRecruitmentContext: (context) => {
    set({ recruitmentContext: context })
  },

  setQuestionAnalysis: (questionIndex, analysis) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = {
        ...questions[questionIndex],
        analysisResult: analysis,
        currentStep: 2
      }
      return { questions }
    })
  },

  approveEpisode: (questionIndex, episodeId) => {
    set((state) => {
      const questions = [...state.questions]
      const q = questions[questionIndex]
      if (!q.approvedEpisodes.includes(episodeId)) {
        questions[questionIndex] = {
          ...q,
          approvedEpisodes: [...q.approvedEpisodes, episodeId]
        }
      }
      return { questions }
    })
  },

  rejectEpisode: (questionIndex, episodeId) => {
    set((state) => {
      const questions = [...state.questions]
      const q = questions[questionIndex]
      questions[questionIndex] = {
        ...q,
        approvedEpisodes: q.approvedEpisodes.filter((id) => id !== episodeId)
      }
      return { questions }
    })
  },

  setGeneratedText: (questionIndex, text) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = { ...questions[questionIndex], generatedText: text }
      return { questions }
    })
  },

  appendGeneratedText: (questionIndex, chunk) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = {
        ...questions[questionIndex],
        generatedText: questions[questionIndex].generatedText + chunk
      }
      return { questions }
    })
  },

  setGeneratedSections: (questionIndex, sections) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = { ...questions[questionIndex], generatedSections: sections }
      return { questions }
    })
  },

  setVerificationResult: (questionIndex, result) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = {
        ...questions[questionIndex],
        verificationResult: result,
        currentStep: 8
      }
      return { questions }
    })
  },

  setQuestionStep: (questionIndex, step) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = { ...questions[questionIndex], currentStep: step }
      return { questions }
    })
  },

  setActiveQuestion: (index) => set({ activeQuestionIndex: index }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setIsVerifying: (val) => set({ isVerifying: val }),
  setPatternConfig: (activePatternIds, useDefaultPatterns) => set({ activePatternIds, useDefaultPatterns }),
  saveSetupDraft: (draft) => set((state) => ({ setupDraft: { ...(state.setupDraft as SetupDraft), ...draft } as SetupDraft })),
  clearSetupDraft: () => set({ setupDraft: null }),

  completeQuestion: (questionIndex) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = { ...questions[questionIndex], status: 'completed' }
      return { questions }
    })
  },

  reopenQuestion: (questionIndex) => {
    set((state) => {
      const questions = [...state.questions]
      questions[questionIndex] = { ...questions[questionIndex], status: 'in_progress' }
      return { questions }
    })
  },

  restoreFromDraft: (savedState) => {
    set({ ...initialState, ...savedState })
  },

  resetWizard: () => set({ ...initialState, setupDraft: null }),
  getState: () => get()
}))
