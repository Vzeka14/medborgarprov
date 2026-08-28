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

// Движок больше не читает bank/config из модульных констант — принимает
// их аргументами (см. src/lib/exam.js), поэтому снимок теперь тоже
// явно прокидывает bank/config в каждый вызов, вместо того чтобы читать
// их из examModule.
export function computeSeedData({ examModule, bank, config }) {
  const { buildExam, buildChapterPractice, buildBankPractice, chapterCounts } = examModule

  const exam = {}
  for (const code of VARIANT_CODES) exam[code] = pick(buildExam(bank, config, code))

  const chapters = chapterCounts(bank, config).map(c => c.ch)
  const chapterPractice = {}
  for (const ch of chapters) chapterPractice[ch] = pick(buildChapterPractice(bank, PRACTICE_SEED, ch))

  const bankPractice = pick(buildBankPractice(bank, PRACTICE_SEED))

  return {
    meta: {
      examSize: config.examSize,
      bankSize: bank.length,
      practiceSeed: PRACTICE_SEED,
      variantCodes: VARIANT_CODES,
      chapters
    },
    exam,
    chapterPractice,
    bankPractice
  }
}
