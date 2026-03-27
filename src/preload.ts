/**
 * Electron Preload Script
 * Provides secure IPC bridge between main and renderer processes
 */

import { contextBridge } from 'electron'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add IPC methods here as needed
  // Example: send: (channel: string, data: any) => ipcRenderer.send(channel, data)
})
