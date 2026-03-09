import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
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
  profile: any | null
}

let data: DbData = {
  applications: [],
  coverLetters: [],
  drafts: [],
  settings: {},
  profile: null
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
  writeFileSync(getDbPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function initDatabase(): void {
  const path = getDbPath()
  if (existsSync(path)) {
    try {
      data = JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      data = { applications: [], coverLetters: [], drafts: [], settings: {}, profile: null }
      save()
    }
  } else {
    save()
  }
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
  return data.drafts
    .map((d) => {
      const app = data.applications.find((a) => a.id === d.applicationId)
      return {
        ...d,
        company_name: app?.companyName || '',
        job_title: app?.jobTitle || ''
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

// === User Profile ===
export function getUserProfile(): any | null {
  return data.profile
}

export function saveUserProfile(profile: any): void {
  data.profile = profile
  save()
}
