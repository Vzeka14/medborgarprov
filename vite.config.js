import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// SPA:n har klientroutning med History API (src/router.jsx), inte
// hash-rutter — så en direkt navigering eller omladdning på t.ex.
// /medborgarskap ber GitHub Pages-servern om en fil som inte finns.
// GitHub Pages faller tillbaka till 404.html om den finns, med samma URL
// kvar i adressfältet — en ordagrann kopia av index.html räcker: samma
// script-taggar kör, React startar, routern läser location.pathname och
// visar rätt skärm. Körs bara vid `vite build` (closeBundle), inte i dev
// — Vites egen dev-server har redan SPA-fallback inbyggt.
function copy404() {
  return {
    name: 'copy-404-for-spa-fallback',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')
      const src = path.join(outDir, 'index.html')
      const dest = path.join(outDir, '404.html')
      if (fs.existsSync(src)) fs.copyFileSync(src, dest)
    }
  }
}

// base måste matcha repots namn på GitHub Pages.
// Byt till '/' om du använder egen domän eller ett user-repo (namn.github.io).
export default defineConfig({
  plugins: [react(), copy404()],
  base: process.env.VITE_BASE ?? '/'
})
