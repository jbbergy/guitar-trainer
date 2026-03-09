import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  root: './src/renderer',
  publicDir: resolve(__dirname, './public'),
  base: './', // Use relative paths for Electron
  build: {
    outDir: resolve(__dirname, './dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})
