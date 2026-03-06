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

interface HistoryState {
  applications: HistoryItem[]
  isLoading: boolean
  loadApplications: () => Promise<void>
  deleteApplication: (id: string) => Promise<void>
  updateStatus: (id: string, status: string, note?: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set) => ({
  applications: [],
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
