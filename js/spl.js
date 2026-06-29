/* SOC Range :: spl.js
 * A small, dependency-free SPL (Splunk Search Processing Language) interpreter.
 * It runs a useful Power-User subset over an array of event rows (plain objects)
 * entirely in the browser. Not a full Splunk. Supported:
 *   base search: term, "phrase", field=value, field!=value, field>,<,>=,<=,
 *                wildcards (status=2*), AND / OR / NOT
 *   commands:    search, where, eval, stats, timechart, top, rare, table,
 *                fields, rename, sort, dedup, head, tail, lookup
 *   eval/where:  + - * / . ( ), comparisons, AND/OR/NOT, and functions
 *                round len lower upper if tonumber isnotnull isnull like coalesce
 * Returns { kind, columns, rows, error }.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  // Built-in lookups (Power User skill). Populated by the dataset builder.
  var LOOKUPS = {};

  // ---------- helpers ----------
  function isNumeric(v) { return v !== "" && v !== null && v !== undefined && !isNaN(Number(v)); }
  function num(v) { return Number(v); }
  function lc(v) { return String(v == null ? "" : v).toLowerCase(); }
  function wildToRe(p) {
    var s = String(p).replace(/[.*+?^${}()|[\]\\]/g, function (c) { return c === "*" ? "\u0000" : "\\" + c; });
    s = s.replace(/\u0000/g, ".*");
    return new RegExp("^" + s + "$", "i");
  }

  // split a pipeline on top-level | (respect quotes)
  function splitPipes(q) {
    var out = [], cur = "", inq = false, i;
    for (i = 0; i < q.length; i++) {
      var c = q[i];
      if (c === '"') { inq = !inq; cur += c; }
      else if (c === "|" && !inq) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
  }

  // whitespace split respecting quotes (for base search)
  function splitWs(s) {
    var out = [], cur = "", inq = false, i;
    for (i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '"') { inq = !inq; cur += c; }
      else if (/\s/.test(c) && !inq) { if (cur) { out.push(cur); cur = ""; } }
      else cur += c;
    }
    if (cur) out.push(cur);
    return out;
  }
  function unquote(t) { return (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') ? t.slice(1, -1) : t; }

  // ---------- base search ----------
  // Build a predicate from whitespace tokens with AND/OR/NOT.
  function buildSearch(tokens) {
    // split into OR-groups
    var groups = [[]], gi = 0, i;
    for (i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t === "OR") { groups.push([]); gi++; }
      else if (t === "AND") { /* default, ignore */ }
      else groups[gi].push(t);
    }
    var groupPreds = groups.map(function (g) {
      var preds = [];
      for (var j = 0; j < g.length; j++) {
        var neg = false, tok = g[j];
        if (tok === "NOT") { neg = true; tok = g[++j]; if (tok === undefined) break; }
        preds.push(makePred(tok, neg));
      }
      return function (row) { return preds.every(function (p) { return p(row); }); };
    });
    return function (row) { return groupPreds.some(function (gp) { return gp(row); }); };
  }
  function findOp(tok) {
    var ops = ["!=", ">=", "<=", "=", ">", "<"], k;
    for (k = 0; k < ops.length; k++) {
      var idx = tok.indexOf(ops[k]);
      if (idx > 0) return { op: ops[k], idx: idx };
    }
    return null;
  }
  function makePred(tok, neg) {
    var oi = findOp(tok), p;
    if (!oi) {
      var term = lc(unquote(tok));
      p = function (row) { return lc(row._raw).indexOf(term) >= 0; };
    } else {
      var field = tok.slice(0, oi.idx), op = oi.op, val = unquote(tok.slice(oi.idx + op.length));
      p = function (row) {
        var rv = row[field];
        if (rv === undefined || rv === null) rv = "";
        if (op === "=") {
          if (String(val).indexOf("*") >= 0) return wildToRe(val).test(String(rv));
          return lc(rv) === lc(val);
        }
        if (op === "!=") {
          if (String(val).indexOf("*") >= 0) return !wildToRe(val).test(String(rv));
          return lc(rv) !== lc(val);
        }
        if (isNumeric(rv) && isNumeric(val)) {
          var a = num(rv), b = num(val);
          return op === ">" ? a > b : op === "<" ? a < b : op === ">=" ? a >= b : a <= b;
        }
        return false;
      };
    }
    return neg ? function (row) { return !p(row); } : p;
  }

  // ---------- expression tokenizer (eval / where) ----------
  function tokenizeExpr(s) {
    var toks = [], i = 0, n = s.length;
    while (i < n) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"') { var j = i + 1; while (j < n && s[j] !== '"') j++; toks.push({ t: "str", v: s.slice(i + 1, j) }); i = j + 1; continue; }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1]))) {
        var k = i; while (k < n && /[0-9.]/.test(s[k])) k++; toks.push({ t: "num", v: Number(s.slice(i, k)) }); i = k; continue;
      }
      var two = s.substr(i, 2);
      if (two === "==" || two === "!=" || two === ">=" || two === "<=" || two === "&&" || two === "||") { toks.push({ t: "op", v: two }); i += 2; continue; }
      if ("+-*/.()<>,".indexOf(c) >= 0) { toks.push({ t: c === "(" ? "lp" : c === ")" ? "rp" : c === "," ? "comma" : "op", v: c }); i++; continue; }
      if (c === "=") { toks.push({ t: "op", v: "=" }); i++; continue; }
      // identifier / field / function / keyword
      var m = /^[A-Za-z_][A-Za-z0-9_.:]*/.exec(s.slice(i));
      if (m) { toks.push({ t: "word", v: m[0] }); i += m[0].length; continue; }
      i++; // skip unknown
    }
    return toks;
  }

  // recursive descent parser -> AST
  function parseExpr(toks) {
    var pos = 0;
    function peek() { return toks[pos]; }
    function eat() { return toks[pos++]; }
    function expect(v) { var t = eat(); if (!t || t.v !== v) throw new Error("expected " + v); }
    function parseOr() { var l = parseAnd(); while (peek() && (peek().v === "OR" || peek().v === "||")) { eat(); l = { k: "or", l: l, r: parseAnd() }; } return l; }
    function parseAnd() { var l = parseNot(); while (peek() && (peek().v === "AND" || peek().v === "&&")) { eat(); l = { k: "and", l: l, r: parseNot() }; } return l; }
    function parseNot() { if (peek() && (peek().v === "NOT" || peek().v === "not")) { eat(); return { k: "not", e: parseNot() }; } return parseCmp(); }
    function parseCmp() {
      var l = parseAdd();
      if (peek() && peek().t === "op" && ["=", "==", "!=", "<", ">", "<=", ">="].indexOf(peek().v) >= 0) {
        var op = eat().v; var r = parseAdd(); return { k: "cmp", op: op, l: l, r: r };
      }
      return l;
    }
    function parseAdd() { var l = parseMul(); while (peek() && peek().t === "op" && ["+", "-", "."].indexOf(peek().v) >= 0) { var op = eat().v; l = { k: "bin", op: op, l: l, r: parseMul() }; } return l; }
    function parseMul() { var l = parseUnary(); while (peek() && peek().t === "op" && ["*", "/"].indexOf(peek().v) >= 0) { var op = eat().v; l = { k: "bin", op: op, l: l, r: parseUnary() }; } return l; }
    function parseUnary() { if (peek() && peek().t === "op" && peek().v === "-") { eat(); return { k: "neg", e: parseUnary() }; } return parsePrimary(); }
    function parsePrimary() {
      var t = peek();
      if (!t) throw new Error("unexpected end");
      if (t.t === "lp") { eat(); var e = parseOr(); expect(")"); return e; }
      if (t.t === "num") { eat(); return { k: "num", v: t.v }; }
      if (t.t === "str") { eat(); return { k: "str", v: t.v }; }
      if (t.t === "word") {
        eat();
        if (peek() && peek().t === "lp") {
          eat(); var args = [];
          if (peek() && peek().t !== "rp") { args.push(parseOr()); while (peek() && peek().t === "comma") { eat(); args.push(parseOr()); } }
          expect(")"); return { k: "call", name: t.v.toLowerCase(), args: args };
        }
        if (t.v === "true") return { k: "num", v: 1 };
        if (t.v === "false") return { k: "num", v: 0 };
        return { k: "field", v: t.v };
      }
      throw new Error("unexpected token " + t.v);
    }
    var ast = parseOr();
    return ast;
  }

  function evalAst(ast, row) {
    switch (ast.k) {
      case "num": return ast.v;
      case "str": return ast.v;
      case "field": { var v = row[ast.v]; return v === undefined ? null : v; }
      case "neg": return -num(evalAst(ast.e, row));
      case "not": return truthy(evalAst(ast.e, row)) ? 0 : 1;
      case "and": return (truthy(evalAst(ast.l, row)) && truthy(evalAst(ast.r, row))) ? 1 : 0;
      case "or": return (truthy(evalAst(ast.l, row)) || truthy(evalAst(ast.r, row))) ? 1 : 0;
      case "bin": {
        var a = evalAst(ast.l, row), b = evalAst(ast.r, row);
        if (ast.op === ".") return String(a == null ? "" : a) + String(b == null ? "" : b);
        a = num(a); b = num(b);
        return ast.op === "+" ? a + b : ast.op === "-" ? a - b : ast.op === "*" ? a * b : a / b;
      }
      case "cmp": {
        var l = evalAst(ast.l, row), r = evalAst(ast.r, row), op = ast.op === "==" ? "=" : ast.op;
        if (isNumeric(l) && isNumeric(r)) {
          var x = num(l), y = num(r);
          return (op === "=" ? x === y : op === "!=" ? x !== y : op === ">" ? x > y : op === "<" ? x < y : op === ">=" ? x >= y : x <= y) ? 1 : 0;
        }
        return (op === "=" ? lc(l) === lc(r) : op === "!=" ? lc(l) !== lc(r) : false) ? 1 : 0;
      }
      case "call": return callFn(ast.name, ast.args, row);
    }
    return null;
  }
  function truthy(v) { return !(v === 0 || v === "" || v === null || v === undefined || v === "0" || v === false); }
  function callFn(name, args, row) {
    var a = args.map(function (x) { return evalAst(x, row); });
    switch (name) {
      case "round": return a.length > 1 ? Number(num(a[0]).toFixed(a[1])) : Math.round(num(a[0]));
      case "len": return String(a[0] == null ? "" : a[0]).length;
      case "lower": return lc(a[0]);
      case "upper": return String(a[0] == null ? "" : a[0]).toUpperCase();
      case "tonumber": return isNumeric(a[0]) ? num(a[0]) : null;
      case "if": return truthy(a[0]) ? a[1] : a[2];
      case "isnotnull": return (a[0] !== null && a[0] !== undefined && a[0] !== "") ? 1 : 0;
      case "isnull": return (a[0] === null || a[0] === undefined || a[0] === "") ? 1 : 0;
      case "coalesce": for (var i = 0; i < a.length; i++) if (a[i] !== null && a[i] !== undefined && a[i] !== "") return a[i]; return null;
      case "like": { var pat = String(a[1]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, "."); return new RegExp("^" + pat + "$", "i").test(String(a[0])) ? 1 : 0; }
      case "min": return Math.min.apply(null, a.map(num));
      case "max": return Math.max.apply(null, a.map(num));
    }
    return null;
  }

  // ---------- commands ----------
  function cmdStats(args, rows) {
    // parse "func(field) [as name] ..." until "by"
    var byFields = [], aggs = [], i = 0;
    var byIdx = args.findIndex(function (t) { return t.toLowerCase() === "by"; });
    var aggToks = byIdx >= 0 ? args.slice(0, byIdx) : args.slice();
    if (byIdx >= 0) byFields = args.slice(byIdx + 1).join(" ").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    // join then re-split agg expressions by spaces but keep func(...) intact
    var joined = aggToks.join(" ");
    var parts = joined.match(/[a-zA-Z]+\([^)]*\)(\s+as\s+\w+)?|count(\s+as\s+\w+)?/gi) || [];
    parts.forEach(function (pt) {
      var m = /^([a-zA-Z]+)\(([^)]*)\)(?:\s+as\s+(\w+))?$/i.exec(pt.trim());
      if (m) { aggs.push({ fn: m[1].toLowerCase(), field: m[2].trim(), as: m[3] || (m[1].toLowerCase() + "(" + m[2].trim() + ")") }); return; }
      var c = /^count(?:\s+as\s+(\w+))?$/i.exec(pt.trim());
      if (c) aggs.push({ fn: "count", field: "", as: c[1] || "count" });
    });
    if (!aggs.length) aggs.push({ fn: "count", field: "", as: "count" });
    var groups = {};
    rows.forEach(function (r) {
      var key = byFields.map(function (f) { return r[f] == null ? "" : r[f]; }).join("\u0001");
      if (!groups[key]) { groups[key] = { rows: [], keyvals: byFields.map(function (f) { return r[f]; }) }; }
      groups[key].rows.push(r);
    });
    var out = Object.keys(groups).map(function (k) {
      var g = groups[k], o = {};
      byFields.forEach(function (f, idx) { o[f] = g.keyvals[idx]; });
      aggs.forEach(function (ag) {
        var vals = g.rows.map(function (r) { return r[ag.field]; }).filter(function (v) { return v !== undefined && v !== null && v !== ""; });
        if (ag.fn === "count") o[ag.as] = g.rows.length;
        else if (ag.fn === "dc") o[ag.as] = new Set(vals.map(String)).size;
        else if (ag.fn === "sum") o[ag.as] = vals.reduce(function (s, v) { return s + num(v); }, 0);
        else if (ag.fn === "avg") o[ag.as] = vals.length ? Number((vals.reduce(function (s, v) { return s + num(v); }, 0) / vals.length).toFixed(2)) : 0;
        else if (ag.fn === "min") o[ag.as] = vals.length ? Math.min.apply(null, vals.map(num)) : null;
        else if (ag.fn === "max") o[ag.as] = vals.length ? Math.max.apply(null, vals.map(num)) : null;
        else if (ag.fn === "values") o[ag.as] = Array.from(new Set(vals.map(String))).sort().join(" ");
        else if (ag.fn === "list") o[ag.as] = vals.map(String).join(" ");
        else o[ag.as] = g.rows.length;
      });
      return o;
    });
    var cols = byFields.concat(aggs.map(function (a) { return a.as; }));
    return { kind: "stats", columns: cols, rows: out };
  }

  function cmdTimechart(args, rows) {
    var span = 60; // seconds default
    var rest = [];
    args.forEach(function (t) { var m = /^span=(\d+)(s|m|h)?$/i.exec(t); if (m) { var u = (m[2] || "s").toLowerCase(); span = num(m[1]) * (u === "h" ? 3600 : u === "m" ? 60 : 1); } else rest.push(t); });
    // default count
    var buckets = {};
    rows.forEach(function (r) {
      var t = num(r._epoch || 0);
      var b = Math.floor(t / (span * 1000)) * span * 1000;
      buckets[b] = (buckets[b] || 0) + 1;
    });
    var keys = Object.keys(buckets).map(Number).sort(function (a, b) { return a - b; });
    var out = keys.map(function (k) { return { _time: new Date(k).toISOString().slice(11, 19), count: buckets[k] }; });
    return { kind: "chart", columns: ["_time", "count"], rows: out };
  }

  function cmdTop(args, rows, rare) {
    var n = rare ? 10 : 10, field = null;
    args.forEach(function (t) { if (/^\d+$/.test(t)) n = num(t); else if (t.toLowerCase() !== "by") field = field || t; });
    if (!field) return { kind: "stats", columns: ["error"], rows: [{ error: "top/rare needs a field" }] };
    var counts = {};
    rows.forEach(function (r) { var v = r[field] == null ? "" : String(r[field]); counts[v] = (counts[v] || 0) + 1; });
    var total = rows.length || 1;
    var arr = Object.keys(counts).map(function (k) { var o = {}; o[field] = k; o.count = counts[k]; o.percent = Number((counts[k] * 100 / total).toFixed(2)); return o; });
    arr.sort(function (a, b) { return rare ? a.count - b.count : b.count - a.count; });
    return { kind: "stats", columns: [field, "count", "percent"], rows: arr.slice(0, n) };
  }

  function cmdSort(args, rows) {
    var limit = 0, keys = [];
    var joined = args.join(" ").replace(/,/g, " ");
    splitWs(joined).forEach(function (t) {
      if (/^\d+$/.test(t) && !keys.length) { limit = num(t); return; }
      var dir = 1, f = t;
      if (t[0] === "-") { dir = -1; f = t.slice(1); } else if (t[0] === "+") { f = t.slice(1); }
      keys.push({ f: f, dir: dir });
    });
    var out = rows.slice().sort(function (a, b) {
      for (var i = 0; i < keys.length; i++) {
        var f = keys[i].f, av = a[f], bv = b[f], c;
        if (isNumeric(av) && isNumeric(bv)) c = num(av) - num(bv);
        else c = String(av == null ? "" : av).localeCompare(String(bv == null ? "" : bv));
        if (c) return c * keys[i].dir;
      }
      return 0;
    });
    return limit ? out.slice(0, limit) : out;
  }

  function applyCommand(name, argStr, state) {
    var args = splitWs(argStr);
    var rows = state.rows;
    switch (name) {
      case "search": { var pred = buildSearch(args); state.rows = rows.filter(pred); return; }
      case "where": { var ast = parseExpr(tokenizeExpr(argStr)); state.rows = rows.filter(function (r) { return truthy(evalAst(ast, r)); }); return; }
      case "eval": {
        var eq = argStr.indexOf("="); var fname = argStr.slice(0, eq).trim();
        var ast2 = parseExpr(tokenizeExpr(argStr.slice(eq + 1)));
        rows.forEach(function (r) { r[fname] = evalAst(ast2, r); });
        if (state.columns.indexOf(fname) < 0) state.columns.push(fname);
        return;
      }
      case "stats": { var s = cmdStats(args, rows); state.rows = s.rows; state.columns = s.columns; state.kind = "stats"; return; }
      case "timechart": { var t = cmdTimechart(args, rows); state.rows = t.rows; state.columns = t.columns; state.kind = "chart"; return; }
      case "top": { var tp = cmdTop(args, rows, false); state.rows = tp.rows; state.columns = tp.columns; state.kind = "stats"; return; }
      case "rare": { var rr = cmdTop(args, rows, true); state.rows = rr.rows; state.columns = rr.columns; state.kind = "stats"; return; }
      case "table": { var cols = args.join(" ").split(/[\s,]+/).filter(Boolean); state.columns = cols; state.kind = "table"; return; }
      case "fields": {
        var neg = args[0] === "-"; var list = args.join(" ").replace(/^[-+]/, "").split(/[\s,]+/).filter(Boolean);
        if (neg) state.columns = state.columns.filter(function (c) { return list.indexOf(c) < 0; });
        else state.columns = list;
        state.kind = state.kind === "events" ? "table" : state.kind; return;
      }
      case "rename": {
        // rename a as b, c as d
        var pairs = argStr.split(",");
        pairs.forEach(function (p) { var m = /(\S+)\s+as\s+(\S+)/i.exec(p.trim()); if (m) { rows.forEach(function (r) { if (m[1] in r) { r[m[2]] = r[m[1]]; } }); var ci = state.columns.indexOf(m[1]); if (ci >= 0) state.columns[ci] = m[2]; } });
        return;
      }
      case "sort": { state.rows = cmdSort(args, rows); return; }
      case "dedup": {
        var df = args.join(" ").split(/[\s,]+/).filter(Boolean); var seen = {};
        state.rows = rows.filter(function (r) { var k = df.map(function (f) { return r[f]; }).join("\u0001"); if (seen[k]) return false; seen[k] = 1; return true; });
        return;
      }
      case "head": { var hn = args.length ? num(args[0]) : 10; state.rows = rows.slice(0, hn); return; }
      case "tail": { var tn = args.length ? num(args[0]) : 10; state.rows = rows.slice(-tn); return; }
      case "lookup": {
        // lookup <name> <lookupField> as <eventField> OUTPUT <fields...>
        var name2 = args[0], lf = args[1], evField = lf, out = [];
        var asIdx = args.indexOf("as"), outIdx = args.map(function (a) { return a.toUpperCase(); }).indexOf("OUTPUT");
        if (asIdx >= 0) evField = args[asIdx + 1];
        if (outIdx >= 0) out = args.slice(outIdx + 1);
        var tbl = LOOKUPS[name2] || {};
        rows.forEach(function (r) {
          var key = String(r[evField]); var match = tbl[key];
          if (match) { (out.length ? out : Object.keys(match)).forEach(function (k) { r[k] = match[k]; if (state.columns.indexOf(k) < 0) state.columns.push(k); }); }
        });
        return;
      }
      default: throw new Error("unknown command: " + name);
    }
  }

  function run(query, sourceRows) {
    try {
      var trimmed = String(query || "").trim();
      var leading = trimmed.charAt(0) === "|";
      var segs = splitPipes(query);
      if (!segs.length) return { kind: "events", columns: [], rows: [], error: null };
      var rows, cmdStart;
      if (leading) {
        rows = sourceRows.map(function (r) { return Object.assign({}, r); });
        cmdStart = 0;
      } else {
        var first = segs[0];
        if (/^search\b/i.test(first)) first = first.replace(/^search\s+/i, "");
        var pred = buildSearch(splitWs(first));
        rows = sourceRows.map(function (r) { return Object.assign({}, r); }).filter(pred);
        cmdStart = 1;
      }
      var state = { rows: rows, columns: ["_time", "host", "sourcetype", "_raw"], kind: "events" };
      for (var i = cmdStart; i < segs.length; i++) {
        var sp = segs[i].indexOf(" ");
        var name = (sp < 0 ? segs[i] : segs[i].slice(0, sp)).toLowerCase();
        var argStr = sp < 0 ? "" : segs[i].slice(sp + 1).trim();
        applyCommand(name, argStr, state);
      }
      return { kind: state.kind, columns: state.columns, rows: state.rows, error: null };
    } catch (e) {
      return { kind: "events", columns: [], rows: [], error: e.message };
    }
  }

  SOC.spl = {
    run: run,
    setLookup: function (name, table) { LOOKUPS[name] = table; },
    _internals: { run: run }
  };
})();
