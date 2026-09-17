/**
 * SEO-metadata per rutt: <title>, description, canonical och OG-taggar
 * som ska uppdateras varje gång src/router.jsx byter rutt, plus JSON-LD
 * för de rutter som faktiskt ÄR ett prov.
 *
 * index.html har egna, STATISKA värden för samma taggar (title,
 * description, canonical, og:*) — de är default för "/" och det enda
 * krawlare utan JS-motor (Facebooks länk-crawler bland annat) någonsin
 * ser. De måste hållas i synk med ROUTE_META['/'] nedan för hand; det
 * finns bara tre rutter totalt så det är inte värt en byggtidsgenerering.
 *
 * og:image, og:type, og:site_name, og:locale och twitter:card ändras
 * ALDRIG per rutt (samma bild/typ för hela sajten) — de sätts en gång i
 * index.html och rörs inte härifrån.
 */
import { useEffect } from 'react'

export const SITE_URL = 'https://ovningsprov.se'
export const SITE_NAME = 'Övningsprov'

export const ROUTE_META = {
  '/': {
    title: 'Övningsprov – gratis övningsprov inför svenska prov',
    description: 'Kostnadsfria övningsprov inför svenska prov. Just nu tillgängliga: medborgarskapsprovet och jägarexamen teoriprov.'
  },
  '/medborgarskap': {
    title: 'Medborgarskapsprov – gratis övningsprov i samhällskunskap',
    description: 'Gratis övningsprov i samhällskunskap inför medborgarskapsprovet. 60 frågor på svenska, ryska, engelska och arabiska.'
  },
  '/jagarexamen': {
    title: 'Jägarexamen teoriprov – gratis övningsfrågor',
    description: 'Öva gratis inför jägarexamens teoriprov: 70 frågor, 60 minuter, 60 rätt krävs för godkänt.'
  }
}

// JSON-LD (schema.org) bara för rutter som faktiskt ÄR ett prov — "/" är
// en väljarskärm, inget quiz i sig, och får ingen structured data alls.
//
// Typval: schema.org/Quiz, inte LearningResource. Quiz är i schema.orgs
// egen hierarki en UNDERTYP av LearningResource (CreativeWork >
// LearningResource > Quiz) — den ärver alltså samma egenskaper
// (inLanguage, isAccessibleForFree, learningResourceType, educationalUse,
// about, ...) men beskriver den konkreta aktiviteten sidan faktiskt
// erbjuder (frågor att besvara) mer specifikt än det generiska
// LearningResource. Att välja den mer specifika undertypen när den
// stämmer är schema.orgs egen rekommendation.
//
// Ingen "numberOfQuestions" eller liknande — det är ingen dokumenterad
// schema.org-egenskap på Quiz/LearningResource (Googles separata
// "Practice problems"-funktion har ett eget, snävare vokabulär med
// per-fråga hasPart/Question-noder som är avsett för enskilda övnings-
// uppgifter inom matte/naturvetenskap, inte hela provsidor som den här
// sajten — att bygga ut markeringen för en rich-result-funktion sajten
// sannolikt inte kvalificerar för är inte värt komplexiteten). Antal
// frågor/tid står redan i description, som är fritext.
const ROUTE_QUIZ_JSONLD = {
  '/medborgarskap': {
    name: 'Medborgarskapsprov – övningsprov i samhällskunskap',
    description: ROUTE_META['/medborgarskap'].description,
    inLanguage: ['sv', 'ru', 'en', 'ar'],
    about: { '@type': 'Thing', name: 'Medborgarskapsprovet (prövning för svenskt medborgarskap)' }
  },
  '/jagarexamen': {
    name: 'Jägarexamen teoriprov – övningsfrågor',
    description: ROUTE_META['/jagarexamen'].description,
    inLanguage: ['sv'],
    about: { '@type': 'Thing', name: 'Jägarexamen (teoriprovet)' }
  }
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setJsonLd(path, canonicalUrl) {
  const id = 'route-jsonld'
  const existing = document.getElementById(id)
  const quiz = ROUTE_QUIZ_JSONLD[path]

  if (!quiz) {
    existing?.remove()
    return
  }

  const el = existing ?? document.createElement('script')
  el.type = 'application/ld+json'
  el.id = id
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: quiz.name,
    description: quiz.description,
    url: canonicalUrl,
    inLanguage: quiz.inLanguage,
    isAccessibleForFree: true,
    learningResourceType: 'Practice test',
    educationalUse: 'practice',
    about: quiz.about,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + '/' },
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL + '/' }
  })
  if (!existing) document.head.appendChild(el)
}

// path kommer alltid från src/router.jsx (stripBase, som läser
// window.location.pathname) — ALDRIG från location.search. Så den
// innehåller aldrig query-parametrar (som Facebooks ?sfnsn=wa/mo på
// delade länkar), vilket gör canonicalUrl nedan garanterat ren utan
// något extra saneringssteg.
//
// Utbruten till en egen funktion (istället för att bara ligga inline i
// useEffect) så att den går att testa direkt i Node med en DOM-stub, utan
// att behöva rendera React — se scripts/ eller manuell verifiering vid
// behov.
export function applySeo(path) {
  const meta = ROUTE_META[path] ?? ROUTE_META['/']
  const canonicalUrl = SITE_URL + path

  document.title = meta.title
  setMeta('name', 'description', meta.description)
  setCanonical(canonicalUrl)
  setMeta('property', 'og:title', meta.title)
  setMeta('property', 'og:description', meta.description)
  setMeta('property', 'og:url', canonicalUrl)
  setJsonLd(path, canonicalUrl)

  return { title: meta.title, description: meta.description, canonicalUrl }
}

export function useSeo(path) {
  useEffect(() => {
    applySeo(path)
  }, [path])
}
