import { lazy, Suspense, useEffect } from 'react'
import { useRoute } from './router.jsx'
import { trackPageview } from './lib/analytics.js'
import ExamPicker from './ExamPicker.jsx'
import ComingSoon from './ComingSoon.jsx'

// Lazy — annars skulle väljarskärmen (/) dra med sig hela
// medborgarskapsprovet, inklusive dess frågebank (946 kB JSON), i samma
// bundel som laddas redan på /. Se npm run build: en egen chunk för den
// här modulen (och allt den importerar) laddas bara när /medborgarskap
// faktiskt besöks.
const MedborgarskapExam = lazy(() => import('./exams/medborgarskap/MedborgarskapExam.jsx'))

export default function App() {
  const path = useRoute()

  // En sidvisning per rutt-byte, inklusive den första — se
  // src/lib/analytics.js för varför det inte dubbelräknas.
  useEffect(() => {
    trackPageview(path)
  }, [path])

  if (path === '/medborgarskap') {
    return (
      <Suspense fallback={<div className="sheet-frame"><p className="eyebrow">Laddar …</p></div>}>
        <MedborgarskapExam />
      </Suspense>
    )
  }
  if (path === '/jagarexamen') return <ComingSoon />
  return <ExamPicker />
}
