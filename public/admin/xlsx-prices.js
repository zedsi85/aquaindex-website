/* ============================================================
   Reads price histories out of an Excel workbook (.xlsx).

   One asset per sheet. In each sheet only two columns are read:
     column A — the date
     column B — the price
   Everything else in the file is ignored and never leaves the
   browser. Rows where A is not a date or B is not a number
   (titles, headers, blanks, "#N/A") are skipped.

   The sheet name becomes the tab label (e.g. "AQUG"). The asset
   symbol is taken from a Bloomberg-style header in column B above
   the data (e.g. "AQUGSPOT Index" → AQUGSPOT), or else from the
   sheet name.

   No dependencies: an .xlsx is a zip of XML files, unpacked here
   with the platform's DecompressionStream. The same file runs in
   the admin page and in Node (api/scripts/import-xlsx.js).

     AQXWorkbook.read(arrayBuffer) → Promise<{ sheets: [...] }>
     AQXWorkbook.plan(workbook, existingAssets) → what an upload will change
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AQXWorkbook = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_ENTRY_BYTES = 64 * 1024 * 1024; // refuse absurdly large sheets
  var SYMBOL_RE = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;
  var LABEL_MAX = 12;

  /* Names for the indices AquaIndex publishes; other symbols default to the symbol itself. */
  var KNOWN_NAMES = {
    AQUGSPOT: 'AQUA-INDEX™ Global',
    AQUUSPOT: 'AQUA-INDEX™ US',
    AQEASPOT: 'AQUA-INDEX™ East Asia'
  };

  /* ---------- zip ---------- */

  function readZipDirectory(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var end = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('This is not an Excel .xlsx file.');
    var count = view.getUint16(end + 10, true);
    var offset = view.getUint32(end + 16, true);
    if (count === 0xffff || offset === 0xffffffff) throw new Error('This workbook is too large to read here.');
    var decoder = new TextDecoder('utf-8');
    var entries = {};
    for (var n = 0; n < count; n++) {
      if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('The file is damaged (bad zip directory).');
      var nameLen = view.getUint16(offset + 28, true);
      var extraLen = view.getUint16(offset + 30, true);
      var commentLen = view.getUint16(offset + 32, true);
      var name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
      entries[name.replace(/\\/g, '/').replace(/^\//, '')] = {
        method: view.getUint16(offset + 10, true),
        compressedSize: view.getUint32(offset + 20, true),
        size: view.getUint32(offset + 24, true),
        localOffset: view.getUint32(offset + 42, true)
      };
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return { bytes: bytes, view: view, entries: entries };
  }

  function readEntry(zip, name) {
    var e = zip.entries[name];
    if (!e) return Promise.resolve(null);
    if (e.size > MAX_ENTRY_BYTES) return Promise.reject(new Error('A sheet in this workbook is too large to read here.'));
    var lo = e.localOffset;
    if (lo + 30 > zip.bytes.length || zip.view.getUint32(lo, true) !== 0x04034b50) return Promise.reject(new Error('The file is damaged (bad zip entry).'));
    var start = lo + 30 + zip.view.getUint16(lo + 26, true) + zip.view.getUint16(lo + 28, true);
    var data = zip.bytes.subarray(start, start + e.compressedSize);
    var decode = function (buf) { return new TextDecoder('utf-8').decode(buf); };
    if (e.method === 0) return Promise.resolve(decode(data));
    if (e.method !== 8) return Promise.reject(new Error('This workbook uses a compression method that is not supported.'));
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('This browser cannot read Excel files. Use a current version of Chrome, Edge, Firefox or Safari.'));
    }
    var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(decode, function () {
      throw new Error('The file is damaged (could not unpack ' + name + ').');
    });
  }

  /* ---------- xml helpers (regex-based: no DOM, so this also runs in Node) ---------- */

  function unescapeXml(s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, function (m, e) {
      if (e === 'lt') return '<';
      if (e === 'gt') return '>';
      if (e === 'amp') return '&';
      if (e === 'quot') return '"';
      if (e === 'apos') return "'";
      var code = e.charAt(1) === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isFinite(code) ? String.fromCodePoint(code) : m;
    });
  }

  function attr(tag, name) {
    var m = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')').exec(tag);
    return m ? unescapeXml(m[1] != null ? m[1] : m[2]) : null;
  }

  /* Text of all <t> runs inside a string item, ignoring phonetic guides. */
  function richText(xml) {
    var clean = xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
    var out = '', m, re = /<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g;
    while ((m = re.exec(clean))) out += unescapeXml(m[1]);
    return out;
  }

  function parseSharedStrings(xml) {
    var list = [];
    if (!xml) return list;
    var m, re = /<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g;
    while ((m = re.exec(xml))) list.push(m[1] ? richText(m[1]) : '');
    return list;
  }

  /* Which cell styles are date formats: returns an array indexed by style id, or null. */
  function parseDateStyles(xml) {
    if (!xml) return null;
    var custom = {};
    var m, re = /<(?:\w+:)?numFmt\b[^>]*>/g;
    while ((m = re.exec(xml))) {
      var id = attr(m[0], 'numFmtId'), code = attr(m[0], 'formatCode') || '';
      // Strip quoted text, escaped characters and [bracketed] sections, then look for date letters.
      var bare = code.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[[^\]]*\]/g, '');
      custom[id] = /[dmyDMY]/.test(bare) && !/^[#0?.,%Ee+\-\s]*$/.test(bare);
    }
    var block = /<(?:\w+:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:\w+:)?cellXfs>/.exec(xml);
    if (!block) return null;
    var styles = [];
    re = /<(?:\w+:)?xf\b[^>]*>/g;
    while ((m = re.exec(block[1]))) {
      var n = parseInt(attr(m[0], 'numFmtId') || '0', 10);
      var builtin = (n >= 14 && n <= 22) || (n >= 27 && n <= 36) || (n >= 45 && n <= 47) || (n >= 50 && n <= 58);
      styles.push(Object.prototype.hasOwnProperty.call(custom, String(n)) ? custom[String(n)] : builtin);
    }
    return styles;
  }

  function serialToIso(serial, date1904) {
    var days = Math.floor(serial) + (date1904 ? 1462 : 0);
    var d = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  function isRealIsoDate(s) {
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  function colIndex(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  }

  /* ---------- one sheet: columns A and B only ---------- */

  function readSheet(xml, ctx) {
    var points = new Map();
    var headerStrings = [];
    var duplicates = 0;
    var rowRe = /<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g;
    var rowMatch;
    while ((rowMatch = rowRe.exec(xml))) {
      var body = rowMatch[1];
      if (!body) continue;
      var a = null, b = null, position = 0;
      var cellRe = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
      var cellMatch;
      while ((cellMatch = cellRe.exec(body))) {
        var attrs = cellMatch[1];
        var ref = attr(attrs, 'r');
        var col = ref ? colIndex(/^[A-Z]+/.exec(ref.toUpperCase())[0]) : position;
        position = col + 1;
        if (col > 1) break; // past column B
        var type = attr(attrs, 't');
        var inner = cellMatch[2] || '';
        var vm = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner);
        var raw = vm ? unescapeXml(vm[1]) : null;
        var cell = null;
        if (type === 's') {
          if (raw != null) cell = { text: ctx.strings[parseInt(raw, 10)] || '' };
        } else if (type === 'inlineStr') {
          cell = { text: richText(inner) };
        } else if (type === 'str') {
          if (raw != null) cell = { text: raw };
        } else if (type === 'b' || type === 'e') {
          cell = null;
        } else if (raw != null && raw.trim() !== '' && isFinite(Number(raw))) {
          var styleId = parseInt(attr(attrs, 's') || '0', 10);
          cell = { num: Number(raw), dateStyle: ctx.dateStyles ? !!ctx.dateStyles[styleId] : null };
        }
        if (col === 0) a = cell; else b = cell;
      }

      // Date from column A.
      var date = null;
      if (a && a.num != null) {
        var plausible = a.num >= 1 && a.num < 2958466; // 1900-01-01 … 9999-12-31
        var looksLikeDate = a.dateStyle == null ? (a.num >= 20000 && a.num < 80000) : a.dateStyle;
        if (plausible && looksLikeDate) date = serialToIso(a.num, ctx.date1904);
      } else if (a && a.text != null) {
        var tm = /^\s*(\d{4})[-\/.](\d{2})[-\/.](\d{2})(?:[T\s].*)?$/.exec(a.text);
        if (tm && isRealIsoDate(tm[1] + '-' + tm[2] + '-' + tm[3])) date = tm[1] + '-' + tm[2] + '-' + tm[3];
      }

      // Price from column B.
      var value = null;
      if (b && b.num != null) value = b.num;
      else if (b && b.text != null && /^\s*-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\s*$/.test(b.text)) value = Number(b.text);

      if (date && value != null && isFinite(value)) {
        if (points.has(date)) duplicates++;
        points.set(date, value);
      } else if (!points.size && b && b.text != null && b.text.trim()) {
        headerStrings.push(b.text.trim()); // text above the data in column B
      }
    }

    var rows = Array.from(points.entries()).sort(function (x, y) { return x[0] < y[0] ? -1 : 1; });
    return { points: rows, headerStrings: headerStrings, duplicates: duplicates };
  }

  /* Fewest decimals (0–6) that show every value exactly, e.g. 2.619 → 3. */
  function detectDecimals(points) {
    var need = 0;
    for (var i = 0; i < points.length && need < 6; i++) {
      var v = points[i][1];
      while (need < 6 && Math.abs(v - Number(v.toFixed(need))) > 1e-9) need++;
    }
    return need;
  }

  function symbolFor(sheetName, headerStrings) {
    for (var i = 0; i < headerStrings.length; i++) {
      // Bloomberg security header, e.g. "AQUGSPOT Index"
      var m = /^(\S+)\s+(Index|Curncy|Comdty|Equity|Govt|Corp|Mtge|Muni|Pfd)$/i.exec(headerStrings[i]);
      if (m && SYMBOL_RE.test(m[1].toUpperCase())) return m[1].toUpperCase();
    }
    var fromName = sheetName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9._-]/g, '').replace(/^[._-]+/, '').slice(0, 20);
    return SYMBOL_RE.test(fromName) ? fromName : null;
  }

  /* ---------- workbook ---------- */

  function read(input) {
    var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    var zip;
    try { zip = readZipDirectory(bytes); } catch (err) { return Promise.reject(err); }

    return Promise.all([
      readEntry(zip, 'xl/workbook.xml'),
      readEntry(zip, 'xl/_rels/workbook.xml.rels'),
      readEntry(zip, 'xl/sharedStrings.xml'),
      readEntry(zip, 'xl/styles.xml')
    ]).then(function (parts) {
      var workbook = parts[0], rels = parts[1];
      if (!workbook || !rels) throw new Error('This is not an Excel .xlsx workbook.');

      var targets = {};
      var m, re = /<(?:\w+:)?Relationship\b[^>]*>/g;
      while ((m = re.exec(rels))) {
        var target = attr(m[0], 'Target') || '';
        targets[attr(m[0], 'Id')] = target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      }

      var pr = /<(?:\w+:)?workbookPr\b[^>]*>/.exec(workbook);
      var d1904 = pr ? attr(pr[0], 'date1904') : null;
      var ctx = {
        strings: parseSharedStrings(parts[2]),
        dateStyles: parseDateStyles(parts[3]),
        date1904: d1904 === '1' || d1904 === 'true'
      };

      var defs = [];
      re = /<(?:\w+:)?sheet\b[^>]*>/g;
      while ((m = re.exec(workbook))) {
        var state = attr(m[0], 'state');
        if (state === 'hidden' || state === 'veryHidden') continue;
        defs.push({ name: attr(m[0], 'name') || '', path: targets[attr(m[0], 'r:id')] });
      }
      if (!defs.length) throw new Error('This workbook has no visible sheets.');

      return Promise.all(defs.map(function (d) {
        return (d.path ? readEntry(zip, d.path) : Promise.resolve(null)).then(function (xml) {
          return { def: d, parsed: xml ? readSheet(xml, ctx) : { points: [], headerStrings: [], duplicates: 0 } };
        });
      }));
    }).then(function (results) {
      var seen = {};
      var sheets = results.map(function (r) {
        var pts = r.parsed.points;
        var symbol = symbolFor(r.def.name, r.parsed.headerStrings);
        var sheet = {
          sheet: r.def.name,
          label: r.def.name.trim().slice(0, LABEL_MAX),
          symbol: symbol,
          name: (symbol && KNOWN_NAMES[symbol]) || symbol,
          points: pts,
          decimals: detectDecimals(pts),
          firstDate: pts.length ? pts[0][0] : null,
          lastDate: pts.length ? pts[pts.length - 1][0] : null,
          duplicates: r.parsed.duplicates,
          problem: null
        };
        if (!pts.length) sheet.problem = 'No dates in column A with prices in column B.';
        else if (!symbol) sheet.problem = 'Could not work out a symbol from the sheet name.';
        else if (seen[symbol]) sheet.problem = 'Same asset as the sheet "' + seen[symbol] + '".';
        else seen[symbol] = r.def.name;
        return sheet;
      });
      return { sheets: sheets };
    });
  }

  /* What applying a workbook would do, given the assets that already exist.
     Sheet order becomes tab order and the sheet name becomes the tab label.
     An existing asset keeps its name and decimals; a new one gets a default
     name and the precision of the most precise value in the workbook, so
     that every tab shows the same number of decimals. */
  function plan(workbook, existingAssets) {
    var bySymbol = {};
    (existingAssets || []).forEach(function (a) { bySymbol[a.symbol] = a; });
    var usable = workbook.sheets.filter(function (s) { return !s.problem; });
    var decimals = usable.reduce(function (m, s) { return Math.max(m, s.decimals); }, 0);
    return usable.map(function (s, i) {
      var existing = bySymbol[s.symbol] || null;
      var fields = { label: s.label, sort: i };
      if (!existing) { fields.name = s.name; fields.decimals = decimals; }
      return {
        sheet: s.sheet, symbol: s.symbol, isNew: !existing,
        currentPoints: existing ? existing.points : 0,
        fields: fields, points: s.points, firstDate: s.firstDate, lastDate: s.lastDate
      };
    });
  }

  return { read: read, plan: plan, KNOWN_NAMES: KNOWN_NAMES };
});
