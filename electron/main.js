const { app, BrowserWindow, Menu, shell } = require("electron")
const path = require("path")
const { spawn } = require("child_process")

let mainWindow
let nextServer

const isDev = process.env.NODE_ENV !== "production"
const PORT = 3000

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "../public/icon.jpg"),
    titleBarStyle: "hiddenInset",
    backgroundColor: "#030712",
    show: false,
  })

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${PORT}`)
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, start the Next.js server
    startNextServer().then(() => {
      mainWindow.loadURL(`http://localhost:${PORT}`)
    })
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, "../.next/standalone/server.js")

    nextServer = spawn("node", [serverPath], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: "production",
      },
    })

    nextServer.stdout.on("data", (data) => {
      console.log(`Next.js: ${data}`)
      if (data.toString().includes("Ready")) {
        resolve()
      }
    })

    nextServer.stderr.on("data", (data) => {
      console.error(`Next.js Error: ${data}`)
    })

    // Give the server some time to start
    setTimeout(resolve, 3000)
  })
}

// Create custom menu
function createMenu() {
  const template = [
    {
      label: "HabitFlow",
      submenu: [
        { label: "About HabitFlow", role: "about" },
        { type: "separator" },
        { label: "Preferences", accelerator: "CmdOrCtrl+,", click: () => {} },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", role: "reload" },
        { label: "Force Reload", accelerator: "CmdOrCtrl+Shift+R", role: "forceReload" },
        { type: "separator" },
        { label: "Actual Size", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
        { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
        { type: "separator" },
        { label: "Toggle Full Screen", accelerator: "F11", role: "togglefullscreen" },
        { type: "separator" },
        { label: "Toggle Developer Tools", accelerator: "Alt+CmdOrCtrl+I", role: "toggleDevTools" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { label: "Minimize", accelerator: "CmdOrCtrl+M", role: "minimize" },
        { label: "Close", accelerator: "CmdOrCtrl+W", role: "close" },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App lifecycle
app.whenReady().then(() => {
  createMenu()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill()
  }
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill()
  }
})
