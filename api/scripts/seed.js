/* ============================================================
   One-off seed: loads public/data/aquaindex-global.csv into the
   price store as the AQUGSPOT asset, so the site looks the same
   the first time it reads from the API.

     TABLES_CONNECTION_STRING="..." node scripts/seed.js

   Safe to re-run: existing dates are overwritten, nothing is
   deleted.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const store = require('../src/lib/store');
const { parsePoints } = require('../src/lib/http');

const SYMBOL = 'AQUGSPOT';
const NAME = 'AQUA-INDEX™ Global';
const CSV = path.join(__dirname, '..', '..', 'public', 'data', 'aquaindex-global.csv');

async function main() {
  const rows = fs.readFileSync(CSV, 'utf8').split(/\r?\n/)
    .map((line) => line.split(','))
    .filter((p) => p.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(p[0].trim()));
  const parsed = parsePoints(rows);
  if (parsed.error) throw new Error(parsed.error);

  await store.saveAsset(SYMBOL, { name: NAME, decimals: 4, sort: 0 });
  const asset = await store.savePrices(SYMBOL, parsed.points, false);
  console.log('Seeded ' + SYMBOL + ': ' + asset.points + ' points, ' + asset.firstDate + ' → ' + asset.lastDate);
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
