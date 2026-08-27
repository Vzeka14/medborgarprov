import { VARIANT_CODES, PRACTICE_SEED } from './seed-cases.mjs'

// Из вопроса, вернувшегося от генератора, для снимка важны только id (в
// порядке следования — определяет порядок самого списка) и `order` —
// перестановка исходных индексов вариантов ответа, которую строит
// shuffleOptions() в src/lib/exam.js. Остального (тексты, переводы)
// снимок не касается — это не то, что рефакторинг генератора рискует
// незаметно сломать.
function pick(questions) {
  return questions.map(q => ({ id: q.id, order: q.order }))
}

export function computeSeedData(examModule) {
  const { buildExam, buildChapterPractice, buildBankPractice, chapterCounts, EXAM_SIZE, bankSize } = examModule

  const exam = {}
  for (const code of VARIANT_CODES) exam[code] = pick(buildExam(code))

  const chapters = chapterCounts().map(c => c.ch)
  const chapterPractice = {}
  for (const ch of chapters) chapterPractice[ch] = pick(buildChapterPractice(PRACTICE_SEED, ch))

  const bankPractice = pick(buildBankPractice(PRACTICE_SEED))

  return {
    meta: {
      examSize: EXAM_SIZE,
      bankSize,
      practiceSeed: PRACTICE_SEED,
      variantCodes: VARIANT_CODES,
      chapters
    },
    exam,
    chapterPractice,
    bankPractice
  }
}
