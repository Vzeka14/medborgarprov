import fs from 'fs';
const files = fs.readdirSync('data').filter(f => /^questions-.*\.json$/.test(f)).sort();
let all = [];
for (const f of files) all = all.concat(JSON.parse(fs.readFileSync(`data/${f}`, 'utf8')));

const whySv = JSON.parse(fs.readFileSync('data/why-sv.json', 'utf8'));

const errs = [];
const ids = new Set();
for (const q of all) {
  if (ids.has(q.id)) errs.push(`dubblett id: ${q.id}`);
  ids.add(q.id);
  for (const lang of ['sv','ru']) {
    if (!q[lang]?.q) errs.push(`${q.id}: saknar ${lang}.q`);
    if (q[lang]?.o?.length !== 4) errs.push(`${q.id}: ${lang} har inte 4 alternativ`);
  }
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) errs.push(`${q.id}: ogiltigt correct`);
  if (!q.ref) errs.push(`${q.id}: saknar ref`);
  if (!q.why) errs.push(`${q.id}: saknar rysk förklaring (why)`);
  if (!whySv[q.id]) errs.push(`${q.id}: saknar svensk förklaring i data/why-sv.json`);
  q.whySv = whySv[q.id];
}
for (const id of Object.keys(whySv)) {
  if (!ids.has(id)) errs.push(`why-sv.json: ${id} finns inte i frågebanken`);
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/questions.json', JSON.stringify(all));
const byCh = {}; for (const q of all) byCh[q.ch] = (byCh[q.ch] || 0) + 1;
const byKind = {}; for (const q of all) byKind[q.kind] = (byKind[q.kind] || 0) + 1;
console.log(`OK: ${all.length} frågor, alla med förklaring på svenska och ryska`);
console.log('per kapitel:', JSON.stringify(byCh));
console.log('per typ:', JSON.stringify(byKind));
