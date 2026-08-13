import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base måste matcha repots namn på GitHub Pages.
// Byt till '/' om du använder egen domän eller ett user-repo (namn.github.io).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/medborgarprov/'
})
