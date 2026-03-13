import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFileSync, readdirSync, unlinkSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import { bridgeServer } from './automation/bridge-server'
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
  saveUserProfile,
  listProfiles,
  switchProfile,
  createProfile,
  deleteProfile
} from './db'
import {
  executeClaudePrompt,
  executeClaudeStream,
  cancelActiveProcess,
  testClaudeConnection,
  testGeminiConnection
} from './claude-bridge'

export function registerIpcHandlers(): void {
  Object.entries(IPC).forEach(([key, value]) => {
    if (value === undefined) console.error(`[IPC Error] Channel "${key}" is undefined!`);
  });

  const getProfileEpisodeDir = () => {
    const projectDir = getSetting('project_dir') || ''
    if (!projectDir) return null
    const profile = getUserProfile()
    if (!profile) return null
    const folderName = profile.id || 'default'
    const dir = join(projectDir, 'episodes', folderName)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  }

  ipcMain.handle('maintenance:check-trash', () => {
    const projectDir = getSetting('project_dir') || ''
    const trashDir = join(projectDir, 'episodes', '.trash')
    if (!existsSync(trashDir)) return 0
    try {
      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      return readdirSync(trashDir).filter(file => {
        try {
          return (now - require('fs').statSync(join(trashDir, file)).mtimeMs) > thirtyDaysMs
        } catch { return false }
      }).length
    } catch { return 0 }
  })

  ipcMain.handle('maintenance:empty-trash', () => {
    const projectDir = getSetting('project_dir') || ''
    const trashDir = join(projectDir, 'episodes', '.trash')
    if (!existsSync(trashDir)) return true
    try {
      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      readdirSync(trashDir).forEach(file => {
        const filePath = join(trashDir, file)
        try {
          if (now - require('fs').statSync(filePath).mtimeMs > thirtyDaysMs) unlinkSync(filePath)
        } catch { /* ignore */ }
      })
      return true
    } catch { return false }
  })

  const migrateFolderNaming = () => {
    const projectDir = getSetting('project_dir') || ''
    if (!projectDir) return
    const profiles = listProfiles()
    let changed = false
    profiles.forEach((p: any) => {
      if (p.id && p.name && !p.isMigrated) {
        const oldDir = join(projectDir, 'episodes', p.name)
        const newDir = join(projectDir, 'episodes', p.id)
        let success = false
        if (existsSync(oldDir) && !existsSync(newDir)) {
          try {
            renameSync(oldDir, newDir)
            if (existsSync(newDir)) success = true
          } catch { /* error */ }
        } else if (existsSync(newDir)) success = true
        if (success) {
          const fullProfile = (listProfiles() as any).find(prof => prof.id === p.id)
          if (fullProfile) { fullProfile.isMigrated = true; changed = true; }
        }
      }
    })
    if (changed) saveUserProfile(getUserProfile())
  }
  migrateFolderNaming()

  ipcMain.handle(IPC.CLAUDE_EXECUTE, async (_event, options) => executeClaudePrompt(options))
  ipcMain.on(IPC.CLAUDE_EXECUTE_STREAM, (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) executeClaudeStream(options, window)
  })
  ipcMain.handle(IPC.CLAUDE_CANCEL, () => cancelActiveProcess())
  ipcMain.handle(IPC.CLAUDE_CHECK_STATUS, async () => testClaudeConnection())

  ipcMain.handle(IPC.EPISODES_LOAD, () => {
    const dir = getProfileEpisodeDir()
    if (!dir) return []
    try {
      return readdirSync(dir).filter(f => f.endsWith('.md')).map(file => ({
        fileName: file, content: readFileSync(join(dir, file), 'utf-8')
      }))
    } catch { return [] }
  })

  ipcMain.handle(IPC.EPISODE_DELETE, (_event, fileName) => {
    const dir = getProfileEpisodeDir()
    if (!dir) return false
    try {
      const trashDir = join(dir, '.trash')
      if (!existsSync(trashDir)) mkdirSync(trashDir, { recursive: true })
      renameSync(join(dir, fileName), join(trashDir, `${Date.now()}_${fileName}`))
      return true
    } catch { return false }
  })

  ipcMain.handle(IPC.EPISODE_SAVE_FILE, (_event, fileName, content) => {
    const dir = getProfileEpisodeDir()
    if (!dir) return false
    try {
      writeFileSync(join(dir, fileName), content, 'utf-8')
      return true
    } catch { return false }
  })
if (IPC.EPISODE_SUGGEST_IDEAS) {
  ipcMain.handle(IPC.EPISODE_SUGGEST_IDEAS, async () => {
    const { EpisodeInterviewer } = await import('./automation/episode-interviewer')
    const interviewer = new EpisodeInterviewer()
    try {
      const profile = getUserProfile()
      if (!profile) throw new Error('User profile not found.')

      // [v21.3 Optimized] 기존 에피소드 목록 읽기
      const dir = getProfileEpisodeDir()
      let existingTitles: string[] = []
      if (dir && existsSync(dir)) {
        existingTitles = readdirSync(dir).filter(f => f.endsWith('.md'))
      }

        const aiResponse = await executeClaudePrompt({ 
          prompt: interviewer.buildIdeaSuggestionPrompt(profile, existingTitles), 
          outputFormat: 'json', 
          maxTurns: 5 
        })

        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('AI response invalid.')
        return { success: true, data: JSON.parse(jsonMatch[0]).ideas }
      } catch (error: any) { return { success: false, error: error.message } }
    })
  }

  ipcMain.handle(IPC.APP_SAVE, (_event, app) => {
    if (!getUserProfile()) return { success: false, error: '프로필이 없습니다.' }
    saveApplication(app); return { success: true }
  })
  ipcMain.handle(IPC.APP_LIST, () => listApplications())
  ipcMain.handle(IPC.APP_GET, (_event, id) => getApplication(id))
  ipcMain.handle(IPC.APP_DELETE, (_event, id) => { deleteApplication(id); return true })
  ipcMain.handle(IPC.APP_UPDATE_STATUS, (_event, id, status, note) => { updateApplicationStatus(id, status, note); return true })

  ipcMain.handle(IPC.CL_SAVE, (_event, cl) => { saveCoverLetter(cl); return true })
  ipcMain.handle(IPC.CL_GET, (_event, id) => getCoverLetter(id))
  ipcMain.handle(IPC.CL_UPDATE, (_event, id, updates) => { updateCoverLetter(id, updates); return true })

  ipcMain.handle(IPC.DRAFT_SAVE, (_event, id, state) => { saveDraft(id, JSON.stringify(state)); return true })
  ipcMain.handle(IPC.DRAFT_GET, (_event, id) => getDraft(id))
  ipcMain.handle(IPC.DRAFT_DELETE, (_event, id) => { deleteDraft(id); return true })
  ipcMain.handle(IPC.DRAFT_LIST, () => listDrafts())

  ipcMain.handle(IPC.EPISODE_USAGE, (_event, id) => getEpisodeUsage(id))
  ipcMain.handle(IPC.SETTINGS_GET, (_event, key) => getSetting(key))
  ipcMain.handle(IPC.SETTINGS_SET, (_event, key, value) => { setSetting(key, value); return true })
  ipcMain.handle(IPC.SETTINGS_TEST_CLI, async () => testClaudeConnection())
  ipcMain.handle(IPC.SETTINGS_TEST_GEMINI, async () => testGeminiConnection())

  ipcMain.handle(IPC.USER_PROFILE_GET, () => getUserProfile())
  ipcMain.handle('user-profile:get-sync', () => getUserProfile())
  ipcMain.handle(IPC.USER_PROFILE_SAVE, (_event, profile) => { saveUserProfile(profile); return true })
  ipcMain.handle(IPC.USER_PROFILES_LIST, () => listProfiles())
  ipcMain.handle(IPC.USER_PROFILE_SWITCH, (_event, id) => { switchProfile(id); return true })
  ipcMain.handle(IPC.USER_PROFILE_CREATE, (_event, name) => createProfile(name))
  ipcMain.handle(IPC.USER_PROFILE_DELETE, (_event, id) => {
    const projectDir = getSetting('project_dir') || ''
    const deletedId = deleteProfile(id)
    if (deletedId && projectDir) {
      const sourceDir = join(projectDir, 'episodes', deletedId)
      if (existsSync(sourceDir)) {
        const trashDir = join(projectDir, 'episodes', '.trash', `deleted_profile_${deletedId}_${Date.now()}`)
        if (!existsSync(join(projectDir, 'episodes', '.trash'))) mkdirSync(join(projectDir, 'episodes', '.trash'), { recursive: true })
        try { renameSync(sourceDir, trashDir) } catch { /* ignore */ }
      }
    }
    return true
  })

  ipcMain.handle(IPC.ANALYZE_FORM_STRUCTURE, async (_event, html) => {
    const { FormAnalyzer } = await import('./automation/form-analyzer')
    const analyzer = new FormAnalyzer()
    try {
      const profile = getUserProfile()
      if (!profile) throw new Error('프로필이 없습니다.')
      const aiResponse = await executeClaudePrompt({ prompt: analyzer.buildBatchPrompt(html, profile), outputFormat: 'json', maxTurns: 5 })
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 응답이 올바르지 않습니다.')
      const result = JSON.parse(jsonMatch[0])
      return { success: true, data: { ...result, script: analyzer.wrapWithEventSimulator(result.script) } }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle(IPC.ANALYZE_COMPANY, async (_event, name, date) => {
    const { CompanyAnalyst } = await import('./automation/company-analyst')
    const analyst = new CompanyAnalyst()
    try {
      const query = analyst.buildSearchQuery(name, date)
      const aiResponse = await executeClaudePrompt({ prompt: analyst.buildAnalysisPrompt(name, `[Search for ${query}]`, date), outputFormat: 'json', maxTurns: 5 })
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 분석 실패')
      let result = JSON.parse(jsonMatch[0])
      if (result.foundLinks) {
        const validated = await Promise.all(result.foundLinks.map(async (l: any) => {
          try {
            const res = await fetch(l.url, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
            return { ...l, isValid: res.ok }
          } catch { return { ...l, isValid: false } }
        }))
        result.foundLinks = validated.filter((l: any) => l.isValid)
      }
      return { success: true, data: result }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle(IPC.ONBOARDING_PARSE_FILE, async (event, filePath) => {
    const { OnboardingAgent } = await import('./automation/onboarding-agent')
    const agent = new OnboardingAgent()
    const window = BrowserWindow.fromWebContents(event.sender)
    const sendProgress = (step: string, percent: number) => {
      window?.webContents.send(IPC.ONBOARDING_PROGRESS, { step, percent })
    }
    try {
      sendProgress('AI가 파일을 정독하기 시작했습니다...', 10)
      const aiResponse = await executeClaudePrompt({
        prompt: agent.buildExtractionPrompt(filePath),
        outputFormat: 'json',
        maxTurns: 10,
        filePath
      })
      
      sendProgress('핵심 데이터를 추출하여 구조화하고 있습니다...', 50)
      
      // [v20.7 개선] 방탄 JSON 추출 로직 (마크다운, 인사말 등 제거)
      let cleanedResponse = aiResponse.trim();
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        console.error('[AI Raw Output Error]:', aiResponse);
        throw new Error('AI 응답에서 유효한 JSON 데이터를 찾을 수 없습니다.');
      }
      
      const jsonStr = cleanedResponse.slice(firstBrace, lastBrace + 1);
      let result;
      try {
        result = JSON.parse(jsonStr);
      } catch (err) {
        console.error('[JSON Parse Error]:', jsonStr);
        throw new Error('추출된 데이터의 형식이 올바르지 않습니다.');
      }
      
      sendProgress('데이터 무결성 및 팩트 체크를 진행 중입니다...', 80)
      sendProgress('분석이 모두 완료되었습니다! 결과표를 구성합니다.', 100)
      return { success: true, data: result }
    } catch (error: any) { 
      return { success: false, error: error.message } 
    }
  })

  ipcMain.handle(IPC.BRIDGE_GET_INFO, () => {
    return { port: getSetting('bridge_port') || '12345', secret: bridgeServer.getSecret() }
  })
  ipcMain.handle(IPC.BRIDGE_SET_SCRIPT, (_event, script) => {
    bridgeServer.setPendingScript(script); return true
  })

  ipcMain.handle(IPC.FS_READ_MD, (_event, path) => { try { return readFileSync(path, 'utf-8') } catch { return null } })

  ipcMain.handle(IPC.FS_SELECT_FILE, async (event, filters) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      title: '자소서 파일 선택',
      filters: filters || [
        { name: '자소서 파일', extensions: ['pdf', 'md', 'txt'] }
      ]
    })
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.FS_SELECT_DIR, async (event) => {

    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory'], title: '폴더 선택' })
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0]
  })

  // 개발용 테스트 픽스처 로드
  ipcMain.handle(IPC.DEV_LOAD_FIXTURES, async () => {
    const projectDir = getSetting('project_dir')
    if (!projectDir) return { success: false, error: '프로젝트 디렉토리를 먼저 설정해주세요.' }
    try {
      const { FIXTURE_PROFILE, FIXTURE_EPISODES } = await import('./dev-fixtures')
      // 프로필 저장
      saveUserProfile({ ...FIXTURE_PROFILE, id: FIXTURE_PROFILE.id })
      // 에피소드 파일을 episodes/{profileId}/ 경로에 저장 (episodesLoad와 동일 경로)
      const episodeDir = join(projectDir, 'episodes', FIXTURE_PROFILE.id || 'default')
      if (!existsSync(episodeDir)) mkdirSync(episodeDir, { recursive: true })
      for (const ep of FIXTURE_EPISODES) {
        writeFileSync(join(episodeDir, ep.fileName), ep.content, 'utf-8')
      }
      return { success: true, episodeCount: FIXTURE_EPISODES.length }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
