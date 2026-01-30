import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { db, entries } from '@packages/db' // Importando desde tu paquete local

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // Necesario para Node integration si no usas preload estricto
      contextIsolation: true
    },
    titleBarStyle: 'hidden', // Para que se vea como app nativa moderna
    backgroundColor: '#0f172a' // Dark theme bg
  })

  // En dev carga la URL de Vite, en prod carga el HTML compilado
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  // IPC Example: La UI pide entradas
  ipcMain.handle('get-entries', async () => {
    try {
      return await db.select().from(entries).limit(100);
    } catch (e) {
      console.error(e);
      return [];
    }
  });
})