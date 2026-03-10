import { app, BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { initDatabase } from './db'
import { startFileWatcher, stopFileWatcher } from './file-watcher'
import { stopAllProcesses } from './claude-bridge'
import { bridgeServer } from './automation/bridge-server'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: '자소서 머신',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // 기본 메뉴바 제거
  Menu.setApplicationMenu(null)

  electronApp.setAppUserModelId('com.jasoseo-machine')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  registerIpcHandlers()
  
  // [v20.0] 브릿지 서버 시작 (확장 프로그램 연동)
  try {
    await bridgeServer.start()
  } catch (err) {
    console.error('[Bridge] Failed to start server:', err)
  }

  createWindow()

  if (mainWindow) {
    startFileWatcher(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopFileWatcher()
  stopAllProcesses() 
  bridgeServer.stop() // 브릿지 서버 정지
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  stopAllProcesses()
  bridgeServer.stop()
})
