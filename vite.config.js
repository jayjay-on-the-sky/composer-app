import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Resolves to node_modules when installed from GitHub, falls back to local sibling for dev
const libRoot = (() => {
  try {
    return resolve(__dirname, 'node_modules/@jayjay/component-library/src')
  } catch {
    return resolve(__dirname, '../component-library/src')
  }
})()

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@lib':        resolve(libRoot, 'lib'),
      '@components': resolve(libRoot, 'components'),
    },
  },
})
