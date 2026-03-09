import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import {
  saveApplication,
  listApplications,
  getApplication,
  deleteApplication,
  updateApplicationStatus,
  saveCoverLetter,
  updateCoverLetter,
  saveDraft,
  getDraft,
  deleteDraft,
  listDrafts,
  getEpisodeUsage,
  getSetting,
  setSetting,
  getUserProfile,
  saveUserProfile
} from './db'
import {
  executeClaudePrompt,
  executeClaudeStream,
  cancelActiveProcess,
  testClaudeConnection,
  testGeminiConnection
} from './claude-bridge'

export function registerIpcHandlers(): void {
  // === Claude CLI ===
  ipcMain.handle(IPC.CLAUDE_EXECUTE, async (_event, options) => {
    return executeClaudePrompt(options)
  })

  ipcMain.on(IPC.CLAUDE_EXECUTE_STREAM, (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      executeClaudeStream(options, window)
    }
  })

  ipcMain.handle(IPC.CLAUDE_CANCEL, () => {
    return cancelActiveProcess()
  })

  ipcMain.handle(IPC.CLAUDE_CHECK_STATUS, async () => {
    return testClaudeConnection()
  })

  // === Episodes ===
  ipcMain.handle(IPC.EPISODES_LOAD, () => {
    const projectDir = getSetting('project_dir') || ''
    if (!projectDir) return []

    const episodesDir = join(projectDir, 'episodes')
    try {
      const files = readdirSync(episodesDir).filter((f) => f.endsWith('.md'))
      return files.map((file) => {
        const content = readFileSync(join(episodesDir, file), 'utf-8')
        return { fileName: file, content }
      })
    } catch {
      return []
    }
  })

  // === Applications ===
  ipcMain.handle(IPC.APP_SAVE, (_event, app) => {
    saveApplication(app)
    return true
  })

  ipcMain.handle(IPC.APP_LIST, () => {
    return listApplications()
  })

  ipcMain.handle(IPC.APP_GET, (_event, id) => {
    return getApplication(id)
  })

  ipcMain.handle(IPC.APP_DELETE, (_event, id) => {
    deleteApplication(id)
    return true
  })

  ipcMain.handle(IPC.APP_UPDATE_STATUS, (_event, id, status, feedbackNote) => {
    updateApplicationStatus(id, status, feedbackNote)
    return true
  })

  // === Cover Letters ===
  ipcMain.handle(IPC.CL_SAVE, (_event, cl) => {
    saveCoverLetter(cl)
    return true
  })

  ipcMain.handle(IPC.CL_UPDATE, (_event, id, updates) => {
    updateCoverLetter(id, updates)
    return true
  })

  // === Drafts ===
  ipcMain.handle(IPC.DRAFT_SAVE, (_event, applicationId, wizardState) => {
    saveDraft(applicationId, JSON.stringify(wizardState))
    return true
  })

  ipcMain.handle(IPC.DRAFT_GET, (_event, applicationId) => {
    return getDraft(applicationId)
  })

  ipcMain.handle(IPC.DRAFT_DELETE, (_event, applicationId) => {
    deleteDraft(applicationId)
    return true
  })

  ipcMain.handle(IPC.DRAFT_LIST, () => {
    return listDrafts()
  })

  // === Episode Usage ===
  ipcMain.handle(IPC.EPISODE_USAGE, (_event, applicationId) => {
    return getEpisodeUsage(applicationId)
  })

  // === Settings ===
  ipcMain.handle(IPC.SETTINGS_GET, (_event, key) => {
    return getSetting(key)
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, key, value) => {
    setSetting(key, value)
    return true
  })

  ipcMain.handle(IPC.SETTINGS_TEST_CLI, async () => {
    return testClaudeConnection()
  })

  ipcMain.handle(IPC.SETTINGS_TEST_GEMINI, async () => {
    return testGeminiConnection()
  })

  // === User Profile ===
  ipcMain.handle(IPC.USER_PROFILE_GET, () => {
    return getUserProfile()
  })

  ipcMain.handle(IPC.USER_PROFILE_SAVE, (_event, profile) => {
    saveUserProfile(profile)
    return true
  })

  // === Automation (Input Proxy Agent & Company Analyst) ===
  ipcMain.handle(IPC.ANALYZE_FORM_STRUCTURE, async (_event, formHtml) => {
    // ... (existing code for form analysis)
  })

  ipcMain.handle(IPC.ANALYZE_COMPANY, async (_event, companyName, currentDate) => {
    const { CompanyAnalyst } = await import('./automation/company-analyst')
    const analyst = new CompanyAnalyst()

    try {
      // 1. 시점 고정 검색 쿼리 빌드
      const query = analyst.buildSearchQuery(companyName, currentDate)
      
      // 2. AI에게 최신 정보 검색 및 분석 지시 (직접 검색 툴 활용)
      // (프롬프트 내에 '오늘 날짜'를 강조하여 과거 데이터 노이즈 제거)
      const aiResponse = await executeClaudePrompt(
        analyst.buildAnalysisPrompt(companyName, `[Search the web for ${query}]`, currentDate)
      )

      // 3. JSON 추출 및 파싱
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI could not find or analyze recruitment data for 2026.')
      }

      const result = JSON.parse(jsonMatch[0])

      // 4. 예외 처리: 만약 결과가 2024~2025년 것이라면 경고 문구 추가
      if (result.recruitmentSeason && !result.recruitmentSeason.includes('2026')) {
        result.analysisNote = `[Warning] Found older recruitment data (${result.recruitmentSeason}). Please confirm if the recruitment criteria remain the same.`
      }

      return { success: true, data: result }
    } catch (error: any) {
      console.error('Company Analysis Error:', error)
      return { success: false, error: error.message }
    }
  })

  // === File System ===
  ipcMain.handle(IPC.FS_READ_MD, (_event, filePath) => {
    try {
      return readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC.FS_SELECT_DIR, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: '프로젝트 디렉토리 선택'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
