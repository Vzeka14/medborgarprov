// Minimal klientroutning utan extra beroende — sajten har bara tre
// toppnivå-rutter (`/`, `/medborgarskap`, `/jagarexamen`), ingen nästling,
// inga URL-parametrar. En riktig router (react-router-dom o.dyl.) skulle
// lösa samma sak med betydligt mer kod i bundeln än vad tre statiska rutter
// motiverar på en statisk GitHub Pages-sajt.
//
// Använder History API (pushState/popstate), inte hash-rutter — det ger
// rena URL:er (`/medborgarskap` istället för `/#/medborgarskap`), men kräver
// att GitHub Pages faller tillbaka till index.html för okända sökvägar,
// se 404.html (kopia av index.html, se vite.config.js).
//
// `base` (samma som vite.config.js `base`, injicerad av Vite som
// import.meta.env.BASE_URL) räknas bort/på vid varje läsning/navigering, så
// länkar aldrig kan hamna fel vid deploy under en undersökväg.
import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL // slutar alltid på '/', t.ex. '/' eller '/medborgarprov/'
const BASE_PREFIX = BASE.replace(/\/$/, '') // '' när BASE === '/'

function withBase(to) {
  return to === '/' ? BASE : BASE_PREFIX + to
}

function stripBase(pathname) {
  let p = pathname
  if (BASE_PREFIX && p.startsWith(BASE_PREFIX)) p = p.slice(BASE_PREFIX.length)
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p
}

const listeners = new Set()
let currentPath = stripBase(window.location.pathname)

function setPath(next) {
  if (next === currentPath) return
  currentPath = next
  for (const l of listeners) l(currentPath)
}

window.addEventListener('popstate', () => setPath(stripBase(window.location.pathname)))

export function navigate(to) {
  window.history.pushState(null, '', withBase(to))
  setPath(to)
}

export function useRoute() {
  const [path, setLocal] = useState(currentPath)
  useEffect(() => {
    listeners.add(setLocal)
    return () => listeners.delete(setLocal)
  }, [])
  return path
}

// Vanlig <a> under huven (fungerar med cmd/ctrl-klick, "öppna i ny flik",
// no-JS-fallback) — client-side-navigering sker bara vid ett vanligt
// vänsterklick utan modifierartangent.
export function Link({ to, children, ...rest }) {
  return (
    <a
      href={withBase(to)}
      onClick={e => {
        if (e.defaultPrevented || e.button !== 0) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
