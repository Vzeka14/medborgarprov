#!/usr/bin/env node
// Bygger frågebanken för VARJE prov som har en datamapp under data/.
// Ingen hårdkodad lista av prov-id:n — id:t är bara namnet på mappen,
// så det här skriptet behöver inte ändras när ett prov till tillkommer.
//
// Körning: node scripts/build-bank-all.mjs
// (se npm run bank:all i package.json)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBank } from './build-bank.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const dataRoot = path.join(repoRoot, 'data')

const ids = fs.readdirSync(dataRoot, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort()

if (ids.length === 0) {
  console.error(`Ingen provmapp hittad under ${path.relative(repoRoot, dataRoot)}`)
  process.exit(1)
}

let failed = false
for (const id of ids) {
  try {
    const r = await buildBank(id)
    console.log(`OK ${r.id}: ${r.count} frågor, alla med förklaring på ${r.requiredLangs.join(', ')}`)
  } catch (err) {
    failed = true
    console.error(`FEL ${id}:`)
    console.error(err.message)
  }
}
if (failed) process.exit(1)
