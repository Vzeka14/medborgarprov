#!/usr/bin/env node
// Bygger frågebanken för ETT prov: läser data/<id>/questions-*.json och
// data/<id>/why-<lang>.json, validerar mot provets egen config
// (src/exams/<id>/config.js), skriver src/data/<id>/questions.json.
//
// Generisk — vet inget om vilket prov den kör, precis som src/lib/exam.js
// sedan förra refaktoreringssteget. Vilka språk som krävs kommer från
// config.requiredLangs, inte en hårdkodad lista här, så kravet gäller
// per prov och kan inte bli svagare av misstag när fler prov tillkommer.
//
// Körning: node scripts/build-bank.mjs <exam-id>
// (se npm run bank / npm run bank:all i package.json)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

export async function buildBank(id) {
  const dataDir = path.join(repoRoot, 'data', id)
  const configPath = path.join(repoRoot, 'src', 'exams', id, 'config.js')
  const outDir = path.join(repoRoot, 'src', 'data', id)
  const outFile = path.join(outDir, 'questions.json')

  if (!fs.existsSync(dataDir)) {
    throw new Error(`Ingen datamapp: ${path.relative(repoRoot, dataDir)}`)
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`Ingen config: ${path.relative(repoRoot, configPath)}`)
  }

  const files = fs.readdirSync(dataDir).filter(f => /^questions-.*\.json$/.test(f)).sort()

  // Provet har fått sin datamapp och sin config, men ingen fråga är
  // skriven än — det är inte samma sak som en trasig bank och ska inte
  // fälla `npm run bank:all` för hela sajten. Flera prov ska kunna vara
  // förberedda i förväg medan de väntar på innehåll (se
  // src/exams/jagarexamen/config.js). Skiljs uttryckligen från "har
  // frågor men saknar ett obligatoriskt språk" — det fallet faller
  // fortfarande igenom till valideringen nedan och ska fortsätta fela.
  if (files.length === 0) {
    return { id, skipped: true, reason: `inga questions-*.json i ${path.relative(repoRoot, dataDir)}` }
  }

  const { default: config } = await import(pathToFileURL(configPath).href)
  const requiredLangs = config.requiredLangs
  if (!Array.isArray(requiredLangs) || requiredLangs.length === 0) {
    throw new Error(`${id}: config.requiredLangs saknas eller är tom`)
  }

  // Ett av de obligatoriska språken KAN ligga inbäddat direkt i
  // frågeobjektet (fältet `why`, historiskt ryska — så skrevs
  // medborgarskapsdatan innan den här uppdelningen fanns) — resten av
  // requiredLangs kommer från separata why-<lang>.json-filer bredvid
  // frågefilerna. Gäller bara om det språket faktiskt står i
  // requiredLangs — ett prov som inte kräver EMBEDDED_WHY_LANG alls
  // (t.ex. jägarexamen, requiredLangs: ['sv']) ska inte plötsligt behöva
  // ett `why`-fält som inget i dess egen config bad om.
  const EMBEDDED_WHY_LANG = 'ru'
  const hasEmbeddedWhyLang = requiredLangs.includes(EMBEDDED_WHY_LANG)
  const whyField = lang =>
    lang === EMBEDDED_WHY_LANG ? 'why' : `why${lang[0].toUpperCase()}${lang.slice(1)}`
  const fileLangs = requiredLangs.filter(l => l !== EMBEDDED_WHY_LANG)

  let all = []
  for (const f of files) all = all.concat(JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')))

  const why = {}
  for (const lang of fileLangs) {
    const whyPath = path.join(dataDir, `why-${lang}.json`)
    if (!fs.existsSync(whyPath)) {
      throw new Error(`${id}: saknar ${path.relative(repoRoot, whyPath)} (krävs av requiredLangs)`)
    }
    why[lang] = JSON.parse(fs.readFileSync(whyPath, 'utf8'))
  }

  const errs = []
  const ids = new Set()
  for (const q of all) {
    if (ids.has(q.id)) errs.push(`dubblett id: ${q.id}`)
    ids.add(q.id)
    for (const lang of requiredLangs) {
      if (!q[lang]?.q) errs.push(`${q.id}: saknar ${lang}.q`)
      if (q[lang]?.o?.length !== 4) errs.push(`${q.id}: ${lang} har inte 4 alternativ`)
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) errs.push(`${q.id}: ogiltigt correct`)
    if (!q.ref) errs.push(`${q.id}: saknar ref`)
    if (hasEmbeddedWhyLang && !q[whyField(EMBEDDED_WHY_LANG)]) {
      errs.push(`${q.id}: saknar ${EMBEDDED_WHY_LANG}-förklaring (${whyField(EMBEDDED_WHY_LANG)})`)
    }
    for (const lang of fileLangs) {
      if (!why[lang][q.id]) errs.push(`${q.id}: saknar ${lang}-förklaring i data/${id}/why-${lang}.json`)
      q[whyField(lang)] = why[lang][q.id]
    }
  }
  for (const lang of fileLangs) {
    for (const qid of Object.keys(why[lang])) {
      if (!ids.has(qid)) errs.push(`why-${lang}.json: ${qid} finns inte i frågebanken`)
    }
  }
  if (errs.length) throw new Error(errs.join('\n'))

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(all))

  const byCh = {}
  for (const q of all) byCh[q.ch] = (byCh[q.ch] || 0) + 1
  const byKind = {}
  for (const q of all) byKind[q.kind] = (byKind[q.kind] || 0) + 1

  return { id, count: all.length, requiredLangs, byCh, byKind, outFile }
}

// Körs direkt (inte importerad av build-bank-all.mjs)?
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const id = process.argv[2]
  if (!id) {
    console.error('Användning: node scripts/build-bank.mjs <exam-id>')
    process.exit(1)
  }
  try {
    const r = await buildBank(id)
    if (r.skipped) {
      console.warn(`ÖVERHOPPAD ${r.id}: ${r.reason}`)
    } else {
      console.log(`OK ${r.id}: ${r.count} frågor, alla med förklaring på ${r.requiredLangs.join(', ')}`)
      console.log('per kapitel:', JSON.stringify(r.byCh))
      console.log('per typ:', JSON.stringify(r.byKind))
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
