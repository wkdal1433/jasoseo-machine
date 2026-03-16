import { create } from 'zustand'

interface HistoryItem {
  id: string
  createdAt: string
  updatedAt: string
  companyName: string
  jobTitle: string
  status: string
  question_count: number
  feedbackNote: string | null
}

export interface DraftItem {
  applicationId: string
  savedAt: string
  companyName: string
  jobTitle: string
  questionCount: number
  step0Completed: boolean
}

interface HistoryState {
  applications: HistoryItem[]
  drafts: DraftItem[]
  isLoading: boolean
  loadApplications: () => Promise<void>
  loadDrafts: () => Promise<void>
  deleteDraft: (applicationId: string) => Promise<void>
  deleteApplication: (id: string) => Promise<void>
  updateStatus: (id: string, status: string, note?: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set) => ({
  applications: [],
  drafts: [],
  isLoading: false,

  loadApplications: async () => {
    set({ isLoading: true })
    try {
      const apps = await window.api.appList()
      set({ applications: apps as HistoryItem[], isLoading: false })
    } catch {
      set({ applications: [], isLoading: false })
    }
  },

  loadDrafts: async () => {
    try {
      const raw = await window.api.draftList() as any[]
      const drafts: DraftItem[] = raw.map((d) => {
        // wizardState 문자열이 있으면 파싱, 없으면 이미 파싱된 필드 사용
        if (d.wizardState) {
          let companyName = ''
          let jobTitle = ''
          let questionCount = 0
          let step0Completed = false
          try {
            const state = JSON.parse(d.wizardState)
            companyName = state.companyName || ''
            jobTitle = state.jobTitle || ''
            questionCount = Array.isArray(state.questions) ? state.questions.length : 0
            step0Completed = !!state.step0Completed
          } catch { /* ignore */ }
          return { applicationId: d.applicationId, savedAt: d.savedAt, companyName, jobTitle, questionCount, step0Completed }
        }
        // 이미 파싱된 형식 (main 프로세스 구버전 호환)
        return {
          applicationId: d.applicationId,
          savedAt: d.savedAt,
          companyName: d.companyName || '',
          jobTitle: d.jobTitle || '',
          questionCount: d.questionCount ?? 0,
          step0Completed: !!d.step0Completed
        }
      })
      set({ drafts })
    } catch {
      set({ drafts: [] })
    }
  },

  deleteDraft: async (applicationId) => {
    await window.api.draftDelete(applicationId)
    set((state) => ({
      drafts: state.drafts.filter((d) => d.applicationId !== applicationId)
    }))
  },

  deleteApplication: async (id) => {
    await window.api.appDelete(id)
    set((state) => ({
      applications: state.applications.filter((a) => a.id !== id)
    }))
  },

  updateStatus: async (id, status, note) => {
    await window.api.appUpdateStatus(id, status, note)
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, status, feedbackNote: note || null } : a
      )
    }))
  }
}))
