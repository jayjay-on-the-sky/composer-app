import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@lib': resolve(__dirname, '../component-library/src/lib'),
      '@components': resolve(__dirname, '../component-library/src/components'),
    },
  },
})
