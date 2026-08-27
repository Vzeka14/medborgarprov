#!/usr/bin/env node
// Пересчитывает ровно те же вызовы, что и seed-snapshot.mjs, и сравнивает
// результат с test/snapshots/seed-baseline.json. Любое расхождение —
// сигнал, что рефакторинг незаметно изменил генератор экзаменов (см.
// раздел "Риски" в docs/refactor-plan.md, особенно про сид).
//
// Запуск: npm run verify
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadExam } from './lib/load-exam.mjs'
import { computeSeedData } from './lib/compute-seed-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const baselinePath = path.join(repoRoot, 'test', 'snapshots', 'seed-baseline.json')

if (!fs.existsSync(baselinePath)) {
  console.error(`Снимка нет: ${path.relative(repoRoot, baselinePath)}. Сначала выполни: npm run snapshot`)
  process.exit(1)
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
const exam = await loadExam()
const fresh = computeSeedData(exam)

const problems = []

// Различает три вида расхождения: другой набор id, тот же набор но другой
// порядок следования, тот же порядок вопросов но другой порядок вариантов
// ответа внутри вопроса.
function diffQuestionList(label, before, after) {
  if (!before || !after) return `${label}: нет данных для сравнения`

  const beforeIds = before.map(q => q.id)
  const afterIds = after.map(q => q.id)

  if (beforeIds.length !== afterIds.length) {
    return `${label}: другое число вопросов (было ${beforeIds.length}, стало ${afterIds.length})`
  }

  const beforeSet = new Set(beforeIds)
  const afterSet = new Set(afterIds)
  const sameSet = beforeSet.size === afterSet.size && [...beforeSet].every(id => afterSet.has(id))
  if (!sameSet) {
    const missing = beforeIds.filter(id => !afterSet.has(id))
    const added = afterIds.filter(id => !beforeSet.has(id))
    return `${label}: другой набор id вопросов (пропали: ${missing.join(', ') || '—'}; появились: ${added.join(', ') || '—'})`
  }

  const sameOrder = beforeIds.every((id, i) => id === afterIds[i])
  if (!sameOrder) {
    return `${label}: тот же набор id, но другой порядок следования вопросов`
  }

  for (let i = 0; i < before.length; i++) {
    const a = before[i].order
    const b = after[i].order
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      return `${label}: вопрос ${before[i].id} — другой порядок вариантов ответа (было [${a}], стало [${b}])`
    }
  }

  return null
}

for (const code of baseline.meta.variantCodes) {
  const diff = diffQuestionList(`код варианта ${JSON.stringify(code)}`, baseline.exam[code], fresh.exam[code])
  if (diff) problems.push(diff)
}

for (const ch of baseline.meta.chapters) {
  const diff = diffQuestionList(`глава ${ch} (практика)`, baseline.chapterPractice[ch], fresh.chapterPractice[ch])
  if (diff) problems.push(diff)
}

const bankDiff = diffQuestionList('вся банка (практика)', baseline.bankPractice, fresh.bankPractice)
if (bankDiff) problems.push(bankDiff)

if (baseline.meta.bankSize !== fresh.meta.bankSize) {
  problems.push(`размер банка изменился: было ${baseline.meta.bankSize}, стало ${fresh.meta.bankSize}`)
}
if (baseline.meta.examSize !== fresh.meta.examSize) {
  problems.push(`EXAM_SIZE изменился: было ${baseline.meta.examSize}, стало ${fresh.meta.examSize}`)
}

if (problems.length) {
  console.error('Расхождение с seed-baseline.json:')
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log(
  `OK: генератор совпадает со снимком (${baseline.meta.variantCodes.length} кодов вариантов, ` +
  `${baseline.meta.chapters.length} глав, вся банка целиком).`
)
