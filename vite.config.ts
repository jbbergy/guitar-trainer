import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
    // Prefer TS sources when both .ts and .js files exist side-by-side.
    extensions: ['.mjs', '.mts', '.ts', '.js', '.jsx', '.tsx', '.json']
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
