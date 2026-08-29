// Gränssnittsspråk för EXAMENSVÄLJAREN (`/`), inte att förväxla med
// `medborgarprov:sprak` i src/exams/medborgarskap/MedborgarskapExam.jsx —
// det styr vilket språk FRÅGORNA i medborgarskapsprovet visas översatta
// till (LANGS = ['ru','en','ar'], ingen 'sv' som val eftersom svenska
// redan är huvudspråket där). Det här är sajtens egna UI-text, med 'sv'
// som ett fullvärdigt val bland de andra — helt separat koncept, egen
// localStorage-nyckel, medvetet olika namn så de aldrig blandas ihop.
export const UI_LANGS = ['sv', 'en', 'ru', 'ar']
export const UI_LANG_NAME = { sv: 'Svenska', en: 'English', ru: 'Русский', ar: 'العربية' }

const UI_LANG_KEY = 'medborgarprov:ui-lang'

const STRINGS = {
  pickerEyebrow: { sv: 'Övningsprov', en: 'Practice exams', ru: 'Тренажёры экзаменов', ar: 'امتحانات تدريبية' },
  pickerTitle: { sv: 'Välj prov', en: 'Choose an exam', ru: 'Выберите экзамен', ar: 'اختر امتحانًا' },
  questions: {
    sv: n => `${n} frågor`,
    en: n => `${n} questions`,
    ru: n => `${n} вопросов`,
    ar: n => `${n} سؤالاً`
  },
  minutes: {
    sv: n => `${n} minuter`,
    en: n => `${n} minutes`,
    ru: n => `${n} минут`,
    ar: n => `${n} دقيقة`
  },
  comingSoon: { sv: 'Kommer snart', en: 'Coming soon', ru: 'Скоро', ar: 'قريباً' },
  comingSoonTitle: {
    sv: 'Provet finns inte här än',
    en: 'This exam isn’t here yet',
    ru: 'Этот экзамен пока недоступен',
    ar: 'هذا الامتحان غير متوفر بعد'
  },
  comingSoonBody: {
    sv: 'Sidan för det här provet är inte byggd än.',
    en: 'The page for this exam hasn’t been built yet.',
    ru: 'Страница этого экзамена ещё не готова.',
    ar: 'صفحة هذا الامتحان لم تُبنَ بعد.'
  },
  backHome: { sv: 'Till startsidan', en: 'Back to start', ru: 'На главную', ar: 'العودة إلى الصفحة الرئيسية' }
}

export function t(key, lang, ...args) {
  const entry = STRINGS[key]?.[lang] ?? STRINGS[key]?.en
  return typeof entry === 'function' ? entry(...args) : entry
}

export function detectUiLang() {
  try {
    const stored = localStorage.getItem(UI_LANG_KEY)
    if (UI_LANGS.includes(stored)) return stored
  } catch { /* localStorage otillgängligt (privat läge o.dyl.) — gå vidare */ }

  const nav = (navigator.language || '').slice(0, 2).toLowerCase()
  return UI_LANGS.includes(nav) ? nav : 'en'
}

export function saveUiLang(lang) {
  try { localStorage.setItem(UI_LANG_KEY, lang) } catch { /* se detectUiLang */ }
}
