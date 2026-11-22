/* ============================================================
   Admin write API — "admin" role only.

   PUT    /api/manage/assets/{symbol}                  create / update an asset
                                                       { name, label, decimals, sort }
   DELETE /api/manage/assets/{symbol}                  remove an asset and its prices
   POST   /api/manage/assets/{symbol}/prices           add / overwrite price points
                                                       { points: [{date, value}], replace }
   DELETE /api/manage/assets/{symbol}/prices/{date}    remove one price point

   (The prefix is "manage" because the Functions host reserves
   routes that start with "admin".)
   ============================================================ */
'use strict';

const { app } = require('@azure/functions');
const store = require('../lib/store');
const {
  json, fail, admin, parseSymbol, parseDate, parsePoints, parseAssetFields, readBody
} = require('../lib/http');

app.http('manage-asset-save', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'manage/assets/{symbol}',
  handler: admin(async (request) => {
    const symbol = parseSymbol(request.params.symbol);
    if (!symbol) return fail(400, 'The symbol must be 1–20 characters: letters, digits, dot, dash or underscore.');
    const body = await readBody(request);
    if (!body) return fail(400, 'Expected a JSON body.');
    const parsed = parseAssetFields(body);
    if (parsed.error) return fail(400, parsed.error);
    const result = await store.saveAsset(symbol, parsed.fields);
    return json(result.created ? 201 : 200, { asset: result.asset });
  })
});

app.http('manage-asset-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'manage/assets/{symbol}',
  handler: admin(async (request) => {
    const symbol = parseSymbol(request.params.symbol);
    if (!symbol) return fail(400, 'Invalid asset symbol.');
    const removed = await store.deleteAsset(symbol);
    return removed ? json(200, { deleted: symbol }) : fail(404, 'Unknown asset ' + symbol + '.');
  })
});

app.http('manage-prices-save', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manage/assets/{symbol}/prices',
  handler: admin(async (request) => {
    const symbol = parseSymbol(request.params.symbol);
    if (!symbol) return fail(400, 'Invalid asset symbol.');
    const body = await readBody(request);
    if (!body) return fail(400, 'Expected a JSON body.');
    const parsed = parsePoints(body.points);
    if (parsed.error) return fail(400, parsed.error);
    const asset = await store.savePrices(symbol, parsed.points, body.replace === true);
    if (!asset) return fail(404, 'Unknown asset ' + symbol + '. Create it first.');
    return json(200, { asset, saved: parsed.points.length });
  })
});

app.http('manage-price-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'manage/assets/{symbol}/prices/{date}',
  handler: admin(async (request) => {
    const symbol = parseSymbol(request.params.symbol);
    const date = parseDate(request.params.date);
    if (!symbol) return fail(400, 'Invalid asset symbol.');
    if (!date) return fail(400, 'Invalid date.');
    const result = await store.deletePrice(symbol, date);
    if (!result) return fail(404, 'Unknown asset ' + symbol + '.');
    if (!result.found) return fail(404, 'No price on ' + date + ' for ' + symbol + '.');
    return json(200, { asset: result.asset, deleted: date });
  })
});
