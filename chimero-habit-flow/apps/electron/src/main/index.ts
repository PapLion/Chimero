import { app, BrowserWindow, protocol, net } from 'electron'
import { join, resolve, normalize } from 'path'
import { pathToFileURL } from 'url'
import { existsSync } from 'fs'
import { setupDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { startReminderLoop, setMainWindowRef as setReminderMainWindow } from './services/reminder-service'

// Allow chimero-asset:// to load files from userData (must be before app.ready)
protocol.registerSchemesAsPrivileged([
  { scheme: 'chimero-asset', privileges: { standard: true, supportFetchAPI: true, secure: true } },
])

// --- Cache path (fix GPU/disk cache "Access denied" 0x5 on Windows) ---
// Force userData (and thus disk/GPU cache) to a writable dir *before* ready.
// Must run before app.whenReady(); otherwise Chromium may try to use a restricted path.
// If you still see "Unable to move the cache: Acceso denegado (0x5)" or "Gpu Cache Creation failed":
// they are often non-critical in dev (Chromium falls back to in-memory cache). Ignore unless the app
// crashes or hangs; optionally try app.disableHardwareAcceleration() only if needed.
const writableUserData = resolve(
  process.env.LOCALAPPDATA || process.env.APPDATA || process.env.USERPROFILE || '.',
  'Chimero'
)
app.setPath('userData', writableUserData)

const preloadPath = join(__dirname, '../preload/index.js')
const rendererHtmlPath = join(__dirname, '../renderer/index.html')
const iconPath = resolve(__dirname, '..', '..', 'resources', 'icon.png')

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
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true
    },
    icon: iconPath,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a'
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(rendererHtmlPath)
  }

  return mainWindow
}

app.whenReady().then(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Main] __dirname:', __dirname)
    console.log('[Main] preloadPath:', preloadPath)
    console.log('[Main] iconPath:', iconPath)
  }
  const splash = createSplashWindow()

  try {
    setupDatabase()
  } catch (err) {
    console.error('Failed to initialize database:', err)
    splash.destroy()
    app.quit()
    return
  }

  const userDataPath = app.getPath('userData')
  const baseDir = normalize(resolve(userDataPath))
  const pathSep = process.platform === 'win32' ? '\\' : '/'
  const assetsDir = 'assets'
  protocol.handle('chimero-asset', (request) => {
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname)
    } catch {
      return new Response(null, { status: 404 })
    }
    pathname = pathname.replace(/^\/+/, '').replace(/\\/g, '/').trim()
    if (!pathname || pathname.includes('..')) {
      return new Response(null, { status: 404 })
    }
    const parts = pathname.split('/').filter(Boolean)
    const underAssets = parts[0] === assetsDir ? parts : [assetsDir, ...parts]
    const filePath = normalize(resolve(join(userDataPath, ...underAssets)))
    if (!filePath.startsWith(baseDir + pathSep) || !existsSync(filePath)) {
      return new Response(null, { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).href)
  })

  registerIpcHandlers()
  const mainWindow = createMainWindow()
  setReminderMainWindow(mainWindow)
  startReminderLoop()

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

  setTimeout(showMainAndCloseSplash, 3000)
})
