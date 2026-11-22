/* ============================================================
   AquaIndex — price data admin.
   Reads   GET  /api/assets, /api/assets/{symbol}/prices
   Writes  /api/manage/...   (admin role only — see api/)
   ============================================================ */
(function () {
  'use strict';

  var API = '/api';
  var CHUNK = 20000; // rows per request — the API's limit, so a history normally goes in one request

  var state = { assets: [], symbol: null, points: [], creating: false, excel: null };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    list: $('assetList'), loading: $('loadingState'), empty: $('emptyState'),
    history: $('historyCard'), entryRow: $('entryRow'), table: $('tableCard'), assetCard: $('assetCard'),
    historySymbol: $('historySymbol'), historyName: $('historyName'), historyStats: $('historyStats'), chart: $('chart'),
    priceForm: $('priceForm'), priceDate: $('priceDate'), priceValue: $('priceValue'),
    importForm: $('importForm'), importText: $('importText'), importFile: $('importFile'), importSummary: $('importSummary'),
    pointsBody: $('pointsBody'), exportBtn: $('exportBtn'),
    assetForm: $('assetForm'), assetCardTitle: $('assetCardTitle'), assetSymbol: $('assetSymbol'), assetName: $('assetName'),
    assetDecimals: $('assetDecimals'), assetSort: $('assetSort'), assetSaveBtn: $('assetSaveBtn'),
    assetCancelBtn: $('assetCancelBtn'), assetDeleteBtn: $('assetDeleteBtn'),
    assetLabel: $('assetLabel'),
    excelCard: $('excelCard'), excelFile: $('excelFile'), excelPreview: $('excelPreview'), excelName: $('excelName'),
    excelBody: $('excelBody'), excelApplyBtn: $('excelApplyBtn'), excelCancelBtn: $('excelCancelBtn'), excelProgress: $('excelProgress'),
    toast: $('toast'), userName: $('userName')
  };

  /* ---------- helpers ---------- */

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var toastTimer = null;
  function toast(msg, isError) {
    clearTimeout(toastTimer);
    el.toast.textContent = msg;
    el.toast.classList.toggle('is-error', !!isError);
    el.toast.hidden = false;
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, isError ? 9000 : 4000);
  }

  function busy(on) { document.body.classList.toggle('is-busy', on); }

  function api(method, path, body) {
    // GETs use 'reload' so each read also refreshes this browser's cached copy of the
    // public API responses — the admin then sees their change on the site straight away
    // (other visitors pick it up when the 60-second cache expires).
    var opts = { method: method, cache: method === 'GET' ? 'reload' : 'no-store', headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(API + path, opts).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (e) { /* not JSON (e.g. a sign-in page) */ }
        if (r.ok && data) return data;
        var msg = data && data.error;
        if (!msg) {
          msg = r.status === 401 || r.status === 403
            ? 'Your session has expired or this account is not an admin. Reload the page to sign in again.'
            : 'The server returned an unexpected response (' + r.status + ').';
        }
        var err = new Error(msg);
        err.status = r.status;
        throw err;
      });
    });
  }

  /* Runs an async action with the busy state and error toast handled. */
  function run(action) {
    busy(true);
    return Promise.resolve().then(action).catch(function (err) {
      toast(err.message || String(err), true);
    }).then(function () { busy(false); });
  }

  function currentAsset() {
    return state.assets.filter(function (a) { return a.symbol === state.symbol; })[0] || null;
  }

  function fmt(v, asset) { return Number(v).toFixed(asset ? asset.decimals : 4); }

  function pct(now, before) {
    if (!before) return null;
    return (now / before - 1) * 100;
  }

  function pctText(p) {
    if (p == null) return '—';
    return (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(2) + '%';
  }

  function today() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------- rendering ---------- */

  function show(which) {
    // which: 'loading' | 'empty' | 'asset' | 'create'
    el.loading.hidden = which !== 'loading';
    el.empty.hidden = which !== 'empty';
    el.history.hidden = el.entryRow.hidden = el.table.hidden = which !== 'asset';
    el.assetCard.hidden = !(which === 'asset' || which === 'create');
    el.excelCard.hidden = !(which === 'asset' || which === 'empty');
  }

  function renderList() {
    el.list.textContent = '';
    state.assets.forEach(function (a) {
      var b = node('button', 'adm-asset' + (a.symbol === state.symbol && !state.creating ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(node('span', 'adm-asset__sym', a.symbol));
      b.appendChild(node('span', 'adm-asset__val', a.points ? fmt(a.lastValue, a) : '—'));
      b.appendChild(node('span', 'adm-asset__name', (a.label && a.label !== a.symbol ? a.label + ' · ' : '') + a.name));
      b.appendChild(node('span', 'adm-asset__n', a.points + (a.points === 1 ? ' point' : ' points')));
      b.addEventListener('click', function () { run(function () { return openAsset(a.symbol); }); });
      el.list.appendChild(b);
    });
  }

  function stat(label, value, cls) {
    var s = node('div', 'adm-stat');
    s.appendChild(node('span', null, label));
    s.appendChild(node('strong', cls || null, value));
    return s;
  }

  function renderAsset() {
    var a = currentAsset();
    if (!a) return;
    var pts = state.points, n = pts.length;

    el.historySymbol.textContent = a.symbol;
    el.historyName.textContent = a.name;
    el.historyStats.textContent = '';
    if (n) {
      var change = n > 1 ? pct(pts[n - 1][1], pts[n - 2][1]) : null;
      el.historyStats.appendChild(stat('Latest', fmt(pts[n - 1][1], a)));
      el.historyStats.appendChild(stat('Change', pctText(change), change == null ? null : (change >= 0 ? 'adm-up' : 'adm-dn')));
      el.historyStats.appendChild(stat('As of', pts[n - 1][0]));
      el.historyStats.appendChild(stat('Points', String(n)));
    }
    window.AQXChart.mount(el.chart, { rows: pts, id: 'adm', height: 220, decimals: a.decimals, label: a.name + ' price history' });

    // Table — newest first.
    el.pointsBody.textContent = '';
    if (!n) {
      var tr0 = node('tr');
      var td0 = node('td', 'muted', 'No prices yet — add one above or import a CSV.');
      td0.colSpan = 4;
      td0.style.fontFamily = 'var(--font-sans)';
      tr0.appendChild(td0);
      el.pointsBody.appendChild(tr0);
    }
    var frag = document.createDocumentFragment();
    for (var i = n - 1; i >= 0; i--) {
      (function (row, prev) {
        var tr = node('tr');
        tr.appendChild(node('td', null, row[0]));
        tr.appendChild(node('td', 'num', fmt(row[1], a)));
        var p = prev ? pct(row[1], prev[1]) : null;
        tr.appendChild(node('td', 'num ' + (p == null ? 'muted' : (p >= 0 ? 'adm-up' : 'adm-dn')), pctText(p)));
        var act = node('td', 'act');
        var edit = node('button', 'aqx-btn aqx-btn--ghost aqx-btn--sm', 'Edit');
        edit.type = 'button';
        edit.setAttribute('aria-label', 'Edit the price on ' + row[0]);
        edit.addEventListener('click', function () {
          el.priceDate.value = row[0];
          el.priceValue.value = row[1];
          el.priceValue.focus();
          el.priceValue.select();
          el.priceForm.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
        var del = node('button', 'aqx-btn aqx-btn--ghost aqx-btn--sm', 'Delete');
        del.type = 'button';
        del.style.setProperty('--_fg', 'var(--red-600)');
        del.setAttribute('aria-label', 'Delete the price on ' + row[0]);
        del.addEventListener('click', function () {
          if (!window.confirm('Delete the ' + a.symbol + ' price on ' + row[0] + '?')) return;
          run(function () {
            return api('DELETE', '/manage/assets/' + encodeURIComponent(a.symbol) + '/prices/' + row[0])
              .then(function () { return refresh(a.symbol); })
              .then(function () { toast('Deleted ' + row[0] + '.'); });
          });
        });
        act.appendChild(edit);
        act.appendChild(del);
        tr.appendChild(act);
        frag.appendChild(tr);
      })(pts[i], i > 0 ? pts[i - 1] : null);
    }
    el.pointsBody.appendChild(frag);
    el.exportBtn.disabled = !n;

    // Settings form.
    el.assetCardTitle.textContent = 'Asset settings';
    el.assetSymbol.value = a.symbol;
    el.assetSymbol.readOnly = true;
    el.assetName.value = a.name;
    el.assetLabel.value = a.label || '';
    el.assetLabel.placeholder = a.symbol;
    el.assetDecimals.value = a.decimals;
    el.assetSort.value = a.sort;
    el.assetSaveBtn.textContent = 'Save asset';
    el.assetCancelBtn.hidden = true;
    el.assetDeleteBtn.hidden = false;
  }

  function renderCreate() {
    el.assetCardTitle.textContent = 'New asset';
    el.assetSymbol.value = '';
    el.assetSymbol.readOnly = false;
    el.assetName.value = '';
    el.assetLabel.value = '';
    el.assetLabel.placeholder = 'Same as symbol';
    el.assetDecimals.value = 4;
    var maxSort = state.assets.reduce(function (m, a) { return Math.max(m, a.sort); }, -1);
    el.assetSort.value = maxSort + 1;
    el.assetSaveBtn.textContent = 'Create asset';
    el.assetCancelBtn.hidden = !state.assets.length;
    el.assetDeleteBtn.hidden = true;
  }

  /* ---------- data flow ---------- */

  function loadAssets() {
    return api('GET', '/assets').then(function (d) { state.assets = d.assets || []; });
  }

  function openAsset(symbol) {
    return api('GET', '/assets/' + encodeURIComponent(symbol) + '/prices').then(function (d) {
      state.creating = false;
      state.symbol = symbol;
      state.points = d.points || [];
      var i = state.assets.findIndex(function (a) { return a.symbol === symbol; });
      if (i >= 0) state.assets[i] = d.asset;
      renderList();
      renderAsset();
      show('asset');
    });
  }

  /* Reload the asset list, then (re)open an asset — or the right empty state. */
  function refresh(preferred) {
    return loadAssets().then(function () {
      var has = function (s) { return state.assets.some(function (a) { return a.symbol === s; }); };
      var target = has(preferred) ? preferred : (has(state.symbol) ? state.symbol : (state.assets[0] && state.assets[0].symbol));
      if (!target) {
        state.symbol = null;
        state.points = [];
        state.creating = false;
        renderList();
        show('empty');
        return;
      }
      return openAsset(target);
    });
  }

  function startCreate() {
    state.creating = true;
    renderList();
    renderCreate();
    show('create');
    el.assetSymbol.focus();
  }

  /* ---------- import parsing ---------- */

  function parseImport(text) {
    var rows = [], errors = [];
    var lines = text.split(/\r?\n/);
    lines.forEach(function (raw, idx) {
      var line = raw.trim();
      if (!line) return;
      var parts = line.split(/[,;\t]/).map(function (s) { return s.trim().replace(/^"|"$/g, ''); });
      var date = (parts[0] || '').replace(/[\/.]/g, '-');
      var isDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
      if (!isDate && !rows.length && !errors.length && /[a-z]/i.test(line)) return; // header row
      var value = parts.length > 1 && parts[1] !== '' ? Number(parts[1]) : NaN;
      if (!isDate) { errors.push('Line ' + (idx + 1) + ': "' + parts[0] + '" is not a YYYY-MM-DD date'); return; }
      if (!isFinite(value)) { errors.push('Line ' + (idx + 1) + ': "' + (parts[1] || '') + '" is not a number'); return; }
      rows.push([date, value]);
    });
    return { rows: rows, errors: errors };
  }

  function describeImport() {
    var text = el.importText.value;
    el.importSummary.classList.remove('adm-err');
    if (!text.trim()) { el.importSummary.textContent = ''; return null; }
    var parsed = parseImport(text);
    if (parsed.errors.length) {
      el.importSummary.classList.add('adm-err');
      el.importSummary.textContent = parsed.errors.slice(0, 3).join(' · ') +
        (parsed.errors.length > 3 ? ' · and ' + (parsed.errors.length - 3) + ' more' : '');
      return parsed;
    }
    var dates = parsed.rows.map(function (r) { return r[0]; }).sort();
    el.importSummary.textContent = parsed.rows.length
      ? parsed.rows.length + (parsed.rows.length === 1 ? ' row' : ' rows') + ' ready · ' + dates[0] + ' → ' + dates[dates.length - 1]
      : 'No rows found.';
    return parsed;
  }

  /* Sends a history in as few requests as the API allows. */
  function postPrices(symbol, rows, replace) {
    var path = '/manage/assets/' + encodeURIComponent(symbol) + '/prices';
    var chunks = [];
    for (var i = 0; i < rows.length; i += CHUNK) chunks.push(rows.slice(i, i + CHUNK));
    return chunks.reduce(function (chain, chunk, idx) {
      return chain.then(function () { return api('POST', path, { points: chunk, replace: replace && idx === 0 }); });
    }, Promise.resolve());
  }

  /* ---------- Excel workbook upload ---------- */

  function excelMode() {
    return document.querySelector('input[name="excelMode"]:checked').value;
  }

  function renderExcel() {
    var x = state.excel;
    el.excelPreview.hidden = !x;
    el.excelProgress.textContent = '';
    if (!x) return;
    var replace = excelMode() === 'replace';
    el.excelName.textContent = x.fileName;
    el.excelBody.textContent = '';
    var bySheet = {};
    x.plan.forEach(function (item) { bySheet[item.sheet] = item; });
    x.workbook.sheets.forEach(function (sheet) {
      var item = bySheet[sheet.sheet];
      var tr = node('tr', item ? null : 'is-skipped');
      tr.appendChild(node('td', null, sheet.sheet));
      tr.appendChild(node('td', null, sheet.symbol || '—'));
      tr.appendChild(node('td', 'num', sheet.points.length ? String(sheet.points.length) : '—'));
      tr.appendChild(node('td', null, sheet.firstDate || '—'));
      tr.appendChild(node('td', null, sheet.lastDate || '—'));
      var what;
      if (!item) what = 'Skipped — ' + sheet.problem;
      else if (item.isNew) what = 'New asset';
      else if (replace) what = 'Replaces the current ' + item.currentPoints + (item.currentPoints === 1 ? ' price' : ' prices');
      else what = 'Added to the current ' + item.currentPoints + (item.currentPoints === 1 ? ' price' : ' prices');
      tr.appendChild(node('td', 'text', what));
      el.excelBody.appendChild(tr);
    });
    el.excelApplyBtn.disabled = !x.plan.length;
  }

  function clearExcel() {
    state.excel = null;
    renderExcel();
  }

  el.excelFile.addEventListener('change', function () {
    var file = el.excelFile.files && el.excelFile.files[0];
    el.excelFile.value = '';
    if (!file) return;
    run(function () {
      return file.arrayBuffer()
        .then(function (buf) { return window.AQXWorkbook.read(buf); })
        .then(function (workbook) {
          return loadAssets().then(function () {
            renderList();
            state.excel = { fileName: file.name, workbook: workbook, plan: window.AQXWorkbook.plan(workbook, state.assets) };
            renderExcel();
            if (!state.excel.plan.length) toast('No sheet in this file has dates in column A and prices in column B.', true);
          });
        })
        .catch(function (err) { clearExcel(); throw err; });
    });
  });

  document.querySelectorAll('input[name="excelMode"]').forEach(function (r) {
    r.addEventListener('change', renderExcel);
  });

  el.excelCancelBtn.addEventListener('click', clearExcel);

  el.excelApplyBtn.addEventListener('click', function () {
    var x = state.excel;
    if (!x || !x.plan.length) return;
    var replace = excelMode() === 'replace';
    var done = [];
    run(function () {
      return x.plan.reduce(function (chain, item, idx) {
        return chain.then(function () {
          el.excelProgress.textContent = 'Updating ' + item.symbol + ' (' + (idx + 1) + ' of ' + x.plan.length + ')…';
          return api('PUT', '/manage/assets/' + encodeURIComponent(item.symbol), item.fields)
            .then(function () { return postPrices(item.symbol, item.points, replace); })
            .then(function () { done.push(item.symbol); });
        });
      }, Promise.resolve()).then(function () {
        var first = x.plan[0].symbol;
        clearExcel();
        return refresh(first).then(function () {
          toast('Updated ' + done.join(', ') + ' from ' + x.fileName + '. The site shows the new data within a minute.');
        });
      }, function (err) {
        // Some assets may already have been updated — show the true state.
        var failed = x.plan[done.length].symbol;
        el.excelProgress.textContent = '';
        return refresh(state.symbol).then(function () {
          throw new Error('Stopped at ' + failed + ': ' + err.message +
            (done.length ? ' Already updated: ' + done.join(', ') + '.' : ' Nothing was changed.'));
        });
      });
    });
  });

  /* ---------- events ---------- */

  $('newAssetBtn').addEventListener('click', startCreate);
  $('firstAssetBtn').addEventListener('click', startCreate);

  el.assetCancelBtn.addEventListener('click', function () {
    run(function () { return refresh(state.symbol); });
  });

  el.assetForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var symbol = el.assetSymbol.value.trim().toUpperCase();
    var name = el.assetName.value.trim();
    var decimals = Number(el.assetDecimals.value);
    var sort = Number(el.assetSort.value);
    if (!/^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(symbol)) { toast('The symbol must be 1–20 characters: letters, digits, dot, dash or underscore.', true); el.assetSymbol.focus(); return; }
    if (!name) { toast('Give the asset a name.', true); el.assetName.focus(); return; }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 8) { toast('Decimals must be a whole number from 0 to 8.', true); el.assetDecimals.focus(); return; }
    if (!Number.isInteger(sort)) { toast('Display order must be a whole number.', true); el.assetSort.focus(); return; }
    var creating = state.creating;
    if (creating && state.assets.some(function (a) { return a.symbol === symbol; })) {
      toast(symbol + ' already exists — pick it from the list to edit it.', true);
      return;
    }
    run(function () {
      var fields = { name: name, label: el.assetLabel.value.trim() || null, decimals: decimals, sort: sort };
      return api('PUT', '/manage/assets/' + encodeURIComponent(symbol), fields)
        .then(function () { return refresh(symbol); })
        .then(function () { toast(creating ? 'Created ' + symbol + '. Now add its prices.' : 'Saved ' + symbol + '.'); });
    });
  });

  el.assetDeleteBtn.addEventListener('click', function () {
    var a = currentAsset();
    if (!a) return;
    var msg = 'Delete ' + a.symbol + ' and all ' + a.points + ' of its prices?\n\nThis cannot be undone. Export the CSV first if you may need the data.';
    if (!window.confirm(msg)) return;
    run(function () {
      return api('DELETE', '/manage/assets/' + encodeURIComponent(a.symbol))
        .then(function () { state.symbol = null; return refresh(); })
        .then(function () { toast('Deleted ' + a.symbol + '.'); });
    });
  });

  el.priceForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = currentAsset();
    if (!a) return;
    var date = el.priceDate.value;
    var raw = el.priceValue.value.trim();
    var value = Number(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Pick a date.', true); el.priceDate.focus(); return; }
    if (raw === '' || !isFinite(value)) { toast('Enter the price as a number.', true); el.priceValue.focus(); return; }
    var existed = state.points.some(function (p) { return p[0] === date; });
    run(function () {
      return api('POST', '/manage/assets/' + encodeURIComponent(a.symbol) + '/prices', { points: [{ date: date, value: value }] })
        .then(function () { return refresh(a.symbol); })
        .then(function () {
          el.priceValue.value = '';
          toast((existed ? 'Updated ' : 'Added ') + date + ' = ' + fmt(value, a) + '.');
        });
    });
  });

  el.importText.addEventListener('input', describeImport);

  el.importFile.addEventListener('change', function () {
    var file = el.importFile.files && el.importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      el.importText.value = String(reader.result || '');
      describeImport();
    };
    reader.onerror = function () { toast('Could not read that file.', true); };
    reader.readAsText(file);
    el.importFile.value = '';
  });

  el.importForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = currentAsset();
    if (!a) return;
    var parsed = describeImport();
    if (!parsed || !parsed.rows.length) { toast('Paste some rows or choose a CSV file first.', true); return; }
    if (parsed.errors.length) { toast('Fix the highlighted rows before importing.', true); return; }
    var replace = el.importForm.querySelector('input[name="importMode"]:checked').value === 'replace';
    if (replace && state.points.length) {
      var msg = 'Replace the whole ' + a.symbol + ' history?\n\nThe ' + state.points.length + ' existing prices will be deleted and ' +
        parsed.rows.length + ' imported in their place.';
      if (!window.confirm(msg)) return;
    }
    run(function () {
      return postPrices(a.symbol, parsed.rows, replace)
        .then(function () { return refresh(a.symbol); })
        .then(function () {
          el.importText.value = '';
          el.importSummary.textContent = '';
          el.importForm.querySelector('input[value="merge"]').checked = true;
          toast('Imported ' + parsed.rows.length + (parsed.rows.length === 1 ? ' price' : ' prices') + ' into ' + a.symbol + '.');
        }, function (err) {
          // Part of a multi-request import may have landed — show the true state.
          return refresh(a.symbol).then(function () { throw err; });
        });
    });
  });

  el.exportBtn.addEventListener('click', function () {
    var a = currentAsset();
    if (!a || !state.points.length) return;
    var csv = 'date,value\n' + state.points.map(function (p) { return p[0] + ',' + p[1]; }).join('\n') + '\n';
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    var link = node('a');
    link.href = url;
    link.download = a.symbol + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* ---------- boot ---------- */

  el.priceDate.value = today();

  fetch('/.auth/me', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var p = d && d.clientPrincipal;
      if (p && p.userDetails) el.userName.textContent = p.userDetails;
    })
    .catch(function () { /* the name is cosmetic */ });

  show('loading');
  run(function () {
    return refresh().catch(function (err) {
      el.loading.textContent = err.message || 'Could not load the price data.';
      show('loading');
      throw err;
    });
  });
})();
