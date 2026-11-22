/* ============================================================
   AquaIndex price chart — pure SVG, token-driven.
   Shared by the public site (hero panel) and the admin page.

   AQXChart.mount(el, { rows, id, height, decimals, stroke, grid, label })
     rows: [['YYYY-MM-DD', value], ...] in date order.
   Points are placed by date, so gaps in the history show as gaps
   in time rather than being squeezed together.
   ============================================================ */
(function () {
  'use strict';

  var W = 720, PAD = 10;

  function dayMs(date) { return Date.parse(date + 'T00:00:00Z'); }

  function sparkline(opts) {
    opts = opts || {};
    var pts = opts.data || [];
    if (pts.length < 2) return '';
    var w = opts.w || 96, h = opts.h || 28, stroke = opts.stroke || 'var(--aqua-500)';
    var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    var x = function (i) { return (i * w) / (pts.length - 1); };
    var y = function (v) { return h - 2 - (h - 4) * ((v - min) / (max - min || 1)); };
    var line = pts.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" style="display:block">' +
      '<path d="' + line + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function mount(el, opts) {
    opts = opts || {};
    var rows = opts.rows || [];
    var h = opts.height || 150, id = opts.id || 'idx';
    var decimals = opts.decimals == null ? 4 : opts.decimals;
    var stroke = opts.stroke || 'var(--navy-700)';
    var gridStroke = opts.grid || 'var(--viz-grid)';

    if (rows.length < 2) {
      el.innerHTML = '<div class="aqx-chart aqx-chart--empty" style="height:' + h + 'px">' +
        (rows.length ? 'Add a second price point to draw the chart.' : 'No price data yet.') + '</div>';
      return;
    }

    var n = rows.length;
    var times = rows.map(function (r) { return dayMs(r[0]); });
    var byTime = times.every(function (t) { return !isNaN(t); }) && times[n - 1] > times[0];
    var t0 = times[0], span = times[n - 1] - times[0];
    var values = rows.map(function (r) { return r[1]; });
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);

    var fx = function (i) { return byTime ? (times[i] - t0) / span : i / (n - 1); }; // 0..1 across the plot
    var x = function (i) { return PAD + fx(i) * (W - PAD * 2); };
    var y = function (v) { return PAD + (h - PAD * 2) * (1 - (v - min) / (max - min || 1)); };

    var line = rows.map(function (r, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(r[1]).toFixed(1); }).join(' ');
    var area = line + ' L' + x(n - 1) + ' ' + (h - PAD) + ' L' + x(0) + ' ' + (h - PAD) + ' Z';
    var grid = [0.2, 0.4, 0.6, 0.8].map(function (g) {
      var gy = PAD + (h - PAD * 2) * g;
      return '<line x1="' + PAD + '" x2="' + (W - PAD) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + gridStroke + '" stroke-width="1"/>';
    }).join('');

    var summary = (opts.label || 'Price history') + ', ' + rows[0][0] + ' to ' + rows[n - 1][0] +
      ', latest ' + rows[n - 1][1].toFixed(decimals);

    el.innerHTML =
      '<div class="aqx-chart" style="height:' + h + 'px">' +
        '<svg viewBox="0 0 ' + W + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" style="display:block" role="img" aria-label="' + summary.replace(/"/g, '&quot;') + '">' +
          '<defs><linearGradient id="' + id + 'fill" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="var(--aqua-500)" stop-opacity="0.20"/>' +
          '<stop offset="100%" stop-color="var(--aqua-500)" stop-opacity="0"/></linearGradient></defs>' +
          grid +
          '<path d="' + area + '" fill="url(#' + id + 'fill)"/>' +
          '<path d="' + line + '" fill="none" stroke="' + stroke + '" stroke-width="' + (n > 400 ? 1.6 : 2.5) + '" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="aqx-draw"/>' +
          '<circle cx="' + x(n - 1) + '" cy="' + y(rows[n - 1][1]) + '" r="4.5" fill="var(--aqua-500)" stroke="#fff" stroke-width="2" class="aqx-mark"/>' +
        '</svg>' +
        '<div class="aqx-chart__cursor" hidden></div>' +
        '<div class="aqx-chart__dot" hidden></div>' +
        '<div class="aqx-chart__tip" hidden></div>' +
      '</div>' +
      '<div class="aqx-chart__axis"><span>' + rows[0][0] + '</span><span>' + rows[n - 1][0] + '</span></div>';

    /* Hover readout: nearest point by horizontal position. */
    var box = el.querySelector('.aqx-chart');
    var cursor = box.querySelector('.aqx-chart__cursor');
    var dot = box.querySelector('.aqx-chart__dot');
    var tip = box.querySelector('.aqx-chart__tip');

    function show(i) {
      var leftPct = (x(i) / W) * 100;
      cursor.style.left = dot.style.left = leftPct + '%';
      dot.style.top = y(rows[i][1]) + 'px';
      tip.textContent = '';
      var d = document.createElement('span'); d.textContent = rows[i][0];
      var v = document.createElement('strong'); v.textContent = rows[i][1].toFixed(decimals);
      tip.appendChild(d); tip.appendChild(v);
      cursor.hidden = dot.hidden = tip.hidden = false;
      // Keep the label inside the plot.
      var half = tip.offsetWidth / 2, bw = box.clientWidth, px = (leftPct / 100) * bw;
      tip.style.left = Math.max(half, Math.min(bw - half, px)) + 'px';
    }
    function hide() { cursor.hidden = dot.hidden = tip.hidden = true; }

    function nearest(clientX) {
      var r = box.getBoundingClientRect();
      var f = ((clientX - r.left) / r.width * W - PAD) / (W - PAD * 2);
      var best = 0, bestD = Infinity;
      for (var i = 0; i < n; i++) {
        var dd = Math.abs(fx(i) - f);
        if (dd < bestD) { bestD = dd; best = i; }
      }
      return best;
    }

    box.addEventListener('pointermove', function (e) { show(nearest(e.clientX)); });
    box.addEventListener('pointerdown', function (e) { show(nearest(e.clientX)); });
    box.addEventListener('pointerleave', hide);
  }

  window.AQXChart = { mount: mount, sparkline: sparkline };
})();
