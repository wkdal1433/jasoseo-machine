import { watch, FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'

let watcher: FSWatcher | null = null
let debounceTimer: NodeJS.Timeout | null = null

export function startFileWatcher(window: BrowserWindow): void {
  const projectDir = getSetting('project_dir') || ''
  if (!projectDir) return

  const episodesDir = join(projectDir, 'episodes')

  watcher = watch(episodesDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 2, // 유저별 폴더까지만 감시
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  })

  // [v8.5 개선] 대량 파일 변경 시 UI 깜빡임 방지를 위한 디바운스 로직
  const notifyChanges = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    
    debounceTimer = setTimeout(() => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC.EPISODES_CHANGED, { type: 'batch-update' })
        }
      })
      debounceTimer = null
    }, 500) // 0.5초 대기 후 일괄 알림
  }

  watcher.on('all', (event) => {
    if (['add', 'change', 'unlink'].includes(event)) {
      notifyChanges()
    }
  })

  watcher.on('error', (error) => {
    console.error(`[Watcher Error] ${error}`)
  })
}

export function stopFileWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
