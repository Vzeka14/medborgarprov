import { useEffect, useState } from 'react'
import { Link } from './router.jsx'
import { UI_LANGS, UI_LANG_NAME, t, detectUiLang, saveUiLang } from './i18n.js'

// Konfig för varje tillgängligt prov upptäcks automatiskt — ingen
// hårdkodad lista av prov-id:n att glömma uppdatera. Så fort ett prov får
// en src/exams/<id>/config.js dyker det upp här av sig självt.
//
// `eager: true` är okej att köra redan vid modul-laddning trots att den
// här skärmen uttryckligen inte ska dra med sig någon frågebank —
// config.js är bara ett litet dataobjekt (id/titel/kapitel/vikter), inget
// prov importerar sin bank därifrån (se src/exams/medborgarskap/config.js
// och src/exams/medborgarskap/MedborgarskapExam.jsx, som är det enda
// stället `questions.json` laddas, och först när den rutten faktiskt
// besöks — se App.jsx, React.lazy).
const configModules = import.meta.glob('./exams/*/config.js', { eager: true, import: 'default' })
const configById = {}
for (const config of Object.values(configModules)) configById[config.id] = config

// Ordning på korten. `/jagarexamen`-rutten finns redan (App.jsx), men
// provet har ännu ingen config/data — SOON nedan är bara ett namn att visa
// på en icke-klickbar platshållare. Den posten tas bort den dag
// src/exams/jagarexamen/config.js finns; loopen ovan tar över automatiskt,
// inget annat i den här filen behöver ändras.
const ROUTE_ORDER = ['medborgarskap', 'jagarexamen']
const SOON = { jagarexamen: { name: 'Jägarexamen' } }

export default function ExamPicker() {
  const [uiLang, setUiLang] = useState(() => detectUiLang())

  // <html lang> följer bara med medan väljarskärmen visas — provsidorna
  // har egna, redan korrekta språk (medborgarskapsprovet är svenskt).
  useEffect(() => {
    document.documentElement.lang = uiLang
    return () => { document.documentElement.lang = 'sv' }
  }, [uiLang])

  function changeLang(lang) {
    setUiLang(lang)
    saveUiLang(lang)
  }

  return (
    <div className="sheet-frame">
      <div className="picker-head">
        <p className="eyebrow" style={{ margin: 0 }}>{t('pickerEyebrow', uiLang)}</p>
        <label className="field">
          <select
            value={uiLang} onChange={e => changeLang(e.target.value)}
            aria-label="Interface language"
          >
            {UI_LANGS.map(l => (
              <option key={l} value={l}>{UI_LANG_NAME[l]}</option>
            ))}
          </select>
        </label>
      </div>

      <h1>{t('pickerTitle', uiLang)}</h1>

      <div className="exam-cards">
        {ROUTE_ORDER.map(id => {
          const config = configById[id]
          if (config) {
            return (
              <Link to={`/${id}`} className="exam-card" key={id}>
                <p className="exam-card-title">{config.title?.[uiLang] ?? config.title?.en ?? config.id}</p>
                {config.officialName && <p className="exam-card-official">{config.officialName}</p>}
                {config.description && (
                  <p className="small muted" style={{ margin: '0 0 12px' }}>
                    {config.description[uiLang] ?? config.description.en}
                  </p>
                )}
                <p className="mono small exam-card-meta">
                  {t('questions', uiLang, config.examSize)} · {t('minutes', uiLang, config.examMinutes)}
                </p>
              </Link>
            )
          }
          const soon = SOON[id]
          if (!soon) return null
          return (
            <div className="exam-card exam-card-soon" key={id} aria-disabled="true">
              <p className="exam-card-title" style={{ margin: 0 }}>{soon.name}</p>
              <span className="badge">{t('comingSoon', uiLang)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
