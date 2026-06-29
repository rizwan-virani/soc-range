/* SOC Range :: sigma.js
 * A teaching subset of the Sigma detection rule language, evaluated fully in
 * the browser. No server, no dependencies.
 *
 * Supported:
 *   title:        (optional)
 *   logsource:    (optional)  product / service / category  -> matched against 'source'
 *   detection:
 *     <selection-name>:
 *       <field>: value                # equals (case-insensitive)
 *       <field>: [a, b]               # list = OR
 *       <field|contains>: text        # modifiers: contains, startswith, endswith, re, gt, gte, lt, lte
 *       <field>:                      # block list
 *         - a
 *         - b
 *     condition: selection and not filter   # and / or / not / parens
 *                                           # "1 of sel*" / "all of sel*" / "1 of them" / "all of them"
 *
 * API:
 *   SOC.sigma.parse(text) -> { ok, rule } | { ok:false, error }
 *   SOC.sigma.match(rule, record) -> boolean
 *   SOC.sigma.evaluate(rule, records, isTarget) -> stats
 */
(function () {
  var SOC = self.SOC || (self.SOC = {});

  // ---------- parser ----------
  function stripComment(s) {
    // remove # comments not inside quotes
    var inq = null, out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (inq) { out += c; if (c === inq) inq = null; }
      else if (c === '"' || c === "'") { inq = c; out += c; }
      else if (c === "#") break;
      else out += c;
    }
    return out;
  }
  function unquote(v) {
    v = v.trim();
    if ((v[0] === '"' && v.slice(-1) === '"') || (v[0] === "'" && v.slice(-1) === "'")) return v.slice(1, -1);
    return v;
  }
  function parseInline(v) {
    v = v.trim();
    if (v[0] === "[" && v.slice(-1) === "]") {
      return v.slice(1, -1).split(",").map(function (x) { return unquote(x); }).filter(function (x) { return x !== ""; });
    }
    return unquote(v);
  }
  function indent(line) { var m = line.match(/^( *)/); return m[1].length; }

  function parse(text) {
    try {
      var raw = String(text || "").replace(/\t/g, "  ").split(/\r?\n/);
      var lines = [];
      raw.forEach(function (l) { var s = stripComment(l).replace(/\s+$/, ""); if (s.trim() !== "") lines.push(s); });
      var rule = { title: "", logsource: {}, detection: {}, condition: "" };
      var i = 0;
      while (i < lines.length) {
        var line = lines[i], ind = indent(line), t = line.trim();
        if (ind === 0 && t.indexOf(":") >= 0) {
          var key = t.slice(0, t.indexOf(":")).trim();
          var rest = t.slice(t.indexOf(":") + 1).trim();
          if (key === "title") { rule.title = unquote(rest); i++; }
          else if (key === "logsource") {
            i++;
            while (i < lines.length && indent(lines[i]) >= 2) {
              var lt = lines[i].trim(), lk = lt.slice(0, lt.indexOf(":")).trim(), lv = lt.slice(lt.indexOf(":") + 1).trim();
              rule.logsource[lk] = unquote(lv); i++;
            }
          } else if (key === "detection") {
            i++;
            i = parseDetection(lines, i, rule);
          } else { i++; }
        } else { i++; }
      }
      if (!rule.condition) return { ok: false, error: "Missing a condition under detection." };
      if (Object.keys(rule.detection).length === 0) return { ok: false, error: "No selection defined under detection." };
      return { ok: true, rule: rule };
    } catch (e) {
      return { ok: false, error: "Could not parse the rule: " + e.message };
    }
  }

  function parseDetection(lines, i, rule) {
    while (i < lines.length && indent(lines[i]) >= 2) {
      var line = lines[i], ind = indent(line), t = line.trim();
      if (ind !== 2) { i++; continue; }
      var name = t.slice(0, t.indexOf(":")).trim();
      var after = t.slice(t.indexOf(":") + 1).trim();
      if (name === "condition") { rule.condition = after; i++; continue; }
      // a selection block
      var sel = {};
      i++;
      while (i < lines.length && indent(lines[i]) >= 4) {
        var fl = lines[i].trim();
        var fk = fl.slice(0, fl.indexOf(":")).trim();
        var fv = fl.slice(fl.indexOf(":") + 1).trim();
        if (fv === "") {
          // block list follows
          var list = []; i++;
          while (i < lines.length && indent(lines[i]) >= 6 && lines[i].trim()[0] === "-") {
            list.push(unquote(lines[i].trim().slice(1).trim())); i++;
          }
          sel[fk] = list;
        } else {
          sel[fk] = parseInline(fv); i++;
        }
      }
      rule.detection[name] = sel;
    }
    return i;
  }

  // ---------- matcher ----------
  function getField(rec, field) {
    if (rec[field] !== undefined) return rec[field];
    // case-insensitive fallback
    var lf = field.toLowerCase();
    for (var k in rec) if (rec.hasOwnProperty(k) && k.toLowerCase() === lf) return rec[k];
    // friendly aliases
    var alias = { message: "message", msg: "message", logsource: "source", product: "source" };
    if (alias[lf] && rec[alias[lf]] !== undefined) return rec[alias[lf]];
    return undefined;
  }
  function cmp(val, op, target) {
    if (val === undefined || val === null) return false;
    var sv = String(val).toLowerCase(), st = String(target).toLowerCase();
    switch (op) {
      case "contains": return sv.indexOf(st) >= 0;
      case "startswith": return sv.indexOf(st) === 0;
      case "endswith": return sv.lastIndexOf(st) === sv.length - st.length && sv.length >= st.length;
      case "re": try { return new RegExp(target, "i").test(String(val)); } catch (e) { return false; }
      case "gt": return parseFloat(val) > parseFloat(target);
      case "gte": return parseFloat(val) >= parseFloat(target);
      case "lt": return parseFloat(val) < parseFloat(target);
      case "lte": return parseFloat(val) <= parseFloat(target);
      default: return sv === st || parseFloat(val) === parseFloat(target);
    }
  }
  function fieldMatch(rec, key, value) {
    var parts = key.split("|"), field = parts[0], op = parts[1] || "eq";
    var val = getField(rec, field);
    var targets = Array.isArray(value) ? value : [value];
    for (var i = 0; i < targets.length; i++) if (cmp(val, op, targets[i])) return true;
    return false;
  }
  function selectionMatch(rec, sel) {
    for (var key in sel) if (sel.hasOwnProperty(key)) { if (!fieldMatch(rec, key, sel[key])) return false; }
    return true;
  }

  // ---------- condition evaluation ----------
  function evalCondition(cond, sels, selResults) {
    var toks = cond.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/);
    var pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function names(pattern) {
      var keys = Object.keys(sels);
      if (pattern === "them") return keys;
      var base = pattern.replace(/\*$/, "");
      return keys.filter(function (k) { return pattern.slice(-1) === "*" ? k.indexOf(base) === 0 : k === pattern; });
    }
    var pattern;
    function P_or() { var v = P_and(); while (peek() && peek().toLowerCase() === "or") { next(); var r = P_and(); v = v || r; } return v; }
    function P_and() { var v = P_not(); while (peek() && peek().toLowerCase() === "and") { next(); var r = P_not(); v = v && r; } return v; }
    function P_not() { if (peek() && peek().toLowerCase() === "not") { next(); return !P_not(); } return P_atom(); }
    function P_atom() {
      var t = peek();
      if (t === "(") { next(); var v = P_or(); if (peek() === ")") next(); return v; }
      // quantifier: "1 of sel*" / "all of sel*"
      if (t && (t === "1" || t.toLowerCase() === "all")) {
        var q = next();
        if (peek() && peek().toLowerCase() === "of") {
          next(); var pat = next();
          var ns = names(pat);
          var hits = ns.filter(function (n) { return selResults[n]; }).length;
          return q.toLowerCase() === "all" ? (ns.length > 0 && hits === ns.length) : (hits >= 1);
        }
        return false;
      }
      var name = next();
      return !!selResults[name];
    }
    pos = 0;
    return P_or();
  }

  function match(rule, rec) {
    var selResults = {};
    for (var name in rule.detection) if (rule.detection.hasOwnProperty(name)) {
      // logsource as an implicit pre-filter is folded into selections via 'source'
      selResults[name] = selectionMatch(rec, rule.detection[name]);
    }
    // apply logsource product/service/category if provided
    if (rule.logsource) {
      var want = rule.logsource.product || rule.logsource.service || rule.logsource.category;
      if (want && String(rec.source).toLowerCase() !== String(want).toLowerCase()) return false;
    }
    return evalCondition(rule.condition, rule.detection, selResults);
  }

  function evaluate(rule, records, isTarget) {
    var matched = records.filter(function (r) { return match(rule, r); });
    var targets = records.filter(isTarget);
    var tp = matched.filter(isTarget).length;
    var fp = matched.filter(function (r) { return r._truth === "benign"; }).length;
    var fn = targets.length - tp;
    var precision = (tp + fp) ? tp / (tp + fp) : 0;
    var recall = targets.length ? tp / targets.length : 0;
    return { matched: matched, tp: tp, fp: fp, fn: fn, targets: targets.length, total: records.length, precision: precision, recall: recall };
  }

  SOC.sigma = { parse: parse, match: match, evaluate: evaluate };
})();
