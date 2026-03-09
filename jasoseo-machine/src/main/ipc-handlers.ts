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

  // === Automation (Input Proxy Agent) ===
  ipcMain.handle(IPC.ANALYZE_FORM_STRUCTURE, async (_event, formHtml) => {
    const { FormAnalyzer } = await import('./automation/form-analyzer')
    const analyzer = new FormAnalyzer()
    
    try {
      // 1. 현재 사용자 프로필 로드
      const profile = getUserProfile()
      if (!profile) {
        throw new Error('User profile not found. Please set up your profile first.')
      }

      // 2. AI 분석용 프롬프트 빌드
      const prompt = analyzer.buildBatchPrompt(formHtml, profile)
      
      // 3. AI 실행
      const aiResponse = await executeClaudePrompt(prompt)
      
      // 4. JSON 파싱
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI failed to generate a valid JSON response.')
      }
      
      const result = JSON.parse(jsonMatch[0])
      
      // 5. 로우 스크립트를 이벤트 시뮬레이터로 래핑
      const finalScript = analyzer.wrapWithEventSimulator(result.script)
      
      return {
        success: true,
        data: {
          ...result,
          script: finalScript
        }
      }
    } catch (error: any) {
      console.error('Form Analysis Error:', error)
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
