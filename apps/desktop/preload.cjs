/** Minimal, read-only desktop metadata exposed to the sandboxed renderer. */

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('dshDesktop', Object.freeze({
  platform: process.platform,
  versions: Object.freeze({ electron: process.versions.electron }),
}))
