import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFileSync, readdirSync, unlinkSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import {
  saveApplication,
  listApplications,
  getApplication,
  deleteApplication,
  updateApplicationStatus,
  saveCoverLetter,
  getCoverLetter,
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
  // 안전 진단: IPC 객체의 모든 키가 유효한지 확인
  Object.entries(IPC).forEach(([key, value]) => {
    if (value === undefined) {
      console.error(`[IPC Error] Channel "${key}" is undefined!`);
    }
  });

  // 유틸리티: 현재 프로필에 따른 에피소드 폴더 경로 가져오기
  const getProfileEpisodeDir = () => {
    const projectDir = getSetting('project_dir') || ''
    if (!projectDir) return null

    const profile = getUserProfile()
    // 프로필 이름이 없으면 'default' 폴더 사용
    const profileName = profile?.personal?.name || 'default'
    const dir = join(projectDir, 'episodes', profileName)
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return dir
  }

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

  // === Episodes (격리 및 안전 로직 적용) ===
  ipcMain.handle(IPC.EPISODES_LOAD, () => {
    const episodesDir = getProfileEpisodeDir()
    if (!episodesDir) return []

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

  ipcMain.handle(IPC.EPISODE_DELETE, (_event, fileName) => {
    const episodesDir = getProfileEpisodeDir()
    if (!episodesDir) return false
    
    try {
      // [안전 삭제 전략] 파일을 지우지 않고 .trash 폴더로 이동
      const trashDir = join(episodesDir, '.trash')
      if (!existsSync(trashDir)) mkdirSync(trashDir, { recursive: true })
      
      const sourcePath = join(episodesDir, fileName)
      const destPath = join(trashDir, `${Date.now()}_${fileName}`)
      
      renameSync(sourcePath, destPath)
      return true
    } catch (err) {
      console.error('Delete error:', err)
      return false
    }
  })

  ipcMain.handle(IPC.EPISODE_SAVE_FILE, (_event, fileName, content) => {
    const episodesDir = getProfileEpisodeDir()
    if (!episodesDir) return false
    try {
      writeFileSync(join(episodesDir, fileName), content, 'utf-8')
      return true
    } catch {
      return false
    }
  })

  if (IPC.EPISODE_SUGGEST_IDEAS) {
    ipcMain.handle(IPC.EPISODE_SUGGEST_IDEAS, async () => {
      const { EpisodeInterviewer } = await import('./automation/episode-interviewer')
      const interviewer = new EpisodeInterviewer()
      try {
        const profile = getUserProfile()
        if (!profile) throw new Error('User profile not found.')
        const prompt = interviewer.buildIdeaSuggestionPrompt(profile)
        const aiResponse = await executeClaudePrompt(prompt)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('AI response invalid.')
        const result = JSON.parse(jsonMatch[0])
        return { success: true, data: result.ideas }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })
  }

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

  ipcMain.handle(IPC.CL_GET, (_event, id) => {
    return getCoverLetter(id)
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
  if (IPC.ANALYZE_FORM_STRUCTURE) {
    ipcMain.handle(IPC.ANALYZE_FORM_STRUCTURE, async (_event, formHtml) => {
      const { FormAnalyzer } = await import('./automation/form-analyzer')
      const analyzer = new FormAnalyzer()
      try {
        const profile = getUserProfile()
        if (!profile) throw new Error('User profile not found.')
        const prompt = analyzer.buildBatchPrompt(formHtml, profile)
        const aiResponse = await executeClaudePrompt(prompt)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('AI response is not valid JSON.')
        const result = JSON.parse(jsonMatch[0])
        return { success: true, data: { ...result, script: analyzer.wrapWithEventSimulator(result.script) } }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })
  }

  if (IPC.ANALYZE_COMPANY) {
    ipcMain.handle(IPC.ANALYZE_COMPANY, async (_event, companyName, currentDate) => {
      const { CompanyAnalyst } = await import('./automation/company-analyst')
      const analyst = new CompanyAnalyst()
      try {
        const query = analyst.buildSearchQuery(companyName, currentDate)
        const aiResponse = await executeClaudePrompt(analyst.buildAnalysisPrompt(companyName, `[Search the web for ${query}]`, currentDate))
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('AI analysis failed.')
        const result = JSON.parse(jsonMatch[0])
        return { success: true, data: result }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })
  }

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
