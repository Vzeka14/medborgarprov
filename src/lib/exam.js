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

// Slumpmässigt frö för de otimade övningslägena (kapitel / hela banken).
// Sparas i localStorage så att samma frö bygger om exakt samma
// slumpade ordning när man återupptar en påbörjad övning.
export function newSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

// Blandar ordningen på de fyra svarsalternativen för en fråga och
// flyttar med det rätta svaret. Delas av alla lägen som bygger frågelistor.
function shuffleOptions(q, rand) {
  const order = shuffle([0, 1, 2, 3], rand)
  return {
    ...q,
    order,
    sv: { q: q.sv.q, o: order.map(i => q.sv.o[i]) },
    ru: { q: q.ru.q, o: order.map(i => q.ru.o[i]) },
    correct: order.indexOf(q.correct)
  }
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
  return questions.map(q => shuffleOptions(q, rand))
}

// Antal frågor per kapitel i banken — används av kapitelväljaren.
export function chapterCounts() {
  const counts = {}
  for (const q of bank) counts[q.ch] = (counts[q.ch] || 0) + 1
  return Object.keys(CHAPTER_TITLE)
    .map(Number)
    .sort((a, b) => a - b)
    .map(ch => ({ ch, title: CHAPTER_TITLE[ch], count: counts[ch] || 0 }))
}

/**
 * Bygger en övningsrunda med ALLA frågor i ett kapitel, i slumpad ordning.
 * Samma frö ger samma ordning, så en påbörjad runda kan återupptas.
 */
export function buildChapterPractice(seed, ch) {
  const rand = rng(seed)
  const pool = bank.filter(q => q.ch === Number(ch))
  return shuffle(pool, rand).map(q => shuffleOptions(q, rand))
}

/**
 * Bygger en övningsrunda med HELA frågebanken, i slumpad ordning.
 */
export function buildBankPractice(seed) {
  const rand = rng(seed)
  return shuffle(bank, rand).map(q => shuffleOptions(q, rand))
}

// Grupperar fel svar efter `ref` (kapitel + sida i broschyren) så att
// man ser vilka avsnitt som är svagast efter en kapitelövning.
export function refBreakdown(questions, answers) {
  const stats = {}
  questions.forEach((q, i) => {
    const s = (stats[q.ref] ??= { right: 0, total: 0 })
    s.total++
    if (answers[i] === q.correct) s.right++
  })
  return Object.entries(stats)
    .map(([ref, s]) => ({ ref, ...s }))
    .filter(s => s.right < s.total)
    .sort((a, b) => a.right / a.total - b.right / b.total)
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
