/* ============================================================
   Contact form.

   POST /api/contact   { name, email, company?, message }
     → emails the enquiry to the AquaIndex inbox (reply-to set to
       the visitor), after recording it in the AqxContact table.

   Public and unauthenticated, so it is defended: a hidden
   "website" field that only bots fill in, strict length limits,
   a fixed recipient (it cannot be used to mail anyone else) and
   per-sender / daily rate limits.
   ============================================================ */
'use strict';

const { app } = require('@azure/functions');
const { json, fail, guard, readBody } = require('../lib/http');
const contact = require('../lib/contact');

app.http('contact-send', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contact',
  handler: guard(async (request, context) => {
    const body = await readBody(request);
    if (!body) return fail(400, 'Expected a JSON body.');

    // Honeypot: real visitors never see this field. Answer as if it worked.
    if (body.website) return json(200, { ok: true });

    const parsed = contact.parseEnquiry(body);
    if (parsed.error) return json(400, { error: parsed.error, field: parsed.field });

    const config = contact.mailConfig();
    if (!config) return fail(503, 'The contact form is not set up yet.');

    const now = new Date();
    const sender = contact.senderKey(request);
    const refusal = await contact.rateLimit(sender, now);
    if (refusal) return fail(429, refusal);

    const id = await contact.record(parsed.fields, sender, now);
    try {
      const status = await contact.send(config, parsed.fields);
      await contact.mark(id, status);
    } catch (err) {
      context.error('contact email failed', err);
      await contact.mark(id, 'failed', err.message).catch(() => {});
      return fail(502, 'Your message could not be sent just now.');
    }
    return json(200, { ok: true });
  })
});
