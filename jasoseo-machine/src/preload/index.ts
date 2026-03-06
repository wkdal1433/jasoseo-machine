import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

const api = {
  // Claude CLI
  claudeExecute: (options: unknown) => ipcRenderer.invoke(IPC.CLAUDE_EXECUTE, options),
  claudeExecuteStream: (options: unknown) => ipcRenderer.send(IPC.CLAUDE_EXECUTE_STREAM, options),
  claudeCancel: () => ipcRenderer.invoke(IPC.CLAUDE_CANCEL),
  claudeCheckStatus: () => ipcRenderer.invoke(IPC.CLAUDE_CHECK_STATUS),

  onStreamChunk: (callback: (event: unknown) => void) => {
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

  // Episodes
  episodesLoad: () => ipcRenderer.invoke(IPC.EPISODES_LOAD),
  onEpisodesChanged: (callback: (data: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.EPISODES_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.EPISODES_CHANGED, handler)
  },

  // Applications
  appSave: (app: unknown) => ipcRenderer.invoke(IPC.APP_SAVE, app),
  appList: () => ipcRenderer.invoke(IPC.APP_LIST),
  appGet: (id: string) => ipcRenderer.invoke(IPC.APP_GET, id),
  appDelete: (id: string) => ipcRenderer.invoke(IPC.APP_DELETE, id),
  appUpdateStatus: (id: string, status: string, note?: string) =>
    ipcRenderer.invoke(IPC.APP_UPDATE_STATUS, id, status, note),

  // Cover Letters
  clSave: (cl: unknown) => ipcRenderer.invoke(IPC.CL_SAVE, cl),
  clUpdate: (id: string, updates: unknown) => ipcRenderer.invoke(IPC.CL_UPDATE, id, updates),

  // Drafts
  draftSave: (appId: string, state: unknown) => ipcRenderer.invoke(IPC.DRAFT_SAVE, appId, state),
  draftGet: (appId: string) => ipcRenderer.invoke(IPC.DRAFT_GET, appId),
  draftDelete: (appId: string) => ipcRenderer.invoke(IPC.DRAFT_DELETE, appId),
  draftList: () => ipcRenderer.invoke(IPC.DRAFT_LIST),

  // Episode Usage
  episodeUsage: (appId?: string) => ipcRenderer.invoke(IPC.EPISODE_USAGE, appId),

  // Settings
  settingsGet: (key: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
  settingsSet: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  settingsTestCli: () => ipcRenderer.invoke(IPC.SETTINGS_TEST_CLI),

  // File System
  readMd: (path: string) => ipcRenderer.invoke(IPC.FS_READ_MD, path),
  selectDirectory: () => ipcRenderer.invoke(IPC.FS_SELECT_DIR)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
