import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const examSrcPath = path.join(repoRoot, 'src', 'lib', 'exam.js')
const questionsJsonPath = path.join(repoRoot, 'src', 'data', 'questions.json')
const IMPORT_LINE = "import bank from '../data/questions.json'"

/**
 * src/lib/exam.js статически импортирует '../data/questions.json' без
 * import-атрибута. Vite умеет грузить такой JSON сам, но обычный Node
 * (>=20) при загрузке файла как самостоятельного ESM-модуля требует
 * `with { type: 'json' }` у самого импорта — иначе падает с
 * ERR_IMPORT_ATTRIBUTE_MISSING.
 *
 * Менять код в src/ нельзя, поэтому здесь читается исходник exam.js как
 * текст, единственная строка импорта JSON заменяется на абсолютный путь
 * с нужным атрибутом, и получившийся код запускается из временного
 * файла вне репозитория. Весь остальной текст exam.js — побайтово тот
 * же, что и в src/lib/exam.js.
 */
export async function loadExam() {
  const source = fs.readFileSync(examSrcPath, 'utf8')
  if (!source.includes(IMPORT_LINE)) {
    throw new Error(
      `Ожидаемая строка импорта не найдена в ${path.relative(repoRoot, examSrcPath)}: ${IMPORT_LINE}\n` +
      'exam.js изменился — обнови этот загрузчик, не подгоняй результат.'
    )
  }
  if (!fs.existsSync(questionsJsonPath)) {
    throw new Error(
      `Не найден ${path.relative(repoRoot, questionsJsonPath)}. Сначала выполни: npm run bank`
    )
  }

  const jsonUrl = pathToFileURL(questionsJsonPath).href
  const patched = source.replace(IMPORT_LINE, `import bank from '${jsonUrl}' with { type: 'json' }`)

  const tmpFile = path.join(os.tmpdir(), `medborgarprov-exam-${process.pid}-${Date.now()}.mjs`)
  fs.writeFileSync(tmpFile, patched)
  try {
    return await import(pathToFileURL(tmpFile).href)
  } finally {
    fs.unlinkSync(tmpFile)
  }
}
