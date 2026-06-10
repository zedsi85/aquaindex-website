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
index.html            Full page markup, top to bottom
assets/css/styles.css  Design tokens + base + component + site styles
assets/js/app.js       Icons, SVG charts, interactive platform stack, team
                       roster, scroll-reveal motion, live benchmark values
assets/logo/           Brand logo + mark
```

## Sections

Header + live ticker · Hero (live index panel) · Logic strip · The problem (regional price-variance
chart) · Why a market · The method (index chart + price-discovery curve) · Water as collateral ·
Financial instruments · Tokenization layer (lifecycle) · Platform (interactive 9-layer stack,
auto-cycles until touched) · Impact · Team · Global acceptance · Vision / CTA · Footer.

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
