import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs'
import { join } from 'path'

interface ApplicationRecord {
  id: string
  createdAt: string
  updatedAt: string
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: string | null
  hrIntents: string | null
  status: string
  feedbackNote: string | null
}

interface CoverLetterRecord {
  id: string
  applicationId: string
  questionNumber: number
  question: string
  charLimit: number | null
  episodesUsed: string | null
  analysisResult: string | null
  finalText: string | null
  verificationResult: string | null
  status: string
}

interface DraftRecord {
  applicationId: string
  wizardState: string
  savedAt: string
}

interface DbData {
  applications: ApplicationRecord[]
  coverLetters: CoverLetterRecord[]
  drafts: DraftRecord[]
  settings: Record<string, string>
  profiles: any[] // 멀티 프로필 지원
  currentProfileId: string | null
}

let data: DbData = {
  applications: [],
  coverLetters: [],
  drafts: [],
  settings: {},
  profiles: [],
  currentProfileId: null
}

let dbPath = ''

function getDbPath(): string {
  if (!dbPath) {
    const dir = join(app.getPath('userData'), 'data')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    dbPath = join(dir, 'jasoseo-machine.json')
  }
  return dbPath
}

function save(): void {
  const path = getDbPath()
  const tempPath = path + '.tmp'
  const backupPath = path + '.bak'
  try {
    const content = JSON.stringify(data, null, 2)
    writeFileSync(tempPath, content, 'utf-8')
    // 원본 파일을 백업으로 먼저 복사
    if (existsSync(path)) {
      try { writeFileSync(backupPath, readFileSync(path, 'utf-8'), 'utf-8') } catch { /* ignore */ }
    }
    renameSync(tempPath, path)
  } catch (err) {
    console.error('[DB] Atomic save failed:', err)
    if (existsSync(tempPath)) unlinkSync(tempPath)
  }
}

export function initDatabase(): void {
  const path = getDbPath()
  const backupPath = path + '.bak'
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      // 데이터 마이그레이션: 구버전(단일 프로필)에서 신버전(멀티 프로필)으로
      if (raw.profile && !raw.profiles) {
        const legacyProfile = { ...raw.profile, id: 'default' }
        data = {
          ...raw,
          profiles: [legacyProfile],
          currentProfileId: 'default'
        }
        delete (data as any).profile
      } else {
        data = { ...data, ...raw }
      }
    } catch {
      // 파싱 실패 시 백업 파일로 복구 시도 (빈 데이터로 덮어쓰기 방지)
      console.error('[DB] Main file parse failed, trying backup...')
      try {
        if (existsSync(backupPath)) {
          const raw = JSON.parse(readFileSync(backupPath, 'utf-8'))
          data = { ...data, ...raw }
          console.log('[DB] Recovered from backup')
          save()
        }
      } catch {
        console.error('[DB] Backup recovery failed, starting fresh')
        save()
      }
    }
  } else {
    // 백업이 있으면 먼저 복구 시도
    if (existsSync(backupPath)) {
      try {
        const raw = JSON.parse(readFileSync(backupPath, 'utf-8'))
        data = { ...data, ...raw }
        console.log('[DB] Restored from backup (main file missing)')
        save()
        return
      } catch { /* ignore, fall through to fresh start */ }
    }
    save()
  }
}

// === Profiles ===
export function getUserProfile(): any | null {
  if (!data.currentProfileId && data.profiles.length > 0) {
    data.currentProfileId = data.profiles[0].id
  }
  return data.profiles.find((p) => p.id === data.currentProfileId) || null
}

export function saveUserProfile(profile: any): void {
  // id가 없으면 생성 (기존 장준수 프로필 등 대응)
  if (!profile.id) {
    profile.id = profile.personal?.name || 'profile-' + Date.now()
  }
  
  const idx = data.profiles.findIndex((p) => p.id === profile.id)
  if (idx >= 0) {
    data.profiles[idx] = profile
  } else {
    data.profiles.push(profile)
  }
  data.currentProfileId = profile.id
  save()
}

export function listProfiles(): any[] {
  return data.profiles.map(p => ({
    id: p.id,
    name: p.personal?.name || 'Unnamed Profile',
    updatedAt: new Date().toISOString() // 간단하게 현재 시간
  }))
}

export function switchProfile(id: string): void {
  data.currentProfileId = id
  save()
}

export function createProfile(name: string): any {
  const newProfile = {
    id: 'profile-' + Date.now(),
    personal: { name, birthDate: '', gender: '', email: '', phone: '', mobile: '', address: '' },
    desiredJob: { keywords: [] },
    skills: [],
    education: [],
    experience: [],
    activities: [],
    training: [],
    certificates: [],
    awards: [],
    overseas: [],
    languages: [],
    portfolio: [],
    preferences: { isVeteran: false, isProtection: false, isSubsidy: false, isDisabled: false, military: { status: '' } }
  }
  data.profiles.push(newProfile)
  data.currentProfileId = newProfile.id
  save()
  return newProfile
}

export function deleteProfile(id: string): string | null {
  const profile = data.profiles.find(p => p.id === id)
  const profileId = profile?.id || null
  
  data.profiles = data.profiles.filter(p => p.id !== id)
  if (data.currentProfileId === id) {
    data.currentProfileId = data.profiles.length > 0 ? data.profiles[0].id : null
  }
  save()
  return profileId // 삭제된 프로필의 ID 반환 (폴더 정리를 위함)
}

// === Applications ===
export function saveApplication(app: ApplicationRecord): void {
  const idx = data.applications.findIndex((a) => a.id === app.id)
  if (idx >= 0) {
    data.applications[idx] = app
  } else {
    data.applications.push(app)
  }
  save()
}

export function listApplications(): (ApplicationRecord & { question_count: number })[] {
  return data.applications
    .map((a) => ({
      ...a,
      question_count: data.coverLetters.filter((cl) => cl.applicationId === a.id).length
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getApplication(id: string) {
  const application = data.applications.find((a) => a.id === id)
  const coverLetters = data.coverLetters
    .filter((cl) => cl.applicationId === id)
    .sort((a, b) => a.questionNumber - b.questionNumber)
  return { application, coverLetters }
}

export function deleteApplication(id: string): void {
  data.applications = data.applications.filter((a) => a.id !== id)
  data.coverLetters = data.coverLetters.filter((cl) => cl.applicationId !== id)
  data.drafts = data.drafts.filter((d) => d.applicationId !== id)
  save()
}

export function updateApplicationStatus(id: string, status: string, note?: string): void {
  const app = data.applications.find((a) => a.id === id)
  if (app) {
    app.status = status
    app.feedbackNote = note || null
    app.updatedAt = new Date().toISOString()
    save()
  }
}

// === Cover Letters ===
export function getCoverLetter(id: string): CoverLetterRecord | undefined {
  return data.coverLetters.find((c) => c.id === id)
}

export function saveCoverLetter(cl: CoverLetterRecord): void {
  const idx = data.coverLetters.findIndex((c) => c.id === cl.id)
  if (idx >= 0) {
    data.coverLetters[idx] = cl
  } else {
    data.coverLetters.push(cl)
  }
  save()
}

export function updateCoverLetter(id: string, updates: Partial<CoverLetterRecord>): void {
  const cl = data.coverLetters.find((c) => c.id === id)
  if (cl) {
    Object.assign(cl, updates)
    save()
  }
}

// === Drafts ===
export function saveDraft(applicationId: string, wizardState: string): void {
  const idx = data.drafts.findIndex((d) => d.applicationId === applicationId)
  const draft: DraftRecord = {
    applicationId,
    wizardState,
    savedAt: new Date().toISOString()
  }
  if (idx >= 0) {
    data.drafts[idx] = draft
  } else {
    data.drafts.push(draft)
  }
  save()
}

export function getDraft(applicationId: string): DraftRecord | undefined {
  return data.drafts.find((d) => d.applicationId === applicationId)
}

export function deleteDraft(applicationId: string): void {
  data.drafts = data.drafts.filter((d) => d.applicationId !== applicationId)
  save()
}

export function listDrafts() {
  const savedAppIds = new Set(data.applications.map((a) => a.id))
  return data.drafts
    .filter((d) => !savedAppIds.has(d.applicationId)) // applications 테이블에 없는 순수 임시저장만
    .map((d) => {
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
      return {
        applicationId: d.applicationId,
        savedAt: d.savedAt,
        companyName,
        jobTitle,
        questionCount,
        step0Completed
      }
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

// === Episode Usage ===
export function getEpisodeUsage(applicationId?: string) {
  const letters = applicationId
    ? data.coverLetters.filter((cl) => cl.applicationId === applicationId)
    : data.coverLetters

  const usage: Record<string, { applicationId: string; episodeId: string; count: number }[]> = {}

  for (const cl of letters) {
    if (!cl.episodesUsed) continue
    try {
      const episodes = JSON.parse(cl.episodesUsed) as string[]
      for (const ep of episodes) {
        const key = `${cl.applicationId}:${ep}`
        if (!usage[key]) {
          usage[key] = []
        }
        usage[key].push({
          applicationId: cl.applicationId,
          episodeId: ep,
          count: 1
        })
      }
    } catch {
      // ignore
    }
  }

  return Object.values(usage).map((items) => ({
    application_id: items[0].applicationId,
    episode_id: items[0].episodeId,
    usage_count: items.length
  }))
}

// === Settings ===
export function getSetting(key: string): string | null {
  return data.settings[key] || null
}

export function setSetting(key: string, value: string): void {
  data.settings[key] = value
  save()
}
