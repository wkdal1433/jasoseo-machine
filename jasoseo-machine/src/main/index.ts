import { app, BrowserWindow, shell, Menu, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { initDatabase } from './db'
import { startFileWatcher, stopFileWatcher } from './file-watcher'
import { stopAllProcesses } from './claude-bridge'
import { bridgeServer } from './automation/bridge-server'
import { IPC } from '../shared/ipc-channels'

let mainWindow: BrowserWindow | null = null
let allowClose = false

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

  // 종료 전 저장 확인 (Word 스타일)
  mainWindow.on('close', (event) => {
    if (!allowClose) {
      event.preventDefault()
      mainWindow?.webContents.send(IPC.APP_BEFORE_CLOSE)
    }
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

  // 종료 확인 응답 처리
  ipcMain.on(IPC.APP_CLOSE_REPLY, (_, confirmed: boolean) => {
    if (confirmed) {
      allowClose = true
      mainWindow?.close()
    }
    // confirmed=false → 창 유지, 아무것도 하지 않음
  })
  
  // [v20.0] 브릿지 서버 시작 (확장 프로그램 연동)
  try {
    await bridgeServer.start()
  } catch (err) {
    console.error('[Bridge] Failed to start server:', err)
  }

  createWindow()

  if (mainWindow) {
    bridgeServer.setMainWindow(mainWindow)
    startFileWatcher(mainWindow)
    mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
      console.log(`[Renderer] ${message} (${sourceId}:${line})`)
    })
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

// 메인 프로세스 안전망: 처리되지 않은 에러로 인한 앱 강제 종료 방지
process.on('uncaughtException', (err) => {
  console.error('[Main Process] uncaughtException:', err.message, err.stack)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Main Process] unhandledRejection:', reason)
})
