/** Electron main process for the DeepSeek Harness desktop application. */

import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { startDesktopServer, type DesktopServer } from './server-process.ts'

const developmentRoot = fileURLToPath(new URL('../../..', import.meta.url))
let server: DesktopServer | undefined
let quitting = false

function serverEntry(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'server', 'lib', 'bin.js')
    : join(developmentRoot, 'apps', 'cli', 'lib', 'bin.js')
}

function preloadEntry(): string {
  return fileURLToPath(new URL('../preload.cjs', import.meta.url))
}

function isExternalUrl(raw: string): boolean {
  const protocol = new URL(raw).protocol
  return protocol === 'http:' || protocol === 'https:'
}

async function createWindow(): Promise<void> {
  server = await startDesktopServer({
    executable: process.execPath,
    serverEntry: serverEntry(),
    workspace: app.getPath('documents'),
    env: process.env,
  })
  const localOrigin = new URL(server.url).origin
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'DeepSeek Harness',
    webPreferences: {
      preload: preloadEntry(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => { callback(false) })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin === localOrigin) return
    event.preventDefault()
    if (isExternalUrl(url)) void shell.openExternal(url)
  })
  window.once('ready-to-show', () => { window.show() })
  await window.loadURL(server.url)
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0]
    if (window?.isMinimized()) window.restore()
    window?.focus()
  })
  app.on('before-quit', (event) => {
    if (quitting || server === undefined) return
    event.preventDefault()
    quitting = true
    void server.stop().finally(() => { app.quit() })
  })
  app.on('window-all-closed', () => { app.quit() })
  app.whenReady().then(createWindow).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('DeepSeek Harness failed to start', message)
    app.quit()
  })
}
