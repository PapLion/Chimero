import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol, shell } from 'electron'
import { join, normalize, resolve } from 'path'
import { pathToFileURL } from 'url'
import { existsSync, renameSync } from 'fs'
import { closeDb } from '@packages/db/database'
import { setupDatabase } from './database'
import { registerIpcHandlers } from './features'
import { PENDING_RESTORE_FILE } from './features/data/handler'
import { setMainWindowRef as setReminderMainWindow, startReminderLoop, stopReminderLoop } from './features/reminders/service'
import { initExerciseDb } from './features/exercises/service'

// chimero-asset:// serves attachments from the profile folder (must be registered before ready).
protocol.registerSchemesAsPrivileged([
  { scheme: 'chimero-asset', privileges: { standard: true, supportFetchAPI: true, secure: true } },
])

/**
 * Profile location.
 * - CHIMERO_USER_DATA_DIR: explicit isolated profile (tests, showcase).
 * - Windows: %LOCALAPPDATA%\Chimero, where every earlier build stored its data.
 * - Elsewhere: the platform default (~/.config/Chimero, ~/Library/Application Support/Chimero).
 */
function resolveUserData(): string | null {
  if (process.env.CHIMERO_USER_DATA_DIR) return resolve(process.env.CHIMERO_USER_DATA_DIR)
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || process.env.APPDATA
    if (base) return resolve(base, 'Chimero')
  }
  return null
}

app.setName('Chimero')
const explicitUserData = resolveUserData()
if (explicitUserData) app.setPath('userData', explicitUserData)

const preloadPath = join(__dirname, '../preload/index.js')
const rendererHtmlPath = join(__dirname, '../renderer/index.html')
const iconPath = resolve(__dirname, '..', '..', 'resources', 'icon.png')

let mainWindow: BrowserWindow | null = null

/** Swap in a database staged by "Restore from backup", keeping the replaced one. */
function applyPendingRestore(): void {
  const userData = app.getPath('userData')
  const pending = join(userData, PENDING_RESTORE_FILE)
  if (!existsSync(pending)) return
  const live = join(userData, 'chimero.db')
  if (existsSync(live)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    renameSync(live, join(userData, `chimero.before-restore-${stamp}.db`))
    for (const suffix of ['-wal', '-shm']) {
      if (existsSync(live + suffix)) renameSync(live + suffix, join(userData, `chimero.before-restore-${stamp}.db${suffix}`))
    }
  }
  renameSync(pending, live)
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#15131c' : '#f5f3f8',
    icon: existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  window.setMenuBarVisibility(false)

  // External links open in the browser, never inside the app shell.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })

  const publishState = () => {
    if (!window.isDestroyed()) window.webContents.send('window-state', { maximized: window.isMaximized(), fullscreen: window.isFullScreen() })
  }
  window.on('maximize', publishState)
  window.on('unmaximize', publishState)
  window.on('enter-full-screen', publishState)
  window.on('leave-full-screen', publishState)

  if (process.env['ELECTRON_RENDERER_URL']) void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void window.loadFile(rendererHtmlPath)
  return window
}

function registerWindowHandlers(): void {
  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-toggle-maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window-close', () => mainWindow?.close())
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)
}

function registerAssetProtocol(): void {
  const userDataPath = app.getPath('userData')
  const baseDir = normalize(resolve(userDataPath))
  const separator = process.platform === 'win32' ? '\\' : '/'
  protocol.handle('chimero-asset', (request) => {
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname)
    } catch {
      return new Response(null, { status: 404 })
    }
    pathname = pathname.replace(/^\/+/, '').replace(/\\/g, '/').trim()
    if (!pathname || pathname.includes('..')) return new Response(null, { status: 404 })
    const parts = pathname.split('/').filter(Boolean)
    const underAssets = parts[0] === 'assets' ? parts : ['assets', ...parts]
    const filePath = normalize(resolve(join(userDataPath, ...underAssets)))
    if (!filePath.startsWith(baseDir + separator) || !existsSync(filePath)) return new Response(null, { status: 404 })
    return net.fetch(pathToFileURL(filePath).href)
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    try {
      applyPendingRestore()
      setupDatabase()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Failed to initialize database:', err)
      dialog.showErrorBox(
        'Chimero could not open your data',
        `${message}\n\nNothing was deleted. Your database is at:\n${join(app.getPath('userData'), 'chimero.db')}`,
      )
      app.quit()
      return
    }
    // The exercise catalogue is optional; the app works without it.
    initExerciseDb().catch((err) => console.error('[Main] Exercise catalogue unavailable:', err))

    registerAssetProtocol()
    registerIpcHandlers()
    registerWindowHandlers()
    mainWindow = createMainWindow()
    setReminderMainWindow(mainWindow)
    startReminderLoop()

    let shown = false
    const show = () => {
      if (shown || !mainWindow) return
      shown = true
      mainWindow.show()
    }
    mainWindow.once('ready-to-show', show)
    setTimeout(show, 3000)
    mainWindow.on('closed', () => {
      mainWindow = null
      setReminderMainWindow(null)
    })
  })

  app.on('window-all-closed', () => {
    stopReminderLoop()
    closeDb()
    app.quit()
  })
}
