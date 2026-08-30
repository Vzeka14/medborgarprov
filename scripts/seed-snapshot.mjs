#!/usr/bin/env node
// Строит регрессионный снимок текущего поведения генератора экзаменов
// (src/lib/exam.js) на фиксированном наборе кодов вариантов и одном
// фиксированном seed для тренировочных режимов — до рефакторинга,
// описанного в docs/refactor-plan.md.
//
// Запуск: npm run snapshot
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadExamInputs } from './lib/load-exam.mjs'
import { computeSeedData } from './lib/compute-seed-data.mjs'
import { stableStringify } from './lib/stable-json.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outPath = path.join(repoRoot, 'test', 'snapshots', 'seed-baseline.json')

const inputs = await loadExamInputs()
const data = computeSeedData(inputs)

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, stableStringify(data))

console.log(`Снимок записан: ${path.relative(repoRoot, outPath)}`)
console.log(`Кодов вариантов в снимке: ${data.meta.variantCodes.length}`)
console.log(`Глав (практика): ${data.meta.chapters.length}`)
console.log(`Размер банка: ${data.meta.bankSize}`)
