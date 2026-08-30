import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
// Путь и id экзамена здесь по-прежнему захардкожены на medborgarskap —
// снимок и verify проверяют один конкретный экзамен, параметризация по id
// не входила в шаг 5 (см. src/exams/medborgarskap/config.js).
const examSrcPath = path.join(repoRoot, 'src', 'lib', 'exam.js')
const configSrcPath = path.join(repoRoot, 'src', 'exams', 'medborgarskap', 'config.js')
const questionsJsonPath = path.join(repoRoot, 'src', 'data', 'medborgarskap', 'questions.json')

/**
 * Motorn (src/lib/exam.js) importerar sedan förra refaktoreringssteget
 * inte längre någon JSON-fil själv — den tar emot bank och config som
 * argument. exam.js och config.js är därför vanliga ESM-moduler utan
 * JSON-import inuti, och kan laddas med ett vanligt dynamiskt `import()`
 * utan tricket som tidigare behövdes här (patcha en import-rad och köra
 * från en temporär fil). Banken själv läses som ren JSON via fs — inte
 * via `import ... with { type: 'json' }` — så det här skriptet inte
 * bryr sig om vilken Node-version som kör det.
 */
export async function loadExamInputs() {
  if (!fs.existsSync(questionsJsonPath)) {
    throw new Error(
      `Не найден ${path.relative(repoRoot, questionsJsonPath)}. Сначала выполни: npm run bank`
    )
  }
  const bank = JSON.parse(fs.readFileSync(questionsJsonPath, 'utf8'))
  const examModule = await import(pathToFileURL(examSrcPath).href)
  const { default: config } = await import(pathToFileURL(configSrcPath).href)
  return { examModule, bank, config }
}
