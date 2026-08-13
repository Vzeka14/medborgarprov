import bank from '../data/questions.json'

export const EXAM_SIZE = 60
export const EXAM_MINUTES = 90
export const DEFAULT_PASS = 52

// Ungefärlig vikt per kapitel, satt efter hur många sidor kapitlet har
// i Sverige i fokus. UHR har inte publicerat den verkliga fördelningen.
const CHAPTER_WEIGHT = {
  1: 5, 2: 2, 3: 2, 4: 2, 5: 4, 6: 2, 7: 5,
  8: 3, 9: 2, 10: 6, 11: 3, 12: 3, 13: 3
}

export const CHAPTER_TITLE = {
  1: 'Landet Sverige',
  2: 'Sveriges demokratiska system',
  3: 'Så här styrs Sverige',
  4: 'Politiska val och partier',
  5: 'Lag och rätt',
  6: 'Mediernas roll',
  7: 'Mänskliga rättigheter',
  8: 'Arbetsmarknad och privatekonomi',
  9: 'Välfärdssamhället',
  10: 'Sveriges moderna historia',
  11: 'Sverige och omvärlden',
  12: 'En sekulär stat och ett mångreligiöst land',
  13: 'Traditioner och högtider'
}

export const bankSize = bank.length

// mulberry32 — liten deterministisk generator så att en variantkod
// alltid ger exakt samma prov.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function newVariantCode() {
  return Math.floor(Math.random() * 0xffffff).toString(36).toUpperCase().padStart(5, '0')
}

export function codeToSeed(code) {
  let h = 2166136261
  for (const ch of String(code).toUpperCase()) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Bygger ett prov på `size` frågor. Samma kod ger alltid samma prov,
 * så en variant går att dela med någon annan.
 */
export function buildExam(code, size = EXAM_SIZE) {
  const rand = rng(codeToSeed(code))
  const pools = {}
  for (const q of bank) (pools[q.ch] ??= []).push(q)

  const totalWeight = Object.keys(pools).reduce((s, ch) => s + (CHAPTER_WEIGHT[ch] || 1), 0)
  const picked = []
  const used = new Set()

  // Steg 1: proportionellt urval per kapitel.
  for (const ch of Object.keys(pools)) {
    const want = Math.min(
      pools[ch].length,
      Math.round((size * (CHAPTER_WEIGHT[ch] || 1)) / totalWeight)
    )
    for (const q of shuffle(pools[ch], rand).slice(0, want)) {
      picked.push(q)
      used.add(q.id)
    }
  }

  // Steg 2: fyll på eller skär ner till exakt rätt antal.
  const rest = shuffle(bank.filter(q => !used.has(q.id)), rand)
  while (picked.length < size && rest.length) picked.push(rest.pop())
  const questions = shuffle(picked, rand).slice(0, size)

  // Steg 3: blanda svarsalternativen och flytta med det rätta svaret.
  return questions.map(q => {
    const order = shuffle([0, 1, 2, 3], rand)
    return {
      ...q,
      order,
      sv: { q: q.sv.q, o: order.map(i => q.sv.o[i]) },
      ru: { q: q.ru.q, o: order.map(i => q.ru.o[i]) },
      correct: order.indexOf(q.correct)
    }
  })
}

export function scoreExam(exam, answers) {
  const perChapter = {}
  let correct = 0
  exam.forEach((q, i) => {
    const stat = (perChapter[q.ch] ??= { right: 0, total: 0 })
    stat.total++
    if (answers[i] === q.correct) {
      correct++
      stat.right++
    }
  })
  return { correct, total: exam.length, perChapter }
}
