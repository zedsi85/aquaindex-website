# AquaIndex — Website

Institutional marketing site positioning **AquaIndex as the market infrastructure for water as a
global asset class** — pricing, indexes, collateralization, and financial instruments. Tokenization
is presented as one implementation layer, not the whole story.

The site itself is static (no build step, no framework). A small backend lets an admin enter
**asset prices over time** — the hero chart and the top ticker are drawn from that data — and
delivers the **contact form** to the AquaIndex inbox.

Hosted on **Azure Static Web Apps** in the AquaIndex tenant (`aqua-index.com`):

| | |
|---|---|
| Site | https://www.aqua-index.com (also https://aqua-index.com) |
| Admin | https://www.aqua-index.com/admin/ |
| Azure hostname | `lively-island-0b1a6020f.5.azurestaticapps.net` — the DNS target of both domains |
| Subscription | Aquaindex Subscription |
| Resource group | `rg-aquaindex-website` |
| Static Web App | `swa-aquaindex-website` (Free plan, East US 2) |
| Storage account | `staquaindexsite` (East US 2) — tables `AqxAssets`, `AqxPrices`, `AqxContact` |
| Email | `acs-aquaindex-website` + `acs-email-aquaindex-website` (Azure Communication Services) |

The price API and its storage run in East US 2 because this subscription cannot create resources in
West Europe. The static pages are served from Azure's global edge either way.

## Structure

```
public/                    Everything that is served
  index.html               Full page markup, top to bottom
  signin.html              Admin sign-in page (shown for 401 / 403)
  staticwebapp.config.json Azure routes: who may open /admin and /api/manage
  admin/                   Price-data admin page (admin role only)
  admin/xlsx-prices.js     Excel workbook reader (also used by api/scripts/import-xlsx.js)
  assets/css/styles.css    Design tokens + base + component + site styles
  assets/js/config.js      Site configuration — contact link, price-feed
                           provider + API key, API base (edit this file only)
  assets/js/chart.js       The price chart (shared by the site and the admin)
  assets/js/app.js         Icons, hero panel + ticker, futures ticker + live-price
                           adapters, interactive platform stack, team roster,
                           scroll-reveal motion
  assets/logo/             Brand logo + mark
  data/aquaindex-global.csv  Offline fallback for the hero chart, and the
                           seed for the AQUGSPOT asset
api/                       Price API — Azure Functions (Node 22), served at /api
  src/functions/public.js  Read routes used by the website
  src/functions/manage.js  Write routes used by the admin page
  src/functions/contact.js Contact form route
  src/lib/contact.js       Enquiry validation, record, rate limits, email
  src/lib/store.js         Azure Table Storage access
  src/lib/http.js          Validation + the admin check
  scripts/import-xlsx.js   Loads an Excel workbook into the store from the command line
  scripts/seed.js          Loads the CSV above as the AQUGSPOT asset (local development)
scripts/provision-azure.sh One-time Azure setup (resources, app setting, seed, first deploy)
scripts/deploy-azure.sh    Deploys public/ + api/ to Azure
```

## Price data

An **asset** has a symbol (e.g. `AQUGSPOT`), a name, a short tab label (e.g. `AQUG`), the number of
decimals to show and a display order. Each asset has one **price per date**.

The site currently shows three assets, loaded from the Bloomberg workbook *AI Correlation Calc.xlsx*:

| Tab | Symbol | Name |
|---|---|---|
| AQUG | `AQUGSPOT` | AQUA-INDEX™ Global |
| AQUU | `AQUUSPOT` | AQUA-INDEX™ US |
| AQEA | `AQEASPOT` | AQUA-INDEX™ East Asia |

- The first asset in display order is the primary one: it feeds the top ticker and is the chart the
  hero panel opens with.
- When two or more assets have data, tabs appear above the hero chart to switch between them.
- An asset needs at least two prices before it appears on the site.
- Visitors see a change within a minute (API responses are cached for 60 seconds).
- If the API fails or is slow to answer, the hero shows `data/aquaindex-global.csv` (a snapshot of
  the AQUGSPOT history) until it does.

### Admin page — `/admin/`

Sign in with an invited Microsoft or GitHub account.

**Update from Excel** — choose the workbook, check the preview, press *Update the site*.

- Each sheet is one asset and one tab on the site; sheet order is tab order and the sheet name is
  the tab label.
- Only two columns are read: **dates in column A, prices in column B**. Rows that are not a date
  plus a number (titles, headers, blanks, `#N/A`) are skipped. Every other column is ignored and is
  not uploaded — the file is read in the browser and only the dates and prices are sent.
- The asset symbol comes from the Bloomberg header above the data in column B (`AQUGSPOT Index` →
  `AQUGSPOT`), or from the sheet name if there is none.
- By default each history is made to match the file exactly; the other option only adds and
  updates the file's dates. An asset that already exists keeps its name and decimals.

The same page also lets you create an asset by hand, add or correct a single price, paste or upload
a CSV (`date,price`, dates as `YYYY-MM-DD`), delete prices, and export a history as CSV.

**Giving someone admin access** — Azure Portal → `swa-aquaindex-website` → *Role management* →
*Invite*: pick the provider, enter their email (Microsoft) or username (GitHub), role `admin`.
Or with the CLI:

```bash
az staticwebapp users invite -g rg-aquaindex-website -n swa-aquaindex-website \
  --authentication-provider AAD --user-details someone@example.com --role admin \
  --domain lively-island-0b1a6020f.5.azurestaticapps.net --invitation-expiration-in-hours 168
```

Send them the link it prints. Remove access from the same *Role management* screen.

### API

| Route | Access | |
|---|---|---|
| `GET /api/assets` | public | Assets with latest value and point count |
| `GET /api/assets/{symbol}/prices?from=&to=` | public | One asset's history as `[[date, value], …]` |
| `PUT /api/manage/assets/{symbol}` | admin | Create / update — `{ name, label, decimals, sort }` |
| `DELETE /api/manage/assets/{symbol}` | admin | Remove an asset and all its prices |
| `POST /api/manage/assets/{symbol}/prices` | admin | `{ points: [{date, value}], replace }` — up to 20000 per request |
| `DELETE /api/manage/assets/{symbol}/prices/{date}` | admin | Remove one price |

| `POST /api/contact` | public | `{ name, email, company?, message? }` — emails the prelaunch registration |

Secrets live in the Static Web App's application settings, not in this repo:
`TABLES_CONNECTION_STRING`, `ACS_CONNECTION_STRING`, `CONTACT_FROM`, `CONTACT_TO`.

## Join Prelaunch form

The **Join Prelaunch** buttons (header, collateral section, footer) open the "Register for early
interest in WaterToken" form: name, email and an optional organization. Submitting it emails the
registration to **info@aqua-index.com** with the visitor as the reply-to, so answering is just
"Reply". The form ends with the social links and a line pointing to info@aqua-index.com for
more information.

- The recipient is the `CONTACT_TO` application setting — change it there, no redeploy needed.
- Mail is sent by Azure Communication Services from an Azure-managed address
  (`DoNotReply@<id>.azurecomm.net`). To send from an `aqua-index.com` address, add a custom domain
  to `acs-email-aquaindex-website` in the portal, verify it in DNS, link it to
  `acs-aquaindex-website`, and set `CONTACT_FROM` to the new sender.
- Every registration is also written to the `AqxContact` table with its delivery status, so nothing is
  lost if an email fails.
- Abuse limits: a hidden field that only bots fill in, 5 submissions per hour per network address,
  200 per day in total, and a fixed recipient (the form cannot be used to mail anyone else).
- If the form cannot send (or the site runs on a host without the API), it says so and offers the
  email address from `contactUrl` in `config.js`.

The footer and the form both link to LinkedIn, X, Instagram, Facebook and YouTube; the links are
listed twice in `public/index.html` (footer and form) — edit both.

## Deploy

```bash
az login --tenant aqua-index.com   # the tenant requires MFA for changes
./scripts/deploy-azure.sh          # needs Azure CLI and Node.js 22+
```

The first time, run `./scripts/provision-azure.sh` instead: it creates the resource group, storage
account, Static Web App and email service, stores the settings, seeds a brand-new store with the
AQUGSPOT history and deploys. Both scripts target the subscription named "Aquaindex Subscription";
set `AZURE_SUBSCRIPTION` to use another.

The domain's DNS is at Cloudflare: `aqua-index.com` and `www` are CNAMEs to the Azure hostname,
set to "DNS only" so Azure issues and renews the certificates.

`vercel.json` / `netlify.toml` describe the earlier static-only deployment of `public/` (no API).
The domain no longer points there, so they and the Vercel project can be removed.

## Run locally

Site only (chart uses the CSV fallback):

```bash
python3 -m http.server 8000 --directory public
```

Site + API + admin, with Node.js 22+:

```bash
cp api/local.settings.example.json api/local.settings.json
(cd api && npm install)
npx azurite-table --location /tmp/azurite &          # local Table Storage
(cd api && npx azure-functions-core-tools@4 start) &  # API on :7071
(cd api && TABLES_CONNECTION_STRING=UseDevelopmentStorage=true npm run seed)
npx @azure/static-web-apps-cli start public --api-devserver-url http://localhost:7071
# open http://localhost:4280 — /.auth/login/aad shows a mock sign-in; add the role "admin"
```

The local emulator does not enforce the role rule on `/admin/` pages the way Azure does; the
`/api/manage/*` routes are enforced in both.

## Sections

Frozen header + futures ticker · Hero (asset price panel) · Logic strip · Introduction ·
Why a market? · Water as collateral · Tokenization layer (lifecycle) · Platform (interactive stack,
auto-cycles until touched) · The Benchmark (Bloomberg indices) · Impact · Team · Global acceptance ·
Vision · Footer (with social links) · Join Prelaunch form (dialog).

## Configuration (public/assets/js/config.js)

- `contactUrl` — fallback address for the Join Prelaunch buttons (mailto: or URL); `contactForm: false`
  skips the form and uses it directly.
- `pricesProvider` + `pricesApiKey` — live futures prices in the ticker. Supported:
  `commoditypriceapi` (all 12 futures, one request), `apininjas` (one request per future),
  `alphavantage` (Corn/Wheat/Sugar/Coffee/Cotton only, monthly). Leave provider `null` for the
  indicative static prices.
- `apiBase` — where the price API lives (`/api`).

## Motion

All motion is gated on `prefers-reduced-motion` and on document visibility: scroll-triggered reveals
with sibling stagger, index lines that draw in, the ticker marquee, and the liquidity-flow dashes in
the platform console.

## Notes

- The index histories are real (from the workbook above). The futures ticker prices and the other
  figures on the page are still **indicative placeholders**.
- Fonts are served from Google Fonts (Archivo, IBM Plex Sans, IBM Plex Mono). Swap for licensed
  brand fonts if required.
- Team portraits are monogram placeholders pending photography.
