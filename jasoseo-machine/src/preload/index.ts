import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

const api = {
  // Claude CLI
  claudeExecute: (options: unknown) => ipcRenderer.invoke(IPC.CLAUDE_EXECUTE, options),
  claudeExecuteStream: (options: unknown) => ipcRenderer.send(IPC.CLAUDE_EXECUTE_STREAM, options),
  claudeCancel: () => ipcRenderer.invoke(IPC.CLAUDE_CANCEL),
  claudeCancelById: (id: string) => ipcRenderer.invoke(IPC.CLAUDE_CANCEL_BY_ID, id),
  claudeCheckStatus: () => ipcRenderer.invoke(IPC.CLAUDE_CHECK_STATUS),
  onClaudeRawLog: (callback: (data: string) => void) => {
    const handler = (_: unknown, data: string) => callback(data)
    ipcRenderer.on(IPC.CLAUDE_RAW_LOG, handler)
    return () => ipcRenderer.removeListener(IPC.CLAUDE_RAW_LOG, handler)
  },

  // Episodes
  episodesLoad: () => ipcRenderer.invoke(IPC.EPISODES_LOAD),
  episodeDelete: (fileName: string) => ipcRenderer.invoke(IPC.EPISODE_DELETE, fileName),
  episodeSaveFile: (fileName: string, content: string) =>
    ipcRenderer.invoke(IPC.EPISODE_SAVE_FILE, fileName, content),
  episodeSuggestIdeas: () => ipcRenderer.invoke(IPC.EPISODE_SUGGEST_IDEAS),
  onEpisodesChanged: (callback: (data: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.EPISODES_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.EPISODES_CHANGED, handler)
  },

  // Bridge (v20.0)
  bridgeGetInfo: () => ipcRenderer.invoke(IPC.BRIDGE_GET_INFO),
  bridgeSetAnswers: (answers: { question: string; answer: string; charLimit: number | null }[]) => ipcRenderer.invoke(IPC.BRIDGE_SET_ANSWERS, answers),
  bridgeGetEmptyFields: () => ipcRenderer.invoke(IPC.BRIDGE_GET_EMPTY_FIELDS),
  bridgePeekQuestions: () => ipcRenderer.invoke(IPC.BRIDGE_PEEK_QUESTIONS),
  bridgeClearQuestions: () => ipcRenderer.invoke(IPC.BRIDGE_CLEAR_QUESTIONS),

  // Maintenance
  checkTrash: () => ipcRenderer.invoke('maintenance:check-trash'),
  emptyTrash: () => ipcRenderer.invoke('maintenance:empty-trash'),

  // Dev / Testing (개발 환경에서만 사용)
  devLoadFixtures: () => ipcRenderer.invoke(IPC.DEV_LOAD_FIXTURES),

  // Applications
  appSave: (app: unknown) => ipcRenderer.invoke(IPC.APP_SAVE, app),
  appList: () => ipcRenderer.invoke(IPC.APP_LIST),
  appGet: (id: string) => ipcRenderer.invoke(IPC.APP_GET, id),
  appDelete: (id: string) => ipcRenderer.invoke(IPC.APP_DELETE, id),
  appUpdateStatus: (id: string, status: string, feedbackNote: string | null) =>
    ipcRenderer.invoke(IPC.APP_UPDATE_STATUS, id, status, feedbackNote),

  // Cover Letters
  clSave: (cl: unknown) => ipcRenderer.invoke(IPC.CL_SAVE, cl),
  clGet: (id: string) => ipcRenderer.invoke(IPC.CL_GET, id),
  clListByApp: (applicationId: string) => ipcRenderer.invoke(IPC.CL_LIST_BY_APP, applicationId),
  clUpdate: (id: string, updates: unknown) => ipcRenderer.invoke(IPC.CL_UPDATE, id, updates),

  // Drafts
  draftSave: (applicationId: string, wizardState: unknown) =>
    ipcRenderer.invoke(IPC.DRAFT_SAVE, applicationId, wizardState),
  draftGet: (applicationId: string) => ipcRenderer.invoke(IPC.DRAFT_GET, applicationId),
  draftDelete: (applicationId: string) => ipcRenderer.invoke(IPC.DRAFT_DELETE, applicationId),
  draftList: () => ipcRenderer.invoke(IPC.DRAFT_LIST),

  // Episode Usage
  episodeUsage: (applicationId?: string) => ipcRenderer.invoke(IPC.EPISODE_USAGE, applicationId),

  // Settings
  settingsGet: (key: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
  settingsSet: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  settingsTestCli: () => ipcRenderer.invoke(IPC.SETTINGS_TEST_CLI),
  settingsTestGemini: () => ipcRenderer.invoke(IPC.SETTINGS_TEST_GEMINI),

  // File system
  readMd: (path: string) => ipcRenderer.invoke(IPC.FS_READ_MD, path),
  selectDirectory: () => ipcRenderer.invoke(IPC.FS_SELECT_DIR),
  selectFile: (filters?: any) => ipcRenderer.invoke(IPC.FS_SELECT_FILE, filters),
  parsePdf: (path: string) => ipcRenderer.invoke(IPC.FS_PARSE_PDF, path),

  // User Profile
  userProfileGet: () => ipcRenderer.invoke(IPC.USER_PROFILE_GET),
  userProfileGetSync: () => ipcRenderer.invoke('user-profile:get-sync'),
  userProfileSave: (profile: unknown) => ipcRenderer.invoke(IPC.USER_PROFILE_SAVE, profile),
  userProfilesList: () => ipcRenderer.invoke(IPC.USER_PROFILES_LIST),
  userProfileSwitch: (id: string) => ipcRenderer.invoke(IPC.USER_PROFILE_SWITCH, id),
  userProfileCreate: (name: string) => ipcRenderer.invoke(IPC.USER_PROFILE_CREATE, name),
  userProfileDelete: (id: string) => ipcRenderer.invoke(IPC.USER_PROFILE_DELETE, id),
  userProfileRename: (id: string, newName: string) => ipcRenderer.invoke(IPC.USER_PROFILE_RENAME, id, newName),
  userProfileDuplicate: (id: string) => ipcRenderer.invoke(IPC.USER_PROFILE_DUPLICATE, id),

  // Web Fetch (URL 자동 수집)
  webFetchUrl: (url: string) => ipcRenderer.invoke(IPC.WEB_FETCH_URL, url),

  // Automation
  analyzeFormStructure: (html: string) => ipcRenderer.invoke(IPC.ANALYZE_FORM_STRUCTURE, html),
  analyzeCompany: (name: string, date: string, additionalContext?: string) => ipcRenderer.invoke(IPC.ANALYZE_COMPANY, name, date, additionalContext),
  onboardingParseFile: (rawText: string) => ipcRenderer.invoke(IPC.ONBOARDING_PARSE_FILE, rawText),
  onOnboardingProgress: (callback: (data: any) => void) => {
    const handler = (_: unknown, data: any) => callback(data)
    ipcRenderer.on(IPC.ONBOARDING_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC.ONBOARDING_PROGRESS, handler)
  },

  // Patterns (자소서 패턴 강화)
  patternList: () => ipcRenderer.invoke(IPC.PATTERN_LIST),
  patternSave: (pattern: unknown) => ipcRenderer.invoke(IPC.PATTERN_SAVE, pattern),
  patternDelete: (id: string) => ipcRenderer.invoke(IPC.PATTERN_DELETE, id),
  patternToggle: (id: string, isActive: boolean) => ipcRenderer.invoke(IPC.PATTERN_TOGGLE, id, isActive),
  patternAnalyze: (id: string, coverLetterText: string) => ipcRenderer.invoke(IPC.PATTERN_ANALYZE, id, coverLetterText),
  patternSettingsGet: () => ipcRenderer.invoke(IPC.PATTERN_SETTINGS_GET),
  patternSettingsSave: (settings: unknown) => ipcRenderer.invoke(IPC.PATTERN_SETTINGS_SAVE, settings),

  // Bridge - 문항 추출 이벤트 (확장 프로그램 → bridge server → IPC push)
  onQuestionsExtracted: (callback: (questions: { question: string; charLimit: number | null }[]) => void) => {
    const handler = (_: unknown, data: { question: string; charLimit: number | null }[]) => callback(data)
    ipcRenderer.on('questions-extracted', handler)
    return () => ipcRenderer.removeListener('questions-extracted', handler)
  },

  // Stream events
  onStreamChunk: (callback: (data: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.CLAUDE_STREAM_CHUNK, handler)
    return () => ipcRenderer.removeListener(IPC.CLAUDE_STREAM_CHUNK, handler)
  },
  onStreamEnd: (callback: (data: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.CLAUDE_STREAM_END, handler)
    return () => ipcRenderer.removeListener(IPC.CLAUDE_STREAM_END, handler)
  },
  onStreamError: (callback: (data: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.CLAUDE_STREAM_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.CLAUDE_STREAM_ERROR, handler)
  },

  // Window close lifecycle
  onBeforeClose: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC.APP_BEFORE_CLOSE, handler)
    return () => ipcRenderer.removeListener(IPC.APP_BEFORE_CLOSE, handler)
  },
  replyClose: (confirmed: boolean) => ipcRenderer.send(IPC.APP_CLOSE_REPLY, confirmed)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
