import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildExam, scoreExam, newVariantCode, bankSize,
  EXAM_SIZE, EXAM_MINUTES, DEFAULT_PASS, CHAPTER_TITLE
} from './lib/exam'
import { support } from './site.config'

const KEY = 'medborgarprov:pagaende'
const LETTER = ['A', 'B', 'C', 'D']

function mmss(s) {
  const m = Math.floor(Math.max(0, s) / 60)
  return `${String(m).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
}

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export default function App() {
  const [screen, setScreen] = useState('start')
  const [code, setCode] = useState('')
  const [answers, setAnswers] = useState([])
  const [at, setAt] = useState(0)
  const [left, setLeft] = useState(EXAM_MINUTES * 60)
  const [showRu, setShowRu] = useState(true)
  const [timed, setTimed] = useState(true)
  const [pass, setPass] = useState(DEFAULT_PASS)
  const [saved, setSaved] = useState(() => loadSaved())

  const exam = useMemo(() => (code ? buildExam(code) : []), [code])

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
      localStorage.setItem(KEY, JSON.stringify({ code, answers, at, left, showRu, timed, pass }))
    }
  }, [screen, code, answers, at, left, showRu, timed, pass])

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
    setShowRu(saved.showRu)
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

  const common = { showRu, setShowRu }

  return (
    <div className="sheet-frame">
      {screen === 'start' && (
        <Start
          {...common}
          saved={saved} onResume={resume} onStart={start}
          timed={timed} setTimed={setTimed} pass={pass} setPass={setPass}
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
      <SiteFooter />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Start({ saved, onResume, onStart, showRu, setShowRu, timed, setTimed, pass, setPass }) {
  const [manual, setManual] = useState('')
  return (
    <>
      <p className="eyebrow">Övningsprov · inte ett officiellt prov</p>
      <h1>Träna inför provet i samhällskunskap</h1>
      <p className="lead">
        {EXAM_SIZE} frågor på {EXAM_MINUTES} minuter, byggda på UHR:s utbildningsmaterial{' '}
        <i>Sverige i fokus</i>. Varje variant lottas fram på nytt ur en bank på {bankSize} frågor.
        Frågorna visas på svenska, med rysk översättning som stöd.
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
          <input type="checkbox" checked={showRu} onChange={e => setShowRu(e.target.checked)} />
          Visa rysk översättning
        </label>
        <label className="field">
          <input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} />
          Ta tid (90 min)
        </label>
        <label className="field">
          Godkäntgräns
          <select value={pass} onChange={e => setPass(Number(e.target.value))}>
            {[42, 45, 48, 52, 54].map(n => (
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
    </>
  )
}

/* ------------------------------------------------------------------ */

function Exam({ exam, code, answers, setAnswers, at, setAt, left, timed, onFinish, showRu, setShowRu }) {
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
          <button className="btn btn-ghost btn-small" onClick={() => setShowRu(v => !v)}>
            {showRu ? 'Dölj översättning' : 'Visa översättning'}
          </button>
        </div>

        <p className="qtext">{q.sv.q}</p>
        {showRu && <p className="qtext-ru">{q.ru.q}</p>}

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
                  {showRu && q.ru.o[i] !== text && <span className="opt-ru">{q.ru.o[i]}</span>}
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

function Result({ exam, answers, code, pass, onRestart, onAgain, showRu }) {
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
          {showRu && <p className="small muted" style={{ margin: '0 0 12px' }}>{q.ru.q}</p>}
          <ul className="opts">
            {q.sv.o.map((text, k) => {
              const verdict = k === q.correct ? 'right' : (answers[i] === k ? 'wrong' : undefined)
              return (
                <li key={k}>
                  <div className="opt" data-verdict={verdict}>
                    <span className="opt-key">{LETTER[k]}</span>
                    <span className="opt-body">
                      {text}
                      {showRu && q.ru.o[k] !== text && <span className="opt-ru">{q.ru.o[k]}</span>}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="why">
            <p style={{ margin: 0 }}><b>Varför:</b> {q.whySv}</p>
            {showRu && <p style={{ margin: '6px 0 0' }}><b>Почему:</b> {q.why}</p>}
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
    </footer>
  )
}
