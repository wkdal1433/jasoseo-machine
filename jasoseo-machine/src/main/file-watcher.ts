import { watch, FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'

let watcher: FSWatcher | null = null

export function startFileWatcher(window: BrowserWindow): void {
  const projectDir = getSetting('project_dir') || ''
  if (!projectDir) return

  const episodesDir = join(projectDir, 'episodes')

  watcher = watch(episodesDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  })

  watcher.on('change', (path) => {
    window.webContents.send(IPC.EPISODES_CHANGED, { path, type: 'change' })
  })

  watcher.on('add', (path) => {
    window.webContents.send(IPC.EPISODES_CHANGED, { path, type: 'add' })
  })

  watcher.on('unlink', (path) => {
    window.webContents.send(IPC.EPISODES_CHANGED, { path, type: 'unlink' })
  })
}

export function stopFileWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
