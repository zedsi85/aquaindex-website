# AquaIndex — Website

Institutional marketing site positioning **AquaIndex as the market infrastructure for water as a
global asset class** — pricing, indexes, collateralization, and financial instruments. Tokenization
is presented as one implementation layer, not the whole story.

Implemented from the AquaIndex Design System handoff (`ui_kits/website/index.html`) as a
self-contained **static site** — no build step, no runtime framework. Deploy by serving the repo
root on any static host.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Use a server rather than opening `index.html` directly so the stylesheet, script, and logo assets
resolve correctly.)

## Structure

```
index.html               Full page markup, top to bottom
assets/css/styles.css    Design tokens + base + component + site styles
assets/js/config.js      Site configuration — contact link, price-feed
                         provider + API key (edit this file only)
assets/js/app.js         Icons, SVG charts, futures ticker + live-price
                         adapters, interactive platform stack, team roster,
                         scroll-reveal motion
assets/logo/             Brand logo + mark
data/aquaindex-global.csv  AquaIndex Global index history (Bloomberg
                         AQUGSPOT). Replace with real history — format:
                         date,value with YYYY-MM-DD dates. The ticker
                         value, hero panel, chart, and recent-prints table
                         all read from this file.
```

## Sections

Frozen header + futures ticker · Hero (AQUGSPOT index panel from CSV) · Logic strip · Introduction ·
Why a market? · Water as collateral · Tokenization layer (lifecycle) · Platform (interactive stack,
auto-cycles until touched) · The Benchmark (Bloomberg indices) · Impact · Team · Global acceptance ·
Vision · Footer.

## Configuration (assets/js/config.js)

- `contactUrl` — where Contact / "Talk to the team" point (mailto: or URL). **Placeholder — set the
  real address.**
- `pricesProvider` + `pricesApiKey` — activate live futures prices in the ticker. Supported:
  `commoditypriceapi` (all 12 futures, one request), `apininjas` (one request per future),
  `alphavantage` (Corn/Wheat/Sugar/Coffee/Cotton only, monthly). Leave provider `null` for the
  indicative static prices.

## Motion

All motion is gated on `prefers-reduced-motion` and on document visibility: scroll-triggered reveals
with sibling stagger, index lines that draw in, regional bars that grow, the ticker marquee, drifting
live benchmark values, and the liquidity-flow dashes in the platform console.

## Notes

- Benchmark values, regional prices, and figures are **indicative placeholders** drawn from the brief
  and the live site (aqua-index.com) — wire in real figures when available.
- Fonts are served from Google Fonts (Archivo, IBM Plex Sans, IBM Plex Mono). Swap for licensed
  brand fonts if required.
- Team portraits are monogram placeholders pending photography.
