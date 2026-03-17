import { create } from 'zustand'
import { UserProfile, DEFAULT_PROFILE } from '../types/profile'

interface ProfileSummary {
  id: string
  name: string
  updatedAt: string
}

interface ProfileState {
  profile: UserProfile
  profiles: ProfileSummary[]
  isLoaded: boolean
  isLocked: boolean
  loadProfile: () => Promise<void>
  loadProfilesList: () => Promise<void>
  saveProfile: (profile: UserProfile) => Promise<void>
  switchProfile: (id: string) => Promise<void>
  createProfile: (name: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  renameProfile: (id: string, newName: string) => Promise<void>
  duplicateProfile: (id: string) => Promise<void>
  setLock: (locked: boolean) => void
  updatePersonal: (personal: Partial<UserProfile['personal']>) => void
  updateMilitary: (military: Partial<UserProfile['military']>) => void
  addEducation: (item: UserProfile['education'][0]) => void
  removeEducation: (id: string) => void
  addExperience: (item: UserProfile['experience'][0]) => void
  removeExperience: (id: string) => void
  addLanguage: (item: UserProfile['languages'][0]) => void
  removeLanguage: (id: string) => void
  addCertificate: (item: UserProfile['certificates'][0]) => void
  removeCertificate: (id: string) => void
  addActivity: (item: UserProfile['activities'][0]) => void
  removeActivity: (id: string) => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  profiles: [],
  isLoaded: false,
  isLocked: false,

  loadProfile: async () => {
    // [v7.5 개선] 앱 시작 시 무조건 잠금 해제 (비정상 종료 대응)
    set({ isLocked: false })
    
    const data = await window.api.userProfileGet()
    if (data) {
      set({ profile: data, isLoaded: true })
    } else {
      set({ profile: DEFAULT_PROFILE, isLoaded: true })
    }
    await get().loadProfilesList()
  },

  loadProfilesList: async () => {
    const list = await window.api.userProfilesList()
    set({ profiles: list || [] })
  },

  saveProfile: async (profile) => {
    await window.api.userProfileSave(profile)
    set({ profile })
    await get().loadProfilesList()
  },

  switchProfile: async (id) => {
    if (get().isLocked) return // 잠금 상태면 전환 불가
    await window.api.userProfileSwitch(id)
    await get().loadProfile()
  },

  createProfile: async (name) => {
    if (get().isLocked) return
    await window.api.userProfileCreate(name)
    // 현재 프로필은 유지, 목록만 갱신
    await get().loadProfilesList()
  },

  deleteProfile: async (id) => {
    if (get().isLocked) return
    await window.api.userProfileDelete(id)
    await get().loadProfile()
  },

  renameProfile: async (id, newName) => {
    await (window.api as any).userProfileRename(id, newName)
    await get().loadProfile()
  },

  duplicateProfile: async (id) => {
    await (window.api as any).userProfileDuplicate(id)
    await get().loadProfilesList()
  },

  setLock: (locked) => set({ isLocked: locked }),

  updatePersonal: (personal) => {
    const newProfile = { ...get().profile, personal: { ...get().profile.personal, ...personal } }
    set({ profile: newProfile })
  },

  updateMilitary: (military) => {
    const newProfile = { ...get().profile, military: { ...get().profile.military, ...military } }
    set({ profile: newProfile })
  },

  addEducation: (item) => {
    const education = [...get().profile.education, item]
    set({ profile: { ...get().profile, education } })
  },

  removeEducation: (id) => {
    const education = get().profile.education.filter((i) => i.id !== id)
    set({ profile: { ...get().profile, education } })
  },

  addExperience: (item) => {
    const experience = [...get().profile.experience, item]
    set({ profile: { ...get().profile, experience } })
  },

  removeExperience: (id) => {
    const experience = get().profile.experience.filter((i) => i.id !== id)
    set({ profile: { ...get().profile, experience } })
  },

  addLanguage: (item) => {
    const languages = [...get().profile.languages, item]
    set({ profile: { ...get().profile, languages } })
  },

  removeLanguage: (id) => {
    const languages = get().profile.languages.filter((i) => i.id !== id)
    set({ profile: { ...get().profile, languages } })
  },

  addCertificate: (item) => {
    const certificates = [...get().profile.certificates, item]
    set({ profile: { ...get().profile, certificates } })
  },

  removeCertificate: (id) => {
    const certificates = get().profile.certificates.filter((i) => i.id !== id)
    set({ profile: { ...get().profile, certificates } })
  },

  addActivity: (item) => {
    const activities = [...get().profile.activities, item]
    set({ profile: { ...get().profile, activities } })
  },

  removeActivity: (id) => {
    const activities = get().profile.activities.filter((i) => i.id !== id)
    set({ profile: { ...get().profile, activities } })
  }
}))
