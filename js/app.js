/* SOC Range :: app.js  ::  workstation controller */
(function () {
  "use strict";
  var SOC = self.SOC;
  var S = SOC.scenarios, ST = SOC.state, MITRE = S.MITRE;

  // ---------- tiny DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function fmtClock(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function sevClass(s) { return "s-" + s; }

  // ---------- session ----------
  var params = new URLSearchParams(location.search);
  var scenarioId = params.get("scenario");
  var analyst = (params.get("analyst") || localStorage.getItem("soc.analyst") || "").trim();
  if (analyst) localStorage.setItem("soc.analyst", analyst);

  var scn = scenarioId ? S.byId[scenarioId] : null;
  var entities = scn ? SOC.entities.buildEntities(scn.seed) : null;
  // GRC (assessment) shifts have no live incident, so there is no SIEM feed to
  // stream. Everything else (playbook, questions, grading) works the same.
  // Declared before boot() runs so every renderer sees the right mode.
  var isGrc = !!scn && scn.kind === "grc";

  // resolve an entity ref like "ip.c2" to its value
  function R(ref) { return entities ? (entities[ref] != null ? entities[ref] : ref) : ref; }

  // ---------- runtime state ----------
  var RING_CAP = 4000, SHOW_CAP = 350;
  var logs = [];                 // ring buffer (oldest..newest)
  var alerts = [];               // derived alerts
  var alertIndex = {};           // key -> alert
  var metrics = { events: 0, crit: 0 };
  var shiftSec = 0, simSec = 0, ratePerSec = 0, rateAccum = 0;
  var dirty = false;
  // SIEM feed scroll behavior: follow the live tail, or pause to review.
  var follow = true;             // true = stay pinned to newest; false = paused for review
  var lastSeenEvents = 0;        // metrics.events count at the last paint (for the "new" badge)
  var filters = { sources: {}, q: "" };
  SOC.logEngine && SOC.logEngine.SOURCES && SOC.logEngine.SOURCES.forEach(function (s) { filters.sources[s] = true; });

  var state = scn ? (ST.load(analyst || "anon", scn.id) || ST.freshState(analyst || "anon", scn)) : null;

  // ---------- boot ----------
  if (!scn) { bootEmpty(); }
  else { boot(); }

  function bootEmpty() {
    $("panel-brief").innerHTML =
      '<div class="card"><h1 class="hud">No shift loaded</h1>' +
      '<p style="color:var(--ink-dim)">Pick a scenario from the launcher to begin a shift.</p>' +
      '<a class="btn primary" href="index.html" style="margin-top:10px;display:inline-block">Open Launcher</a></div>';
    renderAcademy();
  }

  function boot() {
    $("cmdScnTitle").textContent = scn.title;
    $("cmdScnSub").textContent = scn.id + " · Tier " + scn.tier + " · " + scn.categories.join(", ");
    $("opsSeed").textContent = scn.seed;
    $("opsAnalyst").textContent = analyst || "anon";
    document.title = "SOC Range :: " + scn.title;

    renderBrief(); renderSiem(); renderNet(); renderInc(); renderIntel(); renderReport(); renderAcademy();
    wireNav(); wireButtons();

    startWorker();
    setInterval(tickClock, 1000);
    setInterval(flush, 450);
    listenInjects();

    // Publish live context for the AI tutor widget.
    SOC.tutorState = function () {
      return {
        pinned: state.pinned.length,
        playbookAnswered: Object.keys(state.playbook).length,
        alerts: alerts.length,
        hintsUsed: state.hintsUsed
      };
    };
  }

  // ---------- worker / feed ----------
  var worker;
  function startWorker() {
    if (isGrc) { $("opsState").textContent = "ASSESSMENT SHIFT — NO LIVE FEED"; return; }
    try {
      worker = new Worker("js/log-worker.js");
      worker.onmessage = function (m) {
        var d = m.data;
        if (d.kind === "batch") onBatch(d);
      };
      worker.postMessage({ cmd: "start", scenarioId: scn.id, speed: 850 });
    } catch (e) {
      $("opsState").textContent = "FEED ERROR (run via http server)";
    }
  }

  function onBatch(d) {
    simSec = d.simT;
    for (var i = 0; i < d.logs.length; i++) ingest(d.logs[i]);
    rateAccum += d.logs.length;
    dirty = true;
  }

  function ingest(log) {
    logs.push(log);
    if (logs.length > RING_CAP) logs.splice(0, logs.length - RING_CAP);
    metrics.events += 1;
    if (log.severity === "critical") metrics.crit += 1;
    if (log.origin === "scenario" && (log.severity === "high" || log.severity === "critical")) raiseAlert(log);
  }

  function raiseAlert(log) {
    var key = (log.mitre || "x") + "|" + log.severity + "|" + log.source;
    if (alertIndex[key]) { alertIndex[key].count += 1; alertIndex[key].last = log; return; }
    var a = { id: "ALR-" + (alerts.length + 1), title: log.msg, severity: log.severity,
      mitre: log.mitre, source: log.source, count: 1, last: log, ticketed: false };
    alertIndex[key] = a; alerts.unshift(a);
  }

  // throttled DOM flush
  function flush() {
    ratePerSec = rateAccum; rateAccum = 0;
    $("opsRate").textContent = ratePerSec + "/s";
    $("opsSim").textContent = simSec + "s";
    $("mEvents").textContent = metrics.events.toLocaleString();
    $("mCrit").textContent = metrics.crit;
    var open = alerts.filter(function (a) { return !a.ticketed; }).length;
    $("mAlerts").textContent = open;
    setBadge("bSiem", alerts.length);
    setBadge("bInc", state.tickets.length);
    if (dirty) {
      var siemVisible = $("panel-siem") && $("panel-siem").classList.contains("show");
      if (siemVisible) { paintLogs(); paintAlerts(); }
      else { paintAlerts(); } // keep alert feed warm for the badge counts
      dirty = false;
    }
  }
  function setBadge(id, n) { var b = $(id); if (!b) return; if (n > 0) { b.style.display = ""; b.textContent = n; } else b.style.display = "none"; }

  function tickClock() { shiftSec += 1; $("mShift").textContent = fmtClock(shiftSec); }

  // ---------- BRIEFING ----------
  function certTags() {
    if (!SOC.certs) return "";
    var doms = SOC.certs.scenarioCysa(scn.id);
    if (!doms.length) return "";
    var chips = doms.map(function (d) {
      return '<span class="chip" style="cursor:default;color:var(--cyan);border-color:var(--cyan-dim)">' + esc(SOC.certs.domainName(d)) + "</span>";
    }).join(" ");
    return '<div class="eyebrow" style="margin-top:8px">CySA+ V4 domains this shift builds</div><div style="margin-top:6px">' + chips + "</div>";
  }
  function renderBrief() {
    var b = scn.briefing;
    var tactics = b.tactics.map(function (t) { return '<span class="chip tactic">' + esc(t) + "</span>"; }).join(" ");
    var objs = b.objectives.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("");
    $("panel-brief").innerHTML =
      '<div class="phead"><h1>Shift Briefing</h1><p>' + esc(scn.id) + " · Severity " +
      '<span class="txt-' + scn.severity + '">' + scn.severity.toUpperCase() + "</span>" +
      (scn.estMinutes ? ' · Est. time ~' + scn.estMinutes + " min" : "") + "</p></div>" +
      '<div class="card brief">' +
        '<div class="from">From: ' + esc(b.from) + (isGrc ? " · San Jacinto College GRC" : " · BVHN Security") + "</div>" +
        "<h2 class='hud' style='margin:6px 0 0'>" + esc(b.subject) + "</h2>" +
        "<blockquote>" + esc(b.body) + "</blockquote>" +
        (scn.estMinutes ? '<div class="eyebrow" style="margin-top:8px">Estimated time</div><p style="color:var(--ink-dim);margin:4px 0 0">Plan for about ' + scn.estMinutes + " minutes: " + (isGrc ? "work the assessment, then complete the Word deliverables." : "investigate the feed, work the playbook, and complete the Word deliverables.") + "</p>" : "") +
        '<div class="eyebrow" style="margin-top:8px">Objectives</div><ul class="objlist">' + objs + "</ul>" +
        '<div class="eyebrow" style="margin-top:8px">' + (isGrc ? "Frameworks and standards in scope" : "ATT&amp;CK tactics in scope") + '</div><div style="margin-top:6px">' + tactics + "</div>" +
        certTags() +
      "</div>" +
      '<div class="card"><div class="eyebrow">How to work this shift</div>' +
        '<p style="color:var(--ink-dim)">' + (isGrc
          ? "This is an assessment shift, so there is no live SIEM feed. Read the briefing, open the Incident screen to work the assessment steps one at a time, keep your reasoning in the analyst notebook, answer the graded questions, then use the auto-built summary on the Report screen to complete your Word deliverables and submit."
          : "Watch the SIEM feed, pin the events that matter, correlate indicators on the Network and Threat Intel screens, open an incident, work the playbook, then use the auto-built summary on the Report screen to complete your Word deliverables and submit. Use the Analyst Academy any time.") + "</p>" +
        '<button class="btn primary" data-goto="' + (isGrc ? "inc" : "siem") + '">' + (isGrc ? "Open the assessment workflow" : "Open SIEM feed") + "</button></div>" +
      dossierCard() +
      deliverablesCard() +
      libLinks();
  }

  // Assessment materials: concrete artifacts (inventories, findings,
  // questionnaire responses) a scenario gives the student to analyze. The
  // graded steps and the deliverables are meant to be grounded in these.
  function dossierCard() {
    if (!scn.dossier || !scn.dossier.length) return "";
    function tbl(t) {
      var head = "<tr>" + t.headers.map(function (h) { return '<th style="text-align:left;border-bottom:1px solid var(--line);padding:6px 10px;color:var(--ink);font-family:var(--f-hud);font-size:12px;letter-spacing:.04em">' + esc(h) + "</th>"; }).join("") + "</tr>";
      var body = t.rows.map(function (r) { return "<tr>" + r.map(function (c) { return '<td style="border-bottom:1px solid rgba(255,255,255,.06);padding:6px 10px;color:var(--ink-dim);font-size:13px;vertical-align:top">' + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("");
      return '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;margin:8px 0 4px">' + head + body + "</table></div>";
    }
    var items = scn.dossier.map(function (d) {
      var h = '<div class="eyebrow" style="margin-top:14px">' + esc(d.title) + "</div>";
      if (d.intro) h += '<p style="color:var(--ink-dim);margin:4px 0 0">' + esc(d.intro) + "</p>";
      (d.paras || []).forEach(function (x) { h += '<p style="color:var(--ink-dim);margin:6px 0 0">' + esc(x) + "</p>"; });
      if (d.bullets) h += '<ul class="objlist">' + d.bullets.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      if (d.table) h += tbl(d.table);
      return h;
    }).join("");
    return '<div class="card" style="border-color:var(--grc,#a78bfa)"><div class="eyebrow" style="color:var(--grc,#a78bfa)">Assessment materials</div>' +
      '<p style="color:var(--ink-dim);margin:4px 0 8px">The facts you are assessing. Read these closely and look up anything unfamiliar. Your ratings, findings, and recommendations on the next screens must be grounded in this evidence.</p>' +
      items + "</div>";
  }

  function deliverablesCard() {
    // A scenario may name its own deliverables. Otherwise fall back to the
    // default incident set, or the default GRC assessment set for kind "grc".
    var items = scn.deliverables || (isGrc ? [
      ["In-app assessment", "Work the assessment steps and the graded questions on the Incident screen. This produces your Blackboard completion code."],
      ["Assessment report (Word document)", "Download the matching assessment template and complete it in your own words, with your findings, ratings, and recommendations."],
      ["Executive brief (Word document)", "Download the Executive Brief template and write one page summarizing the risk and your recommendation for leadership."],
      ["Recorded presentation video, 5 to 8 minutes", "Required. On camera, present your findings and recommendation to leadership as if briefing the cabinet: what you assessed, the standards you applied, your key findings, and what you recommend. Attach the recording file to your Blackboard submission, not a link."]
    ] : [
      ["In-app investigation and assessment", "Work the SIEM feed, the playbook, and the graded questions. This produces your Blackboard completion code."],
      ["Incident report (Word document)", "Download the Incident Report template and complete it in your own words, with your timeline, scope, indicators, and screenshots from the investigation."],
      ["Root cause and post-mortem (Word documents)", "Download the Root Cause Analysis and Post-Incident Review templates and fill them in with your analysis and supporting screenshots."],
      ["Executive brief (Word document)", "Download the Executive Brief or SITREP template and write one page for leadership."],
      ["Recorded video debrief, 3 to 5 minutes", "On camera, walk through the attack timeline, the root cause, the key indicators, your containment decisions, and the lessons learned. Attach the recording file to your Blackboard submission, not a link."]
    ]);
    return '<div class="card" style="border-color:var(--cyan)"><div class="eyebrow">Required deliverables for this scenario</div>' +
      '<p style="color:var(--ink-dim);margin:4px 0 8px">Download each Word template from the Reference Library, fill it out with your screenshots and notes, then submit the completed documents and your recording in Blackboard with your completion code. The Report screen auto-builds a summary of your findings to start from, but the graded write-ups are the documents you complete. Each template has a filled-out worked example in the Library that shows the standard. Plan for about ' + (scn.estMinutes || 90) + " minutes total.</p>" +
      '<ol class="objlist">' + items.map(function (it) { return "<li><b>" + esc(it[0]) + ".</b> " + esc(it[1]) + "</li>"; }).join("") + "</ol></div>";
  }

  function libLinks() {
    if (!SOC.library) return "";
    var pb = SOC.library.playbookForScenario(scn.id);
    var sop = pb ? '<a class="btn" href="library.html?play=' + pb + '" target="_blank" rel="noopener">Open SOP / Playbook</a>' : "";
    return '<div class="card"><div class="eyebrow">Reference library</div>' +
      '<p style="color:var(--ink-dim)">Pull the standard operating procedure for this incident, grab a Word template for your write-up, or open the NIST shelf.</p>' +
      '<div class="btnrow">' + sop +
      '<a class="btn" href="library.html?tab=templates" target="_blank" rel="noopener">Document templates</a>' +
      '<a class="btn" href="library.html?tab=nist" target="_blank" rel="noopener">NIST publications</a></div></div>';
  }

  // ---------- SIEM ----------
  function renderSiem() {
    if (isGrc) {
      $("panel-siem").innerHTML =
        '<div class="phead"><h1>SIEM Feed</h1><p>No live feed on an assessment shift</p></div>' +
        '<div class="card"><div class="eyebrow">Assessment shift</div>' +
        '<p style="color:var(--ink-dim)">This is a governance, risk, and compliance assessment, not a live incident, so there is no SIEM feed to watch. Your work happens on the <b>Incident</b> screen, where you step through the assessment, and on the <b>Report</b> screen, where you build your write-up. Open the Reference Library for the matching standard and Word template.</p>' +
        '<button class="btn primary" data-goto="inc">Open the assessment workflow</button></div>';
      return;
    }
    var chips = SOC.logEngine.SOURCES.map(function (s) {
      return '<span class="chip on" data-src="' + s + '">' + s.toUpperCase() + "</span>";
    }).join("");
    $("panel-siem").innerHTML =
      '<div class="phead"><h1>SIEM Feed</h1><p>Live event stream · click a row to pin · scroll down to pause and review, the feed keeps collecting</p></div>' +
      '<div class="siemgrid">' +
        "<div><div class='toolbar'>" + chips +
          '<input class="search" id="siemSearch" placeholder="filter: ip, user, host, keyword..." />' +
          '<span class="chip" id="chipScenario">Show suspicious only</span>' +
          '<span class="chip feedstatus live" id="feedStatus" title="Scroll the feed to pause, click to follow the latest">● Live</span></div>' +
          '<div class="logwrap" id="logwrap"></div></div>' +
        '<div><div class="card alertfeed"><div class="eyebrow">Correlated alerts</div><div id="alertList" style="margin-top:8px"></div></div>' +
          '<div class="card"><div class="eyebrow">Pinned evidence</div><div id="pinList" style="margin-top:8px;color:var(--ink-dim);font-size:13px">Nothing pinned yet.</div></div></div>' +
      "</div>";

    $("panel-siem").querySelectorAll(".chip[data-src]").forEach(function (c) {
      c.addEventListener("click", function () {
        var s = c.getAttribute("data-src");
        filters.sources[s] = !filters.sources[s];
        c.classList.toggle("on", filters.sources[s]); resumeLive();
      });
    });
    $("chipScenario").addEventListener("click", function () {
      filters.susOnly = !filters.susOnly; this.classList.toggle("on", filters.susOnly); resumeLive();
    });
    $("siemSearch").addEventListener("input", function () { filters.q = this.value.toLowerCase(); resumeLive(); });
    $("feedStatus").addEventListener("click", function () { if (!follow) resumeLive(); });

    // Auto-pause when the analyst scrolls away from the newest row, resume at the top.
    var wrap = $("logwrap");
    wrap.addEventListener("scroll", function () {
      var atTop = wrap.scrollTop <= 6;
      if (atTop && !follow) resumeLive();
      else if (!atTop && follow) { follow = false; updateFeedStatus(); }
    });
    paintPins();
    updateFeedStatus();
  }

  function resumeLive() { follow = true; paintLogs(true); }

  function updateFeedStatus() {
    var s = $("feedStatus"); if (!s) return;
    if (follow) {
      s.className = "chip feedstatus live";
      s.textContent = "● Live";
    } else {
      var n = Math.max(0, metrics.events - lastSeenEvents);
      s.className = "chip feedstatus paused";
      s.textContent = "❚❚ Paused" + (n ? " · " + n + " new" : "") + " · click to follow";
    }
  }

  function passFilter(l) {
    if (!filters.sources[l.source]) return false;
    if (filters.susOnly && l.truthLabel === "benign") return false;
    if (filters.q) {
      var hay = (l.raw + " " + l.msg + " " + (l.user || "") + " " + (l.host || "") + " " + (l.src_ip || "") + " " + (l.dst_ip || "")).toLowerCase();
      if (hay.indexOf(filters.q) < 0) return false;
    }
    return true;
  }

  function paintLogs(force) {
    var wrap = $("logwrap"); if (!wrap) return;
    // Paused for review: keep collecting, but do not move what the analyst is reading.
    if (!force && !follow) { updateFeedStatus(); return; }
    var frag = document.createDocumentFragment();
    var shown = 0;
    for (var i = logs.length - 1; i >= 0 && shown < SHOW_CAP; i--) {
      var l = logs[i];
      if (!passFilter(l)) continue;
      shown += 1;
      frag.appendChild(logRow(l));
    }
    wrap.innerHTML = "";
    wrap.appendChild(frag);
    if (follow) {
      // jump to newest without the smooth animation, so it does not feel like scrolling
      var sb = wrap.style.scrollBehavior; wrap.style.scrollBehavior = "auto";
      wrap.scrollTop = 0; wrap.style.scrollBehavior = sb;
    }
    lastSeenEvents = metrics.events;
    updateFeedStatus();
  }

  function logRow(l) {
    var row = el("div", "logrow" + (isPinned(l.id) ? " pinned" : ""));
    var rail = el("div", "rail4 " + sevClass(l.severity)); rail.style.background = "var(--" + l.severity + ")";
    var rcol = { info: "var(--info)", low: "var(--low)", medium: "var(--med)", high: "var(--high)", critical: "var(--crit)" }[l.severity];
    rail.style.background = rcol;
    var t = el("div", "lt", new Date(l.ts).toISOString().substr(11, 8));
    var src = el("div", "lsrc", l.source);
    var mtag = l.mitre ? ' <span class="mtag" title="' + (MITRE[l.mitre] ? esc(MITRE[l.mitre].name) : "") + '">[' + l.mitre + "]</span>" : "";
    var msg = el("div", "lmsg", esc(l.msg) + mtag + '<span class="raw">' + esc(l.raw) + "</span>");
    row.appendChild(rail); row.appendChild(t); row.appendChild(src); row.appendChild(msg);
    row.addEventListener("click", function () { togglePin(l, row); });
    return row;
  }

  function paintAlerts() {
    var box = $("alertList"); if (!box) return;
    if (!alerts.length) { box.innerHTML = '<div style="color:var(--ink-faint);font-size:13px">No alerts yet. Stay sharp.</div>'; return; }
    box.innerHTML = "";
    alerts.slice(0, 8).forEach(function (a) {
      var item = el("div", "alertfeed-item item" + (a.severity === "critical" ? " critical" : ""));
      item.className = "item" + (a.severity === "critical" ? " critical" : "");
      var mit = a.mitre ? " · " + a.mitre : "";
      item.innerHTML = '<div class="h"><span>' + esc(a.title.substr(0, 46)) + '</span><span class="txt-' + a.severity + '">' + a.severity.toUpperCase() + "</span></div>" +
        '<div class="b">x' + a.count + " · " + esc(a.source) + mit + "</div>";
      var btn = el("button", "btn ghost", a.ticketed ? "Ticketed" : "Create ticket");
      btn.disabled = a.ticketed;
      btn.addEventListener("click", function () { createTicketFromAlert(a); });
      item.appendChild(btn);
      box.appendChild(item);
    });
  }

  // ---------- pinning ----------
  function isPinned(id) { return state.pinned.indexOf(id) >= 0; }
  function togglePin(l, rowEl) {
    var i = state.pinned.indexOf(l.id);
    if (i >= 0) state.pinned.splice(i, 1);
    else { state.pinned.push(l.id); state.pinnedData = state.pinnedData || {}; }
    state.pinnedData = state.pinnedData || {};
    state.pinnedData[l.id] = { msg: l.msg, raw: l.raw, mitre: l.mitre, sev: l.severity };
    persist();
    // Update just the clicked row so pinning never scrolls or rebuilds the feed.
    if (rowEl) rowEl.classList.toggle("pinned", isPinned(l.id));
    else paintLogs(true);
    paintPins();
  }
  function paintPins() {
    var box = $("pinList"); if (!box) return;
    if (!state.pinned.length) { box.innerHTML = "Nothing pinned yet."; return; }
    box.innerHTML = "";
    state.pinned.slice(-12).forEach(function (id) {
      var d = (state.pinnedData || {})[id] || {};
      var row = el("div", "mono", '<span class="sev s-' + (d.sev || "low") + '"></span> ' + esc((d.msg || id).substr(0, 60)));
      row.style.cssText = "font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)";
      box.appendChild(row);
    });
  }

  // ---------- NETWORK / threat map ----------
  var mapAnim;
  function renderNet() {
    $("panel-net").innerHTML =
      '<div class="phead"><h1>Network Monitor</h1><p>Live global threat map · correlated to current indicators</p></div>' +
      '<div class="mapwrap"><div class="maplegend">' +
        '<span><span class="sev s-critical"></span> attack</span>' +
        '<span><span class="sev s-high"></span> exfil</span>' +
        '<span><span class="sev s-low"></span> home</span></div>' +
        '<canvas id="threatmap"></canvas></div>' +
      '<div class="grid3" style="margin-top:12px">' +
        '<div class="kpi"><div class="v" id="netArcs">0</div><div class="k">Active hostile arcs</div></div>' +
        '<div class="kpi alert"><div class="v" id="netExt">0</div><div class="k">External talkers</div></div>' +
        '<div class="kpi"><div class="v" id="netHome">Houston</div><div class="k">Home node</div></div>' +
      "</div>" +
      '<div class="card" style="margin-top:12px"><div class="eyebrow">Hostile flows</div><div id="flowList" style="margin-top:8px"></div></div>';
    setupMap();
  }

  function hostileFlows() {
    // derive arcs from this scenario's IP IOCs that carry geo
    var flows = [];
    (scn.iocs || []).forEach(function (i) {
      if (i.type !== "ip") return;
      var geoName = (i.ref === "ip.exfil") ? R("geo.adversary2") : R("geo.adversary");
      var g = SOC.entities.GEO[geoName];
      if (!g) return;
      flows.push({ kind: i.ref.indexOf("exfil") >= 0 ? "exfil" : "attack",
        ip: R(i.ref), geo: geoName, lat: g.lat, lon: g.lon, rep: i.reputation });
    });
    return flows;
  }

  function setupMap() {
    var cv = $("threatmap"); if (!cv) return;
    var flows = hostileFlows();
    $("netArcs").textContent = flows.length;
    $("netExt").textContent = flows.length + SOC.entities.BENIGN_EXTERNAL.length;
    $("flowList").innerHTML = flows.map(function (f) {
      return '<div class="mono" style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--line)">' +
        '<span class="sev s-' + (f.kind === "exfil" ? "high" : "critical") + '"></span> ' +
        esc(f.ip) + " → Houston · " + esc(f.geo) + ' · <span class="rep ' + f.rep + '">' + f.rep + "</span></div>";
    }).join("") || '<span style="color:var(--ink-faint)">No hostile flows in this scenario.</span>';

    var ctx = cv.getContext("2d");
    function size() { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; }
    size(); window.addEventListener("resize", size);
    var home = SOC.entities.HOME_GEO;
    function proj(lat, lon) { return { x: (lon + 180) / 360 * cv.width, y: (90 - lat) / 180 * cv.height }; }
    var t0 = performance.now();
    function draw(now) {
      var W = cv.width, H = cv.height, t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // graticule
      ctx.strokeStyle = "rgba(53,213,230,0.07)"; ctx.lineWidth = 1;
      for (var gx = 0; gx <= 360; gx += 30) { var x = gx / 360 * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var gy = 0; gy <= 180; gy += 30) { var y = gy / 180 * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      var hp = proj(home.lat, home.lon);
      // home node
      node(ctx, hp.x, hp.y, "#46d18a", "HOUSTON / SOC", t, true);
      flows.forEach(function (f, idx) {
        var p = proj(f.lat, f.lon);
        var col = f.kind === "exfil" ? "#fb8b3c" : "#fb5071";
        arc(ctx, p.x, p.y, hp.x, hp.y, col, t + idx * 0.6);
        node(ctx, p.x, p.y, col, f.geo.toUpperCase(), t, false);
      });
      mapAnim = requestAnimationFrame(draw);
    }
    cancelAnimationFrame(mapAnim);
    mapAnim = requestAnimationFrame(draw);
  }
  function node(ctx, x, y, col, label, t, home) {
    var pulse = home ? (1 + 0.4 * Math.sin(t * 2)) : 1;
    ctx.beginPath(); ctx.arc(x, y, 4 * devicePixelRatio * pulse, 0, 7); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 10 * devicePixelRatio * pulse, 0, 7); ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(231,238,245,0.7)"; ctx.font = (10 * devicePixelRatio) + "px 'IBM Plex Mono', monospace";
    ctx.fillText(label, x + 8 * devicePixelRatio, y - 6 * devicePixelRatio);
  }
  function arc(ctx, x1, y1, x2, y2, col, t) {
    var mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.22 - 30;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4 * devicePixelRatio; ctx.stroke(); ctx.globalAlpha = 1;
    // moving pulse
    var p = (t * 0.4) % 1;
    var bx = (1 - p) * (1 - p) * x1 + 2 * (1 - p) * p * mx + p * p * x2;
    var by = (1 - p) * (1 - p) * y1 + 2 * (1 - p) * p * my + p * p * y2;
    ctx.beginPath(); ctx.arc(bx, by, 3 * devicePixelRatio, 0, 7); ctx.fillStyle = col; ctx.fill();
  }

  // ---------- INCIDENTS ----------
  function renderInc() {
    $("panel-inc").innerHTML =
      '<div class="phead"><h1>' + (isGrc ? "Assessment Workflow" : "Incident Response") + "</h1><p>" +
        (isGrc ? "Open the assessment, work each step, document your findings" : "Open incidents, run the playbook, document remediation") + "</p></div>" +
      '<div class="btnrow" style="margin-bottom:12px"><button class="btn primary" id="newTicket">' + (isGrc ? "Start assessment" : "New incident") + "</button></div>" +
      '<div id="ticketList"></div>';
    $("newTicket").addEventListener("click", function () { newTicket(isGrc ? scn.title : "Manual incident"); });
    paintTickets();
  }
  function newTicket(title) {
    var t = { id: "INC-" + String(entities.ticketSeed + state.tickets.length), title: title || scn.title,
      severity: scn.severity, status: "open", createdAt: Date.now(), playbook: {}, remediation: [] };
    state.tickets.push(t); persist(); paintTickets(); flush();
    return t;
  }
  function createTicketFromAlert(a) {
    a.ticketed = true;
    var t = newTicket(a.title);
    t.mitre = a.mitre; t.severity = a.severity;
    toast("Incident " + t.id + " created from alert");
    paintAlerts();
    gotoPanel("inc");
  }
  var STATUSES = ["open", "investigating", "contained", "eradicated", "recovered", "closed"];
  function paintTickets() {
    var box = $("ticketList"); if (!box) return;
    if (!state.tickets.length) { box.innerHTML = '<div class="card" style="color:var(--ink-dim)">' + (isGrc ? "No assessment started yet. Click Start assessment to begin working the steps." : "No incidents yet. Create one from a SIEM alert or open a manual incident.") + "</div>"; return; }
    box.innerHTML = "";
    state.tickets.forEach(function (t, ti) {
      var card = el("div", "ticket");
      var statusSel = STATUSES.map(function (s) { return '<option' + (t.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("");
      card.innerHTML =
        '<div class="th"><div><span class="id">' + esc(t.id) + '</span><div class="hud" style="font-size:17px">' + esc(t.title) + "</div></div>" +
        '<div><span class="statuspill txt-' + t.severity + '">' + t.severity.toUpperCase() + '</span> ' +
        '<select class="btn" data-ti="' + ti + '" style="margin-left:6px">' + statusSel + "</select></div></div>";
      // playbook
      var pb = el("div");
      pb.appendChild(el("div", "eyebrow", isGrc ? "Assessment steps" : "Response playbook")); pb.firstChild.style.marginTop = "10px";
      scn.playbook.phases.forEach(function (ph) {
        pb.appendChild(el("div", "eyebrow", ph.phase));
        ph.steps.forEach(function (step) {
          pb.appendChild(playbookStep(step));
        });
      });
      card.appendChild(pb);
      // remediation + notes
      var notes = el("div");
      notes.innerHTML = '<div class="eyebrow" style="margin-top:12px">Analyst notebook (markdown)</div>';
      var ta = el("textarea", "notes"); ta.value = state.notes || "";
      ta.placeholder = "Document what you see, what you did, and why. This feeds your report.";
      ta.addEventListener("input", function () { state.notes = ta.value; persist(); });
      notes.appendChild(ta);
      card.appendChild(notes);
      box.appendChild(card);

      card.querySelector("select[data-ti]").addEventListener("change", function () {
        t.status = this.value; persist(); recordTimeline("Set " + t.id + " status to " + t.value); paintTickets();
      });
    });
  }
  function playbookStep(step) {
    var wrap = el("div", "pbstep");
    wrap.appendChild(el("div", "q", esc(step.prompt)));
    var chosen = state.playbook[step.id];
    step.options.forEach(function (opt, oi) {
      var b = el("button", "opt", esc(opt));
      if (chosen != null) {
        if (oi === step.correct) b.classList.add("correct");
        else if (oi === chosen) b.classList.add("wrong");
      }
      b.addEventListener("click", function () {
        state.playbook[step.id] = oi; persist();
        recordTimeline("Playbook " + step.id + ": chose option " + (oi + 1));
        paintTickets();
      });
      wrap.appendChild(b);
    });
    if (chosen != null) wrap.appendChild(el("div", "rationale", esc(step.rationale)));
    return wrap;
  }
  function recordTimeline(action) { state.timeline.push({ at: Date.now(), action: action }); persist(); }

  // ---------- THREAT INTEL ----------
  function renderIntel() {
    var cards = (scn.iocs || []).map(function (i) {
      var m = i.mitre && MITRE[i.mitre] ? MITRE[i.mitre].name + " (" + i.mitre + ")" : "";
      return '<div class="ioc"><div class="top"><span class="type">' + esc(i.type) + '</span>' +
        '<span class="rep ' + i.reputation + '">' + i.reputation + "</span></div>" +
        '<div class="val">' + esc(R(i.ref)) + "</div>" +
        '<div style="color:var(--ink-dim);font-size:13px">' + esc(i.note) + "</div>" +
        (m ? '<div style="color:var(--amber);font-size:12px;margin-top:5px">⊙ ' + esc(m) + "</div>" : "") + "</div>";
    }).join("");
    $("panel-intel").innerHTML =
      '<div class="phead"><h1>Threat Intelligence</h1><p>Indicators correlated to this scenario · these match the SIEM and Network screens exactly</p></div>' +
      '<div class="grid3">' + (cards || '<div class="card">No indicators yet.</div>') + "</div>" +
      '<div class="card" style="margin-top:14px"><div class="eyebrow">Why these correlate</div>' +
      '<p style="color:var(--ink-dim)">Every screen derives indicators from the same scenario seed. The attacker IP you see in the SIEM is the same IP on the threat map and here in the feed. Follow one indicator across all three to build your scope.</p></div>';
  }

  // ---------- REPORT ----------
  function renderReport() {
    var tmplLink = SOC.library ? '<a class="btn" href="library.html?tab=templates" target="_blank" rel="noopener">Open Word templates</a>' : "";
    $("panel-report").innerHTML =
      '<div class="phead"><h1>Investigation Summary</h1><p>Auto-built from your work · the starting point for your written deliverables</p></div>' +
      '<div class="card" style="border-color:var(--cyan);margin-bottom:10px"><div class="eyebrow">How to use this</div>' +
        '<p style="color:var(--ink-dim);margin:4px 0 0">This summary pulls together the evidence you pinned, your notes, the ticket, and the indicators. It is <b style="color:var(--ink)">not your final deliverable</b>. Copy it into the Word templates from the Library, add your screenshots and your own analysis, and turn those documents in. The <b>Submit and score</b> button below only records your in-app assessment and gives you the Blackboard completion code.</p>' +
        '<div class="btnrow" style="margin-top:10px">' + tmplLink + "</div></div>" +
      '<div class="btnrow" style="margin-bottom:10px">' +
        '<button class="btn" id="rebuild">Rebuild summary</button>' +
        '<button class="btn" id="copyReport">Copy text</button>' +
        '<button class="btn" id="dlReport">Download draft (.md)</button>' +
        '<button class="btn primary" id="submit2">Submit and score</button></div>' +
      '<div class="report mono" id="reportOut"></div>';
    $("rebuild").addEventListener("click", function () { $("reportOut").textContent = buildReport(); });
    $("copyReport").addEventListener("click", function () { navigator.clipboard.writeText(buildReport()).then(function () { toast("Summary copied. Paste it into your Word template."); }); });
    $("dlReport").addEventListener("click", function () {
      var blob = new Blob([buildReport()], { type: "text/markdown" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = scn.id + "-summary.md"; a.click();
    });
    $("submit2").addEventListener("click", doSubmit);
    $("reportOut").textContent = buildReport();
  }

  function buildReport() {
    var L = [];
    L.push("# Investigation summary (draft): " + scn.title);
    L.push("");
    L.push("- Incident ID: " + (state.tickets[0] ? state.tickets[0].id : "INC-DRAFT"));
    L.push("- Scenario: " + scn.id + " (Tier " + scn.tier + ")");
    L.push("- Severity: " + scn.severity);
    L.push("- Analyst: " + (analyst || "anon"));
    L.push("- Generated: " + new Date().toISOString());
    L.push("");
    L.push("## Executive Summary");
    L.push(state.notes ? state.notes.split("\n")[0] : "_Add a one-line summary in your notebook._");
    L.push("");
    L.push("## Indicators of Compromise");
    (scn.iocs || []).forEach(function (i) { L.push("- " + i.type + ": " + R(i.ref) + " (" + i.reputation + (i.mitre ? ", " + i.mitre : "") + ")"); });
    L.push("");
    L.push("## Pinned Evidence");
    if (state.pinned.length) state.pinned.forEach(function (id) { var d = (state.pinnedData || {})[id] || {}; L.push("- " + (d.msg || id)); });
    else L.push("- _No evidence pinned._");
    L.push("");
    L.push("## Timeline of Analyst Actions");
    if (state.timeline.length) state.timeline.forEach(function (e) { L.push("- " + new Date(e.at).toISOString().substr(11, 8) + " " + e.action); });
    else L.push("- _No actions recorded._");
    L.push("");
    L.push("## Analyst Notes");
    L.push(state.notes || "_Empty._");
    L.push("");
    L.push("## Recommended Remediation");
    (scn.answerKey.containment || []).forEach(function (c) { L.push("- " + c); });
    return L.join("\n");
  }

  // ---------- SCORING ----------
  function gradeQuestions() {
    var got = 0, max = 0, feedback = [];
    (scn.questions || []).forEach(function (q) {
      max += q.points;
      var a = state.answers[q.id];
      var correct;
      if (q.type === "multi") {
        var want = q.answer.slice().sort().join(",");
        var have = (a || []).slice().sort().join(",");
        correct = want === have;
      } else correct = a === q.answer;
      if (correct) got += q.points;
      feedback.push({ q: q.prompt, correct: correct, explain: q.explain, points: q.points });
    });
    return { got: got, max: max, feedback: feedback };
  }
  function gradePlaybook() {
    var got = 0, max = 0;
    scn.playbook.phases.forEach(function (ph) {
      ph.steps.forEach(function (s) {
        max += 10;
        if (state.playbook[s.id] === s.correct) got += 10;
      });
    });
    return { got: got, max: max };
  }

  function openQuestions(after) {
    var q = scn.questions || [];
    var body = '<div class="eyebrow">Shift assessment</div><h2 class="hud" style="margin:4px 0 12px">Answer to close the shift</h2>';
    q.forEach(function (item, qi) {
      body += '<div class="pbstep"><div class="q">' + (qi + 1) + ". " + esc(item.prompt) + (item.type === "multi" ? " <span style='color:var(--ink-faint);font-size:12px'>(select all)</span>" : "") + "</div>";
      item.options.forEach(function (opt, oi) {
        body += '<button class="opt" data-q="' + item.id + '" data-o="' + oi + '" data-multi="' + (item.type === "multi") + '">' + esc(opt) + "</button>";
      });
      body += "</div>";
    });
    body += '<div class="btnrow" style="margin-top:12px"><button class="btn primary" id="qDone">Score my shift</button><button class="btn ghost" id="qCancel">Back</button></div>';
    showModal(body);
    var picks = {};
    $("modalBox").querySelectorAll(".opt").forEach(function (b) {
      b.addEventListener("click", function () {
        var qid = b.getAttribute("data-q"), oi = +b.getAttribute("data-o"), multi = b.getAttribute("data-multi") === "true";
        if (multi) {
          picks[qid] = picks[qid] || [];
          var idx = picks[qid].indexOf(oi);
          if (idx >= 0) { picks[qid].splice(idx, 1); b.classList.remove("sel"); }
          else { picks[qid].push(oi); b.classList.add("sel"); }
        } else {
          picks[qid] = oi;
          b.parentNode.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("sel"); });
          b.classList.add("sel");
        }
      });
    });
    $("qCancel").addEventListener("click", closeModal);
    $("qDone").addEventListener("click", function () {
      Object.keys(picks).forEach(function (k) { state.answers[k] = picks[k]; });
      persist(); closeModal(); after();
    });
  }

  function doSubmit() { openQuestions(finishScore); }

  function finishScore() {
    var gq = gradeQuestions(), gp = gradePlaybook();
    var triage = state.pinned.length > 0 ? 10 : 0;
    var irBonus = state.tickets.length > 0 ? 10 : 0;
    var hintPenalty = state.hintsUsed * 5;
    var rawMax = gq.max + gp.max + 20;
    var rawGot = gq.got + gp.got + triage + irBonus - hintPenalty;
    if (rawGot < 0) rawGot = 0;
    var pct = Math.round(rawGot / rawMax * 100);
    state.score = pct; state.status = "submitted"; persist();
    $("mScore").textContent = pct;

    // feed gamification and capture any newly earned badges
    var gam = SOC.gam ? SOC.gam.completeScenario(scn.id, pct) : { newBadges: [] };
    var badgeHtml = "";
    if (gam.newBadges && gam.newBadges.length) {
      badgeHtml = '<div class="eyebrow" style="margin-top:12px">Badges earned</div><div style="margin-top:6px">' +
        gam.newBadges.map(function (b) { return '<span class="chip" style="cursor:default;color:var(--cyan)">' + b.icon + " " + esc(b.name) + "</span>"; }).join(" ") + "</div>";
    }

    ST.completionCode(scn.id, analyst || "anon", pct).then(function (code) {
      var fb = gq.feedback.map(function (f) {
        return '<div class="pbstep"><div class="q"><span class="sev ' + (f.correct ? "s-low" : "s-critical") + '"></span> ' +
          esc(f.q) + "</div><div class='rationale'>" + esc(f.explain) + "</div></div>";
      }).join("");
      var body =
        '<div class="eyebrow">Shift debrief</div>' +
        '<h2 class="hud" style="margin:4px 0 4px">' + scn.title + "</h2>" +
        '<div class="hud" style="font-size:45px;color:var(--cyan)">' + pct + "%</div>" +
        '<div class="scorebar" style="margin:6px 0 14px"><i style="width:' + pct + '%"></i></div>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap;color:var(--ink-dim);font-size:13px;margin-bottom:10px">' +
          "<span>Questions " + gq.got + "/" + gq.max + "</span><span>Playbook " + gp.got + "/" + gp.max + "</span>" +
          "<span>Triage +" + triage + "</span><span>IR +" + irBonus + "</span><span>Hints -" + hintPenalty + "</span></div>" +
        fb +
        badgeHtml +
        '<div class="eyebrow" style="margin-top:12px">Lesson</div><p style="color:var(--ink-dim)">' + esc(scn.debrief) + "</p>" +
        '<div class="eyebrow" style="margin-top:12px">Completion code · paste into Blackboard</div>' +
        '<div class="codebox" id="codeBox">' + code + "</div>" +
        '<div class="eyebrow" style="margin-top:12px">Before you submit</div>' +
        '<p style="color:var(--ink-dim);margin:4px 0 0">The in-app assessment is one of five required deliverables. Also download and complete the Word templates for your incident report, root-cause and post-mortem, and executive brief, each with your screenshots and notes, plus a <b style="color:var(--cyan)">3 to 5 minute recorded video debrief</b> attached as a file. Submit the documents and the recording in Blackboard with this code.</p>' +
        '<div class="btnrow" style="margin-top:12px"><button class="btn" id="copyCode">Copy code</button><button class="btn primary" id="closeDebrief">Done</button></div>';
      showModal(body);
      $("copyCode").addEventListener("click", function () { navigator.clipboard.writeText(code).then(function () { toast("Code copied"); }); });
      $("closeDebrief").addEventListener("click", closeModal);
    });
  }

  // ---------- ACADEMY ----------
  function renderAcademy() {
    var a = SOC.academy;
    var secs = a.sections.map(function (s, i) {
      return '<div class="card"><div class="eyebrow">' + String(i + 1).padStart(2, "0") + "</div>" +
        '<h3 class="hud" style="margin:2px 0 6px">' + esc(s.title) + "</h3>" +
        '<p style="color:var(--ink-dim);margin:0">' + esc(s.body) + "</p></div>";
    }).join("");
    var gloss = a.glossary.map(function (g) {
      return '<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b class="mono" style="color:var(--cyan)">' + esc(g[0]) + "</b> — <span style='color:var(--ink-dim)'>" + esc(g[1]) + "</span></div>";
    }).join("");
    $("panel-academy").innerHTML =
      '<div class="phead"><h1>Analyst Academy</h1><p>' + esc(a.intro) + "</p></div>" +
      secs +
      '<div class="card"><div class="eyebrow">Field glossary</div><div style="margin-top:6px">' + gloss + "</div></div>";
  }

  // ---------- nav / buttons / modal ----------
  function wireNav() {
    document.querySelectorAll(".navbtn[data-panel]").forEach(function (b) {
      b.addEventListener("click", function () { gotoPanel(b.getAttribute("data-panel")); });
    });
    document.addEventListener("click", function (e) {
      var g = e.target.getAttribute && e.target.getAttribute("data-goto");
      if (g) gotoPanel(g);
    });
  }
  function gotoPanel(name) {
    document.querySelectorAll(".navbtn[data-panel]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-panel") === name);
    });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("show"); });
    var el2 = $("panel-" + name); if (el2) el2.classList.add("show");
    if (name === "siem") paintLogs();
    if (name === "net") setupMap();
  }
  function wireButtons() {
    $("btnSubmit").addEventListener("click", doSubmit);
    $("btnHint").addEventListener("click", showHint);
  }
  function showHint() {
    var hints = scn.hints || [];
    var i = state.hintsUsed;
    if (i >= hints.length) { toast("No more hints. Trust your analysis."); return; }
    state.hintsUsed += 1; persist(); $("mScore").textContent = state.score || 0;
    showModal('<div class="eyebrow">Hint ' + (i + 1) + " of " + hints.length + ' · costs 5 points</div><p style="font-size:17px;margin:10px 0">' + esc(hints[i]) + '</p><button class="btn primary" id="hOk">Got it</button>');
    $("hOk").addEventListener("click", closeModal);
  }
  function showModal(html) { $("modalBox").innerHTML = html; $("modal").classList.add("show"); }
  function closeModal() { $("modal").classList.remove("show"); }
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });

  // ---------- instructor injects via BroadcastChannel ----------
  function listenInjects() {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      var ch = new BroadcastChannel("soc-range-" + scn.id);
      ch.onmessage = function (m) {
        if (m.data && m.data.kind === "inject_event" && worker) {
          worker.postMessage({ cmd: "inject", event: m.data.event, delay: m.data.delay || 0 });
          toast("Instructor inject: " + (m.data.event.template || "event"));
        }
      };
    } catch (e) {}
  }

  // ---------- persistence ----------
  var saveTimer;
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { ST.save(state); }, 600); }
  window.addEventListener("beforeunload", function () { ST.save(state); });
})();
