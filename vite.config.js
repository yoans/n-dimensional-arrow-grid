import { defineConfig } from 'vite'

// GitHub Pages serves at /n-dimensional-arrow-grid/
const base = process.env.GITHUB_PAGES === 'true'
  ? '/n-dimensional-arrow-grid/'
  : '/'

export default defineConfig({
  base,
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  }
})
