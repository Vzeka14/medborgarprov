import fs from 'fs';
const files = fs.readdirSync('data').filter(f => /^questions-.*\.json$/.test(f)).sort();
let all = [];
for (const f of files) all = all.concat(JSON.parse(fs.readFileSync(`data/${f}`, 'utf8')));

const LANGS = ['sv', 'ru', 'en', 'ar'];
const why = {
  sv: JSON.parse(fs.readFileSync('data/why-sv.json', 'utf8')),
  en: JSON.parse(fs.readFileSync('data/why-en.json', 'utf8')),
  ar: JSON.parse(fs.readFileSync('data/why-ar.json', 'utf8'))
};

const errs = [];
const ids = new Set();
for (const q of all) {
  if (ids.has(q.id)) errs.push(`dubblett id: ${q.id}`);
  ids.add(q.id);
  for (const lang of LANGS) {
    if (!q[lang]?.q) errs.push(`${q.id}: saknar ${lang}.q`);
    if (q[lang]?.o?.length !== 4) errs.push(`${q.id}: ${lang} har inte 4 alternativ`);
  }
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) errs.push(`${q.id}: ogiltigt correct`);
  if (!q.ref) errs.push(`${q.id}: saknar ref`);
  if (!q.why) errs.push(`${q.id}: saknar rysk förklaring (why)`);
  if (!why.sv[q.id]) errs.push(`${q.id}: saknar svensk förklaring i data/why-sv.json`);
  if (!why.en[q.id]) errs.push(`${q.id}: saknar engelsk förklaring i data/why-en.json`);
  if (!why.ar[q.id]) errs.push(`${q.id}: saknar arabisk förklaring i data/why-ar.json`);
  q.whySv = why.sv[q.id];
  q.whyEn = why.en[q.id];
  q.whyAr = why.ar[q.id];
}
for (const [name, dict] of Object.entries(why)) {
  for (const id of Object.keys(dict)) {
    if (!ids.has(id)) errs.push(`why-${name}.json: ${id} finns inte i frågebanken`);
  }
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/questions.json', JSON.stringify(all));
const byCh = {}; for (const q of all) byCh[q.ch] = (byCh[q.ch] || 0) + 1;
const byKind = {}; for (const q of all) byKind[q.kind] = (byKind[q.kind] || 0) + 1;
console.log(`OK: ${all.length} frågor, alla med förklaring på svenska, ryska, engelska och arabiska`);
console.log('per kapitel:', JSON.stringify(byCh));
console.log('per typ:', JSON.stringify(byKind));
