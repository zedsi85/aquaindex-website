/* ============================================================
   Loads an Excel workbook of price histories straight into the
   price store — the command-line twin of the "Update from Excel"
   upload on the admin page (same reader, same rules: one asset
   per sheet, dates in column A, prices in column B).

     TABLES_CONNECTION_STRING="..." node scripts/import-xlsx.js <file.xlsx> [--csv]

   Each asset's history is replaced by the sheet's contents.
   --csv also rewrites public/data/aquaindex-global.csv (the
   site's offline fallback) from the first sheet.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const store = require('../src/lib/store');
const workbooks = require('../../public/admin/xlsx-prices.js');

const CSV = path.join(__dirname, '..', '..', 'public', 'data', 'aquaindex-global.csv');

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('Usage: node scripts/import-xlsx.js <file.xlsx> [--csv]');

  const workbook = await workbooks.read(fs.readFileSync(file));
  for (const s of workbook.sheets) {
    if (s.problem) console.log('Skipping sheet "' + s.sheet + '": ' + s.problem);
  }
  const plan = workbooks.plan(workbook, await store.listAssets());
  if (!plan.length) throw new Error('No sheet in this workbook has dates in column A and prices in column B.');

  for (const item of plan) {
    await store.saveAsset(item.symbol, item.fields);
    const asset = await store.savePrices(item.symbol, item.points, true);
    console.log((item.isNew ? 'Created ' : 'Updated ') + asset.symbol + ' (tab "' + asset.label + '"): ' +
      asset.points + ' prices, ' + asset.firstDate + ' → ' + asset.lastDate + ', latest ' + asset.lastValue);
  }

  if (args.includes('--csv')) {
    const first = plan[0];
    fs.writeFileSync(CSV, 'date,value\n' + first.points.map((p) => p[0] + ',' + p[1]).join('\n') + '\n');
    console.log('Wrote ' + first.points.length + ' ' + first.symbol + ' rows to ' + path.relative(process.cwd(), CSV));
  }
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
