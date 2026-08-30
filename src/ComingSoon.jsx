import { useEffect, useState } from 'react'
import { Link } from './router.jsx'
import { detectUiLang, t } from './i18n.js'

// Platshållare för /jagarexamen. Ingen config, ingen data, ingen bank —
// bara en text som säger att provet inte finns än, plus en väg tillbaka.
export default function ComingSoon() {
  const [uiLang] = useState(() => detectUiLang())

  useEffect(() => {
    document.documentElement.lang = uiLang
    return () => { document.documentElement.lang = 'sv' }
  }, [uiLang])

  return (
    <div className="sheet-frame">
      <p className="eyebrow">{t('comingSoon', uiLang)}</p>
      <h1>{t('comingSoonTitle', uiLang)}</h1>
      <p className="lead">{t('comingSoonBody', uiLang)}</p>
      <Link to="/" className="btn">{t('backHome', uiLang)}</Link>
    </div>
  )
}
