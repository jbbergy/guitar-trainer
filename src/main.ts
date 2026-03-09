/**
 * Electron Main Process
 * Manages application lifecycle, window creation, and IPC
 */

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { WINDOW_CONFIG } from './constants/ui'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    ...WINDOW_CONFIG,
    webPreferences: {
      preload: process.env.VITE_DEV_SERVER_URL 
        ? join(__dirname, 'preload.cjs')
        : join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false,
    autoHideMenuBar: true
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, use app.getAppPath() for reliable path resolution
    const appPath = app.getAppPath()
    const indexPath = join(appPath, 'dist', 'index.html')
    
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Main] Failed to load index.html:', err)
      console.error('[Main] Attempted path:', indexPath)
    })
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Enforce minimum window size
  mainWindow.on('will-resize', (event, newBounds) => {
    if (newBounds.width < WINDOW_CONFIG.minWidth || newBounds.height < WINDOW_CONFIG.minHeight) {
      event.preventDefault()
    }
  })

  // Handle fullscreen toggle (Cmd+F / Ctrl+F)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isCmdOrCtrl = input.meta || input.control
    if (isCmdOrCtrl && input.key.toLowerCase() === 'f') {
      event.preventDefault()
      if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen())
      }
    }
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS apps stay active until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
