/**
 * Konfiguration för provet "jägarexamen" (det TEORETISKA jägarexamen-provet
 * — sajten täcker inte de tre praktiska proven, se
 * docs/jagarexamen-regler.md, avsnitt 5).
 *
 * Källor:
 * - docs/jagarexamen-regler.md, avsnitt 6 ("Blok för config.js") — id,
 *   examSize/examMinutes/defaultPass, requiredLangs, scope, examLanguages.
 * - docs/jagarexamen-struktur.md, avsnitt "Blok chapters för config.js"
 *   och sammanfattningstabellen ovanför den — kapitlens slug/titel/vikt.
 *
 * INGA FRÅGOR ÄN. data/jagarexamen/ har ingen questions-*.json (bara
 * .gitkeep) — den här filen förbereder bara motorn och sajten för att ta
 * emot dem i ett senare steg. scripts/build-bank.mjs känner igen ett prov
 * utan frågefiler och hoppar över det med en varning istället för att
 * fela (se buildBank, `files.length === 0`).
 *
 * /jagarexamen-rutten är fortfarande en "kommer snart"-platshållare
 * (src/ComingSoon.jsx) — den här configen är INTE kopplad till routern
 * eller examensväljaren än (src/ExamPicker.jsx har ett explicit undantag
 * för just det här id:t, se SOON-listan där).
 */
export default {
  id: 'jagarexamen',

  // JPM, s. 19–20, §5.1/§5.2.2 (docs/jagarexamen-regler.md, avsnitt 2/6).
  examSize: 70,
  examMinutes: 60,
  defaultPass: 60,
  // Inget passOptions här (till skillnad från medborgarskap) — det
  // riktiga provets godkäntgräns är fastställd av Naturvårdsverket
  // (60/70), inte något UHR undanhåller och sajten låter användaren
  // gissa på. 60/70 ≈ 85,7 % — beräknat, inte lagrat separat (samma
  // princip som medborgarskaps config: en avledd procentsats sparas
  // inte som ett eget fält, den räknas ut av UI:t vid behov).

  // Bara svenska är obligatoriskt i BANKEN (frågetext + alternativ).
  // Det riktiga provet kan sägas skriftligt på svenska ELLER engelska
  // (JPM, s. 22, §5.3.3) — det är examLanguages nedan, ett annat begrepp
  // än requiredLangs: requiredLangs styr vad build-bank.mjs kräver att
  // VARJE fråga i banken har; examLanguages beskriver det riktiga
  // provets språkval och används inte av build-bank.mjs alls ännu.
  requiredLangs: ['sv'],
  scope: 'theory',
  examLanguages: ['sv', 'en'],

  // Slug (`ch`), svensk titel och vikt — en lista, samma form som
  // src/exams/medborgarskap/config.js (se den filens kommentar om varför
  // det är EN lista och inte tre parallella uppslag). Motorn (chKey i
  // src/lib/exam.js) är sedan tidigare rensad från allt Number(ch) —
  // strängslugarna här fungerar utan ändring i motorn.
  //
  // Vikt = targetQuestions från docs/jagarexamen-struktur.md,
  // oförändrad. buildExam (src/lib/exam.js) använder bara varje kapitels
  // vikt i förhållande till SUMMAN av alla vikter
  // (Math.round(size * vikt / totalvikt)) — det absoluta talet spelar
  // ingen roll, bara proportionen mellan kapitlen. targetQuestions i
  // struktur.md är redan en genomtänkt bedömning per kapitel (dokumenterad
  // resonemang för varje område i den filen) om hur stort kapitlet BÖR
  // vara i den färdiga banken, så de återanvänds direkt som vikt istället
  // för att uppfinna en egen, extra omskalning ovanpå en bedömning som
  // redan gjorts. Summan (490) är alltså storleken på den PLANERADE
  // banken, inte provets storlek (70) — helt orelaterade tal, precis som
  // hos medborgarskap (bankSize 350 vs examSize 60).
  chapters: [
    { ch: 'artkannedom', title: 'Artkännedom', weight: 55 },
    { ch: 'vapenlagstiftning', title: 'Jakt- och vapenlagstiftning samt annan relevant lagstiftning', weight: 38 },
    { ch: 'sakerhet-vapenhantering', title: 'Säkerhet vid vapenhantering', weight: 38 },
    { ch: 'jaktetik', title: 'Jaktetik', weight: 20 },
    { ch: 'ekologi', title: 'Ekologi samt naturens och djurens utveckling', weight: 30 },
    { ch: 'miljo-naturvardshansyn', title: 'Miljö- och naturvårdshänsyn', weight: 20 },
    { ch: 'viltvard', title: 'Viltvård', weight: 15 },
    { ch: 'fangst', title: 'Fångst av vilda däggdjur och fåglar', weight: 25 },
    { ch: 'viltforskning', title: 'Viltforskning', weight: 10 },
    { ch: 'skjutvapen-skjutteknik', title: 'Skjutvapen och skjutteknik', weight: 50 },
    { ch: 'skottverkan-ballistik', title: 'Skottverkan, ammunition och ballistik', weight: 38 },
    { ch: 'skadskjutning-eftersok', title: 'Skadskjutning och eftersök av skadat vilt', weight: 45 },
    { ch: 'jakthundar', title: 'Jakthundar', weight: 8 },
    { ch: 'jaktmetoder', title: 'Jaktmetoder', weight: 38 },
    { ch: 'omhandertagande-vilt', title: 'Omhändertagande av fällt vilt', weight: 30 },
    { ch: 'viltforvaltning-viltskador', title: 'Viltförvaltning och viltskador', weight: 30 }
  ]
}
