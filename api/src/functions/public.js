/* ============================================================
   Public read API — what the website draws its charts from.

   GET /api/assets                    assets with summary stats
   GET /api/assets/{symbol}/prices    one asset's price history
                                      (?from=YYYY-MM-DD&to=YYYY-MM-DD)
   ============================================================ */
'use strict';

const { app } = require('@azure/functions');
const store = require('../lib/store');
const { json, fail, guard, parseSymbol, parseDate } = require('../lib/http');

const PUBLIC_CACHE = { 'Cache-Control': 'public, max-age=60' };

app.http('assets-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets',
  handler: guard(async () => json(200, { assets: await store.listAssets() }, PUBLIC_CACHE))
});

app.http('prices-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets/{symbol}/prices',
  handler: guard(async (request) => {
    const symbol = parseSymbol(request.params.symbol);
    if (!symbol) return fail(400, 'Invalid asset symbol.');

    const rawFrom = request.query.get('from');
    const rawTo = request.query.get('to');
    const from = rawFrom ? parseDate(rawFrom) : null;
    const to = rawTo ? parseDate(rawTo) : null;
    if ((rawFrom && !from) || (rawTo && !to)) return fail(400, 'from / to must be YYYY-MM-DD dates.');

    const asset = await store.getAsset(symbol);
    if (!asset) return fail(404, 'Unknown asset ' + symbol + '.');

    const points = await store.listPrices(symbol, from, to);
    return json(200, { asset, points }, PUBLIC_CACHE);
  })
});
