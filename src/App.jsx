import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildExam, scoreExam, newVariantCode,
  chapterCounts, buildChapterPractice, buildBankPractice, newSeed, refBreakdown
} from './lib/exam'
import { support } from './site.config'
import bank from './data/medborgarskap/questions.json'
import examConfig from './exams/medborgarskap/config.js'

// Motorn (src/lib/exam.js) vet inget om medborgarskapsprovet — den tar
// emot bank/config som argument i varje anrop nedan. De här är bara
// bekväma lokala alias så att resten av filen (texter, JSX) kan fortsätta
// använda samma namn som innan den här uppdelningen fanns.
const { examSize: EXAM_SIZE, examMinutes: EXAM_MINUTES, defaultPass: DEFAULT_PASS, passOptions: PASS_OPTIONS } = examConfig
const bankSize = bank.length
const CHAPTER_TITLE = Object.fromEntries(examConfig.chapters.map(c => [c.ch, c.title]))

const KEY = 'medborgarprov:pagaende'
const chapterKey = ch => `medborgarprov:kapitel:${ch}`
const BANK_KEY = 'medborgarprov:bank'
const LETTER = ['A', 'B', 'C', 'D']

// Vilket språk frågorna kan visas översatta till, utöver svenskan som
// alltid är huvudspråket. Tomt värde ('') betyder ingen översättning.
const LANG_KEY = 'medborgarprov:sprak'
const LANGS = ['ru', 'en', 'ar']
const LANG_NAME = { ru: 'Ryska', en: 'Engelska', ar: 'Arabiska' }
const WHY_FIELD = { ru: 'why', en: 'whyEn', ar: 'whyAr' }
const WHY_LABEL = { ru: 'Почему:', en: 'Why:', ar: 'لماذا:' }

function loadLang() {
  const v = localStorage.getItem(LANG_KEY)
  return LANGS.includes(v) ? v : ''
}

function mmss(s) {
  const m = Math.floor(Math.max(0, s) / 60)
  return `${String(m).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
}

function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

function loadSaved() { return loadJSON(KEY) }

export default function App() {
  const [screen, setScreen] = useState('start')
  const [code, setCode] = useState('')
  const [answers, setAnswers] = useState([])
  const [at, setAt] = useState(0)
  const [left, setLeft] = useState(EXAM_MINUTES * 60)
  const [lang, setLang] = useState(() => loadLang())
  const [showTranslation, setShowTranslation] = useState(true)
  const [timed, setTimed] = useState(true)
  const [pass, setPass] = useState(DEFAULT_PASS)
  const [saved, setSaved] = useState(() => loadSaved())

  // Övningsläge (kapitel eller hela banken) — delar mekanik, skiljs åt av `mode`.
  const [mode, setMode] = useState(null) // 'chapter' | 'bank'
  const [pCh, setPCh] = useState(null)
  const [pSeed, setPSeed] = useState(null)
  const [pAt, setPAt] = useState(0)
  const [pAnswers, setPAnswers] = useState([])

  const exam = useMemo(() => (code ? buildExam(bank, examConfig, code) : []), [code])
  const practice = useMemo(() => {
    if (!pSeed) return []
    return mode === 'chapter' ? buildChapterPractice(bank, pSeed, pCh) : buildBankPractice(bank, pSeed)
  }, [mode, pSeed, pCh])

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  useEffect(() => {
    if (screen !== 'exam' || !timed) return
    const t = setInterval(() => setLeft(v => {
      if (v <= 1) { clearInterval(t); setScreen('result'); return 0 }
      return v - 1
    }), 1000)
    return () => clearInterval(t)
  }, [screen, timed])

  useEffect(() => {
    if (screen === 'exam') {
      localStorage.setItem(KEY, JSON.stringify({ code, answers, at, left, timed, pass }))
    }
  }, [screen, code, answers, at, left, timed, pass])

  useEffect(() => {
    if (screen !== 'practice') return
    const key = mode === 'chapter' ? chapterKey(pCh) : BANK_KEY
    localStorage.setItem(key, JSON.stringify({ seed: pSeed, at: pAt, answers: pAnswers }))
  }, [screen, mode, pCh, pSeed, pAt, pAnswers])

  function startChapter(ch, save) {
    const seed = save?.seed ?? newSeed()
    const set = buildChapterPractice(bank, seed, ch)
    setMode('chapter')
    setPCh(ch)
    setPSeed(seed)
    setPAnswers(save?.answers ?? Array(set.length).fill(null))
    setPAt(save?.at ?? 0)
    setScreen('practice')
  }

  function startBank(save) {
    const seed = save?.seed ?? newSeed()
    setMode('bank')
    setPCh(null)
    setPSeed(seed)
    setPAnswers(save?.answers ?? Array(bankSize).fill(null))
    setPAt(save?.at ?? 0)
    setScreen('practice')
  }

  function finishPractice() {
    localStorage.removeItem(mode === 'chapter' ? chapterKey(pCh) : BANK_KEY)
    setScreen('practiceResult')
  }

  function start(newCode) {
    const c = (newCode || newVariantCode()).toUpperCase().trim()
    setCode(c)
    setAnswers(Array(EXAM_SIZE).fill(null))
    setAt(0)
    setLeft(EXAM_MINUTES * 60)
    setScreen('exam')
  }

  function resume() {
    if (!saved) return
    setCode(saved.code)
    setAnswers(saved.answers)
    setAt(saved.at)
    setLeft(saved.left)
    setTimed(saved.timed)
    setPass(saved.pass)
    setScreen('exam')
  }

  function finish() {
    localStorage.removeItem(KEY)
    setSaved(null)
    setScreen('result')
  }

  function backToStart() {
    localStorage.removeItem(KEY)
    setSaved(null)
    setScreen('start')
  }

  const common = { lang, setLang, showTranslation, setShowTranslation }

  return (
    <div className="sheet-frame">
      {screen === 'start' && (
        <Start
          {...common}
          saved={saved} onResume={resume} onStart={start}
          timed={timed} setTimed={setTimed} pass={pass} setPass={setPass}
          onStartChapter={startChapter} onStartBank={startBank}
        />
      )}
      {screen === 'exam' && (
        <Exam
          {...common}
          exam={exam} code={code} answers={answers} setAnswers={setAnswers}
          at={at} setAt={setAt} left={left} timed={timed} onFinish={finish}
        />
      )}
      {screen === 'result' && (
        <Result
          {...common}
          exam={exam} answers={answers} code={code} pass={pass}
          onRestart={backToStart} onAgain={() => start()}
        />
      )}
      {screen === 'practice' && (
        <Practice
          {...common}
          mode={mode} ch={pCh} questions={practice}
          at={pAt} setAt={setPAt} answers={pAnswers} setAnswers={setPAnswers}
          onFinish={finishPractice} onExit={() => setScreen('start')}
        />
      )}
      {screen === 'practiceResult' && (
        <PracticeResult
          {...common}
          mode={mode} ch={pCh} questions={practice} answers={pAnswers}
          onAgain={() => (mode === 'chapter' ? startChapter(pCh, null) : startBank(null))}
          onRestart={() => setScreen('start')}
        />
      )}
      <SiteFooter />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Start({
  saved, onResume, onStart, lang, setLang, timed, setTimed, pass, setPass,
  onStartChapter, onStartBank
}) {
  const [manual, setManual] = useState('')
  return (
    <>
      <p className="eyebrow">Övningsprov · inte ett officiellt prov</p>
      <h1>Träna inför provet i samhällskunskap</h1>
      <p className="lead">
        Tre sätt att öva: ett provliknande test på {EXAM_SIZE} frågor med tid, fri träning på
        ett enskilt kapitel, eller hela frågebanken på {bankSize} frågor. Allt är byggt på UHR:s
        utbildningsmaterial <i>Sverige i fokus</i> och visas på svenska, med valfri översättning som stöd.
      </p>

      <div className="notice">
        <b>Det här är inte UHR:s prov.</b> Sidan är gjord av en privatperson och är inte
        kopplad till Universitets- och högskolerådet eller någon annan myndighet. UHR har inte
        publicerat några gamla prov, och ingen utanför myndigheten vet exakt vilka frågor som ställs.
      </div>

      <h2>Så ser det riktiga provet ut</h2>
      <dl className="facts">
        <dt>Antal frågor</dt><dd>Cirka 60, flervalsfrågor med fyra alternativ där ett är rätt</dd>
        <dt>Provtid</dt><dd>90 minuter</dd>
        <dt>Språk</dt><dd>Svenska</dd>
        <dt>Format</dt><dd>Skrivs på papper</dd>
        <dt>Första provet</dt><dd>15 augusti 2026, Stockholmsmässan</dd>
        <dt>Godkänt</dt><dd>Gränsen är inte publicerad av UHR — ställ in den själv nedan</dd>
      </dl>
      <p className="small muted">
        Källa: uhr.se/medborgarskapsprovet. Provet i augusti 2026 är ett utprövningsprov, vilket
        betyder att frågorna används skarpt för första gången och att svårighetsgraden fortfarande
        kalibreras. Räkna därför inte med att en gräns du hittat på nätet är den verkliga.
      </p>

      <hr className="rule" />

      <h2>Inställningar</h2>
      <div className="toggle-row">
        <label className="field">
          Översättning
          <select value={lang} onChange={e => setLang(e.target.value)}>
            <option value="">Ingen översättning</option>
            {LANGS.map(l => (
              <option key={l} value={l}>{LANG_NAME[l]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} />
          Ta tid (90 min)
        </label>
        <label className="field">
          Godkäntgräns
          <select value={pass} onChange={e => setPass(Number(e.target.value))}>
            {PASS_OPTIONS.map(n => (
              <option key={n} value={n}>{n} av {EXAM_SIZE} ({Math.round((n / EXAM_SIZE) * 100)} %)</option>
            ))}
          </select>
        </label>
      </div>
      <p className="small muted">
        Stäng av översättningen när du börjar känna dig säker — på provdagen finns den inte.
      </p>

      <div className="btn-row" style={{ marginTop: 22 }}>
        <button className="btn" onClick={() => onStart()}>Starta ett nytt prov</button>
        {saved && (
          <button className="btn btn-ghost" onClick={onResume}>
            Fortsätt variant {saved.code} ({saved.answers.filter(a => a !== null).length}/{EXAM_SIZE} svarade)
          </button>
        )}
      </div>

      <p className="small muted" style={{ marginTop: 18 }}>
        Har du en variantkod från någon annan? Skriv in den så får du exakt samma prov.
      </p>
      <div className="btn-row">
        <label className="field">
          <input
            className="mono" value={manual} placeholder="t.ex. K3F9A" size={10}
            onChange={e => setManual(e.target.value.toUpperCase())}
          />
        </label>
        <button className="btn btn-ghost btn-small" disabled={!manual.trim()} onClick={() => onStart(manual)}>
          Öppna varianten
        </button>
      </div>

      <hr className="rule" />

      <h2>Öva på ett kapitel</h2>
      <p className="lead">
        Alla frågor i ett kapitel, i slumpad ordning, utan tidsgräns. Rätt svar visas direkt efter
        varje fråga, med förklaring.
      </p>
      <ChapterList onStart={onStartChapter} />

      <hr className="rule" />

      <h2>Hela frågebanken</h2>
      <p className="lead">
        Alla {bankSize} frågor i banken, i slumpad ordning, utan tidsgräns. Samma direkta rättning
        som i kapitelträningen.
      </p>
      <BankBlock onStart={onStartBank} />
    </>
  )
}

function ChapterList({ onStart }) {
  const chapters = useMemo(() => chapterCounts(bank, examConfig), [])
  return (
    <div>
      {chapters.map(c => {
        const save = loadJSON(chapterKey(c.ch))
        const done = save ? save.answers.filter(a => a !== null && a !== undefined).length : 0
        return (
          <div className="chapter-row" key={c.ch}>
            <span className="chapter-row-title">{c.ch}. {c.title}</span>
            <span className="mono small muted">{c.count} frågor</span>
            <span className="btn-row">
              {save && (
                <button className="btn btn-ghost btn-small" onClick={() => onStart(c.ch, save)}>
                  Fortsätt ({done}/{save.answers.length})
                </button>
              )}
              <button className="btn btn-small" onClick={() => onStart(c.ch, null)}>
                {save ? 'Börja om' : 'Öva'}
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BankBlock({ onStart }) {
  const save = loadJSON(BANK_KEY)
  const done = save ? save.answers.filter(a => a !== null && a !== undefined).length : 0
  return (
    <div className="btn-row">
      <button className="btn" onClick={() => onStart(save)}>
        {save ? `Fortsätt (${done}/${bankSize})` : 'Starta'}
      </button>
      {save && (
        <button className="btn btn-ghost btn-small" onClick={() => onStart(null)}>
          Börja om (nollställ)
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Exam({ exam, code, answers, setAnswers, at, setAt, left, timed, onFinish, lang, showTranslation, setShowTranslation }) {
  const q = exam[at]
  const answered = answers.filter(a => a !== null).length
  const topRef = useRef(null)

  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }) }, [at])

  function choose(i) {
    const next = [...answers]
    next[at] = i
    setAnswers(next)
    if (at < exam.length - 1) setTimeout(() => setAt(at + 1), 180)
  }

  return (
    <>
      <div className="statusbar" data-urgent={timed && left < 300}>
        <span className="mono">VARIANT {code} · FRÅGA {at + 1}/{exam.length}</span>
        <span className="mono">{answered} svarade</span>
        {timed ? <span className="clock">{mmss(left)}</span> : <span className="mono muted">utan tid</span>}
      </div>

      <div ref={topRef} />

      <Sheet
        count={exam.length} answers={answers} current={at}
        onJump={setAt}
      />

      <div className="qcard" style={{ marginTop: 20 }}>
        <div className="qhead">
          <span className="eyebrow" style={{ margin: 0 }}>Fråga {at + 1}</span>
          {lang && (
            <button className="btn btn-ghost btn-small" onClick={() => setShowTranslation(v => !v)}>
              {showTranslation ? 'Dölj översättning' : 'Visa översättning'}
            </button>
          )}
        </div>

        <p className="qtext">{q.sv.q}</p>
        {lang && showTranslation && (
          <p className="qtext-ru" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].q}</p>
        )}

        <ul className="opts">
          {q.sv.o.map((text, i) => (
            <li key={i}>
              <button
                className="opt" aria-pressed={answers[at] === i}
                onClick={() => choose(i)}
              >
                <span className="opt-key">{LETTER[i]}</span>
                <span className="opt-body">
                  {text}
                  {lang && showTranslation && q[lang].o[i] !== text && (
                    <span className="opt-ru" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].o[i]}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn btn-ghost btn-small" disabled={at === 0} onClick={() => setAt(at - 1)}>
          Föregående
        </button>
        <button
          className="btn btn-ghost btn-small" disabled={at === exam.length - 1}
          onClick={() => setAt(at + 1)}
        >
          Nästa
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="btn"
          onClick={() => {
            const kvar = exam.length - answered
            if (kvar === 0 || confirm(`${kvar} frågor är obesvarade. Lämna in ändå?`)) onFinish()
          }}
        >
          Lämna in
        </button>
      </div>
    </>
  )
}

function Sheet({ count, answers, current, onJump, verdicts }) {
  return (
    <div className="omr" role="group" aria-label="Svarsblankett">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          className="omr-cell"
          data-filled={answers[i] !== null && answers[i] !== undefined}
          data-current={i === current}
          data-state={verdicts?.[i]}
          aria-label={`Fråga ${i + 1}`}
          onClick={() => onJump?.(i)}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Result({ exam, answers, code, pass, onRestart, onAgain, lang, showTranslation }) {
  const [onlyWrong, setOnlyWrong] = useState(true)
  const { correct, total, perChapter } = useMemo(() => scoreExam(exam, answers), [exam, answers])
  const passed = correct >= pass
  const verdicts = exam.map((q, i) => (answers[i] === q.correct ? 'right' : 'wrong'))
  const shown = exam.map((q, i) => ({ q, i })).filter(({ i }) => !onlyWrong || verdicts[i] === 'wrong')

  return (
    <>
      <p className="eyebrow">Resultat · variant {code}</p>

      <div className="verdict" data-pass={passed}>
        <div className="score">{correct}<span className="muted" style={{ fontSize: '0.45em' }}> / {total}</span></div>
        <p style={{ margin: '10px 0 0' }}>
          {passed
            ? `Över gränsen du ställt in (${pass}). Bra läge — men gränsen är din egen, inte UHR:s.`
            : `Under gränsen du ställt in (${pass}). Titta på kapitlen längst ner först.`}
        </p>
      </div>

      <h2>Så gick det per kapitel</h2>
      <div className="bars">
        {Object.entries(perChapter)
          .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
          .map(([ch, s]) => (
            <div className="bar-row" key={ch} data-weak={s.right / s.total < 0.7}>
              <span>{CHAPTER_TITLE[ch]}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(s.right / s.total) * 100}%` }} />
              </span>
              <span className="mono small">{s.right}/{s.total}</span>
            </div>
          ))}
      </div>
      <p className="small muted">Svagast kapitel överst. Läs om dem i <i>Sverige i fokus</i> innan nästa försök.</p>

      <hr className="rule" />

      <div className="toggle-row">
        <h2 style={{ margin: 0, flex: 1 }}>Genomgång</h2>
        <button className="btn btn-ghost btn-small" onClick={() => setOnlyWrong(v => !v)}>
          {onlyWrong ? 'Visa alla frågor' : 'Visa bara felen'}
        </button>
      </div>

      <Sheet count={exam.length} answers={answers} current={-1} verdicts={verdicts} />

      {shown.length === 0 && <p className="muted">Inga fel den här gången.</p>}

      {shown.map(({ q, i }) => (
        <div className="review-item" key={q.id}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Fråga {i + 1} · {q.ref}</p>
          <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{q.sv.q}</p>
          {lang && showTranslation && (
            <p className="small muted" style={{ margin: '0 0 12px' }} lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].q}</p>
          )}
          <ul className="opts">
            {q.sv.o.map((text, k) => {
              const verdict = k === q.correct ? 'right' : (answers[i] === k ? 'wrong' : undefined)
              return (
                <li key={k}>
                  <div className="opt" data-verdict={verdict}>
                    <span className="opt-key">{LETTER[k]}</span>
                    <span className="opt-body">
                      {text}
                      {lang && showTranslation && q[lang].o[k] !== text && (
                        <span className="opt-ru" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].o[k]}</span>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="why">
            <p style={{ margin: 0 }}><b>Varför:</b> {q.whySv}</p>
            {lang && showTranslation && (
              <p style={{ margin: '6px 0 0' }} dir={lang === 'ar' ? 'rtl' : undefined}>
                <b>{WHY_LABEL[lang]}</b> <span lang={lang}>{q[WHY_FIELD[lang]]}</span>
              </p>
            )}
          </div>
        </div>
      ))}

      <div className="btn-row" style={{ marginTop: 28 }}>
        <button className="btn" onClick={onAgain}>Nytt prov</button>
        <button className="btn btn-ghost" onClick={onRestart}>Till startsidan</button>
      </div>

      <Support />
    </>
  )
}

/* ------------------------------------------------------------------ */

function Practice({ mode, ch, questions, at, setAt, answers, setAnswers, onFinish, onExit, lang, showTranslation, setShowTranslation }) {
  const q = questions[at]
  const topRef = useRef(null)
  const barRef = useRef(null)
  const answered = answers[at] !== null && answers[at] !== undefined
  const done = answers.filter(a => a !== null && a !== undefined).length
  const correctSoFar = answers.reduce((s, a, i) => s + (a !== null && a !== undefined && a === questions[i].correct ? 1 : 0), 0)

  useEffect(() => {
    // Statusraden är sticky och ligger ovanpå innehållet — utan den här
    // marginalen skulle scrollIntoView gömma frågehuvudet bakom den.
    const barHeight = barRef.current?.getBoundingClientRect().height ?? 0
    if (topRef.current) topRef.current.style.scrollMarginTop = `${barHeight + 12}px`
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [at])

  if (!q) return null

  function choose(i) {
    if (answered) return
    const next = [...answers]
    next[at] = i
    setAnswers(next)
  }

  function next() {
    if (at < questions.length - 1) setAt(at + 1)
    else onFinish()
  }

  return (
    <>
      <p className="eyebrow">
        {mode === 'chapter' ? `Kapitel ${ch} · ${CHAPTER_TITLE[ch]}` : 'Hela frågebanken'}
      </p>

      <div
        className="statusbar" data-progress="true" ref={barRef}
        style={{ '--pct': `${(done / questions.length) * 100}%` }}
      >
        <span className="mono">Fråga {at + 1} av {questions.length}</span>
        <span className="mono">{correctSoFar} rätt</span>
        <button className="btn btn-ghost btn-small" onClick={onExit}>Till startsidan</button>
      </div>

      <div ref={topRef} />

      <div className="qcard" style={{ marginTop: 20 }}>
        <div className="qhead">
          <span className="eyebrow" style={{ margin: 0 }}>Fråga {at + 1}</span>
          {lang && (
            <button className="btn btn-ghost btn-small" onClick={() => setShowTranslation(v => !v)}>
              {showTranslation ? 'Dölj översättning' : 'Visa översättning'}
            </button>
          )}
        </div>

        <p className="qtext">{q.sv.q}</p>
        {lang && showTranslation && (
          <p className="qtext-ru" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].q}</p>
        )}

        <ul className="opts">
          {q.sv.o.map((text, i) => {
            const verdict = answered ? (i === q.correct ? 'right' : (answers[at] === i ? 'wrong' : undefined)) : undefined
            return (
              <li key={i}>
                <button
                  className="opt" aria-pressed={answers[at] === i} data-verdict={verdict}
                  disabled={answered} onClick={() => choose(i)}
                >
                  <span className="opt-key">{LETTER[i]}</span>
                  <span className="opt-body">
                    {text}
                    {lang && showTranslation && q[lang].o[i] !== text && (
                      <span className="opt-ru" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].o[i]}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {answered && (
          <div className="why" style={{ marginTop: 18 }}>
            <p className="small muted" style={{ margin: '0 0 6px' }}>{q.ref}</p>
            <p style={{ margin: 0 }}><b>Varför:</b> {q.whySv}</p>
            {lang && showTranslation && (
              <p style={{ margin: '6px 0 0' }} dir={lang === 'ar' ? 'rtl' : undefined}>
                <b>{WHY_LABEL[lang]}</b> <span lang={lang}>{q[WHY_FIELD[lang]]}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn" disabled={!answered} onClick={next}>
          {at === questions.length - 1 ? 'Avsluta' : 'Nästa'}
        </button>
      </div>
    </>
  )
}

function PracticeResult({ mode, ch, questions, answers, onAgain, onRestart, lang, showTranslation }) {
  const [onlyWrong, setOnlyWrong] = useState(true)
  const total = questions.length
  const correct = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0)
  const verdicts = questions.map((q, i) => (answers[i] === q.correct ? 'right' : 'wrong'))
  const shown = questions.map((q, i) => ({ q, i })).filter(({ i }) => !onlyWrong || verdicts[i] === 'wrong')
  const weak = useMemo(() => (mode === 'chapter' ? refBreakdown(questions, answers) : []), [mode, questions, answers])

  return (
    <>
      <p className="eyebrow">
        {mode === 'chapter' ? `Resultat · Kapitel ${ch}: ${CHAPTER_TITLE[ch]}` : 'Resultat · Hela frågebanken'}
      </p>

      <div className="verdict" data-pass={correct === total}>
        <div className="score">{correct}<span className="muted" style={{ fontSize: '0.45em' }}> / {total}</span></div>
        <p style={{ margin: '10px 0 0' }}>
          {correct === total ? 'Alla rätt den här gången.' : 'Titta igenom felen nedan innan du övar igen.'}
        </p>
      </div>

      {mode === 'chapter' && weak.length > 0 && (
        <>
          <h2>Sidor att läsa om</h2>
          <div className="bars">
            {weak.map(s => (
              <div className="bar-row" key={s.ref} data-weak={s.right / s.total < 0.7}>
                <span>{s.ref}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(s.right / s.total) * 100}%` }} />
                </span>
                <span className="mono small">{s.right}/{s.total}</span>
              </div>
            ))}
          </div>
          <p className="small muted">Svagaste avsnitten överst — läs om dem i <i>Sverige i fokus</i>.</p>
        </>
      )}

      <hr className="rule" />

      <div className="toggle-row">
        <h2 style={{ margin: 0, flex: 1 }}>Genomgång</h2>
        <button className="btn btn-ghost btn-small" onClick={() => setOnlyWrong(v => !v)}>
          {onlyWrong ? 'Visa alla frågor' : 'Visa bara felen'}
        </button>
      </div>

      <Sheet count={total} answers={answers} current={-1} verdicts={verdicts} />

      {shown.length === 0 && <p className="muted">Inga fel den här gången.</p>}

      {shown.map(({ q, i }) => (
        <div className="review-item" key={q.id}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Fråga {i + 1} · {q.ref}</p>
          <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{q.sv.q}</p>
          {lang && showTranslation && (
            <p className="small muted" style={{ margin: '0 0 12px' }} lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].q}</p>
          )}
          <ul className="opts">
            {q.sv.o.map((text, k) => {
              const verdict = k === q.correct ? 'right' : (answers[i] === k ? 'wrong' : undefined)
              return (
                <li key={k}>
                  <div className="opt" data-verdict={verdict}>
                    <span className="opt-key">{LETTER[k]}</span>
                    <span className="opt-body">
                      {text}
                      {lang && showTranslation && q[lang].o[k] !== text && (
                        <span className="opt-ru" lang={lang} dir={lang === 'ar' ? 'rtl' : undefined}>{q[lang].o[k]}</span>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="why">
            <p style={{ margin: 0 }}><b>Varför:</b> {q.whySv}</p>
            {lang && showTranslation && (
              <p style={{ margin: '6px 0 0' }} dir={lang === 'ar' ? 'rtl' : undefined}>
                <b>{WHY_LABEL[lang]}</b> <span lang={lang}>{q[WHY_FIELD[lang]]}</span>
              </p>
            )}
          </div>
        </div>
      ))}

      <div className="btn-row" style={{ marginTop: 28 }}>
        <button className="btn" onClick={onAgain}>
          {mode === 'chapter' ? 'Öva om kapitlet' : 'Öva om hela banken'}
        </button>
        <button className="btn btn-ghost" onClick={onRestart}>Till startsidan</button>
      </div>

      <Support />
    </>
  )
}

/* ------------------------------------------------------------------ */

function Support() {
  const links = [
    support.paypal && { href: support.paypal, label: 'PayPal' },
    support.coffee && { href: support.coffee, label: 'Buy me a coffee' }
  ].filter(Boolean)

  if (!links.length && !support.swish) return null

  return (
    <section className="support">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Stötta sidan · Поддержать проект</p>
      <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
        Sidan är gratis och kommer att förbli gratis.
      </p>
      <p className="small" style={{ marginBottom: 16 }}>
        Den byggs och underhålls av en person på fritiden — nya frågor, rättelser och
        översättningar. Om provet hjälpte dig får du gärna bjuda på en kaffe. Helt frivilligt,
        ingenting låses bakom betalning.
        <span className="muted"> · Сайт бесплатный и таким останется. Если тренажёр
        помог — можно поддержать. Ничего не закрыто платно.</span>
      </p>
      <div className="btn-row">
        {links.map(l => (
          <a key={l.label} className="btn btn-small" href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ))}
        {support.swish && (
          <span className="swish mono">
            Swish <b>{support.swish}</b>
          </span>
        )}
      </div>
    </section>
  )
}

function SiteFooter() {
  const donateLinks = [
    support.paypal && { href: support.paypal, label: 'PayPal' },
    support.coffee && { href: support.coffee, label: 'Buy me a coffee' }
  ].filter(Boolean)
  const hasSwish = !!support.swish

  return (
    <footer className="site">
      <p>
        Övningsmaterial gjort av en privatperson. Inte kopplat till Universitets- och
        högskolerådet, Migrationsverket eller någon annan myndighet. Frågorna är egna
        formuleringar av innehållet i UHR:s utbildningsmaterial{' '}
        <a href="https://www.uhr.se/medborgarskapsprovet/utbildningsmaterial/">Sverige i fokus</a>.
        Läs alltid originalmaterialet.
      </p>
      <p>
        Hittat ett fel i en fråga? Öppna ett issue på{' '}
        <a href="https://github.com/vzeka14">GitHub</a> — då rättas den för alla.
      </p>
      {(donateLinks.length > 0 || hasSwish) && (
        <p>
          Sidan är gratis. Vill du bjuda på en kaffe?{' '}
          {donateLinks.map((l, i) => (
            <span key={l.label}>
              {i > 0 && ' · '}
              <a href={l.href}>{l.label}</a>
            </span>
          ))}
          {donateLinks.length > 0 && hasSwish && ' · '}
          {hasSwish && `Swish ${support.swish}`}
          <span className="muted"> · The site is free. Want to buy me a coffee?</span>
        </p>
      )}
    </footer>
  )
}
