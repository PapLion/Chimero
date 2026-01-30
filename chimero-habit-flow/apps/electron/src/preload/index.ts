import { contextBridge, ipcRenderer } from 'electron'

// API personalizada para exponer al renderizador
const api = {
  // Ejemplo: Función para obtener entradas desde la DB
  getEntries: (): Promise<any[]> => ipcRenderer.invoke('get-entries'),
  
  // Puedes agregar más funciones aquí...
}

// Exponer la API al mundo principal (Window object)
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        // Exponemos invoke de forma segura
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
          ipcRenderer.on(channel, listener)
          return () => ipcRenderer.removeListener(channel, listener)
        }
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (types fallback)
  window.electron = electronAPI
  // @ts-ignore (types fallback)
  window.api = api
}