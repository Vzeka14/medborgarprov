// Generisk provmotor — vet inget om vilket prov den kör. All information
// om ett specifikt prov (id, storlek, tidsgräns, godkäntgräns, kapitel med
// vikt/titel, obligatoriska språk) kommer in som en `config` (se t.ex.
// src/exams/medborgarskap/config.js), och frågorna kommer in som `bank`.
// Ingenting här importerar en datafil eller läser en modulkonstant för ett
// specifikt prov.

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
    en: { q: q.en.q, o: order.map(i => q.en.o[i]) },
    ar: { q: q.ar.q, o: order.map(i => q.ar.o[i]) },
    correct: order.indexOf(q.correct)
  }
}

// `bank` kan komma i valfri ordning — beror på hur den anropande sidan
// byggde/laddade den (filnamn, ihopslagning av flera datafiler, ...).
// shuffle() ovan är Fisher–Yates, vars resultat beror på indataordningen,
// inte bara på seedet — så motorn litar aldrig på den ordning `bank`
// råkar komma in i. Den normaliseras här, varje gång, till en kanonisk
// ordning efter `id` (stabil sortering), innan något som bygger på
// ordningen (buildExam/buildChapterPractice/buildBankPractice) använder
// den. Enkel kodenhets-jämförelse (`<`/`>`), inte localeCompare — den kan
// variera med Node-byggets ICU-data/locale-inställningar.
function canonicalBank(bank) {
  return [...bank].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

// Kapitelordning + vikt — hämtade ur config.chapters (en lista), inte ur
// nycklarna i en pool byggd vid körning. Object.keys() på en sådan pool
// ger insättningsordning för icke-numeriska nycklar (t.ex. strängbaserade
// kapitel-id:n i ett framtida prov) — den ordningen ska aldrig vara något
// motorn litar på.
function chapterOrder(config) {
  return config.chapters.map(c => c.ch)
}

function chapterWeights(config) {
  return new Map(config.chapters.map(c => [c.ch, c.weight]))
}

/**
 * Bygger ett prov på `size` frågor ur `bank`, enligt `config`. Samma kod
 * ger alltid samma prov, så en variant går att dela med någon annan.
 */
export function buildExam(bank, config, code, size = config.examSize) {
  const canon = canonicalBank(bank)
  const rand = rng(codeToSeed(code))
  const pools = {}
  for (const q of canon) (pools[q.ch] ??= []).push(q)

  const order = chapterOrder(config)
  const weightOf = chapterWeights(config)
  const totalWeight = order.reduce((s, ch) => s + (weightOf.get(ch) ?? 1), 0)
  const picked = []
  const used = new Set()

  // Steg 1: proportionellt urval per kapitel, i kapitelordning (från
  // config.chapters) — inte i den ordning kapitlen råkar dyka upp i `pools`.
  for (const ch of order) {
    const chPool = pools[ch] || []
    const want = Math.min(
      chPool.length,
      Math.round((size * (weightOf.get(ch) ?? 1)) / totalWeight)
    )
    for (const q of shuffle(chPool, rand).slice(0, want)) {
      picked.push(q)
      used.add(q.id)
    }
  }

  // Steg 2: fyll på eller skär ner till exakt rätt antal.
  const rest = shuffle(canon.filter(q => !used.has(q.id)), rand)
  while (picked.length < size && rest.length) picked.push(rest.pop())
  const questions = shuffle(picked, rand).slice(0, size)

  // Steg 3: blanda svarsalternativen och flytta med det rätta svaret.
  return questions.map(q => shuffleOptions(q, rand))
}

// Antal frågor per kapitel i banken — används av kapitelväljaren. Räknar
// bara ihop en summa per kapitel, så ordningen på `bank` spelar ingen
// roll här (till skillnad från buildExam/buildChapterPractice/
// buildBankPractice, som bygger listor vars ORDNING är resultatet).
export function chapterCounts(bank, config) {
  const counts = {}
  for (const q of bank) counts[q.ch] = (counts[q.ch] || 0) + 1
  return config.chapters.map(c => ({ ch: c.ch, title: c.title, count: counts[c.ch] || 0 }))
}

/**
 * Bygger en övningsrunda med ALLA frågor i ett kapitel ur `bank`, i
 * slumpad ordning. Samma frö ger samma ordning, så en påbörjad runda kan
 * återupptas.
 */
export function buildChapterPractice(bank, seed, ch) {
  const canon = canonicalBank(bank)
  const rand = rng(seed)
  const pool = canon.filter(q => q.ch === Number(ch))
  return shuffle(pool, rand).map(q => shuffleOptions(q, rand))
}

/**
 * Bygger en övningsrunda med HELA `bank`, i slumpad ordning.
 */
export function buildBankPractice(bank, seed) {
  const canon = canonicalBank(bank)
  const rand = rng(seed)
  return shuffle(canon, rand).map(q => shuffleOptions(q, rand))
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

// Räknar inte med något provspecifikt — tar redan uppbyggda frågor
// (från buildExam) och svar, oberoende av config/bank. Ingen
// signaturändring behövdes för det här steget.
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
