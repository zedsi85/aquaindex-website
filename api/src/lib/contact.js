/* ============================================================
   Website form — WaterToken prelaunch registrations (name, email,
   organization): validation, a record of each one, and delivery
   by email (Azure Communication Services). A free-text message
   is optional; when one is sent it is delivered as an enquiry.

   App settings
     ACS_CONNECTION_STRING   Communication Services connection string
     CONTACT_FROM            verified sender, e.g. DoNotReply@<id>.azurecomm.net
     CONTACT_TO              recipient (default info@aqua-index.com)
     TABLES_CONNECTION_STRING  (shared with the price store)

   Every submission is written to the AqxContact table before it
   is emailed, so a registration is never lost if delivery fails.
   The same table backs the rate limits.
   ============================================================ */
'use strict';

const crypto = require('crypto');
const { TableClient, odata } = require('@azure/data-tables');
const { EmailClient } = require('@azure/communication-email');
const { NotConfiguredError } = require('./store');

const TABLE = 'AqxContact';
const PK = 'msg';
const DEFAULT_TO = 'info@aqua-index.com';
const PER_SENDER_PER_HOUR = 5;   // per network address
const TOTAL_PER_DAY = 200;       // across everyone
const SEND_WAIT_MS = 20000;

const LIMITS = { name: 100, email: 254, company: 120, messageMax: 5000 };
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

function mailConfig() {
  const conn = process.env.ACS_CONNECTION_STRING;
  const from = process.env.CONTACT_FROM;
  if (!conn || !from) return null;
  return { conn, from, to: process.env.CONTACT_TO || DEFAULT_TO };
}

let ready = null;
function table() {
  if (!ready) {
    const conn = process.env.TABLES_CONNECTION_STRING;
    if (!conn) return Promise.reject(new NotConfiguredError());
    const opts = { allowInsecureConnection: /UseDevelopmentStorage=true|127\.0\.0\.1|localhost/i.test(conn) };
    const client = TableClient.fromConnectionString(conn, TABLE, opts);
    ready = client.createTable().then(() => client).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const oneLine = (v, max) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max + 1);

/* Returns { fields } or { error, field }. */
function parseEnquiry(body) {
  const name = oneLine(body.name, LIMITS.name);
  const email = oneLine(body.email, LIMITS.email);
  const company = oneLine(body.company, LIMITS.company);
  const message = String(body.message == null ? '' : body.message).replace(/\r\n?/g, '\n').trim();

  if (!name) return { field: 'name', error: 'Please enter your name.' };
  if (name.length > LIMITS.name) return { field: 'name', error: 'That name is too long.' };
  if (!email) return { field: 'email', error: 'Please enter your email address.' };
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) return { field: 'email', error: 'That email address does not look right.' };
  if (company.length > LIMITS.company) return { field: 'company', error: 'That organization name is too long.' };
  if (message.length > LIMITS.messageMax) return { field: 'message', error: 'Please keep the message under ' + LIMITS.messageMax + ' characters.' };
  return { fields: { name, email, company, message } };
}

/* The caller's address, hashed — enough to rate-limit without keeping the address itself. */
function senderKey(request) {
  let ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, '');   // IPv4:port
  else { const m = /^\[([^\]]+)\](?::\d+)?$/.exec(ip); if (m) ip = m[1]; }  // [IPv6]:port
  const secret = process.env.TABLES_CONNECTION_STRING || '';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex').slice(0, 24);
}

/* Returns a refusal message, or null when the message may go through. */
async function rateLimit(sender, now) {
  const client = await table();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const hourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();
  let total = 0, mine = 0;
  const filter = odata`PartitionKey eq ${PK} and RowKey ge ${dayAgo}`;
  for await (const e of client.listEntities({ queryOptions: { filter, select: ['RowKey', 'sender'] } })) {
    total++;
    if (e.sender === sender && e.rowKey >= hourAgo) mine++;
  }
  if (mine >= PER_SENDER_PER_HOUR) return 'You have submitted this form several times in the last hour. Please try again later.';
  if (total >= TOTAL_PER_DAY) return 'The form is very busy right now. Please try again later.';
  return null;
}

async function record(fields, sender, now) {
  const client = await table();
  const rowKey = now.toISOString() + '-' + crypto.randomBytes(4).toString('hex');
  await client.createEntity({
    partitionKey: PK, rowKey,
    name: fields.name, email: fields.email, company: fields.company, message: fields.message,
    sender, status: 'received'
  });
  return rowKey;
}

async function mark(rowKey, status, detail) {
  const client = await table();
  await client.updateEntity({ partitionKey: PK, rowKey, status, detail: String(detail || '').slice(0, 500) }, 'Merge');
}

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Without a message it is a prelaunch registration; with one, an enquiry. */
function compose(fields) {
  const who = fields.name + (fields.company ? ' (' + fields.company + ')' : '');
  const enquiry = !!fields.message;
  const intro = enquiry ? '' : 'New registration of early interest in WaterToken.';
  const footer = 'Sent from the ' + (enquiry ? 'contact' : 'Join Prelaunch') + ' form on the AquaIndex website. ' +
    'Reply to this email to write to ' + fields.name + ' directly.';
  const lines = (intro ? [intro, ''] : []).concat([
    'Name: ' + fields.name,
    'Email: ' + fields.email,
    'Organization: ' + (fields.company || '—')
  ], enquiry ? ['', fields.message] : [], ['', '—', footer]);
  const row = (label, value) => '<tr><td style="padding:4px 16px 4px 0;color:#677788;white-space:nowrap;vertical-align:top">' +
    label + '</td><td style="padding:4px 0;color:#161F2B">' + value + '</td></tr>';
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#161F2B">' +
    (intro ? '<p style="margin:0 0 12px">' + intro + '</p>' : '') +
    '<table style="border-collapse:collapse;margin-bottom:16px">' +
    row('Name', escHtml(fields.name)) +
    row('Email', '<a href="mailto:' + escHtml(fields.email) + '">' + escHtml(fields.email) + '</a>') +
    row('Organization', escHtml(fields.company || '—')) +
    '</table>' +
    (enquiry ? '<div style="white-space:pre-wrap;border-left:3px solid #00B0D0;padding:4px 0 4px 14px">' + escHtml(fields.message) + '</div>' : '') +
    '<p style="color:#677788;font-size:12px;margin-top:20px">' + escHtml(footer) + '</p></div>';
  const subject = (enquiry ? 'Website enquiry from ' : 'WaterToken prelaunch registration: ') + who;
  return { subject, plainText: lines.join('\n'), html };
}

/* Resolves to 'sent' or 'queued' (accepted, outcome not known yet); rejects if the send fails. */
async function send(config, fields) {
  const client = new EmailClient(config.conn);
  const poller = await client.beginSend({
    senderAddress: config.from,
    content: compose(fields),
    recipients: { to: [{ address: config.to }] },
    replyTo: [{ address: fields.email, displayName: fields.name }]
  });
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), SEND_WAIT_MS); });
  const result = await Promise.race([poller.pollUntilDone(), timeout]);
  clearTimeout(timer);
  if (!result) return 'queued';
  if (result.status !== 'Succeeded') throw new Error((result.error && result.error.message) || 'Email delivery ' + result.status);
  return 'sent';
}

module.exports = { mailConfig, parseEnquiry, senderKey, rateLimit, record, mark, send, compose };
