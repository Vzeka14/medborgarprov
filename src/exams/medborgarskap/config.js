/**
 * Konfiguration för provet "medborgarskap" (medborgarskapsprovet).
 *
 * Motorn (src/lib/exam.js) läser aldrig de här värdena som modulkonstanter
 * — den tar emot både frågebanken och den här configen som argument, så
 * att den inte behöver veta vilket prov den kör (se docs/refactor-plan.md).
 *
 * `chapters` är EN lista där nummer, titel och vikt hör ihop i samma
 * objekt — inte tre parallella uppslag (som CHAPTER_WEIGHT/CHAPTER_TITLE
 * tidigare var i exam.js) som måste hållas i synk för hand vid varje
 * ändring. Listans ordning är den kapitelordning motorn använder — den
 * ska aldrig härledas ur hur nycklarna i något annat objekt råkar radas
 * upp (se refactor-planens risk om implicit nyckelordning).
 */
export default {
  id: 'medborgarskap',
  examSize: 60,
  examMinutes: 90,
  defaultPass: 52,
  passOptions: [42, 45, 48, 52, 54],
  // Språk varje fråga i banken måste finnas på — kontrolleras idag av
  // data/build-bank.mjs, inte av motorn. Deklareras här så att den
  // kopplingen blir uttalad, redo att användas när valideringen
  // parametriseras per prov.
  requiredLangs: ['sv', 'ru', 'en', 'ar'],
  chapters: [
    { ch: 1, title: 'Landet Sverige', weight: 5 },
    { ch: 2, title: 'Sveriges demokratiska system', weight: 2 },
    { ch: 3, title: 'Så här styrs Sverige', weight: 2 },
    { ch: 4, title: 'Politiska val och partier', weight: 2 },
    { ch: 5, title: 'Lag och rätt', weight: 4 },
    { ch: 6, title: 'Mediernas roll', weight: 2 },
    { ch: 7, title: 'Mänskliga rättigheter', weight: 5 },
    { ch: 8, title: 'Arbetsmarknad och privatekonomi', weight: 3 },
    { ch: 9, title: 'Välfärdssamhället', weight: 2 },
    { ch: 10, title: 'Sveriges moderna historia', weight: 6 },
    { ch: 11, title: 'Sverige och omvärlden', weight: 3 },
    { ch: 12, title: 'En sekulär stat och ett mångreligiöst land', weight: 3 },
    { ch: 13, title: 'Traditioner och högtider', weight: 3 }
  ]
}
