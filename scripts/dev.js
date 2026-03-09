#!/usr/bin/env node

/**
 * Development script to run Electron with Vite dev server
 */

import { spawn } from 'child_process'
import { createServer, build } from 'vite'
import electron from 'electron'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function startDev() {
  // Start Vite dev server
  console.log('Starting Vite dev server...')
  const server = await createServer({
    configFile: resolve(__dirname, '../vite.config.ts')
  })
  
  await server.listen()
  
  const address = server.httpServer.address()
  const url = `http://localhost:${address.port}`
  
  console.log(`Vite dev server running at ${url}`)
  
  // Build Electron main process
  console.log('Building Electron main process...')
  
  await build({
    configFile: resolve(__dirname, '../vite.config.electron.ts')
  })
  
  // Build preload script
  await build({
    configFile: false,
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: 'src/preload.ts',
        formats: ['cjs'],
        fileName: () => 'preload.cjs'
      },
      rollupOptions: {
        external: ['electron']
      },
      emptyOutDir: false
    }
  })
  
  console.log('Starting Electron...')
  
  // Start Electron
  const electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: url }
  })
  
  electronProcess.on('close', () => {
    server.close()
    process.exit()
  })
}

startDev().catch(err => {
  console.error(err)
  process.exit(1)
})
