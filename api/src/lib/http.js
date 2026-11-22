/* ============================================================
   HTTP helpers — JSON responses, input validation, and the
   admin check.

   Azure Static Web Apps authenticates the caller and passes the
   result in the x-ms-client-principal header (it strips any
   value sent by the browser). The /api/manage/* routes are also
   locked to the "admin" role in staticwebapp.config.json; the
   check here is a second line of defence.
   ============================================================ */
'use strict';

const { NotConfiguredError } = require('./store');

const ADMIN_ROLE = 'admin';
const MAX_POINTS = 20000;

function json(status, body, headers) {
  return {
    status,
    jsonBody: body,
    headers: Object.assign({ 'Cache-Control': 'no-store' }, headers)
  };
}

const fail = (status, message) => json(status, { error: message });

function principal(request) {
  const raw = request.headers.get('x-ms-client-principal');
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch (err) {
    return null;
  }
}

/* Returns an error response, or null when the caller is an admin. */
function denyUnlessAdmin(request) {
  const p = principal(request);
  if (!p) return fail(401, 'Sign in required.');
  if (!Array.isArray(p.userRoles) || p.userRoles.indexOf(ADMIN_ROLE) === -1) {
    return fail(403, 'This account does not have the admin role.');
  }
  return null;
}

/* Wraps a handler so storage and unexpected errors become clean JSON. */
function guard(handler) {
  return async function (request, context) {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof NotConfiguredError) return fail(503, err.message);
      context.error(err);
      return fail(500, 'Unexpected server error.');
    }
  };
}

function admin(handler) {
  return guard(async function (request, context) {
    return denyUnlessAdmin(request) || handler(request, context);
  });
}

/* ---------- validation ---------- */

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseSymbol(raw) {
  const s = String(raw || '').trim().toUpperCase();
  return SYMBOL_RE.test(s) ? s : null;
}

function parseDate(raw) {
  const s = String(raw == null ? '' : raw).trim();
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const real = d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  return real ? s : null;
}

function parseValue(raw) {
  if (raw === '' || raw == null || typeof raw === 'boolean') return null;
  const v = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(v) ? v : null;
}

/* Accepts [{date, value}] or [[date, value]]. Later entries win on a
   repeated date. Returns { points } sorted by date, or { error }. */
function parsePoints(input) {
  if (!Array.isArray(input)) return { error: 'Expected "points" to be a list.' };
  if (!input.length) return { error: 'No price points supplied.' };
  if (input.length > MAX_POINTS) return { error: 'At most ' + MAX_POINTS + ' points per request.' };
  const byDate = new Map();
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    const rawDate = Array.isArray(row) ? row[0] : row && row.date;
    const rawValue = Array.isArray(row) ? row[1] : row && row.value;
    const date = parseDate(rawDate);
    const value = parseValue(rawValue);
    if (!date) return { error: 'Row ' + (i + 1) + ': "' + rawDate + '" is not a valid YYYY-MM-DD date.' };
    if (value == null) return { error: 'Row ' + (i + 1) + ' (' + date + '): the price is not a number.' };
    byDate.set(date, value);
  }
  const points = Array.from(byDate.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { points };
}

function parseAssetFields(body) {
  const out = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name || name.length > 80) return { error: 'The name must be 1–80 characters.' };
    out.name = name;
  }
  if (body.label !== undefined) {
    const label = body.label == null ? '' : String(body.label).trim();
    if (label.length > 12) return { error: 'The tab label must be at most 12 characters.' };
    out.label = label || null; // empty → fall back to the symbol
  }
  if (body.decimals != null) {
    const d = Number(body.decimals);
    if (!Number.isInteger(d) || d < 0 || d > 8) return { error: 'Decimals must be a whole number from 0 to 8.' };
    out.decimals = d;
  }
  if (body.sort != null) {
    const s = Number(body.sort);
    if (!Number.isInteger(s) || s < -9999 || s > 9999) return { error: 'Display order must be a whole number.' };
    out.sort = s;
  }
  return { fields: out };
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  json, fail, guard, admin, principal,
  parseSymbol, parseDate, parsePoints, parseAssetFields, readBody
};
