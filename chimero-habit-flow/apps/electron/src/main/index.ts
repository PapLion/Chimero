import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'

// --- Cache path (fix GPU/disk cache "Access denied" 0x5 on Windows) ---
// Force userData (and thus disk/GPU cache) to a writable dir *before* ready.
// Must run before app.whenReady(); otherwise Chromium may try to use a restricted path.
// If you still see "Unable to move the cache: Acceso denegado (0x5)" or "Gpu Cache Creation failed":
// they are often non-critical in dev (Chromium falls back to in-memory cache). Ignore unless the app
// crashes or hangs; optionally try app.disableHardwareAcceleration() only if needed.
const writableUserData = join(
  process.env.LOCALAPPDATA || process.env.APPDATA || process.env.USERPROFILE || '.',
  'Chimero'
)
app.setPath('userData', writableUserData)

function getSplashPath(): string {
  return join(__dirname, 'splash.html')
}

function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 380,
    height: 220,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  splash.loadFile(getSplashPath())
  splash.setMenuBarVisibility(false)
  return splash
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a'
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  const splash = createSplashWindow()

  try {
    setupDatabase()
  } catch (err) {
    console.error('Failed to initialize database:', err)
    splash.destroy()
    app.quit()
    return
  }

  registerIpcHandlers()
  const mainWindow = createMainWindow()

  let shown = false
  const showMainAndCloseSplash = () => {
    if (shown) return
    shown = true
    mainWindow.show()
    splash.close()
  }

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.once('did-finish-load', showMainAndCloseSplash)
  } else {
    mainWindow.once('ready-to-show', showMainAndCloseSplash)
  }

  // Fallback: show main after a short delay if ready-to-show/did-finish-load don't fire
  setTimeout(showMainAndCloseSplash, 3000)
})
