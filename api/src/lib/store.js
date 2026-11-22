/* ============================================================
   Price store — Azure Table Storage.

   AqxAssets   PartitionKey 'asset'   RowKey <SYMBOL>
               name, label (short tab label), decimals, sort +
               summary stats kept in step
               with the prices (points, firstDate, lastDate,
               lastValue, prevValue)
   AqxPrices   PartitionKey <SYMBOL>  RowKey <YYYY-MM-DD>
               value (double)

   Row keys sort lexically, so a partition scan returns a series
   already in date order.
   ============================================================ */
'use strict';

const { TableClient, odata } = require('@azure/data-tables');

const ASSETS_TABLE = 'AqxAssets';
const PRICES_TABLE = 'AqxPrices';
const ASSET_PK = 'asset';
const BATCH = 100; // Table Storage transaction limit
const PARALLEL = 6; // transactions in flight at once during a bulk write

class NotConfiguredError extends Error {
  constructor() {
    super('Price storage is not configured (TABLES_CONNECTION_STRING is missing).');
    this.code = 'NOT_CONFIGURED';
  }
}

let ready = null;

function connect() {
  const conn = process.env.TABLES_CONNECTION_STRING;
  if (!conn) throw new NotConfiguredError();
  const opts = { allowInsecureConnection: /UseDevelopmentStorage=true|127\.0\.0\.1|localhost/i.test(conn) };
  const assets = TableClient.fromConnectionString(conn, ASSETS_TABLE, opts);
  const prices = TableClient.fromConnectionString(conn, PRICES_TABLE, opts);
  return Promise.all([assets.createTable(), prices.createTable()]).then(() => ({ assets, prices }));
}

function tables() {
  if (!ready) {
    ready = connect().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const dbl = (v) => ({ type: 'Double', value: String(v) });

function toAsset(e) {
  const a = {
    symbol: e.rowKey,
    name: e.name || e.rowKey,
    label: e.label || null,
    decimals: Number.isInteger(e.decimals) ? e.decimals : 4,
    sort: Number.isInteger(e.sort) ? e.sort : 0,
    points: e.points || 0,
    firstDate: e.firstDate || null,
    lastDate: e.lastDate || null,
    lastValue: e.points ? e.lastValue : null,
    prevValue: e.points > 1 ? e.prevValue : null
  };
  return a;
}

async function listAssets() {
  const { assets } = await tables();
  const out = [];
  for await (const e of assets.listEntities({ queryOptions: { filter: odata`PartitionKey eq ${ASSET_PK}` } })) {
    out.push(toAsset(e));
  }
  out.sort((a, b) => a.sort - b.sort || a.symbol.localeCompare(b.symbol));
  return out;
}

async function getAsset(symbol) {
  const { assets } = await tables();
  try {
    return toAsset(await assets.getEntity(ASSET_PK, symbol));
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}

async function listPrices(symbol, from, to) {
  const { prices } = await tables();
  let filter = odata`PartitionKey eq ${symbol}`;
  if (from) filter += ' and ' + odata`RowKey ge ${from}`;
  if (to) filter += ' and ' + odata`RowKey le ${to}`;
  const out = [];
  for await (const e of prices.listEntities({ queryOptions: { filter, select: ['RowKey', 'value'] } })) {
    out.push([e.rowKey, e.value]);
  }
  return out;
}

/* Rewrite the asset row with stats recomputed from its prices. */
async function writeAsset(symbol, fields) {
  const { assets } = await tables();
  const series = await listPrices(symbol);
  const n = series.length;
  const entity = {
    partitionKey: ASSET_PK,
    rowKey: symbol,
    name: fields.name,
    label: fields.label || '',
    decimals: fields.decimals,
    sort: fields.sort,
    points: n
  };
  if (n) {
    entity.firstDate = series[0][0];
    entity.lastDate = series[n - 1][0];
    entity.lastValue = dbl(series[n - 1][1]);
    if (n > 1) entity.prevValue = dbl(series[n - 2][1]);
  }
  await assets.upsertEntity(entity, 'Replace');
  return getAsset(symbol);
}

async function saveAsset(symbol, fields) {
  const existing = await getAsset(symbol);
  const merged = {
    name: fields.name != null ? fields.name : (existing ? existing.name : symbol),
    label: fields.label !== undefined ? fields.label : (existing ? existing.label : null),
    decimals: fields.decimals != null ? fields.decimals : (existing ? existing.decimals : 4),
    sort: fields.sort != null ? fields.sort : (existing ? existing.sort : 0)
  };
  return { asset: await writeAsset(symbol, merged), created: !existing };
}

/* Runs Table Storage transactions (each up to BATCH actions on one partition), a few at a time. */
async function runBatches(client, actions) {
  const batches = [];
  for (let i = 0; i < actions.length; i += BATCH) batches.push(actions.slice(i, i + BATCH));
  let next = 0;
  const worker = async () => {
    while (next < batches.length) await client.submitTransaction(batches[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker));
}

async function listPriceDates(symbol) {
  const { prices } = await tables();
  const out = [];
  const filter = odata`PartitionKey eq ${symbol}`;
  for await (const e of prices.listEntities({ queryOptions: { filter, select: ['RowKey'] } })) out.push(e.rowKey);
  return out;
}

async function clearPrices(symbol) {
  const { prices } = await tables();
  const dates = await listPriceDates(symbol);
  await runBatches(prices, dates.map((d) => ['delete', { partitionKey: symbol, rowKey: d }]));
  return dates.length;
}

/* points: [[date, value], ...] — already validated, one entry per date.
   With replace, the history ends up exactly equal to `points`: the new
   values are written first and only then are dates that are no longer
   present removed, so the series is never empty part-way through. */
async function savePrices(symbol, points, replace) {
  const asset = await getAsset(symbol);
  if (!asset) return null;
  const { prices } = await tables();
  const stale = [];
  if (replace) {
    const keep = new Set(points.map((p) => p[0]));
    for (const d of await listPriceDates(symbol)) if (!keep.has(d)) stale.push(d);
  }
  await runBatches(prices, points.map(([date, value]) => (
    ['upsert', { partitionKey: symbol, rowKey: date, value: dbl(value) }, 'Replace']
  )));
  await runBatches(prices, stale.map((d) => ['delete', { partitionKey: symbol, rowKey: d }]));
  return writeAsset(symbol, asset);
}

async function deletePrice(symbol, date) {
  const asset = await getAsset(symbol);
  if (!asset) return null;
  const { prices } = await tables();
  let found = true;
  try {
    await prices.deleteEntity(symbol, date);
  } catch (err) {
    if (err.statusCode !== 404) throw err;
    found = false;
  }
  return { asset: await writeAsset(symbol, asset), found };
}

async function deleteAsset(symbol) {
  const asset = await getAsset(symbol);
  if (!asset) return false;
  const { assets } = await tables();
  await clearPrices(symbol);
  await assets.deleteEntity(ASSET_PK, symbol);
  return true;
}

module.exports = {
  NotConfiguredError,
  listAssets, getAsset, listPrices,
  saveAsset, savePrices, deletePrice, deleteAsset
};
