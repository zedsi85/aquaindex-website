/* ============================================================
   AquaIndex marketing site — behaviour & generated visuals.
   Vanilla port of the design-system handoff (icons, SVG charts,
   interactive platform stack, team roster, scroll-reveal motion,
   drifting live benchmark values). All motion is gated on
   prefers-reduced-motion and on document visibility.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     Icons — Lucide-style, 24px grid, stroke currentColor.
     --------------------------------------------------------- */
  var ICON_PATHS = {
    Grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    Registry: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    Issue: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    Redeem: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M5 21h14"/>',
    Shield: '<path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    Wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1"/>',
    Chart: '<path d="M4 19V5M4 19h16"/><path d="M8 16l3-4 3 2 4-6"/>',
    Droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
    Arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    Check: '<path d="M5 12l5 5L20 7"/>',
    Lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    Globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
    Activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>'
  };

  function icon(name, size, sw) {
    var inner = ICON_PATHS[name] || '';
    var s = size || 20, w = sw || 1.75;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  var LINKEDIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.4h4V21H3zM9.5 9.4h3.8v1.6h.06c.53-.95 1.83-1.95 3.76-1.95 4.02 0 4.76 2.6 4.76 5.97V21h-4v-5.3c0-1.27-.02-2.9-1.8-2.9-1.8 0-2.08 1.38-2.08 2.8V21h-4z"></path></svg>';

  function fillIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      var name = el.getAttribute('data-icon');
      var size = parseFloat(el.getAttribute('data-size')) || 20;
      if (name === 'LinkedIn') { el.innerHTML = LINKEDIN; return; }
      el.innerHTML = icon(name, size, parseFloat(el.getAttribute('data-sw')) || 1.75);
    });
  }

  /* ---------------------------------------------------------
     Charts — pure SVG, token-driven (window.AqxViz parity).
     --------------------------------------------------------- */
  function indexChart(opts) {
    opts = opts || {};
    var pts = opts.data || [186,190,188,195,201,199,208,205,214,219,222,231,236,233,242,251,248,259];
    var h = opts.height || 200, w = 720, pad = 10, id = opts.id || 'idx';
    var stroke = opts.stroke || 'var(--navy-700)';
    var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    var x = function (i) { return pad + (i * (w - pad * 2)) / (pts.length - 1); };
    var y = function (v) { return pad + (h - pad * 2) * (1 - (v - min) / (max - min || 1)); };
    var line = pts.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    var area = line + ' L' + x(pts.length - 1) + ' ' + (h - pad) + ' L' + x(0) + ' ' + (h - pad) + ' Z';
    var grid = [0.2, 0.4, 0.6, 0.8].map(function (g) {
      var gy = pad + (h - pad * 2) * g;
      return '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + gy + '" y2="' + gy + '" stroke="var(--viz-grid)" stroke-width="1"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" style="display:block">' +
      '<defs><linearGradient id="' + id + 'fill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--aqua-500)" stop-opacity="0.20"/>' +
      '<stop offset="100%" stop-color="var(--aqua-500)" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + id + 'fill)"/>' +
      '<path d="' + line + '" fill="none" stroke="' + stroke + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="aqx-draw"/>' +
      '<circle cx="' + x(pts.length - 1) + '" cy="' + y(pts[pts.length - 1]) + '" r="4.5" fill="var(--aqua-500)" stroke="#fff" stroke-width="2" class="aqx-mark"/>' +
      '</svg>';
  }

  function heroWaves() {
    var W = 1440, H = 360, N = 96;
    function sinePath(amp, yBase, phase, periods, close) {
      var d = '';
      for (var i = 0; i <= N; i++) {
        var x = (i / N) * W;
        var y = yBase + amp * Math.sin(phase + (i / N) * Math.PI * 2 * periods);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return close ? d + 'L' + W + ' ' + H + 'L0 ' + H + 'Z' : d;
    }
    var crest = { amp: 30, yb: 178, ph: 1.2, per: 2 };
    var dots = [];
    for (var j = 0; j < 9; j++) {
      var dx = (j / 9) * W + 60;
      var dy = crest.yb + crest.amp * Math.sin(crest.ph + (dx / W) * Math.PI * 2 * crest.per);
      dots.push([dx, dy]);
    }
    var fills = [
      { id: 'wvA', d: sinePath(24, 128, 0.4, 3, true),  c: '#1E5C8C', o: 0.26, dur: '76s', dir: 'normal',  bob: '17s' },
      { id: 'wvB', d: sinePath(32, 176, 2.1, 2, true),  c: '#00B0D0', o: 0.11, dur: '54s', dir: 'reverse', bob: '13s' },
      { id: 'wvC', d: sinePath(38, 238, 4.0, 3, true),  c: '#04162E', o: 0.62, dur: '40s', dir: 'normal',  bob: '10s' }
    ];
    var html = fills.map(function (l) {
      var stop2 = l.id === 'wvC' ? l.o * 0.5 : 0;
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="aqx-wavebob" style="animation-duration:' + l.bob + '">' +
        '<defs><linearGradient id="' + l.id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + l.c + '" stop-opacity="' + l.o + '"/>' +
        '<stop offset="100%" stop-color="' + l.c + '" stop-opacity="' + stop2 + '"/></linearGradient></defs>' +
        '<g class="aqx-wave" style="animation-duration:' + l.dur + ';animation-direction:' + l.dir + '">' +
        '<path d="' + l.d + '" fill="url(#' + l.id + ')"/>' +
        '<path d="' + l.d + '" fill="url(#' + l.id + ')" transform="translate(' + W + ' 0)"/></g></svg>';
    }).join('');
    var crestLine = sinePath(crest.amp, crest.yb, crest.ph, crest.per, false);
    var dotsSvg = dots.map(function (p) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.4" fill="#7FD8E8" opacity="0.5"/>';
    }).join('');
    var crestGroup = [0, W].map(function (off) {
      return '<g transform="translate(' + off + ' 0)">' +
        '<path d="' + crestLine + '" fill="none" stroke="var(--aqua-400)" stroke-width="1.5" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.38"/>' +
        dotsSvg + '</g>';
    }).join('');
    html += '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="aqx-wavebob" style="animation-duration:15s">' +
      '<g class="aqx-wave" style="animation-duration:64s;animation-direction:reverse">' + crestGroup + '</g></svg>';
    return html;
  }

  function regionalBars(opts) {
    opts = opts || {};
    var rows = opts.data || [
      { r: 'MENA', v: 0.92 }, { r: 'US West', v: 0.74 }, { r: 'EU', v: 0.58 },
      { r: 'LATAM', v: 0.41 }, { r: 'Canada', v: 0.33 }
    ];
    var max = Math.max.apply(null, rows.map(function (d) { return d.v; }));
    return '<div style="display:flex;flex-direction:column;gap:12px">' + rows.map(function (d, i) {
      var bg = i === 0 ? 'var(--aqua-500)' : 'var(--navy-600)';
      return '<div style="display:flex;align-items:center;gap:12px">' +
        '<span style="width:74px;font-size:var(--text-xs);color:var(--text-muted);flex:none;text-align:right;font-weight:var(--fw-medium)">' + d.r + '</span>' +
        '<div style="flex:1;height:10px;background:var(--slate-100);border-radius:var(--radius-pill);overflow:hidden">' +
        '<div class="aqx-bar" style="width:' + (d.v / max * 100) + '%;height:100%;border-radius:var(--radius-pill);background:' + bg + '"></div></div>' +
        '<span style="width:52px;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-strong);font-variant-numeric:tabular-nums">$' + d.v.toFixed(2) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function priceDiscovery() {
    var w = 320, h = 200, p = 24;
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="auto" style="display:block">' +
      '<line x1="' + p + '" y1="' + (p - 6) + '" x2="' + p + '" y2="' + (h - p) + '" stroke="var(--viz-axis)" stroke-width="1"/>' +
      '<line x1="' + p + '" y1="' + (h - p) + '" x2="' + (w - p + 6) + '" y2="' + (h - p) + '" stroke="var(--viz-axis)" stroke-width="1"/>' +
      '<path d="M' + (p + 6) + ' ' + p + ' C ' + (w * 0.4) + ' ' + (h * 0.5) + ', ' + (w * 0.6) + ' ' + (h * 0.6) + ', ' + (w - p) + ' ' + (h - p - 6) + '" fill="none" stroke="var(--navy-600)" stroke-width="2.25"/>' +
      '<path d="M' + (p + 6) + ' ' + (h - p - 6) + ' C ' + (w * 0.4) + ' ' + (h * 0.55) + ', ' + (w * 0.6) + ' ' + (h * 0.45) + ', ' + (w - p) + ' ' + p + '" fill="none" stroke="var(--aqua-500)" stroke-width="2.25"/>' +
      '<circle cx="' + (w * 0.52) + '" cy="' + (h * 0.52) + '" r="5" fill="#fff" stroke="var(--navy-700)" stroke-width="2.5"/>' +
      '<text x="' + (w * 0.52 + 10) + '" y="' + (h * 0.52 - 6) + '" font-family="var(--font-mono)" font-size="11" fill="var(--text-strong)">benchmark</text>' +
      '</svg>';
  }

  function sparkline(opts) {
    opts = opts || {};
    var pts = opts.data || [4, 6, 5, 8, 7, 10, 9, 12, 14, 13, 16];
    var w = opts.w || 96, h = opts.h || 28, stroke = opts.stroke || 'var(--aqua-500)';
    var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    var x = function (i) { return (i * w) / (pts.length - 1); };
    var y = function (v) { return h - 2 - (h - 4) * ((v - min) / (max - min || 1)); };
    var line = pts.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" style="display:block">' +
      '<path d="' + line + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------------------------------------------------------
     Data
     --------------------------------------------------------- */
  var QUOTES = [
    ['WATERFOREX™ US-W', '1.0875', '▲ 0.22%', true],
    ['AQUAFOREX™ EU', '0.5840', '▼ 0.08%', false],
    ['MENA Regional', '0.9210', '▲ 0.35%', true],
    ['LATAM Regional', '0.4130', '▲ 0.12%', true],
    ['Canada Regional', '0.3310', '▼ 0.04%', false],
    ['Physical · Spot', '2.2980', '▲ 0.18%', true]
  ];

  var LAYERS = [
    { icon: 'Chart', name: 'Pricing engine', tag: 'AQX-PRC',
      d: 'Impartial water pricing extracted from transparent global commodity markets and verified physical source data.',
      kv: [['Inputs', 'Agricultural futures · footprint · yield'], ['Cadence', 'Daily'], ['Output', 'Reference price / m³']] },
    { icon: 'Activity', name: 'Water index layer', tag: 'AQX-IDX',
      d: 'Composite and regional indexes published daily — the benchmark layer every instrument and venue references.',
      kv: [['Series', 'Composite · 5 regions'], ['Method', 'Patented'], ['Distribution', 'API · feed · terminal']] },
    { icon: 'Registry', name: 'Collateral registry', tag: 'AQX-REG',
      d: 'A permissioned registry of certified, ringfenced water reserves and the obligations secured against them.',
      kv: [['Records', 'Reserves · liens · titles'], ['Audit', 'Continuous'], ['Access', 'Permissioned']] },
    { icon: 'Shield', name: 'Asset verification', tag: 'AQX-VER',
      d: 'Quality, mineral content, and volume verification of physical sources by accredited inspectors.',
      kv: [['Checks', 'Quality · volume · title'], ['Status', 'Verified / pending'], ['Renewal', 'Periodic re-inspection']] },
    { icon: 'Issue', name: 'Tokenization layer', tag: 'AQX-TOK',
      d: 'Digital representation of verified water-backed instruments — one implementation layer within the stack.',
      kv: [['Instruments', 'WATERCOIN™ · AQUACOIN™'], ['Record', 'Transparent ownership'], ['Backing', 'Verified reserves']] },
    { icon: 'Redeem', name: 'Redemption logic', tag: 'AQX-RDM',
      d: 'Rules governing conversion of instruments back into physical delivery or settlement value.',
      kv: [['Modes', 'Physical · cash-settled'], ['Window', 'Defined per instrument'], ['Settlement', 'Scheduled']] },
    { icon: 'Globe', name: 'Marketplace connectivity', tag: 'AQX-MKT',
      d: 'Connectivity to primary venues and secondary markets for benchmark and physical water products.',
      kv: [['Venues', 'AQUA-INDEX EXCHANGE™ · AQUA EXCHANGE™'], ['Interface', 'FIX · API'], ['Liquidity', 'Market-made']] },
    { icon: 'Lock', name: 'Compliance layer', tag: 'AQX-CMP',
      d: 'Identity, reporting, and regulatory controls applied across issuance, trading, and redemption.',
      kv: [['Controls', 'KYC · AML · surveillance'], ['Reporting', 'Regulator-ready'], ['Jurisdictions', 'Multi']] },
    { icon: 'Grid', name: 'Reporting dashboard', tag: 'AQX-RPT',
      d: 'Institutional reporting across positions, reserves, index performance, and audit trails.',
      kv: [['Views', 'Positions · reserves · audit'], ['Export', 'CSV · PDF'], ['Cadence', 'Real-time']] }
  ];

  var TEAM = [
    { n: 'Yaacov Shirazi', mono: 'YS', role: 'Founder, Chairman & CEO', featured: true,
      bio: 'Developer of the AquaIndex method and the patented intellectual property for trading water as a commodity. Decades of experience financing and trading commodities across the agricultural and energy sectors, with several years in high-tech ventures.',
      tags: ['Water markets', 'Commodities', 'Intellectual property'] },
    { n: 'Robert Gaffney', mono: 'RG', role: 'AquaIndex Exchange CEO',
      bio: 'Senior executive across derivatives and prime brokerage — former COO & Managing Director of UBS Securities Prime Brokerage Services and COO of ABN AMRO Global Futures.',
      tags: ['Derivatives', 'Exchange operations'] },
    { n: 'Don Horwitz', mono: 'DH', role: 'AquaIndex Exchange CRO',
      bio: 'General counsel and chief regulatory officer across derivatives exchanges, including the North American Derivatives Exchange and OneChicago; Managing Director at Oyster Consulting.',
      tags: ['Legal', 'Compliance'] },
    { n: 'Elon Bezalely', mono: 'EB', role: 'Chief Research & Operations Officer',
      bio: 'Thirty years across derivatives and trading systems — former hedge-fund quant trader and Head of Options at the First International Bank of Israel. M.A. in Mathematics, Cambridge.',
      tags: ['Quantitative research', 'Trading systems'] },
    { n: 'Ronald Filler', mono: 'RF', role: 'Exchange Public Director',
      bio: 'Professor of Law and Director of the Financial Services Law Institute at New York Law School; Public Director of the NFA; former Managing Director at Lehman Brothers.',
      tags: ['Regulation', 'Futures law'] },
    { n: 'Linda Allen', mono: 'LA', role: 'Special Adviser & Risk Consultant',
      bio: 'William F. Aldinger Chair in Banking and Finance at Baruch College, CUNY. Author of leading texts on credit, market, and operational risk; co-editor of the Journal of Credit Risk.',
      tags: ['Risk', 'Banking & finance'] },
    { n: 'Paul Peterson', mono: 'PP', role: 'Economics & Business Consultant',
      bio: 'Professor at the University of Illinois; 23 years as Director of Commodity Research & Product Development at the Chicago Mercantile Exchange. Ph.D. in Agricultural Economics.',
      tags: ['Commodity research', 'Market design'] },
    { n: 'Sanjeev Dutta', mono: 'SD', role: 'Senior Advisor, MENA & APAC',
      bio: '30+ years in commodities, financial services, and bilateral trade — former Executive Director for Commodities & Financial Services at DMCC and CEO of the UAE-India Business Council.',
      tags: ['Global trade', 'Governance'] },
    { n: 'James Bernard', mono: 'JB', role: 'Senior Advisor, Tokenomics & Trading',
      bio: 'Founding member of the Dubai Global Blockchain Council and former Director at DMCC Free Zone; two decades building commodity and digital-asset ecosystems.',
      tags: ['Digital assets', 'Ecosystems'] }
  ];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------------------------------------------------------
     Builders for generated sections
     --------------------------------------------------------- */
  function buildTickerBelt(el) {
    var belt = QUOTES.concat(QUOTES);
    el.innerHTML = belt.map(function (q) {
      return '<span class="ws-ticker__item">' +
        '<span class="ws-ticker__sym">' + esc(q[0]) + '</span>' +
        '<span class="ws-ticker__num">' + esc(q[1]) + '</span>' +
        '<i class="' + (q[3] ? 'up' : 'dn') + '">' + esc(q[2]) + '</i></span>';
    }).join('');
  }

  function badge(text, variant, mono, style) {
    var cls = 'aqx-badge aqx-badge--' + (variant || 'neutral') + (mono ? ' aqx-badge--mono' : '');
    return '<span class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '>' + esc(text) + '</span>';
  }

  function buildTeam(root) {
    var feat = TEAM[0];
    var rest = TEAM.slice(1);
    var featTags = feat.tags.map(function (t) { return badge(t, 'neutral'); }).join('');
    var featEl = root.querySelector('.ws-team__feat');
    featEl.innerHTML =
      '<div class="ws-team__feathd">' +
        '<div class="ws-team__pt ws-team__pt--lg" aria-hidden="true"><span>' + esc(feat.mono) + '</span></div>' +
        '<div><h3>' + esc(feat.n) + '</h3>' +
          '<div class="ws-team__role">' + esc(feat.role) + '</div>' +
          '<div class="ws-team__tags">' + featTags + '</div></div>' +
        '<a class="aqx-btn aqx-btn--onDeep aqx-btn--md aqx-iconbtn" href="#" aria-label="' + esc(feat.n) + ' on LinkedIn" title="' + esc(feat.n) + ' on LinkedIn">' + LINKEDIN + '</a>' +
      '</div>' +
      '<p class="ws-team__bio">' + esc(feat.bio) + '</p>';

    var grid = root.querySelector('.ws-team__grid');
    grid.innerHTML = rest.map(function (m) {
      var tags = m.tags.map(function (t) { return badge(t, 'neutral'); }).join('');
      return '<div class="ws-team__card">' +
        '<div class="ws-team__cardhd">' +
          '<div class="ws-team__pt" aria-hidden="true"><span>' + esc(m.mono) + '</span></div>' +
          '<a class="aqx-btn aqx-btn--ghost aqx-btn--sm aqx-iconbtn" href="#" aria-label="' + esc(m.n) + ' on LinkedIn" title="' + esc(m.n) + ' on LinkedIn">' +
            LINKEDIN.replace('width="16" height="16"', 'width="15" height="15"') + '</a>' +
        '</div>' +
        '<h3>' + esc(m.n) + '</h3>' +
        '<div class="ws-team__role">' + esc(m.role) + '</div>' +
        '<p class="ws-team__bio">' + esc(m.bio) + '</p>' +
        '<div class="ws-team__tags">' + tags + '</div></div>';
    }).join('');
  }

  /* ---------------------------------------------------------
     Interactive platform stack
     --------------------------------------------------------- */
  function initPlatform(root, reduced) {
    var listEl = root.querySelector('.ws-plat__list');
    var pathEl = root.querySelector('.ws-plat__path');
    var bodyEl = root.querySelector('.ws-plat__body');
    if (!listEl || !bodyEl) return;

    listEl.innerHTML = LAYERS.map(function (l, i) {
      return '<button role="tab" aria-selected="' + (i === 0) + '" class="ws-plat__row' + (i === 0 ? ' is-active' : '') + '" data-i="' + i + '">' +
        '<span class="ws-plat__ic">' + icon(l.icon, 18) + '</span>' +
        '<span class="ws-plat__name">' + esc(l.name) + '</span>' +
        '<span class="ws-plat__tag">' + esc(l.tag) + '</span></button>';
    }).join('');

    var rows = Array.prototype.slice.call(listEl.querySelectorAll('.ws-plat__row'));
    var active = 0, touched = false, timer = null;

    function render(i) {
      active = i;
      var L = LAYERS[i];
      rows.forEach(function (r, j) {
        r.classList.toggle('is-active', j === i);
        r.setAttribute('aria-selected', j === i);
      });
      if (pathEl) pathEl.textContent = 'aquaindex / platform / ' + L.tag.toLowerCase();
      var kv = L.kv.map(function (p) {
        return '<div class="ws-plat__kvr"><span>' + esc(p[0]) + '</span><strong>' + esc(p[1]) + '</strong></div>';
      }).join('');
      bodyEl.className = 'ws-plat__body';
      bodyEl.innerHTML =
        '<div class="ws-plat__bhd">' +
          '<span class="ws-plat__bic">' + icon(L.icon, 26) + '</span>' +
          '<div><div class="ws-plat__bt">' + esc(L.name) + '</div>' +
            badge(L.tag, 'outline', true, 'color:#cfe0f0') + '</div>' +
        '</div>' +
        '<p class="ws-plat__desc">' + esc(L.d) + '</p>' +
        '<div class="ws-plat__kv">' + kv + '</div>';
      // trigger entrance transition (setTimeout, capture/hidden safe)
      setTimeout(function () { bodyEl.classList.add('is-shown'); }, 30);
    }

    function startCycle() {
      if (touched || reduced) return;
      timer = setInterval(function () { render((active + 1) % LAYERS.length); }, 3400);
    }

    rows.forEach(function (r) {
      r.addEventListener('click', function () {
        touched = true;
        if (timer) { clearInterval(timer); timer = null; }
        render(parseInt(r.getAttribute('data-i'), 10));
      });
    });

    render(0);
    startCycle();
  }

  /* ---------------------------------------------------------
     Live drifting benchmark value
     --------------------------------------------------------- */
  function initLiveValues(reduced) {
    document.querySelectorAll('[data-live]').forEach(function (el) {
      var base = parseFloat(el.getAttribute('data-base')) || 2.3450;
      var dp = parseInt(el.getAttribute('data-dp'), 10);
      if (isNaN(dp)) dp = 4;
      var step = parseFloat(el.getAttribute('data-step')) || 0.0024;
      var interval = parseInt(el.getAttribute('data-interval'), 10) || 2200;
      var v = base;
      el.textContent = v.toFixed(dp);
      if (reduced) return;
      setInterval(function () {
        var next = v + (Math.random() - 0.47) * step;
        v = Math.min(base * 1.012, Math.max(base * 0.99, next));
        el.textContent = v.toFixed(dp);
      }, interval);
    });
  }

  /* ---------------------------------------------------------
     Scroll-reveal (IntersectionObserver) with sibling stagger
     --------------------------------------------------------- */
  var REVEAL_SELECTOR = [
    '.ws-sec__head', '.ws-value', '.ws-product', '.ws-fact', '.ws-panel',
    '.ws-stack__row', '.ws-card', '.ws-method > div:first-child', '.ws-collat > div:first-child',
    '.ws-tok__card', '.ws-impact__col', '.ws-recog', '.ws-cta__box',
    '.ws-plat__row', '.ws-plat__console', '.ws-team__feat', '.ws-team__card'
  ].join(',');

  function initReveal(root, reduced) {
    if (document.hidden || reduced || !('IntersectionObserver' in window)) {
      root.classList.add('no-anim', 'is-mounted');
      var onVis = function () {
        if (!document.hidden) {
          root.classList.remove('no-anim');
          document.removeEventListener('visibilitychange', onVis);
        }
      };
      document.addEventListener('visibilitychange', onVis);
      return;
    }
    setTimeout(function () { root.classList.add('is-mounted'); }, 60);
    var els = Array.prototype.slice.call(root.querySelectorAll(REVEAL_SELECTOR));
    var set = new Set(els);
    els.forEach(function (el) {
      var i = 0, n = el.previousElementSibling;
      while (n) { if (set.has(n)) i += 1; n = n.previousElementSibling; }
      el.style.setProperty('--rv-d', Math.min(i * 80, 420) + 'ms');
      el.classList.add('rv');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -56px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    var root = document.querySelector('.ws');
    if (!root) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Charts into their placeholders
    document.querySelectorAll('[data-chart]').forEach(function (el) {
      var type = el.getAttribute('data-chart');
      if (type === 'indexChart') {
        el.innerHTML = indexChart({ id: el.getAttribute('data-id') || 'idx', height: parseFloat(el.getAttribute('data-height')) || 150 });
      } else if (type === 'heroWaves') {
        el.innerHTML = heroWaves();
      } else if (type === 'regionalBars') {
        el.innerHTML = regionalBars();
      } else if (type === 'priceDiscovery') {
        el.innerHTML = priceDiscovery();
      } else if (type === 'sparkline') {
        el.innerHTML = sparkline();
      }
    });

    var ticker = document.querySelector('.ws-ticker__belt');
    if (ticker) buildTickerBelt(ticker);

    buildTeam(root);
    initPlatform(root, reduced);
    fillIcons(document);
    initLiveValues(reduced);
    initReveal(root, reduced);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
