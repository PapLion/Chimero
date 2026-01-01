const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Platform info
  platform: process.platform,

  // App version
  getVersion: () => ipcRenderer.invoke("get-version"),

  // Window controls
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // File system operations (if needed in the future)
  saveData: (key, data) => ipcRenderer.invoke("save-data", key, data),
  loadData: (key) => ipcRenderer.invoke("load-data", key),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send("show-notification", title, body),
})

// Handle any errors
window.addEventListener("error", (event) => {
  console.error("Renderer Error:", event.error)
})
