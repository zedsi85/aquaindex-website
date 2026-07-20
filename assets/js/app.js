/* ============================================================
   AquaIndex marketing site — behaviour & generated visuals.
   - AquaIndex Global index (AQUGSPOT) loaded from data/aquaindex-global.csv
   - 12 agricultural-futures ticker with optional live prices
     (provider + key set in assets/js/config.js)
   - Interactive platform stack, team roster, scroll-reveal motion
   All motion gated on prefers-reduced-motion and document visibility.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.AQX_CONFIG || {};

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
    Activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    External: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5"/>'
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
     Charts — pure SVG, token-driven.
     --------------------------------------------------------- */
  function indexChart(opts) {
    opts = opts || {};
    var pts = opts.data || [];
    var h = opts.height || 150, w = 720, pad = 10, id = opts.id || 'idx';
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
     AquaIndex Global index — from data/aquaindex-global.csv.
     Until traded prices exist this is the AquaIndex Global
     index (Bloomberg AQUGSPOT); replace the CSV to update.
     --------------------------------------------------------- */
  var FALLBACK_SERIES = [
    ['2025-01-31', 2.1180], ['2025-02-28', 2.1240], ['2025-03-31', 2.1105],
    ['2025-04-30', 2.1420], ['2025-05-30', 2.1610], ['2025-06-30', 2.1555],
    ['2025-07-31', 2.1840], ['2025-08-29', 2.1790], ['2025-09-30', 2.2085],
    ['2025-10-31', 2.2260], ['2025-11-28', 2.2410], ['2025-12-31', 2.2725],
    ['2026-01-30', 2.2900], ['2026-02-27', 2.2810], ['2026-03-31', 2.3120],
    ['2026-04-30', 2.3390], ['2026-05-29', 2.3305], ['2026-06-30', 2.3450]
  ];

  function parseCsv(text) {
    var rows = [];
    text.split(/\r?\n/).forEach(function (line) {
      var parts = line.split(',');
      if (parts.length < 2) return;
      var v = parseFloat(parts[1]);
      if (!isNaN(v) && /\d{4}-\d{2}-\d{2}/.test(parts[0])) rows.push([parts[0].trim(), v]);
    });
    return rows;
  }

  function fmtPct(p) {
    return (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toFixed(2) + '%';
  }

  function renderIndex(rows) {
    if (!rows || rows.length < 2) rows = FALLBACK_SERIES;
    var values = rows.map(function (r) { return r[1]; });
    var last = rows[rows.length - 1], prev = rows[rows.length - 2];
    var delta = (last[1] / prev[1] - 1) * 100;

    // YTD: against the last print of the previous calendar year (or the first row).
    var lastYear = last[0].slice(0, 4);
    var ytdBase = rows[0];
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i][0].slice(0, 4) < lastYear) { ytdBase = rows[i]; break; }
    }
    var ytd = (last[1] / ytdBase[1] - 1) * 100;

    var el;
    if ((el = document.getElementById('tickerIndexVal'))) el.textContent = last[1].toFixed(4);
    if ((el = document.getElementById('tickerIndexDelta'))) {
      el.textContent = fmtPct(delta);
      el.className = delta >= 0 ? 'up' : 'dn';
    }
    if ((el = document.getElementById('heroIndexVal'))) el.textContent = last[1].toFixed(4);
    if ((el = document.getElementById('heroYtd'))) el.textContent = fmtPct(ytd).replace('▲ ', '+').replace('▼ ', '−') + ' YTD';
    if ((el = document.getElementById('heroSpark'))) el.innerHTML = sparkline({ data: values.slice(-11) });
    if ((el = document.getElementById('heroChart'))) el.innerHTML = indexChart({ data: values, id: 'hero', height: 150 });
    if ((el = document.getElementById('heroTable'))) {
      var recent = rows.slice(-5).reverse();
      el.innerHTML = '<div class="ws-hero__tblhd"><span>Date</span><span>Index</span></div>' +
        recent.map(function (r) {
          return '<div class="ws-hero__tblr"><span>' + r[0] + '</span><strong>' + r[1].toFixed(4) + '</strong></div>';
        }).join('');
    }
  }

  function loadIndex() {
    fetch('data/aquaindex-global.csv')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { renderIndex(parseCsv(t)); })
      .catch(function () { renderIndex(FALLBACK_SERIES); });
  }

  /* ---------------------------------------------------------
     Agricultural futures ticker.
     Static indicative prices; live prices replace them when a
     provider + API key are set in assets/js/config.js.
     Symbol maps may need adjusting to your API plan's list.
     --------------------------------------------------------- */
  var FUTURES = [
    { label: 'Corn',          ph: '445.50',  chg: '▲ 0.34%', up: true,  cpa: 'CORN',    ninjas: 'corn',          av: 'CORN'   },
    { label: 'Wheat',         ph: '562.25',  chg: '▼ 0.21%', up: false, cpa: 'WHEAT',   ninjas: 'wheat',         av: 'WHEAT'  },
    { label: 'Soybean',       ph: '1048.75', chg: '▲ 0.18%', up: true,  cpa: 'SOYBEAN', ninjas: 'soybean',       av: null     },
    { label: 'Soybean Oil',   ph: '47.62',   chg: '▲ 0.42%', up: true,  cpa: 'SOYBEAN-OIL',  ninjas: 'soybean_oil',  av: null },
    { label: 'Soybean Meal',  ph: '301.10',  chg: '▼ 0.15%', up: false, cpa: 'SOYBEAN-MEAL', ninjas: 'soybean_meal', av: null },
    { label: 'Oat',           ph: '338.25',  chg: '▲ 0.09%', up: true,  cpa: 'OAT',     ninjas: 'oat',           av: null     },
    { label: 'Rough Rice',    ph: '15.24',   chg: '▼ 0.06%', up: false, cpa: 'RICE',    ninjas: 'rough_rice',    av: null     },
    { label: 'Coffee',        ph: '231.40',  chg: '▲ 0.55%', up: true,  cpa: 'COFFEE',  ninjas: 'coffee',        av: 'COFFEE' },
    { label: 'Sugar',         ph: '19.36',   chg: '▼ 0.12%', up: false, cpa: 'SUGAR',   ninjas: 'sugar',         av: 'SUGAR'  },
    { label: 'Cocoa',         ph: '7412.00', chg: '▲ 0.71%', up: true,  cpa: 'COCOA',   ninjas: 'cocoa',         av: null     },
    { label: 'Cotton',        ph: '69.18',   chg: '▲ 0.14%', up: true,  cpa: 'COTTON',  ninjas: 'cotton',        av: 'COTTON' },
    { label: 'Orange Juice',  ph: '264.90',  chg: '▼ 0.33%', up: false, cpa: 'OJ',      ninjas: 'orange_juice',  av: null     }
  ];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function buildTickerBelt(el) {
    var belt = FUTURES.concat(FUTURES); // two copies for a seamless loop
    el.innerHTML = belt.map(function (q, i) {
      var idx = i % FUTURES.length;
      return '<span class="ws-ticker__item">' +
        '<span class="ws-ticker__sym">' + esc(q.label) + '</span>' +
        '<span class="ws-ticker__num" data-fut-price="' + idx + '">' + esc(q.ph) + '</span>' +
        '<i class="' + (q.up ? 'up' : 'dn') + '" data-fut-chg="' + idx + '">' + esc(q.chg) + '</i></span>';
    }).join('');
  }

  function setFuturePrice(idx, price) {
    if (price == null || isNaN(price)) return;
    var txt = Number(price).toFixed(2);
    document.querySelectorAll('[data-fut-price="' + idx + '"]').forEach(function (el) { el.textContent = txt; });
    // Static change markers no longer apply once prices are live.
    document.querySelectorAll('[data-fut-chg="' + idx + '"]').forEach(function (el) { el.textContent = ''; });
  }

  var PRICE_ADAPTERS = {
    commoditypriceapi: function (key) {
      var syms = FUTURES.map(function (f) { return f.cpa; }).join(',');
      fetch('https://api.commoditypriceapi.com/v2/latest?apiKey=' + encodeURIComponent(key) + '&symbols=' + encodeURIComponent(syms))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var rates = d.rates || (d.data && d.data.rates) || {};
          FUTURES.forEach(function (f, i) {
            var v = rates[f.cpa];
            setFuturePrice(i, typeof v === 'object' && v ? v.rate || v.price : v);
          });
        }).catch(function () { /* keep static prices */ });
    },
    apininjas: function (key) {
      FUTURES.forEach(function (f, i) {
        if (!f.ninjas) return;
        fetch('https://api.api-ninjas.com/v1/commodityprice?name=' + encodeURIComponent(f.ninjas), {
          headers: { 'X-Api-Key': key }
        })
          .then(function (r) { return r.json(); })
          .then(function (d) { setFuturePrice(i, d && d.price); })
          .catch(function () { /* keep static price */ });
      });
    },
    alphavantage: function (key) {
      FUTURES.forEach(function (f, i) {
        if (!f.av) return; // Alpha Vantage only covers Corn, Wheat, Sugar, Coffee, Cotton
        fetch('https://www.alphavantage.co/query?function=' + f.av + '&interval=monthly&apikey=' + encodeURIComponent(key))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var v = d && d.data && d.data[0] && parseFloat(d.data[0].value);
            setFuturePrice(i, v);
          })
          .catch(function () { /* keep static price */ });
      });
    }
  };

  function initLivePrices() {
    var adapter = PRICE_ADAPTERS[CFG.pricesProvider];
    if (!adapter || !CFG.pricesApiKey) return;
    var run = function () { adapter(CFG.pricesApiKey); };
    run();
    if (CFG.pricesProvider !== 'alphavantage') {
      setInterval(run, Math.max(60000, CFG.refreshMs || 300000));
    }
  }

  /* ---------------------------------------------------------
     Platform stack — pricing happens in the free market on the
     platform itself, so there is no separate pricing-engine or
     index layer here.
     --------------------------------------------------------- */
  var LAYERS = [
    { icon: 'Registry', name: 'Collateral registry', tag: 'AQX-REG',
      d: 'A permissioned registry of certified, ringfenced water reserves and the obligations secured against them.',
      kv: [['Records', 'Reserves · liens · titles'], ['Audit', 'Quarterly'], ['Access', 'Permissioned']] },
    { icon: 'Shield', name: 'Asset verification', tag: 'AQX-VER',
      d: 'Quality, mineral content, and volume verification of physical sources by accredited inspectors.',
      kv: [['Checks', 'Quality · volume · title'], ['Status', 'Verified / pending'], ['Renewal', 'Periodic re-inspection']] },
    { icon: 'Issue', name: 'Tokenization layer', tag: 'AQX-TOK',
      d: 'Digital representation of verified water-backed instruments — one implementation layer within the stack.',
      kv: [['Instruments', 'WATERCOIN™'], ['Record', 'Transparent ownership'], ['Backing', 'Verified reserves']] },
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

  function badge(text, variant, mono, style) {
    var cls = 'aqx-badge aqx-badge--' + (variant || 'neutral') + (mono ? ' aqx-badge--mono' : '');
    return '<span class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '>' + esc(text) + '</span>';
  }

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
      setTimeout(function () { bodyEl.classList.add('is-shown'); }, 30);
    }

    function stopCycle() {
      touched = true;
      if (timer) { clearInterval(timer); timer = null; }
    }

    rows.forEach(function (r) {
      r.addEventListener('click', function () {
        stopCycle();
        render(parseInt(r.getAttribute('data-i'), 10));
      });
    });

    // Deep links (e.g. the "View tokenization layer" button) select a layer by tag.
    document.querySelectorAll('[data-platform-select]').forEach(function (a) {
      a.addEventListener('click', function () {
        var tag = a.getAttribute('data-platform-select');
        var i = LAYERS.findIndex(function (l) { return l.tag === tag; });
        if (i >= 0) { stopCycle(); render(i); }
      });
    });

    render(0);
    if (!reduced) {
      timer = setInterval(function () { if (!touched) render((active + 1) % LAYERS.length); }, 3400);
    }
  }

  /* ---------------------------------------------------------
     Team — roster order and links per company notes.
     Portraits are monogram placeholders pending photography.
     --------------------------------------------------------- */
  var TEAM = [
    { n: 'Yaacov Shirazi', mono: 'YS', role: 'Founder, Chairman & CEO', featured: true,
      bio: 'Developer of the AquaIndex method and the patented intellectual property for trading water as a commodity. Decades of experience financing and trading commodities across the agricultural and energy sectors, with several years in high-tech ventures.',
      tags: ['Water markets', 'Commodities', 'Intellectual property'], url: null },
    { n: 'Robert Gaffney', mono: 'RG', role: 'AquaIndex Exchange CEO',
      bio: 'Senior executive across derivatives and prime brokerage — former COO & Managing Director of UBS Securities Prime Brokerage Services and COO of ABN AMRO Global Futures.',
      tags: ['Derivatives', 'Exchange operations'],
      url: 'https://www.linkedin.com/in/bob-gaffney-7001215/' },
    { n: 'Don Horwitz', mono: 'DH', role: 'AquaIndex Exchange CRO',
      bio: 'General counsel and chief regulatory officer across derivatives exchanges, including the North American Derivatives Exchange and OneChicago; Managing Director at Oyster Consulting.',
      tags: ['Legal', 'Compliance'],
      url: 'https://www.linkedin.com/in/donald-horwitz-574a116/' },
    { n: 'Ronald Filler', mono: 'RF', role: 'Exchange Public Director',
      bio: 'Professor of Law and Director of the Financial Services Law Institute at New York Law School; Public Director of the NFA; former Managing Director at Lehman Brothers.',
      tags: ['Regulation', 'Futures law'],
      url: 'https://www.linkedin.com/in/ronald-filler-ba5b999/' },
    { n: 'Linda Allen', mono: 'LA', role: 'Special Adviser & Risk Consultant',
      bio: 'William F. Aldinger Chair in Banking and Finance at Baruch College, CUNY. Author of leading texts on credit, market, and operational risk; co-editor of the Journal of Credit Risk.',
      tags: ['Risk', 'Banking & finance'],
      url: 'https://www.linkedin.com/in/professor-linda-allen-9588b667/' },
    { n: 'Paul Peterson', mono: 'PP', role: 'Economics & Business Consultant',
      bio: 'Professor at the University of Illinois; 23 years as Director of Commodity Research & Product Development at the Chicago Mercantile Exchange. Ph.D. in Agricultural Economics.',
      tags: ['Commodity research', 'Market design'],
      url: 'https://www.researchgate.net/profile/Paul-Peterson-8', external: true },
    { n: 'Sanjeev Dutta', mono: 'SD', role: 'Senior Advisor, MENA & APAC',
      bio: '30+ years in commodities, financial services, and bilateral trade — former Executive Director for Commodities & Financial Services at DMCC and CEO of the UAE-India Business Council.',
      tags: ['Global trade', 'Governance'],
      url: 'https://www.linkedin.com/in/sanjeev-dutta-25b36a4/' },
    { n: 'James Bernard', mono: 'JB', role: 'Senior Advisor, Tokenomics & Trading',
      bio: 'Founding member of the Dubai Global Blockchain Council and former Director at DMCC Free Zone; two decades building commodity and digital-asset ecosystems.',
      tags: ['Digital assets', 'Ecosystems'],
      url: 'https://www.linkedin.com/in/jamesdbernard/' },
    { n: 'Elon Bezalely', mono: 'EB', role: 'Chief Research & Operations Officer',
      bio: 'Thirty years across derivatives and trading systems — former hedge-fund quant trader and Head of Options at a Middle Eastern commercial bank. M.A. in Mathematics, Cambridge.',
      tags: ['Quantitative research', 'Trading systems'],
      url: 'https://www.linkedin.com/in/elobez/' }
  ];

  function teamLink(m, small) {
    if (!m.url) return '';
    var ic = m.external
      ? icon('External', small ? 15 : 16)
      : (small ? LINKEDIN.replace('width="16" height="16"', 'width="15" height="15"') : LINKEDIN);
    var label = esc(m.n) + (m.external ? ' profile' : ' on LinkedIn');
    var cls = small ? 'aqx-btn aqx-btn--ghost aqx-btn--sm aqx-iconbtn' : 'aqx-btn aqx-btn--onDeep aqx-btn--md aqx-iconbtn';
    return '<a class="' + cls + '" href="' + m.url + '" target="_blank" rel="noopener noreferrer" aria-label="' + label + '" title="' + label + '">' + ic + '</a>';
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
        teamLink(feat, false) +
      '</div>' +
      '<p class="ws-team__bio">' + esc(feat.bio) + '</p>';

    var grid = root.querySelector('.ws-team__grid');
    grid.innerHTML = rest.map(function (m) {
      var tags = m.tags.map(function (t) { return badge(t, 'neutral'); }).join('');
      return '<div class="ws-team__card">' +
        '<div class="ws-team__cardhd">' +
          '<div class="ws-team__pt" aria-hidden="true"><span>' + esc(m.mono) + '</span></div>' +
          teamLink(m, true) +
        '</div>' +
        '<h3>' + esc(m.n) + '</h3>' +
        '<div class="ws-team__role">' + esc(m.role) + '</div>' +
        '<p class="ws-team__bio">' + esc(m.bio) + '</p>' +
        '<div class="ws-team__tags">' + tags + '</div></div>';
    }).join('');
  }

  /* ---------------------------------------------------------
     Contact links — single source of truth in config.js.
     --------------------------------------------------------- */
  function initContactLinks() {
    if (!CFG.contactUrl) return;
    document.querySelectorAll('[data-contact]').forEach(function (a) {
      a.setAttribute('href', CFG.contactUrl);
      if (/^https?:/.test(CFG.contactUrl)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /* ---------------------------------------------------------
     Scroll-reveal (IntersectionObserver) with sibling stagger
     --------------------------------------------------------- */
  var REVEAL_SELECTOR = [
    '.ws-sec__head', '.ws-value', '.ws-fact',
    '.ws-stack__row', '.ws-card', '.ws-method > div:first-child', '.ws-collat > div:first-child',
    '.ws-tok__card', '.ws-impact__col', '.ws-cta__box',
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

    document.querySelectorAll('[data-chart="heroWaves"]').forEach(function (el) {
      el.innerHTML = heroWaves();
    });

    var ticker = document.querySelector('.ws-ticker__belt');
    if (ticker) buildTickerBelt(ticker);

    renderIndex(FALLBACK_SERIES); // instant paint; CSV replaces it as soon as it loads
    loadIndex();
    initLivePrices();
    buildTeam(root);
    initPlatform(root, reduced);
    initContactLinks();
    fillIcons(document);
    initReveal(root, reduced);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
