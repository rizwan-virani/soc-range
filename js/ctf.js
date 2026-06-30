/* SOC Range :: ctf.js :: capture-the-flag arena controller */
(function () {
  "use strict";
  var SOC = self.SOC;
  var CH = SOC.ctf;

  function $(id) { return document.getElementById(id); }
  function el(t, c, h) { var n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(m) { var t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400); }

  var analyst = (localStorage.getItem("soc.analyst") || "").trim();
  $("ctfAnalyst").textContent = analyst || "anon";

  async function sha256hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function solvedSet() { return SOC.gam.get().flags; }
  function isSolved(id) { return solvedSet().indexOf(id) >= 0; }

  var activeCat = "all";
  var CATS = [{ k: "all", n: "All" }];
  var seen = {};
  CH.forEach(function (c) { if (!seen[c.cat]) { seen[c.cat] = 1; CATS.push({ k: c.cat, n: c.catName }); } });

  function render() {
    renderStats();
    var chips = CATS.map(function (c) {
      var n = c.k === "all" ? CH.length : CH.filter(function (x) { return x.cat === c.k; }).length;
      return '<span class="chip' + (activeCat === c.k ? " on" : "") + '" data-cat="' + c.k + '">' + esc(c.n) + " · " + n + "</span>";
    }).join(" ");
    $("ctfFilters").innerHTML = chips;
    $("ctfFilters").querySelectorAll(".chip").forEach(function (ch2) {
      ch2.addEventListener("click", function () { activeCat = ch2.getAttribute("data-cat"); render(); });
    });

    var list = CH.filter(function (c) { return activeCat === "all" || c.cat === activeCat; });
    var grid = $("ctfGrid"); grid.innerHTML = "";
    list.forEach(function (c) {
      var solved = isSolved(c.id);
      var card = el("div", "scn-card" + (solved ? " solved" : ""));
      card.style.cursor = "pointer";
      card.innerHTML =
        '<span class="tier ' + (c.diff === "easy" ? "T1" : c.diff === "medium" ? "T2" : "T3") + '">' + c.diff + "</span> " +
        '<span class="mono" style="color:var(--ink-faint);font-size:12px">' + esc(c.catName) + "</span>" +
        (solved ? '<span style="float:right;color:var(--low)">✓ captured</span>' : '<span style="float:right;color:var(--amber)" class="mono">' + c.points + " pts</span>") +
        "<h3>" + esc(c.title) + "</h3>" +
        '<p style="color:var(--ink-dim);font-size:15px;margin:8px 0 0">' + esc(c.prompt.slice(0, 90)) + (c.prompt.length > 90 ? "..." : "") + "</p>";
      card.addEventListener("click", function () { openChallenge(c); });
      grid.appendChild(card);
    });
  }

  function renderStats() {
    var p = SOC.gam.get();
    var solved = CH.filter(function (c) { return p.flags.indexOf(c.id) >= 0; });
    var pts = solved.reduce(function (a, c) { return a + c.points; }, 0);
    var total = CH.reduce(function (a, c) { return a + c.points; }, 0);
    $("ctfFlags").textContent = solved.length + " / " + CH.length;
    $("ctfPoints").textContent = pts;
    $("ctfBar").style.width = Math.round(pts / total * 100) + "%";
  }

  // ---- Analysis workbench: decode/transform artifacts in-app (Phase 2) ----
  function wbTransform(kind, s) {
    s = s == null ? "" : s;
    try {
      if (kind === "b64") return atob(s.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, ""));
      if (kind === "hex") return (s.replace(/0x/gi, "").replace(/[^0-9a-fA-F]/g, "").match(/.{1,2}/g) || []).map(function (h) { return String.fromCharCode(parseInt(h, 16)); }).join("");
      if (kind === "rot13") return s.replace(/[a-zA-Z]/g, function (ch) { var b = ch <= "Z" ? 65 : 97; return String.fromCharCode((ch.charCodeAt(0) - b + 13) % 26 + b); });
      if (kind === "rotall") { var out = []; for (var n = 1; n < 26; n++) out.push("ROT" + n + ":  " + s.replace(/[a-zA-Z]/g, function (ch) { var b = ch <= "Z" ? 65 : 97; return String.fromCharCode((ch.charCodeAt(0) - b + n) % 26 + b); })); return out.join("\n"); }
      if (kind === "url") return decodeURIComponent(s.trim());
      if (kind === "bin") {
        if (/\s/.test(s.trim()) && s.trim().split(/\s+/).every(function (x) { return /^[01]+$/.test(x); }))
          return s.trim().split(/\s+/).map(function (b) { return String.fromCharCode(parseInt(b, 2)); }).join("");
        return ((s.replace(/[^01]/g, "")).match(/.{1,8}/g) || []).map(function (b) { return String.fromCharCode(parseInt(b, 2)); }).join("");
      }
      if (kind === "dec") return s.trim().split(/[\s,]+/).filter(Boolean).map(function (d) { return String.fromCharCode(parseInt(d, 10)); }).join("");
      if (kind === "rev") return s.split("").reverse().join("");
    } catch (e) { return "[could not decode as " + kind + ": " + e.message + "]"; }
    return s;
  }
  function wbBtn(k, label) { return '<button class="btn" data-wb="' + k + '" style="padding:6px 10px;font-size:12px" type="button">' + label + "</button>"; }
  function wbHtml() {
    return '<details class="card" style="margin-top:12px" open><summary class="eyebrow" style="cursor:pointer">Analysis workbench · decode here, no external tools needed</summary>' +
      '<p style="color:var(--ink-faint);font-size:12px;margin:8px 0">Load the artifact or paste text, then apply a transform. Chain transforms by editing the input.</p>' +
      '<textarea id="wbIn" class="notes" style="min-height:64px" placeholder="Paste text to analyze, or click Load artifact"></textarea>' +
      '<div class="btnrow" style="margin:8px 0">' +
        wbBtn("load", "Load artifact") + wbBtn("b64", "Base64 →") + wbBtn("hex", "Hex →") +
        wbBtn("rot13", "ROT13") + wbBtn("rotall", "ROT all 25") + wbBtn("url", "URL-decode") +
        wbBtn("bin", "Binary →") + wbBtn("dec", "Decimal →") + wbBtn("rev", "Reverse") +
      "</div>" +
      '<pre id="wbOut" class="report mono" style="max-height:24vh;min-height:34px;margin:0"></pre></details>';
  }

  var hintState = {};
  function openChallenge(c) {
    var solved = isSolved(c.id);
    hintState[c.id] = hintState[c.id] || 0;
    var art = Array.isArray(c.artifact) ? c.artifact.join("\n") : c.artifact;
    var body =
      '<div class="eyebrow">' + esc(c.catName) + " · " + c.diff + " · " + c.points + " pts</div>" +
      '<h2 class="hud" style="margin:4px 0 8px">' + esc(c.title) + "</h2>" +
      '<p style="color:var(--ink-dim)">' + esc(c.prompt) + "</p>" +
      '<div class="eyebrow" style="margin-top:10px">Artifact</div>' +
      '<pre class="report mono" style="max-height:30vh">' + esc(art) + "</pre>" +
      '<div class="btnrow" style="margin:10px 0"><button class="btn ghost" id="ctfHint">Hint (-' + Math.round(c.points * 0.2) + ' pts)</button>' +
      '<button class="btn ghost" id="ctfCopy">Copy artifact</button></div>' +
      '<div id="ctfHints" style="color:var(--amber);font-size:15px"></div>' + wbHtml();
    if (solved) {
      body += '<div class="card" style="margin-top:10px;border-color:var(--low)"><b class="hud" style="color:var(--low)">Captured</b>' +
        '<p style="color:var(--ink-dim);margin:6px 0 0">' + esc(c.explain) + "</p></div>";
    } else {
      body += '<div class="eyebrow" style="margin-top:8px">Submit flag · format ' + esc(c.format) + "</div>" +
        '<div style="display:flex;gap:8px;margin-top:6px"><input class="search" id="ctfFlag" placeholder="BVHN{...}" style="flex:1" />' +
        '<button class="btn primary" id="ctfSubmit">Capture</button></div>' +
        '<div id="ctfResult" class="hud" style="margin-top:8px"></div>';
    }
    body += '<div class="btnrow" style="margin-top:12px"><button class="btn" id="ctfClose">Close</button></div>';
    showModal(body);

    var hbox = $("ctfHints");
    function paintHints() {
      var n = hintState[c.id];
      hbox.innerHTML = c.hints.slice(0, n).map(function (h, i) { return "Hint " + (i + 1) + ": " + esc(h); }).join("<br>");
    }
    paintHints();
    if ($("ctfHint")) $("ctfHint").addEventListener("click", function () {
      if (hintState[c.id] < c.hints.length) { hintState[c.id] += 1; paintHints(); }
      else toast("No more hints.");
    });
    if ($("ctfCopy")) $("ctfCopy").addEventListener("click", function () { navigator.clipboard.writeText(art).then(function () { toast("Artifact copied"); }); });
    $("ctfClose").addEventListener("click", closeModal);

    // Wire the analysis workbench.
    var wbIn = $("wbIn"), wbOut = $("wbOut");
    if (wbIn && wbOut) {
      $("modalBox").querySelectorAll("[data-wb]").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-wb");
          if (k === "load") { wbIn.value = art; wbIn.focus(); return; }
          wbOut.textContent = wbTransform(k, wbIn.value);
        });
      });
    }

    if (!solved) {
      var submit = function () {
        var val = $("ctfFlag").value.trim();
        if (!val) return;
        sha256hex(val).then(function (h) {
          if (h === c.flagHash) {
            var penalty = hintState[c.id] * Math.round(c.points * 0.2);
            var award = Math.max(c.points - penalty, Math.round(c.points * 0.4));
            SOC.gam.captureFlag(c.id, award);
            $("ctfResult").innerHTML = '<span style="color:var(--low)">CORRECT. +' + award + " XP captured.</span>";
            toast("Flag captured: " + c.title);
            setTimeout(function () { closeModal(); render(); }, 900);
          } else {
            $("ctfResult").innerHTML = '<span style="color:var(--crit)">Incorrect. Re-check the artifact.</span>';
          }
        });
      };
      $("ctfSubmit").addEventListener("click", submit);
      $("ctfFlag").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    }
  }

  // code generation for the CTF set
  $("ctfCode").addEventListener("click", function () {
    var p = SOC.gam.get();
    var pts = CH.filter(function (c) { return p.flags.indexOf(c.id) >= 0; }).reduce(function (a, c) { return a + c.points; }, 0);
    SOC.state.completionCode("CTF-SET", analyst || "anon", pts).then(function (code) {
      showModal('<div class="eyebrow">CTF completion code</div><h2 class="hud" style="margin:4px 0 8px">' + (analyst || "anon") + "</h2>" +
        '<p style="color:var(--ink-dim)">' + p.flags.filter(function (f) { return f.indexOf("ctf-") === 0; }).length + " flags · " + pts + " points</p>" +
        '<div class="codebox" id="cb">' + code + '</div><div class="btnrow" style="margin-top:12px"><button class="btn" id="cc">Copy</button><button class="btn primary" id="cx">Done</button></div>');
      $("cc").addEventListener("click", function () { navigator.clipboard.writeText(code).then(function () { toast("Copied"); }); });
      $("cx").addEventListener("click", closeModal);
    });
  });

  function showModal(h) { $("modalBox").innerHTML = h; $("modal").classList.add("show"); }
  function closeModal() { $("modal").classList.remove("show"); }
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });

  SOC.gam.touch();
  render();
})();
