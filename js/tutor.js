/* SOC Range :: tutor.js
 * A Socratic tutor that runs fully client-side, so it always works on GitHub
 * Pages with no backend. It reads the active scenario and the analyst's live
 * progress to nudge rather than hand over answers.
 *
 * Optional LLM mode: if the instructor sets window.SOC_TUTOR_ENDPOINT to a
 * deployed proxy URL (see proxy/cloudflare-worker.js), free-text questions are
 * answered by Claude through that proxy. The API key stays server-side.
 */
(function () {
  "use strict";
  var SOC = self.SOC;
  if (!SOC || !SOC.scenarios) return;

  var params = new URLSearchParams(location.search);
  var scn = SOC.scenarios.byId[params.get("scenario")] || null;

  // live state is published by app.js
  function ctx() { return (SOC.tutorState && SOC.tutorState()) || {}; }

  // ---- build widget ----
  var btn = document.createElement("button");
  btn.className = "tutor-fab hud";
  btn.innerHTML = "✦ Tutor";
  document.body.appendChild(btn);

  var panel = document.createElement("div");
  panel.className = "tutor-panel";
  panel.innerHTML =
    '<div class="tutor-head"><b class="hud">Analyst Mentor</b><span id="tutorMode" class="mono"></span><button id="tutorX" class="btn ghost" style="padding:2px 8px">✕</button></div>' +
    '<div class="tutor-log" id="tutorLog"></div>' +
    '<div class="tutor-chips" id="tutorChips"></div>' +
    '<div class="tutor-input"><input id="tutorQ" class="search" placeholder="Ask a question..." /><button id="tutorSend" class="btn primary">Ask</button></div>';
  document.body.appendChild(panel);

  var QUICK = [
    "Where do I start?", "What should I pin?", "Am I missing anything?",
    "How do I contain this?", "Explain the MITRE tactics", "Is this a false positive?"
  ];

  function open() { panel.classList.add("show"); if (!log.length) say("mentor", greeting()); renderChips(); }
  function close() { panel.classList.remove("show"); }
  btn.addEventListener("click", function () { panel.classList.contains("show") ? close() : open(); });

  var log = [];
  function say(who, text) {
    log.push({ who: who, text: text });
    var box = document.getElementById("tutorLog");
    var row = document.createElement("div");
    row.className = "tutor-msg " + who;
    row.innerHTML = text;
    box.appendChild(row); box.scrollTop = box.scrollHeight;
  }
  function renderChips() {
    document.getElementById("tutorChips").innerHTML = QUICK.map(function (q, i) {
      return '<span class="chip" data-q="' + i + '">' + q + "</span>";
    }).join("");
    document.getElementById("tutorChips").querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () { ask(QUICK[+c.getAttribute("data-q")]); });
    });
  }

  function greeting() {
    document.getElementById("tutorMode").textContent = window.SOC_TUTOR_ENDPOINT ? "live" : "guide";
    if (!scn) return "I am your mentor. Open a shift and I will help you work it without giving away the answers.";
    return "Working <b>" + esc(scn.title) + "</b>. I will nudge you toward the answer, not hand it over. Ask away, or tap a prompt below.";
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  // ---- heuristic brain ----
  function heuristic(q) {
    var c = ctx(), s = scn;
    var ql = q.toLowerCase();
    if (!s) return "Pick a scenario from the launcher first. Then I can tailor my guidance.";

    if (/start|begin|first|where/.test(ql))
      return "Open the SIEM feed and slow the noise down. Filter by one source at a time and use the search box. Your objectives are: " + s.briefing.objectives.join("; ") + ". Start by confirming whether the alert is real.";

    if (/pin|evidence|collect/.test(ql)) {
      var n = c.pinned || 0;
      return "You have pinned " + n + " item" + (n === 1 ? "" : "s") + ". Pin any line that would appear in your timeline: the first sign of access, the action on objectives, and anything touching a known indicator. Aim to tell the story start to finish.";
    }

    if (/missing|else|complete|done|enough/.test(ql)) {
      var stages = (s.logScript || []).length;
      var pinned = c.pinned || 0;
      var pb = c.playbookAnswered || 0;
      var tip = pinned < 3 ? "Pin more evidence. " : "";
      tip += pb === 0 ? "Open an incident and work the playbook. " : "";
      return tip + "This incident has multiple stages. Trace it from initial access to impact. If you cannot see the beginning, you have not scoped it yet.";
    }

    if (/contain|stop|respond|remediate/.test(ql))
      return "Containment order matters. Isolate the affected host rather than powering it off, cut command and control, then disable accounts and revoke sessions. Capture indicators before you clean. Recover only from backups the attacker could not reach.";

    if (/mitre|tactic|attack|technique/.test(ql)) {
      var t = (s.briefing.tactics || []).join(", ");
      return "In scope here: " + t + ". Map each thing you see to a tactic. Tactic is the goal, technique is the method. That mapping tells you what the attacker will try next.";
    }

    if (/false positive|benign|real|legit/.test(ql))
      return "Ask what would have to be true for this to be malicious. Check the rate, the source, and whether the action was allowed or denied. A blocked scan or a stale cached credential is not an incident. A success after many failures is.";

    if (/beacon|c2|command/.test(ql))
      return "A beacon hides in normal-looking traffic and gives itself away by timing. Group outbound connections by destination and look at the gaps between them. Regular intervals are the tell.";

    if (/exfil|data|leak|transfer/.test(ql))
      return "Encrypted exfiltration hides content, not behavior. Sort by bytes, sum the transfers to one destination, and check the destination reputation. In healthcare, scope the data type too.";

    if (/phish|email|link/.test(ql))
      return "Separate delivery from compromise. A delivered phish is not yet an incident. Check the sender domain against the real one, then look for a click and any follow-on process or sign-in.";

    if (/mfa|token|identity|account/.test(ql))
      return "Modern takeover steals sessions, not just passwords. If MFA shows satisfied yet the geo is hostile, suspect token theft. A password reset alone is not containment. Revoke sessions and remove cloud persistence such as inbox rules and OAuth grants.";

    if (/escalate|severity|priority/.test(ql))
      return "Escalate on confirmed malicious activity, evidence of success, or anything touching regulated data. A clear early handoff with what you know beats a perfect late one.";

    if (/hint/.test(ql))
      return "I will not spend your scored hints for you. The Hint button up top gives scenario-specific clues. I am here for the thinking around them.";

    // glossary fallback
    if (SOC.academy) {
      var hit = SOC.academy.glossary.find(function (g) { return ql.indexOf(g[0].toLowerCase()) >= 0; });
      if (hit) return hit[0] + ": " + hit[1];
    }
    return "Good question. Break it down: what do you see, what source is it from, and what would make it malicious? Tell me which stage you are stuck on and I will point you to the right screen.";
  }

  function ask(q) {
    say("you", esc(q));
    document.getElementById("tutorQ").value = "";
    if (window.SOC_TUTOR_ENDPOINT) {
      say("mentor", "<i>thinking...</i>");
      llm(q).then(function (ans) {
        // replace the thinking placeholder
        var box = document.getElementById("tutorLog");
        box.lastChild.innerHTML = ans;
      }).catch(function () {
        var box = document.getElementById("tutorLog");
        box.lastChild.innerHTML = heuristic(q) + '<br><span style="color:var(--ink-faint);font-size:12px">(offline guide mode)</span>';
      });
    } else {
      say("mentor", heuristic(q));
    }
  }

  function llm(q) {
    var s = scn, c = ctx();
    var system = "You are a Socratic SOC analyst mentor inside a training simulator. Guide the student toward the answer with questions and hints. Never reveal exact flags, exact answer-key values, or the specific indicators to block. Keep replies under 90 words. Current scenario: " +
      (s ? s.title + ". Objectives: " + s.briefing.objectives.join("; ") + ". Tactics: " + (s.briefing.tactics || []).join(", ") : "none") +
      ". Student progress: pinned " + (c.pinned || 0) + " items, playbook steps answered " + (c.playbookAnswered || 0) + ".";
    return fetch(window.SOC_TUTOR_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: system, messages: [{ role: "user", content: q }], max_tokens: 300, model: "claude-sonnet-4-6" })
    }).then(function (r) { return r.json(); }).then(function (d) {
      var txt = (d.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
      return esc(txt || "I could not reach the tutor service. Try the guide.");
    });
  }

  document.getElementById("tutorX").addEventListener("click", close);
  document.getElementById("tutorSend").addEventListener("click", function () {
    var v = document.getElementById("tutorQ").value.trim(); if (v) ask(v);
  });
  document.getElementById("tutorQ").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var v = this.value.trim(); if (v) ask(v); }
  });
})();
